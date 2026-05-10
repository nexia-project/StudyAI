/**
 * Lousa Imersiva — Aula interativa com Professor Tiagão na lousa
 *
 * Features:
 * - Geração de roteiro com 8-14 etapas via GPT
 * - Lousa canvas animada (ChalkBoardCanvas) passo a passo
 * - Avatar Tiagão muda de estado por etapa
 * - Controles: play/pause, voltar, avançar, velocidade
 * - Timeline clicável com progresso
 * - Quiz overlay no meio da aula
 * - Painel de perguntas (aluno pode perguntar durante pausa)
 * - Biblioteca de aulas salvas (replay)
 * - TTS via SpeechSynthesis (pt-BR)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  ChevronLeft, Loader2, MessageCircle, X, BookOpen,
  Zap, Trash2, RefreshCw, CheckCircle2, XCircle,
  ChevronRight, Trophy, Clock,
} from "lucide-react";
import { ChalkBoardCanvas, type ChalkBoardHandle } from "@/components/ChalkBoardCanvas";
import { TiagaoCharacter, type CharacterState } from "@/components/TiagaoCharacter";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────
interface BoardElement {
  tipo: "titulo" | "formula" | "texto" | "destaque" | "seta" | "separador" | "exemplo";
  texto?: string;
  cor?: string;
  corTexto?: string;
}

interface QuizData {
  pergunta: string;
  opcoes: string[];
  correta: number;
  explicacao: string;
}

interface Etapa {
  id: number;
  narracao: string;
  elementos: BoardElement[];
  duracao: number;
  tipo?: "normal" | "quiz" | "resumo";
  quiz?: QuizData;
}

interface AulaScript {
  titulo: string;
  subtitulo: string;
  etapas: Etapa[];
  resumo?: string[];
}

interface BoardLesson {
  id: number;
  title: string;
  subject: string;
  topic: string;
  difficulty: string;
  status: "generating" | "ready" | "error";
  total_steps: number;
  duration_seconds: number;
  views: number;
  script: AulaScript;
  created_at: string;
}

const SUBJECTS = ["Matemática", "Física", "Química", "Biologia", "História", "Geografia", "Português", "Inglês", "Filosofia", "Sociologia"];
const DIFFICULTIES = [
  { value: "facil", label: "Fácil" },
  { value: "medio", label: "Médio" },
  { value: "dificil", label: "Difícil" },
];
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// ── TTS via SpeechSynthesis ──────────────────────────────────────────────────
function speak(text: string, rate = 1) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "pt-BR";
  utter.rate = rate;
  // pick a pt-BR voice if available
  const voices = window.speechSynthesis.getVoices();
  const ptVoice = voices.find(v => v.lang.startsWith("pt")) ?? null;
  if (ptVoice) utter.voice = ptVoice;
  window.speechSynthesis.speak(utter);
}

function stopSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function difficultyLabel(d: string) {
  return DIFFICULTIES.find(x => x.value === d)?.label ?? d;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LousaImersiva() {
  const [, navigate] = useLocation();

  // ── Library / create state ──
  const [view, setView] = useState<"library" | "create" | "player">("library");
  const [lessons, setLessons] = useState<BoardLesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);

  // ── Create form ──
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("Matemática");
  const [difficulty, setDifficulty] = useState("medio");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // ── Player state ──
  const [lesson, setLesson] = useState<BoardLesson | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [pollingId, setPollingId] = useState<number | null>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [boardDone, setBoardDone] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [boardKey, setBoardKey] = useState(0);
  const [charState, setCharState] = useState<CharacterState>("idle");

  // ── Quiz state ──
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<"correct" | "wrong" | null>(null);

  // ── Question panel ──
  const [showQuestion, setShowQuestion] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState("");

  const boardRef = useRef<ChalkBoardHandle>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load library ──────────────────────────────────────────────────────────
  const loadLessons = useCallback(async () => {
    setLoadingLessons(true);
    try {
      const r = await fetch(`${BASE_URL}/api/board/lessons`, { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setLessons(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    finally { setLoadingLessons(false); }
  }, []);

  useEffect(() => { loadLessons(); }, [loadLessons]);

  // ── Create lesson ─────────────────────────────────────────────────────────
  const createLesson = async () => {
    if (!topic.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const r = await fetch(`${BASE_URL}/api/board/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic: topic.trim(), subject, difficulty }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        const dbg = body?._debug ? ` (${body._debug})` : "";
        throw new Error((body?.error || "Erro ao criar aula") + dbg);
      }
      openPlayer(body.lessonId);
    } catch (err: any) {
      setCreateError(err?.message || "Não consegui criar a aula. Tente novamente.");
    } finally {
      setCreating(false);
    }
  };

  // ── Open player ───────────────────────────────────────────────────────────
  const openPlayer = useCallback(async (id: number) => {
    setView("player");
    setLoadingLesson(true);
    setLesson(null);
    setCurrentStep(0);
    setIsPlaying(false);
    setBoardDone(false);
    setShowQuiz(false);
    setQuizAnswer(null);
    setQuizResult(null);
    setShowQuestion(false);
    setAnswer("");
    setPollingId(id);
  }, []);

  // ── Poll for lesson ready ─────────────────────────────────────────────────
  useEffect(() => {
    if (!pollingId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/board/${pollingId}`, { credentials: "include" });
        if (!r.ok) return;
        const data: BoardLesson = await r.json();
        if (cancelled) return;
        setLesson(data);
        if (data.status === "ready" || data.status === "error") {
          setLoadingLesson(false);
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        }
      } catch { /* ignore */ }
    };

    poll(); // immediate first poll
    pollRef.current = setInterval(poll, 2000);

    return () => {
      cancelled = true;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [pollingId]);

  // ── Character state ───────────────────────────────────────────────────────
  useEffect(() => {
    if (loadingLesson) { setCharState("thinking"); return; }
    if (!lesson) { setCharState("idle"); return; }
    const etapa = lesson.script?.etapas?.[currentStep];
    if (!etapa) { setCharState("idle"); return; }
    if (showQuiz) { setCharState("thinking"); return; }
    if (showQuestion) { setCharState("speaking"); return; }
    if (isPlaying) {
      const t = etapa.tipo ?? "normal";
      if (t === "resumo") setCharState("excited");
      else setCharState("speaking");
    } else {
      setCharState(boardDone ? "idle" : "speaking");
    }
  }, [isPlaying, loadingLesson, lesson, currentStep, boardDone, showQuiz, showQuestion]);

  // ── TTS narration ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || !lesson || muted) return;
    const etapa = lesson.script?.etapas?.[currentStep];
    if (!etapa?.narracao) return;
    speak(etapa.narracao, speed);
    return () => stopSpeech();
  }, [isPlaying, currentStep, lesson, muted, speed]);

  // ── When board finishes drawing ──────────────────────────────────────────
  const handleBoardDone = useCallback(() => {
    setBoardDone(true);
    if (!lesson) return;
    const etapa = lesson.script?.etapas?.[currentStep];
    if (etapa?.tipo === "quiz" && etapa.quiz) {
      // Show quiz after a short delay
      setTimeout(() => {
        setIsPlaying(false);
        setShowQuiz(true);
      }, 800);
    }
  }, [lesson, currentStep]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goToStep = useCallback((idx: number, autoPlay = false) => {
    if (!lesson) return;
    const etapas = lesson.script?.etapas ?? [];
    if (idx < 0 || idx >= etapas.length) return;
    stopSpeech();
    setCurrentStep(idx);
    setBoardKey(k => k + 1);
    setBoardDone(false);
    setShowQuiz(false);
    setQuizAnswer(null);
    setQuizResult(null);
    setShowQuestion(false);
    setAnswer("");
    setIsPlaying(autoPlay);

    // Save progress
    if (lesson.id) {
      fetch(`${BASE_URL}/api/board/${lesson.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentStep: idx, completed: idx === etapas.length - 1 }),
      }).catch(() => {});
    }
  }, [lesson]);

  const nextStep = useCallback(() => {
    if (!lesson) return;
    const total = lesson.script?.etapas?.length ?? 0;
    if (currentStep < total - 1) goToStep(currentStep + 1, true);
  }, [lesson, currentStep, goToStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) goToStep(currentStep - 1, false);
  }, [currentStep, goToStep]);

  const togglePlay = useCallback(() => {
    setIsPlaying(p => {
      if (p) stopSpeech();
      return !p;
    });
  }, []);

  // ── Quiz answer ───────────────────────────────────────────────────────────
  const answerQuiz = (idx: number) => {
    if (quizAnswer !== null) return;
    const etapa = lesson?.script?.etapas?.[currentStep];
    if (!etapa?.quiz) return;
    setQuizAnswer(idx);
    const correct = idx === etapa.quiz.correta;
    setQuizResult(correct ? "correct" : "wrong");
    if (!muted) {
      speak(correct ? "Muito bem! Resposta correta!" : `Não foi dessa vez. ${etapa.quiz.explicacao}`, speed);
    }
  };

  const continueAfterQuiz = () => {
    setShowQuiz(false);
    setQuizAnswer(null);
    setQuizResult(null);
    if (quizResult === "correct") nextStep();
    // If wrong, re-explain the same step
    else {
      setBoardKey(k => k + 1);
      setBoardDone(false);
      setIsPlaying(true);
    }
  };

  // ── Ask question ──────────────────────────────────────────────────────────
  const askQuestion = async () => {
    if (!question.trim() || !lesson) return;
    setAsking(true);
    setAnswer("");
    const etapa = lesson.script?.etapas?.[currentStep];
    const stepText = etapa?.elementos?.map(e => e.texto).filter(Boolean).join(" ") ?? "";
    try {
      const r = await fetch(`${BASE_URL}/api/board/interact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lessonId: lesson.id,
          question: question.trim(),
          stepContent: stepText,
        }),
      });
      const data = await r.json();
      const narration = data.narration ?? "Boa pergunta! Continue assistindo.";
      setAnswer(narration);
      if (!muted) speak(narration, speed);
    } catch {
      setAnswer("Boa pergunta! Continue assistindo para entender melhor.");
    } finally {
      setAsking(false);
      setQuestion("");
    }
  };

  // ── Delete lesson ─────────────────────────────────────────────────────────
  const deleteLesson = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Excluir esta aula?")) return;
    await fetch(`${BASE_URL}/api/board/${id}`, { method: "DELETE", credentials: "include" });
    setLessons(prev => prev.filter(l => l.id !== id));
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const etapas = lesson?.script?.etapas ?? [];
  const total = etapas.length;
  const etapa = etapas[currentStep];
  const progress = total > 0 ? ((currentStep + 1) / total) * 100 : 0;

  // ── LIBRARY VIEW ──────────────────────────────────────────────────────────
  if (view === "library") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🖊️</span>
            <span className="font-bold text-white text-lg">Lousa Imersiva</span>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => setView("create")}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition"
            >
              <Zap className="w-4 h-4" />
              Nova Aula
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Hero */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-white mb-2">Suas Aulas na Lousa</h1>
            <p className="text-slate-400">Professor Tiagão explica qualquer tópico do ENEM na lousa, do zero.</p>
          </div>

          {/* Quick create */}
          <div className="bg-gradient-to-br from-violet-900/60 to-slate-900/60 border border-violet-700/40 rounded-2xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                placeholder="Ex: Lei de Ohm, Revolução Francesa, Equações do 2º grau..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createLesson()}
              />
              <select
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-violet-500"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              >
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <button
                onClick={createLesson}
                disabled={!topic.trim() || creating}
                className="flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Gerar Aula
              </button>
            </div>
            {createError && <p className="mt-2 text-red-400 text-sm">{createError}</p>}
          </div>

          {/* Lessons grid */}
          {loadingLessons ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            </div>
          ) : lessons.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🖊️</div>
              <p className="text-slate-400 text-lg">Nenhuma aula ainda.</p>
              <p className="text-slate-500 text-sm mt-1">Crie sua primeira aula na lousa acima!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lessons.map(l => (
                <div
                  key={l.id}
                  onClick={() => l.status === "ready" ? openPlayer(l.id) : undefined}
                  className={`relative bg-slate-900 border rounded-2xl p-5 group transition ${
                    l.status === "ready"
                      ? "border-slate-700 hover:border-violet-500 cursor-pointer"
                      : "border-slate-800 opacity-70"
                  }`}
                >
                  {/* Mini board preview */}
                  <div className="w-full aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl mb-4 flex items-center justify-center border border-slate-700 overflow-hidden">
                    {l.status === "generating" ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                        <span className="text-slate-500 text-xs">Gerando...</span>
                      </div>
                    ) : l.status === "error" ? (
                      <div className="text-red-400 text-xs text-center px-4">Erro ao gerar. Tente novamente.</div>
                    ) : (
                      <div className="w-full h-full relative p-3" style={{ background: "#162b1f" }}>
                        <div className="text-yellow-300 font-bold text-xs leading-tight line-clamp-2" style={{ fontFamily: "'Caveat', cursive" }}>
                          {l.title}
                        </div>
                        <div className="text-green-200 text-xs mt-1 opacity-70" style={{ fontFamily: "'Caveat', cursive" }}>
                          {l.subject}
                        </div>
                        <div className="absolute bottom-2 right-3 text-slate-500 text-xs">▶ Assistir</div>
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-white text-sm line-clamp-2 mb-1">{l.title}</h3>
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <span className="bg-slate-800 px-2 py-0.5 rounded-full">{l.subject}</span>
                    <span>{difficultyLabel(l.difficulty)}</span>
                    {l.duration_seconds > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(l.duration_seconds)}
                      </span>
                    )}
                    {l.views > 0 && <span>{l.views} views</span>}
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => deleteLesson(l.id, e)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── CREATE VIEW ───────────────────────────────────────────────────────────
  if (view === "create") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 flex flex-col">
        <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setView("library")} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-white">Nova Aula na Lousa</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🖊️</div>
              <h2 className="text-2xl font-black text-white">Que tópico você quer aprender?</h2>
              <p className="text-slate-400 text-sm mt-1">O Professor Tiagão vai explicar na lousa, do jeito mais claro possível.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm font-medium mb-1 block">Tópico *</label>
                <input
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  placeholder="Ex: Função do 2º grau, Fotossíntese, Segunda Guerra..."
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createLesson()}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-sm font-medium mb-1 block">Matéria</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-violet-500"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                  >
                    {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-sm font-medium mb-1 block">Nível</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-violet-500"
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                  >
                    {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </div>

              {createError && <p className="text-red-400 text-sm text-center">{createError}</p>}

              <button
                onClick={createLesson}
                disabled={!topic.trim() || creating}
                className="w-full flex items-center justify-center gap-2 py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-bold text-base transition"
              >
                {creating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Gerando aula...</>
                ) : (
                  <><Zap className="w-5 h-5" /> Gerar Aula na Lousa</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYER VIEW ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
        <button
          onClick={() => {
            stopSpeech();
            setView("library");
            setLesson(null);
            setPollingId(null);
            loadLessons();
          }}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-white text-sm truncate">
            {lesson?.title ?? "Carregando aula..."}
          </h1>
          {lesson && (
            <p className="text-slate-500 text-xs">{lesson.subject} · {difficultyLabel(lesson.difficulty)}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMuted(m => !m)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title={muted ? "Ativar áudio" : "Silenciar"}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <select
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs"
          >
            {SPEEDS.map(s => <option key={s} value={s}>{s}x</option>)}
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loadingLesson && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto w-24 h-24 mb-6">
              <img src="/tiagao-thinking.png" alt="Tiagão pensando" className="w-24 h-24 object-contain" />
            </div>
            <Loader2 className="w-6 h-6 animate-spin text-violet-400 mx-auto mb-3" />
            <p className="text-white font-semibold">Preparando a aula...</p>
            <p className="text-slate-400 text-sm mt-1">O Professor Tiagão está organizando o roteiro</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {!loadingLesson && lesson?.status === "error" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 font-semibold mb-4">Erro ao gerar a aula.</p>
            <button onClick={() => { setView("create"); setLesson(null); }} className="px-4 py-2 bg-slate-800 text-white rounded-xl">
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Main player */}
      {!loadingLesson && lesson?.status === "ready" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Board area */}
          <div className="flex-1 relative flex flex-col md:flex-row min-h-0">
            {/* Board */}
            <div className="flex-1 relative min-h-0">
              <div className="absolute inset-0 m-2 md:m-4 rounded-2xl overflow-hidden"
                style={{ border: "10px solid #3d2b1f", boxShadow: "0 20px 60px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.05)" }}>
                {etapa && (
                  <ChalkBoardCanvas
                    key={boardKey}
                    ref={boardRef}
                    elementos={etapa.elementos ?? []}
                    playing={isPlaying && !showQuiz}
                    speedMultiplier={speed}
                    onAllDone={handleBoardDone}
                  />
                )}

                {/* Step type badge */}
                {etapa?.tipo === "resumo" && (
                  <div className="absolute top-3 left-3 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Resumo Final
                  </div>
                )}
                {etapa?.tipo === "quiz" && !showQuiz && (
                  <div className="absolute top-3 left-3 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs px-2 py-1 rounded-full">
                    📝 Quiz vem aí...
                  </div>
                )}

                {/* Quiz overlay */}
                <AnimatePresence>
                  {showQuiz && etapa?.quiz && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-20 p-4"
                    >
                      <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full"
                      >
                        <div className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">📝 Quiz Rápido</div>
                        <p className="text-white font-semibold text-lg mb-4">{etapa.quiz.pergunta}</p>
                        <div className="space-y-2">
                          {etapa.quiz.opcoes.map((op, idx) => (
                            <button
                              key={idx}
                              onClick={() => answerQuiz(idx)}
                              disabled={quizAnswer !== null}
                              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition border ${
                                quizAnswer === null
                                  ? "border-slate-700 bg-slate-800 hover:bg-slate-700 text-white"
                                  : idx === etapa.quiz!.correta
                                  ? "border-green-500 bg-green-900/30 text-green-300"
                                  : quizAnswer === idx
                                  ? "border-red-500 bg-red-900/30 text-red-300"
                                  : "border-slate-700 bg-slate-800/50 text-slate-500"
                              }`}
                            >
                              <span className="mr-2 text-slate-400">{String.fromCharCode(65 + idx)}.</span>
                              {op}
                            </button>
                          ))}
                        </div>

                        {quizResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4"
                          >
                            {quizResult === "correct" ? (
                              <div className="flex items-center gap-2 text-green-400 font-semibold">
                                <CheckCircle2 className="w-5 h-5" /> Correto! Muito bem!
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
                                  <XCircle className="w-5 h-5" /> Não foi dessa vez...
                                </div>
                                <p className="text-slate-400 text-sm">{etapa.quiz?.explicacao}</p>
                              </div>
                            )}
                            <button
                              onClick={continueAfterQuiz}
                              className="mt-4 w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition"
                            >
                              {quizResult === "correct" ? "Próxima Etapa →" : "Rever esta Etapa"}
                            </button>
                          </motion.div>
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Question panel */}
                <AnimatePresence>
                  {showQuestion && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-11/12 max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-4 z-15"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-violet-400 font-semibold text-sm">Tire sua dúvida com o Tiagão</span>
                        <button onClick={() => setShowQuestion(false)} className="text-slate-500 hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {answer && (
                        <div className="bg-violet-900/30 border border-violet-700/40 rounded-xl p-3 mb-3 text-sm text-violet-100">
                          {answer}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                          placeholder="O que você não entendeu?"
                          value={question}
                          onChange={e => setQuestion(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && askQuestion()}
                          autoFocus
                        />
                        <button
                          onClick={askQuestion}
                          disabled={!question.trim() || asking}
                          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
                        >
                          {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : "→"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Tiagão avatar sidebar */}
            <div className="hidden md:flex flex-col items-center justify-end pb-4 px-2 w-32 shrink-0">
              <TiagaoCharacter state={charState} size={120} />
            </div>
          </div>

          {/* Narration strip */}
          {etapa?.narracao && (
            <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 shrink-0">
              <div className="flex items-start gap-3 max-w-4xl mx-auto">
                <img src="/tiagao-teaching.png" alt="Tiagão" className="w-8 h-8 object-contain shrink-0 md:hidden" />
                <p className="text-slate-300 text-sm leading-relaxed flex-1 line-clamp-2">
                  <span className="text-violet-400 font-semibold mr-1">Tiagão:</span>
                  {etapa.narracao}
                </p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="px-4 py-2 shrink-0">
            <div className="flex items-center gap-2 max-w-4xl mx-auto">
              <span className="text-slate-500 text-xs font-mono shrink-0">{currentStep + 1}/{total}</span>
              <div
                className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer"
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  const idx = Math.floor(ratio * total);
                  goToStep(Math.max(0, Math.min(total - 1, idx)));
                }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #6366F1, #06B6D4)", width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              {/* Step dots */}
              <div className="hidden sm:flex items-center gap-1">
                {etapas.map((e, i) => (
                  <button
                    key={i}
                    onClick={() => goToStep(i)}
                    className={`w-2 h-2 rounded-full transition ${
                      i === currentStep ? "bg-violet-400 w-3" :
                      i < currentStep ? "bg-slate-600" :
                      e.tipo === "quiz" ? "bg-purple-700" :
                      "bg-slate-700"
                    }`}
                    title={e.tipo === "quiz" ? "Quiz" : `Etapa ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="px-4 pb-4 shrink-0">
            <div className="flex items-center justify-between max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white transition"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={togglePlay}
                  disabled={showQuiz}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-bold transition"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? "Pausar" : boardDone ? "Replay" : "Iniciar"}
                </button>

                {boardDone && !showQuiz && currentStep < total - 1 && (
                  <button
                    onClick={nextStep}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-sm transition"
                  >
                    Próxima <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {boardDone && currentStep === total - 1 && (
                  <div className="flex items-center gap-1.5 text-yellow-400 text-sm font-semibold">
                    <Trophy className="w-4 h-4" /> Aula concluída!
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setShowQuestion(s => !s);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    showQuestion ? "bg-cyan-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Perguntar</span>
                </button>

                <button
                  onClick={() => {
                    setBoardKey(k => k + 1);
                    setBoardDone(false);
                    setIsPlaying(false);
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  title="Reiniciar esta etapa"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    stopSpeech();
                    setView("library");
                    setLesson(null);
                    setPollingId(null);
                    loadLessons();
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  title="Biblioteca"
                >
                  <BookOpen className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
