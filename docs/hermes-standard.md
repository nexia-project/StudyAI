# Hermes — padrão de agentes admin

Hermes é a família de agentes de negócio/gestão do StudyAI (sibling do Tiagão, que atende o aluno em `/api/chat`).

## Regras

1. **Aprendizado assíncrono** — insights e descobertas vão para `hermes_descobertas_globais` via jobs `dailyLearn`, não bloqueiam a UI.
2. **Enriquece a geração** — rotas HTTP leem memória (`hermes_memoria_interacao`) e métricas antes de chamar a IA; o admin vê resposta enriquecida na hora.
3. **Sem botão “refazer”** — não expor “gerar de novo” como fluxo principal; iterar com novo prompt/contexto se necessário.
4. **Novos agentes** — registrar em `register-default-agents.ts` com `handler` + opcional `dailyLearn` / `proactive`; rotas em `routes/agents/<id>.ts`; montar em `routes/agents/index.ts`.
5. **QA sintético** — `qa_sintetico` simula jornadas de aluno/professor/gestor por snapshots estruturados; detalhes em `docs/hermes-qa-sintetico.md`.

## Infra

| Peça | Onde |
|------|------|
| Registry | `lib/hermes/agentRegistry.ts` |
| Cron HTTP | `POST /internal/hermes/daily-learn`, `POST /internal/hermes/hourly-proactive`, `POST /internal/hermes/process-tasks` |
| Auth cron | Header `x-cron-secret` = `HERMES_CRON_SECRET` |
| API admin | `/api/agents/*` + `requireAdmin` |
| Schema | `lib/db/src/schema/hermes.ts` + boot `ensureSchema.ts` |
| QA sintético | `GET /api/agents/qa_sintetico/catalogo`, `POST /api/agents/qa_sintetico/executar-auditoria` |

## Cron (Railway)

- **daily-learn**: 1×/dia — todos os agentes com `dailyLearn`.
- **hourly-proactive**: 1×/hora — todos com `proactive`; também drena até 5 itens de `hermes_tarefas` ao final.
- **process-tasks**: a cada 5–15 min — worker dedicado para drenar `hermes_tarefas` sem esperar o hourly. Aceita `?limit=10` ou corpo JSON `{ "limit": 10 }` (máximo 50).

Todos usam `POST` e exigem o header `x-cron-secret` com o valor de `HERMES_CRON_SECRET`.

Resposta JSON:

- `daily-learn` / `hourly-proactive`: `{ ok, ran, errors }` (`hourly-proactive` também retorna `processTasks`).
- `process-tasks`: `{ ok, claimed, completed, failed, errors }`.

Checklist Railway:

1. Definir `HERMES_CRON_SECRET` nas variáveis do serviço.
2. Criar cron/job diário para `POST https://<dominio>/internal/hermes/daily-learn`.
3. Criar cron/job horário para `POST https://<dominio>/internal/hermes/hourly-proactive`.
4. Criar cron/job a cada 5–15 min para `POST https://<dominio>/internal/hermes/process-tasks?limit=10`.
5. Em todos os jobs, enviar o header `x-cron-secret: <HERMES_CRON_SECRET>`.
