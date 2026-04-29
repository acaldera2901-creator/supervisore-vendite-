# Supervisore Vendite AI — Design Spec
**Date:** 2026-04-29
**Status:** Approved

---

## 1. Obiettivo

Trasformare l'app da un analizzatore di trascrizioni manuali (dipendente da Google Gemini API) in un sistema integrato che:
1. Registra la call dal microfono direttamente in-app
2. Trascrive automaticamente con Whisper locale
3. Analizza con Ollama locale (zero dipendenze cloud a pagamento)
4. Persiste i dati CRM su Supabase
5. È deployabile su Vercel (frontend) con backend locale avviato dal venditore

---

## 2. Architettura Dual-Phase

### Phase A — Uso Personale (implementazione corrente)

```
Vercel (React frontend)
    │
    ├──→ Supabase (PostgreSQL — CRM records + knowledge base)
    │
    └──→ localhost:3001 (Express backend — avviato localmente)
              ├── /api/transcribe  →  whisper.cpp (nodejs-whisper)
              ├── /api/analyze     →  Ollama :11434
              └── /api/guidelines  →  Ollama :11434
```

### Phase B — Commerciale (migrazione futura, zero refactoring frontend)

```
Vercel (React frontend)
    │
    ├──→ Supabase (+ Auth multi-utente)
    │
    └──→ Railway/Fly.io (stesso Express, variabile VITE_API_URL aggiornata)
              ├── /api/transcribe  →  Deepgram / AssemblyAI
              └── /api/analyze     →  Groq API / Ollama cloud GPU
```

**Principio di isolamento**: il frontend legge `VITE_API_URL`. Cambiare quella variabile è sufficiente per passare da Phase A a Phase B.

---

## 3. Stack Tecnologico

| Layer | Tecnologia | Note |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript | esistente |
| Stili | Tailwind CSS v4 | esistente |
| Backend | Express (Node.js) | già in package.json, non usato |
| AI — testo | Ollama HTTP API `:11434` | sostituisce Gemini |
| AI — visione | `qwen2-vl` o `llava` via Ollama | per upload immagini |
| Trascrizione | `nodejs-whisper` (whisper.cpp) | locale, no Python |
| Database | Supabase (PostgreSQL) | nuovo |
| Deploy frontend | Vercel | nuovo |
| Deploy backend (Phase B) | Railway / Fly.io | futuro |

---

## 4. Supabase Schema

```sql
-- CRM records (attualmente in-memory React state)
create table crm_records (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  nome_cliente        text not null,
  stato_deal          text not null,
  probabilita_chiusura integer not null,
  sommario_chiamata   text,
  prossimi_passi      text,
  pain_points         text[],
  voto                integer,
  errori              text[],
  punti_di_forza      text[],
  momento_perdita     text,
  suggerimento        text,
  user_id     uuid    -- null in Phase A, popolato in Phase B
);

-- Knowledge base (manuale + script — attualmente in-memory)
create table knowledge_base (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique,          -- null = default globale in Phase A
  formazione  text,
  manuale     text,
  script      text,
  updated_at  timestamptz default now()
);
```

Row Level Security (RLS): disabilitato in Phase A, abilitato in Phase B quando si introduce l'autenticazione.

---

## 5. Backend Express

### File structure

```
server/
  index.ts              ← entry point, porta 3001
  routes/
    transcribe.ts       ← POST /api/transcribe
    analyze.ts          ← POST /api/analyze
    guidelines.ts       ← POST /api/guidelines
  lib/
    whisper.ts          ← wrapper nodejs-whisper (swappabile Phase B)
    ollama.ts           ← HTTP client Ollama (swappabile Phase B)
```

### Route: POST /api/transcribe

- Accetta `multipart/form-data` con campo `audio` (blob webm/opus)
- Salva temporaneamente su disco (`/tmp/recording-<uuid>.webm`)
- Converte in WAV con ffmpeg (richiesto da whisper.cpp)
- Chiama nodejs-whisper con modello `medium` (o `small` per velocità)
- Restituisce `{ transcript: string }`
- Pulisce i file temporanei

### Route: POST /api/analyze

