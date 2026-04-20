import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Map, PenLine, BarChart2, Trophy, Medal, History, Brain,
  Target, Clock, ChevronDown, Menu, X, GraduationCap,
  BookOpen, Flame, Zap, Users, Globe, Calendar, NotebookPen, TrendingUp, Layers,
} from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  color: string;
  badge?: string;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Estudar",
    items: [
      { icon: Home,   label: "Plano de Estudos",  path: "/app",           color: "text-violet-600" },
      { icon: Target, label: "Simulado ENEM",      path: "/simulado-enem", color: "text-indigo-600" },
      { icon: PenLine, label: "Redação",           path: "/redacao",       color: "text-rose-600"   },
      { icon: Calendar, label: "Cronograma",       path: "/cronograma",    color: "text-violet-600" },
      { icon: BookOpen, label: "Aula com o Professor", path: "/aula-ia", color: "text-indigo-600" },
      { icon: TrendingUp, label: "Trilha Mestre",   path: "/trilha",        color: "text-blue-600"   },
      { icon: Layers,     label: "Notebook (RAG)",  path: "/notebook",      color: "text-indigo-600", badge: "NOVO" },
      { icon: NotebookPen, label: "Caderno Digital", path: "/caderno",      color: "text-amber-600"  },
      { icon: Clock,  label: "Sala de Estudos",    path: "/sala-estudos",  color: "text-amber-600"  },
    ],
  },
  {
    label: "Acompanhar",
    items: [
      { icon: BarChart2, label: "Dashboard",   path: "/dashboard",  color: "text-blue-600"   },
      { icon: Map,       label: "Radar",        path: "/mapa",       color: "text-emerald-600" },
      { icon: History,   label: "Histórico",    path: "/historico",  color: "text-cyan-600"   },
      { icon: Medal,     label: "Conquistas",   path: "/conquistas", color: "text-yellow-600" },
      { icon: Trophy,    label: "Ranking",      path: "/ranking",    color: "text-orange-600" },
    ],
  },
  {
    label: "Recursos",
    items: [
      { icon: Brain, label: "Mapa Mental", path: "/mapa-mental", color: "text-purple-600" },
    ],
  },
];

const QUICK_LINKS = [
  { icon: Home,   label: "Plano",      path: "/app",            color: "text-violet-600", bg: "bg-violet-50 hover:bg-violet-100" },
  { icon: Target, label: "Simulado",   path: "/simulado-enem",  color: "text-indigo-600", bg: "bg-indigo-50 hover:bg-indigo-100" },
  { icon: BarChart2, label: "Dashboard", path: "/dashboard",    color: "text-blue-600",   bg: "bg-blue-50 hover:bg-blue-100"   },
  { icon: Trophy, label: "Ranking",    path: "/ranking",        color: "text-orange-600", bg: "bg-orange-50 hover:bg-orange-100" },
  { icon: Clock,  label: "Pomodoro",   path: "/sala-estudos",   color: "text-amber-600",  bg: "bg-amber-50 hover:bg-amber-100" },
];

