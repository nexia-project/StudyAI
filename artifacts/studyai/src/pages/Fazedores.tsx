import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, BookOpen, Hammer, Lightbulb, Sparkles, Wrench, Clock,
  ChevronDown, ChevronUp, CheckCircle2,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { useStudyAuth } from "@/hooks/useStudyAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Categoria = "consertar" | "organizar" | "criar" | "estudar";

interface DesafioDTO {
  desafioId: string;
  categoria: Categoria;
  titulo: string;
  nivel: string;
  tempoMinutos: number;
  ferramentas: string;
  situacao: string;
  perguntas: [string, string, string];
  passos: [string, string, string, string, string];
  desafioExtra: string;
  conexaoEstudos: string;
  mensagemFinal: string;
}

const CAT_META: {
  id: Categoria;
  label: string;
  Icon: typeof Wrench;
  gradient: string;
}[] = [
  { id: "consertar", label: "Consertar", Icon: Wrench, gradient: "from-amber-500 to-orange-600" },
  { id: "organizar", label: "Organizar", Icon: Lightbulb, gradient: "from-sky-500 to-cyan-600" },
  { id: "criar", label: "Criar", Icon: Hammer, gradient: "from-violet-500 to-purple-600" },
  { id: "estudar", label: "Estudar", Icon: BookOpen, gradient: "from-emerald-500 to-teal-600" },
];

const MAX_POR_CAT = 5;

