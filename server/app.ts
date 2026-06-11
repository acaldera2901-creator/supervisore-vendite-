import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import { normalizeAnalysisResult, toCrmRecord } from './lib/normalize.ts';
import { enqueueAndWait } from './lib/jobQueue.ts';
import {
  analysisSystemInstruction,
  buildAnalysisPrompt,
  buildGuidelinesPrompt,
  guidelinesSystemInstruction,
} from './lib/salesPrompts.ts';
import { storage } from './lib/storage.ts';
import type { KnowledgeBase } from '../src/lib/types';

import multer from 'multer';
import os from 'node:os';
const upload = multer({ dest: os.tmpdir() });

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '25mb' }));

function asyncRoute(handler: express.RequestHandler): express.RequestHandler {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    storage: storage.provider,
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || process.env.OLLAMA_FAST_MODEL || 'llama3.2',
  });
});

app.get(
  '/api/crm',
  asyncRoute(async (_req, res) => {
    res.json({ records: await storage.listCrmRecords() });
  }),
);

app.post(
  '/api/crm',
  asyncRoute(async (req, res) => {
    res.status(201).json({ record: await storage.insertCrmRecord(req.body) });
  }),
);

app.get(
  '/api/knowledge',
  asyncRoute(async (_req, res) => {
    res.json({ knowledge: await storage.getKnowledge() });
  }),
);

app.put(
  '/api/knowledge',
  asyncRoute(async (req, res) => {
    const body = req.body as Partial<KnowledgeBase>;
    const knowledge = {
      formazione: body.formazione || '',
      manuale: body.manuale || '',
      script: body.script || '',
    };
    res.json({ knowledge: await storage.saveKnowledge(knowledge) });
  }),
);

app.post(
  '/api/guidelines',
  asyncRoute(async (req, res) => {
    const formazione = typeof req.body?.formazione === 'string' ? req.body.formazione : '';
    const files = Array.isArray(req.body?.files) ? req.body.files : [];
    if (!formazione.trim() && files.length === 0) {
      res.status(400).json({ error: 'Inserisci materiale di formazione o allega file.' });
      return;
    }

    const filesSuffix = files.length > 0
      ? `\nFile allegati ricevuti: ${files.map((file: { name?: string }) => file.name || 'file').join(', ')}`
      : '';

    const data = await enqueueAndWait<Partial<KnowledgeBase>>('guidelines', {
      system: guidelinesSystemInstruction,
      prompt: buildGuidelinesPrompt(formazione, filesSuffix),
    });

    res.json({
      manuale: typeof data.manuale === 'string' ? data.manuale : '',
      script: typeof data.script === 'string' ? data.script : '',
    });
  }),
);

app.post(
  '/api/analyze',
  asyncRoute(async (req, res) => {
    const manual = typeof req.body?.manual === 'string' ? req.body.manual : '';
    const script = typeof req.body?.script === 'string' ? req.body.script : '';
    const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript : '';
    if (!manual.trim() || !script.trim() || !transcript.trim()) {
      res.status(400).json({ error: 'Manuale, script e trascrizione sono obbligatori.' });
      return;
    }

    const analysis = normalizeAnalysisResult(
      await enqueueAndWait('analyze', {
        system: analysisSystemInstruction,
        prompt: buildAnalysisPrompt(manual, script, transcript),
      }),
    );
    const stored = toCrmRecord(analysis);
    // Il salvataggio CRM non deve mai far perdere l'analisi: se lo storage
    // è irraggiungibile (es. Supabase giù), restituiamo comunque il report
    // con un record locale non persistito.
    let record;
    try {
      record = await storage.insertCrmRecord(stored);
    } catch (storageError) {
      console.error('CRM save failed, returning unsaved analysis:', storageError);
      record = { ...stored, id: crypto.randomUUID(), date: new Date().toLocaleDateString() };
    }
    res.json({ analysis, record });
  }),
);

app.post(
  '/api/transcribe',
  upload.single('audio'),
  asyncRoute(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Nessun file audio ricevuto.' });
      return;
    }

    const audioBase64 = fs.readFileSync(req.file.path).toString('base64');
    const mimeType = req.file.mimetype || 'audio/webm';
    try {
      const result = await enqueueAndWait<{ transcript: string }>('transcribe', {
        audioBase64,
        mimeType,
      });
      res.json({ transcript: result.transcript || '' });
    } finally {
      fs.unlink(req.file.path, () => {});
    }
  }) as express.RequestHandler,
);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : 'Errore interno del server.';
  res.status(500).json({ error: message });
});

export default app;
