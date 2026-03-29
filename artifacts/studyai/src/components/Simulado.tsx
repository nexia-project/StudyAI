import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@workspace/replit-auth-web";
import { ErrorBoundary } from "./ErrorBoundary";
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
  conteudoTexto?: string;
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

export function SimuladoButton({ plan, serie, conteudoTexto }: { plan: StudyPlan; serie: string; conteudoTexto?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <ErrorBoundary>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300 transition-all duration-200 hover:-translate-y-0.5 text-sm"
      >
        <Target className="w-4 h-4" />
        Fazer Simulado
      </button>
      <AnimatePresence>
        {open && <Simulado plan={plan} serie={serie} conteudoTexto={conteudoTexto} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </ErrorBoundary>
  );
}

function Simulado({ plan, serie, conteudoTexto, onClose }: SimuladoProps) {
  const { isAuthenticated } = useAuth();
  const [phase, setPhase] = useState<"loading" | "exam" | "results">("loading");
  const [simulado, setSimulado] = useState<SimuladoData | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [reviewOpen, setReviewOpen] = useState<number | null>(null);
  const [reviewAnswers, setReviewAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<any>(null);
  const timerStarted = useRef(false);
  // Keep refs to always-fresh values for effects that need them
  const answersRef = useRef(answers);
  const timeTakenRef = useRef(timeTaken);
  const simuladoRef = useRef(simulado);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { timeTakenRef.current = timeTaken; }, [timeTaken]);
  useEffect(() => { simuladoRef.current = simulado; }, [simulado]);

  const handleSubmit = useCallback(() => {
    clearInterval(timerRef.current);
    timerStarted.current = false;
    setSubmitted(true);
    setPhase("results");
  }, []);

  useEffect(() => {
    generateSimulado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Post history using refs so we always have fresh data at submission time
  useEffect(() => {
    if (phase !== "results") return;
    const sim = simuladoRef.current;
    if (!sim || !isAuthenticated) return;
    try {
      const finalAnswers = answersRef.current;
      const finalTime = timeTakenRef.current;
      const scoreVal = sim.perguntas.filter((p) => finalAnswers[p.id] === p.correta).length;
      const totalVal = sim.perguntas.length;
      const gradeVal = getGrade(scoreVal, totalVal);
      const materia = plan && typeof (plan as any).materia === "string" ? (plan as any).materia : "Simulado";
      fetch("/api/history/simulado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          materia,
          titulo: sim.titulo,
          score: scoreVal,
          total: totalVal,
          timeTaken: finalTime,
          nota: gradeVal.nota,
        }),
      }).catch(() => {});
    } catch {
      // Never let history POST crash the component
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isAuthenticated]);

  const generateSimulado = async () => {
    timerStarted.current = false;
    setError(null);
    setPhase("loading");
    setSimulado(null);
    setAnswers({});
    setReviewAnswers({});
    setCurrent(0);
    setSubmitted(false);
    setTimeTaken(0);
    try {
      // Build a rich text representation of the FULL plan so the simulado
      // always has real content to work from, even for image-only uploads
      // where no raw file text could be extracted.
      const diasConteudo = plan.dias
        .map((d) => {
          const topicParts = d.topicos.map((t) => {
            if (typeof t === "object" && t !== null) {
              const to = t as any;
              let s = `  TÓPICO: ${to.nome}`;
              if (to.explicacao) s += `\n  Explicação: ${to.explicacao}`;
              if (to.gatilho) s += `\n  Memorização: ${to.gatilho}`;
              if (to.exercicio?.pergunta) s += `\n  Exercício: ${to.exercicio.pergunta}`;
              if (to.exercicio?.resposta) s += `\n  Resposta: ${to.exercicio.resposta}`;
              return s;
            }
            return `  TÓPICO: ${t}`;
          });

          const exercParts = Array.isArray((d as any).exerciciosDoDia)
            ? (d as any).exerciciosDoDia.map((ex: any, ei: number) =>
                `  Exercício ${ei + 1}: ${ex.pergunta}\n  Gabarito: ${ex.gabarito}`
              )
            : [];

          let dayText = `=== DIA ${d.numero}: ${d.titulo} ===\n`;
          if (d.missao) dayText += `Missão: ${d.missao}\n`;
          dayText += topicParts.join("\n");
          if (exercParts.length > 0) dayText += `\n  --- Exercícios do Dia ---\n${exercParts.join("\n")}`;
          const desafio = (d as any).desafio;
          if (desafio && typeof desafio === "object" && desafio.enunciado) {
            dayText += `\n  Desafio: ${desafio.enunciado}\n  Solução: ${desafio.gabarito || ""}`;
          }
          return dayText;
        })
        .join("\n\n");

      const dicasText = Array.isArray((plan as any).dicasGerais)
        ? `\nDicas gerais: ${(plan as any).dicasGerais.join(" | ")}`
        : "";

      const fullPlanText = `${diasConteudo}${dicasText}`;

      // Use raw file content if available, otherwise fall back to the full plan text.
      // The plan was generated directly from the uploaded content (even images),
      // so it faithfully represents what the student actually submitted.
      const effectiveConteudo = (conteudoTexto && conteudoTexto.trim().length > 100)
        ? conteudoTexto
        : fullPlanText;

      const res = await fetch("/api/simulado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materia: plan.materia,
          serie,
          resumo: plan.resumoDoConteudo,
          diasConteudo: fullPlanText,
          conteudoTexto: effectiveConteudo,
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
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
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

              {/* Question card — no exit animation to avoid insertBefore DOM conflict on phase change */}
              <div className="space-y-3">
                <motion.div
                  key={currentQ.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  {/* Question text */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-violet-600 text-white text-sm font-black flex items-center justify-center flex-shrink-0 mt-0.5 shrink-0">
                        {current + 1}
                      </div>
                      <p className="text-slate-800 font-semibold leading-relaxed text-[15px] whitespace-pre-wrap break-words">{currentQ.enunciado}</p>
                    </div>
                  </div>

                  {/* Instruction hint */}
                  <p className="text-xs text-slate-400 font-semibold text-center pb-0.5">
                    Selecione uma alternativa · clique novamente para desmarcar
                  </p>

                  {/* Answer options */}
                  <div className="space-y-2.5">
                    {(["A", "B", "C", "D"] as const).map((letra) => {
                      const selected = answers[currentQ.id] === letra;
                      const colors = OPTION_COLORS[letra];
                      return (
                        <motion.button
                          key={letra}
                          whileTap={{ scale: 0.98 }}
                          onClick={() =>
                            setAnswers((prev) => {
                              const next = { ...prev };
                              if (next[currentQ.id] === letra) {
                                delete next[currentQ.id];
                              } else {
                                next[currentQ.id] = letra;
                              }
                              return next;
                            })
                          }
                          className={cn(
                            "w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-150",
                            selected ? colors.selected : colors.idle,
                            "bg-white"
                          )}
                        >
                          <span className={cn(
                            "w-8 h-8 rounded-xl text-sm font-black flex items-center justify-center flex-shrink-0 transition-colors shrink-0",
                            selected ? `${colors.badge} ring-2 ring-offset-1` : colors.badge
                          )}>
                            {letra}
                          </span>
                          <span className={cn(
                            "pt-0.5 text-sm leading-relaxed break-words min-w-0",
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
              </div>
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
                <h3 className="font-black text-slate-800 text-base mb-1 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-violet-600" />
                  </div>
                  Revisão Interativa
                </h3>
                <p className="text-xs text-slate-400 font-semibold mb-3 ml-9">
                  Clique em uma questão, escolha uma alternativa e veja o gabarito
                </p>
                <div className="space-y-2.5">
                  {simulado.perguntas.map((p, i) => {
                    const examAnswer = answers[p.id];
                    const examCorrect = examAnswer === p.correta;
                    const isOpen = reviewOpen === i;
                    const reviewPick = reviewAnswers[p.id];
                    const revealed = reviewPick !== undefined;
                    const reviewCorrect = reviewPick === p.correta;
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "rounded-2xl border overflow-hidden transition-all duration-200",
                          isOpen ? "border-violet-300 shadow-md shadow-violet-100" : "border-slate-200",
                          !isOpen && (examCorrect ? "bg-emerald-50/40" : "bg-red-50/30")
                        )}
                      >
                        {/* Accordion header */}
                        <button
                          className="w-full p-4 flex items-center gap-3 text-left hover:bg-black/[0.02] transition-colors"
                          onClick={() => setReviewOpen(isOpen ? null : i)}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                            examCorrect ? "bg-emerald-500" : "bg-red-500"
                          )}>
                            {examCorrect
                              ? <CheckCircle2 className="w-5 h-5 text-white" />
                              : <XCircle className="w-5 h-5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Q{i + 1}</span>
                              {examCorrect ? (
                                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  Acertou no simulado ✓
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
                                  Errou no simulado
                                </span>
                              )}
                              {isOpen && !revealed && (
                                <span className="text-[11px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full animate-pulse">
                                  Escolha uma alternativa →
                                </span>
                              )}
                              {revealed && (
                                <span className={cn(
                                  "text-[11px] font-bold px-2 py-0.5 rounded-full",
                                  reviewCorrect ? "text-emerald-600 bg-emerald-100" : "text-orange-600 bg-orange-100"
                                )}>
                                  {reviewCorrect ? "Acertou agora ✓" : "Errou de novo"}
                                </span>
                              )}
                            </div>
                            <p className={cn(
                              "text-sm font-semibold text-slate-700 break-words",
                              isOpen ? "" : "line-clamp-2"
                            )}>{p.enunciado}</p>
                          </div>
                          <ChevronDown className={cn(
                            "w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200",
                            isOpen && "rotate-180"
                          )} />
                        </button>

                        {/* Expanded content — CSS-only transition avoids framer-motion DOM conflicts in lists */}
                        {isOpen && (
                          <div className="border-t border-slate-200/60">
                            <div className="px-4 pb-4 pt-3 space-y-3">
                              {/* Full question */}
                              <p className="text-sm font-semibold text-slate-700 leading-relaxed bg-white rounded-xl px-3 py-3 border border-slate-200">
                                {p.enunciado}
                              </p>

                              {/* Options — neutral until user picks */}
                              <div className="grid grid-cols-1 gap-2">
                                {(["A", "B", "C", "D"] as const).map((letra) => {
                                  const isPick = reviewPick === letra;
                                  const isCorrect = letra === p.correta;
                                  let style = "bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-violet-50 cursor-pointer";
                                  let badgeStyle = "bg-slate-100 text-slate-500";
                                  if (revealed) {
                                    if (isCorrect) {
                                      style = "bg-emerald-50 border-emerald-300 text-emerald-800 cursor-default";
                                      badgeStyle = "bg-emerald-500 text-white";
                                    } else if (isPick && !isCorrect) {
                                      style = "bg-red-50 border-red-200 text-red-700 cursor-default";
                                      badgeStyle = "bg-red-400 text-white";
                                    } else {
                                      style = "bg-white border-slate-100 text-slate-400 cursor-default";
                                      badgeStyle = "bg-slate-100 text-slate-400";
                                    }
                                  }
                                  return (
                                    <button
                                      key={letra}
                                      disabled={revealed}
                                      onClick={() =>
                                        setReviewAnswers((prev) => ({ ...prev, [p.id]: letra }))
                                      }
                                      className={cn(
                                        "w-full flex items-start gap-2.5 p-3 rounded-xl text-sm border-2 text-left transition-all duration-150",
                                        style
                                      )}
                                    >
                                      <span className={cn(
                                        "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 transition-colors",
                                        badgeStyle
                                      )}>
                                        {letra}
                                      </span>
                                      <span className="leading-relaxed break-words min-w-0 flex-1 text-left">
                                        {p.opcoes[letra]}
                                        {revealed && isCorrect && (
                                          <span className="ml-1.5 text-emerald-500 font-black">✓</span>
                                        )}
                                        {revealed && isPick && !isCorrect && (
                                          <span className="ml-1.5 text-red-400 font-black">✗</span>
                                        )}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Prompt before selection */}
                              {!revealed && (
                                <div className="flex items-center justify-center gap-2 py-2 text-xs text-violet-500 font-bold">
                                  <Zap className="w-3.5 h-3.5" />
                                  Selecione uma alternativa para ver o gabarito
                                </div>
                              )}

                              {/* Explanation — shown after pick, simple fade via CSS */}
                              {revealed && (
                                <div className="bg-violet-50 border border-violet-200 rounded-xl p-3.5">
                                  <p className="text-[11px] font-black uppercase tracking-wider text-violet-500 mb-1.5 flex items-center gap-1">
                                    <Star className="w-3 h-3" /> Explicação do Professor
                                  </p>
                                  <p className="text-sm text-slate-700 leading-relaxed">{p.explicacao}</p>
                                  <button
                                    onClick={() =>
                                      setReviewAnswers((prev) => {
                                        const next = { ...prev };
                                        delete next[p.id];
                                        return next;
                                      })
                                    }
                                    className="mt-3 text-xs text-violet-500 hover:text-violet-700 font-bold flex items-center gap-1 transition-colors"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Tentar de novo
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
