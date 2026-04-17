import { Router, type IRouter } from "express";
import OpenAI from "openai";
import multer from "multer";
import { Readable } from "stream";
import { db } from "@workspace/db";
import { simuladoResultsTable, flashcardSessionsTable, studyPlansTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const router: IRouter = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Search knowledge base + Wikipedia (consulta interna do sistema) ──────────
async function searchKnowledgeBase(query: string): Promise<string> {
  try {
    // searchKnowledge already auto-enriches from Wikipedia when local is sparse
    const { searchKnowledge } = await import("./knowledge");
    const ctx = await searchKnowledge(query, undefined, 3);
    if (!ctx) return "";
    return `\n\nBASE DE CONHECIMENTO (priorize este conteúdo nas respostas — inclui Wikipedia PT e base local):\n${ctx}`;
  } catch {
    return "";
  }
}

// ─── Frontend context (localStorage) ─────────────────────────────────────────
interface FrontendContext {
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
  paginaAtual?: string;
}

// ─── Fetch real student data from DB ─────────────────────────────────────────
async function fetchStudentData(userId: string) {
  const [simulados, flashcards, plans] = await Promise.all([
    db
      .select({
        materia: simuladoResultsTable.materia,
        titulo: simuladoResultsTable.titulo,
        score: simuladoResultsTable.score,
        total: simuladoResultsTable.total,
        createdAt: simuladoResultsTable.createdAt,
      })
      .from(simuladoResultsTable)
      .where(eq(simuladoResultsTable.userId, userId))
      .orderBy(desc(simuladoResultsTable.createdAt))
      .limit(30),

    db
      .select({
        materia: flashcardSessionsTable.materia,
        totalCards: flashcardSessionsTable.totalCards,
        known: flashcardSessionsTable.known,
        completedAt: flashcardSessionsTable.completedAt,
      })
      .from(flashcardSessionsTable)
      .where(eq(flashcardSessionsTable.userId, userId))
      .orderBy(desc(flashcardSessionsTable.completedAt))
      .limit(30),

    db
      .select({
        materia: studyPlansTable.materia,
        serie: studyPlansTable.serie,
        diasProva: studyPlansTable.diasProva,
        createdAt: studyPlansTable.createdAt,
      })
      .from(studyPlansTable)
      .where(eq(studyPlansTable.userId, userId))
      .orderBy(desc(studyPlansTable.createdAt))
      .limit(10),
  ]);

  // XP calculation (same formula as ranking)
  const simXp = simulados.reduce((acc, s) => {
    const pct = s.total > 0 ? (s.score / s.total) * 100 : 0;
    return acc + Math.round(20 + pct * 1.5);
  }, 0);
  const flashXp = flashcards.reduce((acc, f) => {
    const rate = f.totalCards > 0 ? (f.known / f.totalCards) * 100 : 0;
    return acc + Math.round(10 + rate * 0.5);
  }, 0);
  const planXp = plans.length * 50;
  const totalXp = simXp + flashXp + planXp;

  // Heatmap: group simulado accuracy by matéria
  const simByMateria: Record<string, { scores: number[]; dates: Date[] }> = {};
  for (const s of simulados) {
    const key = s.materia.trim();
    if (!simByMateria[key]) simByMateria[key] = { scores: [], dates: [] };
    const pct = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0;
    simByMateria[key].scores.push(pct);
    simByMateria[key].dates.push(new Date(s.createdAt));
  }

  // Classify subjects
  const subjectStats: Array<{ materia: string; avg: number; level: "fraco" | "regular" | "bom" | "forte" }> = [];
  for (const [materia, data] of Object.entries(simByMateria)) {
    const avg = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length);
    const level: "fraco" | "regular" | "bom" | "forte" =
      avg < 55 ? "fraco" : avg < 65 ? "regular" : avg < 80 ? "bom" : "forte";
    subjectStats.push({ materia, avg, level });
  }

  const weakSubjects = subjectStats.filter(s => s.level === "fraco").map(s => `${s.materia} (${s.avg}%)`);
  const strongSubjects = subjectStats.filter(s => s.level === "forte").map(s => `${s.materia} (${s.avg}%)`);
  const recentSimulado = simulados[0];
  const recentPlan = plans[0];

  // Flashcard average
  const fcAvg = flashcards.length > 0
    ? Math.round(flashcards.reduce((a, f) => a + (f.totalCards > 0 ? (f.known / f.totalCards) * 100 : 0), 0) / flashcards.length)
    : null;

  // Build mind map topology: subject → topics studied (from plans)
  const mindMapBySubject: Record<string, Set<string>> = {};
  for (const p of plans) {
    const materia = p.materia || "Geral";
    if (!mindMapBySubject[materia]) mindMapBySubject[materia] = new Set();
    const dias = (p as any).plan?.dias ?? [];
    for (const dia of dias) {
      for (const t of dia.topicos ?? []) {
        const nome = typeof t === "object" ? t.nome : t;
        if (nome) mindMapBySubject[materia].add(String(nome));
      }
    }
  }
  // Add simulado subjects even if no topics
  for (const s of simulados) {
    const materia = s.materia || "Simulados";
    if (!mindMapBySubject[materia]) mindMapBySubject[materia] = new Set();
    if (s.titulo) mindMapBySubject[materia].add(s.titulo);
  }
  const mindMapTopology = Object.entries(mindMapBySubject).map(([materia, topics]) => ({
    materia,
    topicos: Array.from(topics).slice(0, 8),
  }));

  return {
    totalSimulados: simulados.length,
    totalPlanos: plans.length,
    totalFlashcardSessions: flashcards.length,
    totalXp,
    weakSubjects,
    strongSubjects,
    recentSimulado: recentSimulado
      ? { materia: recentSimulado.materia, score: recentSimulado.score, total: recentSimulado.total }
      : null,
    recentPlan: recentPlan ? { materia: recentPlan.materia, serie: recentPlan.serie } : null,
    flashcardAvgRate: fcAvg,
    subjectStats,
    mindMapTopology,
  };
}

