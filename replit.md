# StudyAI

### Overview

StudyAI is an AI-powered tutor platform designed for students preparing for ENEM, vestibular exams, and public competitions in Brazil. It leverages GPT-4o to provide personalized study experiences, including gamified study plans, adaptive exams, essay correction, flashcards, and a voice-activated AI tutor. The platform also extends its functionality to educators, institutions, and government bodies, offering tools for lesson planning, performance analysis, and educational policy insights. The overarching goal is to democratize high-quality education through accessible AI assistance.

### User Preferences

- I want iterative development.
- Ask before making major changes.
- I prefer clear and concise explanations.
- I prefer detailed explanations.
- Do not make changes to the folder `Z`.
- Do not make changes to the file `Y`.

### System Architecture

StudyAI is built as a `pnpm` monorepo using TypeScript, Node.js 24, and Express 5 for its API. The frontend is a React application. Data persistence is handled by PostgreSQL with Drizzle ORM.

**Core Architectural Decisions:**

- **Monorepo Structure**: Facilitates shared libraries and managed dependencies across services.
- **API-First Design**: OpenAPI 3.1 specification drives API development, enabling automatic code generation for clients and Zod schemas for validation.
- **Authentication**: Clerk is used for user authentication, providing robust identity management and integration with various login providers.
- **Freemium Model**: Implemented with Stripe for subscription management, offering a free tier with limited AI uses and a premium tier with unlimited access.
- **AI Integration**: Multi-model architecture for cost optimization: **DeepSeek-V3** (`deepseek-chat`) for chat, simulados, notebook tools; **Claude Sonnet** (Anthropic via Replit) for AulaIA lesson generation; **GPT-4o** fallback; OpenAI **Whisper** for transcription; **ElevenLabs** (`eleven_turbo_v2_5`, voice Daniel) for TTS with auto-fallback to OpenAI TTS-1; **Gemini Flash** (via Replit AI Integrations) for image generation, multimodal question analysis (student photos), and text explanation; OpenAI **text-embedding-3-small** for RAG embeddings.
- **Adaptive Learning**: The system tracks student performance to tailor learning content and identify weak areas, providing targeted support.
- **Role-Based Access Control**: A flexible role system (`student`, `teacher`, `institution_admin`, `government`, `admin`) manages access to different platform modules and features.
- **Navigation**: A shared `AppNav` component ensures consistent navigation across all internal pages, with a separate `LandingDropdown` for the public-facing site.
- **UI/UX**: Features interactive elements like a Voice Professor, an onboarding wizard, and a dynamic mind map for visualizing study progress. The system prioritizes clear visual feedback, such as premium gates and free usage counters.
- **Real-time Communication**: Voice chat features utilize `SpeechRecognition` and `SpeechSynthesis` for an interactive tutor experience, streaming responses from the AI.
- **Knowledge Base Integration**: AI tutors can access an internal knowledge base, enhancing the relevance and accuracy of responses by incorporating curated content.

**Professionalism Improvements (April 2026):**
- `Home.tsx`: Heading changed "Crie seu Plano Mágico" → "Seu Plano de Estudos"; subtitle updated to professional copy; loading phases cleaned of emojis
- `SimuladoEnem.tsx`: Premium paywall completely rebuilt into a proper feature showcase (4 ENEM days preview cards, feature list, pricing card with full benefits)
- `AulaIA.tsx`: Tiagão image container fixed — uses CSS background-image with zoom/crop to avoid transparent PNG issues
- `Notebook.tsx`: Added `credentials: "include"` to all fetch calls (fixes 401 Unauthorized errors)
- `feed.ts`: Community feed now filters out poor simulado results (< 40% score or < 5 questions) to avoid displaying test data

**Gemini Image Generation Expansion (April 2026):**
- `Flashcards.tsx`: Added "Ilustrar com IA" button visible when a flashcard is flipped — generates a Gemini educational diagram for the concept. Image cached per card ID so it doesn't regenerate on revisit.
- `Redacao.tsx`: Added "Visualizar Tema" button next to the essay topic input — generates an infographic about the ENEM theme to inspire repertórios. Button appears dynamically when theme has text; image has animated entrance and "Fechar imagem" control.
- `Home.tsx`: Added auto-generated visual banner when a study plan is created — calls Gemini with `estilo: "ilustracao"` using the plan's subject. Shows loading state during generation, then displays the illustration with a themed caption. Cleared on plan reset.

**Key Features and Modules:**

