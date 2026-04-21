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
- **Mind Map (Mapa Mental)**: Visualizes study progress, allows document uploads and generates interactive mind maps.
- **Admin Panel**: Comprehensive interface for managing users, finance, AI costs, content, database, integrations, and system settings.
- **Teacher Module**: Tools for managing classes, students, tasks, and analyzing student performance.
- **Institution Module**: Functionality for institutional oversight, managing teachers, and tracking aggregated data.
- **Government Module**: Provides aggregate educational metrics, weekly growth analysis, and tools for promoting user roles.

**DB Tables (as of April 2026):**
26 core tables + `tiagao_memory` + `tiagao_conversations` added for agent memory system.

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