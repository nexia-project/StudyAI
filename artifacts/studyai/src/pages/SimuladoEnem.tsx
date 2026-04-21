import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, ChevronRight, ChevronLeft,
  Trophy, BookOpen, AlertCircle, Loader2, RefreshCw, Share2, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription, startCheckout } from "@/hooks/useSubscription";

const DIAS_INFO = [
  { dia: 1, nome: "Linguagens", cor: "from-blue-500 to-indigo-600", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", emoji: "📝", materias: "Língua Portuguesa, Literatura, Inglês, Arte, Educação Física" },
  { dia: 2, nome: "Ciências Humanas", cor: "from-amber-500 to-orange-600", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", emoji: "🌍", materias: "História, Geografia, Filosofia, Sociologia" },
  { dia: 3, nome: "Ciências Naturais", cor: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", emoji: "🔬", materias: "Física, Química, Biologia" },
  { dia: 4, nome: "Matemática", cor: "from-violet-500 to-purple-600", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", emoji: "📐", materias: "Matemática — 45 questões" },
];

interface Questao {
  numero: number;
  materia: string;
  enunciado: string;
  pergunta: string;
  alternativas: Record<string, string>;
  gabarito: string;
  explicacao: string;
  dificuldade: string;
}

type Fase = "selecionar" | "gerando" | "respondendo" | "resultado";

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SimuladoEnemPage() {
  const [, navigate] = useLocation();
  const { isPremium } = useSubscription();
  const [fase, setFase] = useState<Fase>("selecionar");
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [qtd, setQtd] = useState(20);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [atual, setAtual] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tempoRestante, setTempoRestante] = useState(0);
  const [mostrarGabarito, setMostrarGabarito] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  async function gerarSimulado() {
    if (!diaSelecionado) return;
    setFase("gerando");
    setError(null);
    try {
      const res = await fetch("/api/simulado-enem/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dia: diaSelecionado, quantidade: qtd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Erro ao gerar");
      setQuestoes(data.questoes || []);
      setRespostas({});
      setAtual(0);
      setMostrarGabarito(false);
      // Timer: qtd * 3.5 min por questão (ENEM tem ~7.3min/questão mas usamos menos por ser simulado)
      setTempoRestante(Math.round(qtd * 4 * 60));
      setFase("respondendo");
      timerRef.current = setInterval(() => {
        setTempoRestante(t => {
          if (t <= 1) { clearInterval(timerRef.current!); finalizarSimulado(); return 0; }
          return t - 1;
        });
      }, 1000);
    } catch (e: any) {
      setError(e.message || "Erro desconhecido");
      setFase("selecionar");
    }
  }

  const finalizarSimulado = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFase("resultado");
  }, []);

  function responder(alt: string) {
    setRespostas(r => ({ ...r, [questoes[atual].numero]: alt }));
  }

  function calcularResultado() {
    let acertos = 0;
    const erros: Questao[] = [];
    for (const q of questoes) {
      if (respostas[q.numero] === q.gabarito) acertos++;
      else erros.push(q);
    }
    const pct = Math.round((acertos / questoes.length) * 100);
    return { acertos, erros, pct, total: questoes.length };
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/40 to-indigo-50/40">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => navigate("/app")} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-600 font-semibold text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-12">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              Recurso Premium
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-4 tracking-tight">
              Simulado ENEM Completo
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Simule os 4 dias do ENEM no mesmo padrão oficial — com cronômetro, gabarito comentado e análise de desempenho por área de conhecimento.
            </p>
          </div>

          {/* Preview Cards — 4 dias do ENEM */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {DIAS_INFO.map((d) => (
              <div key={d.dia} className={`rounded-2xl p-5 ${d.bg} border ${d.border} relative overflow-hidden`}>
                <div className="absolute top-3 right-3 opacity-20 text-4xl">{d.emoji}</div>
                <div className={`text-xs font-black uppercase tracking-wider mb-2 ${d.text}`}>Dia {d.dia}</div>
                <div className="text-base font-black text-slate-800 mb-1">{d.nome}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{d.materias}</div>
              </div>
            ))}
          </div>

          {/* Features list + CTA */}
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <h2 className="text-xl font-black text-slate-800 mb-6">O que está incluso</h2>
              {[
                { icon: BookOpen, title: "Questões no padrão ENEM", desc: "Até 45 questões por área, geradas com contextos e linguagem oficial INEP" },
                { icon: Clock, title: "Cronômetro por sessão", desc: "Simule as condições reais — tempo controlado por área de conhecimento" },
                { icon: CheckCircle2, title: "Gabarito comentado", desc: "Cada alternativa explicada com justificativa detalhada após a submissão" },
                { icon: Trophy, title: "Análise de desempenho", desc: "Pontuação por matéria, taxa de acerto e identificação de pontos fracos" },
                { icon: RefreshCw, title: "Simulados ilimitados", desc: "Refaça quantas vezes quiser com novas questões geradas pela IA" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{title}</p>
                    <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing card */}
            <div className="bg-white rounded-3xl border border-violet-100 shadow-xl shadow-violet-100/50 p-8 sticky top-24">
              <div className="text-center mb-6">
                <p className="text-sm font-bold text-violet-600 uppercase tracking-wider mb-2">StudyAI Premium</p>
                <div className="flex items-end justify-center gap-1 mb-1">
                  <span className="text-5xl font-black text-slate-800">R$29</span>
                  <span className="text-2xl font-black text-slate-800">,90</span>
                  <span className="text-slate-400 text-sm font-medium mb-1.5">/mês</span>
                </div>
                <p className="text-xs text-slate-400">ou R$249/ano — economize 30%</p>
              </div>

              <div className="space-y-2.5 mb-8">
                {[
                  "Simulados ENEM completos (4 dias)",
                  "Professor Tiagão por voz ilimitado",
                  "Caderno com RAG e busca semântica",
                  "Flashcards com repetição espaçada",
                  "Correção de redação ENEM (5 competências)",
                  "Aula com Professor na lousa interativa",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-violet-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={async () => { setCheckoutLoading(true); try { await startCheckout(); } catch { navigate("/pricing"); } finally { setCheckoutLoading(false); } }}
                disabled={checkoutLoading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-base shadow-lg shadow-violet-200 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {checkoutLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Aguarde...</>
                ) : (
                  <>Assinar Premium — R$29,90/mês</>
                )}
              </button>

              <p className="text-center text-xs text-slate-400 mt-4">
                Cancele quando quiser. Sem fidelidade.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SELEÇÃO DE DIA ────────────────────────────────────────────────────────
  if (fase === "selecionar") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40">
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => navigate("/app")} className="flex items-center gap-2 px-3 py-2 rounded-2xl hover:bg-slate-100 text-slate-600 font-bold text-sm">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <div className="flex-1 text-center">
              <span className="font-black text-slate-800">📝 Simulado ENEM Completo</span>
            </div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-800 mb-2">Escolha o Dia do ENEM</h1>
            <p className="text-slate-500">Selecione a área de conhecimento e simule o dia do exame</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {DIAS_INFO.map((d) => (
              <motion.button
                key={d.dia}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setDiaSelecionado(d.dia)}
                className={cn(
                  "p-5 rounded-2xl border-2 text-left transition-all",
                  diaSelecionado === d.dia
                    ? `bg-gradient-to-br ${d.cor} text-white border-transparent shadow-lg`
                    : `bg-white ${d.border} hover:shadow-md`
                )}
              >
                <div className="text-3xl mb-2">{d.emoji}</div>
                <div className={cn("font-black text-lg", diaSelecionado === d.dia ? "text-white" : "text-slate-800")}>
                  Dia {d.dia} — {d.nome}
                </div>
                <div className={cn("text-xs mt-1 leading-relaxed", diaSelecionado === d.dia ? "text-white/80" : "text-slate-400")}>
                  {d.materias}
                </div>
              </motion.button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
            <h3 className="font-bold text-slate-700 mb-3">Número de questões</h3>
            <div className="flex gap-3 flex-wrap">
              {[10, 20, 30, 45].map(n => (
                <button
                  key={n}
                  onClick={() => setQtd(n)}
                  className={cn(
                    "px-4 py-2 rounded-xl font-bold text-sm transition-all",
                    qtd === n
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {n} questões {n === 45 && "(ENEM real)"}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              ⏱️ Tempo estimado: {Math.round(qtd * 4)} minutos
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            onClick={gerarSimulado}
            disabled={!diaSelecionado}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-lg shadow-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🚀 Iniciar Simulado
          </button>
        </div>
      </div>
    );
  }

  // ── GERANDO ───────────────────────────────────────────────────────────────
  if (fase === "gerando") {
    const diaInfo = DIAS_INFO.find(d => d.dia === diaSelecionado)!;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-center">
          <div className={cn("w-20 h-20 rounded-3xl bg-gradient-to-br mx-auto mb-6 flex items-center justify-center shadow-xl text-4xl", diaInfo.cor)}>
            {diaInfo.emoji}
          </div>
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-800 mb-2">Gerando seu simulado...</h2>
          <p className="text-slate-500">Criando {qtd} questões de {diaInfo.nome}</p>
        </div>
      </div>
    );
  }

  // ── RESPONDENDO ───────────────────────────────────────────────────────────
  if (fase === "respondendo" && questoes.length > 0) {
    const q = questoes[atual];
    const respondida = respostas[q.numero];
    const respondidas = Object.keys(respostas).length;
    const diaInfo = DIAS_INFO.find(d => d.dia === diaSelecionado)!;

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold", diaInfo.bg, diaInfo.text)}>
                <span>{diaInfo.emoji}</span>
                <span className="hidden sm:inline">Dia {diaSelecionado} — {diaInfo.nome}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-sm tabular-nums",
                  tempoRestante < 300 ? "bg-red-100 text-red-700 animate-pulse" : "bg-slate-100 text-slate-700"
                )}>
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(tempoRestante)}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {respondidas}/{questoes.length}
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full bg-gradient-to-r transition-all", diaInfo.cor)}
                style={{ width: `${(respondidas / questoes.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={atual}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Question header */}
              <div className="flex items-center justify-between mb-4">
                <span className={cn("px-3 py-1 rounded-lg text-xs font-bold", diaInfo.bg, diaInfo.text)}>
                  {q.materia}
                </span>
                <span className={cn(
                  "px-2 py-1 rounded-lg text-xs font-bold",
                  q.dificuldade === "facil" ? "bg-green-50 text-green-700" :
                  q.dificuldade === "dificil" ? "bg-red-50 text-red-700" :
                  "bg-amber-50 text-amber-700"
                )}>
                  {q.dificuldade === "facil" ? "Fácil" : q.dificuldade === "dificil" ? "Difícil" : "Médio"}
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
                <p className="text-sm text-slate-500 font-semibold mb-2">Questão {q.numero} de {questoes.length}</p>
                {q.enunciado && (
                  <div className="bg-slate-50 rounded-xl p-4 mb-4 text-slate-700 text-sm leading-relaxed border border-slate-100">
                    {q.enunciado}
                  </div>
                )}
                <p className="font-semibold text-slate-800 leading-relaxed">{q.pergunta}</p>
              </div>

              {/* Alternativas */}
              <div className="space-y-2.5 mb-6">
                {Object.entries(q.alternativas).map(([letra, texto]) => (
                  <button
                    key={letra}
                    onClick={() => responder(letra)}
                    className={cn(
                      "w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
                      respondida === letra
                        ? "border-indigo-500 bg-indigo-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"
                    )}
                  >
                    <span className={cn(
                      "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black",
                      respondida === letra ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      {letra}
                    </span>
                    <span className="text-sm text-slate-700 leading-relaxed pt-0.5">{texto}</span>
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setAtual(a => Math.max(0, a - 1))}
                  disabled={atual === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-40 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                {atual < questoes.length - 1 ? (
                  <button
                    onClick={() => setAtual(a => a + 1)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={finalizarSimulado}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm shadow-md hover:opacity-90 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Finalizar ({respondidas}/{questoes.length})
                  </button>
                )}
              </div>

              {/* Mini map */}
              <div className="mt-6 p-4 bg-white rounded-2xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-2">Gabarito rápido</p>
                <div className="flex flex-wrap gap-1.5">
                  {questoes.map((q2, i) => (
                    <button
                      key={q2.numero}
                      onClick={() => setAtual(i)}
                      className={cn(
                        "w-7 h-7 rounded-lg text-xs font-bold transition-all",
                        i === atual ? "ring-2 ring-indigo-500 ring-offset-1" : "",
                        respostas[q2.numero] ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {q2.numero}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── RESULTADO ─────────────────────────────────────────────────────────────
  if (fase === "resultado") {
    const { acertos, erros, pct, total } = calcularResultado();
    const diaInfo = DIAS_INFO.find(d => d.dia === diaSelecionado)!;
    const nivel = pct >= 80 ? { label: "Excelente! 🏆", cor: "text-emerald-700", bg: "bg-emerald-50" }
      : pct >= 60 ? { label: "Bom! 📈", cor: "text-blue-700", bg: "bg-blue-50" }
      : pct >= 40 ? { label: "Regular ✏️", cor: "text-amber-700", bg: "bg-amber-50" }
      : { label: "Precisa Melhorar 💪", cor: "text-rose-700", bg: "bg-rose-50" };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => setFase("selecionar")} className="flex items-center gap-2 px-3 py-2 rounded-2xl hover:bg-slate-100 text-slate-600 font-bold text-sm">
              <RefreshCw className="w-4 h-4" />
              Novo Simulado
            </button>
            <span className="flex-1 text-center font-black text-slate-800">Resultado</span>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* Score card */}
          <div className={cn("rounded-3xl p-8 mb-6 text-center bg-gradient-to-br shadow-xl", diaInfo.cor)}>
            <div className="text-6xl font-black text-white mb-2">{pct}%</div>
            <div className="text-white/90 font-bold text-lg mb-1">{acertos} de {total} questões</div>
            <div className="text-white/70 text-sm">Dia {diaSelecionado} — {diaInfo.nome}</div>
          </div>

          <div className={cn("rounded-2xl p-4 mb-6 text-center border", nivel.bg)}>
            <span className={cn("font-black text-lg", nivel.cor)}>{nivel.label}</span>
          </div>

          {/* Gabarito */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
            <button
              onClick={() => setMostrarGabarito(!mostrarGabarito)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <span className="font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Ver gabarito e explicações ({erros.length} erro{erros.length !== 1 ? "s" : ""})
              </span>
              <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform", mostrarGabarito && "rotate-90")} />
            </button>
            <AnimatePresence>
              {mostrarGabarito && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-slate-100 divide-y divide-slate-100">
                    {questoes.map(q => {
                      const minha = respostas[q.numero];
                      const certa = q.gabarito;
                      const acertou = minha === certa;
                      return (
                        <div key={q.numero} className={cn("p-4", acertou ? "bg-green-50/40" : "bg-red-50/40")}>
                          <div className="flex items-start gap-3">
                            {acertou
                              ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            }
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-700 mb-1">
                                Q{q.numero} — {q.materia}
                                {!acertou && <span className="ml-2 text-xs font-normal text-slate-500">
                                  Sua resposta: <span className="font-bold text-red-600">{minha || "—"}</span> · Correta: <span className="font-bold text-emerald-600">{certa}</span>
                                </span>}
                              </p>
                              {!acertou && (
                                <p className="text-xs text-slate-600 leading-relaxed mt-1">{q.explicacao}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setFase("selecionar")}
              className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all"
            >
              Fazer outro simulado
            </button>
            <button
              onClick={() => {
                const text = `📝 Simulado ENEM — Dia ${diaSelecionado} (${diaInfo.nome})\n✅ ${acertos}/${total} questões (${pct}%)\n\nPraticar em: study.ia.br`;
                if (navigator.share) navigator.share({ text }).catch(() => {});
                else navigator.clipboard.writeText(text);
              }}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
