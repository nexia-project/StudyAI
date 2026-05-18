import { db } from "@workspace/db";
import { cadernoNotesTable, simuladoResultsTable } from "@workspace/db/schema";
import { desc, sql } from "drizzle-orm";
import { fetchInactiveUserPatterns } from "../retention-metrics";
import { insertAdminInbox, persistDescoberta } from "../persist";
import {
  formatHermesRecommendation,
  withRecommendationPayload,
  type HermesRecommendation,
} from "../recommendationStandard";
import {
  PREMIUM_QUALITY_LOOP_MODULES,
  buildSyntheticQaSnapshot,
} from "./qa-sintetico";
import { analyzeContentDatabases } from "./knowledge-index";

type HermesDorRealStatus = "existing" | "partial" | "new" | "todo";
type HermesDorRealRole = "student" | "teacher" | "institution" | "admin";

export interface HermesDorRealAgentCatalogItem {
  id: string;
  priority: number;
  name: string;
  productRole: HermesDorRealRole;
  status: HermesDorRealStatus;
  responsibility: string;
  observedSignals: string[];
  evidence: string[];
  metrics: string[];
  actions: string[];
  safetyBoundaries: string[];
  adminOutput: string;
  overlaps: string[];
}

export const HERMES_DOR_REAL_AGENT_CATALOG: HermesDorRealAgentCatalogItem[] = [
  {
    id: "auditor_pedagogico",
    priority: 1,
    name: "Auditor Pedagogico",
    productRole: "admin",
    status: "new",
    responsibility:
      "Auditar qualidade pedagogica de materiais, respostas e jornadas sem substituir revisao humana.",
    observedSignals: [
      "metadata pedagogica ausente ou fraca",
      "fontes/exercicios/exemplos/checkpoints ausentes",
      "conteudo gerado com baixa aderencia ao padrao premium",
      "lacunas de CQO/conteudo por materia",
    ],
    evidence: [
      "premium material standard",
      "generated_content",
      "knowledge_documents",
      "contentIndex.contentGaps",
      "qa_sintetico.pedagogicalMaterialStandard",
    ],
    metrics: [
      "materiais com objetivo/fonte/exercicio/checkpoint",
      "contentIndex.contentGaps",
      "postuladoCoverageRatio",
      "recomendacoes pedagogicas aceitas",
    ],
    actions: [
      "abrir recomendacao de curadoria",
      "priorizar ingestao/ajuste de fonte",
      "pedir revisao humana de material fraco",
    ],
    safetyBoundaries: [
      "nao altera conteudo em producao automaticamente",
      "nao aprova material sem revisao humana",
      "nao inventa nota de qualidade quando faltam sinais",
    ],
    adminOutput: "Descoberta Hermes com evidencia, impacto, recomendacao e criterios de aceite.",
    overlaps: ["qa_sintetico", "cqo_conteudo", "premium-material-standard"],
  },
  {
    id: "notebook_rag_quality",
    priority: 2,
    name: "Notebook RAG Quality",
    productRole: "student",
    status: "new",
    responsibility:
      "Auditar qualidade de Notebook/RAG, visual, exportacao, fallback e feedback negativo.",
    observedSignals: [
      "visual slots unresolved",
      "deck/map fraco",
      "fallback usage",
      "notebook_feedback negativo",
      "export events",
      "fontes RAG insuficientes",
    ],
    evidence: [
      "notebook_material_generated",
      "teacher_notebook_output_generated",
      "notebook_feedback",
      "material_style_events",
      "contentIndex",
    ],
    metrics: [
      "visual slots resolvidos",
      "feedback negativo por material",
      "exports concluídos",
      "fallbacks por geracao",
      "content gaps que afetam RAG",
    ],
    actions: [
      "abrir tarefa de qualidade do material",
      "priorizar correção de preview/export",
      "pedir instrumentacao quando sinal nao existe",
    ],
    safetyBoundaries: [
      "nao regenera material automaticamente",
      "nao apaga fonte/documento do usuario",
      "nao envia feedback externo sem aprovacao",
    ],
    adminOutput: "Recomendacao de qualidade Notebook com modulo, evidencia e criterio de aceite.",
    overlaps: ["qa_sintetico.notebook_rag_lousa", "cqo_conteudo", "knowledge-index"],
  },
  {
    id: "student_success",
    priority: 3,
    name: "Student Success",
    productRole: "student",
    status: "existing",
    responsibility:
      "Detectar aluno travado, risco de inatividade/churn e recomendar intervencoes seguras com acao e metrica.",
    observedSignals: [
      "assinantes sem estudo",
      "usuarios sem atividade",
      "erros repetidos em simulado",
      "simulado iniciado e nao concluido",
      "muito chat sem pratica",
      "sem proxima missao estruturada",
    ],
    evidence: [
      "users",
      "user_activity",
      "simulado_results",
      "activity_events",
      "flashcard_sessions",
      "study_schedules/study_plans",
    ],
    metrics: [
      "reativacao 7d",
      "sessoes de estudo",
      "praticas concluidas",
      "recuperacao de simulado",
      "missao ativa/CTA",
    ],
    actions: [
      "plano de reengajamento",
      "converter chat em pratica",
      "priorizar Caderno/Simulado",
      "mensagem por fila Hermes",
      "revisar onboarding",
    ],
    safetyBoundaries: [
      "nao envia mensagem real sem aprovacao",
      "nao altera plano ou dados do aluno automaticamente",
      "nao expõe PII desnecessaria",
    ],
    adminOutput: "Acoes proativas, inbox e payload estruturado com sinal, acao e metrica.",
    overlaps: ["sucesso_aluno"],
  },
  {
    id: "professor_success",
    priority: 4,
    name: "Professor Success",
    productRole: "teacher",
    status: "new",
    responsibility:
      "Detectar baixa ativacao docente, diagnostico sem acao e lacunas de uso em turma/material.",
    observedSignals: [
      "professor sem turma ativa",
      "baixo export de relatorio",
      "baixo uso do Notebook do Professor",
      "alunos em risco",
      "diagnostico sem intervencao",
    ],
    evidence: [
      "institution_classes",
      "teacher_content",
      "teacher_notebook_output_generated",
      "reports/CSV",
      "inactive user patterns",
    ],
    metrics: [
      "turmas ativas",
      "exports de relatorio",
      "outputs do Notebook Professor",
      "intervencoes registradas",
      "alunos reativados",
    ],
    actions: [
      "abrir recomendacao de setup docente",
      "sugerir rotina de intervencao",
      "pedir instrumentacao de relatorio/export quando ausente",
    ],
    safetyBoundaries: [
      "nao contata aluno/familia automaticamente",
      "nao cria risco individual sem dado observado",
      "nao substitui decisao pedagogica do professor",
    ],
    adminOutput: "Descoberta/inbox com proxima acao docente e lacunas de dados.",
    overlaps: ["qa_sintetico.professor_gestor_relatorios", "sucesso_aluno"],
  },
  {
    id: "simulado_intelligence",
    priority: 5,
    name: "Simulado Intelligence",
    productRole: "student",
    status: "new",
    responsibility:
      "Avaliar simulados ENEM/concursos por qualidade das questoes, valor de aprendizagem, metadados e conclusao da jornada.",
    observedSignals: [
      "questoes/blocos com erro muito alto",
      "suspeita de gabarito errado por padrao agregado",
      "competencia/habilidade/classificacao ausente ou fraca",
      "baixa discriminacao por materia/bloco",
      "erros por interpretacao versus conteudo",
      "simulado iniciado e nao concluido",
      "missao de recuperacao enviada/concluida",
    ],
    evidence: [
      "simulado_results",
      "simulado_results.answers",
      "activity_events.simulado_started/completed",
      "Caderno de Erros",
      "qa_sintetico.simulado_premium",
    ],
    metrics: [
      "taxa de conclusao started->completed",
      "erro medio por materia/bloco",
      "cobertura de answers/metadados por questao",
      "desvio padrao de score por materia",
      "erros enviados ao Caderno",
      "recuperacao concluida",
    ],
    actions: [
      "auditar questoes ou gabarito suspeito",
      "priorizar habilidade/materia fraca",
      "completar competencia/habilidade/classificacao",
      "abrir revisao no Caderno",
      "sugerir treino curto por interpretacao ou conteudo",
      "pedir instrumentacao granular quando faltar sinal",
    ],
    safetyBoundaries: [
      "nao promete nota/aprovacao",
      "nao altera gabarito automaticamente",
      "nao inventa competencia/habilidade sem metadado",
      "nao classifica questao individual sem evidencia granular",
    ],
    adminOutput: "Descoberta/inbox Hermes com recomendacao estruturada para Simulado.",
    overlaps: ["qa_sintetico.simulado_premium", "Caderno de Erros premium", "sucesso_aluno"],
  },
  {
    id: "caderno_erros_intelligence",
    priority: 6,
    name: "Caderno de Erros Intelligence",
    productRole: "student",
    status: "new",
    responsibility:
      "Transformar erros salvos no Caderno em inteligencia de revisao, recorrencia, recuperacao e lacunas de instrumentacao.",
    observedSignals: [
      "notas de revisao por materia/habilidade",
      "causas provaveis recorrentes",
      "revisao salva/processada no Caderno",
      "simulado posterior na mesma materia",
      "missoes locais sem persistencia backend",
    ],
    evidence: [
      "caderno_notes",
      "simulado_results",
      "studyai:hermes-learning-signal",
      "error review draft/mission/history localStorage",
    ],
    metrics: [
      "revisoes salvas/processadas",
      "recorrencia por materia/habilidade",
      "tempo ate acerto posterior por materia",
      "missoes pendentes sem backend",
    ],
    actions: [
      "abrir missao de revisao",
      "sugerir exercicio similar",
      "alertar professor/admin para recorrencia",
      "pedir instrumentacao quando nao houver sinal persistido",
    ],
    safetyBoundaries: [
      "nao cria progresso global falso",
      "nao afirma recuperacao por item quando so existe dado por materia",
      "nao contata professor/aluno automaticamente",
      "acoes do aluno sao explicitas",
    ],
    adminOutput: "Descoberta/inbox Hermes com recomendacao estruturada para Caderno de Erros.",
    overlaps: ["qa_sintetico.caderno_erros_premium", "Home next-best-action", "Simulado Intelligence"],
  },
  {
    id: "custos_ia_optimizer",
    priority: 7,
    name: "Custos IA Optimizer",
    productRole: "admin",
    status: "new",
    responsibility: "Reduzir custo IA sem degradar qualidade pedagogica.",
    observedSignals: [
      "custo por feature",
      "custo por aluno ativo",
      "custo por material gerado",
      "modelo caro sem ganho aparente",
      "prompts longos/chamadas com muitos tokens",
      "falhas/retries/fallbacks",
      "oportunidades e desperdicio de cache",
      "billing provider ausente versus logs internos",
    ],
    evidence: ["Admin IA & Custos", "ai_cost_log", "ai_response_cache", "activity_events"],
    metrics: [
      "custo por entrega util",
      "custo por aluno ativo",
      "custo por material gerado",
      "taxa de cache hit/reuso",
      "tokens medios por chamada",
      "billing reconciliado",
    ],
    actions: [
      "recomendar cache por feature",
      "recomendar roteamento de modelo para revisao humana",
      "pedir limite/compactacao de prompt",
      "pedir configuracao de billing real",
      "abrir alerta de custo auditavel",
    ],
    safetyBoundaries: [
      "nao troca provider/modelo automaticamente",
      "nao reduz qualidade pedagogica sem metrica de aceite",
      "nao soma fatura real com log interno sem reconciliacao",
      "nao limpa cache automaticamente",
    ],
    adminOutput: "Descoberta/inbox Hermes com recomendacao estruturada para Admin IA & Custos.",
    overlaps: ["gestao", "monitor", "Admin IA & Custos"],
  },
  {
    id: "ux_product_auditor",
    priority: 8,
    name: "UX/Product Auditor",
    productRole: "admin",
    status: "new",
    responsibility:
      "Auditar friccao de produto, clareza de CTA, descoberta de funcionalidades e jornadas por papel sem repetir a auditoria landing-only.",
    observedSignals: [
      "telas/fluxos confusos",
      "fluxos abandonados",
      "botoes unused/hidden",
      "menu/rotas duplicadas",
      "texto excessivo",
      "estados vazio/loading/erro fracos",
      "risco de layout mobile",
      "feedback negativo por modulo",
    ],
    evidence: ["qa_sintetico.premiumQualityLoop", "ux_layout.landing_only", "activity_events", "App Shell"],
    metrics: [
      "cliques ate acao",
      "taxa de abandono por fluxo",
      "uso de CTA por modulo",
      "rotas/menu duplicados resolvidos",
      "feedback negativo triado",
      "QA mobile aprovado",
    ],
    actions: [
      "abrir recomendacao UX estruturada",
      "pedir QA manual mobile por modulo",
      "priorizar simplificacao de menu/CTA",
      "pedir instrumentacao quando faltar sinal",
    ],
    safetyBoundaries: [
      "nao remove rota funcional sem validacao",
      "nao esconde CTA principal sem experimento ou QA",
      "nao inventa abandono quando activity_events esta ausente",
      "nao executa autofix de layout em producao",
    ],
    adminOutput: "Descoberta/inbox Hermes com recomendacao estruturada de UX/produto por modulo.",
    overlaps: ["qa_sintetico.premiumQualityLoop", "ux_layout.landing_only", "activity_events"],
  },
  {
    id: "content_gap_cqo_avancado",
    priority: 9,
    name: "Content Gap/CQO avancado",
    productRole: "admin",
    status: "new",
    responsibility:
      "Priorizar lacunas de conteudo por demanda real, cobertura BNCC/ENEM, fonte, qualidade e revisao humana.",
    observedSignals: [
      "topicos com demanda e sem conteudo/postulados",
      "cobertura BNCC/ENEM ausente ou fraca",
      "material com qualidade baixa",
      "conteudo sem fonte",
      "topico popular com material fraco",
      "exercicios/exemplos/checkpoints ausentes",
      "material gerado antigo sem revisao",
    ],
    evidence: [
      "cqo_conteudo",
      "knowledge-index",
      "generated_content.payload",
      "knowledge_documents.metadata/tags/source_file",
      "knowledge_base.quality_score/access_count",
      "activity_events",
      "user_profile_memory.topicos_frequentes",
      "enem_questions",
    ],
    metrics: [
      "postuladoCoverageRatio",
      "lacunas priorizadas por demanda",
      "materiais com fonte",
      "materiais com exercicio/exemplo/checkpoint",
      "materiais revisados/aprovados",
      "cobertura BNCC/ENEM",
    ],
    actions: [
      "gerar/curar conteudo com fonte",
      "abrir tarefa de revisao humana",
      "priorizar ingestao de postulados/BNCC/ENEM",
      "alertar professor/admin",
      "medir aceite por lacuna fechada",
    ],
    safetyBoundaries: [
      "nao publica conteudo sem revisao",
      "nao inventa fonte, habilidade BNCC/ENEM ou score",
      "nao regenera material automaticamente",
    ],
    adminOutput: "Descoberta/inbox Hermes com lacunas priorizadas, acoes, metrica e criterios de aceite.",
    overlaps: ["cqo_conteudo", "knowledge-index"],
  },
  {
    id: "institution_success_b2b_roi",
    priority: 10,
    name: "Institution Success / B2B ROI",
    productRole: "institution",
    status: "partial",
    responsibility: "Medir adocao, risco e resultado institucional sem invadir privacidade.",
    observedSignals: ["turmas ativas", "adocao", "exports", "alunos em risco"],
    evidence: ["Professor", "Instituicao", "Relatorios B2B"],
    metrics: ["adocao por turma", "uso docente", "risco agregado", "ROI/valor percebido"],
    actions: ["abrir recomendacao de coordenacao", "priorizar onboarding institucional"],
    safetyBoundaries: ["sem ranking sensivel indevido", "revisao humana obrigatoria"],
    adminOutput: "Roadmap/TODO apos primeira leva.",
    overlaps: ["qa_sintetico.Relatorios B2B", "professor_success"],
  },
];

export function getHermesDorRealCatalog(): HermesDorRealAgentCatalogItem[] {
  return HERMES_DOR_REAL_AGENT_CATALOG;
}

function moduleByName(moduleName: string) {
  return PREMIUM_QUALITY_LOOP_MODULES.find((module) => module.module === moduleName);
}

function tableSignal(snapshot: Awaited<ReturnType<typeof buildSyntheticQaSnapshot>>, table: string) {
  return snapshot.tableSignals.find((signal) => signal.table === table);
}

type SimuladoMateriaSignal = {
  materia: string;
  attempts: number;
  avgScore: number;
  lowScoreAttempts: number;
  totalErrors: number;
  scoreStddev: number | null;
};

