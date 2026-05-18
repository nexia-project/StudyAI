# Cronograma premium StudyAI

**Status:** cronograma vivo de execucao premium  
**Atualizado em:** 2026-05-18  
**Base de producao conhecida:** `842900d` sem bloqueadores reportados  
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

## Em validacao manual

- Notebook RAG: gerar apresentacao com documento real, revisar 3 slides de desenvolvimento, PDF premium, modo tela cheia e feedback negativo Hermes.
- Home next-best-action: validar usuario sem historico, erro recente, material recente e curadoria baixa.
- Simulado/Caderno: fazer simulado curto com erro, enviar ao Caderno, salvar nota, concluir recuperacao e confirmar limpeza da missao na Home.
- Professor/Gestor: baixar CSV, imprimir/salvar PDF e validar sinais/lacunas com dados reais.
- Admin Hermes: validar loading, falha de status, inbox vazia, descoberta com recomendacao e botoes lida/dispensar.
- Mobile/desktop: revisar sticky headers, bottom nav, cards, modais e ausencia de sobreposicao nas rotas premium.

## Proximas entregas por ordem

1. **Student Success / `sucesso_aluno`**: consolidar sinais de aluno travado, acao segura e metrica no Hermes. Aceite: observa sem estudo, sem dias, erro repetido, simulado abandonado, chat sem pratica e falta de missao; gera recomendacao estruturada sem envio real.
2. **Simulado Intelligence**: transformar resultado/abandono/recuperacao em diagnostico Hermes. Aceite: recomenda habilidade/materia fraca sem prometer nota e sem inventar metadado ausente.
3. **Caderno de Erros Intelligence**: detectar recorrencia e fechamento do loop de revisao. Aceite: recomenda revisao/Tiagao corretor com evidencia de notas, missoes e historico local.
4. **Custos IA Optimizer**: recomendar cache/roteamento/limite sem trocar provider automaticamente. Aceite: custo por entrega util, latencia e qualidade seguem auditaveis.
5. **UX/Product Auditor**: priorizar friccao real por papel, mobile e CTA. Aceite: recomenda mudanca pequena com criterio de QA manual.
6. **Content Gap/CQO avancado**: priorizar lacunas por demanda/risco/cobertura. Aceite: plano de curadoria/ingestao com revisao humana.
7. **Institution Success / B2B ROI**: medir adocao, risco e valor institucional agregado. Aceite: sem ranking sensivel indevido e com revisao humana obrigatoria.

## Hermes agents roadmap

| Prioridade | Agente | Status | Proxima acao | Dependencias |
| --- | --- | --- | --- | --- |
| 1 | `auditor_pedagogico` | Feito | Validar daily-learn em ambiente admin/cron | `qa_sintetico`, CQO, docs premium |
| 2 | `notebook_rag_quality` | Feito | Validar feedback/export real no Admin | Notebook RAG, material events |
| 3 | `student_success` / `sucesso_aluno` | Em execucao neste lote | Enriquecer sinais estruturados, rota e payload Admin | `users`, `user_activity`, `simulado_results`, `activity_events`, `study_schedules` |
| 4 | `professor_success` | Feito primeira leva | Validar turma/relatorio/Notebook Professor em dados reais | Relatorios B2B, `sucesso_aluno` |
| 5 | `simulado_intelligence` | Proximo | Implementar recomendacao Hermes para abandono/recuperacao | Simulado premium, Caderno |
| 6 | `caderno_erros_intelligence` | Proximo | Implementar recorrencia/revisao concluida | Caderno premium, Home NBA |
| 7 | `custos_ia_optimizer` | Parcial/TODO | Recomendar custo sem trocar provider | Admin IA & Custos |
| 8 | `ux_product_auditor` | Parcial | Consolidar auditoria de friccao mobile/CTA | QA sintetico, manual QA |
| 9 | `content_gap_cqo_avancado` | Parcial | Priorizar lacunas por demanda | CQO, knowledge-index |
| 10 | `institution_success_b2b_roi` | Parcial/TODO | ROI/adocao institucional agregado | Professor Success, Relatorios B2B |

## QA checklist

- [ ] Rodar `pnpm run typecheck` antes de commit.
- [ ] Quando houver backend Hermes, confirmar `GET /api/agents/hermes/status` com `dorRealAgents`.
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
