/**
 * Aula com o Professor — Bible Project style
 *
 * Lousa HTML5 Canvas com:
 * - Escrita sincronizada com áudio (pausa quando áudio pausa)
 * - TTS pré-carregado antes da lousa começar a escrever
 * - Personagem substituído por waveform animado
 * - Layout limpo: lousa grande + painel de narração
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  ChevronRight, Loader2, Send, RefreshCw,
  BookOpen, Maximize2, Minimize2, ChevronLeft, Zap, Mic, MicOff,
  ImageIcon, X,
} from "lucide-react";
import { useLocation } from "wouter";
import { TiagaoCharacter, type CharacterState } from "@/components/TiagaoCharacter";
import { ChalkBoardCanvas } from "@/components/ChalkBoardCanvas";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BoardElement {
  tipo: "titulo" | "formula" | "texto" | "destaque" | "seta" | "separador" | "exemplo";
  texto?: string;
  cor?: string;
  destaque?: string;
  corTexto?: string;
}
interface Etapa {
  id: number;
  narracao: string;
  elementos: BoardElement[];
  duracao: number;
}
interface Aula {
  titulo: string;
  subtitulo: string;
  etapas: Etapa[];
}

const ESTILOS = ["ENEM", "Vestibular", "Concurso", "Simples"] as const;
const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const TOPICOS_SUGERIDOS = [
  "Funções do 1º Grau", "Lei de Ohm", "Revolução Francesa",
  "Equações do 2º Grau", "Fotossíntese", "Segunda Guerra Mundial",
  "Termodinâmica", "Redação ENEM - Introdução", "Tabela Periódica",
  "Geometria Plana - Área", "Gramática - Concordância Verbal", "Genética",
];

// ─── Waveform animation (professor falando) ────────────────────────────────
function SpeakingWaveform({ active }: { active: boolean }) {
  const bars = [3, 5, 8, 12, 8, 5, 3];
  return (
    <div className="flex items-center gap-[3px]" style={{ height: 16 }}>
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className={`rounded-full ${active ? "bg-indigo-500" : "bg-slate-300"}`}
          style={{ width: 3, height: h }}
          animate={active ? { scaleY: [0.25, 1, 0.25] } : { scaleY: 0.25 }}
          transition={active ? {
            repeat: Infinity,
            duration: 0.5 + i * 0.04,
            delay: i * 0.06,
            ease: "easeInOut",
          } : { duration: 0.25 }}
          initial={false}
        />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AulaIA() {
  const [, navigate] = useLocation();

  // ── lesson state ──
  const [topico, setTopico] = useState(() => {
    const t = localStorage.getItem("tiagao_aula_topico") ?? "";
    if (t) localStorage.removeItem("tiagao_aula_topico");
    return t;
  });
  const [estilo, setEstilo] = useState<typeof ESTILOS[number]>(() => {
    const e = localStorage.getItem("tiagao_aula_estilo") as typeof ESTILOS[number] | null;
    if (e) { localStorage.removeItem("tiagao_aula_estilo"); return e; }
    return "ENEM";
  });
  const [aula, setAula] = useState<Aula | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erroGerar, setErroGerar] = useState("");

  // ── playback ──
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [velocidade, setVelocidade] = useState<number>(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [boardAllDone, setBoardAllDone] = useState(false);
  const [audioEnded, setAudioEnded] = useState(false);

  // ── audio ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioDurationMs, setAudioDurationMs] = useState<number | undefined>(undefined);
  const [charState, setCharState] = useState<CharacterState>("idle");

  // Track which step audio has been fetched for (to avoid double-fetch on resume)
  const audioStepRef = useRef<number>(-1);
  // Reentrancy guard: bumps on every fetch so stale fetches abort themselves
  const fetchTokenRef = useRef<number>(0);

  // ── question ──
  const [pergunta, setPergunta] = useState("");
  const [respondendo, setRespondendo] = useState(false);
  const [resposta, setResposta] = useState<{ texto: string; timestamp: number } | null>(null);

  // ── mic / whisper ──
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ── gemini image ──
  const [gerandoImagem, setGerandoImagem] = useState(false);
  const [imagemGerada, setImagemGerada] = useState<{ src: string; topico: string } | null>(null);

  // ── board key: muda a cada nova etapa para forçar novo canvas ──
  const [boardKey, setBoardKey] = useState(0);

  const etapa = aula?.etapas[etapaAtual];

  // ── Canvas only draws when audio is ACTUALLY playing (not loading, not paused) ──
  const canvasPlaying = isPlaying && !audioLoading;

  // ── character state ──
  useEffect(() => {
    if (audioLoading) { setCharState("thinking"); return; }
    if (isPlaying) { setCharState("speaking"); return; }
    setCharState("idle");
  }, [isPlaying, audioLoading]);

  // ── generate lesson ───────────────────────────────────────────────────────
  const gerarAula = useCallback(async () => {
    if (!topico.trim()) return;
    setGerando(true);
    setErroGerar("");
    setAula(null);
    setEtapaAtual(0);
    setIsPlaying(false);
    setResposta(null);
    setBoardAllDone(false);
    audioStepRef.current = -1;
    try {
      const r = await fetch("/api/aula-ia/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topico, estilo }),
      });
      if (r.status === 401) { setErroGerar("Faça login para acessar as aulas."); setGerando(false); return; }
      if (!r.ok) throw new Error("Erro ao gerar aula");
      const data: Aula = await r.json();
      setAula(data);
      setEtapaAtual(0);
      setBoardKey(k => k + 1);
      setBoardAllDone(false);
    } catch {
      setErroGerar("Não consegui gerar a aula. Tente outro tópico.");
    } finally {
      setGerando(false);
    }
  }, [topico, estilo]);

  // ── TTS playback ──────────────────────────────────────────────────────────
  const playNarration = useCallback(async (texto: string, stepIdx: number) => {
    if (!texto) return;
    if (muted) return; // canvas will still draw since audioLoading stays false

    // ── Hard-stop any audio currently playing or loading (prevents duplicate voices) ──
    fetchTokenRef.current += 1;
    const myToken = fetchTokenRef.current;
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch { /* ignore */ }
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    setAudioDurationMs(undefined);
    setAudioLoading(true);

    try {
      const r = await fetch("/api/voice-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: texto }),
      });
      // Bail out if a newer request superseded us
      if (myToken !== fetchTokenRef.current) return;
      if (!r.ok) throw new Error("TTS error");
      const blob = await r.blob();
      // Bail again — fetch awaits can yield enough time for a step change
      if (myToken !== fetchTokenRef.current) return;

      const url = URL.createObjectURL(blob);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = url;

      if (audioRef.current && audioStepRef.current === stepIdx) {
        const audio = audioRef.current;
        // Capture duration once metadata loads, then feed it to the canvas for sync
        const onMeta = () => {
          if (myToken !== fetchTokenRef.current) return;
          if (isFinite(audio.duration) && audio.duration > 0) {
            setAudioDurationMs(audio.duration * 1000);
          }
        };
        audio.addEventListener("loadedmetadata", onMeta, { once: true });
        audio.src = url;
        audio.playbackRate = velocidade;
        await audio.play();
      }
    } catch { /* silent — canvas will still draw */ }
    finally {
      if (myToken === fetchTokenRef.current) setAudioLoading(false);
    }
  }, [muted, velocidade]);

  // ── update playback speed ─────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = velocidade;
  }, [velocidade]);

  // ── audio ended → mark step as ready, NEVER auto-advance ─────────────────
  // Student must explicitly click "Próxima" so they have time to absorb the lesson.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnd = () => {
      if (!aula) return;
      setAudioEnded(true);
      setIsPlaying(false);
      setCharState("idle");
    };
    audio.addEventListener("ended", handleEnd);
    return () => audio.removeEventListener("ended", handleEnd);
  }, [aula]); // eslint-disable-line

  // ── go to step ───────────────────────────────────────────────────────────
  const irParaEtapa = useCallback((idx: number, autoPlay = false) => {
    if (!aula) return;
    setEtapaAtual(idx);
    setBoardKey(k => k + 1);
    setBoardAllDone(false);
    setAudioEnded(false);
    setResposta(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    audioStepRef.current = -1; // reset so new audio can be fetched
    setIsPlaying(autoPlay);
  }, [aula]);

  // ── fetch audio when isPlaying becomes true for a NEW step ──────────────
  // Canvas waits because canvasPlaying = isPlaying && !audioLoading.
  // Resume (same step) is handled directly in togglePlay.
  useEffect(() => {
    if (!isPlaying || !etapa) return;
    if (audioStepRef.current === etapaAtual) return; // already fetched/fetching

    // Fetch fresh audio for this step
    audioStepRef.current = etapaAtual;
    playNarration(etapa.narracao, etapaAtual);
  }, [isPlaying, etapaAtual]); // eslint-disable-line

  // ── play / pause ─────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (!aula) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      // Resume existing audio directly if paused mid-play
      const audio = audioRef.current;
      if (audio && audio.src && audio.currentTime > 0 && audio.paused && !audio.ended) {
        audio.play().catch(() => {});
      }
      setIsPlaying(true);
      // useEffect handles fresh fetch only when audioStepRef doesn't match etapaAtual
    }
  }, [aula, isPlaying]);

  // ── question ─────────────────────────────────────────────────────────────
  const enviarPergunta = useCallback(async () => {
    if (!pergunta.trim() || respondendo || !aula) return;
    const q = pergunta.trim();
    setPergunta("");
    setRespondendo(true);
    setCharState("thinking");
    if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false); }
    try {
      const r = await fetch("/api/aula-ia/pergunta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: q, topico: aula.titulo, contexto: etapa?.narracao }),
      });
      if (!r.ok) throw new Error();
      const { resposta: txt } = await r.json();
      setResposta({ texto: txt, timestamp: Date.now() });
      if (!muted) {
        audioStepRef.current = -99; // special marker for Q&A audio
        playNarration(txt, -99);
        setCharState("speaking");
      }
    } catch {
      setResposta({ texto: "Não consegui responder agora. Tente de novo!", timestamp: Date.now() });
    } finally {
      setRespondendo(false);
      setTimeout(() => setCharState("idle"), 3000);
    }
  }, [pergunta, respondendo, aula, etapa, muted, isPlaying, playNarration]);

  // ── gemini: gerar ilustração ─────────────────────────────────────────────
  const gerarIlustracao = useCallback(async () => {
    if (!etapa || gerandoImagem) return;
    setGerandoImagem(true);
    try {
      const r = await fetch("/api/gemini/gerar-imagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topico: aula?.titulo ?? topico,
          contexto: etapa.narracao,
          estilo: "diagrama",
        }),
      });
      if (r.ok) {
        const { b64_json, mimeType } = await r.json();
        setImagemGerada({
          src: `data:${mimeType};base64,${b64_json}`,
          topico: etapa.titulo ?? aula?.titulo ?? topico,
        });
      }
    } catch { /* silent */ }
    finally { setGerandoImagem(false); }
  }, [etapa, aula, topico, gerandoImagem]);

  // ── microfone / whisper ───────────────────────────────────────────────────
  const toggleMic = useCallback(async () => {
    if (gravando) {
      mediaRecorderRef.current?.stop();
      setGravando(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setTranscrevendo(true);
        try {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const form = new FormData();
          form.append("audio", blob, "pergunta.webm");
          const r = await fetch("/api/aula-ia/transcrever", { method: "POST", body: form });
          if (r.ok) {
            const { texto } = await r.json();
            if (texto?.trim()) setPergunta(p => p ? `${p} ${texto}` : texto);
          }
        } catch { /* silencioso */ }
        finally { setTranscrevendo(false); }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setGravando(true);
    } catch {
      alert("Permita o acesso ao microfone para usar esta funcionalidade.");
    }
  }, [gravando]);

  // ─── TELA INICIAL ─────────────────────────────────────────────────────────
  if (!aula && !gerando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col">
        <audio ref={audioRef} />
        <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 shadow-sm">
          <button onClick={() => navigate("/app")}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium">
            <ChevronLeft className="w-4 h-4" /> Início
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-black text-slate-800 text-sm">Aula com o Professor</span>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-2xl mx-auto w-full">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="mb-6 relative">
            <div
              className="w-40 h-40 rounded-3xl overflow-hidden shadow-xl shadow-indigo-200 border-2 border-indigo-100"
              style={{
                backgroundImage: "url(/tiagao-character.png)",
                backgroundSize: "220%",
                backgroundPosition: "center 30%",
                backgroundRepeat: "no-repeat",
                backgroundColor: "#f0eaff",
              }}
            />
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="absolute top-2 right-0 w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg">
              <Zap className="w-3.5 h-3.5 text-white" />
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-black text-slate-800 text-center mb-2">
            O que quer aprender hoje?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-slate-500 text-center mb-8 text-sm">
            O Professor Tiagão escreve na lousa em sincronia com a fala — pause e pergunte quando quiser
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="w-full mb-4">
            <input
              value={topico}
              onChange={e => setTopico(e.target.value)}
              onKeyDown={e => e.key === "Enter" && gerarAula()}
              placeholder="Ex: Funções do 1º grau, Lei de Newton, Revolução Francesa..."
              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-400 focus:outline-none text-slate-800 font-medium text-base bg-white shadow-sm placeholder-slate-400"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
            className="flex items-center gap-2 mb-6">
            <span className="text-xs text-slate-500 font-medium">Estilo:</span>
            {ESTILOS.map(e => (
              <button key={e} onClick={() => setEstilo(e)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  estilo === e
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300"
                }`}>
                {e}
              </button>
            ))}
          </motion.div>

          {erroGerar && <p className="text-red-500 text-sm mb-4 font-medium">{erroGerar}</p>}

          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            onClick={gerarAula}
            disabled={!topico.trim()}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-lg shadow-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <BookOpen className="w-5 h-5" /> Começar Aula com o Professor
          </motion.button>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-8 w-full">
            <p className="text-xs text-slate-400 font-semibold mb-3 uppercase tracking-wider text-center">
              Tópicos populares
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {TOPICOS_SUGERIDOS.map(t => (
                <button key={t} onClick={() => setTopico(t)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-medium hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-all shadow-sm">
                  {t}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── CARREGANDO ───────────────────────────────────────────────────────────
  if (gerando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex flex-col items-center justify-center gap-6">
        <audio ref={audioRef} />
        <TiagaoCharacter state="thinking" size={160} showLabel />
        <div className="text-center">
          <p className="text-white font-black text-xl mb-1">Professor Tiagão está preparando a aula...</p>
          <p className="text-indigo-300 text-sm">Organizando lousa, explicações e exemplos sobre</p>
          <p className="text-indigo-200 font-bold mt-1">"{topico}"</p>
        </div>
      </div>
    );
  }

  // ─── AULA ─────────────────────────────────────────────────────────────────
  if (!aula) return null;

  const totalEtapas = aula.etapas.length;
  const progresso = ((etapaAtual + 1) / totalEtapas) * 100;

  return (
    <div className={`flex flex-col ${fullscreen ? "fixed inset-0 z-50" : "min-h-screen"}`}
      style={{ background: "#F0F4F8" }}>
      <audio ref={audioRef} />

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-5 py-2.5 flex items-center gap-2 sm:gap-3 shadow-sm flex-shrink-0">
        <button onClick={() => { setAula(null); setTopico(""); }}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium flex-shrink-0">
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Nova aula</span>
        </button>
        <div className="h-4 w-px bg-slate-200 flex-shrink-0" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-3 h-3 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-slate-800 text-sm truncate">{aula.titulo}</p>
            <p className="text-slate-400 text-xs truncate hidden sm:block">{aula.subtitulo}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <select value={velocidade} onChange={e => setVelocidade(Number(e.target.value))}
            className="text-xs font-bold bg-slate-100 border-0 rounded-lg px-2 py-1 text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300">
            {VELOCIDADES.map(v => <option key={v} value={v}>{v}x</option>)}
          </select>
          <button onClick={() => setMuted(m => !m)}
            className={`p-1.5 rounded-lg transition-colors ${muted ? "bg-red-100 text-red-500" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setFullscreen(f => !f)}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* ── PROGRESSO ── */}
      <div className="h-1 bg-slate-200 flex-shrink-0">
        <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          animate={{ width: `${progresso}%` }} transition={{ duration: 0.5 }} />
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

        {/* ── LOUSA ── */}
        <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-5 gap-3">

          {/* Lousa + (opcional) painel de imagem lateral */}
          <div className="flex-1 flex flex-col md:flex-row gap-3 min-h-0">

          {/* ── CANVAS BOARD ── */}
          <div className={`relative rounded-3xl shadow-lg overflow-hidden min-h-[360px] transition-all ${imagemGerada ? "md:flex-1" : "flex-1"}`}
            style={{ border: "2px solid #E8E0C8", background: "#FFFEF5" }}>

            <AnimatePresence mode="wait">
              <motion.div
                key={boardKey}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {etapa && (
                  <ChalkBoardCanvas
                    elementos={etapa.elementos}
                    playing={canvasPlaying}
                    speedMultiplier={velocidade}
                    audioDurationMs={audioDurationMs}
                    onAllDone={() => setBoardAllDone(true)}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Tag de estilo + botão Gemini */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              <button
                onClick={gerarIlustracao}
                disabled={gerandoImagem || !etapa}
                title="Gerar ilustração com Gemini IA"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-violet-500 hover:bg-violet-600 text-white shadow-sm transition-all disabled:opacity-40">
                {gerandoImagem
                  ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  : <ImageIcon className="w-2.5 h-2.5" />}
                {gerandoImagem ? "Gerando..." : "Ilustração"}
              </button>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 uppercase tracking-wider shadow-sm pointer-events-none">
                {estilo}
              </span>
            </div>

            {/* Overlay: imagem gerada pelo Gemini */}
            {/* Estado: carregando áudio */}
            <AnimatePresence>
              {isPlaying && audioLoading && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-indigo-50/95 backdrop-blur-sm border border-indigo-200 rounded-xl px-3 py-1.5 shadow-sm">
                  <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
                  <span className="text-xs text-indigo-600 font-semibold">Preparando áudio...</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Estado: professor escrevendo */}
            <AnimatePresence>
              {canvasPlaying && !boardAllDone && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-amber-200 rounded-xl px-3 py-1.5 shadow-sm">
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-xs text-slate-600 font-medium">Professor escrevendo...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── PAINEL DE IMAGEM (lateral, responsivo) ── */}
          <AnimatePresence>
            {imagemGerada && (
              <motion.div
                initial={{ opacity: 0, x: 30, width: 0 }}
                animate={{ opacity: 1, x: 0, width: "auto" }}
                exit={{ opacity: 0, x: 30, width: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="md:w-[42%] md:max-w-[480px] md:min-w-[280px] flex flex-col rounded-3xl shadow-lg overflow-hidden bg-white border border-violet-100"
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-violet-100 bg-violet-50/50">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 truncate">{imagemGerada.topico}</span>
                    <span className="text-[9px] text-violet-600 font-semibold bg-white px-1.5 py-0.5 rounded-full flex-shrink-0">IA</span>
                  </div>
                  <button onClick={() => setImagemGerada(null)}
                    className="w-5 h-5 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <X className="w-3 h-3 text-slate-500" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto flex items-center justify-center p-3 bg-gradient-to-br from-slate-50 to-violet-50/30">
                  <img
                    src={imagemGerada.src}
                    alt={`Ilustração: ${imagemGerada.topico}`}
                    className="max-h-full max-w-full object-contain rounded-xl shadow-sm"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          </div>{/* /lousa+imagem flex */}

          {/* ── CONTROLES ── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-1.5">
              {aula.etapas.map((_, i) => (
                <button key={i} onClick={() => irParaEtapa(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === etapaAtual ? "w-6 h-2.5 bg-indigo-500"
                    : i < etapaAtual ? "w-2 h-2 bg-indigo-300"
                    : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
                  }`} />
              ))}
            </div>
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => irParaEtapa(Math.max(0, etapaAtual - 1))}
                disabled={etapaAtual === 0}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <SkipBack className="w-4 h-4" />
              </button>
              <motion.button whileTap={{ scale: 0.93 }} onClick={togglePlay}
                className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-all"
                style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
                {isPlaying && !audioLoading
                  ? <Pause className="w-6 h-6" />
                  : audioLoading
                  ? <Loader2 className="w-6 h-6 animate-spin" />
                  : <Play className="w-6 h-6 ml-0.5" />}
              </motion.button>
              {(() => {
                const podeAvancar = etapaAtual < totalEtapas - 1;
                const piscando = podeAvancar && (audioEnded || boardAllDone) && !isPlaying;
                return (
                  <div className="relative flex flex-col items-center">
                    <motion.button
                      onClick={() => irParaEtapa(Math.min(totalEtapas - 1, etapaAtual + 1))}
                      disabled={!podeAvancar}
                      animate={piscando ? {
                        boxShadow: [
                          "0 0 0 0 rgba(99,102,241,0)",
                          "0 0 0 8px rgba(99,102,241,0.25)",
                          "0 0 0 0 rgba(99,102,241,0)",
                        ],
                        scale: [1, 1.05, 1],
                      } : { boxShadow: "0 0 0 0 rgba(99,102,241,0)", scale: 1 }}
                      transition={piscando ? { repeat: Infinity, duration: 1.4 } : { duration: 0.2 }}
                      className={`w-10 h-10 rounded-full border shadow-sm flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                        piscando
                          ? "bg-indigo-500 text-white border-indigo-400 hover:bg-indigo-600"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}>
                      <SkipForward className="w-4 h-4" />
                    </motion.button>
                    {piscando && (
                      <motion.span
                        initial={{ opacity: 0, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-full mt-1 whitespace-nowrap text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                        Avance quando estiver pronto
                      </motion.span>
                    )}
                  </div>
                );
              })()}
              <button
                onClick={() => {
                  audioStepRef.current = -1;
                  if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
                  setBoardKey(k => k + 1);
                  setBoardAllDone(false);
                  if (isPlaying) {
                    audioStepRef.current = etapaAtual;
                    playNarration(etapa?.narracao ?? "", etapaAtual);
                  }
                }}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all ml-2"
                title="Repetir etapa">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-xs text-slate-400 font-medium">
              Etapa {etapaAtual + 1} de {totalEtapas}
              {boardAllDone && <span className="text-indigo-500 ml-2">✓ escrito</span>}
            </p>
          </div>
        </div>

        {/* ── PAINEL DIREITO ── */}
        <div className="lg:w-72 xl:w-80 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex-shrink-0">

          {/* Narração com avatar do professor */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="relative flex-shrink-0">
                <TiagaoCharacter state={charState} size={44} showLabel={false} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Prof. Tiagão</p>
                  <SpeakingWaveform active={isPlaying && !audioLoading} />
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {audioLoading ? "Preparando a explicação..." : isPlaying ? "Explicando agora..." : "Em pausa"}
                </p>
              </div>
            </div>

            {/* Narração da etapa atual */}
            <AnimatePresence mode="wait">
              <motion.div key={etapaAtual}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                  {etapa?.narracao}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Resposta do Tiagão a perguntas */}
          <AnimatePresence>
            {resposta && (
              <motion.div key={resposta.timestamp}
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-4 border-b border-indigo-100 bg-indigo-50">
                <div className="flex items-center gap-2 mb-1.5">
                  <TiagaoCharacter state="speaking" size={28} showLabel={false} />
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">
                    Tiagão responde
                  </p>
                </div>
                <p className="text-xs text-indigo-800 leading-relaxed">{resposta.texto}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lista de etapas */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 px-1">
              Etapas da aula
            </p>
            {aula.etapas.map((et, i) => (
              <button key={et.id} onClick={() => irParaEtapa(i)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all text-xs font-medium flex items-start gap-2.5 ${
                  i === etapaAtual
                    ? "bg-indigo-50 text-indigo-800 border border-indigo-200"
                    : i < etapaAtual
                    ? "text-slate-400 hover:bg-slate-50"
                    : "text-slate-500 hover:bg-slate-50"
                }`}>
                <span className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black mt-0.5 ${
                  i === etapaAtual ? "bg-indigo-500 text-white"
                  : i < etapaAtual ? "bg-slate-200 text-slate-400"
                  : "bg-slate-100 text-slate-400"
                }`}>{i + 1}</span>
                <span className="leading-tight line-clamp-2">
                  {et.elementos.find(e => e.tipo === "titulo")?.texto
                    || et.narracao.slice(0, 55) + "..."}
                </span>
                {i === etapaAtual && isPlaying && (
                  <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0 mt-0.5 text-indigo-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── INPUT DE PERGUNTAS ── */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-white px-3 sm:px-5 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <div className="w-8 h-8 flex-shrink-0">
            <TiagaoCharacter state={respondendo ? "thinking" : "idle"} size={32} showLabel={false} />
          </div>
          <div className="flex-1 relative">
            <input
              value={transcrevendo ? "Transcrevendo..." : pergunta}
              onChange={e => setPergunta(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviarPergunta()}
              placeholder={gravando ? "🎙 Gravando... clique no mic para parar" : "Pergunte ao Professor — ou fale pelo microfone..."}
              disabled={transcrevendo}
              className={`w-full px-4 py-2.5 rounded-2xl border text-sm pr-20 transition-all ${
                gravando
                  ? "border-red-300 bg-red-50 placeholder-red-400 text-red-800"
                  : "border-slate-200 focus:border-indigo-400 bg-slate-50 placeholder-slate-400 text-slate-800"
              } focus:outline-none`}
            />
            {/* Botão mic */}
            <button
              onClick={toggleMic}
              disabled={transcrevendo || respondendo}
              title={gravando ? "Parar gravação" : "Falar pergunta"}
              className={`absolute right-10 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                gravando
                  ? "bg-red-500 animate-pulse"
                  : transcrevendo
                  ? "bg-amber-400"
                  : "bg-slate-200 hover:bg-slate-300"
              } disabled:opacity-30`}>
              {transcrevendo
                ? <Loader2 className="w-3 h-3 text-white animate-spin" />
                : gravando
                ? <MicOff className="w-3 h-3 text-white" />
                : <Mic className="w-3 h-3 text-slate-600" />}
            </button>
            {/* Botão enviar */}
            <button
              onClick={enviarPergunta}
              disabled={!pergunta.trim() || respondendo || gravando}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center disabled:opacity-30">
              {respondendo
                ? <Loader2 className="w-3 h-3 text-white animate-spin" />
                : <Send className="w-3 h-3 text-white" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
