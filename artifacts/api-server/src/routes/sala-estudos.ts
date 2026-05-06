import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// In-memory session store (resets on restart — good enough for "online now" counter)
const activeSessions = new Map<string, { userId?: string; startedAt: number; nome?: string; meta?: string }>();

// Clean sessions older than 10 minutes
function cleanSessions() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [id, s] of activeSessions.entries()) {
    if (s.startedAt < cutoff) activeSessions.delete(id);
  }
}

// POST /api/sala-estudos/entrar — registra presença na sala
router.post("/api/sala-estudos/entrar", (req, res) => {
  const { sessionId, nome, meta } = req.body as { sessionId: string; nome?: string; meta?: string };
  if (!sessionId) { res.status(400).json({ erro: "sessionId obrigatório" }); return; }
  cleanSessions();
  activeSessions.set(sessionId, {
    userId: req.userId,
    startedAt: Date.now(),
    nome: nome ? String(nome).slice(0, 40) : undefined,
    meta: meta ? String(meta).slice(0, 100) : undefined,
  });
  res.json({ sucesso: true, online: activeSessions.size });
});

// POST /api/sala-estudos/sair — remove sessão
router.post("/api/sala-estudos/sair", (req, res) => {
  const { sessionId } = req.body as { sessionId: string };
  if (sessionId) activeSessions.delete(sessionId);
  res.json({ sucesso: true });
});

// GET /api/sala-estudos/status — retorna quantos estão online + lista de metas
router.get("/api/sala-estudos/status", (req, res) => {
  cleanSessions();
  const list = Array.from(activeSessions.values())
    .filter(s => s.nome || s.meta)
    .slice(0, 20)
    .map(s => ({ nome: s.nome, meta: s.meta }));
  res.json({ online: activeSessions.size, estudantes: list });
});

// POST /api/sala-estudos/heartbeat — renova sessão
router.post("/api/sala-estudos/heartbeat", (req, res) => {
  const { sessionId } = req.body as { sessionId: string };
  if (sessionId && activeSessions.has(sessionId)) {
    const s = activeSessions.get(sessionId)!;
    s.startedAt = Date.now();
    activeSessions.set(sessionId, s);
  }
  cleanSessions();
  res.json({ online: activeSessions.size });
});

export default router;
