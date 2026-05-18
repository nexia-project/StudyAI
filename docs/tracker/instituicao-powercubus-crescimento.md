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

## Hermes CQO avancado

- `content_gap_cqo_avancado` entrou no `daily-learn` para priorizar lacunas de conteudo antes de uso institucional: demanda sem conteudo/postulado, BNCC/ENEM ausente, material fraco, falta de fonte, falta de exercicio/exemplo/checkpoint e material antigo sem revisao.
- A acao segura para instituicoes e alertar professor/admin e priorizar ingestao/curadoria; Hermes nao publica, aprova ou regenera material automaticamente.
- Criterio de aceite institucional: materiais usados em turma precisam ter fonte, habilidade quando aplicavel, pratica/checkpoint e revisao humana rastreavel.
