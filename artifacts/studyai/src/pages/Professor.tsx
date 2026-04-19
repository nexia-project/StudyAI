import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, UserCircle, BookOpen, FileQuestion, Brain,
  BarChart3, Settings, Bell, Search, Plus, Copy, Check, Trash2,
  ChevronRight, GraduationCap, RefreshCw, AlertTriangle, TrendingUp,
  TrendingDown, Sparkles, Send, Loader2, FileText, Download, Upload,
  Activity, Zap, Eye, Menu, X, Star, ArrowLeft, Shield, MessageSquare,
  ClipboardList, CheckCircle2, Clock, Target,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = "dashboard" | "turmas" | "alunos" | "provas" | "assistente" | "relatorios";

interface DashData {
  totalStudents: number;
  totalTurmas: number;
  avgPerformance: number;
  engagementRate: number;
  weeklyChart: { week: string; acertos: number; erros: number; participacao: number }[];
  heatMap: { materia: string; score: number }[];
  alerts: { type: string; text: string; severity: string }[];
  students: { id: string; name: string; turma: string; performance: number; engagement: string; lastAccess: string }[];
  turmas: { id: string; name: string; serie: string | null; subject: string | null; studentCount: number }[];
}

interface Turma {
  id: string; name: string; serie: string | null; subject: string | null;
  description: string | null; inviteCode: string; isActive: boolean; studentCount: number; createdAt: string;
}

interface ExamQuestion {
  number: number; text: string; context?: string;
  alternatives: string[]; correct: number; explanation: string; imageDescription: string;
}

interface ChatMessage { role: "user" | "assistant"; content: string; }

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard" as Section, label: "Dashboard", icon: LayoutDashboard },
  { id: "turmas" as Section, label: "Minhas Turmas", icon: Users },
  { id: "alunos" as Section, label: "Alunos", icon: UserCircle },
  { id: "provas" as Section, label: "Gerador de Provas", icon: FileQuestion },
  { id: "assistente" as Section, label: "Assistente IA", icon: Brain },
  { id: "relatorios" as Section, label: "Relatórios", icon: BarChart3 },
];

