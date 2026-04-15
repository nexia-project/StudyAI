import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Building2, Users, GraduationCap, BarChart2, ArrowLeft, RefreshCw,
  Shield, Plus, Mail, TrendingUp, Target, Zap, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstitutionStats {
  turmaCount: number;
  studentCount: number;
  teacherCount: number;
  avgXp: number;
}

interface Turma {
  id: string;
  name: string;
  serie: string | null;
  subject: string | null;
  teacherId: string;
}

interface Teacher {
  id: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface Institution {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
  cnpj: string | null;
  createdAt: string;
}

interface InstitutionData {
  institution: Institution | null;
  turmas: Turma[];
  teachers: Teacher[];
  stats: InstitutionStats;
}

export default function InstituicaoPage() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<InstitutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "turmas" | "professores">("overview");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [addTeacherMsg, setAddTeacherMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const meRes = await fetch("/api/institution/me");
      const meData = await meRes.json();

      if (!meData.institution) {
        setError("sem_instituicao");
        return;
      }

      const detailRes = await fetch(`/api/institution/${meData.institution.id}`);
      if (!detailRes.ok) {
        setError("acesso_negado");
        return;
      }
      const detail = await detailRes.json();
      setData(detail);
    } catch {
      setError("Erro ao carregar dados da instituição");
    } finally {
      setLoading(false);
    }
  }

  async function addTeacher(e: React.FormEvent) {
    e.preventDefault();
    if (!teacherEmail.trim() || !data?.institution) return;
    setAddingTeacher(true);
    setAddTeacherMsg(null);
    try {
      const res = await fetch(`/api/institution/${data.institution.id}/teachers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherEmail }),
      });
      const d = await res.json();
      if (res.ok) {
        setAddTeacherMsg({ ok: true, text: "Professor adicionado com sucesso!" });
        setTeacherEmail("");
        await loadData();
      } else {
        setAddTeacherMsg({ ok: false, text: d.error || "Erro ao adicionar professor" });
      }
    } finally {
      setAddingTeacher(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error === "acesso_negado" || error === "sem_instituicao") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 max-w-md text-center">
          <Shield className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            {error === "sem_instituicao" ? "Sem Instituição Vinculada" : "Acesso Restrito"}
          </h2>
          <p className="text-slate-400 mb-6">
            {error === "sem_instituicao"
              ? "Você não está vinculado a nenhuma instituição. Entre em contato com o administrador para ser associado."
              : "Apenas administradores institucionais podem acessar este módulo."}
          </p>
          <Button onClick={() => navigate("/app")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
            Voltar ao início
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!data?.institution) return null;
  const { institution, turmas, teachers, stats } = data;

  const tabs = [
    { id: "overview", label: "Visão Geral", icon: BarChart2 },
    { id: "turmas", label: "Turmas", icon: GraduationCap, count: turmas.length },
    { id: "professores", label: "Professores", icon: Users, count: teachers.length },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <button onClick={() => navigate("/app")}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors mt-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2.5 bg-indigo-600 rounded-xl">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{institution.name}</h1>
              {(institution.city || institution.state) && (
                <p className="text-slate-400 text-sm">
                  {[institution.city, institution.state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/60 p-1 rounded-2xl mb-6">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all
                ${activeTab === tab.id ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}>
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {"count" in tab && (tab.count ?? 0) > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-white/20" : "bg-slate-700"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Overview ─── */}
        {activeTab === "overview" && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Turmas", value: stats.turmaCount, icon: GraduationCap, color: "text-indigo-400" },
                { label: "Professores", value: stats.teacherCount, icon: Users, color: "text-emerald-400" },
                { label: "Alunos", value: stats.studentCount, icon: Users, color: "text-blue-400" },
                { label: "XP médio", value: stats.avgXp, icon: Zap, color: "text-amber-400" },
              ].map(s => (
                <div key={s.label} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                  <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                  <p className="text-2xl font-bold text-white">{s.value.toLocaleString("pt-BR")}</p>
                  <p className="text-slate-400 text-sm">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Institution info */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 mb-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" /> Informações
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {institution.cnpj && (
                  <div>
                    <p className="text-slate-500">CNPJ</p>
                    <p className="text-slate-300">{institution.cnpj}</p>
                  </div>
                )}
                <div>
                  <p className="text-slate-500">Cadastrada em</p>
                  <p className="text-slate-300">{new Date(institution.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Turmas ─── */}
        {activeTab === "turmas" && (
          <div>
            {turmas.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma turma vinculada à instituição</p>
                <p className="text-sm mt-1">Professores precisam criar turmas e vinculá-las à instituição</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {turmas.map((turma, i) => (
                  <motion.div key={turma.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                    <h3 className="text-white font-semibold">{turma.name}</h3>
                    <div className="flex gap-2 mt-1 mb-3">
                      {turma.serie && <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">{turma.serie}</span>}
                      {turma.subject && <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{turma.subject}</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Professores ─── */}
        {activeTab === "professores" && (
          <div>
            {/* Add teacher */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 mb-5">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" /> Adicionar professor
              </h3>
              <form onSubmit={addTeacher} className="flex gap-3">
                <input
                  type="email"
                  value={teacherEmail}
                  onChange={e => setTeacherEmail(e.target.value)}
                  placeholder="email@professor.com"
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
                <Button type="submit" disabled={addingTeacher}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                  {addingTeacher ? "Adicionando..." : "Adicionar"}
                </Button>
              </form>
              {addTeacherMsg && (
                <p className={`text-sm mt-2 ${addTeacherMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
                  {addTeacherMsg.text}
                </p>
              )}
            </div>

            {teachers.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum professor vinculado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teachers.map(teacher => (
                  <div key={teacher.id} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-600/20 rounded-full flex items-center justify-center text-emerald-300 font-bold text-sm flex-shrink-0">
                      {(teacher.firstName || teacher.email || "P").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {[teacher.firstName, teacher.lastName].filter(Boolean).join(" ") || teacher.email || "Professor"}
                      </p>
                      {teacher.email && <p className="text-slate-400 text-sm">{teacher.email}</p>}
                    </div>
                    <span className="ml-auto text-xs bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded-full">
                      {teacher.role === "admin" ? "Admin" : "Professor"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
