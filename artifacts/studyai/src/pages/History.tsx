import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import {
  History, BookOpen, Trophy, Brain, ArrowLeft,
  Clock, CheckCircle2, XCircle, Loader2, AlertCircle,
  GraduationCap, LogIn, PlayCircle, ChevronRight, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppNav } from "@/components/AppNav";

interface HistoryData {
  plans: Array<{
    id: string;
    materia: string;
    serie: string | null;
    diasProva: number | null;
    createdAt: string;
    plan: any;
  }>;
  simulados: Array<{
    id: string;
    materia: string;
    titulo: string | null;
    score: number;
    total: number;
    nota: string | null;
    timeTaken: number | null;
    createdAt: string;
  }>;
  flashcards: Array<{
    id: string;
    materia: string;
    diaNumero: number | null;
    totalCards: number;
    known: number;
    unknown: number;
    completedAt: string;
  }>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}min ${s}s` : `${s}s`;
}

function getGradeColor(nota: string | null) {
  if (!nota) return "text-muted-foreground";
  const n = parseFloat(nota);
  if (n >= 9) return "text-emerald-600";
  if (n >= 7) return "text-violet-600";
  if (n >= 5) return "text-yellow-600";
  return "text-red-600";
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className={cn("rounded-2xl p-5 flex items-center gap-4", color)}>
      <div className="w-12 h-12 rounded-xl bg-white/70 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black">{value}</p>
        <p className="text-sm font-semibold opacity-80">{label}</p>
      </div>
    </div>
  );
}

function buildConteudoTexto(plan: any): string {
  const parts: string[] = [];
  if (plan?.resumoDoConteudo) parts.push(plan.resumoDoConteudo);
  if (Array.isArray(plan?.dias)) {
    for (const dia of plan.dias) {
      let s = `=== ${dia.titulo || `Dia ${dia.numero}`} ===`;
      if (dia.missao) s += `\n${dia.missao}`;
      if (Array.isArray(dia.topicos)) {
        for (const t of dia.topicos) {
          if (t?.nome) s += `\n- ${t.nome}`;
          if (t?.explicacao) s += `\n  ${t.explicacao}`;
          if (t?.gatilho) s += `\n  Memorização: ${t.gatilho}`;
          if (t?.exercicio?.pergunta) s += `\n  Q: ${t.exercicio.pergunta}`;
          if (t?.exercicio?.resposta) s += `\n  R: ${t.exercicio.resposta}`;
        }
      }
      if (Array.isArray(dia.exerciciosDoDia)) {
        for (const ex of dia.exerciciosDoDia) {
          s += `\n  Exercício: ${ex.pergunta}\n  Gabarito: ${ex.gabarito}`;
        }
      }
      parts.push(s);
    }
  }
  if (Array.isArray(plan?.dicasGerais)) {
    parts.push(`Dicas: ${plan.dicasGerais.join(" | ")}`);
  }
  return parts.join("\n\n").slice(0, 8000);
}

export default function HistoryPage() {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [, navigate] = useLocation();
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"plans" | "simulados" | "flashcards">("plans");

  useEffect(() => {
    if (!isAuthenticated && !authLoading) return;
    if (!isAuthenticated) return;
    setLoading(true);
    fetch("/api/history", { credentials: "include" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          setError(d?.erro || d?.error || "Não foi possível carregar seu histórico.");
          setData({ plans: [], simulados: [], flashcards: [] });
        } else {
          setData({
            plans: Array.isArray(d?.plans) ? d.plans : [],
            simulados: Array.isArray(d?.simulados) ? d.simulados : [],
            flashcards: Array.isArray(d?.flashcards) ? d.flashcards : [],
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Erro ao carregar histórico.");
        setData({ plans: [], simulados: [], flashcards: [] });
        setLoading(false);
      });
  }, [isAuthenticated, authLoading]);

  const handleUsePlan = (plan: any) => {
    const conteudoTexto = buildConteudoTexto(plan);
    localStorage.setItem("studyai_restore_plan", JSON.stringify({ plano: plan, conteudoTexto }));
    navigate("/app");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen md:pl-64 pt-14 md:pt-0">
        <AppNav />
        <div className="flex flex-col items-center justify-center gap-6 px-4 pt-8 md:pt-16">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
              <History className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-black text-foreground">Meu Histórico</h1>
            <p className="text-muted-foreground max-w-sm">
              Entre na sua conta para ver seu histórico de estudos, resultados de simulados e sessões de flashcards.
            </p>
          </div>
          <button
            onClick={login}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
          >
            <LogIn className="w-5 h-5" />
            Entrar para ver histórico
          </button>
        </div>
      </div>
    );
  }

  const avgScore =
    data && data.simulados.length > 0
      ? Math.round(
          (data.simulados.reduce((s, r) => s + r.score / r.total, 0) /
            data.simulados.length) *
            100
        )
      : 0;

  const totalFlashcardsReviewed = data
    ? data.flashcards.reduce((s, f) => s + f.totalCards, 0)
    : 0;

  return (
    <div className="min-h-screen pb-20 md:pl-64 pt-14 md:pt-0">
      <AppNav />
      <div className="pt-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            Meu Histórico de Estudos
          </h1>
          <p className="text-sm text-muted-foreground">Retome qualquer plano e continue estudando</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-semibold">{error}</p>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              icon={<BookOpen className="w-6 h-6 text-violet-600" />}
              label="Planos criados"
              value={data?.plans.length ?? 0}
              color="bg-violet-50 text-gray-700"
            />
            <StatCard
              icon={<Trophy className="w-6 h-6 text-amber-600" />}
              label="Nota média nos simulados"
              value={data?.simulados.length ? `${avgScore}%` : "—"}
              color="bg-amber-50 text-amber-700"
            />
            <StatCard
              icon={<Brain className="w-6 h-6 text-emerald-600" />}
              label="Flashcards revisados"
              value={totalFlashcardsReviewed}
              color="bg-emerald-50 text-emerald-700"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-secondary/60 p-1.5 rounded-2xl w-full sm:w-auto sm:inline-flex">
            {(
              [
                { key: "plans", label: "Planos de Estudo", icon: BookOpen },
                { key: "simulados", label: "Simulados", icon: Trophy },
                { key: "flashcards", label: "Flashcards", icon: Brain },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex-1 sm:flex-none flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all",
                  tab === key
                    ? "bg-white shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          {/* Plans Tab */}
          {tab === "plans" && (
            <div className="space-y-4">
              {!data?.plans.length ? (
                <EmptyState icon={<BookOpen className="w-8 h-8 text-muted-foreground" />} text="Nenhum plano de estudo salvo ainda." />
              ) : (
                data.plans.map((p, i) => {
                  const plan = p.plan;
                  const emoji = plan?.emoji || "📚";
                  const cor = plan?.cor || "#8B5CF6";
                  const dias = Array.isArray(plan?.dias) ? plan.dias.length : p.diasProva;
                  const mensagem = plan?.mensagemMotivacional;

                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Color bar */}
                      <div className="h-1.5 w-full" style={{ background: cor }} />

                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Emoji badge */}
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                            style={{ background: `${cor}20` }}
                          >
                            {emoji}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-lg text-foreground truncate">{p.materia}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                              {p.serie && (
                                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                  <GraduationCap className="w-3 h-3" />
                                  {p.serie}
                                </span>
                              )}
                              {dias && (
                                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {dias} dia{dias !== 1 ? "s" : ""} de estudo
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(p.createdAt)}
                              </span>
                            </div>

                            {mensagem && (
                              <p className="mt-2 text-xs text-muted-foreground italic line-clamp-2">
                                "{mensagem}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action button */}
                        <button
                          onClick={() => handleUsePlan(plan)}
                          className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98]"
                          style={{ background: cor }}
                        >
                          <PlayCircle className="w-4 h-4" />
                          Continuar Estudando
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {/* Simulados Tab */}
          {tab === "simulados" && (
            <div className="space-y-3">
              {!data?.simulados.length ? (
                <EmptyState icon={<Trophy className="w-8 h-8 text-muted-foreground" />} text="Nenhum simulado realizado ainda." />
              ) : (
                data.simulados.map((s, i) => {
                  const pct = Math.round((s.score / s.total) * 100);
                  const passed = pct >= 60;
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4"
                    >
                      <div
                        className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
                          passed ? "bg-emerald-50" : "bg-red-50"
                        )}
                      >
                        {passed ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-foreground truncate">{s.materia}</p>
                        {s.titulo && (
                          <p className="text-xs text-muted-foreground truncate">{s.titulo}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span
                            className={cn(
                              "text-sm font-black",
                              passed ? "text-emerald-600" : "text-red-500"
                            )}
                          >
                            {s.score}/{s.total} ({pct}%)
                          </span>
                          {s.nota && (
                            <span className={cn("text-xs font-bold", getGradeColor(s.nota))}>
                              Nota: {s.nota}
                            </span>
                          )}
                          {s.timeTaken && (
                            <span className="text-xs text-muted-foreground">
                              <Clock className="w-3 h-3 inline mr-0.5" />
                              {formatTime(s.timeTaken)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground font-semibold whitespace-nowrap">
                        {formatDate(s.createdAt)}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {/* Flashcards Tab */}
          {tab === "flashcards" && (
            <div className="space-y-3">
              {!data?.flashcards.length ? (
                <EmptyState icon={<Brain className="w-8 h-8 text-muted-foreground" />} text="Nenhuma sessão de flashcards ainda." />
              ) : (
                data.flashcards.map((f, i) => {
                  const pct = Math.round((f.known / f.totalCards) * 100);
                  return (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                        <Brain className="w-6 h-6 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-foreground truncate">{f.materia}</p>
                        {f.diaNumero && (
                          <p className="text-xs text-muted-foreground">Dia {f.diaNumero}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm font-bold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5 inline mr-0.5" />
                            {f.known} sabia
                          </span>
                          <span className="text-sm font-bold text-red-500">
                            <XCircle className="w-3.5 h-3.5 inline mr-0.5" />
                            {f.unknown} não sabia
                          </span>
                          <span className="text-xs font-bold text-violet-600">{pct}% aproveitamento</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground font-semibold whitespace-nowrap">
                        {formatDate(f.completedAt)}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center">
        {icon}
      </div>
      <p className="text-muted-foreground font-semibold">{text}</p>
    </div>
  );
}
