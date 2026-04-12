import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useSubscription, startCheckout } from "@/hooks/useSubscription";
import {
  ArrowLeft,
  PenLine,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Share2,
  Check,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Competencia {
  numero: number;
  nome: string;
  nota: number;
  feedback: string;
  pontosFortes: string;
  pontosMelhorar: string;
}

interface RedacaoResult {
  competencias: Competencia[];
  notaTotal: number;
  comentarioGeral: string;
  nivelGeral: string;
  proximosPasso: string;
}

const COMP_COLORS = [
  { bar: "bg-violet-500", light: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", emoji: "📝" },
  { bar: "bg-blue-500",   light: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   emoji: "🌍" },
  { bar: "bg-emerald-500",light: "bg-emerald-50",border: "border-emerald-200",text: "text-emerald-700",emoji: "🧩" },
  { bar: "bg-amber-500",  light: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  emoji: "🔗" },
  { bar: "bg-rose-500",   light: "bg-rose-50",   border: "border-rose-200",   text: "text-rose-700",   emoji: "💡" },
];

function getNivelColor(nota: number) {
  if (nota >= 900) return { label: "Nota 1000 🏆", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-300" };
  if (nota >= 800) return { label: "Excelente ⭐", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-300" };
  if (nota >= 700) return { label: "Muito Bom 👏", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-300" };
  if (nota >= 600) return { label: "Bom 📈", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-300" };
  if (nota >= 400) return { label: "Regular ✏️", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-300" };
  return { label: "Iniciante 💪", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-300" };
}

export default function Redacao() {
  const [, navigate] = useLocation();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [tema, setTema] = useState("");
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RedacaoResult | null>(null);
  const [openComp, setOpenComp] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const wordCount = texto.trim() ? texto.trim().split(/\s+/).length : 0;
  const charCount = texto.length;

  async function handleSubmit() {
    if (texto.trim().length < 100) {
      setError("Escreva pelo menos 100 caracteres para corrigir.");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/redacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ texto, tema }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro desconhecido");
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setError(e.message || "Erro ao corrigir. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleShare() {
    if (!result) return;
    const text = `✍️ Minha nota na Redação ENEM (StudyAI): ${result.notaTotal}/1000 — ${getNivelColor(result.notaTotal).label}\n\n📚 Corrija a sua também: study.ia.br`;
    if (navigator.share) {
      navigator.share({ title: "Minha nota na redação ENEM", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  }

  const nivelInfo = result ? getNivelColor(result.notaTotal) : null;

  if (subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-gradient-to-br from-violet-50 to-indigo-50">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-200">
          <PenLine className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-800 mb-2">Correção de Redação</h1>
          <p className="text-slate-500 max-w-sm">Envie sua redação e receba uma avaliação detalhada nas 5 competências do ENEM por IA. Recurso exclusivo Premium.</p>
        </div>
        <button
          onClick={async () => { setCheckoutLoading(true); try { await startCheckout(); } catch { navigate("/pricing"); } finally { setCheckoutLoading(false); } }}
          disabled={checkoutLoading}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-black shadow-lg hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <Sparkles className="w-5 h-5" />
          {checkoutLoading ? "Aguarde..." : "Assinar Premium — R$29,90/mês"}
        </button>
        <button onClick={() => navigate("/app")} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          ← Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/40">
      {/* Top Nav */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/app")}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl hover:bg-slate-100 text-slate-600 font-bold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow">
              <PenLine className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-black text-slate-800 text-sm leading-tight">Correção de Redação</h1>
              <p className="text-xs text-slate-400 font-semibold">Avaliação nas 5 competências ENEM</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Result Panel */}
        <AnimatePresence mode="wait">
          {result && nivelInfo && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Score Hero */}
              <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-8 text-white text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
                <p className="text-violet-200 font-bold text-sm uppercase tracking-widest mb-2">Sua Nota ENEM</p>
                <p className="text-8xl font-black leading-none mb-1">{result.notaTotal}</p>
                <p className="text-violet-200 text-lg font-semibold">de 1000 pontos</p>
                <div className={`inline-flex items-center gap-2 mt-4 px-5 py-2 rounded-full ${nivelInfo.bg} ${nivelInfo.border} border font-black text-sm ${nivelInfo.color}`}>
                  <Star className="w-4 h-4" />
                  {nivelInfo.label}
                </div>
              </div>

              {/* Share button */}
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 font-black text-sm transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                {copied ? "Copiado! Cole no WhatsApp 💬" : "Compartilhar minha nota"}
              </button>

              {/* Competências Breakdown */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="font-black text-slate-800">Detalhes por Competência</h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Clique para expandir o feedback</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {result.competencias.map((comp, i) => {
                    const c = COMP_COLORS[i] ?? COMP_COLORS[0];
                    const isOpen = openComp === i;
                    const pct = (comp.nota / 200) * 100;
                    return (
                      <div key={i}>
                        <button
                          onClick={() => setOpenComp(isOpen ? null : i)}
                          className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
                        >
                          <span className="text-xl">{c.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="font-bold text-slate-700 text-sm truncate pr-2">C{comp.numero} — {comp.nome}</p>
                              <span className={`font-black text-sm shrink-0 ${c.text}`}>{comp.nota}/200</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${c.bar} transition-all duration-700`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className={`mx-4 mb-4 rounded-2xl ${c.light} ${c.border} border p-4 space-y-3`}>
                                <p className="text-sm text-slate-600 leading-relaxed">{comp.feedback}</p>
                                {comp.pontosFortes && (
                                  <div>
                                    <p className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-1">✅ Pontos Fortes</p>
                                    <p className="text-sm text-slate-600">{comp.pontosFortes}</p>
                                  </div>
                                )}
                                {comp.pontosMelhorar && (
                                  <div>
                                    <p className="text-xs font-black text-amber-600 uppercase tracking-wider mb-1">⚡ Melhorar</p>
                                    <p className="text-sm text-slate-600">{comp.pontosMelhorar}</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comentário Geral + Próximos passos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">💬 Avaliação Geral</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{result.comentarioGeral}</p>
                </div>
                <div className="bg-violet-50 rounded-2xl border border-violet-200 shadow-sm p-5">
                  <p className="text-xs font-black text-violet-500 uppercase tracking-wider mb-2">🚀 Próximos Passos</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{result.proximosPasso}</p>
                </div>
              </div>

              {/* Try again */}
              <button
                onClick={() => { setResult(null); setTexto(""); setTema(""); }}
                className="w-full py-3 rounded-2xl border-2 border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                ✏️ Corrigir outra redação
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        {!result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Header card */}
            <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-7 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">✍️</div>
                <div>
                  <h2 className="font-black text-xl leading-tight">Corretor de Redação ENEM</h2>
                  <p className="text-violet-200 text-sm font-semibold">Avaliação por IA nas 5 competências oficiais</p>
                </div>
              </div>
              <p className="text-violet-100 text-sm leading-relaxed">
                Cole sua redação abaixo e receba uma avaliação detalhada com nota estimada, pontos fortes e o que melhorar — como um corretor especializado.
              </p>
            </div>

            {/* Input card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold">{error}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-black text-slate-700 mb-2 block">Tema da Redação <span className="text-slate-400 font-semibold">(opcional)</span></label>
                <input
                  type="text"
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  placeholder="Ex: Desafios para a democratização do acesso à internet no Brasil"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 text-sm font-medium transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-black text-slate-700">Sua Redação</label>
                  <span className={`text-xs font-bold ${wordCount < 150 ? "text-amber-500" : "text-emerald-600"}`}>
                    {wordCount} palavras · {charCount} caracteres
                  </span>
                </div>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={16}
                  placeholder={`Escreva ou cole sua redação aqui...\n\nDica: uma boa redação ENEM tem entre 250 e 350 palavras (7 linhas de introdução + desenvolvimento + conclusão).\n\nVocê pode escrever sobre qualquer tema — a IA avalia o texto completo mesmo sem tema definido.`}
                  className="w-full px-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 text-sm font-medium leading-relaxed resize-y transition-all min-h-[300px]"
                />
                {wordCount > 0 && wordCount < 150 && (
                  <p className="text-xs text-amber-500 font-semibold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Redação curta. O ENEM recomenda no mínimo 250 palavras para nota máxima.
                  </p>
                )}
                {wordCount >= 150 && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Tamanho adequado para avaliação completa.
                  </p>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || texto.trim().length < 100}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-base shadow-lg shadow-violet-200 hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Corrigindo com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Corrigir Redação
                  </>
                )}
              </button>

              {loading && (
                <div className="text-center">
                  <p className="text-xs text-slate-400 font-semibold animate-pulse">
                    Nossa IA está analisando suas 5 competências... ⏳ (30-60 seg)
                  </p>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-3">💡 Dicas para uma redação nota 1000</p>
              <ul className="space-y-1.5">
                {[
                  "Tese clara no 1º parágrafo (introdução)",
                  "2-3 argumentos com repertório sociocultural",
                  "Conectivos variados: portanto, ademais, outrossim...",
                  "Proposta de intervenção com: agente + ação + modo + finalidade",
                  "Sem rasuras, sem parágrafos de 1 linha, sem gírias",
                ].map((tip, i) => (
                  <li key={i} className="text-xs text-amber-800 font-semibold flex items-start gap-2">
                    <span className="text-amber-500 shrink-0">→</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
