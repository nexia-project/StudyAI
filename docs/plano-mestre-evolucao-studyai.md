# Plano Mestre de Evolucao StudyAI

**Versao:** 0.1  
**Status:** guardrail de produto, design e pedagogia  
**Escopo:** landing, app do aluno, Tiagao, materiais pedagogicos, Hermes/Admin, professor e instituicao  
**Relacao com docs existentes:** complementa o `docs/PRD-STUDYIA-HUB-2026.md` e os padroes Hermes. Nao substitui decisoes tecnicas nem criterios de release.

## 1. Tese

O StudyAI deve evoluir para uma experiencia premium sem perder sua essencia: um companheiro simples de estudos com IA, centrado no Tiagao, que transforma objetivo, material e historico do aluno em proximo passo claro.

Premium aqui nao significa mais telas, mais dashboards ou mais complexidade. Significa menos friccao percebida, mais confianca, melhor orientacao pedagogica e inteligencia invisivel trabalhando por tras da interface.

## 2. Superficies observadas

Este plano parte do estado atual visto no repositorio:

- Landing em `artifacts/studyai/src/pages/Landing.tsx`, com promessa de plano, Tiagao, Notebook RAG, Simulado ENEM, Lousa, Fazedores, cronograma, provas e camada institucional.
- App principal em `artifacts/studyai/src/pages/Home.tsx`, com hub conversacional, busca/upload inline, chips de intencao, continuidade, Tiagao por voz/texto e acesso aos modulos.
- Rotas principais em `artifacts/studyai/src/App.tsx`, incluindo aluno, professor, instituicao, admin, simulado, concursos, cronograma, caderno, sala de estudos, aula IA, lousa, trilha, notebook, base de conhecimento e tutor IA.
- Menu do app em `artifacts/studyai/src/components/MainMenuDrawer.tsx`, agrupando estudo, avaliacao, conhecimento e conta.
- Admin/Hermes em `artifacts/studyai/src/pages/Admin.tsx`, com secoes de usuarios, custos, conteudos, base, bugs, configuracoes e recomendacoes Hermes.
- Notebook RAG em `artifacts/studyai/src/pages/Notebook.tsx`, com fontes, chat, ferramentas, flashcards, questoes, plano de aula, slides e evidencias.
- Simulado ENEM em `artifacts/studyai/src/pages/SimuladoEnem.tsx`, com dias do ENEM, cronometro, gabarito comentado e analise.
- Caderno em `artifacts/studyai/src/pages/Caderno.tsx`, com anotacoes, materia, resumo, pontos, flashcards e questoes.
- Lousa Imersiva em `artifacts/studyai/src/pages/LousaImersiva.tsx`, com roteiro, canvas, narracao, quiz e biblioteca.
- Professor e instituicao em `artifacts/studyai/src/pages/Professor.tsx` e `artifacts/studyai/src/pages/Instituicao.tsx`, com turmas, alunos, conteudos, relatorios, convites e dashboards.
- Hermes QA sintetico em `docs/hermes-qa-sintetico.md`, cobrindo jornadas de aluno, professor, gestor, Notebook/RAG/lousa, simulados e admin.

## 3. Essencia que nao pode ser perdida

- StudyAI e um companheiro de estudo simples, nao um ERP escolar disfarçado.
- Tiagao e personagem, tutor e ponto de confianca. Ele nao deve ser escondido, diluido ou tratado como widget generico.
- O aluno entra com baixo atrito: objetivo, prova, prazo, material ou duvida. O sistema devolve um proximo passo.
- Plano de estudos, simulado, Notebook/RAG, caderno, lousa e sala de estudos devem parecer partes de uma mesma rotina, nao produtos separados.
- Admin/Hermes existe para qualidade, custo, crescimento e gestao, mas a complexidade fica fora da experiencia do aluno.
- A camada professor/gestor/instituicao deve fortalecer acompanhamento humano, nao substituir julgamento pedagogico.
- O produto precisa continuar reconhecivel para ENEM, vestibular, concursos e estudo cotidiano no Brasil.

## 4. Principios de evolucao