async function fetchSimuladoIntelligenceSignals(periodoDias = 14) {
  const snapshot = await buildSyntheticQaSnapshot(periodoDias);
  const simuladoTable = tableSignal(snapshot, "simulado_results");
  const activityEvents = tableSignal(snapshot, "activity_events");
  const hasSimulados = Boolean(simuladoTable?.exists);
  const hasActivityEvents = Boolean(activityEvents?.exists);
  const sinceIso = new Date(Date.now() - periodoDias * 24 * 60 * 60 * 1000).toISOString();

  const summary = {
    totalResults: 0,
    uniqueStudents: 0,
    avgScore: 0,
    lowScoreResults: 0,
    veryLowScoreResults: 0,
    totalErrors: 0,
    answersPayloadCount: 0,
  };
  let byMateria: SimuladoMateriaSignal[] = [];

  if (hasSimulados) {
    try {
      const res = await db.execute(sql`
        SELECT
          COUNT(*)::int AS total_results,
          COUNT(DISTINCT user_id)::int AS unique_students,
          COALESCE(ROUND(AVG(CASE WHEN total > 0 THEN score::numeric / NULLIF(total, 0) * 100 ELSE 0 END), 1), 0)::float AS avg_score,
          COUNT(*) FILTER (WHERE total > 0 AND score::numeric / NULLIF(total, 0) < 0.5)::int AS low_score_results,
          COUNT(*) FILTER (WHERE total > 0 AND score::numeric / NULLIF(total, 0) < 0.3)::int AS very_low_score_results,
          COALESCE(SUM(GREATEST(total - score, 0)), 0)::int AS total_errors,
          COUNT(*) FILTER (WHERE answers IS NOT NULL)::int AS answers_payload_count
        FROM simulado_results
        WHERE created_at >= ${sinceIso}
      `);
      const row = res.rows[0] as Record<string, unknown> | undefined;
      summary.totalResults = Number(row?.total_results ?? 0);
      summary.uniqueStudents = Number(row?.unique_students ?? 0);
      summary.avgScore = Number(row?.avg_score ?? 0);
      summary.lowScoreResults = Number(row?.low_score_results ?? 0);
      summary.veryLowScoreResults = Number(row?.very_low_score_results ?? 0);
      summary.totalErrors = Number(row?.total_errors ?? 0);
      summary.answersPayloadCount = Number(row?.answers_payload_count ?? 0);
    } catch {
      // A descoberta deve sobreviver a ambientes parcialmente migrados.
    }

    try {
      const res = await db.execute(sql`
        SELECT
          materia,
          COUNT(*)::int AS attempts,
          COALESCE(ROUND(AVG(CASE WHEN total > 0 THEN score::numeric / NULLIF(total, 0) * 100 ELSE 0 END), 1), 0)::float AS avg_score,
          COUNT(*) FILTER (WHERE total > 0 AND score::numeric / NULLIF(total, 0) < 0.5)::int AS low_score_attempts,
          COALESCE(SUM(GREATEST(total - score, 0)), 0)::int AS total_errors,
          ROUND(STDDEV_POP(CASE WHEN total > 0 THEN score::numeric / NULLIF(total, 0) * 100 ELSE 0 END), 1)::float AS score_stddev
        FROM simulado_results
        WHERE created_at >= ${sinceIso}
        GROUP BY materia
        ORDER BY low_score_attempts DESC, avg_score ASC, attempts DESC
        LIMIT 8
      `);
      byMateria = res.rows.map((row) => ({
        materia: String((row as Record<string, unknown>).materia ?? "Simulado"),
        attempts: Number((row as Record<string, unknown>).attempts ?? 0),
        avgScore: Number((row as Record<string, unknown>).avg_score ?? 0),
        lowScoreAttempts: Number((row as Record<string, unknown>).low_score_attempts ?? 0),
        totalErrors: Number((row as Record<string, unknown>).total_errors ?? 0),
        scoreStddev:
          (row as Record<string, unknown>).score_stddev == null
            ? null
            : Number((row as Record<string, unknown>).score_stddev),
      }));
    } catch {
      byMateria = [];
    }
  }

  const activity = {
    started: 0,
    completed: 0,
    abandoned: 0,
    completionRate: null as number | null,
  };

  if (hasActivityEvents) {
    try {
      const res = await db.execute(sql`
        WITH starts AS (
          SELECT user_id, created_at
          FROM activity_events
          WHERE event_type = 'simulado_started' AND created_at >= ${sinceIso}
        ),
        completions AS (
          SELECT user_id, created_at
          FROM activity_events
          WHERE event_type = 'simulado_completed' AND created_at >= ${sinceIso}
        )
        SELECT
          (SELECT COUNT(*)::int FROM starts) AS started,
          (SELECT COUNT(*)::int FROM completions) AS completed,
          COUNT(*) FILTER (
            WHERE NOT EXISTS (
              SELECT 1 FROM completions c
              WHERE c.user_id = s.user_id AND c.created_at >= s.created_at
            )
          )::int AS abandoned
        FROM starts s
      `);
      const row = res.rows[0] as Record<string, unknown> | undefined;
      activity.started = Number(row?.started ?? 0);
      activity.completed = Number(row?.completed ?? 0);
      activity.abandoned = Number(row?.abandoned ?? 0);
      activity.completionRate =
        activity.started > 0 ? Math.round((activity.completed / activity.started) * 100) : null;
    } catch {
      // Mantem lacuna de observabilidade em vez de quebrar o cron.
    }
  }

  const highErrorSubjects = byMateria.filter(
    (item) => item.attempts >= 3 && (item.avgScore < 45 || item.lowScoreAttempts >= 3),
  );
  const suspectedWrongAnswerKey = byMateria.filter(
    (item) => item.attempts >= 5 && item.avgScore < 25 && item.lowScoreAttempts / item.attempts >= 0.7,
  );
  const lowDiscriminationSubjects = byMateria.filter(
    (item) => item.attempts >= 5 && item.scoreStddev !== null && item.scoreStddev < 8,
  );
  const missingGranularMetadata =
    !hasSimulados || summary.totalResults === 0 || summary.answersPayloadCount < summary.totalResults;
  const poorCompletion =
    hasActivityEvents && activity.started > 0 && activity.completionRate !== null && activity.completionRate < 70;

  return {
    snapshot,
    periodoDias,
    tableSignals: { simuladoResults: simuladoTable, activityEvents },
    summary,
    byMateria,
    activity,
    highErrorSubjects,
    suspectedWrongAnswerKey,
    lowDiscriminationSubjects,
    missingGranularMetadata,
    poorCompletion,
  };
}

async function persistPainAgentRecommendation(
  recommendation: HermesRecommendation,
  payload: Record<string, unknown>,
  importancia: number,
  inbox?: { tipo: string; titulo: string; corpo: string },
): Promise<void> {
  await persistDescoberta(
    recommendation.agentId,
    formatHermesRecommendation(recommendation).slice(0, 1200),
    withRecommendationPayload(payload, recommendation),
    importancia,
  );

  if (inbox) {
    await insertAdminInbox(
      recommendation.agentId,
      inbox.tipo,
      inbox.titulo,
      inbox.corpo,
      withRecommendationPayload(payload, recommendation),
    );
  }
}

type CostOptimizerFeatureSignal = {
  feature: string;
  calls: number;
  uniqueUsers: number;
  costUsd: number;
  tokens: number;
  avgTokens: number;
  avgCostPerCall: number;
};

type CostOptimizerModelSignal = {
  provider: string;
  model: string;
  rawModel: string;
  calls: number;
  costUsd: number;
  tokens: number;
  avgCostPerCall: number;
  avgTokens: number;
  premiumLike: boolean;
};

type CostOptimizerLongCallSignal = {
  feature: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  totalTokens: number;
  costUsd: number;
  createdAt: string | null;
};

type CostOptimizerCacheSignal = {
  feature: string;
  entries: number;
  hits: number;
  hitRate: number;
  unusedEntries: number;
};

type CostOptimizerMissingBillingSignal = {
  provider: string;
  loggedCostUsd: number;
  loggedCalls: number;
  runtimeConfigured: boolean;
  billingConfigured: boolean;
  action: string;
};

