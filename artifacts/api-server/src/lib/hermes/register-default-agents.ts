import { agentRegistry } from "./agentRegistry";
import { gestaoDailyLearn, gestaoProactive } from "./jobs/gestao";
import { crescimentoDailyLearn, crescimentoProactive } from "./jobs/crescimento";
import { marketingDailyLearn, marketingProactive } from "./jobs/marketing";
import { inboxProactive } from "./jobs/inbox";

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

  registered = true;
}