- **Professor Tiagão (Agente IA)**: Universal AI assistant with persistent memory (`tiagao_memory` table), OpenAI Function Calling (tools: `navegar`, `abrir_aula_ia`, `criar_flashcards`, `iniciar_simulado`, `criar_cronograma`, `salvar_memoria`), and real-time action execution. Adapts to user roles (student, teacher, researcher, etc.) and learns from each conversation.
- **Aula com IA (Tiagão na Lousa)**: Interactive animated whiteboard lesson page at `/aula-ia`. Tiagão can open lessons on any topic via function calling. The AulaIA page reads topic/estilo from localStorage when navigated via the agent.
- **Caderno Digital**: Full-featured digital notebook at `/caderno`. Create/edit/delete notes with subject tags, auto-save, AI processing (resumo, key points, flashcards, questões), and search/filter by subject.
- **Study Modules**: Includes study plans, simulated exams (ENEM), essay correction with 5-competency scoring, flashcards (SM-2 algorithm), Pomodoro timer, and performance heat map.
- **Correção de Redação com Histórico**: Redação corrections saved to `redacoes` table. History tab shows past corrections with visual competency bars and scores.
- **Mind Map (Mapa Mental)**: NotebookLM-style horizontal hierarchical tree (4 levels) with collapsible nodes, professional palette by depth.
- **Infographic Generator (Infográfico)**: AI generates a real visual poster from any document. 6 styles (profissional, kawaii, científico, anime, esboço, minimalista) × 3 orientations. Endpoint: `POST /api/notebook/infografico`. PNG download in UI.
- **Slides with AI hero images**: Cover image auto-generated; per-slide "Imagem IA" button calls `POST /api/notebook/slides/imagem` for editorial-quality background art.
- **Admin Panel**: Comprehensive interface for managing users, finance, AI costs, content, database, integrations, and system settings.
- **Teacher Module (FASE 3 complete)**: Tools for managing classes, students, tasks, analyzing performance. Includes:
  - **Banco de Questões**: CRUD + geração por IA (gpt-4o-mini) em múltipla/V-F/discursiva com tipo badge, filtros, seleção múltipla para criar atividade
  - **Gerador de Provas**: Gera provas com IA (classica/mundo/fraquezas); botão "Salvar no Banco" e "Aplicar para Turma" após gerar
  - **Atividades**: CRUD completo + toggle publicar/despublicar + delete; painel de correção por aluno com "Corrigir com IA" (redação 5 competências ENEM ou discursiva 0-10) e ajuste manual nota+feedback; stats de entrega/nota média/corrigidos
  - **Aba Desempenho (ProfessorTurma)**: Gráficos de desempenho (AreaChart por avaliação, BarChart distribuição de notas), KPIs (média geral, alunos em risco/ok), tabela de alunos com indicadores de risco (nota média, entregas, uso IA, status OK/Atenção/Em Risco/Crítico), botões IA para alunos em risco (mensagem de incentivo, atividade de reforço, aula de revisão) com modal e copy
  - **Relatórios com Export**: Botão "Exportar CSV" (download de todos alunos de todas turmas) e "Imprimir/PDF" (window.print); dica footer linkando à aba Desempenho por turma
  - **API Endpoints FASE 3**: GET /teacher/turmas/:id/performance (atividades+médias+distribuição+stats por aluno), POST /teacher/turmas/:id/risk-action (GPT-4o-mini gera ação personalizada), GET /teacher/report (dados consolidados todas turmas/alunos para CSV)
  - **Correção Assistida IA**: `POST /teacher/activities/:id/submissions/:subId/ai-correct` para redação (retorna 5 competências + nota sugerida + feedbackAluno) e discursiva (pontos+feedback por questão aberta)
- **Institution Module**: Functionality for institutional oversight, managing teachers, and tracking aggregated data.
- **Government Module**: Provides aggregate educational metrics, weekly growth analysis, and tools for promoting user roles.

**DB Tables (as of April 2026):**
38+ core tables. Includes `tiagao_memory`, `tiagao_conversations`, `trilha_mestre_progress`, `trilha_mestre_sessions`, `notebook_overviews`, `notebook_embeddings`, `knowledge_documents`, `professor_mindmaps`, `user_doc_mindmaps`, `caderno_notes`, `redacoes`, `activity_events` (BIGSERIAL unified event log with user_id, event_type, entity_type, class_id, notebook_id, metadata jsonb), `daily_metrics` (unique on user_id+date+class_id, counters for study/quiz/flashcard/notebook/essay/trilha). `ai_cost_log` has `source_type`/`duration_ms`/`rag_chunks_used` columns.

