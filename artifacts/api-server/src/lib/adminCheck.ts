import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

function getAdminIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS || "";
  const ids = raw.split(",").map(s => s.trim()).filter(Boolean);
  return new Set(ids);
}

export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return getAdminIds().has(String(userId));
}

// Async version — checks env var OR role='admin' in DB (by id OR clerk_id)
export async function isAdminUserAsync(userId: string | null | undefined): Promise<boolean> {
  if (!userId) {
    console.error("[adminCheck] isAdminUserAsync called with null/undefined userId");
    return false;
  }

  const adminIds = getAdminIds();
  console.log("[adminCheck] checking userId:", userId, "| adminIds:", [...adminIds]);

  if (adminIds.has(String(userId))) {
    console.log("[adminCheck] userId found in ADMIN_USER_IDS — granted");
    return true;
  }

  try {
    // Check by primary id OR by clerk_id column (handles production/dev Clerk ID mismatch)
    const result = await db.execute(sql`
      SELECT role FROM users
      WHERE id = ${userId} OR clerk_id = ${userId}
      LIMIT 1
    `);
    const row = (result.rows as any[])[0];
    console.log("[adminCheck] DB role for", userId, "=", row?.role ?? "not found");
    return row?.role === "admin";
  } catch (err) {
    console.error("[adminCheck] DB error:", err);
    return false;
  }
}
