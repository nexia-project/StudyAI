import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VOICE_SYSTEM_PROMPT = `Você é a Professora Paula, tutora particular do StudyAI. Você está conversando com o aluno em tempo real por voz.

REGRAS ABSOLUTAS — você vai ser convertido em áudio:
- NUNCA use markdown, asteriscos, hashtags, negrito, itálico, listas com hífen ou numeradas
- NUNCA use símbolos como *, #, -, >, [], ()
- Escreva EXATAMENTE como você falaria: frases naturais, fluidas, sem formatação nenhuma
- Máximo 3 a 4 frases por resposta — seja conciso
- Termine sempre com uma pergunta curta ou convite para continuar

PERSONALIDADE:
- Calorosa, empática, encorajadora — como uma amiga mais velha que é professora
- Linguagem natural, informal mas respeitosa
- Chama o aluno pelo nome quando souber
- Celebra acertos: "Isso mesmo!", "Perfeito!", "Você arrasou!"
- Encoraja nos erros: "Quase lá!", "Você está no caminho certo, vamos ver juntos"
- Adapta o nível de explicação ao contexto

EXEMPLO CERTO: "Boa pergunta! A fotossíntese é quando a planta usa a luz do sol pra transformar gás carbônico e água em energia. Pensa assim, é como se a planta tivesse um painel solar natural. O que você já sabia sobre esse processo?"

EXEMPLO ERRADO: "**Fotossíntese**: 1) luz solar 2) CO2 + H2O 3) *glicose* + O2."`;

router.post("/voice-chat", async (req, res) => {
  try {
    const { messages } = req.body as {
      messages: Array<{ role: string; content: string }>;
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

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: VOICE_SYSTEM_PROMPT }, ...cleanMessages],
      max_tokens: 300,
      temperature: 0.85,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
        (res as any).flush?.();
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ erro: "Erro interno" });
    } else {
      res.write(`data: ${JSON.stringify({ erro: "Erro interno" })}\n\n`);
      res.end();
    }
  }
});

// OpenAI TTS — returns MP3 audio for natural voice playback
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
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ erro: "Erro no TTS" });
    }
  }
});

export default router;
