# StudyAI

### Overview

StudyAI is an AI-powered tutor platform targeting students preparing for Brazilian exams (ENEM, vestibular, public competitions) and extending its utility to educators and institutions. It aims to democratize high-quality education through personalized, gamified study plans, adaptive exams, essay correction, flashcards, and a voice-activated AI tutor. The platform leverages advanced AI models to provide comprehensive educational support and insights for various user roles.

### User Preferences

- I want iterative development.
- Ask before making major changes.
- I prefer clear and concise explanations.
- I prefer detailed explanations.
- Do not make changes to the folder `Z`.
- Do not make changes to the file `Y`.

### System Architecture

StudyAI is built as a `pnpm` monorepo using TypeScript, Node.js 24, and Express 5 for its API, with a React frontend. PostgreSQL with Drizzle ORM handles data persistence.

**Core Architectural Decisions:**

- **Monorepo Structure**: Facilitates shared libraries and managed dependencies.
- **API-First Design**: OpenAPI 3.1 specification drives API development, enabling automatic code generation and Zod schemas for validation.
- **Authentication**: Clerk for robust user identity management.
- **Freemium Model**: Implemented with Stripe for subscription management.
- **AI Integration**: OpenRouter proxy + OpenAI proxy via Replit AI Integrations (`artifacts/api-server/src/lib/aiClient.ts`):
    - **Claude Sonnet 4** (`OR.claude = anthropic/claude-sonnet-4`) via OpenRouter: **PRIMARY engine for heavy content generation**. `generateWithGemini()` helper (nome mantido por compatibilidade) agora usa Claude. Usado em: `generateHeavyMaterial()`, `notebook/study-guide`, `studio-ia/slides`, `studio-ia/mapa-mental`, `notebook/tiagao-explica`, etc.
    - **Claude 3 Haiku** (`OR.claudeFast`): tasks Claude rápidas e baratas.
    - **DeepSeek via OpenRouter** (chat interativo):
        - `OR.fast = deepseek/deepseek-v4-flash`: flashcards, simulado, trilha, chat, aula-ia, etc.
        - `OR.pro = deepseek/deepseek-v4-pro`: OCR, redação, análise de aluno; **fallback de notebook Q&A**.
        - `OR.reasoning = deepseek/deepseek-r1-0528`: simulados de exatas.
        - `OR.materials = deepseek/deepseek-chat-v3-0324`: fallback final para conteúdo longo.
    - **GPT-4o** (`OR.premium = openai/gpt-4o`) via OpenRouter: visão (analisar-problema), tarefas premium.
    - **OpenAI TTS-1** (whisperClient, Replit proxy): TTS primário do Tiagão — voz `onyx`, speed 1.1.
    - **Whisper** (whisperClient, Replit proxy): transcrição de áudio (STT).
    - **gpt-image-1** (OpenAI proxy): geração de imagens educacionais.
    - **Removidos**: ~~Gemini~~, ~~MiniMax TTS~~, ~~MiniMax-M2.7 LLM~~, ~~MiniMax Hailuo Video~~.
    - **Chaves próprias** (para Railway): OpenRouter key + OpenAI key — o usuário vai fornecer quando necessário.
    - **OpenAI Whisper**: Transcription.
