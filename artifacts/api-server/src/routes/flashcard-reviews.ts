import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// SM-2 algorithm: calculate next interval based on quality (0-5)
function sm2(interval: number, easeFactor: number, quality: number): { interval: number; easeFactor: number } {
  if (quality < 3) {
    return { interval: 1, easeFactor: Math.max(1.3, easeFactor - 0.2) };
  }
  let newInterval: number;
  if (interval === 1) newInterval = 3;
  else if (interval === 3) newInterval = 7;
  else newInterval = Math.round(interval * easeFactor);

  const newEF = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  return { interval: newInterval, easeFactor: Number(newEF.toFixed(2)) };
}

// GET /api/flashcard-reviews/due — retorna flashcards com revisão devida hoje
router.get("/api/flashcard-reviews/due", requireAuth, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT id, materia, pergunta, resposta, interval_days, ease_factor, review_count, next_review
      FROM flashcard_reviews
      WHERE user_id = ${req.userId!}
        AND next_review <= NOW()
      ORDER BY next_review ASC
      LIMIT 30
    `);
    res.json({ cards: rows.rows, total: rows.rows.length });
  } catch (err) {
    console.error("flashcard-reviews/due:", err);
    res.status(500).json({ erro: "Erro ao buscar revisões" });
  }
});

// POST /api/flashcard-reviews/add — adiciona flashcard à fila de revisão
router.post("/api/flashcard-reviews/add", requireAuth, async (req, res) => {
  try {
    const { cards } = req.body as { cards: Array<{ materia: string; pergunta: string; resposta: string }> };
    if (!cards?.length) { res.status(400).json({ erro: "cards obrigatório" }); return; }

    for (const card of cards.slice(0, 50)) {
      await db.execute(sql`
        INSERT INTO flashcard_reviews (user_id, materia, pergunta, resposta)
        VALUES (${req.userId!}, ${card.materia}, ${card.pergunta}, ${card.resposta})
        ON CONFLICT DO NOTHING
      `);
    }
    res.json({ sucesso: true, adicionados: cards.length });
  } catch (err) {
    console.error("flashcard-reviews/add:", err);
    res.status(500).json({ erro: "Erro ao adicionar flashcards" });
  }
});

// POST /api/flashcard-reviews/responder — responde e reagenda flashcard
router.post("/api/flashcard-reviews/responder", requireAuth, async (req, res) => {
  try {
    const { cardId, quality } = req.body as { cardId: string; quality: number }; // quality 0-5
    if (!cardId || quality === undefined) {
      res.status(400).json({ erro: "cardId e quality obrigatórios" });
      return;
    }

    const rows = await db.execute(sql`
      SELECT id, interval_days, ease_factor, review_count
      FROM flashcard_reviews
      WHERE id = ${cardId} AND user_id = ${req.userId!}
      LIMIT 1
    `);

    if (!rows.rows.length) { res.status(404).json({ erro: "Card não encontrado" }); return; }
    const card = rows.rows[0] as any;

    const { interval, easeFactor } = sm2(
      Number(card.interval_days),
      Number(card.ease_factor),
      Math.max(0, Math.min(5, Number(quality))),
    );

    await db.execute(sql`
      UPDATE flashcard_reviews
      SET interval_days = ${interval},
          ease_factor = ${easeFactor},
          review_count = review_count + 1,
          next_review = NOW() + INTERVAL '1 day' * ${interval},
          updated_at = NOW()
      WHERE id = ${cardId} AND user_id = ${req.userId!}
    `);

    res.json({ sucesso: true, proximaRevisao: `${interval} dia(s)` });
  } catch (err) {
    console.error("flashcard-reviews/responder:", err);
    res.status(500).json({ erro: "Erro ao salvar resposta" });
  }
});

// GET /api/flashcard-reviews/stats — estatísticas de revisão
router.get("/api/flashcard-reviews/stats", requireAuth, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE next_review <= NOW()) as due_hoje,
        COUNT(*) as total,
        SUM(review_count) as total_revisoes
      FROM flashcard_reviews
      WHERE user_id = ${req.userId!}
    `);
    res.json(rows.rows[0] || { due_hoje: 0, total: 0, total_revisoes: 0 });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar stats" });
  }
});

export default router;
