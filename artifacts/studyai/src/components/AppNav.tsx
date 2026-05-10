import { useState, useRef, useEffect, type ComponentType } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/lib/utils";
import { useMode, AppMode, MODE_CONFIG } from "@/context/ModeContext";
import {
  IllStudyPlan, IllTargetExam, IllCalendar, IllStudyRoom, IllNotebookStack, IllOpenBook,
  IllPaperPen, IllPathLevels, IllTeacherBoard, IllBlackboard, IllMindSpark, IllBarsSoft,
  IllRadar, IllHistory, IllFolderStack, IllMedal, IllPodium, IllChatWave, IllPeople,
  IllClipboard, IllLightbulb, IllExamSheet, IllBuilding,
} from "@/components/nav/NavIllustrations";

interface NavItem {
  Illustration: ComponentType<{ className?: string }>;
  label: string;
  path: string;
  badge?: string;
}

const ALUNO_NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Hoje",
    items: [
      { Illustration: IllStudyPlan,    label: "Plano de Estudos",      path: "/app" },
      { Illustration: IllTargetExam,   label: "Simulado ENEM",          path: "/simulado-enem" },
      { Illustration: IllCalendar,     label: "Cronograma",             path: "/cronograma" },
      { Illustration: IllStudyRoom,    label: "Sala de Estudos",        path: "/sala-estudos" },
    ],
  },
  {
    label: "Meu acervo",
    items: [
      { Illustration: IllNotebookStack, label: "Notebook RAG",       path: "/notebook",       badge: "NOVO" },
      { Illustration: IllOpenBook,      label: "Caderno Digital",      path: "/caderno" },
      { Illustration: IllPaperPen,      label: "Redação",              path: "/redacao" },
      { Illustration: IllPathLevels,    label: "Trilha Mestre",        path: "/trilha" },
      { Illustration: IllTeacherBoard,  label: "Aula com Professor",   path: "/aula-ia" },
      { Illustration: IllBlackboard,    label: "Lousa Imersiva",       path: "/lousa-imersiva", badge: "NOVO" },
      { Illustration: IllMindSpark,     label: "Tutor IA (GPT/Claude)", path: "/tutor-ia",      badge: "NOVO" },
    ],
  },
  {
    label: "Acompanhar",
    items: [
      { Illustration: IllBarsSoft,    label: "Dashboard",           path: "/dashboard" },
      { Illustration: IllRadar,       label: "Radar de Desempenho", path: "/mapa" },
      { Illustration: IllHistory,     label: "Histórico",           path: "/historico" },
      { Illustration: IllFolderStack, label: "Meus Conteúdos",      path: "/meus-conteudos", badge: "NOVO" },
      { Illustration: IllMedal,       label: "Conquistas",          path: "/conquistas" },
      { Illustration: IllPodium,      label: "Ranking",             path: "/ranking" },
    ],
  },
];

const PROFESSOR_NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Painel",
    items: [
      { Illustration: IllBarsSoft,    label: "Visão Geral", path: "/professor" },
      { Illustration: IllNotebookStack, label: "Notebook IA", path: "/notebook", badge: "NOVO" },
      { Illustration: IllChatWave,    label: "Comunicação", path: "/comunicacao", badge: "NOVO" },
    ],
  },
  {
    label: "Turmas e alunos",
    items: [
      { Illustration: IllPeople,      label: "Minhas Turmas", path: "/professor" },
      { Illustration: IllClipboard,   label: "Atividades",    path: "/atividades" },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { Illustration: IllLightbulb,   label: "Criador de Conteúdo", path: "/professor" },
      { Illustration: IllExamSheet,   label: "Gerador de Provas",   path: "/professor" },
      { Illustration: IllFolderStack, label: "Meus Conteúdos",    path: "/meus-conteudos", badge: "NOVO" },
      { Illustration: IllBarsSoft,    label: "Relatórios",        path: "/professor" },
    ],
  },
];

const ESCOLA_NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Gestão",
    items: [
      { Illustration: IllBuilding,    label: "Dashboard Institucional", path: "/instituicao" },
      { Illustration: IllPeople,      label: "Professores e turmas",    path: "/instituicao" },
      { Illustration: IllBarsSoft,    label: "Relatórios avançados",    path: "/instituicao" },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { Illustration: IllChatWave,    label: "Orquestrador", path: "/comunicacao", badge: "NOVO" },
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
    { Illustration: IllStudyPlan,  label: "Plano",      path: "/app" },
    { Illustration: IllTargetExam,   label: "Simulado",   path: "/simulado-enem" },
    { Illustration: IllBarsSoft,     label: "Dashboard",  path: "/dashboard" },
    { Illustration: IllPodium,       label: "Ranking",    path: "/ranking" },
    { Illustration: IllStudyRoom,    label: "Estudar",    path: "/sala-estudos" },
  ],
  professor: [
    { Illustration: IllBarsSoft,     label: "Dashboard",  path: "/professor" },
    { Illustration: IllPeople,       label: "Turmas",     path: "/professor" },
    { Illustration: IllNotebookStack, label: "Notebook",   path: "/notebook" },
    { Illustration: IllChatWave,     label: "Comunicar",  path: "/comunicacao" },
  ],
  escola: [
    { Illustration: IllBuilding,   label: "Gestão",     path: "/instituicao" },
    { Illustration: IllPeople,       label: "Turmas",     path: "/instituicao" },
    { Illustration: IllBarsSoft,     label: "Relatórios", path: "/instituicao" },
    { Illustration: IllChatWave,     label: "Comunicar",  path: "/comunicacao" },
  ],
};