**Event Tracking System:**
- `artifacts/api-server/src/lib/trackEvent.ts` — fire-and-forget event tracker. Never throws. Inserts to `activity_events` + upserts `daily_metrics`.
- EventTypes: login, study_plan_created, quiz_started/completed, flashcard_reviewed, essay_submitted/corrected, notebook_chat/source_added/created, trilha_session/completed, simulado_started/completed
- Instrumented routes: redacao.ts (essay_submitted), trilha.ts (trilha_session, trilha_completed), notebook.ts (notebook_created, notebook_chat)

### Cross-Surface Sync Rule (LOCKED)
Every new AI feature added to ANY surface MUST also be reflected in:
1. **Admin** dashboard (`/admin/stats` aggregate metric + UI widget)
2. **Professor** dashboard (per-turma adoption + per-student usage in `/teacher/turmas/:id/insights`)
3. **Instituição** dashboard (institution-level rollup)
4. **Mobile app** (`artifacts/studyai-mobile/`) — feature parity with web

### Backend AI Metrics Endpoint
`GET /api/admin/stats` now returns: `aiFeatures[]` (Tiagão, Trilha, Notebook, Mapa Mental, Redação, Flashcards), `trilhaBySubject`, `diagnosticsCompleted30d`, `notebookDocsTotal`, `notebookStorageMb`, `notebookOverviewsTotal`, `teacherContentTotal`, `contentBreakdown`, `institutionsTotal/Active`.

### Admin Panel Fixes (April 2026)
- **`AdminStats` TypeScript interface updated** — now fully typed with all 12+ fields the API returns (removed all `as any` casts)
- **"Instituições" card corrected** — was showing `govCount`, now shows `institutionsTotal`
- **"Logins por dia" chart corrected** — was using `newUsersPerDay` (registrations), now uses `loginsByDay` (real login events)
- **Revenue chart de-faked** — removed artificial `+ i * 120` inflation; now shows real MRR = `premiumUsers × R$8,20`
- **Performance chart uses real data** — `activityHeatmap` from `user_activity` table instead of fake math formulas

### Student Activities Page (`/atividades`)
- New page `AtividadesAluno.tsx` at route `/atividades` — students see activities assigned by their teachers
- Stats cards: Total / Pendentes / Entregues
- Filter tabs (Todas / Pendentes / Entregues)
- Click any activity → modal opens with multiple-choice questions
- Answers submitted to `POST /api/student/activities/:id/submit`; score shown after submission
- Status badges: Pendente / Entregue / Atrasado (by dueDate)
- Added to AppNav "Recursos" dropdown

### PlanoAula — "Gerar Slides" button
- New "Slides" button in PlanoAula result action bar (Professor panel)
- Generates a full slide deck HTML with cover slide + one slide per section (Objetivos, Conteúdos, Abertura, Desenvolvimento, Fechamento, Tarefas, Perguntas Norteadoras, Materiais)
- Opens in new browser window; supports Ctrl+P to print/export as PDF
- No new API endpoint needed — pure client-side HTML generation

### ChalkBoardCanvas Bug Fix
- **Root cause found**: `setup` useCallback had `playing` in its dependency array → when user paused, `setup` ref changed → ResizeObserver re-created → fired → `setup()` reset canvas
- **Fix**: Added `playingRef` and `speedMultiplierRef` — volatile props read via refs inside stable callbacks
- `playing` removed from `setup` deps, `speedMultiplier` removed from `animate` deps
- Canvas no longer resets when pausing or changing speed

`GET /api/teacher/turmas/:id/insights` returns: per-student `trilha.{mat,port}.{level,sessions,accuracy}`, `diagnosticCompleted` flag, `ai.{tiagao,notebook,mapa}` usage counts, plus `summary.{avgLevelMat,avgLevelPort,diagnosticCompleted,weakTopics[],aiAdoption}`.

