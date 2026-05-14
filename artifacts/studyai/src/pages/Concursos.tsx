/**
 * Concursos — área de preparação pra concursos públicos / OAB / Revalida.
 *
 * Espelha o vocabulário visual do novo `Home.tsx` (gradientes violet/fuchsia,
 * rounded-3xl, slate). Funcionalidades:
 *   - Hero com busca livre + filtros (banca, área, ano).
 *   - Lista de questões em cards expansíveis com alternativas + gabarito +
 *     explicação.
 *   - "Pedir simulado pro Tiagão" → dispara intent + abre painel de voz.
 *   - Filtros colapsam em drawer em mobile.
 *
 * Backend: `/api/concursos/questoes` + `/api/concursos/stats` (rotas em
 * `routes/concursos.ts`).
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Filter,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  GraduationCap,
  Scale,
  Stethoscope,
  Trophy,
  Info,
} from "lucide-react";
import { triggerProfessorAction } from "@/lib/professor-events";

type Banca = "" | "CEBRASPE" | "FGV" | "VUNESP" | "FCC" | "OAB" | "OUTRO";
// Mantemos sincronizado com `ConcursoArea` em
// `api-server/src/lib/concursos/types.ts`. Adicionar área nova =
// atualizar nos dois lugares (e checar typecheck nos dois pacotes).
type Area =
  | ""
  | "DIREITO"
  | "PORTUGUES"
  | "MATEMATICA"
  | "RACIOCINIO_LOGICO"
  | "INFORMATICA"
  | "ATUALIDADES"
  | "LEGISLACAO"
  | "MEDICINA"
  | "ENFERMAGEM"
  | "FARMACIA"
  | "ODONTOLOGIA"
  | "FISIOTERAPIA"
  | "NUTRICAO"
  | "PSICOLOGIA"
  | "SERVICO_SOCIAL"
  | "BIOMEDICINA"
  | "OUTROS";

interface Alternativa {
  letra: string;
  texto: string;
  correta: boolean;
}

interface Questao {
  id: string;
  banca?: Banca;
  area?: Area;
  ano?: number;
  cargo?: string;
  enunciado: string;
  alternativas: Alternativa[];
  gabarito: string;
  explicacao?: string;
  fonte: string;
  fonteUrl?: string;
}

interface Stats {
  total: number;
  porBanca: Record<string, number>;
  porArea: Record<string, number>;
  anos: number[];
  fontes: { fonte: string; total: number }[];
}

interface ConcursosResponse {
  query: string | null;
  banca: string | null;
  area: string | null;
  ano: number | null;
  cargo: string | null;
  results: Questao[];
  total: number;
  stats: Stats;
}

const BANCAS: { value: Banca; label: string }[] = [
  { value: "", label: "Todas as bancas" },
  { value: "OAB", label: "OAB" },
  { value: "CEBRASPE", label: "CEBRASPE" },
  { value: "FGV", label: "FGV" },
  { value: "VUNESP", label: "VUNESP" },
  { value: "FCC", label: "FCC" },
  { value: "OUTRO", label: "Outras (Revalida, Enare…)" },
];

// Ordem: Direito primeiro (concursos gerais), Medicina em destaque (maior
// volume), depois demais especialidades de saúde alfabéticas, Outros por
// último. Tópicos clássicos de concursos (Português, Matemática, etc.)
// ficam após Medicina mas antes das outras áreas de saúde — ainda que o
// seed atual não tenha questões nelas, deixamos como placeholder pra quando
// integrarmos CEBRASPE/FGV/etc.
const AREAS: { value: Area; label: string }[] = [
  { value: "", label: "Todas as áreas" },
  { value: "DIREITO", label: "Direito" },
  { value: "MEDICINA", label: "Medicina" },
  { value: "PORTUGUES", label: "Português" },
  { value: "MATEMATICA", label: "Matemática" },
  { value: "RACIOCINIO_LOGICO", label: "Raciocínio Lógico" },
  { value: "INFORMATICA", label: "Informática" },
  { value: "ATUALIDADES", label: "Atualidades" },
  { value: "LEGISLACAO", label: "Legislação" },
  { value: "ENFERMAGEM", label: "Enfermagem" },
  { value: "FARMACIA", label: "Farmácia" },
  { value: "ODONTOLOGIA", label: "Odontologia" },
  { value: "FISIOTERAPIA", label: "Fisioterapia" },
  { value: "NUTRICAO", label: "Nutrição" },
  { value: "PSICOLOGIA", label: "Psicologia" },
  { value: "SERVICO_SOCIAL", label: "Serviço Social" },
  { value: "BIOMEDICINA", label: "Biomedicina" },
  { value: "OUTROS", label: "Outros" },
];

function openTiagao() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("studyai:open-voice"));
}

function askTiagao(text: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("studyai:ask-tiagao", { detail: { text } }));
}

function bancaBadgeClasses(banca?: string): string {
  switch (banca) {
    case "OAB":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "CEBRASPE":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "FGV":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "VUNESP":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "FCC":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function areaIcon(area?: string) {
  switch (area) {
    case "DIREITO":
      return Scale;
    // Toda a família de saúde (Medicina + especialidades multi-profissionais)
    // ganha o ícone de estetoscópio — visualmente agrupa o cluster de saúde
    // mesmo com áreas separadas no filtro.
    case "MEDICINA":
    case "ENFERMAGEM":
    case "FARMACIA":
    case "ODONTOLOGIA":
    case "FISIOTERAPIA":
    case "NUTRICAO":
    case "PSICOLOGIA":
    case "SERVICO_SOCIAL":
    case "BIOMEDICINA":
      return Stethoscope;
    default:
      return GraduationCap;
  }
}

function areaLabel(area?: string): string {
  const hit = AREAS.find((a) => a.value === area);
  return hit?.label ?? area ?? "—";
}

export default function ConcursosPage() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [banca, setBanca] = useState<Banca>("");
  const [area, setArea] = useState<Area>("");
  const [ano, setAno] = useState<string>(""); // mantemos string p/ controle de input
  const [results, setResults] = useState<Questao[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [didSearch, setDidSearch] = useState(false);

  // Carrega stats no mount pra preencher anos disponíveis + total.
  useEffect(() => {
    let aborted = false;
    fetch("/api/concursos/stats", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (aborted || !d?.stats) return;
        setStats(d.stats as Stats);
      })
      .catch(() => {});
    return () => {
      aborted = true;
    };
  }, []);

  const anosDisponiveis = useMemo(
    () => (stats?.anos ?? []).slice().sort((a, b) => b - a),
    [stats],
  );

  const totalSeed = stats?.total ?? 0;

  /**
   * Aceita overrides opcionais para evitar stale-closure (atalhos de sugestão
   * disparam logo após `setState`, que ainda não propagou).
   */
  async function runSearch(
    overrides: { query?: string; banca?: Banca; area?: Area; ano?: string } = {},
  ): Promise<void> {
    setLoading(true);
    setError(null);
    setDidSearch(true);
    setOpenId(null);
    const qEff = overrides.query ?? query;
    const bEff = overrides.banca ?? banca;
    const aEff = overrides.area ?? area;
    const yEff = overrides.ano ?? ano;
    try {
      const params = new URLSearchParams();
      if (qEff.trim()) params.set("query", qEff.trim());
      if (bEff) params.set("banca", bEff);
      if (aEff) params.set("area", aEff);
      if (yEff && /^\d{4}$/.test(yEff)) params.set("ano", yEff);
      params.set("limit", "30");
      const res = await fetch(
        `/api/concursos/questoes?${params.toString()}`,
        { credentials: "include" },
      );
      const data = (await res.json()) as ConcursosResponse;
      if (!res.ok) {
        const detail = (data as unknown as { error?: string; detail?: string });
        throw new Error(detail.detail || detail.error || "Erro na busca.");
      }
      setResults(data.results || []);
      if (data.stats) setStats(data.stats);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
      setResults([]);
    } finally {
      setLoading(false);
      setDrawerOpen(false);
    }
  }

  function clearFilters() {
    setQuery("");
    setBanca("");
    setArea("");
    setAno("");
  }

  function pedirSimulado() {
    const filtros: string[] = [];
    if (banca) filtros.push(`banca ${banca}`);
    if (area) filtros.push(`área ${areaLabel(area)}`);
    if (ano) filtros.push(`ano ${ano}`);
    if (query.trim()) filtros.push(`tema "${query.trim()}"`);
    const pedido = filtros.length
      ? `Monta pra mim um mini-simulado de concurso (${filtros.join(", ")}). Tira 10 questões com gabarito comentado.`
      : "Monta pra mim um mini-simulado de concurso público com 10 questões variadas e gabarito comentado.";
    triggerProfessorAction("simulado_concurso", JSON.stringify({ banca, area, ano, query: query.trim() }));
    askTiagao(pedido);
    openTiagao();
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-violet-50/70 via-white to-fuchsia-50/40">
      {/* Background decorativo (mesmo idioma do Home.tsx) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-violet-300/30 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 h-[26rem] w-[26rem] rounded-full bg-fuchsia-300/25 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full bg-indigo-200/30 blur-[120px]" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-30 h-14 border-b border-violet-100/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/app")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-200/60 bg-white/70 text-slate-600 transition hover:bg-violet-50 hover:text-violet-700"
              aria-label="Voltar"
              title="Voltar pro app"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/app")}
              className="flex items-center gap-2.5"
              aria-label="Início"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md shadow-violet-500/30">
                <span className="font-black text-white text-lg leading-none">S</span>
              </div>
              <span className="font-black text-slate-900 text-lg tracking-tight">
                Study<span className="text-violet-600">.IA</span>
              </span>
              <span className="ml-2 hidden rounded-full border border-violet-200 bg-violet-50/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700 sm:inline-block">
                Concursos
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="md:hidden flex h-9 items-center gap-2 rounded-xl border border-violet-200/70 bg-white/80 px-3 text-xs font-bold text-violet-700 shadow-sm"
            aria-label="Abrir filtros"
          >
            <Filter className="h-4 w-4" />
            Filtros
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-24 pt-6 sm:px-6 lg:gap-10 lg:pt-10">
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative overflow-hidden rounded-[2rem] border border-violet-200/60 bg-white/70 p-6 shadow-xl shadow-violet-300/40 backdrop-blur-2xl sm:p-10"
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
              <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-400/20 blur-3xl" />
              <div className="absolute -bottom-20 right-1/4 h-60 w-60 rounded-full bg-fuchsia-400/20 blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
              <div className="flex-1 space-y-3 text-center lg:text-left">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-500">
                  Concursos públicos & licenciamento
                </p>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                  Prepare-se com{" "}
                  <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-purple-700 bg-clip-text text-transparent">
                    questões reais
                  </span>{" "}
                  de concursos.
                </h1>
                <p className="mx-auto max-w-2xl text-sm text-slate-500 sm:text-base lg:mx-0">
                  Banco com {totalSeed > 0 ? totalSeed.toLocaleString("pt-BR") : "+7.000"} questões de provas oficiais (OAB, Revalida, Enare). Filtre por banca, área e ano — ou peça um simulado direto pro Tiagão.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2 lg:justify-start">
                  <button
                    type="button"
                    onClick={pedirSimulado}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-violet-500/40 transition hover:scale-[1.02]"
                  >
                    <Sparkles className="h-4 w-4" />
                    Pedir simulado pro Tiagão
                  </button>
                  {stats && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      {Object.keys(stats.porBanca).length} bancas · {stats.anos.length} anos
                    </span>
                  )}
                </div>
              </div>

              {/* Search bar (desktop hero-side) */}
              <div className="flex-1 lg:max-w-md">
                <Filters
                  query={query}
                  setQuery={setQuery}
                  banca={banca}
                  setBanca={setBanca}
                  area={area}
                  setArea={setArea}
                  ano={ano}
                  setAno={setAno}
                  anosDisponiveis={anosDisponiveis}
                  onSearch={() => void runSearch()}
                  onClear={clearFilters}
                  variant="inline"
                  loading={loading}
                />
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Resultados / estado ───────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                {results == null ? "Banco" : "Resultados"}
              </p>
              <h2 className="text-lg font-black text-slate-800 sm:text-xl">
                {results == null
                  ? "Use os filtros pra encontrar questões"
                  : `${results.length} questão${results.length === 1 ? "" : "ões"} encontrada${results.length === 1 ? "" : "s"}`}
              </h2>
            </div>
            {results != null && results.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setResults(null);
                  setDidSearch(false);
                  clearFilters();
                }}
                className="text-xs font-bold text-violet-600 hover:text-violet-700"
              >
                Limpar
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 rounded-2xl border border-violet-200/60 bg-white/70 px-4 py-6 text-sm text-slate-500 shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              Buscando questões…
            </div>
          )}

          {!loading && results == null && (
            <EmptyHint
              stats={stats}
              onPickSuggestion={(s) => {
                setBanca(s.banca);
                setArea(s.area);
                void runSearch({ banca: s.banca, area: s.area });
              }}
            />
          )}

          {!loading && results != null && results.length === 0 && didSearch && (
            <div className="rounded-3xl border border-dashed border-violet-200 bg-white/60 px-6 py-10 text-center">
              <p className="text-base font-bold text-slate-800">
                Nada encontrado com esses filtros.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Tente afrouxar — remova banca, ano ou termos da busca.
              </p>
            </div>
          )}

          {!loading && results != null && results.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {results.map((q) => (
                <QuestaoCard
                  key={q.id}
                  questao={q}
                  open={openId === q.id}
                  onToggle={() =>
                    setOpenId((id) => (id === q.id ? null : q.id))
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Sobre as fontes ──────────────────────────────────────────────── */}
        {stats?.fontes?.length ? (
          <section>
            <div className="rounded-2xl border border-violet-100 bg-white/60 p-4 text-xs text-slate-500 shadow-sm">
              <p className="mb-1 inline-flex items-center gap-1.5 font-bold text-slate-600">
                <Info className="h-3.5 w-3.5" /> Fontes desta versão
              </p>
              <ul className="ml-1 space-y-0.5">
                {stats.fontes.map((f) => (
                  <li key={f.fonte}>
                    <span className="font-mono text-[11px]">{f.fonte}</span>{" "}
                    — {f.total.toLocaleString("pt-BR")} questões
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </main>

      {/* ── Mobile filters drawer ──────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex md:hidden"
            onClick={() => setDrawerOpen(false)}
          >
            <div className="flex-1 bg-slate-900/40 backdrop-blur-sm" />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="relative flex h-full w-[88%] max-w-sm flex-col gap-4 overflow-y-auto bg-white p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900">Filtros</h3>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                  aria-label="Fechar filtros"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Filters
                query={query}
                setQuery={setQuery}
                banca={banca}
                setBanca={setBanca}
                area={area}
                setArea={setArea}
                ano={ano}
                setAno={setAno}
                anosDisponiveis={anosDisponiveis}
                onSearch={() => void runSearch()}
                onClear={clearFilters}
                variant="drawer"
                loading={loading}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Filtros (compartilhado entre hero e drawer) ──────────────────────────────
function Filters({
  query,
  setQuery,
  banca,
  setBanca,
  area,
  setArea,
  ano,
  setAno,
  anosDisponiveis,
  onSearch,
  onClear,
  variant,
  loading,
}: {
  query: string;
  setQuery: (v: string) => void;
  banca: Banca;
  setBanca: (v: Banca) => void;
  area: Area;
  setArea: (v: Area) => void;
  ano: string;
  setAno: (v: string) => void;
  anosDisponiveis: number[];
  onSearch: () => void;
  onClear: () => void;
  variant: "inline" | "drawer";
  loading: boolean;
}) {
  return (
    <form
      className={
        variant === "inline"
          ? "rounded-3xl border-2 border-violet-200/70 bg-white p-4 shadow-xl shadow-violet-300/30 space-y-3"
          : "space-y-3"
      }
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
    >
      <label className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por tema (ex.: 'direito do trabalho', 'farmacologia')"
          className="w-full rounded-2xl border border-violet-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300/40"
          aria-label="Termo de busca"
          maxLength={300}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Banca" value={banca} onChange={(v) => setBanca(v as Banca)} options={BANCAS} />
        <SelectField label="Área" value={area} onChange={(v) => setArea(v as Area)} options={AREAS} />
      </div>

      <SelectField
        label="Ano"
        value={ano}
        onChange={setAno}
        options={[
          { value: "", label: "Qualquer ano" },
          ...anosDisponiveis.map((a) => ({ value: String(a), label: String(a) })),
        ]}
      />

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/40 transition hover:scale-[1.01] disabled:opacity-60 disabled:hover:scale-100"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          Limpar
        </button>
      </div>
    </form>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ─── Empty state com cards de sugestão ────────────────────────────────────────
function EmptyHint({
  stats,
  onPickSuggestion,
}: {
  stats: Stats | null;
  onPickSuggestion: (s: { banca: Banca; area: Area }) => void;
}) {
  // Sugestões adaptadas ao que temos no banco. Apontamos pra MEDICINA
  // (maior bucket de saúde, ~4.5k questões — Revalida + Enare residência
  // médica) em vez do antigo OUTRO/OUTROS, que agora é só o resíduo das
  // sub-especialidades do Enare Multi sem bucket próprio.
  const SUGGESTIONS: { banca: Banca; area: Area; label: string; icon: typeof Scale; tone: string }[] = [
    { banca: "OAB", area: "DIREITO", label: "OAB 1ª fase", icon: Scale, tone: "from-amber-500 to-orange-500" },
    { banca: "", area: "MEDICINA", label: "Revalida / Enare", icon: Stethoscope, tone: "from-emerald-500 to-teal-500" },
    { banca: "", area: "", label: "Surpreenda-me", icon: Sparkles, tone: "from-violet-500 to-fuchsia-500" },
  ];

  return (
    <div className="rounded-3xl border border-violet-200/60 bg-white/70 p-6 text-center shadow-sm">
      <p className="text-sm font-semibold text-slate-700">
        Use os filtros pra encontrar questões.
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Ou comece por uma das trilhas abaixo:
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SUGGESTIONS.map((s) => {
          const count =
            (s.banca && stats?.porBanca[s.banca]) ||
            (s.area && stats?.porArea[s.area]) ||
            stats?.total ||
            0;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => onPickSuggestion({ banca: s.banca, area: s.area })}
              className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${s.tone} text-white shadow`}>
                <s.icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-black text-slate-900">{s.label}</p>
              <p className="text-[11px] text-slate-500">
                {count.toLocaleString("pt-BR")} questões
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Card de questão ──────────────────────────────────────────────────────────
function QuestaoCard({
  questao,
  open,
  onToggle,
}: {
  questao: Questao;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = areaIcon(questao.area);
  const truncated = questao.enunciado.length > 220
    ? `${questao.enunciado.slice(0, 220).trim()}…`
    : questao.enunciado;

  return (
    <motion.article
      layout
      className="group overflow-hidden rounded-2xl border border-violet-200/60 bg-white/85 p-4 shadow-sm shadow-violet-200/30 backdrop-blur transition hover:border-violet-300 hover:shadow-md"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 text-left"
        aria-expanded={open}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {questao.banca && (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${bancaBadgeClasses(questao.banca)}`}>
                {questao.banca}
              </span>
            )}
            {questao.area && (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                {areaLabel(questao.area)}
              </span>
            )}
            {typeof questao.ano === "number" && (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {questao.ano}
              </span>
            )}
          </div>
          {questao.cargo && (
            <p className="mb-1 truncate text-[11px] font-semibold text-violet-700">
              {questao.cargo}
            </p>
          )}
          <p className="line-clamp-3 text-sm leading-relaxed text-slate-700">
            {open ? questao.enunciado : truncated}
          </p>
        </div>
        <div className="shrink-0 text-slate-400">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="alts"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              {questao.alternativas.map((a) => (
                <AltRow key={a.letra} alt={a} gabarito={questao.gabarito} />
              ))}
            </div>
            {questao.explicacao && (
              <p className="mt-3 rounded-xl bg-violet-50/70 px-3 py-2 text-xs text-violet-900">
                <strong className="font-bold">Resolução: </strong>
                {questao.explicacao}
              </p>
            )}
            <p className="mt-3 truncate text-[10px] text-slate-400">
              Fonte: {questao.fonteUrl ? (
                <a
                  href={questao.fonteUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline decoration-dotted hover:text-violet-600"
                >
                  {questao.fonte}
                </a>
              ) : (
                questao.fonte
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function AltRow({ alt, gabarito }: { alt: Alternativa; gabarito: string }) {
  const isCorrect = alt.letra === gabarito;
  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm transition ${
        isCorrect
          ? "border-emerald-300 bg-emerald-50/70 text-emerald-900"
          : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
          isCorrect
            ? "bg-emerald-500 text-white"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        {alt.letra}
      </span>
      <span className="leading-relaxed">{alt.texto}</span>
    </div>
  );
}
