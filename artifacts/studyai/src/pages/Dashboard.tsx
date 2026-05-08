import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import { Layout } from "@/components/Layout";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend,
} from "recharts";
import {
  ArrowLeft, Target, BookOpen, Zap, BarChart2, Clock, CheckCircle2, XCircle,
  Trophy, Calendar, TrendingUp, Layers, LogIn, Brain, Flame, GraduationCap,
  Flag, Star, ChevronRight, Award, AlertCircle, Search, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SimuladoResult {
  id: string; materia: string; titulo: string | null;
  score: number; total: number; timeTaken: number | null;
  nota: string | null; createdAt: string;
}
interface FlashcardSession {
  id: string; materia: string; diaNumero: number | null;
  totalCards: number; known: number; unknown: number; completedAt: string;
}
interface StudyPlanRecord {
  id: string; materia: string; serie: string | null;
  diasProva: number | null; createdAt: string;
}
interface HistoryData {
  plans: StudyPlanRecord[];
  simulados: SimuladoResult[];
  flashcards: FlashcardSession[];
}

const MATERIA_COLORS: Record<string, string> = {
  "Matemática": "#8b5cf6", "Português": "#3b82f6", "História": "#f59e0b",
  "Geografia": "#10b981", "Química": "#ef4444", "Física": "#06b6d4",
  "Biologia": "#84cc16", "Inglês": "#ec4899", "Filosofia": "#a78bfa",
  "Sociologia": "#fb923c", "ENEM": "#6366f1", "Redação": "#14b8a6",
};

function getMateriaColor(materia: string) {
  return MATERIA_COLORS[materia] || "#6366f1";
}

function formatRelative(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays}d atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem atrás`;
  return `${Math.floor(diffDays / 30)}m atrás`;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m === 0 ? `${s}s` : `${m}m ${s}s`;
}

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.round(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display.toLocaleString("pt-BR")}</>;
}

function RadialProgress({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
    </svg>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}{typeof p.value === "number" && p.name?.includes("%") ? "" : "%"}</span></p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0, totalDays: 0 });
  const [goalName, setGoalName] = useState(() => localStorage.getItem("studyGoalName") || "");
  const [goalDate, setGoalDate] = useState(() => localStorage.getItem("studyGoalDate") || "");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState({ name: "", date: "" });
  const [activeTab, setActiveTab] = useState<"visao" | "materias" | "historico">("visao");
  const [filterMateria, setFilterMateria] = useState("Todas");
  const [searchQuery, setSearchQuery] = useState("");

  const daysToGoal = goalDate
    ? Math.max(0, Math.ceil((new Date(goalDate).getTime() - Date.now()) / 86400000))
    : null;

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    setLoading(true);
    Promise.all([
      fetch("/api/history", { credentials: "include" }).then(r => r.json()).catch(() => ({})),
      fetch("/api/streak", { credentials: "include" }).then(r => r.json()).catch(() => ({})),
    ]).then(([hist, str]) => {
      setData({
        plans: Array.isArray(hist?.plans) ? hist.plans : [],
        simulados: Array.isArray(hist?.simulados) ? hist.simulados : [],
        flashcards: Array.isArray(hist?.flashcards) ? hist.flashcards : [],
      } as HistoryData);
      setStreak({
        currentStreak: Number(str?.currentStreak) || 0,
        longestStreak: Number(str?.longestStreak) || 0,
        totalDays: Number(str?.totalDays) || 0,
      });
      setLoading(false);
    }).catch(() => {
      setData({ plans: [], simulados: [], flashcards: [] } as HistoryData);
      setLoading(false);
    });
    fetch("/api/activity", { method: "POST", credentials: "include" }).catch(() => {});
  }, [isAuthenticated, isLoading]);

  // ── Computed metrics ──────────────────────────────────────────────────────
  const simCount = data?.simulados.length ?? 0;
  const avgAccuracy = simCount > 0
    ? Math.round(data!.simulados.reduce((acc, s) => acc + (s.total > 0 ? s.score / s.total : 0), 0) / simCount * 100) : 0;
  const planCount = data?.plans.length ?? 0;
  const flashCount = data?.flashcards.length ?? 0;
  const totalKnown = data?.flashcards.reduce((acc, f) => acc + f.known, 0) ?? 0;
  const totalCards = data?.flashcards.reduce((acc, f) => acc + f.totalCards, 0) ?? 0;
  const flashAccuracy = totalCards > 0 ? Math.round(totalKnown / totalCards * 100) : 0;
  const xp = Math.round(simCount * 50 + (avgAccuracy / 100) * 150 * simCount + flashCount * 20 + planCount * 25);

  // ── Por matéria ───────────────────────────────────────────────────────────
  const materiaData = useMemo(() => {
    if (!data) return [];
    const map: Record<string, { simulados: number; totalAcc: number; flashcards: number; flashAcc: number }> = {};
    for (const s of data.simulados) {
      if (!map[s.materia]) map[s.materia] = { simulados: 0, totalAcc: 0, flashcards: 0, flashAcc: 0 };
      map[s.materia].simulados++;
      map[s.materia].totalAcc += s.total > 0 ? s.score / s.total : 0;
    }
    for (const f of data.flashcards) {
      if (!map[f.materia]) map[f.materia] = { simulados: 0, totalAcc: 0, flashcards: 0, flashAcc: 0 };
      map[f.materia].flashcards++;
      map[f.materia].flashAcc += f.totalCards > 0 ? f.known / f.totalCards : 0;
    }
    return Object.entries(map).map(([materia, d]) => ({
      materia,
      simulados: d.simulados,
      accuracy: d.simulados > 0 ? Math.round((d.totalAcc / d.simulados) * 100) : 0,
      flashcards: d.flashcards,
      flashAccuracy: d.flashcards > 0 ? Math.round((d.flashAcc / d.flashcards) * 100) : 0,
      color: getMateriaColor(materia),
    })).sort((a, b) => b.accuracy - a.accuracy);
  }, [data]);

  // ── Evolução ao longo do tempo ────────────────────────────────────────────
  const evolutionData = useMemo(() => {
    if (!data?.simulados.length) return [];
    const sorted = [...data.simulados].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let runningSum = 0;
    return sorted.map((s, i) => {
      const pct = s.total > 0 ? Math.round(s.score / s.total * 100) : 0;
      runningSum += pct;
      return {
        name: new Date(s.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        acertos: pct,
        media: Math.round(runningSum / (i + 1)),
        materia: s.materia,
      };
    });
  }, [data]);

  // ── Radar por matéria ─────────────────────────────────────────────────────
  const radarData = useMemo(() => {
    return materiaData.slice(0, 8).map(m => ({
      subject: m.materia.length > 10 ? m.materia.substring(0, 10) + "…" : m.materia,
      fullName: m.materia,
      acertos: m.accuracy,
      flashcards: m.flashAccuracy,
    }));
  }, [materiaData]);

  // ── Unique materias ───────────────────────────────────────────────────────
  const allMaterias = useMemo(() => ["Todas", ...Array.from(new Set(materiaData.map(m => m.materia)))], [materiaData]);

  // ── Filtered simulados ────────────────────────────────────────────────────
  const filteredSimulados = useMemo(() => {
    if (!data) return [];
    return data.simulados
      .filter(s => filterMateria === "Todas" || s.materia === filterMateria)
      .filter(s => !searchQuery || s.materia.toLowerCase().includes(searchQuery.toLowerCase()) || (s.titulo ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data, filterMateria, searchQuery]);

  // ── Heatmap (últimos 12 semanas) ──────────────────────────────────────────
  const heatmapData = useMemo(() => {
    if (!data) return [];
    const dayMap: Record<string, number> = {};
    for (const s of data.simulados) {
      const d = s.createdAt.split("T")[0];
      dayMap[d] = (dayMap[d] || 0) + 1;
    }
    for (const f of data.flashcards) {
      const d = f.completedAt.split("T")[0];
      dayMap[d] = (dayMap[d] || 0) + 1;
    }
    const weeks: { date: string; count: number }[][] = [];
    const today = new Date();
    for (let w = 11; w >= 0; w--) {
      const week: { date: string; count: number }[] = [];
      for (let d = 6; d >= 0; d--) {
        const date = new Date(today);
        date.setDate(today.getDate() - w * 7 - d);
        const key = date.toISOString().split("T")[0];
        week.push({ date: key, count: dayMap[key] || 0 });
      }
      weeks.push(week);
    }
    return weeks;
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-violet-50">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center gap-6 p-8 pt-16">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-200">
            <BarChart2 className="w-10 h-10 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-slate-800 mb-2">Seu Dashboard</h1>
            <p className="text-slate-500">Entre para ver seu desempenho, evolução e histórico completo.</p>
          </div>
          <button onClick={login}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-black shadow-lg hover:opacity-90 active:scale-95 transition-all">
            <LogIn className="w-5 h-5" /> Entrar para ver o Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-5%] right-[-5%] w-[35%] h-[35%] bg-indigo-200/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] bg-indigo-200/20 rounded-full blur-[80px]" />
        <div className="absolute top-[40%] left-[30%] w-[20%] h-[20%] bg-emerald-100/20 rounded-full blur-[60px]" />
      </div>

      {/* ── Sub-header: title + XP + streak ── */}
      <div className="sticky top-[53px] z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
              <BarChart2 className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-sm font-black text-slate-800">Meu Dashboard</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-100">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-sm font-black text-orange-700">{streak.currentStreak}d</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100">
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-sm font-black text-indigo-700">{xp.toLocaleString("pt-BR")} XP</span>
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="max-w-6xl mx-auto px-4 pb-0 flex gap-1">
          {(["visao", "materias", "historico"] as const).map(tab => {
            const labels = { visao: "Visão Geral", materias: "Por Matéria", historico: "Histórico" };
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2.5 text-sm font-bold border-b-2 transition-colors",
                  activeTab === tab
                    ? "border-indigo-500 text-indigo-700"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                )}>
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <AnimatePresence mode="wait">

            {/* ══════════════════════════════════════════
                TAB: VISÃO GERAL
            ══════════════════════════════════════════ */}
            {activeTab === "visao" && (
              <motion.div key="visao" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

                {/* ── Hero: Streak + Objetivo + XP ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Streak */}
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
                        <Flame className="w-4 h-4 text-orange-500" />
                      </div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Sequência</p>
                    </div>
                    <p className="text-5xl font-black text-orange-500 leading-none">
                      <AnimatedNumber value={streak.currentStreak} />
                    </p>
                    <p className="text-xs text-slate-500 mt-1">dias seguidos 🔥</p>
                    <div className="flex gap-4 mt-3 pt-3 border-t border-orange-100">
                      <div><p className="text-xs text-slate-400">Recorde</p><p className="font-black text-slate-700">{streak.longestStreak}d</p></div>
                      <div><p className="text-xs text-slate-400">Total</p><p className="font-black text-slate-700">{streak.totalDays}d</p></div>
                    </div>
                  </div>

                  {/* XP + Level */}
                  <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-indigo-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-indigo-600" />
                      </div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Pontuação XP</p>
                    </div>
                    <p className="text-5xl font-black text-indigo-600 leading-none">
                      <AnimatedNumber value={xp} />
                    </p>
                    <p className="text-xs text-slate-500 mt-1">pontos acumulados</p>
                    <div className="mt-3 pt-3 border-t border-indigo-100">
                      {(() => {
                        const level = xp < 100 ? "Iniciante" : xp < 500 ? "Aprendiz" : xp < 1500 ? "Estudante" : xp < 4000 ? "Avançado" : "Expert";
                        const next = xp < 100 ? 100 : xp < 500 ? 500 : xp < 1500 ? 1500 : xp < 4000 ? 4000 : 10000;
                        const pct = Math.min(100, Math.round((xp / next) * 100));
                        return (
                          <>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="font-bold text-indigo-700">{level}</span>
                              <span className="text-slate-400">{pct}% para próximo nível</span>
                            </div>
                            <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
                              <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-500 rounded-full"
                                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.3 }} />
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Objetivo */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <GraduationCap className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Objetivo</p>
                      </div>
                      {!editingGoal && (
                        <button onClick={() => { setGoalDraft({ name: goalName, date: goalDate }); setEditingGoal(true); }}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-bold">
                          {goalName ? "Editar" : "+ Definir"}
                        </button>
                      )}
                    </div>
                    {editingGoal ? (
                      <div className="space-y-2">
                        <input type="text" placeholder="Ex: ENEM 2025, OAB..." value={goalDraft.name}
                          onChange={e => setGoalDraft(g => ({ ...g, name: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border border-emerald-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
                        <input type="date" value={goalDraft.date}
                          onChange={e => setGoalDraft(g => ({ ...g, date: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border border-emerald-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
                        <div className="flex gap-2">
                          <button onClick={() => {
                            setGoalName(goalDraft.name); setGoalDate(goalDraft.date);
                            localStorage.setItem("studyGoalName", goalDraft.name);
                            localStorage.setItem("studyGoalDate", goalDraft.date);
                            setEditingGoal(false);
                          }} className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500">Salvar</button>
                          <button onClick={() => setEditingGoal(false)}
                            className="px-3 py-2 rounded-xl border border-emerald-200 text-xs text-slate-500 hover:bg-white">Cancelar</button>
                        </div>
                      </div>
                    ) : goalName ? (
                      <>
                        <p className="font-black text-slate-700 text-lg truncate">{goalName}</p>
                        {daysToGoal !== null && (
                          <>
                            <p className="text-4xl font-black text-emerald-600 leading-none mt-1"><AnimatedNumber value={daysToGoal} /></p>
                            <p className="text-xs text-slate-500 mt-1">
                              {daysToGoal === 0 ? "É hoje! 🎉" : daysToGoal === 1 ? "dia restante ⚡" : "dias restantes ⏳"}
                            </p>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-3 text-center">
                        <Flag className="w-7 h-7 text-emerald-300 mb-2" />
                        <p className="text-sm text-slate-400">Defina sua meta e veja a contagem regressiva</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── 4 KPIs ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: <Target className="w-5 h-5 text-red-500" />, label: "Simulados", value: simCount, sub: "realizados", color: "bg-red-50 border-red-100" },
                    { icon: <TrendingUp className="w-5 h-5 text-emerald-500" />, label: "Média Geral", value: `${avgAccuracy}%`, sub: "de acertos", color: "bg-emerald-50 border-emerald-100" },
                    { icon: <Brain className="w-5 h-5 text-blue-500" />, label: "Flashcards", value: flashCount, sub: `${flashAccuracy}% acertos`, color: "bg-blue-50 border-blue-100" },
                    { icon: <Layers className="w-5 h-5 text-indigo-500" />, label: "Planos", value: planCount, sub: "de estudo criados", color: "bg-indigo-50 border-indigo-100" },
                  ].map((kpi, i) => (
                    <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                      className={cn("rounded-2xl p-4 border flex items-center gap-3", kpi.color)}>
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                        {kpi.icon}
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-800">{kpi.value}</p>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{kpi.label}</p>
                        <p className="text-xs text-slate-400">{kpi.sub}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* ── Gráfico: Evolução de Acertos ── */}
                {evolutionData.length > 1 && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-black text-slate-800">Evolução de Acertos</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Acertos por simulado e média acumulada</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-400 inline-block" />Por simulado</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />Média</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={evolutionData}>
                        <defs>
                          <linearGradient id="gAcertos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gMedia" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="acertos" name="Acertos%" stroke="#8b5cf6" fill="url(#gAcertos)" strokeWidth={2} dot={{ fill: "#8b5cf6", r: 3 }} />
                        <Area type="monotone" dataKey="media" name="Média%" stroke="#10b981" fill="url(#gMedia)" strokeWidth={2} strokeDasharray="5 3" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                {/* ── Radar + Melhores/Piores ── */}
                {radarData.length > 2 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <h3 className="font-black text-slate-800 mb-1">Radar de Matérias</h3>
                      <p className="text-xs text-slate-400 mb-4">Desempenho por disciplina</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#64748b" }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                          <Radar name="Simulados %" dataKey="acertos" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
                          <Radar name="Flashcards %" dataKey="flashcards" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 2" />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <h3 className="font-black text-slate-800 mb-1">Ranking de Matérias</h3>
                      <p className="text-xs text-slate-400 mb-4">Por taxa de acertos nos simulados</p>
                      <div className="space-y-3">
                        {materiaData.slice(0, 6).map((m, i) => (
                          <div key={m.materia} className="flex items-center gap-3">
                            <span className="text-xs font-black text-slate-400 w-4 text-center">{i + 1}</span>
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-bold text-slate-700">{m.materia}</span>
                                <span className="font-black" style={{ color: m.color }}>{m.accuracy}%</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div className="h-full rounded-full"
                                  style={{ backgroundColor: m.color }}
                                  initial={{ width: 0 }} animate={{ width: `${m.accuracy}%` }}
                                  transition={{ duration: 0.8, delay: i * 0.1 }} />
                              </div>
                            </div>
                            <span className="text-xs text-slate-400 w-12 text-right">{m.simulados} sim.</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* ── Heatmap de atividade ── */}
                {heatmapData.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-black text-slate-800 mb-1">Mapa de Atividade</h3>
                    <p className="text-xs text-slate-400 mb-4">Últimas 12 semanas</p>
                    <div className="flex gap-1 overflow-x-auto pb-2">
                      {heatmapData.map((week, wi) => (
                        <div key={wi} className="flex flex-col gap-1">
                          {week.map((day, di) => (
                            <div key={di}
                              title={`${day.date}: ${day.count} atividade${day.count !== 1 ? "s" : ""}`}
                              className={cn(
                                "w-4 h-4 rounded-sm transition-colors",
                                day.count === 0 ? "bg-slate-100" :
                                  day.count === 1 ? "bg-indigo-200" :
                                    day.count === 2 ? "bg-indigo-400" :
                                      "bg-indigo-600"
                              )} />
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                      <span>Menos</span>
                      <div className="flex gap-1">
                        {["bg-slate-100", "bg-indigo-200", "bg-indigo-400", "bg-indigo-600"].map(c => (
                          <div key={c} className={cn("w-3 h-3 rounded-sm", c)} />
                        ))}
                      </div>
                      <span>Mais</span>
                    </div>
                  </motion.div>
                )}

                {simCount === 0 && flashCount === 0 && planCount === 0 && (
                  <div className="text-center py-16 text-slate-400">
                    <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">Nenhuma atividade registrada ainda</p>
                    <p className="text-sm mt-1">Faça um simulado ou sessão de flashcard para ver seu desempenho</p>
                    <button onClick={() => navigate("/app")}
                      className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 active:scale-95 transition-all shadow-md hover:shadow-indigo-200">
                      Começar a estudar
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ══════════════════════════════════════════
                TAB: POR MATÉRIA
            ══════════════════════════════════════════ */}
            {activeTab === "materias" && (
              <motion.div key="materias" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

                {/* Bar chart: acertos por matéria */}
                {materiaData.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-black text-slate-800 mb-1">Acertos por Matéria</h3>
                    <p className="text-xs text-slate-400 mb-4">Média de acertos nos simulados</p>
                    <div className="overflow-x-auto">
                    <div style={{ minWidth: Math.max(400, materiaData.length * 55) }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={materiaData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                        <YAxis type="category" dataKey="materia" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={90} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="accuracy" name="Acertos%" radius={[0, 6, 6, 0]} maxBarSize={20}>
                          {materiaData.map(m => <Cell key={m.materia} fill={m.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    </div>
                    </div>
                  </div>
                )}

                {/* Cards por matéria */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {materiaData.map((m, i) => (
                    <motion.div key={m.materia} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-200 transition-all cursor-default">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                          <h4 className="font-black text-slate-800 text-sm">{m.materia}</h4>
                        </div>
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <RadialProgress pct={m.accuracy} color={m.color} size={48} />
                          <p className="absolute inset-0 flex items-center justify-center text-xs font-black" style={{ color: m.color }}>{m.accuracy}%</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-50 rounded-xl p-2.5">
                          <p className="text-slate-400 mb-0.5">Simulados</p>
                          <p className="font-black text-slate-800 text-base">{m.simulados}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2.5">
                          <p className="text-slate-400 mb-0.5">Flashcards</p>
                          <p className="font-black text-slate-800 text-base">{m.flashcards}</p>
                        </div>
                      </div>
                      {m.flashcards > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1 text-slate-500">
                            <span>Flash accuracy</span>
                            <span className="font-bold">{m.flashAccuracy}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${m.flashAccuracy}%`, backgroundColor: m.color }} />
                          </div>
                        </div>
                      )}
                      {/* Performance indicator */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
                        {m.accuracy >= 80 ? (
                          <><Award className="w-3.5 h-3.5 text-emerald-500" /><span className="text-xs text-emerald-600 font-bold">Excelente</span></>
                        ) : m.accuracy >= 60 ? (
                          <><TrendingUp className="w-3.5 h-3.5 text-blue-500" /><span className="text-xs text-blue-600 font-bold">Bom progresso</span></>
                        ) : m.accuracy >= 40 ? (
                          <><AlertCircle className="w-3.5 h-3.5 text-amber-500" /><span className="text-xs text-amber-600 font-bold">Precisa melhorar</span></>
                        ) : (
                          <><XCircle className="w-3.5 h-3.5 text-red-500" /><span className="text-xs text-red-600 font-bold">Foco total aqui!</span></>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {materiaData.length === 0 && (
                  <div className="text-center py-16 text-slate-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Faça simulados e sessões de flashcard para ver seu desempenho por matéria</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ══════════════════════════════════════════
                TAB: HISTÓRICO
            ══════════════════════════════════════════ */}
            {activeTab === "historico" && (
              <motion.div key="historico" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

                {/* Search + Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Buscar por matéria ou título..." value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select value={filterMateria} onChange={e => setFilterMateria(e.target.value)}
                      className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white text-slate-700">
                      {allMaterias.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                {/* Simulados */}
                {filteredSimulados.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-red-400" /> Simulados
                      <span className="ml-auto font-semibold">{filteredSimulados.length}</span>
                    </h3>
                    <div className="space-y-2.5">
                      {filteredSimulados.map((sim, i) => {
                        const pct = sim.total > 0 ? Math.round(sim.score / sim.total * 100) : 0;
                        const color = getMateriaColor(sim.materia);
                        return (
                          <motion.div key={sim.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-200 transition-all cursor-default">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                              style={{ backgroundColor: pct >= 80 ? "#10b981" : pct >= 60 ? "#3b82f6" : pct >= 40 ? "#f59e0b" : "#ef4444" }}>
                              {pct}%
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>{sim.materia}</span>
                                {sim.nota && <span className="text-xs font-black text-slate-500">Nota: {sim.nota}</span>}
                              </div>
                              <p className="text-sm text-slate-500 truncate">{sim.titulo || "Simulado"}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all"
                                    style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? "#10b981" : pct >= 60 ? "#3b82f6" : pct >= 40 ? "#f59e0b" : "#ef4444" }} />
                                </div>
                                <span className="text-xs text-slate-500 flex-shrink-0">{sim.score}/{sim.total}</span>
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              {sim.timeTaken && (
                                <span className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                                  <Clock className="w-3 h-3" />{Math.floor(sim.timeTaken / 60)}min
                                </span>
                              )}
                              <p className="text-xs text-slate-300 mt-1">{formatRelative(sim.createdAt)}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Flashcards */}
                {data?.flashcards && data.flashcards.length > 0 && filterMateria === "Todas" && !searchQuery && (
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-blue-400" /> Sessões de Flashcard
                      <span className="ml-auto font-semibold">{data.flashcards.length}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.flashcards.slice(0, 8).map((f, i) => {
                        const pct = f.totalCards > 0 ? Math.round(f.known / f.totalCards * 100) : 0;
                        return (
                          <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-bold text-slate-700">{f.materia}</span>
                              <span className="text-xs text-slate-400">{formatRelative(f.completedAt)}</span>
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-black text-blue-600">{pct}%</span>
                            </div>
                            <div className="flex gap-4 text-xs text-slate-400">
                              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" />{f.known} sabia</span>
                              <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" />{f.unknown} não sabia</span>
                              <span>{f.totalCards} cards</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Plans */}
                {data?.plans && data.plans.length > 0 && filterMateria === "Todas" && !searchQuery && (
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-400" /> Planos de Estudo
                      <span className="ml-auto font-semibold">{data.plans.length}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.plans.slice(0, 6).map((plan, i) => (
                        <motion.div key={plan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">{plan.materia}</p>
                            {plan.serie && <p className="text-xs text-slate-400">{plan.serie}</p>}
                            {plan.diasProva && <p className="text-xs text-slate-400">{plan.diasProva} dias de plano</p>}
                          </div>
                          <p className="text-xs text-slate-300 flex-shrink-0">{formatRelative(plan.createdAt)}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredSimulados.length === 0 && (searchQuery || filterMateria !== "Todas") && (
                  <div className="text-center py-12 text-slate-400">
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Nenhum resultado para os filtros selecionados</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </Layout>
  );
}
