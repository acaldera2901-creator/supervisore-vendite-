import type { CallAnalysisResult, CRMRecord } from './types';

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function clampPercentage(value: unknown): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

export function normalizeAnalysisResult(value: unknown): CallAnalysisResult {
  const source = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const crmSource = (source.crm_data && typeof source.crm_data === 'object' ? source.crm_data : {}) as Record<string, unknown>;

  return {
    voto: clampPercentage(source.voto) > 10 ? 10 : Math.max(1, clampPercentage(source.voto)),
    errori: asStringArray(source.errori),
    punti_di_forza: asStringArray(source.punti_di_forza),
    punti_deboli: asStringArray(source.punti_deboli),
    obiezioni_sollevate: Array.isArray(source.obiezioni_sollevate)
      ? source.obiezioni_sollevate.map((item) => {
          const objection = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
          return {
            obiezione: asString(objection.obiezione),
            gestita_bene: Boolean(objection.gestita_bene),
            analisi: asString(objection.analisi),
          };
        })
      : [],
    pain_points_cliente: asStringArray(source.pain_points_cliente),
    momento_perdita: asString(source.momento_perdita),
    suggerimento: asString(source.suggerimento),
    crm_data: {
      nome_cliente: asString(crmSource.nome_cliente, 'Sconosciuto').trim() || 'Sconosciuto',
      stato_deal: asString(crmSource.stato_deal, 'Nuovo'),
      probabilita_chiusura: clampPercentage(crmSource.probabilita_chiusura),
      sommario_chiamata: asString(crmSource.sommario_chiamata),
      prossimi_passi: asString(crmSource.prossimi_passi),
    },
  };
}

export function normalizeCrmRecord(value: unknown): CRMRecord {
  const source = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;

  return {
    id: asString(source.id, crypto.randomUUID()),
    date: asString(source.date, new Date().toLocaleDateString()),
    nome_cliente: asString(source.nome_cliente, 'Sconosciuto').trim() || 'Sconosciuto',
    stato_deal: asString(source.stato_deal, 'Nuovo'),
    probabilita_chiusura: clampPercentage(source.probabilita_chiusura),
    sommario_chiamata: asString(source.sommario_chiamata),
    prossimi_passi: asString(source.prossimi_passi),
    pain_points: asStringArray(source.pain_points),
    voto: typeof source.voto === 'number' ? source.voto : null,
    errori: asStringArray(source.errori),
    punti_di_forza: asStringArray(source.punti_di_forza),
    momento_perdita: asString(source.momento_perdita),
    suggerimento: asString(source.suggerimento),
  };
}
