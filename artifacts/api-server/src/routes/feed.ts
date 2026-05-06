import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { simuladoResultsTable, studyPlansTable, flashcardSessionsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// GET /api/feed — recent community achievements (public, no auth required)
router.get("/feed", async (req, res) => {
  try {
    const [recentSimulados, recentPlans, recentFlashcards] = await Promise.all([
      db
        .select({
          id: simuladoResultsTable.id,
          userId: simuladoResultsTable.userId,
          materia: simuladoResultsTable.materia,
          score: simuladoResultsTable.score,
          total: simuladoResultsTable.total,
          createdAt: simuladoResultsTable.createdAt,
          firstName: usersTable.firstName,
          profileImageUrl: usersTable.profileImageUrl,
        })
        .from(simuladoResultsTable)
        .innerJoin(usersTable, eq(simuladoResultsTable.userId, usersTable.id))
        .orderBy(desc(simuladoResultsTable.createdAt))
        .limit(10),

      db
        .select({
          id: studyPlansTable.id,
          userId: studyPlansTable.userId,
          materia: studyPlansTable.materia,
          serie: studyPlansTable.serie,
          diasProva: studyPlansTable.diasProva,
          createdAt: studyPlansTable.createdAt,
          firstName: usersTable.firstName,
          profileImageUrl: usersTable.profileImageUrl,
        })
        .from(studyPlansTable)
        .innerJoin(usersTable, eq(studyPlansTable.userId, usersTable.id))
        .orderBy(desc(studyPlansTable.createdAt))
        .limit(8),

      db
        .select({
          id: flashcardSessionsTable.id,
          userId: flashcardSessionsTable.userId,
          materia: flashcardSessionsTable.materia,
          known: flashcardSessionsTable.known,
          totalCards: flashcardSessionsTable.totalCards,
          completedAt: flashcardSessionsTable.completedAt,
          firstName: usersTable.firstName,
          profileImageUrl: usersTable.profileImageUrl,
        })
        .from(flashcardSessionsTable)
        .innerJoin(usersTable, eq(flashcardSessionsTable.userId, usersTable.id))
        .orderBy(desc(flashcardSessionsTable.completedAt))
        .limit(8),
    ]);

    const events: Array<{
      id: string;
      type: "simulado" | "plano" | "flashcard";
      displayName: string;
      profileImageUrl: string | null;
      materia: string;
      detail: string;
      emoji: string;
      color: string;
      timestamp: Date;
    }> = [];

    for (const s of recentSimulados) {
      const pct = Math.round((s.score / s.total) * 100);
      // Only show results with at least 40% to avoid showing poor test results in the feed
      if (pct < 40 || s.total < 5) continue;
      const emoji = pct >= 80 ? "🏆" : pct >= 60 ? "🎯" : "📝";
      events.push({
        id: `sim-${s.id}`,
        type: "simulado",
        displayName: s.firstName ?? "Estudante",
        profileImageUrl: s.profileImageUrl,
        materia: s.materia,
        detail: `${s.score}/${s.total} questões no Simulado (${pct}%)`,
        emoji,
        color: pct >= 80 ? "text-yellow-400" : pct >= 60 ? "text-violet-400" : "text-blue-400",
        timestamp: s.createdAt,
      });
    }

    for (const p of recentPlans) {
      events.push({
        id: `plan-${p.id}`,
        type: "plano",
        displayName: p.firstName ?? "Estudante",
        profileImageUrl: p.profileImageUrl,
        materia: p.materia,
        detail: p.diasProva
          ? `Plano de ${p.diasProva} dias criado${p.serie ? ` (${p.serie})` : ""}`
          : `Novo plano criado${p.serie ? ` (${p.serie})` : ""}`,
        emoji: "📚",
        color: "text-green-400",
        timestamp: p.createdAt,
      });
    }

    for (const f of recentFlashcards) {
      const pct = f.totalCards > 0 ? Math.round((f.known / f.totalCards) * 100) : 0;
      events.push({
        id: `flash-${f.id}`,
        type: "flashcard",
        displayName: f.firstName ?? "Estudante",
        profileImageUrl: f.profileImageUrl,
        materia: f.materia,
        detail: `${f.known}/${f.totalCards} cards memorizados (${pct}%)`,
        emoji: "⚡",
        color: "text-orange-400",
        timestamp: f.completedAt,
      });
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ feed: events.slice(0, 15) });
  } catch (err) {
    req.log.error({ err }, "Feed error");
    res.status(500).json({ erro: "Erro ao buscar feed" });
  }
});

export default router;
