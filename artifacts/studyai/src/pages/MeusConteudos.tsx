import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Search, Trash2, Eye, FileText,
  Presentation, Brain, Image as ImageIcon, BookOpen, Microscope,
  ClipboardList, Sparkles, Layers,
  ShieldCheck, CheckCircle2,
} from "lucide-react";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import {
  AppEmptyState,
  AppErrorState,
  AppLoadingState,
  AppMissionPanel,
  AppSectionShell,
  AppStatusBadge,
  ContentArea,
  Layout,
  PageHeader,
} from "@/components/Layout";

type Kind =
  | "resumao" | "slides" | "mapa_mental" | "infografico"
  | "material_premium" | "lesson_plan" | "exam" | "research" | "content_package";

interface Item {
  id: number;
  source?: "generated_content" | "lesson_plans";
  owner_role: "student" | "teacher";
  kind: Kind;
  title: string;
  materia: string | null;
  payload: any;
  html_url: string | null;
  created_at: string;
}

const KIND_META: Record<Kind, { label: string; icon: any; color: string; group: "student" | "teacher" | "both" }> = {
  resumao:          { label: "Resumão",            icon: FileText,      color: "text-emerald-600 bg-emerald-50 border-emerald-200", group: "student" },
  slides:           { label: "Slides",             icon: Presentation,  color: "text-violet-600 bg-violet-50 border-violet-200",    group: "both" },
  mapa_mental:      { label: "Mapa Mental",        icon: Brain,         color: "text-violet-600 bg-violet-50 border-violet-200",    group: "both" },
  infografico:      { label: "Infográfico",        icon: ImageIcon,     color: "text-rose-600 bg-rose-50 border-rose-200",          group: "student" },
  material_premium: { label: "Material Premium",   icon: Sparkles,      color: "text-amber-600 bg-amber-50 border-amber-200",       group: "teacher" },
  lesson_plan:     { label: "Plano de Aula",      icon: BookOpen,      color: "text-violet-600 bg-violet-50 border-violet-200",          group: "teacher" },
  exam:             { label: "Prova",               icon: ClipboardList, color: "text-red-600 bg-red-50 border-red-200",             group: "teacher" },
  research:         { label: "Pesquisa",            icon: Microscope,    color: "text-cyan-600 bg-cyan-50 border-cyan-200",          group: "teacher" },
  content_package:  { label: "Pacote Completo",     icon: Layers,        color: "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200", group: "teacher" },
};

type QualityTone = "strong" | "attention" | "setup";
type ReviewStatus = "unreviewed" | "reviewing" | "approved" | "needs_changes";

interface QualityAudit {
  score: number;
  tone: QualityTone;
  label: string;
  strengths: string[];
  gaps: string[];
  nextAction: string;
}

type ReviewStatusMap = Record<string, ReviewStatus>;

const QUALITY_TONE_CLASSES: Record<QualityTone, { badge: string; panel: string; title: string }> = {
  strong: {
    badge: "text-emerald-700 bg-emerald-50 border-emerald-200",
    panel: "border-emerald-200 bg-emerald-50/70",
    title: "text-emerald-800",
  },
  attention: {
    badge: "text-amber-700 bg-amber-50 border-amber-200",
    panel: "border-amber-200 bg-amber-50/70",
    title: "text-amber-800",
  },
  setup: {
    badge: "text-slate-700 bg-slate-50 border-slate-200",
    panel: "border-slate-200 bg-slate-50",
    title: "text-slate-800",
  },
};

const REVIEW_STATUS_KEY = "studyai:content-review-status:v1";

