import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { getKnowledgeContext } from "../utils/knowledge-context";
import { logAiUsage } from "../lib/aiCostLogger";
import { isMathScienceSubject } from "../lib/modelRouter";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? "dummy",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

    // Exatas → o1-mini (raciocínio simbólico/matemático); demais → gpt-4o-mini
    const useMathModel = isMathScienceSubject(materia);
    const chosenModel = useMathModel ? "o1-mini" : "gpt-4o-mini";

    let response: Awaited<ReturnType<typeof openai.chat.completions.create>>;

    if (useMathModel) {
      // o1-mini não suporta: system role, temperature, response_format
      // Combina system prompt + user content em uma única mensagem user
      response = await openai.chat.completions.create({
        model: "o1-mini",
        messages: [
          {
            role: "user",
            content: `${enrichedSystemPrompt}\n\n${userContent}\n\nRetorne SOMENTE JSON válido sem markdown.`,
          },
        ],
        max_completion_tokens: 3000,
      } as Parameters<typeof openai.chat.completions.create>[0]);
    } else {
      response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: enrichedSystemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 3000,
        temperature: 1.0,
        response_format: { type: "json_object" },
      });
    }

    logAiUsage({ feature: "simulado", model: chosenModel, tokensIn: response.usage?.prompt_tokens ?? 0, tokensOut: response.usage?.completion_tokens ?? 0 });

    const choice = response.choices[0];

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

    res.json({ simulado });
  } catch (error) {
    req.log.error({ error }, "Erro ao gerar simulado");
    res.status(500).json({ erro: "Erro ao gerar simulado: " + (error as Error).message });
  }
});

export default router;