async function safeTableExists(tableName: string): Promise<boolean> {
  try {
    const res = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${tableName}
      ) AS exists
    `);
    return Boolean((res.rows[0] as Record<string, unknown> | undefined)?.exists);
  } catch {
    return false;
  }
}

function configuredEnv(...names: string[]): boolean {
  return names.some((name) => {
    const value = process.env[name];
    return Boolean(value && value !== "dummy" && value.trim().length > 0);
  });
}

function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function normalizeProvider(rawModel: string): string {
  const model = rawModel.toLowerCase();
  if (model.startsWith("openai-direct:")) return "openai";
  if (model.includes("/")) return model.split("/")[0] ?? "nao_informado";
  if (model.startsWith("gpt-") || model.startsWith("text-embedding") || model.startsWith("whisper")) {
    return "openai";
  }
  if (model.includes("claude")) return "anthropic";
  if (model.includes("deepseek")) return "deepseek";
  if (model.includes("gemini")) return "gemini";
  return "nao_informado";
}

function normalizeModelName(rawModel: string): string {
  if (rawModel.includes("/")) return rawModel.slice(rawModel.indexOf("/") + 1);
  if (rawModel.includes(":")) return rawModel.slice(rawModel.indexOf(":") + 1);
  return rawModel || "nao_classificado";
}

function isPremiumLikeModel(rawModel: string): boolean {
  const model = rawModel.toLowerCase();
  return (
    model.includes("gpt-4o") && !model.includes("mini") ||
    model.includes("sonnet") ||
    model.includes("opus") ||
    model.includes("gpt-image")
  );
}

function providerBillingConfig(provider: string): { runtimeConfigured: boolean; billingConfigured: boolean; action: string } {
  if (provider === "openrouter") {
    return {
      runtimeConfigured: configuredEnv("AI_INTEGRATIONS_OPENROUTER_API_KEY", "OPENROUTER_API_KEY"),
      billingConfigured: configuredEnv("OPENROUTER_MANAGEMENT_API_KEY"),
      action: "Configurar OPENROUTER_MANAGEMENT_API_KEY para reconciliar credits/saldo com ai_cost_log.",
    };
  }
  if (provider === "openai") {
    return {
      runtimeConfigured: configuredEnv("OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_API_KEY"),
      billingConfigured: configuredEnv("OPENAI_ADMIN_API_KEY"),
      action: "Configurar OPENAI_ADMIN_API_KEY com permissao de Usage/Costs antes de comparar custo real.",
    };
  }
  if (provider === "anthropic") {
    return {
      runtimeConfigured: configuredEnv("ANTHROPIC_API_KEY", "AI_INTEGRATIONS_OPENROUTER_API_KEY", "OPENROUTER_API_KEY"),
      billingConfigured: configuredEnv("ANTHROPIC_ADMIN_API_KEY", "ANTHROPIC_ADMIN_KEY"),
      action: "Configurar ANTHROPIC_ADMIN_API_KEY ou reconciliar Claude via OpenRouter billing.",
    };
  }
  if (provider === "deepseek") {
    return {
      runtimeConfigured: configuredEnv("AI_INTEGRATIONS_OPENROUTER_API_KEY", "OPENROUTER_API_KEY", "DEEPSEEK_API_KEY"),
      billingConfigured: configuredEnv("OPENROUTER_MANAGEMENT_API_KEY"),
      action: "Reconciliar DeepSeek via OpenRouter credits enquanto runtime direto nao estiver ativo.",
    };
  }
  if (provider === "gemini") {
    return {
      runtimeConfigured: configuredEnv("GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"),
      billingConfigured: configuredEnv("GOOGLE_CLOUD_BILLING_EXPORT", "GOOGLE_CLOUD_BILLING_ACCOUNT_ID"),
      action: "Configurar export/API de Google Cloud Billing antes de tratar custo Google como fatura real.",
    };
  }
  return {
    runtimeConfigured: false,
    billingConfigured: false,
    action: `Mapear runtime e billing do provider ${provider}.`,
  };
}

type UxActivityFunnelSignal = {
  flow: string;
  started: number;
  completed: number;
  abandoned: number;
  completionRate: number | null;
  eventTypes: string[];
};

type UxDuplicateRouteSignal = {
  route: string;
  aliases: string[];
  risk: string;
  action: string;
};

type UxHiddenCtaSignal = {
  surface: string;
  signal: string;
  risk: string;
  action: string;
};

type UxNegativeFeedbackSignal = {
  module: string;
  negativeSignals: number;
  eventTypes: string[];
};

const UX_STATIC_PRODUCT_SIGNALS = {
  confusingScreensOrFlows: [
    {
      module: "Home",
      signal: "Home concentra busca/upload, missao, Tiagao e cards secundarios; qa_sintetico exige proxima acao clara acima da dobra.",
      action: "Validar em mobile se a missao principal aparece antes dos cards secundarios e se busca/upload nao sequestra o Tiagao.",
    },
    {
      module: "Simulado",
      signal: "Rotas legadas /simulado, /simulado-adaptativo e /simulado-enem coexistem com redirects/avisos.",
      action: "Medir entrada por rota e manter uma CTA primaria para iniciar/concluir simulado.",
    },
    {
      module: "Notebook RAG",
      signal: "Notebook, Base de conhecimento, Aula com Professor, Lousa e Tutor IA aparecem próximos no acervo.",
      action: "Explicitar quando usar cada ferramenta e medir clique ate material gerado.",
    },
  ],
  hiddenOrUnusedButtons: [
    {
      surface: "AppNav.tsx",
      signal: "ModeSwitcher e MobileModeSection existem, mas nao aparecem no JSX principal; modo professor depende de rota e pode ficar escondido no menu global.",
      risk: "Professor pode cair em navegacao de aluno e nao descobrir Notebook do Professor, Historico docente ou Tiagao Professor.",
      action: "Decidir se o seletor de modo volta ao nav ou se /professor deve forcar menu professor; validar antes de remover qualquer item.",
    },
    {
      surface: "Mobile AppNav",
      signal: "Mobile exibe hamburger, quick tabs horizontais e bottom nav para os mesmos atalhos principais.",
      risk: "Aluno pode ver CTAs duplicados competindo por atencao em viewport pequeno.",
      action: "Rodar QA mobile com 360px e reduzir duplicacao visual se a proxima acao ficar abaixo da dobra.",
    },
  ],
  duplicateRoutes: [
    {
      route: "pricing",
      aliases: ["/pricing", "/app/pricing"],
      risk: "Duas entradas para preco podem fragmentar evento de conversao se a origem nao for marcada.",
      action: "Manter alias apenas com tracking de origem ou consolidar CTA em um destino canonico.",
    },
    {
      route: "simulado",
      aliases: ["/simulado-enem", "/simulado", "/simulado-adaptativo"],
      risk: "Aluno pode alternar entre simulado atual e rotas legadas sem entender qual fluxo e principal.",
      action: "Medir origem e revisar copy dos redirects legados apos confirmar uso residual.",
    },
    {
      route: "fazedores",
      aliases: ["/aluno/fazedores", "/fazedores"],
      risk: "Atalho legado precisa continuar rastreado para nao parecer funcionalidade duplicada.",
      action: "Confirmar se /fazedores ainda recebe trafego antes de remover ou ocultar em menus.",
    },
  ],
  excessiveTextRisks: [
    {
      module: "Home",
      signal: "Checklist premium ja alerta para Home nao virar dashboard pesado.",
      action: "Medir cliques ate a missao principal e revisar textos/cards acima da dobra.",
    },
    {
      module: "Simulado",
      signal: "Resultado premium agrega radiografia, padroes de erro, TRI pedagogico, Caderno e gabarito.",
      action: "Validar hierarquia do resultado em mobile para manter CTA de recuperacao visivel.",
    },
    {
      module: "Notebook RAG",
      signal: "Materiais podem ter preview extenso, fontes, rubrica e exportacao no mesmo fluxo.",
      action: "Separar leitura, export e feedback em blocos escaneaveis sem esconder feedback negativo.",
    },
  ],
  weakStateRisks: [
    {
      module: "Home",
      signal: "qa_sintetico exige validar estados vazio/loading/erro/sucesso em viewport mobile.",
      action: "Confirmar Home sem historico, com erro recente e com missao vazia antes do release.",
    },
    {
      module: "Admin Hermes",
      signal: "Cronograma exige validar loading, falha de status, inbox vazia, descoberta e botoes lida/dispensar.",
      action: "Rodar QA admin autenticado e manter AppEmpty/AppLoading/AppError como padrao visual.",
    },
  ],
  mobileLayoutRisks: [
    {
      module: "App Shell",
      signal: "Header sticky, nav top, menu lateral mobile e bottom nav dividem o viewport.",
      action: "Validar sobreposicao em 360x740 nas rotas Home, Notebook, Simulado, Caderno, Professor e Admin.",
    },
  ],
};

function ratePercent(numerator: number, denominator: number): number | null {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : null;
}

function buildUxStructuredActions(signals: Awaited<ReturnType<typeof fetchUxProductAuditorSignals>>) {
  const topAbandoned = signals.abandonedFlows[0];
  const topNegative = signals.negativeFeedbackByModule[0];
  const hidden = signals.hiddenOrUnusedButtons[0];
  const duplicate = signals.duplicateRoutes[0];
  const weakState = signals.weakStateRisks[0];
  const mobile = signals.mobileLayoutRisks[0];

  return [
    {
      type: "confusing_flow",
      target: topAbandoned?.flow ?? signals.confusingScreensOrFlows[0]?.module ?? "Home",
      module: topAbandoned?.flow ?? signals.confusingScreensOrFlows[0]?.module ?? "Home",
      evidence: topAbandoned ?? signals.confusingScreensOrFlows,
      action: topAbandoned
        ? `Revisar o fluxo ${topAbandoned.flow}: ${topAbandoned.abandoned} abandono(s) estimado(s) e conclusao ${topAbandoned.completionRate ?? 0}%.`
        : signals.confusingScreensOrFlows[0]?.action,
      metric: "completion_rate_por_fluxo_e_cliques_ate_cta",
      acceptanceCriteria: [
        "Fluxo tem uma CTA primaria visivel acima da dobra",
        "Evento started/completed ou equivalente mede abandono sem inferencia manual",
        "Texto secundario nao compete com a proxima acao",
      ],
      confidence: topAbandoned ? "alta" : "media",
    },
    {
      type: "hidden_or_unused_cta",
      target: hidden?.surface ?? "AppNav",
      module: "App Shell",
      evidence: signals.hiddenOrUnusedButtons,
      action: hidden?.action,
      metric: "uso_de_cta_por_papel_e_descoberta_de_funcionalidade",
      acceptanceCriteria: [
        "Professor ve menu coerente com rota/papel",
        "Mobile nao apresenta tres navegacoes competindo pela mesma acao",
        "Nenhum botao funcional e removido sem validar trafego e alternativa",
      ],
      confidence: "alta",
    },
    {
      type: "duplicate_route_or_menu",
      target: duplicate?.route ?? "rotas/menu",
      module: "App Shell",
      evidence: signals.duplicateRoutes,
      action: duplicate?.action,
      metric: "origem_de_rota_canonica_e_reducao_de_alias_confuso",
      acceptanceCriteria: [
        "Cada alias legado tem destino canonico e tracking de origem",
        "Menu mostra um unico nome por tarefa principal",
        "Redirect legado exibe copy clara quando ainda existir",
      ],
      confidence: signals.duplicateRoutes.length > 0 ? "media" : "baixa",
    },
    {
      type: "weak_states_and_mobile",
      target: weakState?.module ?? mobile?.module ?? "rotas premium",
      module: weakState?.module ?? mobile?.module ?? "App Shell",
      evidence: {
        weakStateRisks: signals.weakStateRisks,
        mobileLayoutRisks: signals.mobileLayoutRisks,
      },
      action: weakState?.action ?? mobile?.action,
      metric: "qa_mobile_estado_vazio_loading_erro_aprovado",
      acceptanceCriteria: [
        "Estados vazio/loading/erro usam acao de recuperacao quando aplicavel",
        "Header/nav/bottom nav nao cobrem CTA ou formulario em 360px",
        "Admin Hermes valida inbox vazia, erro de status e detalhe de recomendacao",
      ],
      confidence: "media",
    },
    {
      type: "negative_feedback_by_module",
      target: topNegative?.module ?? "Notebook RAG/Simulado/Tiagao/Caderno",
      module: topNegative?.module ?? "Notebook RAG",
      evidence: signals.negativeFeedbackByModule,
      action: topNegative
        ? `Triar feedback negativo de ${topNegative.module}: ${topNegative.negativeSignals} sinal(is) em ${signals.periodoDias}d.`
        : "Persistir feedback negativo por modulo antes de inferir satisfacao.",
      metric: "feedback_negativo_triagem_por_modulo",
      acceptanceCriteria: [
        "Feedback negativo informa modulo, superficie e acao tomada",
        "Achados viram descoberta/inbox, nao autofix",
        "Modulo sem tabela/evento explicita lacuna de observabilidade",
      ],
      confidence: topNegative ? "media" : "baixa",
    },
  ];
}

async function fetchUxProductAuditorSignals(periodoDias = 14) {
  const snapshot = await buildSyntheticQaSnapshot(periodoDias);
  const sinceIso = new Date(Date.now() - periodoDias * 24 * 60 * 60 * 1000).toISOString();
  const [hasActivityEvents, hasNotebookFeedback] = await Promise.all([
    safeTableExists("activity_events"),
    safeTableExists("notebook_feedback"),
  ]);

  let activityFunnels: UxActivityFunnelSignal[] = [];
  let negativeFeedbackByModule: UxNegativeFeedbackSignal[] = [];

  if (hasActivityEvents) {
    try {
      const res = await db.execute(sql`
        WITH mapped AS (
          SELECT
            CASE
              WHEN event_type ILIKE '%simulado%' THEN 'Simulado'
              WHEN event_type ILIKE '%notebook%' OR event_type ILIKE '%rag%' THEN 'Notebook RAG'
              WHEN event_type ILIKE '%caderno%' OR event_type ILIKE '%error_review%' THEN 'Caderno de Erros'
              WHEN event_type ILIKE '%tiagao%' OR event_type ILIKE '%chat%' THEN 'Tiagao'
              WHEN event_type ILIKE '%home%' OR event_type ILIKE '%mission%' THEN 'Home'
              WHEN event_type ILIKE '%professor%' OR event_type ILIKE '%teacher%' THEN 'Relatorios B2B'
              ELSE 'Outros'
            END AS flow,
            event_type
          FROM activity_events
          WHERE created_at >= ${sinceIso}
        )
        SELECT
          flow,
          COUNT(*) FILTER (
            WHERE event_type ILIKE '%start%'
              OR event_type ILIKE '%open%'
              OR event_type ILIKE '%view%'
              OR event_type ILIKE '%click%'
          )::int AS started,
          COUNT(*) FILTER (
            WHERE event_type ILIKE '%complete%'
              OR event_type ILIKE '%finish%'
              OR event_type ILIKE '%save%'
              OR event_type ILIKE '%sent%'
              OR event_type ILIKE '%submit%'
              OR event_type ILIKE '%generated%'
          )::int AS completed,
          ARRAY_AGG(DISTINCT event_type ORDER BY event_type) AS event_types
        FROM mapped
        WHERE flow <> 'Outros'
        GROUP BY flow
        ORDER BY started DESC, completed ASC
        LIMIT 10
      `);

      activityFunnels = res.rows.map((row) => {
        const started = Number((row as Record<string, unknown>).started ?? 0);
        const completed = Number((row as Record<string, unknown>).completed ?? 0);
        return {
          flow: String((row as Record<string, unknown>).flow ?? "Fluxo"),
          started,
          completed,
          abandoned: Math.max(started - completed, 0),
          completionRate: ratePercent(completed, started),
          eventTypes: Array.isArray((row as Record<string, unknown>).event_types)
            ? ((row as Record<string, unknown>).event_types as unknown[]).map(String)
            : [],
        };
      });
    } catch {
      activityFunnels = [];
    }

    try {
      const res = await db.execute(sql`
        WITH mapped AS (
          SELECT
            CASE
              WHEN event_type ILIKE '%simulado%' THEN 'Simulado'
              WHEN event_type ILIKE '%notebook%' OR event_type ILIKE '%rag%' THEN 'Notebook RAG'
              WHEN event_type ILIKE '%caderno%' OR event_type ILIKE '%error_review%' THEN 'Caderno de Erros'
              WHEN event_type ILIKE '%tiagao%' OR event_type ILIKE '%chat%' THEN 'Tiagao'
              WHEN event_type ILIKE '%home%' OR event_type ILIKE '%mission%' THEN 'Home'
              WHEN event_type ILIKE '%professor%' OR event_type ILIKE '%teacher%' THEN 'Relatorios B2B'
              ELSE 'Outros'
            END AS module,
            event_type
          FROM activity_events
          WHERE created_at >= ${sinceIso}
            AND (
              event_type ILIKE '%negative%'
              OR event_type ILIKE '%dislike%'
              OR event_type ILIKE '%bad%'
              OR event_type ILIKE '%fail%'
              OR event_type ILIKE '%error%'
              OR event_type ILIKE '%erro%'
            )
        )
        SELECT
          module,
          COUNT(*)::int AS negative_signals,
          ARRAY_AGG(DISTINCT event_type ORDER BY event_type) AS event_types
        FROM mapped
        WHERE module <> 'Outros'
        GROUP BY module
        ORDER BY negative_signals DESC
        LIMIT 8
      `);

      negativeFeedbackByModule = res.rows.map((row) => ({
        module: String((row as Record<string, unknown>).module ?? "Modulo"),
        negativeSignals: Number((row as Record<string, unknown>).negative_signals ?? 0),
        eventTypes: Array.isArray((row as Record<string, unknown>).event_types)
          ? ((row as Record<string, unknown>).event_types as unknown[]).map(String)
          : [],
      }));
    } catch {
      negativeFeedbackByModule = [];
    }
  }

  const abandonedFlows = activityFunnels
    .filter((flow) => flow.abandoned > 0 || (flow.started >= 3 && flow.completionRate !== null && flow.completionRate < 70))
    .sort((a, b) => b.abandoned - a.abandoned || (a.completionRate ?? 101) - (b.completionRate ?? 101));

  const modulesWithoutFeedbackSignals = PREMIUM_QUALITY_LOOP_MODULES.filter((module) =>
    ["Notebook RAG", "Simulado", "Tiagao", "Caderno de Erros", "Relatorios B2B"].includes(module.module),
  ).map((module) => ({
    module: module.module,
    status:
      negativeFeedbackByModule.some((feedback) => feedback.module === module.module) || hasNotebookFeedback
        ? "observable"
        : "missing_negative_feedback_signal",
    evidenceSources: module.evidenceSources,
  }));

  const routeInventoryDuplicates: UxDuplicateRouteSignal[] = [];
  const routeOwners = new Map<string, string[]>();
  for (const surface of snapshot.routeInventory) {
    for (const route of surface.routes) {
      const owners = routeOwners.get(route) ?? [];
      owners.push(surface.surface);
      routeOwners.set(route, owners);
    }
  }
  for (const [route, owners] of routeOwners.entries()) {
    if (owners.length <= 1) continue;
    routeInventoryDuplicates.push({
      route,
      aliases: owners,
      risk: "Mesma rota aparece em mais de uma superficie do inventario QA.",
      action: "Confirmar se e compartilhamento intencional ou duplicacao de menu/entrada.",
    });
  }

  const duplicateRoutes = [...UX_STATIC_PRODUCT_SIGNALS.duplicateRoutes, ...routeInventoryDuplicates];
  const missingInstrumentation = [
    !hasActivityEvents ? "activity_events ausente: sem abandono, CTA click ou feedback negativo por modulo" : null,
    !hasNotebookFeedback ? "notebook_feedback ausente: feedback negativo de Notebook depende de eventos alternativos" : null,
    modulesWithoutFeedbackSignals.some((module) => module.status === "missing_negative_feedback_signal")
      ? "feedback negativo por modulo incompleto: persistir module/surface/result para Home, Simulado, Tiagao, Caderno e B2B"
      : null,
  ].filter((value): value is string => Boolean(value));

  return {
    generatedAt: new Date().toISOString(),
    periodoDias,
    snapshotGeneratedAt: snapshot.generatedAt,
    premiumModules: snapshot.premiumQualityLoop.modules.map((module) => ({
      module: module.module,
      surfaces: module.surfaces,
      metrics: module.metrics,
      acceptanceCriteria: module.acceptanceCriteria,
    })),
    routeInventory: snapshot.routeInventory,
    tableSignals: {
      activityEvents: hasActivityEvents,
      notebookFeedback: hasNotebookFeedback,
      hermesAdminInbox: tableSignal(snapshot, "hermes_admin_inbox")?.exists ?? false,
      hermesDescobertas: tableSignal(snapshot, "hermes_descobertas_globais")?.exists ?? false,
    },
    activityFunnels,
    abandonedFlows,
    confusingScreensOrFlows: UX_STATIC_PRODUCT_SIGNALS.confusingScreensOrFlows,
    hiddenOrUnusedButtons: UX_STATIC_PRODUCT_SIGNALS.hiddenOrUnusedButtons,
    duplicateRoutes,
    excessiveTextRisks: UX_STATIC_PRODUCT_SIGNALS.excessiveTextRisks,
    weakStateRisks: UX_STATIC_PRODUCT_SIGNALS.weakStateRisks,
    mobileLayoutRisks: UX_STATIC_PRODUCT_SIGNALS.mobileLayoutRisks,
    negativeFeedbackByModule,
    modulesWithoutFeedbackSignals,
    missingInstrumentation,
  };
}

async function fetchCustosIaOptimizerSignals(periodoDias = 14) {
  const sinceIso = new Date(Date.now() - periodoDias * 24 * 60 * 60 * 1000).toISOString();
  const [
    hasAiCostLog,
    hasAiResponseCache,
    hasActivityEvents,
    hasUserActivity,
    hasGeneratedContent,
    hasNotebookOverviews,
    hasTeacherContent,
  ] = await Promise.all([
    safeTableExists("ai_cost_log"),
    safeTableExists("ai_response_cache"),
    safeTableExists("activity_events"),
    safeTableExists("user_activity"),
    safeTableExists("generated_content"),
    safeTableExists("notebook_overviews"),
    safeTableExists("teacher_content"),
  ]);

  const summary = {
    periodoDias,
    totalCostUsd: 0,
    totalCalls: 0,
    totalTokens: 0,
    uniqueUsers: 0,
    activeUsers: 0,
    generatedMaterials: 0,
    costPerActiveUserUsd: null as number | null,
    costPerAlunoUsd: null as number | null,
    costPerGeneratedMaterialUsd: null as number | null,
  };
  let byFeature: CostOptimizerFeatureSignal[] = [];
  let byModel: CostOptimizerModelSignal[] = [];
  let longCalls: CostOptimizerLongCallSignal[] = [];
  let fallbackRetry = { loggedFallbackCalls: 0, eventFailures: 0, eventRetries: 0 };
  let cache: {
    totalEntries: number;
    totalHits: number;
    totalUnusedEntries: number;
    byFeature: CostOptimizerCacheSignal[];
    opportunities: Array<{ feature: string; calls: number; costUsd: number; reason: string }>;
  } = {
    totalEntries: 0,
    totalHits: 0,
    totalUnusedEntries: 0,
    byFeature: [],
    opportunities: [],
  };

  if (hasAiCostLog) {
    try {
      const res = await db.execute(sql`
        SELECT
          COALESCE(SUM(cost_usd::numeric), 0)::float AS total_cost,
          COUNT(*)::int AS total_calls,
          COALESCE(SUM(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)), 0)::int AS total_tokens,
          COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int AS unique_users
        FROM ai_cost_log
        WHERE created_at >= ${sinceIso}
      `);
      const row = res.rows[0] as Record<string, unknown> | undefined;
      summary.totalCostUsd = roundUsd(Number(row?.total_cost ?? 0));
      summary.totalCalls = Number(row?.total_calls ?? 0);
      summary.totalTokens = Number(row?.total_tokens ?? 0);
      summary.uniqueUsers = Number(row?.unique_users ?? 0);
    } catch {
      // Mantem a recomendacao resiliente a migracoes parciais.
    }

    try {
      const res = await db.execute(sql`
        SELECT
          COALESCE(NULLIF(BTRIM(feature), ''), 'nao_classificado') AS feature,
          COUNT(*)::int AS calls,
          COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int AS unique_users,
          COALESCE(SUM(cost_usd::numeric), 0)::float AS cost_usd,
          COALESCE(SUM(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)), 0)::int AS tokens,
          COALESCE(ROUND(AVG(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)), 0), 0)::int AS avg_tokens,
          COALESCE(AVG(cost_usd::numeric), 0)::float AS avg_cost_per_call
        FROM ai_cost_log
        WHERE created_at >= ${sinceIso}
        GROUP BY 1
        ORDER BY cost_usd DESC, calls DESC
        LIMIT 12
      `);
      byFeature = res.rows.map((row) => ({
        feature: String((row as Record<string, unknown>).feature ?? "nao_classificado"),
        calls: Number((row as Record<string, unknown>).calls ?? 0),
        uniqueUsers: Number((row as Record<string, unknown>).unique_users ?? 0),
        costUsd: roundUsd(Number((row as Record<string, unknown>).cost_usd ?? 0)),
        tokens: Number((row as Record<string, unknown>).tokens ?? 0),
        avgTokens: Number((row as Record<string, unknown>).avg_tokens ?? 0),
        avgCostPerCall: roundUsd(Number((row as Record<string, unknown>).avg_cost_per_call ?? 0)),
      }));
    } catch {
      byFeature = [];
    }

    try {
      const res = await db.execute(sql`
        SELECT
          COALESCE(NULLIF(BTRIM(model), ''), 'nao_classificado') AS raw_model,
          COUNT(*)::int AS calls,
          COALESCE(SUM(cost_usd::numeric), 0)::float AS cost_usd,
          COALESCE(SUM(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)), 0)::int AS tokens,
          COALESCE(AVG(cost_usd::numeric), 0)::float AS avg_cost_per_call,
          COALESCE(ROUND(AVG(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)), 0), 0)::int AS avg_tokens
        FROM ai_cost_log
        WHERE created_at >= ${sinceIso}
        GROUP BY 1
        ORDER BY cost_usd DESC, calls DESC
        LIMIT 12
      `);
      byModel = res.rows.map((row) => {
        const rawModel = String((row as Record<string, unknown>).raw_model ?? "nao_classificado");
        return {
          provider: normalizeProvider(rawModel),
          model: normalizeModelName(rawModel),
          rawModel,
          calls: Number((row as Record<string, unknown>).calls ?? 0),
          costUsd: roundUsd(Number((row as Record<string, unknown>).cost_usd ?? 0)),
          tokens: Number((row as Record<string, unknown>).tokens ?? 0),
          avgCostPerCall: roundUsd(Number((row as Record<string, unknown>).avg_cost_per_call ?? 0)),
          avgTokens: Number((row as Record<string, unknown>).avg_tokens ?? 0),
          premiumLike: isPremiumLikeModel(rawModel),
        };
      });
    } catch {
      byModel = [];
    }

    try {
      const res = await db.execute(sql`
        SELECT
          feature,
          model,
          COALESCE(tokens_in, 0)::int AS tokens_in,
          COALESCE(tokens_out, 0)::int AS tokens_out,
          (COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0))::int AS total_tokens,
          COALESCE(cost_usd::numeric, 0)::float AS cost_usd,
          created_at::text AS created_at
        FROM ai_cost_log
        WHERE created_at >= ${sinceIso}
          AND (COALESCE(tokens_in, 0) >= 4000 OR COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0) >= 8000)
        ORDER BY total_tokens DESC, cost_usd DESC
        LIMIT 10
      `);
      longCalls = res.rows.map((row) => ({
        feature: String((row as Record<string, unknown>).feature ?? "nao_classificado"),
        model: String((row as Record<string, unknown>).model ?? "nao_classificado"),
        tokensIn: Number((row as Record<string, unknown>).tokens_in ?? 0),
        tokensOut: Number((row as Record<string, unknown>).tokens_out ?? 0),
        totalTokens: Number((row as Record<string, unknown>).total_tokens ?? 0),
        costUsd: roundUsd(Number((row as Record<string, unknown>).cost_usd ?? 0)),
        createdAt: ((row as Record<string, unknown>).created_at as string | null) ?? null,
      }));
    } catch {
      longCalls = [];
    }

    try {
      const res = await db.execute(sql`
        SELECT COUNT(*)::int AS logged_fallback_calls
        FROM ai_cost_log
        WHERE created_at >= ${sinceIso}
          AND (
            feature ILIKE '%fallback%' OR
            feature ILIKE '%retry%' OR
            model ILIKE '%openai-direct:%'
          )
      `);
      fallbackRetry.loggedFallbackCalls = Number(
        (res.rows[0] as Record<string, unknown> | undefined)?.logged_fallback_calls ?? 0,
      );
    } catch {
      fallbackRetry.loggedFallbackCalls = 0;
    }
  }

  if (hasUserActivity) {
    try {
      const res = await db.execute(sql`
        SELECT COUNT(DISTINCT user_id)::int AS active_users
        FROM user_activity
        WHERE study_date >= ${sinceIso.slice(0, 10)}
      `);
      summary.activeUsers = Number((res.rows[0] as Record<string, unknown> | undefined)?.active_users ?? 0);
    } catch {
      summary.activeUsers = 0;
    }
  }

  const generatedCounts: Array<{ table: string; count: number }> = [];
  if (hasGeneratedContent) {
    try {
      const res = await db.execute(sql`
        SELECT COUNT(*)::int AS count
        FROM generated_content
        WHERE deleted_at IS NULL AND created_at >= ${sinceIso}
      `);
      generatedCounts.push({
        table: "generated_content",
        count: Number((res.rows[0] as Record<string, unknown> | undefined)?.count ?? 0),
      });
    } catch {
      generatedCounts.push({ table: "generated_content", count: 0 });
    }
  }
  if (hasNotebookOverviews) {
    try {
      const res = await db.execute(sql`
        SELECT COUNT(*)::int AS count
        FROM notebook_overviews
        WHERE created_at >= ${sinceIso}
      `);
      generatedCounts.push({
        table: "notebook_overviews",
        count: Number((res.rows[0] as Record<string, unknown> | undefined)?.count ?? 0),
      });
    } catch {
      generatedCounts.push({ table: "notebook_overviews", count: 0 });
    }
  }
  if (hasTeacherContent) {
    try {
      const res = await db.execute(sql`
        SELECT COUNT(*)::int AS count
        FROM teacher_content
        WHERE created_at >= ${sinceIso}
      `);
      generatedCounts.push({
        table: "teacher_content",
        count: Number((res.rows[0] as Record<string, unknown> | undefined)?.count ?? 0),
      });
    } catch {
      generatedCounts.push({ table: "teacher_content", count: 0 });
    }
  }
  summary.generatedMaterials = generatedCounts.reduce((sum, item) => sum + item.count, 0);
  summary.costPerActiveUserUsd =
    summary.activeUsers > 0 ? roundUsd(summary.totalCostUsd / summary.activeUsers) : null;
  summary.costPerAlunoUsd = summary.costPerActiveUserUsd;
  summary.costPerGeneratedMaterialUsd =
    summary.generatedMaterials > 0 ? roundUsd(summary.totalCostUsd / summary.generatedMaterials) : null;

  if (hasActivityEvents) {
    try {
      const res = await db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE event_type ILIKE '%fail%' OR event_type ILIKE '%error%')::int AS failures,
          COUNT(*) FILTER (WHERE event_type ILIKE '%retry%' OR event_type ILIKE '%fallback%')::int AS retries
        FROM activity_events
        WHERE created_at >= ${sinceIso}
      `);
      const row = res.rows[0] as Record<string, unknown> | undefined;
      fallbackRetry.eventFailures = Number(row?.failures ?? 0);
      fallbackRetry.eventRetries = Number(row?.retries ?? 0);
    } catch {
      fallbackRetry.eventFailures = 0;
      fallbackRetry.eventRetries = 0;
    }
  }

  if (hasAiResponseCache) {
    try {
      const res = await db.execute(sql`
        SELECT
          feature,
          COUNT(*)::int AS entries,
          COALESCE(SUM(uso_count), 0)::int AS hits,
          COUNT(*) FILTER (WHERE COALESCE(uso_count, 0) = 0)::int AS unused_entries
        FROM ai_response_cache
        GROUP BY feature
        ORDER BY COALESCE(SUM(uso_count), 0) DESC, COUNT(*) DESC
        LIMIT 12
      `);
      cache.byFeature = res.rows.map((row) => {
        const entries = Number((row as Record<string, unknown>).entries ?? 0);
        const hits = Number((row as Record<string, unknown>).hits ?? 0);
        return {
          feature: String((row as Record<string, unknown>).feature ?? "nao_classificado"),
          entries,
          hits,
          hitRate: hits + entries > 0 ? Math.round((hits / (hits + entries)) * 100) : 0,
          unusedEntries: Number((row as Record<string, unknown>).unused_entries ?? 0),
        };
      });
      cache.totalEntries = cache.byFeature.reduce((sum, item) => sum + item.entries, 0);
      cache.totalHits = cache.byFeature.reduce((sum, item) => sum + item.hits, 0);
      cache.totalUnusedEntries = cache.byFeature.reduce((sum, item) => sum + item.unusedEntries, 0);
    } catch {
      cache = { ...cache, totalEntries: 0, totalHits: 0, totalUnusedEntries: 0, byFeature: [] };
    }
  }

  const cachedFeatures = new Set(cache.byFeature.map((item) => item.feature));
  cache.opportunities = byFeature
    .filter((feature) => feature.calls >= 5 && feature.costUsd > 0 && !cachedFeatures.has(feature.feature))
    .slice(0, 5)
    .map((feature) => ({
      feature: feature.feature,
      calls: feature.calls,
      costUsd: feature.costUsd,
      reason: "feature com chamadas/custo no periodo sem entrada correspondente em ai_response_cache",
    }));

  const cheaperByFeature = new Map<string, number>();
  if (hasAiCostLog) {
    try {
      const res = await db.execute(sql`
        SELECT feature, MIN(cost_usd::numeric)::float AS min_cost
        FROM ai_cost_log
        WHERE created_at >= ${sinceIso} AND cost_usd::numeric > 0
        GROUP BY feature
      `);
      for (const row of res.rows) {
        cheaperByFeature.set(
          String((row as Record<string, unknown>).feature ?? "nao_classificado"),
          Number((row as Record<string, unknown>).min_cost ?? 0),
        );
      }
    } catch {
      cheaperByFeature.clear();
    }
  }

  const expensiveModelsWithoutApparentGain = byModel.filter((model) => {
    if (!model.premiumLike) return false;
    if (model.avgCostPerCall <= 0 && model.avgTokens < 8000) return false;
    return true;
  });
  const expensiveFeaturesWithoutApparentGain = byFeature.filter((feature) => {
    const minCost = cheaperByFeature.get(feature.feature) ?? 0;
    return (
      feature.avgCostPerCall > 0.002 ||
      feature.avgTokens >= 8000 ||
      (minCost > 0 && feature.avgCostPerCall > minCost * 3)
    );
  });

  const providerUsage = new Map<string, { loggedCostUsd: number; loggedCalls: number }>();
  for (const model of byModel) {
    const provider = model.provider;
    if (provider === "nao_informado") continue;
    const current = providerUsage.get(provider) ?? { loggedCostUsd: 0, loggedCalls: 0 };
    current.loggedCostUsd += model.costUsd;
    current.loggedCalls += model.calls;
    providerUsage.set(provider, current);
  }
  for (const feature of byFeature) {
    if (feature.feature.startsWith("gemini_compat")) {
      const current = providerUsage.get("gemini") ?? { loggedCostUsd: 0, loggedCalls: 0 };
      current.loggedCostUsd += feature.costUsd;
      current.loggedCalls += feature.calls;
      providerUsage.set("gemini", current);
    }
  }
  const missingBillingConfig: CostOptimizerMissingBillingSignal[] = [...providerUsage.entries()]
    .map(([provider, usage]) => {
      const config = providerBillingConfig(provider);
      return {
        provider,
        loggedCostUsd: roundUsd(usage.loggedCostUsd),
        loggedCalls: usage.loggedCalls,
        ...config,
      };
    })
    .filter((provider) => provider.loggedCalls > 0 && (!provider.billingConfigured || !provider.runtimeConfigured));

  return {
    generatedAt: new Date().toISOString(),
    periodoDias,
    tableSignals: {
      aiCostLog: hasAiCostLog,
      aiResponseCache: hasAiResponseCache,
      activityEvents: hasActivityEvents,
      userActivity: hasUserActivity,
      generatedContent: hasGeneratedContent,
      notebookOverviews: hasNotebookOverviews,
      teacherContent: hasTeacherContent,
    },
    summary,
    byFeature,
    byModel,
    activeUsers: summary.activeUsers,
    generatedCounts,
    longCalls,
    expensiveModelsWithoutApparentGain,
    expensiveFeaturesWithoutApparentGain,
    fallbackRetry,
    cache,
    missingBillingConfig,
    missingInstrumentation: [
      !hasAiCostLog ? "ai_cost_log ausente: sem custo por feature/modelo/chamada" : null,
      !hasUserActivity ? "user_activity ausente: sem custo por aluno ativo" : null,
      !hasGeneratedContent && !hasNotebookOverviews && !hasTeacherContent
        ? "tabelas de materiais ausentes: sem custo por material gerado"
        : null,
      !hasAiResponseCache ? "ai_response_cache ausente: sem taxa de cache/reuso/desperdicio" : null,
      !hasActivityEvents ? "activity_events ausente: sem falhas/retries/fallbacks de produto" : null,
    ].filter((value): value is string => Boolean(value)),
  };
}

