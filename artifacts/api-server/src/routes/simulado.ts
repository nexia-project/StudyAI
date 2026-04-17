import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { getKnowledgeContext } from "../utils/knowledge-context";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SIMULADO_SYSTEM_PROMPT = `Você é um professor especialista em criar simulados variados e originais com base EXCLUSIVAMENTE no conteúdo real fornecido pelo aluno.

IDIOMA OBRIGATÓRIO: SEMPRE em português brasileiro (pt-BR). NUNCA use inglês ou outro idioma — nem uma palavra sequer. Esta regra é absoluta.

⚠️ REGRA ABSOLUTA: Todas as questões devem ser extraídas DIRETAMENTE do conteúdo real enviado pelo aluno (textos de livros, apostilas, cadernos, PDFs). NÃO invente tópicos externos. NÃO use conhecimento geral que não esteja presente no material. Se o material fala de personagens, datas, fórmulas, teoremas ou conceitos específicos, as questões DEVEM ser sobre esses elementos concretos do material.

RESPONDA APENAS com um JSON válido, sem markdown. Estrutura EXATA:

{
  "titulo": "Simulado - [Nome exato do conteúdo identificado no material]",
  "tempoMinutos": 25,
  "perguntas": [
    {
      "id": 1,
      "enunciado": "Enunciado completo e claro da questão, citando termos e conceitos que aparecem literalmente no material do aluno",
      "opcoes": {
        "A": "Alternativa A completa",
        "B": "Alternativa B completa",
        "C": "Alternativa C completa",
        "D": "Alternativa D completa"
      },
      "correta": "B",
      "explicacao": "Explicação detalhada: por que B é correta citando o trecho do material. Por que A, C e D estão erradas. Dica para não esquecer."
    }
  ]
}

REGRAS OBRIGATÓRIAS:
- O campo "correta" DEVE ser exatamente uma letra: A, B, C ou D (sem ponto, sem parêntese, sem espaço)
- Distribua respostas corretas: não repita a mesma letra mais de 4 vezes entre todas as questões
- Adapte linguagem e complexidade ao nível escolar informado`;

const QUESTION_FORMATS = [
  "definição direta: 'O que é / O que significa [termo do material]?'",
  "aplicação: 'Dado o conceito de [X presente no material], o que acontece quando...?'",
  "identificação de erro: 'Qual afirmação sobre [tópico] está INCORRETA segundo o material?'",
  "cálculo ou resolução passo a passo com dados do material",
  "comparação: 'Qual a diferença entre [X] e [Y] conforme o conteúdo estudado?'",
  "causa e efeito extraído diretamente do material",
  "completar lacuna com termo específico do material",
  "cronologia ou sequência lógica de eventos/passos do conteúdo",
  "interpretação de situação-problema usando regra/fórmula do material",
  "exemplificação: qual dos exemplos abaixo ilustra corretamente o conceito [X] do material?",
  "exceção à regra: qual caso NÃO se aplica ao princípio [X] descrito no material?",
  "identificação do conceito: qual opção descreve corretamente [fenômeno/evento/personagem] do material?",
  "relação entre conceitos presentes no mesmo material",
  "questão de interpretação: de acordo com o trecho estudado, pode-se concluir que...",
  "pergunta sobre processo/método descrito no material passo a passo",
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

    // Trim raw content to 4000 chars — enough for rich question generation,
    // small enough to leave output tokens free for the full JSON response.
    const rawContent = (conteudoTexto || "").trim().slice(0, 4000);
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

    const userContent = `Matéria: ${materia}
Série: ${serie}
Resumo: ${resumo}

${contentSection}

SEMENTE: #${seed}

DISTRIBUIÇÃO DAS RESPOSTAS CORRETAS:
${targetDistribution.map((l, i) => `Q${i + 1}→${l}`).join(", ")}

FORMATO DE CADA QUESTÃO (aplique na ordem):
${shuffledFormats.map((f, i) => `Q${i + 1}: ${f}`).join("\n")}

Gere EXATAMENTE 10 questões. Escalone dificuldade: Q1-Q3 fáceis, Q4-Q6 médias, Q7-Q9 difíceis, Q10 desafio.
Explicações concisas (máx 2 frases). Enunciados nunca repetidos em formato.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: enrichedSystemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 4500,
      temperature: 1.05,
      response_format: { type: "json_object" },
    });

    const choice = response.choices[0];

    // If GPT was cut off mid-response, fail fast with a clear message
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
      simulado = JSON.parse(content);
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
