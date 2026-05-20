# O que fazer no Railway

**Atualizado:** 2026-05-19  
**Escopo:** operações de produção no Railway (deploy, ingestão CQO, crons Hermes, variáveis B2B).  
**Não cobre:** configuração local Windows, commits automáticos.

---

## Pré-requisitos

### Serviços no Railway (projeto `lucky-appreciation`, ambiente `production`)

| Serviço | Função |
|--------|--------|
| **StudyAI** | API + frontend (RAILPACK). Build/start em `railway.toml`. Healthcheck: `/api/healthz`. |
| **Postgres** | Plugin Railway Postgres → injeta `DATABASE_URL` no serviço StudyAI. |
| **hermes-cron-daily** (Cron) | `POST /internal/hermes/daily-learn` — 1×/dia. |
| **hermes-cron-hourly** (Cron) | `POST /internal/hermes/hourly-proactive` — 1×/hora. |
| **hermes-cron-tasks** (Cron, recomendado) | `POST /internal/hermes/process-tasks?limit=10` — a cada 5–15 min. |

> Se os crons ainda não existirem: criar **Cron Jobs** no Railway apontando para a URL pública do app (`https://study.ia.br` ou o domínio do serviço). Método **POST**, header **`x-cron-secret`**. O scheduler do Railway precisa suportar POST + header customizado; se não suportar, usar scheduler externo (ex.: cron-job.org) com o mesmo contrato.

### Variáveis de ambiente obrigatórias por tarefa

#### Serviço StudyAI — sempre (runtime)

| Variável | Obrigatória para |
|----------|------------------|
| `NODE_ENV=production` | Runtime geral |
| `DATABASE_URL` | API, ingest, Hermes, simulado `db` |
| `CLERK_SECRET_KEY` | Auth (`keys.clerk` no healthz) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend + cópia automática para `CLERK_PUBLISHABLE_KEY` no boot |
| `AI_INTEGRATIONS_OPENROUTER_API_KEY` | IA (`keys.openrouter`) |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | TTS/STT (`keys.openai`) |
| `ADMIN_EMAILS` | Promoção admin no boot + painel admin |
| `ADMIN_USER_IDS` (opcional) | Admin por Clerk ID |

#### Ingest postulados / ENEM-db (shell do container StudyAI)

| Variável | Obrigatória para |
|----------|------------------|
| `DATABASE_URL` | Scripts `ingest:postulados`, `ingest:enem-db` |

Não é necessário definir variáveis extras só para ingest — o script lê `DATABASE_URL` do ambiente do serviço.

#### Crons Hermes (jobs Cron + testes manuais)

| Variável | Obrigatória para |
|----------|------------------|
| `HERMES_CRON_SECRET` | `POST /internal/hermes/*` (sem valor → **500**; header errado → **401**) |

#### Simulado ENEM em produção (após ingest DB)

| Variável | Quando |
|----------|--------|
| `ENEM_BANK_SOURCE=db` | **Somente** depois de `ingest:enem-db` com linhas em `enem_questions` |
| `ENEM_BANK_SOURCE=json` | Padrão; usa JSON embutido / `ENEM_BANK_JSON_PATH` |

#### B2B / Comunicação (quando for ligar WhatsApp)

| Variável | Obrigatória para |
|----------|------------------|
| `WHATSAPP_PROVIDER=meta` | Envio real Meta |
| `WHATSAPP_META_ACCESS_TOKEN` | Cloud API |
| `WHATSAPP_META_PHONE_NUMBER_ID` | Número Business |
| `WHATSAPP_META_BUSINESS_ACCOUNT_ID` | WABA |
| `WHATSAPP_META_TEMPLATE_LANGUAGE=pt_BR` | Templates |

Sem Meta completo → fluxo fica em `dry_run` / `configuration_required`.

---

## Passo 1 — Validar deploy (commits `2530af41`, `da9af1f4`)

Deploy alvo: `main` com pelo menos:

- `2530af41` — Tiagão no portal professor, acesso instituição, fluxo texto→voz  
- `da9af1f4` — “Encaminhar para o Tiagão” após respostas escritas  

### Healthcheck (público, sem login)

```bash
curl -fsS "https://study.ia.br/api/healthz" | jq .
```

Resposta esperada (campos principais):

```json
{
  "status": "ok",
  "commit": "da9af1f",
  "keys": {
    "openai": true,
    "openrouter": true,
    "clerk": true,
    "db": true
  }
}
```

