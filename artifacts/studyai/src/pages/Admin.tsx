import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Brain, Shield, CheckCircle, XCircle, Users, RefreshCw, Crown, UserX, BookOpen, Plus, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

type User = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  stripeSubscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
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

export default function AdminPage() {
  const [, navigate] = useLocation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "content">("users");
  const [tcList, setTcList] = useState<TeacherContent[]>([]);
  const [tcLoading, setTcLoading] = useState(false);
  const [tcForm, setTcForm] = useState({ title: "", subject: "", gradeLevel: "", contentText: "", tags: "" });
  const [tcSaving, setTcSaving] = useState(false);
  const [tcMessage, setTcMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
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
      const res = await fetch(`/api/admin/users/${userId}/status`, {
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
      const res = await fetch("/api/teacher-content");
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
      const res = await fetch("/api/teacher-content", {
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
    await fetch(`/api/teacher-content/${id}`, { method: "DELETE" });
    fetchTeacherContent();
  }

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { if (activeTab === "content") fetchTeacherContent(); }, [activeTab]);

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

        <div className="flex gap-2 mb-8 border-b border-white/10 pb-0">
          {[
            { key: "users", label: "Usuários", icon: Users },
            { key: "content", label: "Conteúdo de Professores", icon: BookOpen },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as "users" | "content")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === tab.key
                  ? "border-violet-500 text-violet-400"
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

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
      </main>
    </div>
  );
}
