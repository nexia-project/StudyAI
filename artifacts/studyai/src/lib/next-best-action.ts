import type { ErrorReviewMission } from "./error-review";

export const SIMULADO_RECOVERY_MISSION_KEY = "studyai:simulado-enem:recovery-mission:v1";

export type NextBestActionSource =
  | "caderno_erros"
  | "simulado_enem"
  | "notebook_rag"
  | "curadoria"
  | "plano_recente"
  | "fallback";

export type NextBestActionKind =
  | "open_caderno"
  | "open_simulado"
  | "open_notebook"
  | "open_conteudos"
  | "resume_plan"
  | "ask_tiagao";

export type NextBestActionMission = {
  id: string;
  priority: number;
  source: NextBestActionSource;
  sourceLabel: string;
  eyebrow: string;
  title: string;
  subject: string;
  estimate: string;
  reason: string;
  evidence: string[];
  successCriterion: string;
  primaryLabel: string;
  tiagaoPrompt: string;
  action: {
    kind: NextBestActionKind;
    route?: string;
  };
};

export type SimuladoRecoveryMission = {
  title: string;
  subject: string;
  estimate: string;
  reason: string;
  evidence: string;
  successCriterion: string;
  primaryLabel: string;
  tiagaoPrompt: string;
  createdAt: string;
  errorsCount: number;
  accuracy: number;
  weakArea?: string | null;
};

export type NotebookSignal = {
  id: number;
  title: string;
  source_file: string | null;
  file_size_kb: number | null;
  created_at: string;
  content_length: number;
};

export type ContentSignal = {
  id: number;
  owner_role?: "student" | "teacher";
  kind: string;
  title: string;
  materia: string | null;
  payload?: unknown;
  html_url?: string | null;
  created_at: string;
};

export type RecentPlanSignal = {
  id: string;
  materia: string;
  plan: {
    materia?: string;
    dias?: unknown[];
  } & Record<string, unknown>;
  createdAt: string;
};

type ContentAudit = {
  score: number;
  firstGap: string;
  nextAction: string;
};

function safeDateMs(value?: string | null): number {
  const ms = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(ms) ? ms : 0;
}

function isRecent(value?: string | null, maxAgeDays = 21): boolean {
  const ms = safeDateMs(value);
  return ms > 0 && Date.now() - ms <= maxAgeDays * 86400000;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function getPayloadObject(payload: unknown): Record<string, any> {
  return payload && typeof payload === "object" ? payload as Record<string, any> : {};
}

function assessContentSignal(item: ContentSignal): ContentAudit {
  const p = getPayloadObject(item.payload);
  const checks: Array<{ label: string; ok: boolean; nextAction: string }> = [];
  const add = (label: string, ok: boolean, nextAction: string) => checks.push({ label, ok, nextAction });

  const titleReady = hasText(item.title) || hasText(p.titulo) || hasText(p.title);
  const subjectReady = hasText(item.materia) || hasText(p.materia) || hasText(p.disciplina) || hasText(p.subject);

  if (item.kind === "slides") {
    const slides = Array.isArray(p.slides) ? p.slides : [];
    add("objetivo claro", titleReady && (hasArray(p.objetivos) || hasText(p.subtitulo) || slides.length >= 3), "Defina objetivo, público e recorte antes de estudar/apresentar.");
    add("evidência/fonte", hasArray(p.indicadoresQualidade) || slides.some((s: any) => hasText(s.evidencia) || hasText(s.visual?.credito)), "Adicione evidência da fonte ou crédito visual nos slides centrais.");
    add("checkpoint", slides.some((s: any) => hasText(s.checkpoint) || hasText(s.pergunta)), "Inclua uma pergunta de checagem para validar entendimento.");
    add("visual explicável", slides.some((s: any) => hasText(s.visual?.descricao) || hasText(s.comoExplicar)), "Planeje o visual ou a fala em pelo menos um slide.");
  } else if (item.kind === "resumao") {
    const r = getPayloadObject(p.resumao);
    add("visão geral", hasText(r.visaoGeral), "Abra com uma visão geral curta do assunto.");
    add("conceitos-chave", hasArray(r.conceitosChave), "Liste conceitos-chave com explicação própria.");
    add("erros comuns", hasArray(r.armadilhas), "Inclua armadilhas ou erros comuns para orientar revisão.");
    add("próxima ação", hasText(r.dicaFinal), "Finalize com uma ação objetiva para praticar.");
  } else {
    add("título e matéria", titleReady && subjectReady, "Complete título e matéria para facilitar contexto.");
    add("fonte rastreável", Boolean(item.html_url || p.html_url || p.source || p.fontes || p.referencias), "Registre fonte, URL, referência ou evidência usada.");
    add("explicação própria", hasText(p.explicacao) || hasText(p.summary) || hasText(p.resumo), "Inclua uma explicação própria, não apenas o arquivo bruto.");
    add("ação de estudo", hasArray(p.exercicios) || hasArray(p.questions) || hasText(p.dicaFinal), "Adicione exercício, pergunta ou próxima missão.");
  }

  const missing = checks.filter(c => !c.ok);
  const score = checks.length ? Math.round(((checks.length - missing.length) / checks.length) * 100) : 0;
  return {
    score,
    firstGap: missing[0]?.label ?? "sem lacuna principal",
    nextAction: missing[0]?.nextAction ?? "Usar o conteúdo e registrar feedback real para melhorar a próxima versão.",
  };
}

export function saveSimuladoRecoveryMission(mission: SimuladoRecoveryMission) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SIMULADO_RECOVERY_MISSION_KEY, JSON.stringify(mission));
}