function DropdownMenu({
  group,
  isOpen,
  onClose,
  onNavigate,
  currentPath,
}: {
  group: { label: string; items: NavItem[] };
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  currentPath: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  const isGroupActive = group.items.some(item => currentPath === item.path || currentPath.startsWith(item.path + "/"));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !isOpen ? undefined : onClose()}
        onMouseEnter={() => !isOpen ? undefined : undefined}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all",
          isGroupActive
            ? "bg-slate-100 text-slate-900"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
        )}
      >
        {group.label}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50"
          >
            <div className="py-1.5">
              {group.items.map(item => {
                const isActive = currentPath === item.path || currentPath.startsWith(item.path + "/");
                return (
                  <button
                    key={item.path}
                    onClick={() => { onNavigate(item.path); onClose(); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left",
                      isActive
                        ? "bg-slate-50 font-bold text-slate-900"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4 flex-shrink-0", item.color)} />
                    {item.label}
                    {item.badge && !isActive && (
                      <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600">{item.badge}</span>
                    )}
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface AppNavProps {
  onHome?: () => void;
}

export function AppNav({ onHome }: AppNavProps) {
  const [location, navigate] = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentPath = location;

  function handleNavigate(path: string) {
    if (path === "/app" && onHome) {
      onHome();
    } else {
      navigate(path);
    }
    setMobileOpen(false);
  }

  function toggleGroup(label: string) {
    setOpenGroup(prev => prev === label ? null : label);
  }

  return (
    <>
      {/* ── Desktop/Tablet Top Nav ── */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-3 py-2 flex items-center gap-2">

          {/* Logo */}
          <button
            onClick={() => handleNavigate("/app")}
            className="flex items-center gap-2 flex-shrink-0 mr-2"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-violet-600 flex items-center justify-center text-white font-black text-xs">
              S
            </div>
            <span className="font-black text-slate-800 text-sm hidden sm:block">StudyAI</span>
          </button>

          <div className="h-5 w-px bg-slate-200 hidden md:block" />

          {/* Desktop: Grouped dropdown nav */}
          <div className="hidden md:flex items-center gap-0.5 flex-1">
            {NAV_GROUPS.map(group => (
              <div
                key={group.label}
                onMouseEnter={() => setOpenGroup(group.label)}
                onMouseLeave={() => setOpenGroup(null)}
              >
                <DropdownMenu
                  group={group}
                  isOpen={openGroup === group.label}
                  onClose={() => setOpenGroup(null)}
                  onNavigate={handleNavigate}
                  currentPath={currentPath}
                />
              </div>
            ))}

            {/* Quick-access separator + links */}
            <div className="h-5 w-px bg-slate-200 mx-2" />

            {/* Escola / Professor quick link */}
            <button
              onClick={() => navigate("/professor")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Professores
            </button>
          </div>

          {/* Mobile: hamburger */}
          <button
            className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
            onClick={() => setMobileOpen(v => !v)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Mobile: quick scrollable tabs */}
          <div className="flex md:hidden items-center gap-1 overflow-x-auto scrollbar-none flex-1 px-1">
            {QUICK_LINKS.map(link => {
              const isActive = currentPath === link.path || currentPath.startsWith(link.path + "/");
              return (
                <button
                  key={link.path}
                  onClick={() => handleNavigate(link.path)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0",
                    isActive ? "bg-violet-100 text-violet-700" : cn(link.bg, link.color)
                  )}
                >
                  <link.icon className="w-3.5 h-3.5" />
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* User menu */}
          <div className="flex-shrink-0">
            <UserMenu />
          </div>
        </div>
      </div>

      {/* ── Mobile Full Menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 bottom-0 w-72 bg-white shadow-2xl overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Mobile nav header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-violet-600 flex items-center justify-center text-white font-black text-sm">S</div>
                  <span className="font-black text-slate-800">StudyAI</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Groups */}
              <div className="p-3 space-y-4">
                {NAV_GROUPS.map(group => (
                  <div key={group.label}>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 mb-2">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map(item => {
                        const isActive = currentPath === item.path || currentPath.startsWith(item.path + "/");
                        return (
                          <button
                            key={item.path}
                            onClick={() => handleNavigate(item.path)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left",
                              isActive
                                ? "bg-violet-50 text-violet-700 font-bold"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                          >
                            <item.icon className={cn("w-4 h-4 flex-shrink-0", item.color)} />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Portals section */}
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Portais</p>
                  <div className="space-y-0.5">
                    {[
                      { icon: BookOpen, label: "Portal do Professor", path: "/professor", color: "text-indigo-600" },
                      { icon: Globe,    label: "Portal Governo",      path: "/governo",   color: "text-emerald-600" },
                    ].map(item => (
                      <button key={item.path} onClick={() => handleNavigate(item.path)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left">
                        <item.icon className={cn("w-4 h-4 flex-shrink-0", item.color)} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Mobile Nav (persistent) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100 md:hidden safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-1.5">
          {[
            { icon: Home,      label: "Início",    path: "/app",           color: "text-violet-600"  },
            { icon: BarChart2, label: "Dashboard", path: "/dashboard",     color: "text-blue-600"    },
            { icon: Target,    label: "Simulado",  path: "/simulado-enem", color: "text-indigo-600"  },
            { icon: Trophy,    label: "Ranking",   path: "/ranking",       color: "text-orange-600"  },
            { icon: Clock,     label: "Estudar",   path: "/sala-estudos",  color: "text-amber-600"   },
          ].map(item => {
            const isActive = currentPath === item.path || (item.path !== "/" && currentPath.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[52px]",
                  isActive ? "bg-slate-50" : "hover:bg-slate-50"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-colors", isActive ? item.color : "text-slate-400")} />
                <span className={cn("text-[10px] font-semibold transition-colors", isActive ? item.color : "text-slate-400")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
