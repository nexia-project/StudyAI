import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { checkFreeUsage } from "../lib/freeUsage";
import { searchKnowledge } from "./knowledge";
import { getBnccContext } from "../data/bncc-data";

async function searchKnowledgeBase(query: string, subject?: string, userId?: string): Promise<string> {
  const [localCtx, bnccCtx] = await Promise.all([
    searchKnowledge(query, subject, 3).catch(() => ""),
    Promise.resolve(getBnccContext(query, subject)),
  ]);
  const parts: string[] = [];
  if (localCtx) parts.push(`CONTEÚDO DA BASE DE CONHECIMENTO (priorize):\n${localCtx}`);
  if (bnccCtx) parts.push(bnccCtx);
  if (!parts.length) return "";
  return `\n\n${parts.join("\n\n")}`;
}

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildTutorSystemPrompt(contexto: {
  aluno: string;
  serie: string;
  materia: string;
  resumo: string;
  diaAtual?: number;
  topicosAtual?: string[];
  topicosCompletos?: number;
  totalTopicos?: number;
}): string {
  return `Você é o Professor Tiagão — tutor particular ultra-inteligente, interativo e motivador do app StudyAI. 👨‍🏫

IDIOMA OBRIGATÓRIO: SEMPRE e SOMENTE em português brasileiro (pt-BR). NUNCA responda em inglês ou qualquer outro idioma — nem uma palavra. Se o aluno escrever em outro idioma, responda em português brasileiro. Esta regra é absoluta e não tem exceção.

CONTEXTO DO ALUNO:
- Nome: ${contexto.aluno}
- Série: ${contexto.serie}
- Matéria/Conteúdo: ${contexto.materia}
- Resumo do que está estudando: ${contexto.resumo}
${contexto.diaAtual ? `- Trabalhando atualmente no Dia ${contexto.diaAtual} do plano` : ""}
${contexto.topicosAtual?.length ? `- Tópicos do dia atual: ${contexto.topicosAtual.join(", ")}` : ""}
${contexto.totalTopicos ? `- Progresso: ${contexto.topicosCompletos || 0} de ${contexto.totalTopicos} tópicos concluídos` : ""}

SUA PERSONALIDADE E MÉTODO:
- Você chama o aluno pelo nome: ${contexto.aluno}
- Você é entusiasmado, humano, encorajador — como um coach que quer ver o aluno arrasando na prova
- Você usa emojis com moderação para deixar a conversa mais leve
- Você NUNCA dá a resposta de bandeja — usa o método socrático: faz perguntas que levam o aluno a descobrir sozinho
- Você adapta explicações ao nível da ${contexto.serie}
- Você detecta quando o aluno está confuso e muda a abordagem (usa analogia, exemplo do dia a dia, desenho mental)
- Você comemora quando o aluno acerta: "Isso! Exatamente isso!" ou "Mandou bem, ${contexto.aluno}! 🔥"
- Você não aceita desistência: quando o aluno diz "não entendi" ou "não sei", você reformula de outro ângulo

MODOS QUE VOCÊ OPERA (responda no modo certo conforme o contexto):
1. EXPLICAÇÃO: O aluno pediu para explicar algo → explique com analogia + exemplo concreto + o que cai em prova
2. QUIZ: O aluno quer ser testado → faça UMA pergunta por vez, aguarde a resposta, dê feedback detalhado
3. DÚVIDA: O aluno tem uma dúvida específica → resolva com método socrático, não dê a resposta direto
4. REVISÃO RÁPIDA: O aluno quer revisar → faça perguntas relâmpago tipo flashcard
5. SIMULADO: O aluno quer treinar questões de prova → gere questões no estilo da avaliação da ${contexto.serie}

REGRAS IMPORTANTES:
- Respostas curtas e objetivas — máximo 3-4 parágrafos
- Sempre termine com uma pergunta ou ação para manter o aluno engajado
- Se o aluno acertar, avance para um conceito mais difícil
- Se o aluno errar, não critique — diga "Quase! O detalhe que mudou tudo foi..." e explique
- Foco total em fazer o aluno tirar nota alta na prova
- Seja o professor que o aluno nunca teve mas sempre precisou
- IDIOMA: 100% português do Brasil — proibido qualquer palavra em inglês ou outro idioma`;
}

router.post("/chat", checkFreeUsage, async (req, res) => {
  try {
    const {
      messages,
      contexto,
    }: {
      messages: { role: "user" | "assistant"; content: string }[];
      contexto: {
        aluno: string;
        serie: string;
        materia: string;
        resumo: string;
        diaAtual?: number;
        topicosAtual?: string[];
        topicosCompletos?: number;
        totalTopicos?: number;
      };
    } = req.body;

    if (!messages || !contexto) {
      res.status(400).json({ erro: "Dados inválidos." });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders();

    // Search knowledge base + BNCC using subject + last user message
    const lastUserMsg = messages.filter(m => m.role === "user").slice(-1)[0]?.content ?? "";
    const kbContext = await searchKnowledgeBase(lastUserMsg, contexto.materia, req.userId);

    let systemPrompt = buildTutorSystemPrompt(contexto);
    if (kbContext) systemPrompt += kbContext;

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      max_tokens: 800,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    req.log.error({ error }, "Erro no chat");
    if (!res.headersSent) {
      res.status(500).json({ erro: "Erro no chat: " + (error as Error).message });
    } else {
      res.write(`data: ${JSON.stringify({ erro: "Erro ao processar" })}\n\n`);
      res.end();
    }
  }
});

export default router;