- **Adaptive Learning**: Tailors content based on student performance.
- **Role-Based Access Control**: Flexible role system (`student`, `teacher`, `institution_admin`, `government`, `admin`) for feature access.
- **UI/UX**: Features like Voice Professor, onboarding wizard, dynamic mind maps, premium gates, and free usage counters. Consistent navigation with `AppNav` and `LandingDropdown`. Reusable layout system: `Layout`, `PageHeader`, `ContentArea`, `ScrollableTable` in `components/Layout.tsx`. Skeleton loading states via `DashboardSkeleton` component. Responsive design with `overflow-x-auto` charts and `active:scale-95` / `hover:-translate-y-0.5` button/card feedback.
- **Real-time Communication**: Voice chat uses `SpeechRecognition` (when available) with Whisper API fallback (`/api/transcribe`) for browsers without native STT (notably Safari iOS). Audio capture lives in `useAudioCapture` hook with cross-device support: iOS Safari (`audio/mp4`/`m4a`), Chrome/Firefox (`audio/webm;opus`), HTTPS gating, OverconstrainedError fallback, mutex-guarded `start()` to prevent duplicate streams, and VAD-based silence detection. TTS uses `SpeechSynthesis` + OpenAI TTS streaming.
- **Knowledge Base Integration**: AI tutors access an internal knowledge base for accurate responses.
- **AI Cost Monitoring**: Dedicated `ai_cost_log` table and `logAiUsage()` helper for tracking AI expenditures across features and models.

**Key Features and Modules:**

- **Professor Tiagão (Agente IA)**: Universal AI assistant with **Evolutionary Memory System** (Prompts 11+12), OpenAI Function Calling for real-time actions (22 tools), adapting to user roles with full personalization.
- **Sistema de Memória Evolutiva (Prompt 12)**: Four-tier persistent memory:
  - (1) `tiagao_memory` — legacy manual observations
  - (2) `user_profile_memory` — auto-updated rich profile via GPT-4o-mini analysis (`generativeMemory.ts`)
  - (3) `tiagao_memories` — typed memories (fact/preference/struggle/achievement/promise/emotion/goal/routine) — rich, deduped, importance-ranked
  - (4) `student_profiles` — deep personal profile: name, grade, school, city, weak/strong subjects, hobbies, team, important dates, study streak
  - `tiagao_sessions` — per-session tracking (mood, topics, materials created)
  - Service: `lib/tiagao-memory.ts` — `saveMemory`, `loadSessionContext`, `updateProfile`, `addImportantDate`, `autoDetectAndSave`, `buildPersonalizationBlock`
  - Voice-chat injects `personalizationBlock` into system prompt every turn; auto-detects personal info from every user message (fire-and-forget)
- **Knowledge Base Auto-Alimentada (Prompt 11)**: `knowledge_base` table + `lib/knowledge-base.ts` with FTS search (PostgreSQL `to_tsvector`/`to_tsquery`) + ILIKE fallback. Auto-fed when Tiagão creates slides/resumos. Searchable via tool `buscar_historico_aluno`.
- **Novos Tools Tiagão** (v2): `salvar_memoria_rica`, `atualizar_perfil`, `registrar_data_importante`, `buscar_historico_aluno` — total 22 tools.
- **Aula com IA (Tiagão na Lousa)**: Interactive animated whiteboard lessons.
- **Caderno Digital**: Digital notebook with AI processing for summaries, key points, flashcards, and questions.
- **Study Modules**: Study plans, simulated exams, essay correction, flashcards (SM-2 algorithm), Pomodoro timer, performance heat map.
- **Correção de Redação com Histórico**: Essay corrections with visual competency bars and scores history.
- **Mind Map**: NotebookLM-style horizontal hierarchical tree.
- **Infographic Generator**: AI-generated visual posters in various styles.
- **Teacher Module**: Tools for class management, student performance analysis, question bank creation, exam generation, activity management, and reporting.
    - Includes `Banco de Questões` (AI-generated questions), `Gerador de Provas`, `Atividades` (with AI-assisted correction), `Aba Desempenho`, and `Relatórios`.
