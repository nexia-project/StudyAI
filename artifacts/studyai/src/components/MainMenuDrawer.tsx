/**
 * MainMenuDrawer — menu hamburger no canto superior esquerdo do /app.
 *
 * Recolhido por padrão: aparece só o ícone ≡ pronto pra clicar. Ao abrir,
 * desliza um drawer lateral (shadcn Sheet) com todos os recursos do Study.IA
 * agrupados por contexto (Estudo, Avaliação, Conhecimento, Conta).
 *
 * Acessibilidade vem de graça pelo Sheet (Esc fecha, focus-trap, outside-click,
 * portal); cada item é um <button> real com `focus-visible` ring.
 *
 * Rotas e eventos são validados contra App.tsx — itens cujo destino não existe
 * são simplesmente omitidos pra não quebrar nada quando rotas mudarem.
 */

import { type ComponentType, useCallback, useState } from "react";
import { useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import {
  Menu,
  ListChecks,
  CalendarDays,
  Brain,
  Layers,
  GraduationCap,
  PenLine,
  Briefcase,
  BookOpen,
  MessageCircle,
  UserCircle,
  Sparkles,
  LogOut,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

type MenuAction =
  | { kind: "navigate"; to: string }
  | { kind: "event"; name: string; detail?: unknown };

type MenuItem = {
  key: string;
  label: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  action: MenuAction;
};

type MenuSection = {
  key: string;
  title: string;
  items: MenuItem[];
};

// Mantemos lista achatada e descritiva — fácil de auditar contra App.tsx.
const SECTIONS: MenuSection[] = [
  {
    key: "estudo",
    title: "Estudo",
    items: [
      {
        key: "plano",
        label: "Plano de estudos",
        description: "Monte ou retome seu plano",
        icon: ListChecks,
        // /app/legacy?criar=1 abre direto o builder clássico de plano,
        // mesmo destino usado pelo card "Criar Plano" do trilho.
        action: { kind: "navigate", to: "/app/legacy?criar=1" },
      },
      {
        key: "cronograma",
        label: "Cronograma",
        description: "Rotina semanal de estudos",
        icon: CalendarDays,
        action: { kind: "navigate", to: "/cronograma" },
      },
      {
        key: "mapa-mental",
        label: "Mapa mental",
        description: "Visualize conexões entre tópicos",
        icon: Brain,
        action: { kind: "navigate", to: "/mapa-mental" },
      },
      {
        key: "flashcards",
        label: "Flashcards",
        description: "Revisão espaçada",
        icon: Layers,
        action: { kind: "navigate", to: "/flashcards" },
      },
    ],
  },
  {
    key: "avaliacao",
    title: "Avaliação",
    items: [
      {
        key: "simulado-enem",
        label: "Simulado ENEM",
        description: "Treino oficial cronometrado",
        icon: GraduationCap,
        action: { kind: "navigate", to: "/simulado-enem" },
      },
      {
        key: "redacao",
        label: "Redação",
        description: "Envie e receba correção",
        icon: PenLine,
        action: { kind: "navigate", to: "/redacao" },
      },
      {
        key: "concursos",
        label: "Concursos",
        description: "OAB, Revalida, Enare",
        icon: Briefcase,
        action: { kind: "navigate", to: "/concursos" },
      },
    ],
  },
  {
    key: "conhecimento",
    title: "Conhecimento",
    items: [
      {
        key: "notebook",
        label: "Notebook RAG",
        description: "Estude com seus PDFs",
        icon: BookOpen,
        action: { kind: "navigate", to: "/notebook" },
      },
      {
        key: "tiagao",
        label: "Professor Tiagão",
        description: "Aula completa por voz",
        icon: MessageCircle,
        action: { kind: "event", name: "studyai:open-voice" },
      },
    ],
  },
  {
    key: "conta",
    title: "Conta",
    items: [
      {
        key: "perfil",
        label: "Configurações",
        description: "Perfil e preferências",
        icon: UserCircle,
        action: { kind: "navigate", to: "/perfil" },
      },
      {
        key: "premium",
        label: "Premium",
        description: "Conheça os planos",
        icon: Sparkles,
        action: { kind: "navigate", to: "/pricing" },
      },
    ],
  },
];

export function MainMenuDrawer() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { signOut } = useClerk();

  const runAction = useCallback(
    (action: MenuAction) => {
      // Fecha primeiro pra animação rodar suave; o setTimeout 0 evita que o
      // navigate dispare antes do Radix começar o exit-transition.
      setOpen(false);
      window.setTimeout(() => {
        if (action.kind === "navigate") {
          navigate(action.to);
        } else if (action.kind === "event") {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent(action.name, { detail: action.detail }));
          }
        }
      }, 0);
    },
    [navigate],
  );

  const handleSignOut = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => {
      void signOut(() => navigate("/"));
    }, 0);
  }, [navigate, signOut]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          <Menu className="h-5 w-5" strokeWidth={2.25} />
        </button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="flex w-72 flex-col gap-0 border-r border-slate-200 bg-white p-0 sm:w-80"
      >
        {/* Header — wordmark + tagline */}
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 pb-4 pt-6">
          <SheetTitle asChild>
            <div className="flex items-center">
              <Logo variant="horizontal" className="h-7 w-auto" />
            </div>
          </SheetTitle>
          <SheetDescription className="pl-1 text-xs text-slate-500">
            Seu co-pilot de estudos
          </SheetDescription>
        </div>

        {/* Lista de seções */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu principal">
          {SECTIONS.map((section, i) => (
            <div key={section.key} className={cn(i > 0 && "mt-4 border-t border-slate-100 pt-4")}>
              <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {section.title}
              </p>
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => runAction(item.action)}
                      className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-violet-100 group-hover:text-violet-700">
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-slate-900">
                          {item.label}
                        </span>
                        {item.description && (
                          <span className="block truncate text-[11px] text-slate-500">
                            {item.description}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}

                {/* "Sair" mora dentro da seção Conta */}
                {section.key === "conta" && (
                  <li>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-rose-100 group-hover:text-rose-700">
                        <LogOut className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-rose-700">
                          Sair
                        </span>
                        <span className="block truncate text-[11px] text-slate-500">
                          Encerrar sessão
                        </span>
                      </span>
                    </button>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
          © Study.IA
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default MainMenuDrawer;
