import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Map, PenLine, BarChart2, Trophy, Medal, History, Brain,
  Target, Clock, ChevronDown, Menu, X, GraduationCap,
  BookOpen, Flame, Zap, Users, Globe, Calendar, NotebookPen, TrendingUp, Layers,
  ClipboardList, MessageSquare, Building2,
} from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/lib/utils";
import { useMode, AppMode, MODE_CONFIG } from "@/context/ModeContext";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  color: string;
  badge?: string;
}

const ALUNO_NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "🔥 Hoje",
    items: [
      { icon: Home,        label: "Plano de Estudos",      path: "/app",           color: "text-indigo-600" },
      { icon: Target,      label: "Simulado ENEM",          path: "/simulado-enem", color: "text-indigo-600" },
      { icon: Calendar,    label: "Cronograma",             path: "/cronograma",    color: "text-indigo-600" },
      { icon: Clock,       label: "Sala de Estudos",        path: "/sala-estudos",  color: "text-amber-600"  },
    ],
  },
  {
    label: "📚 Meu Acervo",
    items: [
      { icon: Layers,      label: "Notebook RAG",           path: "/notebook",      color: "text-indigo-600", badge: "NOVO" },
      { icon: NotebookPen, label: "Caderno Digital",        path: "/caderno",       color: "text-amber-600"  },
      { icon: PenLine,     label: "Redação",                path: "/redacao",       color: "text-rose-600"   },
      { icon: TrendingUp,  label: "Trilha Mestre",          path: "/trilha",        color: "text-blue-600"   },
      { icon: BookOpen,    label: "Aula com Professor",     path: "/aula-ia",       color: "text-indigo-600" },
      { icon: Zap,         label: "Lousa Imersiva",         path: "/lousa-imersiva", color: "text-green-600", badge: "NOVO" },
      { icon: Brain,       label: "Tutor IA (GPT/Claude)",  path: "/tutor-ia",      color: "text-violet-600", badge: "NOVO" },
    ],
  },
  {
    label: "📊 Acompanhar",
    items: [
      { icon: BarChart2,   label: "Dashboard",              path: "/dashboard",     color: "text-blue-600"   },
      { icon: Map,         label: "Radar de Desempenho",    path: "/mapa",          color: "text-emerald-600"},
      { icon: History,     label: "Histórico",              path: "/historico",     color: "text-cyan-600"   },
      { icon: Layers,      label: "Meus Conteúdos",         path: "/meus-conteudos", color: "text-fuchsia-600", badge: "NOVO" },
      { icon: Medal,       label: "Conquistas",             path: "/conquistas",    color: "text-yellow-600" },
      { icon: Trophy,      label: "Ranking",                path: "/ranking",       color: "text-orange-600" },
    ],
  },
];

const PROFESSOR_NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "📊 Dashboard",
    items: [
      { icon: BarChart2,   label: "Visão Geral",            path: "/professor",     color: "text-indigo-600" },
      { icon: Layers,      label: "Notebook IA",            path: "/notebook",      color: "text-indigo-600", badge: "NOVO" },
      { icon: MessageSquare, label: "Comunicação",          path: "/comunicacao",   color: "text-green-600",  badge: "NOVO" },
    ],
  },
  {
    label: "👥 Turmas & Alunos",
    items: [
      { icon: Users,       label: "Minhas Turmas",          path: "/professor",     color: "text-indigo-600" },
      { icon: ClipboardList, label: "Atividades",           path: "/atividades",    color: "text-indigo-600" },
    ],
  },
  {
    label: "📝 Conteúdo",
    items: [
      { icon: Brain,       label: "Criador de Conteúdo",    path: "/professor",     color: "text-indigo-600" },
      { icon: Target,      label: "Gerador de Provas",      path: "/professor",     color: "text-red-600"    },
      { icon: Layers,      label: "Meus Conteúdos",         path: "/meus-conteudos", color: "text-fuchsia-600", badge: "NOVO" },
      { icon: TrendingUp,  label: "Relatórios",             path: "/professor",     color: "text-blue-600"   },
    ],
  },
];

const ESCOLA_NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "🏫 Gestão",
    items: [
      { icon: Building2,   label: "Dashboard Institucional", path: "/instituicao",  color: "text-emerald-600" },
      { icon: Users,       label: "Professores & Turmas",    path: "/instituicao",  color: "text-blue-600"    },
      { icon: BarChart2,   label: "Relatórios Avançados",    path: "/instituicao",  color: "text-indigo-600"  },
    ],
  },
  {
    label: "📡 Comunicação",
    items: [
      { icon: MessageSquare, label: "Orquestrador",          path: "/comunicacao",  color: "text-green-600", badge: "NOVO" },
    ],
  },
];