1. **Premium sem complexidade:** cada melhoria deve reduzir duvida ou aumentar confianca. Se adiciona peso cognitivo, precisa provar valor.
2. **Inteligencia atras da cena:** diagnostico, recomendacao, memoria, QA e priorizacao devem aparecer como orientacao simples.
3. **Pedagogia primeiro:** toda tela educacional deve responder: o que o aluno sabe, onde erra, qual o proximo passo e como revisar.
4. **Mobile-first:** o fluxo critico deve funcionar bem em celular: entrar, perguntar, anexar, estudar 15 minutos, revisar e sair.
5. **Acessibilidade e clareza:** contraste, foco, legibilidade, linguagem simples, estados vazios e feedback de erro sao parte do premium.
6. **Evidencia antes de escala:** mudancas grandes precisam de pilotos, A/B, cohort analysis ou QA sintetico antes de virar padrao.
7. **Menos superficies concorrentes:** quando duas telas resolvem o mesmo problema, uma vira caminho canonico e a outra vira atalho, modo avancado ou legado.
8. **Human-in-the-loop:** professor, gestor e admin aprovam recomendacoes sensiveis. Hermes recomenda, nao executa mutacao destrutiva.

## 5. Evolucao da landing

A landing deve vender uma promessa clara: "entre com seu objetivo e seus materiais; o Tiagao organiza o proximo passo para voce estudar melhor".

Prioridades:

- **Promessa:** trocar acumulacao de features por narrativa de resultado: diagnosticar, planejar, estudar, treinar, revisar.
- **Hierarquia:** primeira dobra com Tiagao, prova-alvo e CTA principal. Modulos entram como prova de capacidade, nao como lista longa.
- **Confianca:** explicar limites e evidencias: fontes, simulados, revisao, professor/gestor, privacidade e controle humano.
- **Prova:** usar pilotos, depoimentos e numeros somente quando auditaveis. Marcadores com asterisco devem apontar para contexto real ou virar "piloto".
- **CTA:** um CTA dominante para comecar gratis ou entrar no app; CTA secundario para instituicoes.
- **Identidade visual:** premium, brasileira e educacional; evitar visual infantilizado, corporativo demais ou "AI hype" generico.
- **Depoimentos:** separar aluno individual, professor e instituicao. Cada depoimento deve reforcar uma dor concreta.
- **Angulo institucional:** apresentar o StudyAI como camada de apoio para escola/curso, com acompanhamento, relatorios e qualidade pedagogica.

## 6. Evolucao do layout in-app

O app do aluno deve virar um "centro de comando de estudo" leve, com uma unica pergunta central: "qual e a melhor proxima acao para mim agora?"

Direcao:

- **Next best action:** um card principal com missao de estudo do dia, tempo estimado, materia, motivo e botao "Comecar".
- **Tiagao sempre acessivel:** voz/chat como camada viva, mas sem sequestrar busca/upload inline quando o aluno explicitamente quer outra coisa.
- **Progresso util:** mostrar avance real: sessoes feitas, revisoes pendentes, erros recorrentes, simulados, streak saudavel.
- **Caderno de erros:** transformar erros de simulado, questoes e redacao em fila de revisao, com causa provavel e exercicio de reparo.
- **Missao de estudo:** cada sessao deve fechar ciclo: aprender, praticar, checar, revisar ou salvar.
- **Modos do Tiagao:** duvida rapida, explicar passo a passo, montar plano, revisar erro, simular prova, estudar meu material.
- **Menos clutter:** evitar cards demais competindo com o proximo passo. O menu pode conter profundidade; a home deve escolher.
- **Estados vazios guiados:** sem historico, sem plano ou sem material devem virar convites simples, nao telas pobres.

## 7. Evolucao dos materiais pedagogicos

Todo conteudo gerado, importado ou curado deve convergir para um padrao minimo de qualidade.

Padrao recomendado por material:

- Objetivo de aprendizagem em linguagem simples.
- Serie/ano ou nivel, prova-alvo e materia.
- Habilidade ou competencia quando aplicavel: ENEM, BNCC, concurso, OAB, Revalida ou taxonomia interna.
- Pre-requisitos explicitos.
- Conceitos-chave e vocabulos essenciais.
- Erros comuns, causa provavel e intervencao sugerida.
- Explicacao em niveis: curta, passo a passo, aprofundada.
- Exercicios com gabarito, justificativa e distratores explicados.
- Fonte, citacao ou evidencia quando o material vier de RAG, banco oficial ou documento do usuario.
- Pontuacao de qualidade: completude, verificabilidade, adequacao pedagogica, nivel e risco de alucinacao.

Regra pratica: nenhum material premium deve ser apenas "texto bonito". Ele precisa ensinar, diagnosticar ou treinar.

## 8. Camada de inteligencia

A inteligencia do StudyAI deve formar um ciclo adaptativo:

