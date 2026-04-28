import { useState } from 'react';
import { analyzeSalesCall, generateGuidelines, CallAnalysisResult } from './lib/gemini';
import { BookOpen, FileText, MessageCircle, Play, AlertCircle, CheckCircle2, Target, Zap, XCircle, CodeXml, Columns, Loader2, Sparkles, Wand2, Terminal } from 'lucide-react';
import { motion } from 'motion/react';

const DEFAULT_FORMAZIONE = `La nostra azienda vende un software gestionale B2B. 
Il nostro approccio di vendita si basa sull'essere consulenziali. 
Regole base:
- Presentarsi sempre col nome dell'azienda e ringraziare per il tempo.
- Fare 2-3 domande per capire le sfide del cliente. Non proporre subito il prodotto.
- Usare la tecnica "Feel-Felt-Found" per le obiezioni sul prezzo ("Comprendo la preoccupazione...").
- Il nostro target è chiudere la chiamata fissando una demo di 15 minuti.`;


const DEFAULT_MANUAL = `MANUALE DI VENDITA
1. Apertura: presentarsi sempre con nome, azienda e ringraziare per il tempo.
2. Scoperta bisogni: fare domande aperte (almeno 2) per capire le reali esigenze.
3. Proposta personalizzata: collegare la soluzione ai problemi specifici del cliente.
4. Gestione obiezioni: applicare la tecnica "Feel-Felt-Found" – mai sminuire le preoccupazioni.
5. Chiusura: se c'è interesse, proporre un passo concreto (demo, appuntamento). Se il cliente è incerto, fissare comunque un follow-up.
6. Follow-up: concordare sempre data e modalità del prossimo contatto.
7. Divieto assoluto di parlare subito di prezzo senza prima aver creato valore.`;

const DEFAULT_SCRIPT = `SCRIPT IDEALE
- Venditore: "Buongiorno [Nome Cliente], sono [Nome] di [Azienda]. La ringrazio per il tempo che mi dedica."
- Venditore: "Per prima cosa, le chiedo: qual è la sfida più importante che state affrontando in questo momento?"
- (Ascolto attivo, ripetere le parole del cliente)
- Venditore: "Capisco. Molti nostri clienti che avevano la stessa problematica, dopo aver adottato la nostra soluzione, hanno ottenuto [risultato concreto]. Le piacerebbe vedere come potremmo fare lo stesso per voi?"
- Se obiezione prezzo: "Comprendo la preoccupazione per i costi. È proprio per questo che vorrei mostrarle il valore reale: abbiamo clienti che hanno recuperato l'investimento in meno di [X] mesi. Possiamo fissare una demo di 15 minuti?"
- Chiusura: "Allora fissiamo per [data]? Le mando subito le disponibilità."`;

const DEFAULT_TRANSCRIPT = `Venditore: "Pronto buongiorno, sono Marco della TechSolutions, volevo parlare con lei del nostro nuovo software di gestione."
Cliente: "Sì, mi dica."
Venditore: "Allora, abbiamo questo prodotto che fa risparmiare tempo e automatizza i processi, è molto innovativo, lo vuole provare?"
Cliente: "Non lo so... noi usiamo già un altro sistema e cambiare sarebbe complicato. Poi il prezzo?"
Venditore: "Guardi che il nostro è migliore, il prezzo è intorno ai 500 euro al mese. Posso fissarle una demo?"
Cliente: "Non sono convinto, ci penserò."
Venditore: "Va bene, magari le mando una mail. Arrivederci."
Cliente: "Arrivederci."`;

const GEMINI_PYTHON_CODE = `import google.generativeai as genai
import json

genai.configure(api_key='TUA_API_KEY')

SYSTEM_INSTRUCTION = """Sei un supervisore esperto di tecniche di vendita. Il tuo unico compito è analizzare le trascrizioni di chiamate tra un venditore e un cliente, basandoti ESCLUSIVAMENTE sui documenti di riferimento che ti sono stati forniti: il manuale di vendita aziendale e lo script ideale di vendita.

Per ogni trascrizione che riceverai, produrrai un'analisi strutturata in formato JSON valido, senza markdown, senza testo aggiuntivo, senza commenti. Il JSON dovrà avere rigorosamente la seguente struttura:
{
  "voto": 0, "errori": [], "punti_di_forza": [], "punti_deboli": [], "momento_perdita": "", "suggerimento": ""
}
Dove:
- "voto": intero 1-10
- "errori": lista di stringhe
- "punti_di_forza": lista di stringhe
- "punti_deboli": lista di stringhe
- "momento_perdita": battuta precisa in cui si perde il controllo
- "suggerimento": consiglio concreto
"""

model = genai.GenerativeModel(
    model_name="gemini-2.5-pro",
    system_instruction=SYSTEM_INSTRUCTION
)

def analizza_trascrizione(transcript: str, manuale: str, script: str) -> dict:
    prompt = f"""Manuale aziendale:
{manuale}

Script ideale di vendita:
{script}

Trascrizione della chiamata:
{transcript}

Analizza la conversazione e restituisci SOLO il JSON."""

    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.1
        )
    )
    return json.loads(response.text)`

