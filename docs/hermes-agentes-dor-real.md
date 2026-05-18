# Hermes agentes de dor real

## Doutrina de produto por papel

StudyAI deve separar produtos e decisões por papel:

- **Aluno:** aprender, praticar, revisar e pedir ajuda ao Tiagao.
- **Professor:** planejar, diagnosticar, intervir, avaliar e gerar materiais.
- **Instituicao:** acompanhar qualidade, risco, adocao e resultados agregados.
- **Admin:** operar, auditar, controlar custos, qualidade, conteudo e crescimento.

Hermes e o sistema nervoso do StudyAI: observa sinais, audita qualidade, prioriza problemas, abre recomendacoes claras e mede se houve melhora. Hermes nao deve virar um conjunto generico de bots; cada agente precisa existir por uma dor real, com responsabilidade, evidencia, metrica e acao.

## Padrao de recomendacao

Toda saida de agente Hermes deve seguir o padrao em `artifacts/api-server/src/lib/hermes/recommendationStandard.ts`:

- evidencia observada;
- impacto esperado;
- recomendacao especifica;
- acao ou proxima triagem;
- metrica de sucesso;
- criterios de aceite;
- confianca;
- alvo/modulo.

## Prioridade canonica

| Prioridade | Agente | Papel principal | Status | Sobreposicoes reaproveitadas |
| --- | --- | --- | --- | --- |
| 1 | Auditor Pedagogico | Admin | Implementado primeira leva | `qa_sintetico`, `cqo_conteudo`, padrao premium |
| 2 | Notebook RAG Quality | Aluno/Professor | Implementado primeira leva | `qa_sintetico.notebook_rag_lousa`, CQO, smoke Notebook |
| 3 | Student Success | Aluno | Em consolidacao | `sucesso_aluno` |
| 4 | Professor Success | Professor | Implementado primeira leva | `qa_sintetico.professor_gestor_relatorios`, `sucesso_aluno` |
| 5 | Simulado Intelligence | Aluno | Implementado neste lote | Simulado premium, Caderno |
| 6 | Caderno de Erros Intelligence | Aluno | Implementado neste lote | Caderno premium, Home next-best-action, Simulado |
| 7 | Custos IA Optimizer | Admin | Implementado neste lote | Admin IA & Custos, `gestao`, `monitor` |
| 8 | UX/Product Auditor | Admin | Existente/parcial | `ux_layout`, `qa_sintetico` |
| 9 | Content Gap/CQO avancado | Admin | Implementado neste lote | `cqo_conteudo`, `knowledge-index`, Auditor Pedagogico |
| 10 | Institution Success / B2B ROI | Instituicao | Implementado neste lote | Relatorios B2B, `professor_success`, Comunicacao institucional |

O catalogo operacional fica em `artifacts/api-server/src/lib/hermes/jobs/dor-real-agents.ts` e e exposto no Admin por `GET /api/agents/hermes/status` em `dorRealAgents`.

## Agentes

### 1. Auditor Pedagogico

- **Responsabilidade:** auditar qualidade pedagogica de materiais, respostas e jornadas sem substituir revisao humana.
- **Sinais observados:** metadata pedagogica ausente/fraca; falta de fonte, exercicio, exemplo ou checkpoint; lacunas CQO; material gerado sem aderencia ao padrao premium.
- **Evidencias:** `generated_content`, `knowledge_documents`, `contentIndex.contentGaps`, `pedagogicalMaterialStandard`, `material_style_events`.
- **Metricas:** materiais com objetivo/fonte/pratica/checkpoint; `contentIndex.contentGaps`; `postuladoCoverageRatio`; recomendacoes pedagogicas aceitas.
- **Acoes:** abrir recomendacao de curadoria; priorizar ingestao ou ajuste de fonte; pedir revisao humana.
- **Limites de seguranca:** nao altera conteudo em producao; nao aprova material sem revisao humana; nao inventa score quando faltam sinais.
- **Saida Admin:** descoberta Hermes e inbox quando houver lacuna relevante.
- **Status:** implementado primeira leva como `auditor_pedagogico` no `daily-learn`.

### 2. Notebook RAG Quality

