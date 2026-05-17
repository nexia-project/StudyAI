# Hermes QA sintético

`qa_sintetico` é o primeiro agente Hermes para auditoria contínua da experiência como se usuários reais e especialistas estivessem testando a plataforma. Ele não usa automação de navegador nesta versão; trabalha com catálogo de personas/jornadas, inventário de rotas, métricas, índice de conteúdo e sinais de tabelas para gerar recomendações estruturadas no padrão Hermes.

## Objetivo

- Simular jornadas críticas de aluno, professor e gestor.
- Detectar bugs prováveis, lacunas de observabilidade, fricção de UX e riscos de qualidade pedagógica.
- Gerar recomendações acionáveis com evidência, impacto, métrica de sucesso e critérios de aceite.
- Criar ações/inbox para triagem quando o achado for crítico ou pedir follow-up.
- Usar o padrão de material pedagógico premium como rubrica para conteúdo gerado, importado ou curado.
- Manter um loop contínuo de qualidade premium para Landing, Home, Notebook RAG, Simulado, Tiagão e Caderno de Erros.

## Personas

- `aluno_fundamental`: precisa de linguagem simples, passo a passo e incentivo.
- `aluno_medio_enem`: precisa de conexão com habilidade, treino e revisão.
- `vestibulando_concurseiro`: precisa de eficiência, precisão e diagnóstico de lacunas.
- `professor`: precisa revisar/adaptar conteúdo com controle pedagógico.
- `gestor_instituicao`: precisa acompanhar métricas, risco e impacto com privacidade.

## Jornadas cobertas

- `premium_quality_loop`: Hermes monitora qualidade premium multi-módulo.
- `aluno_plano_estudo`: aluno pede plano de estudo.
- `aluno_simulado_questao`: aluno faz simulado ou questão ENEM.
- `tiagao_duvida_voz_texto`: aluno usa Tiagão por voz/texto para tirar dúvida.
- `notebook_rag_lousa`: aluno/professor usa notebook, RAG ou lousa.
- `caderno_erros_revisao`: aluno transforma erro em revisão no Caderno.
- `professor_gestor_relatorios`: professor/gestor revisa turma, conteúdo, métricas ou relatórios.
- `admin_hermes_review`: admin revisa sugestões Hermes.

## Loop premium contínuo

O snapshot de QA agora expõe `premiumQualityLoop.modules`, com módulo, superfícies, fontes de evidência, checklists diários/semanais, métricas e critérios de aceite. A intenção é acelerar a transformação premium sem criar correções automáticas destrutivas.

Módulos monitorados:

- `Landing`: primeira dobra, CTA, promessa, prova e claims auditáveis.
- `Home`: próxima ação, centralidade do Tiagão, continuidade e ausência de dashboard pesado.
- `Notebook RAG`: qualidade pedagógica, fontes, visual, preview, PDF/print, fallback e feedback.
- `Simulado`: questão, resultado, análise por habilidade/erro e ponte para revisão.
- `Tiagao`: voz/texto, modos pedagógicos, revisão de erro, ações explícitas e não vazamento de contexto interno.
- `Caderno de Erros`: rascunho estruturado, causa provável, missão, histórico e sinal Hermes.

Cadência operacional:

- **Diário:** entra em `POST /internal/hermes/daily-learn`; revisa sinais recorrentes, lacunas de observabilidade e regressões prováveis dos módulos de uso contínuo.
- **Semanal/pré-release:** rodar QA manual ponta a ponta e, se necessário, disparar `POST /api/agents/qa_sintetico/executar-auditoria` com `persist: true`.
- **Guardrail:** Hermes recomenda, persiste descoberta/inbox e pode criar tarefa de triagem; não altera produção, conteúdo, usuários, planos ou dados de aluno automaticamente.

## Como roda

- Registro: `artifacts/api-server/src/lib/hermes/register-default-agents.ts`.
- Job: `qaSinteticoDailyLearn()` em `artifacts/api-server/src/lib/hermes/jobs/qa-sintetico.ts`.
- Cron: entra no endpoint existente `POST /internal/hermes/daily-learn`.
- Rotas admin:
  - `GET /api/agents/qa_sintetico/catalogo`
  - `POST /api/agents/qa_sintetico/executar-auditoria`

O catálogo também expõe `pedagogicalMaterialStandard`, definido em `artifacts/api-server/src/lib/pedagogy/premium-material-standard.ts`, para que auditorias e futuras telas admin usem a mesma rubrica de qualidade.

Body recomendado para auditoria manual:

```json
{
  "periodoDias": 7,
  "persist": true,
  "enqueueTasks": false
}
```

`enqueueTasks` fica `false` por padrão. Quando `true`, apenas cria tarefa Hermes de follow-up/triagem; não altera conteúdo, dados de alunos, turmas, assinaturas ou relatórios.

## Como aparece no Admin

Cada achado persistido inclui `payload.recommendation` ou `evidencia.recommendation`, compatível com o padrão Hermes:

- `agentId`: sempre `qa_sintetico`
- `area`: `qa_sintetico`
- `module`: Landing, Home, Notebook RAG, Simulado, Tiagão, Caderno de Erros ou outro módulo quando aplicável
- `targetSurface`: rota, módulo ou superfície afetada
- `observedState` e `evidence`: estado observado e snapshot usado
- `problemOpportunity`: risco ou oportunidade
- `recommendedChange`: mudança específica
- `expectedImpact`: impacto esperado
- `confidence`, `successMetric`, `implementationNotes`, `acceptanceCriteria`

Toda recomendação premium precisa ser auditável com: módulo, evidência, problema, mudança sugerida, métrica e critérios de aceite.

## Checklist manual premium

- Landing: abrir mobile e desktop, validar promessa em até 5 segundos, CTA principal/secundário, claims/preço/depoimentos e ausência de promessa garantida.
- Home: entrar com usuário sem histórico e com missão de erro recente; conferir próxima ação, busca/upload inline, Tiagão explícito e mobile.
- Notebook RAG: subir documento real, gerar apresentação/material, revisar 3 slides de desenvolvimento, preview, tela cheia, PDF/print e feedback negativo.
- Simulado: fazer simulado curto com erro proposital, revisar gabarito, gerar análise premium e enviar ao Caderno.
- Tiagão: testar dúvida rápida, revisão de erro, estudar material e comando de navegação; confirmar que ações são explícitas.
- Caderno de Erros: importar rascunho, salvar nota, voltar à Home e pedir revisão ao Tiagão.

Achados de severidade `alta` também entram em `hermes_acoes_proativas` e `hermes_admin_inbox` para triagem.

## Guardrails

- Não executa mutações destrutivas.
- Não altera dados ou conteúdo de produção automaticamente.
- Não envia mensagens reais para alunos/professores/gestores.
- Não inventa métricas; quando falta dado, recomenda observabilidade.
- Correção de código deve acontecer pelo fluxo de desenvolvimento, revisão e deploy.

## Próximas fases

- Adicionar testes de API reais por jornada em ambiente controlado.
- Criar usuários/fixtures sintéticos em staging.
- Medir latência e qualidade com rubricas por resposta.
- Adicionar automação browser somente quando houver base estável de seletores e ambiente isolado.
- Criar cadence semanal dedicada se o `daily-learn` ficar caro para executar todos os dias.
