import { Router, type IRouter } from "express";
import multer from "multer";
import OpenAI from "openai";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

router.post("/analisar", upload.single("file"), async (req, res) => {
  try {
    const { nome, serie, tempo, dificuldades, texto } = req.body as {
      nome?: string;
      serie?: string;
      tempo?: string;
      dificuldades?: string;
      texto?: string;
    };

    const perfil = `
      - Nome: ${nome || "Aluno"}
      - Série: ${serie || "Não informado"}
      - Tempo disponível por dia: ${tempo || "1 hora"}
      - Dificuldades: ${dificuldades || "Nenhuma informada"}
    `;

    if (req.file) {
      const base64 = req.file.buffer.toString("base64");
      const mimeType = req.file.mimetype;

      const content: ContentPart[] = [
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${base64}` },
        },
        {
          type: "text",
          text: `Analise esta imagem de conteúdo escolar.\n\nPerfil do aluno:\n${perfil}\n\nCrie um plano de estudos personalizado com:\n- Matéria e tópicos identificados\n- Plano dia a dia (use os dias disponíveis)\n- Atividades práticas para cada dia\n- Dicas de memorização\n- Mensagem motivacional personalizada para ${nome || "o aluno"}`,
        },
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Você é uma IA tutora educacional. Analise o conteúdo e crie um plano de estudos personalizado em português, formatado em Markdown de forma clara e organizada.",
          },
          { role: "user", content },
        ],
        max_tokens: 2000,
      });

      res.json({ plano: response.choices[0].message.content });
    } else if (texto) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Você é uma IA tutora educacional. Analise o conteúdo e crie um plano de estudos personalizado em português, formatado em Markdown.",
          },
          {
            role: "user",
            content: `Conteúdo enviado pelo aluno:\n${texto}\n\nPerfil do aluno:\n${perfil}\n\nCrie um plano de estudos personalizado com:\n- Matéria e tópicos identificados\n- Plano dia a dia\n- Atividades práticas\n- Dicas de memorização\n- Mensagem motivacional personalizada para ${nome || "o aluno"}`,
          },
        ],
        max_tokens: 2000,
      });

      res.json({ plano: response.choices[0].message.content });
    } else {
      res.status(400).json({ erro: "Envie uma imagem ou texto para análise." });
    }
  } catch (error) {
    req.log.error({ error }, "Erro ao processar análise");
    res
      .status(500)
      .json({ erro: "Erro ao processar: " + (error as Error).message });
  }
});

export default router;
