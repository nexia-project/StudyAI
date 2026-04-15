import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import {
  LogIn,
  LogOut,
  History,
  Trophy,
  ChevronDown,
  Loader2,
  BarChart2,
  Crown,
  Sparkles,
  Shield,
  Lock,
  UserCircle,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";

export function UserMenu() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  const { isPremium, freeAiUsesRemaining, freeAiLimit } = useSubscription();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (isLoading) {
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={login}
        className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
      >
        <LogIn className="w-4 h-4" />
        Entrar
      </button>
    );
  }

  const displayName = user?.firstName
    ? user.firstName
    : user?.email?.split("@")[0] ?? "Usuário";

  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="relative flex items-center gap-2" ref={menuRef}>
      {/* Premium badge / upgrade button */}
      {isPremium ? (
        <button
          onClick={() => navigate("/pricing")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-black shadow-md hover:shadow-lg hover:scale-105 transition-all"
        >
          <Crown className="w-3 h-3 text-yellow-300" />
          Premium
        </button>
      ) : freeAiUsesRemaining !== null && freeAiUsesRemaining <= 0 ? (
        <button
          onClick={() => navigate("/pricing")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-black shadow-md hover:shadow-lg hover:scale-105 transition-all animate-pulse"
        >
          <Lock className="w-3 h-3" />
          Limite atingido
        </button>
      ) : (
        <button
          onClick={() => navigate("/pricing")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-black shadow-md hover:shadow-lg hover:scale-105 transition-all"
          title={`${freeAiUsesRemaining} de ${freeAiLimit} estudos gratuitos restantes`}
        >
          <Sparkles className="w-3 h-3" />
          {freeAiUsesRemaining !== null ? `${freeAiUsesRemaining}/${freeAiLimit} grátis` : "Upgrade"}
        </button>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white border-2 border-primary/10 hover:border-primary/30 transition-colors shadow-sm"
      >
        {user?.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt={displayName}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-black">
            {initials}
          </div>
        )}
        <span className="text-sm font-bold text-foreground max-w-[100px] truncate">
          {displayName}
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-border shadow-xl shadow-black/10 overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-border bg-secondary/40">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Conta</p>
              <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
              {user?.email && (
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              )}
            </div>
            <div className="p-1.5">
              {!isPremium && (
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/pricing");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors mb-1"
                >
                  <Crown className="w-4 h-4 text-violet-600" />
                  Assinar Premium
                  <span className="ml-auto text-[10px] font-black bg-violet-600 text-white px-2 py-0.5 rounded-full">R$29,90/mês</span>
                </button>
              )}
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/perfil");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <UserCircle className="w-4 h-4 text-blue-500" />
                Meus Dados
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/mapa-mental");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              >
                <Brain className="w-4 h-4 text-indigo-500" />
                Mapa Mental
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/dashboard");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-violet-50 hover:text-violet-600 transition-colors"
              >
                <BarChart2 className="w-4 h-4 text-violet-500" />
                Dashboard
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/historico");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-primary/5 hover:text-primary transition-colors"
              >
                <History className="w-4 h-4" />
                Meu Histórico
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/ranking");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-amber-50 hover:text-amber-600 transition-colors"
              >
                <Trophy className="w-4 h-4 text-amber-500" />
                Ranking Global
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/privacidade");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-green-50 hover:text-green-700 transition-colors"
              >
                <Shield className="w-4 h-4 text-green-600" />
                Privacidade & LGPD
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