- Accetta `{ manual, script, transcript }` JSON
- Chiama Ollama `/api/chat` con modello `llama3.1` (o `qwen2.5`)
- Usa `format: "json"` + system prompt strutturato
- Parsing robusto con retry se JSON malformato
- Restituisce `CallAnalysisResult`

### Route: POST /api/guidelines

- Accetta `{ formazione, images?: base64[] }`
- Se presenti immagini → usa modello vision (`qwen2-vl`)
- Se solo testo → usa modello testo
- Restituisce `{ manuale, script }`

---

## 6. Frontend — Modifiche

### Nuovo componente: RecordingPanel.tsx

```
Stati:
  idle        → bottone "Avvia Registrazione"
  recording   → indicatore rosso pulsante + timer + "Ferma e Trascrivi"
  transcribing → spinner "Trascrizione in corso..."
  done        → transcript popolato, vai al tab trascrizione

API browser:
  navigator.mediaDevices.getUserMedia({ audio: true })
  MediaRecorder (formato: audio/webm;codecs=opus)
  Blob → FormData → POST /api/transcribe
```

### Modifiche App.tsx

- Aggiunto tab "Registra" prima di "Knowledge Base"
- RecordingPanel integrato nel tab "Registra"
- Al completamento trascrizione: auto-switch a tab "Trascrizione"

### Sostituzione gemini.ts → api.ts

```typescript
// src/lib/api.ts
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function analyzeSalesCall(...) → POST /api/analyze
export async function generateGuidelines(...) → POST /api/guidelines
```

### Hook: useCrmRecords.ts

```typescript
// Legge/scrive CRM su Supabase invece di useState locale
// Interface invariata rispetto a App.tsx
```

---

## 7. Modelli Ollama

| Funzione | Modello consigliato | Fallback |
|---|---|---|
| Analisi call | `llama3.1` | `qwen2.5` |
| Genera documenti | `llama3.1` | `qwen2.5` |
| Upload immagini | `qwen2-vl` | `llava` |
| Trascrizione | `medium` (Whisper) | `small` per velocità |

Il modello è configurabile via env var `OLLAMA_MODEL` (default: `llama3.1`).

---

## 8. Flusso Utente Completo

```
1. Venditore apre https://supervisore-vendite.vercel.app
2. [Prima volta] Configura Knowledge Base (formazione + eventuale PDF/immagine)
3. Clicca "Genera Documenti" → Ollama genera Manuale + Script
4. Tab "Registra" → clicca "Avvia Registrazione"
5. Avvia la call (telefono/Zoom/Teams)
6. Al termine → "Ferma e Trascrivi"
7. Whisper elabora l'audio (~30-60 sec per chiamata da 10 min)
8. Transcript auto-popolato nel tab "Trascrizione"
9. Clicca "Analizza Chiamata"
10. Ollama analizza → risultati + CRM record salvato su Supabase
```

---

## 9. Variabili d'Ambiente

### Frontend (.env.local)
```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_API_URL=http://localhost:3001
```

### Backend (.env)
```
PORT=3001
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
OLLAMA_VISION_MODEL=qwen2-vl
WHISPER_MODEL=medium
```

---

## 10. Prerequisiti Locali (Phase A)

1. **Node.js** >= 18
2. **Ollama** installato e avviato (`ollama serve`)
3. Modelli scaricati: `ollama pull llama3.1` + `ollama pull qwen2-vl`
4. **ffmpeg** installato (per conversione audio)
5. `npm install` scarica `nodejs-whisper` che compila whisper.cpp automaticamente

---

## 11. Deployment

### Vercel (frontend)
- Build command: `npm run build`
- Output: `dist/`
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`
- In Phase A: `VITE_API_URL` = `http://localhost:3001` (solo per uso locale)
- In Phase B: `VITE_API_URL` = URL Railway/Fly.io pubblico

### Backend (Phase A)
- Avviato localmente con `npm run server`
- Script package.json: `"server": "tsx server/index.ts"`

---

## 12. Cosa NON cambia

- UI layout e design esistente (invariato)
- Struttura `CallAnalysisResult` (stesso JSON)
- Tab CRM Pipeline
- Upload PDF/immagini (gestito lato backend invece che via API Gemini)
- Logica di analisi obiezioni, pain points, CRM data extraction
