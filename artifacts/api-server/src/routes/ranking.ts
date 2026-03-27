import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable, sessionsTable } from "@workspace/db";
import { simuladoResultsTable, flashcardSessionsTable, studyPlansTable } from "@workspace/db/schema";
import { eq, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

function getTier(xp: number): { name: string; color: string; emoji: string; minXp: number; maxXp: number } {
  if (xp >= 6000) return { name: "Diamante", color: "#06b6d4", emoji: "💎", minXp: 6000, maxXp: Infinity };
  if (xp >= 3000) return { name: "Platina", color: "#a855f7", emoji: "🔮", minXp: 3000, maxXp: 6000 };
  if (xp >= 1500) return { name: "Ouro", color: "#f59e0b", emoji: "🥇", minXp: 1500, maxXp: 3000 };
  if (xp >= 500)  return { name: "Prata", color: "#94a3b8", emoji: "🥈", minXp: 500, maxXp: 1500 };
  return { name: "Bronze", color: "#cd7c3a", emoji: "🥉", minXp: 0, maxXp: 500 };
}

router.get("/ranking", async (req: Request, res: Response) => {
  try {
    const [users, simuladoRows, flashcardRows, planRows] = await Promise.all([
      db.select({
        id: usersTable.id,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
        profileImageUrl: usersTable.profileImageUrl,
      }).from(usersTable),

      db.select({
        userId: simuladoResultsTable.userId,
        count: sql<number>`count(*)::int`,
        totalScore: sql<number>`sum(${simuladoResultsTable.score})::int`,
        totalQuestions: sql<number>`sum(${simuladoResultsTable.total})::int`,
      }).from(simuladoResultsTable).groupBy(simuladoResultsTable.userId),

      db.select({
        userId: flashcardSessionsTable.userId,
        sessions: sql<number>`count(*)::int`,
        totalKnown: sql<number>`sum(${flashcardSessionsTable.known})::int`,
        totalCards: sql<number>`sum(${flashcardSessionsTable.totalCards})::int`,
      }).from(flashcardSessionsTable).groupBy(flashcardSessionsTable.userId),

      db.select({
        userId: studyPlansTable.userId,
        count: sql<number>`count(*)::int`,
      }).from(studyPlansTable).groupBy(studyPlansTable.userId),
    ]);

    const simuladoMap = new Map(simuladoRows.map((r) => [r.userId, r]));
    const flashcardMap = new Map(flashcardRows.map((r) => [r.userId, r]));
    const planMap = new Map(planRows.map((r) => [r.userId, r]));

    const ranked = users
      .map((u) => {
        const sim = simuladoMap.get(u.id);
        const flash = flashcardMap.get(u.id);
        const plan = planMap.get(u.id);

        const simCount = sim?.count ?? 0;
        const simXp = sim
          ? Math.round(
              sim.count * 50 +
              (sim.totalQuestions > 0 ? (sim.totalScore / sim.totalQuestions) * 150 * sim.count : 0)
            )
          : 0;
        const flashXp = flash
          ? Math.round(
              flash.totalCards > 0
                ? (flash.totalKnown / flash.totalCards) * 50 * flash.sessions
                : 0
            )
          : 0;
        const planXp = (plan?.count ?? 0) * 25;
        const totalXp = simXp + flashXp + planXp;

        const simAccuracy = sim && sim.totalQuestions > 0
          ? Math.round((sim.totalScore / sim.totalQuestions) * 100)
          : 0;

        const displayName = u.firstName
          ? u.lastName
            ? `${u.firstName} ${u.lastName.charAt(0)}.`
            : u.firstName
          : u.email?.split("@")[0] ?? "Anônimo";

        return {
          id: u.id,
          displayName,
          profileImageUrl: u.profileImageUrl,
          xp: totalXp,
          simCount,
          simAccuracy,
          flashSessions: flash?.sessions ?? 0,
          planCount: plan?.count ?? 0,
          tier: getTier(totalXp),
        };
      })
      .filter((u) => u.xp > 0 || u.simCount > 0 || u.planCount > 0 || u.flashSessions > 0)
      .sort((a, b) => b.xp - a.xp)
      .map((u, i) => ({ ...u, rank: i + 1 }));

    const currentUserId = req.user?.id;
    let currentUserEntry = null;
    if (currentUserId) {
      const found = ranked.find((r) => r.id === currentUserId);
      if (found) {
        currentUserEntry = found;
      } else {
        const u = users.find((u) => u.id === currentUserId);
        if (u) {
          currentUserEntry = {
            id: u.id,
            displayName: u.firstName ?? u.email?.split("@")[0] ?? "Você",
            profileImageUrl: u.profileImageUrl,
            xp: 0,
            simCount: 0,
            simAccuracy: 0,
            flashSessions: 0,
            planCount: 0,
            tier: getTier(0),
            rank: ranked.length + 1,
          };
        }
      }
    }

    res.json({
      leaderboard: ranked.slice(0, 20),
      currentUser: currentUserEntry,
      totalPlayers: ranked.length,
    });
  } catch (err) {
    req.log.error({ err }, "Ranking error");
    res.status(500).json({ erro: "Erro ao buscar ranking" });
  }
});

export default router;
