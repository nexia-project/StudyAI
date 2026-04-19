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
- **AI Integration**: GPT-4o is central to all intelligent features, offering dynamic content generation and personalized learning paths.
- **Adaptive Learning**: The system tracks student performance to tailor learning content and identify weak areas, providing targeted support.
- **Role-Based Access Control**: A flexible role system (`student`, `teacher`, `institution_admin`, `government`, `admin`) manages access to different platform modules and features.
- **Navigation**: A shared `AppNav` component ensures consistent navigation across all internal pages, with a separate `LandingDropdown` for the public-facing site.
- **UI/UX**: Features interactive elements like a Voice Professor, an onboarding wizard, and a dynamic mind map for visualizing study progress. The system prioritizes clear visual feedback, such as premium gates and free usage counters.
- **Real-time Communication**: Voice chat features utilize `SpeechRecognition` and `SpeechSynthesis` for an interactive tutor experience, streaming responses from the AI.
- **Knowledge Base Integration**: AI tutors can access an internal knowledge base, enhancing the relevance and accuracy of responses by incorporating curated content.

**Key Features and Modules:**

- **Professor Tiagão**: A universal AI assistant adapting to user roles (student, teacher, researcher, etc.) for personalized interaction.
- **Study Modules**: Includes features for study plans, simulated exams, essay correction, flashcards, and a performance heat map.
- **Mind Map (Mapa Mental)**: Visualizes study progress, allowing users to upload documents and generate interactive mind maps with clickable nodes linked to study history.
- **Admin Panel**: Comprehensive interface for managing users, finance, AI costs, content, database, integrations, and system settings.
- **Teacher Module**: Tools for managing classes, students, tasks, and analyzing student performance.
- **Institution Module**: Functionality for institutional oversight, managing teachers, and tracking aggregated data.
- **Government Module**: Provides aggregate educational metrics, weekly growth analysis, and tools for promoting user roles.

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