import { describe, expect, it } from 'vitest';
import { normalizeAnalysisResult, normalizeCrmRecord } from './normalize';

describe('frontend normalization', () => {
  it('defaults missing list fields in analysis results', () => {
    const result = normalizeAnalysisResult({
      voto: 8,
      crm_data: {
        nome_cliente: 'Acme',
        stato_deal: 'Nuovo',
        probabilita_chiusura: 40,
        sommario_chiamata: 'Interessato al gestionale.',
        prossimi_passi: 'Inviare proposta.',
      },
    });

    expect(result.errori).toEqual([]);
    expect(result.punti_di_forza).toEqual([]);
    expect(result.pain_points_cliente).toEqual([]);
    expect(result.crm_data.nome_cliente).toBe('Acme');
  });

  it('clamps CRM probability into a valid percentage', () => {
    const record = normalizeCrmRecord({
      id: '1',
      date: '17/05/2026',
      nome_cliente: 'Acme',
      stato_deal: 'In Negoziazione',
      probabilita_chiusura: 140,
      sommario_chiamata: 'Follow-up richiesto.',
      prossimi_passi: 'Chiamare domani.',
      pain_points: ['tempi lunghi'],
    });

    expect(record.probabilita_chiusura).toBe(100);
  });
});
