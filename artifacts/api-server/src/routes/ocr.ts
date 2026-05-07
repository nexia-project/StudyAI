import { Router, type IRouter } from "express";
import type OpenAI from "openai";
import { openaiProxy, OR } from "../lib/aiClient";

const router: IRouter = Router();

router.post("/api/ocr-explain", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", contexto } = req.body as {
      imageBase64: string;
      mimeType?: string;
      contexto?: string;
    };

    if (!imageBase64) {
      res.status(400).json({ erro: "imageBase64 é obrigatório" });
      return;
    }

    const systemPrompt = `Você é o Professor Tiagão, tutor de IA do StudyAI. Sua tarefa é analisar a imagem enviada pelo aluno (pode ser página de livro, apostila, exercício, diagrama, gráfico, fórmula etc.) e dar uma explicação didática e motivadora, SEMPRE em português brasileiro.

Regras:
- Identifique o conteúdo da imagem
- Explique o conteúdo de forma clara e acessível para o nível do aluno
- Se for exercício, resolva passo a passo
- Se for texto, resuma os pontos principais e explique os conceitos mais importantes
- Se for gráfico/tabela, interprete os dados
- Use linguagem brasileira, animada, como um professor de cursinho
- Responda SEMPRE em português do Brasil`;

    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
      {
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${imageBase64}`,
          detail: "high",
        },
      },
      {
        type: "text",
        text: contexto
          ? `Analise esta imagem e explique o conteúdo. Contexto adicional do aluno: "${contexto}"`
          : "Analise esta imagem e explique o conteúdo de forma didática. O que está aqui? Como entender melhor este material?",
      },
    ];

    const completion = await openaiProxy.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 1500,
    });

    const explicacao = completion.choices[0]?.message?.content ?? "";
    res.json({ explicacao, sucesso: true });
  } catch (err) {
    console.error("OCR explain error:", err);
    res.status(500).json({ erro: "Erro ao analisar imagem" });
  }
});

export default router;
