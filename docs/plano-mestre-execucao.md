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
- **Simulado ENEM premium results:** fatia independente adicionada ao resultado com radiografia por area/competencia/habilidade quando houver metadados, padroes de erro, missao de recuperacao e recomendacao Hermes local.
- **Caderno de Erros premium:** corte inicial publicado em producao no commit `bb2ea8f`: simulado gera rascunho estruturado com tipo/causa de erro, Caderno organiza o rascunho e Home prioriza a revisao como proxima acao.
- **B2B premium diagnostico:** corte inicial implementado para professor/gestor com risco por turma, baixa atividade, resumo acionavel, acao recomendada e lacunas de dados explicitadas sem inventar numeros.
- **Curadoria premium de materiais:** primeira fatia adiciona checklist heuristico no historico de conteudos para sinalizar prontidao, lacunas e proxima acao sem depender de backend novo.
- **Home next-best-action premium:** corte em andamento conecta Caderno de Erros, Simulado premium, Notebook RAG, curadoria de conteudo e plano recente em uma missao priorizada com evidencia, tempo, criterio de sucesso, CTA direto e sinal Hermes local.
- **Hermes premium quality loop:** `qa_sintetico` agora monitora Landing, Home, Notebook RAG, Simulado, Tiagao e Caderno de Erros com recomendacoes contendo modulo, evidencia, problema, mudanca sugerida, metrica e criterios de aceite; sem autofix destrutivo.
- **Workflow premium v2:** curadoria ganhou status manual local de revisao/aprovacao/ajustes; Home agora encaminha a proxima melhor acao ao Tiagao com modo pedagogico coerente; Caderno limpa missoes locais de simulado/erro quando a nota de revisao e salva.
- **Relatorios B2B v2:** professor e gestor deixam de exibir exportacao apenas como placeholder e passam a baixar CSV util com diagnostico, sinais disponiveis e proxima acao sem inventar linhas por aluno fora dos dados atuais.
- **Analytics aluno + fechamento de recuperacao:** Home ganhou painel leve de aprendizagem com dominio por area, streak, habilidades fracas, marcos e lacunas transparentes; Caderno registra historico local de revisoes concluidas; Simulado permite marcar a missao de recuperacao como feita.
- **Gates Notebook + coaching Tiagao:** producao foi confirmada no commit `65e9e83`/`65e9e836`; smoke Notebook agora cobre serializacao de preview/export de apresentacoes e mapas; Home usa analytics local para oferecer coaching proativo do Tiagao sem inventar metrica nova.
- **Caderno loop v2 + exports B2B:** Caderno agora mostra streak local, proxima revisao e fechamento manual de missao pendente; relatorio professor/gestor ganhou CSV com sinais, acao recomendada e lacunas explicitas, alem de bloco imprimivel de criterios; Hermes inclui Relatorios B2B no loop premium.
- **App Shell Premium + Design System Interno:** primeira fatia alinha shell, cabecalho, missao, estados e badges em Caderno, Notebook RAG, Simulado ENEM e Meus Conteudos sem reescrever fluxos de dados.
- **App Shell Premium B2B:** segunda fatia em andamento alinha Professor, ProfessorTurma e Instituicao com cabecalho, missao, badges, secoes e estados compartilhados, mantendo Admin para lote posterior.
- **App Shell Premium Admin:** fatia conservadora aplicada em IA & Custos e Hermes, com cabecalhos, badges de base/cobertura/status e estados de loading/vazio sem alterar endpoints, filtros, numeros ou calculos.
- **QA visual/manual geral + menus:** passada premium final em andamento corrige responsividade de cabecalhos/cards/modais e reduz entradas duplicadas de navegacao por papel sem remover rotas legadas.
- **Notebook do Professor RAG:** primeira fatia adiciona entrada docente no modo Professor, reusa fontes do Notebook, aceita upload de texto e gera entregaveis profissionais por formato (plano, roteiro, atividade, rubrica, lista, material da turma, resumo institucional e slides com notas) via `/api/notebook/teacher-output`, preservando `/notebook` do aluno.
- **Area do Professor Premium+:** separacao visual reforcada entre aluno/professor, Tiagao generico oculto no portal docente, painel ganhou sala de comando com saude de turmas, fila de intervencao, habilidades frageis, pendencias e preparacao de aula, e Notebook do Professor ganhou rascunho de mensagem de intervencao.
- **Hermes sistema nervoso / agentes de dor real:** doutrina canonica adicionada em `docs/hermes-agentes-dor-real.md`; primeira leva segura registra `auditor_pedagogico`, `notebook_rag_quality` e `professor_success` no `daily-learn`, expondo catalogo `dorRealAgents` no status Hermes.

