/**
 * routes/videos.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/videos/search
 *   body  → { query: string, subject?: string, limit?: number }
 *   resp  → { videos: YouTubeVideo[] }
 *
 * Embed-only: nunca persistimos / proxiamos vídeo. O backend só decide QUE
 * vídeo recomendar (via YouTube Data API + whitelist + banco curado) e devolve
 * IDs + URLs `youtube-nocookie.com/embed/...`.
 *
 * Auth: `optionalAuth` (anônimo OK — busca pública de vídeos não exige login).
 * Rate-limit:
 *   TODO(rate-limit): plugar `aiLimiter` ou `generalLimiter` por IP quando o
 *   módulo crescer (cache + quota da Google já protegem hoje contra abuso
 *   básico). O orquestrador é fail-safe → não há custo de LLM nesta rota.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { getEducationalVideos, type YouTubeVideo } from "../lib/videos/get-videos.js";

interface VideosSearchPayload {
  query?: unknown;
  subject?: unknown;
  limit?: unknown;
}

const router: IRouter = Router();

router.post("/videos/search", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as VideosSearchPayload;
  const query = typeof body.query === "string" ? body.query.trim() : "";

  if (query.length < 2 || query.length > 200) {
    res.status(400).json({ erro: "Consulta deve ter entre 2 e 200 caracteres." });
    return;
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : undefined;
  let limit = 3;
  if (typeof body.limit === "number" && Number.isFinite(body.limit)) {
    limit = Math.max(1, Math.min(6, Math.floor(body.limit)));
  }

  try {
    const videos: YouTubeVideo[] = await getEducationalVideos({
      query,
      subject,
      limit,
    });
    res.json({ videos });
  } catch (err) {
    // O orquestrador é fail-safe (devolve []), mas garantimos contra
    // exceções inesperadas para nunca derrubar o pipeline do frontend.
    console.error("[videos/search]", err);
    res.json({ videos: [] });
  }
});

export default router;
