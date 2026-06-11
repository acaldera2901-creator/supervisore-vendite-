import 'dotenv/config';
import express from 'express';

const app = express();
const port = Number(process.env.OLLAMA_PROXY_PORT || 11435);
const token = process.env.OLLAMA_PROXY_TOKEN;
const ollamaUrl = process.env.OLLAMA_INTERNAL_URL || 'http://localhost:11434';

app.use(express.json({ limit: '25mb' }));

function requireToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!token) {
    res.status(500).json({ error: 'OLLAMA_PROXY_TOKEN is required.' });
    return;
  }

  const headerToken = req.header('x-consultor-token');
  const bearer = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (headerToken !== token && bearer !== token) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  next();
}

async function forward(req: express.Request, res: express.Response) {
  const response = await fetch(`${ollamaUrl}${req.path}`, {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body),
  });

  const text = await response.text();
  res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(text);
}

app.get('/api/tags', requireToken, forward);
app.post('/api/chat', requireToken, forward);
app.post('/api/generate', requireToken, forward);

app.get('/health', (_req, res) => {
  res.json({ ok: true, target: ollamaUrl });
});

app.listen(port, () => {
  console.log(`Consultor Ollama proxy listening on http://localhost:${port}`);
});