// ─── Build rich context string for GPT ───────────────────────────────────────
function buildRichContext(
  frontend: FrontendContext | undefined,
  dbData: Awaited<ReturnType<typeof fetchStudentData>> | null,
): string {
  const parts: string[] = [];

  // Student identity
  if (frontend?.nome) parts.push(`Nome do aluno: ${frontend.nome}`);
  if (frontend?.serie) parts.push(`Série/nível: ${frontend.serie}`);
  if (frontend?.objetivo) parts.push(`Objetivo principal: ${frontend.objetivo}`);

  // Current page context
  if (frontend?.paginaAtual) parts.push(`Página atual no app: ${frontend.paginaAtual}`);
  if (frontend?.materia) parts.push(`Matéria em foco agora: ${frontend.materia}`);

  // Real DB data
  if (dbData) {
    parts.push(`XP total acumulado: ${dbData.totalXp}`);
    parts.push(`Simulados realizados: ${dbData.totalSimulados}`);
    parts.push(`Planos de estudo criados: ${dbData.totalPlanos}`);
    parts.push(`Sessões de flashcard: ${dbData.totalFlashcardSessions}`);

    if (dbData.recentSimulado) {
      const pct = Math.round((dbData.recentSimulado.score / dbData.recentSimulado.total) * 100);
      parts.push(`Último simulado: ${dbData.recentSimulado.materia} — ${dbData.recentSimulado.score}/${dbData.recentSimulado.total} questões (${pct}% de acerto)`);
    }

    if (dbData.recentPlan) {
      parts.push(`Plano de estudos mais recente: ${dbData.recentPlan.materia}`);
    }

    if (dbData.flashcardAvgRate !== null) {
      parts.push(`Taxa média de acerto em flashcards: ${dbData.flashcardAvgRate}%`);
    }

    if (dbData.weakSubjects.length > 0) {
      parts.push(`Matérias FRACAS (precisa focar): ${dbData.weakSubjects.join(", ")}`);
    }
    if (dbData.strongSubjects.length > 0) {
      parts.push(`Matérias FORTES (pontos de orgulho): ${dbData.strongSubjects.join(", ")}`);
    }
    if (dbData.subjectStats.length === 0) {
      parts.push("Aluno ainda não fez nenhum simulado ou flashcard — está começando agora.");
    }

    // Mind map topology: what subjects and topics the student has studied
    if (dbData.mindMapTopology && dbData.mindMapTopology.length > 0) {
      const mapLines = dbData.mindMapTopology.map(({ materia, topicos }) =>
        topicos.length > 0
          ? `  ${materia}: ${topicos.join(", ")}`
          : `  ${materia}: (sem tópicos detalhados)`
      );
      parts.push(`MAPA MENTAL DO ALUNO — matérias e tópicos já estudados:\n${mapLines.join("\n")}`);
    }
  }

  // Frontend fallback data
  if (frontend?.diasTotal != null) {
    parts.push(`Progresso do plano: ${frontend.diasCompletos ?? 0} de ${frontend.diasTotal} dias concluídos`);
  }
  if (frontend?.ultimaMensagem) {
    parts.push(`Última mensagem do aluno: "${frontend.ultimaMensagem}"`);
  }

  if (parts.length === 0) return "";
  return "\n\nDADOS REAIS DO ALUNO (use ativamente nas respostas — sempre em português brasileiro):\n" + parts.map(p => `• ${p}`).join("\n");
}

