# Ingestão de materiais POSTULADOS e banco ENEM (PT-BR)

Comandos assumem a **raiz do monorepo** `StudyAI` e o pacote `@workspace/api-server`.

## POSTULADOS (PDF/DOCX → `knowledge_documents`)

Indexa arquivos de uma pasta no Postgres (metadado `source: postulado`).

```bash
pnpm --filter @workspace/api-server run ingest:postulados -- "<CAMINHO_DA_PASTA>" --uploaded-by=<UUID_ADMIN> --materia="Matemática" --autor="Prof. Silva"
```

- `--uploaded-by` é **obrigatório** (id interno em `users`, não o Clerk).
- `--dry-run` — só lista arquivos e tamanho do texto extraído (pode usar UUID fictício só neste modo).
- `--skip-existing` — evita duplicar por `source_file` + `uploaded_by`.

### Resolver UUID do admin

Com `DATABASE_URL` configurado:

```sql
SELECT id, email, role FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 5;
```

Ou, autenticado como admin na API: `GET /api/pedagogy/ingestion-status` (campo `resolveAdminUuid`).

**Não** use placeholder em INSERT real — a FK `uploaded_by` exige linha em `users`.

### Payload CQO — lacunas críticas de 2026-05-16

Foram adicionados payloads Markdown curados em `docs/postulados-cqo/` para cobrir as lacunas apontadas pelo CQO:

- `Artigo, Pronome e Numeral`
- `Português - Texto Científico e Fotossíntese`
- `Subtração com Recursos e Compensação`

Cada arquivo segue o padrão premium (`objective`, público/série, habilidade, pré-requisitos, explicações em níveis, erros comuns, exemplos, exercícios e observações de fonte/status) no próprio corpo do material. Para o Hermes/CQO reconhecer a cobertura, ingira a pasta sem sobrescrever a matéria por flag; o nome dos arquivos usa o formato `Materia_Autor_Titulo.md`, e o script preserva hífens dentro da matéria quando há separação por `_`.

O script também copia frontmatter simples de Markdown para `metadata` (por exemplo `topic`, `material_standard_version`, `quality_status` e `human_reviewed`), mantendo `source: postulado`, `materia`, `autor` e `path` controlados pela ingestão.

Para arquivos `.md` no padrão CQO/premium (`docs/postulados-cqo/`), o script extrai seções pedagógicas e grava `metadata.quality` (score + status) e `metadata.premium_metadata` via `extract-premium-from-markdown.ts`.

```bash
pnpm --filter @workspace/api-server run ingest:postulados -- "./docs/postulados-cqo" --uploaded-by=<UUID_ADMIN> --skip-existing
```

Validação esperada após ingestão e próxima auditoria Hermes/CQO:

- `knowledge_documents.postulados` aumenta em 3.
- `postuladosByMateria` passa a ter exatamente as matérias acima.
- As lacunas `Artigo, Pronome e Numeral`, `Português - Texto Científico e Fotossíntese` e `Subtração com Recursos e Compensação` deixam de aparecer como `0 postulados`.

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
