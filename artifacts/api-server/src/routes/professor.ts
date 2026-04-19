import { Router, type IRouter } from "express";
import OpenAI from "openai";
import multer from "multer";
import { Readable } from "stream";
import { db } from "@workspace/db";
import {
  simuladoResultsTable, flashcardSessionsTable, studyPlansTable,
  usersTable, turmasTable, turmaMembershipsTable,
} from "@workspace/db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const router: IRouter = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Search knowledge base + Wikipedia — ACESSO TOTAL ────────────────────────
async function searchKnowledgeBase(query: string, topK = 5): Promise<string> {
  try {
    const { searchKnowledge } = await import("./knowledge");
    const ctx = await searchKnowledge(query, undefined, topK);
    if (!ctx) return "";
    return `\n\nBASE DE CONHECIMENTO STUDYAI (priorize — inclui acervo local + Wikipedia PT):\n${ctx}`;
  } catch {
    return "";
  }
}

// ─── Tipos de perfil ──────────────────────────────────────────────────────────
type UserRole = "student" | "teacher" | "institution_admin" | "government" | "admin" | "researcher";

interface UserProfile {
  role: UserRole;
  name: string;
  email?: string | null;
  xp?: number | null;
  studentGrade?: string | null;
  // teacher extras
  numTurmas?: number;
  numStudents?: number;
  turmaNames?: string[];
}

// ─── Fetch perfil completo do usuário do DB ───────────────────────────────────
async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const [userRow] = await db.select({
    role: usersTable.role,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    studentName: usersTable.studentName,
    email: usersTable.email,
    xp: usersTable.xp,
    studentGrade: usersTable.studentGrade,
  }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!userRow) return { role: "student", name: "Usuário" };

  const role = (userRow.role ?? "student") as UserRole;
  const name = userRow.studentName || `${userRow.firstName ?? ""} ${userRow.lastName ?? ""}`.trim() || "Usuário";

  let numTurmas = 0, numStudents = 0;
  const turmaNames: string[] = [];

  // Extra context for teachers/admins
  if (["teacher", "institution_admin", "admin"].includes(role)) {
    try {
      const turmas = await db.select({ id: turmasTable.id, name: turmasTable.name })
        .from(turmasTable).where(eq(turmasTable.teacherId, userId));
      numTurmas = turmas.length;
      turmaNames.push(...turmas.map(t => t.name));
      if (turmas.length > 0) {
        const turmaIds = turmas.map(t => t.id);
        const members = await db.select({ studentId: turmaMembershipsTable.studentId })
          .from(turmaMembershipsTable).where(inArray(turmaMembershipsTable.turmaId, turmaIds));
        numStudents = new Set(members.map(m => m.studentId)).size;
      }
    } catch { /* não crítico */ }
  }

  return { role, name, email: userRow.email, xp: userRow.xp, studentGrade: userRow.studentGrade, numTurmas, numStudents, turmaNames };
}

