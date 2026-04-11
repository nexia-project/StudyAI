import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface StudentContext {
  nome?: string;
  serie?: string;
  objetivo?: string;
  materia?: string;
  diasCompletos?: number;
  diasTotal?: number;
  xp?: number;
  meta?: string;
  ultimosTopicos?: string[];
  ultimaMensagem?: string;
}

function buildContextBlock(context?: StudentContext): string {
  if (!context || !Object.values(context).some(Boolean)) return "";
  const lines: string[] = ["\n\nCONTEXTO DO ALUNO AGORA:"];
  if (context.nome) lines.push(`- Nome: ${context.nome}`);
  if (context.serie) lines.push(`- Série: ${context.serie}`);
  if (context.objetivo) lines.push(`- Objetivo: ${context.objetivo}`);
  if (context.materia) lines.push(`- Matéria em estudo: ${context.materia}`);
  if (context.diasTotal != null)
    lines.push(`- Progresso: ${context.diasCompletos ?? 0} de ${context.diasTotal} dias concluídos`);
  if (context.xp != null) lines.push(`- XP acumulado: ${context.xp} pontos`);
  if (context.ultimosTopicos?.length)
    lines.push(`- Tópicos recentes: ${context.ultimosTopicos.join(", ")}`);
  return lines.join("\n");
}

const BASE_PROMPT = `Você é a Professora Paula, tutora particular do StudyAI. Você conversa com o aluno em tempo real por voz.

REGRAS ABSOLUTAS — sua resposta vira áudio:
- ZERO markdown, asteriscos, hashtags, negrito, itálico, listas com traços ou números
- ZERO símbolos especiais como *, #, -, >, [], ()
- Escreva EXATAMENTE como falaria em voz alta: frases naturais e fluidas
- Máximo 3 frases por resposta — direta ao ponto
- Finalize com pergunta curta ou convite para continuar

PERSONALIDADE:
- Espontânea, calorosa, como uma amiga experiente que adora ensinar
- Chama o aluno pelo nome quando souber
- Celebra acertos: "Isso! Você arrasou!", "Perfeito!", "Muito bem!"
- Encoraja nos erros: "Quase lá, vamos ver juntos", "Você está no caminho certo"

AÇÕES DISPONÍVEIS — inclua SOMENTE se o aluno pediu ou for claramente útil, e sempre no FINAL da resposta:
<ir:/ranking> — abrir Ranking Global
<ir:/mapa> — abrir Mapa de Desempenho
<ir:/redacao> — abrir Correção de Redação
<ir:/dashboard> — abrir Dashboard
<criar_plano:NOME_DA_MATERIA> — criar plano de estudos (substitua NOME_DA_MATERIA pelo assunto real)
Nunca use mais de uma ação por resposta. Nunca invente ações.`;

// Non-streaming voice chat — full response at once → faster TTS pipeline
router.post("/voice-chat", async (req, res) => {
  try {
    const { messages, context } = req.body as {
      messages: Array<{ role: string; content: string }>;
      context?: StudentContext;
    };

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ erro: "messages é obrigatório" });
      return;
    }

    const cleanMessages = messages
      .filter((m) => m.role && m.content)
      .slice(-20)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content).slice(0, 2000),
      }));

    const systemContent = BASE_PROMPT + buildContextBlock(context);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemContent }, ...cleanMessages],
      max_tokens: 250,
      temperature: 0.9,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "";
    const actionMatch = raw.match(/<(ir|criar_plano):([^>]+)>/);
    const action = actionMatch ? { type: actionMatch[1], param: actionMatch[2] } : null;
    const text = raw.replace(/<(ir|criar_plano):[^>]+>/g, "").trim();

    res.json({ text, action });
  } catch (err) {
    res.status(500).json({ erro: "Erro interno" });
  }
});

// Proactive intelligence — Paula decides if she has something to say based on student context
router.post("/voice-proactive", async (req, res) => {
  try {
    const { context } = req.body as { context?: StudentContext };

    const systemPrompt = `Você é a Professora Paula do StudyAI. Com base nos dados do aluno, decida se você tem algo genuinamente útil, encorajador ou acionável para dizer AGORA — de forma espontânea, como se você mesma tivesse tomado a iniciativa.

REGRAS ESTRITAS:
- Se houver algo genuinamente útil: escreva UMA mensagem curta (2 a 3 frases, tom natural, zero markdown)
- Se não há nada novo ou relevante para dizer: responda exatamente NULL
- Seja espontânea e humana — como uma amiga que percebeu algo e resolveu falar
- Pode sugerir criar plano, checar ranking, praticar flashcards, focar em matéria com menos progresso
- Você pode incluir UMA ação no final: <ir:/ranking>, <ir:/mapa>, <criar_plano:MATERIA>
- Nunca repita a mesma sugestão de mensagens anteriores`;

    const parts: string[] = ["Dados do aluno:"];
    if (context?.nome) parts.push(`Nome: ${context.nome}.`);
    if (context?.serie) parts.push(`Série: ${context.serie}.`);
    if (context?.objetivo) parts.push(`Objetivo: ${context.objetivo}.`);
    if (context?.materia) parts.push(`Matéria atual: ${context.materia}.`);
    if (context?.diasTotal != null)
      parts.push(`Progresso: ${context.diasCompletos ?? 0} de ${context.diasTotal} dias.`);
    if (context?.xp != null) parts.push(`XP: ${context.xp} pontos.`);
    if (context?.ultimaMensagem) parts.push(`Última mensagem enviada: "${context.ultimaMensagem}".`);
    if (parts.length === 1) parts.push("Aluno sem dados ainda, acabou de abrir o app.");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: parts.join(" ") },
      ],
      max_tokens: 150,
      temperature: 1.0,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "NULL";
    if (raw === "NULL" || raw.startsWith("NULL")) {
      res.json({ message: null });
      return;
    }

    const actionMatch = raw.match(/<(ir|criar_plano):([^>]+)>/);
    const action = actionMatch ? { type: actionMatch[1], param: actionMatch[2] } : null;
    const message = raw.replace(/<(ir|criar_plano):[^>]+>/g, "").trim();
    res.json({ message, action });
  } catch {
    res.json({ message: null });
  }
});

// OpenAI TTS — returns MP3 audio
router.post("/voice-tts", async (req, res) => {
  try {
    const { text } = req.body as { text: string };
    if (!text?.trim()) {
      res.status(400).json({ erro: "text é obrigatório" });
      return;
    }

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: text.trim().slice(0, 1000),
      response_format: "mp3",
      speed: 1.05,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");
    res.send(buffer);
  } catch {
    if (!res.headersSent) res.status(500).json({ erro: "Erro no TTS" });
  }
});

export default router;
