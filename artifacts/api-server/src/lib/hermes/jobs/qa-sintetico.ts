import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { openrouter, OR } from "../../aiClient";
import { logAiUsage } from "../../aiUsageTelemetry";
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
  module?: string;
  personas: SyntheticQaPersonaId[];
  superficies: string[];
  checklist: string[];
  metricas: string[];
}

export type PremiumQualityCadence = "daily" | "weekly";

export interface PremiumQualityLoopModule {
  id: string;
  module: "Landing" | "Home" | "Notebook RAG" | "Simulado" | "Tiagao" | "Caderno de Erros" | "Relatorios B2B";
  cadence: PremiumQualityCadence;
  ownerAgent: "qa_sintetico";
  surfaces: string[];
  evidenceSources: string[];
  dailyChecklist: string[];
  weeklyChecklist: string[];
  metrics: string[];
  acceptanceCriteria: string[];
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
  premiumQualityLoop: {
    cadence: {
      daily: string;
      weekly: string;
      guardrail: string;
    };
    modules: PremiumQualityLoopModule[];
  };
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

export const PREMIUM_QUALITY_LOOP_MODULES: PremiumQualityLoopModule[] = [
  {
    id: "landing_premium",
    module: "Landing",
    cadence: "weekly",
    ownerAgent: "qa_sintetico",
    surfaces: ["artifacts/studyai/src/pages/Landing.tsx", "/", "/pricing"],
    evidenceSources: ["landing audit", "CTA hierarchy", "mobile/desktop screenshot", "conversion/admin metrics"],
    dailyChecklist: [
      "Sem promessa de nota, aprovação ou resultado garantido",
      "CTA principal e CTA institucional continuam distintos",
      "Tiagão aparece como ponto de confiança, não como feature genérica",
    ],
    weeklyChecklist: [
      "Revisar primeira dobra em mobile e desktop",
      "Validar claims, preços, depoimentos e provas com evidência auditável",
      "Conferir se módulos aparecem como prova de capacidade e não como lista concorrente",
    ],
    metrics: ["clique CTA principal", "clique CTA institucional", "cadastro iniciado", "bounce percebido no hero"],
    acceptanceCriteria: [
      "Proposta entendida em até 5 segundos",
      "Nenhum claim sem fonte ou marcado como piloto",
      "Mobile não exige scroll excessivo para CTA primário",
    ],
  },
  {
    id: "home_premium",
    module: "Home",
    cadence: "daily",
    ownerAgent: "qa_sintetico",
    surfaces: ["artifacts/studyai/src/pages/Home.tsx", "/app"],
    evidenceSources: ["missão recomendada", "localStorage error review mission", "activity/user metrics"],
    dailyChecklist: [
      "Existe uma próxima ação clara acima da dobra",
      "Busca/upload inline não abre o Tiagão sem ação explícita",
      "Missão do Caderno de Erros tem prioridade quando recente",
    ],
    weeklyChecklist: [
      "Validar estados vazio/loading/erro/sucesso em viewport mobile",
      "Conferir se Home não virou dashboard pesado",
      "Revisar continuidade entre Home, Notebook, Simulado e Caderno",
    ],
    metrics: ["missão iniciada", "cliques até próxima ação", "abandono da Home", "uso do Tiagão a partir da missão"],
    acceptanceCriteria: [
      "Aluno identifica a próxima ação sem abrir menu",
      "Tiagão segue acessível por voz/texto",
      "Cards secundários não competem com a missão principal",
    ],
  },
  {
    id: "notebook_rag_premium",
    module: "Notebook RAG",
    cadence: "daily",
    ownerAgent: "qa_sintetico",
    surfaces: ["artifacts/studyai/src/pages/Notebook.tsx", "/api/notebook", "/api/rag-multi"],
    evidenceSources: ["notebook_material_generated", "notebook_feedback", "hermes_notebook_rag", "content gaps"],
    dailyChecklist: [
      "Material premium tem objetivo, fonte/evidência, exemplos e checkpoint",
      "Preview e exportação preservam visual, imagens, tabelas e quebras",
      "Feedback negativo ou fallback gera sinal Hermes auditável",
    ],
    weeklyChecklist: [
      "Gerar apresentação real e revisar 3 slides de desenvolvimento",
      "Exportar PDF/print e conferir visual estruturado",
      "Comparar lacunas do índice com feedback negativo recente",
    ],
    metrics: ["notebook_material_generated", "notebook_feedback negativo", "visual slots resolvidos", "contentIndex.contentGaps"],
    acceptanceCriteria: [
      "Nenhum slide de conteúdo fica só em título + bullets em fundo vazio",
      "Fonte aparece quando documento/RAG influencia o material",
      "Critérios premium aparecem no payload Hermes quando há falha",
    ],
  },
  {
    id: "simulado_premium",
    module: "Simulado",
    cadence: "daily",
    ownerAgent: "qa_sintetico",
    surfaces: ["artifacts/studyai/src/pages/SimuladoEnem.tsx", "/api/simulado-enem", "/api/enem-bank"],
    evidenceSources: ["simulado_results", "simulado_started/completed", "draft de revisão de erro"],
    dailyChecklist: [
      "Questões têm enunciado, alternativas, gabarito e explicação consistentes",
      "Resultado vira análise por habilidade/erro e próxima missão",
      "Fluxo para Caderno de Erros não exige copiar texto manualmente",
    ],
    weeklyChecklist: [
      "Rodar simulado curto com erro proposital",
      "Validar análise premium, envio ao Caderno e prompt de revisão do Tiagão",
      "Conferir métricas de conclusão e abandono por etapa",
    ],
    metrics: ["simuladosPeriodo", "taxa de conclusão", "erros enviados ao Caderno", "acurácia por área"],
    acceptanceCriteria: [
      "Aluno recebe feedback explicativo ao finalizar",
      "Rascunho de erro inclui tipo, causa provável, habilidade/matéria e próximo passo",
      "Falha de banco não bloqueia toda a jornada",
    ],
  },
  {
    id: "tiagao_premium",
    module: "Tiagao",
    cadence: "daily",
    ownerAgent: "qa_sintetico",
    surfaces: ["artifacts/studyai/src/components/VoiceProfessor.tsx", "/api/chat", "/api/math", "/api/videos"],
    evidenceSources: ["tiagao_sessions", "tiagao_actions_log", "modo revisar erro", "eventos de navegação"],
    dailyChecklist: [
      "Tiagão reconhece contexto antes de resolver",
      "Modo revisar erro usa matéria, causa provável e próximo passo",
      "Ações no app só acontecem por comando claro do aluno",
    ],
    weeklyChecklist: [
      "Testar dúvida rápida, plano, revisar erro e estudar material",
      "Validar voz/texto em mobile",
      "Conferir se nenhum prompt interno Hermes vaza para o aluno",
    ],
    metrics: ["resolução da dúvida", "sessões Tiagão", "ações aceitas", "fallback/erro de voz"],
    acceptanceCriteria: [
      "Resposta é verificável e adequada ao nível",
      "Tiagão permanece central, mas não sequestra busca/upload inline",
      "A navegação proposta é reversível e explícita",
    ],
  },
  {
    id: "caderno_erros_premium",
    module: "Caderno de Erros",
    cadence: "daily",
    ownerAgent: "qa_sintetico",
    surfaces: ["artifacts/studyai/src/pages/Caderno.tsx", "artifacts/studyai/src/lib/error-review.ts", "/caderno"],
    evidenceSources: ["caderno_notes", "studyai:hermes-learning-signal", "error review draft/mission"],
    dailyChecklist: [
      "Rascunho importado mostra erro, causa, quantidade e próxima missão",
      "Salvar nota preserva histórico sem perder recomendação Hermes",
      "Home consegue consumir missão recente como próxima ação",
    ],
    weeklyChecklist: [
      "Executar Simulado -> Caderno -> salvar -> Home -> Tiagão revisar erro",
      "Conferir linguagem de reparo sem culpa e com foco em treino",
      "Validar persistência estruturada quando schema/API existir",
    ],
    metrics: ["notas de revisão criadas", "missões de erro iniciadas", "revisões concluídas", "erros recorrentes"],
    acceptanceCriteria: [
      "Aluno entende o que errou, por quê e qual treino fazer",
      "Tiagão recebe prompt específico de revisão",
      "Nada é alterado automaticamente sem ação do aluno/admin",
    ],
  },
  {
    id: "relatorios_b2b_premium",
    module: "Relatorios B2B",
    cadence: "weekly",
    ownerAgent: "qa_sintetico",
    surfaces: [
      "artifacts/studyai/src/pages/Professor.tsx",
      "artifacts/studyai/src/pages/ProfessorTurma.tsx",
      "/professor",
      "/professor/turma/:id",
    ],
    evidenceSources: ["teacher dashboard/report", "CSV export", "print/PDF report", "class diagnostic CSV"],
    dailyChecklist: [
      "Relatório não inventa último login, tempo real por sessão ou intervenção inexistente",
      "CSV preserva sinais disponíveis e lacunas por aluno/turma",
      "Ação recomendada exige revisão humana antes de contato institucional",
    ],
    weeklyChecklist: [
      "Baixar CSV geral e CSV de turma com dados reais ou amostra controlada",
      "Imprimir/salvar PDF e conferir bloco de critérios de revisão humana",
      "Validar que professor/gestor entendem o que é dado observado versus lacuna",
    ],
    metrics: ["exports CSV", "prints/PDF", "sinais disponíveis por linha", "lacunas explícitas no relatório"],
    acceptanceCriteria: [
      "Export não cria risco individual fora dos dados carregados",
      "Cada linha exportada tem sinal, ação recomendada e lacunas",
      "Relatório impresso explicita revisão humana e limites de dados",
    ],
  },
];

export const SYNTHETIC_QA_JOURNEYS: SyntheticQaJourney[] = [
  {
    id: "premium_quality_loop",
    titulo: "Hermes monitora qualidade premium multi-módulo",
    module: "Premium quality loop",
    personas: ["aluno_fundamental", "aluno_medio_enem", "vestibulando_concurseiro", "professor", "gestor_instituicao"],
    superficies: [
      "Landing",
      "Home",
      "Notebook RAG",
      "Simulado",
      "Tiagao",
      "Caderno de Erros",
      "Relatorios B2B",
    ],
    checklist: [
      "Cada recomendação identifica módulo, evidência, problema, mudança, métrica e critérios de aceite",
      "Checklist diário cobre módulos de uso recorrente sem acionar correção destrutiva",
      "Checklist semanal exige QA manual das jornadas premium ponta a ponta e dos exports B2B",
      "Módulos sem telemetria suficiente viram lacuna de observabilidade, não métrica inventada",
    ],
    metricas: [
      "recomendações com module preenchido",
      "lacunas de observabilidade por módulo",
      "QA manual diário/semanal concluído",
      "regressões premium abertas/fechadas",
    ],
  },
  {
    id: "aluno_plano_estudo",
    titulo: "Aluno pede plano de estudo",
    module: "Home",
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
    module: "Simulado",
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
    module: "Tiagao",
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
    module: "Notebook RAG",
    personas: ["aluno_medio_enem", "vestibulando_concurseiro", "professor"],
    superficies: ["/api/notebook", "/api/rag-multi", "/api/board", "/api/aula-ia"],
    checklist: [
      "Recuperação cita ou descreve fonte de forma confiável",
      "Conteúdo gerado mantém estrutura didática",
      "Material gerado segue o padrão premium de metadados pedagógicos",
      "Material respeita preferências selecionadas: público, profundidade, visual, tom e prompt livre",
      "Preview e PDF preservam visual enrichment: imagens, diagramas, captions, créditos e placeholders claros",
      "Hermes recebe sinais de geração, fallback, exportação, retry e feedback para recomendações futuras",
      "Lousa/material não fica preso em estado de geração",
      "Fallback é claro quando não há fonte suficiente",
    ],
    metricas: ["documentos indexados", "aulas pendentes", "erros de RAG", "notebook_material_generated", "notebook_feedback", "visual slots resolvidos"],
  },
  {
    id: "caderno_erros_revisao",
    titulo: "Aluno transforma erro em revisão no Caderno",
    module: "Caderno de Erros",
    personas: ["aluno_medio_enem", "vestibulando_concurseiro"],
    superficies: ["/caderno", "artifacts/studyai/src/pages/Caderno.tsx", "artifacts/studyai/src/lib/error-review.ts"],
    checklist: [
      "Rascunho do simulado preserva tipo de erro, causa provável, matéria/habilidade e próxima missão",
      "Caderno mostra contexto premium antes de salvar",
      "Salvar nota emite sinal Hermes e mantém histórico do aluno",
      "Home prioriza a missão recente sem esconder Tiagão",
    ],
    metricas: ["notas de revisão criadas", "missões de erro iniciadas", "revisões concluídas"],
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
    module: "Admin Hermes",
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
    surface: "Landing premium",
    routes: ["/", "/pricing", "artifacts/studyai/src/pages/Landing.tsx"],
    personaHints: ["aluno_fundamental", "aluno_medio_enem", "vestibulando_concurseiro", "gestor_instituicao"],
  },
  {
    surface: "Home centro de comando",
    routes: ["/app", "artifacts/studyai/src/pages/Home.tsx"],
    personaHints: ["aluno_fundamental", "aluno_medio_enem", "vestibulando_concurseiro"],
  },
  {
    surface: "Aluno/Tiagão",
    routes: ["/api/chat", "/api/studyai", "/api/math", "/api/videos"],
    personaHints: ["aluno_fundamental", "aluno_medio_enem", "vestibulando_concurseiro"],
  },
  {
    surface: "Simulados e questões",
    routes: ["/api/simulado", "/api/simulado-adaptativo", "/api/simulado-enem", "/api/enem-bank", "artifacts/studyai/src/pages/SimuladoEnem.tsx"],
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
    surface: "Caderno de Erros",
    routes: ["/caderno", "artifacts/studyai/src/pages/Caderno.tsx", "artifacts/studyai/src/lib/error-review.ts"],
    personaHints: ["aluno_medio_enem", "vestibulando_concurseiro"],
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
  "activity_events",
  "daily_metrics",
  "knowledge_documents",
  "board_lessons",
  "notebooks",
  "caderno_notes",
  "tiagao_sessions",
  "tiagao_actions_log",
  "generated_content",
  "material_style_events",
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
    premiumQualityLoop: {
      cadence: {
        daily:
          "Rodar via daily-learn e revisar módulos de uso recorrente: Home, Notebook RAG, Simulado, Tiagão e Caderno de Erros.",
        weekly:
          "Executar checklist manual ponta a ponta em Landing, Home, Notebook RAG, Simulado, Tiagão e Caderno de Erros antes de release premium.",
        guardrail:
          "Hermes só recomenda, cria descoberta/inbox/tarefa de triagem; não aplica autofix nem mutação destrutiva em produção.",
      },
      modules: PREMIUM_QUALITY_LOOP_MODULES,
    },
    pedagogicalMaterialStandard: PREMIUM_MATERIAL_STANDARD_SUMMARY,
    safetyRules: SAFETY_RULES,
  };
}

function findJourney(journeyId: string): SyntheticQaJourney | undefined {
  return SYNTHETIC_QA_JOURNEYS.find((journey) => journey.id === journeyId);
}

function resolveRecommendationModule(journey: SyntheticQaJourney): string | undefined {
  return (
    journey.module ??
    PREMIUM_QUALITY_LOOP_MODULES.find((module) =>
      journey.superficies.some((surface) =>
        module.surfaces.includes(surface) || module.module.toLowerCase() === surface.toLowerCase(),
      ),
    )?.module
  );
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
    module: resolveRecommendationModule(journey),
    targetSurface: journey.superficies.join(", "),
    observedState: `Auditoria sintética ${journey.titulo} para ${personaId}; período ${snapshot.periodoDias}d.`,
    evidence: JSON.stringify({
      journeyId: journey.id,
      personaId,
      platformMetrics: snapshot.platformMetrics,
      contentGaps: snapshot.contentIndex.contentGaps.slice(0, 5),
      pedagogicalMaterialStandard: snapshot.pedagogicalMaterialStandard,
      premiumQualityLoop: snapshot.premiumQualityLoop.modules.map((module) => ({
        module: module.module,
        cadence: module.cadence,
        evidenceSources: module.evidenceSources,
      })),
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
        premiumQualityLoop: {
          daily: snapshot.premiumQualityLoop.cadence.daily,
          weekly: snapshot.premiumQualityLoop.cadence.weekly,
          modules: snapshot.premiumQualityLoop.modules.map((module) => ({
            module: module.module,
            cadence: module.cadence,
            metrics: module.metrics,
            acceptanceCriteria: module.acceptanceCriteria,
          })),
        },
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
            "Use premiumQualityLoop para monitorar Landing, Home, Notebook RAG, Simulado, Tiagao e Caderno de Erros já tocados nesta fase.",
            "Cada finding precisa preencher recommendation.module quando a recomendação mirar um desses módulos.",
            "Toda recomendação deve conter módulo, evidência, problema/oportunidade, mudança sugerida, métrica de sucesso e critérios de aceite.",
            "Use a cadência diária/semanal apenas como contexto de triagem; não crie autofix nem ação destrutiva.",
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
  logAiUsage({
    userId: opts.requestedBy,
    feature: "hermes_qa_sintetico",
    model: OR.claudeFast,
    usage: completion.usage,
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