const REVIEW_STATUS_META: Record<ReviewStatus, { label: string; hint: string; className: string }> = {
  unreviewed: {
    label: "Sem revisão humana",
    hint: "Ainda precisa de triagem antes de virar material oficial.",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  reviewing: {
    label: "Em revisão",
    hint: "Professor ou aluno está conferindo fonte, prática e clareza.",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  approved: {
    label: "Aprovado para uso",
    hint: "Revisão humana concluiu que o material pode ser usado nesta turma/rotina.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  needs_changes: {
    label: "Precisa ajustes",
    hint: "Há lacunas que devem ser corrigidas antes de usar como material premium.",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function assessContentQuality(item: Item): QualityAudit {
  const p = item.payload || {};
  const checks: Array<{ label: string; ok: boolean; nextAction: string }> = [];
  const add = (label: string, ok: boolean, nextAction: string) => checks.push({ label, ok, nextAction });

  const titleReady = hasText(item.title) || hasText(p.titulo) || hasText(p.title);
  const subjectReady = hasText(item.materia) || hasText(p.materia) || hasText(p.disciplina) || hasText(p.subject);

  if (item.kind === "slides") {
    const slides = Array.isArray(p.slides) ? p.slides : [];
    add("objetivo claro", titleReady && (hasArray(p.objetivos) || hasText(p.subtitulo) || slides.length >= 3), "Defina objetivo, publico e recorte antes de apresentar.");
    add("evidencia/fonte", hasArray(p.indicadoresQualidade) || slides.some((s: any) => hasText(s.evidencia) || hasText(s.visual?.credito)), "Adicione evidencia da fonte ou credito visual nos slides centrais.");
    add("checkpoint de aprendizagem", slides.some((s: any) => hasText(s.checkpoint) || hasText(s.pergunta)), "Inclua uma pergunta de checagem para validar entendimento.");
    add("visual explicavel", slides.some((s: any) => hasText(s.visual?.descricao) || hasText(s.comoExplicar)), "Planeje o visual ou a fala do professor em pelo menos um slide.");
  } else if (item.kind === "resumao") {
    const r = p.resumao || {};
    add("visao geral", hasText(r.visaoGeral), "Abra com uma visao geral curta do assunto.");
    add("conceitos-chave", hasArray(r.conceitosChave), "Liste conceitos-chave com explicacao propria.");
    add("erros comuns", hasArray(r.armadilhas), "Inclua armadilhas ou erros comuns para orientar revisao.");
    add("proxima acao", hasText(r.dicaFinal), "Finalize com uma acao objetiva para o aluno praticar.");
  } else if (item.kind === "lesson_plan") {
    const plano = p.plano || p;
    add("objetivo de aula", hasText(p.objetivo) || hasArray(plano.objetivos), "Declare objetivo geral e objetivos especificos.");
    add("sequencia didatica", Boolean(plano.abertura || plano.desenvolvimento || hasArray(plano.desenvolvimento)), "Organize abertura, desenvolvimento e fechamento.");
    add("avaliacao/rubrica", Boolean(plano.avaliacao || hasArray(plano.rubrica)), "Adicione criterio de avaliacao ou rubrica simples.");
    add("materiais e tarefa", hasArray(plano.materiais) || hasText(plano.tarefa_casa), "Informe material necessario e continuidade em casa.");
  } else if (item.kind === "exam" || item.kind === "content_package" || item.kind === "research") {
    const data = p.exam || p.content || p;
    const questions = Array.isArray(data.questions) ? data.questions : [];
    add("tema e contexto", titleReady && (subjectReady || hasText(data.resumo)), "Especifique materia, tema e contexto de uso.");
    add("itens praticaveis", questions.length > 0 || hasArray(data.atividades), "Inclua questoes ou atividades que o aluno consiga executar.");
    add("gabarito explicado", questions.some((q: any) => hasText(q.explanation) || hasText(q.explicacao)), "Explique o gabarito e os distratores.");
    add("criterio de revisao", hasArray(data.rubrica) || hasArray(data.criterios), "Inclua criterio de correcao ou revisao humana.");
  } else {
    add("titulo e materia", titleReady && subjectReady, "Complete titulo e materia para facilitar busca e contexto.");
    add("fonte rastreavel", Boolean(item.html_url || p.html_url || p.source || p.fontes || p.referencias), "Registre fonte, URL, referencia ou evidencia usada.");
    add("explicacao propria", hasText(p.explicacao) || hasText(p.summary) || hasText(p.resumo), "Inclua uma explicacao propria, nao apenas o arquivo bruto.");
    add("acao de estudo", hasArray(p.exercicios) || hasArray(p.questions) || hasText(p.dicaFinal), "Adicione exercicio, pergunta ou proxima missao.");
  }

  const strengths = checks.filter(c => c.ok).map(c => c.label);
  const missing = checks.filter(c => !c.ok);
  const score = checks.length > 0 ? Math.round((strengths.length / checks.length) * 100) : 0;
  const tone: QualityTone = score >= 75 ? "strong" : score >= 50 ? "attention" : "setup";

  return {
    score,
    tone,
    label: tone === "strong" ? "Pronto para uso" : tone === "attention" ? "Revisar antes de usar" : "Precisa curadoria",
    strengths,
    gaps: missing.map(c => c.label),
    nextAction: missing[0]?.nextAction ?? "Use em aula/estudo e registre feedback real para melhorar a proxima versao.",
  };
}

function reviewKey(item: Pick<Item, "id" | "source" | "kind">): string {
  return `${item.source ?? "generated_content"}:${item.kind}:${item.id}`;
}

function readReviewStatuses(): ReviewStatusMap {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(REVIEW_STATUS_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed as ReviewStatusMap : {};
  } catch {
    return {};
  }
}

function writeReviewStatuses(statuses: ReviewStatusMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REVIEW_STATUS_KEY, JSON.stringify(statuses));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MeusConteudosPage() {
  const [, navigate] = useLocation();
  const { user, isLoading: isLoaded } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<Kind | "">("");
  const [roleFilter, setRoleFilter] = useState<"" | "student" | "teacher">("");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<Item | null>(null);
  const [reviewStatuses, setReviewStatuses] = useState<ReviewStatusMap>(() => readReviewStatuses());

  const setReviewStatus = (item: Item, status: ReviewStatus) => {
    setReviewStatuses(prev => {
      const next = { ...prev, [reviewKey(item)]: status };
      writeReviewStatuses(next);
      return next;
    });
  };

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (kindFilter) params.set("kind", kindFilter);
      if (roleFilter) params.set("role", roleFilter);
      if (search.trim()) params.set("search", search.trim());
      params.set("limit", "100");
      const [r, lpRes] = await Promise.all([
        fetch(`/api/content/history?${params}`, { credentials: "include" }),
        // Legacy: planos de aula salvos antes do histórico universal
        (kindFilter && kindFilter !== "lesson_plan") || roleFilter === "student"
          ? Promise.resolve(null)
          : fetch(`/api/teacher/lesson-plans`, { credentials: "include" }).catch(() => null),
      ]);
      if (!r.ok) {
        if (r.status === 401) { navigate("/sign-in"); return; }
        throw new Error("Falha ao carregar");
      }
      const d = await r.json();
      const main: Item[] = (d.items ?? []).map((i: Item) => ({ ...i, source: "generated_content" as const }));

      let legacy: Item[] = [];
      if (lpRes && lpRes.ok) {
        const lpd = await lpRes.json();
        legacy = (lpd.plans ?? []).map((p: any): Item => ({
          id: p.id,
          source: "lesson_plans",
          owner_role: "teacher",
          kind: "lesson_plan",
          title: p.title,
          materia: p.disciplina,
          payload: { disciplina: p.disciplina, serie: p.serie, duracao: p.duracao, objetivo: p.objetivo, turma_name: p.turma_name },
          html_url: null,
          created_at: p.created_at,
        }));
      }

      const merged = [...main, ...legacy].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setItems(merged);
      setTotal((d.total ?? 0) + legacy.length);
    } catch (e: any) {
      setError(e?.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoaded && !user) { navigate("/sign-in"); return; }
    if (!isLoaded && user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user, kindFilter, roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function del(item: Item) {
    if (!confirm("Excluir este conteúdo?")) return;
    const url = item.source === "lesson_plans"
      ? `/api/teacher/lesson-plans/${item.id}`
      : `/api/content/${item.id}`;
    const r = await fetch(url, { method: "DELETE", credentials: "include" });
    if (r.ok) setItems(prev => prev.filter(i => !(i.id === item.id && i.source === item.source)));
  }

  async function open(item: Item) {
    if (item.source === "lesson_plans") {
      const r = await fetch(`/api/teacher/lesson-plans/${item.id}`, { credentials: "include" });
      if (!r.ok) { alert("Não foi possível abrir."); return; }
      const d = await r.json();
      const plan = d.plan ?? {};
      const full: Item = {
        ...item,
        payload: { ...plan, plano: plan.plano },
      };
      setViewing(full);
      return;
    }
    // Busca o conteúdo completo (lista só traz summary leve).
    const r = await fetch(`/api/content/${item.id}`, { credentials: "include" });
    if (!r.ok) { alert("Não foi possível abrir."); return; }
    const d = await r.json();
    const full: Item = d.item ?? item;

    if (full.kind === "material_premium" && full.payload?.html) {
      const blob = new Blob([full.payload.html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      // libera o objeto depois de uns segundos
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
    setViewing(full);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.title.toLowerCase().includes(q) || (i.materia ?? "").toLowerCase().includes(q));
  }, [items, search]);

  return (
    <Layout className="pt-0">
      <PageHeader
        icon={<FileText />}
        title="Meus Conteúdos"
        subtitle="Histórico universal de resumos, slides, mapas, provas e materiais de aula."
        meta={
          <>
            <AppStatusBadge tone="violet">{total} {total === 1 ? "item" : "itens"}</AppStatusBadge>
            <AppStatusBadge tone="slate">Aluno + Professor</AppStatusBadge>
          </>
        }
        actions={
          <button onClick={() => navigate("/notebook")} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-violet-700">
            Criar no Notebook
          </button>
        }
      />
      <ContentArea maxWidth="6xl" className="pb-8">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <AppMissionPanel
            title="Revise o que já foi criado antes de gerar mais conteúdo."
            description="Use busca, filtros e status de revisão para entender o que está pronto, o que precisa de curadoria e qual material deve virar próxima ação."
            evidence="cada card mostra tipo, autoria, curadoria heurística e revisão humana local."
            status={<AppStatusBadge tone="emerald" className="border-white/25 bg-white/15 text-white">Acervo interno</AppStatusBadge>}
          />
        </motion.div>

        {/* Filtros */}
        <AppSectionShell
          eyebrow="Encontrar e priorizar"
          title="Filtros do acervo"
          description="Comece pelo tipo, papel e busca textual. O resultado abaixo mantém a ação primária em abrir ou revisar."
          className="mb-0"
        >
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título ou matéria..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
            />
          </div>
          <select value={kindFilter} onChange={e => setKindFilter(e.target.value as any)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500">
            <option value="">Todos os tipos</option>
            {Object.entries(KIND_META).map(([k, m]) => (
              <option key={k} value={k}>{m.label}</option>
            ))}
          </select>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500">
            <option value="">Aluno + Professor</option>
            <option value="student">Como Aluno</option>
            <option value="teacher">Como Professor</option>
          </select>
        </div>
        </AppSectionShell>

        {loading ? (
          <AppLoadingState title="Carregando seu histórico" description="Buscando conteúdos gerados e planos de aula salvos." />
        ) : error ? (
          <AppErrorState description={error} action={
            <button onClick={() => void load()} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-black text-white hover:bg-rose-700">
              Tentar novamente
            </button>
          } />
        ) : filtered.length === 0 ? (
          <AppEmptyState
            icon={<FileText />}
            title="Nada por aqui ainda"
            description="Conforme você gera conteúdos no Notebook, no Professor ou nos fluxos de estudo, eles aparecem aqui com curadoria e status."
            action={
              <button onClick={() => navigate("/notebook")} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white hover:bg-violet-700">
                Gerar primeiro conteúdo
              </button>
            }
          />
        ) : (
          <>
            <p className="text-xs text-gray-500 font-semibold mb-3">{total} {total === 1 ? "item" : "itens"}</p>
            <div className="grid gap-3">
              {filtered.map(item => {
                const meta = KIND_META[item.kind] ?? KIND_META.content_package;
                const Icon = meta.icon;
                const quality = assessContentQuality(item);
                const reviewStatus = reviewStatuses[reviewKey(item)] ?? "unreviewed";
                const reviewMeta = REVIEW_STATUS_META[reviewStatus];
                return (
                  <motion.div key={reviewKey(item)}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-gray-200 bg-white p-4 lg:p-5 hover:shadow-md transition-shadow flex flex-col lg:flex-row gap-4 lg:items-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${meta.color} flex-shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span>
                        {item.materia && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{item.materia}</span>}
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{item.owner_role === "teacher" ? "👨‍🏫 Professor" : "🎓 Aluno"}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${QUALITY_TONE_CLASSES[quality.tone].badge}`}>
                          <ShieldCheck className="w-3 h-3" />
                          {quality.score}% curadoria
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${reviewMeta.className}`}>
                          <CheckCircle2 className="w-3 h-3" />
                          {reviewMeta.label}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm truncate">{item.title}</h3>
                      <p className="text-gray-500 text-xs mt-0.5">{formatDate(item.created_at)} · {quality.label} · {reviewMeta.hint}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button onClick={() => setReviewStatus(item, "reviewing")} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 hover:bg-amber-100">
                          Revisar
                        </button>
                        <button onClick={() => setReviewStatus(item, "approved")} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 hover:bg-emerald-100">
                          Aprovar
                        </button>
                        <button onClick={() => setReviewStatus(item, "needs_changes")} className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-rose-700 hover:bg-rose-100">
                          Ajustes
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:flex-shrink-0">
                      <button onClick={() => open(item)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-violet-500 lg:flex-none">
                        <Eye className="w-3.5 h-3.5" /> Abrir
                      </button>
                      <button onClick={() => del(item)} className="flex items-center justify-center gap-1.5 rounded-xl bg-gray-50 px-3 py-2 text-xs font-bold text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </ContentArea>

      {/* Viewer modal genérico (JSON pretty) */}
      {viewing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-violet-600 font-bold tracking-wider">{KIND_META[viewing.kind]?.label}</p>
                <h2 className="font-black text-gray-900 truncate">{viewing.title}</h2>
              </div>
              <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-900 text-2xl leading-none px-3">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <QualityAuditCard
                audit={assessContentQuality(viewing)}
                reviewStatus={reviewStatuses[reviewKey(viewing)] ?? "unreviewed"}
                onReviewStatusChange={(status) => setReviewStatus(viewing, status)}
              />
              <ContentRenderer item={viewing} />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function QualityAuditCard({
  audit,
  reviewStatus,
  onReviewStatusChange,
}: {
  audit: QualityAudit;
  reviewStatus: ReviewStatus;
  onReviewStatusChange: (status: ReviewStatus) => void;
}) {
  const tone = QUALITY_TONE_CLASSES[audit.tone];
  const reviewMeta = REVIEW_STATUS_META[reviewStatus];
  return (
    <div className={`mb-5 rounded-2xl border p-4 ${tone.panel}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">Curadoria premium</p>
          <h3 className={`mt-1 text-sm font-black ${tone.title}`}>{audit.label} · {audit.score}%</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{audit.nextAction}</p>
        </div>
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${tone.badge}`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          Checklist
        </div>
      </div>
      <div className={`mt-3 rounded-xl border p-3 ${reviewMeta.className}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider">Workflow de revisão</p>
            <p className="mt-1 text-xs font-bold">{reviewMeta.label}</p>
            <p className="mt-0.5 text-xs opacity-80">{reviewMeta.hint}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => onReviewStatusChange("reviewing")} className="rounded-lg border border-current/20 bg-white/60 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider hover:bg-white">
              Em revisão
            </button>
            <button onClick={() => onReviewStatusChange("approved")} className="rounded-lg border border-current/20 bg-white/60 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider hover:bg-white">
              Aprovar
            </button>
            <button onClick={() => onReviewStatusChange("needs_changes")} className="rounded-lg border border-current/20 bg-white/60 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider hover:bg-white">
              Pedir ajustes
            </button>
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Sinais presentes</p>
          <p className="mt-1 text-xs text-slate-700">{audit.strengths.length ? audit.strengths.join(" · ") : "Nenhum sinal suficiente ainda."}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Lacunas</p>
          <p className="mt-1 text-xs text-slate-700">{audit.gaps.length ? audit.gaps.join(" · ") : "Sem lacuna principal detectada."}</p>
        </div>
      </div>
    </div>
  );
}

function ContentRenderer({ item }: { item: Item }) {
  const p = item.payload || {};

  if (item.kind === "infografico" && p.b64_json) {
    return (
      <div className="text-center">
        <img src={`data:${p.mimeType || "image/png"};base64,${p.b64_json}`} alt={p.titulo || item.title}
          className="max-w-full mx-auto rounded-xl shadow-lg" />
        {p.titulo && <p className="mt-4 text-gray-900 font-bold">{p.titulo}</p>}
        {p.subtitulo && <p className="text-gray-500 text-sm">{p.subtitulo}</p>}
      </div>
    );
  }

  if (item.kind === "resumao" && p.resumao) {
    const r = p.resumao;
    return (
      <div className="space-y-4 text-sm">
        {r.visaoGeral && <div><h3 className="font-black text-gray-900 mb-1">Visão Geral</h3><p className="text-gray-700">{r.visaoGeral}</p></div>}
        {r.conceitosChave?.length > 0 && (
          <div><h3 className="font-black text-gray-900 mb-2">Conceitos-chave</h3>
            <div className="space-y-2">{r.conceitosChave.map((c: any, i: number) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="font-bold text-gray-900">{c.titulo}</p>
                <p className="text-gray-600 text-xs mt-1">{c.explicacao}</p>
                {c.comoMemorizar && <p className="text-violet-700 text-xs mt-1.5">💡 {c.comoMemorizar}</p>}
              </div>
            ))}</div>
          </div>
        )}
        {r.armadilhas?.length > 0 && <div><h3 className="font-black text-gray-900 mb-1">Armadilhas</h3><ul className="list-disc pl-5 text-gray-700 space-y-1">{r.armadilhas.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul></div>}
        {r.dicaFinal && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3"><strong className="text-amber-700">🎯 Dica final:</strong> <span className="text-gray-700">{r.dicaFinal}</span></div>}
      </div>
    );
  }

  if (item.kind === "slides" && p.slides) {
    return (
      <div className="space-y-3">
        {p.slides.map((s: any, i: number) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{s.emoji || "📄"}</span>
              <span className="text-[10px] font-bold uppercase text-violet-600 tracking-wider">{s.tipo}</span>
            </div>
            <p className="font-bold text-gray-900 text-sm">{s.titulo}</p>
            {s.subtitulo && <p className="text-gray-500 text-xs mt-1">{s.subtitulo}</p>}
            {s.texto && <p className="text-gray-700 text-xs mt-2">{s.texto}</p>}
            {s.items && <ul className="list-disc pl-5 text-gray-700 text-xs mt-2 space-y-0.5">{s.items.map((it: string, j: number) => <li key={j}>{it}</li>)}</ul>}
            {s.pergunta && <p className="text-gray-700 text-xs mt-2 italic">{s.pergunta}</p>}
          </div>
        ))}
      </div>
    );
  }

  if (item.kind === "mapa_mental" && p.categories) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-black text-gray-900">{p.subject}</h3>
        {p.categories.map((cat: any, i: number) => (
          <div key={i} className="rounded-xl border border-violet-200 bg-violet-50 p-3">
            <p className="font-bold text-violet-900">{cat.name}</p>
            <ul className="mt-2 space-y-1">{cat.topics?.map((t: any, j: number) => (
              <li key={j} className="text-sm text-gray-700"><strong>{t.name}</strong>{t.subtopics?.length ? `: ${t.subtopics.map((s: any) => s.name).join(", ")}` : ""}</li>
            ))}</ul>
          </div>
        ))}
      </div>
    );
  }

  if ((item.kind === "exam" || item.kind === "content_package" || item.kind === "research") && (p.exam || p.content)) {
    const data = p.exam || p.content;
    return (
      <div className="space-y-4">
        {data.titulo && <h3 className="text-lg font-black text-gray-900">{data.titulo}</h3>}
        {data.resumo && <p className="text-sm text-gray-700">{data.resumo}</p>}
        {data.questions?.length > 0 && (
          <div className="space-y-3">{data.questions.map((q: any, i: number) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="font-bold text-gray-900 text-sm">{i + 1}. {q.text}</p>
              {q.context && <p className="text-gray-500 text-xs mt-1 italic">{q.context}</p>}
              <ul className="mt-2 space-y-1 text-xs">{q.alternatives?.map((a: string, j: number) => (
                <li key={j} className={j === q.correct ? "text-emerald-700 font-bold" : "text-gray-600"}>{a}</li>
              ))}</ul>
              {q.explanation && <p className="text-violet-700 text-xs mt-2"><strong>Explicação:</strong> {q.explanation}</p>}
            </div>
          ))}</div>
        )}
      </div>
    );
  }

  if (item.kind === "lesson_plan") {
    const plano = p.plano || p;
    return (
      <div className="space-y-4 text-sm">
        {(p.disciplina || p.serie || p.duracao) && (
          <div className="flex flex-wrap gap-2">
            {p.disciplina && <span className="text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200 px-2.5 py-1 rounded-full">{p.disciplina}</span>}
            {p.serie && <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">{p.serie}</span>}
            {p.duracao && <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">⏱ {p.duracao}</span>}
          </div>
        )}
        {p.objetivo && <div><h3 className="font-black text-gray-900 mb-1">Objetivo</h3><p className="text-gray-700">{p.objetivo}</p></div>}
        {plano?.objetivos?.length > 0 && (
          <div><h3 className="font-black text-gray-900 mb-1">Objetivos específicos</h3><ul className="list-disc pl-5 text-gray-700 space-y-1">{plano.objetivos.map((o: string, i: number) => <li key={i}>{o}</li>)}</ul></div>
        )}
        {plano?.conteudos?.length > 0 && (
          <div><h3 className="font-black text-gray-900 mb-1">Conteúdos</h3><ul className="list-disc pl-5 text-gray-700 space-y-1">{plano.conteudos.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul></div>
        )}
        {plano?.abertura && <div className="rounded-xl border border-violet-200 bg-violet-50 p-3"><p className="font-bold text-violet-900">🚪 Abertura ({plano.abertura.duracao})</p><p className="text-gray-700 text-xs mt-1">{plano.abertura.descricao}</p>{plano.abertura.atividade && <p className="text-gray-600 text-xs mt-1 italic">Atividade: {plano.abertura.atividade}</p>}</div>}
        {plano?.desenvolvimento && <div className="rounded-xl border border-violet-200 bg-violet-50 p-3"><p className="font-bold text-violet-900">📚 Desenvolvimento ({plano.desenvolvimento.duracao})</p><p className="text-gray-700 text-xs mt-1">{plano.desenvolvimento.descricao}</p>{plano.desenvolvimento.atividades?.length > 0 && <ul className="list-disc pl-5 text-gray-600 text-xs mt-1.5 space-y-0.5">{plano.desenvolvimento.atividades.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul>}</div>}
        {plano?.fechamento && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="font-bold text-emerald-900">🎯 Fechamento ({plano.fechamento.duracao})</p><p className="text-gray-700 text-xs mt-1">{plano.fechamento.descricao}</p>{plano.fechamento.avaliacao && <p className="text-gray-600 text-xs mt-1 italic">Avaliação: {plano.fechamento.avaliacao}</p>}</div>}
        {plano?.materiais?.length > 0 && <div><h3 className="font-black text-gray-900 mb-1">Materiais</h3><p className="text-gray-700">{plano.materiais.join(", ")}</p></div>}
        {plano?.tarefa_casa && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3"><strong className="text-amber-700">📝 Tarefa de casa:</strong> <span className="text-gray-700">{plano.tarefa_casa}</span></div>}
        {plano?.observacoes && <div><h3 className="font-black text-gray-900 mb-1">Observações</h3><p className="text-gray-700 text-xs">{plano.observacoes}</p></div>}
      </div>
    );
  }

  // Fallback
  return <pre className="text-xs text-gray-600 bg-gray-50 p-4 rounded-xl overflow-auto whitespace-pre-wrap">{JSON.stringify(p, null, 2)}</pre>;
}
