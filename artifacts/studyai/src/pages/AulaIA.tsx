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
      style={{ background: "#111827" }}>
      <audio ref={audioRef} />

      {/* ── HEADER ── */}
      <header className="px-3 sm:px-5 py-2.5 flex items-center gap-2 sm:gap-3 flex-shrink-0"
        style={{ background: "#1a2332", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={() => { setAula(null); setTopico(""); }}
          className="flex items-center gap-1 text-sm font-medium flex-shrink-0 transition-colors"
          style={{ color: "#9ca3af" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#e5e7eb")}
          onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}>
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Nova aula</span>
        </button>
        <div className="h-4 w-px flex-shrink-0" style={{ background: "rgba(255,255,255,0.1)" }} />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#16a34a,#065f46)" }}>
            <BookOpen className="w-3 h-3 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm truncate" style={{ color: "#f9fafb" }}>{aula.titulo}</p>
            <p className="text-xs truncate hidden sm:block" style={{ color: "#4ade80" }}>{aula.subtitulo}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <select value={velocidade} onChange={e => setVelocidade(Number(e.target.value))}
            className="text-xs font-bold rounded-lg px-2 py-1 cursor-pointer focus:outline-none border-0"
            style={{ background: "rgba(255,255,255,0.08)", color: "#e5e7eb" }}>
            {VELOCIDADES.map(v => <option key={v} value={v} style={{ background: "#1a2332" }}>{v}x</option>)}
          </select>
          <button onClick={() => setMuted(m => !m)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: muted ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)", color: muted ? "#f87171" : "#9ca3af" }}>
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setFullscreen(f => !f)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: "rgba(255,255,255,0.08)", color: "#9ca3af" }}>
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* ── PROGRESSO ── */}
      <div className="h-1 flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div className="h-full"
          style={{ background: "linear-gradient(90deg,#16a34a,#4ade80)" }}
          animate={{ width: `${progresso}%` }} transition={{ duration: 0.5 }} />
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

        {/* ── LOUSA ── */}
        <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-5 gap-3">

          {/* Lousa + (opcional) painel de imagem lateral */}
          <div className="flex-1 flex flex-col md:flex-row gap-3 min-h-0">

          {/* ── CANVAS BOARD ── */}
          <div className={`relative rounded-3xl shadow-2xl overflow-hidden min-h-[360px] transition-all ${imagemGerada ? "md:flex-1" : "flex-1"}`}
            style={{ border: "3px solid #2d5a3d", background: "#162b1f", boxShadow: "0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)" }}>

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
                title="Gerar ilustração com IA"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all disabled:opacity-40"
                style={{ background: "rgba(88,28,135,0.85)", border: "1px solid rgba(196,181,253,0.3)", color: "#e9d5ff" }}>
                {gerandoImagem
                  ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  : <ImageIcon className="w-2.5 h-2.5" />}
                {gerandoImagem ? "Gerando..." : "Ilustração IA"}
              </button>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider pointer-events-none"
                style={{ background: "rgba(15,32,24,0.9)", border: "1px solid rgba(74,222,128,0.35)", color: "#4ade80" }}>
                {estilo}
              </span>
            </div>

            {/* Overlay: imagem gerada pelo Gemini */}
            {/* Estado: carregando áudio */}
            <AnimatePresence>
              {isPlaying && audioLoading && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-xl px-3 py-1.5"
                  style={{ background: "rgba(15,32,24,0.9)", border: "1px solid rgba(74,222,128,0.3)" }}>
                  <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#4ade80" }} />
                  <span className="text-xs font-semibold" style={{ color: "#86efac" }}>Preparando voz...</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Estado: professor escrevendo */}
            <AnimatePresence>
              {canvasPlaying && !boardAllDone && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-xl px-3 py-1.5"
                  style={{ background: "rgba(15,32,24,0.9)", border: "1px solid rgba(255,224,102,0.3)" }}>
                  <motion.span
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.7 }}
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#FFE066" }} />
                  <span className="text-xs font-semibold" style={{ color: "#FFE066" }}>Tiagão escrevendo...</span>
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
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === etapaAtual ? 24 : 8,
                    height: i === etapaAtual ? 10 : 8,
                    background: i === etapaAtual ? "#4ade80" : i < etapaAtual ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.15)",
                  }} />
              ))}
            </div>
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => irParaEtapa(Math.max(0, etapaAtual - 1))}
                disabled={etapaAtual === 0}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af" }}>
                <SkipBack className="w-4 h-4" />
              </button>
              <motion.button whileTap={{ scale: 0.93 }} onClick={togglePlay}
                className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-all"
                style={{ background: "linear-gradient(135deg,#16a34a,#059669)" }}>
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
                          "0 0 0 0 rgba(74,222,128,0)",
                          "0 0 0 8px rgba(74,222,128,0.3)",
                          "0 0 0 0 rgba(74,222,128,0)",
                        ],
                        scale: [1, 1.05, 1],
                      } : { boxShadow: "0 0 0 0 rgba(74,222,128,0)", scale: 1 }}
                      transition={piscando ? { repeat: Infinity, duration: 1.4 } : { duration: 0.2 }}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        background: piscando ? "#16a34a" : "rgba(255,255,255,0.08)",
                        border: `1px solid ${piscando ? "#4ade80" : "rgba(255,255,255,0.1)"}`,
                        color: piscando ? "white" : "#9ca3af",
                      }}>
                      <SkipForward className="w-4 h-4" />
                    </motion.button>
                    {piscando && (
                      <motion.span
                        initial={{ opacity: 0, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-full mt-1 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: "#4ade80", background: "rgba(22,163,74,0.15)", border: "1px solid rgba(74,222,128,0.3)" }}>
                        Avance quando pronto
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
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all ml-2"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af" }}
                title="Repetir etapa">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-xs font-medium" style={{ color: "#6b7280" }}>
              Etapa {etapaAtual + 1} de {totalEtapas}
              {boardAllDone && <span className="ml-2" style={{ color: "#4ade80" }}>✓ escrito</span>}
            </p>
          </div>
        </div>

        {/* ── PAINEL DIREITO ── */}
        <div className="lg:w-72 xl:w-80 flex flex-col flex-shrink-0"
          style={{ background: "#1a2332", borderLeft: "1px solid rgba(255,255,255,0.06)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>

          {/* Narração com avatar do professor */}
          <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="relative flex-shrink-0">
                <TiagaoCharacter state={charState} size={44} showLabel={false} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#4ade80" }}>Prof. Tiagão</p>
                  <SpeakingWaveform active={isPlaying && !audioLoading} />
                </div>
                <p className="text-[11px] font-medium" style={{ color: "#6b7280" }}>
                  {audioLoading ? "Preparando a explicação..." : isPlaying ? "Explicando agora..." : "Em pausa"}
                </p>
              </div>
            </div>

            {/* Narração da etapa atual */}
            <AnimatePresence mode="wait">
              <motion.div key={etapaAtual}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <p className="text-sm leading-relaxed" style={{ color: "#d1d5db" }}>
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
                className="p-4" style={{ background: "rgba(22,163,74,0.1)", borderBottom: "1px solid rgba(74,222,128,0.15)" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <TiagaoCharacter state="speaking" size={28} showLabel={false} />
                  <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#4ade80" }}>
                    Tiagão responde
                  </p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#86efac" }}>{resposta.texto}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lista de etapas */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider mb-2 px-1" style={{ color: "#4b5563" }}>
              Etapas da aula
            </p>
            {aula.etapas.map((et, i) => (
              <button key={et.id} onClick={() => irParaEtapa(i)}
                className="w-full text-left px-3 py-2.5 rounded-xl transition-all text-xs font-medium flex items-start gap-2.5"
                style={{
                  background: i === etapaAtual ? "rgba(22,163,74,0.15)" : "transparent",
                  border: `1px solid ${i === etapaAtual ? "rgba(74,222,128,0.25)" : "transparent"}`,
                  color: i === etapaAtual ? "#86efac" : i < etapaAtual ? "#4b5563" : "#6b7280",
                }}>
                <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black mt-0.5"
                  style={{
                    background: i === etapaAtual ? "#16a34a" : i < etapaAtual ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.06)",
                    color: i === etapaAtual ? "white" : i < etapaAtual ? "#4ade80" : "#6b7280",
                  }}>{i + 1}</span>
                <span className="leading-tight line-clamp-2">
                  {et.elementos.find(e => e.tipo === "titulo")?.texto
                    || et.narracao.slice(0, 55) + "..."}
                </span>
                {i === etapaAtual && isPlaying && (
                  <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0 mt-0.5" style={{ color: "#4ade80" }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── INPUT DE PERGUNTAS ── */}
      <div className="flex-shrink-0 px-3 sm:px-5 py-3"
        style={{ background: "#1a2332", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <div className="w-8 h-8 flex-shrink-0">
            <TiagaoCharacter state={respondendo ? "thinking" : "idle"} size={32} showLabel={false} />
          </div>
          <div className="flex-1 relative">
            <input
              value={transcrevendo ? "Transcrevendo..." : pergunta}
              onChange={e => setPergunta(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviarPergunta()}
              placeholder={gravando ? "🎙 Gravando... clique no mic para parar" : "Pergunte ao Tiagão — ou fale pelo microfone..."}
              disabled={transcrevendo}
              className="w-full px-4 py-2.5 rounded-2xl text-sm pr-20 transition-all focus:outline-none"
              style={{
                background: gravando ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${gravando ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)"}`,
                color: gravando ? "#fca5a5" : "#e5e7eb",
              }}
            />
            {/* Botão mic */}
            <button
              onClick={toggleMic}
              disabled={transcrevendo || respondendo}
              title={gravando ? "Parar gravação" : "Falar pergunta"}
              className={`absolute right-10 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${gravando ? "animate-pulse" : ""} disabled:opacity-30`}
              style={{ background: gravando ? "#ef4444" : transcrevendo ? "#d97706" : "rgba(255,255,255,0.12)" }}>
              {transcrevendo
                ? <Loader2 className="w-3 h-3 text-white animate-spin" />
                : gravando
                ? <MicOff className="w-3 h-3 text-white" />
                : <Mic className="w-3 h-3" style={{ color: "#9ca3af" }} />}
            </button>
            {/* Botão enviar */}
            <button
              onClick={enviarPergunta}
              disabled={!pergunta.trim() || respondendo || gravando}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center disabled:opacity-30"
              style={{ background: "#16a34a" }}>
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
