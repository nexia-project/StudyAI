import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ erro: "Não autenticado" });
    return;
  }
  try {
    const [row] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId))
      .limit(1);
    if (row?.role !== "admin") {
      res.status(403).json({ erro: "Acesso restrito a administradores" });
      return;
    }
    next();
  } catch (err: any) {
    console.error("[hermes] requireAdmin error:", err);
    res.status(500).json({ erro: "Erro ao verificar permissões", _debug: err?.message ?? String(err) });
  }
}
