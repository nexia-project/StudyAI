/**
 * Home — tela principal do app (/app)
 *
 * Tiagão como co-pilot central conversacional. Input grande + chips de intenção,
 * trilho secundário de 5 ferramentas, "continue de onde parou" + stats no rodapé.
 *
 * Design aprovado a partir de /app/preview-layout — agora 100% funcional:
 *   - Hero input + mic + botão flutuante => abrem VoiceProfessor (Tiagão) via
 *     eventos `studyai:open-voice` / `studyai:ask-tiagao` (ver VoiceProfessor.tsx).
 *   - Chips e cards do trilho disparam intents reais (criar_plano, navegação).
 *   - "Continue de onde parou" lê /api/history e reabre o plano via
 *     localStorage `studyai_restore_plan` (mesmo contrato do HomeLegacy).
 *   - Streak/XP vêm de /api/streak e /api/ranking.
 *   - Versão anterior do dashboard permanece disponível em /app/legacy.
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  ArrowUp,
  Sparkles,
  CalendarDays,
  BookOpen,
  GraduationCap,
  NotebookPen,
  ListChecks,
  Flame,
  Trophy,
  Clock,
  ChevronRight,
  MessageCircle,
  Paperclip,
  Plus,
  Headphones,
  History,
  PlayCircle,
} from "lucide-react";
import { TiagaoCharacter } from "@/components/TiagaoCharacter";
import { UserMenu } from "@/components/UserMenu";
import { MainMenuDrawer } from "@/components/MainMenuDrawer";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import { triggerProfessorAction } from "@/lib/professor-events";

// Reconstrói o texto-conteúdo do plano (mesma rotina de HomeLegacy/History) —
// usada pra alimentar o passo "result" quando reabrimos um plano salvo.
function buildConteudoTextoFromPlan(plan: unknown): string {
  const p = (plan ?? {}) as {
    resumoDoConteudo?: string;
    dias?: Array<{
      titulo?: string;
      numero?: number;
      topicos?: Array<{
        nome?: string;
        explicacao?: string;
        exercicio?: { pergunta?: string; resposta?: string };
      }>;
    }>;
  };
  const parts: string[] = [];
  if (p.resumoDoConteudo) parts.push(p.resumoDoConteudo);
  if (Array.isArray(p.dias)) {
    for (const dia of p.dias) {
      let s = `=== ${dia.titulo || `Dia ${dia.numero}`} ===`;
      if (Array.isArray(dia.topicos)) {
        for (const t of dia.topicos) {
          if (t?.nome) s += `\n- ${t.nome}`;
          if (t?.explicacao) s += `\n  ${t.explicacao}`;
          if (t?.exercicio?.pergunta) s += `\n  Q: ${t.exercicio.pergunta}`;
          if (t?.exercicio?.resposta) s += `\n  R: ${t.exercicio.resposta}`;
        }
      }
      parts.push(s);
    }
  }
  return parts.join("\n\n").slice(0, 8000);
}

// ─── Dispatch helpers ─────────────────────────────────────────────────────────
function openTiagao() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("studyai:open-voice"));
}

function askTiagao(text: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("studyai:ask-tiagao", { detail: { text } }),
  );
}

// ─── Suggestion chips ─────────────────────────────────────────────────────────
type Suggestion = {
  key: string;
  label: string;
  icon: typeof Sparkles;
  tone: "violet" | "fuchsia" | "indigo" | "pink";
  /** Disparado quando o usuário clica no chip. */
  action: (nav: (to: string) => void) => void;
};

const TONE_CLASSES: Record<Suggestion["tone"], string> = {
  violet:
    "border-violet-200/70 bg-violet-50/60 text-violet-700 hover:bg-violet-100 hover:border-violet-300",
  fuchsia:
    "border-fuchsia-200/70 bg-fuchsia-50/60 text-fuchsia-700 hover:bg-fuchsia-100 hover:border-fuchsia-300",
  indigo:
    "border-indigo-200/70 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300",
  pink:
    "border-pink-200/70 bg-pink-50/60 text-pink-700 hover:bg-pink-100 hover:border-pink-300",
};

