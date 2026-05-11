import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Target, Clock, BookOpen, Sparkles, Loader2, ChevronRight,
  ChevronLeft, RotateCcw, Star, TrendingUp, Zap, CheckCircle2, Brain,
  Sun, Moon, Coffee, Flame, ArrowLeft,
} from "lucide-react";
import { useLocation } from "wouter";
import { AppNav } from "@/components/AppNav";
import { useStudyAuth } from "@/hooks/useStudyAuth";

const MATERIAS = [
  "Matemática", "Português", "Física", "Química", "Biologia",
  "História", "Geografia", "Filosofia", "Sociologia", "Inglês", "Redação",
];

const OBJETIVOS = [
  { id: "enem", label: "ENEM", emoji: "🎓", desc: "Universidade pública / SISU" },
  { id: "vestibular", label: "Vestibular", emoji: "🏛️", desc: "Fuvest, Unicamp, UERJ..." },
  { id: "concurso", label: "Concurso Público", emoji: "📋", desc: "Federal, Estadual, Municipal" },
  { id: "militar", label: "Militar / Policial", emoji: "🎖️", desc: "ESPCEX, EEAR, PM, PC..." },
  { id: "residencia", label: "Residência Médica", emoji: "🏥", desc: "Revalida, residências" },
  { id: "outro", label: "Outro Objetivo", emoji: "⭐", desc: "Personalizado" },
];

const MATERIA_ICONS: Record<string, string> = {
  Matemática: "📐", Português: "📝", Física: "⚡", Química: "🧪", Biologia: "🧬",
  História: "📜", Geografia: "🌍", Filosofia: "🤔", Sociologia: "👥", Inglês: "🇬🇧", Redação: "✍️",
};

const DIA_EMOJIS: Record<string, string> = {
  Segunda: "🌅", Terça: "⚡", Quarta: "🎯", Quinta: "🔥", Sexta: "🌟", Sábado: "🏆", Domingo: "😴",
};

interface ScheduleDay { dia: string; materia: string; topico: string; horas: number; atividade: string; }
interface ScheduleWeek { numero: number; tema: string; foco: string; dias: ScheduleDay[]; }
interface ScheduleMeta { semana: number; descricao: string; }
interface Schedule {
  titulo: string; resumo: string;
  semanas: ScheduleWeek[];
  metas: ScheduleMeta[];
  dicas: string[];
}

interface Cronograma {
  id: string;
  objetivo: string;
  targetDate: string;
  targetScore: number;
  hoursPerDay: number;
  materiasFocais: string[];
  schedule: Schedule;
}

