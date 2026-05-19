# Roadmap — Pedagogia e Conteúdos StudyAI

**Status:** workstream ativo (2026-05-19)  
**Objetivo:** consolidar dados pedagógicos internos, conectores externos e geração premium com loop Hermes de QA — sem publicação automática sem revisão humana.

## Estado honesto (baseline)

| Área | Estável | Pendente QA/config |
| --- | --- | --- |
| Padrão premium (`premium-material-standard.ts`) | Rubrica, score, status | Aplicar em todos os geradores (aula, lista, slides) |
| Ingest postulados (script) | PDF/DOCX/MD, chunks, frontmatter | Rodar ingest CQO em prod; UUID admin real |
| Seeds CQO (`docs/postulados-cqo/`) | 3 arquivos premium curados | Ingestão no Postgres de produção |
| BNCC | Seed local + `/api/bncc/*` | API oficial MEC (Fase B) |
| ENEM | `ingest:enem`, bank JSON/DB, simulado | `ENEM_BANK_SOURCE=db` só após ingest validado |
| RAG externo | Semantic Scholar, SciELO, Wikipedia, Wikidata, IBGE, arXiv, Crossref | Chaves opcionais; rate limits em prod |
| Hermes CQO | `content_gap_cqo_avancado`, knowledge-index | Cron `daily-learn` / `process-tasks` com segredo real |
| Catálogo pedagógico API | `GET /api/pedagogy/catalog`, `/ingestion-status` | Validar com admin autenticado |

## Fase A — Modelo interno + ingestão

**Entregas**

- Metadados premium em `knowledge_documents.metadata` (`quality`, `premium_metadata`, `quality_status`).
- Script `ingest:postulados` com score automático para `.md` no padrão CQO.
- Documentos `docs/postulados-cqo/` como fonte canônica de lacunas críticas.
- Índice Hermes (`analyzeContentDatabases`) como fonte de lacunas e ratio postulado/demanda.

**Critérios de aceite**

- `GET /api/pedagogy/ingestion-status` mostra 3 seeds CQO ingeridos ou comando recomendado.
- `contentGaps` deixa de listar matérias dos 3 postulados após ingest.
- Postulados MD ingeridos com `quality.status` ≠ `sem_score`.

**Comando ingest (substituir UUID)**

```bash
# Dry-run (sem INSERT)
pnpm --filter @workspace/api-server run ingest:postulados -- "./docs/postulados-cqo" --uploaded-by=00000000-0000-4000-8000-000000000001 --dry-run

# Produção (UUID real de users.id com role admin)
pnpm --filter @workspace/api-server run ingest:postulados -- "./docs/postulados-cqo" --uploaded-by=<UUID_ADMIN> --skip-existing
```

Resolver UUID admin (requer `DATABASE_URL`):

```sql
SELECT id, email, role FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 5;
```

Placeholder documentado apenas para dry-run local; **não usar UUID fictício em produção** (FK em `users`).

## Fase B — Conectores API externos

| Conector | Estado | Caminho / notas |
| --- | --- | --- |
| Semantic Scholar | Implementado | `POST /api/rag/external-search`, env `SEMANTIC_SCHOLAR_API_KEY` |
| SciELO, Wikipedia, Wikidata, IBGE, arXiv, Crossref | Implementado | `POST /api/rag/external-multi`, `GET /api/rag/providers` |
| ENEM (`api.enem.dev`) | Implementado | `ingest:enem`, `ingest:enem-db`, rotas `enem-bank` |
| BNCC | Seed local | `GET /api/bncc/*` — sem HTTP MEC ainda |
| BNCC API oficial | **Faltando** | Avaliar catálogo MEC / export estável |
| INEP / SAEB microdados | **Faltando** | Alinhamento estatístico futuro |
| OAB / concursos bancas | Parcial | `concursos` seed + rotas dedicadas |

**Próximo stub de baixo risco:** documentar env e health por provider em `GET /api/pedagogy/catalog` (feito) + teste smoke `external-multi` em CI.

## Fase C — Pipeline de geração com padrão premium

**Escopo**

- Todo output de explicação, lista, aula, plano, revisão e simulado deve montar `PremiumMaterialMetadata` e chamar `scorePremiumMaterialMetadata` antes de persistir em `generated_content` ou expor como premium.
- Notebook/RAG: anexar `sources` verificáveis; bloquear `aprovado_premium` sem fonte quando houver claim factual.
- Professor/instituição: exigir `humanReviewed` antes de liberar para turma.

**Dependências:** Fase A estável; instrumentação `activity_events` para aceite por lacuna.

## Fase D — Loop Hermes pedagógico

| Agente | Função |
| --- | --- |
| `auditor_pedagogico` | Auditoria diária alinhada ao padrão premium |
| `content_gap_cqo_avancado` | Prioriza lacunas por demanda × cobertura postulado |
| `qa_sintetico` | Jornadas sintéticas + `pedagogicalMaterialStandard` no catálogo |

**Guardrails (não negociáveis)**

- Hermes recomenda; não publica postulado, não altera plano do aluno, não envia WhatsApp real sem config.
- Descobertas com `recommendation` estruturada (evidência, ação, métrica, confiança).

## APIs de catálogo (admin)

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/pedagogy/catalog` | Índice completo: contentIndex, conectores, RAG, padrão premium |
| GET | `/api/pedagogy/ingestion-status` | Status ingest postulados + seeds CQO |

Requer autenticação + role `admin`.

## Referências

- `docs/padrao-material-pedagogico-premium.md`
- `docs/INGEST-POSTULADOS-ENEM.md`
- `docs/hermes-agentes-dor-real.md`
- `docs/cronograma-premium-studyai.md` (prioridade atualizada)
