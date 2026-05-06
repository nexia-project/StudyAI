import { Router, type IRouter } from "express";
import { aiChat } from "../lib/aiClient";
import { logAiUsage } from "../lib/aiCostLogger";

const router: IRouter = Router();

router.post("/api/ocr-explain", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", contexto } = req.body as {
      imageBase64: string;
      mimeType?: string;
      contexto?: string;
    };

    if (!imageBase64) {
      res.status(400).json({ erro: "imageBase64 e obrigatorio" });
      return;
    }

    const systemPrompt = `Voce e o Professor Tiagao, tutor de IA do StudyAI. Sua tarefa e analisar a imagem enviada pelo aluno (pode ser pagina de livro, apostila, exercicio, diagrama, grafico, formula etc.) e dar uma explicacao didatica e motivadora, SEMPRE em portugues brasileiro.

Regras:
- Identifique o conteudo da imagem
- Explique o conteudo de forma clara e acessivel para o nivel do aluno
- Se for exercicio, resolva passo a passo
- Se for texto, resuma os pontos principais e explique os conceitos mais importantes
- Se for grafico/tabela, interprete os dados
- Use linguagem brasileira, animada, como um professor de cursinho
- Responda SEMPRE em portugues do Brasil`;

    const userContent = [
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
          ? `Analise esta imagem e explique o conteudo. Contexto adicional do aluno: "${contexto}"`
          : "Analise esta imagem e explique o conteudo de forma didatica. O que esta aqui? Como entender melhor este material?",
      },
    ];

    const { response, config } = await aiChat({
      taskType: "document-analysis",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent as any },
      ],
    });

    const explicacao = response.choices[0]?.message?.content ?? "";
    logAiUsage({ feature: "ocr-explain", model: config.model, tokensIn: response.usage?.prompt_tokens ?? 0, tokensOut: response.usage?.completion_tokens ?? 0, userId: (req as any).userId ?? null });
    res.json({ explicacao, sucesso: true });
  } catch (err) {
    console.error("OCR explain error:", err);
    res.status(500).json({ erro: "Erro ao analisar imagem" });
  }
});

export default router;
