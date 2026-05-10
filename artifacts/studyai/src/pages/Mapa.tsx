import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import { useSubscription, startCheckout } from "@/hooks/useSubscription";
import {
  Map, TrendingUp, TrendingDown, Minus, LogIn,
  BarChart2, Target, Flame, BookOpen, Layers, AlertCircle, Sparkles, Zap,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { SimuladoDiagnosticoTotalButton } from "@/components/Simulado";

interface SubjectData {
  materia: string;
  compositeScore: number | null;
  avgSimScore: number | null;
  avgFcRate: number | null;
  totalSimulados: number;
  totalFlashcardSessions: number;
  trend: "improving" | "declining" | "stable";
  lastScore: number | null;
}

interface HeatmapData {
  subjects: SubjectData[];
  pontosFortes: string[];
  pontosFracos: string[];
  totalMateriasEstudadas: number;
}

function getScoreColor(score: number | null): {
  bg: string; border: string; text: string; label: string; intensity: number;
} {
  if (score === null) return { bg: "bg-slate-100", border: "border-slate-200", text: "text-slate-400", label: "Sem dados", intensity: 0 };
  if (score >= 80) return { bg: "bg-emerald-100", border: "border-emerald-400", text: "text-emerald-700", label: "Forte", intensity: 5 };
  if (score >= 65) return { bg: "bg-lime-100", border: "border-lime-400", text: "text-lime-700", label: "Bom", intensity: 4 };
  if (score >= 50) return { bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-700", label: "Regular", intensity: 3 };
  if (score >= 35) return { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-700", label: "Fraco", intensity: 2 };
  return { bg: "bg-red-100", border: "border-red-400", text: "text-red-700", label: "Crítico", intensity: 1 };
}

function getHeatBg(score: number | null): string {
  if (score === null) return "bg-slate-50";
  if (score >= 80) return "bg-gradient-to-br from-emerald-400 to-green-500";
  if (score >= 65) return "bg-gradient-to-br from-lime-400 to-emerald-400";
  if (score >= 50) return "bg-gradient-to-br from-amber-400 to-yellow-400";
  if (score >= 35) return "bg-gradient-to-br from-orange-400 to-amber-500";
  return "bg-gradient-to-br from-red-500 to-rose-600";
}

function TrendIcon({ trend }: { trend: "improving" | "declining" | "stable" }) {
  if (trend === "improving") return <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />;
  if (trend === "declining") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

function SubjectTile({ s, index, onClick }: { s: SubjectData; index: number; onClick?: () => void }) {
  const colors = getScoreColor(s.compositeScore);
  const heatBg = getHeatBg(s.compositeScore);
  const hasData = s.compositeScore !== null;
  const isWeak = s.compositeScore !== null && s.compositeScore < 55;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      className={`relative rounded-2xl border-2 ${colors.border} ${colors.bg} p-4 flex flex-col gap-2 overflow-hidden ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
    >
      {/* Heat strip on the left */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${heatBg} rounded-l-2xl`} />

      <div className="pl-1 flex items-start justify-between gap-2">
        <p className="font-black text-slate-800 text-sm leading-tight flex-1 min-w-0">{s.materia}</p>
        {hasData && (
          <span className={`shrink-0 font-black text-lg leading-none ${colors.text}`}>
            {Math.round(s.compositeScore!)}%
          </span>
        )}
      </div>

      {hasData ? (
        <>
          <div className="pl-1">
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${colors.text} bg-white/60`}>
              {colors.label}
            </div>
          </div>

          <div className="pl-1 flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {s.totalSimulados > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                <Target className="w-3 h-3" />
                {s.totalSimulados} simulado{s.totalSimulados !== 1 ? "s" : ""}
              </div>
            )}
            {s.totalFlashcardSessions > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                <Layers className="w-3 h-3" />
                {s.totalFlashcardSessions} flashcard{s.totalFlashcardSessions !== 1 ? "s" : ""}
              </div>
            )}
            {s.totalSimulados > 1 && (
              <div className="flex items-center gap-1 text-[10px] font-semibold">
                <TrendIcon trend={s.trend} />
                <span className={s.trend === "improving" ? "text-emerald-600" : s.trend === "declining" ? "text-red-500" : "text-slate-400"}>
                  {s.trend === "improving" ? "melhorando" : s.trend === "declining" ? "caindo" : "estável"}
                </span>
              </div>
            )}
          </div>

          {/* Score bar */}
          <div className="pl-1 mt-1">
            <div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${heatBg} transition-all duration-700`}
                style={{ width: `${Math.min(100, s.compositeScore!)}%` }}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="pl-1">
          <p className="text-[11px] text-slate-400 font-semibold">Nenhum simulado ainda</p>
          <p className="text-[10px] text-slate-300 mt-0.5">Faça um simulado para aparecer aqui</p>
        </div>
      )}
    </motion.div>
  );
}

export default function Mapa() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading, login } = useAuth();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    setLoading(true);
    fetch("/api/analytics/heatmap", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Não foi possível carregar o mapa."); setLoading(false); });
  }, [isAuthenticated, isLoading]);

  if (isLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-violet-50 md:pl-64 pt-14 md:pt-0">
        <AppNav />
        <div className="flex flex-col items-center justify-center gap-6 p-8 pt-8 md:pt-16">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-xl shadow-violet-200">
            <Map className="w-10 h-10 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-slate-800 mb-2">Radar de Desempenho</h1>
            <p className="text-slate-500">Entre para ver seus pontos fortes e fracos por matéria.</p>
          </div>
          <button
            onClick={login}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-violet-600 text-white font-black shadow-lg shadow-violet-200 hover:opacity-90 transition-opacity"
          >
            <LogIn className="w-5 h-5" />
            Entrar para ver o Radar
          </button>
        </div>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-violet-50 md:pl-64 pt-14 md:pt-0">
        <AppNav />
        <div className="flex flex-col items-center justify-center gap-6 p-8 pt-8 md:pt-16">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-xl shadow-violet-200">
            <BarChart2 className="w-10 h-10 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-slate-800 mb-2">Mapa de Calor</h1>
            <p className="text-slate-500 max-w-sm">Veja seu desempenho por matéria, identifique fraquezas e foque no que mais importa. Recurso exclusivo Premium.</p>
          </div>
          <button
            onClick={async () => { setCheckoutLoading(true); try { await startCheckout(); } catch { navigate("/pricing"); } finally { setCheckoutLoading(false); } }}
            disabled={checkoutLoading}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black shadow-lg hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            <Sparkles className="w-5 h-5" />
            {checkoutLoading ? "Aguarde..." : "Assinar Premium — R$29,90/mês"}
          </button>
        </div>
      </div>
    );
  }

  const withData = data?.subjects.filter((s) => s.compositeScore !== null) ?? [];
  const noData = data?.subjects.filter((s) => s.compositeScore === null) ?? [];

  const avgGlobal = withData.length
    ? withData.reduce((acc, s) => acc + (s.compositeScore ?? 0), 0) / withData.length
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-violet-50/40 md:pl-64 pt-14 md:pt-0">
      <AppNav />
      {/* Sub-header */}
      <div className="sticky top-14 md:top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Map className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-slate-800 text-sm leading-tight">Radar de Desempenho</h1>
            <p className="text-xs text-slate-400 font-medium">Pontos fortes e fracos por matéria</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-8 pb-16 space-y-8">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 font-semibold text-sm">Analisando sua trajetória...</p>
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 p-5 bg-red-50 border border-red-200 rounded-2xl text-red-600">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="font-semibold text-sm">{error}</p>
          </div>
        ) : !data || data.subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-violet-50 border-2 border-violet-200 flex items-center justify-center">
              <Map className="w-10 h-10 text-violet-300" />
            </div>
            <div>
              <h2 className="font-black text-slate-700 text-xl mb-2">Mapa vazio por enquanto</h2>
              <p className="text-slate-400 text-sm max-w-sm">
                Gere um plano de estudos e faça pelo menos um simulado para o mapa de desempenho aparecer aqui.
              </p>
            </div>
            <button
              onClick={() => navigate("/app")}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-violet-600 text-white font-black shadow-lg hover:opacity-90 transition-opacity text-sm"
            >
              Iniciar estudos agora
            </button>
          </div>
        ) : (
          <>
            {/* Global score + summary cards */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  icon: BarChart2,
                  label: "Média Global",
                  value: avgGlobal !== null ? `${Math.round(avgGlobal)}%` : "—",
                  sub: avgGlobal !== null ? getScoreColor(avgGlobal).label : "Sem dados",
                  color: avgGlobal !== null ? getScoreColor(avgGlobal).text : "text-slate-400",
                  bg: "bg-white",
                },
                {
                  icon: BookOpen,
                  label: "Matérias",
                  value: String(withData.length),
                  sub: "com dados",
                  color: "text-violet-600",
                  bg: "bg-white",
                },
                {
                  icon: Flame,
                  label: "Pontos Fortes",
                  value: String(data.pontosFortes.length),
                  sub: "≥ 70% acerto",
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                },
                {
                  icon: Target,
                  label: "Focar Aqui",
                  value: String(data.pontosFracos.length),
                  sub: "< 55% acerto",
                  color: "text-red-600",
                  bg: "bg-red-50",
                },
              ].map((card) => (
                <div key={card.label} className={`${card.bg} rounded-2xl border border-slate-100 shadow-sm p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                  </div>
                  <p className={`text-3xl font-black ${card.color} leading-none`}>{card.value}</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1">{card.sub}</p>
                </div>
              ))}
            </section>

            {/* Pontos fortes & fracos highlight */}
            {(data.pontosFortes.length > 0 || data.pontosFracos.length > 0) && (
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.pontosFortes.length > 0 && (
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Flame className="w-4 h-4 text-emerald-600" />
                      </div>
                      <h3 className="font-black text-emerald-800 text-sm">Seus Pontos Fortes 💪</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {data.pontosFortes.map((m) => (
                        <span key={m} className="px-3 py-1 rounded-xl bg-emerald-200/60 text-emerald-800 text-xs font-black">
                          ✅ {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {data.pontosFracos.length > 0 && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-xl bg-red-100 flex items-center justify-center">
                        <Target className="w-4 h-4 text-red-600" />
                      </div>
                      <h3 className="font-black text-red-800 text-sm">Foque Aqui Primeiro 🎯</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {data.pontosFracos.map((m) => (
                        <span key={m} className="px-3 py-1 rounded-xl bg-red-200/60 text-red-800 text-xs font-black">
                          🔴 {m}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      {data.pontosFracos.slice(0, 2).map((m) => (
                        <button
                          key={m}
                          onClick={() => navigate(`/app?materia=${encodeURIComponent(m)}`)}
                          className="w-full py-2 px-3 rounded-xl bg-red-500 text-white font-black text-xs hover:bg-red-600 transition-colors flex items-center justify-between"
                        >
                          <span>Estudar {m}</span>
                          <Zap className="w-3 h-3" />
                        </button>
                      ))}
                      <SimuladoDiagnosticoTotalButton className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-black text-xs hover:from-rose-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2" />
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Legenda:</p>
              {[
                { label: "Crítico < 35%", bg: "bg-gradient-to-r from-red-500 to-rose-600" },
                { label: "Fraco 35–49%", bg: "bg-gradient-to-r from-orange-400 to-amber-500" },
                { label: "Regular 50–64%", bg: "bg-gradient-to-r from-amber-400 to-yellow-400" },
                { label: "Bom 65–79%", bg: "bg-gradient-to-r from-lime-400 to-emerald-400" },
                { label: "Forte ≥ 80%", bg: "bg-gradient-to-r from-emerald-400 to-green-500" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${l.bg}`} />
                  <span className="text-[11px] text-slate-500 font-semibold">{l.label}</span>
                </div>
              ))}
            </div>

            {/* Heat grid — subjects with data */}
            {withData.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Radar de Desempenho — {withData.length} matéria{withData.length !== 1 ? "s" : ""}</h2>
                <p className="text-xs text-slate-400 mb-4">Clique em uma matéria para gerar um plano de estudos focado.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {withData.map((s, i) => (
                    <SubjectTile
                      key={s.materia}
                      s={s}
                      index={i}
                      onClick={() => navigate(`/app?materia=${encodeURIComponent(s.materia)}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Subjects without simulado data */}
            {noData.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                  Matérias sem simulado ainda — {noData.length}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {noData.map((s, i) => (
                    <SubjectTile key={s.materia} s={s} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Tip */}
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
              <p className="text-xs font-black text-violet-600 uppercase tracking-wider mb-2">💡 Como melhorar seu mapa</p>
              <ul className="space-y-1.5">
                {[
                  "Faça simulados frequentes — cada resultado atualiza o mapa em tempo real",
                  "Materiais em vermelho ou laranja devem ser priorizados nos seus planos de estudo",
                  "Use flashcards regularmente — eles também impactam a nota de cada matéria",
                  "Matérias com tendência ↑ (melhorando) mostram que seu método está funcionando — continue!",
                ].map((tip) => (
                  <li key={tip} className="text-xs text-violet-700 font-semibold flex items-start gap-2">
                    <span className="text-violet-400 shrink-0">→</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
