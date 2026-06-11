-- Job queue for the local Mac watcher.
-- The Vercel API no longer runs Ollama/whisper in-process: it enqueues a job
-- here and polls until the local watcher (claude -p + whisper.cpp) completes it.
-- `payload` and `result` are jsonb so analyze/guidelines can carry structured
-- JSON; transcribe carries base64 audio in payload and { transcript } in result.

create extension if not exists pgcrypto;

create table if not exists public.job_queue (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('analyze', 'guidelines', 'transcribe')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'error')),
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Watcher polls pending jobs oldest-first.
create index if not exists job_queue_status_idx on public.job_queue (status, created_at);

-- Service-role only access (API + watcher use the service role key). No public RLS.
alter table public.job_queue disable row level security;
