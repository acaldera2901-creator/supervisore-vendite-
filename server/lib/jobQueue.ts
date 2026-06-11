import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type JobType = 'analyze' | 'guidelines' | 'transcribe';
export type JobStatus = 'pending' | 'processing' | 'done' | 'error';

interface JobRow {
  id: string;
  type: JobType;
  payload: unknown;
  status: JobStatus;
  result: unknown;
  error: string | null;
}

function createSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase non configurato: imposta SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const supabase = createSupabase();

// Tempo massimo di attesa che il watcher locale completi il job.
// Deve stare SOTTO il maxDuration della funzione Vercel (60s in vercel.json),
// altrimenti Vercel uccide la funzione con un 504 grezzo prima del timeout pulito.
const POLL_TIMEOUT_MS = 55_000;
const POLL_INTERVAL_MS = 1_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Inserisce un job e fa polling finché il watcher locale non lo porta a 'done' o 'error'.
// Restituisce il campo `result` del job completato. Le API Vercel non eseguono più
// Ollama/whisper in proc: delegano al watcher tramite questa coda.
export async function enqueueAndWait<T = unknown>(type: JobType, payload: unknown): Promise<T> {
  const { data: inserted, error: insertError } = await supabase
    .from('job_queue')
    .insert({ type, payload, status: 'pending' })
    .select('id')
    .single();

  if (insertError || !inserted) {
    throw new Error(`Impossibile accodare il job: ${insertError?.message || 'errore sconosciuto'}`);
  }

  const jobId = (inserted as { id: string }).id;
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    const { data, error } = await supabase
      .from('job_queue')
      .select('id, type, payload, status, result, error')
      .eq('id', jobId)
      .single();

    if (error) {
      throw new Error(`Errore lettura job: ${error.message}`);
    }

    const job = data as JobRow;
    if (job.status === 'done') {
      return job.result as T;
    }
    if (job.status === 'error') {
      throw new Error(job.error || 'Il job è terminato con errore.');
    }
  }

  throw new Error('Timeout: il watcher locale non ha completato il job entro 60s. È avviato? (npm run watcher)');
}
