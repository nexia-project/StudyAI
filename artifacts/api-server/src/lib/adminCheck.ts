import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

function getAdminIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS || "";
  const ids = raw.split(",").map(s => s.trim()).filter(Boolean);
  return new Set(ids);
}

export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return getAdminIds().has(String(userId));
}

// Async version — checks env var OR role='admin' in DB
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
    const [row] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    console.log("[adminCheck] DB role for", userId, "=", row?.role ?? "not found");
    return row?.role === "admin";
  } catch (err) {
    console.error("[adminCheck] DB error:", err);
    return false;
  }
}
