# Plano Mestre de Execucao StudyAI

**Status:** controle operacional da evolucao premium
**Fonte:** `docs/plano-mestre-evolucao-studyai.md`  
**Escopo deste tracker:** coordenar execucao, aceite, validacao, rollout, commits e deploy.  
**Fora de escopo:** editar landing, app, backend ou qualquer arquivo de implementacao.

## Principio de controle

A Fase 1 deve deixar o StudyAI mais premium e mais compreensivel sem adicionar complexidade. Toda entrega precisa preservar o Tiagao como ponto de confianca, melhorar o proximo passo do aluno e manter a experiencia mobile-first.

## Historico recente de execucao

- **Landing premium:** primeira dobra e narrativa premium ja receberam evolucoes iniciais.
- **Home como centro de comando:** fluxo de proxima acao e continuidade do aluno ja recebeu primeira reorganizacao.
- **Fundacao pedagogica:** padrao premium e QA sintetico Hermes foram documentados.
- **Admin/Hermes:** diagnosticos de custo, billing e cobertura de provedores foram ampliados.
- **Notebook/RAG multimodal:** primeira passada de UX, exportacao e telemetria de qualidade Hermes foi concluida no commit `01857b24`; producao ja respondeu `/api/healthz` no commit `44daf83`, portanto `01857b24` ou mais novo esta publicado.
- **Notebook apresentacoes premium:** correcao de apresentacoes publicada; producao respondeu `/api/healthz` com `d1270af`, equivalente ao commit `d1270af2` de apresentacoes premium.
- **Simulado ENEM premium:** existe um corte inicial em `44daf83`; apos confirmacao do deploy `d1270af2`, o fluxo pode alimentar o Caderno de Erros premium em fatias pequenas.
- **Caderno de Erros premium:** corte inicial publicado em producao no commit `bb2ea8f`: simulado gera rascunho estruturado com tipo/causa de erro, Caderno organiza o rascunho e Home prioriza a revisao como proxima acao.
- **B2B premium diagnostico:** corte inicial implementado para professor/gestor com risco por turma, baixa atividade, resumo acionavel, acao recomendada e lacunas de dados explicitadas sem inventar numeros.
- **Hermes premium quality loop:** `qa_sintetico` agora monitora Landing, Home, Notebook RAG, Simulado, Tiagao e Caderno de Erros com recomendacoes contendo modulo, evidencia, problema, mudanca sugerida, metrica e criterios de aceite; sem autofix destrutivo.

## Tickets em execucao

### F1-01 Landing premium

**Status:** primeira entrega concluida; manter em observacao de conversao e clareza.

**Objetivo:** refinar a landing para comunicar promessa, primeira dobra, CTA, prova, modulos e instituicoes com hierarquia premium.

**Superficie prevista:** `artifacts/studyai/src/pages/Landing.tsx`.

**Resultado esperado:**

- Primeira dobra com promessa clara: objetivo/material do aluno entra, Tiagao organiza o proximo passo.
- CTA principal dominante para comecar/entrar no app e CTA institucional secundario.
- Modulos apresentados como prova de capacidade, nao como lista concorrente.
- Sinais de confianca com fonte auditavel, pilotos ou linguagem explicitamente experimental.
- Visual premium, educacional e brasileiro, sem promessa de resultado garantido.

**Criterios de aceite:**

- A proposta principal pode ser entendida em ate 5 segundos na primeira dobra.
- Tiagao aparece como tutor/personagem central, nao como widget lateral generico.
- CTAs nao competem entre si e apontam para jornadas distintas.
- Numeros, depoimentos, logos ou claims sao auditaveis ou marcados como piloto.
- A landing funciona bem em viewport mobile e desktop.
- Nao ha nova promessa de nota, aprovacao ou resultado garantido.

### F1-02 App do aluno como centro de comando

**Status:** primeira entrega concluida; proximas iteracoes devem conectar a proxima acao aos erros, simulados e revisoes reais.