type ContentDemandSignal = {
  topic: string;
  demandScore: number;
  demandSources: string[];
  generatedCount: number;
  postuladoCount: number;
  knowledgeDocCount: number;
  hasBnccCoverage: boolean;
  hasEnemCoverage: boolean;
};

type WeakMaterialSignal = {
  id: number;
  kind: string;
  title: string;
  materia: string;
  createdAt: string | null;
  qualityScore: number | null;
  hasSource: boolean;
  hasExercise: boolean;
  hasExample: boolean;
  hasCheckpoint: boolean;
  humanReviewed: boolean;
  staleUnreviewed: boolean;
  reasons: string[];
};

type KnowledgeBaseQualitySignal = {
  id: number;
  title: string;
  subject: string;
  qualityScore: number;
  accessCount: number;
  source: string;
};

function normalizeTopicKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

function topicMatchesMateria(topic: string, materia: string): boolean {
  const left = normalizeTopicKey(topic);
  const right = normalizeTopicKey(materia);
  if (!left || !right || right === "sem_materia" || right === "sem matéria") return false;
  return left === right || left.includes(right) || right.includes(left);
}

function toNumberOrNull(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function addDemandSignal(
  map: Map<string, { topic: string; demandScore: number; demandSources: Set<string> }>,
  rawTopic: string | null | undefined,
  score: number,
  source: string,
): void {
  const topic = rawTopic?.trim();
  if (!topic || topic === "sem_matéria" || topic === "sem_materia" || score <= 0) return;
  const key = normalizeTopicKey(topic);
  const current = map.get(key) ?? { topic, demandScore: 0, demandSources: new Set<string>() };
  current.demandScore += score;
  current.demandSources.add(source);
  map.set(key, current);
}

async function fetchGeneratedContentWeakSignals(): Promise<WeakMaterialSignal[]> {
  if (!(await safeTableExists("generated_content"))) return [];

  try {
    const res = await db.execute(sql`
      SELECT
        id,
        kind,
        title,
        COALESCE(NULLIF(TRIM(materia), ''), 'sem_materia') AS materia,
        created_at::text AS created_at,
        COALESCE(
          CASE WHEN payload #>> '{metadata,quality,total}' ~ '^[0-9]+(\\.[0-9]+)?$'
            THEN (payload #>> '{metadata,quality,total}')::numeric END,
          CASE WHEN payload #>> '{premiumMetadata,quality,total}' ~ '^[0-9]+(\\.[0-9]+)?$'
            THEN (payload #>> '{premiumMetadata,quality,total}')::numeric END,
          CASE WHEN payload #>> '{quality,total}' ~ '^[0-9]+(\\.[0-9]+)?$'
            THEN (payload #>> '{quality,total}')::numeric END,
          CASE WHEN payload #>> '{qualityScore}' ~ '^[0-9]+(\\.[0-9]+)?$'
            THEN (payload #>> '{qualityScore}')::numeric END
        )::float AS quality_score,
        (
          COALESCE(payload #>> '{metadata,humanReviewed}', 'false') = 'true'
          OR COALESCE(payload #>> '{premiumMetadata,humanReviewed}', 'false') = 'true'
          OR COALESCE(payload #>> '{humanReviewed}', 'false') = 'true'
          OR COALESCE(payload #>> '{review,status}', '') IN ('approved', 'aprovado', 'aprovado_premium')
        ) AS human_reviewed,
        (
          payload::text ILIKE '%source%'
          OR payload::text ILIKE '%fonte%'
          OR payload::text ILIKE '%citation%'
          OR payload::text ILIKE '%referenc%'
        ) AS has_source,
        (
          payload::text ILIKE '%exercise%'
          OR payload::text ILIKE '%exercicio%'
          OR payload::text ILIKE '%exercício%'
          OR payload::text ILIKE '%questao%'
          OR payload::text ILIKE '%questão%'
          OR payload::text ILIKE '%pratica%'
          OR payload::text ILIKE '%prática%'
        ) AS has_exercise,
        (
          payload::text ILIKE '%example%'
          OR payload::text ILIKE '%exemplo%'
        ) AS has_example,
        (
          payload::text ILIKE '%checkpoint%'
          OR payload::text ILIKE '%verificacao%'
          OR payload::text ILIKE '%verificação%'
          OR payload::text ILIKE '%checagem%'
        ) AS has_checkpoint,
        created_at < NOW() - INTERVAL '14 days' AS stale
      FROM generated_content
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 250
    `);

    return res.rows
      .map((row) => {
        const item = row as Record<string, unknown>;
        const qualityScore = toNumberOrNull(item.quality_score);
        const hasSource = Boolean(item.has_source);
        const hasExercise = Boolean(item.has_exercise);
        const hasExample = Boolean(item.has_example);
        const hasCheckpoint = Boolean(item.has_checkpoint);
        const humanReviewed = Boolean(item.human_reviewed);
        const staleUnreviewed = Boolean(item.stale) && !humanReviewed;
        const reasons = [
          qualityScore !== null && qualityScore < 60 ? "low_material_quality_score" : null,
          !hasSource ? "content_without_source" : null,
          !hasExercise ? "missing_exercises" : null,
          !hasExample ? "missing_examples" : null,
          !hasCheckpoint ? "missing_checkpoints" : null,
          staleUnreviewed ? "stale_unreviewed_generated_material" : null,
        ].filter((value): value is string => Boolean(value));

        return {
          id: Number(item.id ?? 0),
          kind: String(item.kind ?? "material"),
          title: String(item.title ?? "Sem titulo").slice(0, 160),
          materia: String(item.materia ?? "sem_materia"),
          createdAt: (item.created_at as string | null) ?? null,
          qualityScore,
          hasSource,
          hasExercise,
          hasExample,
          hasCheckpoint,
          humanReviewed,
          staleUnreviewed,
          reasons,
        };
      })
      .filter((item) => item.reasons.length > 0)
      .slice(0, 25);
  } catch {
    return [];
  }
}

async function fetchKnowledgeBaseQualitySignals(): Promise<KnowledgeBaseQualitySignal[]> {
  if (!(await safeTableExists("knowledge_base"))) return [];

  try {
    const res = await db.execute(sql`
      SELECT
        id,
        COALESCE(NULLIF(TRIM(title), ''), 'Sem titulo') AS title,
        COALESCE(NULLIF(TRIM(subject), ''), 'sem_materia') AS subject,
        COALESCE(quality_score::numeric, 0)::float AS quality_score,
        COALESCE(access_count, 0)::int AS access_count,
        source
      FROM knowledge_base
      WHERE COALESCE(quality_score::numeric, 0) < 0.6
         OR COALESCE(access_count, 0) >= 5
      ORDER BY access_count DESC, quality_score ASC, created_at DESC
      LIMIT 20
    `);

    return res.rows.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        id: Number(item.id ?? 0),
        title: String(item.title ?? "Sem titulo").slice(0, 160),
        subject: String(item.subject ?? "sem_materia"),
        qualityScore: Number(item.quality_score ?? 0),
        accessCount: Number(item.access_count ?? 0),
        source: String(item.source ?? "nao_informado"),
      };
    });
  } catch {
    return [];
  }
}

async function fetchPostuladoCoverageByMateria(): Promise<Array<{ materia: string; count: number }>> {
  if (!(await safeTableExists("knowledge_documents"))) return [];

  try {
    const res = await db.execute(sql`
      SELECT
        COALESCE(NULLIF(TRIM(subject), ''), NULLIF(metadata->>'materia', ''), 'sem_materia') AS materia,
        COUNT(*)::int AS count
      FROM knowledge_documents
      WHERE (is_chunk = false OR is_chunk IS NULL)
        AND (
          metadata->>'source' = 'postulado'
          OR 'postulado' = ANY(COALESCE(tags, '{}'))
          OR source_file LIKE 'postulado:%'
        )
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 40
    `);
    return res.rows.map((row) => ({
      materia: String((row as Record<string, unknown>).materia ?? "sem_materia"),
      count: Number((row as Record<string, unknown>).count ?? 0),
    }));
  } catch {
    return [];
  }
}

