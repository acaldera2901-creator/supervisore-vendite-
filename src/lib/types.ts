export interface ObjectionAnalysis {
  obiezione: string;
  gestita_bene: boolean;
  analisi: string;
}

export interface CrmData {
  nome_cliente: string;
  stato_deal:
    | 'Nuovo'
    | 'In Negoziazione'
    | 'Chiuso Vinto'
    | 'Chiuso Perso'
    | 'Da Ricontattare'
    | string;
  probabilita_chiusura: number;
  sommario_chiamata: string;
  prossimi_passi: string;
}

export interface CallAnalysisResult {
  voto: number;
  errori: string[];
  punti_di_forza: string[];
  punti_deboli: string[];
  obiezioni_sollevate: ObjectionAnalysis[];
  pain_points_cliente: string[];
  momento_perdita: string;
  suggerimento: string;
  crm_data: CrmData;
}

export interface CRMRecord extends CrmData {
  id: string;
  date: string;
  pain_points: string[];
  voto?: number | null;
  errori?: string[] | null;
  punti_di_forza?: string[] | null;
  momento_perdita?: string | null;
  suggerimento?: string | null;
}

export interface FormazioneFile {
  base64: string;
  mimeType: string;
  name: string;
}

export interface KnowledgeBase {
  formazione: string;
  manuale: string;
  script: string;
}
