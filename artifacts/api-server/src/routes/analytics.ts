import { Router } from "express";
import { db } from "@workspace/db";
import { simuladoResultsTable, flashcardSessionsTable, studyPlansTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

function trend(scores: number[]): "improving" | "declining" | "stable" {
  if (scores.length < 2) return "stable";
  const half = Math.ceil(scores.length / 2);
  const first = scores.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const last = scores.slice(-half).reduce((a, b) => a + b, 0) / half;
  const diff = last - first;
  if (diff >= 8) return "improving";
  if (diff <= -8) return "declining";
  return "stable";
}

router.get("/api/analytics/heatmap", async (req, res) => {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ error: "Não autenticado" });

  try {
    // Simulado results ordered oldest → newest
    const simulados = await db
      .select()
      .from(simuladoResultsTable)
      .where(eq(simuladoResultsTable.userId, userId))
      .orderBy(simuladoResultsTable.createdAt);

    // Flashcard sessions
    const flashcards = await db
      .select()
      .from(flashcardSessionsTable)
      .where(eq(flashcardSessionsTable.userId, userId));

    // Study plans (for subject list even without simulados)
    const plans = await db
      .select({ materia: studyPlansTable.materia })
      .from(studyPlansTable)
      .where(eq(studyPlansTable.userId, userId));

    // Group simulados by matéria
    const simByMateria: Record<string, { score: number; total: number; date: Date }[]> = {};
    for (const s of simulados) {
      const key = s.materia.trim();
      if (!simByMateria[key]) simByMateria[key] = [];
      simByMateria[key].push({ score: s.score, total: s.total, date: s.createdAt });
    }

    // Group flashcards by matéria
    const fcByMateria: Record<string, { rate: number }[]> = {};
    for (const f of flashcards) {
      const key = f.materia.trim();
      if (!fcByMateria[key]) fcByMateria[key] = [];
      const rate = f.totalCards > 0 ? (f.known / f.totalCards) * 100 : 0;
      fcByMateria[key].push({ rate });
    }

    // Collect all known subjects
    const allSubjects = new Set([
      ...Object.keys(simByMateria),
      ...Object.keys(fcByMateria),
      ...plans.map((p) => p.materia.trim()),
    ]);

    const subjects = Array.from(allSubjects).map((materia) => {
      const sims = simByMateria[materia] ?? [];
      const fcs = fcByMateria[materia] ?? [];

      const simAccuracies = sims.map((s) => (s.score / s.total) * 100);
      const avgSimScore = simAccuracies.length
        ? simAccuracies.reduce((a, b) => a + b, 0) / simAccuracies.length
        : null;

      const avgFcRate = fcs.length
        ? fcs.reduce((a, b) => a + b.rate, 0) / fcs.length
        : null;

      // Composite score: weighted blend of simulado + flashcards
      let compositeScore: number | null = null;
      if (avgSimScore !== null && avgFcRate !== null) {
        compositeScore = avgSimScore * 0.7 + avgFcRate * 0.3;
      } else if (avgSimScore !== null) {
        compositeScore = avgSimScore;
      } else if (avgFcRate !== null) {
        compositeScore = avgFcRate * 0.8; // flashcard only → conservative
      }

      const simTrend = trend(simAccuracies);

      // Last simulado date
      const lastActivity = sims.length
        ? sims[sims.length - 1].date
        : null;

      return {
        materia,
        compositeScore,
        avgSimScore,
        avgFcRate,
        totalSimulados: sims.length,
        totalFlashcardSessions: fcs.length,
        trend: simTrend,
        lastActivity,
        lastScore: simAccuracies.length ? simAccuracies[simAccuracies.length - 1] : null,
      };
    });

    // Classify: only subjects with data
    const withData = subjects.filter((s) => s.compositeScore !== null);
    const sorted = [...withData].sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0));

    const pontosFortes = sorted
      .filter((s) => (s.compositeScore ?? 0) >= 70)
      .map((s) => s.materia);

    const pontosFracos = sorted
      .filter((s) => (s.compositeScore ?? 0) < 55)
      .map((s) => s.materia);

    const withoutData = subjects.filter((s) => s.compositeScore === null);

    return res.json({
      subjects: [...sorted, ...withoutData],
      pontosFortes,
      pontosFracos,
      totalMateriasEstudadas: withData.length,
    });
  } catch (err) {
    console.error("Analytics heatmap error:", err);
    return res.status(500).json({ error: "Erro ao gerar mapa." });
  }
});

export default router;
