/**
 * StudyAI — Cache-backed AI chat routes
 * POST /api/chat/openai  — GPT via OpenRouter (DeepSeek) com cache PostgreSQL
 * POST /api/chat/claude  — Claude via OpenRouter com cache PostgreSQL
 *
 * Cache: SHA-256(provider + type + message) → ai_cache table
 * TTL infinito — conteúdo educacional é estável o suficiente.
 */
import { Router } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { aiCacheTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { openrouter, OR } from "../lib/aiClient";

const router = Router();

// ── Model routing ────────────────────────────────────────────────────────────
type TaskType = "fast" | "deep" | "slides";

const OPENAI_MODELS: Record<TaskType, string> = {
  fast:   OR.fast,        // DeepSeek V4 Flash — baixa latência
  deep:   OR.pro,         // DeepSeek V4 Pro — análise rica
  slides: OR.materials,   // DeepSeek Chat v3 — estrutura longa
};

const CLAUDE_MODELS: Record<TaskType, string> = {
  fast:   OR.claudeFast,   // claude-3-haiku — mais barato
  deep:   OR.claude,       // claude-3.5-sonnet — qualidade alta
  slides: OR.claude,       // claude-3.5-sonnet — estrutura de conteúdo
};

function hashKey(provider: string, type: string, message: string): string {
  return crypto
    .createHash("sha256")
    .update(`${provider}::${type}::${message}`)
    .digest("hex");
}

// ── Slides prompt helper ─────────────────────────────────────────────────────
function buildSlidesPrompt(message: string): string {
  return `Crie uma apresentação educacional sobre o tema: "${message}"

Responda em JSON válido com o formato:
{
  "slides": [
    { "title": "Título do slide", "content": ["Ponto 1", "Ponto 2", "Ponto 3"] }
  ],
  "summary": "Resumo em 2-3 frases do tema"
}

Regras:
- Entre 5 e 8 slides
- Cada slide com 3 a 5 pontos objetivos
- Use linguagem clara para estudantes ENEM/vestibular
- Responda APENAS com o JSON, sem markdown ao redor`;
}

// ── Generic handler ──────────────────────────────────────────────────────────
async function handleChat(
  provider: "openai" | "claude",
  models: Record<TaskType, string>,
  message: string,
  type: TaskType,
): Promise<{ response: string; slides?: object[]; model_used: string; cached: boolean }> {
  const hash = hashKey(provider, type, message);

  // 1. Cache hit?
  const [cached] = await db
    .select()
    .from(aiCacheTable)
    .where(eq(aiCacheTable.questionHash, hash))
    .limit(1);

  if (cached) {
    const slides = cached.slidesJson ? JSON.parse(cached.slidesJson) as object[] : undefined;
    return {
      response:   cached.responseText,
      slides,
      model_used: cached.modelUsed,
      cached:     true,
    };
  }

  // 2. Cache miss → call AI
  const model = models[type];
  const isSlides = type === "slides";
  const prompt = isSlides ? buildSlidesPrompt(message) : message;

  const systemPrompt = isSlides
    ? "Você é um especialista em educação brasileira. Retorne apenas JSON válido conforme solicitado."
    : `Você é o Tiagão, tutor de IA do StudyAI — plataforma de preparação para ENEM/vestibular. 
       Responda em português brasileiro, de forma clara e educativa.
       ${type === "deep" ? "Aprofunde-se no tema com exemplos, contexto histórico e conexões interdisciplinares." : "Seja conciso e direto."}`;

  const completion = await openrouter.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: prompt },
    ],
    temperature: type === "fast" ? 0.3 : 0.6,
    max_tokens:  type === "slides" ? 2000 : type === "deep" ? 1500 : 600,
  });

  const text = completion.choices[0]?.message?.content ?? "";

  let responseText = text;
  let slidesData: object[] | undefined;

  if (isSlides) {
    try {
      const clean = text.replace(/```json\n?|```\n?/g, "").trim();
      const parsed = JSON.parse(clean) as { slides: object[]; summary: string };
      slidesData = parsed.slides;
      responseText = parsed.summary ?? text;
    } catch {
      responseText = text;
    }
  }

  // 3. Store in cache
  await db.insert(aiCacheTable).values({
    questionHash: hash,
    questionText: message,
    responseText,
    slidesJson:   slidesData ? JSON.stringify(slidesData) : null,
    modelUsed:    model,
    taskType:     type,
  }).onConflictDoNothing();

  return { response: responseText, slides: slidesData, model_used: model, cached: false };
}

// ── Routes ───────────────────────────────────────────────────────────────────
router.post("/api/chat/openai", async (req, res) => {
  const { message, type = "fast" } = req.body as { message?: string; type?: TaskType };
  if (!message?.trim()) {
    res.status(400).json({ error: "message é obrigatório" });
    return;
  }
  const result = await handleChat("openai", OPENAI_MODELS, message.trim(), type);
  res.json(result);
});

router.post("/api/chat/claude", async (req, res) => {
  const { message, type = "fast" } = req.body as { message?: string; type?: TaskType };
  if (!message?.trim()) {
    res.status(400).json({ error: "message é obrigatório" });
    return;
  }
  const result = await handleChat("claude", CLAUDE_MODELS, message.trim(), type);
  res.json(result);
});

// Stats endpoint — how many cache entries exist
router.get("/api/chat/cache/stats", async (_req, res) => {
  const rows = await db.select({ hash: aiCacheTable.questionHash }).from(aiCacheTable);
  res.json({ total_cached: rows.length });
});

export default router;