## Tickets em execucao

### F1-01 Landing premium

**Status:** segunda passada premium concluida; manter em observacao de conversao, clareza mobile e assets de video reais.

**Objetivo:** refinar a landing para comunicar promessa, primeira dobra, CTA, prova, modulos e instituicoes com hierarquia premium.

**Superficie prevista:** `artifacts/studyai/src/pages/Landing.tsx`.

**Resultado esperado:**

- Primeira dobra com promessa clara: objetivo/material do aluno entra, Tiagao organiza o proximo passo.
- CTA principal dominante para comecar/entrar no app e CTA institucional secundario.
- Modulos apresentados como prova de capacidade, nao como lista concorrente.
- Narrativa ponta a ponta: hero -> dor por persona -> solucao -> como funciona -> produto -> personas -> confianca -> preco/CTA.
- Area de video usa briefs/roteiros de marca em producao, sem MP4 generico ou claim visual nao auditavel.
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

**Status:** v3 em andamento com recorte Professor Premium+; diagnostico, CSV enriquecido, bloco imprimivel, sala de comando e separacao visual inicial implementados; pendente QA manual e rollout.

**Objetivo:** acelerar percepcao premium no modulo B2B sem redesenhar rotas: professor ve risco/baixa atividade por turma e gestor ve adocao/cobertura institucional com proxima acao clara.

**Superficies previstas:** `artifacts/studyai/src/pages/ProfessorTurma.tsx`, `artifacts/studyai/src/pages/Instituicao.tsx`.

**Resultado esperado:**

- Dashboard da turma destaca alunos em risco ou com sinais de baixa atividade quando os dados existem.
- Turma mostra resumo de usuarios, XP, simulados, acerto e dias ativos ja disponiveis no endpoint atual.
- Gestor institucional recebe diagnostico de cobertura, tracao e relatorio com recomendacao operacional.
- Exportacao CSV usa os dados ja carregados no painel e mantem lacunas explicitas quando faltam linhas detalhadas.
- Relatorio geral do professor adiciona sinais disponiveis, acao recomendada e lacunas por linha exportada.
- Lacunas de dados ficam explicitas: tempo real por sessao, ultimo login bruto, entregas atrasadas e intervencoes registradas.
- Portal do professor deixa de oferecer caminho primario para o app do aluno; app do aluno deixa de oferecer alternancia visivel para professor/escola.
- Tiagao no contexto docente deve responder como colega/assessor pedagogico: planejamento, diagnostico, rubrica, comunicacao e intervencao, sem tom de aula para estudante.
- Notebook do Professor gera tambem mensagem de intervencao para aluno/familia/coordenacao com linguagem profissional, sem exposicao indevida e sem promessa de resultado.

**Criterios de aceite:**

- Rotas `/professor`, `/professor/turma/:id`, `/instituicao` e auth atual permanecem preservadas.
- Nao ha numeros inventados para risco individual no agregado institucional.
- Estados sem alunos, sem relatorio e sem dados suficientes orientam o proximo setup.
- Professor baixa CSV por turma com status, sinais disponiveis, XP, simulados, acerto e recomendacao.
- Gestor/professor baixa CSV institucional com sinais disponiveis, acao recomendada e lacunas sem inventar telemetria ausente.
- Impressao/PDF mostra criterios de revisao humana e origem dos sinais.
- Typecheck do app passa antes de commit/deploy.
- O painel professor mostra proxima acao pedagógica baseada apenas nos dados existentes: turma, alunos em risco, materias fracas, atividades em rascunho e lacunas de instrumentacao.
- Navegacao entre areas permanece separada por papel; rotas legadas podem existir, mas nao devem aparecer como entrada primaria fora do contexto correto.

