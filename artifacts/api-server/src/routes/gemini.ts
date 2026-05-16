/**
 * /api/gemini/* — Migrado de Gemini para GPT-4o + Claude via OpenRouter.
 * Endpoints mantidos para compatibilidade com frontend existente.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { openrouter, OR } from "../lib/aiClient";
import { logChatCompletionUsage, logTextUsage } from "../lib/aiUsageTelemetry";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// ─── POST /api/gemini/gerar-imagem ────────────────────────────────────────────
// Agora usa gpt-image-1 via OpenAI proxy
router.post("/gemini/gerar-imagem", async (req: Request, res: Response) => {
  try {
    const { topico, contexto, estilo } = req.body as {
      topico: string;
      contexto?: string;
      estilo?: "diagrama" | "mapa-conceitual" | "infografico" | "ilustracao";
    };

    if (!topico?.trim()) {
      res.status(400).json({ erro: "topico é obrigatório" });
      return;
    }

    const estiloDesc: Record<string, string> = {
      "diagrama":         "clean educational diagram with labels, white background, scientific style",
      "mapa-conceitual":  "concept map with nodes and arrows, pastel colors, clean educational layout",
      "infografico":      "educational infographic with icons and text, colorful, clear sections",
      "ilustracao":       "friendly educational illustration, semi-realistic, Brazilian school context",
    };

    const prompt = [
      `High-quality educational image for Brazilian students studying "${topico}".`,
      contexto ? `Context: ${contexto.slice(0, 300)}` : "",
      `Style: ${estiloDesc[estilo ?? "diagrama"]}.`,
      "Clear, informative, visually engaging for high school level. Portuguese text labels if any.",
    ].filter(Boolean).join(" ");

    const buffer = await generateImageBuffer(prompt);
    logTextUsage({
      userId: req.userId,
      feature: "gemini_compat_image_generation",
      model: "gpt-image-1",
      inputText: prompt,
      costUsd: 0.04,
    });
    const b64_json = buffer.toString("base64");
    res.json({ b64_json, mimeType: "image/png", topico });
  } catch (err) {
    console.error("[gemini/gerar-imagem]", err);
    res.status(500).json({ erro: "Erro ao gerar imagem" });
  }
});

// ─── POST /api/gemini/analisar-problema ───────────────────────────────────────
// Agora usa GPT-4o vision via OpenRouter
router.post("/gemini/analisar-problema", upload.single("imagem"), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { pergunta } = req.body as { pergunta?: string };

    if (!file) {
      res.status(400).json({ erro: "Imagem é obrigatória" });
      return;
    }

    const b64 = file.buffer.toString("base64");
    const mimeType = file.mimetype || "image/jpeg";

    const instrucao = pergunta?.trim()
      ? `O aluno perguntou: "${pergunta}". Analise a imagem e responda com base nela.`
      : "Analise esta questão ou exercício e resolva passo a passo de forma didática para um aluno do ensino médio.";

    const messages = [{
      role: "user" as const,
      content: [
        { type: "image_url" as const, image_url: { url: `data:${mimeType};base64,${b64}` } },
        {
          type: "text" as const,
          text: `Você é o Professor Tiagão, tutor educacional brasileiro especializado em ENEM. ${instrucao}\nResponda em português brasileiro de forma didática e clara.`,
        },
      ],
    }];
    const completion = await openrouter.chat.completions.create({
      model: OR.vision,
      max_tokens: 1500,
      messages,
    });
    logChatCompletionUsage({
      userId: req.userId,
      feature: "gemini_compat_vision_problem",
      model: OR.vision,
      messages,
      response: completion,
    });

    const texto = completion.choices[0]?.message?.content ?? "";
    if (!texto) {
      res.status(500).json({ erro: "Não consegui analisar a imagem" });
      return;
    }

    res.json({ resposta: texto });
  } catch (err) {
    console.error("[gemini/analisar-problema]", err);
    res.status(500).json({ erro: "Erro ao analisar imagem" });
  }
});

// ─── POST /api/gemini/explicar-texto ──────────────────────────────────────────
// Agora usa Claude Sonnet via OpenRouter
router.post("/gemini/explicar-texto", async (req: Request, res: Response) => {
  try {
    const { texto, nivel } = req.body as {
      texto: string;
      nivel?: "basico" | "intermediario" | "avancado";
    };

    if (!texto?.trim()) {
      res.status(400).json({ erro: "texto é obrigatório" });
      return;
    }

    const nivelMap: Record<string, string> = {
      basico:         "de forma muito simples, como se fosse para o ensino fundamental",
      intermediario:  "de forma clara para ensino médio e vestibular",
      avancado:       "de forma aprofundada, incluindo detalhes técnicos relevantes para o ENEM",
    };

    const prompt = `Você é o Professor Tiagão. Explique o seguinte conteúdo ${nivelMap[nivel ?? "intermediario"]}. Responda em português brasileiro de forma didática e engajadora.\n\n${texto.slice(0, 5000)}`;
    const messages = [{
      role: "user" as const,
      content: prompt,
    }];
    const completion = await openrouter.chat.completions.create({
      model: OR.claude,
      max_tokens: 1500,
      messages,
    });
    logChatCompletionUsage({
      userId: req.userId,
      feature: "gemini_compat_explain_text",
      model: OR.claude,
      messages,
      response: completion,
    });

    const resposta = completion.choices[0]?.message?.content ?? "";
    res.json({ resposta });
  } catch (err) {
    console.error("[gemini/explicar-texto]", err);
    res.status(500).json({ erro: "Erro ao processar texto" });
  }
});

export default router;
