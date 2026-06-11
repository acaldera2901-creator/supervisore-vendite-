import { normalizeAnalysisResult, normalizeCrmRecord } from './normalize';
import type { CallAnalysisResult, CRMRecord, FormazioneFile, KnowledgeBase } from './types';

const API_BASE = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL || 'http://localhost:3001')
  : '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : `Request failed: ${response.status}`);
  }
  return payload as T;
}

export async function getHealth(): Promise<{ ok: boolean; storage: string; model: string }> {
  return request('/api/health');
}

export async function getCrmRecords(): Promise<CRMRecord[]> {
  const payload = await request<{ records: unknown[] }>('/api/crm');
  return (payload.records || []).map(normalizeCrmRecord);
}

export async function getKnowledgeBase(): Promise<KnowledgeBase | null> {
  const payload = await request<{ knowledge: KnowledgeBase | null }>('/api/knowledge');
  return payload.knowledge;
}

export async function saveKnowledgeBase(knowledge: KnowledgeBase): Promise<KnowledgeBase> {
  const payload = await request<{ knowledge: KnowledgeBase }>('/api/knowledge', {
    method: 'PUT',
    body: JSON.stringify(knowledge),
  });
  return payload.knowledge;
}

export async function generateGuidelines(
  formazione: string,
  files: FormazioneFile[] = [],
): Promise<{ manuale: string; script: string }> {
  return request('/api/guidelines', {
    method: 'POST',
    body: JSON.stringify({ formazione, files }),
  });
}

export async function transcribeAudio(audio: Blob, filename = 'audio.webm'): Promise<string> {
  const form = new FormData();
  form.append('audio', audio, filename);
  const response = await fetch(`${API_BASE}/api/transcribe`, { method: 'POST', body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : `Trascrizione fallita: ${response.status}`);
  }
  return (payload as { transcript: string }).transcript;
}

export async function analyzeSalesCall(
  manual: string,
  script: string,
  transcript: string,
): Promise<{ analysis: CallAnalysisResult; record: CRMRecord }> {
  const payload = await request<{ analysis: unknown; record: unknown }>('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ manual, script, transcript }),
  });

  return {
    analysis: normalizeAnalysisResult(payload.analysis),
    record: normalizeCrmRecord(payload.record),
  };
}
