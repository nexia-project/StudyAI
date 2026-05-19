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

## Portais Professor e Instituição (2026-05-19)

- **Professor (`/professor`)**: Tiagão flutuante ativo com `X-Tiagao-Context: professor` e modo pedagógico colega; assistente e pesquisa respondem em texto; botão **Encaminhar para o Tiagão** abre voz com contexto.
- **Instituição (`/instituicao`)**: APIs usam `credentials: "include"`; login em `/instituicao/login` ou `/sign-in` com `auth_return_to=/instituicao`; menu **Modo Escola** e link **Portal Institucional** no UserMenu.
- **Clerk**: papéis `teacher` / `institution_admin` no metadata ou membro aprovado via convite institucional.

## Fluxo texto → voz (2026-05-19)

Enter/enviar = resposta escrita; **Encaminhar para o Tiagão** só depois (mic/avatar = voz direta).

| Superfície | Texto primeiro | Encaminhar |
|------------|----------------|------------|
| Home (`/app`) | `/api/inline-search`, análise de arquivo | Sim |
| Professor | pesquisa + copilot | Sim |
| Notebook | chat RAG + pesquisa rápida | Sim |
| Concursos | briefing simulado via inline-search | Sim |
| Simulado ENEM | resultado + missão de recuperação | Sim |
| Mapa mental | “Perguntar ao Tiagão” → Home com busca escrita | Sim (no Home) |
| Caderno | processar nota com IA (painel insights) | Sim |
| Instituição / Comunicação / Meus conteúdos | sem input de IA conversacional | N/A |

## Ingestão postulados CQO (lacunas 2026-05-16)

Pasta: `docs/postulados-cqo/` (3 `.md` premium). Comando (raiz do monorepo, `DATABASE_URL` + admin em `users`):

```bash
pnpm --filter @workspace/api-server run ingest:postulados -- "./docs/postulados-cqo" --uploaded-by=<UUID_ADMIN> --skip-existing
```

Resolver UUID: `SELECT id, email FROM users WHERE role = 'admin' LIMIT 5;` ou `GET /api/pedagogy/ingestion-status` (campo `resolveAdminUuid`).

Validação SQL:

```sql
SELECT COUNT(*) FROM knowledge_documents WHERE metadata->>'source' = 'postulado';
SELECT metadata->>'materia' AS materia, COUNT(*) FROM knowledge_documents WHERE metadata->>'source' = 'postulado' GROUP BY 1;
```

Esperado: +3 documentos; matérias `Artigo, Pronome e Numeral`, `Português - Texto Científico e Fotossíntese`, `Subtração com Recursos e Compensação`; `metadata.quality` e `metadata.premium_metadata` preenchidos em `.md`.

**Railway (produção):** shell do serviço `StudyAI` com `DATABASE_URL` já configurado; mesmo comando a partir de `/app` ou raiz do deploy; não commitar UUID em repo.

## Aceite esperado

- `daily-learn` retorna `{ ok, ran, errors }`; `ran` deve incluir os agentes de dor real com `dailyLearn`.
- `hourly-proactive` retorna `{ ok, ran, errors, processTasks }`.
- `process-tasks` retorna `{ ok, claimed, completed, failed, errors }`.
- Admin autenticado abre `GET /api/agents/hermes/status` e ve `dorRealAgents`, `lastCronHint`, `contentIndex`, `pendingAcoesCount` e inbox.
- Toda falha de dados vira lacuna de observabilidade, nao numero inventado.
- Nenhum agente envia WhatsApp, altera conteudo, aprova material ou muda contrato automaticamente.