export default function FazedoresPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useStudyAuth();
  const [view, setView] = useState<"home" | "challenge">("home");
  const [desafio, setDesafio] = useState<DesafioDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [showPassos, setShowPassos] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fezExtra, setFezExtra] = useState(false);
  const [stats, setStats] = useState<{
    porCategoria: Record<Categoria, number>;
    totalCompletos?: number;
  } | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const loadStats = useCallback(async () => {
    if (!isAuthenticated) {
      setStats({
        porCategoria: { consertar: 0, organizar: 0, criar: 0, estudar: 0 },
      });
      return;
    }
    try {
      const r = await fetch("/api/fazedores/estatisticas", { credentials: "include" });
      if (!r.ok) throw new Error("stats");
      const j = await r.json();
      setStats({
        porCategoria: {
          consertar: j.porCategoria?.consertar ?? 0,
          organizar: j.porCategoria?.organizar ?? 0,
          criar: j.porCategoria?.criar ?? 0,
          estudar: j.porCategoria?.estudar ?? 0,
        },
        totalCompletos: j.totalCompletos,
      });
    } catch {
      setStats({
        porCategoria: { consertar: 0, organizar: 0, criar: 0, estudar: 0 },
      });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const fetchDesafio = async (opts: { categoria?: Categoria; desafioId?: string; contexto?: string }) => {
    setLoading(true);
    setFeedback(null);
    try {
      const r = await fetch("/api/fazedores/desafio", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria: opts.categoria,
          desafioId: opts.desafioId,
          contexto: opts.contexto ?? "estudo em casa",
        }),
      });
      if (!r.ok) throw new Error("desafio");
      const d = (await r.json()) as DesafioDTO;
      setDesafio(d);
      setAnswers(["", "", ""]);
      setShowPassos(false);
      setFezExtra(false);
      setStartedAt(Date.now());
      setView("challenge");
    } catch {
      setFeedback("Não foi possível carregar o desafio. Tente de novo em instantes.");
    } finally {
      setLoading(false);
    }
  };

  const startDesafioDoDia = () => {
    fetchDesafio({ contexto: new Date().toDateString() });
  };

  const submitAnswers = async () => {
    if (!desafio) return;
    setLoading(true);
    try {
      const r = await fetch("/api/fazedores/responder", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desafioId: desafio.desafioId, respostas: answers }),
      });
      const j = await r.json();
      setFeedback(j.feedback ?? null);
      setShowPassos(true);
    } catch {
      setFeedback("Erro ao enviar respostas. Você ainda pode ler o plano abaixo.");
      setShowPassos(true);
    } finally {
      setLoading(false);
    }
  };

  const completar = async () => {
    if (!desafio) return;
    setLoading(true);
    const dur = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : undefined;
    try {
      await fetch("/api/fazedores/responder", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desafioId: desafio.desafioId,
          respostas: answers,
          marcarCompleto: true,
          fezExtra,
          duracaoSeg: dur,
        }),
      });
    } catch { /* ignore */ }
    await loadStats();
    setView("home");
    setDesafio(null);
    setLoading(false);
  };

  const catOfDesafio = desafio ? CAT_META.find((c) => c.id === desafio.categoria) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-violet-50/40">
      <AppNav />
      <div className="max-w-3xl mx-auto px-4 pb-24 pt-6">
        {view === "home" && (
          <>
            <header className="mb-8">
              <p className="text-xs font-bold uppercase tracking-widest text-violet-600/90 mb-1">StudyAI</p>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Fazedores</h1>
              <p className="text-slate-600 mt-1 text-sm sm:text-base italic">&quot;Como nossos pais faziam&quot;</p>
              <p className="text-slate-500 text-sm mt-3 leading-relaxed">
                Desafios práticos com ferramentas simples: pensar antes, agir com segurança e conectar com o estudo.
                Sempre peça ajuda de um adulto quando precisar de força, corte ou torneira.
              </p>
            </header>

            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white border border-violet-100 shadow-lg shadow-violet-100/50 p-4 sm:p-5 mb-8"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-slate-900 text-sm sm:text-base">Desafio do dia</h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Um desafio alinhado ao seu dia — você pode refazer categorias quantas vezes quiser.
                  </p>
                  <Button
                    className="mt-3 rounded-xl bg-violet-600 hover:bg-violet-700"
                    disabled={loading}
                    onClick={startDesafioDoDia}
                  >
                    Começar desafio do dia
                  </Button>
                </div>
              </div>
            </motion.section>

            <p className="text-[10px] font-black uppercase tracking-widest text-violet-500/90 mb-3">Categorias</p>
            <div className="grid grid-cols-2 gap-3 mb-10">
              {CAT_META.map(({ id, label, Icon, gradient }) => (
                <button
                  key={id}
                  type="button"
                  disabled={loading}
                  onClick={() => fetchDesafio({ categoria: id })}
                  className="text-left rounded-2xl p-4 bg-white border border-slate-200/80 hover:border-violet-200 hover:shadow-md transition-all disabled:opacity-50"
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3 bg-gradient-to-br", gradient)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-slate-900 text-sm">{label}</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    {id === "consertar" && "Arrumar o que trava ou balança"}
                    {id === "organizar" && "Espaços e rotinas mais claras"}
                    {id === "criar" && "Improvisar com o que tem em casa"}
                    {id === "estudar" && "Organizar conhecimento na prática"}
                  </p>
                </button>
              ))}
            </div>

            <section className="rounded-2xl bg-slate-900 text-slate-50 p-4 sm:p-5 mb-6">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Meu progresso
              </h3>
              {CAT_META.map(({ id, label }) => {
                const n = stats?.porCategoria[id] ?? 0;
                const pct = Math.min(100, Math.round((n / MAX_POR_CAT) * 100));
                return (
                  <div key={id} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-300">{label}</span>
                      <span className="text-slate-400">{n}/{MAX_POR_CAT}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {typeof stats?.totalCompletos === "number" && (
                <p className="text-[11px] text-slate-400 mt-3">Total concluído (registrado): {stats.totalCompletos}</p>
              )}
            </section>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-xl text-xs" onClick={() => navigate("/tutor-ia")}>
                Voltar ao Tutor IA
              </Button>
              <Button variant="outline" className="rounded-xl text-xs" onClick={() => navigate("/conquistas")}>
                Ver conquistas
              </Button>
            </div>
          </>
        )}

        {view === "challenge" && desafio && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <button
              type="button"
              onClick={() => { setView("home"); setDesafio(null); }}
              className="flex items-center gap-1 text-sm text-violet-700 font-semibold mb-4 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Início Fazedores
            </button>

            <div className="flex items-center gap-2 mb-2">
              {catOfDesafio && (
                <span className={cn("text-[10px] font-black uppercase text-white px-2 py-0.5 rounded-md bg-gradient-to-r", catOfDesafio.gradient)}>
                  {catOfDesafio.label}
                </span>
              )}
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {desafio.tempoMinutos} min · {desafio.nivel}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mb-4">{desafio.titulo}</h1>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Situação</h2>
              <p className="text-sm text-slate-700 leading-relaxed">{desafio.situacao}</p>
              <p className="text-xs text-slate-500 mt-3">
                <span className="font-semibold text-slate-700">Ferramentas sugeridas:</span> {desafio.ferramentas}
              </p>
            </section>

            <section className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4 mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-violet-700 mb-3">Perguntas antes da resposta</h2>
              <ol className="space-y-2 text-sm text-slate-800 list-decimal list-inside mb-4">
                {desafio.perguntas.map((p, i) => (
                  <li key={i} className="leading-relaxed">{p}</li>
                ))}
              </ol>
              {desafio.perguntas.map((_, i) => (
                <Textarea
                  key={i}
                  value={answers[i]}
                  onChange={(e) => {
                    const next = [...answers] as [string, string, string];
                    next[i] = e.target.value;
                    setAnswers(next);
                  }}
                  placeholder={`Sua resposta ${i + 1}`}
                  className="mb-2 min-h-[64px] rounded-xl border-violet-200/80"
                />
              ))}
              <Button
                className="rounded-xl w-full sm:w-auto bg-violet-600 hover:bg-violet-700"
                disabled={loading}
                onClick={() => void submitAnswers()}
              >
                Enviar reflexões e ver plano
              </Button>
            </section>

            {feedback && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-900 text-sm px-4 py-3 mb-4">
                {feedback}
              </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white mb-4 overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 text-left font-bold text-slate-800"
                onClick={() => setShowPassos((s) => !s)}
              >
                Plano de ação (passo a passo)
                {showPassos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showPassos && (
                <ol className="px-4 pb-4 space-y-2 text-sm text-slate-700 list-decimal list-inside border-t border-slate-100 pt-3">
                  {desafio.passos.map((p, i) => (
                    <li key={i} className="leading-relaxed">{p}</li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/50 p-4 mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-800 mb-2">Desafio +1</h2>
              <p className="text-sm text-slate-800 leading-relaxed mb-3">{desafio.desafioExtra}</p>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={fezExtra} onChange={(e) => setFezExtra(e.target.checked)} className="rounded border-violet-300" />
                Marque se tentou o extra (vale orgulho!)
              </label>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Conexão com estudos</h2>
              <p className="text-sm text-slate-700 leading-relaxed">{desafio.conexaoEstudos}</p>
            </section>

            <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-600 to-purple-700 text-white p-4 mb-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-violet-100 mb-2">Orgulho</h2>
              <p className="text-sm leading-relaxed">{desafio.mensagemFinal}</p>
            </section>

            <Button
              className="w-full rounded-2xl h-12 text-base font-bold bg-slate-900 hover:bg-slate-800"
              disabled={loading || !showPassos}
              onClick={() => void completar()}
            >
              Completar desafio
            </Button>
            {!showPassos && (
              <p className="text-center text-xs text-slate-500 mt-2">Envie suas reflexões para liberar o plano e concluir.</p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
