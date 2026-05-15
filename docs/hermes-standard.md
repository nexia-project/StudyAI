# Hermes — padrão de agentes admin

Hermes é a família de agentes de negócio/gestão do StudyAI (sibling do Tiagão, que atende o aluno em `/api/chat`).

## Regras

1. **Aprendizado assíncrono** — insights e descobertas vão para `hermes_descobertas_globais` via jobs `dailyLearn`, não bloqueiam a UI.
2. **Enriquece a geração** — rotas HTTP leem memória (`hermes_memoria_interacao`) e métricas antes de chamar a IA; o admin vê resposta enriquecida na hora.
3. **Sem botão “refazer”** — não expor “gerar de novo” como fluxo principal; iterar com novo prompt/contexto se necessário.
4. **Novos agentes** — registrar em `register-default-agents.ts` com `handler` + opcional `dailyLearn` / `proactive`; rotas em `routes/agents/<id>.ts`; montar em `routes/agents/index.ts`.

## Infra

| Peça | Onde |
|------|------|
| Registry | `lib/hermes/agentRegistry.ts` |
| Cron HTTP | `POST /internal/hermes/daily-learn`, `POST /internal/hermes/hourly-proactive` |
| Auth cron | Header `x-cron-secret` = `HERMES_CRON_SECRET` |
| API admin | `/api/agents/*` + `requireAdmin` |
| Schema | `lib/db/src/schema/hermes.ts` + boot `ensureSchema.ts` |

## Cron (Railway)

- **daily-learn**: 1×/dia — todos os agentes com `dailyLearn`.
- **hourly-proactive**: 1×/hora — todos com `proactive`.

Resposta JSON: `{ ok, ran, errors }`.
