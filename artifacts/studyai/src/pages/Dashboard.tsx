import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  ArrowLeft,
  Target,
  BookOpen,
  Zap,
  BarChart2,
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  Star,
  Calendar,
  TrendingUp,
  Layers,
  LogIn,
  Brain,
  Flame,
  GraduationCap,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SimuladoResult {
  id: string;
  materia: string;
  titulo: string | null;
  score: number;
  total: number;
  timeTaken: number | null;
  nota: string | null;
  createdAt: string;
}

interface FlashcardSession {
  id: string;
  materia: string;
  diaNumero: number | null;
  totalCards: number;
  known: number;
  unknown: number;
  completedAt: string;
}

interface StudyPlanRecord {
  id: string;
  materia: string;
  serie: string | null;
  diasProva: number | null;
  createdAt: string;
}

interface HistoryData {
  plans: StudyPlanRecord[];
  simulados: SimuladoResult[];
  flashcards: FlashcardSession[];
}

function formatRelative(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
  return `${Math.floor(diffDays / 30)} meses atrás`;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function getGradeColor(nota: string | null) {
  if (!nota) return "text-slate-400";
  const n = nota.toUpperCase();
  if (n === "S" || n.startsWith("A")) return "text-emerald-500";
  if (n.startsWith("B")) return "text-blue-500";
  if (n.startsWith("C")) return "text-yellow-500";
  return "text-red-500";
}

function getAccuracyColor(pct: number) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 60) return "bg-blue-500";
  if (pct >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4"
    >
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Streak state
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0, totalDays: 0 });

  // Goal state (localStorage)
  const [goalName, setGoalName] = useState(() => localStorage.getItem("studyGoalName") || "");
  const [goalDate, setGoalDate] = useState(() => localStorage.getItem("studyGoalDate") || "");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState({ name: "", date: "" });

  const daysToGoal = goalDate
    ? Math.max(0, Math.ceil((new Date(goalDate).getTime() - Date.now()) / 86400000))
    : null;

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    setLoading(true);
    fetch("/api/history", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Não foi possível carregar o histórico.");
        setLoading(false);
      });

    // Record today's activity and fetch streak
    fetch("/api/activity", { method: "POST", credentials: "include" }).catch(() => {});
    fetch("/api/streak", { credentials: "include" })
      .then((r) => r.json())
      .then((s) => setStreak(s))
      .catch(() => {});
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-gradient-to-br from-violet-50 to-indigo-50">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-200">
          <BarChart2 className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-800 mb-2">Seu Dashboard Pessoal</h1>
          <p className="text-slate-500">Entre para ver suas estatísticas, progresso e histórico de estudos.</p>
        </div>
        <button
          onClick={login}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-black shadow-lg shadow-violet-200 hover:opacity-90 transition-opacity"
        >
          <LogIn className="w-5 h-5" />
          Entrar para ver o Dashboard
        </button>
        <button onClick={() => navigate("/app")} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          ← Voltar ao início
        </button>
      </div>
    );
  }

  const simCount = data?.simulados.length ?? 0;
  const avgAccuracy = simCount > 0
    ? Math.round(data!.simulados.reduce((acc, s) => acc + (s.total > 0 ? s.score / s.total : 0), 0) / simCount * 100)
    : 0;
  const planCount = data?.plans.length ?? 0;
  const flashCount = data?.flashcards.length ?? 0;
  const totalKnown = data?.flashcards.reduce((acc, f) => acc + f.known, 0) ?? 0;
  const totalCards = data?.flashcards.reduce((acc, f) => acc + f.totalCards, 0) ?? 0;
  const flashAccuracy = totalCards > 0 ? Math.round(totalKnown / totalCards * 100) : 0;

  const xp = Math.round(
    simCount * 50 + (avgAccuracy / 100) * 150 * simCount +
    (totalCards > 0 ? (totalKnown / totalCards) * 50 * flashCount : 0) +
    planCount * 25
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 pb-20">
      {/* Fixed Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-200/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/30 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/app")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-semibold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Início
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-black text-slate-800">Dashboard</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-100">
              <Zap className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-sm font-black text-violet-700">{xp.toLocaleString("pt-BR")} XP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-8 space-y-8">

        {/* ── STREAK + GOAL ROW ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Streak card */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <h3 className="font-black text-slate-700 text-sm">Sequência de Estudos</h3>
            </div>
            <div className="flex items-end gap-4">
              <div>
                <p className="text-5xl font-black text-orange-500 leading-none">{streak.currentStreak}</p>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  {streak.currentStreak === 1 ? "dia seguido" : "dias seguidos"} 🔥
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-slate-400 text-xs font-semibold">Recorde</p>
                <p className="text-xl font-black text-slate-600">{streak.longestStreak}d</p>
                <p className="text-slate-400 text-xs font-semibold mt-1">Total</p>
                <p className="text-xl font-black text-slate-600">{streak.totalDays}d</p>
              </div>
            </div>
            {streak.currentStreak === 0 && (
              <p className="text-xs text-slate-400 mt-3 italic">Acesse o dashboard hoje para iniciar sua sequência!</p>
            )}
          </div>

          {/* Goal/Countdown card */}
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-violet-600" />
              </div>
              <h3 className="font-black text-slate-700 text-sm">Meu Objetivo</h3>
              {!editingGoal && (
                <button
                  onClick={() => { setGoalDraft({ name: goalName, date: goalDate }); setEditingGoal(true); }}
                  className="ml-auto text-xs text-violet-500 hover:text-violet-700 font-bold"
                >
                  {goalName ? "Editar" : "+ Definir"}
                </button>
              )}
            </div>

            {editingGoal ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Ex: ENEM 2025, OAB, Vestibular..."
                  value={goalDraft.name}
                  onChange={(e) => setGoalDraft((g) => ({ ...g, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                />
                <input
                  type="date"
                  value={goalDraft.date}
                  onChange={(e) => setGoalDraft((g) => ({ ...g, date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setGoalName(goalDraft.name);
                      setGoalDate(goalDraft.date);
                      localStorage.setItem("studyGoalName", goalDraft.name);
                      localStorage.setItem("studyGoalDate", goalDraft.date);
                      setEditingGoal(false);
                    }}
                    className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-500"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditingGoal(false)}
                    className="px-3 py-2 rounded-xl border border-violet-200 text-xs text-slate-500 hover:bg-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : goalName ? (
              <div>
                <p className="font-black text-slate-700 text-lg truncate">{goalName}</p>
                {daysToGoal !== null && (
                  <>
                    <p className="text-5xl font-black text-violet-600 leading-none mt-1">{daysToGoal}</p>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      {daysToGoal === 0 ? "É hoje! 🎉" : daysToGoal === 1 ? "dia restante ⚡" : "dias restantes ⏳"}
                    </p>
                    {goalDate && (
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(goalDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Flag className="w-8 h-8 text-violet-300 mb-2" />
                <p className="text-sm text-slate-400">Defina sua meta para ver a contagem regressiva</p>
              </div>
            )}
          </div>
        </section>

        {/* Stats Grid */}
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Resumo Geral</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<Target className="w-6 h-6 text-red-500" />}
              label="Simulados"
              value={simCount}
              sub={simCount === 1 ? "simulado feito" : "simulados feitos"}
              color="bg-red-50"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6 text-emerald-500" />}
              label="Média de Acertos"
              value={`${avgAccuracy}%`}
              sub={simCount > 0 ? `em ${simCount} simulado${simCount > 1 ? "s" : ""}` : "nenhum simulado"}
              color="bg-emerald-50"
            />
            <StatCard
              icon={<Brain className="w-6 h-6 text-blue-500" />}
              label="Flashcards"
              value={flashCount}
              sub={`${flashAccuracy}% acertos`}
              color="bg-blue-50"
            />
            <StatCard
              icon={<Layers className="w-6 h-6 text-violet-500" />}
              label="Planos Criados"
              value={planCount}
              sub={planCount === 1 ? "plano de estudo" : "planos de estudo"}
              color="bg-violet-50"
            />
          </div>
        </section>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 font-semibold">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Simulado Results */}
            {data.simulados.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-red-500" />
                  <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Resultados dos Simulados</h2>
                  <span className="ml-auto text-xs text-slate-400">{data.simulados.length} total</span>
                </div>
                <div className="space-y-3">
                  {data.simulados.slice(0, 10).map((sim, i) => {
                    const pct = sim.total > 0 ? Math.round(sim.score / sim.total * 100) : 0;
                    return (
                      <motion.div
                        key={sim.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4"
                      >
                        <div className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0",
                          pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500"
                        )}>
                          {pct}%
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{sim.materia}</p>
                          <p className="text-xs text-slate-400 truncate">{sim.titulo || "Simulado"}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all", getAccuracyColor(pct))}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 flex-shrink-0">{sim.score}/{sim.total}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          {sim.nota && (
                            <span className={cn("text-lg font-black", getGradeColor(sim.nota))}>
                              {sim.nota}
                            </span>
                          )}
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            {sim.timeTaken && (
                              <span className="text-xs text-slate-400 flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {formatTime(sim.timeTaken)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">{formatRelative(sim.createdAt)}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Flashcard Sessions */}
            {data.flashcards.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4 text-blue-500" />
                  <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Sessões de Flashcard</h2>
                  <span className="ml-auto text-xs text-slate-400">{data.flashcards.length} total</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.flashcards.slice(0, 8).map((f, i) => {
                    const pct = f.totalCards > 0 ? Math.round(f.known / f.totalCards * 100) : 0;
                    return (
                      <motion.div
                        key={f.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-bold text-slate-800 text-sm truncate flex-1">{f.materia}</p>
                          <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{formatRelative(f.completedAt)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-600">{pct}%</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            {f.known} sabia
                          </span>
                          <span className="flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-400" />
                            {f.unknown} não sabia
                          </span>
                          <span>{f.totalCards} cards</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Study Plans */}
            {data.plans.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-violet-500" />
                  <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Planos de Estudo</h2>
                  <span className="ml-auto text-xs text-slate-400">{data.plans.length} total</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.plans.slice(0, 8).map((plan, i) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{plan.materia}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {plan.serie && (
                            <span className="text-xs text-slate-400">{plan.serie}</span>
                          )}
                          {plan.diasProva && (
                            <span className="text-xs text-slate-400 flex items-center gap-0.5">
                              <Calendar className="w-3 h-3" />
                              {plan.diasProva} dias
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 flex-shrink-0">{formatRelative(plan.createdAt)}</p>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {simCount === 0 && flashCount === 0 && planCount === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
                  <Star className="w-10 h-10 text-violet-400" />
                </div>
                <h3 className="text-xl font-black text-slate-700 mb-2">Nenhuma atividade ainda</h3>
                <p className="text-slate-400 mb-6">Crie um plano de estudos, faça um simulado ou sessão de flashcards para ver suas estatísticas aqui.</p>
                <button
                  onClick={() => navigate("/app")}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-black shadow-lg shadow-violet-200 hover:opacity-90 transition-opacity"
                >
                  Começar a Estudar
                </button>
              </motion.div>
            )}
          </>
        )}

        {/* XP Progress Bar */}
        {xp > 0 && (
          <section>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h2 className="text-sm font-black text-slate-700">Progresso de XP</h2>
                </div>
                <button
                  onClick={() => navigate("/ranking")}
                  className="text-xs font-bold text-violet-500 hover:text-violet-700 transition-colors"
                >
                  Ver Ranking →
                </button>
              </div>
              {[
                { name: "Bronze",   emoji: "🥉", min: 0,    max: 500,  color: "from-amber-700 to-amber-500" },
                { name: "Prata",    emoji: "🥈", min: 500,  max: 1500, color: "from-slate-400 to-slate-300" },
                { name: "Ouro",     emoji: "🥇", min: 1500, max: 3000, color: "from-amber-500 to-yellow-400" },
                { name: "Platina",  emoji: "🔮", min: 3000, max: 6000, color: "from-violet-600 to-purple-400" },
                { name: "Diamante", emoji: "💎", min: 6000, max: 10000, color: "from-cyan-500 to-sky-400" },
              ].map((tier) => {
                const currentTier = xp >= tier.min && (xp < tier.max || tier.max === 10000);
                const completed = xp >= tier.max;
                const pct = completed ? 100 : currentTier
                  ? Math.min(100, Math.round((xp - tier.min) / (tier.max - tier.min) * 100))
                  : 0;
                return (
                  <div key={tier.name} className={cn("flex items-center gap-3 mb-3", currentTier && "")}>
                    <span className="text-xl w-8 text-center flex-shrink-0">{tier.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-xs font-bold", currentTier ? "text-slate-700" : "text-slate-400")}>
                          {tier.name}
                        </span>
                        {currentTier && (
                          <span className="text-xs text-violet-600 font-black">← Você está aqui!</span>
                        )}
                        {!currentTier && !completed && (
                          <span className="text-xs text-slate-300">{tier.min.toLocaleString("pt-BR")} XP</span>
                        )}
                        {completed && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000", tier.color)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              <p className="text-center text-xs text-slate-400 mt-3">
                {xp.toLocaleString("pt-BR")} XP acumulado no total
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