async function fetchDemandSignalsFromRuntime(): Promise<Map<string, { topic: string; demandScore: number; demandSources: Set<string> }>> {
  const demand = new Map<string, { topic: string; demandScore: number; demandSources: Set<string> }>();

  if (await safeTableExists("user_profile_memory")) {
    try {
      const res = await db.execute(sql`
        SELECT
          COALESCE(topic->>'topico', topic->>'topic', topic->>'tema', topic->>'materia') AS topic,
          SUM(
            CASE WHEN COALESCE(topic->>'count', topic->>'contador', '1') ~ '^[0-9]+$'
              THEN COALESCE(topic->>'count', topic->>'contador', '1')::int
              ELSE 1
            END
          )::int AS demand
        FROM user_profile_memory,
          LATERAL jsonb_array_elements(COALESCE(topicos_frequentes, '[]'::jsonb)) AS topic
        GROUP BY 1
        ORDER BY demand DESC
        LIMIT 20
      `);
      for (const row of res.rows) {
        const item = row as Record<string, unknown>;
        addDemandSignal(demand, String(item.topic ?? ""), Number(item.demand ?? 0), "user_profile_memory");
      }
    } catch {
      // Topicos frequentes sao uma fonte oportunistica; se a estrutura divergir, seguimos com outras fontes.
    }
  }

  if (await safeTableExists("activity_events")) {
    try {
      const res = await db.execute(sql`
        SELECT
          COALESCE(
            NULLIF(metadata->>'query', ''),
            NULLIF(metadata->>'search', ''),
            NULLIF(metadata->>'topic', ''),
            NULLIF(metadata->>'topico', ''),
            NULLIF(metadata->>'materia', ''),
            NULLIF(entity_type, '')
          ) AS topic,
          COUNT(*)::int AS demand
        FROM activity_events
        WHERE created_at >= NOW() - INTERVAL '30 days'
          AND (
            event_type ILIKE '%search%'
            OR event_type ILIKE '%chat%'
            OR event_type ILIKE '%notebook%'
            OR event_type ILIKE '%simulado%'
            OR metadata ? 'query'
            OR metadata ? 'search'
            OR metadata ? 'topic'
            OR metadata ? 'topico'
            OR metadata ? 'materia'
          )
        GROUP BY 1
        ORDER BY demand DESC
        LIMIT 30
      `);
      for (const row of res.rows) {
        const item = row as Record<string, unknown>;
        addDemandSignal(demand, String(item.topic ?? ""), Number(item.demand ?? 0), "activity_events");
      }
    } catch {
      // Ambientes antigos podem nao ter activity_events.
    }
  }

  return demand;
}

async function fetchContentGapCqoAvancadoSignals(periodoDias = 30) {
  const [contentIndex, runtimeDemand, weakGeneratedMaterials, weakKnowledgeBase, postuladoByMateria, hasEnemQuestions] =
    await Promise.all([
      analyzeContentDatabases(),
      fetchDemandSignalsFromRuntime(),
      fetchGeneratedContentWeakSignals(),
      fetchKnowledgeBaseQualitySignals(),
      fetchPostuladoCoverageByMateria(),
      safeTableExists("enem_questions"),
    ]);

  const demand = runtimeDemand;
  for (const item of contentIndex.keywordStats.topMaterias) {
    addDemandSignal(demand, item.materia, item.count, "contentIndex.keywordStats");
  }
  for (const gap of contentIndex.contentGaps) {
    addDemandSignal(demand, gap.replace(/\s+\(.+\)$/, ""), 8, "contentIndex.contentGaps");
  }
  for (const item of contentIndex.knowledgeBase.bySubject) {
    addDemandSignal(demand, item.materia, item.count, "knowledge_base.subject");
  }
  for (const item of contentIndex.boardLessons.bySubject) {
    addDemandSignal(demand, item.materia, item.count + contentIndex.boardLessons.ready, "board_lessons.subject");
  }
  for (const item of weakKnowledgeBase) {
    addDemandSignal(demand, item.subject, Math.max(item.accessCount, 1), "knowledge_base.weak_or_popular");
  }

  const generatedByMateria = contentIndex.generatedContent.byMateria;

  const hasBnccCoverage =
    contentIndex.knowledgeDocuments.byMateria.some((item) => normalizeTopicKey(item.materia).includes("bncc")) ||
    weakGeneratedMaterials.some((item) => normalizeTopicKey(`${item.title} ${item.materia}`).includes("bncc"));
  const enemQuestionsCoverage = { total: 0, byDisciplina: [] as Array<{ disciplina: string; count: number }> };
  if (hasEnemQuestions) {
    try {
      const total = await db.execute(sql`SELECT COUNT(*)::int AS count FROM enem_questions`);
      const byDisciplina = await db.execute(sql`
        SELECT COALESCE(NULLIF(TRIM(disciplina), ''), area, 'sem_disciplina') AS disciplina, COUNT(*)::int AS count
        FROM enem_questions
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 12
      `);
      enemQuestionsCoverage.total = Number((total.rows[0] as Record<string, unknown> | undefined)?.count ?? 0);
      enemQuestionsCoverage.byDisciplina = byDisciplina.rows.map((row) => ({
        disciplina: String((row as Record<string, unknown>).disciplina ?? "sem_disciplina"),
        count: Number((row as Record<string, unknown>).count ?? 0),
      }));
    } catch {
      enemQuestionsCoverage.total = 0;
      enemQuestionsCoverage.byDisciplina = [];
    }
  }

  const demandSignals: ContentDemandSignal[] = [...demand.values()]
    .map((item) => {
      const generatedCount = generatedByMateria
        .filter((materia) => topicMatchesMateria(item.topic, materia.materia))
        .reduce((sum, materia) => sum + materia.count, 0);
      const postuladoCount = postuladoByMateria
        .filter((materia) => topicMatchesMateria(item.topic, materia.materia))
        .reduce((sum, materia) => sum + materia.count, 0);
      const knowledgeDocCount = contentIndex.knowledgeDocuments.byMateria
        .filter((materia) => topicMatchesMateria(item.topic, materia.materia))
        .reduce((sum, materia) => sum + materia.count, 0);
      const normalized = normalizeTopicKey(item.topic);
      return {
        topic: item.topic,
        demandScore: item.demandScore,
        demandSources: [...item.demandSources],
        generatedCount,
        postuladoCount,
        knowledgeDocCount,
        hasBnccCoverage: hasBnccCoverage || normalized.includes("bncc"),
        hasEnemCoverage:
          enemQuestionsCoverage.total > 0 &&
          (normalized.includes("enem") ||
            enemQuestionsCoverage.byDisciplina.some((disciplina) => topicMatchesMateria(item.topic, disciplina.disciplina))),
      };
    })
    .sort((a, b) => b.demandScore - a.demandScore)
    .slice(0, 25);

  const topicsWithDemandNoContent = demandSignals.filter(
    (item) => item.demandScore >= 5 && item.generatedCount === 0 && item.postuladoCount === 0,
  );
  const missingBnccCoverage =
    !hasBnccCoverage ||
    demandSignals.filter((item) => item.demandScore >= 5 && !item.hasBnccCoverage).slice(0, 8);
  const missingEnemCoverage =
    enemQuestionsCoverage.total === 0 ||
    demandSignals.filter((item) => item.demandScore >= 5 && !item.hasEnemCoverage).slice(0, 8);
  const lowMaterialQuality = weakGeneratedMaterials.filter((item) =>
    item.reasons.includes("low_material_quality_score"),
  );
  const contentWithoutSource = weakGeneratedMaterials.filter((item) => item.reasons.includes("content_without_source"));
  const missingPedagogicalBlocks = weakGeneratedMaterials.filter(
    (item) =>
      item.reasons.includes("missing_exercises") ||
      item.reasons.includes("missing_examples") ||
      item.reasons.includes("missing_checkpoints"),
  );
  const staleUnreviewedGeneratedMaterial = weakGeneratedMaterials.filter((item) =>
    item.reasons.includes("stale_unreviewed_generated_material"),
  );
  const popularTopicWithWeakMaterial = demandSignals
    .filter((topic) => topic.demandScore >= 5)
    .map((topic) => ({
      topic,
      weakMaterials: weakGeneratedMaterials
        .filter((material) => topicMatchesMateria(topic.topic, material.materia) || topicMatchesMateria(topic.topic, material.title))
        .slice(0, 3),
      weakKnowledgeBase: weakKnowledgeBase
        .filter((item) => topicMatchesMateria(topic.topic, item.subject) || topicMatchesMateria(topic.topic, item.title))
        .slice(0, 3),
    }))
    .filter((item) => item.weakMaterials.length > 0 || item.weakKnowledgeBase.length > 0)
    .slice(0, 8);

  return {
    generatedAt: new Date().toISOString(),
    periodoDias,
    contentIndex,
    demandSignals,
    topicsWithDemandNoContent,
    missingBnccCoverage,
    missingEnemCoverage,
    lowMaterialQuality,
    contentWithoutSource,
    popularTopicWithWeakMaterial,
    missingPedagogicalBlocks,
    staleUnreviewedGeneratedMaterial,
    weakGeneratedMaterials,
    weakKnowledgeBase,
    enemQuestionsCoverage,
    tableSignals: {
      generatedContent: await safeTableExists("generated_content"),
      knowledgeDocuments: await safeTableExists("knowledge_documents"),
      knowledgeBase: await safeTableExists("knowledge_base"),
      activityEvents: await safeTableExists("activity_events"),
      userProfileMemory: await safeTableExists("user_profile_memory"),
      enemQuestions: hasEnemQuestions,
    },
    missingInstrumentation: [
      !(await safeTableExists("activity_events"))
        ? "activity_events ausente: sem busca popular/uso recente por topico"
        : null,
      !(await safeTableExists("user_profile_memory"))
        ? "user_profile_memory ausente: sem topicos frequentes por aluno"
        : null,
      !(await safeTableExists("generated_content"))
        ? "generated_content ausente: sem score/fonte/blocos/revisao de materiais"
        : null,
      !(await safeTableExists("knowledge_base"))
        ? "knowledge_base ausente: sem quality_score/access_count para conteudo curado"
        : null,
      enemQuestionsCoverage.total === 0 ? "enem_questions vazio/ausente: cobertura ENEM nao mensuravel por disciplina" : null,
      !hasBnccCoverage ? "cobertura BNCC nao detectada em knowledge_documents/generated_content" : null,
    ].filter((value): value is string => Boolean(value)),
  };
}

type CadernoNoteSignal = typeof cadernoNotesTable.$inferSelect;
type SimuladoResultSignal = typeof simuladoResultsTable.$inferSelect;

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function isErrorReviewNote(note: CadernoNoteSignal): boolean {
  const blob = normalizeText(`${note.title}\n${note.content}`);
  return (
    blob.includes("caderno de erros") ||
    blob.includes("erros comentados") ||
    blob.includes("causa provavel") ||
    blob.includes("proxima melhor acao") ||
    /\b\d+\s+erro/.test(blob)
  );
}

function extractMaxErrorCount(content: string): number {
  const matches = [...content.matchAll(/(\d+)\s+erro/gi)].map((match) => Number(match[1]));
  return matches.length ? Math.max(...matches.filter(Number.isFinite)) : 0;
}

function extractProbableCauses(content: string): string[] {
  return [...content.matchAll(/Causa provável:\s*([^\n.]+)/gi)]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value))
    .slice(0, 8);
}

function extractSkills(content: string): string[] {
  const focusSkills = [...content.matchAll(/foco em\s+([^\n.]+)/gi)].map((match) => match[1]?.trim());
  const explicitSkills = [...content.matchAll(/habilidade(?:\s+ENEM)?[:\s]+([^\n.]+)/gi)].map(
    (match) => match[1]?.trim(),
  );
  return [...focusSkills, ...explicitSkills]
    .filter((value): value is string => Boolean(value))
    .slice(0, 8);
}

function incrementMap(map: Map<string, number>, raw: string, amount = 1): void {
  const key = raw.trim();
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + amount);
}

