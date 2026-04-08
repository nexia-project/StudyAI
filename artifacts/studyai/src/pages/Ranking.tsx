import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  Trophy,
  Medal,
  Star,
  Target,
  BookOpen,
  Zap,
  Crown,
  ArrowLeft,
  TrendingUp,
  Users,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription, startCheckout } from "@/hooks/useSubscription";

interface TierInfo {
  name: string;
  color: string;
  emoji: string;
  minXp: number;
  maxXp: number;
}

interface RankEntry {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
  xp: number;
  simCount: number;
  simAccuracy: number;
  flashSessions: number;
  planCount: number;
  tier: TierInfo;
  rank: number;
}

interface RankingData {
  leaderboard: RankEntry[];
  currentUser: RankEntry | null;
  totalPlayers: number;
}

const TIER_ORDER = [
  { name: "Bronze",   emoji: "🥉", color: "#cd7c3a", minXp: 0,    maxXp: 500  },
  { name: "Prata",    emoji: "🥈", color: "#94a3b8", minXp: 500,  maxXp: 1500 },
  { name: "Ouro",     emoji: "🥇", color: "#f59e0b", minXp: 1500, maxXp: 3000 },
  { name: "Platina",  emoji: "🔮", color: "#a855f7", minXp: 3000, maxXp: 6000 },
  { name: "Diamante", emoji: "💎", color: "#06b6d4", minXp: 6000, maxXp: Infinity },
];

function getTierGradient(name: string) {
  switch (name) {
    case "Diamante": return "from-cyan-400 to-sky-500";
    case "Platina":  return "from-violet-500 to-purple-600";
    case "Ouro":     return "from-amber-400 to-yellow-500";
    case "Prata":    return "from-slate-400 to-slate-500";
    default:         return "from-orange-400 to-amber-500";
  }
}

function Avatar({ entry, size = "md" }: { entry: RankEntry; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "w-16 h-16 text-xl" : size === "md" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";
  const initials = entry.displayName.slice(0, 2).toUpperCase();
  const grad = getTierGradient(entry.tier.name);
  return entry.profileImageUrl ? (
    <img src={entry.profileImageUrl} alt={entry.displayName} className={cn(dim, "rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-md")} />
  ) : (
    <div className={cn(dim, `rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black flex-shrink-0 ring-2 ring-white shadow-md`)}>
      {initials}
    </div>
  );
}

function XpBar({ xp, tier }: { xp: number; tier: TierInfo }) {
  const next = TIER_ORDER.find((t) => t.minXp > tier.minXp);
  if (!next) return (
    <div className="flex items-center gap-1.5 text-xs text-cyan-500 font-black">
      <Sparkles className="w-3 h-3" /> NÍVEL MÁXIMO
    </div>
  );
  const range = next.minXp - tier.minXp;
  const progress = xp - tier.minXp;
  const pct = Math.min(100, Math.round((progress / range) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
        <span>{tier.emoji} {tier.name}</span>
        <span>{xp} / {next.minXp} XP → {next.emoji} {next.name}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", getTierGradient(tier.name))}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function PodiumCard({ entry, position }: { entry: RankEntry; position: 1 | 2 | 3 }) {
  const configs = {
    1: { height: "h-28", order: "order-2", crown: true, label: "1º", glow: "shadow-amber-200", bg: "from-amber-50 to-yellow-50 border-amber-200" },
    2: { height: "h-20", order: "order-1", crown: false, label: "2º", glow: "shadow-slate-200", bg: "from-slate-50 to-gray-50 border-slate-200" },
    3: { height: "h-16", order: "order-3", crown: false, label: "3º", glow: "shadow-orange-200", bg: "from-orange-50 to-amber-50 border-orange-200" },
  };
  const cfg = configs[position];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.1 }}
      className={cn("flex flex-col items-center gap-2", cfg.order)}
    >
      {cfg.crown && <Crown className="w-6 h-6 text-amber-400 drop-shadow" />}
      <Avatar entry={entry} size="lg" />
      <div className="text-center">
        <p className="font-black text-slate-800 text-sm leading-tight max-w-[90px] truncate">{entry.displayName}</p>
        <p className="text-xs text-slate-500">{entry.tier.emoji} {entry.xp.toLocaleString()} XP</p>
      </div>
      <div className={cn(
        "w-20 rounded-t-2xl border-2 flex items-end justify-center pb-1 shadow-lg",
        cfg.height, cfg.bg, cfg.glow
      )}>
        <span className="text-2xl font-black text-slate-700">{cfg.label}</span>
      </div>
    </motion.div>
  );
}

