# ERP / solver deep evolution roadmap

**Atualizado em:** 2026-05-18  
**Escopo:** preparacao tecnica para evoluir Gestao Escolar, ERP leve e solver de grade sem implementar um solver grande agora.

## Principio

O StudyAI nao deve prometer "grade automatica" antes de persistir dados operacionais minimos, restricoes auditaveis e indicadores de qualidade. A primeira evolucao deve transformar o painel atual em um modelo de cenarios, validacao e diagnostico. O solver entra depois, como motor explicavel e reprocessavel.

## Marco 1 - Modelo operacional persistido

**Objetivo:** tirar as restricoes do estado local e criar base institucional auditavel.

Entregas:

- Instituicao, unidade, turnos, calendario e periodos letivos.
- Turmas, componentes/disciplinas, carga horaria semanal e professor responsavel.
- Professores com disponibilidade, preferencias, concentracao de dias, limites de carga e janelas.
- Locais/salas/laboratorios com capacidade e recursos.
- Responsaveis e consentimentos por finalidade para comunicacao.
- Cenarios de planejamento de grade com status `draft`, `validated`, `solving`, `solved`, `rejected`.

Aceite:

- CRUD ou importacao segura cobre os campos minimos.
- Alteracao de restricao gera auditoria: quem, quando, antes/depois e justificativa.
- Sem dados minimos, UI mostra lacuna e proxima acao, nao grade ficticia.
- Hermes consegue apontar restricoes ausentes sem expor PII desnecessaria.

## Marco 2 - Validador deterministico de restricoes

**Objetivo:** detectar inviabilidade antes de chamar solver.

Entregas:

- Checagens de carga horaria por turma/disciplina/professor.
- Conflitos de disponibilidade docente.
- Capacidade e simultaneidade de locais.
- Regras de aulas duplas/separadas, limite diario por disciplina e concentracao semanal.
- Score de completude e lista de blockers por cenario.

Aceite:

- Validador retorna blockers, warnings e metricas explicaveis.
- Cada blocker aponta campo, entidade afetada e correcao sugerida.
- Rodar validador nao altera o cenario.
- Typecheck e testes unitarios cobrem cenarios viavel, inviavel e incompleto.

## Marco 3 - Solver v1 explicavel

**Objetivo:** gerar primeira grade apenas para cenarios validados.

Entregas:

- Motor heuristico inicial com hard constraints obrigatorias e soft constraints pontuadas.
- Limite de tempo por execucao, cancelamento e historico de tentativas.
- Resultado com timetable, conflitos residuais, score e explicacao por restricao.
- Comparacao de cenarios lado a lado.

Aceite:

- Solver nunca ignora hard constraint sem declarar inviabilidade.
- Resultado e reproduzivel para mesmo input/seed.
- UI mostra score, conflitos e trade-offs antes de publicar.
- Cenario resolvido nao vira grade ativa sem confirmacao humana.

## Marco 4 - ERP leve conectado ao solver

**Objetivo:** conectar grade a operacao escolar sem virar monolito financeiro prematuro.

Entregas:

- Alunos/responsaveis, contratos simples, cobrancas, inadimplencia e follow-up revisavel.
- Folha docente derivada de carga horaria planejada versus realizada.
- Relatorios operacionais: ocupacao, janelas docentes, sobrecarga, turmas sem professor, salas subutilizadas.
- Integracao/importacao CSV/API para SIS/ERP externo com mapeamento auditavel.

Aceite:

- Financeiro e folha ficam separados de recomendacoes pedagogicas.
- WhatsApp/cobranca exige consentimento, template e revisao humana.
- Relatorios agregados nao expõem ranking sensivel individual.
- Hermes Institution Success usa sinais agregados de ROI, nao promessa comercial inventada.

## Marco 5 - Solver v2 e otimizacao

**Objetivo:** melhorar qualidade de grade com aprendizado operacional e simulacoes.

Entregas:

- Pesos configuraveis por instituicao para janelas, concentracao, preferencia docente, uso de sala e equilibrio pedagogico.
- Busca local/metaheuristica ou backend dedicado quando o volume exigir.
- Simulacao "e se" com diff entre cenarios.
- Métricas de qualidade historicas por ciclo.

Aceite:

- Mudanca de peso mostra impacto no score e nos trade-offs.
- Processamento longo roda em fila, com status e retry seguro.
- Historico permite comparar versoes e reverter para cenario anterior.
- Nenhuma otimizacao reduz regra legal/contratual a soft constraint sem decisao explicita.

## Preparacao tecnica segura agora

- Manter documentacao de entidades e restricoes antes de criar tabelas finais.
- Adicionar schemas/migrations apenas quando o shape for confirmado pelos fluxos do Marco 1.
- Reaproveitar Hermes para lacunas e auditoria, nao para gerar grade automaticamente.
- Criar testes de validador antes do solver.
- Evitar provider externo de solver ate ter dataset real, criterio de qualidade e limite operacional.

