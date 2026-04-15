import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  GraduationCap, Users, Plus, Copy, Check, Trash2, ChevronRight,
  BookOpen, BarChart2, AlertTriangle, RefreshCw, ArrowLeft, Shield,
} from "lucide-react";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import { Button } from "@/components/ui/button";

interface Turma {
  id: string;
  name: string;
  serie: string | null;
  subject: string | null;
  description: string | null;
  inviteCode: string;
  isActive: boolean;
  studentCount: number;
  createdAt: string;
}

export default function ProfessorPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", serie: "", subject: "", description: "" });
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchTurmas();
  }, []);

  async function fetchTurmas() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/turmas");
      if (!res.ok) {
        setError("acesso_negado");
        return;
      }
      const data = await res.json();
      setTurmas(data.turmas ?? []);
    } catch {
      setError("Erro ao carregar turmas");
    } finally {
      setLoading(false);
    }
  }

  async function createTurma(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/teacher/turmas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Erro ao criar turma");
        return;
      }
      await fetchTurmas();
      setShowCreate(false);
      setForm({ name: "", serie: "", subject: "", description: "" });
    } finally {
      setCreating(false);
    }
  }

  async function deleteTurma(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta turma? Todos os alunos serão removidos.")) return;
    setDeleting(id);
    try {
      await fetch(`/api/teacher/turmas/${id}`, { method: "DELETE" });
      setTurmas(prev => prev.filter(t => t.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error === "acesso_negado") {
    navigate("/professor/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/app")}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Módulo Professor</h1>
              <p className="text-slate-400 text-sm">Gerencie suas turmas e acompanhe seus alunos</p>
            </div>
          </div>
          <div className="ml-auto">
            <Button onClick={() => setShowCreate(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nova Turma
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Turmas", value: turmas.length, icon: BookOpen, color: "text-indigo-400" },
            { label: "Alunos totais", value: turmas.reduce((a, t) => a + (t.studentCount || 0), 0), icon: Users, color: "text-emerald-400" },
            { label: "Turmas ativas", value: turmas.filter(t => t.isActive).length, icon: BarChart2, color: "text-amber-400" },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-slate-400 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Create turma form */}
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/80 border border-indigo-500/40 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" /> Criar nova turma
            </h3>
            <form onSubmit={createTurma} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-slate-400 text-sm mb-1">Nome da turma *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: 3º Ano B — Matemática"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Série / Nível</label>
                <input value={form.serie} onChange={e => setForm(f => ({ ...f, serie: e.target.value }))}
                  placeholder="Ex: 3º Ano, Técnico, EJA"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Matéria / Disciplina</label>
                <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Ex: Matemática, Português"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-slate-400 text-sm mb-1">Descrição (opcional)</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Descreva a turma..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none" />
              </div>
              <div className="col-span-2 flex gap-3 justify-end">
                <Button type="button" onClick={() => setShowCreate(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                  {creating ? "Criando..." : "Criar Turma"}
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Turma list */}
        {turmas.length === 0 ? (
          <div className="text-center py-20">
            <GraduationCap className="w-14 h-14 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">Nenhuma turma ainda</p>
            <p className="text-slate-500 text-sm mb-6">Crie sua primeira turma e compartilhe o código de convite com seus alunos.</p>
            <Button onClick={() => setShowCreate(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Criar primeira turma
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {turmas.map((turma, i) => (
              <motion.div key={turma.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-slate-800/60 border border-slate-700 hover:border-indigo-500/50 rounded-2xl p-5 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-lg truncate">{turma.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {turma.serie && (
                        <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">{turma.serie}</span>
                      )}
                      {turma.subject && (
                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{turma.subject}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => deleteTurma(turma.id)} disabled={deleting === turma.id}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors ml-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {turma.description && (
                  <p className="text-slate-400 text-sm mb-3 line-clamp-2">{turma.description}</p>
                )}

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{turma.studentCount} aluno{turma.studentCount !== 1 ? "s" : ""}</span>
                  </div>
                  {!turma.isActive && (
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Inativa
                    </span>
                  )}
                </div>

                {/* Invite code */}
                <div className="bg-slate-900/60 rounded-xl p-3 mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 text-xs mb-0.5">Código de convite</p>
                    <p className="text-indigo-300 font-mono font-bold text-lg tracking-widest">{turma.inviteCode}</p>
                  </div>
                  <button onClick={() => copyCode(turma.inviteCode)}
                    className="p-2 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors">
                    {copiedCode === turma.inviteCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <Button onClick={() => navigate(`/professor/turma/${turma.id}`)}
                  className="w-full bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-500 text-indigo-300 hover:text-white rounded-xl transition-all flex items-center justify-center gap-2">
                  Ver turma <ChevronRight className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
