# Instituicao - gestao escolar e grade inteligente

Referencia analisada: PowerCubus, como produto de gestao operacional para horarios escolares.

## Padroes uteis para o StudyAI

- Grade horaria como decisao pedagogica: aulas duplas/separadas, limites diarios por disciplina, distribuicao semanal e concentracao de componentes precisam ser configuraveis.
- Docente como restricao operacional: disponibilidade, preferencia de horario, concentracao de aulas em menos dias e reducao de janelas impactam satisfacao, custo e folha.
- Cenarios comparaveis: o gestor precisa modificar regras e reprocessar rapidamente, salvando resultados e indicadores de qualidade.
- Recursos compartilhados: simultaneidade, uniao de turmas e locais/capacidade de aula exigem modelagem propria antes de qualquer solver.
- Integracao e essencial para instituicoes maiores: SIS/ERP/financeiro devem entrar por API ou importacao segura, com campos mapeados e auditoria.
- Operacao com restricoes claras evita promessa falsa: sem carga horaria, locais, disponibilidade persistida e regras de folha, o StudyAI deve mostrar fundacao/configuracao, nao uma grade gerada.

## Proposta maior

Evoluir o portal institucional para um centro interno de gestao escolar/ERP leve com frentes:

- Alunos: cadastro, turma, responsavel, consentimento, engajamento e risco.
- Professores: equipe, vinculos, disponibilidade, preferencias e carga horaria.
- Financeiro/cobrancas: mensalidades, inadimplencia, acordos e comunicacao com responsaveis.
- Folha de pagamento: carga docente, horas, janelas, ociosidade e regras de remuneracao.
- Grades de horarios: restricoes, cenarios, solver, indicadores de qualidade e historico de processamentos.
- Comunicacao WhatsApp: avisos, cobrancas e campanhas com consentimento e templates aprovados.
- Relatorios/indicadores: pedagogico, operacional, financeiro e comparacao de cenarios.

## Primeira fatia implementada

Adicionar ao portal institucional uma aba "Gestao Escolar" com:

- Modulos/cards para alunos, professores, financeiro/cobrancas, folha de pagamento, grades de horarios, comunicacao WhatsApp e relatorios/indicadores.
- Painel de planejamento premium de grade com estado local para restricoes: aulas duplas/separadas, limite diario por disciplina, disponibilidade/preferencias docentes, concentracao de dias, distribuicao semanal, reducao de janelas, simultaneidade, concentracao por dia e uniao de turmas.
- Diagnostico deterministico baseado apenas nas restricoes marcadas, sem gerar horario ficticio.
- Angulo Hermes operacional para restricoes ausentes, sobrecarga de alunos, janelas docentes e falta de dados financeiros/folha.

## Dados que ainda faltam

- Carga horaria por disciplina, professor por componente, turnos, calendario e locais de aula.
- Disponibilidade/preferencia docente persistida por instituicao.
- Capacidade de salas/laboratorios e regras de simultaneidade por local.
- Responsaveis por aluno, telefone validado e consentimento por finalidade.
- Financeiro, cobrancas, contratos, inadimplencia e regras de folha.
- Armazenamento de cenarios de grade, indicadores de qualidade e auditoria de reprocessamento.

## Roadmap ERP / solver

O plano tecnico de evolucao profunda fica em `docs/erp-solver-roadmap.md`. O proximo marco seguro e persistir modelo operacional e cenarios auditaveis antes de implementar solver real. Solver v1 so deve entrar depois do validador deterministico de restricoes, com hard constraints explicitas, resultado revisavel e sem publicacao automatica de grade.

## Hermes CQO avancado

- `content_gap_cqo_avancado` entrou no `daily-learn` para priorizar lacunas de conteudo antes de uso institucional: demanda sem conteudo/postulado, BNCC/ENEM ausente, material fraco, falta de fonte, falta de exercicio/exemplo/checkpoint e material antigo sem revisao.
- A acao segura para instituicoes e alertar professor/admin e priorizar ingestao/curadoria; Hermes nao publica, aprova ou regenera material automaticamente.
- Criterio de aceite institucional: materiais usados em turma precisam ter fonte, habilidade quando aplicavel, pratica/checkpoint e revisao humana rastreavel.

## Hermes UX/Product Auditor

- `ux_product_auditor` entrou no `daily-learn` para auditar friccao de jornada antes de ampliar uso institucional: telas confusas, abandono, CTAs escondidos, menu/rotas duplicadas, texto excessivo, estados fracos, risco mobile e feedback negativo por modulo.
- Para Instituicao/B2B, a recomendacao segura e validar descoberta de funcionalidades, menu por papel e estados do Admin/Hermes sem remover rotas funcionais ou esconder CTA antes de QA manual.
- Criterio de aceite institucional: gestor/professor precisa chegar ao relatorio, comunicacao, conteudo e Hermes com uma acao primaria clara, estados vazio/loading/erro compreensiveis e sem sobreposicao mobile.

## Hermes Institution Success / B2B ROI

- `institution_success_b2b_roi` entrou no `daily-learn` para fechar o roadmap de agentes de dor real com leitura institucional/comercial: instituicoes interessadas/ativas, adocao docente, turmas engajadas, atividade discente, exports, comunicacao WhatsApp e prova agregada de ROI.
- A acao segura para Instituicao/B2B e abrir recomendacao revisavel: onboarding institucional, relatorio de ROI para lideranca, ativacao de comunicacao, treinamento docente, follow-up de risco ou export executivo.
- Criterio de aceite institucional: nenhuma acao envia comunicacao real, altera contrato ou expõe ranking sensivel; ausencia de `activity_events`, `communication_logs` ou exports vira lacuna de observabilidade.
