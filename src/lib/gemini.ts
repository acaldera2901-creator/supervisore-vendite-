import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

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
  
  const prompt = `Materiale di formazione:\n${formazione}\n\nEstrai e formatta le informazioni restituendo ESATTAMENTE un JSON con la seguente struttura:\n{\n  "manuale": "Testo del manuale con le regole principali a punti (es. 1. Apertura, 2. Scoperta, ecc.)",\n  "script": "Script ideale con un dialogo di esempio tra Venditore e Cliente"\n}\nSii preciso e professionale. Non includere markdown fuori dal JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          manuale: { type: "string" },
          script: { type: "string" }
        },
        required: ["manuale", "script"]
      }
    }
  });

  if (!response.text) throw new Error("Nessuna risposta dal modello.");
  return JSON.parse(response.text) as {manuale: string, script: string};
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
- "errori": lista di stringhe. Ogni errore deve indicare:
   * Cosa ha sbagliato il venditore.
   * Un riferimento concreto alla trascrizione.
   * Se l'errore viola una regola, citarla.
- "punti_di_forza": lista di stringhe che descrivono gli aspetti positivi della chiamata, con esempi specifici tratti dalla conversazione, su cui il venditore dovrebbe capitalizzare.
- "punti_deboli": lista di stringhe che descrivono le aree di debolezza più rilevanti della conversazione, anche qui con riferimenti concreti.
- "momento_perdita": battuta in cui il venditore perde.
- "suggerimento": un consiglio concreto.

Linee guida fondamentali:
- Confronta ogni singola fase della chiamata con il manuale e lo script.
- Sii pignolo.
- La risposta deve essere SOLO il JSON descritto. Nient'altro.`;

  const prompt = `Manuale aziendale:\n${manualText}\n\nScript ideale di vendita:\n${scriptText}\n\nTrascrizione della chiamata:\n${transcriptText}\n\nAnalizza la conversazione e restituisci SOLO il JSON richiesto dalle istruzioni di sistema.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          voto: { type: "integer" },
          errori: { type: "array", items: { type: "string" } },
          punti_di_forza: { type: "array", items: { type: "string" } },
          punti_deboli: { type: "array", items: { type: "string" } },
          momento_perdita: { type: "string" },
          suggerimento: { type: "string" }
        },
        required: ["voto", "errori", "punti_di_forza", "punti_deboli", "momento_perdita", "suggerimento"]
      }
    }
  });

  if (!response.text) throw new Error("Nessuna risposta dal modello.");
  return JSON.parse(response.text) as CallAnalysisResult;
}