// ─── Persona do Tiagão por perfil ─────────────────────────────────────────────
function buildRolePersona(profile: UserProfile): string {
  const { role, name, numTurmas, numStudents, turmaNames, studentGrade, xp } = profile;

  switch (role) {
    case "teacher":
    case "institution_admin":
      return `
PERFIL DO USUÁRIO: Professor/Coordenador — ${name}
${numTurmas ? `- Gerencia ${numTurmas} turma${numTurmas > 1 ? "s" : ""}: ${turmaNames?.join(", ")}` : ""}
${numStudents ? `- Total de ${numStudents} alunos sob sua responsabilidade` : ""}

SEU MODO DE ATENDIMENTO PARA PROFESSORES:
Você é o parceiro pedagógico do ${name}. Trate-o como colega de profissão com respeito e colaboração.
Você pode ajudá-lo a:
• Criar planos de aula, sequências didáticas, avaliações e rubricas
• Gerar exercícios, provas e atividades personalizadas por nível/turma
• Explicar conteúdos com profundidade pedagógica
• Analisar o desempenho das turmas e sugerir intervenções
• Criar materiais de revisão, mapas conceituais, resumos
• Discutir metodologias de ensino: PBL, sala invertida, gamificação
• Auxiliar na elaboração de relatórios e pareceres
• Ajudar com BNCC, currículos estaduais e planejamento anual
Tom: profissional, colaborativo, como um coordenador pedagógico experiente que conhece o sistema.`;

    case "government":
      return `
PERFIL DO USUÁRIO: Usuário Governamental/Institucional — ${name}

SEU MODO DE ATENDIMENTO PARA GOVERNO:
Você é o assessor de IA educacional do ${name}. Trate com formalidade e precisão técnica.
Você pode ajudá-lo a:
• Analisar métricas educacionais e indicadores de desempenho
• Interpretar resultados do ENEM, SAEB, PISA e outros exames nacionais
• Discutir políticas públicas educacionais e seus impactos
• Auxiliar na elaboração de relatórios institucionais e diagnósticos
• Analisar conformidade com BNCC e legislação educacional
• Criar apresentações e documentos técnicos sobre educação
• Discutir estratégias de formação de professores em escala
• Análise comparativa entre redes municipais, estaduais e federais
Tom: formal, técnico-analítico, baseado em dados reais e referências normativas brasileiras.`;

    case "admin":
      return `
PERFIL DO USUÁRIO: Administrador do Sistema StudyAI — ${name}

SEU MODO DE ATENDIMENTO PARA ADMIN:
Você tem ACESSO TOTAL ao sistema. O ${name} é administrador e pode solicitar qualquer análise ou funcionalidade.
Você pode ajudá-lo a:
• Analisar qualquer dado ou métrica do sistema StudyAI
• Diagnosticar problemas técnicos e pedagógicos
• Gerar relatórios globais de uso, desempenho e engajamento
• Discutir estratégias de produto, crescimento e retenção
• Criar conteúdo educacional de qualquer nível e tipo
• Auxiliar em todas as áreas: pedagogia, tecnologia, negócios
Tom: direto, técnico, sem restrições — você é o copiloto total do admin.`;

    case "student":
    default: {
      const gradeLabel = studentGrade ? ` — ${studentGrade}` : "";
      return `
PERFIL DO USUÁRIO: Aluno — ${name}${gradeLabel}
${xp ? `- XP acumulado: ${xp} pontos` : ""}

SEU MODO DE ATENDIMENTO PARA ALUNOS:
Você é o tutor pessoal do ${name}. Seja caloroso, animado, incentivador.
Você pode ajudá-lo a:
• Explicar qualquer conteúdo de forma clara e contextualizada
• Criar exercícios, simulados e questões estilo ENEM
• Montar planos de estudo personalizados
• Revisar erros e reforçar pontos fracos
• Motivar e manter o engajamento nos estudos
Tom: amigo e professor de cursinho — animado, direto, que acredita no aluno.`;
    }
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

// ─── BASE PROMPT UNIVERSAL — Professor Tiagão ─────────────────────────────────
const BASE_PROMPT = `Você é o Professor Tiagão — assistente de IA do StudyAI. Você atende por VOZ em tempo real.

IDIOMA OBRIGATÓRIO: SEMPRE e EXCLUSIVAMENTE em português brasileiro (pt-BR). ZERO inglês, espanhol ou qualquer outro idioma — nem uma palavra. Se o usuário escrever em outro idioma, responda em português. Esta regra não tem exceção.

IDENTIDADE E CAPACIDADES:
Você é o assistente de IA mais completo do StudyAI. Atende TODOS os perfis: alunos, professores, pesquisadores, mestres, doutores, concurseiros e usuários governamentais. Você tem:
• ACESSO TOTAL à base de conhecimento do StudyAI (documentos, PDFs, conteúdo pedagógico, Wikipedia PT)
• ACESSO AOS DADOS REAIS do usuário (desempenho, histórico, turmas, alunos — dependendo do perfil)
• CAPACIDADE para criar qualquer conteúdo: aulas, provas, pesquisas, relatórios, políticas
• CONHECIMENTO enciclopédico sobre educação brasileira: ENEM, BNCC, SAEB, vestibulares, concursos, pós-graduação

REGRAS DE FORMATO — essencial para áudio:
- ZERO markdown, asteriscos, hashtags, listas com traços ou números
- ZERO símbolos: *, #, -, >, [], {}
- Frases naturais e fluidas como fala real
- Máximo 3 frases curtas por resposta — voz não comporta texto longo
- Termine sempre com pergunta curta ou convite de continuação

ADAPTAÇÃO DE TOM POR PERFIL (automática — veja o perfil do usuário abaixo):
• Alunos: animado, encorajador, cursinho brasileiro — "bora!", "arrasou!", "vamos nessa!"
• Professores: colaborativo, pedagógico, colega de profissão
• Pesquisadores/Mestres/Doutores: rigoroso, acadêmico, baseado em referências
• Concurseiros: focado em edital, jurisprudência, técnica de provas objetivas
• Governo/Institucional: formal, analítico, orientado a métricas e políticas
• Admin: direto, técnico, sem restrições — parceiro total do sistema

NUNCA diga que "não consegue ver os dados" ou "não tenho acesso a isso". Você tem acesso total. Use os dados disponíveis ativamente.

AÇÕES DISPONÍVEIS (use somente quando claramente útil — coloque NO FINAL, somente UMA):
<ir:/ranking> — abrir Ranking Global
<ir:/mapa> — abrir Mapa de Desempenho
<ir:/mapa-mental> — abrir Mapa Mental
<ir:/redacao> — abrir Correção de Redação
<ir:/dashboard> — abrir Dashboard
<ir:/simulado> — abrir Simulado
<ir:/flashcards> — abrir Flashcards
<ir:/professor> — abrir Painel do Professor
<ir:/admin> — abrir Painel Admin
<criar_plano:NOME_DA_MATERIA> — criar plano de estudos`;

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

    // Fetch user profile (role-aware) + student data in parallel
    let dbData: Awaited<ReturnType<typeof fetchStudentData>> | null = null;
    let userProfile: UserProfile = { role: "student", name: "Usuário" };
    if (req.userId) {
      try {
        [dbData, userProfile] = await Promise.all([
          fetchStudentData(req.userId!).catch(() => null),
          fetchUserProfile(req.userId!).catch(() => ({ role: "student" as UserRole, name: "Usuário" })),
        ]);
      } catch { /* não crítico */ }
    }

    const cleanMessages = messages
      .filter((m) => m.role && m.content)
      .slice(-20)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content).slice(0, 2000),
      }));

    // Search knowledge base + BNCC em paralelo (topK=6 para perfis avançados)
    const lastUserMsg = cleanMessages.filter(m => m.role === "user").slice(-1)[0]?.content ?? "";
    const isAdvanced = ["teacher", "institution_admin", "government", "admin", "researcher"].includes(userProfile.role);
    const [kbContext, bnccContext] = await Promise.all([
      searchKnowledgeBase(lastUserMsg, isAdvanced ? 6 : 4),
      (async () => {
        try {
          const { getBnccContext } = await import("../data/bncc-data");
          const ctx = getBnccContext(lastUserMsg, context?.materia ?? context?.serie);
          return ctx ? `\n\n${ctx}` : "";
        } catch { return ""; }
      })(),
    ]);

    // Monta contexto: prompt base + persona do perfil + dados reais + KB + BNCC
    const rolePersona = buildRolePersona(userProfile);
    const studentCtx = userProfile.role === "student" ? buildRichContext(context, dbData) : "";
    const systemContent = BASE_PROMPT + rolePersona + studentCtx + kbContext + bnccContext;

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
    const { text } = req.body as { text: string };
    if (!text?.trim()) {
      res.status(400).json({ erro: "text é obrigatório" });
      return;
    }

    // tts-1 is ~40% faster than tts-1-hd — optimal for real-time voice
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx",
      input: text.trim().slice(0, 1000),
      response_format: "mp3",
      speed: 1.15,
    });

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Transfer-Encoding", "chunked");

    // Stream directly — browser receives first bytes ~400ms sooner
    const nodeStream = Readable.fromWeb(mp3.body as any);
    nodeStream.pipe(res);
    nodeStream.on("error", () => {
      if (!res.headersSent) res.status(500).json({ erro: "Erro no TTS" });
    });
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