**Objetivo:** reorganizar a home do aluno em torno de proxima acao, Tiagao e continuidade.

**Superficies previstas:** `artifacts/studyai/src/pages/Home.tsx`, `artifacts/studyai/src/components/MainMenuDrawer.tsx` e rotas relacionadas somente quando necessario pelos workers de implementacao.

**Resultado esperado:**

- Card principal de "proxima acao" com missao, tempo estimado, materia, motivo e botao de inicio.
- Tiagao sempre acessivel por voz/chat e com modos claros de uso.
- Progresso util exibido com foco em sessoes, revisoes, erros recorrentes e simulados.
- Menos competicao visual entre cards, banners e features.
- Estados vazios guiados para sem historico, sem plano ou sem material.

**Criterios de aceite:**

- O aluno consegue identificar a melhor proxima acao sem abrir menu.
- A home prioriza uma acao principal e deixa profundidade no menu.
- Upload, busca, conversa e continuidade permanecem acessiveis.
- Estados vazios, loading, erro e sucesso usam linguagem orientadora.
- A experiencia mobile nao depende de cards largos ou excesso de graficos.
- O menu separa essencial, avancado e legado sem esconder fluxos criticos.

### F1-03 Fundacao de material pedagogico

**Status:** primeira entrega concluida em documentacao e criterios; ainda falta transformar o padrao em validacao sistematica de materiais.

**Objetivo:** estabelecer padrao minimo para materiais premium, preparando a Fase 2 sem exigir mudancas profundas de motor neste ciclo.

**Superficies previstas:** docs, templates, QA sintetico e, se outro worker assumir implementacao, pontos de geracao/exibicao de materiais.

**Resultado esperado:**

- Template canonico com objetivo, nivel, prova-alvo, materia, habilidade, pre-requisitos, conceitos, erros comuns, explicacoes, exercicios, fontes e quality score.
- Rubrica simples para avaliar completude, verificabilidade, adequacao pedagogica, nivel e risco de alucinacao.
- Criterios para diferenciar conteudo premium de "texto bonito".
- Orientacao de fonte/citacao quando houver RAG, banco oficial ou documento do usuario.

**Criterios de aceite:**

- Todo material premium responde: o que ensinar, para quem, com qual evidencia e como praticar.
- Exercicios incluem gabarito, justificativa e distratores explicados quando aplicavel.
- O padrao explicita erros comuns e intervencao sugerida.
- Conteudo baseado em RAG ou fonte oficial mostra origem quando influenciar a resposta.
- Existe checklist de revisao humana para conteudo de professor/instituicao.
- O padrao pode ser usado por Hermes/QA sintetico para avaliar qualidade.

### F2-01 Caderno de erros premium

**Status:** primeira fatia implementada, commitada e publicada; pendente QA manual.

**Objetivo:** transformar erros do simulado em revisao acionavel, com causa provavel, habilidade, proxima missao e sinal Hermes.

**Superficies previstas:** `artifacts/studyai/src/pages/SimuladoEnem.tsx`, `artifacts/studyai/src/pages/Caderno.tsx`, `artifacts/studyai/src/pages/Home.tsx` e helper compartilhado de rascunho/missao.

**Resultado esperado:**

- Simulado cria rascunho estruturado para o caderno de erros.
- Caderno destaca tipo de erro, causa provavel, quantidade de erros e proxima missao antes de salvar.
- Home consome a missao recente do caderno de erros como proxima melhor acao.
- Tiagao recebe prompt especifico para modo "revisar erro".
- Hermes recebe sinal local com metrica/recomendacao para o loop de aprendizagem.

**Criterios de aceite:**

- O fluxo preserva as rotas existentes de simulado, caderno e home.
- O aluno consegue sair do resultado do simulado para uma nota de revisao sem copiar texto manualmente.
- A revisao mostra causa/tipo de erro, habilidade ou materia e proximo passo.
- O sinal Hermes contem superficie, evento, erros, acuracia e recomendacao acionavel.
- O corte continua pequeno o bastante para ser validado manualmente em um simulado curto.