const SUGGESTIONS: Suggestion[] = [
  {
    key: "plano",
    label: "Criar plano de estudos",
    icon: ListChecks,
    tone: "violet",
    action: (nav) => {
      // Plan-builder UI vive no HomeLegacy — abrimos o Tiagão (que sabe gerar
      // planos por conversa) e, em paralelo, navegamos pro builder clássico via
      // deep-link `?criar=1` para quem prefere preencher o formulário.
      triggerProfessorAction("criar_plano", "");
      askTiagao(
        "Quero montar um plano de estudos. Pode me ajudar a definir o tema, os dias e o tempo disponível?",
      );
      nav("/app/legacy?criar=1");
    },
  },
  {
    key: "simulado",
    label: "Fazer um simulado ENEM",
    icon: GraduationCap,
    tone: "fuchsia",
    action: (nav) => nav("/simulado-enem"),
  },
  {
    key: "duvida-mat",
    label: "Tirar dúvida de matemática",
    icon: Sparkles,
    tone: "indigo",
    action: () =>
      askTiagao("Tô com uma dúvida de matemática, pode me ajudar?"),
  },
  {
    key: "redacao",
    label: "Corrigir minha redação",
    icon: NotebookPen,
    tone: "pink",
    action: (nav) => nav("/redacao"),
  },
];

// ─── Rail cards ───────────────────────────────────────────────────────────────
type RailCard = {
  key: string;
  title: string;
  subtitle: string;
  banner: string;
  accent: string;
  icon: typeof Sparkles;
  action: (nav: (to: string) => void) => void;
};

const RAIL: RailCard[] = [
  {
    key: "plano",
    title: "Criar Plano",
    subtitle: "A partir do seu material",
    banner: "/banners/plano-estudos-hero.png",
    accent: "from-violet-500 to-fuchsia-500",
    icon: ListChecks,
    action: (nav) => {
      // Mesma intent que o chip — abre Tiagão + builder clássico.
      triggerProfessorAction("criar_plano", "");
      nav("/app/legacy?criar=1");
    },
  },
  {
    key: "simulado",
    title: "Simulado ENEM",
    subtitle: "Treino oficial cronometrado",
    banner: "/banners/simulado-enem-hero.png",
    accent: "from-fuchsia-500 to-pink-500",
    icon: GraduationCap,
    action: (nav) => nav("/simulado-enem"),
  },
  {
    key: "cronograma",
    title: "Cronograma",
    subtitle: "Sua rotina semanal",
    banner: "/banners/cronograma-hero.png",
    accent: "from-indigo-500 to-violet-500",
    icon: CalendarDays,
    action: (nav) => nav("/cronograma"),
  },
  {
    key: "notebook",
    title: "Notebook RAG",
    subtitle: "Estude com seus PDFs",
    banner: "/banners/notebook-rag-hero.png",
    accent: "from-cyan-500 to-indigo-500",
    icon: BookOpen,
    action: (nav) => nav("/notebook"),
  },
  {
    key: "tiagao",
    title: "Professor Tiagão",
    subtitle: "Aula completa por voz",
    banner: "/banners/professor-tiagao-hero.png",
    accent: "from-pink-500 to-violet-600",
    icon: MessageCircle,
    action: () => openTiagao(),
  },
];

// ─── Tipos auxiliares ─────────────────────────────────────────────────────────
type RecentPlan = {
  id: string;
  materia: string;
  plan: {
    aluno?: string;
    materia?: string;
    emoji?: string;
    cor?: string;
    dias?: unknown[];
    resumoDoConteudo?: string;
  } & Record<string, unknown>;
  createdAt: string;
};

type Stats = {
  streak: number | null;
  xp: number | null;
};

