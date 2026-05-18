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
    responsibility: "Detectar risco de inatividade/churn e recomendar intervencoes seguras.",
    observedSignals: ["assinantes sem estudo", "usuarios sem atividade", "baixo uso de simulado"],
    evidence: ["user_activity", "simulado_results", "users"],
    metrics: ["reativacao 7d", "sessoes de estudo", "retencao", "simuladosPeriodo"],
    actions: ["plano de reengajamento", "mensagem por fila Hermes", "revisar onboarding"],
    safetyBoundaries: ["nao envia mensagem real sem aprovacao", "nao expõe PII desnecessaria"],
    adminOutput: "Acoes proativas e inbox de risco de churn.",
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
    status: "partial",
    responsibility: "Transformar resultado de simulado em diagnostico, treino e revisao.",
    observedSignals: ["simuladosPeriodo", "erros por area", "missao de recuperacao"],
    evidence: ["simulado_results", "Caderno de Erros", "qa_sintetico.simulado_premium"],
    metrics: ["conclusao de simulado", "erros enviados ao Caderno", "recuperacao concluida"],
    actions: ["priorizar habilidade fraca", "abrir revisao no Caderno", "sugerir treino curto"],
    safetyBoundaries: ["nao promete nota/aprovacao", "nao inventa habilidade sem metadado"],
    adminOutput: "Roadmap/TODO apos primeira leva.",
    overlaps: ["qa_sintetico", "Caderno de Erros premium"],
  },
  {
    id: "caderno_erros_intelligence",
    priority: 6,
    name: "Caderno de Erros Intelligence",
    productRole: "student",
    status: "partial",
    responsibility: "Detectar recorrencia de erro e fechar loop de revisao.",
    observedSignals: ["notas de revisao", "missoes pendentes", "erros recorrentes"],
    evidence: ["caderno_notes", "studyai:hermes-learning-signal"],
    metrics: ["revisoes concluidas", "streak", "erro recorrente reduzido"],
    actions: ["sugerir revisao", "acionar Tiagao em modo corretor"],
    safetyBoundaries: ["nao cria progresso global falso", "acoes do aluno sao explicitas"],
    adminOutput: "Roadmap/TODO apos primeira leva.",
    overlaps: ["qa_sintetico", "Home next-best-action"],
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
