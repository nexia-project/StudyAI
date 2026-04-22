import { type Request, type Response, type NextFunction } from "express";
import { getAuth, createClerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// ─── In-memory cache: clerkId → internalId (cleared on restart) ───────────────
const idCache = new Map<string, string>();

async function resolveInternalId(clerkId: string): Promise<string> {
  // Level 1: memory cache
  if (idCache.has(clerkId)) return idCache.get(clerkId)!;

  // Level 2: DB fast path (clerk_id column already set)
  const byClerk = await db.execute(sql`SELECT id FROM users WHERE clerk_id = ${clerkId} LIMIT 1`);
  if ((byClerk.rows as any[]).length > 0) {
    const id = (byClerk.rows as any[])[0].id as string;
    idCache.set(clerkId, id);
    return id;
  }

  // Level 3: first login — fetch user from Clerk then link by email
  const clerkUser = await clerkClient.users.getUser(clerkId);
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const firstName = clerkUser.firstName ?? null;
  const lastName = clerkUser.lastName ?? null;
  const imageUrl = clerkUser.imageUrl ?? null;

  if (email) {
    const byEmail = await db.execute(sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`);
    if ((byEmail.rows as any[]).length > 0) {
      const existingId = (byEmail.rows as any[])[0].id as string;
      await db.execute(sql`UPDATE users SET clerk_id = ${clerkId} WHERE id = ${existingId}`);
      idCache.set(clerkId, existingId);
      return existingId;
    }
  }

  // New user — create record using Clerk ID as the internal ID
  await db.execute(sql`
    INSERT INTO users (id, email, first_name, last_name, profile_image_url, clerk_id, role, created_at, updated_at)
    VALUES (${clerkId}, ${email}, ${firstName}, ${lastName}, ${imageUrl}, ${clerkId}, 'student', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET clerk_id = ${clerkId}, updated_at = NOW()
  `);
  idCache.set(clerkId, clerkId);
  return clerkId;
}

// ─── Augment Express request ───────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      isAuthenticated(): this is Request & { userId: string };
    }
  }
}

// ─── requireAuth — blocks if not authenticated ────────────────────────────────
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const clerkId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;

  if (!clerkId) {
    res.status(401).json({ erro: "Não autenticado" });
    return;
  }

  try {
    req.userId = await resolveInternalId(clerkId);
    req.isAuthenticated = function() { return true; } as any;
    next();
  } catch (err) {
    console.error("requireAuth:", err);
    res.status(401).json({ erro: "Erro de autenticação" });
  }
}

// ─── optionalAuth — does NOT block if unauthenticated ────────────────────────
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  req.isAuthenticated = function() { return !!req.userId; } as any;

  const auth = getAuth(req);
  // Try all possible locations for the user ID in the Clerk token
  const clerkId = (auth?.sessionClaims?.userId as string | undefined)
    || (auth?.sessionClaims?.sub as string | undefined)
    || auth?.userId;

  // Log on admin routes to diagnose production auth issues
  if (req.url?.includes("/admin/")) {
    const authHeader = req.headers["authorization"] ?? "NONE";
    const hasClerkCookie = !!(req.headers["cookie"] ?? "").includes("__session");
    console.log("[optionalAuth] admin request:", req.url,
      "| clerkId:", clerkId ?? "NULL",
      "| auth.userId:", auth?.userId ?? "NULL",
      "| claims.userId:", auth?.sessionClaims?.userId ?? "NULL",
      "| claims.sub:", auth?.sessionClaims?.sub ?? "NULL",
      "| Authorization header:", authHeader.slice(0, 30) + (authHeader.length > 30 ? "..." : ""),
      "| has __session cookie:", hasClerkCookie
    );
  }

  if (!clerkId) { next(); return; }

  try {
    req.userId = await resolveInternalId(clerkId);
    if (req.url?.includes("/admin/")) {
      console.log("[optionalAuth] admin resolved userId:", req.userId);
    }
  } catch (err) {
    console.error("[optionalAuth] resolveInternalId error:", err);
  }
  next();
}