- **Institution Module**: Institutional oversight and aggregated data tracking.
- **Government Module**: Aggregate educational metrics and user role promotion tools.
- **Orquestrador de Comunicação**: Multi-channel automated communication system (Email, WhatsApp/Push/SMS ready) with a rule engine for triggers (e.g., re-engagement, streak tracking, weekly summaries).
- **Geração de Conteúdo Educacional Pro**: Advanced AI tools for teachers including:
    - **Aula Viva**: Scripted episodes for lessons (Netflix-style).
    - **Micro-Aulas**: Multi-format micro-lessons (15s to 10min, series).
    - **Narrativa Didática**: Content transformed into epic stories.
    - **Remix Cultural**: Pedagogical connections to current cultural references.
    - **5 Versões do Plano**: Lesson plans adapted for different class types (difficult, advanced, inclusive, remote, hybrid).
    - **Plano de Aula — Upgrade Pro**: Enhanced lesson plan generation with detailed personas, BNCC integration, and rubrics.
    - **Tarefa / Atividade para Casa**: DUAL-structured assignments for students and teachers.
    - **Sequência Didática Multi-aula**: Multi-lesson sequences with logical progression.
- **Notebook RAG Rebuild**: Enhanced RAG capabilities with 5 chat modes (Padrão, Estudo, Pesquisa, Revisão, Dúvidas), upgraded studio prompts, and new endpoints for executive briefings (`/briefing`), comprehensive lesson plans (`/plano-aula`), and deep source analysis (`/dna`).
- **Event Tracking System**: `activity_events` and `daily_metrics` tables for user activity tracking (login, study_plan_created, quiz_started/completed, etc.).
- **Cross-Surface Sync Rule**: All new AI features must be reflected in Admin, Professor, Institution dashboards, and the Mobile app.

### External Dependencies

- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Clerk
- **Payment Processing**: Stripe
- **AI Models**: Claude Sonnet 4, Claude 3 Haiku, DeepSeek V4 (Flash/Pro/R1), GPT-4o, OpenAI TTS-1, OpenAI Whisper — todos via OpenRouter ou OpenAI Replit proxy
- **API Specification**: OpenAPI 3.1
- **Validation**: Zod
- **API Codegen**: Orval
- **Package Manager**: pnpm
- **Build Tool**: esbuild
- **Frontend Framework**: React
- **PDF Parsing**: `pdf-parse`
- **Voice Recognition**: Web Speech API (`SpeechRecognition`)
- **Speech Synthesis**: Web Speech API (`SpeechSynthesis`)

### Recent Changes (May 2026)

**Onda 1 — Hardening "apto para vender":**
- All TypeScript errors fixed across the workspace: API server (90+ → 0), studyai web (56 → 0), mobile (3 → 0), deck (52 → 0).
- Pattern adopted for Express 5 typing: `String(req.params.X)` casts (Express 5 + `@types/express` 5.0.6 types `req.params` as `string | string[]`). Per-call casts are the canonical fix; `src/types/express-override.d.ts` was kept but is inert (interface merging cannot weaken `string | string[]`).
- Handlers that returned `res.X(...)` were normalized to `return void res.X(...)` to satisfy TS7030 (`noImplicitReturns`) in async route handlers.
- IDOR fix in teacher routes: introduced `assertTurmaAccess(turmaId, userId)` helper that validates ownership (`turma.teacherId === userId`) or admin status via `isAdminUserAsync` (which checks `ADMIN_USER_IDS` env, `ADMIN_EMAILS` env, and DB `role='admin'`). Applied to **all** `/teacher/turmas/:id/*` endpoints: `tasks` (GET/POST/DELETE), `dashboard`, `ranking`, `notebooks` (GET/POST/PATCH/DELETE), `performance`, and `risk-action`. Verified PASS by code review.
- Asaas integration: declined by user. Stripe remains the sole payment processor.

## Generated Content History (Plan A + B, May 2026)
- **Single table `generated_content`** (raw SQL, in `ensureSchema.ts`): `(id, owner_id, owner_role, kind, title, materia, payload jsonb, html_url, created_at, deleted_at)` with indexes on owner+date and kind.
- **Helper `lib/contentHistory.ts`** exposes `saveGeneratedContent`, `listContent`, `getContent`, `softDeleteContent`. Save is best-effort: failures are logged, never thrown into the request handler.
- **Generators hooked** to persist into history (previously ephemeral):
  - Student: `/api/resumao`, `/api/studio-ia/slides`, `/api/studio-ia/mapa-mental`, `/api/studio-ia/infografico`
  - Teacher: `/api/teacher/create-content`, `/api/teacher/research`, `/api/teacher/generate-exam`
