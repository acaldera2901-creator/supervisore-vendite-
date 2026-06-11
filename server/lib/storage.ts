import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CRMRecord, KnowledgeBase } from '../../src/lib/types';

type StoredCrmRecord = Omit<CRMRecord, 'id' | 'date'>;

interface CrmRow {
  id: string;
  created_at: string;
  nome_cliente: string;
  stato_deal: string;
  probabilita_chiusura: number;
  sommario_chiamata: string | null;
  prossimi_passi: string | null;
  pain_points: string[] | null;
  voto: number | null;
  errori: string[] | null;
  punti_di_forza: string[] | null;
  momento_perdita: string | null;
  suggerimento: string | null;
}

interface KnowledgeRow {
  formazione: string | null;
  manuale: string | null;
  script: string | null;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function mapCrmRow(row: CrmRow): CRMRecord {
  return {
    id: row.id,
    date: formatDate(row.created_at),
    nome_cliente: row.nome_cliente,
    stato_deal: row.stato_deal,
    probabilita_chiusura: row.probabilita_chiusura,
    sommario_chiamata: row.sommario_chiamata || '',
    prossimi_passi: row.prossimi_passi || '',
    pain_points: row.pain_points || [],
    voto: row.voto,
    errori: row.errori || [],
    punti_di_forza: row.punti_di_forza || [],
    momento_perdita: row.momento_perdita || '',
    suggerimento: row.suggerimento || '',
  };
}

class LocalStore {
  private crmRecords: CRMRecord[] = [];
  private knowledge: KnowledgeBase | null = null;

  listCrmRecords(): CRMRecord[] {
    return this.crmRecords;
  }

  insertCrmRecord(record: StoredCrmRecord): CRMRecord {
    const stored = {
      ...record,
      id: crypto.randomUUID(),
      date: new Date().toLocaleDateString(),
    };
    this.crmRecords = [stored, ...this.crmRecords];
    return stored;
  }

  getKnowledge(): KnowledgeBase | null {
    return this.knowledge;
  }

  saveKnowledge(knowledge: KnowledgeBase): KnowledgeBase {
    this.knowledge = knowledge;
    return knowledge;
  }
}

const localStore = new LocalStore();

function createSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

const supabase = createSupabase();

export const storage = {
  provider: supabase ? 'supabase' : 'memory',

  async listCrmRecords(): Promise<CRMRecord[]> {
    if (!supabase) return localStore.listCrmRecords();

    const { data, error } = await supabase
      .from('crm_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return ((data || []) as CrmRow[]).map(mapCrmRow);
  },

  async insertCrmRecord(record: StoredCrmRecord): Promise<CRMRecord> {
    if (!supabase) return localStore.insertCrmRecord(record);

    const { data, error } = await supabase
      .from('crm_records')
      .insert({
        nome_cliente: record.nome_cliente,
        stato_deal: record.stato_deal,
        probabilita_chiusura: record.probabilita_chiusura,
        sommario_chiamata: record.sommario_chiamata,
        prossimi_passi: record.prossimi_passi,
        pain_points: record.pain_points,
        voto: record.voto,
        errori: record.errori,
        punti_di_forza: record.punti_di_forza,
        momento_perdita: record.momento_perdita,
        suggerimento: record.suggerimento,
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return mapCrmRow(data as CrmRow);
  },

  async getKnowledge(): Promise<KnowledgeBase | null> {
    if (!supabase) return localStore.getKnowledge();

    const { data, error } = await supabase
      .from('knowledge_base')
      .select('formazione, manuale, script')
      .eq('singleton_key', 'default')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = data as KnowledgeRow;
    return {
      formazione: row.formazione || '',
      manuale: row.manuale || '',
      script: row.script || '',
    };
  },

  async saveKnowledge(knowledge: KnowledgeBase): Promise<KnowledgeBase> {
    if (!supabase) return localStore.saveKnowledge(knowledge);

    const { error } = await supabase.from('knowledge_base').upsert(
      {
        singleton_key: 'default',
        user_id: null,
        formazione: knowledge.formazione,
        manuale: knowledge.manuale,
        script: knowledge.script,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'singleton_key' },
    );

    if (error) throw new Error(error.message);
    return knowledge;
  },
};