### F2-03 Curadoria premium de materiais

**Status:** v2 implementado com checklist e workflow manual local; pendente QA manual com conteudos reais.

**Objetivo:** transformar o padrao pedagogico em workflow visivel para professor/aluno, mostrando se um conteudo gerado esta pronto para uso, precisa revisao ou precisa curadoria.

**Superficie prevista:** `artifacts/studyai/src/pages/MeusConteudos.tsx`.

**Resultado esperado:**

- Historico de conteudos mostra pontuacao de curadoria por item.
- Modal de leitura mostra sinais presentes, lacunas e proxima acao.
- Checklist usa dados ja existentes no payload: objetivo, fonte/evidencia, pratica, gabarito, rubrica, checkpoint ou erros comuns.
- A fatia nao inventa qualidade pedagogica; quando faltar dado, registra lacuna e recomenda revisao humana.
- Professor/aluno consegue marcar status manual: em revisao, aprovado para uso ou precisa ajustes.

**Criterios de aceite:**

- Conteudos antigos continuam abrindo e podendo ser excluidos.
- `material_premium` que abre HTML externo continua preservado.
- Checklist funciona para resumos, slides, planos de aula, provas/pacotes e fallback generico.
- Typecheck do app passa antes de commit/deploy.
- Status manual e persistido localmente por item sem criar metrica falsa de qualidade.

### F2-04 Analytics premium do aluno e fechamento de missoes

**Status:** v2 implementado com coaching proativo local; pendente QA manual e rollout.

**Objetivo:** transformar sinais ja existentes em progresso acionavel para o aluno sem criar dashboard pesado nem inventar telemetria ausente.

**Superficies previstas:** `artifacts/studyai/src/pages/Home.tsx`, `artifacts/studyai/src/pages/Caderno.tsx`, `artifacts/studyai/src/pages/SimuladoEnem.tsx`, helpers locais de proxima acao e revisao de erros.

**Resultado esperado:**

- Home mostra dominio por area apenas quando ha evidencia local de simulado/revisao.
- Home destaca streak, habilidades fracas, proximos marcos e lacunas de dados explicitamente.
- Home sugere uma intervencao curta do Tiagao quando houver area fraca ou padrao de erro local.
- Caderno de Erros registra historico local de revisoes concluidas ao salvar nota importada do simulado.
- Caderno mostra streak local, recorde, proxima revisao conhecida e agrupamento por materia.
- Caderno permite fechar manualmente uma missao pendente quando o aluno revisou fora do fluxo de salvar nota.
- Simulado permite marcar o plano de recuperacao como concluido e remove a missao pendente da Home.
- Eventos Hermes locais registram exibicao/click/conclusao sem depender de backend novo.

**Criterios de aceite:**

- Nao ha metricas globais inventadas quando faltam dados; estados vazios orientam o proximo passo.
- O historico local limita quantidade de registros e nao altera schema/API do Caderno.
- Marcar recuperacao como feita fecha a proxima acao local do Simulado.
- Fechamento manual do Caderno registra historico local e sinal Hermes sem criar progresso global falso.
- Coaching do Tiagao usa somente evidencias locais e registra sinal Hermes ao clique.
- Typecheck focado do app passa antes de commit/deploy.

### F0-04 Hermes premium quality loop

**Status:** v2 implementada em QA sintetico e docs; pendente execucao manual da auditoria em producao/staging.

**Objetivo:** acelerar a transformacao premium com um loop continuo de qualidade que monitora os modulos ja tocados sem executar correcao automatica destrutiva.

**Superficies previstas:** `artifacts/api-server/src/lib/hermes/jobs/qa-sintetico.ts`, `artifacts/api-server/src/lib/hermes/recommendationStandard.ts`, `artifacts/studyai/src/pages/Admin.tsx`, docs Hermes e tracker.

**Resultado esperado:**

