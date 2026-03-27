import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@workspace/replit-auth-web";
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Target,
  Zap,
  RotateCcw,
  AlertCircle,
  BookOpen,
  Loader2,
  ChevronDown,
  Star,
  TrendingUp,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StudyPlan } from "@/hooks/use-study-plan";

interface Pergunta {
  id: number;
  enunciado: string;
  opcoes: { A: string; B: string; C: string; D: string };
  correta: "A" | "B" | "C" | "D";
  explicacao: string;
}

interface SimuladoData {
  titulo: string;
  tempoMinutos: number;
  perguntas: Pergunta[];
}

function sanitizeSimulado(raw: any): SimuladoData | null {
  try {
    if (!raw || typeof raw !== "object") return null;
    const perguntas: Pergunta[] = (Array.isArray(raw.perguntas) ? raw.perguntas : [])
      .map((p: any, idx: number) => {
        if (!p || typeof p !== "object") return null;
        const correctaRaw = String(p.correta ?? "").toUpperCase().trim().replace(/[^ABCD]/g, "");
        const correta = (["A", "B", "C", "D"].includes(correctaRaw) ? correctaRaw : "A") as "A" | "B" | "C" | "D";
        const opcoes = p.opcoes && typeof p.opcoes === "object" ? p.opcoes : {};
        const safeOpcoes = {
          A: String(opcoes.A ?? opcoes.a ?? "—"),
          B: String(opcoes.B ?? opcoes.b ?? "—"),
          C: String(opcoes.C ?? opcoes.c ?? "—"),
          D: String(opcoes.D ?? opcoes.d ?? "—"),
        };
        return {
          id: typeof p.id === "number" ? p.id : idx + 1,
          enunciado: String(p.enunciado ?? p.pergunta ?? "Questão sem enunciado"),
          opcoes: safeOpcoes,
          correta,
          explicacao: String(p.explicacao ?? p.gabarito ?? "Sem explicação disponível."),
        } as Pergunta;
      })
      .filter(Boolean) as Pergunta[];
    if (perguntas.length === 0) return null;
    return {
      titulo: String(raw.titulo ?? "Simulado de Prova"),
      tempoMinutos: typeof raw.tempoMinutos === "number" && raw.tempoMinutos > 0 ? raw.tempoMinutos : 20,
      perguntas,
    };
  } catch {
    return null;
  }
}

