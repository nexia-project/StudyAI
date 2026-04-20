/**
 * Aula com o Professor — Canvas real
 *
 * Lousa em HTML5 Canvas com:
 * - Fonte Caveat (caligrafia)
 * - Cursor de caneta animado que precede o texto
 * - Efeito de marcador (traço com textura)
 * - Caixas coloridas para fórmula/destaque/exemplo
 * - Setas desenhadas no canvas
 * - Sublinhado animado em títulos
 * - Auto-scroll suave quando o conteúdo cresce
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  ChevronRight, Loader2, Send, RefreshCw,
  BookOpen, Maximize2, Minimize2, ChevronLeft, Zap,
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

// ─── Narração com typewriter ──────────────────────────────────────────────────
function NarrationText({ text, active }: { text: string; active: boolean }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    if (!active) { setShown(text); return; }
    setShown("");
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, 18);
    return () => clearInterval(iv);
  }, [active, text]);
  return (
    <p className="text-sm text-slate-700 leading-relaxed font-medium">
      {active ? shown : text}
    </p>
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
  const [narrationActive, setNarrationActive] = useState(false);

  // ── audio ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [charState, setCharState] = useState<CharacterState>("idle");

  // ── question ──
  const [pergunta, setPergunta] = useState("");
  const [respondendo, setRespondendo] = useState(false);
  const [resposta, setResposta] = useState<{ texto: string; timestamp: number } | null>(null);

  // ── board key: muda a cada nova etapa para forçar novo canvas ──
  const [boardKey, setBoardKey] = useState(0);

  const etapa = aula?.etapas[etapaAtual];

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
    setNarrationActive(false);
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
      setNarrationActive(false);
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
    } catch { /* silent */ }
    finally { setAudioLoading(false); }
  }, [muted, velocidade]);

  // ── update playback speed ─────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = velocidade;
  }, [velocidade]);

  // ── auto-advance when audio ends ─────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnd = () => {
      if (!aula || !isPlaying) return;
      const next = etapaAtual + 1;
      if (next < aula.etapas.length) {
        setTimeout(() => irParaEtapa(next, true), 1000);
      } else {
        setIsPlaying(false);
        setCharState("idle");
      }
    };
    audio.addEventListener("ended", handleEnd);
    return () => audio.removeEventListener("ended", handleEnd);
  }, [aula, etapaAtual, isPlaying]); // eslint-disable-line

  // ── go to step ───────────────────────────────────────────────────────────
  const irParaEtapa = useCallback((idx: number, autoPlay = false) => {
    if (!aula) return;
    setEtapaAtual(idx);
    setBoardKey(k => k + 1);
    setBoardAllDone(false);
    setNarrationActive(false);
    setResposta(null);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setIsPlaying(autoPlay);
  }, [aula]);

  // ── canvas: first char written → start narration audio ───────────────────
  const handleFirstChar = useCallback(() => {
    setNarrationActive(true);
    if (isPlaying && etapa) playNarration(etapa.narracao);
  }, [isPlaying, etapa, playNarration]);

  // ── canvas: all elements written ─────────────────────────────────────────
  const handleAllDone = useCallback(() => {
    setBoardAllDone(true);
  }, []);

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
        setNarrationActive(true);
      }
    }
  }, [aula, isPlaying, etapa, playNarration]);

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
      if (!muted) { playNarration(txt); setCharState("speaking"); }
    } catch {
      setResposta({ texto: "Não consegui responder agora. Tente de novo!", timestamp: Date.now() });
    } finally {
      setRespondendo(false);
      setTimeout(() => setCharState("idle"), 3000);
    }
  }, [pergunta, respondendo, aula, etapa, muted, isPlaying, playNarration]);

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
            <TiagaoCharacter state="idle" size={140} showLabel={false} />
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
            O Professor Tiagão escreve na lousa ao seu ritmo — pode pausar e perguntar quando quiser
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
    <div className={`bg-slate-100 flex flex-col ${fullscreen ? "fixed inset-0 z-50" : "min-h-screen"}`}>
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

          {/* ── CANVAS BOARD ── */}
          <div className="flex-1 relative bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden min-h-[360px]">

            {/* Canvas ocupa 100% */}
            <AnimatePresence mode="wait">
              <motion.div
                key={boardKey}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {etapa && (
                  <ChalkBoardCanvas
                    elementos={etapa.elementos}
                    playing={true}
                    speedMultiplier={velocidade}
                    onFirstChar={handleFirstChar}
                    onAllDone={handleAllDone}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Tag de estilo */}
            <div className="absolute top-3 right-3 z-10 pointer-events-none">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                {estilo}
              </span>
            </div>

            {/* Professor Tiagão na lousa */}
            <div className="absolute bottom-0 left-0 z-20 pointer-events-none select-none">
              <TiagaoCharacter state={charState} size={100} showLabel={false} />
            </div>

            {/* Indicador de escrita */}
            <AnimatePresence>
              {!boardAllDone && etapa && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span className="text-xs text-slate-600 font-medium">Professor escrevendo...</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Áudio carregando */}
            {audioLoading && (
              <div className="absolute top-10 left-3 z-20 flex items-center gap-2 bg-indigo-50/90 backdrop-blur-sm border border-indigo-200 rounded-xl px-3 py-1.5">
                <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
                <span className="text-xs text-indigo-600 font-medium">Tiagão falando...</span>
              </div>
            )}
          </div>

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
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </motion.button>
              <button onClick={() => irParaEtapa(Math.min(totalEtapas - 1, etapaAtual + 1))}
                disabled={etapaAtual === totalEtapas - 1}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                onClick={() => { audioRef.current?.pause(); playNarration(etapa?.narracao ?? ""); }}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all ml-2"
                title="Repetir explicação">
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

          {/* Narração */}
          <div className="p-4 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              O que o Professor diz
            </p>
            <AnimatePresence mode="wait">
              <motion.div key={etapaAtual}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                <NarrationText text={etapa?.narracao ?? ""} active={narrationActive && !boardAllDone} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Resposta do Tiagão */}
          <AnimatePresence>
            {resposta && (
              <motion.div key={resposta.timestamp}
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-4 border-b border-indigo-100 bg-indigo-50">
                <div className="flex items-center gap-2 mb-1.5">
                  <TiagaoCharacter state="speaking" size={32} showLabel={false} />
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
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── INPUT DE PERGUNTAS ── */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-white px-3 sm:px-5 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <div className="w-10 h-10 flex-shrink-0">
            <TiagaoCharacter state={respondendo ? "thinking" : "idle"} size={40} showLabel={false} />
          </div>
          <div className="flex-1 relative">
            <input
              value={pergunta}
              onChange={e => setPergunta(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviarPergunta()}
              placeholder="Pode perguntar ao Professor — ele responde ao vivo..."
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
        </div>
      </div>
    </div>
  );
}
