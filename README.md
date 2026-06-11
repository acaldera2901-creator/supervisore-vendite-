# Supervisore Vendite AI

App React + backend Express per analizzare chiamate commerciali, generare manuale/script da materiale di formazione e salvare automaticamente i lead in Supabase.

## Setup

1. Installa dipendenze:

```bash
npm install
```

2. Crea `.env` o `.env.local` partendo da `.env.example`.

3. In Supabase esegui lo schema:

```sql
-- file: supabase/schema.sql
```

4. Avvia Ollama e scarica il modello configurato:

```bash
ollama pull llama3.1
ollama serve
```

5. Avvia backend + frontend:

```bash
npm run dev:full
```

Frontend: `http://localhost:3000`  
Backend: `http://localhost:3001/api/health`

## Variabili

- `VITE_API_URL`: URL del backend usato dal frontend.
- `SUPABASE_URL`: URL progetto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: service role key, solo backend.
- `OLLAMA_URL`: default `http://localhost:11434`.
- `OLLAMA_MODEL`: default `llama3.2`.
- `OLLAMA_PROXY_TOKEN`: required only when exposing local Ollama through the protected proxy.

Se Supabase non è configurato, il backend usa memoria locale. È utile per testare, ma i dati spariscono al riavvio.

## Script

```bash
npm test
npm run lint
npm run build
npm run server
npm run dev
```

## Stato

Implementato:
- Backend Express.
- Analisi e generazione documenti via Ollama lato server.
- CRM e knowledge base su Supabase.
- Fallback memoria locale.
- Frontend scollegato da Gemini/API key browser.

Da completare nel prossimo step:
- Trascrizione audio reale con Whisper/ffmpeg sulla route `/api/transcribe`.

## Collegare Vercel a Ollama locale

Vercel non può raggiungere `localhost:11434` sul Mac. Per usarlo da production:

1. Avvia il proxy locale protetto:

```bash
OLLAMA_PROXY_TOKEN="token-lungo" npm run ollama:proxy
```

2. Crea un tunnel verso il proxy:

```bash
ngrok http 11435
```

3. Su Vercel imposta:

```bash
OLLAMA_URL="https://<ngrok-url>"
OLLAMA_PROXY_TOKEN="token-lungo"
OLLAMA_MODEL="llama3.2"
```