function NavArtIcon({ Illustration, compact }: { Illustration: NavItem["Illustration"]; compact?: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-violet-100/65 ring-1 ring-violet-200/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
        compact ? "h-7 w-7" : "h-9 w-9",
      )}
    >
      <Illustration className={cn(compact ? "size-3.5" : "size-4")} />
    </span>
  );
}

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
          "flex w-full max-w-full items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all",
          "border border-violet-200/55 bg-white/70 shadow-sm shadow-violet-200/20 backdrop-blur-xl hover:border-violet-300/70 hover:bg-white/90",
        )}
      >
        <span>{current.emoji}</span>
        <span className={current.color}>Modo: {current.label}</span>
        <ChevronDown className={cn("w-3 h-3 text-violet-400 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 z-50 mt-1.5 w-56 overflow-hidden rounded-2xl border border-violet-100/70 bg-white/88 py-1.5 shadow-xl shadow-violet-300/25 backdrop-blur-2xl"
          >
            {(Object.entries(MODE_CONFIG) as [AppMode, typeof MODE_CONFIG[AppMode]][]).map(([m, cfg]) => (
              <button
                key={m}
                type="button"
                onClick={() => handleSelect(m)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-violet-50/80",
                  mode === m && "bg-violet-100/60",
                )}
              >
                <span className="text-xl flex-shrink-0">{cfg.emoji}</span>
                <div>
                  <p className={cn("text-sm font-black", mode === m ? cfg.color : "text-purple-900/85")}>{cfg.label}</p>
                  <p className="text-[10px] leading-snug text-violet-500/85">{cfg.description}</p>
                </div>
                {mode === m && <span className="ml-auto mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-violet-600 shadow-[0_0_10px_rgba(124,58,237,0.55)]" />}
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
    <div className="border-b border-violet-100/70 bg-white/40 p-3 backdrop-blur-md">
      <p className="mb-2 px-2 text-xs font-black uppercase tracking-widest text-violet-400/95">Modo atual</p>
      <div className="space-y-1">
        {(Object.entries(MODE_CONFIG) as [AppMode, typeof MODE_CONFIG[AppMode]][]).map(([m, cfg]) => (
          <button key={m} type="button"
            onClick={() => { setMode(m); onSelect(m); }}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
              mode === m ? "bg-violet-100/90 font-bold text-purple-950 ring-1 ring-violet-200/55" : "text-purple-900/75 hover:bg-violet-50/85",
            )}
          >
            <span className="text-lg">{cfg.emoji}</span>
            {cfg.label}
            {mode === m && <span className="ml-auto h-2 w-2 rounded-full bg-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.55)]" />}
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
      <aside className="hidden md:fixed md:flex top-0 left-0 bottom-0 w-64 z-40 flex-col overflow-hidden border-r border-violet-200/45 bg-white/55 backdrop-blur-2xl shadow-[4px_0_40px_-14px_rgba(109,40,217,0.18)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-16 h-52 w-52 rounded-full bg-fuchsia-400/14 blur-3xl" />
          <div className="absolute bottom-24 -right-10 h-44 w-44 rounded-full bg-violet-500/12 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-300/10 blur-3xl" />
        </div>
        <div className="relative z-[1] border-b border-violet-100/60 bg-white/35 p-3 backdrop-blur-xl flex-shrink-0">
          <button type="button" onClick={() => handleNavigate("/app")} className="flex items-center gap-2.5 w-full rounded-xl p-1 hover:bg-violet-50/60 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 via-violet-600 to-purple-800 flex items-center justify-center text-white font-black text-sm shadow-md shadow-violet-300/40 ring-1 ring-white/25">S</div>
            <span className="font-black text-purple-950 text-base tracking-tight">StudyAI</span>
          </button>
          <div className="mt-3">
            <ModeSwitcher />
          </div>
        </div>

        <nav className="relative z-[1] flex-1 overflow-y-auto py-3 px-2 min-h-0">
          {navGroups.map(group => {
            const expanded = expandedGroups[group.label] ?? true;
            return (
              <div key={group.label} className="mb-2">
                <button
                  type="button"
                  onClick={() => toggleNavGroup(group.label)}
                  className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg text-[11px] font-black text-violet-400/95 uppercase tracking-wider hover:bg-violet-100/35 transition-colors text-left"
                >
                  <span className="truncate">{group.label}</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 flex-shrink-0 transition-transform text-violet-400/80", expanded && "rotate-180")} />
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
                            "w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-sm text-left transition-all",
                            isActive
                              ? "bg-violet-100/85 text-purple-950 font-bold shadow-sm ring-1 ring-violet-200/55"
                              : "text-purple-900/75 hover:bg-white/75 hover:text-purple-950 hover:ring-1 hover:ring-violet-100"
                          )}
                        >
                          <NavArtIcon Illustration={item.Illustration} />
                          <span className="truncate flex-1">{item.label}</span>
                          {item.badge && !isActive && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-fuchsia-100/90 text-fuchsia-800 ring-1 ring-fuchsia-200/50 flex-shrink-0">{item.badge}</span>
                          )}
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-violet-600 flex-shrink-0 shadow-[0_0_8px_rgba(124,58,237,0.65)]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="relative z-[1] border-t border-violet-100/65 bg-white/45 p-3 backdrop-blur-xl flex-shrink-0">
          <UserMenu />
        </div>
      </aside>

      {/* ── Mobile: top bar ── */}
      <div className="fixed top-0 left-0 right-0 z-40 border-b border-violet-100/80 bg-white/75 shadow-sm shadow-violet-200/20 backdrop-blur-2xl md:hidden">
        <div className="max-w-screen-2xl mx-auto px-3 py-2 flex items-center gap-2">

          {/* Logo */}
          <button type="button" onClick={() => handleNavigate("/app")} className="flex items-center gap-2 flex-shrink-0 mr-1">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-500 via-violet-600 to-purple-800 flex items-center justify-center text-white font-black text-xs shadow-sm shadow-violet-300/35">S</div>
            <span className="font-black text-purple-950 text-sm hidden sm:block">StudyAI</span>
          </button>

          {/* Mobile hamburger */}
          <button type="button" className="p-2 rounded-xl text-violet-600/80 hover:bg-violet-50 transition-colors" onClick={() => setMobileOpen(v => !v)}>
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
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0",
                    isActive ? "bg-violet-100/95 text-purple-900 ring-1 ring-violet-200/60 shadow-sm" : "bg-violet-50/50 text-violet-700/70 ring-1 ring-transparent hover:bg-violet-100/60"
                  )}
                >
                  <NavArtIcon Illustration={link.Illustration} compact />
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
            className="fixed inset-0 z-30 bg-purple-950/35 backdrop-blur-md md:hidden"
            onClick={() => setMobileOpen(false)}>
            <motion.div
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 bottom-0 w-72 overflow-y-auto border-r border-violet-100/70 bg-white/88 shadow-2xl shadow-violet-300/25 backdrop-blur-2xl"
              onClick={e => e.stopPropagation()}>

              <div className="flex items-center justify-between border-b border-violet-100/70 bg-white/50 p-4 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 via-violet-600 to-purple-800 flex items-center justify-center text-white font-black text-sm shadow-md shadow-violet-300/35">S</div>
                  <span className="font-black text-purple-950">StudyAI</span>
                </div>
                <button type="button" onClick={() => setMobileOpen(false)} className="p-2 rounded-xl text-violet-400 hover:bg-violet-50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode switcher mobile */}
              <MobileModeSection mode={mode} onSelect={(m) => { navigate(MODE_CONFIG[m].defaultPath); setMobileOpen(false); }} />

              <div className="p-3 space-y-4">
                {navGroups.map(group => (
                  <div key={group.label}>
                    <p className="text-xs font-black text-violet-400/95 uppercase tracking-widest px-2 mb-2">{group.label}</p>
                    <div className="space-y-0.5">
                      {group.items.map(item => {
                        const isActive = currentPath === item.path || currentPath.startsWith(item.path + "/");
                        return (
                          <button key={item.path + item.label} type="button" onClick={() => handleNavigate(item.path)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left",
                              isActive ? "bg-violet-100/90 text-purple-950 font-bold ring-1 ring-violet-200/60" : "text-purple-900/75 hover:bg-violet-50/80 hover:text-purple-950"
                            )}>
                            <NavArtIcon Illustration={item.Illustration} compact />
                            {item.label}
                            {item.badge && <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-800 ring-1 ring-fuchsia-200/50">{item.badge}</span>}
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
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-violet-100/80 bg-white/85 backdrop-blur-2xl md:hidden safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-1.5">
          {quickLinks.slice(0, 5).map(item => {
            const isActive = currentPath === item.path || (item.path !== "/" && currentPath.startsWith(item.path));
            return (
              <button key={item.path + item.label} type="button" onClick={() => handleNavigate(item.path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all min-w-[52px]",
                  isActive ? "bg-violet-100/70 ring-1 ring-violet-200/45" : "hover:bg-violet-50/70",
                )}
              >
                <NavArtIcon Illustration={item.Illustration} compact />
                <span className={cn("text-[10px] font-semibold transition-colors", isActive ? "text-purple-950" : "text-violet-500/75")}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