### F2-02 B2B premium diagnostico professor/gestor

**Status:** primeira fatia implementada; pendente QA manual e rollout.

**Objetivo:** acelerar percepcao premium no modulo B2B sem redesenhar rotas: professor ve risco/baixa atividade por turma e gestor ve adocao/cobertura institucional com proxima acao clara.

**Superficies previstas:** `artifacts/studyai/src/pages/ProfessorTurma.tsx`, `artifacts/studyai/src/pages/Instituicao.tsx`.

**Resultado esperado:**

- Dashboard da turma destaca alunos em risco ou com sinais de baixa atividade quando os dados existem.
- Turma mostra resumo de usuarios, XP, simulados, acerto e dias ativos ja disponiveis no endpoint atual.
- Gestor institucional recebe diagnostico de cobertura, tracao e relatorio com recomendacao operacional.
- Exportacao detalhada aparece como placeholder honesto quando falta endpoint por linha/aluno.
- Lacunas de dados ficam explicitas: tempo real por sessao, ultimo login bruto, entregas atrasadas e intervencoes registradas.

**Criterios de aceite:**

- Rotas `/professor`, `/professor/turma/:id`, `/instituicao` e auth atual permanecem preservadas.
- Nao ha numeros inventados para risco individual no agregado institucional.
- Estados sem alunos, sem relatorio e sem dados suficientes orientam o proximo setup.
- Typecheck do app passa antes de commit/deploy.

### F0-04 Hermes premium quality loop

**Status:** primeira versao implementada em QA sintetico e docs; pendente execucao manual da auditoria em producao/staging.

**Objetivo:** acelerar a transformacao premium com um loop continuo de qualidade que monitora os modulos ja tocados sem executar correcao automatica destrutiva.

**Superficies previstas:** `artifacts/api-server/src/lib/hermes/jobs/qa-sintetico.ts`, `artifacts/api-server/src/lib/hermes/recommendationStandard.ts`, `artifacts/studyai/src/pages/Admin.tsx`, docs Hermes e tracker.

**Resultado esperado:**

- Catalogo/snapshot Hermes expoe `premiumQualityLoop` com modulos, evidencias, checklists diario/semanal, metricas e criterios de aceite.
- Recomendacoes premium exibem `module` no Admin.
- Landing, Home, Notebook RAG, Simulado, Tiagao e Caderno de Erros ficam no mesmo ciclo de QA sintetico.
- Daily-learn usa o loop como contexto; checklist semanal continua manual/pre-release.

**Criterios de aceite:**

- Toda recomendacao premium contem modulo, superficie, evidencia, problema/oportunidade, mudanca sugerida, metrica e criterios de aceite.
- Hermes cria descoberta/inbox/tarefa de triagem, mas nao altera conteudo, dados de aluno, planos, assinaturas ou producao automaticamente.
- Modulos sem telemetria suficiente viram lacuna de observabilidade, nao metrica inventada.
- Checklist manual cobre jornada ponta a ponta: Landing -> Home -> Notebook RAG -> Simulado -> Caderno -> Tiagao.

## Checklist de validacao

### Bloqueador atual - Notebook RAG apresentacoes

- [x] Confirmar que producao esta em commit `01857b24` ou mais novo: health atual retornou `44daf83`.
- [x] Confirmar que producao esta no commit da correcao `d1270af2` ou equivalente: `/api/healthz` retornou `d1270af`.
- [x] Tratar screenshot de apresentacao ruim como falha bloqueante de premium.
- [x] Backend exige schema rico de slides: `layout`, `visual`, `evidencia`, `comoExplicar`, `exemplo` e/ou `checkpoint`.
- [x] Fallback deterministico reconstrói slides fracos com cards visuais, evidencia da fonte, nota do professor e pergunta de checagem.
- [x] Renderer mostra visual estruturado/placeholder intencional em vez de fundo vazio com bullets.
- [x] Export/print inclui visual, evidencia e checkpoints no material gerado.
- [ ] QA manual em `/notebook`: gerar apresentacao com documento real e verificar 3 slides de desenvolvimento, PDF premium e modo tela cheia.
- [ ] Validar que nenhum slide de conteudo fica apenas com titulo + bullets em fundo gradiente.
- [ ] Validar que feedback negativo do material continua registrando telemetria Hermes.