// ─── Página ───────────────────────────────────────────────────────────────────
export default function Home() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { profile } = useStudentProfile();

  const [draft, setDraft] = useState("");
  const [recentPlans, setRecentPlans] = useState<RecentPlan[]>([]);
  const [stats, setStats] = useState<Stats>({ streak: null, xp: null });
  const [tiagaoSize, setTiagaoSize] = useState<number>(160);

  // Mobile: avatar do Tiagão menor para não dominar a tela.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setTiagaoSize(mq.matches ? 120 : 160);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // ── Stats (streak + xp) ─────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let aborted = false;
    (async () => {
      try {
        const [streakRes, rankRes] = await Promise.all([
          fetch("/api/streak", { credentials: "include" }),
          fetch("/api/ranking", { credentials: "include" }),
        ]);
        const streakJson = streakRes.ok ? await streakRes.json() : {};
        const rankJson = rankRes.ok ? await rankRes.json() : {};
        if (aborted) return;
        setStats({
          streak:
            typeof streakJson?.currentStreak === "number"
              ? streakJson.currentStreak
              : null,
          xp:
            typeof rankJson?.currentUser?.xp === "number"
              ? rankJson.currentUser.xp
              : null,
        });
      } catch {
        // silent — stats are best-effort
      }
    })();
    return () => { aborted = true; };
  }, [isAuthenticated, authLoading]);

  // ── Histórico recente para "Continue de onde parou" ─────────────────────────
  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setRecentPlans([]);
      return;
    }
    let aborted = false;
    fetch("/api/history", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (aborted) return;
        if (Array.isArray(d?.plans)) {
          setRecentPlans(d.plans.slice(0, 3) as RecentPlan[]);
        }
      })
      .catch(() => {});
    return () => { aborted = true; };
  }, [isAuthenticated, authLoading]);

  // ── Greeting ────────────────────────────────────────────────────────────────
  const firstName = useMemo(() => {
    const raw = profile?.nome?.trim();
    if (raw && raw !== "Herói" && raw !== "Estudante") {
      return raw.split(" ")[0] || raw;
    }
    return "aluno";
  }, [profile?.nome]);

  const resumeTarget = recentPlans[0] ?? null;

  // ── Handlers ────────────────────────────────────────────────────────────────
  // Send / Enter → abre o Tiagão com o texto digitado.
  function submitDraft() {
    const text = draft.trim();
    if (!text) return;
    askTiagao(text);
    setDraft("");
  }

  const onHeroKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitDraft();
    }
  };

  const handleResume = (plan: RecentPlan["plan"]) => {
    // Mesmo contrato usado pelo History.tsx → HomeLegacy.tsx restaura o plano
    // a partir desse storage e abre o passo "result" automaticamente.
    try {
      const conteudoTexto = buildConteudoTextoFromPlan(plan);
      localStorage.setItem(
        "studyai_restore_plan",
        JSON.stringify({ plano: plan, conteudoTexto }),
      );
    } catch {
      // ignore — quota / private mode
    }
    navigate("/app/legacy");
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-violet-50/70 via-white to-fuchsia-50/40">
      {/* ── Background decorativo ─────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-violet-300/30 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 h-[26rem] w-[26rem] rounded-full bg-fuchsia-300/25 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full bg-indigo-200/30 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(rgba(0,0,0,0.7) 1px, transparent 1px)",
            backgroundSize: "3px 3px",
          }}
        />
      </div>

      {/* ── Top bar slim ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 h-14 border-b border-violet-100/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <MainMenuDrawer />
            <button
              type="button"
              onClick={() => navigate("/app")}
              className="flex items-center gap-2 group"
              aria-label="Início"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-500 via-violet-600 to-purple-800 flex items-center justify-center text-white font-black text-xs shadow-md shadow-violet-300/40 ring-1 ring-white/25">S</div>
              <span className="font-black text-slate-800 text-sm tracking-tight hidden sm:block">StudyAI</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {typeof stats.streak === "number" && stats.streak > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-3 py-1 text-xs font-bold text-amber-700">
                <Flame className="h-3.5 w-3.5" />
                {stats.streak} {stats.streak === 1 ? "dia" : "dias"}
              </span>
            )}
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pb-32 pt-6 sm:px-6 lg:gap-12 lg:pt-10">
        {/* ── Hero / Tiagão central ─────────────────────────────────────── */}
        <section className="relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative overflow-hidden rounded-[2rem] border border-violet-200/60 bg-white/70 p-6 shadow-xl shadow-violet-300/40 backdrop-blur-2xl sm:p-10 lg:p-14"
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
              <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-400/20 blur-3xl" />
              <div className="absolute -bottom-20 right-1/4 h-60 w-60 rounded-full bg-fuchsia-400/20 blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-6 text-center lg:gap-8">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5, ease: "backOut" }}
              >
                <TiagaoCharacter state="idle" size={tiagaoSize} showLabel={false} />
              </motion.div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-500">
                  Seu co-pilot de estudos
                </p>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                  Oi, {firstName}!{" "}
                  <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-purple-700 bg-clip-text text-transparent">
                    O que vamos estudar hoje?
                  </span>
                </h1>
                <p className="mx-auto max-w-xl text-sm text-slate-500 sm:text-base">
                  Digite sua dúvida ou peça um plano — o Tiagão responde por
                  voz e texto. Ou use os atalhos abaixo para ir direto a uma
                  ferramenta.
                </p>
              </div>

              {/* Input premium */}
              <div className="w-full max-w-3xl">
                <form
                  onSubmit={(e) => { e.preventDefault(); submitDraft(); }}
                  className="group relative rounded-3xl border-2 border-violet-200/70 bg-white shadow-2xl shadow-violet-300/40 transition focus-within:border-violet-400 focus-within:shadow-violet-400/40"
                >
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onHeroKeyDown}
                    placeholder="Pergunte ao Tiagão… ex: 'explica fotossíntese' ou 'cria um plano de Matemática'"
                    rows={2}
                    aria-label="Perguntar ao Tiagão"
                    className="block w-full resize-none rounded-3xl bg-transparent px-5 pt-5 pb-2 text-[15px] leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none sm:text-base"
                  />
                  <div className="flex items-center justify-between gap-2 px-3 pb-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => navigate("/historico")}
                        title="Histórico de planos"
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-violet-50 hover:text-violet-600"
                      >
                        <History className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openTiagao()}
                        title="Subir arquivo para o Tiagão"
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-violet-50 hover:text-violet-600"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openTiagao()}
                        title="Falar com o Tiagão"
                        className="group/mic relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600 shadow-sm transition hover:scale-105 hover:from-violet-200 hover:to-fuchsia-200"
                      >
                        <span className="absolute inset-0 rounded-2xl border border-violet-300/50" />
                        <Mic className="h-4 w-4" />
                      </button>
                      <button
                        type="submit"
                        disabled={!draft.trim()}
                        title="Enviar para o Tiagão"
                        className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 font-bold text-white shadow-lg shadow-violet-500/40 transition hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/50 active:scale-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                      >
                        <span className="hidden text-sm sm:inline">Enviar</span>
                        <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </form>

                {/* Chips */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <motion.button
                      key={s.key}
                      type="button"
                      onClick={() => s.action(navigate)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className={`inline-flex items-center gap-2 rounded-full border bg-white/80 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur transition ${TONE_CLASSES[s.tone]}`}
                    >
                      <s.icon className="h-4 w-4" />
                      {s.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Secondary rail ────────────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Acesso direto
              </p>
              <h2 className="text-lg font-black text-slate-800 sm:text-xl">
                Ou pule direto para uma ferramenta
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/historico")}
              className="hidden items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700 sm:flex"
            >
              Ver histórico <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {RAIL.map((c, i) => (
              <motion.button
                key={c.key}
                type="button"
                onClick={() => c.action(navigate)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.35, ease: "easeOut" }}
                whileHover={{ y: -4 }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-violet-200/60 bg-white/80 p-3 text-left shadow-md shadow-violet-200/40 backdrop-blur transition hover:scale-[1.02] hover:border-violet-300 hover:shadow-xl hover:shadow-violet-300/40"
              >
                <div className="relative mb-2.5 h-20 w-full overflow-hidden rounded-xl bg-slate-100">
                  <img
                    src={c.banner}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  <div
                    className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${c.accent} text-white shadow-lg`}
                  >
                    <c.icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-black leading-tight text-slate-900">
                    {c.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                    {c.subtitle}
                  </p>
                </div>
                <span className="pointer-events-none absolute inset-x-3 bottom-2 h-px origin-left scale-x-0 bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-transform duration-300 group-hover:scale-x-100" />
              </motion.button>
            ))}
          </div>
        </section>

        {/* ── Continue + stats ──────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
              De onde você parou
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr,1fr,1fr,1fr]">
            <ResumeCard plan={resumeTarget} onResume={handleResume} onNavigate={navigate} />

            <StatChip
              icon={Flame}
              label="Streak"
              value={
                stats.streak == null
                  ? "—"
                  : `${stats.streak} ${stats.streak === 1 ? "dia" : "dias"}`
              }
              tone="from-orange-400 to-rose-500"
            />
            <StatChip
              icon={Trophy}
              label="XP total"
              value={
                stats.xp == null ? "—" : stats.xp.toLocaleString("pt-BR")
              }
              tone="from-amber-400 to-yellow-500"
            />
            <StatChip
              icon={Clock}
              label="Próxima sessão"
              value={resumeTarget ? "Continuar agora" : "Quando quiser"}
              tone="from-violet-500 to-indigo-500"
            />
          </div>
        </section>
      </main>

      {/* ── Floating voice button ─────────────────────────────────────────── */}
      <FloatingVoiceButton onClick={() => openTiagao()} />
    </div>
  );
}

// ─── Resume card ──────────────────────────────────────────────────────────────
function ResumeCard({
  plan,
  onResume,
  onNavigate,
}: {
  plan: RecentPlan | null;
  onResume: (plan: RecentPlan["plan"]) => void;
  onNavigate: (to: string) => void;
}) {
  if (!plan) {
    return (
      <div className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-dashed border-violet-200 bg-white/60 p-4 text-left shadow-sm">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
          <BookOpen className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-violet-400">
            Continue de onde parou
          </p>
          <p className="text-sm font-bold text-slate-700">
            Você ainda não começou nenhuma trilha
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Escolha um caminho acima ou peça um plano ao Tiagão.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("/app/legacy?criar=1")}
          className="hidden shrink-0 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700 sm:inline-flex"
        >
          Criar plano
        </button>
      </div>
    );
  }

  const dias = Array.isArray(plan.plan?.dias) ? plan.plan.dias.length : 0;
  const emoji = (plan.plan?.emoji as string) || "📚";
  const cor = (plan.plan?.cor as string) || "#8B5CF6";

  return (
    <motion.button
      type="button"
      onClick={() => onResume(plan.plan)}
      whileHover={{ y: -2 }}
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-white to-violet-50/40 p-4 text-left shadow-md shadow-violet-200/30 transition hover:shadow-lg"
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl shadow-lg"
        style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}
      >
        <span aria-hidden>{emoji}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-violet-500">
          Continue de onde parou
        </p>
        <p className="truncate text-sm font-black text-slate-900">
          {plan.materia || "Plano salvo"}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
          <PlayCircle className="h-3 w-3" />
          {dias > 0 ? `${dias} dia${dias !== 1 ? "s" : ""} no plano` : "Retomar agora"}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-violet-400 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
    </motion.button>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-violet-200/60 bg-white/70 p-4 shadow-sm shadow-violet-200/20 backdrop-blur transition hover:border-violet-300 hover:shadow-md">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-md`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="truncate text-sm font-black text-slate-800">{value}</p>
      </div>
    </div>
  );
}

// ─── Floating voice CTA ───────────────────────────────────────────────────────
function FloatingVoiceButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.4, ease: "backOut" }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-4 shadow-2xl shadow-violet-500/50 sm:bottom-8 sm:right-8"
      title="Abrir chat por voz com o Tiagão"
      aria-label="Abrir Tiagão"
    >
      <motion.span
        animate={{ scale: [1, 1.4, 1], opacity: [0.55, 0, 0.55] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
        className="absolute inset-0 -z-10 rounded-full bg-violet-500"
      />
      <Headphones className="h-5 w-5 text-white" strokeWidth={2.5} />
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden whitespace-nowrap pr-1 text-sm font-bold text-white"
          >
            Falar com o Tiagão
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
