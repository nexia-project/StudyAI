import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Users, GraduationCap, BarChart2, ArrowLeft, RefreshCw,
  Shield, Plus, Mail, TrendingUp, Target, Zap, FileText, Settings,
  CheckCircle, XCircle, Copy, Check, Palette, Link2, Clock, AlertTriangle,
  ChevronRight, Trash2, UserCheck, UserX, Send, Lock, Eye, EyeOff,
  Brain, Sparkles, BookOpen, Mic, Wand2, Layers, Download,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useStudyAuth } from "@/hooks/useStudyAuth";
import { EstudioIA } from "@/components/EstudioIA";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

interface Institution {
  id: string; name: string; city: string | null; state: string | null;
  primaryColor: string | null; logoUrl: string | null; cnpj: string | null;
  planType: string | null; contractStart: string | null; contractEnd: string | null;
  maxUsers: number | null; maxTeachers: number | null; createdAt: string;
}
interface Member {
  id: string; userId: string; role: string; isApproved: boolean | null;
  inviteEmail: string | null; firstName: string | null; lastName: string | null; email: string | null;
}
interface Turma { id: string; name: string; serie: string | null; subject: string | null; }
interface PendingInvite { id: string; email: string; role: string; expiresAt: string; token: string; }
interface InstitutionData {
  institution: Institution; turmas: Turma[]; members: Member[]; teachers: Member[];
  pendingInvites: PendingInvite[];
  stats: { turmaCount: number; studentCount: number; teacherCount: number; avgXp: number; memberCount: number; };
}
interface Report {
  totalTurmas: number; totalStudents: number; avgXp: number;
  simCompleted: number; avgSimAccuracy: number; flashcardsCompleted: number;
  turmaBreakdown: { id: string; name: string; serie: string | null; subject: string | null; studentCount: number; avgXp: number; }[];
  generatedAt: string;
}

function buildInstitutionRecommendation(args: {
  studentCount: number;
  teacherCount: number;
  turmaCount: number;
  avgXp: number;
  report: Report | null;
}) {
  if (args.studentCount === 0) return "Comece pelo convite de alunos e uma turma piloto com atividade diagnóstica curta.";
  if (args.teacherCount === 0) return "Convide professores/gestores antes de escalar alunos para manter acompanhamento humano.";
  if (args.turmaCount === 0) return "Crie turmas para transformar os usuários em grupos acompanháveis.";
  if (!args.report) return "Abra Relatórios para carregar desempenho por turma e validar onde agir primeiro.";
  if (args.report.simCompleted === 0) return "Aplique um simulado ou quiz diagnóstico por turma para criar linha de base.";
  if (args.report.avgSimAccuracy < 60) return "Priorize revisão institucional nas turmas com menor XP/acerto antes de ampliar conteúdo.";
  if (args.avgXp < 150) return "Faça campanha de reativação com tarefa curta e acompanhamento de professor.";
  return "Mantenha cadência semanal: relatório, ação nas turmas com menor sinal e revisão de adesão.";
}