### Caderno de Erros premium

- [x] Iniciar somente apos producao responder com `d1270af`.
- [x] Criar rascunho estruturado a partir do resultado do Simulado ENEM.
- [x] Mostrar no Caderno tipo/causa de erro, quantidade e proxima missao.
- [x] Priorizar revisao de erro recente na Home como proxima melhor acao.
- [x] Emitir sinal local Hermes com evento, metrica e recomendacao.
- [x] Rodar typecheck focado do app sem erro.
- [x] Confirmar deploy via `/api/healthz` no commit `bb2ea8f`.
- [ ] QA manual: simulado curto com erro -> enviar ao caderno -> salvar nota -> voltar para Home e conferir missao de revisao.

### Produto e UX

- [ ] Tiagao continua visivel, confiavel e reconhecivel.
- [ ] A jornada principal reduz friccao e nao adiciona dashboard pesado ao aluno.
- [ ] Existe uma proxima acao clara nas superficies criticas.
- [ ] CTA, estados vazios, loading, erro, sucesso e paywall estao claros.
- [ ] Fluxos principais funcionam em mobile.

### Pedagogia

- [ ] Mudancas melhoram diagnostico, treino, revisao ou qualidade de explicacao.
- [ ] Materiais seguem o padrao minimo definido no plano mestre.
- [ ] Fontes aparecem quando a resposta depende de RAG, banco oficial ou documento.
- [ ] Nao ha promessa de resultado garantido.
- [ ] Conteudo sensivel ou institucional preserva revisao humana.

### Engenharia e QA

- [ ] Workers de implementacao registram arquivos alterados e superficie impactada.
- [ ] Nao ha duplicacao de trabalho entre landing, app e material pedagogico.
- [ ] Rodar build/test/lint aplicavel antes de commit.
- [ ] Rodar QA sintetico nas jornadas impactadas quando disponivel.
- [ ] Conferir regressao visual basica em desktop e mobile.

### Hermes premium quality gates

- [x] `qa_sintetico` cobre Landing, Home, Notebook RAG, Simulado, Tiagao e Caderno de Erros no snapshot `premiumQualityLoop`.
- [x] Padrao de recomendacao Hermes inclui `module` para recomendacoes premium.
- [x] Admin exibe modulo junto com superficie, evidencia, problema, mudanca, metrica e aceite.
- [ ] Executar `POST /api/agents/qa_sintetico/executar-auditoria` em ambiente autenticado de admin.
- [ ] Conferir que achados persistidos aparecem em Descobertas/Inbox Hermes sem tarefa destrutiva.
- [ ] Rodar checklist manual semanal/pre-release abaixo.

### Checklist manual semanal premium

- [ ] Landing: validar primeira dobra mobile/desktop, CTA principal, CTA institucional, claims, preco e ausencia de promessa garantida.
- [ ] Home: validar usuario sem historico e usuario com missao de erro recente; conferir proxima acao, busca/upload inline e Tiagao explicito.
- [ ] Notebook RAG: gerar apresentacao/material com documento real, revisar 3 slides, preview, tela cheia, PDF/print e feedback negativo.
- [ ] Simulado: executar simulado curto com erro proposital, conferir analise premium e envio ao Caderno.
- [ ] Caderno de Erros: importar rascunho, salvar nota, voltar para Home e conferir missao de revisao.
- [ ] Tiagao: pedir revisao do erro, duvida rapida e estudar material; confirmar linguagem adequada e acao explicita.


### Metricas

