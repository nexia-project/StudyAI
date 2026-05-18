import { agentRegistry } from "./agentRegistry";
import { gestaoDailyLearn, gestaoProactive } from "./jobs/gestao";
import { crescimentoDailyLearn, crescimentoProactive } from "./jobs/crescimento";
import { marketingDailyLearn, marketingProactive } from "./jobs/marketing";
import { inboxProactive } from "./jobs/inbox";
import { uxLayoutDailyLearn, uxLayoutProactive } from "./jobs/ux-layout";
import { sucessoAlunoDailyLearn, sucessoAlunoProactive } from "./jobs/sucesso-aluno";
import { monitorProactive } from "./jobs/monitor";
import { cqoConteudoDailyLearn } from "./jobs/cqo-conteudo";
import { qaSinteticoDailyLearn } from "./jobs/qa-sintetico";
import {
  auditorPedagogicoDailyLearn,
  notebookRagQualityDailyLearn,
  professorSuccessDailyLearn,
} from "./jobs/dor-real-agents";

let registered = false;

export function registerDefaultAgents(): void {
  if (registered) return;

  agentRegistry.register({
    id: "gestao",
    description: "Agente de gestão — análise de métricas e operação para o founder",
    role: "admin",
    handler: async () => ({
      ok: true,
      message: "Use POST /api/agents/gestao/query para a lógica de domínio.",
    }),
    dailyLearn: gestaoDailyLearn,
    proactive: gestaoProactive,
  });

  agentRegistry.register({
    id: "crescimento",
    description: "Agente de crescimento — copy de marketing e testes A/B",
    role: "admin",
    handler: async () => ({
      ok: true,
      message: "Use POST /api/agents/crescimento/gerar-copy para a lógica de domínio.",
    }),
    dailyLearn: crescimentoDailyLearn,
    proactive: crescimentoProactive,
  });

  agentRegistry.register({
    id: "marketing",
    description: "Agente de marketing — planejamento de campanhas e criativos",
    role: "admin",
    handler: async () => ({
      ok: true,
      message:
        "Use POST /api/agents/marketing/planejar-campanha, /criativos ou /analisar-resultados.",
    }),
    dailyLearn: marketingDailyLearn,
    proactive: marketingProactive,
  });

  agentRegistry.register({
    id: "inbox",
    description: "Inbox admin — notificações e alertas para o founder",
    role: "admin",
    handler: async () => ({
      ok: true,
      message: "Use GET /api/agents/inbox e POST /read ou /dismiss.",
    }),
    proactive: inboxProactive,
  });

  agentRegistry.register({
    id: "ux_layout",
    description: "Agente UX — hierarquia, CTA e microcopy da landing",
    role: "admin",
    handler: async () => ({
      ok: true,
      message: "Use POST /api/agents/ux_layout/revisar-tela para revisão estruturada.",
    }),
    dailyLearn: uxLayoutDailyLearn,
    proactive: uxLayoutProactive,
  });

  agentRegistry.register({
    id: "sucesso_aluno",
    description: "Retenção e CS — risco de churn e planos de intervenção",
    role: "admin",
    handler: async () => ({
      ok: true,
      message:
        "Use POST /api/agents/sucesso_aluno/analisar-risco ou /plano-intervencao.",
    }),
    dailyLearn: sucessoAlunoDailyLearn,
    proactive: sucessoAlunoProactive,
  });

  agentRegistry.register({
    id: "monitor",
    description: "Saúde do sistema — alertas operacionais (produtor de inbox)",
    role: "system",
    handler: async () => ({
      ok: true,
      message: "Agente apenas cron — alertas em hermes_admin_inbox via proactive.",
    }),
    proactive: monitorProactive,
  });

  agentRegistry.register({
    id: "cqo_conteudo",
    description: "Qualidade de conteúdo — lacunas e padrões do índice de conhecimento",
    role: "system",
    handler: async () => ({
      ok: true,
      message: "CQO enriquece geração via buildHermesContext; dailyLearn indexa lacunas.",
    }),
    dailyLearn: cqoConteudoDailyLearn,
  });

  agentRegistry.register({
    id: "qa_sintetico",
    description: "QA sintético — jornadas reais por persona para bugs, UX e qualidade pedagógica",
    role: "system",
    handler: async () => ({
      ok: true,
      message: "Use GET /api/agents/qa_sintetico/catalogo ou POST /executar-auditoria.",
    }),
    dailyLearn: qaSinteticoDailyLearn,
  });

  agentRegistry.register({
    id: "auditor_pedagogico",
    description:
      "Auditor Pedagógico — qualidade de materiais, fontes, exercícios e critérios premium",
    role: "system",
    handler: async () => ({
      ok: true,
      message:
        "Agente de dor real registrado no catálogo Hermes; roda no daily-learn e persiste recomendações estruturadas.",
    }),
    dailyLearn: auditorPedagogicoDailyLearn,
  });

  agentRegistry.register({
    id: "notebook_rag_quality",
    description:
      "Notebook RAG Quality — visual, exportação, fallback, feedback e qualidade de fonte",
    role: "system",
    handler: async () => ({
      ok: true,
      message:
        "Agente de dor real registrado no catálogo Hermes; roda no daily-learn e persiste recomendações estruturadas.",
    }),
    dailyLearn: notebookRagQualityDailyLearn,
  });

  agentRegistry.register({
    id: "professor_success",
    description:
      "Professor Success — ativação docente, turma, relatórios, Notebook do Professor e intervenções",
    role: "system",
    handler: async () => ({
      ok: true,
      message:
        "Agente de dor real registrado no catálogo Hermes; roda no daily-learn e persiste recomendações estruturadas.",
    }),
    dailyLearn: professorSuccessDailyLearn,
  });

  registered = true;
}
