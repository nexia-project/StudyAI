# StudyAI — Tutor de IA para ENEM/Vestibular/Concursos (study.ia.br)

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `lib/replit-auth-web` (`@workspace/replit-auth-web`)

DEPRECATED — no longer used by the web or mobile app. Authentication has been migrated to Clerk (see below).

### Authentication — Clerk

StudyAI uses **Clerk** for authentication (migrated from Replit Auth).

- **Clerk app ID**: `app_3CPKlsptR0SyIbSc11ANyiN0wHO`
- **Env vars**: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` (auto-provisioned)
- **Server middleware**: `@clerk/express` — `clerkMiddleware()` in `app.ts`; `optionalAuth` sets `req.userId` for all requests; `requireAuth` blocks unauthenticated access in individual route handlers
- **Frontend**: `@clerk/react` — `ClerkProvider` wraps the app in `App.tsx`; `useStudyAuth` hook in `artifacts/studyai/src/hooks/useStudyAuth.ts` provides compatibility interface (maps Clerk → old `useAuth` API: `isAuthenticated`, `login()` → `/sign-in`, `logout()` → `signOut()`)
- **User ID mapping**: `users` table has `clerk_id` column (TEXT, UNIQUE). On first Clerk login, we look up the existing user by email (preserving historical data linked to old Replit ID), then store `clerk_id` for fast subsequent lookups. New users get their Clerk ID as the internal ID.
- **Routes**: `/sign-in` and `/sign-up` use embedded `<SignIn>` / `<SignUp>` Clerk components
- **Auth pane**: To manage users, enable/disable login providers (Google, GitHub, etc.), or change branding, use the Auth pane in the workspace toolbar
- **Proxy**: In production, Clerk API is proxied via `/api/__clerk` (Clerk proxy middleware in `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts`)

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

## StudyAI Application

Published at `study.ia.br`. ENEM/vestibular/concurso AI tutor platform powered by GPT-4o.

### Routes
- `/` — Landing page (marketing, pricing, testimonials, waitlist)
- `/app` — Main study app (Home.tsx)
- `/dashboard` — Stats, streak, goal countdown, history
- `/historico` — Past study sessions
- `/ranking` — Global XP leaderboard
- `/redacao` — ENEM essay corrector (5 competências, 0-1000 score)
- `/mapa` — Performance heat map by subject (strong/weak areas)

### Freemium Model (Stripe)
- **Free tier**: 5 AI uses total (`free_ai_uses` column in DB, default 0). Tracked via atomic UPDATE WHERE clause (race-condition-safe). Returns 402 `{ erro: "limite_gratuito" }` when exhausted.
- **Premium** (R$29,90/mês, Stripe): All features unlimited
- Middleware: `checkFreeUsage` in `artifacts/api-server/src/lib/freeUsage.ts` — applied to `/analisar`, `/chat`, `/flashcards`, `/resumao`, `/redacao`
- Atomic increment: `UPDATE users SET free_ai_uses = free_ai_uses + 1 WHERE id = ? AND free_ai_uses < 5` (prevents race conditions)
- Stripe integration via Replit connector (connector ID: `connector:ccfg_stripe_01K611P4YQR0SZM11XFRQJC44Y`)
- Stripe product: `prod_UIMLE19aOqLDrF`, price: `price_1TJlcQ89mXjTdwp9ZQjS8stW` (R$29,90/mês BRL)
- Env var: `STRIPE_PREMIUM_PRICE_ID` (set via Replit secrets)
- Webhook secret (optional): `STRIPE_WEBHOOK_SECRET` for signature verification
- Frontend hook: `useSubscription()` in `artifacts/studyai/src/hooks/useSubscription.ts` — exposes `freeAiUses`, `freeAiUsesRemaining`, `freeAiLimit`
- Paywall component: `PremiumGate` in `artifacts/studyai/src/components/PremiumGate.tsx`
- Free limit modal: `FreeLimitModal.tsx` — global 402 interceptor in App.tsx fires `studyai:limit-reached` event
- UserMenu: shows "X/5 grátis" counter (amber), "Limite atingido" (red, pulsing) when exhausted, "Premium" with crown for paid users
- Pricing page: `/pricing` and `/app/pricing`

### Routes
- `/` — Landing page (marketing, pricing, testimonials, waitlist)
- `/app` — Main study app (Home.tsx)
- `/app/pricing` / `/pricing` — Pricing + upgrade page (Stripe checkout)
- `/dashboard` — Stats, streak, goal countdown, history
- `/historico` — Past study sessions
- `/ranking` — Global XP leaderboard (Premium only)
- `/redacao` — ENEM essay corrector (Premium only)
- `/mapa` — Performance heat map by subject (Premium only)

### API Routes (api-server, port 8080)
- `POST /api/analisar` — GPT-4o generates gamified study plan (3-day cap for free users)
- `POST /api/simulado` — GPT-4o generates 10-question exam
- `POST /api/simulado-adaptativo` — Reads student DB history, identifies weak areas by score trend, generates targeted questions via GPT-4o; returns `{ simulado, diagnostico }` with avg score, trend, and topic list
- `POST /api/flashcards` — GPT-4o generates flashcard deck
- `POST /api/tutor` — AI tutor chat
- `POST /api/redacao` — GPT-4o evaluates ENEM essay (5 competências, 0-1000 pts)
- `GET /api/analytics/heatmap` — Aggregate simulado + flashcard data by subject into heat map
- `POST /api/activity` / `GET /api/streak` — Daily streak tracking
- `POST /api/waitlist` / `GET /api/waitlist/count` — Landing page waitlist
- `GET /api/history` — User study history (requires auth)
- `GET /api/ranking` — XP leaderboard
- `GET /api/subscription/status` — Returns `{ status, isPremium }` for current user
- `POST /api/subscription/create-checkout` — Creates Stripe checkout session, returns `{ url }`
- `POST /api/subscription/create-portal` — Creates Stripe billing portal session
- `POST /api/subscription/webhook` — Stripe webhook handler (raw body, before express.json)
- `POST /api/voice-chat` — GPT-4o streaming voice tutor (SSE); voice-optimized: no markdown, 3-4 sentences max, conversational tone

### DB Schema (lib/db/src/schema/)
- `usersTable` (auth.ts) — users with `stripe_customer_id`, `stripe_subscription_id`, `stripe_subscription_status`
- `studyPlansTable` — Generated plans
- `simuladoResultsTable` — Exam results
- `flashcardSessionsTable` — Flashcard sessions
- `waitlistTable` — Waitlist signups
- `userActivityTable` — Daily activity for streak calculation

### New Features (2025-04)
- **VoiceProfessor** (`artifacts/studyai/src/components/VoiceProfessor.tsx`) — Floating 👨‍🏫 button (bottom-left), opens voice chat panel; uses `SpeechRecognition` (pt-BR) for mic input and `SpeechSynthesis` for audio output; streams from `/api/voice-chat`; reads `studyai_profile` from localStorage for greeting
- **Onboarding Wizard** (`artifacts/studyai/src/components/Onboarding.tsx`) — 3-step modal on first visit: Name → Série → Goal; stores to `localStorage.studyai_profile`; pre-fills Home.tsx form on next visits; exports `hasOnboarded()` and `getOnboardingData()` helpers
- **URL-to-Study-Plan** — Home.tsx form has a URL input field; backend (`/api/analisar`) fetches and strips HTML from the URL, merges content with texto field before GPT-4o call

### Mapa Mental (2026-04 — atualização)
- **Nós clicáveis**: Nós com conteúdo estudado têm seta e abrerm drawer lateral com stats (planos, simulados, flashcards, score, tópicos)
- **Nós não clicáveis**: Nós de documentos sem histórico estudado ficam acinzentados com ícone de cadeado
- **Upload de documento**: Botão "Carregar Doc" no header → modal → API `POST /api/mapa-mental/from-doc` → GPT-4o extrai estrutura → mapa visual integrado
- **Tabs de documentos**: Switcher entre "Meu Histórico" e cada doc carregado; nós do doc que têm histórico de estudo = clicáveis
- **DB**: `user_doc_mindmaps` table (user_id, doc_title, mind_map_json JSONB, created_at)
- **Endpoint**: `GET /api/mapa-mental/my-docs`, `DELETE /api/mapa-mental/my-docs/:id`

### Base de Conhecimento do Sistema (2026-04)
- **Admin panel** → aba "Base de Conhecimento": upload por texto ou arquivo PDF/TXT
- **DB**: `knowledge_documents` table (id, title, subject, content_text, uploaded_by, created_at)
- **API**: `GET /api/knowledge`, `POST /api/knowledge/upload-text`, `POST /api/knowledge/upload-file`, `DELETE /api/knowledge/:id`
- **Integração AI**: Professor Tiagão (`/api/voice-chat`) e Tutor (`/api/chat`) buscam na KB com ILIKE antes de responder — conteúdo encontrado vai no system prompt como "CONTEÚDO DA BASE DE CONHECIMENTO INTERNA"
- **Professor Tiagão**: Agora inclui `mindMapTopology` (matérias + tópicos) no system prompt, tem acesso ao mapa mental do aluno

### Módulo Professor (2026-04)
- **Routes**: `/professor` (turma list), `/professor/turma/:id` (detail: Alunos/Tarefas/Dashboard/Ranking tabs)
- **Access**: Users with `role = 'teacher' | 'institution_admin' | 'admin'` in `users.role` column
- **API**: `GET/POST/PUT/DELETE /api/teacher/turmas`, `GET /api/teacher/turmas/:id/students`, `GET /api/teacher/turmas/:id/tasks`, `POST /api/teacher/turmas/join` (student join by invite code)
- **DB**: `turmas` table (invite_code, teacher_id, institution_id), `turma_memberships`, `turma_tarefas`
- **Student stats**: XP, simulado count/accuracy, activity days, status (risco/iniciante/ativo/destaque)

### Módulo Instituição (2026-04)
- **Route**: `/instituicao` (Overview/Turmas/Professores tabs)
- **Access**: Users with `role = 'institution_admin' | 'admin'`
- **API**: `GET/POST /api/institution`, `GET /api/institution/me`, `GET /api/institution/:id`, `POST /api/institution/:id/teachers`
- **DB**: `instituicoes`, `institution_users`

### Módulo Governo (2026-04)
- **Route**: `/governo` (Visão Geral/Crescimento/Matérias tabs)
- **Access**: Users with `role = 'government' | 'admin'`
- **API**: `GET /api/government/stats` (aggregate metrics, weekly growth, top subjects), `POST /api/government/promote` (admin promotes user roles)
- **Role management**: Admin panel → "Perfis & Acesso" tab → dropdown select per user

### Role System
- Column: `users.role` (VARCHAR 50, default 'student')
- Values: `student | teacher | institution_admin | government | admin`
- Admin promotes users via Admin panel (`/admin` → Perfis & Acesso tab) or `POST /api/government/promote`
- UserMenu shows role-based module links: Professor/Instituição/Governo/Admin
- Profile API (`/api/profile`) returns `role` field

### Critical Rules
- NEVER use `exit` animations in Simulado (causes `insertBefore` crash) — only `initial` + `animate`
- Only ADD features, never break existing behavior
- pdf-parse import: `from "pdf-parse/lib/pdf-parse.js"`, model: `gpt-4o`
- Auth: PostgreSQL sessions, cookie `sid`, API port 8080 / Vite port 18459
- Stripe webhook MUST be mounted before `express.json()` (done in app.ts with express.raw)
- Never cache Stripe client — always call `getUncachableStripeClient()` to get fresh instance