- [ ] Definir metrica primaria por ticket antes do merge.
- [ ] Landing: conversao para cadastro/app e clique em CTA institucional.
- [ ] App: cliques ate proxima acao, missao iniciada/concluida e abandono da home.
- [ ] Material: qualidade percebida, completude, verificabilidade e taxa de revisao.
- [ ] Registrar lacunas de instrumentacao para Fase 2.

## Plano de rollout, commit e deploy

1. **Sincronizacao de workers:** manter este tracker como fonte de coordenacao; workers de implementacao devem atualizar status, superficie e validacao feita sem reabrir decisoes ja aceitas.
2. **Branches/commits pequenos:** separar commits por trilho sempre que possivel: landing, app do aluno, padrao pedagogico/docs.
3. **Ordem recomendada:** landing premium primeiro, home/centro de comando em seguida, fundacao pedagogica em paralelo quando for apenas documentacao/templates.
4. **Pre-merge:** validar criterios de aceite do ticket, checklist de produto/UX, checklist pedagogico e comandos tecnicos aplicaveis.
5. **Pre-deploy:** gerar resumo de mudancas, riscos, comandos executados, screenshots ou evidencias de QA quando houver UI.
6. **Deploy gradual:** publicar em ambiente de preview/staging antes de producao; revisar mobile, primeira dobra, home e material gerado com dados reais ou mocks representativos.
7. **Pos-deploy:** acompanhar metricas de ativacao, abandono, uso do Tiagao e erros de API nas jornadas alteradas.

## Riscos e rollback

### Riscos principais

- Landing ficar bonita, mas menos clara sobre o que o StudyAI faz.
- Home virar dashboard pesado e competir com a acao principal.
- Tiagao perder centralidade em favor de cards ou modulos.
- Claims de resultado, numeros ou depoimentos sem evidencia auditavel.
- Material pedagogico padronizado no texto, mas sem fonte, exercicio ou diagnostico real.
- Workers implementarem trilhos sobrepostos e gerarem regressao visual ou duplicacao.

### Mitigacoes

- Usar os criterios de aceite deste tracker como gate antes de merge.
- Exigir evidencia visual para alteracoes de UI.
- Manter escopo de Fase 1 em clareza visual/produto; motor pedagogico profundo fica para Fase 2.
- Se houver duvida entre adicionar uma nova superficie ou simplificar a existente, preferir simplificar.
- Atualizar este tracker quando um ticket mudar de escopo, bloquear ou concluir.

### Rollback

- Landing: reverter apenas o commit/trilho da landing se conversao, clareza ou layout mobile regredirem.
- App do aluno: manter caminho antigo acessivel ate a home de proxima acao passar em QA basico.
- Material pedagogico: tratar template/rubrica como versao v1; rollback pode ser documental sem migrar dados.
- Deploy: se erro critico aparecer em producao, voltar para release anterior e manter este tracker com causa, impacto e acao corretiva.

## Proximos passos operacionais

- [x] Registrar entregas recentes de landing, home, pedagogia, Admin/Hermes e Notebook/RAG.
- [x] Confirmar deploy de producao do commit `01857b24` ou release mais novo via `/api/healthz` (`44daf83`).
- [x] Corrigir bloqueador de apresentacoes Notebook RAG premium identificado por screenshot.
- [x] Deployar a correcao de apresentacoes e confirmar `/api/healthz` no novo commit (`d1270af`).
- [ ] QA manual obrigatorio: gerar apresentacao real no `/notebook`, revisar preview, tela cheia e PDF.
- [x] Somente apos deploy do Notebook: retomar Caderno de Erros premium como proxima fase.
- [x] Adicionar Hermes premium quality loop para Landing, Home, Notebook RAG, Simulado, Tiagao e Caderno de Erros.
- [x] Proximo lote de Caderno de Erros: consumir rascunho do simulado na home como "proxima melhor acao" e no Tiagao como modo "revisar erro".
- [ ] Proximo lote de Caderno de Erros: persistir historico estruturado no backend quando houver schema/API definido.
- [ ] Depois do lote de erros: evoluir modos pedagogicos do Tiagao com taxonomia oficial e metricas por modo.
