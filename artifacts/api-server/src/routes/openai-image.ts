import { Router, type IRouter, type Request, type Response } from "express";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import multer from "multer";
import { logTextUsage } from "../lib/aiUsageTelemetry";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const ESTILO_PROMPTS: Record<string, string> = {
  "diagrama":
    "Clean educational scientific diagram with labeled elements, white background, professional textbook style, clear typography, Brazilian Portuguese labels if any text",
  "mapa-conceitual":
    "Educational concept map with connected nodes and directional arrows, pastel color palette, minimal clean layout, suitable for high school students in Brazil",
  "infografico":
    "Detailed educational infographic with icons, data, clear sections, vibrant colors, professional quality, relevant statistics, Portuguese captions",
  "ilustracao":
    "Detailed cinematic illustration, vivid colors, emotional depth, Brazilian cultural context, photorealistic style, high production quality",
  "wallpaper":
    "Dramatic motivational artwork, cinematic quality, epic scale, inspiring mood, rich deep colors, suitable as desktop wallpaper, no text, breathtaking composition",
  "capa":
    "Artistic book cover style, professional design, strong visual hierarchy, bold colors, creative composition representing the subject matter",
};

function estimatedImageCostUsd(size: string): number {
  return size === "1536x1024" || size === "1024x1536" ? 0.08 : 0.04;
}

// ─── POST /api/openai/gerar-imagem ───────────────────────────────────────────
// Gera imagem educacional de alta qualidade com gpt-image-1 (OpenAI)
router.post("/openai/gerar-imagem", async (req: Request, res: Response) => {
  try {
    const { topico, contexto, estilo = "ilustracao", size = "1024x1024" } = req.body as {
      topico: string;
      contexto?: string;
      estilo?: string;
      size?: "1024x1024" | "1536x1024" | "1024x1536";
    };

    if (!topico?.trim()) {
      res.status(400).json({ erro: "topico é obrigatório" });
      return;
    }

    const estiloHint = ESTILO_PROMPTS[estilo] ?? ESTILO_PROMPTS["ilustracao"];

    const prompt = [
      `High-quality educational image for Brazilian students about "${topico}".`,
      contexto ? `Context: ${contexto.slice(0, 400)}` : "",
      `Style: ${estiloHint}.`,
      "Suitable for high school ENEM/vestibular level students. Visually stunning and engaging.",
      "No watermarks. Professional quality.",
    ].filter(Boolean).join(" ");

    const buffer = await generateImageBuffer(prompt, size);
    logTextUsage({
      userId: req.userId,
      feature: "openai_image_generation",
      model: "gpt-image-1",
      inputText: prompt,
      costUsd: estimatedImageCostUsd(size),
    });
    const b64_json = buffer.toString("base64");

    res.json({ b64_json, mimeType: "image/png", topico, estilo });
  } catch (err) {
    console.error("[openai/gerar-imagem]", err);
    res.status(500).json({ erro: "Erro ao gerar imagem com OpenAI" });
  }
});

// ─── POST /api/openai/gerar-wallpaper ────────────────────────────────────────
// Gera wallpaper motivacional personalizado (16:9, alta resolução)
router.post("/openai/gerar-wallpaper", async (req: Request, res: Response) => {
  try {
    const { sonho, materia, nome } = req.body as {
      sonho?: string;
      materia?: string;
      nome?: string;
    };

    if (!sonho?.trim() && !materia?.trim()) {
      res.status(400).json({ erro: "sonho ou materia são obrigatórios" });
      return;
    }

    const sujeito = nome ? `a Brazilian student named ${nome}` : "a determined Brazilian student";
    const objetivo = sonho?.trim() || `mastering ${materia}`;
    const contextoMateria = materia ? ` studying ${materia}` : "";

    const prompt = [
      `Epic motivational artwork for ${sujeito}${contextoMateria} with the goal: "${objetivo}".`,
      "Cinematic, breathtaking composition. Brazilian context. Triumph, ambition, focus, hope.",
      "Dramatic lighting. Rich deep colors. No text, no watermarks. Landscape 16:9 format.",
      "Photorealistic style. High production quality. Suitable as a motivational desktop wallpaper.",
    ].join(" ");

    const buffer = await generateImageBuffer(prompt, "1536x1024");
    logTextUsage({
      userId: req.userId,
      feature: "openai_wallpaper_generation",
      model: "gpt-image-1",
      inputText: prompt,
      costUsd: estimatedImageCostUsd("1536x1024"),
    });
    const b64_json = buffer.toString("base64");

    res.json({ b64_json, mimeType: "image/png" });
  } catch (err) {
    console.error("[openai/gerar-wallpaper]", err);
    res.status(500).json({ erro: "Erro ao gerar wallpaper" });
  }
});

// ─── POST /api/openai/editar-imagem ──────────────────────────────────────────
// Edita imagem com IA (inpainting / variações com contexto adicional)
router.post("/openai/editar-imagem", upload.single("imagem"), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { instrucao } = req.body as { instrucao: string };

    if (!file || !instrucao?.trim()) {
      res.status(400).json({ erro: "imagem e instrucao são obrigatórios" });
      return;
    }

    const { editImages } = await import("@workspace/integrations-openai-ai-server/image");
    const fs = await import("node:fs");
    const path = await import("node:path");
    const os = await import("node:os");

    const tmpPath = path.join(os.tmpdir(), `edit_${Date.now()}.png`);
    fs.writeFileSync(tmpPath, file.buffer);

    const buffer = await editImages([tmpPath], instrucao);
    fs.unlinkSync(tmpPath);
    logTextUsage({
      userId: req.userId,
      feature: "openai_image_edit",
      model: "gpt-image-1",
      inputText: instrucao,
      costUsd: 0.08,
    });

    const b64_json = buffer.toString("base64");
    res.json({ b64_json, mimeType: "image/png" });
  } catch (err) {
    console.error("[openai/editar-imagem]", err);
    res.status(500).json({ erro: "Erro ao editar imagem" });
  }
});

export default router;
