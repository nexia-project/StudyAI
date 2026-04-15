import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
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
    const segment = req.query.segment as string | undefined;
    const escolaFilter = req.query.escola as string | undefined;
    const cidadeFilter = req.query.cidade as string | undefined;
    const estadoFilter = req.query.estado as string | undefined;

    const [users, simuladoRows, flashcardRows, planRows] = await Promise.all([
      db.select({
        id: usersTable.id,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
        profileImageUrl: usersTable.profileImageUrl,
        studentName: usersTable.studentName,
        storedXp: usersTable.xp,
        studentSchoolType: usersTable.studentSchoolType,
        studentGrade: usersTable.studentGrade,
        escola: usersTable.escola,
        cidade: usersTable.cidade,
        estado: usersTable.estado,
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

    // Filter by segment if provided
    let filteredUsers = segment && segment !== "todos"
      ? users.filter((u) => {
          const tipo = u.studentSchoolType?.toLowerCase() ?? "";
          const serie = u.studentGrade?.toLowerCase() ?? "";
          if (segment === "fundamental") return serie.includes("fund") || serie.includes("6°") || serie.includes("7°") || serie.includes("8°") || serie.includes("9°") || tipo === "publica" && serie.includes("fund");
          if (segment === "medio") return serie.includes("1°") || serie.includes("2°") || serie.includes("3°") || serie.includes("médio") || serie.includes("medio") || serie.includes("enem");
          if (segment === "superior") return tipo === "faculdade" || serie.includes("superior") || serie.includes("faculdade") || serie.includes("univers");
          if (segment === "cursinho") return tipo === "cursinho" || serie.includes("cursinho") || serie.includes("concurso") || serie.includes("oab") || serie.includes("militar");
          return true;
        })
      : users;

    // Filter by escola/cidade/estado if provided
    if (escolaFilter) {
      const esc = escolaFilter.toLowerCase();
      filteredUsers = filteredUsers.filter(u => u.escola?.toLowerCase().includes(esc));
    }
    if (cidadeFilter) {
      const cid = cidadeFilter.toLowerCase();
      filteredUsers = filteredUsers.filter(u => u.cidade?.toLowerCase().includes(cid));
    }
    if (estadoFilter && estadoFilter !== "todos") {
      filteredUsers = filteredUsers.filter(u => u.estado?.toUpperCase() === estadoFilter.toUpperCase());
    }

    const ranked = filteredUsers
      .map((u) => {
        const sim = simuladoMap.get(u.id);
        const flash = flashcardMap.get(u.id);
        const plan = planMap.get(u.id);

        const simCount = sim?.count ?? 0;
        const simAccuracy = sim && sim.totalQuestions > 0
          ? Math.round((sim.totalScore / sim.totalQuestions) * 100)
          : 0;

        const totalXp = u.storedXp ?? 0;

        const displayName = u.studentName
          ? u.studentName
          : u.firstName
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
          schoolType: u.studentSchoolType,
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
        const u = filteredUsers.find((u) => u.id === currentUserId);
        if (u) {
          const displayName = u.studentName || u.firstName || u.email?.split("@")[0] || "Você";
          currentUserEntry = {
            id: u.id,
            displayName,
            profileImageUrl: u.profileImageUrl,
            xp: u.storedXp ?? 0,
            simCount: 0,
            simAccuracy: 0,
            flashSessions: 0,
            planCount: 0,
            tier: getTier(u.storedXp ?? 0),
            rank: ranked.length + 1,
            schoolType: u.studentSchoolType,
          };
        }
      }
    }

    res.json({
      leaderboard: ranked.slice(0, 50),
      currentUser: currentUserEntry,
      totalPlayers: ranked.length,
      segment: segment ?? "todos",
    });
  } catch (err) {
    req.log.error({ err }, "Ranking error");
    res.status(500).json({ erro: "Erro ao buscar ranking" });
  }
});

export default router;
