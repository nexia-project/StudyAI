import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/react";
import { Brain, Shield, CheckCircle, XCircle, Users, RefreshCw, Crown, UserX, BookOpen, Plus, Trash2, FileText, GraduationCap, Building2, Globe, Database, Upload, Loader2, Search, Bell, Clock, TrendingUp, TrendingDown, BarChart3, Activity, Zap, AlertTriangle, Lock, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type User = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  stripeSubscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  role: string | null;
  createdAt: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; isPremium: boolean }> = {
  active:   { label: "Premium ativo", color: "emerald", isPremium: true },
  trialing: { label: "Trial ativo",   color: "blue",    isPremium: true },
  free:     { label: "Gratuito",      color: "gray",    isPremium: false },
  canceled: { label: "Cancelado",     color: "red",     isPremium: false },
  past_due: { label: "Pagamento atrasado", color: "yellow", isPremium: false },
};

type TeacherContent = {
  id: number;
  title: string;
  subject: string | null;
  grade_level: string | null;
  tags: string | null;
  file_name: string | null;
  content_preview: string | null;
  created_at: string;
};

type RoleRequest = {
  id: string;
  userId: string;
  requestedRole: string;
  status: string;
  school: string | null;
  subject: string | null;
  organ: string | null;
  position: string | null;
  cpf: string | null;
  message: string | null;
  createdAt: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

type AdminStats = {
  totalUsers: number;
  todayNewUsers: number;
  premiumUsers: number;
  teacherCount: number;
  govCount: number;
  todayActive: number;
  pendingRequests: number;
  plansPerDay: { day: string; count: number }[];
  simuladosPerDay: { day: string; count: number }[];
  newUsersPerDay: { day: string; count: number }[];
  recentUsers: { id: string; email: string; first_name: string; last_name: string; stripe_subscription_status: string; role: string; created_at: string }[];
  topMaterias: { materia: string; count: number; avg_score: number }[];
  activityHeatmap: { study_date: string; active_users: number }[];
};

export default function AdminPage() {
  const [, navigate] = useLocation();
  const { getToken } = useAuth();

  // Helper: fetch with Clerk Bearer token so it works in production with dev Clerk keys
  const adminFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getToken().catch(() => null);
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> ?? {}),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(url, { ...options, credentials: "include", headers });
  }, [getToken]);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"visao" | "solicitacoes" | "users" | "content" | "roles" | "knowledge">("visao");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [rrLoading, setRrLoading] = useState(false);
  const [rrReviewing, setRrReviewing] = useState<string | null>(null);
  const [rrMsg, setRrMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);
  const [roleMsg, setRoleMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tcList, setTcList] = useState<TeacherContent[]>([]);
  const [tcLoading, setTcLoading] = useState(false);
  const [tcForm, setTcForm] = useState({ title: "", subject: "", gradeLevel: "", contentText: "", tags: "" });
  const [tcSaving, setTcSaving] = useState(false);
  const [tcMessage, setTcMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Knowledge base state
  const [kbDocs, setKbDocs] = useState<Array<{ id: number; title: string; subject: string | null; preview: string; created_at: string }>>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbForm, setKbForm] = useState({ title: "", subject: "", contentText: "" });
  const [kbFile, setKbFile] = useState<File | null>(null);
  const [kbSaving, setKbSaving] = useState(false);
  const [kbMsg, setKbMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const kbFileRef = useRef<HTMLInputElement>(null);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/users");
      if (res.status === 401) {
        setError("Você precisa estar logado para acessar esta página.");
        return;
      }
      if (res.status === 403) {
        setError("Acesso negado. Apenas administradores podem ver esta página.");
        return;
      }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setError("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(userId: string, status: string) {
    setUpdating(userId);
    setMessage(null);
    try {
      const res = await adminFetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, stripeSubscriptionStatus: status } : u));
        setMessage({ text: `Status atualizado para "${STATUS_CONFIG[status]?.label ?? status}"!`, ok: true });
      } else {
        setMessage({ text: data.error ?? "Erro ao atualizar.", ok: false });
      }
    } catch {
      setMessage({ text: "Erro de conexão.", ok: false });
    } finally {
      setUpdating(null);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function fetchTeacherContent() {
    setTcLoading(true);
    try {
      const res = await adminFetch("/api/teacher-content");
      const data = await res.json();
      setTcList(data.content ?? []);
    } catch { /* ignore */ }
    finally { setTcLoading(false); }
  }

  async function saveTeacherContent(e: React.FormEvent) {
    e.preventDefault();
    setTcSaving(true);
    setTcMessage(null);
    try {
      const res = await adminFetch("/api/teacher-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: tcForm.title,
          subject: tcForm.subject || null,
          gradeLevel: tcForm.gradeLevel || null,
          contentText: tcForm.contentText,
          tags: tcForm.tags || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTcMessage({ ok: true, text: "Conteúdo salvo com sucesso!" });
        setTcForm({ title: "", subject: "", gradeLevel: "", contentText: "", tags: "" });
        fetchTeacherContent();
      } else {
        setTcMessage({ ok: false, text: data.error ?? "Erro ao salvar." });
      }
    } catch {
      setTcMessage({ ok: false, text: "Erro de conexão." });
    } finally {
      setTcSaving(false);
      setTimeout(() => setTcMessage(null), 4000);
    }
  }

  async function deleteTeacherContent(id: number) {
    if (!confirm("Remover este conteúdo?")) return;
    await adminFetch(`/api/teacher-content/${id}`, { method: "DELETE" });
    fetchTeacherContent();
  }

  async function updateRole(userId: string, role: string) {
    setRoleUpdating(userId);
    setRoleMsg(null);
    try {
      const res = await adminFetch("/api/government/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
        setRoleMsg({ ok: true, text: "Perfil atualizado com sucesso!" });
      } else {
        setRoleMsg({ ok: false, text: data.error ?? "Erro ao atualizar." });
      }
    } catch {
      setRoleMsg({ ok: false, text: "Erro de conexão." });
    } finally {
      setRoleUpdating(null);
      setTimeout(() => setRoleMsg(null), 3000);
    }
  }

  async function fetchKbDocs() {
    setKbLoading(true);
    try {
      const res = await adminFetch("/api/knowledge");
      const data = await res.json();
      setKbDocs(data.docs ?? []);
    } catch { /* ignore */ }
    finally { setKbLoading(false); }
  }

  async function saveKbText(e: React.FormEvent) {
    e.preventDefault();
    if (!kbForm.title || !kbForm.contentText) return;
    setKbSaving(true);
    setKbMsg(null);
    try {
      const res = await adminFetch("/api/knowledge/upload-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: kbForm.title, subject: kbForm.subject || null, contentText: kbForm.contentText }),
      });
      const data = await res.json();
      if (res.ok) {
        setKbMsg({ ok: true, text: "Documento adicionado à base de conhecimento!" });
        setKbForm({ title: "", subject: "", contentText: "" });
        fetchKbDocs();
      } else {
        setKbMsg({ ok: false, text: data.erro ?? "Erro ao salvar." });
      }
    } catch {
      setKbMsg({ ok: false, text: "Erro de conexão." });
    } finally {
      setKbSaving(false);
      setTimeout(() => setKbMsg(null), 4000);
    }
  }

  async function saveKbFile(e: React.FormEvent) {
    e.preventDefault();
    if (!kbFile) return;
    setKbSaving(true);
    setKbMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", kbFile);
      if (kbForm.title) fd.append("title", kbForm.title);
      if (kbForm.subject) fd.append("subject", kbForm.subject);
      const res = await adminFetch("/api/knowledge/upload-file", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        setKbMsg({ ok: true, text: "Arquivo processado e adicionado à base de conhecimento!" });
        setKbFile(null);
        setKbForm({ title: "", subject: "", contentText: "" });
        fetchKbDocs();
      } else {
        setKbMsg({ ok: false, text: data.erro ?? "Erro ao processar arquivo." });
      }
    } catch {
      setKbMsg({ ok: false, text: "Erro de conexão." });
    } finally {
      setKbSaving(false);
      setTimeout(() => setKbMsg(null), 4000);
    }
  }

  async function deleteKbDoc(id: number) {
    if (!confirm("Remover este documento da base de conhecimento?")) return;
    await adminFetch(`/api/knowledge/${id}`, { method: "DELETE" });
    fetchKbDocs();
  }

  async function fetchRoleRequests() {
    setRrLoading(true);
    try {
      const res = await adminFetch("/api/admin/role-requests");
      const data = await res.json();
      setRoleRequests(data.requests ?? []);
    } catch { /* ignore */ }
    finally { setRrLoading(false); }
  }

  async function reviewRequest(id: string, action: "approve" | "reject") {
    setRrReviewing(id);
    setRrMsg(null);
    try {
      const res = await adminFetch(`/api/admin/role-requests/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setRrMsg({ ok: true, text: action === "approve" ? "Acesso aprovado! Usuário promovido." : "Solicitação rejeitada." });
        setRoleRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === "approve" ? "approved" : "rejected" } : r));
      } else {
        setRrMsg({ ok: false, text: data.error ?? "Erro ao processar" });
      }
    } catch {
      setRrMsg({ ok: false, text: "Erro de conexão" });
    } finally {
      setRrReviewing(null);
      setTimeout(() => setRrMsg(null), 4000);
    }
  }

  async function fetchStats() {
    setStatsLoading(true);
    try {
      const res = await adminFetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
    finally { setStatsLoading(false); }
  }

  useEffect(() => { fetchUsers(); fetchRoleRequests(); fetchStats(); }, []);
  useEffect(() => { if (activeTab === "content") fetchTeacherContent(); }, [activeTab]);
  useEffect(() => { if (activeTab === "knowledge") fetchKbDocs(); }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-white/50 mb-6">{error}</p>
          <Button onClick={() => {
            sessionStorage.setItem("auth_return_to", "/admin");
            navigate("/sign-in");
          }} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl mr-3">
            Fazer Login
          </Button>
          <Button variant="outline" className="border-white/10 text-white/70 hover:bg-white/5" onClick={() => navigate("/app")}>
            Voltar ao App
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">StudyAI</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
              <Shield className="w-3 h-3" /> Admin
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchUsers}
              className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Atualizar
            </button>
            <Button variant="outline" className="border-white/10 text-white/70 hover:bg-white/5 text-sm" onClick={() => navigate("/app")}>
              ← Voltar ao app
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">Painel Admin</h1>
          <p className="text-white/50">Gerencie usuários e conteúdo de professores parceiros.</p>
        </div>

        <div className="flex gap-2 mb-8 border-b border-white/10 pb-0 overflow-x-auto">
          {[
            { key: "visao", label: "Visão Geral", icon: BarChart3 },
            { key: "solicitacoes", label: "Solicitações", icon: Bell, badge: roleRequests.filter(r => r.status === "pending").length },
            { key: "users", label: "Usuários", icon: Users },
            { key: "roles", label: "Perfis & Acesso", icon: Shield },
            { key: "content", label: "Conteúdo", icon: BookOpen },
            { key: "knowledge", label: "Base de Conhecimento", icon: Database },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.key
                  ? "border-violet-500 text-violet-400"
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {"badge" in tab && (tab as any).badge > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-black">
                  {(tab as any).badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "visao" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Dashboard Operacional</h2>
                <p className="text-white/40 text-sm mt-0.5">Métricas em tempo real da plataforma</p>
              </div>
              <button onClick={fetchStats} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors">
                <RefreshCw className={`w-4 h-4 ${statsLoading ? "animate-spin" : ""}`} /> Atualizar
              </button>
            </div>

            {statsLoading && !stats && (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
              </div>
            )}

            {stats && (
              <>
                {/* KPI Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Total de Usuários", value: stats.totalUsers.toLocaleString("pt-BR"), icon: Users, color: "from-violet-500 to-purple-600", sub: "cadastrados" },
                    { label: "Ativos Hoje", value: stats.todayActive.toLocaleString("pt-BR"), icon: Activity, color: "from-emerald-500 to-teal-600", sub: "estudando" },
                    { label: "Novos Hoje", value: stats.todayNewUsers.toLocaleString("pt-BR"), icon: UserPlus, color: "from-blue-500 to-indigo-600", sub: "cadastros" },
                    { label: "Premium", value: stats.premiumUsers.toLocaleString("pt-BR"), icon: Crown, color: "from-amber-500 to-orange-600", sub: "assinantes" },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center flex-shrink-0`}>
                        <kpi.icon className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-white leading-none">{kpi.value}</p>
                        <p className="text-xs text-white/40 font-medium mt-0.5">{kpi.label}</p>
                        <p className="text-[10px] text-white/25">{kpi.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Distribuição de usuários */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { label: "Professores", value: stats.teacherCount, icon: GraduationCap, color: "text-blue-400" },
                    { label: "Governo", value: stats.govCount, icon: Globe, color: "text-emerald-400" },
                    { label: "Solicitações Pendentes", value: stats.pendingRequests, icon: Bell, color: "text-amber-400" },
                  ].map((item) => (
                    <div key={item.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                      <item.icon className={`w-8 h-8 ${item.color}`} />
                      <div>
                        <p className="text-xl font-black text-white">{item.value.toLocaleString("pt-BR")}</p>
                        <p className="text-xs text-white/40">{item.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Novos usuários chart */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white/70 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" /> Novos usuários — últimos 7 dias
                    </h3>
                    {stats.newUsersPerDay.length === 0 ? (
                      <p className="text-white/30 text-xs text-center py-8">Sem dados de novos usuários</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={150}>
                        <AreaChart data={stats.newUsersPerDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} />
                          <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 11 }} />
                          <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="url(#gradUsers)" strokeWidth={2} name="Novos usuários" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Planos de estudo chart */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white/70 mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" /> Planos criados — últimos 7 dias
                    </h3>
                    {stats.plansPerDay.length === 0 ? (
                      <p className="text-white/30 text-xs text-center py-8">Nenhum plano criado ainda</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={stats.plansPerDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} />
                          <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 11 }} />
                          <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Planos" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Top Matérias + Atividade */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Top matérias */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white/70 mb-4 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-400" /> Matérias mais estudadas
                    </h3>
                    {stats.topMaterias.length === 0 ? (
                      <p className="text-white/30 text-xs text-center py-8">Nenhum simulado realizado ainda</p>
                    ) : (
                      <div className="space-y-2">
                        {stats.topMaterias.map((m, i) => (
                          <div key={m.materia} className="flex items-center gap-3">
                            <span className="text-white/30 text-xs w-4 font-bold">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <p className="text-xs text-white/80 font-semibold truncate">{m.materia}</p>
                                <span className="text-[10px] text-white/40 ml-2 shrink-0">{m.count} simulado{m.count !== 1 ? "s" : ""}</span>
                              </div>
                              <div className="w-full bg-white/10 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                                  style={{ width: `${Math.min(100, m.avg_score)}%` }}
                                />
                              </div>
                            </div>
                            <span className={`text-xs font-black shrink-0 ${m.avg_score >= 70 ? "text-emerald-400" : m.avg_score >= 50 ? "text-amber-400" : "text-red-400"}`}>
                              {m.avg_score.toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Usuários recentes */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white/70 mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-violet-400" /> Cadastros recentes
                    </h3>
                    <div className="space-y-2">
                      {stats.recentUsers.map((u) => {
                        const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || u.id.slice(0, 8);
                        const status = u.stripe_subscription_status;
                        return (
                          <div key={u.id} className="flex items-center gap-3 py-1">
                            <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-black text-violet-400">{(name[0] || "?").toUpperCase()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white/80 font-semibold truncate">{name}</p>
                              <p className="text-[10px] text-white/30">{u.email}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status === "active" || status === "trialing" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/30"}`}>
                              {status === "active" ? "Premium" : status === "trialing" ? "Trial" : "Free"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Ações rápidas */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-white/70 mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" /> Ações Rápidas
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Gerenciar Usuários", icon: Users, tab: "users", color: "bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20 text-violet-400" },
                      { label: "Solicitações Pendentes", icon: Bell, tab: "solicitacoes", color: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400" },
                      { label: "Upload Conteúdo", icon: Upload, tab: "content", color: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-400" },
                      { label: "Base de Conhecimento", icon: Database, tab: "knowledge", color: "bg-teal-500/10 hover:bg-teal-500/20 border-teal-500/20 text-teal-400" },
                    ].map((action) => (
                      <button
                        key={action.label}
                        onClick={() => setActiveTab(action.tab as any)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${action.color}`}
                      >
                        <action.icon className="w-5 h-5" />
                        <span className="text-xs font-bold text-center leading-tight">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sistema status */}
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <p className="text-sm font-bold text-emerald-400">Status do Sistema: Online</p>
                    <p className="text-xs text-white/30">API, banco de dados e servidor funcionando normalmente</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "solicitacoes" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-black flex items-center gap-2">
                <Bell className="w-5 h-5 text-violet-400" /> Solicitações de Acesso
              </h2>
              <button onClick={fetchRoleRequests} className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm">
                <RefreshCw className={`w-4 h-4 ${rrLoading ? "animate-spin" : ""}`} /> Atualizar
              </button>
            </div>
            {rrMsg && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold ${rrMsg.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-300"}`}>
                {rrMsg.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {rrMsg.text}
              </div>
            )}
            {rrLoading ? (
              <div className="flex items-center justify-center py-12"><RefreshCw className="w-6 h-6 text-violet-400 animate-spin" /></div>
            ) : roleRequests.length === 0 ? (
              <div className="bg-white/5 rounded-2xl p-10 border border-white/10 text-center">
                <Bell className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Nenhuma solicitação no momento</p>
              </div>
            ) : (
              <div className="space-y-3">
                {roleRequests.map(r => {
                  const isPending = r.status === "pending";
                  const isApproved = r.status === "approved";
                  const roleLabel = r.requestedRole === "teacher" ? "👨‍🏫 Professor" : r.requestedRole === "government" ? "🏛️ Governo" : r.requestedRole;
                  const name = [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email || r.userId;
                  return (
                    <div key={r.id} className={`bg-white/5 rounded-2xl p-5 border transition-all ${isPending ? "border-amber-500/30" : isApproved ? "border-emerald-500/30" : "border-red-500/20 opacity-60"}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold text-white text-sm">{name}</span>
                            <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30">{roleLabel}</span>
                            {isPending && <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1"><Clock className="w-3 h-3" />Pendente</span>}
                            {isApproved && <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Aprovado</span>}
                            {r.status === "rejected" && <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30 flex items-center gap-1"><XCircle className="w-3 h-3" />Rejeitado</span>}
                          </div>
                          <p className="text-white/40 text-xs mb-2">{r.email}</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/60">
                            {r.school && <span><span className="text-white/30">Escola:</span> {r.school}</span>}
                            {r.subject && <span><span className="text-white/30">Disciplina:</span> {r.subject}</span>}
                            {r.organ && <span><span className="text-white/30">Órgão:</span> {r.organ}</span>}
                            {r.position && <span><span className="text-white/30">Cargo:</span> {r.position}</span>}
                            {r.cpf && <span><span className="text-white/30">CPF:</span> {r.cpf}</span>}
                          </div>
                          {r.message && <p className="text-white/50 text-xs mt-2 italic">"{r.message}"</p>}
                          <p className="text-white/20 text-xs mt-2">{new Date(r.createdAt).toLocaleString("pt-BR")}</p>
                        </div>
                        {isPending && (
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <Button
                              onClick={() => reviewRequest(r.id, "approve")}
                              disabled={rrReviewing === r.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-xl h-auto"
                            >
                              {rrReviewing === r.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3 h-3 mr-1" />Aprovar</>}
                            </Button>
                            <Button
                              onClick={() => reviewRequest(r.id, "reject")}
                              disabled={rrReviewing === r.id}
                              variant="outline"
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs px-4 py-2 rounded-xl h-auto"
                            >
                              {rrReviewing === r.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <><XCircle className="w-3 h-3 mr-1" />Rejeitar</>}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "content" && (
          <div className="space-y-6">
            {tcMessage && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold ${tcMessage.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-300"}`}>
                {tcMessage.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {tcMessage.text}
              </div>
            )}
            <form onSubmit={saveTeacherContent} className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
              <h2 className="text-lg font-black flex items-center gap-2"><Plus className="w-5 h-5 text-violet-400" /> Adicionar Conteúdo</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/50 font-bold mb-1">Título *</label>
                  <input required value={tcForm.title} onChange={e => setTcForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Funções do 2° grau – Resumão" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 font-bold mb-1">Matéria</label>
                  <input value={tcForm.subject} onChange={e => setTcForm(p => ({ ...p, subject: e.target.value }))} placeholder="Ex: Matemática" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 font-bold mb-1">Série / Nível</label>
                  <input value={tcForm.gradeLevel} onChange={e => setTcForm(p => ({ ...p, gradeLevel: e.target.value }))} placeholder="Ex: 2° Ano EM / ENEM / Concurso" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 font-bold mb-1">Tags (separadas por vírgula)</label>
                  <input value={tcForm.tags} onChange={e => setTcForm(p => ({ ...p, tags: e.target.value }))} placeholder="Ex: equação, bhaskara, vestibular" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/50 font-bold mb-1">Conteúdo / Material didático *</label>
                <textarea required value={tcForm.contentText} onChange={e => setTcForm(p => ({ ...p, contentText: e.target.value }))} rows={6} placeholder="Cole aqui o texto do material didático, resumo, exercícios, etc." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 resize-none" />
              </div>
              <Button type="submit" disabled={tcSaving} className="bg-violet-600 hover:bg-violet-700 text-white font-bold">
                {tcSaving ? "Salvando..." : "Salvar Conteúdo"}
              </Button>
            </form>

            <div className="space-y-3">
              <h2 className="text-lg font-black flex items-center gap-2"><FileText className="w-5 h-5 text-violet-400" /> Conteúdos Cadastrados ({tcList.length})</h2>
              {tcLoading ? (
                <div className="text-center py-8 text-white/30">Carregando...</div>
              ) : tcList.length === 0 ? (
                <div className="text-center py-8 text-white/30 bg-white/3 rounded-2xl border border-white/5">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum conteúdo cadastrado ainda.</p>
                </div>
              ) : (
                tcList.map(c => (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
                    <div>
                      <p className="font-bold text-white">{c.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {[c.subject, c.grade_level].filter(Boolean).join(" · ")}
                        {c.tags && <span className="ml-2 text-violet-400/70"># {c.tags}</span>}
                      </p>
                    </div>
                    <button onClick={() => deleteTeacherContent(c.id)} className="ml-4 p-2 text-white/30 hover:text-red-400 transition-colors rounded-xl hover:bg-red-500/10">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "roles" && (
          <div className="space-y-4">
            {roleMsg && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold ${roleMsg.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-300"}`}>
                {roleMsg.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {roleMsg.text}
              </div>
            )}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-2">
              <p className="text-white/50 text-sm">Atribua perfis especiais aos usuários para liberar acesso ao Módulo Professor, Instituição ou Governo.</p>
              <div className="flex gap-4 mt-3 flex-wrap">
                {[
                  { role: "teacher", label: "Professor", icon: GraduationCap, color: "text-indigo-400" },
                  { role: "institution_admin", label: "Admin de Instituição", icon: Building2, color: "text-emerald-400" },
                  { role: "government", label: "Governo", icon: Globe, color: "text-amber-400" },
                  { role: "admin", label: "Super Admin", icon: Shield, color: "text-red-400" },
                ].map(r => (
                  <div key={r.role} className="flex items-center gap-1.5 text-sm">
                    <r.icon className={`w-4 h-4 ${r.color}`} />
                    <span className={r.color}>{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {users.map(user => {
                  const currentRole = user.role ?? "student";
                  const isUpdating = roleUpdating === user.id;
                  return (
                    <div key={user.id} className="flex items-center gap-4 bg-white/[0.04] border border-white/8 rounded-2xl px-5 py-3">
                      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {((user.firstName ?? user.email ?? "?")[0]).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Sem nome"}
                        </p>
                        <p className="text-white/30 text-xs truncate">{user.email}</p>
                      </div>
                      <select
                        value={currentRole}
                        onChange={e => updateRole(user.id, e.target.value)}
                        disabled={isUpdating}
                        className="bg-slate-800 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-50"
                      >
                        <option value="student">Aluno</option>
                        <option value="teacher">Professor</option>
                        <option value="institution_admin">Admin de Instituição</option>
                        <option value="government">Governo</option>
                        <option value="admin">Super Admin</option>
                      </select>
                      {isUpdating && <div className="w-4 h-4 rounded-full border border-violet-400 border-t-transparent animate-spin flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "users" && message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-6 border text-sm font-semibold ${
              message.ok
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-red-500/10 border-red-500/20 text-red-300"
            }`}
          >
            {message.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {message.text}
          </motion.div>
        )}

        {activeTab === "users" && loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        )}

        {activeTab === "users" && error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-300 font-semibold">{error}</p>
          </div>
        )}

        {activeTab === "users" && !loading && !error && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <Users className="w-5 h-5 text-violet-400" />
              <span className="text-white/60 text-sm"><strong className="text-white">{users.length}</strong> usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}</span>
              <div className="ml-auto flex gap-4 text-sm text-white/40">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  Premium: {users.filter(u => u.stripeSubscriptionStatus === "active" || u.stripeSubscriptionStatus === "trialing").length}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white/20 inline-block" />
                  Gratuito: {users.filter(u => !u.stripeSubscriptionStatus || u.stripeSubscriptionStatus === "free" || u.stripeSubscriptionStatus === "canceled").length}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {users.map((user) => {
                const status = user.stripeSubscriptionStatus ?? "free";
                const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.free;
                const isPremium = cfg.isPremium;
                const isUpdating = updating === user.id;

                return (
                  <motion.div
                    key={user.id}
                    layout
                    className="rounded-2xl border border-white/8 bg-white/[0.04] p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    {/* Avatar + info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-base ${isPremium ? "bg-gradient-to-br from-violet-500 to-purple-600" : "bg-white/10"}`}>
                        {((user.firstName ?? user.email ?? "?")[0]).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold truncate">
                          {user.firstName || user.lastName
                            ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
                            : "Sem nome"}
                          {isPremium && <Crown className="w-3.5 h-3.5 text-yellow-400 inline ml-1.5 mb-0.5" />}
                        </p>
                        <p className="text-white/40 text-sm truncate">{user.email ?? "Sem email"}</p>
                        <p className="text-white/25 text-xs mt-0.5">
                          ID: {user.id} · Entrou em {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black border ${
                      cfg.color === "emerald" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" :
                      cfg.color === "blue"    ? "bg-blue-500/10 border-blue-500/20 text-blue-300" :
                      cfg.color === "yellow"  ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-300" :
                      cfg.color === "red"     ? "bg-red-500/10 border-red-500/20 text-red-300" :
                                                "bg-white/5 border-white/10 text-white/40"
                    }`}>
                      {cfg.label}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      {!isPremium ? (
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs h-9 px-4"
                          onClick={() => updateStatus(user.id, "active")}
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <div className="w-3.5 h-3.5 rounded-full border border-white border-t-transparent animate-spin" />
                          ) : (
                            <><Crown className="w-3.5 h-3.5 mr-1.5" /> Dar Premium</>
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10 text-white/60 hover:bg-white/5 font-bold text-xs h-9 px-4"
                          onClick={() => updateStatus(user.id, "free")}
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <div className="w-3.5 h-3.5 rounded-full border border-white/40 border-t-transparent animate-spin" />
                          ) : (
                            <><UserX className="w-3.5 h-3.5 mr-1.5" /> Remover Premium</>
                          )}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {users.length === 0 && (
                <div className="text-center py-16 text-white/30">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum usuário cadastrado ainda.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Base de Conhecimento ────────────────────────────────────────── */}
        {activeTab === "knowledge" && (
          <div className="space-y-8">
            <div className="flex items-center gap-3 mb-1">
              <Database className="w-5 h-5 text-violet-400" />
              <div>
                <p className="font-bold">Base de Conhecimento do Sistema</p>
                <p className="text-white/40 text-xs mt-0.5">Documentos adicionados aqui são consultados pelo Professor Tiagão e pelo Tutor antes de buscar informações externas.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Upload Text */}
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-violet-400" /> Adicionar por Texto</h3>
                <form onSubmit={saveKbText} className="space-y-3">
                  <input
                    value={kbForm.title}
                    onChange={e => setKbForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Título do documento *"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500"
                  />
                  <input
                    value={kbForm.subject}
                    onChange={e => setKbForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Matéria (ex: Matemática, Biologia)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500"
                  />
                  <textarea
                    value={kbForm.contentText}
                    onChange={e => setKbForm(f => ({ ...f, contentText: e.target.value }))}
                    placeholder="Cole o conteúdo do documento aqui... *"
                    required
                    rows={5}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={kbSaving || !kbForm.title || !kbForm.contentText}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    {kbSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Plus className="w-4 h-4" /> Adicionar à Base</>}
                  </button>
                </form>
              </div>

              {/* Upload File */}
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Upload className="w-4 h-4 text-violet-400" /> Carregar Arquivo (PDF / DOCX / TXT)</h3>
                <form onSubmit={saveKbFile} className="space-y-3">
                  <input
                    value={kbForm.title}
                    onChange={e => setKbForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Título (ou usa o nome do arquivo)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500"
                  />
                  <input
                    value={kbForm.subject}
                    onChange={e => setKbForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Matéria (ex: Física, História)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500"
                  />
                  <div
                    onClick={() => kbFileRef.current?.click()}
                    className="border-2 border-dashed border-white/15 rounded-2xl p-6 text-center cursor-pointer hover:border-violet-500/50 transition-colors"
                  >
                    {kbFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="w-5 h-5 text-violet-400" />
                        <span className="text-sm font-semibold text-white">{kbFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto mb-2 text-white/30" />
                        <p className="text-sm text-white/40">Clique para selecionar PDF, DOCX ou TXT</p>
                        <p className="text-xs text-white/25 mt-1">Máximo 25 MB</p>
                      </>
                    )}
                    <input
                      ref={kbFileRef}
                      type="file"
                      accept=".pdf,.txt,.docx,.doc"
                      className="hidden"
                      onChange={e => setKbFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={kbSaving || !kbFile}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    {kbSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><Upload className="w-4 h-4" /> Processar e Adicionar</>}
                  </button>
                </form>
              </div>
            </div>

            {kbMsg && (
              <div className={`px-4 py-3 rounded-xl text-sm font-semibold ${kbMsg.ok ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-red-500/10 text-red-300 border border-red-500/20"}`}>
                {kbMsg.text}
              </div>
            )}

            {/* Doc list */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="font-bold">Documentos na Base ({kbDocs.length})</h3>
                <button onClick={fetchKbDocs} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5 text-white/40" />
                </button>
              </div>
              {kbLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
              ) : kbDocs.length === 0 ? (
                <div className="text-center py-12 text-white/30 border border-white/8 rounded-2xl">
                  <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum documento na base ainda.</p>
                  <p className="text-xs mt-1">Adicione conteúdo para o Tiagão consultar!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {kbDocs.map((doc: any) => (
                    <div key={doc.id} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-sm truncate">{doc.title}</p>
                          {doc.subject && (
                            <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-semibold flex-shrink-0">
                              {doc.subject}
                            </span>
                          )}
                        </div>
                        <p className="text-white/40 text-xs line-clamp-2">{doc.preview}</p>
                        <p className="text-white/25 text-xs mt-1">Adicionado em {new Date(doc.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <button
                        onClick={() => deleteKbDoc(doc.id)}
                        className="p-2 rounded-xl hover:bg-red-500/10 hover:text-red-400 text-white/30 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
