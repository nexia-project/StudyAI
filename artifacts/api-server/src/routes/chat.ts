import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { checkFreeUsage } from "../lib/freeUsage";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function searchKnowledgeBase(query: string): Promise<string> {
  try {
    const terms = query.trim().split(/\s+/).slice(0, 5).join("|");
    const rows = await db.execute(sql`
      SELECT title, subject, LEFT(content_text, 600) as excerpt
      FROM knowledge_documents
      WHERE content_text ILIKE ${"%" + query + "%"} OR title ILIKE ${"%" + query + "%"}
      LIMIT 3
    `);
    if ((rows.rows as any[]).length === 0) return "";
    const parts = (rows.rows as any[]).map((r: any) => `[${r.title}${r.subject ? ` — ${r.subject}` : ""}]:\n${r.excerpt}`);
    return `\n\nCONTEÚDO DA BASE DE CONHECIMENTO INTERNA (use como referência prioritária):\n${parts.join("\n\n")}`;
  } catch {
    return "";
  }
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
  return `Você é o TUTOR IA — um professor particular ultra-inteligente, interativo e motivador do app StudyAI.

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
- Seja o professor que o aluno nunca teve mas sempre precisou`;
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

    // Search knowledge base using subject + last user message
    const lastUserMsg = messages.filter(m => m.role === "user").slice(-1)[0]?.content ?? "";
    const kbContext = await searchKnowledgeBase(`${contexto.materia} ${lastUserMsg}`.trim());

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