- **Responsabilidade:** auditar Notebook/RAG, visual, exportacao, fallback e feedback negativo.
- **Sinais observados:** visual slots unresolved; deck/map fraco; fallback usage; feedback negativo; export events; fonte insuficiente.
- **Evidencias:** `notebook_material_generated`, `teacher_notebook_output_generated`, `notebook_feedback`, `material_style_events`, `contentIndex`.
- **Metricas:** visual slots resolvidos; feedback negativo triado; exports concluídos; fallbacks por geracao; lacunas de conteudo.
- **Acoes:** abrir triagem de material fraco; pedir QA manual de preview/export; pedir instrumentacao quando faltar sinal.
- **Limites de seguranca:** nao regenera material automaticamente; nao apaga fonte; nao envia feedback externo.
- **Saida Admin:** recomendacao com modulo `Notebook RAG`, evidencia, metrica e criterio de aceite.
- **Status:** implementado primeira leva como `notebook_rag_quality` no `daily-learn`.

### 3. Student Success

- **Responsabilidade:** detectar aluno travado, risco de inatividade/churn e recomendar intervencoes seguras com acao e metrica.
- **Sinais observados:** assinantes sem estudo; usuarios sem atividade; erros repetidos em simulado; simulado iniciado e nao concluido; muito chat sem pratica; ausencia de proxima missao.
- **Evidencias:** `users`, `user_activity`, `simulado_results`, `activity_events`, `flashcard_sessions`, `study_schedules`, `study_plans`.
- **Metricas:** reativacao em 7 dias; sessoes de estudo; praticas concluidas; recuperacao de simulado; missao ativa/CTA.
- **Acoes:** plano de reengajamento; converter chat em pratica; priorizar Caderno/Simulado; mensagem pela fila Hermes; revisao de onboarding.
- **Limites de seguranca:** nao envia mensagem real sem aprovacao; nao altera plano ou dados do aluno automaticamente; nao expõe PII desnecessaria.
- **Saida Admin:** acoes proativas, inbox de risco e payload estruturado com sinal, acao e metrica.
- **Status:** em consolidacao como `sucesso_aluno`; manter prioridade 3 e decidir alias publico `student_success` depois da validacao.

### 4. Professor Success

- **Responsabilidade:** detectar baixa ativacao docente, diagnostico sem acao e lacunas de uso em turma/material.
- **Sinais observados:** professor sem turma ativa; baixo export de relatorio; baixo uso do Notebook do Professor; alunos em risco; diagnostico sem intervencao.
- **Evidencias:** `institution_classes`, `teacher_content`, `teacher_notebook_output_generated`, exports/CSV, padroes de inatividade.
- **Metricas:** turmas ativas; exports; outputs do Notebook Professor; intervencoes registradas; alunos reativados.
- **Acoes:** recomendacao de setup docente; rotina de intervencao revisada por professor; pedido de instrumentacao.
- **Limites de seguranca:** nao contata aluno/familia automaticamente; nao cria risco individual sem dado observado; nao substitui julgamento docente.
- **Saida Admin:** descoberta/inbox com proxima acao docente e lacunas de dados.
- **Status:** implementado primeira leva como `professor_success` no `daily-learn`.

### 5. Simulado Intelligence

- **Responsabilidade:** avaliar simulados ENEM/concursos por qualidade das questoes, valor de aprendizagem, metadados e conclusao da jornada.
- **Sinais observados:** questoes/blocos com erro muito alto; suspeita de gabarito errado por padrao agregado; competencia/habilidade/classificacao ausente ou fraca; baixa discriminacao; erros por interpretacao versus conteudo; simulado iniciado e nao concluido; recuperacao enviada/concluida.
- **Evidencias:** `simulado_results`, `simulado_results.answers`, `activity_events.simulado_started/completed`, Caderno de Erros, `qa_sintetico.simulado_premium`.
- **Metricas:** taxa de conclusao; erro medio por materia/bloco; cobertura de answers/metadados por questao; desvio padrao de score por materia; erros enviados ao Caderno; recuperacao concluida.
- **Acoes:** auditar questoes/gabarito suspeito; priorizar habilidade ou materia fraca; completar classificacao; abrir revisao no Caderno; pedir instrumentacao granular quando faltar sinal.
- **Limites de seguranca:** nao promete nota/aprovacao; nao altera gabarito automaticamente; nao inventa competencia/habilidade sem metadado; nao classifica questao individual sem evidencia granular.
- **Saida Admin:** descoberta/inbox Hermes com recomendacao estruturada contendo evidencia, impacto, acao, metrica, criterios de aceite, confianca e alvo/modulo.
- **Status:** implementado como `simulado_intelligence` no `daily-learn`.

### 6. Caderno de Erros Intelligence