- Catalogo/snapshot Hermes expoe `premiumQualityLoop` com modulos, evidencias, checklists diario/semanal, metricas e criterios de aceite.
- Recomendacoes premium exibem `module` no Admin.
- Landing, Home, Notebook RAG, Simulado, Tiagao, Caderno de Erros e Relatorios B2B ficam no mesmo ciclo de QA sintetico.
- Daily-learn usa o loop como contexto; checklist semanal continua manual/pre-release.

**Criterios de aceite:**

- Toda recomendacao premium contem modulo, superficie, evidencia, problema/oportunidade, mudanca sugerida, metrica e criterios de aceite.
- Hermes cria descoberta/inbox/tarefa de triagem, mas nao altera conteudo, dados de aluno, planos, assinaturas ou producao automaticamente.
- Modulos sem telemetria suficiente viram lacuna de observabilidade, nao metrica inventada.
- Checklist manual cobre jornada ponta a ponta: Landing -> Home -> Notebook RAG -> Simulado -> Caderno -> Tiagao, mais exports B2B.

### F0-05 Hermes sistema nervoso / agentes de dor real

**Status:** primeira leva segura implementada; pendente execucao em ambiente com cron/admin e validacao de producao.

**Objetivo:** transformar Hermes no sistema nervoso operacional do StudyAI: observar, auditar qualidade, priorizar problemas, abrir recomendacoes claras e medir melhora, sempre separado por papel.

**Superficies previstas:** `artifacts/api-server/src/lib/hermes/jobs/dor-real-agents.ts`, `artifacts/api-server/src/lib/hermes/register-default-agents.ts`, `artifacts/api-server/src/routes/agents/hermes.ts`, docs Hermes.

**Resultado esperado:**

- Doutrina por papel fica explicita: aluno aprende/pratica/revisa; professor planeja/diagnostica/intervem/avalia; instituicao acompanha qualidade/risco/adocao/resultados; admin opera/audita/custos/qualidade/conteudo/crescimento.
- Catalogo Hermes lista os 10 agentes em ordem de prioridade, com responsabilidade, sinais, evidencias, metricas, acoes, limites e saida Admin.
- Primeira leva roda como agentes explicitos: `auditor_pedagogico`, `notebook_rag_quality`, `professor_success`.
- Saidas persistidas seguem o padrao Hermes de evidencia, impacto, recomendacao, acao, metrica, aceite, confianca e target/modulo.
- Agentes reaproveitam `qa_sintetico`, `cqo_conteudo`, `knowledge-index` e `sucesso_aluno` sem duplicar logica.

**Criterios de aceite:**

- `GET /api/agents/hermes/status` expõe `dorRealAgents` com prioridades e status.
- `POST /internal/hermes/daily-learn` registra os tres agentes novos no array `ran`.
- Lacunas de observabilidade viram recomendacoes, nao metricas inventadas.
- Nenhum agente aplica autofix, envia mensagem real, altera conteudo, muda dados de aluno/turma ou aprova material sem revisao humana.
- Proxima ordem apos a primeira leva: consolidar Student Success/`sucesso_aluno`, depois Simulado Intelligence, Caderno de Erros Intelligence, Custos IA Optimizer, UX/Product Auditor, Content Gap/CQO avancado e Institution Success/B2B ROI.

## Checklist de validacao

### Auditoria de bloqueadores - 2026-05-17 17:10

- [x] Git local auditado: `main` esta alinhada com `origin/main`; havia apenas o lote local de analytics/fechamento premium ainda nao commitado.
- [x] Producao auditada antes do novo lote: `/api/healthz` em `https://api.study.ia.br/api/healthz` respondeu `status=ok`, `commit=65e9e83` equivalente a `65e9e836`, chaves OpenAI/OpenRouter/Clerk/DB ativas.
- [x] Railway CLI autenticado e ligado ao projeto `lucky-appreciation`, ambiente `production`, servico `StudyAI`; deploy recente `68666a1e-3cff-4d59-9251-47bc96f9cd6b` em `SUCCESS`.
- [x] Typecheck focado do app passou: `pnpm --filter "./artifacts/studyai" run typecheck`.
- [x] Typecheck raiz restaurado no commit `65e9e836`; `pnpm run typecheck` volta a ser gate obrigatorio do lote.
- [ ] QA manual Notebook/RAG apresentacoes continua pendente; smoke automatizado cobre fallbacks e serializacao de preview/export, mas nao substitui validacao visual no navegador.

