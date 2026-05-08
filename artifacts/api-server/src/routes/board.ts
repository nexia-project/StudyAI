import { Router, type Request, type Response } from "express";
import { openai, OR } from "../lib/aiClient";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router = Router();

// ── Types ──────────────────────────────────────────────────────────────────────
interface AulaScript {
  titulo: string;
  subtitulo: string;
  etapas: Array<{
    id: number;
    narracao: string;
    elementos: Array<{ tipo: string; texto?: string; cor?: string; corTexto?: string }>;
    duracao: number;
    tipo?: "normal" | "quiz" | "resumo";
    quiz?: { pergunta: string; opcoes: string[]; correta: number; explicacao: string };
  }>;
  resumo?: string[];
}

// ── Generator ─────────────────────────────────────────────────────────────────
async function generateBoardLesson(
  userId: string,
  params: { topic: string; subject: string; difficulty: string; style?: string; type?: string }
): Promise<number> {
  const { topic, subject, difficulty } = params;

  const result = await db.execute(sql`
    INSERT INTO board_lessons (user_id, title, subject, topic, difficulty, status, script, total_steps)
    VALUES (${userId}, ${topic}, ${subject}, ${topic}, ${difficulty}, 'generating', '{}', 0)
    RETURNING id
  `);
  const lessonId = (result.rows[0] as any).id as number;

  // Generate script asynchronously
  generateScript(lessonId, params).catch((err) => {
    logger.error({ err, lessonId }, "[board] generateScript failed");
    db.execute(sql`UPDATE board_lessons SET status = 'error' WHERE id = ${lessonId}`).catch(() => {});
  });

  return lessonId;
}

async function generateScript(
  lessonId: number,
  params: { topic: string; subject: string; difficulty: string; style?: string; type?: string }
) {
  const { topic, subject, difficulty, style = "ENEM", type = "normal" } = params;
  const isProblemSolving = type === "problem_solving";

  const systemPrompt = isProblemSolving
    ? `Você é o Professor Tiagão, especialista em resolução de problemas do ENEM/vestibular.
Resolva o problema dado NA LOUSA passo a passo, como um professor real faria.`
    : `Você é o Professor Tiagão, professor carismático especialista em ${subject} para o ENEM.
Crie uma aula completa na lousa sobre "${topic}" com nível ${difficulty}, estilo "${style}".`;

  const userPrompt = `Crie uma aula completa na lousa sobre "${topic}" (${subject}, nível ${difficulty}).

Retorne JSON exatamente assim:
{
  "titulo": "string",
  "subtitulo": "string",
  "etapas": [
    {
      "id": 1,
      "narracao": "O que o professor fala (2-4 frases curtas e naturais)",
      "elementos": [
        { "tipo": "titulo", "texto": "Título do bloco" },
        { "tipo": "texto", "texto": "Explicação" },
        { "tipo": "destaque", "texto": "Conceito importante" },
        { "tipo": "formula", "texto": "Fórmula ou equação" },
        { "tipo": "exemplo", "texto": "Exemplo prático" },
        { "tipo": "seta", "texto": "Observação lateral" },
        { "tipo": "separador" }
      ],
      "duracao": 45,
      "tipo": "normal"
    }
  ],
  "resumo": ["ponto1", "ponto2", "ponto3", "ponto4", "ponto5"]
}

REGRAS:
1. Crie ENTRE 8 e 14 etapas
2. Cada etapa tem 2-5 elementos na lousa
3. A cada 4-5 etapas insira 1 etapa de quiz: "tipo":"quiz" + campo "quiz":{"pergunta":"...","opcoes":["A","B","C","D"],"correta":0,"explicacao":"..."}
4. A última etapa deve ser "tipo":"resumo" com os pontos chave
5. Narração deve soar natural, como professor real falando
6. Tipos disponíveis: titulo (grande, amarelo), texto (branco), destaque (verde), formula (amarelo, fórmula), exemplo (azul), seta (laranja, nota), separador (linha)
7. Use linguagem do ENEM — conecte ao cotidiano
8. JSON válido sem markdown

Retorne APENAS o JSON.`;

  const response = await openai.chat.completions.create({
    model: OR.materials,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 6000,
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let script: AulaScript;
  try {
    script = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON from GPT");
  }

  const totalSteps = script.etapas?.length ?? 0;

  await db.execute(sql`
    UPDATE board_lessons
    SET script = ${JSON.stringify(script)}::jsonb,
        status = 'ready',
        total_steps = ${totalSteps},
        duration_seconds = ${totalSteps * 45}
    WHERE id = ${lessonId}
  `);
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/board/generate
router.post("/board/generate", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { topic, subject = "Geral", difficulty = "medio", style = "ENEM" } = req.body;

  if (!topic?.trim()) {
    res.status(400).json({ error: "Tópico obrigatório" });
    return;
  }

  try {
    const lessonId = await generateBoardLesson(userId, {
      topic: String(topic).trim(),
      subject: String(subject),
      difficulty: String(difficulty),
      style: String(style),
    });
    res.json({ lessonId });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    logger.error({ err, msg, userId, topic }, "[board] generate error");
    res.status(500).json({ error: "Erro ao gerar aula", _debug: msg });
  }
});

// POST /api/board/solve
router.post("/board/solve", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { problem, subject = "Matemática" } = req.body;

  if (!problem?.trim()) {
    res.status(400).json({ error: "Problema obrigatório" });
    return;
  }

  try {
    const lessonId = await generateBoardLesson(userId, {
      topic: `Resolução: ${String(problem).slice(0, 100)}`,
      subject: String(subject),
      difficulty: "medio",
      style: "ENEM",
      type: "problem_solving",
    });
    res.json({ lessonId });
  } catch (err) {
    logger.error({ err }, "[board] solve error");
    res.status(500).json({ error: "Erro ao gerar resolução" });
  }
});

// GET /api/board/lessons
router.get("/board/lessons", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const subject = req.query.subject as string | undefined;
  const limit = Math.min(50, parseInt(String(req.query.limit ?? "20"), 10));

  try {
    let result;
    if (subject) {
      result = await db.execute(sql`
        SELECT id, user_id, title, subject, topic, difficulty, status, total_steps, duration_seconds, views, created_at
        FROM board_lessons
        WHERE user_id = ${userId} AND status IN ('ready', 'generating', 'error') AND subject = ${subject}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `);
    } else {
      result = await db.execute(sql`
        SELECT id, user_id, title, subject, topic, difficulty, status, total_steps, duration_seconds, views, created_at
        FROM board_lessons
        WHERE user_id = ${userId} AND status IN ('ready', 'generating', 'error')
        ORDER BY created_at DESC
        LIMIT ${limit}
      `);
    }
    res.json(result.rows);
  } catch (err) {
    logger.error({ err }, "[board] list error");
    res.status(500).json({ error: "Erro ao listar aulas" });
  }
});

