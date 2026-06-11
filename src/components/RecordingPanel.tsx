import { useRef, useState } from 'react';
import { Loader2, Mic, MonitorSpeaker } from 'lucide-react';
import { transcribeAudio } from '../lib/api';

interface RecordingPanelProps {
  recording: boolean;
  transcribing: boolean;
  onStart: () => void;
  onStop: () => void;
}

const SEGMENT_MS = 15000;

function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

export function useRecording(onAppend: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState('');

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const activeRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  async function transcribeSegment(blob: Blob) {
    if (blob.size < 2048) return;
    setTranscribing(true);
    try {
      const text = await transcribeAudio(blob);
      if (text) onAppend(text);
    } catch {
      // segmento fallito: continuiamo
    } finally {
      setTranscribing(false);
    }
  }

  function startSegment(stream: MediaStream, mimeType: string) {
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
      if (activeRef.current) startSegment(stream, mimeType);
      void transcribeSegment(blob);
    };
    recorderRef.current = recorder;
    recorder.start();
    timerRef.current = window.setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop();
    }, SEGMENT_MS);
  }

  async function start() {
    setError('');
    try {
      // getDisplayMedia cattura l'audio di sistema (entrambi i lati della call)
      const stream = await (navigator.mediaDevices as MediaDevices & {
        getDisplayMedia(opts: object): Promise<MediaStream>;
      }).getDisplayMedia({ audio: true, video: false });
      streamRef.current = stream;
      activeRef.current = true;
      setRecording(true);
      startSegment(stream, pickMimeType());
      // Se l'utente chiude la condivisione dal browser, fermiamo
      stream.getAudioTracks()[0]?.addEventListener('ended', stop);
    } catch {
      setError('Condivisione audio annullata o non supportata. Riprova e seleziona "Condividi audio".');
    }
  }

  function stop() {
    activeRef.current = false;
    setRecording(false);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  return { recording, transcribing, error, start, stop };
}

export default function RecordingPanel({ recording, transcribing, onStart, onStop }: RecordingPanelProps) {
  return (
    <div className="flex items-center gap-3">
      {transcribing && (
        <span className="text-[10px] text-amber-500 flex items-center gap-1.5 uppercase tracking-widest">
          <Loader2 size={12} className="animate-spin" /> Trascrivo...
        </span>
      )}
      <button
        onClick={recording ? onStop : onStart}
        title={recording ? 'Ferma registrazione' : 'Registra audio chiamata (entrambi i lati)'}
        className={`px-4 py-2 text-[10px] font-bold rounded-full transition-colors uppercase tracking-widest flex items-center gap-2 border ${
          recording
            ? 'bg-red-600/20 text-red-400 border-red-500/40 hover:bg-red-600/30'
            : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
        }`}
      >
        {recording ? (
          <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Ferma registrazione</>
        ) : (
          <><MonitorSpeaker size={14} /> <Mic size={14} /> Registra chiamata</>
        )}
      </button>
    </div>
  );
}
