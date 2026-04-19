import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import { useLocation } from "wouter";
import {
  Trophy, Clock, CheckCircle2, XCircle, ChevronRight,
  ArrowLeft, Star, TrendingUp, BookOpen, Calculator, RotateCcw,
  Flame, Target, BarChart3, Lock
} from "lucide-react";
import { AppNav } from "@/components/AppNav";

type Subject = "matematica" | "portugues";
type Phase = "select" | "loading" | "session" | "result";

interface Question {
  id: number;
  enunciado: string;
  opcoes: { A: string; B: string; C: string; D: string; E: string };
  correta: string;
  explicacao: string;
}

interface Progress {
  level: number;
  totalSessions: number;
  totalCorrect: number;
  totalQuestions: number;
  accuracy: number;
  currentStreak: number;
  bestStreak: number;
  lastSessionAt: string | null;
}

const SUBJECT_CONFIG = {
  matematica: {
    label: "Matemática",
    icon: Calculator,
    color: "from-blue-500 to-indigo-600",
    colorLight: "bg-blue-50 text-blue-700",
    accent: "#3b82f6",
    gradient: "from-blue-500/10 to-indigo-500/10",
    border: "border-blue-200",
  },
  portugues: {
    label: "Língua Portuguesa",
    icon: BookOpen,
    color: "from-emerald-500 to-teal-600",
    colorLight: "bg-emerald-50 text-emerald-700",
    accent: "#10b981",
    gradient: "from-emerald-500/10 to-teal-500/10",
    border: "border-emerald-200",
  },
};