### Auditoria de rollout premium - 2026-05-17 18:30

- [x] Lote Notebook QA + coaching publicado em `8c7b1c3e` e verificado em producao por `/api/healthz`.
- [x] Lote Caderno loop v2 + exports B2B publicado em `caa10127`; Railway concluiu deploy e respondeu `status=ok`.
- [x] Lote Hermes QA B2B publicado em `cb20f465`; auto-deploy respondeu `commit=cb20f46` antes do deploy manual local.
- [x] Gate raiz executado apos os lotes: `pnpm run typecheck`.
- [x] Gate Notebook executado apos os lotes: `pnpm --filter @workspace/api-server run smoke:notebook-preview-export`.
- [ ] Observacao: `railway up --detach` faz upload local e pode sobrescrever `/api/healthz.commit` como `local`; para validacao por SHA, preferir auto-deploy a partir do `git push`.

### Bloqueador atual - Notebook RAG apresentacoes

- [x] Confirmar que producao esta em commit `01857b24` ou mais novo: health atual retornou `44daf83`.
- [x] Confirmar que producao esta no commit da correcao `d1270af2` ou equivalente: `/api/healthz` retornou `d1270af`.
- [x] Tratar screenshot de apresentacao ruim como falha bloqueante de premium.
- [x] Backend exige schema rico de slides: `layout`, `visual`, `evidencia`, `comoExplicar`, `exemplo` e/ou `checkpoint`.
- [x] Fallback deterministico reconstrói slides fracos com cards visuais, evidencia da fonte, nota do professor e pergunta de checagem.
- [x] Renderer mostra visual estruturado/placeholder intencional em vez de fundo vazio com bullets.
- [x] Export/print inclui visual, evidencia e checkpoints no material gerado.
- [x] Smoke automatizado valida serializacao JSON de apresentacao/mapa para reabertura, preview e exportacao sem provider real.
- [ ] QA manual em `/notebook`: gerar apresentacao com documento real e verificar 3 slides de desenvolvimento, PDF premium e modo tela cheia.
- [ ] Validar que nenhum slide de conteudo fica apenas com titulo + bullets em fundo gradiente.
- [ ] Validar que feedback negativo do material continua registrando telemetria Hermes.

### Caderno de Erros premium

- [x] Iniciar somente apos producao responder com `d1270af`.
- [x] Criar rascunho estruturado a partir do resultado do Simulado ENEM.
- [x] Mostrar no Caderno tipo/causa de erro, quantidade e proxima missao.
- [x] Priorizar revisao de erro recente na Home como proxima melhor acao.
- [x] Emitir sinal local Hermes com evento, metrica e recomendacao.
- [x] Fechar missao local ao salvar a nota importada no Caderno, removendo recuperacao pendente da Home.
- [x] Rodar typecheck focado do app sem erro.
- [x] Confirmar deploy via `/api/healthz` no commit `bb2ea8f`.
- [ ] QA manual: simulado curto com erro -> enviar ao caderno -> salvar nota -> voltar para Home e conferir missao de revisao.

### Simulado ENEM premium

- [x] Resultado mostra desempenho por area e usa metadados de competencia/habilidade quando o banco de questoes fornecer esses campos.
- [x] Resultado classifica padroes de erro em categorias acionaveis.
- [x] Resultado mostra missao de recuperacao com tempo, passos e criterio de conclusao.
- [x] Sinal Hermes local inclui recomendacao de proxima acao do simulado.
- [ ] QA manual: fazer simulado curto, errar ao menos uma questao e confirmar radiografia, padroes de erro, missao e gabarito.

### Produto e UX