function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/\r?\n/g, " ").trim();
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadTextFile(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF", content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Invite acceptance page ───────────────────────────────────────────────────
export function InstituicaoConvitePage() {
  const params = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading } = useStudyAuth();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [instName, setInstName] = useState("");

  async function accept() {
    setStatus("loading");
    const res = await fetch(`${BASE}/api/institution/accept-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: params.token }),
    });
    const d = await res.json();
    if (res.ok) {
      setStatus("success");
      setInstName(d.institution?.name ?? "");
    } else {
      setStatus("error");
      setMsg(d.error || "Erro ao aceitar convite");
    }
  }

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center">
      <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
    </div>
  );

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 max-w-md text-center">
        <Mail className="w-12 h-12 text-violet-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Convite Institucional</h2>
        <p className="text-slate-400 mb-6">Faça login ou crie uma conta para aceitar o convite de ingresso na instituição.</p>
        <Button onClick={() => { sessionStorage.setItem("auth_return_to", `/instituicao/convite/${params.token}`); navigate("/sign-in"); }}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
          Fazer Login
        </Button>
      </motion.div>
    </div>
  );

  if (status === "success") return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 max-w-md text-center">
        <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo!</h2>
        <p className="text-slate-400 mb-6">Você entrou para <strong className="text-white">{instName}</strong>. Agora tem acesso ao portal institucional.</p>
        <Button onClick={() => navigate("/instituicao")}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
          Acessar Portal
        </Button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 max-w-md text-center">
        <Building2 className="w-12 h-12 text-violet-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Aceitar Convite</h2>
        <p className="text-slate-400 mb-6">Você foi convidado para fazer parte de uma instituição no StudyAI.</p>
        {status === "error" && <p className="text-red-400 text-sm mb-4">{msg}</p>}
        <Button onClick={accept} disabled={status === "loading"}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
          {status === "loading" ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : "Aceitar e Entrar"}
        </Button>
      </motion.div>
    </div>
  );
}

// ─── Institutional email/password login page ──────────────────────────────────
export function InstituicaoLoginPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading } = useStudyAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate("/instituicao");
  }, [isAuthenticated, isLoading]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Use Clerk sign-in redirect with email/password pre-filled via URL
      sessionStorage.setItem("auth_return_to", "/instituicao");
      navigate("/sign-in");
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center">
      <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-violet-900/40">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Portal Institucional</h1>
          <p className="text-slate-400 text-sm mt-1">Acesso exclusivo para membros cadastrados</p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-5 text-xs">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>O acesso à interface interna requer aprovação do administrador da instituição.</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">Email institucional</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm"
              />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm pr-10"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-2.5 font-bold">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : "Entrar no Portal"}
            </Button>
          </form>

          <p className="text-center text-slate-500 text-xs mt-4">
            Não tem acesso?{" "}
            <a href="mailto:contato@study.ia.br" className="text-violet-400 hover:text-violet-300">
              Solicite ao administrador
            </a>
          </p>
        </div>

        <button onClick={() => navigate("/")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mx-auto mt-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar ao início
        </button>
      </motion.div>
    </div>
  );
}

// ─── Main institution portal ──────────────────────────────────────────────────
// ─── INTELIGÊNCIA IA TAB ─────────────────────────────────────────────────────
interface InstAIStats {
  scope: { studentCount: number; turmaCount: number };
  aiFeatures: { feature: string; uses: number; users: number; last7d: number }[];
  trilhaBySubject: { subject: string; students: number; avgLevel: number; maxLevel: number }[];
  diagnosticsCompleted30d: number;
  notebookDocsTotal: number; notebookStorageMb: number; notebookOverviewsTotal: number;
  contentBreakdown: { label: string; value: number; color: string }[];
}

function InstituicaoIATab({ institutionId, primaryColor }: { institutionId: string; primaryColor: string }) {
  const [stats, setStats] = useState<InstAIStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE}/api/institution/${institutionId}/ai-stats`, { credentials: "include" })
      .then(async r => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Erro");
        return r.json();
      })
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [institutionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }
  if (error || !stats) {
    return <div className="text-center py-12 text-red-300">{error ?? "Sem dados"}</div>;
  }

  if (stats.scope.studentCount === 0) {
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-12 text-center">
        <Brain className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-white font-bold mb-1">Nenhum aluno matriculado ainda</h3>
        <p className="text-slate-400 text-sm">Adicione alunos às turmas para ver o uso de IA da instituição.</p>
      </div>
    );
  }

  const featureIcon: Record<string, any> = {
    "Tiagão (Voz)": Mic, "Trilha do Mestre": Target, "Notebook (RAG)": BookOpen,
    "Mapa Mental": Layers, "Redação": FileText, "Flashcards": Sparkles,
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl p-5 border border-violet-500/30 bg-gradient-to-br from-violet-900/40 to-violet-900/30">
        <div className="flex items-center gap-3 mb-1">
          <Brain className="w-5 h-5 text-violet-300" />
          <h2 className="text-white font-bold text-lg">Inteligência IA da Instituição</h2>
        </div>
        <p className="text-slate-300 text-sm">
          Métricas de uso das features de IA pelos <strong className="text-white">{stats.scope.studentCount}</strong> alunos
          em <strong className="text-white">{stats.scope.turmaCount}</strong> turmas.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Diagnósticos (30d)", value: stats.diagnosticsCompleted30d, icon: Target, color: "text-emerald-400" },
          { label: "Documentos Notebook", value: stats.notebookDocsTotal, icon: BookOpen, color: "text-violet-400" },
          { label: "Storage RAG", value: `${stats.notebookStorageMb} MB`, icon: Layers, color: "text-violet-400" },
          { label: "Overviews gerados", value: stats.notebookOverviewsTotal, icon: Wand2, color: "text-amber-400" },
        ].map(k => (
          <div key={k.label} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <p className="text-2xl font-black text-white">{k.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* AI features grid */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" /> Adoção por Feature de IA
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.aiFeatures.map(f => {
            const Icon = featureIcon[f.feature] ?? Brain;
            return (
              <div key={f.feature} className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-violet-300" />
                  <span className="text-white font-semibold text-sm">{f.feature}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-black text-white">{f.uses}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Usos</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-emerald-400">{f.users}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Alunos</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-amber-400">{f.last7d}</p>
                    <p className="text-[10px] text-slate-500 uppercase">7 dias</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trilha by subject */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" /> Trilha do Mestre por Matéria
          </h3>
          {stats.trilhaBySubject.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Nenhum aluno iniciou a Trilha ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.trilhaBySubject}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis domain={[0, 5]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                <Bar dataKey="avgLevel" name="Nível médio" fill={primaryColor} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Content breakdown */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" /> Conteúdo Gerado pela Instituição
          </h3>
          {stats.contentBreakdown.every(c => c.value === 0) ? (
            <p className="text-slate-500 text-sm text-center py-8">Sem conteúdo gerado ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={stats.contentBreakdown.filter(c => c.value > 0)} dataKey="value" nameKey="label"
                  cx="50%" cy="50%" outerRadius={80} label={false}>
                  {stats.contentBreakdown.filter(c => c.value > 0).map((c, i) => (
                    <Cell key={i} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InstituicaoPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading, user } = useStudyAuth();
  const [data, setData] = useState<InstitutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "turmas" | "membros" | "relatorios" | "configuracoes">("overview");

  // Invite
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("teacher");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ link: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Report
  const [report, setReport] = useState<Report | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Branding
  const [brandingForm, setBrandingForm] = useState({ name: "", logoUrl: "", primaryColor: "#6366f1", city: "", state: "", cnpj: "" });
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingMsg, setBrandingMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { if (!authLoading) loadData(); }, [authLoading]);

  async function loadData() {
    if (!isAuthenticated) {
      setError("nao_autenticado");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const meRes = await fetch(`${BASE}/api/institution/me`);
      const meData = await meRes.json();

      if (!meData.institution) { setError("sem_instituicao"); return; }

      setMyRole(meData.role);
      setIsApproved(meData.isApproved);

      if (!meData.isApproved) { setError("aguardando_aprovacao"); return; }

      const detailRes = await fetch(`${BASE}/api/institution/${meData.institution.id}`);
      if (!detailRes.ok) {
        const d = await detailRes.json();
        setError(d.error || "acesso_negado");
        return;
      }
      const detail = await detailRes.json();
      setData(detail);
      setBrandingForm({
        name: detail.institution.name,
        logoUrl: detail.institution.logoUrl ?? "",
        primaryColor: detail.institution.primaryColor ?? "#6366f1",
        city: detail.institution.city ?? "",
        state: detail.institution.state ?? "",
        cnpj: detail.institution.cnpj ?? "",
      });
    } catch {
      setError("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  async function loadReport() {
    if (!data?.institution || loadingReport) return;
    setLoadingReport(true);
    const res = await fetch(`${BASE}/api/institution/${data.institution.id}/report`);
    if (res.ok) setReport((await res.json()).report);
    setLoadingReport(false);
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.institution) return;
    setInviting(true);
    setInviteResult(null);
    const res = await fetch(`${BASE}/api/institution/${data.institution.id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const d = await res.json();
    if (res.ok) {
      setInviteResult({ link: d.inviteLink, token: d.inviteToken });
      setInviteEmail("");
    }
    setInviting(false);
  }

  async function approveMember(memberId: string, approved: boolean) {
    if (!data?.institution) return;
    await fetch(`${BASE}/api/institution/${data.institution.id}/members/${memberId}/approve`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved }),
    });
    await loadData();
  }

  async function removeMember(memberId: string) {
    if (!data?.institution || !confirm("Remover membro da instituição?")) return;
    await fetch(`${BASE}/api/institution/${data.institution.id}/members/${memberId}`, { method: "DELETE" });
    await loadData();
  }

  async function saveBranding(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.institution) return;
    setSavingBranding(true);
    setBrandingMsg(null);
    const res = await fetch(`${BASE}/api/institution/${data.institution.id}/branding`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brandingForm),
    });
    if (res.ok) {
      setBrandingMsg({ ok: true, text: "Configurações salvas!" });
      await loadData();
    } else {
      setBrandingMsg({ ok: false, text: "Erro ao salvar" });
    }
    setSavingBranding(false);
  }

  function copyInviteLink() {
    if (!inviteResult) return;
    navigator.clipboard.writeText(inviteResult.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isAdmin = myRole === "admin" || myRole === "owner";

  // ── Loading ──
  if (loading || authLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center">
      <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
    </div>
  );

  // ── Error states ──
  if (error === "nao_autenticado") return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 max-w-md text-center">
        <Lock className="w-12 h-12 text-violet-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito</h2>
        <p className="text-slate-400 mb-6">Faça login para acessar o portal institucional.</p>
        <Button onClick={() => { sessionStorage.setItem("auth_return_to", "/instituicao"); navigate("/instituicao/login"); }}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
          Entrar no Portal
        </Button>
      </motion.div>
    </div>
  );

  if (error === "aguardando_aprovacao") return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 max-w-md text-center">
        <Clock className="w-14 h-14 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Aguardando Aprovação</h2>
        <p className="text-slate-400 mb-2">Sua conta foi criada com sucesso, mas o acesso ao portal institucional requer aprovação do administrador.</p>
        <p className="text-slate-500 text-sm mb-6">Entre em contato com o administrador da sua instituição para liberar o acesso.</p>
        <Button onClick={() => navigate("/app")} variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl">
          Ir para o App
        </Button>
      </motion.div>
    </div>
  );

  if (error === "sem_instituicao") return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 max-w-md text-center">
        <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Sem Instituição Vinculada</h2>
        <p className="text-slate-400 mb-6">Você ainda não está vinculado a nenhuma instituição. Peça o link de convite ao administrador.</p>
        <Button onClick={() => navigate("/app")}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
          Voltar ao Início
        </Button>
      </motion.div>
    </div>
  );

  if (!data?.institution) return null;

  const { institution, turmas, members, pendingInvites, stats } = data;
  const primaryColor = institution.primaryColor ?? "#6366f1";
  const approvedMembers = members.filter(m => m.isApproved);
  const pendingMembers = members.filter(m => !m.isApproved);

  const tabs = [
    { id: "overview", label: "Visão Geral", icon: BarChart2 },
    { id: "turmas", label: "Turmas", icon: GraduationCap, count: turmas.length },
    { id: "membros", label: "Membros", icon: Users, count: members.length, badge: pendingMembers.length },
    { id: "ia", label: "Inteligência IA", icon: Brain },
    { id: "relatorios", label: "Relatórios", icon: FileText },
    ...(isAdmin ? [{ id: "configuracoes", label: "Config.", icon: Settings }] : []),
  ] as const;

  const planLabels: Record<string, string> = { trial: "Trial", basic: "Básico", standard: "Standard", premium: "Premium", enterprise: "Enterprise" };
  const lowSignalTurmas = (report?.turmaBreakdown ?? [])
    .filter(t => t.studentCount > 0 && t.avgXp < 150)
    .sort((a, b) => a.avgXp - b.avgXp);
  const institutionRecommendation = buildInstitutionRecommendation({
    studentCount: stats.studentCount,
    teacherCount: stats.teacherCount,
    turmaCount: stats.turmaCount,
    avgXp: stats.avgXp,
    report,
  });

  function exportInstitutionReportCsv() {
    if (!report) return;
    const generatedAt = report.generatedAt || new Date().toISOString();
    const rows = [
      ["secao", "instituicao", "gerado_em", "metrica", "valor", "turma", "serie", "materia", "alunos", "xp_medio", "sinal", "acao_recomendada"],
      ["resumo", institution.name, generatedAt, "total_alunos", report.totalStudents, "", "", "", "", "", "", institutionRecommendation],
      ["resumo", institution.name, generatedAt, "total_turmas", report.totalTurmas, "", "", "", "", "", "", institutionRecommendation],
      ["resumo", institution.name, generatedAt, "simulados_feitos", report.simCompleted, "", "", "", "", "", "", institutionRecommendation],
      ["resumo", institution.name, generatedAt, "acerto_medio", `${report.avgSimAccuracy}%`, "", "", "", "", "", "", institutionRecommendation],
      ["resumo", institution.name, generatedAt, "flashcards_feitos", report.flashcardsCompleted, "", "", "", "", "", "", institutionRecommendation],
      ...report.turmaBreakdown.map(t => [
        "turma",
        institution.name,
        generatedAt,
        "diagnostico_turma",
        "",
        t.name,
        t.serie ?? "",
        t.subject ?? "",
        t.studentCount,
        t.avgXp,
        t.studentCount === 0 ? "sem alunos" : t.avgXp < 150 ? "baixa tracao por XP medio" : "tracao estavel pelos dados atuais",
        institutionRecommendation,
      ]),
    ];
    downloadTextFile(
      `studyai-instituicao-${institution.name.replace(/[^\w-]+/g, "-").toLowerCase()}-relatorio.csv`,
      rows.map(row => row.map(csvCell).join(",")).join("\n"),
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <button onClick={() => navigate("/app")}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors mt-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            {institution.logoUrl ? (
              <img src={institution.logoUrl} alt={institution.name}
                className="w-12 h-12 rounded-xl object-cover border border-slate-700" />
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl"
                style={{ background: primaryColor }}>
                {institution.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">{institution.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                {(institution.city || institution.state) && (
                  <p className="text-slate-400 text-sm">{[institution.city, institution.state].filter(Boolean).join(", ")}</p>
                )}
                {institution.planType && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: `${primaryColor}20`, color: primaryColor }}>
                    {planLabels[institution.planType] ?? institution.planType}
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 capitalize">{myRole}</span>
              </div>
            </div>
          </div>
          <button onClick={loadData} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/60 p-1 rounded-2xl mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); if (tab.id === "relatorios" && !report) loadReport(); }}
              className={`flex-shrink-0 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-medium transition-all
                ${activeTab === tab.id ? "bg-violet-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}>
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {"count" in tab && (tab.count ?? 0) > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-white/20" : "bg-slate-700"}`}>
                  {tab.count}
                </span>
              )}
              {"badge" in tab && (tab.badge ?? 0) > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── OVERVIEW ─── */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Turmas", value: stats.turmaCount, icon: GraduationCap, color: "text-violet-400" },
                { label: "Membros", value: stats.memberCount, icon: Users, color: "text-emerald-400" },
                { label: "Alunos", value: stats.studentCount, icon: Target, color: "text-violet-400" },
                { label: "XP médio", value: stats.avgXp.toLocaleString("pt-BR"), icon: Zap, color: "text-amber-400" },
              ].map(s => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                  <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-slate-400 text-sm">{s.label}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.35fr,0.65fr] gap-4">
              <div className="bg-slate-800/60 border border-violet-500/30 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Diagnóstico premium do gestor</p>
                    <h3 className="text-white font-bold text-lg mt-1">Adoção, cobertura e próximos sinais</h3>
                    <p className="text-slate-400 text-xs mt-1">
                      Usa dados agregados da instituição. Risco individual só aparece no painel da turma/professor quando o backend retorna alunos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setActiveTab("relatorios"); if (!report) loadReport(); }}
                    className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-500"
                  >
                    Ver relatório
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Cobertura alunos", value: stats.studentCount > 0 ? "ativa" : "sem alunos", tone: stats.studentCount > 0 ? "text-emerald-300" : "text-amber-300" },
                    { label: "Professores", value: stats.teacherCount, tone: stats.teacherCount > 0 ? "text-emerald-300" : "text-amber-300" },
                    { label: "XP médio", value: stats.avgXp.toLocaleString("pt-BR"), tone: stats.avgXp >= 150 ? "text-emerald-300" : "text-amber-300" },
                    { label: "Relatório", value: report ? "carregado" : "pendente", tone: report ? "text-emerald-300" : "text-amber-300" },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl bg-slate-900/50 border border-slate-700 p-3">
                      <p className={`text-lg font-black ${item.tone}`}>{item.value}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-300">Dados ausentes no agregado</p>
                  <p className="text-xs text-amber-100/90 mt-1 leading-relaxed">
                    Ainda faltam no endpoint institucional: alunos em risco por turma, último login por usuário, entregas atrasadas e intervenção registrada pelo professor.
                    Este painel não cria números falsos para esses campos.
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl p-5 text-white shadow-lg shadow-violet-950/30">
                <Sparkles className="w-5 h-5 text-white/80 mb-2" />
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/70">Ação recomendada</p>
                <p className="mt-1 text-sm font-bold leading-relaxed">{institutionRecommendation}</p>
                <div className="mt-4 rounded-xl bg-white/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-white/60">Resumo executivo</p>
                  <p className="text-xs text-white/85 mt-1">
                    {stats.studentCount} aluno(s), {stats.teacherCount} professor(es), {stats.turmaCount} turma(s).
                  </p>
                </div>
              </div>
            </div>

            {/* Contract info */}
            {institution.contractEnd && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-400" /> Contrato / Licença
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Plano</p>
                    <p className="text-white font-medium">{planLabels[institution.planType ?? ""] ?? institution.planType ?? "—"}</p>
                  </div>
                  {institution.contractStart && (
                    <div>
                      <p className="text-slate-500">Início</p>
                      <p className="text-slate-300">{new Date(institution.contractStart).toLocaleDateString("pt-BR")}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-500">Vencimento</p>
                    <p className={`font-medium ${new Date(institution.contractEnd) < new Date() ? "text-red-400" : "text-emerald-400"}`}>
                      {new Date(institution.contractEnd).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  {institution.maxUsers && (
                    <div>
                      <p className="text-slate-500">Usuários incluídos</p>
                      <p className="text-slate-300">{stats.memberCount} / {institution.maxUsers}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {institution.cnpj && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 text-sm">
                <span className="text-slate-500">CNPJ: </span>
                <span className="text-slate-300">{institution.cnpj}</span>
                <span className="text-slate-500 ml-4">Criada em: </span>
                <span className="text-slate-300">{new Date(institution.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
            )}
          </div>
        )}

        {/* ─── TURMAS ─── */}
        {activeTab === "turmas" && (
          <div>
            {turmas.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma turma vinculada à instituição</p>
                <p className="text-sm mt-1">Professores devem criar turmas e vinculá-las aqui</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {turmas.map((turma, i) => (
                  <motion.div key={turma.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                    <h3 className="text-white font-semibold">{turma.name}</h3>
                    <div className="flex gap-2 mt-1">
                      {turma.serie && <span className="text-xs bg-violet-900/50 text-violet-300 px-2 py-0.5 rounded-full">{turma.serie}</span>}
                      {turma.subject && <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{turma.subject}</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── MEMBROS ─── */}
        {activeTab === "membros" && (
          <div className="space-y-5">
            {/* Invite form (admin only) */}
            {isAdmin && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Send className="w-4 h-4 text-violet-400" /> Convidar membro
                </h3>
                <form onSubmit={sendInvite} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="email@instituicao.com" required
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm"
                  />
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                    <option value="teacher">Professor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <Button type="submit" disabled={inviting} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-5">
                    {inviting ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Convidar"}
                  </Button>
                </form>
                {inviteResult && (
                  <div className="mt-3 p-3 bg-emerald-900/30 border border-emerald-700/40 rounded-xl">
                    <p className="text-emerald-400 text-xs font-semibold mb-1">Link de convite gerado (válido por 7 dias):</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-slate-300 bg-slate-800 rounded px-2 py-1 flex-1 truncate">{inviteResult.link}</code>
                      <button onClick={copyInviteLink}
                        className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors flex-shrink-0">
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pending approval */}
            {pendingMembers.length > 0 && isAdmin && (
              <div className="bg-amber-900/20 border border-amber-700/40 rounded-2xl p-5">
                <h3 className="text-amber-400 font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Aguardando aprovação ({pendingMembers.length})
                </h3>
                <div className="space-y-2">
                  {pendingMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-3 bg-slate-800/40 rounded-xl p-3">
                      <div className="w-9 h-9 bg-amber-600/20 rounded-full flex items-center justify-center text-amber-300 font-bold text-sm flex-shrink-0">
                        {(m.firstName || m.inviteEmail || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {[m.firstName, m.lastName].filter(Boolean).join(" ") || m.email || m.inviteEmail || "Usuário"}
                        </p>
                        <p className="text-slate-400 text-xs truncate">{m.email || m.inviteEmail}</p>
                      </div>
                      <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full capitalize flex-shrink-0">{m.role}</span>
                      <button onClick={() => approveMember(m.id, true)}
                        className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 transition-colors">
                        <UserCheck className="w-4 h-4" />
                      </button>
                      <button onClick={() => removeMember(m.id)}
                        className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 transition-colors">
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved members */}
            <div>
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
                Membros ativos ({approvedMembers.length})
              </h3>
              {approvedMembers.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum membro ativo ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {approvedMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                        style={{ background: `${primaryColor}30`, color: primaryColor }}>
                        {(m.firstName || m.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {[m.firstName, m.lastName].filter(Boolean).join(" ") || m.email || "Usuário"}
                        </p>
                        {m.email && <p className="text-slate-400 text-xs truncate">{m.email}</p>}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                        style={{ background: `${primaryColor}20`, color: primaryColor }}>
                        {m.role === "admin" ? "Admin" : m.role === "owner" ? "Dono" : "Professor"}
                      </span>
                      {isAdmin && m.userId !== user?.id && (
                        <button onClick={() => removeMember(m.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-red-900/30 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending invites */}
            {isAdmin && pendingInvites.length > 0 && (
              <div>
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
                  Convites pendentes ({pendingInvites.length})
                </h3>
                <div className="space-y-2">
                  {pendingInvites.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 bg-slate-800/40 border border-dashed border-slate-700 rounded-xl p-3">
                      <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 text-sm truncate">{inv.email}</p>
                        <p className="text-slate-500 text-xs">Expira: {new Date(inv.expiresAt).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full capitalize">{inv.role}</span>
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/instituicao/convite/${inv.token}`); }}
                        className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── INTELIGÊNCIA IA ─── */}
        {(activeTab as string) === "ia" && (
          <div className="space-y-6">
            <InstituicaoIATab institutionId={institution.id} primaryColor={primaryColor} />
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
              <EstudioIA variant="dark" title="Estúdio Visual IA da Instituição"
                defaultMateria="Geral" />
            </div>
          </div>
        )}

        {/* ─── RELATÓRIOS ─── */}
        {activeTab === "relatorios" && (
          <div className="space-y-4">
            {loadingReport && !report && (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
              </div>
            )}
            {report && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Total de alunos", value: report.totalStudents, icon: Users, color: "text-violet-400" },
                    { label: "Simulados feitos", value: report.simCompleted, icon: Target, color: "text-violet-400" },
                    { label: "Acerto médio (%)", value: `${report.avgSimAccuracy}%`, icon: TrendingUp, color: "text-emerald-400" },
                    { label: "XP médio", value: report.avgXp.toLocaleString("pt-BR"), icon: Zap, color: "text-amber-400" },
                    { label: "Flashcards feitos", value: report.flashcardsCompleted, icon: BarChart2, color: "text-violet-400" },
                    { label: "Turmas", value: report.totalTurmas, icon: GraduationCap, color: "text-pink-400" },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                      <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                      <p className="text-2xl font-bold text-white">{s.value}</p>
                      <p className="text-slate-400 text-sm">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-800/60 border border-violet-500/30 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Diagnóstico de relatório</p>
                      <h3 className="text-white font-semibold">Turmas que precisam de atenção</h3>
                      <p className="text-slate-400 text-xs mt-1">
                        Sinal calculado com XP médio, volume de simulados e flashcards do relatório atual.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={exportInstitutionReportCsv}
                      title="Baixar CSV com resumo institucional, turmas e ação recomendada usando os dados do relatório atual."
                      className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200 hover:bg-violet-500/20"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Exportar CSV
                    </button>
                  </div>

                  {report.totalStudents === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-center">
                      <p className="font-semibold text-slate-300">Sem alunos no relatório</p>
                      <p className="text-xs text-slate-500 mt-1">Convide alunos e gere uma atividade diagnóstica para habilitar comparações.</p>
                    </div>
                  ) : lowSignalTurmas.length > 0 ? (
                    <div className="space-y-2">
                      {lowSignalTurmas.slice(0, 4).map(t => (
                        <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/50 p-3">
                          <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-white text-sm font-semibold truncate">{t.name}</p>
                            <p className="text-xs text-slate-400">{t.studentCount} aluno(s) · XP médio {t.avgXp.toLocaleString("pt-BR")}</p>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-300">baixa tração</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                      <CheckCircle className="w-5 h-5 text-emerald-300 mb-2" />
                      <p className="font-semibold text-emerald-100">Nenhuma turma com baixa tração por XP médio</p>
                      <p className="text-xs text-emerald-100/80 mt-1">Ainda assim, risco individual depende de dados por aluno no painel da turma.</p>
                    </div>
                  )}

                  <div className="mt-4 rounded-xl bg-violet-500/10 border border-violet-500/20 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-300">Próxima ação do gestor</p>
                    <p className="text-sm text-slate-200 mt-1 leading-relaxed">{institutionRecommendation}</p>
                  </div>
                </div>

                {report.turmaBreakdown.length > 0 && (
                  <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-violet-400" /> Desempenho por turma
                    </h3>
                    <div className="space-y-3">
                      {report.turmaBreakdown.map(t => (
                        <div key={t.id} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-white text-sm font-medium truncate">{t.name}</p>
                              {t.serie && <span className="text-xs bg-violet-900/50 text-violet-300 px-1.5 py-0.5 rounded-full">{t.serie}</span>}
                              {t.subject && <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full">{t.subject}</span>}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span>{t.studentCount} alunos</span>
                              <span>XP médio: {t.avgXp.toLocaleString("pt-BR")}</span>
                            </div>
                          </div>
                          <div className="w-24">
                            <div className="bg-slate-700 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${Math.min(100, (t.avgXp / 5000) * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-slate-600 text-xs text-right">
                  Gerado em {new Date(report.generatedAt).toLocaleString("pt-BR")}
                </p>
              </>
            )}
            <button onClick={loadReport}
              className="flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm transition-colors">
              <RefreshCw className="w-4 h-4" /> Atualizar relatório
            </button>
          </div>
        )}

        {/* ─── CONFIGURAÇÕES ─── */}
        {activeTab === "configuracoes" && isAdmin && (
          <div className="space-y-5">
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Palette className="w-4 h-4 text-violet-400" /> Identidade Visual
              </h3>
              <form onSubmit={saveBranding} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">Nome da instituição</label>
                    <input value={brandingForm.name} onChange={e => setBrandingForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">CNPJ</label>
                    <input value={brandingForm.cnpj} onChange={e => setBrandingForm(f => ({ ...f, cnpj: e.target.value }))}
                      placeholder="00.000.000/0001-00"
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">URL do logo</label>
                    <input value={brandingForm.logoUrl} onChange={e => setBrandingForm(f => ({ ...f, logoUrl: e.target.value }))}
                      placeholder="https://exemplo.com/logo.png"
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">Cor principal</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={brandingForm.primaryColor}
                        onChange={e => setBrandingForm(f => ({ ...f, primaryColor: e.target.value }))}
                        className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0" />
                      <input value={brandingForm.primaryColor}
                        onChange={e => setBrandingForm(f => ({ ...f, primaryColor: e.target.value }))}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">Cidade</label>
                    <input value={brandingForm.city} onChange={e => setBrandingForm(f => ({ ...f, city: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">Estado (UF)</label>
                    <input value={brandingForm.state} onChange={e => setBrandingForm(f => ({ ...f, state: e.target.value }))}
                      placeholder="SP" maxLength={2}
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm" />
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 rounded-xl border border-slate-600 bg-slate-900/50">
                  <p className="text-slate-500 text-xs mb-2">Preview do cabeçalho</p>
                  <div className="flex items-center gap-3">
                    {brandingForm.logoUrl ? (
                      <img src={brandingForm.logoUrl} className="w-10 h-10 rounded-xl object-cover" alt="" onError={e => (e.currentTarget.style.display = "none")} />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black"
                        style={{ background: brandingForm.primaryColor }}>
                        {brandingForm.name.charAt(0).toUpperCase() || "I"}
                      </div>
                    )}
                    <div>
                      <p className="text-white font-bold text-sm">{brandingForm.name || institution.name}</p>
                      <p className="text-xs" style={{ color: brandingForm.primaryColor }}>Portal Institucional</p>
                    </div>
                  </div>
                </div>

                {brandingMsg && (
                  <p className={`text-sm ${brandingMsg.ok ? "text-emerald-400" : "text-red-400"}`}>{brandingMsg.text}</p>
                )}
                <Button type="submit" disabled={savingBranding} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
                  {savingBranding ? "Salvando..." : "Salvar configurações"}
                </Button>
              </form>
            </div>

            {/* Contract info display */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-400" /> Contrato & Licença
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-500">Plano</p><p className="text-white">{planLabels[institution.planType ?? ""] ?? institution.planType ?? "—"}</p></div>
                <div><p className="text-slate-500">Limite de usuários</p><p className="text-white">{institution.maxUsers ?? "—"}</p></div>
                <div><p className="text-slate-500">Limite de professores</p><p className="text-white">{institution.maxTeachers ?? "—"}</p></div>
                {institution.contractEnd && (
                  <div>
                    <p className="text-slate-500">Vencimento</p>
                    <p className={new Date(institution.contractEnd) < new Date() ? "text-red-400 font-medium" : "text-emerald-400"}>
                      {new Date(institution.contractEnd).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-slate-600 text-xs mt-3">Para alterar plano ou contrato, entre em contato com <a href="mailto:contato@study.ia.br" className="text-violet-400">contato@study.ia.br</a></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
