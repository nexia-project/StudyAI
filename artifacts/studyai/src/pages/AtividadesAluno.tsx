import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, CheckCircle2, Clock, AlertCircle, ChevronRight,
  X, Trophy, ArrowLeft, Loader2, BookOpen, Calendar, Users,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import { useLocation } from "wouter";

interface Question {
  question: string;
  options: string[];
  correct: number;
}

interface Activity {
  id: string;
  title: string;
  description: string | null;
  turmaId: string;
  dueDate: string | null;
  content: { questions?: Question[]; type?: string } | null;
  isPublished: boolean;
  createdAt: string;
  submitted: boolean;
  submission: {
    id: string;
    score: number;
    total: number;
    answers: Record<string, number>;
    createdAt: string;
  } | null;
}

function StatusBadge({ activity }: { activity: Activity }) {
  if (activity.submitted) {
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400">
        <CheckCircle2 className="w-3 h-3" /> Entregue
      </span>
    );
  }
  if (activity.dueDate && new Date(activity.dueDate) < new Date()) {
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-400">
        <AlertCircle className="w-3 h-3" /> Atrasado
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400">
      <Clock className="w-3 h-3" /> Pendente
    </span>
  );
}

function ActivityModal({
  activity,
  onClose,
  onSubmit,
}: {
  activity: Activity;
  onClose: () => void;
  onSubmit: (answers: Record<string, number>) => Promise<void>;
}) {
  const questions = activity.content?.questions ?? [];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; answers: Record<string, number> } | null>(
    activity.submission ? { score: activity.submission.score, total: activity.submission.total, answers: activity.submission.answers ?? {} } : null
  );
  const [startTime] = useState(Date.now());

  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;

  async function handleSubmit() {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(answers);
      const correct = questions.filter((q, i) => q.correct === answers[String(i)]).length;
      setResult({ score: correct, total: questions.length, answers });
    } finally {
      setSubmitting(false);
    }
  }

  const score = result?.score ?? 0;
  const total = result?.total ?? questions.length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-6 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        className="w-full max-w-2xl bg-[#0f0f1a] border border-white/[0.08] rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="font-black text-white text-base">{activity.title}</h3>
            {activity.dueDate && (
              <p className="text-xs text-white/40 mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Prazo: {new Date(activity.dueDate).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/8 text-white/40 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {activity.description && (
            <p className="text-sm text-white/60 bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
              {activity.description}
            </p>
          )}

          {/* Result view */}
          {result && (
            <div className={`rounded-2xl p-5 text-center border ${pct >= 70 ? "bg-emerald-500/10 border-emerald-500/25" : pct >= 50 ? "bg-amber-500/10 border-amber-500/25" : "bg-red-500/10 border-red-500/25"}`}>
              <Trophy className={`w-8 h-8 mx-auto mb-2 ${pct >= 70 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-red-400"}`} />
              <p className={`text-3xl font-black mb-1 ${pct >= 70 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-red-400"}`}>
                {score}/{total}
              </p>
              <p className="text-sm text-white/60">{pct}% de acertos</p>
              <p className="text-xs text-white/40 mt-1">
                {pct >= 70 ? "Ótimo desempenho!" : pct >= 50 ? "Bom trabalho, continue praticando!" : "Continue estudando, você vai melhorar!"}
              </p>
            </div>
          )}

          {/* Questions */}
          {questions.length > 0 && (
            <div className="space-y-4">
              {questions.map((q, qi) => {
                const chosen = result ? result.answers[String(qi)] : answers[String(qi)];
                const isCorrect = result ? chosen === q.correct : null;
                return (
                  <div key={qi} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <p className="text-sm font-semibold text-white mb-3">
                      <span className="text-white/30 mr-2">{qi + 1}.</span>{q.question}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => {
                        const selected = chosen === oi;
                        const showCorrect = result && oi === q.correct;
                        const showWrong = result && selected && oi !== q.correct;
                        return (
                          <button
                            key={oi}
                            disabled={!!result}
                            onClick={() => !result && setAnswers(a => ({ ...a, [String(qi)]: oi }))}
                            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all border
                              ${showCorrect ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                                : showWrong ? "bg-red-500/15 border-red-500/40 text-red-300"
                                : selected ? "bg-violet-500/20 border-violet-500/40 text-violet-200"
                                : result ? "bg-white/[0.02] border-white/[0.06] text-white/40"
                                : "bg-white/[0.03] border-white/[0.07] text-white/70 hover:bg-white/[0.07] hover:border-white/[0.15] hover:text-white cursor-pointer"}`}
                          >
                            <span className="font-bold text-xs mr-2 opacity-60">{String.fromCharCode(65 + oi)})</span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {questions.length === 0 && !result && (
            <div className="text-center py-8 text-white/30 text-sm">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Esta atividade não contém questões
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/6 hover:bg-white/10 text-white/60 text-sm font-bold transition-all">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          {!result && questions.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-violet-500 text-white text-sm font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Enviar ({Object.keys(answers).length}/{questions.length})
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function AtividadesAlunoPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  const apiBase = (import.meta as any).env?.VITE_API_URL ?? "";

  useEffect(() => {
    if (isLoading) return;
    if (!user) { navigate("/login"); return; }
    fetchActivities();
  }, [isLoading, user]);

  async function fetchActivities() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/student/activities`, { credentials: "include" });
      const data = await res.json();
      setActivities(data.activities ?? []);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswers(activityId: string, answers: Record<string, number>) {
    const startTime = Date.now();
    const res = await fetch(`${apiBase}/api/student/activities/${activityId}/submit`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, timeSpentSeconds: Math.round((Date.now() - startTime) / 1000) }),
    });
    const data = await res.json();
    setActivities(prev =>
      prev.map(a =>
        a.id === activityId
          ? { ...a, submitted: true, submission: data.submission }
          : a
      )
    );
    if (selected?.id === activityId) {
      setSelected(prev => prev ? { ...prev, submitted: true, submission: data.submission } : null);
    }
  }

  const filtered = activities.filter(a => {
    if (filter === "pending") return !a.submitted;
    if (filter === "done") return a.submitted;
    return true;
  });

  const pendingCount = activities.filter(a => !a.submitted).length;
  const doneCount = activities.filter(a => a.submitted).length;

  return (
    <div className="min-h-screen bg-slate-50 studyai-with-sidebar pt-14 md:pt-0">
      <AppNav />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-violet-600" /> Minhas Atividades
          </h1>
          <p className="text-slate-500 text-sm mt-1">Atividades enviadas pelo seu professor</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Total", value: activities.length, color: "text-slate-700", bg: "bg-white" },
            { label: "Pendentes", value: pendingCount, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Entregues", value: doneCount, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-slate-100 text-center shadow-sm`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { id: "all" as const, label: "Todas" },
            { id: "pending" as const, label: "Pendentes" },
            { id: "done" as const, label: "Entregues" },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                filter === f.id
                  ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                  : "bg-white text-slate-500 hover:text-slate-700 border border-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Activities list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-bold text-slate-500 mb-1">
              {filter === "pending" ? "Nenhuma atividade pendente" : filter === "done" ? "Nenhuma atividade entregue" : "Nenhuma atividade encontrada"}
            </p>
            <p className="text-sm text-slate-400">
              {activities.length === 0 ? "Você ainda não está em nenhuma turma com atividades" : "Sem atividades nesta categoria"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(activity => {
              const questions = activity.content?.questions ?? [];
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-violet-200 transition-all cursor-pointer"
                  onClick={() => setSelected(activity)}
                >
                  <div className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      activity.submitted ? "bg-emerald-100" : "bg-violet-100"
                    }`}>
                      {activity.submitted
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        : <ClipboardList className="w-5 h-5 text-violet-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-800 text-sm truncate">{activity.title}</h3>
                        <StatusBadge activity={activity} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {questions.length > 0 && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> {questions.length} quest{questions.length === 1 ? "ão" : "ões"}
                          </span>
                        )}
                        {activity.dueDate && (
                          <span className={`text-xs flex items-center gap-1 ${
                            new Date(activity.dueDate) < new Date() && !activity.submitted ? "text-red-500" : "text-slate-400"
                          }`}>
                            <Calendar className="w-3 h-3" />
                            {new Date(activity.dueDate).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {activity.submitted && activity.submission && (
                          <span className="text-xs text-emerald-600 font-bold">
                            {activity.submission.score}/{activity.submission.total} acertos
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <ActivityModal
            activity={selected}
            onClose={() => setSelected(null)}
            onSubmit={(answers) => submitAnswers(selected.id, answers)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
