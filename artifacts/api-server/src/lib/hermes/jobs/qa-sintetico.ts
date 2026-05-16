import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { openrouter, OR } from "../../aiClient";
import { fetchPlatformMetrics } from "../metrics";
import { insertAdminInbox, persistAcaoProativa, persistDescoberta } from "../persist";
import {
  formatHermesRecommendation,
  normalizeHermesRecommendation,
  withHermesRecommendationStandard,
  withRecommendationPayload,
  type HermesRecommendation,
} from "../recommendationStandard";
import { PREMIUM_MATERIAL_STANDARD_SUMMARY } from "../../pedagogy/premium-material-standard";
import { analyzeContentDatabases } from "./knowledge-index";

export type SyntheticQaPersonaId =
  | "aluno_fundamental"
  | "aluno_medio_enem"
  | "vestibulando_concurseiro"
  | "professor"
  | "gestor_instituicao";

export type SyntheticQaSeverity = "baixa" | "media" | "alta";

export interface SyntheticQaPersona {
  id: SyntheticQaPersonaId;
  nome: string;
  objetivo: string;
  criterios: string[];
}

export interface SyntheticQaJourney {
  id: string;
  titulo: string;
  personas: SyntheticQaPersonaId[];
  superficies: string[];
  checklist: string[];
  metricas: string[];
}

export interface SyntheticQaFinding {
  journeyId: string;
  personaId: SyntheticQaPersonaId;
  severity: SyntheticQaSeverity;
  summary: string;
  recommendation: HermesRecommendation;
  shouldCreateTask?: boolean;
  taskDescription?: string;
}

export interface SyntheticQaAuditResult {
  resumo: string;
  findings: SyntheticQaFinding[];
  snapshot: SyntheticQaSnapshot;
}

interface SyntheticQaSnapshot {
  periodoDias: number;
  generatedAt: string;
  platformMetrics: Awaited<ReturnType<typeof fetchPlatformMetrics>>;
  contentIndex: Awaited<ReturnType<typeof analyzeContentDatabases>>;
  tableSignals: Array<{
    table: string;
    exists: boolean;
    total?: number;
    recent?: number;
    note?: string;
  }>;
  routeInventory: Array<{
    surface: string;
    routes: string[];
    personaHints: SyntheticQaPersonaId[];
  }>;
  pedagogicalMaterialStandard: typeof PREMIUM_MATERIAL_STANDARD_SUMMARY;
  safetyRules: string[];
}

export const SYNTHETIC_QA_PERSONAS: SyntheticQaPersona[] = [
  {
    id: "aluno_fundamental",
    nome: "Aluno ensino fundamental",
    objetivo: "Entender explicações passo a passo, com linguagem simples e exemplos concretos.",
    criterios: [
      "Vocabulário adequado à série",
      "Explicação gradual sem pular etapas",
      "Feedback encorajador",
      "Não expor conteúdo avançado sem contextualizar",
    ],
  },
  {
    id: "aluno_medio_enem",
    nome: "Aluno ensino médio/ENEM",
    objetivo: "Estudar com foco em habilidade, treino e revisão para provas.",
    criterios: [
      "Conecta teoria com questões ENEM",
      "Mostra estratégia de resolução",
      "Indica próximos passos de estudo",
      "Evita respostas vagas ou excessivamente longas",
    ],
  },
  {
    id: "vestibulando_concurseiro",
    nome: "Vestibulando/concurseiro",
    objetivo: "Priorizar eficiência, acurácia e lacunas para prova competitiva.",
    criterios: [
      "Diagnóstico de erro e prioridade",
      "Conteúdo preciso e verificável",
      "Plano curto orientado a desempenho",
      "Atenção a simulados, revisões e recorrência",
    ],
  },
  {
    id: "professor",
    nome: "Professor",
    objetivo: "Preparar, revisar e adaptar conteúdo para turma com segurança pedagógica.",
    criterios: [
      "Controle sobre conteúdo gerado",
      "Evidência de alinhamento pedagógico",
      "Relatórios úteis por turma",
      "Sugestões acionáveis sem substituir julgamento docente",
    ],
  },
  {
    id: "gestor_instituicao",
    nome: "Gestor de instituição",
    objetivo: "Acompanhar uso, qualidade, risco e impacto em turmas ou unidade.",
    criterios: [
      "Métricas agregadas compreensíveis",
      "Sinais de risco e oportunidade",
      "Privacidade e segurança de dados",
      "Ações claras para coordenação",
    ],
  },
];

