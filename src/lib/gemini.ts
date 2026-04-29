import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface CallAnalysisResult {
  voto: number;
  errori: string[];
  punti_di_forza: string[];
  punti_deboli: string[];
  obiezioni_sollevate: {
    obiezione: string;
    gestita_bene: boolean;
    analisi: string;
  }[];
  pain_points_cliente: string[];
  momento_perdita: string;
  suggerimento: string;
  crm_data: {
    nome_cliente: string;
    stato_deal: 'Nuovo' | 'In Negoziazione' | 'Chiuso Vinto' | 'Chiuso Perso' | 'Da Ricontattare';
    probabilita_chiusura: number;
    sommario_chiamata: string;
    prossimi_passi: string;
  };
}

export interface FormazioneFile {
  base64: string;
  mimeType: string;
  name: string;
}

export async function generateGuidelines(formazione: string, files: FormazioneFile[] = []): Promise<{manuale: string, script: string}> {
  const systemInstruction = `Sei un Sales Director esperto. Il tuo compito è analizzare il materiale di formazione fornito e generare un Manuale di Vendita conciso e uno Script Ideale.`;
  const prompt = `Materiale di formazione testuale:\n${formazione}${files.length > 0 ? '\n\n(Inoltre, considera i documenti e le immagini allegate)' : ''}\n\nEstrai e formatta le informazioni restituendo ESATTAMENTE un JSON con la seguente struttura:\n{\n  "manuale": "...",\n  "script": "..."\n}\nSii preciso e professionale. Non includere markdown fuori dal JSON.`;

  const contents: any[] = [prompt];
  for (const file of files) {
    contents.push({
      inlineData: {
        data: file.base64,
        mimeType: file.mimeType
      }
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          manuale: { type: Type.STRING },
          script: { type: Type.STRING }
        },
        required: ['manuale', 'script']
      },
      temperature: 0.1
    }
  });

  const content = response.text || "{}";
  return JSON.parse(content) as {manuale: string, script: string};
}

export async function analyzeSalesCall(
  manualText: string,
  scriptText: string,
  transcriptText: string
): Promise<CallAnalysisResult> {
  const systemInstruction = `Sei un supervisore esperto di tecniche di vendita. Il tuo unico compito è analizzare le trascrizioni di chiamate tra un venditore e un cliente, basandoti ESCLUSIVAMENTE sui documenti di riferimento che ti sono stati forniti: il manuale di vendita aziendale e lo script ideale di vendita.

Per ogni trascrizione che riceverai, produrrai un'analisi strutturata in formato JSON valido, senza markdown, senza testo aggiuntivo, senza commenti. Il JSON dovrà avere rigorosamente la seguente struttura:

{
  "voto": 0,
  "errori": [],
  "punti_di_forza": [],
  "punti_deboli": [],
  "obiezioni_sollevate": [
    {
      "obiezione": "",
      "gestita_bene": true,
      "analisi": ""
    }
  ],
  "pain_points_cliente": [],
  "momento_perdita": "",
  "suggerimento": "",
  "crm_data": {
    "nome_cliente": "Mario Rossi o Sconosciuto",
    "stato_deal": "In Negoziazione",
    "probabilita_chiusura": 50,
    "sommario_chiamata": "...",
    "prossimi_passi": "..."
  }
}

Dove:
- "voto": numero intero tra 1 e 10 che valuta l'efficacia complessiva della chiamata.
- "errori": lista di stringhe. Ogni errore deve indicare cosa ha sbagliato il venditore, con riferimento alla trascrizione e regole.
- "punti_di_forza": lista di stringhe con aspetti positivi della chiamata.
- "punti_deboli": lista di stringhe con aree di debolezza.
- "obiezioni_sollevate": array di oggetti che descrivono le obiezioni del cliente, se sono state gestite bene dal venditore e un'analisi su come sono state gestite o come andavano gestite.
- "pain_points_cliente": lista di stringhe che identificano i reali "pain points" (punti di dolore, problemi, necessità) che il cliente ha manifestato durante la chiamata.
- "momento_perdita": battuta in cui il venditore perde. Stringa vuota se non applicabile.
- "suggerimento": un consiglio concreto.
- "crm_data": Oggetto con i dati estratti per il CRM, incluse nome_cliente (usa 'Sconosciuto' se non menzionato), stato_deal, probabilita_chiusura, sommario_chiamata e prossimi_passi.

La risposta deve essere SOLO il JSON. Nient'altro.`;

  const prompt = `Manuale aziendale:\n${manualText}\n\nScript ideale di vendita:\n${scriptText}\n\nTrascrizione della chiamata:\n${transcriptText}\n\nRestituisci SOLO IL JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          voto: { type: Type.INTEGER },
          errori: { type: Type.ARRAY, items: { type: Type.STRING } },
          punti_di_forza: { type: Type.ARRAY, items: { type: Type.STRING } },
          punti_deboli: { type: Type.ARRAY, items: { type: Type.STRING } },
          obiezioni_sollevate: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                obiezione: { type: Type.STRING },
                gestita_bene: { type: Type.BOOLEAN },
                analisi: { type: Type.STRING }
              },
              required: ["obiezione", "gestita_bene", "analisi"]
            } 
          },
          pain_points_cliente: { type: Type.ARRAY, items: { type: Type.STRING } },
          momento_perdita: { type: Type.STRING },
          suggerimento: { type: Type.STRING },
          crm_data: {
            type: Type.OBJECT,
            properties: {
              nome_cliente: { type: Type.STRING },
              stato_deal: { type: Type.STRING },
              probabilita_chiusura: { type: Type.INTEGER },
              sommario_chiamata: { type: Type.STRING },
              prossimi_passi: { type: Type.STRING }
            },
            required: ["nome_cliente", "stato_deal", "probabilita_chiusura", "sommario_chiamata", "prossimi_passi"]
          }
        },
        required: ['voto', 'errori', 'punti_di_forza', 'punti_deboli', 'obiezioni_sollevate', 'pain_points_cliente', 'momento_perdita', 'suggerimento', 'crm_data']
      },
      temperature: 0.1
    }
  });

  const content = response.text || "{}";
  return JSON.parse(content) as CallAnalysisResult;
}