### AI Cost Monitoring (April 2026)
- **New table `ai_cost_log`**: id, user_id, feature, model, tokens_in, tokens_out, cost_usd, created_at — created directly via SQL (bypassed Drizzle push to avoid rename confusion)
- **`artifacts/api-server/src/lib/aiCostLogger.ts`**: Centralized `logAiUsage()` helper with pricing table for all models (gpt-4o, gpt-4o-mini, claude-sonnet-4-6, claude-haiku-4-5, gemini-flash, text-embedding, etc.)
- **Routes instrumented** (real token logging added):
  - `chat.ts` (Tiagão) — streaming with `stream_options: { include_usage: true }`
  - `redacao.ts` (Redação ENEM) — gpt-4o, captures completion.usage
  - `trilha.ts` (Trilha do Mestre) — gpt-4o-mini
  - `flashcards.ts` (Flashcards) — gpt-4o-mini
  - `notebook.ts` (Notebook) — Proxy interceptor auto-logs all 20 gpt calls
  - `aula-ia.ts` (Lousa IA) — Claude Sonnet + Claude Haiku + gpt-4o-mini fallback
- **Admin stats endpoint** now returns `aiCost: { todayUsd, todayBrl, monthUsd, monthBrl, byFeature[], byModel[], perDay[] }` — real data from `ai_cost_log`
- **Admin UI "IA & Custos"** replaced with real cost dashboard: KPI cards (Custo Hoje / Mês / Chamadas / Tokens), Área chart custo por dia, tabela custo por feature com barras de porcentagem, custo por modelo, provedores de IA
- USD→BRL conversão fixa `5.85` no endpoint admin

### Geração de Conteúdo Educacional Pro — VERSÃO FINAL 2.0 (April 2026)
Spec completa de 1387 linhas implementada exatamente como especificado. 21 tools totais no Notebook.

**5 Novos Tools PRO (Inovações Exclusivas Study.IA):**

**Aula Viva** (endpoint `POST /api/notebook/aula-viva`) — Tipo 2 do spec:
- Roteiro de episódio estilo Netflix/Globoplay/streaming para a aula
- Ficha técnica com gênero, duração, trilha sonora
- Elenco: host (professor), especialista convidado, público
- Snapshot Executivo (tabela 4 linhas: o que / por que / como / evidência)
- 8 cenas com: tipo (vinheta/gancho/ação/comercial/clímax), trilha, conteúdo visual, fala completa do host, pontos de virada, cliffhanger
- Guia de direção com ritmo de energia por minuto + versões alternativas (cinema, podcast, reality, documentário)

**Micro-Aulas** (endpoint `POST /api/notebook/micro-aulas`) — Tipo 5 do spec:
- Versão 15s: hook visual, texto na tela (5 palavras), fala (12 palavras), CTA, hashtags
- Versão 60s: estrutura por segundo (0-3s / 3-15s / 15-45s / 45-55s / 55-60s), roteiro completo, trilha
- Versão 3min: gancho, contexto, conteúdo, aplicação, fechamento + roteiro
- Versão 10min: estrutura por minuto estilo podcast, roteiro completo
- Série de 5 episódios: gancho → aprofundamento → aplicação → erros comuns → síntese
- Tabs navegáveis: 15s / 60s / 3min / 10min / Série

**Narrativa Didática** (endpoint `POST /api/notebook/narrativa`) — Tipo 4 do spec:
- Conteúdo transformado em história épica (aventura/ficção científica/mistério/fantasia)
- Universo: cenário, grande problema, stakes emocionais
- Personagens: protagonista (aluno como herói), mentor (professor como Gandalf), aliados (colegas), antagonista (o conceito difícil)
- Estrutura dramática em 3 atos: Mundo Comum → Mundo Especial → Retorno
- Elementos lúdicos: itens colecionáveis, níveis de progresso, easter eggs, finais alternativos
- Tabs navegáveis: Universo | Ato 1 | Ato 2 | Ato 3 | Lúdico

**Remix Cultural** (endpoint `POST /api/notebook/remix-cultural`) — Tipo 11 do spec:
- Mapeamento de referências atuais: Música / Série-Filme / Jogo / Meme / Esporte / Celebridade → conexão pedagógica
- Aula remixada com gancho cultural, desenvolvimento, aprofundamento, crítica, produto dos alunos
- 2 memes educacionais em formato visual (setup + punchline educativa)
- Playlist da aula: músicas que explicam o conteúdo + trilha para estudar
- Conexões surpreendentes + frase de engajamento para Instagram/WhatsApp do professor