- **Responsabilidade:** transformar erros salvos no Caderno em inteligencia de revisao, recorrencia, recuperacao e lacunas de instrumentacao.
- **Sinais observados:** notas de revisao por materia/habilidade; causas provaveis recorrentes; revisao salva/processada no Caderno; simulado posterior na mesma materia; missoes locais ainda sem persistencia backend.
- **Evidencias:** `caderno_notes`, `simulado_results`, `studyai:hermes-learning-signal`, rascunho/missao/historico local do `error-review`.
- **Metricas:** revisoes salvas/processadas; recorrencia por materia/habilidade; tempo ate acerto posterior por materia; missoes pendentes sem backend.
- **Acoes:** abrir missao de revisao; sugerir exercicio similar; alertar professor/admin para recorrencia; pedir instrumentacao quando nao houver sinal persistido.
- **Limites de seguranca:** nao cria progresso global falso; nao afirma recuperacao por item quando so existe dado por materia; nao contata professor/aluno automaticamente; toda acao do aluno e explicita.
- **Saida Admin:** descoberta/inbox Hermes com recomendacao estruturada para Caderno de Erros e payload com `structuredActions`.
- **Status:** implementado como `caderno_erros_intelligence` no `daily-learn`.

### 7. Custos IA Optimizer

- **Responsabilidade:** reduzir custo IA sem degradar qualidade pedagogica.
- **Sinais observados:** custo por feature; custo por aluno ativo quando `user_activity` existe; custo por material gerado quando `generated_content`/`notebook_overviews`/`teacher_content` existem; modelos caros sem ganho aparente; prompts longos ou chamadas de muitos tokens; falhas/retries/fallbacks; oportunidades/desperdicio de cache; billing provider ausente versus logs internos.
- **Evidencias:** Admin IA & Custos, `ai_cost_log`, `ai_response_cache`, `activity_events`, `user_activity`, tabelas de materiais gerados e envs de billing por provider.
- **Metricas:** custo por entrega util; custo por aluno ativo; custo por material gerado; tokens medios por chamada; cache hit-rate/reuso; falhas/retries por 100 chamadas; billing reconciliado.
- **Acoes:** recomendar cache por feature; testar roteamento/compactacao/limite com revisao humana; pedir configuracao de billing real; investigar retries/fallbacks; abrir alerta de custo auditavel.
- **Limites de seguranca:** nao troca provider/modelo automaticamente; nao reduz qualidade pedagogica sem metrica de aceite; nao soma fatura real com log interno sem reconciliacao; nao limpa cache automaticamente.
- **Saida Admin:** descoberta/inbox Hermes com recomendacao estruturada contendo evidencia, impacto, acao sugerida, metrica, criterios de aceite, confianca e alvo/modulo.
- **Status:** implementado como `custos_ia_optimizer` no `daily-learn`.

### 8. UX/Product Auditor

- **Responsabilidade:** auditar friccao de produto, clareza de CTA, descoberta de funcionalidades e jornadas por papel sem duplicar a auditoria landing-only do `ux_layout`.
- **Sinais observados:** telas/fluxos confusos; fluxos abandonados; botoes unused/hidden; menu/rotas duplicadas; texto excessivo; estados vazio/loading/erro fracos; risco de layout mobile; feedback negativo por modulo.
- **Evidencias:** `qa_sintetico.premiumQualityLoop`, `ux_layout.landing_only`, `activity_events`, App Shell, inventario de rotas e QA manual.
- **Metricas:** taxa de conclusao por fluxo; cliques ate CTA primaria; uso de CTA por papel/modulo; rotas/menu duplicados resolvidos; feedback negativo triado; QA mobile aprovado.
- **Acoes:** abrir recomendacao UX estruturada; pedir QA manual mobile por modulo; priorizar simplificacao de menu/CTA; pedir instrumentacao quando faltar sinal.
- **Limites de seguranca:** nao remove rota funcional sem validacao; nao esconde CTA principal sem experimento ou QA; nao inventa abandono quando `activity_events` esta ausente; nao executa autofix de layout em producao.
- **Saida Admin:** descoberta/inbox Hermes com recomendacao estruturada de UX/produto por modulo.
- **Status:** implementado como `ux_product_auditor` no `daily-learn`.

### 9. Content Gap/CQO avancado

