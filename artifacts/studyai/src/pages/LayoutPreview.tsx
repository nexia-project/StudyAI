/**
 * LayoutPreview — proposta de redesign do /app
 *
 * Visão: Tiagão como co-pilot conversacional central. Menus tradicionais
 * existem mas viram trilho secundário. Aesthetic: limpo, simples, funcional.
 *
 * Acessível em /app/preview-layout — NÃO substitui Home.tsx.
 * Toda interatividade é mock (onClick noop) — é um preview visual.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/react";
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
} from "lucide-react";
import { TiagaoCharacter } from "@/components/TiagaoCharacter";

/* ─── Dados estáticos do mockup ──────────────────────────── */
type Suggestion = { label: string; icon: typeof Sparkles; tone: string };

const SUGGESTIONS: Suggestion[] = [
  { label: "Criar plano de estudos", icon: ListChecks, tone: "violet" },
  { label: "Fazer um simulado ENEM", icon: GraduationCap, tone: "fuchsia" },
  { label: "Tirar dúvida de matemática", icon: Sparkles, tone: "indigo" },
  { label: "Corrigir minha redação", icon: NotebookPen, tone: "pink" },
];

type RailCard = {
  title: string;
  subtitle: string;
  banner: string;
  accent: string;
  icon: typeof Sparkles;
};

const RAIL: RailCard[] = [
  {
    title: "Criar Plano",
    subtitle: "A partir do seu material",
    banner: "/banners/plano-estudos-hero.png",
    accent: "from-violet-500 to-fuchsia-500",
    icon: ListChecks,
  },
  {
    title: "Simulado ENEM",
    subtitle: "Treino oficial cronometrado",
    banner: "/banners/simulado-enem-hero.png",
    accent: "from-fuchsia-500 to-pink-500",
    icon: GraduationCap,
  },
  {
    title: "Cronograma",
    subtitle: "Sua rotina semanal",
    banner: "/banners/cronograma-hero.png",
    accent: "from-indigo-500 to-violet-500",
    icon: CalendarDays,
  },
  {
    title: "Notebook RAG",
    subtitle: "Estude com seus PDFs",
    banner: "/banners/notebook-rag-hero.png",
    accent: "from-cyan-500 to-indigo-500",
    icon: BookOpen,
  },
  {
    title: "Professor Tiagão",
    subtitle: "Aula completa por voz",
    banner: "/banners/professor-tiagao-hero.png",
    accent: "from-pink-500 to-violet-600",
    icon: MessageCircle,
  },
];

const TONE_CLASSES: Record<string, string> = {
  violet:
    "border-violet-200/70 bg-violet-50/60 text-violet-700 hover:bg-violet-100 hover:border-violet-300",
  fuchsia:
    "border-fuchsia-200/70 bg-fuchsia-50/60 text-fuchsia-700 hover:bg-fuchsia-100 hover:border-fuchsia-300",
  indigo:
    "border-indigo-200/70 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300",
  pink:
    "border-pink-200/70 bg-pink-50/60 text-pink-700 hover:bg-pink-100 hover:border-pink-300",
};

