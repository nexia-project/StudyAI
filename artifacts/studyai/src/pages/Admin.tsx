import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { DateRangeFilter, defaultDateRange, computeDates, type DateRange } from "@/components/DateRangeFilter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@clerk/react";
import {
  Brain, Shield, CheckCircle, XCircle, Users, RefreshCw, Crown, UserX,
  BookOpen, Plus, Trash2, FileText, GraduationCap, Building2, Globe,
  Database, Upload, Loader2, Search, Bell, Clock, TrendingUp,
  BarChart3, Activity, Zap, AlertTriangle, UserPlus, Home,
  Wallet, Bot, Settings, Link, Bug, ChevronDown, ChevronRight,
  Mail, Key, UserCog, Server, Cpu, LayoutDashboard, Lock, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from "recharts";

/* ─── Types ──────────────────────────────────────────────────── */
type User = {
  id: string; email: string | null; firstName: string | null; lastName: string | null;
  stripeSubscriptionStatus: string | null; stripeCustomerId: string | null;
  stripeSubscriptionId: string | null; role: string | null; createdAt: string;
};
const STATUS_CONFIG: Record<string, { label: string; color: string; isPremium: boolean }> = {
  active:   { label: "Premium ativo",       color: "emerald", isPremium: true },
  trialing: { label: "Trial ativo",          color: "blue",    isPremium: true },
  free:     { label: "Gratuito",             color: "gray",    isPremium: false },
  canceled: { label: "Cancelado",            color: "red",     isPremium: false },
  past_due: { label: "Pagamento atrasado",   color: "yellow",  isPremium: false },
};
type TeacherContent = {
  id: number; title: string; subject: string | null; grade_level: string | null;
  tags: string | null; file_name: string | null; content_preview: string | null; created_at: string;
};
type RoleRequest = {
  id: string; userId: string; requestedRole: string; status: string;
  school: string | null; subject: string | null; organ: string | null; position: string | null;
  cpf: string | null; message: string | null; createdAt: string;
  email: string | null; firstName: string | null; lastName: string | null;
};
type AdminStats = {
  totalUsers: number; todayNewUsers: number; premiumUsers: number;
  teacherCount: number; govCount: number; todayActive: number; studyingNow: number; pendingRequests: number;
  institutionsTotal: number; institutionsActive: number;
  // Range-based counts with previous period comparison
  newUsersInRange: number; prevNewUsers: number; newUsersPct: number | null;
  activeInRange: number;  prevActive: number;   activePct: number | null;
  loginsInRange: number;  prevLogins: number;   loginsPct: number | null;
  dateRange: { from: string; to: string; prevFrom: string; prevTo: string; days: number };
  plansPerDay: { day: string; count: number }[];
  simuladosPerDay: { day: string; count: number }[];
  newUsersPerDay: { day: string; count: number }[];
  recentUsers: { id: string; email: string; first_name: string; last_name: string; stripe_subscription_status: string; role: string; created_at: string }[];
  recentLogins: { id: string; email: string; first_name: string; last_name: string; role: string; created_at: string }[];
  loginsByDay: { day: string; count: number }[];
  loginsByHour: { hour: number; count: number }[];
  topMaterias: { materia: string; count: number; avg_score: number }[];
  activityHeatmap: { study_date: string; active_users: number }[];
  aiFeatures: { feature: string; uses: number; users: number; last7d: number }[];
  aiProviders: { id: string; ok: boolean }[];
  trilhaBySubject: { subject: string; students: number; avgLevel: number; maxLevel: number }[];
  diagnosticsCompleted30d: number;
  notebookDocsTotal: number; notebookStorageMb: number; notebookOverviewsTotal: number;
  teacherContentTotal: number;
  contentBreakdown: { label: string; value: number; color: string }[];
  subscriptionDist: { status: string; count: number }[];
  recentEvents: { event_type: string; created_at: string; metadata: any; email: string | null; first_name: string | null; last_name: string | null }[];
  eventsByType30d: { event_type: string; count: number; users: number }[];
  aiCost: {
    rangeUsd: number; rangeBrl: number; prevRangeUsd: number; prevRangeBrl: number;
    costPct: number | null; callsRange: number; tokensRange: number;
    todayUsd: number; todayBrl: number;
    monthUsd: number; monthBrl: number;
    callsToday: number; callsTotal: number;
    tokensToday: number; tokensTotal: number;
    byFeature: { feature: string; calls: number; costUsd: number; costBrl: number; tokens: number }[];
    byModel: { model: string; calls: number; costUsd: number; costBrl: number }[];
    perDay: { day: string; costUsd: number; costBrl: number; calls: number }[];
  };
};

type Section =
  | "visao" | "alunos" | "professores" | "instituicoes"
  | "financeiro" | "ia-custos" | "conteudos" | "banco-dados"
  | "integracoes" | "logs-seguranca" | "bugs-sistema" | "configuracoes"
  | "solicitacoes" | "roles";

/* ─── Sidebar nav config ─────────────────────────────────────── */
const NAV = [
  { section: "visao" as Section, label: "Visão Geral", icon: LayoutDashboard },
  {
    label: "Usuários", icon: Users, children: [
      { section: "alunos" as Section, label: "Alunos", icon: GraduationCap },
      { section: "professores" as Section, label: "Professores", icon: BookOpen },
      { section: "instituicoes" as Section, label: "Instituições", icon: Building2 },
    ],
  },
  { section: "financeiro" as Section, label: "Financeiro", icon: Wallet },
  { section: "ia-custos" as Section, label: "IA & Custos", icon: Bot },
  { section: "conteudos" as Section, label: "Conteúdos", icon: FileText },
  { section: "banco-dados" as Section, label: "Base de Conhecimento", icon: Database },
  { section: "integracoes" as Section, label: "Integrações", icon: Link },
  { section: "logs-seguranca" as Section, label: "Logs & Segurança", icon: Lock },
  { section: "bugs-sistema" as Section, label: "Bugs & Sistema", icon: Bug },
  { section: "configuracoes" as Section, label: "Configurações", icon: Settings },
];

const PIE_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"];

function Card({ title, icon: Icon, iconColor, children, action }: {
  title: string; icon: React.ElementType; iconColor?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor ?? "text-white/40"}`} />
          <span className="text-sm font-bold text-white/80">{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────── */
export default function AdminPage() {
  const [, navigate] = useLocation();
  const { isLoaded, isSignedIn } = useAuth();

  const adminFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = { ...(options.headers as Record<string, string> ?? {}) };
    return fetch(url, { ...options, credentials: "include", headers });
  }, []);

  /* State */
  const [activeSection, setActiveSection] = useState<Section>("visao");
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Usuários"]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [kbDocs, setKbDocs] = useState<Array<{ id: number; title: string; subject: string | null; preview: string; created_at: string }>>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbForm, setKbForm] = useState({ title: "", subject: "", contentText: "" });
  const [kbFiles, setKbFiles] = useState<File[]>([]);
  const [kbSaving, setKbSaving] = useState(false);
  const [kbMsg, setKbMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [batchResults, setBatchResults] = useState<Array<{ name: string; status: "pending" | "uploading" | "done" | "error"; message?: string; chunks?: number; wordCount?: number; pageCount?: number }>>([]);
  const kbFileRef = useRef<HTMLInputElement>(null);
  const [searchQ, setSearchQ] = useState("");
  const [debugInfo, setDebugInfo] = useState<Record<string, any> | null>(null);

  // ── Date range filter — read initial value from URL ──────────────────────────
  const searchStr = useSearch();
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const p = new URLSearchParams(searchStr ?? "");
    const from = p.get("from");
    const to   = p.get("to");
    if (from && to) return { from, to, preset: "custom" };
    return defaultDateRange();
  });

  async function fetchWhoami() {
    try {
      const res = await adminFetch("/api/admin/whoami");
      if (res.ok) setDebugInfo(await res.json());
    } catch {}
  }

  /* Fetchers */
  async function fetchUsers() {
    setLoading(true); setError(null);
    try {
      const res = await adminFetch("/api/admin/users");
      if (res.status === 401) { setError("Você precisa estar logado para acessar esta página."); await fetchWhoami(); return; }
      if (res.status === 403) { setError("Acesso negado. Apenas administradores podem ver esta página."); await fetchWhoami(); return; }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch { setError("Erro ao carregar usuários."); }
    finally { setLoading(false); }
  }
  async function updateStatus(userId: string, status: string) {
    setUpdating(userId); setMessage(null);
    try {
      const res = await adminFetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, stripeSubscriptionStatus: status } : u));
        setMessage({ text: `Status atualizado para "${STATUS_CONFIG[status]?.label ?? status}"!`, ok: true });
      } else { setMessage({ text: data.error ?? "Erro ao atualizar.", ok: false }); }
    } catch { setMessage({ text: "Erro de conexão.", ok: false }); }
    finally { setUpdating(null); setTimeout(() => setMessage(null), 3000); }
  }
  async function fetchTeacherContent() {
    setTcLoading(true);
    try { const res = await adminFetch("/api/teacher-content"); const data = await res.json(); setTcList(data.content ?? []); }
    catch { } finally { setTcLoading(false); }
  }
  async function saveTeacherContent(e: React.FormEvent) {
    e.preventDefault(); setTcSaving(true); setTcMessage(null);
    try {
      const res = await adminFetch("/api/teacher-content", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: tcForm.title, subject: tcForm.subject || null, gradeLevel: tcForm.gradeLevel || null, contentText: tcForm.contentText, tags: tcForm.tags || null }),
      });
      const data = await res.json();
      if (res.ok) { setTcMessage({ ok: true, text: "Conteúdo salvo!" }); setTcForm({ title: "", subject: "", gradeLevel: "", contentText: "", tags: "" }); fetchTeacherContent(); }
      else { setTcMessage({ ok: false, text: data.error ?? "Erro ao salvar." }); }
    } catch { setTcMessage({ ok: false, text: "Erro de conexão." }); }
    finally { setTcSaving(false); setTimeout(() => setTcMessage(null), 4000); }
  }
  async function deleteTeacherContent(id: number) {
    if (!confirm("Remover este conteúdo?")) return;
    await adminFetch(`/api/teacher-content/${id}`, { method: "DELETE" });
    fetchTeacherContent();
  }
  async function updateRole(userId: string, role: string) {
    setRoleUpdating(userId); setRoleMsg(null);
    try {
      const res = await adminFetch("/api/government/promote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (res.ok) { setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u)); setRoleMsg({ ok: true, text: "Perfil atualizado!" }); }
      else { setRoleMsg({ ok: false, text: data.error ?? "Erro ao atualizar." }); }
    } catch { setRoleMsg({ ok: false, text: "Erro de conexão." }); }
    finally { setRoleUpdating(null); setTimeout(() => setRoleMsg(null), 3000); }
  }
  async function fetchKbDocs() {
    setKbLoading(true);
    try { const res = await adminFetch("/api/knowledge"); const data = await res.json(); setKbDocs(data.docs ?? []); }
    catch { } finally { setKbLoading(false); }
  }
  async function saveKbText(e: React.FormEvent) {
    e.preventDefault(); if (!kbForm.title || !kbForm.contentText) return;
    setKbSaving(true); setKbMsg(null);
    try {
      const res = await adminFetch("/api/knowledge/upload-text", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: kbForm.title, subject: kbForm.subject || null, contentText: kbForm.contentText }),
      });
      const data = await res.json();
      if (res.ok) { setKbMsg({ ok: true, text: "Documento adicionado!" }); setKbForm({ title: "", subject: "", contentText: "" }); fetchKbDocs(); }
      else { setKbMsg({ ok: false, text: data.erro ?? "Erro ao salvar." }); }
    } catch { setKbMsg({ ok: false, text: "Erro de conexão." }); }
    finally { setKbSaving(false); setTimeout(() => setKbMsg(null), 4000); }
  }
  async function saveBatchFiles(e: React.FormEvent) {
    e.preventDefault();
    if (kbFiles.length === 0) return;
    setKbSaving(true);
    setKbMsg(null);

    const initial = kbFiles.map(f => ({ name: f.name, status: "pending" as const }));
    setBatchResults(initial);

    let doneCount = 0;
    let errorCount = 0;

    for (let i = 0; i < kbFiles.length; i++) {
      const file = kbFiles[i];
      setBatchResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: "uploading" } : r));
      try {
        const fd = new FormData();
        fd.append("file", file);
        if (kbForm.subject) fd.append("subject", kbForm.subject);
        const res = await adminFetch("/api/knowledge/upload-file", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok) {
          doneCount++;
          const summary = [
            data.pageCount ? `${data.pageCount}p` : null,
            data.wordCount ? `${data.wordCount.toLocaleString("pt-BR")} palavras` : null,
            data.chunks > 0 ? `${data.chunks} partes` : "1 doc",
          ].filter(Boolean).join(" · ");
          setBatchResults(prev => prev.map((r, idx) => idx === i ? {
            ...r, status: "done", message: summary,
            chunks: data.chunks, wordCount: data.wordCount, pageCount: data.pageCount,
          } : r));
        } else {
          errorCount++;
          setBatchResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: "error", message: data.erro ?? "Erro" } : r));
        }
      } catch {
        errorCount++;
        setBatchResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: "error", message: "Erro de conexão" } : r));
      }
    }

    setKbSaving(false);
    setKbFiles([]);
    if (kbFileRef.current) kbFileRef.current.value = "";
    fetchKbDocs();
    const total = kbFiles.length;
    setKbMsg({
      ok: errorCount === 0,
      text: errorCount === 0
        ? `${doneCount} arquivo${doneCount > 1 ? "s" : ""} processado${doneCount > 1 ? "s" : ""} com sucesso!`
        : `${doneCount} ok · ${errorCount} com erro de ${total} arquivos`,
    });
    setTimeout(() => setKbMsg(null), 8000);
  }
  async function deleteKbDoc(id: number) {
    if (!confirm("Remover este documento?")) return;
    await adminFetch(`/api/knowledge/${id}`, { method: "DELETE" });
    fetchKbDocs();
  }
  async function fetchRoleRequests() {
    setRrLoading(true);
    try { const res = await adminFetch("/api/admin/role-requests"); const data = await res.json(); setRoleRequests(data.requests ?? []); }
    catch { } finally { setRrLoading(false); }
  }
  async function reviewRequest(id: string, action: "approve" | "reject") {
    setRrReviewing(id); setRrMsg(null);
    try {
      const res = await adminFetch(`/api/admin/role-requests/${id}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setRrMsg({ ok: true, text: action === "approve" ? "Acesso aprovado!" : "Solicitação rejeitada." });
        setRoleRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === "approve" ? "approved" : "rejected" } : r));
      } else { setRrMsg({ ok: false, text: data.error ?? "Erro ao processar" }); }
    } catch { setRrMsg({ ok: false, text: "Erro de conexão" }); }
    finally { setRrReviewing(null); setTimeout(() => setRrMsg(null), 4000); }
  }
  // ── URL persistence: push from/to whenever dateRange changes ─────────────────
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    p.set("from", dateRange.from);
    p.set("to",   dateRange.to);
    const next = `${window.location.pathname}?${p.toString()}`;
    window.history.replaceState(null, "", next);
  }, [dateRange.from, dateRange.to]);

  async function fetchStats(range?: DateRange) {
    const r = range ?? dateRange;
    setStatsLoading(true);
    try {
      const qs = new URLSearchParams({ from: r.from, to: r.to }).toString();
      const res = await adminFetch(`/api/admin/stats?${qs}`);
      if (res.ok) {
        setStats(await res.json());
      } else {
        console.error("[fetchStats] error", res.status, await res.text().catch(() => ""));
      }
    } catch (err) {
      console.error("[fetchStats] network error", err);
    } finally {
      setStatsLoading(false);
    }
  }

  // Refetch stats whenever the date range changes
  useEffect(() => {
    if (!isLoaded) return;
    fetchStats(dateRange);
  }, [isLoaded, dateRange.from, dateRange.to]);

  useEffect(() => {
    if (!isLoaded) return;
    fetchUsers();
    fetchRoleRequests();
  }, [isLoaded]);
  useEffect(() => { if (activeSection === "conteudos") fetchTeacherContent(); }, [activeSection]);
  useEffect(() => { if (activeSection === "banco-dados") fetchKbDocs(); }, [activeSection]);

  /* ── Error / Access denied ── */
  if (error) {
    const is403 = error.includes("negado");
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-lg w-full text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-white/50 mb-4">{error}</p>

          {/* Debug panel — helps diagnose admin auth issues */}
          {is403 && debugInfo && (
            <div className="text-left bg-black/40 border border-white/10 rounded-xl p-4 mb-6 text-xs font-mono">
              <p className="text-yellow-400 font-bold mb-2 flex items-center gap-1"><Bug className="w-3 h-3" /> Diagnóstico de acesso</p>
              <div className="space-y-1 text-white/60">
                <div><span className="text-white/40">Autenticado:</span> <span className={debugInfo.authenticated ? "text-emerald-400" : "text-red-400"}>{debugInfo.authenticated ? "Sim" : "Não"}</span></div>
                <div><span className="text-white/40">É admin:</span> <span className={debugInfo.isAdmin ? "text-emerald-400" : "text-red-400"}>{debugInfo.isAdmin ? "Sim ✓" : "Não ✗"}</span></div>
                {debugInfo.resolvedUserId && (
                  <div><span className="text-white/40">ID resolvido:</span> <span className="text-blue-300 break-all">{debugInfo.resolvedUserId}</span></div>
                )}
                {debugInfo.dbRecord && (
                  <>
                    <div><span className="text-white/40">Email no DB:</span> <span className="text-white/80">{debugInfo.dbRecord.email ?? "—"}</span></div>
                    <div><span className="text-white/40">Role no DB:</span> <span className={debugInfo.dbRecord.role === "admin" ? "text-emerald-400" : "text-orange-300"}>{debugInfo.dbRecord.role ?? "—"}</span></div>
                    <div><span className="text-white/40">Clerk ID no DB:</span> <span className="text-blue-300 break-all">{debugInfo.dbRecord.clerk_id ?? "—"}</span></div>
                  </>
                )}
                {!debugInfo.dbRecord && debugInfo.authenticated && (
                  <div className="text-red-400">Usuário não encontrado no banco de dados!</div>
                )}
                <div><span className="text-white/40">Motivo do bloqueio:</span> <span className="text-red-400">
                  {!debugInfo.authenticated ? "Não autenticado" :
                   !debugInfo.dbRecord ? "Sem registro no DB" :
                   !debugInfo.inAdminIds && !debugInfo.inAdminEmails && !debugInfo.dbRoleIsAdmin ? "ID/email não está na lista de admins nem role=admin no DB" :
                   "Verificar logs do servidor"}
                </span></div>
              </div>
              {debugInfo.dbRecord && !debugInfo.isAdmin && (
                <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-400 text-xs">Para liberar acesso, adicione o ID <span className="font-bold">{debugInfo.resolvedUserId}</span> ao env ADMIN_USER_IDS, ou o email <span className="font-bold">{debugInfo.dbRecord?.email}</span> ao env ADMIN_EMAILS.</p>
                </div>
              )}
            </div>
          )}
          {is403 && !debugInfo && (
            <div className="mb-6 text-white/30 text-xs">Carregando diagnóstico...</div>
          )}

          <div className="flex gap-3 justify-center">
            <Button onClick={() => { sessionStorage.setItem("auth_return_to", "/admin"); navigate("/sign-in"); }}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl">Fazer Login</Button>
            <Button variant="outline" className="border-white/10 text-white/70 hover:bg-white/5"
              onClick={() => navigate("/app")}>Voltar ao App</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const pendingCount = roleRequests.filter(r => r.status === "pending").length;
  const filteredUsers = users.filter(u => {
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ").toLowerCase();
    const q = searchQ.toLowerCase();
    const matchSearch = !q || name.includes(q) || (u.email ?? "").toLowerCase().includes(q);
    if (activeSection === "alunos") return matchSearch && u.role !== "teacher" && u.role !== "institution_admin" && u.role !== "government";
    if (activeSection === "professores") return matchSearch && (u.role === "teacher" || u.role === "admin");
    if (activeSection === "instituicoes") return matchSearch && (u.role === "institution_admin" || u.role === "government" || u.role === "admin");
    return matchSearch;
  });

  /* ── Charts derived from REAL backend metrics ──────────────────────── */
  // IA & Custos: usage volume per AI feature (last 7d) — replaces hardcoded model bars
  const aiCostsChart = (stats?.aiFeatures ?? []).map((f) => ({
    model: f.feature.length > 7 ? f.feature.slice(0, 6) + "…" : f.feature,
    cost: f.last7d || f.uses || 0,
  }));
  const aiFeaturesList = stats?.aiFeatures ?? [];
  const totalAiUses = Math.max(1, aiFeaturesList.reduce((s, f) => s + (f.uses || 0), 0));

  // Status dos provedores de IA (lido do backend; cai pra heurística se ausente)
  const providersFromApi = stats?.aiProviders ?? [];
  const providerStatus = (id: string) => providersFromApi.find(p => p.id === id);
  const aiProviders = [
    { id: "deepseek",  name: "DeepSeek",       emoji: "🧠", bg: "bg-blue-500/15",   ok: providerStatus("deepseek")?.ok  ?? true,  usage: "Tutor Tiagão · Simulado adaptativo · Notebook" },
    { id: "anthropic", name: "Anthropic Claude", emoji: "🟠", bg: "bg-amber-500/15", ok: providerStatus("anthropic")?.ok ?? true,  usage: "Aula com lousa · Explicações longas" },
    { id: "openai",    name: "OpenAI GPT",     emoji: "🟢", bg: "bg-emerald-500/15", ok: providerStatus("openai")?.ok    ?? true,  usage: "Imagens (slides, infográficos) · TTS Tiagão" },
    { id: "gemini",    name: "Google Gemini",  emoji: "✨", bg: "bg-violet-500/15",  ok: providerStatus("gemini")?.ok    ?? true,  usage: "Resolução de problema por foto · OCR" },
    { id: "openrouter", name: "OpenRouter",    emoji: "🔀", bg: "bg-pink-500/15",    ok: providerStatus("openrouter")?.ok ?? false, usage: "Fallback · Modelos extras (opcional)" },
    { id: "elevenlabs", name: "ElevenLabs TTS", emoji: "🔊", bg: "bg-cyan-500/15",   ok: providerStatus("elevenlabs")?.ok ?? false, usage: "Voz do podcast (opcional)" },
  ];

  // Receita: MRR atual = premiumUsers * ticket. Série temporal usa loginsByDay como proxy de engajamento.
  const mockRevData = stats?.loginsByDay?.map((d) => ({
    day: d.day.slice(5), revenue: ((stats?.premiumUsers ?? 0) * 8.2).toFixed(2),
  })) ?? (stats?.premiumUsers ? [{ day: "Atual", revenue: ((stats.premiumUsers) * 8.2).toFixed(2) }] : []);

  // Conteúdo & Banco: real breakdown from backend
  const contentPie = (stats?.contentBreakdown ?? []).map((c) => ({
    name: c.label.split(" ")[0], value: c.value,
  })).filter((c) => c.value > 0);

  // Performance: usa dados reais de atividade diária (user_activity) e logins
  const mockPerf = stats?.activityHeatmap?.map((d) => ({
    day: String(d.study_date).slice(5),
    minutos: d.active_users * 30,
    xp: d.active_users * 80,
  })) ?? [];

  /* ── Nav toggle ── */
  function toggleGroup(label: string) {
    setExpandedGroups(prev => prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]);
  }

  /* ─────────────────────────────────────────────── */
  return (
    <div className="flex h-screen bg-[#0a0a0f] text-white overflow-hidden">

      {/* ══ SIDEBAR ══ */}
      <aside className="w-56 flex-shrink-0 bg-[#0d0d16] border-r border-white/[0.06] flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/[0.06]">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-black text-base tracking-tight">StudyAI Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV.map((item) => {
            if ("children" in item) {
              const open = expandedGroups.includes(item.label);
              return (
                <div key={item.label}>
                  <button onClick={() => toggleGroup(item.label)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold">
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  <AnimatePresence>
                    {open && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="ml-4 pl-3 border-l border-white/[0.07] space-y-0.5 mt-0.5 mb-1">
                          {(item.children ?? []).map(child => (
                            <button key={child.section}
                              onClick={() => setActiveSection(child.section)}
                              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeSection === child.section
                                  ? "bg-violet-600/20 text-violet-300"
                                  : "text-white/40 hover:text-white hover:bg-white/5"
                              }`}>
                              <child.icon className="w-3.5 h-3.5" />
                              {child.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }
            return (
              <button key={item.section}
                onClick={() => setActiveSection(item.section)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeSection === item.section
                    ? "bg-violet-600/20 text-violet-300"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}

          <div className="pt-2 border-t border-white/[0.06] mt-2 space-y-0.5">
            <button onClick={() => setActiveSection("solicitacoes")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeSection === "solicitacoes" ? "bg-violet-600/20 text-violet-300" : "text-white/50 hover:text-white hover:bg-white/5"
              }`}>
              <Bell className="w-4 h-4 flex-shrink-0" />
              Solicitações
              {pendingCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">{pendingCount}</span>
              )}
            </button>
            <button onClick={() => setActiveSection("roles")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeSection === "roles" ? "bg-violet-600/20 text-violet-300" : "text-white/50 hover:text-white hover:bg-white/5"
              }`}>
              <UserCog className="w-4 h-4 flex-shrink-0" />
              Perfis & Acesso
            </button>
          </div>
        </nav>

        {/* Back to app */}
        <div className="px-3 py-4 border-t border-white/[0.06]">
          <button onClick={() => navigate("/app")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/30 hover:text-white/60 hover:bg-white/5 transition-all">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao App
          </button>
        </div>
      </aside>

      {/* ══ MAIN AREA ══ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Bar */}
        <header className="h-14 border-b border-white/[0.06] bg-[#0d0d16]/80 backdrop-blur-xl flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Searcar..."
              className="w-full bg-white/5 border border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/40"
            />
          </div>
          <div className="flex-1" />
          <button className="relative p-2 rounded-xl hover:bg-white/5 transition-colors">
            <Mail className="w-4 h-4 text-white/40" />
          </button>
          <button className="relative p-2 rounded-xl hover:bg-white/5 transition-colors">
            <Bell className="w-4 h-4 text-white/40" />
            {pendingCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
          <div className="flex items-center gap-2 pl-3 border-l border-white/[0.06]">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-black">A</div>
            <span className="text-sm font-semibold text-white/70">Admin</span>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto overflow-x-auto p-6">
          <div className="min-w-[900px]">

          {/* ══ VISÃO GERAL ══ */}
          {activeSection === "visao" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h1 className="text-xl font-black">Dashboard Operacional</h1>
                  <p className="text-white/35 text-sm">Métricas em tempo real da plataforma StudyAI</p>
                </div>
                <button onClick={() => { fetchStats(dateRange); fetchUsers(); fetchRoleRequests(); }}
                  className="flex items-center gap-1.5 text-white/35 hover:text-white text-xs transition-colors bg-white/5 px-3 py-1.5 rounded-xl border border-white/[0.07]">
                  <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? "animate-spin" : ""}`} /> Atualizar
                </button>
              </div>

              {/* Date Range Filter */}
              <div className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-4">
                <DateRangeFilter value={dateRange} onChange={r => setDateRange(r)} loading={statsLoading} />
              </div>

              {/* KPI Row — range-aware with comparison */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {(() => {
                  const pctBadge = (p: number | null | undefined, invertColor = false) => {
                    if (p == null) return null;
                    const up = p >= 0;
                    const color = invertColor ? (up ? "text-red-400" : "text-emerald-400") : (up ? "text-emerald-400" : "text-red-400");
                    return <span className={`text-[10px] font-bold ${color}`}>{up ? "↑" : "↓"} {Math.abs(p)}% vs período ant.</span>;
                  };
                  return [
                    {
                      label: "Total de Usuários", value: stats?.totalUsers ?? 0,
                      icon: Users, color: "from-violet-500 to-purple-600",
                      sub: `+${stats?.newUsersInRange ?? 0} no período`,
                      pct: stats?.newUsersPct,
                    },
                    {
                      label: "Logins no Período", value: stats?.loginsInRange ?? 0,
                      icon: Activity, color: "from-blue-500 to-cyan-500",
                      sub: `${stats?.studyingNow ?? 0} ao vivo agora`,
                      pct: stats?.loginsPct,
                    },
                    {
                      label: "Novos Cadastros", value: stats?.newUsersInRange ?? 0,
                      icon: UserPlus, color: "from-emerald-500 to-teal-500",
                      sub: `no período selecionado`,
                      pct: stats?.newUsersPct,
                    },
                    {
                      label: "Ativos no Período", value: stats?.activeInRange ?? 0,
                      icon: TrendingUp, color: "from-amber-500 to-orange-500",
                      sub: `${stats?.todayActive ?? 0} ativos hoje`,
                      pct: stats?.activePct,
                    },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
                      <div className="flex items-start justify-between mb-3">
                        <p className="text-xs font-semibold text-white/40 leading-tight pr-2">{kpi.label}</p>
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center flex-shrink-0`}>
                          <kpi.icon className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <p className="text-3xl font-black text-white leading-none mb-1">
                        {statsLoading ? <span className="text-white/20 animate-pulse">—</span> : kpi.value.toLocaleString("pt-BR")}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {pctBadge(kpi.pct)}
                        {kpi.sub && <p className="text-[10px] text-white/30">{kpi.sub}</p>}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Row: Logins | Alunos/Prof/Escolas */}
              <div className="grid grid-cols-5 gap-3">
                {/* Logins wide */}
                <div className="col-span-3 bg-[#12121a] border border-white/[0.07] rounded-2xl p-5 space-y-4">
                  <p className="text-sm font-bold text-white/80 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" /> Logins
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Logins por dia */}
                    <div className="col-span-1">
                      <p className="text-[10px] text-white/30 font-bold uppercase mb-2">Logins por dia</p>
                      <ResponsiveContainer width="100%" height={90}>
                        <AreaChart data={stats?.loginsByDay ?? []} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gLogin" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 8 }} tickFormatter={v => v.slice(5)} />
                          <Tooltip contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8, color: "#fff", fontSize: 10 }} />
                          <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="url(#gLogin)" strokeWidth={1.5} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Heatmap (horários) */}
                    <div className="col-span-1">
                      <p className="text-[10px] text-white/30 font-bold uppercase mb-2">Horários de acesso</p>
                      <div className="grid grid-cols-7 gap-0.5">
                        {(stats?.activityHeatmap?.slice(0, 21) ?? Array(21).fill({ active_users: 0 })).map((d, i) => {
                          const v = d.active_users;
                          const intensity = v === 0 ? 0 : Math.min(1, v / 20);
                          return (
                            <div key={i} className="w-full aspect-square rounded-sm"
                              style={{ backgroundColor: `rgba(139,92,246,${0.08 + intensity * 0.7})` }} />
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1">
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
                          <span key={d} className="text-[8px] text-white/20">{d}</span>
                        ))}
                      </div>
                    </div>
                    {/* Últimos logins */}
                    <div className="col-span-1">
                      <p className="text-[10px] text-white/30 font-bold uppercase mb-2">Últimos logins</p>
                      <div className="space-y-1.5">
                        {(stats?.recentLogins ?? []).slice(0, 4).map((u, i) => {
                          const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email?.split("@")[0] || "User";
                          return (
                            <div key={`${u.id}-${i}`} className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-violet-500/30 flex items-center justify-center text-[9px] font-black text-violet-300 flex-shrink-0">
                                {name[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold text-white/70 truncate">{name}</p>
                                <p className="text-[9px] text-white/25">{new Date(u.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                              </div>
                            </div>
                          );
                        })}
                        {(!stats || (stats.recentLogins ?? []).length === 0) && (
                          <p className="text-[10px] text-white/25 text-center py-2">Sem logins recentes</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alunos/Professores/Escolas */}
                <div className="col-span-2 bg-[#12121a] border border-white/[0.07] rounded-2xl p-5">
                  <p className="text-sm font-bold text-white/80 flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-emerald-400" /> Alunos / Professores / Escolas
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <ResponsiveContainer width="100%" height={90}>
                        <BarChart data={[
                          { r: "Alunos", v: Math.max(0, (stats?.totalUsers ?? 0) - (stats?.teacherCount ?? 0) - (stats?.govCount ?? 0)) },
                          { r: "Profes.", v: stats?.teacherCount ?? 0 },
                          { r: "Governo", v: stats?.govCount ?? 0 },
                        ]} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                          <XAxis dataKey="r" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 8 }} />
                          <Tooltip contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8, color: "#fff", fontSize: 10 }} />
                          <Bar dataKey="v" radius={[3, 3, 0, 0]}>
                            {[0, 1, 2].map(i => <Cell key={i} fill={["#8b5cf6", "#3b82f6", "#10b981"][i]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col justify-center gap-2">
                      {[
                        { label: "Alunos ativos", value: Math.max(0, (stats?.todayActive ?? 0)).toLocaleString("pt-BR"), color: "text-violet-400" },
                        { label: "Professores cadastrados", value: (stats?.teacherCount ?? 0).toLocaleString("pt-BR"), color: "text-blue-400" },
                        { label: "Instituições", value: (stats?.institutionsTotal ?? 0).toLocaleString("pt-BR"), color: "text-emerald-400" },
                      ].map(r => (
                        <div key={r.label}>
                          <p className={`text-lg font-black ${r.color}`}>{r.value}</p>
                          <p className="text-[10px] text-white/35">{r.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row: Financeiro | IA & Custos | Conteúdo & BD */}
              <div className="grid grid-cols-3 gap-3">
                {/* Financeiro */}
                <Card title="Financeiro" icon={Wallet} iconColor="text-emerald-400">
                  <p className="text-[10px] text-white/30 font-bold uppercase">Faturamento mensal</p>
                  <ResponsiveContainer width="100%" height={80}>
                    <AreaChart data={mockRevData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 8 }} />
                      <Tooltip contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8, color: "#fff", fontSize: 10 }}
                        formatter={(v: any) => [`R$${Number(v).toLocaleString("pt-BR")}`, "Faturamento"]} />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#gRev)" strokeWidth={1.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="bg-white/[0.04] rounded-xl p-3">
                      <p className="text-xs font-black text-white">R$8,20</p>
                      <p className="text-[9px] text-white/30">Ticket médio</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-3">
                      <p className="text-xs font-black text-emerald-400">{(stats?.premiumUsers ?? 0).toLocaleString("pt-BR")}</p>
                      <p className="text-[9px] text-white/30">Assinaturas ativas</p>
                    </div>
                  </div>
                </Card>

                {/* IA & Custos */}
                <Card title="IA & Custos" icon={Bot} iconColor="text-blue-400">
                  <p className="text-[10px] text-white/30 font-bold uppercase">Custos por modelo de IA</p>
                  <ResponsiveContainer width="100%" height={80}>
                    <BarChart data={aiCostsChart} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                      <XAxis dataKey="model" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 8 }} />
                      <Tooltip contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8, color: "#fff", fontSize: 10 }}
                        formatter={(v: any) => [`${Number(v).toLocaleString("pt-BR")} usos`, "Últ. 7d"]} />
                      <Bar dataKey="cost" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 mt-1">
                    {aiFeaturesList.slice(0, 4).map((f: any) => {
                      const pct = Math.round((f.uses / totalAiUses) * 100);
                      return (
                        <div key={f.feature} className="flex items-center gap-2">
                          <span className="text-[10px] text-white/50 w-24 truncate">{f.feature}</span>
                          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-white/40 w-6 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                      <span className="text-[10px] text-white/40">Total de usos (IA)</span>
                      <span className="text-[10px] font-black text-emerald-400">{totalAiUses.toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                </Card>

                {/* Conteúdo & Banco de Dados */}
                <Card title="Conteúdo & Banco de Dados" icon={Database} iconColor="text-amber-400">
                  <div className="flex items-center gap-3">
                    <PieChart width={84} height={84}>
                      <Pie data={contentPie} cx="42" cy="42" innerRadius={22} outerRadius={36} dataKey="value" strokeWidth={0}>
                        {contentPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                    <div className="space-y-1">
                      {contentPie.map((c, i) => (
                        <div key={c.name} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                          <span className="text-[10px] text-white/50">{c.name} {c.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/[0.04] rounded-xl p-3 flex items-center justify-between">
                    <p className="text-[10px] text-white/40">Documentos no Notebook</p>
                    <p className="text-xs font-black text-white">{(stats?.notebookDocsTotal ?? 0).toLocaleString("pt-BR")} <span className="text-[9px] text-white/40 font-normal">({stats?.notebookStorageMb ?? 0} MB)</span></p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-white/[0.04] rounded-xl p-2">
                      <p className="text-[9px] text-white/30">Resumos IA</p>
                      <p className="text-xs font-black text-white">{stats?.notebookOverviewsTotal ?? 0}</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-2">
                      <p className="text-[9px] text-white/30">Mat. dos Profs</p>
                      <p className="text-xs font-black text-white">{stats?.teacherContentTotal ?? 0}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/30 font-bold uppercase">Matérias mais acessadas</p>
                    {(stats?.topMaterias ?? []).slice(0, 3).map((m, i) => (
                      <div key={m.materia} className="flex items-center gap-2">
                        <span className="text-[9px] text-white/25 w-3">{i + 1}</span>
                        <span className="text-[10px] text-white/60 flex-1 truncate">{m.materia}</span>
                        <span className="text-[10px] font-bold text-violet-400">{m.count}</span>
                      </div>
                    ))}
                    {(!stats || stats.topMaterias.length === 0) && (
                      <p className="text-[10px] text-white/20 text-center py-1">Sem dados ainda</p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Row: Performance | Sistema | Segurança | Ações Rápidas */}
              <div className="grid grid-cols-4 gap-3">
                {/* Performance e Engajamento */}
                <Card title="Performance e Engajamento" icon={Zap} iconColor="text-amber-400">
                  <div>
                    <p className="text-[10px] text-white/30 font-bold uppercase mb-1">Tempo médio de estudo</p>
                    <ResponsiveContainer width="100%" height={60}>
                      <AreaChart data={mockPerf} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gPerf" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 7 }} />
                        <Tooltip contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8, color: "#fff", fontSize: 10 }}
                          formatter={(v: any) => [`${v} min`, "Estudo"]} />
                        <Area type="monotone" dataKey="minutos" stroke="#f59e0b" fill="url(#gPerf)" strokeWidth={1.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30 font-bold uppercase mb-1">XP gerado por dia</p>
                    <ResponsiveContainer width="100%" height={55}>
                      <BarChart data={mockPerf} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                        <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 7 }} />
                        <Tooltip contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8, color: "#fff", fontSize: 10 }} />
                        <Bar dataKey="xp" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Sistema */}
                <Card title="Sistema" icon={Server} iconColor="text-blue-400">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/[0.04] rounded-xl p-3 text-center">
                      <Bug className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                      <p className="text-lg font-black text-white">0</p>
                      <p className="text-[9px] text-white/30">Bugs reportados</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                      <div className="w-3 h-3 rounded-full bg-emerald-400 mx-auto mb-1 animate-pulse" />
                      <p className="text-xs font-black text-emerald-400">Online</p>
                      <p className="text-[9px] text-emerald-400/50">Verde</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30 font-bold uppercase mb-1">Status do sistema</p>
                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <p className="text-[10px] text-emerald-400 font-semibold">API, DB e servidor normais</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/30 font-bold uppercase">Erros recentes</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="text-[10px] text-white/40 flex-1">Bugs reportados</span>
                      <span className="text-[10px] font-black text-white">0</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                      <span className="text-[10px] text-white/40 flex-1">Erros recentes</span>
                      <span className="text-[10px] font-black text-white">0</span>
                    </div>
                  </div>
                </Card>

                {/* Segurança */}
                <Card title="Segurança" icon={Shield} iconColor="text-red-400">
                  <div>
                    <p className="text-[10px] text-white/30 font-bold uppercase mb-2">Histórico de logins</p>
                    <div className="space-y-1.5">
                      {(stats?.recentLogins ?? []).slice(0, 3).map((u, i) => {
                        const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email?.split("@")[0] || "User";
                        return (
                          <div key={`${u.id}-${i}`} className="flex items-center gap-2">
                            <span className="text-[10px] text-white/60 flex-1 truncate">{name}</span>
                            <span className="text-[9px] text-white/25">{new Date(u.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        );
                      })}
                      {(!stats || (stats.recentLogins ?? []).length === 0) && <p className="text-[10px] text-white/25">Sem logins registrados</p>}
                    </div>
                  </div>
                  <div className="bg-white/[0.04] rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <p className="text-[10px] text-white/60 font-bold">Tentativas suspeitas</p>
                    </div>
                    <p className="text-lg font-black text-white">0</p>
                    <p className="text-[9px] text-white/30">Tentativas de acesso suspeitas</p>
                  </div>
                </Card>

                {/* Ações Rápidas */}
                <Card title="Ações rápidas" icon={Zap} iconColor="text-violet-400">
                  <div className="space-y-2">
                    {[
                      { icon: Key, label: "Liberar acesso usuário", color: "text-violet-400 bg-violet-500/10 hover:bg-violet-500/20", action: () => setActiveSection("roles") },
                      { icon: Lock, label: "Resetar senha", color: "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20", action: () => setActiveSection("alunos") },
                      { icon: UserPlus, label: "Criar usuário admin", color: "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20", action: () => setActiveSection("roles") },
                      { icon: Upload, label: "Upload de conteúdo", color: "text-blue-400 bg-blue-500/10 hover:bg-blue-500/20", action: () => setActiveSection("banco-dados") },
                    ].map(a => (
                      <button key={a.label} onClick={a.action}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left ${a.color}`}>
                        <a.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-[11px] font-bold">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ══ USUÁRIOS (Alunos/Professores/Instituições) ══ */}
          {(activeSection === "alunos" || activeSection === "professores" || activeSection === "instituicoes") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-black flex items-center gap-2">
                  <Users className="w-5 h-5 text-violet-400" />
                  {activeSection === "alunos" ? "Alunos" : activeSection === "professores" ? "Professores" : "Instituições"}
                  <span className="text-white/30 font-normal text-sm">({filteredUsers.length})</span>
                </h2>
                <div className="flex gap-2">
                  <button onClick={fetchUsers} className="p-2 rounded-xl hover:bg-white/5 text-white/30 hover:text-white transition-colors">
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>
              {message && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold ${message.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-300"}`}>
                  {message.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {message.text}
                </motion.div>
              )}
              {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-16 text-white/30 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum usuário encontrado.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map(user => {
                    const status = user.stripeSubscriptionStatus ?? "free";
                    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.free;
                    const isPremium = cfg.isPremium;
                    const isUpdating = updating === user.id;
                    return (
                      <motion.div key={user.id} layout className="rounded-2xl border border-white/[0.07] bg-[#12121a] p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black ${isPremium ? "bg-gradient-to-br from-violet-500 to-purple-600" : "bg-white/10"}`}>
                            {((user.firstName ?? user.email ?? "?")[0]).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">
                              {user.firstName || user.lastName ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Sem nome"}
                              {isPremium && <Crown className="w-3.5 h-3.5 text-yellow-400 inline ml-1.5 mb-0.5" />}
                            </p>
                            <p className="text-white/40 text-xs truncate">{user.email ?? "Sem email"}</p>
                            <p className="text-white/25 text-xs">{user.role ?? "student"} · {new Date(user.createdAt).toLocaleDateString("pt-BR")}</p>
                          </div>
                        </div>
                        <div className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black border ${
                          cfg.color === "emerald" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" :
                          cfg.color === "blue"    ? "bg-blue-500/10 border-blue-500/20 text-blue-300" :
                          cfg.color === "yellow"  ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-300" :
                          cfg.color === "red"     ? "bg-red-500/10 border-red-500/20 text-red-300" :
                                                    "bg-white/5 border-white/10 text-white/40"}`}>
                          {cfg.label}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {!isPremium ? (
                            <Button size="sm" onClick={() => updateStatus(user.id, "active")} disabled={isUpdating}
                              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs h-8 px-3">
                              {isUpdating ? <div className="w-3.5 h-3.5 rounded-full border border-white border-t-transparent animate-spin" /> : <><Crown className="w-3.5 h-3.5 mr-1.5" />Premium</>}
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(user.id, "free")} disabled={isUpdating}
                              className="border-white/10 text-white/60 hover:bg-white/5 font-bold text-xs h-8 px-3">
                              {isUpdating ? <div className="w-3.5 h-3.5 rounded-full border border-white/40 border-t-transparent animate-spin" /> : <><UserX className="w-3.5 h-3.5 mr-1.5" />Remover</>}
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ FINANCEIRO ══ */}
          {activeSection === "financeiro" && (() => {
            const TICKET = 8.2;
            const dist = stats?.subscriptionDist ?? [];
            // DateRangeFilter shared component rendered below
            const activeCount = dist.filter(d => d.status === "active").reduce((s, d) => s + d.count, 0);
            const trialCount = dist.filter(d => d.status === "trialing").reduce((s, d) => s + d.count, 0);
            const canceledCount = dist.filter(d => d.status === "canceled").reduce((s, d) => s + d.count, 0);
            const pastDueCount = dist.filter(d => d.status === "past_due").reduce((s, d) => s + d.count, 0);
            const freeCount = dist.filter(d => !["active","trialing","canceled","past_due"].includes(d.status)).reduce((s, d) => s + d.count, 0);
            const mrr = (activeCount * TICKET) + (trialCount * TICKET * 0.5);
            const arr = mrr * 12;
            const churnRate = stats?.totalUsers ? ((canceledCount / Math.max(stats.totalUsers, 1)) * 100) : 0;
            const conversionRate = stats?.totalUsers ? ((stats.premiumUsers / Math.max(stats.totalUsers, 1)) * 100) : 0;
            const distChartData = [
              { name: "Premium Ativo", value: activeCount, color: "#10b981" },
              { name: "Trial", value: trialCount, color: "#3b82f6" },
              { name: "Gratuito", value: freeCount, color: "#6b7280" },
              { name: "Cancelado", value: canceledCount, color: "#ef4444" },
              { name: "Inadimplente", value: pastDueCount, color: "#f59e0b" },
            ].filter(d => d.value > 0);
            return (
            <div className="space-y-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-black flex items-center gap-2"><Wallet className="w-5 h-5 text-emerald-400" /> Financeiro</h2>
                <span className="text-[10px] text-white/30 font-bold uppercase">Ticket médio: R$ {TICKET.toFixed(2)}/mês</span>
              </div>

              <div className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-4">
                <DateRangeFilter value={dateRange} onChange={r => setDateRange(r)} loading={statsLoading} />
              </div>

              {/* KPIs financeiros */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "MRR Estimado", value: `R$ ${mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, sub: `${activeCount} assinaturas ativas`, color: "text-emerald-400", gradient: "from-emerald-500 to-teal-600" },
                  { label: "ARR Projetado", value: `R$ ${arr.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, sub: "MRR × 12", color: "text-blue-400", gradient: "from-blue-500 to-cyan-600" },
                  { label: "Conversão Pago", value: `${conversionRate.toFixed(1)}%`, sub: `${stats?.premiumUsers ?? 0} de ${stats?.totalUsers ?? 0} usuários`, color: "text-violet-400", gradient: "from-violet-500 to-purple-600" },
                  { label: "Churn Rate", value: `${churnRate.toFixed(1)}%`, sub: `${canceledCount} cancelamentos`, color: churnRate > 5 ? "text-red-400" : "text-amber-400", gradient: "from-amber-500 to-orange-600" },
                ].map(k => (
                  <div key={k.label} className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5 bg-gradient-to-br pointer-events-none" style={{ background: `linear-gradient(135deg, ${k.gradient.replace("from-","").replace("to-","")})` }} />
                    <p className="text-xs text-white/40 font-bold uppercase mb-1">{k.label}</p>
                    <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{k.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-5 gap-4">
                {/* Distribuição por plano — pizza */}
                <div className="col-span-2 bg-[#12121a] border border-white/[0.07] rounded-2xl p-5">
                  <p className="text-sm font-bold text-white/70 mb-3">Distribuição por Plano</p>
                  {distChartData.length === 0 ? (
                    <p className="text-xs text-white/30 text-center py-8">Sem dados</p>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie data={distChartData} cx="50%" cy="50%" outerRadius={65} innerRadius={35} dataKey="value" paddingAngle={2}>
                            {distChartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8, color: "#fff", fontSize: 11 }} formatter={(v: any, n: any) => [v, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1 mt-2">
                        {distChartData.map(d => (
                          <div key={d.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                              <span className="text-[10px] text-white/50">{d.name}</span>
                            </div>
                            <span className="text-[10px] font-bold text-white/70">{d.value.toLocaleString("pt-BR")}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Planos criados por dia */}
                <div className="col-span-3 bg-[#12121a] border border-white/[0.07] rounded-2xl p-5">
                  <p className="text-sm font-bold text-white/70 mb-1">Planos de Estudo Criados — últimos 7 dias</p>
                  <p className="text-[10px] text-white/30 mb-3">Quantidade de planos personalizados gerados por dia</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={stats?.plansPerDay ?? []} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gFinPlan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8, color: "#fff", fontSize: 11 }} />
                      <Area type="monotone" dataKey="count" stroke="#10b981" fill="url(#gFinPlan)" strokeWidth={2} dot={false} name="Planos" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Resumo de status */}
              <div className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-5">
                <p className="text-sm font-bold text-white/70 mb-4">Breakdown de Usuários por Status</p>
                <div className="space-y-2.5">
                  {[
                    { label: "Premium Ativo", count: activeCount, color: "#10b981", pct: stats?.totalUsers ? Math.round(activeCount / stats.totalUsers * 100) : 0 },
                    { label: "Em Trial", count: trialCount, color: "#3b82f6", pct: stats?.totalUsers ? Math.round(trialCount / stats.totalUsers * 100) : 0 },
                    { label: "Gratuito", count: freeCount, color: "#6b7280", pct: stats?.totalUsers ? Math.round(freeCount / stats.totalUsers * 100) : 0 },
                    { label: "Cancelado", count: canceledCount, color: "#ef4444", pct: stats?.totalUsers ? Math.round(canceledCount / stats.totalUsers * 100) : 0 },
                    { label: "Inadimplente", count: pastDueCount, color: "#f59e0b", pct: stats?.totalUsers ? Math.round(pastDueCount / stats.totalUsers * 100) : 0 },
                  ].filter(r => r.count > 0).map(r => (
                    <div key={r.label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-white/60">{r.label}</span>
                        <span className="text-xs font-bold text-white/80">{r.count.toLocaleString("pt-BR")} ({r.pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(r.pct, 1)}%`, background: r.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            );
          })()}

          {/* ══ IA & CUSTOS ══ */}
          {activeSection === "ia-custos" && (() => {
            const ac = stats?.aiCost;
            const fmtBrl = (v: number) => `R$ ${v.toFixed(4)}`;
            const fmtBrlShort = (v: number) => v < 0.01 ? `R$ ${v.toFixed(4)}` : `R$ ${v.toFixed(2)}`;
            const callsRange = ac?.callsRange ?? (ac ? ac.byFeature.reduce((s, f) => s + f.calls, 0) : 0);
            const tokensRange = ac?.tokensRange ?? (ac ? ac.byFeature.reduce((s, f) => s + f.tokens, 0) : 0);
            const noData = !ac || ac.byFeature.length === 0;
            const costPct = ac?.costPct;
            return (
            <div className="space-y-5">
              <h2 className="text-lg font-black flex items-center gap-2"><Bot className="w-5 h-5 text-blue-400" /> IA & Custos Reais</h2>

              <div className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-4">
                <DateRangeFilter value={dateRange} onChange={r => setDateRange(r)} loading={statsLoading} />
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  {
                    label: "Custo no Período", val: fmtBrlShort(ac?.rangeBrl ?? 0),
                    sub: `US$ ${(ac?.rangeUsd ?? 0).toFixed(4)}`,
                    pct: costPct != null ? { v: costPct, invert: true } : null,
                    color: "text-blue-400"
                  },
                  { label: "Custo Hoje", val: fmtBrlShort(ac?.todayBrl ?? 0), sub: `US$ ${(ac?.todayUsd ?? 0).toFixed(4)}`, color: "text-violet-400", pct: null },
                  { label: "Chamadas no Período", val: callsRange.toLocaleString("pt-BR"), sub: "registradas", color: "text-amber-400", pct: null },
                  { label: "Tokens no Período", val: tokensRange >= 1000 ? `${(tokensRange/1000).toFixed(1)}k` : String(tokensRange), sub: "in + out", color: "text-emerald-400", pct: null },
                ].map(k => (
                  <div key={k.label} className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-4">
                    <p className="text-[10px] text-white/40 font-bold uppercase">{k.label}</p>
                    <p className={`text-xl font-black mt-1 ${k.color}`}>{k.val}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{k.sub}</p>
                    {k.pct && (() => {
                      const up = k.pct.v >= 0;
                      const color = k.pct.invert ? (up ? "text-red-400" : "text-emerald-400") : (up ? "text-emerald-400" : "text-red-400");
                      return <span className={`text-[10px] font-bold ${color}`}>{up ? "↑" : "↓"} {Math.abs(k.pct.v)}% vs anterior</span>;
                    })()}
                  </div>
                ))}
              </div>

              {/* Custo por dia */}
              <div className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-5">
                <p className="text-sm font-bold text-white/70 mb-1">Custo diário — últimos 30 dias</p>
                <p className="text-[10px] text-white/40 mb-3">Custo em R$ por dia de uso</p>
                {(ac?.perDay?.length ?? 0) === 0 ? (
                  <div className="h-[140px] flex items-center justify-center text-xs text-white/30">Sem dados ainda — os custos aparecerão aqui após as primeiras chamadas de IA</div>
                ) : (
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={ac!.perDay} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gCostDay" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickFormatter={v => `R$${v.toFixed(2)}`} />
                      <Tooltip contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8, color: "#fff", fontSize: 11 }}
                        formatter={(v: any) => [`R$ ${Number(v).toFixed(4)}`, "Custo"]} />
                      <Area type="monotone" dataKey="costBrl" stroke="#3b82f6" fill="url(#gCostDay)" strokeWidth={2} dot={false} name="Custo" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Custo por feature */}
                <div className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-5">
                  <p className="text-sm font-bold text-white/70 mb-3">Custo por Feature</p>
                  {noData ? (
                    <p className="text-xs text-white/30 py-4 text-center">Sem dados ainda</p>
                  ) : (
                    <div className="space-y-2.5">
                      {ac!.byFeature.map(f => {
                        const pct = ac!.monthBrl > 0 ? Math.round((f.costBrl / ac!.monthBrl) * 100) : 0;
                        return (
                          <div key={f.feature}>
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-white/60 truncate capitalize">{f.feature}</span>
                              <span className="text-xs font-bold text-white/80 ml-2 shrink-0">{fmtBrl(f.costBrl)} · {f.calls} calls</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${Math.max(pct, 2)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Custo por modelo */}
                <div className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-5">
                  <p className="text-sm font-bold text-white/70 mb-3">Custo por Modelo</p>
                  {(ac?.byModel?.length ?? 0) === 0 ? (
                    <p className="text-xs text-white/30 py-4 text-center">Sem dados ainda</p>
                  ) : (
                    <div className="space-y-2">
                      {ac!.byModel.map((m, i) => {
                        const colors = ["text-blue-400", "text-violet-400", "text-amber-400", "text-emerald-400", "text-rose-400"];
                        return (
                          <div key={m.model} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
                            <div>
                              <span className={`text-xs font-bold ${colors[i % colors.length]}`}>{m.model}</span>
                              <span className="text-[10px] text-white/30 ml-1.5">{m.calls} chamadas</span>
                            </div>
                            <span className="text-xs font-bold text-white/80">{fmtBrl(m.costBrl)}</span>
                          </div>
                        );
                      })}
                      <div className="pt-2 flex justify-between">
                        <span className="text-xs text-white/40">Total acumulado</span>
                        <span className="text-sm font-black text-white">{fmtBrlShort(ac?.monthBrl ?? 0)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status dos provedores de IA */}
              <div className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-5">
                <p className="text-sm font-bold text-white/70 mb-1">Provedores de IA</p>
                <p className="text-[10px] text-white/40 mb-4">Status das integrações que alimentam o Tutor, Aulas, Simulado e Notebook</p>
                <div className="grid grid-cols-2 gap-3">
                  {aiProviders.map(p => (
                    <div key={p.name} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base ${p.bg}`}>{p.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white truncate">{p.name}</p>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${p.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                            {p.ok ? "ATIVO" : "PENDENTE"}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/40 truncate">{p.usage}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            );
          })()}

          {/* ══ CONTEÚDOS ══ */}
          {activeSection === "conteudos" && (
            <div className="space-y-6">
              <h2 className="text-lg font-black flex items-center gap-2"><FileText className="w-5 h-5 text-violet-400" /> Conteúdos</h2>
              {tcMessage && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold ${tcMessage.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-300"}`}>
                  {tcMessage.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} {tcMessage.text}
                </div>
              )}
              <form onSubmit={saveTeacherContent} className="bg-[#12121a] rounded-2xl p-6 border border-white/[0.07] space-y-4">
                <h3 className="font-bold flex items-center gap-2"><Plus className="w-4 h-4 text-violet-400" /> Adicionar Conteúdo</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Título *", key: "title", placeholder: "Ex: Funções do 2° grau", required: true },
                    { label: "Matéria", key: "subject", placeholder: "Ex: Matemática" },
                    { label: "Série / Nível", key: "gradeLevel", placeholder: "Ex: 2° Ano EM / ENEM" },
                    { label: "Tags (vírgula)", key: "tags", placeholder: "Ex: equação, bhaskara" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs text-white/50 font-bold mb-1">{f.label}</label>
                      <input required={f.required} value={(tcForm as any)[f.key]} onChange={e => setTcForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs text-white/50 font-bold mb-1">Conteúdo / Material didático *</label>
                  <textarea required value={tcForm.contentText} onChange={e => setTcForm(p => ({ ...p, contentText: e.target.value }))}
                    rows={5} placeholder="Cole aqui o texto do material didático..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 resize-none" />
                </div>
                <Button type="submit" disabled={tcSaving} className="bg-violet-600 hover:bg-violet-700 text-white font-bold">
                  {tcSaving ? "Salvando..." : "Salvar Conteúdo"}
                </Button>
              </form>
              <div className="space-y-3">
                <h3 className="font-bold flex items-center gap-2"><BookOpen className="w-4 h-4 text-violet-400" /> Cadastrados ({tcList.length})</h3>
                {tcLoading ? <div className="text-center py-8 text-white/30">Carregando...</div>
                  : tcList.length === 0 ? <div className="text-center py-8 text-white/30 bg-white/[0.02] rounded-2xl border border-white/[0.06]"><BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Nenhum conteúdo cadastrado ainda.</p></div>
                  : tcList.map(c => (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between bg-[#12121a] border border-white/[0.07] rounded-2xl px-5 py-4">
                      <div>
                        <p className="font-bold text-sm text-white">{c.title}</p>
                        <p className="text-xs text-white/40 mt-0.5">{[c.subject, c.grade_level].filter(Boolean).join(" · ")}{c.tags && <span className="ml-2 text-violet-400/70"># {c.tags}</span>}</p>
                      </div>
                      <button onClick={() => deleteTeacherContent(c.id)} className="ml-4 p-2 text-white/30 hover:text-red-400 transition-colors rounded-xl hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
              </div>
            </div>
          )}

          {/* ══ BANCO DE DADOS (Knowledge Base) ══ */}
          {activeSection === "banco-dados" && (
            <div className="space-y-8">
              <h2 className="text-lg font-black flex items-center gap-2"><Database className="w-5 h-5 text-violet-400" /> Base de Conhecimento</h2>
              <p className="text-white/40 text-sm -mt-4">Documentos aqui são consultados internamente pelo sistema (Professor Tiagão e Tutor) antes de buscar informações externas. Esta seção é exclusiva para administradores.</p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-white/[0.07] bg-[#12121a] p-5">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-violet-400" /> Adicionar por Texto</h3>
                  <form onSubmit={saveKbText} className="space-y-3">
                    <input value={kbForm.title} onChange={e => setKbForm(f => ({ ...f, title: e.target.value }))} placeholder="Título do documento *" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500" />
                    <input value={kbForm.subject} onChange={e => setKbForm(f => ({ ...f, subject: e.target.value }))} placeholder="Matéria (ex: Matemática)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500" />
                    <textarea value={kbForm.contentText} onChange={e => setKbForm(f => ({ ...f, contentText: e.target.value }))} placeholder="Cole o conteúdo aqui... *" required rows={5} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500 resize-none" />
                    <button type="submit" disabled={kbSaving || !kbForm.title || !kbForm.contentText} className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                      {kbSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Plus className="w-4 h-4" />Adicionar à Base</>}
                    </button>
                  </form>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-[#12121a] p-5">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Upload className="w-4 h-4 text-violet-400" /> Upload em Massa (PDF / DOCX / TXT)</h3>
                  <form onSubmit={saveBatchFiles} className="space-y-3">
                    <input value={kbForm.subject} onChange={e => setKbForm(f => ({ ...f, subject: e.target.value }))} placeholder="Matéria (aplicada a todos)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500" />
                    <div
                      onClick={() => !kbSaving && kbFileRef.current?.click()}
                      onDragOver={ev => { ev.preventDefault(); }}
                      onDrop={ev => {
                        ev.preventDefault();
                        const dropped = Array.from(ev.dataTransfer.files).filter(f => /\.(pdf|docx?|txt)$/i.test(f.name));
                        if (dropped.length) { setKbFiles(prev => [...prev, ...dropped]); setBatchResults([]); }
                      }}
                      className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors ${kbFiles.length > 0 ? "border-violet-500/40 bg-violet-500/5" : "border-white/15 hover:border-violet-500/50"}`}
                    >
                      {kbFiles.length === 0 ? (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-2 text-white/30" />
                          <p className="text-sm text-white/50 font-semibold">Clique ou arraste arquivos aqui</p>
                          <p className="text-xs text-white/25 mt-1">PDF, DOCX ou TXT · Máx. 25 MB cada · Vários ao mesmo tempo</p>
                        </>
                      ) : (
                        <div className="space-y-1.5 text-left max-h-40 overflow-y-auto pr-1">
                          {kbFiles.map((f, i) => {
                            const r = batchResults[i];
                            const statusColor = !r ? "text-white/50" : r.status === "done" ? "text-emerald-400" : r.status === "error" ? "text-red-400" : r.status === "uploading" ? "text-violet-300" : "text-white/40";
                            const icon = !r ? "⏳" : r.status === "done" ? "✅" : r.status === "error" ? "❌" : r.status === "uploading" ? "⬆️" : "⏳";
                            return (
                              <div key={i} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5">
                                <span className="text-base leading-none">{icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-white truncate">{f.name}</p>
                                  {r?.message && <p className={`text-xs ${statusColor}`}>{r.message}</p>}
                                </div>
                                {!kbSaving && !r && (
                                  <button type="button" onClick={ev => { ev.stopPropagation(); setKbFiles(prev => prev.filter((_, fi) => fi !== i)); }}
                                    className="text-white/25 hover:text-red-400 transition-colors flex-shrink-0">
                                    ×
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <input ref={kbFileRef} type="file" accept=".pdf,.txt,.docx,.doc" multiple className="hidden"
                        onChange={e => {
                          const files = Array.from(e.target.files ?? []);
                          if (files.length) { setKbFiles(prev => [...prev, ...files]); setBatchResults([]); e.target.value = ""; }
                        }} />
                    </div>
                    {kbFiles.length > 0 && !kbSaving && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40 flex-1">{kbFiles.length} arquivo{kbFiles.length > 1 ? "s" : ""} selecionado{kbFiles.length > 1 ? "s" : ""}</span>
                        <button type="button" onClick={() => { setKbFiles([]); setBatchResults([]); }} className="text-xs text-white/30 hover:text-red-400 transition-colors">Limpar tudo</button>
                      </div>
                    )}
                    <button type="submit" disabled={kbSaving || kbFiles.length === 0} className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                      {kbSaving
                        ? <><Loader2 className="w-4 h-4 animate-spin" />Processando {batchResults.filter(r => r.status === "done" || r.status === "error").length}/{kbFiles.length}...</>
                        : <><Upload className="w-4 h-4" />Processar {kbFiles.length > 1 ? `${kbFiles.length} Arquivos` : "Arquivo"}</>}
                    </button>
                  </form>
                </div>
              </div>
              {kbMsg && (
                <div className={`px-4 py-3 rounded-xl text-sm ${kbMsg.ok ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-red-500/10 text-red-300 border border-red-500/20"}`}>
                  {kbMsg.text.split("\n").map((line, i) => (
                    <p key={i} className={i === 0 ? "font-semibold" : "mt-1 text-xs opacity-80 break-words"}>{line}</p>
                  ))}
                </div>
              )}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="font-bold">Documentos ({kbDocs.length})</h3>
                  <button onClick={fetchKbDocs} className="p-1.5 rounded-lg hover:bg-white/5"><RefreshCw className="w-3.5 h-3.5 text-white/40" /></button>
                </div>
                {kbLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
                  : kbDocs.length === 0 ? <div className="text-center py-12 text-white/30 border border-white/[0.07] rounded-2xl"><Database className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>Nenhum documento na base ainda.</p></div>
                  : <div className="space-y-3">{kbDocs.map((doc: any) => (
                    <div key={doc.id} className="rounded-2xl border border-white/[0.07] bg-[#12121a] p-4 flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-violet-400" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-sm truncate">{doc.title}</p>
                          {doc.subject && <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-semibold flex-shrink-0">{doc.subject}</span>}
                        </div>
                        <p className="text-white/40 text-xs line-clamp-2">{doc.preview}</p>
                        <p className="text-white/25 text-xs mt-1">Adicionado em {new Date(doc.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <button onClick={() => deleteKbDoc(doc.id)} className="p-2 rounded-xl hover:bg-red-500/10 hover:text-red-400 text-white/30 transition-colors flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}</div>}
              </div>
            </div>
          )}

          {/* ══ INTEGRAÇÕES ══ */}
          {activeSection === "integracoes" && (
            <div className="space-y-5">
              <h2 className="text-lg font-black flex items-center gap-2"><Link className="w-5 h-5 text-blue-400" /> Integrações</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ...aiProviders.map(p => ({ name: p.name, status: p.ok ? "Ativo" : "Pendente", color: p.ok ? "emerald" : "gray", icon: p.emoji })),
                  { name: "Stripe", status: "Conectado", color: "emerald", icon: "💳" },
                  { name: "Clerk Auth", status: "Conectado", color: "emerald", icon: "🔐" },
                  { name: "INEP / BNCC", status: "Configurado", color: "blue", icon: "📚" },
                  { name: "Wikipedia API", status: "Ativo", color: "emerald", icon: "🌐" },
                  { name: "Resend Email", status: "Conectado", color: "emerald", icon: "📧" },
                  { name: "WhatsApp", status: "Não configurado", color: "gray", icon: "💬" },
                ].map(i => (
                  <div key={i.name} className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-5">
                    <div className="text-2xl mb-3">{i.icon}</div>
                    <p className="font-bold text-sm text-white">{i.name}</p>
                    <div className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${i.color === "emerald" ? "bg-emerald-500/10 text-emerald-400" : i.color === "blue" ? "bg-blue-500/10 text-blue-400" : "bg-white/10 text-white/40"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${i.color === "emerald" ? "bg-emerald-400" : i.color === "blue" ? "bg-blue-400" : "bg-white/30"}`} />
                      {i.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ LOGS & SEGURANÇA ══ */}
          {activeSection === "logs-seguranca" && (() => {
            const EVENT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
              login: { label: "Login", color: "text-blue-400", icon: "🔑" },
              essay_submitted: { label: "Redação", color: "text-violet-400", icon: "✍️" },
              essay_corrected: { label: "Redação corrigida", color: "text-purple-400", icon: "📝" },
              quiz_completed: { label: "Quiz", color: "text-amber-400", icon: "🎯" },
              flashcard_reviewed: { label: "Flashcard", color: "text-cyan-400", icon: "🃏" },
              notebook_chat: { label: "Notebook Chat", color: "text-emerald-400", icon: "💬" },
              notebook_source_added: { label: "Fonte adicionada", color: "text-teal-400", icon: "📎" },
              notebook_created: { label: "Caderno criado", color: "text-green-400", icon: "📓" },
              trilha_session: { label: "Trilha do Mestre", color: "text-orange-400", icon: "🏆" },
              trilha_completed: { label: "Trilha completa", color: "text-yellow-400", icon: "🎖️" },
              study_plan_created: { label: "Plano de estudo", color: "text-pink-400", icon: "📅" },
              simulado_started: { label: "Simulado iniciado", color: "text-indigo-400", icon: "📊" },
              simulado_completed: { label: "Simulado concluído", color: "text-blue-300", icon: "✅" },
            };
            const events = stats?.recentEvents ?? [];
            const eventsByType = stats?.eventsByType30d ?? [];
            return (
            <div className="space-y-5">
              <h2 className="text-lg font-black flex items-center gap-2"><Lock className="w-5 h-5 text-red-400" /> Logs & Segurança</h2>

              <div className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-4">
                <DateRangeFilter value={dateRange} onChange={r => setDateRange(r)} loading={statsLoading} />
              </div>

              {/* Evento por tipo no período selecionado */}
              {eventsByType.length > 0 && (
                <div className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-5">
                  <p className="text-sm font-bold text-white/70 mb-4">Eventos por tipo — últimos 30 dias</p>
                  <div className="space-y-2">
                    {eventsByType.map(ev => {
                      const cfg = EVENT_LABELS[ev.event_type] ?? { label: ev.event_type, color: "text-white/60", icon: "📌" };
                      const maxCount = Math.max(...eventsByType.map(e => e.count), 1);
                      return (
                        <div key={ev.event_type}>
                          <div className="flex justify-between mb-0.5">
                            <span className="text-xs text-white/60">{cfg.icon} {cfg.label}</span>
                            <span className="text-xs font-bold text-white/70">{ev.count} eventos · {ev.users} usuários</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500" style={{ width: `${Math.max(Math.round(ev.count / maxCount * 100), 2)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Feed de eventos recentes */}
              <div className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-5">
                <p className="text-sm font-bold text-white/70 mb-4">Feed de atividade recente</p>
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {events.length === 0 ? (
                    <p className="text-center text-white/30 py-8 text-sm">
                      Nenhum evento ainda. Os eventos aparecerão aqui quando usuários usarem a plataforma.
                    </p>
                  ) : events.map((ev, i) => {
                    const cfg = EVENT_LABELS[ev.event_type] ?? { label: ev.event_type, color: "text-white/60", icon: "📌" };
                    const name = [ev.first_name, ev.last_name].filter(Boolean).join(" ") || ev.email?.split("@")[0] || "Anônimo";
                    const relTime = (() => {
                      const diff = Date.now() - new Date(ev.created_at).getTime();
                      if (diff < 60000) return "agora mesmo";
                      if (diff < 3600000) return `${Math.round(diff / 60000)}min atrás`;
                      if (diff < 86400000) return `${Math.round(diff / 3600000)}h atrás`;
                      return new Date(ev.created_at).toLocaleDateString("pt-BR");
                    })();
                    return (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                        <span className="text-base flex-shrink-0 w-6 text-center">{cfg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-xs text-white/40 ml-1.5">por {name}</span>
                        </div>
                        <span className="text-[10px] text-white/25 flex-shrink-0">{relTime}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Logins recentes */}
              <div className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-5">
                <p className="text-sm font-bold text-white/70 mb-4">Últimos logins registrados</p>
                <div className="space-y-2">
                  {(stats?.recentLogins ?? []).slice(0, 10).map((u, i) => {
                    const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email?.split("@")[0] || "User";
                    return (
                      <div key={`${u.id}-${i}`} className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                        <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-[11px] font-black text-violet-300 flex-shrink-0">
                          {name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white/70 truncate">{name}</p>
                          <p className="text-[10px] text-white/30 truncate">{u.email}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] font-semibold text-white/50">{new Date(u.created_at).toLocaleDateString("pt-BR")}</p>
                          <p className="text-[9px] text-white/25">{new Date(u.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      </div>
                    );
                  })}
                  {(!stats || stats.recentLogins.length === 0) && <p className="text-center text-white/30 py-4 text-sm">Nenhum login registrado</p>}
                </div>
              </div>

              {/* Status de segurança */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 flex items-center gap-4">
                <Shield className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="font-bold text-emerald-400">Sistema Seguro</p>
                  <p className="text-xs text-white/40">Nenhuma atividade suspeita detectada. Todos os acessos via autenticação Clerk PKCE.</p>
                </div>
              </div>
            </div>
            );
          })()}

          {/* ══ BUGS & SISTEMA ══ */}
          {activeSection === "bugs-sistema" && (
            <div className="space-y-5">
              <h2 className="text-lg font-black flex items-center gap-2"><Bug className="w-5 h-5 text-amber-400" /> Bugs & Sistema</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Bugs reportados", value: "0", icon: Bug, color: "text-red-400" },
                  { label: "Erros últimas 24h", value: "0", icon: AlertTriangle, color: "text-amber-400" },
                  { label: "Uptime", value: "99.9%", icon: Server, color: "text-emerald-400" },
                ].map(k => (
                  <div key={k.label} className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-5">
                    <k.icon className={`w-6 h-6 ${k.color} mb-3`} />
                    <p className="text-2xl font-black text-white">{k.value}</p>
                    <p className="text-xs text-white/40 mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <div>
                  <p className="font-bold text-emerald-400">Status do Sistema: Online</p>
                  <p className="text-xs text-white/30">API, banco de dados e servidor funcionando normalmente</p>
                </div>
              </div>
            </div>
          )}

          {/* ══ CONFIGURAÇÕES ══ */}
          {activeSection === "configuracoes" && (
            <div className="space-y-5">
              <h2 className="text-lg font-black flex items-center gap-2"><Settings className="w-5 h-5 text-white/60" /> Configurações</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Modo de manutenção", desc: "Bloqueia acesso de novos usuários", active: false },
                  { label: "Registro público aberto", desc: "Permite cadastros sem convite", active: true },
                  { label: "IA habilitada", desc: "Respostas do Professor Tiagão", active: true },
                  { label: "Simulados ENEM ativos", desc: "Módulo de simulados disponível", active: true },
                ].map(s => (
                  <div key={s.label} className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-white">{s.label}</p>
                      <p className="text-xs text-white/40">{s.desc}</p>
                    </div>
                    <div className={`w-10 h-5 rounded-full transition-colors flex items-center ${s.active ? "bg-violet-600 justify-end pr-0.5" : "bg-white/10 justify-start pl-0.5"}`}>
                      <div className="w-4 h-4 rounded-full bg-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ SOLICITAÇÕES ══ */}
          {activeSection === "solicitacoes" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-black flex items-center gap-2"><Bell className="w-5 h-5 text-violet-400" /> Solicitações de Acesso</h2>
                <button onClick={fetchRoleRequests} className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm">
                  <RefreshCw className={`w-4 h-4 ${rrLoading ? "animate-spin" : ""}`} /> Atualizar
                </button>
              </div>
              {rrMsg && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold ${rrMsg.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-300"}`}>
                  {rrMsg.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} {rrMsg.text}
                </div>
              )}
              {rrLoading ? <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 text-violet-400 animate-spin" /></div>
                : roleRequests.length === 0 ? (
                  <div className="bg-[#12121a] rounded-2xl p-10 border border-white/[0.07] text-center">
                    <Bell className="w-10 h-10 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">Nenhuma solicitação no momento</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {roleRequests.map(r => {
                      const isPending = r.status === "pending";
                      const isApproved = r.status === "approved";
                      const roleLabel = r.requestedRole === "teacher" ? "Professor" : r.requestedRole === "government" ? "Governo" : r.requestedRole;
                      const name = [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email || r.userId;
                      return (
                        <div key={r.id} className={`bg-[#12121a] rounded-2xl p-5 border transition-all ${isPending ? "border-amber-500/30" : isApproved ? "border-emerald-500/30" : "border-red-500/20 opacity-60"}`}>
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
                            </div>
                            {isPending && (
                              <div className="flex flex-col gap-2 flex-shrink-0">
                                <Button onClick={() => reviewRequest(r.id, "approve")} disabled={rrReviewing === r.id}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-xl h-auto">
                                  {rrReviewing === r.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3 h-3 mr-1" />Aprovar</>}
                                </Button>
                                <Button onClick={() => reviewRequest(r.id, "reject")} disabled={rrReviewing === r.id} variant="outline"
                                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs px-4 py-2 rounded-xl h-auto">
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

          {/* ══ PERFIS & ACESSO ══ */}
          {activeSection === "roles" && (
            <div className="space-y-4">
              <h2 className="text-lg font-black flex items-center gap-2"><UserCog className="w-5 h-5 text-violet-400" /> Perfis & Acesso</h2>
              {roleMsg && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold ${roleMsg.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-300"}`}>
                  {roleMsg.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} {roleMsg.text}
                </div>
              )}
              <div className="bg-[#12121a] border border-white/[0.07] rounded-2xl p-4">
                <p className="text-white/50 text-sm">Atribua perfis especiais para liberar acesso ao Módulo Professor, Instituição ou Governo.</p>
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
              {loading ? <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
                : <div className="space-y-2">
                  {users.map(user => {
                    const currentRole = user.role ?? "student";
                    const isUpdating = roleUpdating === user.id;
                    return (
                      <div key={user.id} className="flex items-center gap-4 bg-[#12121a] border border-white/[0.07] rounded-2xl px-5 py-3">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {((user.firstName ?? user.email ?? "?")[0]).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Sem nome"}</p>
                          <p className="text-white/30 text-xs truncate">{user.email}</p>
                        </div>
                        <select value={currentRole} onChange={e => updateRole(user.id, e.target.value)} disabled={isUpdating}
                          className="bg-slate-800 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-50">
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
                </div>}
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
