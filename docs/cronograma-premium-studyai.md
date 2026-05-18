# Cronograma premium StudyAI

**Status:** cronograma vivo de execucao premium  
**Atualizado em:** 2026-05-18  
**Base de producao conhecida:** `81196e8` com `/api/healthz` OK e Railway `SUCCESS`  
**Fonte operacional:** `docs/plano-mestre-execucao.md`

Este documento marca o que ja foi entregue, o que esta em validacao e a ordem conservadora das proximas entregas. Ele deve ser atualizado a cada lote antes de commit/deploy, com criterio de aceite e risco explicito.

## Concluido e deployado

| Ordem | Entrega | Status | Referencia | Criterio de aceite registrado |
| --- | --- | --- | --- | --- |
| 1 | Landing narrative premium e copy polish | Concluido/deployado | historico do plano mestre | Promessa clara, CTA principal, sem promessa garantida. |
| 2 | App Shell Premium aluno/B2B/Admin | Concluido/deployado | plano mestre; base `842900d` | Cabecalhos, missoes, badges, estados e menus por papel preservando rotas. |
| 3 | Notebook RAG multimodal/export/teacher/professor workspace | Concluido/deployado | `01857b24`, `d1270af`, `65e9e83` | Preview/export, fallback estruturado, Notebook do Professor e smoke automatizado. |
| 4 | Caderno de Erros premium | Concluido/deployado | `bb2ea8f` | Simulado gera rascunho, Caderno organiza erro, Home prioriza revisao. |
| 5 | Simulado ENEM premium diagnostics | Concluido/deployado | plano mestre | Resultado mostra radiografia, padroes de erro, missao de recuperacao e sinal Hermes local. |
| 6 | Tiagao pedagogical modes | Concluido/deployado | plano mestre | Home/fluxos enviam contexto pedagogico coerente sem remover chat/voz. |
| 7 | Professor/Gestor diagnostics e exports | Concluido/deployado | `caa10127`, `cb20f465` | CSV util, lacunas explicitas e revisao humana preservada. |
| 8 | Content curation premium | Concluido/deployado | plano mestre | Checklist e status manual local sem inventar score pedagogico. |
| 9 | Next-best-action engine | Concluido/deployado | plano mestre | Home combina Caderno, Simulado, Notebook, curadoria e plano recente em missao unica. |
| 10 | Hermes quality loop + real-pain agents primeira leva | Concluido/deployado | plano mestre | `auditor_pedagogico`, `notebook_rag_quality`, `professor_success` no catalogo/status. |
| 11 | Comunicacao institutional WhatsApp foundation | Concluido/deployado | plano mestre | Fundacao institucional pronta, sem envio real indevido. |
| 12 | Hermes Caderno de Erros Intelligence | Concluido/deployado | `81196e8` | `caderno_erros_intelligence` no `daily-learn`, catalogo/status e recomendacao estruturada com lacunas de instrumentacao. |
| 13 | Hermes Custos IA Optimizer | Concluido/deployado | `81196e8` | `custos_ia_optimizer` monitora custo por feature/aluno/material, prompts, cache, retries e billing sem trocar provider automaticamente. |
| 14 | Hermes Content Gap/CQO avancado | Concluido/deployado | `81196e8` | `content_gap_cqo_avancado` prioriza lacunas por demanda, BNCC/ENEM, fonte, qualidade, revisao e ingestao sem publicar automaticamente. |
| 15 | Hermes UX/Product Auditor | Concluido/deployado | `81196e8` | `ux_product_auditor` compoe `qa_sintetico`, `ux_layout` landing-only e `activity_events` para friccao, abandono, CTAs, rotas, estados, mobile e feedback por modulo. |
| 16 | Hermes Institution Success / B2B ROI | Concluido/deployado | `81196e8` | `institution_success_b2b_roi` mede adocao, risco, WhatsApp, exports e prova agregada de ROI sem contato automatico ou ranking sensivel. |

## Em validacao manual

- Notebook RAG: gerar apresentacao com documento real, revisar 3 slides de desenvolvimento, PDF premium, modo tela cheia e feedback negativo Hermes.
- Home next-best-action: validar usuario sem historico, erro recente, material recente e curadoria baixa.
- Simulado/Caderno: fazer simulado curto com erro, enviar ao Caderno, salvar nota, concluir recuperacao e confirmar limpeza da missao na Home.
- Professor/Gestor: baixar CSV, imprimir/salvar PDF e validar sinais/lacunas com dados reais.
- Admin Hermes: validar loading, falha de status, inbox vazia, descoberta com recomendacao e botoes lida/dispensar.
- Mobile/desktop: revisar sticky headers, bottom nav, cards, modais e ausencia de sobreposicao nas rotas premium.