- **Responsabilidade:** priorizar lacunas por demanda real, cobertura BNCC/ENEM, fonte, qualidade e revisao humana.
- **Sinais observados:** topicos com demanda e sem conteudo/postulados; BNCC/ENEM ausente; score baixo; material sem fonte; topico popular com material fraco; falta de exercicio/exemplo/checkpoint; material gerado antigo sem revisao.
- **Evidencias:** `cqo_conteudo`, `knowledge-index`, `generated_content.payload`, `knowledge_documents.metadata/tags/source_file`, `knowledge_base.quality_score/access_count`, `activity_events`, `user_profile_memory.topicos_frequentes`, `enem_questions`.
- **Metricas:** `postuladoCoverageRatio`; lacunas priorizadas fechadas; cobertura BNCC/ENEM; materiais com fonte; materiais com exercicio/exemplo/checkpoint; materiais revisados/aprovados.
- **Acoes:** gerar/curar conteudo com fonte; abrir tarefa de revisao humana; priorizar ingestao de postulados/BNCC/ENEM; alertar professor/admin; medir aceite por lacuna fechada.
- **Limites de seguranca:** nao publica conteudo sem revisao; nao inventa fonte, habilidade BNCC/ENEM ou score; nao regenera material automaticamente.
- **Saida Admin:** descoberta/inbox Hermes com lacunas priorizadas, acoes, metrica e criterios de aceite.
- **Status:** implementado como `content_gap_cqo_avancado` no `daily-learn`.

### 10. Institution Success / B2B ROI

- **Responsabilidade:** medir adocao, risco de churn e prova de valor institucional/comercial sem expor ranking sensivel individual.
- **Sinais observados:** instituicoes interessadas/ativas; uso/adocao institucional; professores ativos; turmas com alunos/engajamento; reports/export; comunicacao/WhatsApp configurada ou bloqueada; risco por sem turma ativa, baixa adocao docente, baixa atividade discente, sem relatorio ou sem sinal de ROI; valor por diagnosticos, simulados, revisoes, materiais, atividades e exports.
- **Evidencias:** `instituicoes`, `corporate_leads`, `institution_users`, `turmas`, `turma_memberships`, `user_activity`, `simulado_results`, `flashcard_sessions`, `activities`, `activity_submissions`, `generated_content`, `notebook_overviews`, `communication_logs`, `user_notification_prefs`, `activity_events` de report/export, Relatorios B2B, `professor_success`.
- **Metricas:** instituicoes ativas/interessadas; adocao docente; turmas ativas/engajadas; alunos ativos 30d; exports B2B; WhatsApp configurado/registrado; sinais agregados de ROI; instituicoes em risco.
- **Acoes:** enviar plano de onboarding institucional; preparar relatorio de ROI; ativar canal de comunicacao; treinar professores; follow-up com instituicao em risco; exportar relatorio executivo para lideranca.
- **Limites de seguranca:** sem ranking sensivel indevido; sem contato automatico com escola/professor/aluno/responsavel; sem PII em evidencias; revisao humana obrigatoria; lacuna de observabilidade nao vira metrica inventada.
- **Saida Admin:** descoberta/inbox com recomendacao estruturada de adocao, risco, ROI, acao, metrica, aceite, confianca e alvo/modulo.
- **Status:** implementado como `institution_success_b2b_roi` no `daily-learn`; pendente validacao manual/cron em ambiente real.

## Ordem de rollout

1. **Primeira leva segura:** `auditor_pedagogico`, `notebook_rag_quality`, `professor_success`; todos registrados no `daily-learn`, expostos no catalogo e persistindo recomendacoes padronizadas.
2. **Consolidar Student Success:** manter `sucesso_aluno` como implementacao atual, enriquecendo sinais estruturados antes de decidir alias publico `student_success`.
3. **Proxima leva:** Simulado Intelligence deve fechar resultado/abandono/recuperacao com persistencia backend; Caderno de Erros Intelligence ja roda no `daily-learn`.
4. **Fechamento do roadmap:** `institution_success_b2b_roi` fecha a lista canonica; proximas atividades sao validacao manual, cron/admin e ajuste fino de instrumentacao.

## Criterios de aceite

- `POST /internal/hermes/daily-learn` inclui os agentes de dor real implementados (`auditor_pedagogico`, `notebook_rag_quality`, `professor_success`, `simulado_intelligence`, `caderno_erros_intelligence`, `custos_ia_optimizer`, `ux_product_auditor`, `content_gap_cqo_avancado`, `institution_success_b2b_roi`) no array `ran`; Student Success continua rodando como implementacao existente `sucesso_aluno`.
- `GET /api/agents/hermes/status` expõe `dorRealAgents` com prioridades, status, sinais, metricas, limites e sobreposicoes.
- Toda descoberta da primeira leva persiste `payload.recommendation` com evidencia, impacto, recomendacao, acao/metrica, criterios de aceite, confianca e target/modulo.
- Lacuna de observabilidade vira recomendacao de instrumentacao, nao metrica inventada.
- Nenhum agente executa autofix, envio externo, mutacao destrutiva, aprovacao de conteudo ou contato com aluno/familia.
- `pnpm run typecheck` passa antes de commit/deploy.
