# Ingestão de materiais POSTULADOS e banco ENEM (PT-BR)

Comandos assumem a **raiz do monorepo** `StudyAI` e o pacote `@workspace/api-server`.

## POSTULADOS (PDF/DOCX → `knowledge_documents`)

Indexa arquivos de uma pasta no Postgres (metadado `source: postulado`).

```bash
pnpm --filter @workspace/api-server run ingest:postulados -- "<CAMINHO_DA_PASTA>" --uploaded-by=<UUID_ADMIN> --materia="Matemática" --autor="Prof. Silva"
```

- `--uploaded-by` é **obrigatório** (id interno em `users`, não o Clerk).
- `--dry-run` — só lista arquivos e tamanho do texto extraído.
- `--skip-existing` — evita duplicar por `source_file` + `uploaded_by`.

## ENEM → JSON (`api.enem.dev`)

Gera/atualiza `artifacts/api-server/src/lib/enem/seed-questions.json` (ou caminho `--output=`).

```bash
pnpm --filter @workspace/api-server run ingest:enem -- --years=2023 --limit-per-year=50 --merge --verbose
```

Após o ingest, reinicie o `api-server` se estiver usando o JSON embutido no bundle ou `ENEM_BANK_JSON_PATH`.

## ENEM → Postgres (`enem_questions`)

1. Garanta `DATABASE_URL` e que o servidor já rodou `ensureAllSchemas` (ou crie a tabela manualmente).
2. Rode o upsert a partir de um JSON no formato `EnemQuestao[]` (o mesmo do `ingest:enem` ou do `seed-questions.json`).

```bash
pnpm --filter @workspace/api-server run ingest:enem-db
```

Ou com arquivo explícito:

```bash
pnpm --filter @workspace/api-server run ingest:enem-db -- ./caminho/para/questoes-enem.json
```

Ou via variável:

```bash
set ENEM_INGEST_JSON=./exports/enem-questions.json
pnpm --filter @workspace/api-server run ingest:enem-db
```

No Railway / produção, defina `ENEM_BANK_SOURCE=db` **somente** depois que `enem_questions` tiver linhas; caso contrário o simulado retornará erro de banco insuficiente.

## Cron Hermes — fila de tarefas

Além do hourly existente, pode agendar no Railway:

- `POST /internal/hermes/process-tasks` com header `x-cron-secret` igual aos outros crons Hermes (`HERMES_CRON_SECRET`).
- Opcional: corpo JSON `{ "limit": 10 }` ou query `?limit=10` (máximo 50).

Recomenda-se a cada **5–15 minutos** se quiser drenar `hermes_tarefas` sem esperar o fim do `hourly-proactive`.