**5 Versões do Plano** (endpoint `POST /api/notebook/plano-aula-versoes`) — Tipo 3 do spec:
- Versão Turma Difícil: tabela de estratégias de engajamento máximo (gamificação, relevância imediata, sucesso rápido, escolha autêntica) + adaptações + abertura
- Versão Turma Avançada: tabela de estratégias de enriquecimento (autonomia, complexidade, liderança, pesquisa) + produto por portfólio
- Versão Inclusiva: adaptações por necessidade (TDAH, TEA, deficiência auditiva, altas habilidades) + recursos acessíveis + avaliação adaptada
- Versão Remota: tabela de desafios/soluções (atenção, isolamento, fadiga de tela) + interações obrigatórias
- Versão Híbrida: tabela de estações com grupos, atividades e tempos + atividade online + sincronização
- Tabs navegáveis: 😤 Difícil / 🚀 Avançada / ♿ Inclusiva / 💻 Remota / 🔄 Híbrida

**Infraestrutura:**
- 3 novas cores no COLOR_MAP e ICON_TINT: orange, cyan, slate
- 3 novos ícones importados: Tv, Music, Shuffle
- 3 novos estados de componente para tabs: microTab, narrTab, verTab
- Todas as loading messages adicionadas

### Geração de Conteúdo Educacional Pro (April 2026)
Spec completa de 4 camadas implementada ("Planejador Experiente" + "Designer de Aprendizagem" + "Especialista em Avaliação"):

**Plano de Aula — Upgrade Pro**:
- Persona "Planejador Experiente": objetivos só com verbos observáveis, tempos somam exatamente a duração
- Novo JSON completo: `perfilTurma`, `dificuldadesPrevisíveis`, `bncc` (competência+habilidade+objetos), `objetivos.{geral,especificos,indicadores}`, `desenvolvimento[].{nome,perguntasNorteadoras[],diferenciacão}`, `avaliacao.rubrica[]` (4 níveis A/B/C/D), `referencias.{teoricas,didaticas,fontesCaderno}`, `reflexao.{oQueFuncionou,oQuePrecisaAjustar}`
- Renderer totalmente reescrito: header violeta com perfil, BNCC como card azul, objetivos com indicadores, tabela de rúbrica renderizada, perguntas norteadoras por etapa, diferenciação colapsável, referências, seção de reflexão pós-aula

**Novo: Tarefa / Atividade para Casa** (endpoint `POST /api/notebook/tarefa`):
- Tipo B do spec: tarefa com estrutura DUAL — seção do aluno + seção do professor
- Para o aluno: oQueVaiFazer, porQueImporta, passo a passo com dica por passo, comoSaberSeAcertou, seTravar, querMaisDesafio
- Para o professor: objetivo, respostaEsperada/gabarito, tabela de erros comuns (erro/causa/estratégia), rúbrica 4 níveis, diferenciação, tempoCorrecao, conexaoProximaAula
- Renderer com toggle "Para o Aluno / Para o Professor" e layouts distintos

**Novo: Sequência Didática Multi-aula** (endpoint `POST /api/notebook/sequencia-didatica`):
- Tipo D do spec: sequência de N aulas com progressão lógica, produto final, avaliação somativa
- Estrutura: mapaDaSequencia (botões clicáveis), aulas detalhadas (objetivos+atividade+recursos+avaliação formativa+conexão), avaliacaoIntegrada com rúbrica por dimensão (peso %), recursos permanentes/por aula
- BNCC integrada com competência e habilidades
- Renderer: cards de mapa navegáveis, accordions por aula, tabela de rúbrica integrada

**Novos ícones no TOOL_CONFIG**: "emerald" adicionado ao COLOR_MAP e ICON_TINT
**Total de tools**: 16 (adicionados "tarefa" e "sequencia-didatica")

### Notebook RAG — Rebuild Completo (April 2026)
Full rebuild of the Notebook feature targeting NotebookLM professional quality for ENEM/vestibular students:

**Backend (`artifacts/api-server/src/routes/notebook.ts`)**:
- **5 Chat Modes** via `CHAT_MODE_PROMPTS`: Padrão / Estudo / Pesquisa / Revisão / Dúvidas — injected as system context in `/api/notebook/chat` and `/api/notebook/chat-stream`
- **Studio prompts upgraded**: overview (insightCentral + pilares + questãoProvocadora), study-guide (Mapa de Jornada com módulos numerados), flashcards (tipo + mnemônico + metáfora), questoes (Taxonomia Bloom + bloomLevel + habilidade + dicaResolutora), mapa-mental (conexões cruzadas + hex colors), podcast (Ana + Pedro style Flow/Nerdcast, 5-ato structure)
- **3 new endpoints**: `POST /api/notebook/briefing` (executive doc with pontosChave + recomendacoes), `POST /api/notebook/plano-aula` (full teacher lesson plan with modulos + adaptacoes), `POST /api/notebook/dna` (DNA das Fontes — deep AI source analysis with perfil + vieses + gaps + confiabilidade)

