#!/usr/bin/env node
// Watcher locale per supervisore-vendite.
// Preleva job dalla tabella job_queue su Supabase e li esegue in locale:
//   - analyze / guidelines → claude -p (abbonamento locale)
//   - transcribe → whisper-cli + ffmpeg
// Richiede variabili: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// (letti da .env nella root del progetto)

import { createClient } from '@supabase/supabase-js';
import { execFile, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

// Carica .env
try {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?/);
    if (m) process.env[m[1]] = m[2];
  }
} catch {}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WHISPER_CLI = process.env.WHISPER_CLI || '/opt/homebrew/bin/whisper-cli';
const WHISPER_MODEL = process.env.WHISPER_MODEL || join(homedir(), '.whisper-models', 'ggml-medium.bin');
const FFMPEG_BIN = process.env.FFMPEG_BIN || '/opt/homebrew/bin/ffmpeg';
const POLL_MS = 2000;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Errore: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY richiesti nel .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const execFileAsync = promisify(execFile);
const C = { dim: '\x1b[2m', green: '\x1b[92m', red: '\x1b[91m', blue: '\x1b[94m', off: '\x1b[0m' };
const log = (m) => console.log(`${C.dim}[watcher ${new Date().toISOString().slice(11, 19)}]${C.off} ${m}`);

async function claimJob() {
  const { data, error } = await supabase
    .from('job_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  if (error || !data) return null;

  const { error: claimErr } = await supabase
    .from('job_queue')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', data.id)
    .eq('status', 'pending');
  if (claimErr) return null;
  return data;
}

async function completeJob(id, result) {
  await supabase
    .from('job_queue')
    .update({ status: 'done', result, updated_at: new Date().toISOString() })
    .eq('id', id);
}

async function failJob(id, message) {
  await supabase
    .from('job_queue')
    .update({ status: 'error', error: message, updated_at: new Date().toISOString() })
    .eq('id', id);
}

function runClaude(prompt, system) {
  return new Promise((resolve, reject) => {
    const args = ['-p', prompt];
    if (system) args.push('--system-prompt', system);
    args.push('--output-format', 'text');

    const proc = spawn('claude', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { proc.kill('SIGKILL'); reject(new Error('Timeout claude')); }, 5 * 60 * 1000);

    proc.stdout.on('data', (d) => { stdout += d; });
    proc.stderr.on('data', (d) => { stderr += d; });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`claude exit ${code}: ${stderr.slice(0, 300)}`));
      else resolve(stdout.trim());
    });
    proc.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

async function handleAnalyzeOrGuidelines(job) {
  const { system, prompt } = job.payload;
  log(`${C.blue}${job.type}${C.off} job ${job.id.slice(0, 8)}…`);

  const raw = await runClaude(prompt, system);
  // Estrai JSON dalla risposta (claude può aggiungere testo prima/dopo)
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Nessun JSON nella risposta: ${raw.slice(0, 200)}`);
  const parsed = JSON.parse(match[0]);
  return parsed;
}

async function handleTranscribe(job) {
  const { audioBase64, mimeType } = job.payload;
  log(`${C.blue}transcribe${C.off} job ${job.id.slice(0, 8)}…`);

  const ext = mimeType?.includes('mp4') ? 'mp4' : 'webm';
  const dir = mkdtempSync(join(tmpdir(), 'sv-'));
  const inputPath = join(dir, `audio.${ext}`);
  const wavPath = join(dir, 'audio.wav');
  const outPrefix = join(dir, 'out');
  const txtPath = `${outPrefix}.txt`;

  try {
    writeFileSync(inputPath, Buffer.from(audioBase64, 'base64'));
    await execFileAsync(FFMPEG_BIN, ['-y', '-i', inputPath, '-ar', '16000', '-ac', '1', wavPath]);
    await execFileAsync(WHISPER_CLI, [
      '-m', WHISPER_MODEL,
      '-l', 'it',
      '-nt', '-np',
      '-t', '8',
      '-otxt',
      '-of', outPrefix,
      wavPath,
    ]);
    const transcript = readFileSync(txtPath, 'utf-8').trim();
    return { transcript };
  } finally {
    [inputPath, wavPath, txtPath].forEach((f) => { try { unlinkSync(f); } catch {} });
  }
}

async function tick() {
  const job = await claimJob();
  if (!job) return;

  try {
    let result;
    if (job.type === 'analyze' || job.type === 'guidelines') {
      result = await handleAnalyzeOrGuidelines(job);
    } else if (job.type === 'transcribe') {
      result = await handleTranscribe(job);
    } else {
      throw new Error(`Tipo job sconosciuto: ${job.type}`);
    }
    await completeJob(job.id, result);
    log(`${C.green}done${C.off} job ${job.id.slice(0, 8)}`);
  } catch (err) {
    log(`${C.red}errore${C.off} job ${job.id.slice(0, 8)}: ${err.message}`);
    await failJob(job.id, err.message);
  }
}

log(`Watcher supervisore-vendite avviato. Poll ogni ${POLL_MS}ms`);
setInterval(tick, POLL_MS);
tick();
