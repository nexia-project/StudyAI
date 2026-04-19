import { Router, Request, Response } from "express";
import OpenAI from "openai";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Gerar aula estruturada para a lousa ─────────────────────────────────────
router.post("/aula-ia/gerar", requireAuth, async (req: Request, res: Response) => {
  try {
    const { topico, estilo = "ENEM", nivel = "médio" } = req.body as {
      topico: string;
      estilo?: string;
      nivel?: string;
    };

    if (!topico?.trim()) {
      res.status(400).json({ erro: "topico é obrigatório" });
      return;
    }

    const systemPrompt = `Você é o Professor Tiagão, um tutor educacional brasileiro especialista em ${estilo}.
Crie uma aula interativa e didática sobre o tópico solicitado.
A aula deve ser dividida em etapas claras, cada uma com:
1. Uma narração em PT-BR (o que Tiagão fala — máximo 3 frases curtas, diretas, sem markdown)
2. Elementos visuais para a lousa (textos, fórmulas, destaques coloridos)

REGRAS OBRIGATÓRIAS:
- Narração: frases curtas, coloquial, animado. Ex: "Bora entender isso juntos!"
- Elementos da lousa: use JSON estruturado
- Máximo 6 etapas por aula
- Nível: ${nivel}
- Estilo: ${estilo} (adapte exemplos para vestibular/ENEM/concurso)

FORMATO JSON OBRIGATÓRIO (retorne APENAS o JSON, sem texto extra):
{
  "titulo": "string",
  "subtitulo": "string",
  "etapas": [
    {
      "id": 1,
      "narracao": "string (3 frases max, PT-BR coloquial)",
      "elementos": [
        { "tipo": "titulo", "texto": "string", "cor": "#1a1a2e" },
        { "tipo": "formula", "texto": "string", "destaque": "#fef08a" },
        { "tipo": "texto", "texto": "string" },
        { "tipo": "destaque", "texto": "string", "cor": "#bbf7d0", "corTexto": "#166534" },
        { "tipo": "seta", "texto": "string", "cor": "#6366f1" },
        { "tipo": "separador" },
        { "tipo": "exemplo", "texto": "string", "cor": "#dbeafe" }
      ],
      "duracao": 10
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Crie uma aula sobre: ${topico.trim()}` },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
      max_tokens: 2500,
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const aula = JSON.parse(raw);

    res.json(aula);
  } catch (err) {
    console.error("[aula-ia/gerar]", err);
    res.status(500).json({ erro: "Erro ao gerar aula" });
  }
});

// ─── Pergunta durante a aula ─────────────────────────────────────────────────
router.post("/aula-ia/pergunta", requireAuth, async (req: Request, res: Response) => {
  try {
    const { pergunta, topico, contexto } = req.body as {
      pergunta: string;
      topico: string;
      contexto?: string;
    };

    if (!pergunta?.trim()) {
      res.status(400).json({ erro: "pergunta é obrigatória" });
      return;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é o Professor Tiagão, tutor brasileiro animado e didático.
O aluno está assistindo uma aula sobre "${topico}".
${contexto ? `Contexto da aula: ${contexto}` : ""}
Responda a pergunta de forma MUITO curta e direta (máximo 4 frases).
Use linguagem coloquial PT-BR, seja animado e motivador.
Não use markdown. Termine com uma frase de encorajamento.`,
        },
        { role: "user", content: pergunta },
      ],
      temperature: 0.8,
      max_tokens: 250,
    });

    const resposta = completion.choices[0].message.content ?? "";
    res.json({ resposta });
  } catch (err) {
    console.error("[aula-ia/pergunta]", err);
    res.status(500).json({ erro: "Erro ao responder" });
  }
});

export default router;
