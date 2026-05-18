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
| 5 | Simulado Intelligence | Aluno | Parcial/TODO | Simulado premium, Caderno |
| 6 | Caderno de Erros Intelligence | Aluno | Parcial/TODO | Caderno premium, Home next-best-action |
| 7 | Custos IA Optimizer | Admin | Parcial/TODO | Admin IA & Custos, `gestao`, `monitor` |
| 8 | UX/Product Auditor | Admin | Existente/parcial | `ux_layout`, `qa_sintetico` |
| 9 | Content Gap/CQO avancado | Admin | Existente/parcial | `cqo_conteudo`, `knowledge-index` |
| 10 | Institution Success / B2B ROI | Instituicao | Parcial/TODO | Relatorios B2B, `professor_success` |

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

- **Responsabilidade:** transformar resultado de simulado em diagnostico, treino e revisao.
- **Sinais observados:** simulados iniciados/concluidos; erro por area/habilidade; recuperacao pendente/concluida.
- **Evidencias:** `simulado_results`, eventos locais do Simulado, Caderno de Erros.
- **Metricas:** conclusao de simulado; erros enviados ao Caderno; recuperacao concluida.
- **Acoes:** priorizar habilidade fraca; abrir revisao no Caderno; sugerir treino curto.
- **Limites de seguranca:** nao promete nota/aprovacao; nao inventa habilidade quando metadado falta.
- **Saida Admin:** TODO da proxima leva.
- **Status:** parcial.

### 6. Caderno de Erros Intelligence

- **Responsabilidade:** detectar recorrencia de erro e fechar loop de revisao.
- **Sinais observados:** notas de revisao; missoes pendentes; erro recorrente; revisao concluida.
- **Evidencias:** `caderno_notes`, `studyai:hermes-learning-signal`, historico local.
- **Metricas:** revisoes concluidas; streak; reducao de erro recorrente.
- **Acoes:** sugerir revisao; acionar Tiagao em modo corretor; abrir lacuna de persistencia backend quando necessario.
- **Limites de seguranca:** nao cria progresso global falso; toda acao do aluno e explicita.
- **Saida Admin:** TODO da proxima leva.
- **Status:** parcial.

### 7. Custos IA Optimizer

- **Responsabilidade:** reduzir custo IA sem degradar qualidade pedagogica.
- **Sinais observados:** uso por provider/modelo; custo por feature; fallback/cache; latencia.
- **Evidencias:** Admin IA & Custos, telemetria de IA.
- **Metricas:** custo por entrega util; latencia; qualidade aceita.
- **Acoes:** recomendar cache, roteamento de modelo ou limite por feature.
- **Limites de seguranca:** nao troca provider/modelo automaticamente.
- **Saida Admin:** TODO da proxima leva.
- **Status:** parcial.

### 8. UX/Product Auditor

- **Responsabilidade:** auditar friccao, clareza de CTA e jornadas por papel.
- **Sinais observados:** hierarquia visual; estados vazios; duplicacao de rotas; mobile.
- **Evidencias:** `ux_layout`, `qa_sintetico`, QA manual.
- **Metricas:** cliques ate acao; abandono; tarefa concluida.
- **Acoes:** abrir recomendacao UX e checklist de QA.
- **Limites de seguranca:** nao remove rota funcional sem validacao.
- **Saida Admin:** continuar via `ux_layout` e `qa_sintetico`.
- **Status:** existente/parcial.

### 9. Content Gap/CQO avancado

- **Responsabilidade:** priorizar lacunas por demanda, risco e cobertura.
- **Sinais observados:** `contentGaps`, postulados, demanda por materia, aulas em geracao.
- **Evidencias:** `cqo_conteudo`, `knowledge-index`.
- **Metricas:** coverage ratio; lacunas fechadas; qualidade por materia.
- **Acoes:** priorizar ingestao/curadoria; abrir plano CQO.
- **Limites de seguranca:** nao publica conteudo sem revisao.
- **Saida Admin:** descoberta de conteudo e status Hermes.
- **Status:** existente/parcial.

### 10. Institution Success / B2B ROI

- **Responsabilidade:** medir adocao, risco e valor institucional sem invadir privacidade.
- **Sinais observados:** turmas ativas; adocao; exports; alunos em risco; cobertura por turma.
- **Evidencias:** Professor, Instituicao, Relatorios B2B, `professor_success`.
- **Metricas:** adocao por turma; uso docente; risco agregado; ROI/valor percebido.
- **Acoes:** recomendacao para coordenacao; onboarding institucional; priorizacao de turma.
- **Limites de seguranca:** sem ranking sensivel indevido; revisao humana obrigatoria.
- **Saida Admin:** TODO da proxima leva.
- **Status:** parcial.

## Ordem de rollout

1. **Primeira leva segura:** `auditor_pedagogico`, `notebook_rag_quality`, `professor_success`; todos registrados no `daily-learn`, expostos no catalogo e persistindo recomendacoes padronizadas.
2. **Consolidar Student Success:** manter `sucesso_aluno` como implementacao atual, enriquecendo sinais estruturados antes de decidir alias publico `student_success`.
3. **Proxima leva:** Simulado Intelligence e Caderno de Erros Intelligence, porque ja existem sinais locais e jornadas premium.
4. **Depois:** Custos IA Optimizer, UX/Product Auditor, Content Gap/CQO avancado e Institution Success/B2B ROI.

## Criterios de aceite

- `POST /internal/hermes/daily-learn` inclui os tres agentes da primeira leva no array `ran`.
- `GET /api/agents/hermes/status` expõe `dorRealAgents` com prioridades, status, sinais, metricas, limites e sobreposicoes.
- Toda descoberta da primeira leva persiste `payload.recommendation` com evidencia, impacto, recomendacao, acao/metrica, criterios de aceite, confianca e target/modulo.
- Lacuna de observabilidade vira recomendacao de instrumentacao, nao metrica inventada.
- Nenhum agente executa autofix, envio externo, mutacao destrutiva, aprovacao de conteudo ou contato com aluno/familia.
- `pnpm run typecheck` passa antes de commit/deploy.
