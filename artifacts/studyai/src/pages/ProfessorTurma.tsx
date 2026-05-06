import { useState, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import {
  ArrowLeft, Users, BookOpen, BarChart2, Trophy, Plus, Trash2, Copy, Check,
  AlertTriangle, TrendingUp, Zap, Calendar, RefreshCw, Star, Target,
  Search, Filter, ChevronDown, ChevronUp, Download, Bell, Eye, Award,
  CheckCircle2, XCircle, Clock, Flame, Mail, X, MessageCircle,
  Brain, GraduationCap, Mic, Layers, Sparkles, Loader2, BookMarked, Globe, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Student {
  id: string; name: string; email: string | null; phone?: string | null;
  xp: number; simCount: number; avgAccuracy: number;
  activeDays: number; status: "risco" | "iniciante" | "ativo" | "destaque";
  grade: string | null; joinedAt: string;
}
interface Task {
  id: string; type: string; title: string; description: string | null;
  materia: string | null; dueDate: string | null; createdAt: string;
}
interface Turma {
  id: string; name: string; serie: string | null; subject: string | null;
  description: string | null; inviteCode: string; isActive: boolean;
}
interface DashboardData {
  totalStudents: number; avgXp: number; atRisk: number;
  topStudent: string | null; engagementRate: number; simCompleted: number;
}
interface RankEntry { rank: number; id: string; name: string; xp: number; isMe: boolean; }

const STATUS_CFG = {
  risco:     { label: "Em risco",  color: "text-red-500",     bg: "bg-red-50 border-red-200",     dot: "bg-red-500" },
  iniciante: { label: "Iniciante", color: "text-amber-600",   bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  ativo:     { label: "Ativo",     color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  destaque:  { label: "Destaque",  color: "text-indigo-600",  bg: "bg-indigo-50 border-indigo-200", dot: "bg-indigo-500" },
};

const TASK_TYPES = [
  { value: "simulado", label: "Simulado", color: "#ef4444" },
  { value: "flashcard", label: "Flashcards", color: "#3b82f6" },
  { value: "leitura", label: "Leitura", color: "#8b5cf6" },
  { value: "redacao", label: "Redação", color: "#f59e0b" },
  { value: "exercicio", label: "Exercícios", color: "#10b981" },
];

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

function formatRelative(dateStr: string) {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays}d atrás`;
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / 30;
    const t = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(t); }
      else setDisplay(Math.round(start));
    }, 16);
    return () => clearInterval(t);
  }, [value]);
  return <>{display.toLocaleString("pt-BR")}</>;
}

interface StudentDetailProps { student: Student; onClose: () => void; }
function StudentDetail({ student, onClose }: StudentDetailProps) {
  const cfg = STATUS_CFG[student.status];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-2xl font-black text-indigo-600">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">{student.name}</h3>
            {student.email && <p className="text-sm text-slate-400">{student.email}</p>}
            <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border mt-1", cfg.bg, cfg.color)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
              {cfg.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: "XP Total", value: student.xp.toLocaleString("pt-BR"), icon: <Zap className="w-4 h-4 text-amber-500" />, color: "bg-amber-50" },
            { label: "Simulados", value: student.simCount, icon: <Target className="w-4 h-4 text-red-500" />, color: "bg-red-50" },
            { label: "Média Acertos", value: `${student.avgAccuracy}%`, icon: <TrendingUp className="w-4 h-4 text-emerald-500" />, color: "bg-emerald-50" },
            { label: "Dias Ativos", value: `${student.activeDays}/sem`, icon: <Flame className="w-4 h-4 text-orange-500" />, color: "bg-orange-50" },
          ].map(s => (
            <div key={s.label} className={cn("rounded-xl p-3 flex items-center gap-3", s.color)}>
              {s.icon}
              <div>
                <p className="text-lg font-black text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Performance bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Taxa de acertos nos simulados</span>
            <span className="font-bold">{student.avgAccuracy}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full"
              style={{ backgroundColor: student.avgAccuracy >= 80 ? "#10b981" : student.avgAccuracy >= 60 ? "#3b82f6" : student.avgAccuracy >= 40 ? "#f59e0b" : "#ef4444" }}
              initial={{ width: 0 }} animate={{ width: `${student.avgAccuracy}%` }} transition={{ duration: 0.8 }} />
          </div>
          <p className="text-xs text-slate-400">
            Entrou em {new Date(student.joinedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {student.email && (
            <a href={`mailto:${student.email}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-colors">
              <Mail className="w-4 h-4" /> Enviar e-mail
            </a>
          )}
          {student.phone ? (
            <a
              href={`https://wa.me/${student.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${student.name}! Sou seu professor na plataforma StudyAI. Passando para verificar como estão seus estudos. Continue assim! 💪`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="w-4 h-4" /> Enviar WhatsApp
            </a>
          ) : (
            <p className="text-xs text-slate-400 text-center py-1">Aluno não cadastrou telefone/WhatsApp no perfil</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ProfessorTurmaPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const turmaId = params.id;

  const [turma, setTurma] = useState<Turma | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "alunos" | "ia" | "desempenho" | "tarefas" | "ranking" | "cadernos">("dashboard");
  const [insights, setInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [perfData, setPerfData] = useState<any>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [aiAction, setAiAction] = useState<{ type: string; studentId: string; studentName: string } | null>(null);
  const [aiActionResult, setAiActionResult] = useState<string | null>(null);
  const [aiActionLoading, setAiActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ type: "simulado", title: "", description: "", materia: "", dueDate: "" });
  const [savingTask, setSavingTask] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [sortBy, setSortBy] = useState<"name" | "xp" | "accuracy" | "sims">("xp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => { if (turmaId) loadAll(); }, [turmaId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [turmaRes, studentsRes, tasksRes, dashRes, rankRes] = await Promise.all([
        fetch(`/api/teacher/turmas/${turmaId}`, { credentials: "include" }),
        fetch(`/api/teacher/turmas/${turmaId}/students`, { credentials: "include" }),
        fetch(`/api/teacher/turmas/${turmaId}/tasks`, { credentials: "include" }),
        fetch(`/api/teacher/turmas/${turmaId}/dashboard`, { credentials: "include" }),
        fetch(`/api/teacher/turmas/${turmaId}/ranking`, { credentials: "include" }),
      ]);
      const [td, sd, tkd, dd, rd] = await Promise.all([
        turmaRes.json(), studentsRes.json(), tasksRes.json(), dashRes.json(), rankRes.json(),
      ]);
      setTurma(td.turma ?? null);
      setStudents(sd.students ?? []);
      setTasks(tkd.tasks ?? []);
      setDashboard(dd);
      setRanking(rd.ranking ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function saveTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    setSavingTask(true);
    try {
      const res = await fetch(`/api/teacher/turmas/${turmaId}/tasks`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskForm),
      });
      const data = await res.json();
      if (data.task) {
        setTasks(prev => [data.task, ...prev]);
        setShowTaskForm(false);
        setTaskForm({ type: "simulado", title: "", description: "", materia: "", dueDate: "" });
      }
    } finally { setSavingTask(false); }
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/teacher/turmas/${turmaId}/tasks/${taskId}`, { method: "DELETE", credentials: "include" });
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }

  async function kickStudent(studentId: string, name: string) {
    if (!confirm(`Remover ${name} da turma?`)) return;
    await fetch(`/api/teacher/turmas/${turmaId}/students/${studentId}`, { method: "DELETE", credentials: "include" });
    setStudents(prev => prev.filter(s => s.id !== studentId));
  }

  function copyCode() {
    if (turma) { navigator.clipboard.writeText(turma.inviteCode); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }
  }

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  // ── Filtered + sorted students ──────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    let arr = students.filter(s =>
      (filterStatus === "todos" || s.status === filterStatus) &&
      (!searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
    );
    arr = arr.sort((a, b) => {
      let av = sortBy === "name" ? a.name : sortBy === "xp" ? a.xp : sortBy === "accuracy" ? a.avgAccuracy : a.simCount;
      let bv = sortBy === "name" ? b.name : sortBy === "xp" ? b.xp : sortBy === "accuracy" ? b.avgAccuracy : b.simCount;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr;
  }, [students, filterStatus, searchQuery, sortBy, sortDir]);

  // ── Chart data ────────────────────────────────────────────────────────────
  const xpDistribution = useMemo(() => {
    const brackets = [
      { label: "0–99", min: 0, max: 99 }, { label: "100–299", min: 100, max: 299 },
      { label: "300–599", min: 300, max: 599 }, { label: "600–999", min: 600, max: 999 },
      { label: "1000+", min: 1000, max: Infinity },
    ];
    return brackets.map(b => ({
      label: b.label,
      alunos: students.filter(s => s.xp >= b.min && s.xp <= b.max).length,
    }));
  }, [students]);

  const statusDistribution = useMemo(() => {
    const counts = { destaque: 0, ativo: 0, iniciante: 0, risco: 0 };
    students.forEach(s => counts[s.status]++);
    return [
      { name: "Destaque", value: counts.destaque, color: "#6366f1" },
      { name: "Ativo", value: counts.ativo, color: "#10b981" },
      { name: "Iniciante", value: counts.iniciante, color: "#f59e0b" },
      { name: "Em risco", value: counts.risco, color: "#ef4444" },
    ].filter(x => x.value > 0);
  }, [students]);

  const accuracyData = useMemo(() => {
    return [...students]
      .filter(s => s.simCount > 0)
      .sort((a, b) => b.avgAccuracy - a.avgAccuracy)
      .slice(0, 10)
      .map(s => ({ name: s.name.split(" ")[0], accuracy: s.avgAccuracy, xp: s.xp }));
  }, [students]);

  // Lazy-load insights when switching to the AI tab
  // IMPORTANT: keep all hooks ABOVE early returns to avoid React error #310
  useEffect(() => {
    if (activeTab !== "ia" || insights || insightsLoading || !turmaId) return;
    setInsightsLoading(true);
    fetch(`/api/teacher/turmas/${turmaId}/insights`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setInsights(d))
      .catch(() => setInsights({ students: [], summary: { totalStudents: 0 } }))
      .finally(() => setInsightsLoading(false));
  }, [activeTab, insights, insightsLoading, turmaId]);

  // Lazy-load performance when switching to the Desempenho tab
  useEffect(() => {
    if (activeTab !== "desempenho" || perfData || perfLoading || !turmaId) return;
    setPerfLoading(true);
    fetch(`/api/teacher/turmas/${turmaId}/performance`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setPerfData(d))
      .catch(() => setPerfData({ activities: [], distribution: [], studentStats: [] }))
      .finally(() => setPerfLoading(false));
  }, [activeTab, perfData, perfLoading, turmaId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Carregando turma...</p>
        </div>
      </div>
    );
  }

  if (!turma) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Turma não encontrada</p>
          <Button onClick={() => navigate("/professor")} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">Voltar</Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard" as const, label: "Dashboard", icon: BarChart2 },
    { id: "alunos" as const, label: "Alunos", icon: Users, count: students.length },
    { id: "desempenho" as const, label: "Desempenho", icon: TrendingUp },
    { id: "ia" as const, label: "Inteligência IA", icon: Sparkles },
    { id: "tarefas" as const, label: "Tarefas", icon: BookOpen, count: tasks.length },
    { id: "cadernos" as const, label: "Cadernos", icon: BookMarked },
    { id: "ranking" as const, label: "Ranking", icon: Trophy },
  ];

  async function triggerAiAction(type: string, student: { id: string; name: string }) {
    setAiAction({ type, studentId: student.id, studentName: student.name });
    setAiActionResult(null);
    setAiActionLoading(true);
    try {
      const res = await fetch(`/api/teacher/turmas/${turmaId}/risk-action`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, studentId: student.id, studentName: student.name }),
      });
      const data = await res.json();
      setAiActionResult(data.result ?? "Sem resposta da IA.");
    } catch { setAiActionResult("Erro ao gerar ação. Tente novamente."); }
    finally { setAiActionLoading(false); }
  }

  const atRiskStudents = students.filter(s => s.status === "risco");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 pb-24">
      {/* Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-5%] right-[-5%] w-[30%] h-[30%] bg-indigo-200/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-indigo-200/20 rounded-full blur-[80px]" />
      </div>

      {/* Student Detail Modal */}
      <AnimatePresence>
        {selectedStudent && <StudentDetail student={selectedStudent} onClose={() => setSelectedStudent(null)} />}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate("/professor")}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-semibold text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Minhas Turmas
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <h1 className="font-black text-slate-800 text-base truncate">{turma.name}</h1>
            <div className="flex items-center gap-2 ml-auto">
              {turma.serie && <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full">{turma.serie}</span>}
              {turma.subject && <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2.5 py-0.5 rounded-full hidden sm:inline">{turma.subject}</span>}
              {/* Invite code */}
              <button onClick={copyCode}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 transition-colors rounded-xl px-3 py-1.5">
                <span className="text-xs text-slate-500">Código:</span>
                <span className="font-mono font-black text-indigo-700 text-xs tracking-widest">{turma.inviteCode}</span>
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-bold border-b-2 transition-colors",
                  activeTab === tab.id ? "border-indigo-500 text-indigo-700" : "border-transparent text-slate-400 hover:text-slate-700"
                )}>
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {"count" in tab && (tab.count ?? 0) > 0 && (
                  <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-black", activeTab === tab.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500")}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6">
        <AnimatePresence mode="wait">

          {/* ══════════════════════════════════════════
              TAB: DASHBOARD
          ══════════════════════════════════════════ */}
          {activeTab === "dashboard" && dashboard && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

              {/* Alert: At Risk */}
              {atRiskStudents.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-red-800">
                      {atRiskStudents.length} aluno{atRiskStudents.length > 1 ? "s" : ""} em situação de risco
                    </p>
                    <p className="text-sm text-red-600 mt-0.5">
                      {atRiskStudents.slice(0, 3).map(s => s.name.split(" ")[0]).join(", ")}
                      {atRiskStudents.length > 3 ? ` e mais ${atRiskStudents.length - 3}` : ""}
                      {" — "}considere entrar em contato.
                    </p>
                  </div>
                  <button onClick={() => setActiveTab("alunos")}
                    className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1 flex-shrink-0">
                    Ver alunos <ChevronDown className="w-3 h-3" />
                  </button>
                </motion.div>
              )}

              {/* 6 KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "Total de Alunos", value: dashboard.totalStudents, icon: Users, color: "text-indigo-500", bg: "bg-indigo-50 border-indigo-100", sub: "na turma" },
                  { label: "XP Médio", value: dashboard.avgXp, icon: Zap, color: "text-amber-500", bg: "bg-amber-50 border-amber-100", sub: "por aluno" },
                  { label: "Engajamento", value: `${dashboard.engagementRate}%`, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-100", sub: "últimos 7 dias" },
                  { label: "Simulados", value: dashboard.simCompleted, icon: Target, color: "text-red-500", bg: "bg-red-50 border-red-100", sub: "realizados" },
                  { label: "Em Risco", value: dashboard.atRisk, icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-50 border-rose-100", sub: "< 50 XP" },
                  { label: "Destaque", value: dashboard.topStudent ?? "—", icon: Star, color: "text-yellow-500", bg: "bg-yellow-50 border-yellow-100", sub: "maior XP" },
                ].map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className={cn("rounded-2xl p-5 border", s.bg)}>
                    <s.icon className={cn("w-5 h-5 mb-2", s.color)} />
                    <p className="text-2xl font-black text-slate-800 truncate">
                      {typeof s.value === "number" ? <AnimatedNumber value={s.value} /> : s.value}
                    </p>
                    <p className="text-sm font-bold text-slate-500 mt-0.5">{s.label}</p>
                    <p className="text-xs text-slate-400">{s.sub}</p>
                  </motion.div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* XP Distribution */}
                {xpDistribution.some(b => b.alunos > 0) && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-black text-slate-800 mb-1">Distribuição de XP</h3>
                    <p className="text-xs text-slate-400 mb-4">Alunos por faixa de pontos</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={xpDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip
                          content={({ active, payload, label }) => active && payload?.length ? (
                            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow text-xs">
                              <p className="font-bold text-slate-700">{label} XP</p>
                              <p className="text-indigo-600">{payload[0].value} aluno{(payload[0].value as number) !== 1 ? "s" : ""}</p>
                            </div>
                          ) : null} />
                        <Bar dataKey="alunos" radius={[6, 6, 0, 0]} maxBarSize={40}>
                          {xpDistribution.map((_, i) => <Cell key={i} fill={["#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1", "#4f46e5"][i]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Status Pie */}
                {statusDistribution.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-black text-slate-800 mb-1">Status dos Alunos</h3>
                    <p className="text-xs text-slate-400 mb-4">Distribuição por engajamento</p>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={160}>
                        <PieChart>
                          <Pie data={statusDistribution} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3}>
                            {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip content={({ active, payload }) => active && payload?.length ? (
                            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow text-xs">
                              <p className="font-bold" style={{ color: payload[0].payload.color }}>{payload[0].name}</p>
                              <p className="text-slate-700">{payload[0].value} aluno{(payload[0].value as number) !== 1 ? "s" : ""}</p>
                            </div>
                          ) : null} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {statusDistribution.map(s => (
                          <div key={s.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                              <span className="text-slate-600 font-medium">{s.name}</span>
                            </div>
                            <span className="font-black text-slate-800">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Top accuracy chart */}
              {accuracyData.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-black text-slate-800">Top Alunos por Acertos</h3>
                    <button onClick={() => setActiveTab("alunos")} className="text-xs text-indigo-500 font-bold hover:text-indigo-700">Ver todos →</button>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">Média de acertos nos simulados (máximo 10 alunos com simulados)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={accuracyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                        <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow text-xs">
                          <p className="font-bold text-slate-700">{label}</p>
                          <p className="text-emerald-600">{payload[0].value}% acertos</p>
                        </div>
                      ) : null} />
                      <Bar dataKey="accuracy" name="Acertos%" radius={[6, 6, 0, 0]} maxBarSize={36}>
                        {accuracyData.map((d, i) => (
                          <Cell key={i} fill={d.accuracy >= 80 ? "#10b981" : d.accuracy >= 60 ? "#3b82f6" : d.accuracy >= 40 ? "#f59e0b" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════════════════
              TAB: ALUNOS
          ══════════════════════════════════════════ */}
          {activeTab === "alunos" && (
            <motion.div key="alunos" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

              {/* Search + Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Buscar aluno por nome ou e-mail..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
                </div>
                <div className="flex gap-2">
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                    <option value="todos">Todos os status</option>
                    <option value="risco">Em risco</option>
                    <option value="iniciante">Iniciante</option>
                    <option value="ativo">Ativo</option>
                    <option value="destaque">Destaque</option>
                  </select>
                </div>
              </div>

              {/* Student count */}
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{filteredStudents.length} de {students.length} aluno{students.length !== 1 ? "s" : ""}</span>
                {atRiskStudents.length > 0 && (
                  <button onClick={() => setFilterStatus("risco")}
                    className="flex items-center gap-1 text-red-500 font-bold hover:text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {atRiskStudents.length} em risco
                  </button>
                )}
              </div>

              {filteredStudents.length === 0 ? (
                <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  {students.length === 0 ? (
                    <>
                      <p className="font-semibold mb-1">Nenhum aluno ainda</p>
                      <p className="text-sm">Compartilhe o código <span className="text-indigo-600 font-mono font-black">{turma.inviteCode}</span></p>
                    </>
                  ) : (
                    <p>Nenhum aluno encontrado para os filtros selecionados</p>
                  )}
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-xs font-black text-slate-400 uppercase tracking-wider">
                    <div className="col-span-4 flex items-center gap-1 cursor-pointer hover:text-slate-600" onClick={() => toggleSort("name")}>
                      Aluno {sortBy === "name" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                    <div className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-slate-600 justify-center" onClick={() => toggleSort("xp")}>
                      XP {sortBy === "xp" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                    <div className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-slate-600 justify-center" onClick={() => toggleSort("sims")}>
                      Simulados {sortBy === "sims" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                    <div className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-slate-600 justify-center" onClick={() => toggleSort("accuracy")}>
                      Acertos {sortBy === "accuracy" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                    <div className="col-span-2 text-center">Status</div>
                  </div>

                  {/* Student rows */}
                  <div className="space-y-2">
                    {filteredStudents.map((student, i) => {
                      const cfg = STATUS_CFG[student.status];
                      return (
                        <motion.div key={student.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                          className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group">
                          <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            {/* Name + avatar */}
                            <div className="col-span-4 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-600 font-black text-sm flex-shrink-0">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate">{student.name}</p>
                                {student.email && <p className="text-xs text-slate-400 truncate">{student.email}</p>}
                                <p className="text-xs text-slate-300 md:hidden">{formatRelative(student.joinedAt)}</p>
                              </div>
                            </div>

                            {/* XP */}
                            <div className="col-span-2 flex items-center justify-start md:justify-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-400" />
                              <span className="font-black text-slate-800 text-sm">{student.xp.toLocaleString("pt-BR")}</span>
                            </div>

                            {/* Simulados */}
                            <div className="col-span-2 text-center hidden md:flex items-center justify-center gap-1.5">
                              <Target className="w-3.5 h-3.5 text-red-400" />
                              <span className="font-bold text-slate-700 text-sm">{student.simCount}</span>
                            </div>

                            {/* Accuracy */}
                            <div className="col-span-2 hidden md:block">
                              {student.simCount > 0 ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full"
                                      style={{ width: `${student.avgAccuracy}%`, backgroundColor: student.avgAccuracy >= 80 ? "#10b981" : student.avgAccuracy >= 60 ? "#3b82f6" : student.avgAccuracy >= 40 ? "#f59e0b" : "#ef4444" }} />
                                  </div>
                                  <span className="text-xs font-black text-slate-600 w-8 text-right">{student.avgAccuracy}%</span>
                                </div>
                              ) : <span className="text-xs text-slate-300">—</span>}
                            </div>

                            {/* Status + Actions */}
                            <div className="col-span-2 flex items-center justify-between md:justify-end gap-2">
                              <span className={cn("inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border", cfg.bg, cfg.color)}>
                                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
                                {cfg.label}
                              </span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setSelectedStudent(student)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button onClick={() => kickStudent(student.id, student.name)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════════════════
              TAB: INTELIGÊNCIA IA — Trilha + Diagnóstico + AI usage
          ══════════════════════════════════════════ */}
          {activeTab === "ia" && (
            <motion.div key="ia" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {insightsLoading && (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 font-semibold">Analisando dados da turma com IA…</p>
                </div>
              )}

              {!insightsLoading && insights && (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl p-4 shadow-lg">
                      <GraduationCap className="w-5 h-5 opacity-80 mb-1" />
                      <p className="text-2xl font-black">{insights.summary?.diagnosticCompleted ?? 0}<span className="text-sm font-normal opacity-70">/{insights.summary?.totalStudents ?? 0}</span></p>
                      <p className="text-[11px] uppercase tracking-wide opacity-80 font-bold">Diagnóstico inicial</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Trilha • Mat</span>
                        <Brain className="w-4 h-4 text-blue-400" />
                      </div>
                      <p className="text-2xl font-black text-slate-800">Nv. {insights.summary?.avgLevelMat ?? 0}</p>
                      <p className="text-[11px] text-slate-400">média da turma</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">Trilha • PT</span>
                        <BookMarked className="w-4 h-4 text-rose-400" />
                      </div>
                      <p className="text-2xl font-black text-slate-800">Nv. {insights.summary?.avgLevelPort ?? 0}</p>
                      <p className="text-[11px] text-slate-400">média da turma</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Adoção IA</span>
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="space-y-1">
                        {[
                          { l: "Tiagão", v: insights.summary?.aiAdoption?.tiagao ?? 0, i: Mic },
                          { l: "Notebook", v: insights.summary?.aiAdoption?.notebook ?? 0, i: BookOpen },
                          { l: "Mapa Mental", v: insights.summary?.aiAdoption?.mapa ?? 0, i: Brain },
                        ].map(r => (
                          <div key={r.l} className="flex items-center gap-1.5 text-[11px]">
                            <r.i className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-500 flex-1">{r.l}</span>
                            <span className="font-bold text-slate-800">{r.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Weak topics */}
                  {(insights.summary?.weakTopics ?? []).length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <h3 className="font-black text-amber-900 text-sm">Pontos fracos da turma — recomendado revisar</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {insights.summary.weakTopics.map((t: any) => (
                          <div key={t.topic} className="bg-white border border-amber-200 rounded-xl px-3 py-1.5 flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">{t.topic}</span>
                            <span className="text-[11px] font-black text-amber-700">{t.avg_score}%</span>
                            <span className="text-[10px] text-slate-400">({t.attempts} tent.)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Per-student table */}
                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-black text-slate-800 text-sm">Trilha do Mestre por aluno</h3>
                      <span className="text-[11px] text-slate-400">{insights.students?.length ?? 0} alunos</span>
                    </div>
                    {(insights.students ?? []).length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-400">
                        Nenhum aluno fez a Trilha ainda. Quando começarem, os níveis aparecem aqui.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-black">
                            <tr>
                              <th className="text-left px-4 py-2.5">Aluno</th>
                              <th className="text-center px-2 py-2.5">Diagnóstico</th>
                              <th className="text-center px-2 py-2.5">Mat (Nv/Acerto)</th>
                              <th className="text-center px-2 py-2.5">PT (Nv/Acerto)</th>
                              <th className="text-center px-2 py-2.5 hidden md:table-cell">Tiagão</th>
                              <th className="text-center px-2 py-2.5 hidden md:table-cell">Notebook</th>
                              <th className="text-center px-2 py-2.5 hidden md:table-cell">Mapa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {insights.students.map((s: any) => (
                              <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50/40">
                                <td className="px-4 py-2.5">
                                  <div className="font-bold text-slate-800 text-sm">{s.name}</div>
                                  <div className="text-[11px] text-slate-400">{s.xp} XP</div>
                                </td>
                                <td className="text-center px-2 py-2.5">
                                  {s.diagnosticCompleted
                                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                                    : <span className="text-[11px] text-slate-300">—</span>}
                                </td>
                                <td className="text-center px-2 py-2.5">
                                  <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                    <span className="text-xs font-black">{s.trilha.mat.level || "—"}</span>
                                    {s.trilha.mat.sessions > 0 && (
                                      <span className="text-[10px] opacity-70">{s.trilha.mat.accuracy}%</span>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center px-2 py-2.5">
                                  <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">
                                    <span className="text-xs font-black">{s.trilha.port.level || "—"}</span>
                                    {s.trilha.port.sessions > 0 && (
                                      <span className="text-[10px] opacity-70">{s.trilha.port.accuracy}%</span>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center px-2 py-2.5 hidden md:table-cell text-xs text-slate-600">{s.ai.tiagao || "—"}</td>
                                <td className="text-center px-2 py-2.5 hidden md:table-cell text-xs text-slate-600">{s.ai.notebook || "—"}</td>
                                <td className="text-center px-2 py-2.5 hidden md:table-cell text-xs text-slate-600">{s.ai.mapa || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 text-center">
                    💡 Dica: clique na aba <strong>Tarefas</strong> e atribua um simulado focado nos pontos fracos.
                  </p>
                </>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════════════════
              TAB: DESEMPENHO (FASE 3)
          ══════════════════════════════════════════ */}
          {activeTab === "desempenho" && (
            <motion.div key="desempenho" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

              {/* AI Action Modal */}
              <AnimatePresence>
                {aiAction && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => { setAiAction(null); setAiActionResult(null); }}>
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
                      className="bg-white rounded-3xl shadow-2xl p-6 max-w-lg w-full"
                      onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-black text-slate-800">
                            {aiAction.type === "mensagem" && "Mensagem de Incentivo"}
                            {aiAction.type === "reforco" && "Atividade de Reforço"}
                            {aiAction.type === "revisao" && "Aula de Revisão"}
                          </p>
                          <p className="text-xs text-slate-500">para {aiAction.studentName}</p>
                        </div>
                      </div>
                      {aiActionLoading ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-indigo-600">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm font-semibold">Gerando com IA…</span>
                        </div>
                      ) : aiActionResult ? (
                        <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-4">
                          {aiActionResult}
                        </div>
                      ) : null}
                      <div className="flex gap-2 mt-2">
                        {aiActionResult && (
                          <button onClick={() => { navigator.clipboard.writeText(aiActionResult!); }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-bold hover:bg-indigo-100 transition-colors">
                            <Copy className="w-4 h-4" /> Copiar
                          </button>
                        )}
                        <button onClick={() => { setAiAction(null); setAiActionResult(null); }}
                          className="ml-auto px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 transition-colors">
                          Fechar
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {perfLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
              ) : !perfData ? (
                <div className="text-center py-20 text-slate-400 text-sm">Erro ao carregar dados de desempenho</div>
              ) : (
                <>
                  {/* KPI summary */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl p-4 shadow-lg">
                      <Target className="w-5 h-5 opacity-70 mb-1" />
                      <p className="text-2xl font-black">
                        {perfData.avgScoreOverall != null ? `${perfData.avgScoreOverall}%` : "—"}
                      </p>
                      <p className="text-[11px] uppercase tracking-wide opacity-80 font-bold">Média geral turma</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                      <BookOpen className="w-5 h-5 text-indigo-400 mb-1" />
                      <p className="text-2xl font-black text-slate-800">{perfData.totalActivities}</p>
                      <p className="text-[11px] text-slate-400">Atividades criadas</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                      <AlertTriangle className="w-5 h-5 text-red-400 mb-1" />
                      <p className="text-2xl font-black text-slate-800">
                        {(perfData.studentStats ?? []).filter((s: any) => s.riskLevel === "alto" || s.riskLevel === "critico").length}
                      </p>
                      <p className="text-[11px] text-slate-400">Alunos em risco</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1" />
                      <p className="text-2xl font-black text-slate-800">
                        {(perfData.studentStats ?? []).filter((s: any) => s.riskLevel === "ok").length}
                      </p>
                      <p className="text-[11px] text-slate-400">Alunos OK</p>
                    </div>
                  </div>

                  {/* Chart: Activity scores over time */}
                  {(perfData.activities ?? []).length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                      <h3 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                        Média da Turma por Avaliação
                      </h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart
                          data={[...(perfData.activities as any[])].reverse().map((a: any) => ({
                            name: a.title.length > 20 ? a.title.slice(0, 18) + "…" : a.title,
                            media: a.avg_score != null ? Number(a.avg_score) : null,
                            entregas: a.submission_count,
                          }))}
                          margin={{ top: 5, right: 10, left: -20, bottom: 40 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                          <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }}
                            angle={-30} textAnchor="end" interval={0} />
                          <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                            formatter={(v: any, n: string) => [n === "media" ? `${v}%` : v, n === "media" ? "Média" : "Entregas"]}
                          />
                          <Area type="monotone" dataKey="media" stroke="#6366f1" fill="#6366f133" strokeWidth={2} dot={{ r: 4, fill: "#6366f1" }} name="media" connectNulls />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Chart: Grade distribution of most recent activity */}
                  {(perfData.distribution ?? []).length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                      <h3 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-indigo-500" />
                        Distribuição de Notas — Última Avaliação
                      </h3>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={perfData.distribution} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                          <XAxis dataKey="faixa" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                          <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                          <Bar dataKey="count" name="Alunos" radius={[6, 6, 0, 0]}>
                            {(perfData.distribution as any[]).map((d: any, i: number) => (
                              <Cell key={i} fill={
                                d.faixa === "90-100" ? "#10b981" :
                                d.faixa === "70-89" ? "#6366f1" :
                                d.faixa === "50-69" ? "#f59e0b" : "#ef4444"
                              } />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Student risk table */}
                  {(perfData.studentStats ?? []).length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-500" />
                          Indicadores por Aluno
                        </h3>
                        <span className="text-[11px] text-slate-400">{(perfData.studentStats as any[]).length} alunos</span>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {(perfData.studentStats as any[])
                          .sort((a: any, b: any) => {
                            const order = { critico: 0, alto: 1, medio: 2, ok: 3 };
                            return (order[a.riskLevel as keyof typeof order] ?? 4) - (order[b.riskLevel as keyof typeof order] ?? 4);
                          })
                          .map((s: any) => (
                          <div key={s.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs flex-shrink-0">
                              {s.name.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-800 text-sm truncate">{s.name}</p>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                <span className="text-[11px] text-slate-400">
                                  Nota média: <span className="font-bold text-slate-700">
                                    {s.avgScore != null ? `${s.avgScore}%` : "—"}
                                  </span>
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  Entregas: <span className="font-bold text-slate-700">{s.submissions}</span>
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  Uso IA: <span className={cn("font-bold",
                                    s.platformUsage === 0 ? "text-red-500" :
                                    s.platformUsage < 5 ? "text-amber-600" : "text-emerald-600")}>
                                    {s.platformUsage === 0 ? "Baixo" : s.platformUsage < 5 ? "Médio" : "Alto"}
                                  </span>
                                </span>
                              </div>
                            </div>
                            {/* Risk badge */}
                            <div className={cn("px-2.5 py-1 rounded-full text-[11px] font-black flex-shrink-0",
                              s.riskLevel === "ok" ? "bg-emerald-50 text-emerald-700" :
                              s.riskLevel === "medio" ? "bg-amber-50 text-amber-700" :
                              s.riskLevel === "alto" ? "bg-orange-50 text-orange-700" :
                              "bg-red-50 text-red-700")}>
                              {s.riskLevel === "ok" ? "✓ OK" :
                               s.riskLevel === "medio" ? "Atenção" :
                               s.riskLevel === "alto" ? "Em Risco" : "Crítico"}
                            </div>
                            {/* IA Action buttons */}
                            {(s.riskLevel === "alto" || s.riskLevel === "critico") && (
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => triggerAiAction("mensagem", s)}
                                  title="Mensagem de incentivo"
                                  className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => triggerAiAction("reforco", s)}
                                  title="Atividade de reforço"
                                  className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                                  <BookOpen className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => triggerAiAction("revisao", s)}
                                  title="Aula de revisão"
                                  className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
                                  <Calendar className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No activities placeholder */}
                  {(perfData.activities ?? []).length === 0 && (
                    <div className="text-center py-16 text-slate-400">
                      <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-semibold text-sm">Nenhuma atividade aplicada ainda</p>
                      <p className="text-xs mt-1">Crie e aplique atividades para ver o desempenho da turma aqui</p>
                      <button onClick={() => setActiveTab("tarefas")}
                        className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
                        Criar Atividade
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════════════════
              TAB: TAREFAS
          ══════════════════════════════════════════ */}
          {activeTab === "tarefas" && (
            <motion.div key="tarefas" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">{tasks.length} tarefa{tasks.length !== 1 ? "s" : ""} atribuída{tasks.length !== 1 ? "s" : ""}</p>
                <Button onClick={() => setShowTaskForm(v => !v)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Nova tarefa
                </Button>
              </div>

              <AnimatePresence>
                {showTaskForm && (
                  <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -10, height: 0 }}
                    className="bg-white border border-indigo-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5">
                      <h4 className="font-black text-slate-800 mb-4">Nova tarefa para toda a turma</h4>
                      <form onSubmit={saveTask} className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">Tipo *</label>
                          <select value={taskForm.type} onChange={e => setTaskForm(f => ({ ...f, type: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                            {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">Matéria</label>
                          <input value={taskForm.materia} onChange={e => setTaskForm(f => ({ ...f, materia: e.target.value }))}
                            placeholder="Ex: Matemática"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-bold text-slate-500 mb-1 block">Título *</label>
                          <input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="Ex: Simulado de Funções — Cap. 3"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" required />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">Data de entrega</label>
                          <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">Observações</label>
                          <input value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Instruções adicionais"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        </div>
                        <div className="col-span-2 flex gap-2 justify-end">
                          <Button type="button" onClick={() => setShowTaskForm(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm">Cancelar</Button>
                          <Button type="submit" disabled={savingTask} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm">
                            {savingTask ? "Salvando..." : "Atribuir para turma"}
                          </Button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {tasks.length === 0 ? (
                <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma tarefa atribuída ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task, i) => {
                    const taskType = TASK_TYPES.find(t => t.value === task.type);
                    const isPast = task.dueDate && new Date(task.dueDate) < new Date();
                    return (
                      <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 group hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${taskType?.color}20`, color: taskType?.color }}>
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white flex-shrink-0"
                              style={{ backgroundColor: taskType?.color }}>{taskType?.label ?? task.type}</span>
                            {task.materia && <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full">{task.materia}</span>}
                            {task.dueDate && (
                              <span className={cn("text-xs flex items-center gap-1 font-medium", isPast ? "text-red-500" : "text-slate-400")}>
                                <Calendar className="w-3 h-3" />
                                {new Date(task.dueDate).toLocaleDateString("pt-BR")}
                                {isPast && " (vencida)"}
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-slate-800 text-sm truncate">{task.title}</p>
                          {task.description && <p className="text-xs text-slate-400 mt-0.5">{task.description}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-slate-300 mb-1">{formatRelative(task.createdAt)}</p>
                          <button onClick={() => deleteTask(task.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════════════════
              TAB: RANKING
          ══════════════════════════════════════════ */}
          {activeTab === "ranking" && (
            <motion.div key="ranking" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {ranking.length === 0 ? (
                <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
                  <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum aluno na turma ainda</p>
                </div>
              ) : (
                <>
                  {/* Top 3 Podium */}
                  {ranking.length >= 3 && (
                    <div className="flex items-end justify-center gap-3 py-4">
                      {/* 2nd */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-slate-600 font-black text-lg">
                          {ranking[1]?.name.charAt(0)}
                        </div>
                        <p className="text-xs font-bold text-slate-600 truncate max-w-[80px] text-center">{ranking[1]?.name.split(" ")[0]}</p>
                        <div className="bg-slate-100 rounded-xl px-3 py-2 text-center h-16 flex flex-col justify-end">
                          <p className="text-slate-500 text-lg">🥈</p>
                          <p className="text-xs font-black text-slate-600">{ranking[1]?.xp.toLocaleString()} XP</p>
                        </div>
                      </div>
                      {/* 1st */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-100 to-amber-100 border-2 border-yellow-400 flex items-center justify-center text-yellow-700 font-black text-xl">
                          {ranking[0]?.name.charAt(0)}
                        </div>
                        <p className="text-xs font-black text-slate-700 truncate max-w-[90px] text-center">{ranking[0]?.name.split(" ")[0]}</p>
                        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl px-3 py-2 text-center h-24 flex flex-col justify-end">
                          <p className="text-2xl">👑</p>
                          <p className="text-xs font-black text-amber-700">{ranking[0]?.xp.toLocaleString()} XP</p>
                        </div>
                      </div>
                      {/* 3rd */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-amber-700 font-black text-lg">
                          {ranking[2]?.name.charAt(0)}
                        </div>
                        <p className="text-xs font-bold text-slate-600 truncate max-w-[80px] text-center">{ranking[2]?.name.split(" ")[0]}</p>
                        <div className="bg-amber-50 rounded-xl px-3 py-2 text-center h-12 flex flex-col justify-end">
                          <p className="text-slate-500 text-base">🥉</p>
                          <p className="text-xs font-black text-amber-700">{ranking[2]?.xp.toLocaleString()} XP</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Full list */}
                  <div className="space-y-2">
                    {ranking.map((entry) => (
                      <div key={entry.id}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                          entry.rank <= 3
                            ? "bg-gradient-to-r from-indigo-50 to-white border-indigo-200"
                            : "bg-white border-slate-100"
                        )}>
                        <div className={cn(
                          "w-9 h-9 flex items-center justify-center font-black text-sm rounded-xl flex-shrink-0",
                          entry.rank === 1 ? "bg-yellow-400 text-black" :
                            entry.rank === 2 ? "bg-slate-300 text-black" :
                              entry.rank === 3 ? "bg-amber-600 text-white" :
                                "bg-slate-100 text-slate-500"
                        )}>
                          {entry.rank <= 3 ? ["👑","🥈","🥉"][entry.rank - 1] : `#${entry.rank}`}
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-sm flex-shrink-0">
                          {entry.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 truncate">{entry.name}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-600 font-black">
                          <Zap className="w-4 h-4" />
                          {entry.xp.toLocaleString("pt-BR")} XP
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
          {activeTab === "cadernos" && (
            <motion.div key="cadernos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <CadernosTab turmaId={turmaId!} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Cadernos Tab ─────────────────────────────────────────────────────────────
function CadernosTab({ turmaId }: { turmaId: string }) {
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", color: "#6366f1", emoji: "📚", visibility: "private" });
  const [error, setError] = useState("");

  const COLORS = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#f97316"];
  const EMOJIS = ["📚","📖","🔬","🧪","🌍","📐","📝","💡","🎨","⚡","🌱","🧠"];

  useEffect(() => { loadNotebooks(); }, [turmaId]);

  async function loadNotebooks() {
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/turmas/${turmaId}/notebooks`, { credentials: "include" });
      const data = await res.json();
      setNotebooks(data.notebooks ?? []);
    } finally { setLoading(false); }
  }

  async function createNotebook(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Título é obrigatório"); return; }
    setError("");
    setCreating(true);
    try {
      const res = await fetch(`/api/teacher/turmas/${turmaId}/notebooks`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.notebook) {
        setNotebooks(prev => [data.notebook, ...prev]);
        setShowForm(false);
        setForm({ title: "", color: "#6366f1", emoji: "📚", visibility: "private" });
      }
    } finally { setCreating(false); }
  }

  async function toggleVisibility(nb: any) {
    const newVis = nb.visibility === "public" ? "private" : "public";
    await fetch(`/api/teacher/turmas/${turmaId}/notebooks/${nb.id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: newVis }),
    });
    setNotebooks(prev => prev.map(n => n.id === nb.id ? { ...n, visibility: newVis } : n));
  }

  async function deleteNotebook(id: number) {
    if (!confirm("Excluir este caderno?")) return;
    await fetch(`/api/teacher/turmas/${turmaId}/notebooks/${id}`, { method: "DELETE", credentials: "include" });
    setNotebooks(prev => prev.filter(n => n.id !== id));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-indigo-500" /> Cadernos da Turma
          </h3>
          <p className="text-slate-400 text-sm mt-0.5">Cadernos compartilhados com os alunos desta turma</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors">
          <Plus className="w-4 h-4" /> Novo Caderno
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
          <h4 className="font-bold text-slate-700 text-sm mb-4">Criar Caderno para Turma</h4>
          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
          <form onSubmit={createNotebook} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 text-xs font-semibold block mb-1">Título *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Biologia — Células e Organismos"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-500 outline-none bg-white" />
              </div>
              <div>
                <label className="text-slate-500 text-xs font-semibold block mb-1">Visibilidade</label>
                <select value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-500 outline-none bg-white">
                  <option value="private">🔒 Privado (só você)</option>
                  <option value="public">🌐 Público (alunos podem ver)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-500 text-xs font-semibold block mb-2">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{ background: c }}
                    className={`w-7 h-7 rounded-lg transition-all ${form.color === c ? "ring-2 ring-offset-1 ring-slate-400 scale-110" : ""}`} />
                ))}
              </div>
            </div>

            <div>
              <label className="text-slate-500 text-xs font-semibold block mb-2">Emoji</label>
              <div className="flex gap-1.5 flex-wrap">
                {EMOJIS.map(em => (
                  <button key={em} type="button" onClick={() => setForm(f => ({ ...f, emoji: em }))}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${form.emoji === em ? "bg-indigo-100 ring-2 ring-indigo-400" : "bg-slate-100 hover:bg-indigo-50"}`}>
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={creating}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Criar Caderno
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-500 text-sm font-bold hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-indigo-400 animate-spin" /></div>
      ) : notebooks.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BookMarked className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-sm">Nenhum caderno criado ainda</p>
          <p className="text-xs mt-1">Crie um caderno para compartilhar conteúdo com seus alunos</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notebooks.map(nb => (
            <div key={nb.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
              <div className="h-2" style={{ background: nb.color }} />
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{nb.emoji}</span>
                    <div>
                      <p className="font-bold text-slate-800 text-sm leading-tight">{nb.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {nb.visibility === "public"
                          ? <><Globe className="w-3 h-3 text-indigo-500" /><span className="text-[10px] text-indigo-500 font-semibold">Público</span></>
                          : <><Lock className="w-3 h-3 text-slate-400" /><span className="text-[10px] text-slate-400">Privado</span></>
                        }
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                  <span>{nb.doc_count ?? 0} {nb.doc_count === 1 ? "documento" : "documentos"}</span>
                  <span>•</span>
                  <span>{new Date(nb.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleVisibility(nb)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      nb.visibility === "public"
                        ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                        : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                    }`}>
                    {nb.visibility === "public" ? <><Lock className="w-3 h-3" />Tornar Privado</> : <><Globe className="w-3 h-3" />Publicar</>}
                  </button>
                  <button onClick={() => deleteNotebook(nb.id)}
                    className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
