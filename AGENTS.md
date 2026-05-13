# AGENTS.md

## Cursor Cloud specific instructions

### Architecture

This is a **pnpm workspace monorepo** for StudyAI (`study.ia.br`), a Brazilian AI-powered education platform. Key packages:

| Package | Path | Role |
|---|---|---|
| `@workspace/api-server` | `artifacts/api-server` | Express 5 backend (API + serves built frontend in production) |
| `@workspace/studyai` | `artifacts/studyai` | React 19 + Vite 7 SPA frontend |
| `@workspace/db` | `lib/db` | Drizzle ORM + PostgreSQL |

### Running services

**PostgreSQL** must be running before starting the API server. Start it with:
```
sudo pg_ctlcluster 16 main start
```

**API Server** (port 5000):
```
cd artifacts/api-server
export DATABASE_URL="postgresql://studyai:studyai@localhost:5432/studyai" \
  PORT=5000 NODE_ENV=development \
  CLERK_SECRET_KEY=sk_test_placeholder \
  CLERK_PUBLISHABLE_KEY=pk_test_placeholder \
  AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1 \
  AI_INTEGRATIONS_OPENAI_API_KEY=sk-placeholder \
  OPENROUTER_API_KEY=sk-placeholder
pnpm run build && node --enable-source-maps ./dist/index.mjs
```

**Frontend Vite dev server** (port 3000):
```
cd artifacts/studyai
export VITE_CLERK_PUBLISHABLE_KEY=pk_test_placeholder PORT=3000
pnpm run dev
```

### Gotchas

- **Module-level env var guards**: The OpenAI integration libs (`lib/integrations-openai-ai-server`) throw at import time if `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY` are not set. These must be exported before starting the API server, even with placeholder values.
- **Clerk auth with placeholders**: Auth-dependent API routes (everything under `/api` except `/api/healthz`) will return 500 with placeholder Clerk keys. Use `/api/healthz` to verify the server is running.
- **ensureAllSchemas()**: The API server auto-creates all 44+ database tables on boot via raw SQL. No separate migration step is needed.
- **Frontend API calls**: The frontend uses relative `/api/*` paths. In production, the API server serves the built frontend. In dev, the Vite server and API server run on separate ports — the frontend routing/pages work but API calls won't reach the backend without a proxy.
- **Pre-existing typecheck errors**: `pnpm run typecheck` at workspace root fails due to errors in `lib/integrations-*` (missing `@types/node` in some lib tsconfigs). Individual artifact typechecks pass: `pnpm --filter @workspace/api-server run typecheck` and `pnpm --filter @workspace/studyai run typecheck`.
- **Build commands**: API server uses esbuild (`pnpm --filter @workspace/api-server run build`). Frontend uses Vite (`pnpm --filter @workspace/studyai run build`).
- The `preinstall` script in root `package.json` enforces pnpm — do not use npm or yarn.
