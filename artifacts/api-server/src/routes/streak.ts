import { Router } from "express";
import { db, userActivityTable } from "@workspace/db";
import { sql, eq, desc } from "drizzle-orm";

const router = Router();

// Table is created by ensureAllSchemas() at boot — no duplicate DDL needed here.

// POST /api/activity — record today's study activity (upsert)
router.post("/activity", async (req, res) => {
  const user = (req as any).user;
  if (!user) { res.status(401).json({ erro: "Não autenticado." }); return; }

  const today = new Date().toISOString().slice(0, 10);
  try {
    await db.execute(sql`
      INSERT INTO user_activity (user_id, study_date)
      VALUES (${user.id}, ${today})
      ON CONFLICT (user_id, study_date) DO NOTHING
    `);
    res.json({ ok: true, date: today });
  } catch (err) {
    req.log.error({ err }, "Activity record error");
    res.status(500).json({ erro: "Erro ao registrar atividade." });
  }
});

// GET /api/streak — calculate current streak, longest streak, total days
router.get("/streak", async (req, res) => {
  const user = (req as any).user;
  if (!user) { res.status(401).json({ erro: "Não autenticado." }); return; }

  try {
    const rows = await db.execute(sql`
      SELECT study_date FROM user_activity
      WHERE user_id = ${user.id}
      ORDER BY study_date DESC
    `);

    const dates: string[] = (rows.rows as any[]).map((r) => r.study_date as string);
    if (dates.length === 0) {
      res.json({ currentStreak: 0, longestStreak: 0, totalDays: 0 });
      return;
    }

    // Calculate current streak
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let currentStreak = 0;

    // Only count streak if studied today or yesterday
    if (dates[0] === today || dates[0] === yesterday) {
      let checkDate = dates[0] === today ? today : yesterday;
      for (const d of dates) {
        if (d === checkDate) {
          currentStreak++;
          const prev = new Date(new Date(checkDate).getTime() - 86400000);
          checkDate = prev.toISOString().slice(0, 10);
        } else {
          break;
        }
      }
    }

    // Longest streak
    let longestStreak = 0;
    let tempStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(new Date(dates[i - 1]).getTime() - 86400000).toISOString().slice(0, 10);
      if (dates[i] === prev) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak, 1);

    res.json({ currentStreak, longestStreak, totalDays: dates.length });
  } catch (err) {
    req.log.error({ err }, "Streak fetch error");
    res.json({ currentStreak: 0, longestStreak: 0, totalDays: 0 });
  }
});

export default router;
