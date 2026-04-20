import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { generateImage } from "@workspace/integrations-gemini-ai/image";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// ─── POST /api/gemini/gerar-imagem ────────────────────────────────────────────
// Gera ilustração educacional para um tópico (AulaIA, Notebook, etc.)
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

    const styleHint = estiloDesc[estilo ?? "diagrama"];

    const prompt = [
      `Create a high-quality educational image for Brazilian students studying "${topico}".`,
      contexto ? `Context: ${contexto.slice(0, 300)}` : "",
      `Style: ${styleHint}.`,
      "The image should be clear, informative, and visually engaging for high school level.",
      "Text labels in Portuguese (pt-BR) if any. No borders, no extra padding.",
    ].filter(Boolean).join(" ");

    const { b64_json, mimeType } = await generateImage(prompt);

    res.json({ b64_json, mimeType, topico });
  } catch (err) {
    console.error("[gemini/gerar-imagem]", err);
    res.status(500).json({ erro: "Erro ao gerar imagem" });
  }
});

// ─── POST /api/gemini/analisar-problema ───────────────────────────────────────
// Analisa foto de questão/exercício via multimodal Gemini
router.post("/gemini/analisar-problema", upload.single("imagem"), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { pergunta } = req.body as { pergunta?: string };

    if (!file) {
      res.status(400).json({ erro: "Imagem é obrigatória" });
      return;
    }

    const b64 = file.buffer.toString("base64");
    const mimeType = (file.mimetype || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp";

    const instrucao = pergunta?.trim()
      ? `O aluno perguntou: "${pergunta}". Analise a imagem e responda com base nela.`
      : "Analise esta questão ou exercício e resolva passo a passo de forma didática para um aluno do ensino médio.";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: { data: b64, mimeType },
          },
          {
            text: `Você é o Professor Tiagão, tutor educacional brasileiro especializado em ENEM e vestibulares. ${instrucao}
            
Responda sempre em português brasileiro. Seja didático, use emojis moderadamente, e explique conceitos de forma clara e acessível. Se for uma questão de múltipla escolha, indique a alternativa correta e explique por que as outras estão erradas.`,
          },
        ],
      }],
      config: { maxOutputTokens: 8192 },
    });

    const texto = response.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.text)
      ?.map((p: any) => p.text)
      ?.join("") ?? "";

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
// Analisa texto + imagem opcional para explicar conceito (Notebook, chat)
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

    const nivelMap = {
      basico: "de forma muito simples, como se fosse para o ensino fundamental",
      intermediario: "de forma clara para ensino médio e vestibular",
      avancado: "de forma aprofundada, incluindo detalhes técnicos relevantes para o ENEM",
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: "user",
        parts: [{
          text: `Você é o Professor Tiagão. Explique o seguinte conteúdo ${nivelMap[nivel ?? "intermediario"]}. Responda em português brasileiro de forma didática e engajadora.\n\n${texto.slice(0, 5000)}`,
        }],
      }],
      config: { maxOutputTokens: 8192 },
    });

    const resposta = response.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.text)
      ?.map((p: any) => p.text)
      ?.join("") ?? "";

    res.json({ resposta });
  } catch (err) {
    console.error("[gemini/explicar-texto]", err);
    res.status(500).json({ erro: "Erro ao processar texto" });
  }
});

export default router;