- [x] Tiagao continua visivel, confiavel e reconhecivel na Home com CTA de voz/chat preservado.
- [x] A jornada principal reduz friccao na Home sem adicionar dashboard pesado ao aluno.
- [x] Existe uma proxima acao clara na Home, com fonte, evidencia, tempo, criterio de sucesso e CTA direto.
- [ ] CTA, estados vazios, loading, erro, sucesso e paywall estao claros.
- [ ] Fluxos principais funcionam em mobile.

### Pedagogia

- [x] Mudancas melhoram diagnostico, treino, revisao ou qualidade de explicacao.
- [x] Materiais seguem o padrao minimo definido no plano mestre.
- [ ] Fontes aparecem quando a resposta depende de RAG, banco oficial ou documento.
- [ ] Nao ha promessa de resultado garantido.
- [ ] Conteudo sensivel ou institucional preserva revisao humana.

### Engenharia e QA

- [x] Workers de implementacao registram arquivos alterados e superficie impactada para o corte de next-best-action da Home.
- [ ] Nao ha duplicacao de trabalho entre landing, app e material pedagogico.
- [x] Rodar build/test/lint aplicavel antes de commit: `pnpm --filter "./artifacts/studyai" run typecheck`.
- [ ] Rodar QA sintetico nas jornadas impactadas quando disponivel.
- [ ] Conferir regressao visual basica em desktop e mobile.

### Hermes premium quality gates

- [x] `qa_sintetico` cobre Landing, Home, Notebook RAG, Simulado, Tiagao, Caderno de Erros e Relatorios B2B no snapshot `premiumQualityLoop`.
- [x] Padrao de recomendacao Hermes inclui `module` para recomendacoes premium.
- [x] Padrao de recomendacao Hermes reconhece `Relatorios B2B` como modulo premium monitorado.
- [x] Admin exibe modulo junto com superficie, evidencia, problema, mudanca, metrica e aceite.
- [x] Catalogo de agentes de dor real documentado e exposto em `dorRealAgents`.
- [x] Primeira leva segura registrada: `auditor_pedagogico`, `notebook_rag_quality`, `professor_success`.
- [ ] Executar `POST /api/agents/qa_sintetico/executar-auditoria` em ambiente autenticado de admin.
- [ ] Executar `POST /internal/hermes/daily-learn` e confirmar `ran` com a primeira leva de dor real.
- [ ] Conferir que achados persistidos aparecem em Descobertas/Inbox Hermes sem tarefa destrutiva.
- [ ] Rodar checklist manual semanal/pre-release abaixo.

### Checklist manual semanal premium

- [ ] Landing: validar primeira dobra mobile/desktop, CTA principal, CTA institucional, claims, preco e ausencia de promessa garantida.
- [ ] Home: validar usuario sem historico e usuario com missao de erro recente; conferir proxima acao, busca/upload inline e Tiagao explicito.
- [ ] Notebook RAG: gerar apresentacao/material com documento real, revisar 3 slides, preview, tela cheia, PDF/print e feedback negativo.
- [ ] Simulado: executar simulado curto com erro proposital, conferir analise premium e envio ao Caderno.
- [ ] Caderno de Erros: importar rascunho, salvar nota, voltar para Home e conferir missao de revisao.
- [ ] Tiagao: pedir revisao do erro, duvida rapida e estudar material; confirmar linguagem adequada e acao explicita.
- [ ] Relatorios B2B: baixar CSV geral/turma e imprimir PDF, validando sinais, lacunas e revisao humana.

### Home next-best-action premium

