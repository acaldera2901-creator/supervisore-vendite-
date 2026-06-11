import type { CallAnalysisResult, CRMRecord } from '../../src/lib/types';

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function clampPercentage(value: unknown): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function clampScore(value: unknown): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 1;
  return Math.max(1, Math.min(10, Math.round(numeric)));
}

export function normalizeAnalysisResult(value: unknown): CallAnalysisResult {
  const source = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const crmSource = (source.crm_data && typeof source.crm_data === 'object' ? source.crm_data : {}) as Record<string, unknown>;

  return {
    voto: clampScore(source.voto),
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

export function toCrmRecord(analysis: CallAnalysisResult): Omit<CRMRecord, 'id' | 'date'> {
  return {
    nome_cliente: analysis.crm_data.nome_cliente,
    stato_deal: analysis.crm_data.stato_deal,
    probabilita_chiusura: analysis.crm_data.probabilita_chiusura,
    sommario_chiamata: analysis.crm_data.sommario_chiamata,
    prossimi_passi: analysis.crm_data.prossimi_passi,
    pain_points: analysis.pain_points_cliente,
    voto: analysis.voto,
    errori: analysis.errori,
    punti_di_forza: analysis.punti_di_forza,
    momento_perdita: analysis.momento_perdita,
    suggerimento: analysis.suggerimento,
  };
}
