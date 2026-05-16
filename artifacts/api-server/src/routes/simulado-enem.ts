import { Router, type IRouter } from "express";
import { openai, OR } from "../lib/aiClient";
import { requireAuth } from "../middlewares/requireAuth";
import { cacheGet, cacheSave } from "../lib/semanticCache";
import {
  enemDiaToArea,
  enemQuestaoToSimuladoApi,
  getEnemBankSource,
  pickRandomMcQuestions,
} from "../lib/enem/bank";

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
    const {
      dia,
      quantidade = 20,
      anos,
      incluirRedacao,
    } = req.body as {
      dia: number;
      quantidade?: number;
      anos?: number[];
      incluirRedacao?: boolean;
    };

    if (!dia || !ENEM_DIAS[dia]) {
      res.status(400).json({ erro: "Dia deve ser entre 1 e 4" });
      return;
    }

    const diaInfo = ENEM_DIAS[dia];
    const qtd = Math.min(Math.max(Number(quantidade), 5), 45);
    const area = enemDiaToArea(dia);
    if (!area) {
      res.status(400).json({ erro: "Área inválida" });
      return;
    }

    const anosKey = Array.isArray(anos) && anos.length ? [...new Set(anos)].sort().join("-") : "all";
    const src = getEnemBankSource();
    const ckEnem = `simulado-enem|${dia}|${qtd}|${src}|${anosKey}`;
    const cachedEnem = await cacheGet("simulado-enem", ckEnem);
    if (cachedEnem.hit) {
      try {
        const cached = JSON.parse(cachedEnem.response);
        res.json({ ...cached, diaInfo, totalTempo: "5 horas e 30 minutos", totalQuestoes: qtd });
        return;
      } catch {
        /* gera novo */
      }
    }

    const picked = await pickRandomMcQuestions({
      area,
      count: qtd,
      anos: Array.isArray(anos) && anos.length ? anos : undefined,
    });

    if (picked.length < Math.min(5, qtd)) {
      res.status(503).json({
        erro:
          "Banco de questões ENEM insuficiente para este filtro. Rode `pnpm --filter @workspace/api-server run ingest:enem` (JSON) e/ou `ingest:enem-db` com `ENEM_BANK_SOURCE=db`.",
        area,
        fonte: src,
        disponiveis: picked.length,
      });
      return;
    }

    const questoes = picked.map((q, i) => enemQuestaoToSimuladoApi(q, i + 1));

    let redacao: Record<string, unknown> | null = null;
    if (incluirRedacao) {
      const temaPrompt = `Proponha UM tema de redação estilo ENEM (dissertativo-argumentativo), PT-BR, com texto motivador curto (2–3 parágrafos) e comando explícito.
Responda só JSON: { "temaTitulo": string, "textoMotivador": string, "comando": string }`;

      const completion = await openai.chat.completions.create({
        model: OR.fast,
        messages: [
          {
            role: "system",
            content:
              "Você elabora temas de redação ENEM. Responda apenas JSON válido, sem markdown.",
          },
          { role: "user", content: temaPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 900,
      });
      const rawR = completion.choices[0]?.message?.content ?? "{}";
      try {
        redacao = JSON.parse(rawR) as Record<string, unknown>;
      } catch {
        redacao = { textoBruto: rawR };
      }
    }

    const data = {
      dia,
      areaNome: diaInfo.nome,
      questoes,
      ...(redacao ? { redacao } : {}),
    };

    cacheSave("simulado-enem", ckEnem, JSON.stringify(data), OR.fast).catch(() => {});

    res.json({
      ...data,
      diaInfo,
      totalTempo: "5 horas e 30 minutos",
      totalQuestoes: questoes.length,
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
