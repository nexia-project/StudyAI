import { db, usersTable } from "@workspace/db";
import { eq, sql, lt, and } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export const FREE_AI_LIMIT = 5;

export async function checkFreeUsage(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ erro: "Não autenticado" });
    return;
  }
  // MODO TESTE: todos os usuários logados têm acesso premium ilimitado
  (req as any).isPremium = true;
  next();
}