- `commit` = primeiros **7** caracteres de `RAILWAY_GIT_COMMIT_SHA` (ex.: `2530af4` ou `da9af1f`).
- Se `commit` = `"local"`, o deploy não veio do Git do Railway (evitar `railway up` local para validação por SHA).

URL alternativa (se DNS separar API): `https://api.study.ia.br/api/healthz` — mesmo contrato.

### Smoke manual no browser (`study.ia.br`)

| URL | O que validar |
|-----|----------------|
| `https://study.ia.br/app` | Home aluno carrega |
| `https://study.ia.br/professor` | Redireciona login ou painel professor |
| `https://study.ia.br/professor/login` | Fluxo professor |
| `https://study.ia.br/instituicao/login` | Login instituição + `auth_return_to` |
| `https://study.ia.br/instituicao` | Portal (com sessão `institution_admin`) |

Com conta **admin** logada (cookies):

- `GET https://study.ia.br/api/pedagogy/ingestion-status` — JSON com `cqoSeedStatus`, `recommendedCommand`
- `GET https://study.ia.br/api/agents/hermes/status` — `dorRealAgents`, `pendingAcoesCount` (não funciona sem admin)

### Logs de deploy (Railway → StudyAI → Deployments)

Conferir:

1. Build: `BASE_PATH=/ pnpm --filter @workspace/studyai run build && pnpm --filter @workspace/api-server run build` (**SUCCESS**).
2. Start: `node --enable-source-maps ./artifacts/api-server/dist/index.mjs`.
3. Healthcheck `GET /api/healthz` → **healthy** (timeout até 120s em `railway.toml`).
4. Sem loop de crash/restart após subir.
5. Após deploy, health público com `commit` ≥ `da9af1f` (7 chars).

---

## Passo 2 — Ingest postulados CQO (PRIORIDADE)

Pasta versionada: `docs/postulados-cqo/` (3 arquivos `.md` premium).

### 2.1 Abrir shell no container (não use PowerShell local)

Railway Dashboard → serviço **StudyAI** → **Shell** (ou CLI: `railway shell -s StudyAI`).

Atalho no container: `bash scripts/railway-ingest-cqo.sh` — imprime os comandos abaixo para copiar/colar (substitua `<UUID_ADMIN>`).

Confirmar diretório e arquivos:

```bash
pwd
ls -la docs/postulados-cqo/
```

Esperado: 3 arquivos `.md`. Se a pasta não existir, o deploy não incluiu `docs/` (rebuild a partir de `main` com os arquivos commitados).

### 2.2 Obter UUID do admin (Postgres)

```bash
psql "$DATABASE_URL" -c "SELECT id, email, role FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 5;"
```

Copie o `id` (UUID interno em `users`, **não** o `user_…` do Clerk).

Alternativa (browser, admin logado): `GET /api/pedagogy/ingestion-status` → campo `resolveAdminUuid` traz o SQL de apoio.

### 2.3 Dry-run (opcional)

Substitua `<UUID_ADMIN>`:

```bash
cd /app
pnpm --filter @workspace/api-server run ingest:postulados -- "./docs/postulados-cqo" --uploaded-by=<UUID_ADMIN> --dry-run
```

### 2.4 Ingest real

```bash
cd /app
pnpm --filter @workspace/api-server run ingest:postulados -- "./docs/postulados-cqo" --uploaded-by=<UUID_ADMIN> --skip-existing
```

Saída esperada: 3 linhas `✓` e resumo `inseridos/dry-run: 3` (ou menos se `--skip-existing` e já existirem).

### 2.5 Validação SQL

```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM knowledge_documents WHERE metadata->>'source' = 'postulado';"
```

```bash
psql "$DATABASE_URL" -c "SELECT COALESCE(NULLIF(TRIM(subject), ''), metadata->>'materia') AS materia, COUNT(*) FROM knowledge_documents WHERE metadata->>'source' = 'postulado' GROUP BY 1 ORDER BY 1;"
```

Esperado:

- Total postulados **+3** em relação ao baseline (mínimo 3 novos se base vazia).
- Matérias incluindo:
  - `Artigo, Pronome e Numeral`
  - `Português - Texto Científico e Fotossíntese`
  - `Subtração com Recursos e Compensação`
- Em `.md` ingeridos: `metadata.quality` e `metadata.premium_metadata` preenchidos.

Validação admin (browser): `GET /api/pedagogy/catalog` → `postulados` / lacunas CQO.