export const SYNTHETIC_QA_JOURNEYS: SyntheticQaJourney[] = [
  {
    id: "aluno_plano_estudo",
    titulo: "Aluno pede plano de estudo",
    personas: ["aluno_fundamental", "aluno_medio_enem", "vestibulando_concurseiro"],
    superficies: ["/api/trilha", "/api/studyai", "/api/chat"],
    checklist: [
      "Coleta objetivo, prazo e nível do aluno",
      "Entrega plano com etapas, frequência e revisão",
      "Adapta linguagem à persona",
      "Não promete resultado garantido",
    ],
    metricas: ["atividadeEstudoPeriodo", "retenção 7d", "conclusão de trilha"],
  },
  {
    id: "aluno_simulado_questao",
    titulo: "Aluno faz simulado ou questão ENEM",
    personas: ["aluno_medio_enem", "vestibulando_concurseiro"],
    superficies: ["/api/simulado", "/api/simulado-enem", "/api/enem-bank"],
    checklist: [
      "Questões têm enunciado, alternativas e gabarito consistentes",
      "Questões carregam objetivo, habilidade, pré-requisitos, erro comum e fonte quando possível",
      "Feedback explica por que a alternativa correta vence",
      "Resultado vira recomendação de estudo",
      "Falhas de banco não bloqueiam toda a jornada",
    ],
    metricas: ["simuladosPeriodo", "taxa de conclusão", "questões respondidas"],
  },
  {
    id: "tiagao_duvida_voz_texto",
    titulo: "Aluno usa Tiagão por voz/texto para tirar dúvida",
    personas: ["aluno_fundamental", "aluno_medio_enem", "vestibulando_concurseiro"],
    superficies: ["/api/chat", "/api/math", "/api/videos"],
    checklist: [
      "Resposta reconhece a dúvida antes de resolver",
      "Inclui passos verificáveis em matemática",
      "Sugere multimídia apenas quando útil",
      "Não vaza contexto interno Hermes",
    ],
    metricas: ["latência percebida", "resolução da dúvida", "reuso de chat"],
  },
  {
    id: "notebook_rag_lousa",
    titulo: "Aluno usa notebook/RAG ou lousa",
    personas: ["aluno_medio_enem", "vestibulando_concurseiro", "professor"],
    superficies: ["/api/notebook", "/api/rag-multi", "/api/board", "/api/aula-ia"],
    checklist: [
      "Recuperação cita ou descreve fonte de forma confiável",
      "Conteúdo gerado mantém estrutura didática",
      "Material gerado segue o padrão premium de metadados pedagógicos",
      "Lousa/material não fica preso em estado de geração",
      "Fallback é claro quando não há fonte suficiente",
    ],
    metricas: ["documentos indexados", "aulas pendentes", "erros de RAG"],
  },
  {
    id: "professor_gestor_relatorios",
    titulo: "Professor/gestor revisa turma, conteúdo, métricas ou relatórios",
    personas: ["professor", "gestor_instituicao"],
    superficies: ["/api/professor", "/api/teacher", "/api/institution", "/api/analytics"],
    checklist: [
      "Mostra métricas úteis sem expor dados indevidos",
      "Distingue turma, aluno e instituição",
      "Sugere ação pedagógica ou operacional concreta",
      "Permite revisão humana antes de qualquer intervenção",
    ],
    metricas: ["uso por turma", "alunos em risco", "conteúdos revisados"],
  },
  {
    id: "admin_hermes_review",
    titulo: "Admin revisa sugestões Hermes",
    personas: ["gestor_instituicao"],
    superficies: ["/api/agents/hermes/status", "/api/agents/inbox", "Admin Hermes"],
    checklist: [
      "Toda recomendação tem evidência e critério de aceite",
      "Ações destrutivas exigem aprovação humana",
      "Inbox separa alerta, descoberta e ação pendente",
      "Admin consegue rastrear agente, área e superfície afetada",
    ],
    metricas: ["recomendações pendentes", "tempo de triagem", "taxa de aceite"],
  },
];