export default function CronogramaPage() {
  const [, navigate] = useLocation();
  const { user } = useStudyAuth();
  const [cronograma, setCronograma] = useState<Cronograma | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(0);

  const [form, setForm] = useState({
    objetivo: "enem",
    targetDate: "",
    targetScore: 750,
    hoursPerDay: 2,
    materiasFocais: ["Matemática", "Português"],
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const r = await fetch("/api/student/cronograma", { credentials: "include" });
      if (r.ok) {
        const d = await r.json();
        setCronograma(d.cronograma);
        setShowForm(!d.cronograma);
      } else {
        setShowForm(true);
      }
    } catch {
      setShowForm(true);
    } finally {
      setLoading(false);
    }
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    try {
      const r = await fetch("/api/student/cronograma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          objetivo: OBJETIVOS.find(o => o.id === form.objetivo)?.label ?? form.objetivo,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        setCronograma(d.cronograma);
        setShowForm(false);
        setCurrentWeek(0);
      }
    } finally {
      setGenerating(false);
    }
  }

  function toggleMateria(m: string) {
    setForm(f => ({
      ...f,
      materiasFocais: f.materiasFocais.includes(m)
        ? f.materiasFocais.filter(x => x !== m)
        : [...f.materiasFocais, m],
    }));
  }

  const schedule = cronograma?.schedule as Schedule | undefined;
  const semanas = schedule?.semanas ?? [];
  const week = semanas[currentWeek];
  const totalWeeks = semanas.length;
  const todayDay = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][new Date().getDay()];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] studyai-with-sidebar pt-14 md:pt-0">
        <AppNav />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] studyai-with-sidebar pt-14 md:pt-0">
      <AppNav />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-violet-400" /> Cronograma de Estudos
            </h1>
            <p className="text-white/40 text-sm mt-1">Plano adaptativo personalizado com IA</p>
          </div>
          {cronograma && !showForm && (
            <button onClick={() => { setShowForm(true); setCronograma(null); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs font-bold transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Novo Plano
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* Form */}
          {showForm && (
            <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <form onSubmit={generate} className="space-y-5">
                {/* Objetivo */}
                <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5">
                  <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-violet-400" /> Qual é seu objetivo?
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {OBJETIVOS.map(o => (
                      <button key={o.id} type="button" onClick={() => setForm(f => ({ ...f, objetivo: o.id }))}
                        className={`p-4 rounded-xl border text-left transition-all ${form.objetivo === o.id ? "bg-violet-600/25 border-violet-500/50 text-white" : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"}`}>
                        <div className="text-2xl mb-1.5">{o.emoji}</div>
                        <p className="font-bold text-xs">{o.label}</p>
                        <p className="text-[10px] text-white/35 mt-0.5">{o.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Data + Nota + Horas */}
                <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5">
                  <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" /> Configurações do Plano
                  </h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-white/40 text-xs mb-1.5 block">Data da Prova *</label>
                      <input type="date" required value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500" />
                    </div>
                    <div>
                      <label className="text-white/40 text-xs mb-1.5 block">Nota Alvo: {form.targetScore}/1000</label>
                      <input type="range" min={400} max={1000} step={50} value={form.targetScore}
                        onChange={e => setForm(f => ({ ...f, targetScore: Number(e.target.value) }))}
                        className="w-full mt-3 accent-violet-500" />
                    </div>
                    <div>
                      <label className="text-white/40 text-xs mb-1.5 block">Horas por dia: {form.hoursPerDay}h</label>
                      <input type="range" min={1} max={8} value={form.hoursPerDay}
                        onChange={e => setForm(f => ({ ...f, hoursPerDay: Number(e.target.value) }))}
                        className="w-full mt-3 accent-violet-500" />
                    </div>
                  </div>
                </div>

                {/* Matérias */}
                <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5">
                  <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" /> Matérias Prioritárias
                  </h3>
                  <p className="text-white/30 text-xs mb-4">Selecione as que mais precisam de atenção</p>
                  <div className="flex flex-wrap gap-2">
                    {MATERIAS.map(m => (
                      <button key={m} type="button" onClick={() => toggleMateria(m)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border
                          ${form.materiasFocais.includes(m) ? "bg-violet-600/30 border-violet-500/50 text-violet-300" : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"}`}>
                        <span>{MATERIA_ICONS[m] ?? "📚"}</span>{m}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={generating || !form.targetDate || form.materiasFocais.length === 0}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-violet-500 disabled:opacity-50 text-white font-black text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.01]">
                  {generating ? <><Loader2 className="w-5 h-5 animate-spin" />Criando seu cronograma personalizado...</> : <><Sparkles className="w-5 h-5" />Gerar Meu Cronograma com IA</>}
                </button>
              </form>
            </motion.div>
          )}

          {/* Cronograma Ativo */}
          {!showForm && cronograma && schedule && (
            <motion.div key="schedule" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {/* Plan header */}
              <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-900/30 to-violet-900/20 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-white">{schedule.titulo}</h2>
                    <p className="text-white/60 text-sm mt-2 leading-relaxed">{schedule.resumo}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="bg-violet-600/20 rounded-xl px-4 py-2.5 text-center">
                      <p className="text-violet-300 font-black text-xl">{cronograma.targetScore}</p>
                      <p className="text-white/40 text-xs">nota alvo</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-white/5 rounded-xl px-2 py-2 text-center">
                    <Target className="w-4 h-4 text-violet-400 mx-auto mb-1" />
                    <p className="text-white/60 text-[11px] leading-tight truncate px-1">{cronograma.objetivo}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl px-2 py-2 text-center">
                    <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-white/60 text-[11px] leading-tight">{cronograma.hoursPerDay}h/dia</p>
                  </div>
                  <div className="bg-white/5 rounded-xl px-2 py-2 text-center">
                    <Calendar className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                    <p className="text-white/60 text-[11px] leading-tight">{totalWeeks} sem.</p>
                  </div>
                </div>
              </div>

              {/* Week navigation */}
              <div className="flex items-center justify-between gap-3">
                <button onClick={() => setCurrentWeek(w => Math.max(0, w - 1))} disabled={currentWeek === 0}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 overflow-x-auto">
                  <div className="flex gap-2 justify-center">
                    {semanas.map((w, i) => (
                      <button key={i} onClick={() => setCurrentWeek(i)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${currentWeek === i ? "bg-violet-600 text-white" : "bg-white/5 text-white/30 hover:text-white hover:bg-white/10"}`}>
                        S{w.numero}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setCurrentWeek(w => Math.min(totalWeeks - 1, w + 1))} disabled={currentWeek === totalWeeks - 1}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {week && (
                <div className="space-y-4">
                  {/* Week header */}
                  <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-600/25 flex items-center justify-center">
                        <span className="text-violet-300 font-black text-sm">S{week.numero}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{week.tema}</h3>
                        <p className="text-white/40 text-xs mt-0.5">{week.foco}</p>
                      </div>
                    </div>
                  </div>

                  {/* Day schedule */}
                  <div className="space-y-3">
                    {week.dias?.map((day, di) => {
                      const isToday = day.dia === todayDay && currentWeek === 0;
                      return (
                        <motion.div key={di} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: di * 0.04 }}
                          className={`rounded-2xl border p-4 ${isToday ? "border-violet-500/40 bg-violet-600/10" : "border-white/[0.06] bg-[#0f0f1a]"}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 text-base">
                              {DIA_EMOJIS[day.dia] ?? "📅"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-black ${isToday ? "text-violet-300" : "text-white/50"}`}>{day.dia}</span>
                                {isToday && <span className="text-[10px] bg-violet-500/30 text-violet-300 px-2 py-0.5 rounded-full font-bold">HOJE</span>}
                                <span className="text-xs font-bold text-white">{MATERIA_ICONS[day.materia] ?? "📚"} {day.materia}</span>
                              </div>
                              <p className="text-white/70 text-xs mt-1">{day.topico}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-white/30 text-[10px] flex items-center gap-1"><Clock className="w-3 h-3" />{day.horas}h</span>
                                <span className="text-white/30 text-[10px]">{day.atividade}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Metas */}
              {schedule.metas?.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5">
                  <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" /> Metas do Plano
                  </h3>
                  <div className="space-y-3">
                    {schedule.metas.map((meta, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-300 text-xs font-black flex items-center justify-center flex-shrink-0">
                          S{meta.semana}
                        </div>
                        <p className="text-white/70 text-xs leading-relaxed pt-1">{meta.descricao}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dicas */}
              {schedule.dicas?.length > 0 && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-emerald-400" /> Dicas do Tiagão
                  </h3>
                  <div className="space-y-2">
                    {schedule.dicas.map((dica, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <p className="text-white/70 text-xs leading-relaxed">{dica}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Ir para Simulado", path: "/simulado-enem", emoji: "📝" },
                  { label: "Abrir Flashcards", path: "/app", emoji: "🃏" },
                  { label: "Correção de Redação", path: "/redacao", emoji: "✍️" },
                  { label: "Caderno Digital", path: "/app", emoji: "📓" },
                ].map(a => (
                  <button key={a.label} onClick={() => navigate(a.path)}
                    className="flex items-center gap-2.5 p-4 rounded-xl border border-white/[0.06] bg-[#0f0f1a] hover:border-violet-500/30 hover:bg-violet-600/5 transition-all text-left">
                    <span className="text-xl">{a.emoji}</span>
                    <span className="text-white/60 hover:text-white text-xs font-semibold transition-colors">{a.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