function getNavGroups(mode: AppMode) {
  if (mode === "professor") return PROFESSOR_NAV_GROUPS;
  if (mode === "escola")    return ESCOLA_NAV_GROUPS;
  return ALUNO_NAV_GROUPS;
}

const QUICK_LINKS_MAP: Record<AppMode, NavItem[]> = {
  aluno: [
    { icon: Home,        label: "Plano",      path: "/app",           color: "text-indigo-600" },
    { icon: Target,      label: "Simulado",   path: "/simulado-enem", color: "text-indigo-600" },
    { icon: BarChart2,   label: "Dashboard",  path: "/dashboard",     color: "text-blue-600"   },
    { icon: Trophy,      label: "Ranking",    path: "/ranking",       color: "text-orange-600" },
    { icon: Clock,       label: "Estudar",    path: "/sala-estudos",  color: "text-amber-600"  },
  ],
  professor: [
    { icon: BarChart2,      label: "Dashboard",  path: "/professor",    color: "text-indigo-600" },
    { icon: Users,          label: "Turmas",     path: "/professor",    color: "text-indigo-600" },
    { icon: Layers,         label: "Notebook",   path: "/notebook",     color: "text-indigo-600" },
    { icon: MessageSquare,  label: "Comunicar",  path: "/comunicacao",  color: "text-green-600"  },
  ],
  escola: [
    { icon: Building2,      label: "Gestão",     path: "/instituicao",  color: "text-emerald-600" },
    { icon: Users,          label: "Turmas",     path: "/instituicao",  color: "text-blue-600"    },
    { icon: BarChart2,      label: "Relatórios", path: "/instituicao",  color: "text-indigo-600"  },
    { icon: MessageSquare,  label: "Comunicar",  path: "/comunicacao",  color: "text-green-600"   },
  ],
};

