import type { Request } from "express";

/**
 * Hermes — agente sibling do Tiagão.
 *
 * Tiagão é o agente do aluno (rota /api/chat). Hermes é uma família de agentes
 * de admin/business (gestão, crescimento, …) que vivem em /api/agents/<id>/* e
 * compartilham um registry + jobs cron (daily-learn, hourly-proactive).
 *
 * Cada agente declara `handler` (chamado pelas rotas HTTP) e opcionalmente
 * `dailyLearn` / `proactive` (chamados pelo Railway Cron via /internal/hermes/*).
 */

export interface AgentContext {
  userId: string;
  payload: Record<string, any>;
  req: Request;
}

export interface AgentResult {
  ok: boolean;
  data?: any;
  message?: string;
  warnings?: string[];
}

export interface AgentDefinition {
  id: string;
  description: string;
  role: "admin" | "system";
  handler: (ctx: AgentContext) => Promise<AgentResult>;
  /** Roda 1x/dia via /internal/hermes/daily-learn (Railway Cron). */
  dailyLearn?: () => Promise<void>;
  /** Roda 1x/hora via /internal/hermes/hourly-proactive (Railway Cron). */
  proactive?: () => Promise<void>;
}

class AgentRegistry {
  private agents = new Map<string, AgentDefinition>();

  register(agent: AgentDefinition): void {
    if (this.agents.has(agent.id)) {
      console.warn(`[hermes] agent '${agent.id}' já registrado — sobrescrevendo`);
    }
    this.agents.set(agent.id, agent);
  }

  get(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  list(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  size(): number {
    return this.agents.size;
  }
}

export const agentRegistry = new AgentRegistry();
