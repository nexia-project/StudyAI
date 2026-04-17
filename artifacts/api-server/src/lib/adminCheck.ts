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
  if (!userId) return false;
  if (getAdminIds().has(String(userId))) return true;
  try {
    const [row] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    return row?.role === "admin";
  } catch {
    return false;
  }
}
