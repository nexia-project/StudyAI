import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  ChevronRight, Loader2, Mic, Send, RefreshCw,
  BookOpen, Maximize2, Minimize2, ChevronLeft, Zap,
} from "lucide-react";
import { useLocation } from "wouter";

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

// ─── Board Element Renderer ───────────────────────────────────────────────────
function BoardEl({ el, delay }: { el: BoardElement; delay: number }) {
  const variants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { delay, duration: 0.45, ease: "easeOut" } },
  };

  if (el.tipo === "separador") {
    return (
      <motion.div variants={variants} initial="hidden" animate="visible"
        className="w-full h-px bg-slate-200 my-3" />
    );
  }

  const baseClass = "leading-snug";

  if (el.tipo === "titulo") {
    return (
      <motion.div variants={variants} initial="hidden" animate="visible">
        <p className={`${baseClass} text-2xl sm:text-3xl font-black text-slate-800 mb-2`}
          style={{ color: el.cor }}>
          {el.texto}
        </p>
      </motion.div>
    );
  }

  if (el.tipo === "formula") {
    return (
      <motion.div variants={variants} initial="hidden" animate="visible">
        <div className="inline-block my-2 px-5 py-3 rounded-2xl text-2xl sm:text-3xl font-mono font-black text-slate-900 shadow-sm border border-slate-100"
          style={{ backgroundColor: el.destaque ?? "#fef08a" }}>
          {el.texto}
        </div>
      </motion.div>
    );
  }

  if (el.tipo === "destaque") {
    return (
      <motion.div variants={variants} initial="hidden" animate="visible">
        <span className="inline-block my-1 px-4 py-2 rounded-xl font-semibold text-base sm:text-lg"
          style={{ backgroundColor: el.cor ?? "#bbf7d0", color: el.corTexto ?? "#166534" }}>
          {el.texto}
        </span>
      </motion.div>
    );
  }

  if (el.tipo === "seta") {
    return (
      <motion.div variants={variants} initial="hidden" animate="visible">
        <div className="flex items-start gap-2 my-1.5">
          <ChevronRight className="w-5 h-5 mt-0.5 flex-shrink-0 text-indigo-500" style={{ color: el.cor }} />
          <p className="text-base sm:text-lg text-slate-700 font-medium">{el.texto}</p>
        </div>
      </motion.div>
    );
  }

  if (el.tipo === "exemplo") {
    return (
      <motion.div variants={variants} initial="hidden" animate="visible">
        <div className="w-full my-2 px-4 py-3 rounded-2xl border-l-4 border-blue-400"
          style={{ backgroundColor: el.cor ?? "#dbeafe" }}>
          <p className="text-xs font-bold text-blue-600 mb-0.5 uppercase tracking-wider">Exemplo</p>
          <p className="text-base text-slate-800 font-medium">{el.texto}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={variants} initial="hidden" animate="visible">
      <p className={`${baseClass} text-base sm:text-lg text-slate-700 my-1`}>{el.texto}</p>
    </motion.div>
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

  // ── audio ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  // ── question ──
  const [pergunta, setPergunta] = useState("");
  const [respondendo, setRespondendo] = useState(false);
  const [resposta, setResposta] = useState<{ texto: string; timestamp: number } | null>(null);

  // ── board key to re-animate on step change ──
  const [boardKey, setBoardKey] = useState(0);

  const etapa = aula?.etapas[etapaAtual];

  // ── generate lesson ───────────────────────────────────────────────────────
  const gerarAula = useCallback(async () => {
    if (!topico.trim()) return;
    setGerando(true);
    setErroGerar("");
    setAula(null);
    setEtapaAtual(0);
    setIsPlaying(false);
    setResposta(null);
    try {
      const r = await fetch("/api/aula-ia/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topico, estilo }),
      });
      if (r.status === 401) {
        setErroGerar("Faça login para acessar as aulas com IA.");
        setGerando(false);
        return;
      }
      if (!r.ok) throw new Error("Erro ao gerar aula");
      const data: Aula = await r.json();
      setAula(data);
      setEtapaAtual(0);
      setBoardKey(k => k + 1);
    } catch {
      setErroGerar("Não consegui gerar a aula. Tente outro tópico.");
    } finally {
      setGerando(false);
    }
  }, [topico, estilo]);

  // ── TTS playback ──────────────────────────────────────────────────────────
  const playNarration = useCallback(async (texto: string) => {
    if (muted || !texto) return;
    setAudioLoading(true);
    try {
      const r = await fetch("/api/voice-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: texto }),
      });
      if (!r.ok) throw new Error("TTS error");

      const blob = await r.blob();
      const url = URL.createObjectURL(blob);

      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = url;

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.playbackRate = velocidade;
        await audioRef.current.play();
      }
    } catch {
      /* silent */
    } finally {
      setAudioLoading(false);
    }
  }, [muted, velocidade]);

  // ── update playback speed on change ──────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = velocidade;
  }, [velocidade]);

  // ── play step: animate board + narration ─────────────────────────────────
  const irParaEtapa = useCallback((idx: number, autoPlay = false) => {
    if (!aula) return;
    setEtapaAtual(idx);
    setBoardKey(k => k + 1);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(autoPlay);
    if (autoPlay && aula.etapas[idx]) {
      playNarration(aula.etapas[idx].narracao);
    }
  }, [aula, playNarration]);

  // ── auto-advance when audio ends ─────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnd = () => {
      if (!aula || !isPlaying) return;
      const next = etapaAtual + 1;
      if (next < aula.etapas.length) {
        setTimeout(() => irParaEtapa(next, true), 800);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener("ended", handleEnd);
    return () => audio.removeEventListener("ended", handleEnd);
  }, [aula, etapaAtual, isPlaying, irParaEtapa]);

  // ── play / pause ─────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (!aula) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (audioRef.current?.paused && audioRef.current.src) {
        audioRef.current.play();
      } else {
        playNarration(etapa?.narracao ?? "");
      }
    }
  }, [aula, isPlaying, etapa, playNarration]);

  // ── question ─────────────────────────────────────────────────────────────
  const enviarPergunta = useCallback(async () => {
    if (!pergunta.trim() || respondendo || !aula) return;
    const q = pergunta.trim();
    setPergunta("");
    setRespondendo(true);
    try {
      const r = await fetch("/api/aula-ia/pergunta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pergunta: q,
          topico: aula.titulo,
          contexto: etapa?.narracao,
        }),
      });
      if (!r.ok) throw new Error();
      const { resposta: txt } = await r.json();
      setResposta({ texto: txt, timestamp: Date.now() });
      if (!muted) playNarration(txt);
    } catch {
      setResposta({ texto: "Hmm, não consegui responder agora. Tente de novo!", timestamp: Date.now() });
    } finally {
      setRespondendo(false);
    }
  }, [pergunta, respondendo, aula, etapa, muted, playNarration]);

  // ─── TELA INICIAL: escolher tópico ────────────────────────────────────────
  if (!aula && !gerando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col">
        <audio ref={audioRef} />

        {/* Header */}
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
            <span className="font-black text-slate-800 text-sm">Aula com IA — Tiagão na Lousa</span>
          </div>
        </header>

        {/* Main */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-2xl mx-auto w-full">

          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="mb-8 relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-200 shadow-xl">
              <img src="/tiagao-robot.jpg" alt="Professor Tiagão" className="w-full h-full object-cover object-top" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="absolute -top-1 -right-1 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
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
            Tiagão cria uma aula explicada na lousa em tempo real, só pra você
          </motion.p>

          {/* Input */}
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

          {/* Estilo selector */}
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

          {erroGerar && (
            <p className="text-red-500 text-sm mb-4 font-medium">{erroGerar}</p>
          )}

          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            onClick={gerarAula}
            disabled={!topico.trim()}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-lg shadow-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <BookOpen className="w-5 h-5" /> Começar Aula com Tiagão
          </motion.button>

          {/* Quick topics */}
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

  // ─── TELA DE CARREGAMENTO ─────────────────────────────────────────────────
  if (gerando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex flex-col items-center justify-center gap-6">
        <audio ref={audioRef} />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
          <Loader2 className="w-12 h-12 text-indigo-400" />
        </motion.div>
        <div className="text-center">
          <p className="text-white font-black text-xl mb-1">Tiagão está preparando a aula...</p>
          <p className="text-indigo-300 text-sm">Gerando lousa, explicações e exemplos sobre</p>
          <p className="text-indigo-200 font-bold mt-1">"{topico}"</p>
        </div>
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-indigo-400" />
          ))}
        </motion.div>
      </div>
    );
  }

  // ─── TELA DA AULA ─────────────────────────────────────────────────────────
  if (!aula) return null;

  const totalEtapas = aula.etapas.length;
  const progresso = ((etapaAtual + 1) / totalEtapas) * 100;

  return (
    <div className={`bg-slate-100 flex flex-col ${fullscreen ? "fixed inset-0 z-50" : "min-h-screen"}`}>
      <audio ref={audioRef} />

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
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
          {/* Speed */}
          <select
            value={velocidade}
            onChange={e => setVelocidade(Number(e.target.value))}
            className="text-xs font-bold bg-slate-100 border-0 rounded-lg px-2 py-1 text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300">
            {VELOCIDADES.map(v => (
              <option key={v} value={v}>{v}x</option>
            ))}
          </select>
          {/* Mute */}
          <button onClick={() => setMuted(m => !m)}
            className={`p-1.5 rounded-lg transition-colors ${muted ? "bg-red-100 text-red-500" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          {/* Fullscreen */}
          <button onClick={() => setFullscreen(f => !f)}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* ── PROGRESS BAR ─────────────────────────────────────────────────── */}
      <div className="h-1 bg-slate-200 flex-shrink-0">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          animate={{ width: `${progresso}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

        {/* ── WHITEBOARD ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-5 gap-3">

          {/* Board surface */}
          <div className="flex-1 relative bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden flex flex-col min-h-[280px]">

            {/* Board lines (ruled paper effect) */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #f1f5f9 27px, #f1f5f9 28px)",
                backgroundPositionY: "40px",
              }} />

            {/* Estilo tag */}
            <div className="absolute top-3 right-3 z-10">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                {estilo}
              </span>
            </div>

            {/* Board content */}
            <div className="flex-1 p-6 sm:p-8 pr-16 overflow-y-auto relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={boardKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}>
                  {etapa?.elementos.map((el, i) => (
                    <BoardEl key={i} el={el} delay={i * 0.18} />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Tiagão Avatar on board */}
            <div className="absolute bottom-0 left-0 z-20 pointer-events-none select-none">
              <div className="relative">
                <motion.div
                  animate={isPlaying ? { y: [0, -6, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
                  <img
                    src="/tiagao-robot.jpg"
                    alt="Professor Tiagão"
                    className="w-20 h-20 sm:w-28 sm:h-28 object-cover object-top rounded-tr-3xl opacity-90"
                    style={{ filter: "drop-shadow(0 4px 12px rgba(99,102,241,0.3))" }}
                  />
                </motion.div>
                {/* Speaking indicator */}
                {(isPlaying || audioLoading) && (
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6 }}
                    className="absolute top-1 right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow" />
                )}
              </div>
            </div>

            {/* Audio loading overlay */}
            {audioLoading && (
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-1.5">
                <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
                <span className="text-xs text-indigo-600 font-medium">Tiagão falando...</span>
              </div>
            )}
          </div>

          {/* ── PLAYBACK CONTROLS ───────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            {/* Step indicators */}
            <div className="flex items-center justify-center gap-1.5">
              {aula.etapas.map((_, i) => (
                <button key={i} onClick={() => irParaEtapa(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === etapaAtual
                      ? "w-6 h-2.5 bg-indigo-500"
                      : i < etapaAtual
                      ? "w-2 h-2 bg-indigo-300"
                      : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
                  }`} />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-2">
              {/* Back */}
              <button
                onClick={() => irParaEtapa(Math.max(0, etapaAtual - 1))}
                disabled={etapaAtual === 0}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <SkipBack className="w-4 h-4" />
              </button>

              {/* Play / Pause */}
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={togglePlay}
                className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-all"
                style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
                {isPlaying
                  ? <Pause className="w-6 h-6" />
                  : <Play className="w-6 h-6 ml-0.5" />}
              </motion.button>

              {/* Next */}
              <button
                onClick={() => irParaEtapa(Math.min(totalEtapas - 1, etapaAtual + 1))}
                disabled={etapaAtual === totalEtapas - 1}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Replay step */}
              <button
                onClick={() => { audioRef.current?.pause(); playNarration(etapa?.narracao ?? ""); }}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all ml-2"
                title="Repetir esta explicação">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Step label */}
            <p className="text-center text-xs text-slate-400 font-medium">
              Etapa {etapaAtual + 1} de {totalEtapas}
            </p>
          </div>
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
        <div className="lg:w-72 xl:w-80 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex-shrink-0">

          {/* Explanation */}
          <div className="p-4 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Explicação em tempo real
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={etapaAtual}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="text-sm text-slate-700 leading-relaxed font-medium">
                {etapa?.narracao}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Answer from Tiagão */}
          <AnimatePresence>
            {resposta && (
              <motion.div
                key={resposta.timestamp}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 border-b border-indigo-100 bg-indigo-50">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <img src="/tiagao-robot.jpg" alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                  Tiagão responde
                </p>
                <p className="text-xs text-indigo-800 leading-relaxed">{resposta.texto}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Steps list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 px-1">
              Etapas da aula
            </p>
            {aula.etapas.map((et, i) => (
              <button
                key={et.id}
                onClick={() => irParaEtapa(i)}
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
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── QUESTION INPUT ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-white px-3 sm:px-5 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
            <img src="/tiagao-robot.jpg" alt="Tiagão" className="w-full h-full object-cover object-top" />
          </div>
          <div className="flex-1 relative">
            <input
              value={pergunta}
              onChange={e => setPergunta(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviarPergunta()}
              placeholder="Pergunte algo ao Tiagão sobre esta aula..."
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-indigo-400 focus:outline-none text-sm text-slate-800 placeholder-slate-400 bg-slate-50 pr-10"
            />
            <button
              onClick={enviarPergunta}
              disabled={!pergunta.trim() || respondendo}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center disabled:opacity-30">
              {respondendo
                ? <Loader2 className="w-3 h-3 text-white animate-spin" />
                : <Send className="w-3 h-3 text-white" />}
            </button>
          </div>
          <button
            onClick={() => { playNarration(etapa?.narracao ?? ""); }}
            disabled={muted || audioLoading}
            className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 hover:bg-indigo-200 transition-colors disabled:opacity-40"
            title="Repetir voz">
            <Mic className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