const OPENAI_PYTHON_CODE = `import json
from openai import OpenAI

# Puoi usare il client OpenAI per connetterti a OpenAI, Groq, Together 
# oppure a un server Ollama remoto che richiede una API Key impostando base_url
client = OpenAI(
    api_key='992f1b41e49a49b6b17963e6622dbae4.f6ioMo7dREpBs0uXl8XHiTiD',
    # base_url='https://tuo-server-ollama.com/v1' # Decommenta per usare un tuo server Ollama compatibile OpenAI
)

SYSTEM_INSTRUCTION = """... usa la stessa definita sopra ..."""

def analizza_con_openai(transcript: str, manuale: str, script: str) -> dict:
    prompt = f"""Manuale aziendale:\\n{manuale}\\n\\nScript ideale:\\n{script}\\n\\nTrascrizione:\\n{transcript}\\n\\nRESTITUISCI SOLO IL JSON."""

    response = client.chat.completions.create(
        model='gpt-4o-mini', # oppure 'llama3' se stai usando il tuo endpoint Ollama
        messages=[
            {'role': 'system', 'content': SYSTEM_INSTRUCTION},
            {'role': 'user', 'content': prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.1
    )
    raw = response.choices[0].message.content
    return json.loads(raw)`

const OLLAMA_PYTHON_CODE = `import json
from ollama import Client

# Se invece usi la libreria nativa di Ollama e il server richiede una API Key (Bearer token):
client = Client(
    host='https://tuo-server-ollama.com',
    headers={'Authorization': 'Bearer 992f1b41e49a49b6b17963e6622dbae4.f6ioMo7dREpBs0uXl8XHiTiD'}
)

SYSTEM_INSTRUCTION = """... usa la stessa definita sopra ..."""

def analizza_con_ollama(transcript: str, manuale: str, script: str) -> dict:
    prompt = f"""Manuale aziendale:\\n{manuale}\\n\\nScript ideale:\\n{script}\\n\\nTrascrizione:\\n{transcript}\\n\\nRESTITUISCI SOLO IL JSON."""

    response = client.chat(
        model='llama3',
        messages=[
            {'role': 'system', 'content': SYSTEM_INSTRUCTION},
            {'role': 'user', 'content': prompt}
        ],
        format='json',
        options={'temperature': 0.1}
    )
    raw = response['message']['content']
    
    # Pulizia opzionale
    if raw.startswith('\`\`\`'):
        raw = raw.split('\\n', 1)[1].rsplit('\`\`\`', 1)[0]
    return json.loads(raw)`