/* ─── Página ─────────────────────────────────────────────── */
export default function LayoutPreview() {
  const { user } = useUser();
  const [draft, setDraft] = useState("");

  const firstName =
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Estudante";

  const initials = (firstName.slice(0, 2) || "ST").toUpperCase();

  const noop = () => {
    /* mock — sem ação no preview */
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-violet-50/70 via-white to-fuchsia-50/40">
      {/* ── Background decorativo ─────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
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

      {/* ── Top bar slim ───────────────────────────────────── */}
      <header className="sticky top-0 z-30 h-14 border-b border-violet-100/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <a
            href="/app"
            className="flex items-center gap-2.5 group"
            onClick={(e) => e.preventDefault()}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md shadow-violet-500/30 transition group-hover:scale-105">
              <span className="font-black text-white text-lg leading-none">S</span>
            </div>
            <span className="font-black text-slate-900 text-lg tracking-tight">
              Study<span className="text-violet-600">.IA</span>
            </span>
          </a>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-3 py-1 text-xs font-bold text-amber-700">
              <Flame className="h-3.5 w-3.5" /> 7 dias
            </span>
            <button
              type="button"
              onClick={noop}
              className="flex items-center gap-2 rounded-2xl border border-violet-200/70 bg-white px-2.5 py-1.5 shadow-sm transition hover:border-violet-300 hover:shadow-md"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white font-bold text-xs">
                {initials}
              </div>
              <span className="hidden text-sm font-semibold text-slate-700 sm:inline">
                {firstName}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Disclaimer de preview ──────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-white/80 px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm shadow-violet-100 backdrop-blur">
          <span aria-hidden>🎨</span>
          Preview de layout — feedback bem-vindo
        </div>
      </div>

      <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pb-32 pt-6 sm:px-6 lg:gap-12 lg:pt-10">
        {/* ── Hero / Tiagão central ───────────────────────── */}
        <section className="relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative overflow-hidden rounded-[2rem] border border-violet-200/60 bg-white/70 p-6 shadow-xl shadow-violet-300/40 backdrop-blur-2xl sm:p-10 lg:p-14"
          >
            {/* Glow interno */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-0"
            >
              <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-400/20 blur-3xl" />
              <div className="absolute -bottom-20 right-1/4 h-60 w-60 rounded-full bg-fuchsia-400/20 blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-6 text-center lg:gap-8">
              {/* Tiagão */}
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5, ease: "backOut" }}
              >
                <TiagaoCharacter state="idle" size={160} showLabel={false} />
              </motion.div>

              {/* Greeting */}
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
                  Fale ou digite com o Tiagão. Ele entende seu objetivo, monta o
                  plano, abre o simulado, corrige redação — tudo em uma conversa.
                </p>
              </div>

              {/* Input premium */}
              <div className="w-full max-w-3xl">
                <div className="group relative rounded-3xl border-2 border-violet-200/70 bg-white shadow-2xl shadow-violet-300/40 transition focus-within:border-violet-400 focus-within:shadow-violet-400/40">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Pergunte ao Tiagão… ex: 'monta um plano de 30 dias pro ENEM focado em exatas'"
                    rows={2}
                    className="block w-full resize-none rounded-3xl bg-transparent px-5 pt-5 pb-2 text-[15px] leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none sm:text-base"
                  />
                  <div className="flex items-center justify-between gap-2 px-3 pb-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={noop}
                        title="Anexar arquivo"
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-violet-50 hover:text-violet-600"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={noop}
                        title="Mais opções"
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-violet-50 hover:text-violet-600"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={noop}
                        title="Falar com o Tiagão"
                        className="group/mic relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600 shadow-sm transition hover:scale-105 hover:from-violet-200 hover:to-fuchsia-200"
                      >
                        <span className="absolute inset-0 rounded-2xl border border-violet-300/50" />
                        <Mic className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={noop}
                        title="Enviar"
                        className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 font-bold text-white shadow-lg shadow-violet-500/40 transition hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/50 active:scale-100"
                      >
                        <span className="hidden text-sm sm:inline">Enviar</span>
                        <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Chips */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <motion.button
                      key={s.label}
                      type="button"
                      onClick={noop}
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

        {/* ── Secondary rail (menus) ──────────────────────── */}
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
              onClick={noop}
              className="hidden items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700 sm:flex"
            >
              Ver tudo <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {RAIL.map((c, i) => (
              <motion.button
                key={c.title}
                type="button"
                onClick={noop}
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

        {/* ── Continue + stats ─────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
              De onde você parou
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr,1fr,1fr,1fr]">
            {/* Continue card */}
            <motion.button
              type="button"
              onClick={noop}
              whileHover={{ y: -2 }}
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-white to-violet-50/40 p-4 text-left shadow-md shadow-violet-200/30 transition hover:shadow-lg"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-violet-500">
                  Continue de onde parou
                </p>
                <p className="truncate text-sm font-black text-slate-900">
                  Plano ENEM — Dia 4: Funções Quadráticas
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-violet-100">
                    <div className="h-full w-[38%] rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    38%
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-violet-400 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
            </motion.button>

            {/* Stat chips */}
            <StatChip
              icon={Flame}
              label="Streak"
              value="7 dias"
              tone="from-orange-400 to-rose-500"
            />
            <StatChip
              icon={Trophy}
              label="XP da semana"
              value="1.240"
              tone="from-amber-400 to-yellow-500"
            />
            <StatChip
              icon={Clock}
              label="Próxima revisão"
              value="hoje, 19h"
              tone="from-violet-500 to-indigo-500"
            />
          </div>
        </section>

        {/* ── Voltar link ──────────────────────────────────── */}
        <div className="pt-4 text-center">
          <a
            href="/app"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-violet-700"
          >
            ← Voltar ao layout atual
          </a>
        </div>
      </main>

      {/* ── Floating voice button ──────────────────────────── */}
      <FloatingVoiceButton onClick={noop} />
    </div>
  );
}

/* ─── Stat chip ─────────────────────────────────────────── */
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

/* ─── Floating voice CTA ─────────────────────────────────── */
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
