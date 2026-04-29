import { useState } from 'react';
import { analyzeSalesCall, generateGuidelines, CallAnalysisResult, FormazioneFile } from './lib/gemini';
import { BookOpen, FileText, MessageCircle, Play, AlertCircle, CheckCircle2, Target, Zap, XCircle, CodeXml, Columns, Loader2, Sparkles, Wand2, UploadCloud, X, LayoutDashboard, Users } from 'lucide-react';
import { motion } from 'motion/react';

export interface CRMRecord {
  id: string;
  date: string;
  nome_cliente: string;
  stato_deal: 'Nuovo' | 'In Negoziazione' | 'Chiuso Vinto' | 'Chiuso Perso' | 'Da Ricontattare' | string;
  probabilita_chiusura: number;
  sommario_chiamata: string;
  prossimi_passi: string;
  pain_points: string[];
}

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

export default function App() {
  const [formazione, setFormazione] = useState(DEFAULT_FORMAZIONE);
  const [files, setFiles] = useState<FormazioneFile[]>([]);
  const [manual, setManual] = useState(DEFAULT_MANUAL);
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [transcript, setTranscript] = useState(DEFAULT_TRANSCRIPT);
  
  const [loading, setLoading] = useState(false);
  const [generatingDocs, setGeneratingDocs] = useState(false);
  const [result, setResult] = useState<CallAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'formatted'|'raw'>('formatted');
  const [inputTab, setInputTab] = useState<'knowledge'|'transcript'>('knowledge');
  const [mainTab, setMainTab] = useState<'analyzer' | 'crm'>('analyzer');
  const [crmRecords, setCrmRecords] = useState<CRMRecord[]>([]);

  const handleGenerateDocs = async () => {
    if (!formazione.trim()) {
      setError('Inserisci del materiale di formazione per generare i documenti.');
      return;
    }
    setGeneratingDocs(true);
    setError('');
    try {
      const data = await generateGuidelines(formazione, files);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    let processedCount = 0;
    const newFormazioneFiles: FormazioneFile[] = [];

    selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const base64 = result.split(',')[1];
        newFormazioneFiles.push({
          name: file.name,
          mimeType: file.type,
          base64: base64
        });
        processedCount++;
        if (processedCount === selectedFiles.length) {
          setFiles(prev => [...prev, ...newFormazioneFiles]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await analyzeSalesCall(manual, script, transcript);
      setResult(data);
      setViewMode('formatted');
      
      if (data.crm_data) {
        const newRecord: CRMRecord = {
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          date: new Date().toLocaleDateString(),
          nome_cliente: data.crm_data.nome_cliente,
          stato_deal: data.crm_data.stato_deal,
          probabilita_chiusura: data.crm_data.probabilita_chiusura,
          sommario_chiamata: data.crm_data.sommario_chiamata,
          prossimi_passi: data.crm_data.prossimi_passi,
          pain_points: data.pain_points_cliente || []
        };
        setCrmRecords(prev => [newRecord, ...prev]);
      }
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

        {/* Main Tabs Segment */}
        <div className="flex gap-4 border-b border-zinc-800 pb-2">
          <button
            onClick={() => setMainTab('analyzer')}
            className={`text-[11px] uppercase font-bold tracking-widest pb-3 border-b-2 transition-colors flex items-center gap-2 ${mainTab === 'analyzer' ? 'text-amber-500 border-amber-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
          >
            <CodeXml size={16} /> Analyzer
          </button>
          <button
            onClick={() => setMainTab('crm')}
            className={`text-[11px] uppercase font-bold tracking-widest pb-3 border-b-2 transition-colors flex items-center gap-2 ${mainTab === 'crm' ? 'text-emerald-500 border-emerald-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
          >
            <Users size={16} /> CRM Pipeline
          </button>
        </div>

        {/* Main Content Layout */}
        {mainTab === 'analyzer' && (
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
                    Inserisci gli appunti o allega PDF/Immagini. L'AI capirà tutto e genererà un Manuale a punti e lo Script Ideale strutturati per l'analisi.
                  </p>
                  <textarea 
                    value={formazione}
                    onChange={(e) => setFormazione(e.target.value)}
                    className="w-full h-32 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-zinc-300 text-[11px] leading-relaxed focus:outline-none focus:border-blue-500/50 resize-none font-sans placeholder-zinc-700 relative z-10"
                    placeholder="Descrivi la procedura, oppure allega documenti..."
                  />

                  {/* File Upload Section */}
                  <div className="mt-3 relative z-10 border border-dashed border-zinc-800 rounded-lg p-3 bg-zinc-950/50 hover:bg-zinc-900 transition-colors cursor-pointer" onClick={() => document.getElementById('file-upload')?.click()}>
                    <input type="file" id="file-upload" className="hidden" multiple accept="application/pdf,image/*" onChange={handleFileUpload} />
                    <div className="flex items-center gap-3 text-zinc-400">
                      <div className="p-2 bg-blue-500/10 rounded-md text-blue-400">
                        <UploadCloud size={16} />
                      </div>
                      <div className="flex-1">
                        <span className="text-[11px] font-medium block">Allega file (PDF o Immagini)</span>
                        <span className="text-[10px] text-zinc-600 block">Clicca per selezionare i documenti dal tuo dispositivo</span>
                      </div>
                    </div>
                  </div>

                  {files.length > 0 && (
                    <div className="mt-3 relative z-10 flex flex-wrap gap-2">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-blue-900/20 border border-blue-500/30 text-blue-300 px-2 py-1 rounded text-[10px] max-w-[200px]">
                          <span className="truncate">{file.name}</span>
                          <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="hover:text-red-400 transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex justify-end relative z-10">
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
            </div>

            <div className={`flex-1 rounded-xl overflow-y-auto ${viewMode === 'raw' ? 'bg-[#121212] border border-zinc-800 p-6' : ''}`}>
              {!result && !loading && (
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

                  {/* Objections & Pain Points section */}
                  {(result.obiezioni_sollevate?.length > 0 || result.pain_points_cliente?.length > 0) && (
                    <div className={`grid grid-cols-1 gap-4 ${(result.obiezioni_sollevate?.length > 0 && result.pain_points_cliente?.length > 0) ? 'md:grid-cols-2' : ''}`}>
                      {result.pain_points_cliente?.length > 0 && (
                        <div className="bg-[#161616] p-5 rounded-xl border border-zinc-800/50 flex flex-col">
                          <h4 className="text-[10px] uppercase font-bold text-indigo-400 mb-3 tracking-widest">Pain Points Cliente</h4>
                          <ul className="text-[11px] space-y-3">
                            {result.pain_points_cliente.map((pain, i) => (
                              <li key={i} className="flex gap-2 text-zinc-300">
                                <span className="text-indigo-500 shrink-0 mt-0.5">•</span>
                                <span className="leading-relaxed">{pain}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.obiezioni_sollevate?.length > 0 && (
                        <div className="bg-[#161616] p-5 rounded-xl border border-zinc-800/50 flex flex-col">
                          <h4 className="text-[10px] uppercase font-bold text-violet-400 mb-3 tracking-widest">Analisi Obiezioni</h4>
                          <div className="space-y-4">
                            {result.obiezioni_sollevate.map((ob, i) => (
                              <div key={i} className="text-[11px] border border-zinc-800 rounded p-3 bg-zinc-900/30">
                                <div className="text-zinc-200 font-medium mb-1 flex items-start justify-between gap-2">
                                  <span>"{ob.obiezione}"</span>
                                  {ob.gestita_bene ? (
                                    <span className="text-[9px] bg-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded tracking-widest shrink-0 uppercase border border-emerald-900">Gestita</span>
                                  ) : (
                                    <span className="text-[9px] bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded tracking-widest shrink-0 uppercase border border-red-900">Fallita</span>
                                  )}
                                </div>
                                <p className="text-zinc-400 leading-relaxed mt-2">{ob.analisi}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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
        )}

        {/* CRM View */}
        {mainTab === 'crm' && (
          <main className="flex-1 min-h-[30rem] overflow-y-auto pt-4">
            {crmRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-20 border border-dashed border-zinc-800 rounded-xl bg-[#121212]">
                <Users size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">Nessun lead nel CRM.</p>
                <p className="text-xs mt-2 text-center max-w-sm">
                  Analizza una chiamata per popolare automaticamente la pipeline con i dati estratti dal cliente.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {crmRecords.map((record) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={record.id} 
                    className="bg-[#121212] border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors flex flex-col min-h-[22rem]"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-white mb-1">{record.nome_cliente}</h3>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{record.date}</span>
                      </div>
                      <div className={`px-2 py-1 rounded text-[9px] uppercase tracking-widest font-bold border ${
                        record.stato_deal.includes('Vinto') ? 'bg-emerald-900/40 text-emerald-400 border-emerald-900' :
                        record.stato_deal.includes('Perso') ? 'bg-red-900/40 text-red-400 border-red-900' :
                        record.stato_deal.includes('Negoziazione') ? 'bg-amber-900/40 text-amber-400 border-amber-900' :
                        'bg-blue-900/40 text-blue-400 border-blue-900'
                      }`}>
                        {record.stato_deal}
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 flex-1">
                      <div>
                        <p className="text-[10px] uppercase text-zinc-500 tracking-widest mb-1 flex items-center justify-between">
                          Probabilità 
                          <span className={`${record.probabilita_chiusura > 60 ? 'text-emerald-500' : record.probabilita_chiusura < 30 ? 'text-red-500' : 'text-amber-500'}`}>{record.probabilita_chiusura}%</span>
                        </p>
                        <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full ${record.probabilita_chiusura > 60 ? 'bg-emerald-500' : record.probabilita_chiusura < 30 ? 'bg-red-500' : 'bg-amber-500'}`}
                            style={{ width: `${record.probabilita_chiusura}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 flex-1">
                        <strong className="text-zinc-300 block mb-1 font-semibold">Sommario</strong>
                        {record.sommario_chiamata}
                      </div>

                      {record.pain_points?.length > 0 && (
                        <div>
                          <strong className="text-[10px] uppercase text-zinc-500 tracking-widest block mb-2">Pain Points</strong>
                          <div className="flex flex-wrap gap-2">
                            {record.pain_points.map((pain, i) => (
                              <span key={i} className="text-[10px] bg-[#1a1a1a] border border-zinc-800 text-zinc-300 px-2 py-1 rounded truncate max-w-full">
                                {pain}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="border-t border-zinc-800 pt-3 mt-auto">
                        <strong className="text-[10px] uppercase text-zinc-500 tracking-widest block mb-2">Prossimi Passi</strong>
                        <p className="text-[11px] text-indigo-300 bg-indigo-900/10 p-3 flex border border-indigo-900/30 rounded-lg">
                          <Target size={14} className="shrink-0 mt-0.5 mr-2 text-indigo-500" />
                          <span className="leading-snug">{record.prossimi_passi}</span>
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </main>
        )}
        
        {/* Footer Info */}
        <footer className="mt-8 flex justify-between items-center text-[10px] text-zinc-600 uppercase tracking-tighter border-t border-zinc-800 pt-6">
          <p>Sales Supervisor Engine v4.2.0-Alpha</p>
          <p>© 2024 Corporate Sales Compliance Division</p>
        </footer>
      </div>
    </div>
  );
}
