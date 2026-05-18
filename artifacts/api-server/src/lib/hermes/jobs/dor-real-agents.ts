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
    status: "partial",
    responsibility: "Reduzir custo IA sem degradar qualidade pedagogica.",
    observedSignals: ["uso por provider", "custo por feature", "fallbacks/caches"],
    evidence: ["Admin IA & Custos", "ai usage telemetry"],
    metrics: ["custo por entrega util", "latencia", "qualidade aceita"],
    actions: ["recomendar cache/model routing", "abrir alerta de custo"],
    safetyBoundaries: ["nao troca provider/modelo automaticamente"],
    adminOutput: "Roadmap/TODO apos primeira leva.",
    overlaps: ["gestao", "monitor"],
  },
  {
    id: "ux_product_auditor",
    priority: 8,
    name: "UX/Product Auditor",
    productRole: "admin",
    status: "existing",
    responsibility: "Auditar friccao, clareza de CTA e jornadas por papel.",
    observedSignals: ["hierarquia visual", "rotas duplicadas", "estados vazios"],
    evidence: ["ux_layout", "qa_sintetico", "App Shell"],
    metrics: ["cliques ate acao", "abandono", "tarefas concluidas"],
    actions: ["abrir recomendacao UX", "pedir QA manual mobile"],
    safetyBoundaries: ["nao remove rota funcional sem validacao"],
    adminOutput: "Roadmap/TODO apos primeira leva.",
    overlaps: ["ux_layout", "qa_sintetico"],
  },
  {
    id: "content_gap_cqo_avancado",
    priority: 9,
    name: "Content Gap/CQO avancado",
    productRole: "admin",
    status: "existing",
    responsibility: "Priorizar lacunas de conteudo por demanda, risco e cobertura.",
    observedSignals: ["contentGaps", "postulados", "demanda por materia"],
    evidence: ["cqo_conteudo", "knowledge-index"],
    metrics: ["coverage ratio", "lacunas fechadas", "qualidade por materia"],
    actions: ["priorizar ingestao/curadoria", "abrir plano CQO"],
    safetyBoundaries: ["nao publica conteudo sem revisao"],
    adminOutput: "Roadmap/TODO apos primeira leva.",
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
