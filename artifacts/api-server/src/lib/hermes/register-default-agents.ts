import { agentRegistry } from "./agentRegistry";

let registered = false;

/**
 * Registra os agentes Hermes padrões (idempotente).
 *
 * A lógica de domínio real fica nas rotas (`routes/agents/gestao.ts`,
 * `routes/agents/crescimento.ts`). Aqui só descrevemos o registry para
 * o módulo cron descobrir quais agentes existem e chamar seus hooks.
 */
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
    dailyLearn: async () => {
      console.log("[hermes/gestao] dailyLearn — placeholder (substituir por agregação de métricas)");
    },
    proactive: async () => {
      console.log("[hermes/gestao] proactive — placeholder (substituir por detecção de anomalias)");
    },
  });

  agentRegistry.register({
    id: "crescimento",
    description: "Agente de crescimento — copy de marketing e testes A/B",
    role: "admin",
    handler: async () => ({
      ok: true,
      message: "Use POST /api/agents/crescimento/gerar-copy para a lógica de domínio.",
    }),
    dailyLearn: async () => {
      console.log("[hermes/crescimento] dailyLearn — placeholder (substituir por análise de conversão)");
    },
    proactive: async () => {
      console.log("[hermes/crescimento] proactive — placeholder (substituir por sugestões de copy)");
    },
  });

  registered = true;
}
