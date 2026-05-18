# Operational validation checklist

**Atualizado em:** 2026-05-18  
**Escopo:** validacao operacional sem segredos, sem brute-force de auth e sem envio externo.

## Estado validado neste corte

- Git local: `main` limpo e alinhado com `origin/main`.
- Commit atual: `81196e8f30da9073191df41d664f5273265922c7`.
- Producao publica: `https://study.ia.br/api/healthz` respondeu `status=ok`, `commit=81196e8`, `openai=true`, `openrouter=true`, `clerk=true`, `db=true`.
- Railway: projeto `lucky-appreciation`, environment `production`, service `StudyAI`.
- Railway deploy: deployment mais recente `7052b1e7-034f-42d0-b83b-7b78fa1aca45`, status `SUCCESS`, branch `main`, commit `81196e8f30da9073191df41d664f5273265922c7`.
- Railway manifest: `RAILPACK`, build `BASE_PATH=/ pnpm --filter @workspace/studyai run build && pnpm --filter @workspace/api-server run build`, start `node --enable-source-maps ./artifacts/api-server/dist/index.mjs`, healthcheck `/api/healthz`.
- GitHub Actions: `gh` existe, mas nao esta autenticado neste ambiente; validacao de runs ficou pendente.

## Hermes sem segredos

- `GET /api/healthz` e publico e roda antes de Clerk, rate limit e DB.
- `GET /api/agents/hermes/status` e protegido por `requireAuth` + `requireAdmin`; nao tentar acessar sem sessao admin.
- `POST /internal/hermes/daily-learn`, `POST /internal/hermes/hourly-proactive` e `POST /internal/hermes/process-tasks` ficam fora de `/api` e exigem header `x-cron-secret`.
- Se `HERMES_CRON_SECRET` estiver ausente, o endpoint responde erro 500 de configuracao; se o header estiver incorreto, responde 401.
- Catalogo de dor real tem 10 itens em `HERMES_DOR_REAL_AGENT_CATALOG`: `auditor_pedagogico`, `notebook_rag_quality`, `student_success`, `professor_success`, `simulado_intelligence`, `caderno_erros_intelligence`, `custos_ia_optimizer`, `ux_product_auditor`, `content_gap_cqo_avancado`, `institution_success_b2b_roi`.
- Registro operacional tem os agentes de dor real implementados no `dailyLearn`; Student Success usa a implementacao existente `sucesso_aluno`, enquanto o catalogo documenta o conceito publico `student_success`.

## Comandos que o usuario deve executar com segredo

Substitua `https://study.ia.br` se estiver validando outro dominio.

PowerShell:

```powershell
$base = "https://study.ia.br"
$headers = @{ "x-cron-secret" = $env:HERMES_CRON_SECRET }

Invoke-RestMethod -Method Post -Uri "$base/internal/hermes/daily-learn" -Headers $headers
Invoke-RestMethod -Method Post -Uri "$base/internal/hermes/hourly-proactive" -Headers $headers
Invoke-RestMethod -Method Post -Uri "$base/internal/hermes/process-tasks?limit=10" -Headers $headers
Invoke-RestMethod -Method Post -Uri "$base/internal/hermes/process-tasks" -Headers $headers -ContentType "application/json" -Body '{ "limit": 10 }'
```

Bash:

```bash
BASE_URL="https://study.ia.br"

curl -fsS -X POST "$BASE_URL/internal/hermes/daily-learn" \
  -H "x-cron-secret: $HERMES_CRON_SECRET"

curl -fsS -X POST "$BASE_URL/internal/hermes/hourly-proactive" \
  -H "x-cron-secret: $HERMES_CRON_SECRET"

curl -fsS -X POST "$BASE_URL/internal/hermes/process-tasks?limit=10" \
  -H "x-cron-secret: $HERMES_CRON_SECRET"

curl -fsS -X POST "$BASE_URL/internal/hermes/process-tasks" \
  -H "x-cron-secret: $HERMES_CRON_SECRET" \
  -H "content-type: application/json" \
  -d '{ "limit": 10 }'
```

## Aceite esperado

- `daily-learn` retorna `{ ok, ran, errors }`; `ran` deve incluir os agentes de dor real com `dailyLearn`.
- `hourly-proactive` retorna `{ ok, ran, errors, processTasks }`.
- `process-tasks` retorna `{ ok, claimed, completed, failed, errors }`.
- Admin autenticado abre `GET /api/agents/hermes/status` e ve `dorRealAgents`, `lastCronHint`, `contentIndex`, `pendingAcoesCount` e inbox.
- Toda falha de dados vira lacuna de observabilidade, nao numero inventado.
- Nenhum agente envia WhatsApp, altera conteudo, aprova material ou muda contrato automaticamente.