function topEntries(map: Map<string, number>, limit = 5): Array<{ label: string; count: number }> {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function simuladoAccuracy(row: SimuladoResultSignal): number {
  return row.total > 0 ? Math.round((row.score / row.total) * 100) : 0;
}

function sameSubject(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
}

async function buildCadernoErrosIntelligenceSnapshot() {
  const [notes, simulados] = await Promise.all([
    db
      .select()
      .from(cadernoNotesTable)
      .orderBy(desc(cadernoNotesTable.updatedAt))
      .limit(200),
    db
      .select()
      .from(simuladoResultsTable)
      .orderBy(desc(simuladoResultsTable.createdAt))
      .limit(500),
  ]);

  const errorNotes = notes.filter(isErrorReviewNote);
  const bySubject = new Map<
    string,
    {
      subject: string;
      notes: number;
      users: Set<string>;
      errorsMentioned: number;
      causes: Map<string, number>;
      skills: Map<string, number>;
      processed: number;
      latestAt: Date;
    }
  >();

  for (const note of errorNotes) {
    const subject = note.materia?.trim() || "sem materia";
    const current =
      bySubject.get(subject) ??
      {
        subject,
        notes: 0,
        users: new Set<string>(),
        errorsMentioned: 0,
        causes: new Map<string, number>(),
        skills: new Map<string, number>(),
        processed: 0,
        latestAt: note.updatedAt,
      };

    current.notes += 1;
    current.users.add(note.userId);
    current.errorsMentioned += extractMaxErrorCount(note.content);
    if (note.processedContent) current.processed += 1;
    if (note.updatedAt > current.latestAt) current.latestAt = note.updatedAt;
    for (const cause of extractProbableCauses(note.content)) incrementMap(current.causes, cause);
    for (const skill of extractSkills(note.content)) incrementMap(current.skills, skill);
    bySubject.set(subject, current);
  }

  const subjects = [...bySubject.values()]
    .map((subject) => {
      const laterRecovery = simulados
        .filter(
          (simulado) =>
            sameSubject(simulado.materia, subject.subject) &&
            simulado.createdAt > subject.latestAt &&
            simuladoAccuracy(simulado) >= 70,
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

      return {
        subject: subject.subject,
        reviewNotes: subject.notes,
        uniqueUsers: subject.users.size,
        errorsMentioned: subject.errorsMentioned,
        processedReviews: subject.processed,
        recurring: subject.notes >= 2 || subject.errorsMentioned >= 3,
        probableCauses: topEntries(subject.causes, 3),
        skills: topEntries(subject.skills, 3),
        latestReviewAt: subject.latestAt.toISOString(),
        laterSimilarCorrect:
          laterRecovery
            ? {
                simuladoId: laterRecovery.id,
                accuracy: simuladoAccuracy(laterRecovery),
                createdAt: laterRecovery.createdAt.toISOString(),
                daysToRecover: daysBetween(subject.latestAt, laterRecovery.createdAt),
                scope: "materia",
              }
            : null,
      };
    })
    .sort((a, b) => {
      if (a.recurring !== b.recurring) return a.recurring ? -1 : 1;
      return b.errorsMentioned - a.errorsMentioned || b.reviewNotes - a.reviewNotes;
    });

  const simuladoSubjects = new Map<string, { attempts: number; avgAccuracy: number; latestAt: string }>();
  for (const row of simulados) {
    const key = row.materia || "sem materia";
    const current = simuladoSubjects.get(key) ?? { attempts: 0, avgAccuracy: 0, latestAt: row.createdAt.toISOString() };
    current.attempts += 1;
    current.avgAccuracy += simuladoAccuracy(row);
    if (row.createdAt > new Date(current.latestAt)) current.latestAt = row.createdAt.toISOString();
    simuladoSubjects.set(key, current);
  }

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      cadernoNotes: notes.length,
      errorReviewNotes: errorNotes.length,
      processedErrorReviews: errorNotes.filter((note) => Boolean(note.processedContent)).length,
      simuladoResults: simulados.length,
    },
    subjects: subjects.slice(0, 8),
    recurringSubjects: subjects.filter((subject) => subject.recurring).slice(0, 5),
    simuladoSubjects: [...simuladoSubjects.entries()]
      .map(([subject, stats]) => ({
        subject,
        attempts: stats.attempts,
        averageAccuracy: Math.round(stats.avgAccuracy / Math.max(stats.attempts, 1)),
        latestAt: stats.latestAt,
      }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 8),
    missingInstrumentation: [
      {
        signal: "pending_error_review_missions",
        status: "missing_backend_storage",
        detail: "ERROR_REVIEW_MISSION_KEY fica em localStorage; Hermes backend nao consegue contar missoes pendentes nao concluidas.",
      },
      {
        signal: "error_review_history",
        status: "missing_backend_storage",
        detail: "ERROR_REVIEW_HISTORY_KEY registra manual_close/saved_review_note localmente; nao ha tabela para streak e revisao concluida global.",
      },
      {
        signal: "hermes_learning_signal",
        status: "browser_event_only",
        detail: "studyai:hermes-learning-signal e CustomEvent no cliente; nao e persistido para o daily-learn.",
      },
      {
        signal: "similar_item_recovery",
        status: simulados.length > 0 ? "subject_level_only" : "missing_data",
        detail: "simulado_results permite inferir recuperacao por materia; nao comprova acerto posterior por mesma habilidade/item.",
      },
    ],
  };
}

export async function auditorPedagogicoDailyLearn(): Promise<void> {
  const snapshot = await buildSyntheticQaSnapshot(7);
  const generated = snapshot.contentIndex.generatedContent;
  const gaps = snapshot.contentIndex.contentGaps;
  const materialEvents = tableSignal(snapshot, "material_style_events");

  const weakSignal =
    gaps.length > 0 ||
    generated.totalActive === 0 ||
    materialEvents?.exists === false;

  const recommendation: HermesRecommendation = {
    agentId: "auditor_pedagogico",
    area: "pedagogia/qualidade",
    module: "Conteudo pedagogico",
    targetSurface: "generated_content/knowledge_documents/material_style_events",
    observedState: weakSignal
      ? `Sinais pedagogicos incompletos: ${gaps.length} lacuna(s), ${generated.totalActive} material(is) ativo(s), material_style_events=${materialEvents?.exists ? "ok" : "ausente"}.`
      : `Base pedagogica monitorada: ${generated.totalActive} material(is) ativo(s), ${snapshot.contentIndex.knowledgeDocuments.postulados} postulado(s), sem lacuna critica no snapshot.`,
    evidence: JSON.stringify({
      contentGaps: gaps.slice(0, 8),
      generatedContent: generated,
      pedagogicalMaterialStandard: snapshot.pedagogicalMaterialStandard,
      materialStyleEvents: materialEvents,
    }),
    problemOpportunity: weakSignal
      ? "Materiais podem sair sem fonte, exemplo, exercicio, checkpoint ou rubrica suficiente para uso premium."
      : "Mesmo sem lacuna critica, qualidade pedagogica precisa de auditoria continua por padrao e evidencias.",
    recommendedChange: weakSignal
      ? "Priorizar curadoria dos materiais/fonte nas lacunas detectadas e instrumentar score pedagogico quando a tabela de eventos estiver ausente."
      : "Manter auditoria semanal de materiais recentes contra objetivo, fonte, exemplo, pratica, gabarito e revisao humana.",
    expectedImpact: "Aumentar confiabilidade dos materiais e reduzir retrabalho de professor/admin.",
    confidence: weakSignal ? "alta" : "media",
    successMetric:
      "Percentual de materiais com objetivo, fonte, exemplo, exercicio/checkpoint e criterio de revisao; contentGaps reduzido.",
    implementationNotes: "Este agente reaproveita qa_sintetico, CQO e padrao premium; nao cria autofix.",
    acceptanceCriteria: [
      "Todo material auditado informa objetivo e publico",
      "Fonte/evidencia aparece quando RAG ou postulado influencia o conteudo",
      "Ha pelo menos uma pratica/checkpoint ou lacuna explicitada",
      "Admin ve recomendacao com evidencia e metrica",
    ],
  };

  await persistPainAgentRecommendation(
    recommendation,
    {
      kind: "dor_real_agent",
      agentCatalog: "auditor_pedagogico",
      snapshotGeneratedAt: snapshot.generatedAt,
      overlaps: ["qa_sintetico", "cqo_conteudo"],
      signals: {
        contentGaps: gaps,
        generatedContent: generated,
        materialStyleEvents: materialEvents,
      },
    },
    weakSignal ? 4 : 2,
    weakSignal
      ? {
          tipo: "auditoria_pedagogica",
          titulo: "Auditor Pedagogico encontrou lacuna de qualidade",
          corpo: recommendation.observedState,
        }
      : undefined,
  );
}

export async function notebookRagQualityDailyLearn(): Promise<void> {
  const snapshot = await buildSyntheticQaSnapshot(7);
  const notebookModule = moduleByName("Notebook RAG");
  const notebooks = tableSignal(snapshot, "notebooks");
  const feedback = tableSignal(snapshot, "notebook_feedback");
  const materialEvents = tableSignal(snapshot, "material_style_events");
  const generated = tableSignal(snapshot, "generated_content");
  const gaps = snapshot.contentIndex.contentGaps;

  const missingInstrumentation = [notebooks, feedback, materialEvents].filter(
    (signal) => !signal?.exists,
  );
  const hasRisk = gaps.length > 0 || missingInstrumentation.length > 0;

  const recommendation: HermesRecommendation = {
    agentId: "notebook_rag_quality",
    area: "notebook/rag_quality",
    module: "Notebook RAG",
    targetSurface: notebookModule?.surfaces.join(", ") ?? "/api/notebook, /api/rag-multi",
    observedState: hasRisk
      ? `Notebook RAG precisa de evidencia mais forte: lacunas=${gaps.length}, sinais ausentes=${missingInstrumentation.map((s) => s?.table ?? "unknown").join(", ") || "nenhum"}.`
      : "Notebook RAG possui sinais basicos de tabela e segue no loop diario de qualidade premium.",
    evidence: JSON.stringify({
      module: notebookModule,
      notebooks,
      notebookFeedback: feedback,
      materialStyleEvents: materialEvents,
      generatedContent: generated,
      contentGaps: gaps,
    }),
    problemOpportunity: hasRisk
      ? "Sem feedback/export/fallback bem observados, materiais ruins ou decks fracos podem passar sem triagem."
      : "A qualidade de preview/export/fonte precisa continuar auditada com sinais estruturados.",
    recommendedChange: hasRisk
      ? "Completar instrumentacao de feedback, fallback, export e visual slots; abrir QA manual para um material real com preview, tela cheia e PDF."
      : "Manter smoke de preview/export e revisar feedback negativo semanalmente.",
    expectedImpact: "Reduzir materiais genéricos, exports quebrados e recomendações RAG sem fonte suficiente.",
    confidence: hasRisk ? "alta" : "media",
    successMetric:
      "Visual slots resolvidos, feedback negativo triado, exports concluídos e contentGaps reduzido.",
    implementationNotes: "Complementa qa_sintetico.notebook_rag_lousa e cqo_conteudo sem duplicar geração.",
    acceptanceCriteria: [
      "Material real mostra fonte/evidencia quando aplicavel",
      "Preview e PDF preservam visual, tabelas, imagens e quebras",
      "Fallback fica explicito no payload e na UI",
      "Feedback negativo abre recomendacao Hermes auditavel",
    ],
  };

  await persistPainAgentRecommendation(
    recommendation,
    {
      kind: "dor_real_agent",
      agentCatalog: "notebook_rag_quality",
      snapshotGeneratedAt: snapshot.generatedAt,
      overlaps: ["qa_sintetico.notebook_rag_lousa", "cqo_conteudo"],
      observedSignals: {
        visualSlotsUnresolved: "observability_required",
        weakDeckOrMap: "qa_manual_required",
        fallbackUsage: materialEvents?.exists ? "table_available" : "missing_signal",
        feedbackNegative: feedback?.exists ? "table_available" : "missing_signal",
        exportEvents: materialEvents?.exists ? "table_available" : "missing_signal",
      },
    },
    hasRisk ? 4 : 2,
    hasRisk
      ? {
          tipo: "notebook_rag_quality",
          titulo: "Notebook RAG precisa de triagem Hermes",
          corpo: recommendation.observedState,
        }
      : undefined,
  );
}

export async function professorSuccessDailyLearn(): Promise<void> {
  const [snapshot, inactivePatterns, contentIndex] = await Promise.all([
    buildSyntheticQaSnapshot(7),
    fetchInactiveUserPatterns(14),
    analyzeContentDatabases(),
  ]);
  const classes = tableSignal(snapshot, "institution_classes");
  const teacherContent = tableSignal(snapshot, "teacher_content");
  const generated = tableSignal(snapshot, "generated_content");
  const hasTeacherSignalGap = classes?.exists === false || teacherContent?.exists === false;
  const hasAtRiskStudents = inactivePatterns.assinantesSemEstudo > 0;

  const recommendation: HermesRecommendation = {
    agentId: "professor_success",
    area: "professor/success",
    module: "Relatorios B2B",
    targetSurface: "Professor, ProfessorTurma, Instituicao, Notebook do Professor",
    observedState:
      `Sinais docentes: institution_classes=${classes?.exists ? classes.total ?? 0 : "ausente"}, ` +
      `teacher_content=${teacherContent?.exists ? teacherContent.total ?? 0 : "ausente"}, ` +
      `generated_content=${generated?.exists ? generated.total ?? 0 : "ausente"}, ` +
      `${inactivePatterns.assinantesSemEstudo} assinante(s) sem estudo em ${inactivePatterns.periodoDias}d.`,
    evidence: JSON.stringify({
      classes,
      teacherContent,
      generated,
      inactivePatterns: {
        periodoDias: inactivePatterns.periodoDias,
        assinantesAtivos: inactivePatterns.assinantesAtivos,
        assinantesSemEstudo: inactivePatterns.assinantesSemEstudo,
        inativosPorFaixa: inactivePatterns.inativosPorFaixa,
      },
      contentGaps: contentIndex.contentGaps,
    }),
    problemOpportunity:
      hasTeacherSignalGap || hasAtRiskStudents
        ? "Professores podem ter diagnostico sem proxima intervencao clara ou pouca evidencia de uso docente."
        : "Uso docente precisa continuar medido para provar valor B2B e reduzir risco de turma sem acao.",
    recommendedChange:
      hasTeacherSignalGap || hasAtRiskStudents
        ? "Priorizar instrumentacao de turmas/conteudo docente e criar rotina de intervencao revisada por professor para alunos em risco."
        : "Manter relatorio semanal de uso docente, exports e intervencoes registradas por turma.",
    expectedImpact: "Aumentar ativacao docente, uso do Notebook do Professor e conversao de diagnostico em intervencao.",
    confidence: hasTeacherSignalGap || hasAtRiskStudents ? "alta" : "media",
    successMetric:
      "Turmas ativas, exports de relatorio, outputs do Notebook Professor e alunos reativados em 7 dias.",
    implementationNotes:
      "Nao contata aluno/familia automaticamente; recomenda setup, rotina e instrumentacao para revisao humana.",
    acceptanceCriteria: [
      "Professor ve proxima acao por turma sem numero inventado",
      "Export/relatorio explicita sinais disponiveis e lacunas",
      "Intervencao exige revisao humana antes de contato",
      "Admin consegue medir uso do Notebook do Professor e exports",
    ],
  };

  await persistPainAgentRecommendation(
    recommendation,
    {
      kind: "dor_real_agent",
      agentCatalog: "professor_success",
      snapshotGeneratedAt: snapshot.generatedAt,
      overlaps: ["qa_sintetico.professor_gestor_relatorios", "sucesso_aluno"],
      observedSignals: {
        noActiveClass: classes?.exists ? (classes.total ?? 0) === 0 : "missing_signal",
        lowReportExport: "observability_required",
        lowTeacherNotebookUsage: teacherContent?.exists ? (teacherContent.recent ?? 0) === 0 : "missing_signal",
        atRiskStudents: inactivePatterns.assinantesSemEstudo,
        diagnosisWithoutAction: "requires_report_intervention_signal",
      },
    },
    hasTeacherSignalGap || hasAtRiskStudents ? 4 : 2,
    hasTeacherSignalGap || hasAtRiskStudents
      ? {
          tipo: "professor_success",
          titulo: "Professor Success encontrou risco B2B",
          corpo: recommendation.observedState,
        }
      : undefined,
  );
}

export async function simuladoIntelligenceDailyLearn(): Promise<void> {
  const signals = await fetchSimuladoIntelligenceSignals(14);
  const hasQualityRisk =
    signals.highErrorSubjects.length > 0 ||
    signals.suspectedWrongAnswerKey.length > 0 ||
    signals.lowDiscriminationSubjects.length > 0 ||
    signals.poorCompletion ||
    signals.missingGranularMetadata;

  const topHighError = signals.highErrorSubjects[0];
  const topWrongKey = signals.suspectedWrongAnswerKey[0];
  const topLowDiscrimination = signals.lowDiscriminationSubjects[0];
  const target =
    topWrongKey?.materia ??
    topHighError?.materia ??
    topLowDiscrimination?.materia ??
    "Simulado ENEM/Simulados adaptativos";

  const observedState = [
    `${signals.summary.totalResults} resultado(s) de simulado em ${signals.periodoDias}d`,
    `${signals.summary.lowScoreResults} resultado(s) abaixo de 50%`,
    `answers/metadados granulares em ${signals.summary.answersPayloadCount}/${signals.summary.totalResults}`,
    signals.activity.started > 0
      ? `conclusao ${signals.activity.completionRate ?? 0}% (${signals.activity.completed}/${signals.activity.started})`
      : "sem funil started/completed suficiente",
  ].join("; ");

  const recommendedChange = topWrongKey
    ? `Auditar gabarito e enunciados de ${topWrongKey.materia}: media ${topWrongKey.avgScore}% com ${topWrongKey.lowScoreAttempts}/${topWrongKey.attempts} tentativas abaixo de 50%.`
    : topHighError
      ? `Priorizar revisao pedagogica e treino de recuperacao em ${topHighError.materia}: ${topHighError.totalErrors} erro(s) agregados.`
      : topLowDiscrimination
        ? `Recalibrar dificuldade/distratores de ${topLowDiscrimination.materia}: baixa variacao de score (${topLowDiscrimination.scoreStddev}pp).`
        : signals.poorCompletion
          ? "Revisar friccao de tempo, tamanho do simulado e CTA de continuar/concluir para reduzir abandono."
          : signals.missingGranularMetadata
            ? "Persistir answers por questao com id, gabarito, competencia, habilidade, dificuldade e causa provavel."
            : "Manter auditoria semanal de qualidade de questoes, metadados e recuperacao pos-simulado.";

  const recommendation: HermesRecommendation = {
    agentId: "simulado_intelligence",
    area: "simulado/intelligence",
    module: "Simulado",
    targetSurface: target,
    observedState,
    evidence: JSON.stringify({
      periodoDias: signals.periodoDias,
      summary: signals.summary,
      byMateria: signals.byMateria,
      activity: signals.activity,
      highErrorSubjects: signals.highErrorSubjects,
      suspectedWrongAnswerKey: signals.suspectedWrongAnswerKey,
      lowDiscriminationSubjects: signals.lowDiscriminationSubjects,
      tableSignals: signals.tableSignals,
    }),
    problemOpportunity: hasQualityRisk
      ? "Simulados podem estar gerando baixo valor de aprendizagem por questoes com erro agregado alto, metadados fracos, baixa discriminacao ou abandono antes da conclusao."
      : "O loop de simulado esta observavel em nivel agregado, mas precisa continuar medindo qualidade por questao e recuperacao.",
    recommendedChange,
    expectedImpact:
      "Aumentar confiabilidade do gabarito, valor diagnostico por competencia/habilidade e conclusao da missao de recuperacao.",
    confidence:
      signals.suspectedWrongAnswerKey.length > 0 || signals.highErrorSubjects.length > 0 || signals.poorCompletion
        ? "alta"
        : signals.missingGranularMetadata
          ? "media"
          : "baixa",
    successMetric:
      "Taxa de conclusao do simulado, reducao de resultados abaixo de 50%, cobertura de metadados por questao e recuperacao concluida.",
    implementationNotes:
      "Este agente nao altera gabarito automaticamente; quando falta dado por questao, abre lacuna de instrumentacao em vez de classificar item individual.",
    acceptanceCriteria: [
      "Cada questao persistida possui id, gabarito, explicacao, dificuldade e classificacao quando disponivel",
      "Blocos com erro agregado alto entram em fila de revisao humana",
      "Suspeita de gabarito errado exige evidencia agregada e revisao manual antes de qualquer alteracao",
      "Admin ve evidencia, impacto, acao, metrica, aceite, confianca e alvo/modulo",
    ],
  };

  await persistPainAgentRecommendation(
    recommendation,
    {
      kind: "dor_real_agent",
      agentCatalog: "simulado_intelligence",
      snapshotGeneratedAt: signals.snapshot.generatedAt,
      overlaps: ["qa_sintetico.simulado_premium", "Caderno de Erros premium", "sucesso_aluno"],
      structuredRecommendation: {
        evidence: recommendation.evidence,
        impact: recommendation.expectedImpact,
        action: recommendation.recommendedChange,
        metric: recommendation.successMetric,
        acceptanceCriteria: recommendation.acceptanceCriteria,
        confidence: recommendation.confidence,
        target: recommendation.targetSurface,
        module: recommendation.module,
      },
      observedSignals: {
        veryHighErrorRate: signals.highErrorSubjects,
        ambiguousOrSuspicious: signals.suspectedWrongAnswerKey,
        suspectedWrongAnswerKey: signals.suspectedWrongAnswerKey,
        weakClassification: signals.missingGranularMetadata,
        lowDiscrimination: signals.lowDiscriminationSubjects,
        interpretationVsContentErrors: signals.summary.answersPayloadCount > 0 ? "partial_answers_payload" : "missing_granular_signal",
        abandonedSimulations: signals.activity,
      },
    },
    hasQualityRisk ? 4 : 2,
    hasQualityRisk
      ? {
          tipo: "simulado_intelligence",
          titulo: "Simulado Intelligence encontrou risco de qualidade",
          corpo: recommendation.observedState,
        }
      : undefined,
  );
}

export async function cadernoErrosIntelligenceDailyLearn(): Promise<void> {
  const snapshot = await buildCadernoErrosIntelligenceSnapshot();
  const topRecurring = snapshot.recurringSubjects[0];
  const missingCriticalSignals = snapshot.missingInstrumentation.filter(
    (signal) => signal.status !== "subject_level_only",
  );
  const hasActionableRecurrence = snapshot.recurringSubjects.length > 0;
  const hasRecoveryEvidence = snapshot.subjects.some((subject) => subject.laterSimilarCorrect);
  const needsInstrumentation = missingCriticalSignals.length > 0;

  const targetSubject = topRecurring?.subject ?? snapshot.subjects[0]?.subject ?? "Caderno de Erros";
  const primaryCause = topRecurring?.probableCauses[0]?.label ?? "causa provável ainda pouco estruturada";
  const primarySkill = topRecurring?.skills[0]?.label ?? targetSubject;

  const structuredActions = [
    {
      type: "review_mission",
      target: targetSubject,
      module: "Caderno de Erros",
      action:
        hasActionableRecurrence
          ? `Abrir missao curta para revisar ${primarySkill}, refazer 1 erro salvo e explicar a causa '${primaryCause}'.`
          : "Manter missao de revisao quando houver novo erro enviado do Simulado para o Caderno.",
      metric: "missao_revisao_erro_concluida",
      acceptanceCriteria: [
        "missao mostra materia/habilidade, causa provavel e criterio de conclusao",
        "aluno conclui por salvar nota, processar com Tiagao ou marcar revisao",
      ],
      confidence: hasActionableRecurrence ? "alta" : "media",
    },
    {
      type: "similar_exercise",
      target: primarySkill,
      module: "Simulado",
      action:
        "Sugerir uma questao similar antes de novo simulado completo; considerar acerto posterior somente por materia ate existir habilidade persistida.",
      metric: "acerto_posterior_mesma_materia_ou_habilidade",
      acceptanceCriteria: [
        "exercicio similar registra materia/habilidade",
        "resultado posterior referencia a revisao que tentou recuperar",
      ],
      confidence: hasRecoveryEvidence ? "media" : "baixa",
    },
    {
      type: "alert_teacher",
      target: targetSubject,
      module: "Relatorios B2B",
      action:
        "Criar alerta revisado por professor/admin quando a mesma materia ou habilidade repetir erros em mais de uma revisao.",
      metric: "alerta_recorrencia_revisado_por_professor",
      acceptanceCriteria: [
        "alerta agrega recorrencia sem expor ranking sensivel",
        "nenhum contato com aluno/familia ocorre automaticamente",
      ],
      confidence: hasActionableRecurrence ? "media" : "baixa",
    },
    {
      type: "instrumentation",
      target: "error_review_mission/history",
      module: "Home",
      action:
        "Persistir missao pendente, conclusao manual/salva, evento Hermes e habilidade no backend para fechar tempo de recuperacao por item.",
      metric: "percentual_de_revisoes_com_loop_persistido",
      acceptanceCriteria: [
        "Hermes conta missoes pendentes nao concluidas no backend",
        "history registra saved_review_note/manual_close por usuario",
        "simulado posterior informa habilidade para medir recuperacao real",
      ],
      confidence: "alta",
    },
  ];

  const recommendation: HermesRecommendation = {
    agentId: "caderno_erros_intelligence",
    area: "caderno_erros/intelligence",
    module: "Caderno de Erros",
    targetSurface: "Caderno.tsx, error-review.ts, Home next-best-action, simulado_results",
    observedState:
      `Caderno: ${snapshot.totals.errorReviewNotes}/${snapshot.totals.cadernoNotes} nota(s) parecem revisao de erro; ` +
      `${snapshot.totals.processedErrorReviews} processada(s) com Tiagao; ` +
      `${snapshot.recurringSubjects.length} materia(s)/habilidade(s) com recorrencia; ` +
      `${hasRecoveryEvidence ? "ha evidencia posterior por materia" : "sem evidencia forte de recuperacao posterior"}.`,
    evidence: JSON.stringify({
      totals: snapshot.totals,
      recurringSubjects: snapshot.recurringSubjects,
      subjects: snapshot.subjects,
      missingInstrumentation: snapshot.missingInstrumentation,
    }),
    problemOpportunity:
      hasActionableRecurrence || needsInstrumentation
        ? "Erros salvos ja viram revisao no produto, mas Hermes ainda precisa fechar o loop entre recorrencia, missao pendente, exercicio similar e recuperacao mensuravel."
        : "O Caderno tem poucos sinais persistidos de erro; a prioridade e manter o loop pronto e instrumentar historico/missoes.",
    recommendedChange:
      hasActionableRecurrence
        ? `Priorizar missao de revisao para ${targetSubject}, gerar exercicio similar e abrir alerta docente/admin se a recorrencia persistir.`
        : "Persistir missoes/historico do Caderno no backend e manter recomendacao de revisao quando novo erro for enviado do Simulado.",
    expectedImpact: "Aumentar revisoes concluidas, reduzir repeticao de erro por materia/habilidade e tornar recuperacao auditavel.",
    confidence: hasActionableRecurrence ? "alta" : needsInstrumentation ? "media" : "baixa",
    successMetric:
      "Revisoes com missao concluida, exercicio similar respondido e acerto posterior por mesma materia/habilidade; tempo medio ate recuperacao.",
    implementationNotes:
      "Hoje o backend mede notas salvas e simulados por materia. Missoes pendentes, historico local e CustomEvent Hermes ainda precisam persistencia para nao inventar progresso.",
    acceptanceCriteria: [
      "Recomendacao inclui missao de revisao, exercicio similar, alerta professor/admin, metrica, aceite, confianca e alvo/modulo",
      "Recorrencia e agrupada por materia/habilidade quando houver texto suficiente no Caderno",
      "Recuperacao posterior e marcada como inferencia por materia, nao por item, enquanto faltar instrumentacao",
      "Missoes locais nao concluidas aparecem como lacuna de instrumentacao ate virarem tabela/evento backend",
    ],
  };

  await persistPainAgentRecommendation(
    recommendation,
    {
      kind: "dor_real_agent",
      agentCatalog: "caderno_erros_intelligence",
      snapshotGeneratedAt: snapshot.generatedAt,
      overlaps: ["qa_sintetico.caderno_erros_premium", "Home next-best-action", "Simulado Intelligence"],
      observedSignals: {
        recurringErrorsBySubjectSkill: snapshot.recurringSubjects,
        probableCauses: topRecurring?.probableCauses ?? [],
        reviewed: {
          savedReviewNotes: snapshot.totals.errorReviewNotes,
          processedWithTiagao: snapshot.totals.processedErrorReviews,
          backendCompletionHistory: "missing_signal",
        },
        laterSimilarCorrect: snapshot.subjects
          .filter((subject) => subject.laterSimilarCorrect)
          .map((subject) => ({
            subject: subject.subject,
            ...subject.laterSimilarCorrect,
          })),
        timeToRecoverSkill: snapshot.subjects
          .filter((subject) => subject.laterSimilarCorrect)
          .map((subject) => ({
            subject: subject.subject,
            daysToRecover: subject.laterSimilarCorrect?.daysToRecover,
            scope: subject.laterSimilarCorrect?.scope,
          })),
        errorsByMateriaHabilidade: snapshot.subjects,
        pendingReviewMissionsNotCompleted: "missing_backend_storage",
      },
      structuredActions,
      missingInstrumentation: snapshot.missingInstrumentation,
    },
    hasActionableRecurrence || needsInstrumentation ? 4 : 2,
    hasActionableRecurrence || needsInstrumentation
      ? {
          tipo: "caderno_erros_intelligence",
          titulo: "Caderno de Erros precisa fechar loop de recuperacao",
          corpo: recommendation.observedState,
        }
      : undefined,
  );
}

export async function custosIaOptimizerDailyLearn(): Promise<void> {
  const signals = await fetchCustosIaOptimizerSignals(14);
  const topCostFeature = signals.byFeature[0];
  const topLongCall = signals.longCalls[0];
  const topExpensiveModel = signals.expensiveModelsWithoutApparentGain[0];
  const topExpensiveFeature = signals.expensiveFeaturesWithoutApparentGain[0];
  const topCacheOpportunity = signals.cache.opportunities[0];
  const topMissingBilling = signals.missingBillingConfig[0];
  const hasCostRisk =
    signals.missingInstrumentation.length > 0 ||
    signals.missingBillingConfig.length > 0 ||
    signals.expensiveModelsWithoutApparentGain.length > 0 ||
    signals.expensiveFeaturesWithoutApparentGain.length > 0 ||
    signals.longCalls.length > 0 ||
    signals.cache.opportunities.length > 0 ||
    signals.cache.totalUnusedEntries > 0 ||
    signals.fallbackRetry.loggedFallbackCalls > 0 ||
    signals.fallbackRetry.eventFailures > 0 ||
    signals.fallbackRetry.eventRetries > 0;

  const target =
    topMissingBilling?.provider ??
    topExpensiveFeature?.feature ??
    topCostFeature?.feature ??
    topExpensiveModel?.rawModel ??
    "Admin IA & Custos";

  const observedState = [
    `${signals.summary.totalCalls} chamada(s) IA em ${signals.periodoDias}d`,
    `US$ ${signals.summary.totalCostUsd} em ai_cost_log`,
    signals.summary.costPerActiveUserUsd !== null
      ? `US$ ${signals.summary.costPerActiveUserUsd}/aluno ativo`
      : "custo por aluno ativo sem base",
    signals.summary.costPerGeneratedMaterialUsd !== null
      ? `US$ ${signals.summary.costPerGeneratedMaterialUsd}/material gerado`
      : "custo por material sem base",
    `${signals.longCalls.length} chamada(s) longa(s)`,
    `${signals.cache.totalHits} hit(s) de cache e ${signals.cache.totalUnusedEntries} entrada(s) sem reuso`,
  ].join("; ");

  const recommendedChange = topMissingBilling
    ? `${topMissingBilling.action} Logs internos mostram ${topMissingBilling.loggedCalls} chamada(s) e US$ ${topMissingBilling.loggedCostUsd} para ${topMissingBilling.provider}.`
    : topExpensiveModel
      ? `Revisar uso de ${topExpensiveModel.rawModel}: ${topExpensiveModel.calls} chamada(s), US$ ${topExpensiveModel.costUsd}, ${topExpensiveModel.avgTokens} tokens medios; testar roteamento/capping em uma feature antes de trocar modelo.`
      : topExpensiveFeature
        ? `Auditar a feature ${topExpensiveFeature.feature}: custo medio US$ ${topExpensiveFeature.avgCostPerCall}/chamada e ${topExpensiveFeature.avgTokens} tokens medios; criar limite de prompt e metrica de qualidade aceita.`
        : topLongCall
          ? `Compactar prompt/contexto de ${topLongCall.feature}: chamada com ${topLongCall.totalTokens} tokens em ${topLongCall.model}.`
          : topCacheOpportunity
            ? `Criar cache/reuso para ${topCacheOpportunity.feature}: ${topCacheOpportunity.calls} chamada(s) e US$ ${topCacheOpportunity.costUsd} sem entrada em ai_response_cache.`
            : signals.cache.totalUnusedEntries > 0
              ? "Revisar politicas de TTL/score do cache para entradas sem reuso antes de limpar qualquer dado."
              : "Manter monitoramento diario de custo por feature, aluno ativo, material gerado, cache e billing real.";

  const structuredActions = [
    {
      type: "billing_reconciliation",
      target: topMissingBilling?.provider ?? "providerBilling",
      module: "Admin IA & Custos",
      evidence: signals.missingBillingConfig,
      action: topMissingBilling?.action ?? "Manter billing real conectado e separar invoice de ai_cost_log.",
      impact: "Evitar decisao financeira baseada só em estimativa interna.",
      metric: "provider_billing_connected_and_reconciled",
      acceptanceCriteria: [
        "Admin mostra status de billing por provider",
        "invoice/providerBilling nao e somado a ai_cost_log sem reconciliacao",
        "provedor com uso interno tem acao de configuracao explicita quando billing falta",
      ],
      confidence: signals.missingBillingConfig.length > 0 ? "alta" : "media",
    },
    {
      type: "cache_opportunity",
      target: topCacheOpportunity?.feature ?? topCostFeature?.feature ?? "features caras",
      module: "Admin IA & Custos",
      evidence: {
        opportunities: signals.cache.opportunities,
        cacheByFeature: signals.cache.byFeature,
        unusedEntries: signals.cache.totalUnusedEntries,
      },
      action:
        topCacheOpportunity
          ? `Avaliar cache semantico/exato para ${topCacheOpportunity.feature} com TTL e criterio de qualidade.`
          : "Monitorar hit-rate e entradas sem reuso antes de expandir cache.",
      impact: "Reduzir chamadas repetidas sem esconder resposta ruim ou desatualizada.",
      metric: "cache_hit_rate_por_feature_e_custo_evitable_usd",
      acceptanceCriteria: [
        "Feature cacheada registra hit/miss e custo evitado",
        "Cache so reutiliza resposta com score/qualidade aceitavel",
        "Entradas sem reuso viram revisao de TTL, nao limpeza automatica",
      ],
      confidence: topCacheOpportunity ? "media" : "baixa",
    },
    {
      type: "prompt_and_model_routing",
      target: topExpensiveFeature?.feature ?? topExpensiveModel?.rawModel ?? topLongCall?.feature ?? "modelos/prompts",
      module: "Admin IA & Custos",
      evidence: {
        expensiveModelsWithoutApparentGain: signals.expensiveModelsWithoutApparentGain,
        expensiveFeaturesWithoutApparentGain: signals.expensiveFeaturesWithoutApparentGain,
        longCalls: signals.longCalls,
      },
      action: "Testar compactacao de contexto, limite de tokens e roteamento revisado por humano antes de mudar provider/modelo.",
      impact: "Baixar custo por entrega util preservando qualidade pedagogica medida.",
      metric: "custo_por_entrega_util_com_qualidade_aceita",
      acceptanceCriteria: [
        "Experimento compara custo, latencia e qualidade aceita antes/depois",
        "Feature critica mantem fallback para modelo forte quando criterio pedagogico exigir",
        "Prompts longos tem limite, sumarizacao ou chunking instrumentado",
      ],
      confidence:
        signals.expensiveModelsWithoutApparentGain.length > 0 || signals.longCalls.length > 0
          ? "media"
          : "baixa",
    },
    {
      type: "reliability_cost",
      target: "fallbacks/retries/falhas",
      module: "Admin IA & Custos",
      evidence: signals.fallbackRetry,
      action: "Investigar falhas/retries/fallbacks que duplicam custo antes de aumentar limites de provider.",
      impact: "Reduzir custo desperdicado por repeticao de chamada e melhorar previsibilidade operacional.",
      metric: "falhas_retries_fallbacks_por_100_chamadas_ia",
      acceptanceCriteria: [
        "Falhas e retries ficam visiveis por feature/provider",
        "Fallback loga motivo e modelo final usado",
        "Alertas nao disparam autofix nem troca automatica de provider",
      ],
      confidence:
        signals.fallbackRetry.loggedFallbackCalls > 0 ||
        signals.fallbackRetry.eventFailures > 0 ||
        signals.fallbackRetry.eventRetries > 0
          ? "media"
          : "baixa",
    },
  ];

  const recommendation: HermesRecommendation = {
    agentId: "custos_ia_optimizer",
    area: "admin/ia_custos",
    module: "Admin IA & Custos",
    targetSurface: String(target),
    observedState,
    evidence: JSON.stringify({
      summary: signals.summary,
      byFeature: signals.byFeature,
      byModel: signals.byModel,
      generatedCounts: signals.generatedCounts,
      longCalls: signals.longCalls,
      fallbackRetry: signals.fallbackRetry,
      cache: signals.cache,
      missingBillingConfig: signals.missingBillingConfig,
      missingInstrumentation: signals.missingInstrumentation,
      tableSignals: signals.tableSignals,
    }),
    problemOpportunity: hasCostRisk
      ? "Admin ja enxerga uso/custo, mas ainda precisa priorizar onde ha gasto evitavel, prompts longos, cache mal aproveitado, retries/fallbacks ou billing real sem reconciliacao."
      : "Custo IA esta observavel no periodo, mas deve continuar medido contra entrega util e qualidade pedagogica aceita.",
    recommendedChange,
    expectedImpact:
      "Reduzir custo por aluno ativo/material gerado e melhorar confiabilidade financeira sem degradar qualidade pedagogica.",
    confidence:
      signals.missingBillingConfig.length > 0 ||
      signals.longCalls.length > 0 ||
      signals.expensiveFeaturesWithoutApparentGain.length > 0
        ? "alta"
        : hasCostRisk
          ? "media"
          : "baixa",
    successMetric:
      "Custo por entrega util, custo por aluno ativo, custo por material gerado, cache hit-rate, tokens medios por chamada e billing reconciliado.",
    implementationNotes:
      "O agente observa e recomenda; nao troca provider/modelo, nao limpa cache e nao aplica limite sem revisao humana e metrica de qualidade.",
    acceptanceCriteria: [
      "Recomendacao inclui evidencia, impacto, acao sugerida, metrica, aceite, confianca e alvo/modulo",
      "Admin consegue ver custo por feature, aluno ativo quando houver base e material gerado quando houver base",
      "Modelo caro ou prompt longo vira experimento medido, nao troca automatica",
      "Cache e billing ausentes viram lacuna/acao explicita em vez de economia inventada",
    ],
  };

  await persistPainAgentRecommendation(
    recommendation,
    {
      kind: "dor_real_agent",
      agentCatalog: "custos_ia_optimizer",
      snapshotGeneratedAt: signals.generatedAt,
      overlaps: ["gestao", "monitor", "Admin IA & Custos"],
      structuredRecommendation: {
        evidence: recommendation.evidence,
        impact: recommendation.expectedImpact,
        suggestedAction: recommendation.recommendedChange,
        action: recommendation.recommendedChange,
        metric: recommendation.successMetric,
        acceptanceCriteria: recommendation.acceptanceCriteria,
        confidence: recommendation.confidence,
        target: recommendation.targetSurface,
        module: recommendation.module,
      },
      observedSignals: {
        costByFeature: signals.byFeature,
        costPerActiveUser: signals.summary.costPerActiveUserUsd,
        costPerAluno: signals.summary.costPerAlunoUsd,
        costPerGeneratedMaterial: signals.summary.costPerGeneratedMaterialUsd,
        expensiveModelsWithoutApparentGain: signals.expensiveModelsWithoutApparentGain,
        expensiveFeaturesWithoutApparentGain: signals.expensiveFeaturesWithoutApparentGain,
        longPromptsHighTokenCalls: signals.longCalls,
        failuresRetriesFallbacks: signals.fallbackRetry,
        cacheOpportunitiesWaste: signals.cache,
        missingProviderBillingConfigVsInternalLogs: signals.missingBillingConfig,
      },
      structuredActions,
      missingInstrumentation: signals.missingInstrumentation,
      tableSignals: signals.tableSignals,
    },
    hasCostRisk ? 4 : 2,
    hasCostRisk
      ? {
          tipo: "custos_ia_optimizer",
          titulo: "Custos IA Optimizer encontrou oportunidade de eficiencia",
          corpo: recommendation.observedState,
        }
      : undefined,
  );
}

export async function uxProductAuditorDailyLearn(): Promise<void> {
  const signals = await fetchUxProductAuditorSignals(14);
  const structuredActions = buildUxStructuredActions(signals);
  const topAbandoned = signals.abandonedFlows[0];
  const topNegative = signals.negativeFeedbackByModule[0];
  const topHidden = signals.hiddenOrUnusedButtons[0];
  const hasUxRisk =
    signals.missingInstrumentation.length > 0 ||
    signals.abandonedFlows.length > 0 ||
    signals.negativeFeedbackByModule.length > 0 ||
    signals.hiddenOrUnusedButtons.length > 0 ||
    signals.duplicateRoutes.length > 0 ||
    signals.mobileLayoutRisks.length > 0;

  const target =
    topAbandoned?.flow ??
    topNegative?.module ??
    topHidden?.surface ??
    signals.duplicateRoutes[0]?.route ??
    "App Shell";

  const observedState = [
    `${signals.activityFunnels.length} funil(is) de atividade observados em ${signals.periodoDias}d`,
    topAbandoned
      ? `${topAbandoned.flow}: ${topAbandoned.abandoned} abandono(s), conclusao ${topAbandoned.completionRate ?? 0}%`
      : "sem abandono mensuravel ou sem evento started/completed suficiente",
    `${signals.duplicateRoutes.length} duplicacao(oes) de rota/menu catalogadas`,
    `${signals.hiddenOrUnusedButtons.length} risco(s) de botao/CTA escondido ou unused`,
    `${signals.negativeFeedbackByModule.reduce((sum, item) => sum + item.negativeSignals, 0)} feedback(s) negativo(s) por modulo`,
    `${signals.missingInstrumentation.length} lacuna(s) de observabilidade`,
  ].join("; ");

  const recommendedChange = topAbandoned
    ? `Priorizar UX do fluxo ${topAbandoned.flow}: reduzir passos ate a CTA primaria e instrumentar conclusao/abandono com evento claro.`
    : topHidden
      ? topHidden.action
      : signals.duplicateRoutes[0]
        ? signals.duplicateRoutes[0].action
        : topNegative
          ? `Triar feedback negativo de ${topNegative.module} e abrir criterio de aceite por superficie antes de alterar copy/layout.`
          : "Rodar QA manual mobile das rotas premium e completar eventos de CTA/feedback por modulo antes de inferir conversao.";

  const recommendation: HermesRecommendation = {
    agentId: "ux_product_auditor",
    area: "ux/product",
    module: "App Shell",
    targetSurface: String(target),
    observedState,
    evidence: JSON.stringify({
      premiumModules: signals.premiumModules,
      activityFunnels: signals.activityFunnels,
      abandonedFlows: signals.abandonedFlows,
      confusingScreensOrFlows: signals.confusingScreensOrFlows,
      hiddenOrUnusedButtons: signals.hiddenOrUnusedButtons,
      duplicateRoutes: signals.duplicateRoutes,
      excessiveTextRisks: signals.excessiveTextRisks,
      weakStateRisks: signals.weakStateRisks,
      mobileLayoutRisks: signals.mobileLayoutRisks,
      negativeFeedbackByModule: signals.negativeFeedbackByModule,
      modulesWithoutFeedbackSignals: signals.modulesWithoutFeedbackSignals,
      missingInstrumentation: signals.missingInstrumentation,
      tableSignals: signals.tableSignals,
    }),
    problemOpportunity: hasUxRisk
      ? "A experiencia premium ja tem shell e estados compartilhados, mas ainda pode perder usuarios por menu/CTA duplicado, modo escondido, fluxo abandonado, excesso de texto ou falta de feedback negativo por modulo."
      : "A auditoria UX/Product esta observavel no periodo, mas precisa continuar validando mobile, CTA e estados por papel.",
    recommendedChange,
    expectedImpact:
      "Aumentar descoberta de funcionalidades premium, reduzir abandono de fluxo e tornar recomendacoes UX auditaveis por modulo.",
    confidence:
      signals.abandonedFlows.length > 0 || signals.hiddenOrUnusedButtons.length > 0
        ? "alta"
        : hasUxRisk
          ? "media"
          : "baixa",
    successMetric:
      "Taxa de conclusao por fluxo, cliques ate CTA primaria, feedback negativo triado por modulo e QA mobile aprovado sem sobreposicao.",
    implementationNotes:
      "Este agente compoe qa_sintetico, App Shell e activity_events; ux_layout continua restrito a landing e nao e duplicado aqui.",
    acceptanceCriteria: [
      "Recomendacao inclui sinais de telas confusas, abandono, CTA hidden/unused, duplicidade, texto, estados, mobile e feedback por modulo",
      "Fluxo sem activity_events vira lacuna de instrumentacao, nao taxa inventada",
      "Mudanca de rota/menu exige QA manual e preserva alias funcional enquanto houver trafego",
      "Admin recebe descoberta/inbox com evidencia, acao, metrica, aceite, confianca e alvo/modulo",
    ],
  };

  await persistPainAgentRecommendation(
    recommendation,
    {
      kind: "dor_real_agent",
      agentCatalog: "ux_product_auditor",
      snapshotGeneratedAt: signals.snapshotGeneratedAt,
      overlaps: ["qa_sintetico.premiumQualityLoop", "ux_layout.landing_only", "activity_events"],
      structuredRecommendation: {
        evidence: recommendation.evidence,
        impact: recommendation.expectedImpact,
        suggestedAction: recommendation.recommendedChange,
        action: recommendation.recommendedChange,
        metric: recommendation.successMetric,
        acceptanceCriteria: recommendation.acceptanceCriteria,
        confidence: recommendation.confidence,
        target: recommendation.targetSurface,
        module: recommendation.module,
      },
      observedSignals: {
        confusingScreensOrFlows: signals.confusingScreensOrFlows,
        abandonedFlows: signals.abandonedFlows,
        unusedHiddenButtons: signals.hiddenOrUnusedButtons,
        duplicateMenuRoutes: signals.duplicateRoutes,
        excessiveText: signals.excessiveTextRisks,
        weakEmptyLoadingErrorStates: signals.weakStateRisks,
        mobileLayoutRisk: signals.mobileLayoutRisks,
        negativeFeedbackByModule: signals.negativeFeedbackByModule,
      },
      structuredActions,
      missingInstrumentation: signals.missingInstrumentation,
      tableSignals: signals.tableSignals,
    },
    hasUxRisk ? 4 : 2,
    hasUxRisk
      ? {
          tipo: "ux_product_auditor",
          titulo: "UX/Product Auditor encontrou friccao de jornada",
          corpo: recommendation.observedState,
        }
      : undefined,
  );
}

export async function contentGapCqoAvancadoDailyLearn(): Promise<void> {
  const signals = await fetchContentGapCqoAvancadoSignals(30);
  const missingBnccItems = Array.isArray(signals.missingBnccCoverage) ? signals.missingBnccCoverage : [];
  const missingEnemItems = Array.isArray(signals.missingEnemCoverage) ? signals.missingEnemCoverage : [];
  const hasCoverageRisk =
    signals.topicsWithDemandNoContent.length > 0 ||
    signals.contentIndex.contentGaps.length > 0 ||
    signals.missingBnccCoverage === true ||
    signals.missingEnemCoverage === true ||
    missingBnccItems.length > 0 ||
    missingEnemItems.length > 0 ||
    signals.lowMaterialQuality.length > 0 ||
    signals.contentWithoutSource.length > 0 ||
    signals.popularTopicWithWeakMaterial.length > 0 ||
    signals.missingPedagogicalBlocks.length > 0 ||
    signals.staleUnreviewedGeneratedMaterial.length > 0 ||
    signals.missingInstrumentation.length > 0;

  const topGap =
    signals.topicsWithDemandNoContent[0] ??
    signals.demandSignals[0] ??
    (signals.contentIndex.contentGaps[0]
      ? {
          topic: signals.contentIndex.contentGaps[0],
          demandScore: 0,
          demandSources: ["contentIndex.contentGaps"],
          generatedCount: 0,
          postuladoCount: 0,
          knowledgeDocCount: 0,
          hasBnccCoverage: false,
          hasEnemCoverage: false,
        }
      : null);
  const topWeakMaterial =
    signals.popularTopicWithWeakMaterial[0]?.weakMaterials[0] ??
    signals.lowMaterialQuality[0] ??
    signals.contentWithoutSource[0] ??
    signals.missingPedagogicalBlocks[0] ??
    signals.staleUnreviewedGeneratedMaterial[0];

  const target = topGap?.topic ?? topWeakMaterial?.materia ?? "Indice de conhecimento/CQO";
  const observedState = [
    `${signals.contentIndex.contentGaps.length} lacuna(s) no contentIndex`,
    `${signals.topicsWithDemandNoContent.length} topico(s) com demanda e sem conteudo/postulado`,
    `${signals.lowMaterialQuality.length} material(is) com score baixo`,
    `${signals.contentWithoutSource.length} material(is) sem fonte`,
    `${signals.missingPedagogicalBlocks.length} material(is) sem exercicio/exemplo/checkpoint`,
    `${signals.staleUnreviewedGeneratedMaterial.length} material(is) antigo(s) sem revisao`,
    `BNCC=${signals.missingBnccCoverage === true ? "sem cobertura detectada" : `${missingBnccItems.length} lacuna(s)`}`,
    `ENEM=${signals.missingEnemCoverage === true ? "sem cobertura detectada" : `${missingEnemItems.length} lacuna(s)`}`,
  ].join("; ");

  const recommendedChange = signals.topicsWithDemandNoContent[0]
    ? `Priorizar ingestao/curadoria de ${signals.topicsWithDemandNoContent[0].topic}: demanda ${signals.topicsWithDemandNoContent[0].demandScore}, sem material gerado nem postulado vinculado.`
    : signals.popularTopicWithWeakMaterial[0]
      ? `Revisar material de ${signals.popularTopicWithWeakMaterial[0].topic.topic}: topico popular com material/base fraca antes de ampliar geracao.`
      : signals.missingEnemCoverage === true || missingEnemItems.length > 0
        ? "Completar cobertura ENEM por disciplina/habilidade antes de tratar simulados e materiais como base premium."
        : signals.missingBnccCoverage === true || missingBnccItems.length > 0
          ? "Completar cobertura BNCC nos metadados/source dos documentos e materiais antes de prometer alinhamento curricular."
          : topWeakMaterial
            ? `Abrir revisao humana para "${topWeakMaterial.title}" (${topWeakMaterial.reasons.join(", ")}).`
            : "Manter monitoramento diario de cobertura, fonte, qualidade e revisao humana.";

  const structuredActions = [
    {
      type: "generate_or_curate_content",
      target: topGap?.topic ?? target,
      module: "CQO Conteudo",
      action:
        topGap && topGap.generatedCount === 0 && topGap.postuladoCount === 0
          ? `Criar ou curar material base para ${topGap.topic} com fonte verificavel, habilidade quando aplicavel e revisao humana.`
          : "Gerar/curar conteudo somente para lacunas com demanda real e fonte disponivel.",
      metric: "lacunas_priorizadas_fechadas_com_fonte",
      acceptanceCriteria: [
        "conteudo novo possui fonte/citacao ou documento de origem",
        "habilidade BNCC/ENEM aparece quando aplicavel e nao e inventada",
        "material passa por revisao humana antes de ser tratado como premium",
      ],
      confidence: topGap ? "alta" : "media",
    },
    {
      type: "open_review_task",
      target: topWeakMaterial?.title ?? "materiais fracos",
      module: "Curadoria Premium",
      action:
        topWeakMaterial
          ? `Abrir revisao de ${topWeakMaterial.title} por ${topWeakMaterial.reasons.join(", ")}.`
          : "Abrir revisao quando score/fonte/exercicio/exemplo/checkpoint ou revisao estiverem ausentes.",
      metric: "materiais_revisados_com_score_fonte_pratica",
      acceptanceCriteria: [
        "revisor ve motivo, evidencia e campos ausentes",
        "material revisado registra fonte, pratica/checkpoint e status",
        "nenhum material e aprovado automaticamente pelo Hermes",
      ],
      confidence: topWeakMaterial ? "alta" : "media",
    },
    {
      type: "prioritize_ingestion",
      target: signals.contentIndex.contentGaps[0] ?? topGap?.topic ?? "postulados/BNCC/ENEM",
      module: "Knowledge Index",
      action: "Priorizar ingestao de postulados, BNCC e/ou ENEM nos topicos com maior demanda e menor cobertura.",
      metric: "postuladoCoverageRatio_e_cobertura_bncc_enem",
      acceptanceCriteria: [
        "documentos ingeridos tem metadata source/tags coerentes",
        "contentIndex reduz lacunas sem duplicar topicos",
        "ratio postulado/demanda melhora no proximo daily-learn",
      ],
      confidence: signals.contentIndex.contentGaps.length > 0 ? "alta" : "media",
    },
    {
      type: "alert_teacher_admin",
      target,
      module: "Admin Hermes / Professor",
      action:
        "Alertar admin/professor para revisar lacuna curricular/material fraco antes de usar em turma ou resposta premium.",
      metric: "alertas_de_curadoria_revisados",
      acceptanceCriteria: [
        "alerta explica impacto pedagogico e evidencia",
        "professor/admin pode aceitar, dispensar ou pedir ingestao",
        "sem contato automatico com aluno/familia",
      ],
      confidence: hasCoverageRisk ? "media" : "baixa",
    },
  ];

  const recommendation: HermesRecommendation = {
    agentId: "content_gap_cqo_avancado",
    area: "conteudo/cqo_avancado",
    module: "CQO Conteudo",
    targetSurface: String(target),
    observedState,
    evidence: JSON.stringify({
      contentGaps: signals.contentIndex.contentGaps,
      demandSignals: signals.demandSignals.slice(0, 12),
      topicsWithDemandNoContent: signals.topicsWithDemandNoContent,
      missingBnccCoverage: signals.missingBnccCoverage,
      missingEnemCoverage: signals.missingEnemCoverage,
      lowMaterialQuality: signals.lowMaterialQuality,
      contentWithoutSource: signals.contentWithoutSource,
      popularTopicWithWeakMaterial: signals.popularTopicWithWeakMaterial,
      missingPedagogicalBlocks: signals.missingPedagogicalBlocks,
      staleUnreviewedGeneratedMaterial: signals.staleUnreviewedGeneratedMaterial,
      weakKnowledgeBase: signals.weakKnowledgeBase,
      tableSignals: signals.tableSignals,
      missingInstrumentation: signals.missingInstrumentation,
    }),
    problemOpportunity: hasCoverageRisk
      ? "O CQO ja enxerga cobertura basica, mas precisa priorizar lacunas por demanda real, fonte, BNCC/ENEM, qualidade e revisao para evitar material premium fraco."
      : "A cobertura atual nao mostra lacuna critica no snapshot, mas deve continuar auditada por demanda, fonte e qualidade pedagogica.",
    recommendedChange,
    expectedImpact:
      "Aumentar confiabilidade pedagogica, reduzir respostas sem base e direcionar curadoria/ingestao para o que alunos e professores realmente procuram.",
    confidence:
      signals.topicsWithDemandNoContent.length > 0 ||
      signals.popularTopicWithWeakMaterial.length > 0 ||
      signals.contentWithoutSource.length > 0
        ? "alta"
        : hasCoverageRisk
          ? "media"
          : "baixa",
    successMetric:
      "Lacunas priorizadas fechadas, postuladoCoverageRatio, cobertura BNCC/ENEM, materiais com fonte, score >=60, exercicio/exemplo/checkpoint e revisao humana.",
    implementationNotes:
      "O agente observa e abre recomendacao/inbox; nao publica, regenera, aprova material ou inventa habilidade/fonte automaticamente.",
    acceptanceCriteria: [
      "Topico com demanda e sem conteudo/postulado aparece no payload com fonte de demanda",
      "BNCC/ENEM ausentes viram lacuna de cobertura, nao promessa curricular",
      "Material fraco informa score/fonte/blocos/revisao ausentes",
      "Payload inclui acoes de curadoria, revisao, ingestao, alerta, metrica e criterios de aceite",
    ],
  };

  await persistPainAgentRecommendation(
    recommendation,
    {
      kind: "dor_real_agent",
      agentCatalog: "content_gap_cqo_avancado",
      snapshotGeneratedAt: signals.generatedAt,
      overlaps: ["cqo_conteudo", "knowledge-index", "auditor_pedagogico"],
      structuredRecommendation: {
        evidence: recommendation.evidence,
        impact: recommendation.expectedImpact,
        suggestedAction: recommendation.recommendedChange,
        action: recommendation.recommendedChange,
        metric: recommendation.successMetric,
        acceptanceCriteria: recommendation.acceptanceCriteria,
        confidence: recommendation.confidence,
        target: recommendation.targetSurface,
        module: recommendation.module,
      },
      observedSignals: {
        topicsWithDemandNoContent: signals.topicsWithDemandNoContent,
        missingBnccCoverage: signals.missingBnccCoverage,
        missingEnemCoverage: signals.missingEnemCoverage,
        lowMaterialQuality: signals.lowMaterialQuality,
        contentWithoutSource: signals.contentWithoutSource,
        popularSearchedTopicWithWeakMaterial: signals.popularTopicWithWeakMaterial,
        missingExercisesExamplesCheckpoints: signals.missingPedagogicalBlocks,
        staleUnreviewedGeneratedMaterial: signals.staleUnreviewedGeneratedMaterial,
      },
      structuredActions,
      missingInstrumentation: signals.missingInstrumentation,
      tableSignals: signals.tableSignals,
      contentIndex: signals.contentIndex,
    },
    hasCoverageRisk ? 4 : 2,
    hasCoverageRisk
      ? {
          tipo: "content_gap_cqo_avancado",
          titulo: "CQO avancado encontrou lacuna de conteudo",
          corpo: recommendation.observedState,
        }
      : undefined,
  );
}
