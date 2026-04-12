import { Router } from "express";
import { db } from "@workspace/db";
import {
  studyPlansTable,
  simuladoResultsTable,
  flashcardSessionsTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";

async function awardXp(userId: string, amount: number) {
  if (amount <= 0) return;
  await db.update(usersTable)
    .set({ xp: sql`${usersTable.xp} + ${amount}` })
    .where(eq(usersTable.id, userId));
}

const router = Router();

// GET /api/history — full history for the authenticated user
router.get("/history", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ erro: "Não autenticado." });
    return;
  }
  const userId = req.user.id;
  const [plans, simulados, flashcards] = await Promise.all([
    db.select().from(studyPlansTable).where(eq(studyPlansTable.userId, userId)).orderBy(desc(studyPlansTable.createdAt)).limit(20),
    db.select().from(simuladoResultsTable).where(eq(simuladoResultsTable.userId, userId)).orderBy(desc(simuladoResultsTable.createdAt)).limit(50),
    db.select().from(flashcardSessionsTable).where(eq(flashcardSessionsTable.userId, userId)).orderBy(desc(flashcardSessionsTable.completedAt)).limit(50),
  ]);
  res.json({ plans, simulados, flashcards });
});

// POST /api/history/plan — save a study plan (+25 XP)
router.post("/history/plan", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ erro: "Não autenticado." });
    return;
  }
  const { materia, serie, diasProva, plan } = req.body;
  if (!materia || !plan) {
    res.status(400).json({ erro: "materia e plan são obrigatórios." });
    return;
  }
  const [inserted] = await db
    .insert(studyPlansTable)
    .values({
      userId: req.user.id,
      materia,
      serie: serie ?? null,
      diasProva: diasProva ?? null,
      plan,
    })
    .returning();
  awardXp(req.user.id, 25).catch(() => {});
  res.json({ id: inserted.id, xpAwarded: 25 });
});

// POST /api/history/simulado — save a simulado result
// XP formula: 50 base + até 150 de bônus por acertos (total máx 200 por simulado)
router.post("/history/simulado", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ erro: "Não autenticado." });
    return;
  }
  const { materia, titulo, score, total, timeTaken, nota, answers, studyPlanId } = req.body;
  if (materia == null || score == null || total == null) {
    res.status(400).json({ erro: "materia, score e total são obrigatórios." });
    return;
  }
  const [inserted] = await db
    .insert(simuladoResultsTable)
    .values({
      userId: req.user.id,
      studyPlanId: studyPlanId ?? null,
      materia,
      titulo: titulo ?? null,
      score,
      total,
      timeTaken: timeTaken ?? null,
      nota: nota ?? null,
      answers: answers ?? null,
    })
    .returning();
  const accuracy = total > 0 ? score / total : 0;
  const xpAwarded = Math.round(50 + accuracy * 150);
  awardXp(req.user.id, xpAwarded).catch(() => {});
  res.json({ id: inserted.id, xpAwarded });
});

// POST /api/history/flashcard — save a flashcard session
// XP formula: até 50 XP por sessão baseado na taxa de acerto
router.post("/history/flashcard", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ erro: "Não autenticado." });
    return;
  }
  const { materia, diaNumero, totalCards, known, unknown, studyPlanId } = req.body;
  if (materia == null || totalCards == null) {
    res.status(400).json({ erro: "materia e totalCards são obrigatórios." });
    return;
  }
  const [inserted] = await db
    .insert(flashcardSessionsTable)
    .values({
      userId: req.user.id,
      studyPlanId: studyPlanId ?? null,
      materia,
      diaNumero: diaNumero ?? null,
      totalCards,
      known: known ?? 0,
      unknown: unknown ?? 0,
    })
    .returning();
  const knownCards = known ?? 0;
  const xpAwarded = totalCards > 0 ? Math.round((knownCards / totalCards) * 50) : 0;
  if (xpAwarded > 0) awardXp(req.user.id, xpAwarded).catch(() => {});
  res.json({ id: inserted.id, xpAwarded });
});

// POST /api/xp/award — award XP for topic completion from frontend (100 XP per topic)
router.post("/xp/award", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ erro: "Não autenticado." });
    return;
  }
  const { amount } = req.body as { amount?: number };
  const xp = Math.min(Math.max(Math.round(amount ?? 0), 0), 200); // cap at 200 per call
  if (xp <= 0) {
    res.json({ xpAwarded: 0 });
    return;
  }
  await awardXp(req.user.id, xp);
  const [user] = await db.select({ xp: usersTable.xp }).from(usersTable).where(eq(usersTable.id, req.user.id)).limit(1);
  res.json({ xpAwarded: xp, totalXp: user?.xp ?? 0 });
});

export default router;
