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

    const systemPrompt = `Você é o Professor Tiagão, tutor educacional brasileiro especialista em ${estilo}.
Crie uma aula DETALHADA e DIDÁTICA. Cada etapa é escrita letra por letra na lousa — o aluno lê no ritmo da escrita, então use textos completos e explicativos.

ESTRUTURA DE CADA ETAPA:
1. "narracao": O que Tiagão FALA enquanto escreve (4-6 frases, coloquial PT-BR, animado, explica cada detalhe)
2. "elementos": O que aparece escrito na lousa (textos ricos, exemplos concretos)

REGRAS DA LOUSA:
- "titulo": nome/conceito principal da etapa (texto curto e claro)
- "texto": explicação completa em 1-2 frases (não seja vago, explique de verdade)
- "formula": só para fórmulas matemáticas/científicas reais
- "destaque": conceito-chave que o aluno DEVE memorizar
- "seta": item de lista/passo de um processo
- "exemplo": situação real ou exercício do ${estilo}
- "separador": divisão visual entre seções
- Use 4-7 elementos por etapa para uma lousa rica

REGRAS DE QUALIDADE:
- Narração: professor EXPLICA enquanto escreve, não só lê o que está na lousa
- Exemplos: sempre do contexto ${estilo} (ENEM 2023, vestibulares, situação do dia a dia)
- Linguagem: "Olha só...", "Repara que...", "Aqui está o pulo do gato:", "Isso cai muito no ENEM!"
- Máximo 6 etapas por aula, mínimo 4
- Nível: ${nivel}

FORMATO JSON OBRIGATÓRIO (retorne APENAS o JSON, sem texto extra):
{
  "titulo": "string",
  "subtitulo": "string — ex: Tudo que você precisa saber para o ENEM",
  "etapas": [
    {
      "id": 1,
      "narracao": "string — 4-6 frases explicativas em PT-BR coloquial e animado",
      "elementos": [
        { "tipo": "titulo", "texto": "string", "cor": "#1a1a2e" },
        { "tipo": "texto", "texto": "string — frase completa explicando o conceito" },
        { "tipo": "formula", "texto": "string", "destaque": "#fef08a" },
        { "tipo": "destaque", "texto": "string — conceito que o aluno deve gravar", "cor": "#bbf7d0", "corTexto": "#166534" },
        { "tipo": "seta", "texto": "string — passo ou item da lista", "cor": "#6366f1" },
        { "tipo": "separador" },
        { "tipo": "exemplo", "texto": "string — exemplo real do ${estilo}", "cor": "#dbeafe" }
      ],
      "duracao": 30
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