export default function App() {
  const [formazione, setFormazione] = useState(DEFAULT_FORMAZIONE);
  const [manual, setManual] = useState(DEFAULT_MANUAL);
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [transcript, setTranscript] = useState(DEFAULT_TRANSCRIPT);
  
  const [loading, setLoading] = useState(false);
  const [generatingDocs, setGeneratingDocs] = useState(false);
  const [result, setResult] = useState<CallAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'formatted'|'raw'|'code'>('formatted');
  const [inputTab, setInputTab] = useState<'knowledge'|'transcript'>('knowledge');

  const handleGenerateDocs = async () => {
    if (!formazione.trim()) {
      setError('Inserisci del materiale di formazione per generare i documenti.');
      return;
    }
    setGeneratingDocs(true);
    setError('');
    try {
      const data = await generateGuidelines(formazione);
      setManual(data.manuale);
      setScript(data.script);
      setError('Documenti generati con successo!');
      setTimeout(() => setError(''), 3000);
    } catch (err: any) {
      setError(err.message || "Si è verificato un errore durante la generazione dei documenti.");
    } finally {
      setGeneratingDocs(false);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await analyzeSalesCall(manual, script, transcript);
      setResult(data);
      setViewMode('formatted');
    } catch (err: any) {
      setError(err.message || "Si è verificato un errore durante l'analisi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-300 font-sans p-4 md:p-8 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-zinc-500 uppercase tracking-[0.2em] text-xs font-semibold mb-1 flex items-center gap-2">
              <Target size={14} /> Supervisore Vendite AI
            </h1>
            <h2 className="text-3xl font-light text-white italic font-serif">Analisi Sessione</h2>
          </div>
          <div className="flex items-center gap-4 md:gap-8 mt-4 md:mt-0">
             {result && (
              <div className="flex flex-col items-center">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Valutazione</p>
                <div className="text-4xl font-serif text-amber-500 leading-none">{result.voto}<span className="text-lg text-zinc-600 font-sans">/10</span></div>
              </div>
             )}
             {result && <div className="h-12 w-px bg-zinc-800 hidden md:block"></div>}
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 text-white text-[10px] font-bold rounded-full transition-colors uppercase tracking-widest flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Play fill="currentColor" size={14} />}
              {loading ? 'Analisi in corso...' : 'Analizza Chiamata'}
            </button>
          </div>
        </header>

        {error && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${error.includes('successo') ? 'bg-emerald-900/10 text-emerald-400 border-emerald-900/50' : 'bg-red-900/10 text-red-400 border-red-900/50'}`}>
            {error.includes('successo') ? <Sparkles className="mt-0.5 shrink-0 text-emerald-500" size={18} /> : <AlertCircle className="mt-0.5 shrink-0" size={18} />}
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Main Content Layout */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
          
          {/* Left Column: Context Inputs */}
          <section className="col-span-1 lg:col-span-5 flex flex-col min-h-0">
            <div className="flex border-b border-zinc-800 pb-2 gap-4 mb-4">
              <button 
                onClick={() => setInputTab('knowledge')}
                className={`text-[10px] uppercase font-bold tracking-widest pb-2 border-b-2 transition-colors ${inputTab === 'knowledge' ? 'text-zinc-100 border-blue-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
              >
                Knowledge Base
              </button>
              <button 
                onClick={() => setInputTab('transcript')}
                className={`text-[10px] uppercase font-bold tracking-widest pb-2 border-b-2 transition-colors ${inputTab === 'transcript' ? 'text-zinc-100 border-blue-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
              >
                Trascrizione
              </button>
            </div>

            {inputTab === 'transcript' && (
              <div className="bg-[#121212] rounded-xl border border-zinc-800 p-6 flex flex-col flex-1 min-h-[30rem]">
                <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Trascrizione Chiamata
                </h3>
                <textarea 
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="flex-1 w-full bg-transparent text-zinc-300 text-xs leading-relaxed focus:outline-none resize-none font-mono placeholder-zinc-700"
                  placeholder="Incolla qui la trascrizione della chiamata..."
                />
              </div>
            )}

            {inputTab === 'knowledge' && (
              <div className="flex flex-col gap-6 overflow-y-auto pr-2 pb-2">
                <div className="bg-[#161616] rounded-xl border border-blue-900/40 p-5 flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-5">
                    <Sparkles size={60} />
                  </div>
                  <h3 className="text-xs uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-2">
                    <Wand2 size={14} /> Materiale Formazione (AI Gen)
                  </h3>
                  <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed max-w-[90%]">
                    Inserisci gli appunti o le procedure descrittive. L'AI genererà automaticamente un Manuale a punti e lo Script Ideale strutturati per l'analisi.
                  </p>
                  <textarea 
                    value={formazione}
                    onChange={(e) => setFormazione(e.target.value)}
                    className="w-full h-32 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-zinc-300 text-[11px] leading-relaxed focus:outline-none focus:border-blue-500/50 resize-none font-sans placeholder-zinc-700 relative z-10"
                    placeholder="Descrivi come il venditore dovrebbe comportarsi..."
                  />
                  <div className="mt-3 flex justify-end relative z-10">
                    <button
                      onClick={handleGenerateDocs}
                      disabled={generatingDocs}
                      className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 disabled:opacity-50 text-[10px] uppercase font-bold tracking-widest rounded-lg transition-colors flex items-center gap-2 border border-blue-500/30"
                    >
                      {generatingDocs ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {generatingDocs ? 'Generazione...' : 'Genera Documenti Base'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#121212] rounded-xl border border-zinc-800 p-5 flex flex-col h-64">
                    <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Manuale
                    </h3>
                    <textarea 
                      value={manual}
                      onChange={(e) => setManual(e.target.value)}
                      className="flex-1 w-full bg-transparent text-zinc-300 text-xs leading-relaxed focus:outline-none resize-none placeholder-zinc-700"
                      placeholder="Incolla le linee guida aziendali..."
                    />
                  </div>

                  <div className="bg-[#121212] rounded-xl border border-zinc-800 p-5 flex flex-col h-64">
                    <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-500"></span> Script
                    </h3>
                    <textarea 
                      value={script}
                      onChange={(e) => setScript(e.target.value)}
                      className="flex-1 w-full bg-transparent text-zinc-300 text-xs leading-relaxed focus:outline-none resize-none placeholder-zinc-700"
                      placeholder="Incolla lo script ideale..."
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Right Column: Analysis Results */}
          <section className="col-span-1 lg:col-span-7 flex flex-col min-h-0 gap-6">
            
            <div className="flex border-b border-zinc-800 pb-2 gap-4">
              <button 
                onClick={() => setViewMode('formatted')}
                className={`text-[10px] uppercase font-bold tracking-widest pb-2 border-b-2 transition-colors ${viewMode === 'formatted' ? 'text-zinc-100 border-amber-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
              >
                Formattato
              </button>
              <button 
                onClick={() => setViewMode('raw')}
                className={`text-[10px] uppercase font-bold tracking-widest pb-2 border-b-2 transition-colors ${viewMode === 'raw' ? 'text-zinc-100 border-emerald-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
              >
                JSON Grezzo
              </button>
              <button 
                onClick={() => setViewMode('code')}
                className={`text-[10px] uppercase font-bold tracking-widest pb-2 border-b-2 transition-colors ${viewMode === 'code' ? 'text-zinc-100 border-blue-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
              >
                Integrazione API
              </button>
            </div>

            <div className={`flex-1 rounded-xl overflow-y-auto ${viewMode === 'raw' || viewMode === 'code' ? 'bg-[#121212] border border-zinc-800 p-6' : ''}`}>
              {!result && !loading && viewMode !== 'code' && (
                <div className="h-full min-h-[20rem] flex flex-col items-center justify-center text-zinc-600 space-y-4">
                  <div className="p-4 bg-zinc-800/30 rounded-full border border-zinc-800">
                    <Target size={32} className="text-zinc-500" />
                  </div>
                  <p className="text-sm">Avvia l'analisi per visualizzare il report</p>
                </div>
              )}

              {loading && (
                <div className="h-full min-h-[20rem] flex flex-col items-center justify-center text-amber-500 space-y-4">
                  <div className="p-4 bg-amber-500/10 rounded-full animate-pulse border border-amber-500/20">
                    <Loader2 size={32} className="animate-spin" />
                  </div>
                  <p className="text-sm font-medium tracking-widest uppercase animate-pulse">Analisi in corso...</p>
                </div>
              )}

              {result && !loading && viewMode === 'raw' && (
                <motion.pre 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="text-emerald-400 text-xs font-mono whitespace-pre-wrap leading-relaxed min-h-[20rem]"
                >
                  {JSON.stringify(result, null, 2)}
                </motion.pre>
              )}

              {viewMode === 'code' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-blue-400 tracking-widest flex items-center gap-2 mb-3">
                      <Terminal size={14} /> Python Backend (Gemini API)
                    </h4>
                    <pre className="text-zinc-300 text-[10px] sm:text-[11px] font-mono bg-[#0a0a0a] p-4 rounded-lg border border-zinc-800/80 overflow-x-auto leading-relaxed">
                      {GEMINI_PYTHON_CODE}
                    </pre>
                  </div>
                  <div className="pt-4 border-t border-zinc-800/50">
                    <h4 className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest flex items-center gap-2 mb-3">
                      <Terminal size={14} /> Python Backend (LLM Locali tramite Ollama)
                    </h4>
                    <pre className="text-zinc-300 text-[10px] sm:text-[11px] font-mono bg-[#0a0a0a] p-4 rounded-lg border border-zinc-800/80 overflow-x-auto leading-relaxed">
                      {OLLAMA_PYTHON_CODE}
                    </pre>
                  </div>
                </motion.div>
              )}

              {result && !loading && viewMode === 'formatted' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  
                  {/* Top: Errors & Strengths Grid */}
                  {(result.errori.length > 0 || result.momento_perdita) && (
                    <div className={`grid grid-cols-1 gap-4 md:grid-cols-2`}>
                      <div className="bg-[#161616] p-5 rounded-xl border border-zinc-800/50 flex flex-col">
                        <h4 className="text-[10px] uppercase font-bold text-red-400 mb-3 tracking-widest">Errori Critici</h4>
                        <ul className="text-[11px] space-y-3">
                          {result.errori.length > 0 ? result.errori.map((err, i) => (
                            <li key={i} className="flex gap-2"><span className="text-red-500 shrink-0">•</span> <span className="text-zinc-300">{err}</span></li>
                          )) : (
                            <li className="text-[11px] text-zinc-600 italic">Nessun errore contro il protocollo.</li>
                          )}
                        </ul>
                      </div>
                      <div className="bg-[#161616] p-5 rounded-xl border border-zinc-800/50 flex flex-col">
                        <h4 className="text-[10px] uppercase font-bold text-emerald-400 mb-3 tracking-widest">Punti di Forza</h4>
                        <ul className="text-[11px] space-y-3">
                          {result.punti_di_forza.length > 0 ? result.punti_di_forza.map((p, i) => (
                            <li key={i} className="flex gap-2"><span className="text-emerald-500 shrink-0">•</span> <span className="text-zinc-300">{p}</span></li>
                          )) : (
                            <li className="text-[11px] text-zinc-600 italic">Nessun punto di forza evidenziato.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}

                  {result.punti_deboli.length > 0 && (
                    <div className="bg-[#161616] p-5 rounded-xl border border-zinc-800/50 flex flex-col">
                      <h4 className="text-[10px] uppercase font-bold text-amber-500 mb-3 tracking-widest">Aree da Migliorare</h4>
                      <ul className="text-[11px] space-y-3">
                        {result.punti_deboli.map((p, i) => (
                          <li key={i} className="flex gap-2"><span className="text-amber-500 shrink-0">•</span> <span className="text-zinc-300">{p}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.momento_perdita ? (
                    <div className="bg-red-900/10 p-5 rounded-xl border-l-2 border-red-500/50">
                      <p className="text-[10px] uppercase font-bold text-red-500 mb-2 tracking-widest italic flex items-center gap-2">
                        <XCircle size={14} /> Momento di Perdita
                      </p>
                      <p className="text-zinc-200 font-medium font-serif italic text-sm leading-relaxed">
                        "{result.momento_perdita}"
                      </p>
                    </div>
                  ) : (
                    result.errori.length === 0 && (
                      <div className="bg-emerald-900/10 p-6 rounded-xl border-l-2 border-emerald-500/50 flex flex-col gap-3">
                        <h4 className="text-[10px] uppercase font-bold text-emerald-500 tracking-widest flex items-center gap-2">
                          <CheckCircle2 size={16} /> Chiamata Ideale: Punti di Forza
                        </h4>
                        <ul className="text-sm space-y-3 font-serif italic">
                          {result.punti_di_forza.length > 0 ? (
                            result.punti_di_forza.map((p, i) => (
                              <li key={i} className="flex gap-3 text-zinc-200"><span className="text-emerald-500 shrink-0 mt-1 opacity-60 text-[10px]">♦</span> <span className="leading-relaxed">{p}</span></li>
                            ))
                          ) : (
                            <li className="text-zinc-500 text-[12px] not-italic">Ottima chiamata, nessun errore o punto di perdita rilevato.</li>
                          )}
                        </ul>
                      </div>
                    )
                  )}

                  {/* Bottom: Key Insight & Suggestion */}
                  <div className="bg-[#161616] p-6 rounded-xl border border-amber-500/20 flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-5">
                      <Zap size={80} />
                    </div>
                    <h4 className="text-[10px] uppercase font-bold text-amber-500 mb-3 tracking-widest">Suggerimento Operativo</h4>
                    <p className="text-lg font-serif italic text-zinc-100 leading-snug relative z-10">
                      "{result.suggerimento}"
                    </p>
                  </div>

                </motion.div>
              )}
            </div>

          </section>
        </main>
        
        {/* Footer Info */}
        <footer className="mt-8 flex justify-between items-center text-[10px] text-zinc-600 uppercase tracking-tighter border-t border-zinc-800 pt-6">
          <p>Sales Supervisor Engine v4.2.0-Alpha</p>
          <p>© 2024 Corporate Sales Compliance Division</p>
        </footer>
      </div>
    </div>
  );
}