const SAFETY_RULES = [
  "Não alterar conteúdo de produção, dados de alunos, turmas, assinaturas ou relatórios automaticamente.",
  "Não executar ações destrutivas; gerar recomendação, inbox e tarefa de triagem quando necessário.",
  "Correções de código devem acontecer via fluxo de desenvolvimento/revisão, nunca como mutação de estado vivo.",
  "Não inventar métricas: quando não houver dado, marcar como lacuna de observabilidade.",
];

const ROUTE_INVENTORY: SyntheticQaSnapshot["routeInventory"] = [
  {
    surface: "Aluno/Tiagão",
    routes: ["/api/chat", "/api/studyai", "/api/math", "/api/videos"],
    personaHints: ["aluno_fundamental", "aluno_medio_enem", "vestibulando_concurseiro"],
  },
  {
    surface: "Simulados e questões",
    routes: ["/api/simulado", "/api/simulado-adaptativo", "/api/simulado-enem", "/api/enem-bank"],
    personaHints: ["aluno_medio_enem", "vestibulando_concurseiro"],
  },
  {
    surface: "Notebook/RAG/lousa",
    routes: ["/api/notebook", "/api/rag-multi", "/api/board", "/api/aula-ia"],
    personaHints: ["aluno_medio_enem", "vestibulando_concurseiro", "professor"],
  },
  {
    surface: "Professor e instituição",
    routes: ["/api/professor", "/api/teacher", "/api/institution", "/api/analytics"],
    personaHints: ["professor", "gestor_instituicao"],
  },
  {
    surface: "Admin Hermes",
    routes: ["/api/agents/hermes/status", "/api/agents/inbox", "/api/agents/qa_sintetico/*"],
    personaHints: ["gestor_instituicao"],
  },
];

const TABLE_SIGNAL_CANDIDATES = [
  "users",
  "user_activity",
  "simulado_results",
  "hermes_descobertas_globais",
  "hermes_acoes_proativas",
  "hermes_admin_inbox",
  "hermes_tarefas",
  "knowledge_documents",
  "board_lessons",
  "notebooks",
  "teacher_content",
  "institution_classes",
] as const;

async function tableExists(tableName: string): Promise<boolean> {
  const res = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS exists
  `);
  return Boolean((res.rows[0] as { exists?: boolean })?.exists);
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const res = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName} AND column_name = ${columnName}
    ) AS exists
  `);
  return Boolean((res.rows[0] as { exists?: boolean })?.exists);
}

async function countRows(tableName: (typeof TABLE_SIGNAL_CANDIDATES)[number]): Promise<number> {
  const res = await db.execute(sql.raw(`SELECT COUNT(*)::int AS total FROM ${tableName}`));
  return Number((res.rows[0] as { total?: number })?.total ?? 0);
}

async function countRecentRows(
  tableName: (typeof TABLE_SIGNAL_CANDIDATES)[number],
  periodoDias: number,
): Promise<number | undefined> {
  if (!(await columnExists(tableName, "created_at"))) return undefined;
  const res = await db.execute(
    sql.raw(
      `SELECT COUNT(*)::int AS total FROM ${tableName} WHERE created_at >= NOW() - INTERVAL '${periodoDias} days'`,
    ),
  );
  return Number((res.rows[0] as { total?: number })?.total ?? 0);
}