- **Plan A — Material Premium HTML**: new endpoint `POST /api/teacher/material-premium` uses `MATERIAL_HTML_INSTRUCTIONS` + `wrapMaterialHTML` with `claudeText(CLAUDE_OPUS → CLAUDE_SONNET fallback)`. Returns full HTML and saves to history (kind=`material_premium`). Surfaced via "Material Premium HTML" button in `ConteudosSection` (Professor.tsx) — opens result in new tab.
- **API**: `/api/content/history` (filters: `kind`, `role`, `search`, `limit`, `offset`), `/api/content/:id`, `DELETE /api/content/:id` (soft delete). Owner is always the authenticated user.
- **UI**: New page `pages/MeusConteudos.tsx` at `/meus-conteudos`. Filters by tipo/role/search. Modal viewer for resumão/slides/mapa/exam/research; infográfico renders inline; material_premium opens HTML in new tab. Nav link added in `AppNav.tsx` for both Aluno and Professor sidebars.

## Material Premium — Adaptive Style Learning (Stage 1)
- **Goal**: Material Premium HTML adapts visually to each user's preferences over time. Two professors of the same subject can receive different themes based on usage history.
- **Schema**: `material_style_events` table (`user_id`, `theme_id`, `action`, `materia`, `nivel`, `weight`, `content_id`, `created_at`) with indexes on `(user_id, created_at DESC)` and `(user_id, materia, created_at DESC)`.
- **Module `lib/material-style-learning.ts`**:
  - `recordStyleEvent({ userId, themeId, action, materia, nivel, contentId })` — fire-and-forget logger. Actions and weights: `generated +1.0`, `exported +2.5`, `saved +1.5`, `liked +3.0`, `regenerated -1.5`, `disliked -3.0`, `deleted -2.0`.
  - `getUserStyleBias(userId, materia?)` — reads last 200 events from past 90 days, applies exponential decay with 30-day half-life, returns `{ global, forMateria, totalEvents }` sorted by score.
  - `applyBiasToBaseTheme(baseThemeId, bias)` — substitutes the picker's base theme with a higher-scored compatible theme. **Hard rules**: kids-vibrant never substitutes (Fund 1 protection). **Compatibility buckets** prevent radical jumps (dark↔dark, light↔light only). **Thresholds**: matéria-specific score ≥ 4.0 with n≥2, OR global score ≥ 8.0 with n≥4.
- **`selectMaterialStyle()` extended**: now accepts `userBias` and `forceThemeId`, returns `SelectedMaterialStyle` with `decision: { reason, baseThemeId }` for telemetry.
- **Route `/teacher/material-premium`** loads bias before picking, records `generated`/`regenerated` event after generation. Response includes `style.{themeId, baseThemeId, reason}` so frontend can show "tema escolhido pelo seu uso" badge.
- **New endpoints**:
  - `POST /api/teacher/material-premium/feedback` — body `{ contentId, action, themeId, materia, nivel }` for explicit signals (like/dislike/exported/saved/deleted).
  - `GET /api/teacher/material-premium/style-bias?materia=X` — returns current bias for debug/dashboard.
- **Stage 2 (NOT yet built)**: generative palette variants — when a user has 5+ events on the same theme/matéria, synthesize a custom palette by HSL accent rotation (±30°) + accent2 swap, validate WCAG AA contrast (text vs bg ≥4.5:1), store in new `user_custom_themes` table. Awaiting user approval to implement.

