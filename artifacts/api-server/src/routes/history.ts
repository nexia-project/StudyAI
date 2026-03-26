import { Router } from "express";
import { db } from "@workspace/db";
import {
  studyPlansTable,
  simuladoResultsTable,
  flashcardSessionsTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

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

// POST /api/history/plan — save a study plan
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
  res.json({ id: inserted.id });
});

// POST /api/history/simulado — save a simulado result
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
  res.json({ id: inserted.id });
});

// POST /api/history/flashcard — save a flashcard session
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
  res.json({ id: inserted.id });
});

export default router;
