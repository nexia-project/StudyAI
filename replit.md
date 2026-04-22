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
32 core tables. Includes `tiagao_memory`, `tiagao_conversations`, `trilha_mestre_progress`, `trilha_mestre_sessions`, `notebook_overviews`, `notebook_embeddings`, `knowledge_documents`, `professor_mindmaps`, `user_doc_mindmaps`, `caderno_notes`, `redacoes`.

### Cross-Surface Sync Rule (LOCKED)
Every new AI feature added to ANY surface MUST also be reflected in:
1. **Admin** dashboard (`/admin/stats` aggregate metric + UI widget)
2. **Professor** dashboard (per-turma adoption + per-student usage in `/teacher/turmas/:id/insights`)
3. **Instituição** dashboard (institution-level rollup)
4. **Mobile app** (`artifacts/studyai-mobile/`) — feature parity with web

### Backend AI Metrics Endpoint
`GET /api/admin/stats` now returns: `aiFeatures[]` (Tiagão, Trilha, Notebook, Mapa Mental, Redação, Flashcards), `trilhaBySubject`, `diagnosticsCompleted30d`, `notebookDocsTotal`, `notebookStorageMb`, `notebookOverviewsTotal`, `teacherContentTotal`, `contentBreakdown`, `institutionsTotal/Active`.

`GET /api/teacher/turmas/:id/insights` returns: per-student `trilha.{mat,port}.{level,sessions,accuracy}`, `diagnosticCompleted` flag, `ai.{tiagao,notebook,mapa}` usage counts, plus `summary.{avgLevelMat,avgLevelPort,diagnosticCompleted,weakTopics[],aiAdoption}`.

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