import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();
const openai = new OpenAI();

const ENEM_DIAS: Record<number, { nome: string; materias: string[]; descricao: string }> = {
  1: {
    nome: "Linguagens e Códigos",
    descricao: "Língua Portuguesa, Literatura, Artes, Educação Física, Inglês/Espanhol",
    materias: ["Língua Portuguesa", "Literatura", "Inglês", "Arte", "Educação Física"],
  },
  2: {
    nome: "Ciências Humanas",
    descricao: "História, Geografia, Filosofia e Sociologia",
    materias: ["História", "Geografia", "Filosofia", "Sociologia"],
  },
  3: {
    nome: "Ciências da Natureza",
    descricao: "Física, Química e Biologia",
    materias: ["Física", "Química", "Biologia"],
  },
  4: {
    nome: "Matemática e suas Tecnologias",
    descricao: "Matemática — 45 questões",
    materias: ["Matemática"],
  },
};

router.post("/api/simulado-enem/gerar", requireAuth, async (req, res) => {
  try {
    const { dia, quantidade = 20 } = req.body as { dia: number; quantidade?: number };

    if (!dia || !ENEM_DIAS[dia]) {
      res.status(400).json({ erro: "Dia deve ser entre 1 e 4" });
      return;
    }

    const diaInfo = ENEM_DIAS[dia];
    const qtd = Math.min(Math.max(Number(quantidade), 5), 45);

    const prompt = `Gere exatamente ${qtd} questões no estilo oficial do ENEM para o Dia ${dia}: ${diaInfo.nome}.

Matérias cobradas: ${diaInfo.materias.join(", ")}.

REGRAS OBRIGATÓRIAS:
1. Cada questão deve ter exatamente 5 alternativas (A, B, C, D, E)
2. Use contextos reais: textos, gráficos descritos, situações-problema, dados estatísticos
3. Simule o nível de dificuldade do ENEM real (varie entre fácil, médio e difícil)
4. Distribua proporcionalmente entre as matérias: ${diaInfo.materias.join(", ")}
5. Inclua contexto/enunciado antes de cada questão
6. Inclua a explicação da resposta correta

Responda SOMENTE com JSON válido:
{
  "dia": ${dia},
  "areaNome": "${diaInfo.nome}",
  "questoes": [
    {
      "numero": 1,
      "materia": "Língua Portuguesa",
      "enunciado": "Texto/contexto introdutório da questão...",
      "pergunta": "A questão propriamente dita...",
      "alternativas": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "...",
        "E": "..."
      },
      "gabarito": "C",
      "explicacao": "A alternativa C está correta porque...",
      "dificuldade": "medio"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Você é um especialista em elaboração de questões do ENEM. Gere questões realistas, contextualizadas e no padrão oficial do ENEM. Responda sempre em JSON puro sem markdown." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const data = JSON.parse(raw);

    res.json({
      ...data,
      diaInfo,
      totalTempo: "5 horas e 30 minutos",
      totalQuestoes: qtd,
    });
  } catch (err) {
    console.error("simulado-enem:", err);
    res.status(500).json({ erro: "Erro ao gerar simulado ENEM" });
  }
});

router.get("/api/simulado-enem/dias", (_req, res) => {
  res.json({ dias: ENEM_DIAS });
});

export default router;
