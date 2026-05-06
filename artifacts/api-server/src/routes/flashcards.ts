import { Router, type IRouter } from "express";
import { openai, OR } from "../lib/aiClient";
import { checkFreeUsage } from "../lib/freeUsage";
import { getKnowledgeContext } from "../utils/knowledge-context";
import { logAiUsage } from "../lib/aiCostLogger";

const router: IRouter = Router();

const FLASHCARD_PROMPT = `Você é um especialista em criar flashcards para estudo baseado no método de Active Recall e Spaced Repetition (Anki/Leitner).

RESPONDA APENAS com um JSON válido, sem markdown. Use EXATAMENTE esta estrutura:

{
  "flashcards": [
    {
      "id": 1,
      "frente": "Pergunta curta, direta e desafiadora (máx 2 linhas). Pode ser: definição, cálculo, aplicação, identificação de erro, comparação.",
      "verso": "Resposta completa mas concisa. Inclua: resposta principal + 1 frase de contexto + 1 dica mnemônica para memorizar.",
      "categoria": "nome do tópico ou subtema",
      "nivel": "facil"
    }
  ]
}

REGRAS OBRIGATÓRIAS:
- Gere EXATAMENTE 15 flashcards
- O nível deve ser: "facil", "medio" ou "dificil" (5 de cada)
- Frente: concisa, clara, focada em UM conceito
- Verso: resposta + contexto + âncora mnemônica (ex: "Lembre-se: ...")
- Distribua pelas diferentes partes do conteúdo estudado
- Use formatos variados na Frente:
  • "O que é X?"
  • "Qual a fórmula de X?"
  • "Qual a diferença entre X e Y?"
  • "Complete: _____ acontece quando..."
  • "Verdadeiro ou Falso: X causa Y. Justifique."
  • "Em qual situação usa-se X em vez de Y?"
  • "Qual é o erro nesta afirmação: '...'"
- A âncora mnemônica no Verso deve ser criativa e memorável (acrônimo, rima, imagem mental, história)`;

router.post("/flashcards", checkFreeUsage, async (req, res) => {
  try {
    const { materia, serie, resumo, diaNumero, diaTopicos } = req.body as {
      materia: string;
      serie: string;
      resumo: string;
      diaNumero?: number;
      diaTopicos?: string;
    };

    if (!materia || !resumo) {
      res.status(400).json({ erro: "Dados insuficientes para gerar os flashcards." });
      return;
    }

    const seed = Math.floor(Math.random() * 99999);

    const scopeText = diaTopicos
      ? `Foque nos tópicos do Dia ${diaNumero}: ${diaTopicos}`
      : `Cubra os principais tópicos do conteúdo completo.`;

    // ── Consulta automática: BNCC + Wikipedia + base do aluno ─────────────────
    const knowledgeCtx = await getKnowledgeContext({
      query: diaTopicos || resumo.slice(0, 120),
      materia,
      serie,
      userId: (req as any).userId,
      maxCharsPerSource: 800,
    });

    const knowledgeBlock = knowledgeCtx.hasKnowledge
      ? `\n\nFUNDAMENTAÇÃO (use para garantir precisão — nunca invente definições ou fórmulas):\n${knowledgeCtx.contextBlock}`
      : "";

    const userContent = `Matéria: ${materia}
Série: ${serie}
Conteúdo estudado: ${resumo}
${scopeText}

Semente: #${seed} — gere flashcards originais, com âncoras mnemônicas criativas e únicas.${knowledgeBlock}

Crie 15 flashcards no formato Anki (Active Recall + Spaced Repetition) para o aluno dominar este conteúdo.`;

    const response = await openai.chat.completions.create({
      model: OR.fast,
      messages: [
        { role: "system", content: FLASHCARD_PROMPT },
        { role: "user", content: userContent },
      ],
      max_tokens: 2000,
      temperature: 1.1,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    logAiUsage({ feature: "flashcards", model: "gpt-4o-mini", tokensIn: response.usage?.prompt_tokens ?? 0, tokensOut: response.usage?.completion_tokens ?? 0, userId: (req as any).userId ?? null });
    if (!content) {
      res.status(500).json({ erro: "Erro ao gerar flashcards." });
      return;
    }

    const data = JSON.parse(content);
    res.json(data);
  } catch (error) {
    req.log.error({ error }, "Erro ao gerar flashcards");
    res.status(500).json({ erro: "Erro ao gerar flashcards: " + (error as Error).message });
  }
});

export default router;
