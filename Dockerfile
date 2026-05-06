FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.json ./

# Copy all package.json files for install
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/integrations-openai-ai-server/package.json ./lib/integrations-openai-ai-server/
COPY lib/integrations-gemini-ai/package.json ./lib/integrations-gemini-ai/
COPY artifacts/api-server/package.json ./artifacts/api-server/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy all source
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

# Build API server
RUN pnpm --filter @workspace/api-server run build

# --- Runner stage ---
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy everything needed at runtime
COPY --from=base /app/package.json ./
COPY --from=base /app/pnpm-workspace.yaml ./
COPY --from=base /app/pnpm-lock.yaml ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/lib ./lib
COPY --from=base /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=base /app/artifacts/api-server/package.json ./artifacts/api-server/
COPY --from=base /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules

EXPOSE 3000
ENV PORT=3000

# Push schema then start server
CMD sh -c "cd lib/db && pnpm push --force; cd /app && node --enable-source-maps ./artifacts/api-server/dist/index.mjs"