// ─── Base prompt — Professor Tiagão ───────────────────────────────────────────
const BASE_PROMPT = `Você é o Professor Tiagão, tutor de IA do StudyAI. Você conversa por VOZ com o aluno em tempo real.

IDIOMA OBRIGATÓRIO: FALE SEMPRE E SOMENTE em português brasileiro (pt-BR). NUNCA use inglês, espanhol ou qualquer outro idioma — nem uma palavra sequer. Se o aluno escrever em outro idioma, responda em português. Sua resposta deve ser 100% em português do Brasil, sem exceção absoluta.

JEITO DE FALAR — isso é o mais importante:
Você é caloroso, humano, brasileiro de verdade. Fala como um professor de cursinho experiente — animado, direto, que acredita no aluno. Use interjeições naturais como "bora", "cara", "vamos nessa!", "que show!", "mandou bem!", "caramba", "arrasou!", "tá ligado?", "não para não". Demonstre energia genuína — animado quando o aluno acerta, firme e encorajador quando ele está com dificuldade. Faça perguntas curiosas. Use o nome do aluno com naturalidade, não a cada frase.

REGRAS DE FORMATO — essencial para áudio:
- ZERO markdown, asteriscos, hashtags, listas com traços ou números
- ZERO símbolos: *, #, -, >, []
- Frases naturais e fluidas como fala real
- Máximo 3 frases curtas por resposta — voz não comporta texto longo
- Termine sempre com pergunta curta ou convite natural

VOCÊ TEM ACESSO AOS DADOS REAIS DO ALUNO:
Use essas informações ativamente nas respostas. Mencione matérias específicas, pontuações, progresso real. Não diga nunca que "não consegue ver os dados" — você tem tudo à sua frente. Se o aluno pedir análise, analise com os dados que você tem.

EXEMPLOS DE COMO FALAR (natural, não robótico):
- "Cara, pelo que eu tô vendo aqui, você tá arrasando em Português mas Matemática tá pedindo atenção. Que tal um simuladinho rápido pra checar?"
- "Caramba, você já fez tantos simulados! Mas olha, essa taxa de acerto em Física tá baixa. Bora montar um plano focado nisso?"
- "Mandou bem! Você tá no caminho certo. Só precisa caprichar em Polinômios que você vai decolar."
- "Ei, percebi que faz um tempinho que você não pratica flashcards. Aquele método Anki é poderoso pra fixar! Vamos tentar agora?"

AÇÕES DISPONÍVEIS — use somente quando o aluno pediu ou for claramente útil:
<ir:/ranking> — abrir Ranking Global
<ir:/mapa> — abrir Mapa de Desempenho
<ir:/mapa-mental> — abrir o Mapa Mental do aluno (mapa visual das matérias e tópicos estudados — use quando o aluno pedir para ver seu mapa mental, ou quando quiser mostrar visualmente o progresso dele)
<ir:/redacao> — abrir Correção de Redação
<ir:/dashboard> — abrir Dashboard
<ir:/simulado> — abrir Simulado
<ir:/flashcards> — abrir Flashcards
<criar_plano:NOME_DA_MATERIA> — criar plano de estudos para uma matéria específica
Nunca use mais de uma ação por resposta. Coloque a ação NO FINAL da mensagem.`;

// ─── Voice Chat ───────────────────────────────────────────────────────────────
router.post("/voice-chat", async (req, res) => {
  try {
    const { messages, context } = req.body as {
      messages: Array<{ role: string; content: string }>;
      context?: FrontendContext;
    };

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ erro: "messages é obrigatório" });
      return;
    }

    // Fetch real student data if authenticated
    let dbData: Awaited<ReturnType<typeof fetchStudentData>> | null = null;
    if (!!req.userId) {
      try {
        dbData = await fetchStudentData(req.userId!);
      } catch (e) {
        // Non-critical — proceed without DB data
      }
    }

    const cleanMessages = messages
      .filter((m) => m.role && m.content)
      .slice(-20)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content).slice(0, 2000),
      }));

    // Search knowledge base + BNCC + Wikipedia using last user message
    const lastUserMsg = cleanMessages.filter(m => m.role === "user").slice(-1)[0]?.content ?? "";
    const [kbContext, bnccContext] = await Promise.all([
      searchKnowledgeBase(lastUserMsg),
      (async () => {
        try {
          const { getBnccContext } = await import("../data/bncc-data");
          const ctx = getBnccContext(lastUserMsg, context?.subject);
          return ctx ? `\n\n${ctx}` : "";
        } catch { return ""; }
      })(),
    ]);

    const systemContent = BASE_PROMPT + buildRichContext(context, dbData) + kbContext + bnccContext;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemContent }, ...cleanMessages],
      max_tokens: 280,
      temperature: 1.0,
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

