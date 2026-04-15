import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Globe, Users, BarChart2, TrendingUp, ArrowLeft, RefreshCw, Shield,
  Zap, Target, BookOpen, Building2, GraduationCap, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Overview {
  totalUsers: number;
  totalSimulados: number;
  avgSimAccuracy: number;
  totalFlashcards: number;
  totalPlanos: number;
  avgXp: number;
  totalInstituicoes: number;
  totalTurmas: number;
  activeUsers30: number;
  activeUsers7: number;
  newUsersThisMonth: number;
  engagementRate30d: number;
}

interface SubStat {
  status: string | null;
  count: number;
}

interface WeeklyEntry {
  week: string;
  count: number;
}

interface SubjectEntry {
  materia: string;
  count: number;
  avgAccuracy: number;
}

interface GovData {
  overview: Overview;
  subscriptions: SubStat[];
  weeklyGrowth: WeeklyEntry[];
  weeklyActivity: WeeklyEntry[];
  topSubjects: SubjectEntry[];
}

export default function GovernoPage() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<GovData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "crescimento" | "materias">("overview");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/government/stats");
      if (!res.ok) { setError("acesso_negado"); return; }
      const d = await res.json();
      setData(d);
    } catch {
      setError("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error === "acesso_negado") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 max-w-md text-center">
          <Shield className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-slate-400 mb-6">
            O Módulo Governo é exclusivo para usuários com permissão governamental.
            Entre em contato com o administrador da plataforma.
          </p>
          <Button onClick={() => navigate("/app")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
            Voltar ao início
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  const { overview, subscriptions, weeklyGrowth, weeklyActivity, topSubjects } = data;

  const tabs = [
    { id: "overview", label: "Visão Geral", icon: BarChart2 },
    { id: "crescimento", label: "Crescimento", icon: TrendingUp },
    { id: "materias", label: "Matérias", icon: BookOpen },
  ] as const;

  const premiumSubs = subscriptions.filter(s => ["active", "trialing"].includes(s.status ?? "")).reduce((a, s) => a + s.count, 0);
  const freeSubs = subscriptions.filter(s => !["active", "trialing"].includes(s.status ?? "")).reduce((a, s) => a + s.count, 0);

  const maxGrowth = Math.max(...weeklyGrowth.map(w => w.count), 1);
  const maxActivity = Math.max(...weeklyActivity.map(w => w.count), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/app")}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Módulo Governo</h1>
              <p className="text-slate-400 text-sm">Métricas de impacto educacional da plataforma</p>
            </div>
          </div>
          <button onClick={loadData} className="ml-auto p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/60 p-1 rounded-2xl mb-6">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all
                ${activeTab === tab.id ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}>
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ─── Overview ─── */}
        {activeTab === "overview" && (
          <div>
            {/* Main stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total de usuários", value: overview.totalUsers.toLocaleString("pt-BR"), icon: Users, color: "text-indigo-400" },
                { label: "Ativos (30 dias)", value: overview.activeUsers30.toLocaleString("pt-BR"), icon: Activity, color: "text-emerald-400" },
                { label: "Novos este mês", value: overview.newUsersThisMonth.toLocaleString("pt-BR"), icon: TrendingUp, color: "text-blue-400" },
                { label: "Engajamento 30d", value: `${overview.engagementRate30d}%`, icon: BarChart2, color: "text-amber-400" },
              ].map(s => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                  <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-slate-400 text-sm">{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Learning stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: "Simulados feitos", value: overview.totalSimulados.toLocaleString("pt-BR"), icon: Target, color: "text-purple-400" },
                { label: "Acerto médio", value: `${overview.avgSimAccuracy}%`, icon: BarChart2, color: "text-emerald-400" },
                { label: "Sessões flashcard", value: overview.totalFlashcards.toLocaleString("pt-BR"), icon: Zap, color: "text-cyan-400" },
                { label: "Planos gerados", value: overview.totalPlanos.toLocaleString("pt-BR"), icon: BookOpen, color: "text-amber-400" },
                { label: "XP médio", value: overview.avgXp.toLocaleString("pt-BR"), icon: Zap, color: "text-yellow-400" },
                { label: "Instituições", value: overview.totalInstituicoes, icon: Building2, color: "text-rose-400" },
              ].map(s => (
                <div key={s.label} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                  <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-slate-400 text-sm">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Subscription breakdown */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" /> Distribuição de planos
              </h3>
              <div className="flex gap-6 mb-4">
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{premiumSubs.toLocaleString("pt-BR")}</p>
                  <p className="text-slate-400 text-sm">Premium ativo</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-300">{freeSubs.toLocaleString("pt-BR")}</p>
                  <p className="text-slate-400 text-sm">Plano gratuito</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-400">
                    {overview.totalUsers > 0 ? Math.round((premiumSubs / overview.totalUsers) * 100) : 0}%
                  </p>
                  <p className="text-slate-400 text-sm">Taxa de conversão</p>
                </div>
              </div>
              {/* Bar */}
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full transition-all"
                  style={{ width: `${overview.totalUsers > 0 ? (premiumSubs / overview.totalUsers) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── Crescimento ─── */}
        {activeTab === "crescimento" && (
          <div className="space-y-6">
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Novos usuários por semana
              </h3>
              {weeklyGrowth.length === 0 ? (
                <p className="text-slate-500 text-sm">Sem dados suficientes</p>
              ) : (
                <div className="flex items-end gap-2 h-32">
                  {weeklyGrowth.map((w, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-slate-400 text-xs">{w.count}</span>
                      <div className="w-full bg-indigo-600 rounded-t-md transition-all"
                        style={{ height: `${Math.max(4, (w.count / maxGrowth) * 100)}%` }} />
                      <span className="text-slate-600 text-xs">
                        {new Date(w.week).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" /> Simulados por semana
              </h3>
              {weeklyActivity.length === 0 ? (
                <p className="text-slate-500 text-sm">Sem dados suficientes</p>
              ) : (
                <div className="flex items-end gap-2 h-32">
                  {weeklyActivity.map((w, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-slate-400 text-xs">{w.count}</span>
                      <div className="w-full bg-purple-600 rounded-t-md transition-all"
                        style={{ height: `${Math.max(4, (w.count / maxActivity) * 100)}%` }} />
                      <span className="text-slate-600 text-xs">
                        {new Date(w.week).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Retention */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                <Activity className="w-5 h-5 text-emerald-400 mb-2" />
                <p className="text-2xl font-bold text-white">{overview.activeUsers7.toLocaleString("pt-BR")}</p>
                <p className="text-slate-400 text-sm">Ativos últimos 7 dias</p>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                <Activity className="w-5 h-5 text-blue-400 mb-2" />
                <p className="text-2xl font-bold text-white">{overview.activeUsers30.toLocaleString("pt-BR")}</p>
                <p className="text-slate-400 text-sm">Ativos últimos 30 dias</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Matérias ─── */}
        {activeTab === "materias" && (
          <div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" /> Top matérias por simulado
              </h3>
              {topSubjects.length === 0 ? (
                <p className="text-slate-500 text-sm">Sem dados</p>
              ) : (
                <div className="space-y-3">
                  {topSubjects.map((s, i) => {
                    const pct = Math.round((s.count / topSubjects[0].count) * 100);
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-white font-medium">
                            {i + 1}. {s.materia}
                          </span>
                          <div className="flex gap-4 text-slate-400">
                            <span>{s.count.toLocaleString("pt-BR")} simulados</span>
                            <span className={`${s.avgAccuracy >= 70 ? "text-emerald-400" : s.avgAccuracy >= 50 ? "text-amber-400" : "text-red-400"}`}>
                              {s.avgAccuracy}% acerto
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
