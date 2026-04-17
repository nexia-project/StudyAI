import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import { ArrowLeft, Lock, Trophy, Zap, BookOpen, Brain, Target, Flame, Star, Medal, Clock, Crown, GraduationCap, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppNav } from "@/components/AppNav";

interface Stats {
  simCount: number;
  simAccuracy: number;
  flashSessions: number;
  planCount: number;
  xp: number;
  streak: number;
  redacaoCount: number;
}

type BadgeCategory = "estudos" | "simulados" | "flashcards" | "constancia" | "xp" | "especial";

interface Badge {
  id: string;
  category: BadgeCategory;
  emoji: string;
  title: string;
  description: string;
  condition: (s: Stats) => boolean;
  color: string;
  secret?: boolean;
}

const BADGES: Badge[] = [
  // XP / Progressão
  { id: "primeiroXP",     category: "xp",        emoji: "✨", title: "Faísca",            description: "Ganhe seu primeiro XP",                            condition: s => s.xp >= 1,    color: "from-yellow-400 to-amber-500" },
  { id: "bronze",         category: "xp",        emoji: "🥉", title: "Bronze",             description: "Alcance 500 XP",                                   condition: s => s.xp >= 500,  color: "from-amber-600 to-yellow-700" },
  { id: "prata",          category: "xp",        emoji: "🥈", title: "Prata",              description: "Alcance 1.500 XP",                                 condition: s => s.xp >= 1500, color: "from-slate-400 to-gray-500" },
  { id: "ouro",           category: "xp",        emoji: "🥇", title: "Ouro",               description: "Alcance 3.000 XP",                                 condition: s => s.xp >= 3000, color: "from-yellow-400 to-amber-500" },
  { id: "platina",        category: "xp",        emoji: "🔮", title: "Platina",            description: "Alcance 6.000 XP",                                 condition: s => s.xp >= 6000, color: "from-violet-500 to-purple-600" },

  // Simulados
  { id: "primSim",        category: "simulados", emoji: "🎯", title: "Primeiro Disparo",   description: "Complete seu primeiro simulado",                    condition: s => s.simCount >= 1,  color: "from-blue-400 to-indigo-500" },
  { id: "sim5",           category: "simulados", emoji: "📊", title: "Persistente",        description: "Complete 5 simulados",                             condition: s => s.simCount >= 5,  color: "from-blue-500 to-indigo-600" },
  { id: "sim10",          category: "simulados", emoji: "🏹", title: "Atirador Certeiro",  description: "Complete 10 simulados",                            condition: s => s.simCount >= 10, color: "from-indigo-500 to-violet-600" },
  { id: "sim25",          category: "simulados", emoji: "🎖️", title: "Veterano",           description: "Complete 25 simulados",                            condition: s => s.simCount >= 25, color: "from-violet-500 to-purple-700" },
  { id: "sim90",          category: "simulados", emoji: "💯", title: "Nota Máxima",        description: "Acerte 90%+ num simulado",                         condition: s => s.simAccuracy >= 90, color: "from-emerald-400 to-green-500" },

  // Flashcards
  { id: "primFlash",      category: "flashcards", emoji: "🃏", title: "Deck Aberto",        description: "Faça sua primeira sessão de flashcards",           condition: s => s.flashSessions >= 1,  color: "from-pink-400 to-rose-500" },
  { id: "flash5",         category: "flashcards", emoji: "🎴", title: "Memorizador",        description: "Complete 5 sessões de flashcards",                 condition: s => s.flashSessions >= 5,  color: "from-rose-400 to-pink-600" },
  { id: "flash20",        category: "flashcards", emoji: "🧠", title: "Máquina de Memória", description: "Complete 20 sessões de flashcards",                condition: s => s.flashSessions >= 20, color: "from-fuchsia-500 to-pink-600" },

  // Planos / Estudos
  { id: "primPlano",      category: "estudos",   emoji: "📋", title: "Planejador",         description: "Gere seu primeiro plano de estudos",               condition: s => s.planCount >= 1,  color: "from-cyan-400 to-teal-500" },
  { id: "plano5",         category: "estudos",   emoji: "📚", title: "Estrategista",       description: "Gere 5 planos de estudos",                         condition: s => s.planCount >= 5,  color: "from-teal-400 to-emerald-500" },
  { id: "plano20",        category: "estudos",   emoji: "🗺️", title: "Explorador",         description: "Gere 20 planos de estudos",                        condition: s => s.planCount >= 20, color: "from-emerald-400 to-cyan-600" },

  // Constância / Streak
  { id: "streak3",        category: "constancia", emoji: "🔥", title: "Pegando Fogo",       description: "Estude 3 dias seguidos",                           condition: s => s.streak >= 3,  color: "from-orange-400 to-red-500" },
  { id: "streak7",        category: "constancia", emoji: "⚡", title: "Semana Invicta",     description: "Estude 7 dias seguidos",                           condition: s => s.streak >= 7,  color: "from-yellow-400 to-orange-500" },
  { id: "streak30",       category: "constancia", emoji: "👑", title: "Rei da Constância",  description: "Estude 30 dias seguidos",                          condition: s => s.streak >= 30, color: "from-amber-400 to-yellow-500" },

  // Especiais
  { id: "redacao",        category: "especial",  emoji: "✍️", title: "Escritor",           description: "Corrija sua primeira redação com a IA",            condition: s => s.redacaoCount >= 1, color: "from-indigo-400 to-blue-500" },
  { id: "completo",       category: "especial",  emoji: "🌟", title: "Estudante Completo",  description: "Use simulados, flashcards e plano de estudos",     condition: s => s.simCount >= 1 && s.flashSessions >= 1 && s.planCount >= 1, color: "from-violet-500 to-indigo-600" },
  { id: "maratona",       category: "especial",  emoji: "🚀", title: "Maratonista",         description: "Acumule 50+ simulados + 50+ flashcards + 1000 XP", condition: s => s.simCount >= 50 && s.flashSessions >= 50 && s.xp >= 1000, color: "from-fuchsia-500 to-violet-700", secret: true },
];