- [x] Home combina sinais de Caderno de Erros, Simulado premium, Notebook RAG, curadoria de conteudo e plano recente em uma unica missao priorizada.
- [x] Missao mostra por que e a proxima acao, com evidencias, tempo estimado e criterio de sucesso.
- [x] CTA direto abre Caderno, Notebook, Meus Conteudos, plano recente ou Tiagao em modo treinador/corretor conforme a fonte.
- [x] Fallback seguro e deterministico fica identificado quando nao ha dados suficientes.
- [x] Hermes recebe evento local quando a next-best-action e exibida, clicada ou enviada ao Tiagao.
- [x] Simulado premium persiste missao de recuperacao local para a Home mesmo antes do envio ao Caderno.
- [x] Missao enviada ao Tiagao seleciona modo pedagogico coerente (`treinador` ou `corretor`) conforme fonte da proxima acao.
- [x] Typecheck focado do app concluido sem erro.
- [x] Home mostra analytics leve do aluno com dominio por area, habilidades fracas, streak, proximos marcos e lacunas transparentes.
- [x] Home oferece coaching proativo do Tiagao baseado no analytics local e emite sinal Hermes no clique.
- [ ] QA manual: simulado com erro -> Home deve sugerir recuperacao; material recente no Notebook -> Home deve sugerir abrir material; conteudo com curadoria baixa -> Home deve sugerir revisar conteudo.

### Caderno/Simulado premium v2

- [x] Caderno registra historico local de revisoes de erro concluidas ao salvar nota importada.
- [x] Caderno mostra estado resumido de revisoes concluidas sem depender de backend novo.
- [x] Caderno mostra streak/recorde local, proxima revisao conhecida e resumo por materia.
- [x] Caderno permite marcar missao pendente como feita manualmente com evento Hermes e `manual_close`.
- [x] Simulado permite marcar missao de recuperacao como feita e limpa a missao pendente local.
- [ ] QA manual: simulado com erro -> concluir recuperacao -> Home deve deixar de priorizar a missao de recuperacao.
- [ ] QA manual: simulado com erro -> enviar ao Caderno -> salvar nota -> historico de revisoes deve ganhar novo item.
- [ ] QA manual: missao pendente no Caderno -> marcar revisao feita -> streak/historico local atualizam.

### Relatorios B2B premium v2

- [x] Relatorio geral CSV inclui sinais disponiveis por aluno, acao recomendada e lacunas de dados.
- [x] Relatorio imprimivel/PDF inclui criterio de revisao humana e explicita que nao inventa ultimo login, tempo real por sessao ou intervencoes.
- [ ] QA manual: baixar CSV do relatorio geral e imprimir/salvar PDF validando colunas novas e bloco de criterios.

### App Shell Premium + Design System Interno

**Status:** fatia Admin conservadora em validacao; foco em legibilidade operacional de IA & Custos/Hermes, nao em redesign cosmetico.

**Superficies desta fatia:** `artifacts/studyai/src/components/Layout.tsx`, `artifacts/studyai/src/pages/Caderno.tsx`, `artifacts/studyai/src/pages/Notebook.tsx`, `artifacts/studyai/src/pages/SimuladoEnem.tsx`, `artifacts/studyai/src/pages/MeusConteudos.tsx`, `artifacts/studyai/src/pages/Professor.tsx`, `artifacts/studyai/src/pages/ProfessorTurma.tsx`, `artifacts/studyai/src/pages/Instituicao.tsx`, `artifacts/studyai/src/pages/Admin.tsx`.

**Criterios de aceite desta fatia:**

