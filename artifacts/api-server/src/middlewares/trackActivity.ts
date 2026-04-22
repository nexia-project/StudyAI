import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

// In-memory set to debounce DB writes — no more than 1 write per user per 5 minutes
const recentlyTracked = new Map<string, number>();
const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

export async function trackActivity(req: Request, _res: Response, next: NextFunction) {
  next(); // always continue immediately — tracking is fire-and-forget

  const userId = req.userId;
  if (!userId) return;

  // Skip health, static, internal routes
  const url = req.url ?? "";
  if (url.includes("/healthz") || url.includes("/clerk") || url.startsWith("/assets")) return;

  const now = Date.now();
  const lastTracked = recentlyTracked.get(userId) ?? 0;
  if (now - lastTracked < DEBOUNCE_MS) return; // already tracked recently

  recentlyTracked.set(userId, now);

  // Fire and forget — no await so it never blocks the request
  Promise.all([
    // Update last_seen_at for "studying now"
    db.execute(sql`
      UPDATE users SET last_seen_at = NOW() WHERE id = ${userId} OR clerk_id = ${userId}
    `),
    // Upsert daily activity record
    db.execute(sql`
      INSERT INTO user_activity (user_id, study_date)
      VALUES (${userId}, CURRENT_DATE)
      ON CONFLICT (user_id, study_date) DO NOTHING
    `),
    // Upsert login event for today (records first login time per day)
    db.execute(sql`
      INSERT INTO login_events (user_id, event_date, event_hour)
      VALUES (${userId}, CURRENT_DATE, EXTRACT(HOUR FROM NOW())::smallint)
      ON CONFLICT (user_id, event_date) DO NOTHING
    `),
  ]).catch(err => {
    // Silently ignore tracking errors — never break the actual request
    console.error("[trackActivity] error:", err?.message ?? err);
  });
}