### 2.6 Troubleshooting

| Sintoma | Causa provável | Ação |
|--------|----------------|------|
| `pnpm: command not found` | Shell sem toolchain | Usar imagem após build RAILPACK; ou `corepack enable && corepack prepare pnpm@latest --activate` |
| `tsx: command not found` / script não roda | `devDependencies` ausentes no runtime | No shell: `cd /app && pnpm install --filter @workspace/api-server`; repetir ingest |
| Erro `esbuild` ao rodar ingest | Comando errado (build em vez de ingest) | Usar exatamente `pnpm --filter @workspace/api-server run ingest:postulados` |
| `ENOENT` pasta `docs/postulados-cqo` | Docs fora da imagem | `ls docs/`; redeploy de `main` com arquivos commitados |
| FK `uploaded_by` | UUID inválido ou placeholder | Repetir SQL admin; não usar UUID fictício fora de `--dry-run` |
| `DATABASE_URL` vazio | Shell sem env do serviço | Abrir shell pelo serviço StudyAI (não Postgres); `echo $DATABASE_URL` |
| `0 inseridos`, `ignorados: 3` | Já ingerido (`--skip-existing`) | OK se SQL mostrar as 3 matérias; senão remover duplicatas ou rodar sem `--skip-existing` (cuidado com duplicação) |

**Nunca** commitar UUID de admin no repositório.

---

## Passo 3 — Ingest ENEM (opcional, se ainda não feito)

### 3.1 JSON (artefato local / bundle)

No shell do container, a partir de `/app`:

```bash
pnpm --filter @workspace/api-server run ingest:enem -- --years=2023 --limit-per-year=50 --merge --verbose
```

Gera/atualiza `artifacts/api-server/src/lib/enem/seed-questions.json`. Reinicie o serviço se depender só do JSON embutido.

### 3.2 Postgres (`enem_questions`)

Com `DATABASE_URL` e API já tendo rodado `ensureAllSchemas` (boot normal):

```bash
cd /app
pnpm --filter @workspace/api-server run ingest:enem-db
```

Com arquivo explícito:

```bash
pnpm --filter @workspace/api-server run ingest:enem-db -- ./artifacts/api-server/src/lib/enem/seed-questions.json
```

Validação:

```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM enem_questions;"
```

### 3.3 Ativar banco no simulado (Railway Variables)

Somente quando `COUNT(*) > 0`:

- Dashboard → StudyAI → Variables → `ENEM_BANK_SOURCE=db`
- Redeploy ou restart do serviço

Se ligar `db` sem linhas, o simulado retorna erro de banco insuficiente.

---

## Passo 4 — Variáveis B2B (só Railway Dashboard)

Definir no serviço **StudyAI** (não no `.env` local):

```env
HERMES_CRON_SECRET=<openssl rand -hex 32>
```

Usar o **mesmo** valor nos 3 Cron Jobs (`x-cron-secret`).

WhatsApp / Meta (quando for produção real):

```env
WHATSAPP_PROVIDER=meta
WHATSAPP_META_ACCESS_TOKEN=
WHATSAPP_META_PHONE_NUMBER_ID=
WHATSAPP_META_BUSINESS_ACCOUNT_ID=
WHATSAPP_META_TEMPLATE_LANGUAGE=pt_BR
```

ENEM (quando ingest DB validado):

```env
ENEM_BANK_SOURCE=db
```

Manter `CRON_SECRET` separado de `HERMES_CRON_SECRET` se outros endpoints cron existirem.

Referência completa: `.env.railway.example`, `docs/external-config-checklist.md`, `docs/comunicacao-whatsapp.md`.

---

## Passo 5 — Verificar crons Hermes

### Endpoints (todos `POST`, fora de `/api`, sem Clerk)

| Job Railway sugerido | URL | Corpo (opcional) |
|---------------------|-----|------------------|
| hermes-cron-daily | `https://study.ia.br/internal/hermes/daily-learn` | — |
| hermes-cron-hourly | `https://study.ia.br/internal/hermes/hourly-proactive` | — |
| hermes-cron-tasks | `https://study.ia.br/internal/hermes/process-tasks?limit=10` | ou JSON `{ "limit": 10 }` |

Header obrigatório em **todos**:

```http
x-cron-secret: <valor de HERMES_CRON_SECRET>
```

### Teste manual (máquina com segredo — não commitar)

