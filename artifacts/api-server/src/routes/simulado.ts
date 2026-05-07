import { Router, type IRouter } from "express";
import { openai, OR } from "../lib/aiClient";
import { getKnowledgeContext } from "../utils/knowledge-context";
import { logAiUsage } from "../lib/aiCostLogger";
import { isMathScienceSubject } from "../lib/modelRouter";
import { cacheGet, cacheSave } from "../lib/semanticCache";

const router: IRouter = Router();

const SIMULADO_SYSTEM_PROMPT = `Professor criador de simulados em pt-BR. Responda SOMENTE JSON puro sem markdown:
{"titulo":"Simulado - [tema]","tempoMinutos":25,"perguntas":[{"id":1,"enunciado":"...","opcoes":{"A":"...","B":"...","C":"...","D":"..."},"correta":"B","explicacao":"Por que B é certa (1 frase). Dica rápida."}]}
REGRAS: "correta" = exatamente A/B/C/D. Distribua respostas corretas uniformemente. Explicações em 1-2 frases. Adapte nível escolar.`;

const QUESTION_FORMATS = [
  "definição direta do material",
  "aplicação prática do conceito",
  "identificar afirmação INCORRETA",
  "cálculo com dados do material",
  "comparação entre conceitos",
  "causa e efeito do material",
  "completar lacuna com termo específico",
  "interpretar situação-problema",
  "relação entre conceitos",
  "questão de interpretação/conclusão",
];

function shuffleArray<T>(arr: T[]): T[] {
  return arr
    .map((v) => ({ v, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ v }) => v);
}

router.post("/simulado", async (req, res) => {
  try {
    const { materia, serie, resumo, diasConteudo, conteudoTexto } = req.body as {
      materia: string;
      serie: string;
      resumo: string;
      diasConteudo: string;
      conteudoTexto?: string;
    };

    if (!materia || !resumo) {
      res.status(400).json({ erro: "Dados insuficientes para gerar o simulado." });
      return;
    }

    // ── Cache semântico — reusa simulado gerado para o mesmo conteúdo ─────────
    const cacheKey = `${materia}|${serie}|${resumo.slice(0, 150)}`;
    const cached = await cacheGet("simulado", cacheKey);
    if (cached.hit) {
      try {
        const simulado = JSON.parse(cached.response);
        res.json({ simulado });
        return;
      } catch { /* continua para gerar novo */ }
    }

    // Keep questions fixed at 10 to ensure the response always fits within token budget.
    // More variation comes from the randomized formats and seed, not from quantity.
    const numQuestoes = 10;
    const seed = Math.floor(Math.random() * 999999);
    const shuffledFormats = shuffleArray(QUESTION_FORMATS).slice(0, numQuestoes);
    const targetDistribution = shuffleArray(["A","B","C","D","A","B","C","D","A","B"]).slice(0, numQuestoes);

    // ── Consulta automática: BNCC + Wikipedia + base do aluno ─────────────────
    const knowledgeCtx = await getKnowledgeContext({
      query: resumo.slice(0, 150),
      materia,
      serie,
      userId: (req as any).userId,
      maxCharsPerSource: 800,
    });

    // Trim raw content to 2500 chars — enough context for 10 questions,
    // reduced from 4000 to cut ~375 input tokens (faster model inference).
    const rawContent = (conteudoTexto || "").trim().slice(0, 2500);
    const hasRealContent = rawContent.length > 100;

    let contentSection = "";
    if (hasRealContent) {
      contentSection = `MATERIAL REAL DO ALUNO (fonte primária obrigatória das questões):
---
${rawContent}
---

Tópicos estruturados do plano (use como complemento):
${diasConteudo}`;
    } else {
      contentSection = `Conteúdo detalhado por dia:
${diasConteudo}`;
    }

    // Inject BNCC + Wikipedia into the system prompt for grounding
    const enrichedSystemPrompt = knowledgeCtx.hasKnowledge
      ? SIMULADO_SYSTEM_PROMPT + knowledgeCtx.contextBlock
      : SIMULADO_SYSTEM_PROMPT;

    const userContent = `Matéria: ${materia} | Série: ${serie} | Resumo: ${resumo}
${contentSection}
Distribuição: ${targetDistribution.map((l, i) => `Q${i + 1}→${l}`).join(", ")}
Formatos: ${shuffledFormats.map((f, i) => `Q${i + 1}:${f}`).join(" | ")}
Gere 10 questões. Dificuldade crescente: Q1-3 fácil, Q4-6 médio, Q7-9 difícil, Q10 desafio.`;

    // Exatas → DeepSeek R1 (raciocínio matemático via OpenRouter); demais → GPT-4o-mini
    const useMathModel = isMathScienceSubject(materia);
    const chosenModel = useMathModel ? OR.reasoning : OR.fast;

    // DeepSeek R1 e GPT-4o-mini ambos suportam system role via OpenRouter
    const response = await openai.chat.completions.create({
      model: chosenModel,
      messages: [
        { role: "system", content: enrichedSystemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 3000,
      temperature: 0.9,
      response_format: { type: "json_object" },
    });

    const respAny = response as any;
    logAiUsage({ feature: "simulado", model: chosenModel, tokensIn: respAny.usage?.prompt_tokens ?? 0, tokensOut: respAny.usage?.completion_tokens ?? 0 });

    const choice = respAny.choices[0];

    // If model was cut off mid-response, fail fast with a clear message
    if (choice.finish_reason === "length") {
      res.status(500).json({ erro: "O simulado gerado foi muito longo. Tente novamente — cada geração usa semente diferente." });
      return;
    }

    const content = choice.message.content;
    if (!content) {
      res.status(500).json({ erro: "Resposta vazia da IA. Tente novamente." });
      return;
    }

    let simulado: unknown;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      simulado = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      req.log.error({ contentLength: content.length, finish_reason: choice.finish_reason }, "JSON inválido na resposta do simulado");
      res.status(500).json({ erro: "A IA retornou um formato inválido. Tente novamente — cada tentativa gera variações diferentes." });
      return;
    }

    cacheSave("simulado", cacheKey, JSON.stringify(simulado), chosenModel).catch(() => {});
    res.json({ simulado });
  } catch (error) {
    req.log.error({ error }, "Erro ao gerar simulado");
    res.status(500).json({ erro: "Erro ao gerar simulado: " + (error as Error).message });
  }
});

export default router;
