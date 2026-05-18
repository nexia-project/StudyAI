# Hermes — padrão de agentes admin

Hermes é a família de agentes de negócio/gestão do StudyAI (sibling do Tiagão, que atende o aluno em `/api/chat`).

## Regras

1. **Aprendizado assíncrono** — insights e descobertas vão para `hermes_descobertas_globais` via jobs `dailyLearn`, não bloqueiam a UI.
2. **Enriquece a geração** — rotas HTTP leem memória (`hermes_memoria_interacao`) e métricas antes de chamar a IA; o admin vê resposta enriquecida na hora.
3. **Sem botão “refazer”** — não expor “gerar de novo” como fluxo principal; iterar com novo prompt/contexto se necessário.
4. **Novos agentes** — registrar em `register-default-agents.ts` com `handler` + opcional `dailyLearn` / `proactive`; rotas em `routes/agents/<id>.ts`; montar em `routes/agents/index.ts`.
5. **QA sintético** — `qa_sintetico` simula jornadas de aluno/professor/gestor por snapshots estruturados; detalhes em `docs/hermes-qa-sintetico.md`.
6. **Loop premium** — recomendações sobre Landing, Home, Notebook RAG, Simulado, Tiagão e Caderno de Erros devem preencher `recommendation.module`, evidência, problema, mudança sugerida, métrica e critérios de aceite.
7. **Agentes de dor real** — Hermes deve crescer por dores reais, não por bots genéricos. A doutrina, prioridade e primeira leva (`auditor_pedagogico`, `notebook_rag_quality`, `professor_success`) ficam em `docs/hermes-agentes-dor-real.md`.
8. **Action Center seguro** — recomendação não é execução. Recomendações podem virar tarefas operacionais com responsável, status, prioridade, fonte, módulo/target, evidência, métrica, baseline/follow-up e critérios de aceite. A primeira versão registra aprovação e triagem humana em `hermes_tarefas.payload.actionCenter`; nenhuma tarefa altera conteúdo, billing, usuários, dados de aluno/turma ou produção automaticamente.

## Infra

| Peça | Onde |
|------|------|
| Registry | `lib/hermes/agentRegistry.ts` |
| Cron HTTP | `POST /internal/hermes/daily-learn`, `POST /internal/hermes/hourly-proactive`, `POST /internal/hermes/process-tasks` |
| Auth cron | Header `x-cron-secret` = `HERMES_CRON_SECRET` |
| API admin | `/api/agents/*` + `requireAdmin` |
| Schema | `lib/db/src/schema/hermes.ts` + boot `ensureSchema.ts` |
| QA sintético | `GET /api/agents/qa_sintetico/catalogo`, `POST /api/agents/qa_sintetico/executar-auditoria` |
| Loop premium | `premiumQualityLoop` no catálogo/snapshot do `qa_sintetico` |
| Agentes de dor real | `lib/hermes/jobs/dor-real-agents.ts` + `GET /api/agents/hermes/status` (`dorRealAgents`) |
| Action Center | `GET /api/agents/hermes/actions`, `POST /api/agents/hermes/actions/from-source`, `PATCH /api/agents/hermes/actions/:id` |

## Cron (Railway)

- **daily-learn**: 1×/dia — todos os agentes com `dailyLearn`.
- **hourly-proactive**: 1×/hora — todos com `proactive`; também drena até 5 itens de `hermes_tarefas` ao final.
- **process-tasks**: a cada 5–15 min — worker dedicado para drenar `hermes_tarefas` sem esperar o hourly. Aceita `?limit=10` ou corpo JSON `{ "limit": 10 }` (máximo 50).

Para o premium quality loop, o `daily-learn` alimenta o monitoramento leve. A revisão semanal/pré-release continua manual: usar o checklist em `docs/hermes-qa-sintetico.md` e, quando fizer sentido, disparar a auditoria admin com `persist: true` e `enqueueTasks: false`.

O worker de `process-tasks` ignora `tipo = 'action_center'`. Essas tarefas pertencem ao fluxo admin de aprovação/início/conclusão/dispensa e só podem ganhar execução real quando houver um handler explicitamente seguro e aprovado por humano.

Todos usam `POST` e exigem o header `x-cron-secret` com o valor de `HERMES_CRON_SECRET`.

Comandos de validacao com segredo ficam em `docs/operational-validation-checklist.md`. Nao chamar endpoints internos sem esse header; resposta 401 e esperada quando o header estiver ausente/incorreto.

Resposta JSON:

- `daily-learn` / `hourly-proactive`: `{ ok, ran, errors }` (`hourly-proactive` também retorna `processTasks`).
- `process-tasks`: `{ ok, claimed, completed, failed, errors }`.

Checklist Railway:

1. Definir `HERMES_CRON_SECRET` nas variáveis do serviço.
2. Criar cron/job diário para `POST https://<dominio>/internal/hermes/daily-learn`.
3. Criar cron/job horário para `POST https://<dominio>/internal/hermes/hourly-proactive`.
4. Criar cron/job a cada 5–15 min para `POST https://<dominio>/internal/hermes/process-tasks?limit=10`.
5. Em todos os jobs, enviar o header `x-cron-secret: <HERMES_CRON_SECRET>`.