export default function RankingPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { isPremium } = useSubscription();
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const fetchRanking = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ranking", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar ranking");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRanking(); }, []);

  const top3 = data?.leaderboard.slice(0, 3) ?? [];
  const rest = data?.leaderboard.slice(3) ?? [];
  const me = data?.currentUser;

  const rankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-amber-400 font-black text-lg">🥇</span>;
    if (rank === 2) return <span className="text-slate-400 font-black text-lg">🥈</span>;
    if (rank === 3) return <span className="text-amber-600 font-black text-lg">🥉</span>;
    return <span className="text-slate-500 font-black text-sm w-6 text-center">#{rank}</span>;
  };

  if (!isPremium) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-gradient-to-br from-violet-50 to-indigo-50">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-xl shadow-amber-200">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-800 mb-2">Ranking Global</h1>
          <p className="text-slate-500 max-w-sm">Compita com outros estudantes, suba de tier e mostre quem estuda mais! Recurso exclusivo Premium.</p>
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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-700 px-4 py-6 shadow-xl shadow-violet-200">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate("/app")}
              className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-white font-black text-2xl flex items-center gap-2">
                <Trophy className="w-7 h-7 text-amber-300" />
                Ranking Global
              </h1>
              <p className="text-white/70 text-sm">
                {data ? `${data.totalPlayers} estudantes competindo` : "Carregando..."}
              </p>
            </div>
            <button
              onClick={fetchRanking}
              disabled={loading}
              className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>

          {/* Current user stats */}
          {me && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/15 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar entry={me} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-sm truncate">{me.displayName}</p>
                  <p className="text-white/70 text-xs">{me.tier.emoji} {me.tier.name} · Posição #{me.rank}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-black text-xl">{me.xp.toLocaleString()}</p>
                  <p className="text-white/70 text-xs">XP</p>
                </div>
              </div>
              <XpBar xp={me.xp} tier={me.tier} />
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Tier legend */}
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" /> Ligas
          </p>
          <div className="flex gap-2 flex-wrap">
            {TIER_ORDER.map((t) => (
              <div key={t.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm text-xs font-bold" style={{ color: t.color }}>
                {t.emoji} {t.name}
                <span className="text-slate-400 font-normal">{t.minXp}+ XP</span>
              </div>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-violet-500 animate-pulse" />
            </div>
            <p className="text-slate-500 font-semibold">Carregando ranking...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-600 font-bold mb-3">{error}</p>
            <button onClick={fetchRanking} className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:opacity-90">
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && data && data.leaderboard.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-sm">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="font-black text-xl text-slate-800 mb-2">Ranking vazio por enquanto!</h3>
            <p className="text-slate-500 text-sm">Seja o primeiro a aparecer aqui. Faça simulados e estude com flashcards para ganhar XP!</p>
            <button onClick={() => navigate("/app")} className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-sm hover:opacity-90">
              Começar a estudar
            </button>
          </div>
        )}

        {!loading && top3.length > 0 && (
          <>
            {/* Podium */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-black text-slate-700 text-base mb-6 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" /> Top 3 do Ranking
              </h2>
              <div className="flex items-end justify-center gap-4">
                {top3[1] && <PodiumCard entry={top3[1]} position={2} />}
                {top3[0] && <PodiumCard entry={top3[0]} position={1} />}
                {top3[2] && <PodiumCard entry={top3[2]} position={3} />}
              </div>
            </div>

            {/* Full leaderboard */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-black text-slate-700 text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-violet-500" /> Classificação Completa
                </h2>
                <span className="text-xs text-slate-400 font-semibold">{data?.leaderboard.length ?? 0} estudantes</span>
              </div>

              <div className="divide-y divide-slate-50">
                {/* Top 3 in list too */}
                {(data?.leaderboard ?? []).map((entry, idx) => {
                  const isMe = entry.id === me?.id;
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3.5 transition-colors",
                        isMe ? "bg-violet-50 border-l-4 border-violet-500" : "hover:bg-slate-50"
                      )}
                    >
                      <div className="w-8 flex items-center justify-center flex-shrink-0">
                        {rankBadge(entry.rank)}
                      </div>

                      <Avatar entry={entry} size="sm" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={cn(
                            "font-bold text-sm truncate",
                            isMe ? "text-violet-700" : "text-slate-800"
                          )}>
                            {entry.displayName}
                            {isMe && <span className="ml-1 text-violet-500 font-black text-xs">(você)</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-semibold mt-0.5">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {entry.simCount} simulados · {entry.simAccuracy}%
                          </span>
                          {entry.flashSessions > 0 && (
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              {entry.flashSessions} flashcards
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-slate-800 text-sm">{entry.xp.toLocaleString()} <span className="text-xs text-slate-400 font-semibold">XP</span></p>
                        <p className="text-xs font-bold" style={{ color: entry.tier.color }}>
                          {entry.tier.emoji} {entry.tier.name}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* XP Guide */}
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-3xl border border-violet-100 p-5">
              <h3 className="font-black text-violet-800 text-sm mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" /> Como ganhar XP
              </h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2.5">
                  <span className="flex items-center gap-2 text-slate-700 font-semibold">
                    <Target className="w-4 h-4 text-red-500" /> Por simulado realizado
                  </span>
                  <span className="text-violet-700 font-black">50–200 XP</span>
                </div>
                <div className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2.5">
                  <span className="flex items-center gap-2 text-slate-700 font-semibold">
                    <Zap className="w-4 h-4 text-amber-500" /> Por sessão de flashcards
                  </span>
                  <span className="text-violet-700 font-black">até 50 XP</span>
                </div>
                <div className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2.5">
                  <span className="flex items-center gap-2 text-slate-700 font-semibold">
                    <BookOpen className="w-4 h-4 text-blue-500" /> Por plano de estudo criado
                  </span>
                  <span className="text-violet-700 font-black">25 XP</span>
                </div>
                <div className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2.5">
                  <span className="flex items-center gap-2 text-slate-700 font-semibold">
                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Bônus por acurácia alta
                  </span>
                  <span className="text-violet-700 font-black">+XP extra</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
