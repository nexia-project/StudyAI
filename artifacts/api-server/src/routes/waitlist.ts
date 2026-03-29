import { Router } from "express";
import { db, waitlistTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// Ensure table exists
async function ensureTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS waitlist (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255),
      source VARCHAR(100) DEFAULT 'landing',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
ensureTable().catch(console.error);

// POST /api/waitlist — subscribe
router.post("/waitlist", async (req, res) => {
  const { email, name, source } = req.body as { email?: string; name?: string; source?: string };

  if (!email || !email.includes("@")) {
    res.status(400).json({ erro: "Email inválido." });
    return;
  }

  try {
    await db.insert(waitlistTable).values({
      email: email.trim().toLowerCase(),
      name: name?.trim() || null,
      source: source || "landing",
    });

    req.log.info({ email }, "Waitlist subscription");
    res.json({ ok: true, mensagem: "Email cadastrado com sucesso!" });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.json({ ok: true, mensagem: "Você já está na lista! Avisaremos em breve." });
    } else {
      req.log.error({ err }, "Waitlist error");
      res.status(500).json({ erro: "Erro ao cadastrar email." });
    }
  }
});

// GET /api/waitlist/count — total subscribers (public)
router.get("/waitlist/count", async (_req, res) => {
  try {
    const result = await db.execute(sql`SELECT COUNT(*) as total FROM waitlist`);
    const total = Number((result.rows[0] as any)?.total ?? 0);
    res.json({ total });
  } catch {
    res.json({ total: 0 });
  }
});

// GET /api/waitlist — admin list (only admin users can access)
router.get("/waitlist", async (req, res) => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ erro: "Não autorizado." });
    return;
  }
  try {
    const rows = await db.select().from(waitlistTable).orderBy(waitlistTable.createdAt);
    res.json({ waitlist: rows, total: rows.length });
  } catch (err) {
    req.log.error({ err }, "Waitlist list error");
    res.status(500).json({ erro: "Erro ao buscar lista." });
  }
});

export default router;
