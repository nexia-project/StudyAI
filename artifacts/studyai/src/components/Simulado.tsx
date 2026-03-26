import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const pct = score / total;
  if (pct >= 0.9) return { nota: "10", label: "Excelente! 🏆", color: "text-emerald-600", bg: "bg-emerald-50" };
  if (pct >= 0.8) return { nota: "9", label: "Ótimo! 🌟", color: "text-emerald-500", bg: "bg-emerald-50" };
  if (pct >= 0.7) return { nota: "8", label: "Muito Bom! 👏", color: "text-blue-600", bg: "bg-blue-50" };
  if (pct >= 0.6) return { nota: "7", label: "Bom! 👍", color: "text-blue-500", bg: "bg-blue-50" };
  if (pct >= 0.5) return { nota: "6", label: "Passou! 😅", color: "text-yellow-600", bg: "bg-yellow-50" };
  if (pct >= 0.4) return { nota: "5", label: "Quase lá! 💪", color: "text-orange-500", bg: "bg-orange-50" };
  return { nota: "< 5", label: "Precisa estudar mais! 📚", color: "text-red-500", bg: "bg-red-50" };
}

function LoadingSimulado() {
  const [msg, setMsg] = useState(0);
  const msgs = [
    "Analisando o conteúdo estudado...",
    "Criando questões estratégicas...",
    "Calibrando a dificuldade...",
    "Preparando o simulado...",
  ];
  useEffect(() => {
    const id = setInterval(() => setMsg((m) => (m + 1) % msgs.length), 1800);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-black text-foreground">Gerando seu Simulado</h3>
        <motion.p
          key={msg}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-muted-foreground text-sm"
        >
          {msgs[msg]}
        </motion.p>
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
        className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-white bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-90 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
      >
        <Target className="w-5 h-5" />
        Fazer Simulado de Prova
      </button>
      <AnimatePresence>
        {open && <Simulado plan={plan} serie={serie} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

function Simulado({ plan, serie, onClose }: SimuladoProps) {
  const [phase, setPhase] = useState<"loading" | "exam" | "results">("loading");
  const [simulado, setSimulado] = useState<SimuladoData | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [reviewIdx, setReviewIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    generateSimulado();
  }, []);

  useEffect(() => {
    if (phase === "exam" && simulado && !submitted) {
      setTimeLeft(simulado.tempoMinutos * 60);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            handleSubmit();
            return 0;
          }
          return t - 1;
        });
        setTimeTaken((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase, simulado]);

  const generateSimulado = async () => {
    try {
      const diasConteudo = plan.dias
        .map((d) => {
          const topicNames = d.topicos.map((t) =>
            typeof t === "object" ? (t as any).nome : t
          );
          return `Dia ${d.numero} - ${d.titulo}: ${topicNames.join(", ")}`;
        })
        .join("\n");

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
      setSimulado(data.simulado);
      setPhase("exam");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = useCallback(() => {
    clearInterval(timerRef.current);
    setSubmitted(true);
    setPhase("results");
    setReviewIdx(0);
  }, []);

  if (!simulado && error) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="font-black text-lg mb-2">Erro ao gerar simulado</h3>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <button onClick={onClose} className="px-6 py-2 rounded-xl bg-primary text-white font-bold">Fechar</button>
        </div>
      </motion.div>
    );
  }

  const total = simulado?.perguntas.length ?? 0;
  const score = simulado
    ? simulado.perguntas.filter((p) => answers[p.id] === p.correta).length
    : 0;
  const grade = simulado ? getGrade(score, total) : null;
  const timeWarning = timeLeft > 0 && timeLeft <= 120;

  const currentQ = simulado?.perguntas[current];
  const answeredCount = Object.keys(answers).length;
  const progressPct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn(
          "px-6 py-4 flex items-center gap-4 flex-shrink-0",
          phase === "exam" && timeWarning ? "bg-red-600" : "bg-gradient-to-r from-red-500 to-orange-500"
        )}>
          <Target className="w-6 h-6 text-white flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-white text-sm sm:text-base truncate">
              {simulado?.titulo ?? "Simulado de Prova"}
            </h2>
            {phase === "exam" && (
              <p className="text-white/75 text-xs">{plan.aluno} · {serie}</p>
            )}
          </div>
          {phase === "exam" && simulado && (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-sm flex-shrink-0",
              timeWarning ? "bg-white text-red-600 animate-pulse" : "bg-white/20 text-white"
            )}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          )}
          {phase !== "exam" && (
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {phase === "loading" && <LoadingSimulado />}

          {phase === "exam" && simulado && currentQ && (
            <div className="p-6 space-y-6">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-foreground">Questão {current + 1} de {total}</span>
                  <span className="text-muted-foreground">{answeredCount} respondidas</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Question dots */}
              <div className="flex gap-1.5 flex-wrap">
                {simulado.perguntas.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setCurrent(i)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-black transition-all",
                      i === current
                        ? "bg-primary text-white scale-110 shadow-md"
                        : answers[p.id]
                        ? "bg-emerald-500 text-white"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/70"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              {/* Question */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQ.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="bg-secondary/50 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                        {current + 1}
                      </span>
                      <p className="text-base font-medium text-foreground leading-relaxed">{currentQ.enunciado}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(["A", "B", "C", "D"] as const).map((letra) => {
                      const selected = answers[currentQ.id] === letra;
                      return (
                        <button
                          key={letra}
                          onClick={() => setAnswers((prev) => ({ ...prev, [currentQ.id]: letra }))}
                          className={cn(
                            "w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-150 font-medium",
                            selected
                              ? "border-primary bg-primary/5 text-primary shadow-sm"
                              : "border-border bg-white hover:border-primary/40 hover:bg-primary/3 text-foreground"
                          )}
                        >
                          <span className={cn(
                            "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-black flex-shrink-0",
                            selected ? "bg-primary border-primary text-white" : "border-muted-foreground/30 text-muted-foreground"
                          )}>
                            {letra}
                          </span>
                          <span className="pt-0.5 text-sm leading-relaxed">{currentQ.opcoes[letra]}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {phase === "results" && simulado && grade && (
            <div className="p-6 space-y-6">
              {/* Score header */}
              <div className={cn("rounded-3xl p-6 text-center space-y-3", grade.bg)}>
                <div className={cn("text-6xl font-black", grade.color)}>{score}<span className="text-3xl text-muted-foreground">/{total}</span></div>
                <div>
                  <p className={cn("text-2xl font-black", grade.color)}>{grade.label}</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Nota estimada: <strong className={grade.color}>{grade.nota}</strong> · Tempo: {formatTime(timeTaken)}
                  </p>
                </div>

                {/* Score bar */}
                <div className="h-3 bg-white/60 rounded-full overflow-hidden mx-4">
                  <motion.div
                    className={cn("h-full rounded-full", score / total >= 0.6 ? "bg-emerald-500" : "bg-red-400")}
                    initial={{ width: 0 }}
                    animate={{ width: `${(score / total) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </div>

                <div className="flex justify-center gap-6 text-sm font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" /> {score} corretas
                  </span>
                  <span className="flex items-center gap-1.5 text-red-500">
                    <XCircle className="w-4 h-4" /> {total - score} erradas
                  </span>
                </div>
              </div>

              {/* Review questions */}
              <div>
                <h3 className="font-black text-lg mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> Revisão Comentada
                </h3>
                <div className="space-y-4">
                  {simulado.perguntas.map((p, i) => {
                    const userAnswer = answers[p.id];
                    const correct = userAnswer === p.correta;
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "rounded-2xl border-2 overflow-hidden",
                          correct ? "border-emerald-200" : "border-red-200"
                        )}
                      >
                        <button
                          className={cn(
                            "w-full p-4 flex items-start gap-3 text-left",
                            correct ? "bg-emerald-50" : "bg-red-50"
                          )}
                          onClick={() => setReviewIdx(reviewIdx === i ? null : i)}
                        >
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                            correct ? "bg-emerald-500" : "bg-red-500"
                          )}>
                            {correct
                              ? <CheckCircle2 className="w-4 h-4 text-white" />
                              : <XCircle className="w-4 h-4 text-white" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black uppercase tracking-wider mb-1 text-muted-foreground">Questão {i + 1}</p>
                            <p className="text-sm font-semibold text-foreground line-clamp-2">{p.enunciado}</p>
                            {!correct && userAnswer && (
                              <p className="text-xs text-red-600 mt-1">Sua resposta: <strong>{userAnswer}</strong> · Correta: <strong>{p.correta}</strong></p>
                            )}
                          </div>
                        </button>

                        <AnimatePresence>
                          {reviewIdx === i && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-border overflow-hidden"
                            >
                              <div className="p-4 space-y-3 bg-white">
                                {/* Options with correct highlighted */}
                                <div className="grid grid-cols-1 gap-2">
                                  {(["A", "B", "C", "D"] as const).map((letra) => (
                                    <div
                                      key={letra}
                                      className={cn(
                                        "flex items-start gap-2 p-2.5 rounded-xl text-sm",
                                        letra === p.correta
                                          ? "bg-emerald-50 border border-emerald-300"
                                          : letra === userAnswer && !correct
                                          ? "bg-red-50 border border-red-200"
                                          : "text-muted-foreground"
                                      )}
                                    >
                                      <span className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0",
                                        letra === p.correta
                                          ? "bg-emerald-500 text-white"
                                          : letra === userAnswer && !correct
                                          ? "bg-red-400 text-white"
                                          : "bg-secondary text-muted-foreground"
                                      )}>
                                        {letra}
                                      </span>
                                      <span className={letra === p.correta ? "font-semibold text-emerald-800" : ""}>{p.opcoes[letra]}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Explanation */}
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                  <p className="text-xs font-black uppercase text-blue-600 mb-1">Explicação do Professor</p>
                                  <p className="text-sm text-blue-900 leading-relaxed">{p.explicacao}</p>
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex-shrink-0 flex items-center justify-between gap-3">
          {phase === "exam" && simulado && (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                  disabled={current === 0}
                  className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/70 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
                  disabled={current === total - 1}
                  className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/70 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={handleSubmit}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-white transition-all",
                  answeredCount === total
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 shadow-lg"
                    : "bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-90"
                )}
              >
                {answeredCount === total ? (
                  <><Trophy className="w-4 h-4" /> Finalizar e Ver Nota</>
                ) : (
                  <><Zap className="w-4 h-4" /> Entregar ({answeredCount}/{total})</>
                )}
              </button>
            </>
          )}

          {phase === "results" && (
            <>
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold border-2 border-border hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" /> Fechar
              </button>
              <button
                onClick={() => {
                  setAnswers({});
                  setCurrent(0);
                  setSubmitted(false);
                  setTimeTaken(0);
                  setPhase("loading");
                  generateSimulado();
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-white bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="w-4 h-4" /> Novo Simulado
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
