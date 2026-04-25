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
- **AI Integration**: A multi-model approach for cost optimization:
    - **DeepSeek-V3**: Chat, simulated exams, notebook tools.
    - **Claude Sonnet** (Anthropic via Replit): AulaIA lesson generation.
    - **GPT-4o**: Fallback and essay correction.
    - **OpenAI Whisper**: Transcription.
    - **ElevenLabs**: TTS (`eleven_turbo_v2_5`) with OpenAI TTS-1 fallback.
    - **Gemini Flash** (via Replit AI Integrations): Image generation, multimodal question analysis, text explanation.
    - **OpenAI text-embedding-3-small**: RAG embeddings.
- **Adaptive Learning**: Tailors content based on student performance.
- **Role-Based Access Control**: Flexible role system (`student`, `teacher`, `institution_admin`, `government`, `admin`) for feature access.
- **UI/UX**: Features like Voice Professor, onboarding wizard, dynamic mind maps, premium gates, and free usage counters. Consistent navigation with `AppNav` and `LandingDropdown`.
- **Real-time Communication**: Voice chat uses `SpeechRecognition` and `SpeechSynthesis` for interactive tutor experiences.
- **Knowledge Base Integration**: AI tutors access an internal knowledge base for accurate responses.
- **AI Cost Monitoring**: Dedicated `ai_cost_log` table and `logAiUsage()` helper for tracking AI expenditures across features and models.

**Key Features and Modules:**

- **Professor Tiagão (Agente IA)**: Universal AI assistant with persistent memory, OpenAI Function Calling for real-time actions, adapting to user roles.
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
- **AI Models**: GPT-4o, DeepSeek-V3, Claude Sonnet, OpenAI Whisper, ElevenLabs, Gemini Flash, OpenAI text-embedding-3-small
- **API Specification**: OpenAPI 3.1
- **Validation**: Zod
- **API Codegen**: Orval
- **Package Manager**: pnpm
- **Build Tool**: esbuild
- **Frontend Framework**: React
- **PDF Parsing**: `pdf-parse`
- **Voice Recognition**: Web Speech API (`SpeechRecognition`)
- **Speech Synthesis**: Web Speech API (`SpeechSynthesis`)