async function fetchTableSignals(periodoDias: number): Promise<SyntheticQaSnapshot["tableSignals"]> {
  const signals: SyntheticQaSnapshot["tableSignals"] = [];

  for (const table of TABLE_SIGNAL_CANDIDATES) {
    try {
      const exists = await tableExists(table);
      if (!exists) {
        signals.push({ table, exists, note: "Tabela não encontrada neste ambiente." });
        continue;
      }
      signals.push({
        table,
        exists,
        total: await countRows(table),
        recent: await countRecentRows(table, periodoDias),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      signals.push({ table, exists: false, note: message.slice(0, 180) });
    }
  }

  return signals;
}

export async function buildSyntheticQaSnapshot(periodoDias = 7): Promise<SyntheticQaSnapshot> {
  const dias = Math.max(1, Math.min(30, Math.floor(periodoDias)));
  const [platformMetrics, contentIndex, tableSignals] = await Promise.all([
    fetchPlatformMetrics(dias),
    analyzeContentDatabases(),
    fetchTableSignals(dias),
  ]);

  return {
    periodoDias: dias,
    generatedAt: new Date().toISOString(),
    platformMetrics,
    contentIndex,
    tableSignals,
    routeInventory: ROUTE_INVENTORY,
    pedagogicalMaterialStandard: PREMIUM_MATERIAL_STANDARD_SUMMARY,
    safetyRules: SAFETY_RULES,
  };
}

function findJourney(journeyId: string): SyntheticQaJourney | undefined {
  return SYNTHETIC_QA_JOURNEYS.find((journey) => journey.id === journeyId);
}

function normalizeSeverity(value: unknown): SyntheticQaSeverity {
  if (typeof value !== "string") return "media";
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  if (normalized === "alta" || normalized === "high") return "alta";
  if (normalized === "baixa" || normalized === "low") return "baixa";
  return "media";
}

function fallbackRecommendationFor(
  journey: SyntheticQaJourney,
  personaId: SyntheticQaPersonaId,
  snapshot: SyntheticQaSnapshot,
): HermesRecommendation {
  return {
    agentId: "qa_sintetico",
    area: "qa_sintetico",
    targetSurface: journey.superficies.join(", "),
    observedState: `Auditoria sintética ${journey.titulo} para ${personaId}; período ${snapshot.periodoDias}d.`,
    evidence: JSON.stringify({
      journeyId: journey.id,
      personaId,
      platformMetrics: snapshot.platformMetrics,
      contentGaps: snapshot.contentIndex.contentGaps.slice(0, 5),
      pedagogicalMaterialStandard: snapshot.pedagogicalMaterialStandard,
    }),
    problemOpportunity:
      "A jornada precisa de validação contínua por persona para detectar regressões de qualidade, usabilidade e conteúdo.",
    recommendedChange: `Executar checklist '${journey.titulo}' e corrigir o primeiro item sem evidência suficiente: ${journey.checklist[0]}.`,
    expectedImpact: "Reduzir bugs percebidos por usuários reais e melhorar qualidade das recomendações pedagógicas.",
    confidence: "media",
    successMetric: journey.metricas.join("; "),
    implementationNotes: "Primeira versão usa snapshots estruturados; automação browser fica para fase posterior.",
    acceptanceCriteria: journey.checklist,
  };
}

function buildDeterministicFindings(snapshot: SyntheticQaSnapshot): SyntheticQaFinding[] {
  const findings: SyntheticQaFinding[] = [];
  const simuladoJourney = findJourney("aluno_simulado_questao")!;
  if (snapshot.platformMetrics.assinantesAtivos > 0 && snapshot.platformMetrics.simuladosPeriodo === 0) {
    const recommendation = fallbackRecommendationFor(
      simuladoJourney,
      "aluno_medio_enem",
      snapshot,
    );
    findings.push({
      journeyId: simuladoJourney.id,
      personaId: "aluno_medio_enem",
      severity: "alta",
      summary: "Base pagante ativa sem simulados concluídos no período analisado.",
      recommendation: {
        ...recommendation,
        observedState: `${snapshot.platformMetrics.assinantesAtivos} assinante(s) ativo(s), mas 0 simulados no período de ${snapshot.periodoDias}d.`,
        problemOpportunity:
          "A jornada de simulado pode estar pouco visível, quebrada ou sem conversão para treino real.",
        recommendedChange:
          "Revisar entrada de simulado no produto e criar teste de API para iniciar, responder e finalizar uma questão ENEM.",
        confidence: "alta",
        acceptanceCriteria: [
          "Teste cobre início, resposta e resultado de simulado ENEM",
          "Admin enxerga simuladosPeriodo > 0 após uso real ou teste controlado",
          "Aluno recebe feedback explicativo ao finalizar questão",
        ],
      },
      shouldCreateTask: true,
      taskDescription: "Preparar roteiro de teste da jornada de simulado ENEM.",
    });
  }

  const ragJourney = findJourney("notebook_rag_lousa")!;
  if (snapshot.contentIndex.contentGaps.length > 0) {
    const recommendation = fallbackRecommendationFor(ragJourney, "professor", snapshot);
    findings.push({
      journeyId: ragJourney.id,
      personaId: "professor",
      severity: "media",
      summary: "Índice de conteúdo tem lacunas que podem afetar notebook/RAG/lousa.",
      recommendation: {
        ...recommendation,
        observedState: `Lacunas detectadas: ${snapshot.contentIndex.contentGaps.slice(0, 4).join("; ")}.`,
        problemOpportunity:
          "Professor e aluno podem receber respostas sem fonte suficiente ou materiais incompletos nessas áreas.",
        recommendedChange:
          "Priorizar ingestão/curadoria das lacunas antes de ampliar uso de RAG nessas jornadas.",
        confidence: "alta",
        successMetric: "contentIndex.contentGaps reduzido e respostas RAG com fonte suficiente.",
      },
      shouldCreateTask: false,
    });
  }

  const hermesJourney = findJourney("admin_hermes_review")!;
  const missingSignals = snapshot.tableSignals.filter((signal) => !signal.exists).slice(0, 4);
  if (missingSignals.length > 0) {
    const recommendation = fallbackRecommendationFor(hermesJourney, "gestor_instituicao", snapshot);
    findings.push({
      journeyId: hermesJourney.id,
      personaId: "gestor_instituicao",
      severity: "baixa",
      summary: "Algumas tabelas opcionais de observabilidade não existem neste ambiente.",
      recommendation: {
        ...recommendation,
        targetSurface: "observabilidade/qa-sintetico",
        observedState: `Tabelas ausentes: ${missingSignals.map((signal) => signal.table).join(", ")}.`,
        problemOpportunity:
          "Sem esses sinais, a auditoria sintética fica menos precisa para certas jornadas.",
        recommendedChange:
          "Confirmar quais tabelas são esperadas em produção e documentar lacunas de observabilidade por ambiente.",
        confidence: "media",
        successMetric: "Snapshot QA mostra sinais esperados ou lacunas explicitamente justificadas.",
      },
      shouldCreateTask: false,
    });
  }

  return findings.slice(0, 3);
}

function parseModelFindings(raw: string, snapshot: SyntheticQaSnapshot): {
  resumo?: string;
  findings: SyntheticQaFinding[];
} {
  let parsed: { resumo?: string; findings?: Array<Record<string, unknown>> } = {};
  try {
    parsed = JSON.parse(raw) as { resumo?: string; findings?: Array<Record<string, unknown>> };
  } catch {
    return { findings: [] };
  }

  const rows = Array.isArray(parsed.findings) ? parsed.findings.slice(0, 4) : [];
  const findings = rows.flatMap((row): SyntheticQaFinding[] => {
    const journeyId = typeof row.journeyId === "string" ? row.journeyId : "";
    const journey = findJourney(journeyId);
    if (!journey) return [];

    const personaId = journey.personas.includes(row.personaId as SyntheticQaPersonaId)
      ? (row.personaId as SyntheticQaPersonaId)
      : journey.personas[0]!;
    const fallback = fallbackRecommendationFor(journey, personaId, snapshot);
    const recommendation = normalizeHermesRecommendation(row.recommendation, fallback);
    const summary =
      typeof row.summary === "string" && row.summary.trim()
        ? row.summary.trim()
        : formatHermesRecommendation(recommendation);

    return [
      {
        journeyId: journey.id,
        personaId,
        severity: normalizeSeverity(row.severity),
        summary,
        recommendation: { ...recommendation, agentId: "qa_sintetico" },
        shouldCreateTask: row.shouldCreateTask === true,
        taskDescription:
          typeof row.taskDescription === "string" ? row.taskDescription.trim().slice(0, 500) : undefined,
      },
    ];
  });

  return { resumo: parsed.resumo, findings };
}

async function persistSyntheticQaFinding(
  finding: SyntheticQaFinding,
  snapshot: SyntheticQaSnapshot,
  enqueueTasks: boolean,
): Promise<void> {
  const journey = findJourney(finding.journeyId);
  const payload = withRecommendationPayload(
    {
      kind: "synthetic_qa",
      journeyId: finding.journeyId,
      journeyTitle: journey?.titulo,
      personaId: finding.personaId,
      severity: finding.severity,
      safetyRules: SAFETY_RULES,
      snapshot: {
        periodoDias: snapshot.periodoDias,
        generatedAt: snapshot.generatedAt,
        platformMetrics: snapshot.platformMetrics,
        contentGaps: snapshot.contentIndex.contentGaps.slice(0, 8),
        pedagogicalMaterialStandard: snapshot.pedagogicalMaterialStandard,
      },
    },
    finding.recommendation,
  );

  await persistDescoberta(
    "qa_sintetico",
    `[QA sintético] ${finding.summary}`.slice(0, 1200),
    payload,
    finding.severity === "alta" ? 4 : finding.severity === "media" ? 3 : 2,
  );

  if (finding.severity === "alta" || finding.shouldCreateTask) {
    await persistAcaoProativa(
      "qa_sintetico",
      `qa_${finding.journeyId}`.slice(0, 80),
      finding.summary,
      payload,
    );
    await insertAdminInbox(
      "qa_sintetico",
      "qa_sintetico",
      `QA sintético: ${journey?.titulo ?? finding.journeyId}`,
      finding.summary,
      payload,
    );
  }

  if (enqueueTasks && finding.shouldCreateTask) {
    const { enqueueTask } = await import("../tasks/queue");
    await enqueueTask("qa_sintetico", "mensagem", {
      source: "qa_sintetico",
      descricao:
        finding.taskDescription ??
        `Preparar plano de triagem para ${journey?.titulo ?? finding.journeyId}.`,
      recommendation: finding.recommendation,
      safetyRules: SAFETY_RULES,
    }).catch((err) => console.warn("[hermes/qa_sintetico] enqueueTask:", err));
  }
}

export async function runSyntheticQaAudit(opts: {
  periodoDias?: number;
  persist?: boolean;
  enqueueTasks?: boolean;
  requestedBy?: string;
} = {}): Promise<SyntheticQaAuditResult> {
  const snapshot = await buildSyntheticQaSnapshot(opts.periodoDias ?? 7);
  const fallbackFindings = buildDeterministicFindings(snapshot);

  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content: withHermesRecommendationStandard(
          [
            "Você é o agente qa_sintetico do StudyAI.",
            "Simule especialistas e usuários reais a partir de personas, jornadas, métricas e snapshots estruturados.",
            "Avalie qualidade de produto, performance percebida, usabilidade, bugs prováveis e qualidade pedagógica/conteúdo.",
            "Use o padrão premium de material pedagógico do snapshot como rubrica para conteúdo gerado, importado ou curado.",
            "Não use navegador. Não invente métricas. Não proponha mutação destrutiva de dados/conteúdo de produção.",
            "Retorne JSON estrito: { resumo: string, findings: [{ journeyId, personaId, severity: 'baixa'|'media'|'alta', summary, shouldCreateTask?: boolean, taskDescription?: string, recommendation }] }.",
            "Gere no máximo 4 findings e prefira recomendações específicas com critério de aceite.",
          ].join(" "),
        ),
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            requestedBy: opts.requestedBy ?? "cron",
            personas: SYNTHETIC_QA_PERSONAS,
            journeys: SYNTHETIC_QA_JOURNEYS,
            snapshot,
            deterministicFindings: fallbackFindings,
          },
          null,
          2,
        ).slice(0, 24_000),
      },
    ],
    max_tokens: 1800,
    temperature: 0.25,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  const parsed = parseModelFindings(raw, snapshot);
  const findings = (parsed.findings.length > 0 ? parsed.findings : fallbackFindings).slice(0, 4);
  const resumo =
    parsed.resumo?.trim() ||
    `Auditoria sintética executada com ${findings.length} recomendação(ões) priorizada(s).`;

  if (opts.persist !== false) {
    for (const finding of findings) {
      await persistSyntheticQaFinding(finding, snapshot, opts.enqueueTasks === true);
    }
  }

  console.info("[qa_sintetico/audit]", findings.length, "finding(s)");
  return { resumo, findings, snapshot };
}

/** Conservador: entra no daily-learn; para semanal, agende daily-learn semanalmente ou dispare rota manual. */
export async function qaSinteticoDailyLearn(): Promise<void> {
  await runSyntheticQaAudit({ persist: true, enqueueTasks: false, requestedBy: "daily_learn" });
}