**Frontend (`artifacts/studyai/src/pages/Notebook.tsx`)**:
- **Tool types expanded** to 14: added "briefing" and "plano-aula"
- **New interfaces**: `Briefing`, `PlanoAula`, `DnaFontes`; updated `StudyGuide` (modulos-based format), `Questao` (bloomLevel/habilidade/dicaResolutora), `PodcastRoteiro` (PEDRO speaker)
- **Chat mode selector**: pill buttons above input (slate/indigo/violet/amber/rose); `chatMode` state + `CHAT_MODES` config
- **DNA das Fontes**: Sparkles icon per doc in SourcesPanel → `fetchDna()` → collapsible DNA panel per document
- **Overview renderer**: upgraded to insightCentral + pilares grid + aplicacaoPratica + questaoProvocadora + proximosPassos
- **Study Guide renderer**: fully rebuilt for modulos format with objetivo, conceitoCentral, aprofundamento, exemploResolvido, errosComuns, checkpoint; backward-compatible with old format
- **Briefing renderer**: problema card + pontosChave numbered + conclusoes + recomendacoes + proximosPassos + palavrasChave + conexoesEnem
- **PlanoAula renderer**: titulo/turma/duracao header + objetivos + prerequisitos + desenvolvimento timeline table + tarefaCasa + adaptacoes (turmaRapida/turmaDificuldade)
- **Loading messages**: tool-specific messages for all 14 tools

### Open TODOs (next round, by priority)
1. ✅ **Mobile parity – ALL three screens delivered**:
   - `(tabs)/trilha.tsx` → reads `/api/trilha/status` per subject, shows level + diagnostic state per matéria.
   - `(tabs)/notebook.tsx` → PDF/text upload via expo-document-picker, RAG chat with [Fonte N] chips that open full trecho modal, podcast generator with Ana/Marcos roteiro and per-fala TTS playback (uses `/api/tiagao/tts` with voices nova/onyx).
   - `(tabs)/mapa-mental.tsx` → react-native-svg radial layout (center → topics → subtopics) with pinch+pan gesture handler, subtopic tap opens detail modal.
2. ✅ **Instituição AI dashboard** delivered: new `/api/institution/:id/ai-stats` endpoint + "Inteligência IA" tab in `Instituicao.tsx` with KPIs, AI feature adoption grid, Trilha by subject (BarChart) and content breakdown (PieChart), all scoped to the institution's students.
3. ✅ **Professor's own Notebook**: link "Caderno IA" added to `Professor.tsx` sidebar opening `/notebook`; backend already scopes `knowledge_documents` by `uploaded_by = req.userId`, so each professor sees only their own RAG corpus.
4. ✅ **Citações inline + filtro por documento** entregue em web e mobile: chips clicáveis [Fonte N] abrem o trecho completo, e tap em qualquer doc da lista marca/desmarca como escopo (web: `selectedDocs` + `restrictToSelected`; mobile: `selectedDocIds` + barra "Travar/Soltar" acima do composer).

### Deploy Fixes (April 2026)
- **Health check hardened**: `/api/healthz` registered before all middleware (Clerk, rate-limiter, auth) → responds in < 1ms in production.
- **Graceful SIGTERM**: `index.ts` now handles SIGTERM from Replit deploy orchestrator, closing the server cleanly within 1s (force-exit at 10s).
- **Unhandled rejection/exception guards**: `process.on("unhandledRejection/uncaughtException")` prevents stray errors from crashing the server.
- **vite.config.ts fixed**: `PORT` and `BASE_PATH` now have safe defaults so `vite build` works in production without env vars.

### External Dependencies

- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Clerk
- **Payment Processing**: Stripe
- **AI Model**: GPT-4o (via API)
- **API Specification**: OpenAPI 3.1
- **Validation**: Zod
- **API Codegen**: Orval
- **Package Manager**: pnpm
- **Build Tool**: esbuild
- **Frontend Framework**: React
- **PDF Parsing**: `pdf-parse` (specifically `pdf-parse/lib/pdf-parse.js`)
- **Voice Recognition**: Web Speech API (`SpeechRecognition`)
- **Speech Synthesis**: Web Speech API (`SpeechSynthesis`)