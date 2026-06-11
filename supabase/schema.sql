create extension if not exists pgcrypto;

create table if not exists public.crm_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome_cliente text not null,
  stato_deal text not null,
  probabilita_chiusura integer not null check (probabilita_chiusura >= 0 and probabilita_chiusura <= 100),
  sommario_chiamata text,
  prossimi_passi text,
  pain_points text[] not null default '{}',
  voto integer check (voto is null or (voto >= 1 and voto <= 10)),
  errori text[] not null default '{}',
  punti_di_forza text[] not null default '{}',
  momento_perdita text,
  suggerimento text,
  user_id uuid
);

create index if not exists crm_records_created_at_idx on public.crm_records (created_at desc);

create table if not exists public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null default 'default',
  user_id uuid,
  formazione text,
  manuale text,
  script text,
  updated_at timestamptz not null default now(),
  constraint knowledge_base_singleton_key_unique unique (singleton_key)
);

create table if not exists public.job_queue (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null,
  status text not null default 'pending',
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_queue_status_idx on public.job_queue (status, created_at);

alter table public.crm_records disable row level security;
alter table public.knowledge_base disable row level security;
alter table public.job_queue disable row level security;