interface SimuladoProps {
  plan: StudyPlan;
  serie: string;
  onClose: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getGrade(score: number, total: number) {
  const pct = total > 0 ? score / total : 0;
  if (pct >= 0.9) return { nota: "10", label: "Excelente!", emoji: "🏆", color: "#10b981", bg: "from-emerald-400 to-teal-500", ring: "#10b981", tier: "S" };
  if (pct >= 0.8) return { nota: "9", label: "Ótimo!", emoji: "🌟", color: "#059669", bg: "from-emerald-500 to-green-600", ring: "#059669", tier: "A" };
  if (pct >= 0.7) return { nota: "8", label: "Muito Bom!", emoji: "👏", color: "#3b82f6", bg: "from-blue-400 to-indigo-500", ring: "#3b82f6", tier: "B" };
  if (pct >= 0.6) return { nota: "7", label: "Bom!", emoji: "👍", color: "#6366f1", bg: "from-indigo-400 to-violet-500", ring: "#6366f1", tier: "C" };
  if (pct >= 0.5) return { nota: "6", label: "Passou!", emoji: "😅", color: "#f59e0b", bg: "from-yellow-400 to-orange-400", ring: "#f59e0b", tier: "D" };
  if (pct >= 0.4) return { nota: "5", label: "Quase lá!", emoji: "💪", color: "#f97316", bg: "from-orange-400 to-red-400", ring: "#f97316", tier: "E" };
  return { nota: "< 5", label: "Precisa revisar!", emoji: "📚", color: "#ef4444", bg: "from-red-400 to-rose-500", ring: "#ef4444", tier: "F" };
}

const OPTION_COLORS: Record<string, { idle: string; selected: string; badge: string }> = {
  A: { idle: "border-slate-200 hover:border-violet-300 hover:bg-violet-50", selected: "border-violet-500 bg-violet-50 shadow-md shadow-violet-100", badge: "bg-violet-100 text-violet-700" },
  B: { idle: "border-slate-200 hover:border-blue-300 hover:bg-blue-50", selected: "border-blue-500 bg-blue-50 shadow-md shadow-blue-100", badge: "bg-blue-100 text-blue-700" },
  C: { idle: "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50", selected: "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100", badge: "bg-emerald-100 text-emerald-700" },
  D: { idle: "border-slate-200 hover:border-orange-300 hover:bg-orange-50", selected: "border-orange-500 bg-orange-50 shadow-md shadow-orange-100", badge: "bg-orange-100 text-orange-700" },
};

function LoadingSimulado() {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: "📖", text: "Analisando o conteúdo estudado..." },
    { icon: "🧠", text: "Criando questões estratégicas..." },
    { icon: "⚖️", text: "Calibrando a dificuldade..." },
    { icon: "✅", text: "Finalizando o simulado..." },
  ];
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % steps.length), 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-10">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-200">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full border-2 border-violet-200 flex items-center justify-center text-lg">
          {steps[step].icon}
        </div>
      </div>
      <div className="text-center space-y-3">
        <h3 className="text-2xl font-black text-slate-800">Gerando seu Simulado</h3>
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-slate-500 text-sm font-medium"
          >
            {steps[step].text}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="flex gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              i === step ? "w-8 bg-violet-500" : i < step ? "w-3 bg-violet-300" : "w-3 bg-slate-200"
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function SimuladoButton({ plan, serie }: { plan: StudyPlan; serie: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300 transition-all duration-200 hover:-translate-y-0.5 text-sm"
      >
        <Target className="w-4 h-4" />
        Fazer Simulado
      </button>
      <AnimatePresence>
        {open && <Simulado plan={plan} serie={serie} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

function Simulado({ plan, serie, onClose }: SimuladoProps) {
  const { isAuthenticated } = useAuth();
  const [phase, setPhase] = useState<"loading" | "exam" | "results">("loading");
  const [simulado, setSimulado] = useState<SimuladoData | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [reviewOpen, setReviewOpen] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<any>(null);
  const timerStarted = useRef(false);

  const handleSubmit = useCallback(() => {
    clearInterval(timerRef.current);
    timerStarted.current = false;
    setSubmitted(true);
    setPhase("results");
  }, []);

  useEffect(() => {
    generateSimulado();
  }, []);

  useEffect(() => {
    if (phase !== "exam" || !simulado || submitted) return;
    timerStarted.current = true;
    setTimeLeft(simulado.tempoMinutos * 60);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
      setTimeTaken((t) => t + 1);
    }, 1000);
    return () => {
      clearInterval(timerRef.current);
    };
  }, [phase, simulado, submitted]);

  useEffect(() => {
    if (phase === "exam" && timeLeft === 0 && simulado && !submitted && timerStarted.current) {
      handleSubmit();
    }
  }, [timeLeft, phase, simulado, submitted, handleSubmit]);

  useEffect(() => {
    if (phase !== "results" || !simulado || !isAuthenticated) return;
    const scoreVal = simulado.perguntas.filter((p) => answers[p.id] === p.correta).length;
    const totalVal = simulado.perguntas.length;
    const gradeVal = getGrade(scoreVal, totalVal);
    fetch("/api/history/simulado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        materia: (plan as any).materia || "Simulado",
        titulo: simulado.titulo,
        score: scoreVal,
        total: totalVal,
        timeTaken,
        nota: gradeVal.nota,
      }),
    }).catch(() => {});
  }, [phase]);

  const generateSimulado = async () => {
    timerStarted.current = false;
    setError(null);
    setPhase("loading");
    setSimulado(null);
    setAnswers({});
    setCurrent(0);
    setSubmitted(false);
    setTimeTaken(0);
    try {
      const diasConteudo = plan.dias
        .map((d) => {
          const topicDetails = d.topicos.map((t) => {
            if (typeof t === "object" && t !== null) {
              const to = t as any;
              let detail = `  - ${to.nome}`;
              if (to.explicacao) detail += `\n    Explicação: ${to.explicacao}`;
              if (to.gatilho) detail += `\n    Conceito-chave: ${to.gatilho}`;
              return detail;
            }
            return `  - ${t}`;
          });
          return `Dia ${d.numero} - ${d.titulo}:\n${topicDetails.join("\n")}`;
        })
        .join("\n\n");

      const res = await fetch("/api/simulado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materia: plan.materia,
          serie,
          resumo: plan.resumoDoConteudo,
          diasConteudo,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.erro) throw new Error(data.erro || "Erro ao gerar simulado");
      const safe = sanitizeSimulado(data.simulado);
      if (!safe) throw new Error("O simulado gerado veio em formato inválido. Tente novamente.");
      setSimulado(safe);
      setPhase("exam");
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!simulado && error) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="font-black text-xl mb-2 text-slate-800">Erro ao gerar simulado</h3>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">{error}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl font-bold border-2 border-slate-200 hover:bg-slate-50 transition-colors text-slate-600">
              Fechar
            </button>
            <button onClick={generateSimulado} className="flex-1 px-4 py-2.5 rounded-xl font-black text-white bg-gradient-to-r from-violet-500 to-indigo-600 hover:opacity-90 transition-opacity">
              Tentar novamente
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  const total = simulado?.perguntas.length ?? 0;
  const score = simulado ? simulado.perguntas.filter((p) => answers[p.id] === p.correta).length : 0;
  const grade = simulado ? getGrade(score, total) : null;
  const timeWarning = timeLeft > 0 && timeLeft <= 120;
  const timeCritical = timeLeft > 0 && timeLeft <= 30;
  const currentQ = simulado?.perguntas[current];
  const answeredCount = Object.keys(answers).length;
  const pct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className={cn(
          "relative px-6 py-4 flex-shrink-0 overflow-hidden",
          phase === "loading" ? "bg-gradient-to-r from-violet-600 to-indigo-700"
          : phase === "results" && grade ? `bg-gradient-to-r ${grade.bg}`
          : timeCritical ? "bg-gradient-to-r from-red-600 to-rose-700"
          : timeWarning ? "bg-gradient-to-r from-orange-500 to-red-500"
          : "bg-gradient-to-r from-slate-800 to-slate-900"
        )}>
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 40%)"
          }} />
          <div className="relative flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              {phase === "loading" ? <Loader2 className="w-5 h-5 text-white animate-spin" />
               : phase === "results" ? <Trophy className="w-5 h-5 text-white" />
               : <Target className="w-5 h-5 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                {phase === "loading" ? "Preparando" : phase === "results" ? "Resultado Final" : `${plan.aluno} · ${serie}`}
              </p>
              <h2 className="font-black text-white text-sm sm:text-base truncate leading-tight">
                {simulado?.titulo ?? "Simulado de Prova"}
              </h2>
            </div>
            {phase === "exam" && simulado && (
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-sm tabular-nums flex-shrink-0",
                timeCritical ? "bg-white text-red-600 animate-pulse scale-110"
                : timeWarning ? "bg-white/90 text-orange-600"
                : "bg-white/15 text-white"
              )}>
                <Clock className="w-4 h-4" />
                {formatTime(timeLeft)}
              </div>
            )}
            {phase !== "exam" && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Progress bar (exam only) */}
          {phase === "exam" && total > 0 && (
            <div className="relative mt-3">
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white/80 rounded-full"
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className="absolute right-0 -top-0.5 text-white/60 text-[10px] font-bold">{pct}%</span>
            </div>
          )}
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto bg-slate-50">

          {/* LOADING */}
          {phase === "loading" && <LoadingSimulado />}

          {/* EXAM */}
          {phase === "exam" && simulado && currentQ && (
            <div className="p-5 space-y-4">

              {/* Question nav dots */}
              <div className="flex gap-1.5 flex-wrap">
                {simulado.perguntas.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setCurrent(i)}
                    title={`Questão ${i + 1}`}
                    className={cn(
                      "w-7 h-7 rounded-lg text-xs font-black transition-all duration-150",
                      i === current
                        ? "bg-violet-600 text-white scale-115 shadow-md shadow-violet-200 ring-2 ring-violet-300 ring-offset-1"
                        : answers[p.id]
                        ? "bg-emerald-400 text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-600"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              {/* Question card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQ.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-3"
                >
                  {/* Question text */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-violet-600 text-white text-sm font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                        {current + 1}
                      </div>
                      <p className="text-slate-800 font-semibold leading-relaxed text-[15px]">{currentQ.enunciado}</p>
                    </div>
                  </div>

                  {/* Answer options */}
                  <div className="space-y-2.5">
                    {(["A", "B", "C", "D"] as const).map((letra) => {
                      const selected = answers[currentQ.id] === letra;
                      const colors = OPTION_COLORS[letra];
                      return (
                        <motion.button
                          key={letra}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setAnswers((prev) => ({ ...prev, [currentQ.id]: letra }))}
                          className={cn(
                            "w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-150",
                            selected ? colors.selected : colors.idle,
                            "bg-white"
                          )}
                        >
                          <span className={cn(
                            "w-8 h-8 rounded-xl text-sm font-black flex items-center justify-center flex-shrink-0 transition-colors",
                            selected ? `${colors.badge} ring-2 ring-offset-1` : colors.badge
                          )}>
                            {letra}
                          </span>
                          <span className={cn(
                            "pt-0.5 text-sm leading-relaxed",
                            selected ? "font-semibold text-slate-800" : "text-slate-600"
                          )}>
                            {currentQ.opcoes[letra]}
                          </span>
                          {selected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="ml-auto mt-0.5 flex-shrink-0"
                            >
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* RESULTS */}
          {phase === "results" && simulado && grade && (
            <div className="p-5 space-y-5">

              {/* Score hero */}
              <div className={cn(
                "relative rounded-3xl p-6 overflow-hidden bg-gradient-to-br",
                grade.bg
              )}>
                <div className="absolute inset-0 opacity-10"
                  style={{ backgroundImage: "radial-gradient(circle at 70% 30%, white 0%, transparent 60%)" }}
                />
                <div className="relative flex items-center gap-5">
                  {/* Circle score */}
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
                      <motion.circle
                        cx="48" cy="48" r="40" fill="none"
                        stroke="white" strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - score / total) }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-white font-black text-2xl leading-none">{score}</span>
                      <span className="text-white/70 text-xs font-bold">/{total}</span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-white/80 text-sm font-semibold mb-0.5">Nota estimada</p>
                    <p className="text-white font-black text-4xl leading-none mb-1">{grade.nota}</p>
                    <p className="text-white/90 font-bold text-lg">{grade.emoji} {grade.label}</p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="relative flex gap-3 mt-4">
                  <div className="flex-1 bg-white/20 rounded-2xl p-3 text-center">
                    <CheckCircle2 className="w-5 h-5 text-white mx-auto mb-1" />
                    <p className="text-white font-black text-xl">{score}</p>
                    <p className="text-white/75 text-xs font-semibold">Corretas</p>
                  </div>
                  <div className="flex-1 bg-white/20 rounded-2xl p-3 text-center">
                    <XCircle className="w-5 h-5 text-white mx-auto mb-1" />
                    <p className="text-white font-black text-xl">{total - score}</p>
                    <p className="text-white/75 text-xs font-semibold">Erradas</p>
                  </div>
                  <div className="flex-1 bg-white/20 rounded-2xl p-3 text-center">
                    <Clock className="w-5 h-5 text-white mx-auto mb-1" />
                    <p className="text-white font-black text-xl">{formatTime(timeTaken)}</p>
                    <p className="text-white/75 text-xs font-semibold">Tempo</p>
                  </div>
                  <div className="flex-1 bg-white/20 rounded-2xl p-3 text-center">
                    <TrendingUp className="w-5 h-5 text-white mx-auto mb-1" />
                    <p className="text-white font-black text-xl">{total > 0 ? Math.round((score / total) * 100) : 0}%</p>
                    <p className="text-white/75 text-xs font-semibold">Acertos</p>
                  </div>
                </div>
              </div>

              {/* Review section */}
              <div>
                <h3 className="font-black text-slate-800 text-base mb-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-violet-600" />
                  </div>
                  Revisão Comentada
                </h3>
                <div className="space-y-2.5">
                  {simulado.perguntas.map((p, i) => {
                    const userAnswer = answers[p.id];
                    const correct = userAnswer === p.correta;
                    const isOpen = reviewOpen === i;
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "rounded-2xl border overflow-hidden transition-shadow",
                          correct ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50",
                          isOpen && "shadow-md"
                        )}
                      >
                        <button
                          className="w-full p-4 flex items-center gap-3 text-left hover:bg-black/[0.02] transition-colors"
                          onClick={() => setReviewOpen(isOpen ? null : i)}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                            correct ? "bg-emerald-500" : "bg-red-500"
                          )}>
                            {correct
                              ? <CheckCircle2 className="w-5 h-5 text-white" />
                              : <XCircle className="w-5 h-5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Q{i + 1}</span>
                              {!correct && userAnswer && (
                                <span className="text-[11px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
                                  Sua: {userAnswer} · Correta: {p.correta}
                                </span>
                              )}
                              {correct && (
                                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  Correto ✓
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-slate-700 line-clamp-1">{p.enunciado}</p>
                          </div>
                          <ChevronDown className={cn(
                            "w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200",
                            isOpen && "rotate-180"
                          )} />
                        </button>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-200/60">
                                <div className="grid grid-cols-1 gap-2 mt-2">
                                  {(["A", "B", "C", "D"] as const).map((letra) => (
                                    <div
                                      key={letra}
                                      className={cn(
                                        "flex items-start gap-2.5 p-3 rounded-xl text-sm border",
                                        letra === p.correta
                                          ? "bg-emerald-50 border-emerald-300"
                                          : letra === userAnswer && !correct
                                          ? "bg-red-50 border-red-200"
                                          : "bg-white border-slate-100 text-slate-400"
                                      )}
                                    >
                                      <span className={cn(
                                        "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0",
                                        letra === p.correta
                                          ? "bg-emerald-500 text-white"
                                          : letra === userAnswer && !correct
                                          ? "bg-red-400 text-white"
                                          : "bg-slate-100 text-slate-400"
                                      )}>
                                        {letra}
                                      </span>
                                      <span className={cn(
                                        "leading-relaxed",
                                        letra === p.correta ? "font-semibold text-emerald-800" : ""
                                      )}>
                                        {p.opcoes[letra]}
                                        {letra === p.correta && <span className="ml-1.5 text-emerald-500 font-black">✓</span>}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                <div className="bg-violet-50 border border-violet-200 rounded-xl p-3.5">
                                  <p className="text-[11px] font-black uppercase tracking-wider text-violet-500 mb-1.5 flex items-center gap-1">
                                    <Star className="w-3 h-3" /> Explicação do Professor
                                  </p>
                                  <p className="text-sm text-slate-700 leading-relaxed">{p.explicacao}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="px-5 py-4 bg-white border-t border-slate-100 flex-shrink-0">

          {phase === "exam" && simulado && (
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                  disabled={current === 0}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <button
                  onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
                  disabled={current === total - 1}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="flex-1 text-center text-sm text-slate-400 font-semibold">
                {answeredCount === total
                  ? <span className="text-emerald-600 font-black">Todas respondidas! ✓</span>
                  : <span>{answeredCount} de {total} respondidas</span>
                }
              </div>

              <button
                onClick={handleSubmit}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-white text-sm transition-all shadow-lg",
                  answeredCount === total
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 shadow-emerald-200"
                    : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 shadow-violet-200"
                )}
              >
                {answeredCount === total
                  ? <><Trophy className="w-4 h-4" /> Ver Resultado</>
                  : <><Zap className="w-4 h-4" /> Entregar ({answeredCount}/{total})</>
                }
              </button>
            </div>
          )}

          {phase === "results" && (
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold border-2 border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 text-sm"
              >
                <X className="w-4 h-4" /> Fechar
              </button>
              <button
                onClick={generateSimulado}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black text-white text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 transition-opacity shadow-lg shadow-violet-200"
              >
                <RotateCcw className="w-4 h-4" /> Novo Simulado
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
