import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

function getAdminIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS || "";
  const ids = raw.split(",").map(s => s.trim()).filter(Boolean);
  return new Set(ids);
}

function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || "";
  const emails = raw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return new Set(emails);
}

export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return getAdminIds().has(String(userId));
}

// Async version — checks env var OR role='admin' in DB OR email match
export async function isAdminUserAsync(userId: string | null | undefined): Promise<boolean> {
  if (!userId) {
    console.error("[adminCheck] called with null/undefined userId");
    return false;
  }

  const adminIds = getAdminIds();
  const adminEmails = getAdminEmails();

  console.log("[adminCheck] checking userId:", userId,
    "| adminIds count:", adminIds.size,
    "| adminEmails count:", adminEmails.size);

  // 1) Direct userId match in env var
  if (adminIds.has(String(userId))) {
    console.log("[adminCheck] granted via ADMIN_USER_IDS match");
    return true;
  }

  try {
    // Fetch user row (by internal id OR clerk_id)
    const result = await db.execute(sql`
      SELECT id, role, email, clerk_id FROM users
      WHERE id = ${userId} OR clerk_id = ${userId}
      LIMIT 1
    `);
    const row = (result.rows as any[])[0];

    console.log("[adminCheck] DB row for", userId, "→",
      row ? `id=${row.id} role=${row.role} email=${row.email} clerk_id=${row.clerk_id}` : "NOT FOUND");

    if (!row) return false;

    // 2) Check if internal id OR clerk_id is in ADMIN_USER_IDS
    if (adminIds.has(String(row.id)) || adminIds.has(String(row.clerk_id))) {
      console.log("[adminCheck] granted via ADMIN_USER_IDS match on resolved id/clerk_id");
      // Also promote in DB if not already admin
      if (row.role !== "admin") {
        await db.execute(sql`UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = ${row.id}`);
      }
      return true;
    }

    // 3) Email-based check (most robust — works across Clerk environments)
    if (adminEmails.size > 0 && row.email) {
      if (adminEmails.has(row.email.toLowerCase())) {
        console.log("[adminCheck] granted via ADMIN_EMAILS match for", row.email);
        // Promote in DB for future fast path
        if (row.role !== "admin") {
          await db.execute(sql`UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = ${row.id}`);
          console.log("[adminCheck] auto-promoted user to admin in DB");
        }
        return true;
      }
    }

    // 4) DB role check
    if (row.role === "admin") {
      console.log("[adminCheck] granted via DB role=admin");
      return true;
    }

    console.log("[adminCheck] DENIED — no match found");
    return false;
  } catch (err) {
    console.error("[adminCheck] DB error:", err);
    return false;
  }
}

// Returns full debug info about a user's admin status
export async function getAdminDebugInfo(userId: string | null | undefined): Promise<Record<string, any>> {
  if (!userId) return { userId: null, reason: "not authenticated" };

  const adminIds = getAdminIds();
  const adminEmails = getAdminEmails();

  let dbRow: any = null;
  try {
    const result = await db.execute(sql`
      SELECT id, role, email, clerk_id FROM users
      WHERE id = ${userId} OR clerk_id = ${userId}
      LIMIT 1
    `);
    dbRow = (result.rows as any[])[0] ?? null;
  } catch {}

  return {
    resolvedUserId: userId,
    dbRecord: dbRow ? {
      id: dbRow.id,
      email: dbRow.email,
      role: dbRow.role,
      clerk_id: dbRow.clerk_id,
    } : null,
    inAdminIds: adminIds.has(String(userId)) || (dbRow && (adminIds.has(String(dbRow.id)) || adminIds.has(String(dbRow.clerk_id)))),
    inAdminEmails: dbRow?.email ? adminEmails.has(dbRow.email.toLowerCase()) : false,
    dbRoleIsAdmin: dbRow?.role === "admin",
    adminIdsEnv: [...adminIds],
    adminEmailsEnv: [...adminEmails],
  };
}