// GET /api/board/:id
router.get("/board/:id", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const lessonId = parseInt(rawId, 10);

  if (isNaN(lessonId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  try {
    const result = await db.execute(sql`
      SELECT * FROM board_lessons WHERE id = ${lessonId} AND user_id = ${userId}
    `);

    if (!result.rows.length) {
      res.status(404).json({ error: "Aula não encontrada" });
      return;
    }

    const lesson = result.rows[0] as any;

    if (lesson.status === "ready") {
      db.execute(sql`
        UPDATE board_lessons SET views = views + 1, last_viewed_at = NOW()
        WHERE id = ${lessonId}
      `).catch(() => {});
    }

    res.json(lesson);
  } catch (err) {
    logger.error({ err }, "[board] get error");
    res.status(500).json({ error: "Erro ao buscar aula" });
  }
});

// DELETE /api/board/:id
router.delete("/board/:id", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const lessonId = parseInt(rawId, 10);

  if (isNaN(lessonId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  try {
    await db.execute(sql`
      DELETE FROM board_lessons WHERE id = ${lessonId} AND user_id = ${userId}
    `);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "[board] delete error");
    res.status(500).json({ error: "Erro ao excluir aula" });
  }
});

// POST /api/board/interact
router.post("/board/interact", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { lessonId, question, stepContent } = req.body;

  if (!question?.trim()) {
    res.status(400).json({ error: "Pergunta obrigatória" });
    return;
  }

  try {
    let lessonTopic = "aula";
    if (lessonId) {
      const r = await db.execute(sql`
        SELECT topic FROM board_lessons WHERE id = ${Number(lessonId)} AND user_id = ${userId}
      `);
      if (r.rows.length) lessonTopic = (r.rows[0] as any).topic ?? lessonTopic;
    }

    const response = await openai.chat.completions.create({
      model: OR.materials,
      messages: [
        {
          role: "system",
          content: `Você é o Professor Tiagão dando aula sobre "${lessonTopic}".
O aluno pausou a aula e fez uma pergunta. Responda de forma curta e clara (máximo 3 frases).
Use linguagem do ENEM — conecte à realidade, seja didático e encorajador.
Responda com JSON: { "narration": "resposta do professor" }`,
        },
        {
          role: "user",
          content: `Conteúdo atual na lousa: "${String(stepContent ?? "")}"\nPergunta do aluno: "${String(question)}"`,
        },
      ],
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(
      response.choices[0]?.message?.content ?? '{"narration":"Boa pergunta! Continue assistindo para entender melhor."}'
    );

    // Save as memory
    try {
      await db.execute(sql`
        INSERT INTO tiagao_memories (user_id, type, content, importance)
        VALUES (${userId}, 'struggle', ${`Dúvida na aula de ${lessonTopic}: "${String(question).slice(0, 200)}"`}, 3)
      `);
    } catch { /* memory table optional */ }

    res.json(result);
  } catch (err) {
    logger.error({ err }, "[board] interact error");
    res.json({ narration: "Boa pergunta! Vou explicar melhor no próximo passo." });
  }
});

// POST /api/board/:id/progress
router.post("/board/:id/progress", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const lessonId = parseInt(rawId, 10);
  const { currentStep = 0, completed = false } = req.body;

  if (isNaN(lessonId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  try {
    await db.execute(sql`
      INSERT INTO board_lesson_progress (user_id, lesson_id, current_step, completed, completed_at)
      VALUES (${userId}, ${lessonId}, ${Number(currentStep)}, ${Boolean(completed)}, ${completed ? new Date().toISOString() : null})
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET
        current_step = EXCLUDED.current_step,
        completed = EXCLUDED.completed,
        completed_at = CASE WHEN EXCLUDED.completed THEN NOW() ELSE board_lesson_progress.completed_at END
    `);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "[board] progress error");
    res.status(500).json({ error: "Erro ao salvar progresso" });
  }
});

export default router;