const CATEGORY_LABELS: Record<BadgeCategory, { label: string; icon: React.ComponentType<any> }> = {
  xp:         { label: "Progresso & XP",    icon: Zap },
  simulados:  { label: "Simulados",          icon: Target },
  flashcards: { label: "Flashcards",         icon: Brain },
  estudos:    { label: "Planos de Estudo",   icon: BookOpen },
  constancia: { label: "Constância",         icon: Flame },
  especial:   { label: "Especiais",          icon: Star },
};

export default function ConquistasPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [rankRes, streakRes, redacaoRes] = await Promise.all([
          fetch("/api/ranking", { credentials: "include" }),
          fetch("/api/streak", { credentials: "include" }),
          fetch("/api/history", { credentials: "include" }),
        ]);
        const rankJson = rankRes.ok ? await rankRes.json() : {};
        const streakJson = streakRes.ok ? await streakRes.json() : {};
        const histJson = redacaoRes.ok ? await redacaoRes.json() : {};
        const me = rankJson.currentUser;
        const redacaoCount = (histJson.entries ?? []).filter((e: any) => e.type === "redacao").length;
        setStats({
          simCount: me?.simCount ?? 0,
          simAccuracy: me?.simAccuracy ?? 0,
          flashSessions: me?.flashSessions ?? 0,
          planCount: me?.planCount ?? 0,
          xp: me?.xp ?? 0,
          streak: streakJson.currentStreak ?? 0,
          redacaoCount,
        });
      } catch {
        setStats({ simCount: 0, simAccuracy: 0, flashSessions: 0, planCount: 0, xp: 0, streak: 0, redacaoCount: 0 });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const unlocked = stats ? BADGES.filter(b => b.condition(stats)) : [];
  const totalUnlocked = unlocked.length;
  const totalBadges = BADGES.length;
  const progress = Math.round((totalUnlocked / totalBadges) * 100);

  const categories = Array.from(new Set(BADGES.map(b => b.category))) as BadgeCategory[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50">
      <AppNav />
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-700 px-4 py-6 shadow-xl shadow-violet-200">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-white font-black text-2xl flex items-center gap-2">
                <Trophy className="w-7 h-7 text-amber-300" />
                Conquistas
              </h1>
              <p className="text-white/70 text-sm">
                {loading ? "Carregando..." : `${totalUnlocked} de ${totalBadges} desbloqueadas`}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {!loading && (
            <div className="bg-white/15 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-black text-sm">Progresso total</p>
                <p className="text-white font-black">{progress}%</p>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-amber-300 to-yellow-400 rounded-full"
                />
              </div>
              <p className="text-white/60 text-xs mt-2">{totalUnlocked} conquistadas · {totalBadges - totalUnlocked} restantes</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          categories.map(cat => {
            const catBadges = BADGES.filter(b => b.category === cat);
            const catUnlocked = catBadges.filter(b => b.condition(stats!));
            const CatIcon = CATEGORY_LABELS[cat].icon;

            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-4">
                  <CatIcon className="w-5 h-5 text-violet-500" />
                  <h2 className="font-black text-slate-700 text-lg">{CATEGORY_LABELS[cat].label}</h2>
                  <span className="ml-auto text-xs font-bold text-violet-500 bg-violet-50 px-2.5 py-1 rounded-full border border-violet-100">
                    {catUnlocked.length}/{catBadges.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {catBadges.map((badge, idx) => {
                    const isUnlocked = badge.condition(stats!);
                    const isSecret = badge.secret && !isUnlocked;

                    return (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          "relative rounded-2xl border p-4 transition-all",
                          isUnlocked
                            ? "bg-white border-violet-100 shadow-sm"
                            : "bg-white/50 border-slate-100"
                        )}
                      >
                        {isUnlocked && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          </div>
                        )}

                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-sm",
                          isUnlocked
                            ? `bg-gradient-to-br ${badge.color} shadow-lg`
                            : "bg-slate-100 grayscale opacity-40"
                        )}>
                          {isSecret ? "🔒" : badge.emoji}
                        </div>

                        <p className={cn(
                          "font-black text-sm mb-0.5",
                          isUnlocked ? "text-slate-800" : "text-slate-400"
                        )}>
                          {isSecret ? "???" : badge.title}
                        </p>
                        <p className={cn(
                          "text-xs leading-snug",
                          isUnlocked ? "text-slate-500" : "text-slate-300"
                        )}>
                          {isSecret ? "Continue estudando para descobrir..." : badge.description}
                        </p>

                        {isUnlocked && (
                          <div className="mt-2">
                            <span className="text-[10px] font-black uppercase tracking-wide text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              Desbloqueado ✓
                            </span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {!loading && totalUnlocked === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Comece a estudar para desbloquear conquistas!</p>
            <button
              onClick={() => navigate("/app")}
              className="mt-4 px-6 py-2 rounded-xl bg-violet-600 text-white font-bold text-sm"
            >
              Ir para o início
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