// ─── Proactive intelligence ───────────────────────────────────────────────────
router.post("/voice-proactive", async (req, res) => {
  try {
    const { context, triggerReason, idleMs } = req.body as {
      context?: FrontendContext;
      triggerReason?: string;
      idleMs?: number;
    };

    // Fetch real student data if authenticated
    let dbData: Awaited<ReturnType<typeof fetchStudentData>> | null = null;
    if (!!req.userId) {
      try {
        dbData = await fetchStudentData(req.userId!);
      } catch {
        // Non-critical
      }
    }

    const richContext = buildRichContext(context, dbData);

    // Build trigger-specific instruction
    const idleMinutes = idleMs ? Math.round(idleMs / 60000) : 0;
    let triggerInstruction = "";
    if (triggerReason === "idle" && idleMinutes >= 3) {
      triggerInstruction = `O aluno está PARADO há ${idleMinutes} minutos sem interagir. Faça uma observação espontânea — pode ser: lembrar que há matérias fracas para estudar, sugerir um flashcard ou simulado, ou perguntar se precisa de ajuda. Tom de amiga que percebeu que o aluno travou.`;
    } else if (triggerReason === "page_return") {
      triggerInstruction = `O aluno voltou ao app depois de um tempo afastado. Dê boas-vindas de volta com energia e mencione algo concreto que ele deveria fazer agora (matéria fraca, plano pendente, etc.).`;
    } else if (triggerReason === "simulado_result") {
      triggerInstruction = `O aluno acabou de fazer um simulado. Reaja ao resultado — se foi bom, parabenize com entusiasmo; se foi ruim, seja empática e sugira estudar a matéria fraca detectada.`;
    } else if (triggerReason === "flashcard_result") {
      triggerInstruction = `O aluno acabou de fazer flashcards. Comente sobre o desempenho e sugira o próximo passo (simulado, plano, ou revisar matéria específica).`;
    } else if (triggerReason === "plan_done") {
      triggerInstruction = `O aluno acabou de completar um tópico ou dia do plano de estudos. Parabenize com entusiasmo genuíno e encoraje a continuar.`;
    } else {
      triggerInstruction = `Decida espontaneamente se tem algo útil ou encorajador para dizer com base nos dados do aluno.`;
    }

    const systemPrompt = `Você é o Professor Tiagão do StudyAI. ${triggerInstruction}

IDIOMA ABSOLUTO: Escreva EXCLUSIVAMENTE em português brasileiro (pt-BR). NUNCA escreva uma única palavra em inglês, espanhol, francês ou qualquer outro idioma. Nem expressões, nem gírias estrangeiras. Se começar a escrever em outro idioma, apague e recomece em português.

REGRAS ABSOLUTAS:
- Escreva UMA mensagem curta (2 frases no máximo, tom humano brasileiro, zero markdown, zero asterisco)
- Se genuinamente não tem nada útil: responda exatamente NULL
- Use dados reais do aluno — nunca finja não saber
- Não repita o que já foi dito antes
- Pode incluir UMA ação: <ir:/ranking>, <ir:/mapa>, <ir:/mapa-mental>, <ir:/simulado>, <ir:/flashcards>, <criar_plano:MATERIA>
${richContext}`;

    const lastMsg = context?.ultimaMensagem
      ? `Última coisa que eu disse: "${context.ultimaMensagem}"`
      : "Primeira vez falando com o aluno nesta sessão.";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: lastMsg },
      ],
      max_tokens: 150,
      temperature: 1.1,
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

// ─── TTS ──────────────────────────────────────────────────────────────────────
router.post("/voice-tts", async (req, res) => {
  try {
    const { text, base64 } = req.body as { text: string; base64?: boolean };
    if (!text?.trim()) {
      res.status(400).json({ erro: "text é obrigatório" });
      return;
    }

    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: "onyx",
      input: text.trim().slice(0, 1000),
      response_format: "mp3",
      speed: 1.15,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    if (base64) {
      res.json({ audio: buffer.toString("base64"), contentType: "audio/mpeg" });
    } else {
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "no-cache");
      res.send(buffer);
    }
  } catch {
    if (!res.headersSent) res.status(500).json({ erro: "Erro no TTS" });
  }
});

// ─── STT (Whisper transcription) ──────────────────────────────────────────────
router.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ erro: "Arquivo de áudio é obrigatório" });
      return;
    }

    const audioFile = new File([file.buffer], file.originalname || "recording.m4a", {
      type: file.mimetype || "audio/m4a",
    });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "pt",
    });

    res.json({ text: transcription.text });
  } catch (err) {
    console.error("Transcription error:", err);
    if (!res.headersSent) res.status(500).json({ erro: "Erro na transcrição" });
  }
});

export default router;
