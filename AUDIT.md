# AUDIT.md — Auditoria Completa do StudyAI

> Gerado em 2026-05-02 por análise estática completa do repositório.  
> Nenhuma alteração de código foi feita.

---

## Índice

1. [Estrutura do Projeto](#1-estrutura-do-projeto)
2. [Frontend — artifacts/studyai/](#2-frontend--artifactsstudyai)
3. [Backend — artifacts/api-server/](#3-backend--artifactsapi-server)
4. [Database Schema](#4-database-schema)
5. [Features Existentes](#5-features-existentes)
6. [Professor Tiagão (PRIORIDADE)](#6-professor-tiagão-prioridade)
7. [Geração de Materiais](#7-geração-de-materiais)
8. [Problemas e Oportunidades](#8-problemas-e-oportunidades)

---

## 1. Estrutura do Projeto

### Visão Geral do Monorepo (pnpm workspace)

```
StudyAI/
├── artifacts/                ← Apps deployáveis
│   ├── api-server/           ← Backend Node.js/Express
│   ├── studyai/              ← Frontend Web (Vite + React)
│   ├── studyai-mobile/       ← App Mobile (Expo + React Native)
│   ├── studyai-deck/         ← Deck de apresentação da startup (SPA 17 slides)
│   └── mockup-sandbox/       ← Sandbox de mockups/prototipagem
├── lib/                      ← Pacotes compartilhados
│   ├── api-spec/             ← OpenAPI spec + Orval config
│   ├── api-client-react/     ← Cliente React gerado
│   ├── api-zod/              ← Schemas Zod gerados pelo Orval do openapi.yaml
│   ├── db/                   ← Drizzle ORM + schema PostgreSQL
│   ├── integrations/         ← Sub-libs de AI (pasta legado)
│   ├── integrations-openai-ai-server/  ← Wrapper OpenAI (server-side)
│   ├── integrations-gemini-ai/         ← Wrapper Gemini (server-side)
│   └── replit-auth-web/      ← Hooks React para auth Replit OIDC
├── scripts/                  ← Scripts utilitários (src/hello.ts — praticamente vazio)
├── exports/                  ← PDFs exportados + screenshots
├── attached_assets/          ← Assets/assets referenciados em prompts (não code)
├── pnpm-workspace.yaml       ← Define roots: artifacts/*, lib/*, lib/integrations/*
├── tsconfig.base.json        ← TS config base compartilhada
└── package.json              ← Scripts globais
```

### Packages por Camada

| Package | Nome npm | Propósito |
|---------|----------|-----------|
| `lib/db` | `@workspace/db` | Drizzle ORM, schemas, conexão PostgreSQL |
| `lib/api-spec` | `@workspace/api-spec` | OpenAPI 3.1 spec + Orval codegen config |
| `lib/api-zod` | `@workspace/api-zod` | Zod schemas + TS types gerados do OpenAPI |
| `lib/api-client-react` | `@workspace/api-client-react` | Hook/fetcher React para a API |
| `lib/integrations-openai-ai-server` | `@workspace/integrations-openai-ai-server` | Cliente OpenAI configurado + utils audio/image/batch |
| `lib/integrations-gemini-ai` | `@workspace/integrations-gemini-ai` | Cliente Gemini configurado + utils image/batch |
| `lib/replit-auth-web` | `@workspace/replit-auth-web` | `useAuth()` hook para OIDC Replit |
| `artifacts/api-server` | — | Backend Express + todas as rotas |
| `artifacts/studyai` | — | Frontend Web SPA |
| `artifacts/studyai-mobile` | — | App React Native/Expo |
| `artifacts/studyai-deck` | — | Pitch deck interativo |

### Stack Tecnológica

**Frontend:** React 19 · Vite 7 · Tailwind CSS v4 · Wouter (roteamento) · TanStack Query v5 · shadcn/ui (Radix UI) · Framer Motion 12 · Recharts · Lucide React

**Backend:** Node.js · Express · Drizzle ORM · PostgreSQL (Neon/Replit DB) · Clerk (auth) · Stripe (billing) · Pino (logging) · Zod (validação) · ElevenLabs TTS

**AI:** OpenAI (GPT-4o, GPT-4o-mini, o1-mini, Whisper, TTS, DALL-E, Embeddings) · Anthropic (claude-sonnet-4-5, claude-haiku-4-5) · Google Gemini (flash, image) · pgvector (semantic cache)

**Mobile:** Expo SDK 54 · React Native 0.81 · Expo Router · expo-av · TanStack Query

---

## 2. Frontend — artifacts/studyai/

### Todas as Rotas/Páginas

| Caminho | Componente | Arquivo | Público? |
|---------|-----------|---------|---------|
| `/` | Landing | `pages/Landing.tsx` | Sim |
| `/sign-in` | SignInPage (Clerk) | Clerk hosted | Sim |
| `/sign-up` | SignUpPage (Clerk) | Clerk hosted | Sim |
| `/app` | Home | `pages/Home.tsx` | Auth |
| `/pricing` | Pricing | `pages/Pricing.tsx` | Auth |
| `/dashboard` | Dashboard | `pages/Dashboard.tsx` | Auth |
| `/historico` | History | `pages/History.tsx` | Auth |
| `/ranking` | Ranking | `pages/Ranking.tsx` | Auth |
| `/redacao` | Redacao | `pages/Redacao.tsx` | Auth |
| `/mapa` | Mapa | `pages/Mapa.tsx` | Auth |
| `/mapa-mental` | MapaMental | `pages/MapaMental.tsx` | Auth |
| `/perfil` | Perfil | `pages/Perfil.tsx` | Auth |
| `/conquistas` | Conquistas | `pages/Conquistas.tsx` | Auth |
| `/cronograma` | Cronograma | `pages/Cronograma.tsx` | Auth |
| `/caderno` | Caderno | `pages/Caderno.tsx` | Auth |
| `/sala-estudos` | SalaEstudos | `pages/SalaEstudos.tsx` | Auth |
| `/aula-ia` | AulaIA | `pages/AulaIA.tsx` | Auth |
| `/trilha` | Trilha | `pages/Trilha.tsx` | Auth |
| `/notebook` | Notebook | `pages/Notebook.tsx` | Auth |
| `/base-conhecimento` | BaseConhecimento | `pages/BaseConhecimento.tsx` | Auth |
| `/atividades` | AtividadesAluno | `pages/AtividadesAluno.tsx` | Auth |
| `/comunicacao` | Comunicacao | `pages/Comunicacao.tsx` | Auth |
| `/simulado-enem` | SimuladoEnem | `pages/SimuladoEnem.tsx` | Auth |
| `/professor` | Professor | `pages/Professor.tsx` | Auth (teacher/admin) |
| `/professor/login` | ProfessorLogin | `pages/ProfessorLogin.tsx` | Público |
| `/professor/turma/:id` | ProfessorTurma | `pages/ProfessorTurma.tsx` | Auth (teacher) |
| `/instituicao` | Instituicao | `pages/Instituicao.tsx` | Auth (escola) |
| `/instituicao/login` | InstituicaoLoginPage | Inline | Público |
| `/instituicao/convite/:token` | InstituicaoConvitePage | Inline | Auth |
| `/governo` | Governo | `pages/Governo.tsx` | Auth (governo) |
| `/governo/login` | GovernoLogin | `pages/GovernoLogin.tsx` | Público |
| `/admin` | Admin | `pages/Admin.tsx` | Auth (admin) |
| `/privacidade` | Privacidade | `pages/Privacidade.tsx` | Público |
| `/v1/oauth_callback` | OAuthCallbackPage | Clerk | Público |
| `/simulado`, `/flashcards`, `/plano` | Redirect → `/app` | App.tsx | — |
| `/pomodoro` | Redirect → `/sala-estudos` | App.tsx | — |

**Total: 34 rotas únicas + 4 redirects legado**

### Componentes Principais

```
src/components/
├── AppNav.tsx          ← Navbar responsiva (440 linhas): top bar desktop, drawer mobile, bottom tabs mobile, mode switcher
├── Layout.tsx          ← Shell de página (AppNav + main wrapper)
├── UserMenu.tsx        ← Dropdown auth com links por role
├── VoiceProfessor.tsx  ← Tiagão flutuante (989 linhas — ver §6)
├── TiagaoCharacter.tsx ← Avatar animado do Tiagão
├── TiagaoFullBody.tsx  ← Variante full-body do avatar
├── TutorChat.tsx       ← Interface de chat
├── EstudioIA.tsx       ← Studio AI
├── Simulado.tsx        ← Componente de simulado
├── Flashcards.tsx      ← Componente de flashcards
├── Pomodoro.tsx        ← Timer Pomodoro
├── Onboarding.tsx      ← Fluxo de onboarding
├── ChalkBoardCanvas.tsx← Canvas de lousa (desenho sincronizado com áudio)
├── ImageUpload.tsx     ← Upload de imagem
├── DashboardSkeleton.tsx← Loading skeleton
├── DateRangeFilter.tsx ← Seletor de período
├── ErrorBoundary.tsx   ← Error boundary React
├── FreeLimitModal.tsx  ← Modal de paywall (limite free)
├── PremiumGate.tsx     ← Wrapper blur + CTA de upgrade
├── WhatsAppBanner.tsx  ← Banner de promoção WhatsApp
├── CookieConsent.tsx   ← Consentimento LGPD
└── ui/                 ← 53 componentes shadcn/Radix (accordion, badge, button, card, etc.)
```

### Design System

**Fontes:**
- `Nunito` — body/sans (400–900)
- `Outfit` — headings/display (400–900)
- `Caveat` — caligrafia (ChalkBoardCanvas)

**Paleta de Cores (CSS custom properties, Tailwind v4 CSS-first):**

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-background` | `hsl(270 50% 98%)` | Fundo lavanda claro |
| `--color-foreground` | `hsl(270 50% 10%)` | Texto roxo escuro |
| `--color-primary` | `hsl(262 83% 58%)` | Roxo-índigo vibrante |
| `--color-secondary` | `hsl(270 50% 95%)` | Lavanda claro |
| `--color-accent` | `hsl(290 85% 60%)` | Magenta/rosa brilhante |
| `--color-destructive` | `hsl(348 83% 58%)` | Vermelho |
| `--color-border` | `hsl(270 30% 88%)` | Borda lavanda |
| `--radius` | `1rem` | Border radius global |

**Classes utilitárias customizadas:**
- `.glass-card` — `bg-white/80 backdrop-blur-xl border border-white/50 shadow-[...]`
- `.text-gradient` — gradient `primary → accent` em texto
- `.animate-spin-slow` — rotação 8s
- `.animate-gradient-x` — sweep de fundo 4s

**Configuração:** Tailwind v4 inline via `@theme inline` em `index.css` (sem `tailwind.config.ts`). Plugin `@tailwindcss/typography`.

**Roteamento:** Wouter (não React Router) — mais leve, suporte a `basePath` para deploy Replit.

**Sistema de modo multi-role:** `ModeContext` persiste modo (`aluno/professor/escola`) no `localStorage`. Nav, rotas default e quick links mudam por modo.

---

## 3. Backend — artifacts/api-server/

### Arquitetura e Bootstrap

```
index.ts → app.ts → routes/index.ts
```

**Middleware stack (`app.ts`, em ordem):**
1. `GET /api/healthz` inline (bypass todos os middlewares)
2. `trust proxy 1` (Replit/Cloudflare)
3. `helmet` (CSP/COEP desabilitados)
4. `cors` (allowlist: `study.ia.br`, `*.replit.app`, `*.replit.dev`, `localhost:*`)
5. `clerkProxyMiddleware` no path `CLERK_PROXY_PATH`
6. `clerkMiddleware()` (popula sessão Clerk globalmente)
7. `pino-http` (logging estruturado, strip query params)
8. Body raw apenas em `/api/subscription/webhook`
9. `express.json + urlencoded` (10 MB limit)
10. `sanitizeInputs` (strip null bytes, caps por campo)
11. Rate limiters (por path — ver tabela abaixo)
12. `optionalAuth` (resolve clerkId → userId interno, **nunca bloqueia**)
13. `trackActivity` (fire-and-forget: last_seen_at, user_activity, login_events com debounce 5min)
14. Router `/api`

**Rate limiters (15min janela):**
| Limiter | Max req | Paths |
|---------|---------|-------|
| `authLimiter` | 20 | `/api/auth` |
| `aiLimiter` | 30 | `/api/analisar`, `/redacao`, `/simulado`, `/flashcards`, `/voice-chat`, `/voice-tts`, `/voice-proactive`, `/resumao`, `/aula-ia`, `/trilha/generate`, `/notebook/*` (6 paths), `/student/cronograma`, `/student/caderno`, `/student/sisu`, `/teacher/redacao-correct` |
| `generalLimiter` | 200 | `/api` (catch-all) |

### Todos os Endpoints da API

#### Health
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/healthz` | Nenhuma | Health check rápido |

#### Chat (Tiagão Texto)
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/chat` | `checkFreeUsage` | SSE streaming chat com Tiagão; carrega memória, contexto KB, dados de performance; executa tool-calling loop |

#### Flashcards
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/flashcards` | `checkFreeUsage` | Gera 15 flashcards AI (formato Anki/Active Recall) |
| GET | `/api/flashcard-reviews/due` | `requireAuth` | Cards SM-2 com revisão pendente (≤30) |
| POST | `/api/flashcard-reviews/add` | `requireAuth` | Adiciona cards em bulk ao SM-2 (≤50) |
| POST | `/api/flashcard-reviews/responder` | `requireAuth` | Registra resposta (0–5), executa SM-2, atualiza next_review |
| GET | `/api/flashcard-reviews/stats` | `requireAuth` | Due count, total, total reviews |

#### Histórico & XP
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/history` | Manual check | Planos (20), simulados (50), flashcard sessions (50) |
| POST | `/api/history/plan` | Manual check | Salva plano +25 XP |
| POST | `/api/history/simulado` | Manual check | Salva resultado simulado; XP = 50 + accuracy×150 |
| POST | `/api/history/flashcard` | Manual check | Salva sessão flashcard; XP = (known/total)×50 |
| POST | `/api/xp/award` | Manual check | Award XP capped (0–200) por completion de tópico |

#### Aula-IA (Gerador de Aulas)
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/aula-ia/gerar` | `requireAuth` | Gera aula estruturada em JSON; semantic cache L1-L3; race paralelo GPT-4o-mini + Claude Sonnet |
| POST | `/api/aula-ia/pergunta` | `requireAuth` | Resposta didática curta; Claude Haiku primary, gpt-4o-mini fallback |
| POST | `/api/aula-ia/transcrever` | `requireAuth` | Transcrição de voz via Whisper-1 |

#### Simulado
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/simulado` | `checkFreeUsage` | Gera 10 questões; roteia para o1-mini (exatas) ou gpt-4o-mini (humanas) |
| GET/POST | `/api/simulado-enem/*` | Auth | ENEM simulado específico |
| POST | `/api/simulado-adaptativo` | Auth | Simulado adaptativo |

#### Redação
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/redacao` | `checkFreeUsage` | Correção por gpt-4o; scoring ENEM 5 competências (0–1000) |

#### Notebook (RAG — 50+ endpoints)
| Método | Path | Descrição |
|--------|------|-----------|
| GET/POST/PATCH/DELETE | `/api/notebook/cadernos[/:id]` | CRUD de cadernos |
| POST | `/api/notebook/upload-file` | Upload PDF/DOCX/XLSX/CSV/EPUB/PPTX |
| POST | `/api/notebook/upload-text/url/gdocs/youtube/wikipedia/audio/image` | Upload de fontes variadas |
| GET/DELETE | `/api/notebook/docs[/:id]` | Listar/deletar documentos |
| POST | `/api/notebook/chat` | Q&A RAG não-streaming (5 modos) |
| POST | `/api/notebook/chat-stream` | Q&A RAG SSE streaming |
| POST | `/api/notebook/overview` | Insight overview (cache em `notebook_overviews`) |
| POST | `/api/notebook/study-guide` | Guia de estudos completo (gpt-4o) |
| POST | `/api/notebook/flashcards` | Gerar flashcards dos docs |
| POST | `/api/notebook/questoes` | Questões estilo ENEM dos docs |
| POST | `/api/notebook/mapa-mental` | Mapa mental JSON (gpt-4o) |
| POST | `/api/notebook/podcast` | Roteiro de podcast (ANA + PEDRO hosts) |
| POST | `/api/notebook/briefing` | Briefing executivo |
| POST | `/api/notebook/plano-aula` | Plano de aula + validação por 3 agentes AI |
| POST | `/api/notebook/tarefa` | Tarefa (formato aluno+professor) |
| POST | `/api/notebook/sequencia-didatica` | Sequência didática multi-aula |
| POST | `/api/notebook/aula-viva` | Roteiro de aula em formato TV/streaming |
| POST | `/api/notebook/aula-viva-formato` | 4 formatos especializados (jornal, chef, investigação, talk show) |
| POST | `/api/notebook/avaliacao-voz` | Avaliação oral: podcast + entrevista + debate |
| POST | `/api/notebook/making-of` | Making-of pedagógico |
| POST | `/api/notebook/simulador-aula` | Simula aula com 5 arquétipos de alunos |
| POST | `/api/notebook/validador-pares` | Validação por 3 agentes AI |
| POST | `/api/notebook/micro-aulas` | Versões TikTok/Shorts/Podcast (15s/60s/3min/10min) |
| POST | `/api/notebook/narrativa` | Narrativa didática (aluno como protagonista) |
| POST | `/api/notebook/remix-cultural` | Remix com cultura pop (funk, Netflix, memes) |
| POST | `/api/notebook/plano-aula-versoes` | 5 versões diferenciadas do plano de aula |
| POST | `/api/notebook/dna` | Análise DNA do conteúdo |
| POST | `/api/notebook/tiagao-explica` | Aula completa na lousa (6–8 etapas, gpt-4o) |
| POST | `/api/notebook/timeline` | Extração de timeline cronológica |
| POST | `/api/notebook/infografico` | Geração de imagem de infográfico |
| POST | `/api/notebook/slides` | Slides + imagem de capa |
| POST | `/api/notebook/suggest-questions` | Sugestão de 5 perguntas de estudo |
| POST | `/api/notebook/tabela` | Tabela comparativa |
| POST | `/api/notebook/relatorio` | Relatório (acadêmico/blog/executivo/aula) |
| POST | `/api/notebook/fast-research` | DuckDuckGo instant answer + GPT fallback |
| POST | `/api/notebook/discover` | Sugestão de fontes complementares |
| POST | `/api/notebook/share-link` | Gera token de compartilhamento |
| GET | `/api/notebook/shared/:token` | Lê notebook compartilhado (sem auth) |
| GET | `/api/notebook/tiagao-artifacts` | Lista artefatos criados pelo Tiagão |
| GET/DELETE | `/api/notebook/artifacts/:id` | Get/delete artefato |

#### Voz (Tiagão Voice)
| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/api/voice-chat` | Chat de voz com Tiagão (tool-calling, audio em/out) |
| POST | `/api/voice-proactive` | Mensagem proativa do Tiagão (idle/eventos) |
| POST | `/api/voice-tts` | TTS: ElevenLabs primary → OpenAI TTS-1 fallback |
| POST | `/api/transcribe` | STT via Whisper-1 (multipart audio) |

#### Gemini Multimodal
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/gemini/gerar-imagem` | Nenhuma | Gera imagem educacional via Gemini |
| POST | `/api/gemini/analisar-problema` | Nenhuma | Analisa foto de questão/exercício (multimodal) |
| POST | `/api/gemini/explicar-texto` | Nenhuma | Explica texto em nível configurável |

#### Studio-IA
| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/api/studio-ia/mapa-mental` | Mapa mental a partir de tópico (sem documento) |
| POST | `/api/studio-ia/infografico` | Infográfico com estilos (kawaii/profissional/científico/anime) |
| POST | `/api/studio-ia/slides` | Slides completos com imagens por slide |

#### Professor/Teacher
| Método | Path | Descrição |
|--------|------|-----------|
| GET/POST/PUT/DELETE | `/api/teacher/turmas[/:id]` | CRUD de turmas |
| POST | `/api/teacher/turmas/join` | Aluno entra em turma |
| GET | `/api/teacher/turmas/:id/students/dashboard/ranking/insights/performance` | Analytics por turma |
| GET/POST/PATCH/DELETE | `/api/teacher/activities[/:id]` | CRUD de atividades |
| GET | `/api/teacher/activities/:id/submissions` | Submissões |
| POST | `/api/teacher/activities/:id/submissions/:subId/ai-correct` | Correção AI de submissão |
| GET/POST/DELETE | `/api/teacher/question-bank` | Banco de questões |
| POST | `/api/teacher/question-bank/generate` | Gerar questões AI |
| POST | `/api/teacher/generate-exam` | Gerar prova completa |
| POST | `/api/teacher/create-content` | Criar conteúdo didático |
| POST | `/api/teacher/ai-copilot` | Copiloto AI para professor |
| POST | `/api/teacher/redacao-correct` | Corrigir redação de aluno |
| GET | `/api/teacher/student/:studentId/detail` | Detalhe de aluno |
| GET | `/api/teacher/lesson-plans` | Planos de aula |
| GET | `/api/teacher/dashboard` | Dashboard professor |

#### Outros Endpoints Confirmados
- `/api/bncc/*` — 6 endpoints BNCC (áreas, componentes, buscar, habilidade, mapear)
- `/api/analytics/heatmap` — Heatmap de performance por matéria
- `/api/admin/*` — 11 endpoints admin (users, stats, cache, memória, role-requests)
- `/api/comunicacao/*` — 11 endpoints de automação de e-mail
- `/api/government/*` — Stats para governo, request-access, promote
- `/api/feed` — Feed de atividade da comunidade
- `/api/subscription/*` — Status, checkout, portal Stripe
- `/api/ranking` — Placar global
- `/api/profile` — Perfil do usuário
- `/api/trilha` — Learning trail
- `/api/student/*` — cronograma, sisu, caderno (aluno)
- `/api/knowledge` — Knowledge base FTS
- `/api/wikipedia` — Proxy Wikipedia
- `/api/ocr` — OCR de documentos
- `/api/notify` — Notificações push
- `/api/institution/*` — Gestão de instituições
- `/api/waitlist` / `/api/leads` — Captação
- `/api/lgpd` — Deletar dados (LGPD)
- `/api/streak` — Streak data
- `/api/openai-image` — DALL-E geração
- `/api/resumao` — Resumidor AI

### Fluxo de Autenticação

```
Request
  └─ clerkMiddleware()        # Parse sessão Clerk
       └─ optionalAuth()       # Global, não-bloqueante
            ├─ getAuth(req)    # Extrai clerkId de sessionClaims.userId | .sub
            ├─ resolveInternalId(clerkId)
            │    ├─ L1: Map cache em memória (sem TTL — crescimento ilimitado)
            │    ├─ L2: DB WHERE clerk_id = clerkId
            │    └─ L3: Clerk API → link por email OU cria usuário
            └─ next() SEMPRE (nunca bloqueia)

Proteção por rota:
  requireAuth()       → 401 se req.userId ausente
  checkFreeUsage()    → ⚠️ BYPASSADO — hardcoded isPremium=true
  isAdminUserAsync()  → 4-tier: ADMIN_USER_IDS env → userId → ADMIN_EMAILS → DB role='admin'
```

### Modelos de IA Utilizados

| Modelo | Provider | Onde usado |
|--------|----------|-----------|
| `gpt-4o` | OpenAI | Tiagão (teacher/admin), todas as tools de geração de conteúdo, redação |
| `gpt-4o-mini` | OpenAI | Tiagão (students), flashcards, generative memory, aula-ia fallback |
| `claude-sonnet-4-5` | Anthropic | Aula-IA geração (primary, race com gpt-4o-mini) |
| `claude-sonnet-4-6` | Anthropic | `modelRouter.ts`: lesson-generation e creative tasks |
| `claude-haiku-4-5` | Anthropic | Aula-IA perguntas durante aula (gpt-4o-mini fallback) |
| `o1-mini` | OpenAI | Simulados de exatas (matemática/física/química) |
| `o1-preview` | OpenAI | Raciocínio multi-step profundo (reservado) |
| `gemini-2.5-flash-preview` | Google | Geração de imagens educacionais, análise multimodal |
| `whisper-1` / `gpt-4o-mini-transcribe` | OpenAI | STT (voz → texto) |
| `tts-1` / `tts-1-hd` | OpenAI | TTS fallback |
| ElevenLabs `eleven_turbo_v2_5` | ElevenLabs | TTS primary para voz do Tiagão (voice: `Daniel`) |
| `text-embedding-3-small` | OpenAI | Embeddings para semantic cache (pgvector) |
| `dall-e-3` | OpenAI | Geração de imagens via `openai-image.ts` |
| `gpt-image-1` | OpenAI | Geração/edição via `integrations-openai-ai-server` |

---

## 4. Database Schema

### Visão Geral

**ORM:** Drizzle ORM + PostgreSQL (pg.Pool de `DATABASE_URL`)  
**Config:** `lib/db/drizzle.config.ts` — dialect postgresql, schema: `./src/schema/index.ts`  
**Schema barrel:** re-exports `auth`, `history`, `modules` (⚠️ `conversations` e `messages` **NÃO** são re-exportados)

### Tabelas por Schema

#### `auth.ts`

**`sessions`** — Sessões Replit Auth (NÃO DELETAR)
| Coluna | Tipo | Restrições |
|--------|------|-----------|
| `sid` | varchar | PK |
| `sess` | jsonb | NOT NULL |
| `expire` | timestamp | NOT NULL |
> Index: `IDX_session_expire` em `expire`

**`users`** — Usuários (NÃO DELETAR)
| Coluna | Tipo | Restrições |
|--------|------|-----------|
| `id` | varchar | PK, DEFAULT gen_random_uuid() |
| `email` | varchar | UNIQUE |
| `first_name` | varchar | — |
| `last_name` | varchar | — |
| `profile_image_url` | varchar | — |
| `stripe_customer_id` | varchar | UNIQUE |
| `stripe_subscription_id` | varchar | — |
| `stripe_subscription_status` | varchar | DEFAULT 'free' |
| `free_ai_uses` | integer | NOT NULL, DEFAULT 0 |
| `xp` | integer | NOT NULL, DEFAULT 0 |
| `student_name` | varchar | — |
| `student_grade` | varchar | — |
| `student_goal` | varchar | — |
| `student_concurso_alvo` | varchar | — |
| `student_phone` | varchar | — |
| `student_school_type` | varchar | — |
| `role` | varchar(50) | DEFAULT 'student' |
| `escola` | varchar(255) | — |
| `cidade` | varchar(100) | — |
| `estado` | varchar(50) | — |
| `created_at` | timestamp with tz | NOT NULL, DEFAULT NOW |
| `updated_at` | timestamp with tz | NOT NULL, DEFAULT NOW, $onUpdate |

#### `history.ts`

**`study_plans`** — Planos de estudo gerados
| Coluna | Tipo | Restrições |
|--------|------|-----------|
| `id` | varchar(36) | PK |
| `user_id` | varchar | FK → users.id CASCADE DELETE |
| `materia` | varchar(255) | NOT NULL |
| `serie` | varchar(100) | — |
| `dias_prova` | integer | — |
| `plan` | jsonb | NOT NULL |
| `created_at` | timestamp with tz | — |

**`simulado_results`** — Resultados de simulados
| Coluna | Tipo | Restrições |
|--------|------|-----------|
| `id` | varchar(36) | PK |
| `user_id` | varchar | FK → users.id CASCADE DELETE |
| `study_plan_id` | varchar | FK → study_plans.id SET NULL |
| `materia` | varchar(255) | NOT NULL |
| `titulo` | varchar(500) | — |
| `score` | integer | NOT NULL |
| `total` | integer | NOT NULL |
| `time_taken` | integer | — |
| `nota` | varchar(10) | — |
| `answers` | jsonb | — |
| `created_at` | timestamp with tz | — |

**`flashcard_sessions`** — Sessões de flashcard
| Coluna | Tipo | Restrições |
|--------|------|-----------|
| `id` | varchar(36) | PK |
| `user_id` | varchar | FK → users.id CASCADE DELETE |
| `study_plan_id` | varchar | FK → study_plans.id SET NULL |
| `materia` | varchar(255) | NOT NULL |
| `dia_numero` | integer | — |
| `total_cards` | integer | NOT NULL |
| `known` | integer | NOT NULL |
| `unknown` | integer | NOT NULL |
| `completed_at` | timestamp with tz | — |

**`user_activity`** — Rastreamento de atividade diária
**`waitlist`** — Lista de espera
**`corporate_leads`** — Leads B2B

#### `modules.ts`

**`turmas`** — Turmas dos professores
**`turma_memberships`** — Matrículas aluno↔turma
**`turma_tarefas`** — Tarefas atribuídas a turmas
**`instituicoes`** — Instituições B2B (CNPJ, plano, admin_user_id, max_users/teachers)
**`institution_users`** — Vínculo usuário↔instituição (role: teacher/student/admin)
**`institution_invites`** — Convites com token + expiração
**`role_requests`** — Solicitações de upgrade de role (pending/approved/rejected)
**`question_bank`** — Banco de questões do professor (materia/tema/nivel/alternatives/correct)
**`activities`** — Atividades criadas por professores (type: prova/tarefa/simulado)
**`activity_submissions`** — Submissões de alunos (answers/score/time_spent_seconds)
**`redacoes`** — Redações com correção AI (comp1–comp5, score_total ENEM)
**`study_schedules`** — Planos de estudo adaptativos (target_date/score, hours_per_day)
**`caderno_notes`** — Notas do caderno digital com AI (title/content/tags/processed_content)
**`user_profile_memory`** — Memória generativa do Tiagão (perfil/topicos_frequentes/ultimas_sessoes/fatos_importantes, UNIQUE user_id)
**`ai_cost_log`** — Log de custo de IA (feature/model/tokens_in/tokens_out/cost_usd)

#### Fora do barrel (importação direta necessária)

**`conversations`** — `{id serial PK, title text, created_at}`  
**`messages`** — `{id serial PK, conversation_id FK, role text, content text, created_at}`

> ⚠️ Estas tabelas **não são re-exportadas** pelo `src/schema/index.ts`. Foram provavelmente criadas para um recurso antigo e estão sem uso no código atual.

### Tabelas Criadas em Runtime (fora do schema Drizzle)

Vários handlers criam tabelas diretamente via SQL — essas tabelas **não existem no schema Drizzle**:

| Tabela | Criada em | Endpoint |
|--------|-----------|---------|
| `notebooks` | `notebook.ts:ensureNotebooksSchema()` | Qualquer endpoint notebook |
| `notebook_embeddings` | `notebook.ts:ensureNotebooksSchema()` | Qualquer endpoint notebook |
| `notebook_artifacts` | `notebook.ts:ensureNotebooksSchema()` | Qualquer endpoint notebook |
| `knowledge_documents` | `notebook.ts` | Upload de documentos |
| `notebook_overviews` | Nunca criada (bug) | `/notebook/overview` |
| `tiagao_memory` | `tiagao-agent.ts` | Chat com Tiagão |
| `flashcard_reviews` | Implícito | SM-2 reviews |
| `user_profile_memory` | Duplicada? | `generativeMemory.ts` |
| Tabelas de comunicação | `comunicacao.ts` | Inicialização do módulo |

### Mapa de Relações

```
users ──< study_plans ──< simulado_results
users ──< flashcard_sessions
users ──< user_activity
users ──< turmas ──< turma_memberships >── users
                  ──< turma_tarefas
                  ──< activities ──< activity_submissions >── users
users ──< institution_users >── instituicoes
instituicoes ──< institution_invites
users ──< role_requests
users ──< question_bank
users ──< redacoes
users ──< study_schedules
users ──< caderno_notes
users ── user_profile_memory (1:1, UNIQUE user_id)
sessions (standalone — Replit Auth)
conversations ──< messages (sem uso atual)
waitlist, corporate_leads (standalone)
ai_cost_log (standalone logging)
```

---

## 5. Features Existentes

### 5.1 Simulado

**Como funciona:**  
POST `/api/simulado` → `gpt-4o-mini` ou `o1-mini` (exatas) → JSON de 10 questões múltipla escolha → frontend renderiza com timer, navegação e gabarito.

**Qualidade do código:**
- Roteamento de modelo por matéria é boa prática (`isMathScienceSubject()`).
- Content truncado a 2500 chars para reduzir tokens.
- SM-2 integrado via `flashcard-reviews.ts` — aluno pode adicionar erros ao SM-2 no pós-simulado.

**Pontos fracos:**
- Sempre 10 questões, não configurável pelo usuário.
- Sem banco de questões reutilizáveis para alunos (apenas para professores via `question_bank`).
- Sem analytics por questão (quais alternativas o aluno escolheu por padrão).

### 5.2 Flashcards (SM-2)

**Como funciona:**  
Geração via `/api/flashcards` (GPT-4o-mini, 15 cards por sessão) + revisão espaçada via SM-2 (`flashcard-reviews.ts`). Frontend em `src/components/Flashcards.tsx`.

**SM-2 implementado:** `next_review` calculado por easiness factor, intervalos crescentes. Due cards via `WHERE next_review <= NOW()`.

**Qualidade:** Sólido. SM-2 é implementado corretamente.

**Pontos fracos:**
- Geração gera 15 cards fixos, não configura por dificuldade/nível.
- Sem visualização de histórico de revisões por card.
- Sem exportação para Anki.

### 5.3 Redação

**Como funciona:**  
POST `/api/redacao` → `gpt-4o` → JSON com 5 competências ENEM (0/40/80/120/160/200 cada) → score total 0–1000 → salvo em `redacoes` table.

**Qualidade:** Boa. Usa gpt-4o (modelo mais capaz) com temperature 0.3 (mais consistente).

**Pontos fracos:**
- Sem suporte a outros tipos além de ENEM (artigo jornalístico, carta argumentativa).
- Sem histórico de evolução do aluno ao longo do tempo no frontend.
- Sem exemplos de redação de referência para comparação.

### 5.4 Cronograma de Estudos

**Como funciona:**  
`/api/student/cronograma` → AI gera plano semanal baseado em objetivo, horas/dia, matérias focais. Salvo em `study_schedules`.

**Pontos fracos:**
- Plano estático — não se adapta a resultados de simulados automaticamente.
- Sem integração com calendário externo (Google Calendar).

### 5.5 Caderno Digital

**Como funciona:**  
CRUD de notas em `caderno_notes` com campos `content`, `tags`, `processed_content` (AI-processado). `/api/student/caderno` usa AI para organizar/processar notas.

**Pontos fracos:**
- Duplicação conceitual com `Notebook.tsx` (RAG notebook) — dois produtos similares.
- `processed_content` é jsonb mas não há documentação do seu schema.

### 5.6 Sala de Estudos (Pomodoro)

**Como funciona:**  
Timer Pomodoro 25/5min com sessões colaborativas via `/api/sala-estudos`. Componente `Pomodoro.tsx`.

**Qualidade:** Funcional mas básico.

**Pontos fracos:**
- Sem estatísticas de sessões Pomodoro.
- "Colaborativo" não está claramente implementado.

### 5.7 Mapa Mental

**Como funciona:**  
3 abas: personal (dos dados de simulado/flashcard), por matéria (da knowledge base), material da turma (professor). Renderização SVG com `MindMapSVG` (hierárquico tipo NotebookLM) e `PannableSvg` (drag/pinch-zoom).

**Qualidade:** UI bem feita, layout radial e hierárquico.

**Pontos fracos:**
- Truncado a 12 matérias silenciosamente em `buildTree()`.
- `confirm()` nativo para deleção (bloqueia thread do browser).
- Sem export como imagem/PNG.
- `loadStudentData` refetch completo em toda troca de doc.

### 5.8 Aula-IA

**Como funciona:**  
POST `/api/aula-ia/gerar` → race entre Claude Sonnet (primary) e gpt-4o-mini → JSON estruturado de etapas → frontend (`AulaIA.tsx`) renderiza dark-theme com narração TTS + ChalkBoardCanvas sincronizado + Q&A via Whisper.

**Qualidade:** Feature mais polida do produto. Experiência imersiva bem construída.

**Pontos fracos:**
- Race paralelo cobra ambos os modelos mas usa apenas o primeiro (duplo custo).
- Sem modo offline/download da aula.
- Sem progresso persistente por aula (sem `completed` flag por etapa).
- Velocidade de reprodução (0.5×–2×) não persiste entre sessões.

### 5.9 Notebook RAG

**Como funciona:**  
Upload de docs (PDF/DOCX/XLSX/CSV/EPUB/PPTX/YouTube/Wikipedia/URL/texto/áudio/imagem) → chunking (800 chars, overlap 120) → salvo em `notebook_embeddings` + `knowledge_documents` → RAG via FTS (pt.`to_tsvector`) + ILIKE fallback → 50+ endpoints de geração de conteúdo.

**Qualidade:** Extremamente rico em features. Porém o tamanho (`notebook.ts` = 3606 linhas; `Notebook.tsx` = 6360 linhas) é um red flag de manutenibilidade.

**Pontos fracos (CRÍTICOS):**
- **RAG é puramente textual** — sem embeddings vetoriais para busca semântica. Usa apenas FTS + ILIKE. Qualidade de retrieval muito inferior a pgvector.
- `notebook_overviews` cache table **nunca é criada** → silent fail em toda chamada de `/overview`.
- `content_text` truncado a 100k chars mas processado até 200k — perda silenciosa de dados.
- Schema `notebooks/notebook_embeddings/notebook_artifacts` criado on-demand via SQL cru (fora do Drizzle).

### 5.10 Trilha do Mestre

**Como funciona:**  
`/api/trilha` — caminho de aprendizado gamificado. Detalhes completos requerem leitura de `trilha.ts` (não lido na auditoria).

### 5.11 Dashboard / Analytics

**Como funciona:**  
`/api/analytics/heatmap` — score composto por matéria (70% simulado + 30% flashcard), tendência, última atividade. Dashboard mostra XP, streak, ranking, heatmap.

**`ai_cost_log`** rastreia custos de AI por feature/modelo (tokens_in, tokens_out, cost_usd).

---

## 6. Professor Tiagão (PRIORIDADE)

### 6.1 Chat por Voz — Como Funciona

**Frontend (`VoiceProfessor.tsx` — 989 linhas):**

```
Fase: idle → listening → thinking → speaking → idle

Captura de voz:
  ├─ Primary: webkitSpeechRecognition (browser-native)
  └─ Fallback: useAudioCapture + Whisper (POST /api/transcribe)

TTS (playTTS):
  POST /api/voice-tts
    ├─ Primary: ElevenLabs eleven_turbo_v2_5, voz Daniel (pt-BR)
    │    stability: 0.45, similarity_boost: 0.80, style: 0.35
    └─ Fallback: OpenAI TTS-1, speed: 1.15x
  Decodifica via AudioContext + AudioBufferSourceNode

Contexto enviado:
  └─ collectStudentContext() → { pagina_atual, disciplina, grade, streak, xp }

Idle proativo:
  ├─ IDLE_TRIGGER_MS = 3min → POST /api/voice-proactive
  ├─ PROACTIVE_MIN_GAP = 8min (rate limit)
  └─ CHECK_INTERVAL = 30s

Artefatos recebidos:
  └─ handleAgentActions() → localStorage + evento "tiagao_artifact"
```

**Backend (`professor.ts` — 947 linhas + `tiagao-agent.ts`):**

```
POST /api/voice-chat
  1. fetchUserProfile(userId)        → role, grade, turma, XP
  2. fetchStudentData(userId)        → últimos 30 simulados, 30 flashcard, 10 planos;
                                       weak/strong subjects; stats por matéria
  3. loadUserMemories(userId)        → até 15 memórias persistentes
  4. getFullMemoryContext(userId)    → perfil generativo + últimas sessões + fatos
  5. buildRichContext(frontend, db)  → bloco de personalização
  6. CALL 1 (non-streaming): tool_choice="auto", TIAGAO_TOOLS
     ├─ Se tool calls → executeTiagaoTool() para cada
     └─ CALL 2 (streaming) para narrativa dos resultados
  7. Fire-and-forget: updateProfileAfterSession()
```

### 6.2 Ações que o Tiagão Consegue Executar

| Ação | Tool | Resultado |
|------|------|-----------|
| Navegar para página | `navegar` | `{type:"navegar", path}` → frontend redirect |
| Abrir aula imersiva | `abrir_aula_ia` | `{type:"abrir_aula_ia", topico, estilo}` → abre AulaIA |
| Criar flashcards | `criar_flashcards` | Gera 5–15 cards, insere em `flashcard_reviews` |
| Iniciar simulado | `iniciar_simulado` | Navega para `/simulado-enem` |
| Criar cronograma | `criar_cronograma` | Navega para `/cronograma` |
| Criar slides | `criar_slides` | Gera JSON 6–16 slides, salva em `notebook_artifacts` |
| Criar mapa mental | `criar_mapa_mental` | Gera hierarquia (4 cats × 3 tópicos × 4 subtópicos), salva em `notebook_artifacts` |
| Criar infográfico | `criar_infografico` | Gera JSON brief, delega geração de imagem ao client |
| Criar prova | `criar_prova` | Gera 5–15 questões (MC ou dissertativa), salva em `notebook_artifacts` |
| Criar plano de estudos | `criar_plano_estudos` | Gera plano semanal progressivo, salva em `notebook_artifacts` |
| Criar resumo | `criar_resumo` | Gera resumo estruturado (5–7 tópicos + keywords), salva em `notebook_artifacts` |
| Buscar nos documentos | `buscar_nos_meus_documentos` | FTS + ILIKE no `notebook_embeddings` do usuário |
| Analisar desempenho | `analisar_desempenho_completo` | SQL em `simulado_results` + `flashcard_sessions` → análise de weak/strong topics |
| Criar agenda do dia | `criar_agenda_hoje` | Gera agenda time-blocked para o dia, salva em `notebook_artifacts` |
| Gerar questão personalizada | `gerar_questao_personalizada` | Seleciona matéria mais fraca e gera questão ENEM-style |
| Salvar memória | `salvar_memoria` | Insere fato em `tiagao_memory` |

**Ações que o Tiagão NÃO consegue (gaps):**
- ❌ Agendar notificações/lembretes
- ❌ Integrar com calendário real
- ❌ Corrigir redação (delega para a página de redação)
- ❌ Controlar a Aula-IA (pausar/avançar etapas)
- ❌ Buscar na web em tempo real
- ❌ Ver submissões do professor para o aluno
- ❌ Marcar itens do cronograma como completos
- ❌ Exportar artefatos criados como PDF/DOCX

### 6.3 Como a Memória/Contexto Funciona

**3 camadas de memória:**

| Camada | Storage | O que armazena | Limite |
|--------|---------|----------------|--------|
| **Memória persistente** (`tiagao_memory`) | PostgreSQL | Fatos explícitos (objetivo, dificuldade, personalidade) salvos pelo tool `salvar_memoria` | 15 por usuário (ORDER BY importancia DESC) |
| **Perfil generativo** (`user_profile_memory`) | PostgreSQL JSONB | Perfil rico gerado por AI após cada sessão: tom, estilo, últimas sessões (7), tópicos (30), fatos (20) | 1 linha por usuário (UNIQUE) |
| **Cache em memória** (`idCache` Map) | Processo Node | clerkId → internalUserId | **Sem TTL, nunca evictado** |

**Fluxo de atualização (fire-and-forget após cada sessão):**
```
setImmediate() → getFullMemoryContext()
  └─ gpt-4o-mini com últimas 20 mensagens
       → extrai: summary, topics, mood, profile updates, new facts
       → merge arrays (dedup, max 10 items)
       → guarda últimas 7 sessões, 30 tópicos, 20 fatos
       → upsert em user_profile_memory
```

### 6.4 Modelos de IA do Tiagão

| Contexto | Modelo | Temperatura | Tokens Max |
|----------|--------|-------------|-----------|
| Chat aluno (voz + texto) | `gpt-4o-mini` | Default | Default |
| Chat professor/governo/admin | `gpt-4o` | Default | Default |
| Geração de conteúdo das tools | `gpt-4o` (`CONTENT_MODEL`) | Default | varies |
| Extração de memória pós-sessão | `gpt-4o-mini` | — | 1500 |
| Proativa (idle message) | `gpt-4o-mini` | 1.1 | 150 |
| TTS (voz) | ElevenLabs `eleven_turbo_v2_5` | — | — |
| TTS fallback | OpenAI `tts-1` | — | — |
| STT | `whisper-1` / `gpt-4o-mini-transcribe` | — | — |

**Hardcodes preocupantes:**
- Voice ID ElevenLabs: `onwK4e9ZLuTAKqWW03F9` (Daniel) — apenas overrideável via env `ELEVENLABS_VOICE_ID`, mas parcialmente.
- Context window: últimas 20 mensagens, cada truncada a 2000 chars.
- Memórias injetadas: máximo 15.

---

## 7. Geração de Materiais

### 7.1 Como São Gerados

**Slides:**
- **Via Tiagão** (`criar_slides` tool): GPT-4o → JSON (6–16 slides) → `notebook_artifacts` → frontend renderiza.
- **Via Studio-IA** (`/api/studio-ia/slides`): GPT-4o → JSON + imagens por slide via `generateImageBuffer` (primeiros 6 slides em paralelo).
- **Via Notebook** (`/api/notebook/slides`): GPT-4o-mini → JSON slides + 1 imagem de capa.

**Mapa Mental:**
- **Via Tiagão**: GPT-4o → JSON hierárquico → `notebook_artifacts`.
- **Via Studio-IA**: `/api/studio-ia/mapa-mental` → GPT-4o-mini.
- **Via Notebook**: `/api/notebook/mapa-mental` → GPT-4o.

**Infográfico:**
- **Via Tiagão**: GPT-4o → JSON brief → delega geração de imagem ao frontend via `POST /api/gemini/gerar-imagem`.
- **Via Studio-IA**: `/api/studio-ia/infografico` → estilo + orientação configurable → `generateImageBuffer` (imagem real).
- **Via Notebook**: `/api/notebook/infografico` → `generateImageBuffer`.

**Plano de Aula:**
- `/api/notebook/plano-aula` → GPT-4o → validação por 3 agentes AI paralelos:
  - Agente 1: Professor veterano (realismo)
  - Agente 2: Especialista em inclusão (acessibilidade)
  - Agente 3: Pesquisador acadêmico (bases teóricas)
- Retorna plano validado + feedback dos 3 agentes.

**PDF:**
- **Não existe geração de PDF pelo servidor**. PDFs são gerados no frontend via `use-pdf-export.ts` (provavelmente html2canvas ou jsPDF — não lido completamente).
- `exports/gerar-pdf.mjs` é um script local (Puppeteer?) para exportar o deck de slides.

**Apresentações (Deck):**
- `artifacts/studyai-deck/` — SPA separada com 17 slides hardcoded para pitch da startup (não é feature do produto em si).

### 7.2 Qualidade dos Templates

**Slides:**
Tipos de slide suportados (definidos em `tiagao-agent.ts`): `capa`, `agenda`, `conteudo`, `comparacao`, `citacao`, `encerramento`. Sem templates visuais pré-definidos — layout inteiramente definido pelo JSON gerado pela AI.

**Mapa Mental:**
Hierarquia: `root → categorias (4+) → tópicos (3+ cada) → subtópicos (4+ cada)`. Renderizado pelo `MindMapSVG` com paleta de 4 níveis e collapse/expand. Sem exportação como imagem.

**Aula-IA:**
Tipos de etapa suportados (implícito no `ChalkBoardCanvas`): texto, diagrama, equação, desenho. Estilo "lousa" com audio sincronizado.

### 7.3 Onde os Prompts de IA Estão Definidos

| Feature | Arquivo | Localização |
|---------|---------|-------------|
| Tiagão — sistema base (voz) | `routes/professor.ts:~L50` | Constante `BASE_PROMPT` (~140 linhas) |
| Tiagão — tools de conteúdo | `lib/tiagao-agent.ts` | Inline em cada `case` do `executeTiagaoTool` switch |
| Tiagão — chat texto | `routes/chat.ts` | Inline na função de build do system prompt |
| Aula-IA (geração) | `routes/aula-ia.ts` | Inline no handler `POST /gerar` |
| Notebook — 50+ endpoints | `routes/notebook.ts` | Inline em cada handler (~3606 linhas no total) |
| Notebook — personas | `routes/notebook.ts:getPersonaSystem()` | 6 personas: planejador, mestre_yoda, tia_marlene, coach_energia, cientista_maluco, narrador_epico |
| Simulado | `routes/simulado.ts` | Inline no handler |
| Redação | `routes/redacao.ts` | Inline no handler |
| Memória generativa | `lib/generativeMemory.ts` | Inline na função de extração |

**Problema:** **TODOS os prompts estão hardcoded inline nos handlers**. Não há sistema de gerenciamento de prompts, versionamento ou A/B testing de prompts.

---

## 8. Problemas e Oportunidades

### 8.1 Problemas Críticos de Segurança

| Severidade | Problema | Arquivo | Linha |
|-----------|---------|---------|-------|
| 🔴 CRÍTICO | `checkFreeUsage` hardcoded `isPremium = true` — **paywall completamente desabilitado em produção**. Todo usuário logado tem acesso ilimitado. | `lib/freeUsage.ts` | ~13 |
| 🔴 CRÍTICO | `GET /api/admin/whoami` sem autenticação — retorna `isAdmin`, `userId`, `DB record`, valores de `ADMIN_USER_IDS` env para qualquer um | `routes/admin.ts` | ~28-31 |
| 🔴 CRÍTICO | 11 endpoints de `/api/comunicacao/` **sem autenticação** — qualquer pessoa pode disparar e-mails, ler logs, alterar regras | `routes/comunicacao.ts` | vários |
| 🔴 CRÍTICO | `GET /api/admin/stats` executa `CREATE TABLE IF NOT EXISTS` e `ALTER TABLE ADD COLUMN IF NOT EXISTS` **em cada request HTTP** — migrations em handlers de request | `routes/admin.ts` | ~168-179 |
| 🟠 ALTO | `getAdminDebugInfo()` expõe `adminIdsEnv` e `adminEmailsEnv` completos na resposta | `lib/adminCheck.ts` | ~117-118 |
| 🟠 ALTO | `adminCheck.ts` **auto-promove** usuário para role `admin` no DB como efeito colateral de uma verificação de leitura | `lib/adminCheck.ts` | ~58-61, 70-72 |
| 🟠 ALTO | Endpoints Gemini (`/gerar-imagem`, `/analisar-problema`, `/explicar-texto`) sem autenticação | `routes/gemini.ts` | — |
| 🟡 MÉDIO | `idCache` Map sem TTL/eviction — crescimento ilimitado, possível memory leak em processos de longa duração | `middlewares/requireAuth.ts` | ~9 |
| 🟡 MÉDIO | `gobierno/promote` usa `isAdminUser()` sync (só env) em vez de `isAdminUserAsync()` — bypass da verificação DB | `routes/government.ts` | ~145 |

### 8.2 Problemas de Código

| Severidade | Problema | Arquivo |
|-----------|---------|---------|
| 🔴 | `notebook_overviews` table nunca criada → silent fail em todo `/api/notebook/overview` | `routes/notebook.ts` |
| 🔴 | Race paralelo em `aula-ia/gerar` cobra 2 modelos mas usa apenas o 1º → **duplo custo de AI** | `routes/aula-ia.ts:~243-261` |
| 🟠 | `!!!req.userId` tripla negação em `routes/history.ts:22,36,62,94,123` — bug de legibilidade |  |
| 🟠 | `new OpenAI(...)` instanciado **dentro do request handler** em `/risk-action` e `redacao.ts` | `routes/teacher.ts`, `routes/redacao.ts` |
| 🟠 | `isTeacherOrAdmin()` faz query DB em cada endpoint sem cache | `routes/teacher.ts` |
| 🟠 | `ALTER TABLE ADD COLUMN IF NOT EXISTS` em cada request de `/notebook/share-link` e notebooks de turma | `routes/notebook.ts`, `routes/teacher.ts` |
| 🟡 | Tiagão navega `"flashcards"` para `/app` em vez de `/flashcards` ou componente equivalente | `lib/tiagao-agent.ts:~345` |
| 🟡 | `logAiUsage` em `generativeMemory.ts` passa `userId: null` mesmo quando disponível | `lib/generativeMemory.ts:~400` |
| 🟡 | Typo: `SequenciaDidade` (deveria ser `SequenciaDidatica`) em `Notebook.tsx` | `artifacts/studyai/src/pages/Notebook.tsx` |
| 🟡 | `confirm()` nativo para deleção em `MapaMental.tsx` — bloqueia thread principal | `pages/MapaMental.tsx` |
| 🟡 | `content_text` truncado a 100k chars no save mas processado até 200k — perda silenciosa | `routes/notebook.ts` |
| 🟡 | Sem dark mode apesar de `next-themes` instalado — apenas valores light definidos em `index.css` | `artifacts/studyai/src/index.css` |

### 8.3 Problemas de Arquitetura / Manutenibilidade

| Problema | Impacto |
|---------|---------|
| `VoiceProfessor.tsx` com 989 linhas — monolito com voz, chat, proativo, câmera e UI | Alto: difícil de testar, propenso a bugs |
| `Notebook.tsx` com 6360 linhas — maior arquivo do frontend | Alto: praticamente impossível de revisar |
| `notebook.ts` (backend) com 3606 linhas — 50+ endpoints no mesmo arquivo | Alto: sem separação de responsabilidades |
| `teacher.ts` com 1726 linhas — turmas + atividades + question bank + AI copiloto | Médio |
| Todos os prompts hardcoded inline — sem versionamento, sem A/B test | Médio |
| Schema de 3 tabelas principais do Notebook fora do Drizzle (criadas via SQL cru) | Médio: divergência entre schema Drizzle e DB real |
| `conversations` e `messages` no schema mas não re-exportadas e aparentemente sem uso | Baixo: dead code no schema |
| Duplicação conceitual: `caderno` vs `notebook` — dois produtos similares para o aluno | Médio: confunde o usuário |
| `scripts/src/hello.ts` — package scripts praticamente vazio | Baixo |

### 8.4 Gaps de Funcionalidade

| Gap | Impacto no Produto |
|-----|-------------------|
| RAG do Notebook usa FTS+ILIKE mas **sem embeddings vetoriais** | Retrieval semântico de baixa qualidade vs concorrentes como NotebookLM |
| Tiagão não consegue corrigir redação, controlar Aula-IA ou marcar cronograma como completo | Experiência fragmentada — usuário precisa sair do chat para fazer essas ações |
| Sem exportação de artefatos como PDF/DOCX pelo Tiagão | Os materiais gerados ficam presos no app |
| Sem integração com Google Calendar para cronograma | Plano de estudos não sincroniza com vida real do aluno |
| Sem notificações push/e-mail para revisões SM-2 pendentes | Aluno esquece de revisar |
| Dados de performance por item de questão (`answers` no `simulado_results` é jsonb mas análise não é granular) | Sem diagnóstico de quais competências específicas o aluno erra |
| Mobile app (Expo) é read-only na maioria das features — não tem paridade com o web | Usuários mobile têm experiência inferior |
| `studyai-deck` é um artefato separado que precisa ser mantido manualmente | Pitch deck fica desatualizado se o produto evoluir |

### 8.5 Quick Wins (Melhorias Fáceis de Alto Impacto)

| Prioridade | Ação | Esforço | Impacto |
|-----------|------|---------|---------|
| 🔴 URGENTE | Remover `isPremium = true` hardcoded de `freeUsage.ts` e `subscription.ts` antes do go-live | 30min | Revenue |
| 🔴 URGENTE | Adicionar `requireAuth` nos endpoints de comunicação | 1h | Segurança |
| 🔴 URGENTE | Remover `GET /api/admin/whoami` público ou adicionar `requireAuth` + `isAdminUserAsync` | 30min | Segurança |
| 🟠 ALTO | Criar `notebook_overviews` table em `ensureNotebooksSchema()` | 15min | Correção de bug silencioso |
| 🟠 ALTO | Corrigir destino de navegação "flashcards" no Tiagão de `/app` para `/app` com parâmetro de abertura do modal | 30min | UX |
| 🟠 ALTO | Mover migrations de schema para fora dos request handlers (usar drizzle-kit push ou init script) | 2h | Estabilidade |
| 🟠 ALTO | Adicionar TTL ao `idCache` Map (ou trocar por LRU cache com max 1000 entries) | 1h | Memória |
| 🟡 MÉDIO | Mover race de `aula-ia/gerar` para usar apenas 1 modelo (eliminar duplo custo) | 1h | Custo de AI |
| 🟡 MÉDIO | Adicionar embeddings vetoriais ao RAG do Notebook (pgvector já instalado no semantic cache) | 1 semana | Qualidade de retrieval |
| 🟡 MÉDIO | Extrair prompts para arquivos `.ts` de configuração separados (constants/prompts.ts por feature) | 2-3 dias | Manutenibilidade |
| 🟡 MÉDIO | Dividir `VoiceProfessor.tsx` em subcomponentes (hooks: `useVoice`, `useProactive`; componentes: `VoiceUI`, `CommandsTab`, `ConfigTab`) | 2 dias | Manutenibilidade |
| 🟡 MÉDIO | Dividir `notebook.ts` em roteadores separados por categoria (upload, chat, generation, artifacts) | 3-4 dias | Manutenibilidade |
| 🟢 BAIXO | Corrigir typo `SequenciaDidade` → `SequenciaDidatica` | 5min | — |
| 🟢 BAIXO | Substituir `confirm()` nativo em MapaMental por modal shadcn/ui Dialog | 30min | UX |
| 🟢 BAIXO | Adicionar `userId` correto ao `logAiUsage` na generative memory | 10min | Analytics de custo |

---

## Resumo Executivo

**O que está bom:**
- Arquitetura de monorepo bem estruturada com pnpm workspaces.
- Tiagão é tecnicamente sólido: tool-calling, memória em 3 camadas, personalização por role, 16 ações disponíveis.
- Sistema SM-2 para flashcards implementado corretamente.
- Aula-IA é a feature mais polida: imersiva, bem sincronizada, UX diferenciada.
- Infraestrutura de AI madura: semantic cache 3-tier, model router, roteamento por subject, cost logging.
- Frontend multi-role (aluno/professor/escola) bem pensado.

**O que está crítico:**
1. **Paywall desabilitado** (`isPremium = true`) — risco de revenue zero em produção.
2. **Endpoints sem auth** (comunicação, Gemini, admin/whoami) — risco de segurança grave.
3. **Schema fora do Drizzle** — divergência entre ORM e banco real.
4. **Migrations em handlers HTTP** — instabilidade potencial.
5. **RAG sem embeddings** — qualidade inferior ao principal concorrente (NotebookLM).

**Principais oportunidades:**
- Implementar pgvector no RAG do Notebook (infraestrutura já existe no semantic cache).
- Expandir ações do Tiagão (correção de redação inline, controle da Aula-IA, exportação de artefatos).
- Separar prompts de código para facilitar iterações rápidas sem deploy.

---

*Auditoria realizada por leitura estática completa do repositório. Nenhuma alteração foi feita ao código.*
