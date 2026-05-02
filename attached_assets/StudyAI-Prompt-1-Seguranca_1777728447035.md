Preciso que você faça EXATAMENTE estas 5 correções no código, sem inventar nada além do que está descrito. São fixes críticos de segurança e custo.

### Fix 1: Reativar paywall (freeUsage.ts)

Arquivo: `artifacts/api-server/src/lib/freeUsage.ts`

O arquivo inteiro hoje tem apenas 15 linhas com `isPremium = true` hardcoded. Substitua o conteúdo COMPLETO por:

```typescript
import { db, usersTable } from "@workspace/db";
import { eq, sql, lt, and } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export const FREE_AI_LIMIT = 5;

export async function checkFreeUsage(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ erro: "Não autenticado" });
    return;
  }

  try {
    const [user] = await db
      .select({
        stripeSubscriptionStatus: usersTable.stripeSubscriptionStatus,
        freeAiUses: usersTable.freeAiUses,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ erro: "Usuário não encontrado" });
      return;
    }

    const isPremium = user.stripeSubscriptionStatus === "active" || user.stripeSubscriptionStatus === "trialing";
    (req as any).isPremium = isPremium;

    if (isPremium) {
      next();
      return;
    }

    // Free tier: verificar limite
    if ((user.freeAiUses ?? 0) >= FREE_AI_LIMIT) {
      res.status(403).json({
        erro: "Limite gratuito atingido",
        limite: FREE_AI_LIMIT,
        usado: user.freeAiUses,
        upgrade: true,
      });
      return;
    }

    // Incrementar uso
    await db
      .update(usersTable)
      .set({ freeAiUses: sql`${usersTable.freeAiUses} + 1` })
      .where(eq(usersTable.id, req.userId));

    next();
  } catch (err) {
    console.error("checkFreeUsage error:", err);
    // Em caso de erro, permite acesso (fail-open) para não bloquear usuários
    (req as any).isPremium = false;
    next();
  }
}
```

### Fix 2: Corrigir subscription status (subscription.ts)

Arquivo: `artifacts/api-server/src/routes/subscription.ts`

Na rota `GET /subscription/status` (linhas ~10-31), substitua o handler inteiro por:

```typescript
router.get("/subscription/status", async (req: Request, res: Response) => {
  if (!req.userId) {
    res.json({ status: "free", isPremium: false, freeAiUses: 0, freeAiUsesRemaining: FREE_AI_LIMIT, freeAiLimit: FREE_AI_LIMIT, role: "student" });
    return;
  }

  try {
    const [user] = await db
      .select({
        role: usersTable.role,
        stripeSubscriptionStatus: usersTable.stripeSubscriptionStatus,
        freeAiUses: usersTable.freeAiUses,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

    const userRole = user?.role ?? "student";
    const status = user?.stripeSubscriptionStatus ?? "free";
    const isPremium = status === "active" || status === "trialing";
    const freeAiUses = user?.freeAiUses ?? 0;

    res.json({
      status,
      isPremium,
      freeAiUses,
      freeAiUsesRemaining: isPremium ? null : Math.max(0, FREE_AI_LIMIT - freeAiUses),
      freeAiLimit: FREE_AI_LIMIT,
      role: userRole,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching subscription status");
    res.status(500).json({ error: "Erro ao verificar assinatura" });
  }
});
```

Atenção: corrija também o `!!!req.userId` para `!req.userId` no `POST /subscription/create-checkout` (linha ~45). A tripla negação é um bug.

### Fix 3: Proteger endpoints admin e comunicação

**Arquivo: `artifacts/api-server/src/routes/admin.ts`**

Na rota `GET /admin/whoami` (linhas ~28-31), substitua por:

```typescript
router.get("/admin/whoami", async (req: Request, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const debug = await getAdminDebugInfo(req.userId);
  const isAdmin = await isAdminUserAsync(req.userId);
  // Não expõe debug info para não-admins
  if (!isAdmin) {
    res.json({ userId: req.userId, authenticated: true, isAdmin: false });
    return;
  }
  res.json({ userId: req.userId, authenticated: true, isAdmin, ...debug });
});
```

**Arquivo: `artifacts/api-server/src/routes/comunicacao.ts`**

No topo do arquivo, após as imports existentes, adicione:

```typescript
import { requireAuth } from "../middlewares/requireAuth";
import { isAdminUserAsync } from "../lib/adminCheck";
```

E adicione um middleware de autenticação ANTES da primeira definição de rota. Procure o primeiro `router.get` ou `router.post` e ANTES dele, adicione:

```typescript
// Proteger TODOS os endpoints de comunicação — requer auth + admin
router.use(async (req, res, next) => {
  if (!req.userId) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const isAdmin = await isAdminUserAsync(req.userId);
  if (!isAdmin) {
    res.status(403).json({ error: "Acesso negado — apenas administradores" });
    return;
  }
  next();
});
```

### Fix 4: Criar tabela notebook_overviews

Arquivo: `artifacts/api-server/src/routes/notebook.ts`

Na função `ensureNotebooksSchema()`, ANTES da linha `_schemaReady = true;` (por volta da linha 153), adicione:

```typescript
  // Cache de overviews por documento
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notebook_overviews (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL,
      doc_id INTEGER NOT NULL,
      summary TEXT DEFAULT '',
      key_topics JSONB DEFAULT '[]'::jsonb,
      faq JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, doc_id)
    )
  `);
```

### Fix 5: Eliminar custo duplo na Aula-IA

Arquivo: `artifacts/api-server/src/routes/aula-ia.ts`

Procure o bloco da "corrida paralela" (por volta das linhas 240-270) que tem `openaiRace`, `claudeRace` e `raceResult`. Substitua TODO esse bloco (desde `const openaiRace` até o `if (raceResult) { ... } else { throw ... }`) por:

```typescript
    // ── Geração: Claude primary, GPT-4o-mini fallback ──
    let raw = "";
    let modelUsed = "claude-sonnet-4-5";

    try {
      raw = await gerarAulaComClaude(topico, estilo, nivel);
    } catch (claudeErr) {
      console.warn("[aula-ia] Claude falhou, usando fallback GPT-4o-mini:", claudeErr);
      try {
        raw = await gerarAulaComOpenAI(topico, estilo, nivel);
        modelUsed = "gpt-4o-mini";
      } catch (openaiErr) {
        throw new Error("Ambos os modelos falharam ao gerar a aula");
      }
    }
```

Remova também as declarações `let raw = "";` e `let modelUsed = "gpt-4o-mini";` que existiam ANTES do bloco de race (linhas ~237-238), já que agora estão dentro do novo bloco.

---

**IMPORTANTE**: Faça APENAS essas 5 mudanças. Não mude mais nada. Não refatore. Não renomeie. Teste se o servidor sobe sem erros após as mudanças.