- [x] Existe vocabulario compartilhado para cabecalho, painel de missao, badge de status, secao, acao, vazio, loading e erro.
- [x] Caderno usa o shell interno com status de notas, missoes pendentes e revisoes sem alterar autosave/processamento IA.
- [x] Notebook RAG mostra contexto, missao e status antes da busca/criacao de cadernos.
- [x] Simulado mantem a tela cronometrada focada, mas entrada e resultado usam shell, missao e status de continuidade.
- [x] Meus Conteudos explicita onde estou, como filtrar/priorizar, estados vazio/loading/erro e acao primaria.
- [x] Professor explicita contexto do painel, status de IA, missao pedagogica, turmas vazias e relatorios com os mesmos estados/primitivos.
- [x] ProfessorTurma explicita localizacao, codigo de convite, status da turma, missao, diagnostico e exportacao CSV sem alterar endpoints.
- [x] Instituicao explicita contexto do gestor, missao institucional, status de plano/aprovacao, estados vazios/loading/erro e relatorio/export CSV.
- [x] Admin IA & Custos explicita base de custo, periodo, billing real, cobertura, provedores e estados vazios/loading sem mexer em calculos ou provider billing.
- [x] Admin Hermes explicita status, inbox, recomendacoes, loading/erro/vazio e detalhe de recomendacao sem alterar rotas ou payloads.
- [x] Menu escola/instituicao foi simplificado: uma entrada funcional para Portal Institucional, uma para Conteudos da instituicao e uma para Comunicacao; abas internas continuam dentro do portal.
- [x] Menu rapido do professor removeu atalho duplicado para a mesma rota `/professor` e manteve Dashboard, Notebook, Conteudos e Comunicacao.
- [x] Sidebar interna do Professor removeu o atalho duplicado "Caderno IA do Professor"; o Notebook continua acessivel pelo shell global e pelo menu rapido.
- [x] Admin manteve secoes distintas porque representam dores operacionais diferentes; ajuste aplicado apenas em legibilidade/overflow e typo de busca.
- [ ] QA manual mobile/desktop: validar navegacao interna, sticky headers, bottom nav e ausencia de sobreposicao em Caderno/Simulado/Notebook.
- [ ] QA manual B2B mobile/desktop: validar Professor, ProfessorTurma e Instituicao com dados reais, CSV e impressao/PDF.
- [ ] QA manual Admin desktop: validar IA & Custos com dados reais, providerBilling vazio/conectado, cobertura com e sem lacunas e refresh de fontes.
- [ ] QA manual Admin desktop: validar Hermes com loading, falha de status, inbox vazia, descoberta com recomendacao e botoes lida/dispensar.
- [ ] Landing QA: revisar primeira dobra/claims/mobile como tarefa separada, sem misturar com o shell interno.

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
- [x] Proximo lote de Caderno de Erros: consumir rascunho do simulado na home como "proxima melhor acao" e no Tiagao como modo "revisar erro".
- [x] Adicionar Hermes premium quality loop para Landing, Home, Notebook RAG, Simulado, Tiagao e Caderno de Erros.
- [x] Adicionar primeira fatia de curadoria premium no historico de conteudos.
- [x] Conectar sinais premium na Home para next-best-action priorizada com evento Hermes local.
- [x] Adicionar workflow manual local de curadoria e fechamento local da missao Simulado -> Caderno.
- [x] Adicionar analytics leve do aluno, historico local de revisoes concluidas e fechamento manual de recuperacao do Simulado.
- [x] Automatizar parte do QA Notebook/RAG com smoke de serializacao preview/export e adicionar coaching proativo do Tiagao no analytics local.
- [x] Evoluir Caderno com streak local/fechamento manual e melhorar export institucional com sinais/lacunas.
- [x] Incluir Relatorios B2B no loop Hermes premium e no padrao de recomendacao.
- [x] Implementar primeira fatia de App Shell Premium + Design System Interno nas telas internas de maior impacto.
- [x] Aplicar fatia conservadora do App Shell Premium no Admin para IA & Custos e Hermes sem alterar backend/regra de negocio.
- [x] Criar primeira fundacao segura da Comunicacao Institucional/WhatsApp com intent layer, preview, guardrails LGPD, audit log e Hermes best-effort.
- [x] Criar doutrina Hermes sistema nervoso e primeira leva de agentes de dor real.
- [ ] Validar, publicar e auditar producao da segunda fatia App Shell Premium B2B.
- [ ] Executar e auditar daily-learn Hermes com `auditor_pedagogico`, `notebook_rag_quality` e `professor_success`.
- [ ] Proxima leva Hermes: consolidar Student Success/`sucesso_aluno`, depois implementar Simulado Intelligence e Caderno de Erros Intelligence.
- [ ] Proximo lote de Caderno de Erros: persistir historico estruturado no backend quando houver schema/API definido.
- [ ] Proxima fatia de layout interno: Admin restante com usuarios, financeiro, integracoes e seguranca em lotes pequenos.
- [ ] Landing QA final: validar conversao, clareza, mobile e ausencia de promessa garantida apos o shell interno.
- [ ] Depois do lote de erros: evoluir modos pedagogicos do Tiagao com taxonomia oficial e metricas por modo.