const SCORE_COLOR = (s: number) =>
  s >= 70 ? "bg-emerald-500/80" : s >= 50 ? "bg-amber-500/80" : s >= 30 ? "bg-orange-500/80" : "bg-red-500/80";

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProfessorPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [section, setSection] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- Auth fetch helper
  async function apiFetch(url: string, opts: RequestInit = {}) {
    return fetch(url, { ...opts, credentials: "include" });
  }

  // --- Access guard
  const [authChecked, setAuthChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  useEffect(() => {
    apiFetch("/api/teacher/turmas").then(r => {
      setHasAccess(r.ok);
      setAuthChecked(true);
      if (!r.ok) navigate("/professor/login");
    }).catch(() => { setAuthChecked(true); navigate("/professor/login"); });
  }, []);

  if (!authChecked) return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
    </div>
  );
  if (!hasAccess) return null;

  return (
    <div className="min-h-screen bg-[#0a0a12] flex">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full z-30 flex flex-col bg-[#0f0f1a] border-r border-white/[0.07] transition-all duration-300
        ${sidebarOpen ? "w-64" : "w-16 lg:w-64"}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.07]">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className={`font-black text-white text-sm transition-opacity duration-200 ${sidebarOpen ? "opacity-100" : "opacity-0 lg:opacity-100"}`}>
            StudyAI
            <span className="ml-1.5 text-xs bg-indigo-600/30 text-indigo-300 px-1.5 py-0.5 rounded-full font-semibold">Professor</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV.map(item => (
            <button key={item.id} onClick={() => { setSection(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all
                ${section === item.id ? "bg-indigo-600/20 text-indigo-300 border-r-2 border-indigo-500" : "text-white/50 hover:text-white hover:bg-white/5"}`}>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className={`text-sm font-semibold transition-opacity duration-200 ${sidebarOpen ? "opacity-100" : "opacity-0 lg:opacity-100"}`}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/[0.07] p-4">
          <button onClick={() => navigate("/app")}
            className="w-full flex items-center gap-3 text-white/40 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            <span className={`transition-opacity duration-200 ${sidebarOpen ? "opacity-100" : "opacity-0 lg:opacity-100"}`}>Voltar ao App</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-16 lg:ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-10 bg-[#0a0a12]/90 backdrop-blur border-b border-white/[0.07] px-6 py-4 flex items-center gap-4">
          <button className="lg:hidden text-white/50 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 hidden sm:block">
            <h1 className="text-white font-bold text-lg">{NAV.find(n => n.id === section)?.label}</h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center">
              <span className="text-indigo-300 text-xs font-bold">
                {(user as any)?.firstName?.[0] ?? "P"}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6">
          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              {section === "dashboard" && <DashboardSection apiFetch={apiFetch} onNavigate={setSection} />}
              {section === "turmas" && <TurmasSection apiFetch={apiFetch} onNavigate={id => navigate(`/professor/turma/${id}`)} />}
              {section === "alunos" && <AlunosSection apiFetch={apiFetch} />}
              {section === "provas" && <GerarProvaSection apiFetch={apiFetch} />}
              {section === "assistente" && <AssistenteSection apiFetch={apiFetch} />}
              {section === "relatorios" && <RelatoriosSection apiFetch={apiFetch} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardSection({ apiFetch, onNavigate }: { apiFetch: (u: string, o?: RequestInit) => Promise<Response>; onNavigate: (s: Section) => void }) {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/teacher/dashboard")
      .then(r => r.json()).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>;
  if (!data) return <div className="text-white/40 text-center py-20">Erro ao carregar dados.</div>;

  const kpis = [
    { label: "Alunos Ativos", value: data.totalStudents, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", trend: null },
    { label: "Turmas", value: data.totalTurmas, icon: BookOpen, color: "text-violet-400", bg: "bg-violet-500/10", trend: null },
    { label: "Média de Desempenho", value: `${data.avgPerformance}%`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", trend: data.avgPerformance >= 60 ? "up" : "down" },
    { label: "Engajamento", value: `${data.engagementRate}%`, icon: Activity, color: "text-amber-400", bg: "bg-amber-500/10", trend: data.engagementRate >= 60 ? "up" : "down" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className={`rounded-2xl border border-white/[0.07] ${k.bg} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <k.icon className={`w-5 h-5 ${k.color}`} />
              {k.trend === "up" && <TrendingUp className="w-4 h-4 text-emerald-400" />}
              {k.trend === "down" && <TrendingDown className="w-4 h-4 text-red-400" />}
            </div>
            <p className="text-2xl font-black text-white">{k.value}</p>
            <p className="text-white/50 text-xs mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Chart + Insights */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.07] bg-[#0f0f1a] p-5">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" /> Evolução do Desempenho (Semanal)
          </h3>
          {data.weeklyChart.every(w => w.acertos === 0) ? (
            <div className="flex items-center justify-center h-40 text-white/30 text-sm">Sem dados suficientes ainda.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.weeklyChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white" }} />
                <Legend wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }} />
                <Line type="monotone" dataKey="acertos" stroke="#34d399" strokeWidth={2} dot={false} name="Acertos %" />
                <Line type="monotone" dataKey="participacao" stroke="#818cf8" strokeWidth={2} dot={false} name="Participação" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* AI Insights + Alerts */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.07] bg-[#0f0f1a] p-5">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-400" /> Insights da IA
            </h3>
            <div className="space-y-2">
              {data.alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs ${a.severity === "warning" ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-300"}`}>
                  {a.severity === "warning" ? <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                  <span>{a.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0f0f1a] p-5">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Ações Rápidas
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Gerar prova", icon: FileQuestion, section: "provas" as Section },
                { label: "Assistente IA", icon: Brain, section: "assistente" as Section },
                { label: "Ver alunos", icon: UserCircle, section: "alunos" as Section },
                { label: "Relatórios", icon: BarChart3, section: "relatorios" as Section },
              ].map(a => (
                <button key={a.label} onClick={() => onNavigate(a.section)}
                  className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white/70 hover:text-white transition-all">
                  <a.icon className="w-3.5 h-3.5 text-indigo-400" /> {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Turmas grid */}
      {data.turmas.length > 0 && (
        <div>
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" /> Turmas
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {data.turmas.map(t => (
              <div key={t.id} className="rounded-2xl border border-white/[0.07] bg-[#0f0f1a] p-4">
                <p className="font-bold text-white text-sm truncate">{t.name}</p>
                {t.serie && <p className="text-white/40 text-xs mt-0.5">{t.serie}</p>}
                <p className="text-indigo-300 text-xl font-black mt-2">{t.studentCount}</p>
                <p className="text-white/30 text-xs">alunos</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Heat map */}
      {data.heatMap.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0f0f1a] p-5">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-rose-400" /> Mapa de Desempenho por Matéria
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.heatMap.map(h => (
              <div key={h.materia} className={`rounded-xl px-4 py-2 text-center ${SCORE_COLOR(h.score)}`}>
                <p className="text-white text-xs font-semibold truncate max-w-[100px]">{h.materia}</p>
                <p className="text-white font-black text-lg">{h.score}%</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-white/40">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/80" /> &lt;30% Crítico</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/80" /> 30–50% Atenção</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/80" /> &gt;70% Bom</span>
          </div>
        </div>
      )}

      {/* Students table */}
      {data.students.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0f0f1a] p-5 overflow-x-auto">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <UserCircle className="w-4 h-4 text-blue-400" /> Lista de Alunos
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/30 text-xs border-b border-white/[0.07]">
                <th className="text-left pb-2 font-semibold">Nome</th>
                <th className="text-left pb-2 font-semibold">Turma</th>
                <th className="text-center pb-2 font-semibold">Desempenho</th>
                <th className="text-center pb-2 font-semibold">Engajamento</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s, i) => (
                <tr key={s.id} className={`border-b border-white/[0.04] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <td className="py-2 font-semibold text-white">{s.name}</td>
                  <td className="py-2 text-white/50 text-xs">{s.turma}</td>
                  <td className="py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.performance >= 70 ? "bg-emerald-500/20 text-emerald-300" : s.performance >= 40 ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300"}`}>
                      {s.performance}%
                    </span>
                  </td>
                  <td className="py-2 text-center">
                    <span className={`text-xs font-semibold ${s.engagement === "Alto" ? "text-emerald-400" : s.engagement === "Médio" ? "text-amber-400" : "text-red-400"}`}>
                      {s.engagement}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Turmas ───────────────────────────────────────────────────────────────────
function TurmasSection({ apiFetch, onNavigate }: { apiFetch: (u: string, o?: RequestInit) => Promise<Response>; onNavigate: (id: string) => void }) {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", serie: "", subject: "", description: "" });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { loadTurmas(); }, []);

  async function loadTurmas() {
    setLoading(true);
    try {
      const r = await apiFetch("/api/teacher/turmas");
      const d = await r.json();
      setTurmas(d.turmas ?? []);
    } finally { setLoading(false); }
  }

  async function createTurma(e: React.FormEvent) {
    e.preventDefault(); if (!form.name.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/api/teacher/turmas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      await loadTurmas(); setShowCreate(false); setForm({ name: "", serie: "", subject: "", description: "" });
    } finally { setCreating(false); }
  }

  async function deleteTurma(id: string) {
    if (!confirm("Excluir esta turma? Todos os alunos serão removidos.")) return;
    setDeleting(id);
    try { await apiFetch(`/api/teacher/turmas/${id}`, { method: "DELETE" }); setTurmas(p => p.filter(t => t.id !== id)); }
    finally { setDeleting(null); }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Minhas Turmas</h2>
          <p className="text-white/40 text-sm mt-0.5">{turmas.length} turma{turmas.length !== 1 ? "s" : ""} cadastrada{turmas.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Nova Turma
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-indigo-500/30 bg-indigo-600/5 p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-indigo-400" /> Criar nova turma</h3>
            <form onSubmit={createTurma} className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-white/50 text-xs mb-1 block">Nome da turma *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  placeholder="Ex: 3º Ano B — Matemática"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Série / Nível</label>
                <input value={form.serie} onChange={e => setForm(f => ({ ...f, serie: e.target.value }))} placeholder="Ex: 3º Ano, EJA, Técnico"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Disciplina</label>
                <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Ex: Matemática, Português"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-white/50 text-xs mb-1 block">Descrição</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  placeholder="Descreva a turma..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500 resize-none" />
              </div>
              <div className="sm:col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors">Cancelar</button>
                <button type="submit" disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors disabled:opacity-50">
                  {creating ? "Criando..." : "Criar Turma"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {turmas.length === 0 ? (
        <div className="text-center py-20 border border-white/[0.07] rounded-2xl">
          <GraduationCap className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 mb-1">Nenhuma turma ainda</p>
          <p className="text-white/30 text-sm mb-6">Crie sua primeira turma e convide seus alunos</p>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Criar primeira turma
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {turmas.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/[0.07] bg-[#0f0f1a] p-5 hover:border-indigo-500/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate">{t.name}</h3>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {t.serie && <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">{t.serie}</span>}
                    {t.subject && <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded-full">{t.subject}</span>}
                  </div>
                </div>
                <button onClick={() => deleteTurma(t.id)} disabled={deleting === t.id}
                  className="p-1.5 text-white/25 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-white/40 text-sm mb-4">
                <Users className="w-4 h-4" /> {t.studentCount} aluno{t.studentCount !== 1 ? "s" : ""}
              </div>
              <div className="bg-white/5 rounded-xl px-4 py-3 flex items-center justify-between mb-3">
                <div>
                  <p className="text-white/30 text-xs mb-0.5">Código de convite</p>
                  <p className="text-indigo-300 font-mono font-black tracking-widest">{t.inviteCode}</p>
                </div>
                <button onClick={() => copyCode(t.inviteCode)} className="p-2 text-white/30 hover:text-indigo-300 transition-colors rounded-lg">
                  {copiedCode === t.inviteCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button onClick={() => onNavigate(t.id)}
                className="w-full py-2 rounded-xl bg-indigo-600/15 hover:bg-indigo-600 border border-indigo-500/25 hover:border-indigo-500 text-indigo-300 hover:text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
                Ver turma <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Alunos ───────────────────────────────────────────────────────────────────
function AlunosSection({ apiFetch }: { apiFetch: (u: string, o?: RequestInit) => Promise<Response> }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch("/api/teacher/dashboard")
      .then(r => r.json())
      .then(d => setStudents(d.students ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.turma.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar aluno ou turma..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 border border-white/[0.07] rounded-2xl">
          <UserCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">Nenhum aluno encontrado</p>
          <p className="text-white/30 text-sm mt-1">Adicione alunos às suas turmas usando o código de convite</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0f0f1a] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-white/30 text-xs">
                <th className="text-left px-5 py-3 font-semibold">Nome</th>
                <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Turma</th>
                <th className="text-center px-5 py-3 font-semibold">Desempenho</th>
                <th className="text-center px-5 py-3 font-semibold hidden md:table-cell">Engajamento</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className={`border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-300 text-xs font-bold">{s.name[0]?.toUpperCase()}</span>
                      </div>
                      <span className="font-semibold text-white">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-white/40 hidden sm:table-cell">{s.turma}</td>
                  <td className="px-5 py-3 text-center">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden hidden sm:block">
                        <div className={`h-full rounded-full ${s.performance >= 70 ? "bg-emerald-500" : s.performance >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${s.performance}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${s.performance >= 70 ? "text-emerald-400" : s.performance >= 40 ? "text-amber-400" : "text-red-400"}`}>
                        {s.performance}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center hidden md:table-cell">
                    <span className={`text-xs font-semibold ${s.engagement === "Alto" ? "text-emerald-400" : s.engagement === "Médio" ? "text-amber-400" : "text-red-400"}`}>
                      {s.engagement}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Gerador de Provas ────────────────────────────────────────────────────────
function GerarProvaSection({ apiFetch }: { apiFetch: (u: string, o?: RequestInit) => Promise<Response> }) {
  const [form, setForm] = useState({ tema: "", materia: "Matemática", nivel: "Médio", quantidade: 5, estilo: "ENEM" });
  const [loading, setLoading] = useState(false);
  const [exam, setExam] = useState<{ title: string; questions: ExamQuestion[] } | null>(null);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);

  const MATERIAS = ["Matemática", "Português", "Física", "Química", "Biologia", "História", "Geografia", "Filosofia", "Sociologia", "Inglês", "Artes", "Educação Física"];
  const NIVEIS = ["Fácil", "Médio", "Difícil", "Avançado (ENEM)"];
  const ESTILOS = ["ENEM", "Vestibular", "Ensino Médio", "Ensino Fundamental", "Técnico"];

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tema.trim()) return;
    setLoading(true); setExam(null); setSelected({}); setShowResult(false);
    try {
      const r = await apiFetch("/api/teacher/generate-exam", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.ok) setExam(d.exam);
    } finally { setLoading(false); }
  }

  function handleSelect(qIdx: number, alt: number) {
    if (showResult) return;
    setSelected(prev => ({ ...prev, [qIdx]: alt }));
  }

  function checkAnswers() { setShowResult(true); }

  const score = exam ? exam.questions.filter((q, i) => selected[i] === q.correct).length : 0;

  const EXAM_ICONS: Record<string, string> = {
    Matemática: "📐", Português: "📝", Física: "⚡", Química: "🧪", Biologia: "🧬",
    História: "📜", Geografia: "🌍", Filosofia: "🤔", Sociologia: "👥", Inglês: "🇬🇧",
    Artes: "🎨", "Educação Física": "⚽",
  };

  return (
    <div className="space-y-6">
      {/* Config form */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0f0f1a] p-6">
        <h2 className="font-black text-white text-lg mb-1 flex items-center gap-2">
          <FileQuestion className="w-5 h-5 text-violet-400" /> Gerador de Provas com IA
        </h2>
        <p className="text-white/40 text-sm mb-5">Configure e gere provas personalizadas em segundos</p>

        <form onSubmit={generate} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="text-white/50 text-xs mb-1 block">Tema / Conteúdo *</label>
            <input value={form.tema} onChange={e => setForm(f => ({ ...f, tema: e.target.value }))} required
              placeholder="Ex: Funções do 1º Grau, Revolução Francesa, Ligações Químicas..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-white/50 text-xs mb-1 block">Matéria</label>
            <select value={form.materia} onChange={e => setForm(f => ({ ...f, materia: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
              {MATERIAS.map(m => <option key={m} value={m} className="bg-[#1a1a2e]">{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-white/50 text-xs mb-1 block">Nível de Dificuldade</label>
            <select value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
              {NIVEIS.map(n => <option key={n} value={n} className="bg-[#1a1a2e]">{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-white/50 text-xs mb-1 block">Estilo</label>
            <select value={form.estilo} onChange={e => setForm(f => ({ ...f, estilo: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
              {ESTILOS.map(s => <option key={s} value={s} className="bg-[#1a1a2e]">{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-white/50 text-xs mb-1 block">Nº de Questões: {form.quantidade}</label>
            <input type="range" min={3} max={10} value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: Number(e.target.value) }))}
              className="w-full accent-violet-500" />
          </div>
          <div className="sm:col-span-2 lg:col-span-2 flex items-end">
            <button type="submit" disabled={loading || !form.tema.trim()}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando prova...</> : <><Sparkles className="w-4 h-4" />Gerar Prova Agora</>}
            </button>
          </div>
        </form>
      </div>

      {/* Generated exam */}
      {loading && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-10 text-center">
          <Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto mb-4" />
          <p className="text-white font-bold">Gerando sua prova personalizada...</p>
          <p className="text-white/40 text-sm mt-1">A IA está criando {form.quantidade} questões contextualizadas</p>
        </div>
      )}

      {exam && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Exam header */}
          <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/10 to-indigo-600/10 p-6 mb-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">{EXAM_ICONS[form.materia] ?? "📋"}</span>
                  <h3 className="text-xl font-black text-white">{exam.title}</h3>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs bg-violet-500/30 text-violet-300 px-3 py-1 rounded-full font-semibold">{form.nivel}</span>
                  <span className="text-xs bg-indigo-500/30 text-indigo-300 px-3 py-1 rounded-full font-semibold">{form.estilo}</span>
                  <span className="text-xs bg-white/10 text-white/60 px-3 py-1 rounded-full font-semibold">{exam.questions?.length} questões</span>
                </div>
              </div>
              <div className="flex gap-3">
                {showResult && (
                  <div className={`text-center px-5 py-2 rounded-xl ${score >= exam.questions.length * 0.7 ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                    <p className="text-2xl font-black">{score}/{exam.questions.length}</p>
                    <p className="text-xs">Resultado</p>
                  </div>
                )}
                {!showResult && Object.keys(selected).length === exam.questions?.length && (
                  <button onClick={checkAnswers} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Ver Gabarito
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-5">
            {(exam.questions ?? []).map((q, qi) => {
              const sel = selected[qi];
              const isCorrect = showResult && sel === q.correct;
              const isWrong = showResult && sel !== undefined && sel !== q.correct;
              return (
                <motion.div key={qi} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: qi * 0.07 }}
                  className={`rounded-2xl border p-5 transition-all ${showResult ? (isCorrect ? "border-emerald-500/40 bg-emerald-500/5" : isWrong ? "border-red-500/40 bg-red-500/5" : "border-white/[0.07] bg-[#0f0f1a]") : "border-white/[0.07] bg-[#0f0f1a]"}`}>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-xl bg-violet-600/30 text-violet-300 text-sm font-black flex items-center justify-center flex-shrink-0">{qi + 1}</div>
                    <div className="flex-1">
                      {q.context && <div className="text-white/60 text-sm mb-3 bg-white/5 rounded-xl px-4 py-3 border-l-2 border-indigo-500/50">{q.context}</div>}
                      <p className="text-white font-semibold mb-4 leading-relaxed">{q.text}</p>

                      {/* Image description pill */}
                      {q.imageDescription && (
                        <div className="flex items-start gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2 mb-4 text-xs text-indigo-300">
                          <Eye className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span><strong>Ilustração sugerida:</strong> {q.imageDescription}</span>
                        </div>
                      )}

                      <div className="grid sm:grid-cols-2 gap-2">
                        {q.alternatives.map((alt, ai) => {
                          const isSelected = sel === ai;
                          const isCorrectAlt = showResult && ai === q.correct;
                          const isWrongAlt = showResult && isSelected && ai !== q.correct;
                          return (
                            <button key={ai} onClick={() => handleSelect(qi, ai)}
                              className={`text-left px-4 py-3 rounded-xl text-sm transition-all border
                                ${isCorrectAlt ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-semibold" :
                                  isWrongAlt ? "bg-red-500/20 border-red-500/60 text-red-300" :
                                  isSelected ? "bg-indigo-600/30 border-indigo-500/60 text-indigo-300 font-semibold" :
                                  "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20"
                                } ${showResult ? "cursor-default" : "cursor-pointer"}`}>
                              {alt}
                            </button>
                          );
                        })}
                      </div>

                      {showResult && (
                        <div className="mt-4 bg-white/5 rounded-xl px-4 py-3 text-sm text-white/70">
                          <strong className="text-white">Explicação:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Assistente IA ────────────────────────────────────────────────────────────
function AssistenteSection({ apiFetch }: { apiFetch: (u: string, o?: RequestInit) => Promise<Response> }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const SUGGESTIONS = [
    "Crie um plano de aula semanal para trigonometria no 3º ano",
    "Gere 5 exercícios de interpretação de texto nível ENEM",
    "Explique leis de Newton de forma simples para ensino médio",
    "Como ajudar alunos com dificuldade em frações?",
    "Crie uma atividade para alunos com baixo engajamento",
    "Quais estratégias usar para turmas com níveis mistos?",
  ];

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      const r = await apiFetch("/api/teacher/ai-copilot", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history: messages }),
      });
      const d = await r.json();
      setMessages([...history, { role: "assistant", content: d.reply ?? "Desculpe, não consegui processar." }]);
    } catch {
      setMessages([...history, { role: "assistant", content: "Erro ao conectar. Tente novamente." }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="rounded-2xl border border-white/[0.07] bg-[#0f0f1a] p-5 mb-4">
        <h2 className="font-black text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-violet-400" /> Assistente do Professor
        </h2>
        <p className="text-white/40 text-sm mt-1">Copiloto de IA para criar aulas, exercícios, provas e estratégias pedagógicas</p>
      </div>

      {messages.length === 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => { setInput(s); }}
              className="text-left p-4 rounded-2xl border border-white/[0.07] bg-[#0f0f1a] hover:border-violet-500/40 hover:bg-violet-500/5 transition-all text-white/60 hover:text-white text-sm">
              <Sparkles className="w-4 h-4 text-violet-400 mb-2" />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-xl bg-violet-600/30 flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                <Brain className="w-4 h-4 text-violet-300" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
              ${m.role === "user" ? "bg-indigo-600/30 text-white ml-12" : "bg-[#1a1a2e] border border-white/[0.07] text-white/90"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-xl bg-violet-600/30 flex items-center justify-center flex-shrink-0 mr-3">
              <Brain className="w-4 h-4 text-violet-300" />
            </div>
            <div className="bg-[#1a1a2e] border border-white/[0.07] rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Pergunte ao assistente ou peça para criar algo..."
          className="flex-1 bg-[#0f0f1a] border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500" />
        <button onClick={send} disabled={loading || !input.trim()}
          className="p-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-2xl transition-colors">
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ─── Relatórios ───────────────────────────────────────────────────────────────
function RelatoriosSection({ apiFetch }: { apiFetch: (u: string, o?: RequestInit) => Promise<Response> }) {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/teacher/dashboard").then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>;
  if (!data) return <div className="text-white/40 text-center py-20">Erro ao carregar relatórios.</div>;

  return (
    <div className="space-y-6">
      <h2 className="font-black text-white text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-400" /> Relatórios</h2>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total de Alunos", value: data.totalStudents, icon: Users },
          { label: "Turmas Ativas", value: data.totalTurmas, icon: BookOpen },
          { label: "Média Geral", value: `${data.avgPerformance}%`, icon: TrendingUp },
          { label: "Taxa de Engajamento", value: `${data.engagementRate}%`, icon: Activity },
        ].map(c => (
          <div key={c.label} className="rounded-2xl border border-white/[0.07] bg-[#0f0f1a] p-5">
            <c.icon className="w-5 h-5 text-indigo-400 mb-3" />
            <p className="text-2xl font-black text-white">{c.value}</p>
            <p className="text-white/40 text-xs mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Performance by materia */}
      {data.heatMap.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0f0f1a] p-5">
          <h3 className="font-bold text-white mb-5">Desempenho por Matéria</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.heatMap} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="materia" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white" }} />
              <Bar dataKey="score" name="Desempenho %" fill="#818cf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly chart */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0f0f1a] p-5">
        <h3 className="font-bold text-white mb-5">Evolução Semanal</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.weeklyChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="week" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white" }} />
            <Legend wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }} />
            <Line type="monotone" dataKey="acertos" stroke="#34d399" strokeWidth={2} dot={false} name="Acertos %" />
            <Line type="monotone" dataKey="participacao" stroke="#818cf8" strokeWidth={2} dot={false} name="Participação" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0f0f1a] p-5">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Bell className="w-4 h-4 text-amber-400" /> Alertas do Sistema</h3>
          <div className="space-y-2">
            {data.alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-xl p-3 ${a.severity === "warning" ? "bg-amber-500/10 border border-amber-500/20" : "bg-emerald-500/10 border border-emerald-500/20"}`}>
                {a.severity === "warning" ? <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />}
                <p className={`text-sm ${a.severity === "warning" ? "text-amber-300" : "text-emerald-300"}`}>{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
