import { Router, type IRouter } from "express";
import { aiChat } from "../lib/aiClient";
import { requireAuth } from "../middlewares/requireAuth";
import { getKnowledgeContext } from "../utils/knowledge-context";
import { logAiUsage } from "../lib/aiCostLogger";

const router: IRouter = Router();

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

router.post("/simulado-enem/gerar", requireAuth, async (req, res) => {
  try {
    const { dia, quantidade = 20 } = req.body as { dia: number; quantidade?: number };

    if (!dia || !ENEM_DIAS[dia]) {
      res.status(400).json({ erro: "Dia deve ser entre 1 e 4" });
      return;
    }

    const diaInfo = ENEM_DIAS[dia];
    const qtd = Math.min(Math.max(Number(quantidade), 5), 45);

    // ── Consulta automática BNCC + Wikipedia para cada área do ENEM ───────────
    const materiasPrincipais = diaInfo.materias;
    const bnccContextBlocks = await Promise.allSettled(
      materiasPrincipais.slice(0, 2).map(m =>
        getKnowledgeContext({
          query: `${diaInfo.nome} ENEM`,
          materia: m,
          objetivo: "ENEM",
          userId: req.userId,
          maxCharsPerSource: 600,
          includeLocal: false, // No user docs for ENEM standard questions
        })
      )
    );

    const bnccBlocks = bnccContextBlocks
      .filter(r => r.status === "fulfilled" && (r as PromiseFulfilledResult<any>).value.hasKnowledge)
      .map(r => (r as PromiseFulfilledResult<any>).value.contextBlock)
      .join("\n\n");

    const bnccSystemAddendum = bnccBlocks
      ? `\n\n${bnccBlocks}\n\nUse as habilidades BNCC acima para garantir que as questões sejam tecnicamente corretas e alinhadas com o currículo oficial.`
      : "";

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

    const enemSystemPrompt = `Você é um especialista em elaboração de questões do ENEM. Gere questões realistas, contextualizadas e no padrão oficial do ENEM. Responda sempre em JSON puro sem markdown.

RIGOR TÉCNICO: Toda questão deve ser tecnicamente irrefutável — fórmulas, datas, nomes, conceitos e definições devem ser exatos. Nenhuma margem para imprecisão acadêmica.${bnccSystemAddendum}`;

    const { response, config } = await aiChat({
      taskType: "fast-qa",
      messages: [
        { role: "system", content: enemSystemPrompt },
        { role: "user", content: prompt },
      ],
      jsonMode: true,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    logAiUsage({ feature: "simulado-enem", model: config.model, tokensIn: response.usage?.prompt_tokens ?? 0, tokensOut: response.usage?.completion_tokens ?? 0, userId: req.userId ?? null });
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

router.get("/simulado-enem/dias", (_req, res) => {
  res.json({ dias: ENEM_DIAS });
});

export default router;