1. **Diagnostico:** identificar objetivo, prazo, nivel, disponibilidade, prova e lacunas iniciais.
2. **Caminho adaptativo:** recomendar proxima acao com base em historico, erro, tempo e prioridade de prova.
3. **Revisao espacada:** transformar erros, flashcards e conceitos fracos em agenda de revisao.
4. **Predicao de desempenho:** estimar tendencia de nota ou risco com intervalo e explicacao, nao como promessa absoluta.
5. **RAG confiavel:** priorizar material do aluno/instituicao quando relevante e mostrar fonte quando influenciar resposta.
6. **QA sintetico:** simular jornadas e detectar falhas de UX, pedagogia, custo e seguranca.
7. **Hermes acionavel:** recomendacoes sempre com superficie, evidencia, mudanca especifica, impacto, metrica e criterio de aceite.

Padrao Hermes para recomendacoes de produto:

- Nao sugerir "melhorar UX" genericamente.
- Apontar a superficie afetada.
- Descrever o estado observado.
- Explicar o problema ou oportunidade.
- Propor mudanca concreta e testavel.
- Definir sucesso mensuravel.
- Marcar confianca e criterio de aceite.

## 9. Professor, gestor e instituicao

A camada B2B deve vender controle, acompanhamento e melhoria pedagogica, sem contaminar a simplicidade do aluno.

Direcao:

- **Dashboard por turma:** progresso, participacao, erros recorrentes, risco de abandono, simulados e revisoes.
- **Sinais de risco:** aluno parado, queda de desempenho, erro recorrente, simulado incompleto, material nao revisado.
- **Relatorios:** exportavel em PDF/CSV, com resumo executivo e lista de acoes recomendadas.
- **Tarefas:** professor/gestor deve poder criar intervencao simples: revisar tema, mandar lista, abrir aula, solicitar simulado.
- **Conteudos:** professor revisa e aprova materiais gerados antes de liberar para turma.
- **Privacidade:** visao agregada por padrao; dados individuais apenas quando houver permissao e finalidade clara.
- **Instituicao:** contratos, convites, membros, turmas e impacto devem ser claros para coordenacao.

## 10. O que nao fazer

- Nao esconder o Tiagao nem transformar o tutor em detalhe lateral.
- Nao colocar dashboard pesado na frente do aluno.
- Nao trocar simplicidade por linguagem corporativa, funis complexos ou excesso de graficos.
- Nao criar novos modulos premium que competem com plano, Tiagao, simulado, Notebook/RAG, caderno e lousa.
- Nao prometer nota, aprovacao ou resultado garantido.
- Nao publicar pedagogia nao validada como se fosse metodo comprovado.
- Nao automatizar acao sensivel de professor, gestor ou admin sem revisao humana.
- Nao usar depoimentos, numeros ou logos sem evidencia e permissao.
- Nao deixar "IA magica" sem fonte quando a resposta depender de documento, questao oficial ou dado institucional.

## 11. Roadmap por fases

### Fase 0 - Guardrails

Objetivo: alinhar criterio antes de mexer na experiencia.

- Adotar este plano como referencia em PRDs e tickets.
- Definir checklist de qualidade para landing, app, material e Hermes.
- Mapear metricas atuais e lacunas de instrumentacao.
- Criar rubrica pedagogica minima para materiais e respostas do Tiagao.
- Rodar QA sintetico nas jornadas principais antes de grandes releases.

### Fase 1 - Clareza visual e produto

Objetivo: deixar StudyAI mais premium e mais compreensivel sem adicionar complexidade.

- Refinar landing: promessa, primeira dobra, CTA, prova, modulos e instituicoes.
- Reorganizar home do aluno em torno de proxima acao, Tiagao e continuidade.
- Reduzir competicao visual entre cards, banners e features.
- Padronizar estados vazios, loading, erro, sucesso e paywall.
- Revisar menu para separar essencial, avancado e legado.

### Fase 2 - Fundacao do motor pedagogico

Objetivo: criar base de diagnostico, erro e revisao.

- Padronizar metadados pedagogicos de conteudos e questoes.
- Criar modelo canonico de "erro do aluno" com causa, habilidade, materia e proxima acao.
- Conectar simulado, caderno, flashcards, plano e Tiagao ao caderno de erros.
- Definir scoring de qualidade para materiais gerados.
- Instrumentar eventos de missao iniciada, concluida, abandonada e revisada.

### Fase 3 - Materiais premium

Objetivo: fazer materiais parecerem melhores porque ensinam melhor.

- Criar templates premium para explicacao, lista, aula, plano, revisao e simulado.
- Exigir fonte/citacao quando houver RAG ou banco oficial.
- Gerar exercicios com distratores pedagogicos, nao alternativas aleatorias.
- Adicionar niveis de explicacao e adaptacao por persona.
- Criar fluxo de revisao humana para conteudos de professor/instituicao.