function getTopicName(subject: Subject, level: number): string {
  if (subject === "matematica") {
    if (level <= 10) return "Aritmética Básica";
    if (level <= 20) return "Frações e Decimais";
    if (level <= 30) return "Porcentagem e Proporção";
    if (level <= 40) return "Álgebra Básica";
    if (level <= 50) return "Equações de 2º Grau";
    if (level <= 60) return "Funções";
    if (level <= 70) return "Geometria Plana";
    if (level <= 80) return "Geometria Espacial";
    if (level <= 90) return "Trigonometria";
    return "Estatística e Probabilidade";
  }
  if (level <= 10) return "Ortografia e Acentuação";
  if (level <= 20) return "Pontuação";
  if (level <= 30) return "Classes de Palavras";
  if (level <= 40) return "Análise Sintática";
  if (level <= 50) return "Concordância";
  if (level <= 60) return "Regência e Crase";
  if (level <= 70) return "Interpretação de Texto";
  if (level <= 80) return "Figuras de Linguagem";
  if (level <= 90) return "Literatura Brasileira";
  return "Redação ENEM";
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const OPCOES: ("A" | "B" | "C" | "D" | "E")[] = ["A", "B", "C", "D", "E"];

export default function TrilhaPage() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [phase, setPhase] = useState<Phase>("select");
  const [subject, setSubject] = useState<Subject>("matematica");
  const [progress, setProgress] = useState<Record<Subject, Progress> | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});
  const [elapsed, setElapsed] = useState(0);
  const [resultData, setResultData] = useState<{ score: number; total: number; passed: boolean; newLevel: number; level: number } | null>(null);
  const [showExplanation, setShowExplanation] = useState<Record<number, boolean>>({});
  const [loadError, setLoadError] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  // Load progress
  const loadProgress = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch(`${apiBase}/api/trilha/status`, { credentials: "include" });
      if (res.ok) setProgress(await res.json());
    } catch {}
  }, [isAuthenticated, apiBase]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  // Timer
  useEffect(() => {
    if (phase === "session") {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  async function startSession(sub: Subject) {
    setSubject(sub);
    setPhase("loading");
    setLoadError("");
    setAnswers({});
    setSubmitted({});
    setShowExplanation({});
    setElapsed(0);
    setCurrentQ(0);

    const level = progress?.[sub]?.level || 1;
    try {
      const res = await fetch(`${apiBase}/api/trilha/generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: sub, level }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao gerar questões");
      const data = await res.json();
      setQuestions(data.questions);
      setPhase("session");
    } catch (e: any) {
      setLoadError(e.message || "Erro ao gerar questões");
      setPhase("select");
    }
  }

  function selectAnswer(qIdx: number, option: string) {
    if (submitted[qIdx]) return;
    setAnswers(a => ({ ...a, [qIdx]: option }));
  }

  function confirmAnswer(qIdx: number) {
    if (!answers[qIdx] || submitted[qIdx]) return;
    setSubmitted(s => ({ ...s, [qIdx]: true }));
  }

  async function finishSession() {
    if (timerRef.current) clearInterval(timerRef.current);
    const level = progress?.[subject]?.level || 1;
    const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correta ? 1 : 0), 0);

    try {
      const res = await fetch(`${apiBase}/api/trilha/submit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, level, score, timeSeconds: elapsed }),
      });
      const data = await res.json();
      setResultData(data);
      await loadProgress();
      setPhase("result");
    } catch {
      setResultData({ score, total: 10, passed: score >= 8, newLevel: score >= 8 ? level + 1 : level, level });
      setPhase("result");
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-6 text-center">
          <Lock className="w-12 h-12 text-gray-300" />
          <h2 className="text-xl font-black text-gray-700">Entre para acessar a Trilha Mestre</h2>
          <button onClick={() => setLocation("/sign-in")}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  const curQ = questions[currentQ];
  const allAnswered = questions.length > 0 && Object.keys(submitted).length === questions.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <AppNav />

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* ── SELECT PHASE ── */}
        <AnimatePresence mode="wait">
          {phase === "select" && (
            <motion.div key="select"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>

              {/* Header */}
              <div className="text-center mb-10">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <img src="/tiagao-pointing.png" alt="Tiagão" className="w-16 h-16 object-contain"
                    style={{ filter: "drop-shadow(0 4px 12px rgba(99,102,241,0.35))" }} />
                  <div className="text-left">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Trilha Mestre</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Domine de nível em nível. 10 questões por sessão.</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-6 text-sm text-gray-400 mt-4">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 8/10 para avançar</span>
                  <span className="flex items-center gap-1.5"><Target className="w-4 h-4 text-blue-500" /> 100 níveis</span>
                  <span className="flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-500" /> Sequência diária</span>
                </div>
              </div>

              {loadError && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-center">
                  {loadError}
                </div>
              )}

              {/* Subject cards */}
              <div className="grid sm:grid-cols-2 gap-5">
                {(["matematica", "portugues"] as Subject[]).map((sub) => {
                  const cfg = SUBJECT_CONFIG[sub];
                  const prog = progress?.[sub];
                  const Icon = cfg.icon;
                  const topic = getTopicName(sub, prog?.level || 1);
                  const pct = prog ? Math.round(((prog.level - 1) / 100) * 100) : 0;

                  return (
                    <motion.button key={sub}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => startSession(sub)}
                      className={`group relative text-left bg-white rounded-2xl border-2 ${cfg.border} shadow-sm hover:shadow-lg transition-all p-6 overflow-hidden`}>

                      {/* BG gradient */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${cfg.gradient} opacity-60`} />

                      <div className="relative z-10">
                        {/* Icon + streak */}
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cfg.color} flex items-center justify-center shadow-md`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          {(prog?.currentStreak || 0) > 0 && (
                            <div className="flex items-center gap-1 bg-orange-100 text-orange-600 text-xs font-black px-2.5 py-1 rounded-full">
                              <Flame className="w-3 h-3" /> {prog?.currentStreak}
                            </div>
                          )}
                        </div>

                        <h3 className="font-black text-gray-900 text-lg mb-0.5">{cfg.label}</h3>
                        <p className="text-xs text-gray-500 mb-1">Tópico atual: <span className="font-semibold text-gray-700">{topic}</span></p>

                        {/* Level + progress bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-500">Nível</span>
                            <span className="text-xl font-black" style={{ color: cfg.accent }}>{prog?.level || 1}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-2 rounded-full bg-gradient-to-r ${cfg.color}`}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                            <span>{pct}% completo</span>
                            <span>{100 - (prog?.level || 1) + 1} níveis restantes</span>
                          </div>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
                          {[
                            { icon: BarChart3, label: "Precisão", val: `${prog?.accuracy || 0}%` },
                            { icon: Trophy, label: "Sessões", val: prog?.totalSessions || 0 },
                            { icon: Star, label: "Recorde", val: prog?.bestStreak || 0 },
                          ].map((s, i) => (
                            <div key={i} className="text-center">
                              <p className="font-black text-gray-800 text-sm">{s.val}</p>
                              <p className="text-[10px] text-gray-400">{s.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* CTA */}
                        <div className={`mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r ${cfg.color} text-white text-sm font-bold`}>
                          Iniciar sessão <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* How it works */}
              <div className="mt-8 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-black text-gray-800 text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" /> Como funciona a Trilha Mestre
                </h3>
                <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600">
                  {[
                    { n: "1", t: "10 questões por sessão", d: "Cada sessão tem 10 questões calibradas ao seu nível atual." },
                    { n: "2", t: "80% para avançar", d: "Acerte 8 ou mais para subir de nível automaticamente." },
                    { n: "3", t: "100 níveis progressivos", d: "Do básico ao ENEM avançado, em pequenos passos seguros." },
                    { n: "4", t: "Pratique todo dia", d: "Mantenha sua sequência e acumule domínio de forma consistente." },
                  ].map((s) => (
                    <div key={s.n} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{s.n}</div>
                      <div>
                        <p className="font-semibold text-gray-800 text-xs">{s.t}</p>
                        <p className="text-gray-500 text-xs leading-relaxed">{s.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── LOADING ── */}
          {phase === "loading" && (
            <motion.div key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
              <motion.img
                src="/tiagao-pointing.png" alt="Tiagão"
                className="w-32 h-32 object-contain"
                style={{ filter: "drop-shadow(0 4px 20px rgba(99,102,241,0.4))" }}
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              />
              <div className="text-center">
                <p className="font-black text-gray-800 text-xl">Preparando sua sessão...</p>
                <p className="text-gray-500 text-sm mt-1">
                  Tiagão está gerando questões do {SUBJECT_CONFIG[subject].label} para o seu nível
                </p>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i}
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: SUBJECT_CONFIG[subject].accent }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── SESSION ── */}
          {phase === "session" && curQ && (
            <motion.div key="session"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>

              {/* Top bar */}
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => { setPhase("select"); setElapsed(0); }}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Sair
                </button>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-400 font-medium">{currentQ + 1}/{questions.length}</span>
                  <div className="flex items-center gap-1.5 text-gray-600 font-mono font-bold">
                    <Clock className="w-4 h-4 text-gray-400" /> {formatTime(elapsed)}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${SUBJECT_CONFIG[subject].colorLight}`}>
                  Nível {progress?.[subject]?.level || 1}
                </div>
              </div>

              {/* Progress dots */}
              <div className="flex gap-1.5 mb-6 flex-wrap">
                {questions.map((q, i) => {
                  const isCorrect = submitted[i] && answers[i] === q.correta;
                  const isWrong = submitted[i] && answers[i] !== q.correta;
                  return (
                    <div key={i}
                      className={`h-2 flex-1 min-w-[20px] rounded-full transition-colors ${
                        i === currentQ ? "opacity-100" :
                        isCorrect ? "bg-emerald-400" :
                        isWrong ? "bg-red-400" :
                        submitted[i] ? "bg-gray-300" :
                        answers[i] ? "bg-amber-300" : "bg-gray-200"
                      }`}
                      style={i === currentQ ? { backgroundColor: SUBJECT_CONFIG[subject].accent } : {}}
                    />
                  );
                })}
              </div>

              {/* Question card */}
              <AnimatePresence mode="wait">
                <motion.div key={currentQ}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.22 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-md p-6 mb-4">

                  <p className="text-gray-800 leading-relaxed font-medium text-[15px] mb-6">{curQ.enunciado}</p>

                  <div className="space-y-2.5">
                    {OPCOES.map(opt => {
                      const selected = answers[currentQ] === opt;
                      const isCorrect = submitted[currentQ] && opt === curQ.correta;
                      const isWrong = submitted[currentQ] && selected && opt !== curQ.correta;

                      return (
                        <button key={opt}
                          onClick={() => selectAnswer(currentQ, opt)}
                          disabled={!!submitted[currentQ]}
                          className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                            isCorrect ? "border-emerald-400 bg-emerald-50" :
                            isWrong ? "border-red-400 bg-red-50" :
                            selected ? "border-indigo-400 bg-indigo-50" :
                            submitted[currentQ] ? "border-gray-100 bg-gray-50 opacity-50" :
                            "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer"
                          }`}>
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                            isCorrect ? "bg-emerald-500 text-white" :
                            isWrong ? "bg-red-500 text-white" :
                            selected ? "bg-indigo-500 text-white" :
                            "bg-gray-100 text-gray-600"
                          }`}>{opt}</span>
                          <span className={`text-sm leading-relaxed ${
                            isCorrect ? "text-emerald-800 font-semibold" :
                            isWrong ? "text-red-800" :
                            "text-gray-700"
                          }`}>{curQ.opcoes[opt]}</span>
                          {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />}
                          {isWrong && <XCircle className="w-4 h-4 text-red-500 ml-auto flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {submitted[currentQ] && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3.5 bg-indigo-50 rounded-xl border border-indigo-100">
                      <p className="text-xs font-black text-indigo-600 mb-1">💡 Explicação</p>
                      <p className="text-sm text-indigo-800 leading-relaxed">{curQ.explicacao}</p>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Actions */}
              <div className="flex gap-3">
                {!submitted[currentQ] ? (
                  <button
                    onClick={() => confirmAnswer(currentQ)}
                    disabled={!answers[currentQ]}
                    className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all ${
                      answers[currentQ]
                        ? `bg-gradient-to-r ${SUBJECT_CONFIG[subject].color} text-white hover:opacity-90 shadow-md`
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}>
                    Confirmar resposta
                  </button>
                ) : currentQ < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQ(q => q + 1)}
                    className={`flex-1 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r ${SUBJECT_CONFIG[subject].color} text-white hover:opacity-90 shadow-md flex items-center justify-center gap-2`}>
                    Próxima questão <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={finishSession}
                    className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 shadow-md flex items-center justify-center gap-2">
                    <Trophy className="w-4 h-4" /> Ver resultado
                  </button>
                )}
              </div>

              {/* Skip to result if all answered */}
              {allAnswered && currentQ < questions.length - 1 && (
                <button onClick={finishSession}
                  className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2">
                  Todas respondidas — ver resultado agora
                </button>
              )}
            </motion.div>
          )}

          {/* ── RESULT ── */}
          {phase === "result" && resultData && (
            <motion.div key="result"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>

              {/* Result header */}
              <div className={`rounded-2xl p-8 text-center mb-6 bg-gradient-to-br ${
                resultData.passed
                  ? "from-emerald-500 to-teal-600"
                  : "from-orange-400 to-amber-500"
              } text-white shadow-xl`}>
                <motion.img
                  src="/tiagao-pointing.png" alt="Tiagão"
                  className="w-28 h-28 object-contain mx-auto mb-4"
                  style={{ filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.3))" }}
                  animate={resultData.passed
                    ? { y: [0, -12, 0, -8, 0], rotate: [0, -5, 5, -3, 0] }
                    : { y: [0, -4, 0] }}
                  transition={resultData.passed
                    ? { duration: 1, ease: "easeInOut" }
                    : { repeat: Infinity, duration: 2.5 }}
                />

                <div className="text-6xl font-black mb-1">
                  {resultData.score}<span className="text-3xl opacity-70">/{resultData.total}</span>
                </div>
                <div className="text-lg font-bold opacity-90 mb-1">
                  {resultData.passed ? "🎉 Passou! Avançando de nível!" : "Continue praticando!"}
                </div>
                <p className="text-sm opacity-75">
                  {resultData.passed
                    ? `Nível ${resultData.level} → Nível ${resultData.newLevel} de ${SUBJECT_CONFIG[subject].label}`
                    : `Você precisa de 8/10 para avançar. Tente novamente!`}
                </p>

                <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                  <div className="text-center">
                    <p className="font-black text-xl">{formatTime(elapsed)}</p>
                    <p className="opacity-70 text-xs">Tempo</p>
                  </div>
                  <div className="text-center">
                    <p className="font-black text-xl">{Math.round((resultData.score / resultData.total) * 100)}%</p>
                    <p className="opacity-70 text-xs">Acerto</p>
                  </div>
                  {resultData.passed && (
                    <div className="text-center">
                      <p className="font-black text-xl">{progress?.[subject]?.currentStreak || 1}</p>
                      <p className="opacity-70 text-xs">Sequência</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Question review */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="font-black text-gray-800 text-sm">Revisão das questões</p>
                  <span className="text-xs text-gray-400">{resultData.score} certas · {resultData.total - resultData.score} erradas</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {questions.map((q, i) => {
                    const correct = answers[i] === q.correta;
                    const expanded = showExplanation[i];
                    return (
                      <div key={i} className="p-4">
                        <button
                          onClick={() => setShowExplanation(s => ({ ...s, [i]: !s[i] }))}
                          className="w-full flex items-start gap-3 text-left">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${correct ? "bg-emerald-100" : "bg-red-100"}`}>
                            {correct
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-700 leading-snug line-clamp-2">{q.enunciado}</p>
                            {!correct && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Você: <span className="text-red-600 font-semibold">{answers[i] || "—"}</span>
                                {" · "}Certa: <span className="text-emerald-600 font-semibold">{q.correta}</span>
                              </p>
                            )}
                          </div>
                        </button>
                        <AnimatePresence>
                          {expanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                              className="mt-2 ml-9 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                              <p className="text-xs text-indigo-800 leading-relaxed">{q.explicacao}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={() => setPhase("select")}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <button onClick={() => startSession(subject)}
                  className={`flex-1 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r ${SUBJECT_CONFIG[subject].color} text-white hover:opacity-90 shadow-md flex items-center justify-center gap-2`}>
                  <RotateCcw className="w-4 h-4" />
                  {resultData.passed ? `Praticar nível ${resultData.newLevel}` : "Tentar novamente"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
