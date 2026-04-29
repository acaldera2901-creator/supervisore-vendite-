import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface CallAnalysisResult {
  voto: number;
  errori: string[];
  punti_di_forza: string[];
  punti_deboli: string[];
  momento_perdita: string;
  suggerimento: string;
}

export async function generateGuidelines(formazione: string): Promise<{manuale: string, script: string}> {
  const systemInstruction = `Sei un Sales Director esperto. Il tuo compito è analizzare il materiale di formazione fornito e generare un Manuale di Vendita conciso e uno Script Ideale.`;
  const prompt = `Materiale di formazione:\n${formazione}\n\nEstrai e formatta le informazioni restituendo ESATTAMENTE un JSON con la seguente struttura:\n{\n  "manuale": "...",\n  "script": "..."\n}\nSii preciso e professionale. Non includere markdown fuori dal JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
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
  "momento_perdita": "",
  "suggerimento": ""
}

Dove:
- "voto": numero intero tra 1 e 10 che valuta l'efficacia complessiva della chiamata.
- "errori": lista di stringhe. Ogni errore deve indicare cosa ha sbagliato il venditore, con riferimento alla trascrizione e regole.
- "punti_di_forza": lista di stringhe con aspetti positivi della chiamata.
- "punti_deboli": lista di stringhe con aree di debolezza.
- "momento_perdita": battuta in cui il venditore perde. Stringa vuota se non applicabile.
- "suggerimento": un consiglio concreto.

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
          momento_perdita: { type: Type.STRING },
          suggerimento: { type: Type.STRING }
        },
        required: ['voto', 'errori', 'punti_di_forza', 'punti_deboli', 'momento_perdita', 'suggerimento']
      },
      temperature: 0.1
    }
  });

  const content = response.text || "{}";
  return JSON.parse(content) as CallAnalysisResult;
}