## Proximas entregas por ordem

1. **Validacao Hermes real-pain em ambiente com segredo**: executar `daily-learn`, `hourly-proactive`, `process-tasks` e status admin seguindo `docs/operational-validation-checklist.md`.
2. **Config externa de producao**: fechar WhatsApp/Meta, billing de provedores, cron secret/scheduler e roles admin seguindo `docs/external-config-checklist.md`.
3. **ERP/solver deep evolution**: iniciar Marco 1 do `docs/erp-solver-roadmap.md` com modelo operacional persistido antes de solver real.

## Hermes agents roadmap

| Prioridade | Agente | Status | Proxima acao | Dependencias |
| --- | --- | --- | --- | --- |
| 1 | `auditor_pedagogico` | Feito | Validar daily-learn em ambiente admin/cron | `qa_sintetico`, CQO, docs premium |
| 2 | `notebook_rag_quality` | Feito | Validar feedback/export real no Admin | Notebook RAG, material events |
| 3 | `student_success` / `sucesso_aluno` | Em execucao neste lote | Enriquecer sinais estruturados, rota e payload Admin | `users`, `user_activity`, `simulado_results`, `activity_events`, `study_schedules` |
| 4 | `professor_success` | Feito primeira leva | Validar turma/relatorio/Notebook Professor em dados reais | Relatorios B2B, `sucesso_aluno` |
| 5 | `simulado_intelligence` | Deployado/aguarda cron real | Validar daily-learn, descoberta/inbox e persistencia granular do resultado ENEM | Simulado premium, Caderno, `activity_events` |
| 6 | `caderno_erros_intelligence` | Deployado/aguarda cron real | Validar descoberta/inbox no Admin e persistir missoes locais no backend em lote futuro | Caderno premium, Home NBA, `simulado_results` |
| 7 | `custos_ia_optimizer` | Deployado/aguarda billing externo | Validar descoberta/inbox, custo por entrega util e billing reconciliado | Admin IA & Custos, `ai_cost_log`, `ai_response_cache` |
| 8 | `ux_product_auditor` | Deployado/aguarda QA real | Validar descoberta/inbox, mobile 360px, menu por papel, eventos de abandono e feedback por modulo | `qa_sintetico`, `ux_layout` landing-only, `activity_events`, App Shell |
| 9 | `content_gap_cqo_avancado` | Deployado/aguarda cron real | Validar descoberta/inbox, lacunas priorizadas e payload de curadoria/revisao/ingestao | CQO, knowledge-index, `generated_content`, `knowledge_base`, `enem_questions` |
| 10 | `institution_success_b2b_roi` | Deployado/aguarda config externa | Validar daily-learn, descoberta/inbox, risco B2B, WhatsApp e ROI agregado | Professor Success, Relatorios B2B, Comunicacao institucional |

## QA checklist

- [x] Rodar `pnpm run typecheck` antes de commit.
- [x] Confirmar producao publica com `/api/healthz` no commit `81196e8`.
- [x] Confirmar deploy Railway `SUCCESS` no commit `81196e8`.
- [ ] Com usuario admin real, confirmar `GET /api/agents/hermes/status` com `dorRealAgents`.
- [ ] Quando houver cron/admin autenticado, executar `POST /internal/hermes/daily-learn` e conferir `ran`.
- [ ] Conferir que descoberta/inbox Hermes contem `recommendation` com evidencia, acao, metrica, aceite e confianca.
- [ ] Conferir que nenhum agente envia mensagem real, altera plano, aprova conteudo ou muda dados do aluno sem revisao humana.
- [ ] Atualizar este cronograma com commit, status de deploy e pendencias manuais.

## Riscos/bloqueios

- QA manual visual ainda e obrigatoria para Notebook, mobile e Admin Hermes; smoke automatizado nao substitui validacao do produto.
- Algumas metricas dependem de instrumentacao existente (`activity_events`, `tiagao_sessions`, `study_schedules`). Ausencia de tabela/sinal deve virar lacuna de observabilidade, nao numero inventado.
- `railway up --detach` pode sobrescrever health commit como `local`; para validar SHA, preferir auto-deploy por `git push`.
- Comunicacao/WhatsApp deve permanecer sem envio real ate provider, consentimento e revisao estarem configurados.

## Criterio de "pronto de verdade"

Uma entrega premium so esta pronta quando:

- Foi implementada em fatia pequena, sem quebrar rotas existentes.
- Tem criterio de aceite observavel no produto ou no payload Hermes.
- Explicita lacunas quando faltam dados, em vez de inventar score.
- Passou `pnpm run typecheck`.
- Foi commitada, enviada ao remoto e teve deploy/producao verificados quando o ambiente permitiu.
- Entrou neste cronograma com status, riscos e proximo passo.