function ModeSwitcher() {
  const { mode, setMode } = useMode();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const current = MODE_CONFIG[mode];

  function handleSelect(m: AppMode) {
    setMode(m);
    navigate(MODE_CONFIG[m].defaultPath);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border",
          "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
        )}
      >
        <span>{current.emoji}</span>
        <span className={current.color}>Modo: {current.label}</span>
        <ChevronDown className={cn("w-3 h-3 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 py-1.5"
          >
            {(Object.entries(MODE_CONFIG) as [AppMode, typeof MODE_CONFIG[AppMode]][]).map(([m, cfg]) => (
              <button
                key={m}
                onClick={() => handleSelect(m)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                  mode === m && "bg-slate-50"
                )}
              >
                <span className="text-xl flex-shrink-0">{cfg.emoji}</span>
                <div>
                  <p className={cn("text-sm font-black", mode === m ? cfg.color : "text-slate-700")}>{cfg.label}</p>
                  <p className="text-[10px] text-slate-400 leading-snug">{cfg.description}</p>
                </div>
                {mode === m && <span className="ml-auto w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileModeSection({ mode, onSelect }: { mode: AppMode; onSelect: (m: AppMode) => void }) {
  const { setMode } = useMode();
  return (
    <div className="p-3 border-b border-slate-100">
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Modo atual</p>
      <div className="space-y-1">
        {(Object.entries(MODE_CONFIG) as [AppMode, typeof MODE_CONFIG[AppMode]][]).map(([m, cfg]) => (
          <button key={m}
            onClick={() => { setMode(m); onSelect(m); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left",
              mode === m ? "bg-indigo-50 text-indigo-700 font-bold" : "text-gray-600 hover:bg-gray-50"
            )}>
            <span className="text-lg">{cfg.emoji}</span>
            {cfg.label}
            {mode === m && <span className="ml-auto w-2 h-2 rounded-full bg-indigo-500" />}
          </button>
        ))}
      </div>
    </div>
  );
}

interface AppNavProps {
  onHome?: () => void;
}

export function AppNav({ onHome }: AppNavProps) {
  const [location, navigate] = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mode } = useMode();

  const currentPath = location;
  const navGroups = getNavGroups(mode);
  const quickLinks = QUICK_LINKS_MAP[mode];

  useEffect(() => {
    const g = getNavGroups(mode);
    setExpandedGroups(Object.fromEntries(g.map(gr => [gr.label, true])));
  }, [mode]);

  function handleNavigate(path: string) {
    if (path === "/app" && onHome) { onHome(); } else { navigate(path); }
    setMobileOpen(false);
  }

  function toggleNavGroup(label: string) {
    setExpandedGroups(prev => ({ ...prev, [label]: !(prev[label] ?? true) }));
  }

  return (
    <>
      {/* ── Desktop: fixed left sidebar ── */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 z-40 flex-col border-r border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50 shadow-[4px_0_24px_-12px_rgba(15,23,42,0.15)]">
        <div className="p-3 border-b border-slate-100 flex-shrink-0">
          <button type="button" onClick={() => handleNavigate("/app")} className="flex items-center gap-2.5 w-full rounded-xl p-1 hover:bg-slate-100/80 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm">S</div>
            <span className="font-black text-slate-800 text-base tracking-tight">StudyAI</span>
          </button>
          <div className="mt-3">
            <ModeSwitcher />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 min-h-0">
          {navGroups.map(group => {
            const expanded = expandedGroups[group.label] ?? true;
            return (
              <div key={group.label} className="mb-2">
                <button
                  type="button"
                  onClick={() => toggleNavGroup(group.label)}
                  className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg text-[11px] font-black text-slate-400 uppercase tracking-wider hover:bg-slate-100/80 transition-colors text-left"
                >
                  <span className="truncate">{group.label}</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 flex-shrink-0 transition-transform text-slate-400", expanded && "rotate-180")} />
                </button>
                {expanded && (
                  <div className="mt-1 space-y-0.5 pl-0.5">
                    {group.items.map(item => {
                      const isActive = currentPath === item.path || currentPath.startsWith(item.path + "/");
                      return (
                        <button
                          key={item.path + item.label}
                          type="button"
                          onClick={() => handleNavigate(item.path)}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left transition-colors",
                            isActive
                              ? "bg-indigo-50 text-indigo-900 font-bold shadow-sm border border-indigo-100/80"
                              : "text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent"
                          )}
                        >
                          <item.icon className={cn("w-4 h-4 flex-shrink-0", item.color)} />
                          <span className="truncate flex-1">{item.label}</span>
                          {item.badge && !isActive && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 flex-shrink-0">{item.badge}</span>
                          )}
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 flex-shrink-0 bg-white/90 backdrop-blur-sm">
          <UserMenu />
        </div>
      </aside>

      {/* ── Mobile: top bar ── */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm md:hidden">
        <div className="max-w-screen-2xl mx-auto px-3 py-2 flex items-center gap-2">

          {/* Logo */}
          <button type="button" onClick={() => handleNavigate("/app")} className="flex items-center gap-2 flex-shrink-0 mr-1">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs">S</div>
            <span className="font-black text-slate-800 text-sm hidden sm:block">StudyAI</span>
          </button>

          {/* Mobile hamburger */}
          <button type="button" className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors" onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Mobile quick tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 px-1">
            {quickLinks.map(link => {
              const isActive = currentPath === link.path || (link.path !== "/" && currentPath.startsWith(link.path + "/"));
              return (
                <button key={link.path + link.label}
                  type="button"
                  onClick={() => handleNavigate(link.path)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0",
                    isActive ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"
                  )}
                >
                  <link.icon className="w-3.5 h-3.5" />
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* User menu */}
          <div className="flex-shrink-0"><UserMenu /></div>
        </div>
      </div>

      {/* ── Mobile Full Menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}>
            <motion.div
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 bottom-0 w-72 bg-white shadow-2xl overflow-y-auto"
              onClick={e => e.stopPropagation()}>

              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm">S</div>
                  <span className="font-black text-slate-800">StudyAI</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode switcher mobile */}
              <MobileModeSection mode={mode} onSelect={(m) => { navigate(MODE_CONFIG[m].defaultPath); setMobileOpen(false); }} />

              <div className="p-3 space-y-4">
                {navGroups.map(group => (
                  <div key={group.label}>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 mb-2">{group.label}</p>
                    <div className="space-y-0.5">
                      {group.items.map(item => {
                        const isActive = currentPath === item.path || currentPath.startsWith(item.path + "/");
                        return (
                          <button key={item.path + item.label} onClick={() => handleNavigate(item.path)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left",
                              isActive ? "bg-indigo-50 text-indigo-700 font-bold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}>
                            <item.icon className={cn("w-4 h-4 flex-shrink-0", item.color)} />
                            {item.label}
                            {item.badge && <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600">{item.badge}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Mobile Nav ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100 md:hidden safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-1.5">
          {quickLinks.slice(0, 5).map(item => {
            const isActive = currentPath === item.path || (item.path !== "/" && currentPath.startsWith(item.path));
            return (
              <button key={item.path + item.label} onClick={() => handleNavigate(item.path)}
                className={cn("flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[52px]", isActive ? "bg-slate-50" : "hover:bg-slate-50")}>
                <item.icon className={cn("w-5 h-5 transition-colors", isActive ? item.color : "text-slate-400")} />
                <span className={cn("text-[10px] font-semibold transition-colors", isActive ? item.color : "text-slate-400")}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