export function readSimuladoRecoveryMission(maxAgeDays = 14): SimuladoRecoveryMission | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SIMULADO_RECOVERY_MISSION_KEY);
    if (!raw) return null;
    const mission = JSON.parse(raw) as SimuladoRecoveryMission;
    if (!mission?.title || !mission?.createdAt) return null;
    if (!isRecent(mission.createdAt, maxAgeDays)) {
      localStorage.removeItem(SIMULADO_RECOVERY_MISSION_KEY);
      return null;
    }
    return mission;
  } catch {
    localStorage.removeItem(SIMULADO_RECOVERY_MISSION_KEY);
    return null;
  }
}

export function buildNextBestAction(args: {
  errorReviewMission: ErrorReviewMission | null;
  simuladoRecoveryMission: SimuladoRecoveryMission | null;
  notebookDocs: NotebookSignal[];
  contentItems: ContentSignal[];
  recentPlan: RecentPlanSignal | null;
  focus: string;
}): NextBestActionMission {
  const candidates: NextBestActionMission[] = [];

  if (args.errorReviewMission) {
    const m = args.errorReviewMission;
    candidates.push({
      id: `caderno:${m.createdAt}:${m.subject}`,
      priority: 10,
      source: "caderno_erros",
      sourceLabel: "caderno de erros",
      eyebrow: "Revisão recomendada",
      title: m.title,
      subject: m.subject,
      estimate: m.estimate,
      reason: `${m.reason} Revisão sugerida: ${new Date(m.nextReviewAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}.`,
      evidence: [
        `${m.errorsCount} erro${m.errorsCount !== 1 ? "s" : ""} registrado${m.errorsCount !== 1 ? "s" : ""}`,
        `${m.accuracy}% de acerto no simulado`,
        `Padrão: ${m.errorType}`,
      ],
      successCriterion: "Concluir quando você refizer ao menos 1 erro e explicar por que a alternativa correta vence.",
      primaryLabel: m.primaryLabel,
      tiagaoPrompt: m.tiagaoPrompt,
      action: { kind: "open_caderno", route: "/caderno" },
    });
  }

  if (args.simuladoRecoveryMission && (args.simuladoRecoveryMission.errorsCount > 0 || args.simuladoRecoveryMission.accuracy < 70)) {
    const m = args.simuladoRecoveryMission;
    candidates.push({
      id: `simulado:${m.createdAt}:${m.subject}`,
      priority: 20,
      source: "simulado_enem",
      sourceLabel: "simulado premium",
      eyebrow: "Recuperação do simulado",
      title: m.title,
      subject: m.subject,
      estimate: m.estimate,
      reason: m.reason,
      evidence: [
        `${m.errorsCount} erro${m.errorsCount !== 1 ? "s" : ""} no último simulado`,
        `${m.accuracy}% de acerto`,
        m.weakArea ? `Área fraca: ${m.weakArea}` : m.evidence,
      ],
      successCriterion: m.successCriterion,
      primaryLabel: m.primaryLabel,
      tiagaoPrompt: m.tiagaoPrompt,
      action: { kind: "ask_tiagao" },
    });
  }

  const recentNotebookDoc = [...args.notebookDocs]
    .filter(doc => doc.content_length >= 300 && isRecent(doc.created_at, 21))
    .sort((a, b) => safeDateMs(b.created_at) - safeDateMs(a.created_at))[0];
  if (recentNotebookDoc) {
    candidates.push({
      id: `notebook:${recentNotebookDoc.id}:${recentNotebookDoc.created_at}`,
      priority: 35,
      source: "notebook_rag",
      sourceLabel: "Notebook RAG",
      eyebrow: "Material para transformar em estudo",
      title: `Estudar ${recentNotebookDoc.title}`,
      subject: recentNotebookDoc.title,
      estimate: recentNotebookDoc.content_length > 6000 ? "25 min" : "15 min",
      reason: "Você tem material recente no Notebook. O melhor próximo passo é transformar esse arquivo em explicação, perguntas e revisão curta.",
      evidence: [
        `Material enviado em ${new Date(recentNotebookDoc.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`,
        `${recentNotebookDoc.content_length.toLocaleString("pt-BR")} caracteres disponíveis para RAG`,
        recentNotebookDoc.source_file ? `Fonte: ${recentNotebookDoc.source_file}` : "Fonte salva como texto no Notebook",
      ],
      successCriterion: "Concluir quando você gerar resumo ou perguntas e responder uma checagem sem consultar o texto.",
      primaryLabel: "Abrir material",
      tiagaoPrompt: `Tiagão, entre no modo treinador e me guia pelo material "${recentNotebookDoc.title}" do meu Notebook. Quero uma explicação curta, 3 perguntas e uma checagem final.`,
      action: { kind: "open_notebook", route: "/notebook" },
    });
  }

  const contentWithAudit = args.contentItems
    .filter(item => item.owner_role !== "teacher")
    .map(item => ({ item, audit: assessContentSignal(item) }))
    .filter(({ audit }) => audit.score < 75)
    .sort((a, b) => a.audit.score - b.audit.score || safeDateMs(b.item.created_at) - safeDateMs(a.item.created_at))[0];
  if (contentWithAudit) {
    const { item, audit } = contentWithAudit;
    candidates.push({
      id: `curadoria:${item.id}:${audit.score}`,
      priority: 45,
      source: "curadoria",
      sourceLabel: "curadoria de conteúdo",
      eyebrow: "Lacuna de curadoria",
      title: `Revisar ${item.title}`,
      subject: item.materia || item.title,
      estimate: "10 min",
      reason: audit.nextAction,
      evidence: [
        `${audit.score}% de curadoria`,
        `Lacuna principal: ${audit.firstGap}`,
        `Conteúdo: ${item.kind}`,
      ],
      successCriterion: "Concluir quando a lacuna principal virar uma pergunta, exercício ou fonte rastreável.",
      primaryLabel: "Abrir conteúdo",
      tiagaoPrompt: `Tiagão, entra no modo corretor e me ajuda a melhorar o conteúdo "${item.title}". A lacuna principal é: ${audit.firstGap}. Quero uma ação objetiva para deixar esse material pronto para estudo.`,
      action: { kind: "open_conteudos", route: "/meus-conteudos" },
    });
  }

  if (args.recentPlan) {
    const dias = Array.isArray(args.recentPlan.plan?.dias) ? args.recentPlan.plan.dias.length : 0;
    const subject = args.recentPlan.materia || args.recentPlan.plan?.materia || args.focus;
    candidates.push({
      id: `plano:${args.recentPlan.id}:${args.recentPlan.createdAt}`,
      priority: 60,
      source: "plano_recente",
      sourceLabel: "plano recente",
      eyebrow: "Próxima melhor ação",
      title: `Continuar ${subject}`,
      subject,
      estimate: dias > 1 ? "25 min" : "15 min",
      reason: dias > 0
        ? `Você já tem um plano com ${dias} etapa${dias !== 1 ? "s" : ""}. O melhor agora é retomar antes de abrir outra frente.`
        : "Você tem um plano salvo. Retomar evita recomeçar do zero e mantém o estudo em movimento.",
      evidence: [
        dias > 0 ? `${dias} etapa${dias !== 1 ? "s" : ""} no plano` : "Plano salvo no histórico",
        "Continuidade detectada em /api/history",
      ],
      successCriterion: "Concluir quando você finalizar o próximo bloco do plano e registrar uma dúvida ou acerto.",
      primaryLabel: "Começar missão",
      tiagaoPrompt: `Tiagão, quero continuar minha missão de estudo em ${subject}. Me guia pelo próximo passo sem enrolar?`,
      action: { kind: "resume_plan" },
    });
  }

  candidates.push({
    id: `fallback:${args.focus}`,
    priority: 99,
    source: "fallback",
    sourceLabel: "fallback seguro",
    eyebrow: "Missão de estudo",
    title: "Definir foco e estudar 15 minutos",
    subject: args.focus,
    estimate: "15 min",
    reason: "Ainda não há dados suficientes de erro, simulado, Notebook ou curadoria. A recomendação usa um fallback determinístico e curto.",
    evidence: [
      "Sem missão recente do Caderno de Erros",
      "Sem sinal forte de simulado/Notebook/curadoria",
      "Fonte declarada: fallback seguro",
    ],
    successCriterion: "Concluir quando você responder uma pergunta de checagem sem ajuda.",
    primaryLabel: "Montar missão",
    tiagaoPrompt: `Tiagão, entra no modo treinador e monta uma missão de estudo de 15 minutos para ${args.focus}. Quero um passo claro, uma explicação curta e uma checagem no final.`,
    action: { kind: "ask_tiagao" },
  });

  return candidates.sort((a, b) => a.priority - b.priority)[0];
}