## AI Cache Chat — 3 Prompts (May 2026)
- **DB**: `ai_cache` table created (raw SQL) — `(id, question_hash UNIQUE, question_text, response_text, slides_json, model_used, task_type, created_at)`. Hash = SHA-256(provider::type::message). Drizzle schema in `lib/db/src/schema/ai-cache.ts`.
- **Backend** `artifacts/api-server/src/routes/ai-cache-chat.ts`:
  - `POST /api/chat/openai` → DeepSeek via OpenRouter (OR.fast/pro/materials by task type)
  - `POST /api/chat/claude` → Claude via OpenRouter (haiku/sonnet-4 by task type)
  - `GET /api/chat/cache/stats` — cache hit count
  - Task types: `fast` (concise), `deep` (detailed), `slides` (JSON → SlideCard)
  - Cache-first: checks `ai_cache` by hash before calling AI; stores result after call
- **Frontend** `artifacts/studyai/src`:
  - `components/ChatForm.tsx` — task type selector (Rápido/Aprofundado/Slides) + GPT/Claude toggle + textarea
  - `components/ChatResponse.tsx` — markdown-ish response renderer with cache badge
  - `components/SlidesPreview.tsx` — paginated slide deck with fullscreen modal
  - `hooks/useAiChat.tsx` — manages messages[], loading, error; calls `/api/chat/{provider}`
  - `pages/TutorIA.tsx` — full chat page combining all 4 above; route `/tutor-ia`
  - AppNav: added "Tutor IA (GPT/Claude)" to "📚 Meu Acervo" group
- **Mobile** `artifacts/studyai-mobile`:
  - `components/SlideCard.tsx` — paginated slide card with fullscreen modal (React Native)
  - `services/aiService.ts` — `askAI(message, type, provider, token?)` helper
  - `app/(tabs)/chat.tsx` updated: `Message` interface now has optional `slides?` + `cached?`; `renderItem` shows `SlideCard` when slides exist; new `generateSlides()` function calls `/api/chat/claude` with `type:"slides"`; slides button (layers icon) added next to send button

## Lousa Imersiva (Prompt 14, May 2026)
- **Feature**: Immersive interactive blackboard with Professor Tiagão — generates step-by-step animated lessons saved to DB.
- **DB Tables**: `board_lessons` (id, user_id, title, subject, topic, difficulty, status, total_steps, duration_seconds, script JSONB, views, created_at) + `board_lesson_progress` (user_id, lesson_id, current_step, completed, UNIQUE).
- **Backend**: `artifacts/api-server/src/routes/board.ts` — endpoints:
  - `POST /api/board/generate` — generates lesson script (GPT-4o-mini, JSON, 8-14 etapas, async), returns lessonId
  - `POST /api/board/solve` — problem-solving variant
  - `GET /api/board/lessons` — list user's lessons
  - `GET /api/board/:id` — get lesson (polls while status=generating)
  - `DELETE /api/board/:id` — delete lesson
  - `POST /api/board/interact` — student asks question mid-lesson, saves to tiagao_memories
  - `POST /api/board/:id/progress` — upsert progress (current_step, completed)
- **Script format**: reuses existing `Aula/Etapa` format — `{ titulo, subtitulo, etapas: [{ id, narracao, elementos, duracao, tipo, quiz? }], resumo }`. Compatible with existing `ChalkBoardCanvas` component.
- **Frontend**: `artifacts/studyai/src/pages/LousaImersiva.tsx` — 3 views:
  - **Library** (default): grid of saved lessons, quick-create form (topic + subject + difficulty)
  - **Create**: full-page create form  
  - **Player**: immersive board with `ChalkBoardCanvas` (per-step), `TiagaoCharacter` avatar (right sidebar), timeline, controls, quiz overlay (AnimatePresence), question panel
- **TTS**: `SpeechSynthesis` pt-BR (same fallback as rest of app)
- **Route**: `/lousa-imersiva` registered in `App.tsx`; suppressed in `VoiceProfessorGate`
- **Navigation**: Added to `AppNav.tsx` under "📚 Meu Acervo" with NOVO badge