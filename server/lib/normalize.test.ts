import { describe, expect, it } from 'vitest';
import { normalizeAnalysisResult, toCrmRecord } from './normalize';

describe('backend normalization', () => {
  it('builds a CRM record from an analysis result', () => {
    const analysis = normalizeAnalysisResult({
      voto: 6,
      pain_points_cliente: ['migrazione complicata'],
      crm_data: {
        nome_cliente: '',
        stato_deal: 'In Negoziazione',
        probabilita_chiusura: -10,
        sommario_chiamata: 'Cliente dubbioso.',
        prossimi_passi: 'Mandare materiale.',
      },
    });

    const record = toCrmRecord(analysis);

    expect(record.nome_cliente).toBe('Sconosciuto');
    expect(record.probabilita_chiusura).toBe(0);
    expect(record.pain_points).toEqual(['migrazione complicata']);
    expect(record.voto).toBe(6);
  });
});