```bash
export HERMES_CRON_SECRET='...'
BASE_URL="https://study.ia.br"

curl -fsS -X POST "$BASE_URL/internal/hermes/daily-learn" \
  -H "x-cron-secret: $HERMES_CRON_SECRET"

curl -fsS -X POST "$BASE_URL/internal/hermes/hourly-proactive" \
  -H "x-cron-secret: $HERMES_CRON_SECRET"

curl -fsS -X POST "$BASE_URL/internal/hermes/process-tasks?limit=10" \
  -H "x-cron-secret: $HERMES_CRON_SECRET"
```

### Respostas esperadas (não são “noop” saudáveis)

| Endpoint | JSON útil | Sinal de trabalho real |
|----------|-----------|-------------------------|
| `daily-learn` | `{ "ok", "ran", "errors" }` | `ran` lista agentes com `dailyLearn` (ex.: `auditor_pedagogico`, `content_gap_cqo_avancado`, …) |
| `hourly-proactive` | `{ "ok", "ran", "errors", "processTasks" }` | `ran` com agentes `proactive`; `processTasks.claimed` pode ser > 0 |
| `process-tasks` | `{ "ok", "claimed", "completed", "failed", "errors" }` | `claimed` / `completed` > 0 quando há fila em `hermes_tarefas` |

**401** → header/secret errado. **500** “Cron secret não configurado” → falta `HERMES_CRON_SECRET` no StudyAI.

Confirmação admin (browser): `GET /api/agents/hermes/status` → `lastCronHint`, `pendingAcoesCount`, `dorRealAgents`.

Crons **não** devem enviar WhatsApp nem alterar conteúdo automaticamente; falhas viram lacunas observáveis, não números inventados.

Detalhe: `docs/hermes-standard.md`, `docs/operational-validation-checklist.md`.

---

## Passo 6 — Clerk (acesso instituição) — Dashboard Clerk, não Railway

Papéis efetivos (`teacher`, `institution_admin`, `admin`) vivem na tabela **`users.role`** do Postgres. Clerk autentica; convites institucionais e promoção admin atualizam o DB.

### No Clerk Dashboard (https://dashboard.clerk.com)

1. **API Keys (Live)**  
   - Confirmar que `CLERK_SECRET_KEY` e `VITE_CLERK_PUBLISHABLE_KEY` no Railway são do ambiente **Production**, não Development.

2. **Paths / Redirect URLs** (domínio `https://study.ia.br`)  
   Incluir, no mínimo:
   - `https://study.ia.br`
   - `https://study.ia.br/sign-in`
   - `https://study.ia.br/sign-up`
   - `https://study.ia.br/app`
   - `https://study.ia.br/professor`
   - `https://study.ia.br/professor/login`
   - `https://study.ia.br/instituicao`
   - `https://study.ia.br/instituicao/login`
   - `https://study.ia.br/instituicao/convite/*` (padrão de convite)
   - `https://www.study.ia.br/*` (se usar www)
   - Callbacks OAuth Google/GitHub conforme provedores habilitados

3. **OAuth / Social connections**  
   - Google/GitHub habilitados se usados no login professor/instituição.

4. **Public metadata (opcional)**  
   - O app **não** exige `publicMetadata.role` para professor; acesso professor vem de `users.role` ou solicitação em `/api/teacher/request-access`.
   - Instituição: fluxo preferencial é **convite** (`/instituicao/convite/:token`) → API define `institution_admin` ou `teacher` no DB.

5. **Contas admin StudyAI**  
   - Garantir emails/IDs em `ADMIN_EMAILS` / `ADMIN_USER_IDS` no **Railway** (não no Clerk) para `/admin` e Hermes admin.

### Fluxos de produto (validação manual)

| Papel | Como obter | URL |
|-------|------------|-----|
| Professor | Admin aprova `POST /api/teacher/request-access` ou `role=teacher` no DB | `/professor/login` → `/professor` |
| Instituição | Convite institucional ou `institution_admin` no DB | `/instituicao/login` com `sessionStorage.auth_return_to=/instituicao` |
| Admin | `ADMIN_EMAILS` / `role=admin` | `/admin` |

---

## Referências no repositório

- `railway.toml` — build, start, healthcheck  
- `docs/INGEST-POSTULADOS-ENEM.md`  
- `docs/operational-validation-checklist.md`  
- `docs/external-config-checklist.md`  
- `.env.railway.example`  
- `artifacts/api-server/package.json` — scripts `ingest:*`  