### Fase 4 - Camada B2B institucional

Objetivo: transformar uso individual em valor para turmas e coordenacao.

- Dashboard de turma com sinais de risco e acoes recomendadas.
- Relatorios exportaveis para professor, coordenador e instituicao.
- Tarefas e intervencoes com aprovacao humana.
- Biblioteca institucional com reuso no Notebook/RAG e no Tiagao.
- Pilotos com escolas/cursos para validar linguagem, relatorios e valor percebido.

### Fase 5 - Loop autonomo de qualidade

Objetivo: deixar o sistema aprender e melhorar com seguranca.

- Hermes e QA sintetico priorizam problemas por impacto, confianca e custo.
- Recomendacoes geram tickets, experimentos ou tarefas de triagem.
- A/B tests rodam com metricas de ativacao, qualidade e retencao.
- Materiais com baixa qualidade voltam para revisao ou regeneracao assistida.
- Decisoes de produto passam por evidencia, nao opiniao isolada.

## 12. Metricas de decisao

Ativacao:

- Percentual de usuarios que concluem primeiro objetivo em ate 3 minutos.
- Percentual que cria plano, envia material ou faz primeira pergunta ao Tiagao.
- Taxa de onboarding concluido sem suporte.

Engajamento:

- D1, D7 e D30 por cohort.
- Missoes iniciadas e concluidas por semana.
- Frequencia de revisao e retorno ao caderno de erros.
- Uso de Tiagao por modo: duvida, plano, revisao, simulado, material.

Aprendizagem:

- Evolucao de acerto por habilidade/materia.
- Reducao de erro recorrente apos revisao.
- Conclusao de simulados e revisoes pos-simulado.
- Qualidade percebida das explicacoes.

Produto e UX:

- Tempo ate primeira resposta util.
- Cliques ate proxima acao.
- Taxa de abandono em landing, onboarding, paywall e home.
- Erros de API por jornada critica.

Negocio:

- Conversao landing para cadastro e cadastro para premium.
- Conversao premium por recurso usado antes do upgrade.
- Retencao de assinantes.
- Custo medio de IA por sessao e por aluno ativo.
- Hit rate de cache/acervo/RAG.

B2B:

- Turmas ativas por instituicao.
- Professores ativos semanais.
- Relatorios gerados/exportados.
- Intervencoes criadas e concluidas.
- Alunos em risco recuperados apos acao.

## 13. Primeiros 10 tickets de execucao

1. **Criar checklist de release premium:** documento curto para avaliar landing, home, materiais, Tiagao, Hermes e acessibilidade antes de deploy.
2. **Auditar primeira dobra da landing:** propor nova hierarquia com promessa, Tiagao, prova-alvo, CTA principal, prova de confianca e CTA institucional secundario.
3. **Desenhar home "proxima acao":** wireframe do `/app` com missao do dia, Tiagao, progresso essencial e acesso reduzido a modulos.
4. **Definir modos oficiais do Tiagao:** taxonomia e copy para duvida rapida, passo a passo, plano, revisar erro, simulado e estudar material.
5. **Especificar caderno de erros v1:** modelo de dados conceitual, eventos de origem, UI minima e conexao com simulado/caderno/Tiagao.
6. **Criar padrao pedagogico de material:** template com objetivo, habilidade, pre-requisitos, erros comuns, explicacoes, exercicios, fonte e quality score.
7. **Instrumentar metricas de missao:** eventos para missao iniciada, concluida, abandonada, revisada e recomendada pelo Tiagao/Hermes.
8. **Adicionar rubrica ao QA sintetico:** incluir criterios de premium, clareza, acessibilidade, pedagogia e simplicidade por jornada.
9. **Padronizar recomendacoes Hermes de produto:** garantir que `ux_layout`, `sucesso_aluno` e `qa_sintetico` sempre usem metrica e criterio de aceite.
10. **Planejar piloto institucional:** escolher uma turma/curso, definir dashboard minimo, relatorio PDF, sinais de risco e calendario de validacao.

## 14. Criterio de aceite para proximas mudancas

Uma mudanca de produto/design/pedagogia esta alinhada a este plano se:

- preserva Tiagao e simplicidade;
- melhora proximo passo, confianca ou qualidade pedagogica;
- tem metrica de sucesso antes de ser implementada;
- funciona em mobile;
- nao cria modulo redundante;
- inclui fallback claro para erro, vazio ou falta de fonte;
- permite revisao humana quando afeta professor, gestor, instituicao ou conteudo sensivel.
