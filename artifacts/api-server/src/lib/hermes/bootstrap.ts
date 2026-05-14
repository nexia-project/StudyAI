import { agentRegistry } from "./agentRegistry";
import { registerDefaultAgents } from "./register-default-agents";

let initialized = false;

/**
 * initHermes — idempotente. Chame em qualquer entrypoint que precise do
 * registry populado (rotas HTTP e rotas cron). Múltiplas chamadas são no-op.
 */
export function initHermes(): void {
  if (initialized) return;
  registerDefaultAgents();
  initialized = true;
  console.log(
    `[hermes] inicializado com ${agentRegistry.size()} agente(s):`,
    agentRegistry.list().map((a) => a.id).join(", "),
  );
}
