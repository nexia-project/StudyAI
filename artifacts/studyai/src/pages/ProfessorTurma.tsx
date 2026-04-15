import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, Users, BookOpen, BarChart2, Trophy, Plus, Trash2, Copy, Check,
  AlertTriangle, TrendingUp, Zap, Calendar, RefreshCw, Star, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Student {
  id: string;
  name: string;
  email: string | null;
  xp: number;
  simCount: number;
  avgAccuracy: number;
  activeDays: number;
  status: "risco" | "iniciante" | "ativo" | "destaque";
  grade: string | null;
  joinedAt: string;
}

interface Task {
  id: string;
  type: string;
  title: string;
  description: string | null;
  materia: string | null;
  dueDate: string | null;
  createdAt: string;
}

interface Turma {
  id: string;
  name: string;
  serie: string | null;
  subject: string | null;
  description: string | null;
  inviteCode: string;
  isActive: boolean;
}

interface Dashboard {
  totalStudents: number;
  avgXp: number;
  atRisk: number;
  topStudent: string | null;
  engagementRate: number;
  simCompleted: number;
}

interface RankEntry {
  rank: number;
  id: string;
  name: string;
  xp: number;
  isMe: boolean;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  risco: { label: "Em risco", color: "text-red-400", bg: "bg-red-400/10 border-red-400/30" },
  iniciante: { label: "Iniciante", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30" },
  ativo: { label: "Ativo", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30" },
  destaque: { label: "Destaque", color: "text-indigo-400", bg: "bg-indigo-400/10 border-indigo-400/30" },
};

const TASK_TYPES = [
  { value: "simulado", label: "Simulado" },
  { value: "flashcard", label: "Flashcards" },
  { value: "leitura", label: "Leitura" },
  { value: "redacao", label: "Redação" },
  { value: "exercicio", label: "Lista de exercícios" },
];

export default function ProfessorTurmaPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const turmaId = params.id;

  const [turma, setTurma] = useState<Turma | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"alunos" | "tarefas" | "dashboard" | "ranking">("alunos");
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ type: "simulado", title: "", description: "", materia: "", dueDate: "" });
  const [savingTask, setSavingTask] = useState(false);

  useEffect(() => {
    if (turmaId) loadAll();
  }, [turmaId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [turmaRes, studentsRes, tasksRes, dashRes, rankRes] = await Promise.all([
        fetch(`/api/teacher/turmas/${turmaId}`),
        fetch(`/api/teacher/turmas/${turmaId}/students`),
        fetch(`/api/teacher/turmas/${turmaId}/tasks`),
        fetch(`/api/teacher/turmas/${turmaId}/dashboard`),
        fetch(`/api/teacher/turmas/${turmaId}/ranking`),
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskForm),
      });
      const data = await res.json();
      if (data.task) {
        setTasks(prev => [data.task, ...prev]);
        setShowTaskForm(false);
        setTaskForm({ type: "simulado", title: "", description: "", materia: "", dueDate: "" });
      }
    } finally {
      setSavingTask(false);
    }
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/teacher/turmas/${turmaId}/tasks/${taskId}`, { method: "DELETE" });
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }

  async function kickStudent(studentId: string, name: string) {
    if (!confirm(`Remover ${name} da turma?`)) return;
    await fetch(`/api/teacher/turmas/${turmaId}/students/${studentId}`, { method: "DELETE" });
    setStudents(prev => prev.filter(s => s.id !== studentId));
  }

  function copyCode() {
    if (turma) {
      navigator.clipboard.writeText(turma.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!turma) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Turma não encontrada</p>
          <Button onClick={() => navigate("/professor")} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "alunos", label: "Alunos", icon: Users, count: students.length },
    { id: "tarefas", label: "Tarefas", icon: BookOpen, count: tasks.length },
    { id: "dashboard", label: "Dashboard", icon: BarChart2 },
    { id: "ranking", label: "Ranking", icon: Trophy },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <button onClick={() => navigate("/professor")}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors mt-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{turma.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {turma.serie && <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">{turma.serie}</span>}
              {turma.subject && <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{turma.subject}</span>}
              {!turma.isActive && <span className="text-xs text-amber-400">Inativa</span>}
            </div>
          </div>
          {/* Invite code badge */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2 flex items-center gap-2">
            <div>
              <p className="text-slate-500 text-xs">Código de convite</p>
              <p className="text-indigo-300 font-mono font-bold tracking-widest">{turma.inviteCode}</p>
            </div>
            <button onClick={copyCode} className="p-1.5 text-slate-400 hover:text-indigo-300 rounded-lg transition-colors">
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
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

        {/* ─── Tab: Alunos ─── */}
        {activeTab === "alunos" && (
          <div>
            {students.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="mb-2">Nenhum aluno ainda</p>
                <p className="text-sm">Compartilhe o código <span className="text-indigo-400 font-mono font-bold">{turma.inviteCode}</span> com seus alunos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {students.map((student, i) => {
                  const statusCfg = STATUS_LABELS[student.status] ?? STATUS_LABELS["ativo"];
                  return (
                    <motion.div key={student.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-600/20 rounded-full flex items-center justify-center text-indigo-300 font-bold text-sm flex-shrink-0">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-medium truncate">{student.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="flex gap-4 mt-1 flex-wrap">
                          <span className="text-slate-400 text-xs flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" /> {student.xp} XP
                          </span>
                          <span className="text-slate-400 text-xs flex items-center gap-1">
                            <Target className="w-3 h-3 text-emerald-400" /> {student.simCount} simulados
                          </span>
                          {student.simCount > 0 && (
                            <span className="text-slate-400 text-xs">{student.avgAccuracy}% acerto</span>
                          )}
                          <span className="text-slate-400 text-xs flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-indigo-400" /> {student.activeDays}d/sem
                          </span>
                        </div>
                      </div>
                      {student.status === "risco" && (
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" title="Aluno em risco" />
                      )}
                      <button onClick={() => kickStudent(student.id, student.name)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Tarefas ─── */}
        {activeTab === "tarefas" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-slate-400 text-sm">{tasks.length} tarefa{tasks.length !== 1 ? "s" : ""} atribuída{tasks.length !== 1 ? "s" : ""}</p>
              <Button onClick={() => setShowTaskForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> Nova tarefa
              </Button>
            </div>

            {showTaskForm && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/80 border border-indigo-500/40 rounded-2xl p-5 mb-4">
                <h4 className="text-white font-medium mb-4">Nova tarefa para a turma</h4>
                <form onSubmit={saveTask} className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Tipo *</label>
                    <select value={taskForm.type} onChange={e => setTaskForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500">
                      {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Matéria</label>
                    <input value={taskForm.materia} onChange={e => setTaskForm(f => ({ ...f, materia: e.target.value }))}
                      placeholder="Ex: Matemática"
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-slate-400 text-xs mb-1 block">Título *</label>
                    <input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Ex: Simulado de Funções — Cap. 3"
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      required />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Data de entrega</label>
                    <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Observações</label>
                    <input value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Instruções adicionais"
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div className="col-span-2 flex gap-2 justify-end">
                    <Button type="button" onClick={() => setShowTaskForm(false)}
                      className="bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={savingTask}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm">
                      {savingTask ? "Salvando..." : "Atribuir tarefa"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {tasks.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhuma tarefa atribuída ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => {
                  const taskType = TASK_TYPES.find(t => t.value === task.type);
                  const isPast = task.dueDate && new Date(task.dueDate) < new Date();
                  return (
                    <div key={task.id} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">{taskType?.label ?? task.type}</span>
                          {task.materia && <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">{task.materia}</span>}
                        </div>
                        <p className="text-white font-medium truncate">{task.title}</p>
                        {task.description && <p className="text-slate-500 text-sm mt-0.5">{task.description}</p>}
                        {task.dueDate && (
                          <p className={`text-xs mt-1 flex items-center gap-1 ${isPast ? "text-red-400" : "text-slate-400"}`}>
                            <Calendar className="w-3 h-3" />
                            Entrega: {new Date(task.dueDate).toLocaleDateString("pt-BR")}
                            {isPast && " (vencida)"}
                          </p>
                        )}
                      </div>
                      <button onClick={() => deleteTask(task.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Dashboard ─── */}
        {activeTab === "dashboard" && dashboard && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: "Alunos", value: dashboard.totalStudents, icon: Users, color: "text-indigo-400", desc: "na turma" },
                { label: "XP médio", value: dashboard.avgXp, icon: Zap, color: "text-amber-400", desc: "por aluno" },
                { label: "Em risco", value: dashboard.atRisk, icon: AlertTriangle, color: "text-red-400", desc: "< 50 XP" },
                { label: "Engajamento", value: `${dashboard.engagementRate}%`, icon: TrendingUp, color: "text-emerald-400", desc: "últimos 7 dias" },
                { label: "Simulados", value: dashboard.simCompleted, icon: Target, color: "text-purple-400", desc: "realizados" },
                { label: "Destaque", value: dashboard.topStudent ?? "—", icon: Star, color: "text-yellow-400", desc: "maior XP" },
              ].map(s => (
                <div key={s.label} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                  <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                  <p className="text-2xl font-bold text-white truncate">{s.value}</p>
                  <p className="text-slate-400 text-sm">{s.label}</p>
                  <p className="text-slate-600 text-xs">{s.desc}</p>
                </div>
              ))}
            </div>

            {dashboard.atRisk > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-medium">
                    {dashboard.atRisk} aluno{dashboard.atRisk > 1 ? "s" : ""} em situação de risco
                  </p>
                  <p className="text-slate-400 text-sm mt-1">
                    Esses alunos têm menos de 50 XP. Considere entrar em contato para entender as dificuldades.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Ranking ─── */}
        {activeTab === "ranking" && (
          <div>
            {ranking.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum aluno na turma ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ranking.map(entry => (
                  <div key={entry.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all
                      ${entry.rank <= 3
                        ? "bg-gradient-to-r from-indigo-900/40 to-slate-800/60 border-indigo-500/30"
                        : "bg-slate-800/60 border-slate-700"}`}>
                    <div className={`w-8 h-8 flex items-center justify-center font-bold text-sm rounded-full flex-shrink-0
                      ${entry.rank === 1 ? "bg-yellow-500 text-black"
                        : entry.rank === 2 ? "bg-slate-400 text-black"
                        : entry.rank === 3 ? "bg-amber-700 text-white"
                        : "bg-slate-700 text-slate-300"}`}>
                      {entry.rank === 1 ? "👑" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{entry.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <Zap className="w-4 h-4" />
                      {entry.xp.toLocaleString("pt-BR")} XP
                    </div>
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
