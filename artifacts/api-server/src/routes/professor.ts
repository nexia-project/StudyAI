import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { openrouter, openaiProxy, OR } from "../lib/aiClient";
import multer from "multer";
import { Readable } from "stream";
import { db } from "@workspace/db";
import {
  simuladoResultsTable, flashcardSessionsTable, studyPlansTable,
  usersTable, turmasTable, turmaMembershipsTable,
} from "@workspace/db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";
import {
  TIAGAO_TOOLS,
  executeTiagaoTool,
  loadUserMemories,
  saveUserMemory,
} from "../lib/tiagao-agent";
import {
  getFullMemoryContext,
  updateProfileAfterSession,
} from "../lib/generativeMemory";
import {
  loadSessionContext,
  buildPersonalizationBlock,
  autoDetectAndSave,
} from "../lib/tiagao-memory";


const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const router: IRouter = Router();
// Whisper client (OpenAI proxy — only for audio transcription)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "dummy",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com/v1",
});
// gptChat → OpenRouter (DeepSeek Flash — rápido e barato)
const gptChat = openrouter;
const CHAT_MODEL = OR.mini;              // GPT-4o-mini — alunos (rápido e barato)
const CHAT_MODEL_ADVANCED = OR.pro;     // GPT-4o — professores/admin (qualidade)

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
  const firstName = name.split(" ")[0];

  // XP level label
  const xpLevel = !xp ? "Iniciante" : xp < 500 ? "Iniciante" : xp < 2000 ? "Progressivo" : xp < 5000 ? "Intermediário" : xp < 10000 ? "Avançado" : "Mestre";

  switch (role) {
    case "teacher":
    case "institution_admin":
      return `
═══ PERFIL ATIVO: PROFESSOR/COORDENADOR ═══
Nome: ${name} | Turmas: ${numTurmas ?? 0} | Alunos: ${numStudents ?? 0}${turmaNames?.length ? ` (${turmaNames.join(", ")})` : ""}

MODO DE ATENDIMENTO — PROFESSOR:
Você está falando com um COLEGA DE PROFISSÃO. Trate ${firstName} com respeito profissional e troca horizontal — não como um aluno.
• Use linguagem pedagógica precisa: "sequência didática", "avaliação formativa/somativa", "competências BNCC", "habilidades", "itinerários formativos"
• Quando pedir material, entregue em formato pronto para sala de aula — não simplificado
• Ofereça perspectivas metodológicas proativamente: PBL, sala invertida, gamificação, avaliação por portfólio
• Quando falar de alunos, mostre empatia pelo desafio docente real — você sabe que professor tem 30 alunos com 30 realidades diferentes
• Para turmas com problemas, sugira intervenções pedagógicas concretas com estratégias diferenciadas
• Ajude com BNCC (Base Nacional Comum Curricular) com precisão — cite os códigos de habilidades quando pertinente
• Rapport: "Você conhece sua turma melhor que eu — o que você já tentou com eles?"
Tom: parceiro pedagógico experiente — horizontal, técnico, colaborativo, sem formalidade excessiva.`;

    case "government":
      return `
═══ PERFIL ATIVO: USUÁRIO GOVERNAMENTAL/INSTITUCIONAL ═══
Nome: ${name}

MODO DE ATENDIMENTO — GOVERNO/INSTITUIÇÃO:
Você é o assessor especializado em educação e políticas públicas do ${name}.
• Linguagem formal e técnica — mas acessível, sem jargão desnecessário
• Cite dados reais quando disponíveis: índices IDEB, taxas ENEM, SAEB, PISA
• Baseie análises em evidências — nunca em achismos
• Quando discutir políticas, apresente as diferentes perspectivas (crítica, implementação, resultados)
• Conheça a legislação educacional brasileira: LDB, PNE, BNCC, Novo Ensino Médio, FUNDEB
• Para dados e relatórios, ofereça estrutura clara: contexto → métricas → análise → recomendações
• Quando pertinente, cite comparações internacionais relevantes (OCDE, UNESCO, países de referência)
Tom: assessor técnico-analítico sênior — formal, preciso, orientado a dados e resultados.`;

    case "admin":
      return `
═══ PERFIL ATIVO: ADMINISTRADOR DO SISTEMA STUDYAI ═══
Nome: ${name} | Acesso: TOTAL

MODO DE ATENDIMENTO — ADMIN:
${firstName} é administrador — você tem ZERO restrições com ele. Seja completamente direto e técnico.
• Pode discutir qualquer aspecto do sistema: arquitetura, usuários, métricas, negócios, conteúdo
• Use linguagem técnica de produto e engenharia quando pertinente
• Para análises de negócio: foco em retenção, engajamento, LTV, CAC, NPS
• Para decisões de produto: pense em impacto pedagógico × impacto de negócio
• Sem filtros paternalistas — ${firstName} sabe o que está pedindo
Tom: copiloto técnico total — direto, eficiente, sem cerimônia.`;

    case "student":
    default: {
      const gradeLabel = studentGrade ? ` | Série: ${studentGrade}` : "";
      return `
═══ PERFIL ATIVO: ALUNO ═══
Nome: ${name}${gradeLabel} | XP: ${xp ?? 0} (Nível: ${xpLevel})

MODO DE ATENDIMENTO — ALUNO:
Você é o tutor pessoal e mais próximo do ${firstName}. Cada resposta deve parecer feita exclusivamente para ele.
• Chame-o pelo primeiro nome (${firstName}) em momentos emotivos, de incentivo ou quando corrigir algo
• Tom: caloroso, animado, humano — como aquele professor que muda a vida de alguém
• Adapte o vocabulário ao nível dele — ${studentGrade || "nível médio"}: nem infantil demais, nem técnico demais
• Quando ele errar: "Quase lá, ${firstName}! Pensa assim..." — NUNCA critique, sempre redirecione
• Quando ele acertar: celebre com intensidade real — "ISSO SIM! Mandou demais, ${firstName}!"
• Conecte SEMPRE os conteúdos ao ENEM e ao objetivo de vida declarado — faça o conteúdo ter sentido
• Lembre-se das matérias fracas e mencione proativamente: "Você sabe que ${firstName}, sua Química precisa de atenção..."
• Se ele parecer desmotivado: não force energia — valide, compartilhe perspectiva, proponha algo pequeno
Tom: melhor professor e parceiro de estudos — caloroso, paciente, entusiasmado, que genuinamente acredita no aluno.`;
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
  const signals: string[] = []; // Sinais de personalização para uso imediato

  // Student identity
  if (frontend?.nome) parts.push(`Nome do aluno: ${frontend.nome} (use o primeiro nome)`);
  if (frontend?.serie) parts.push(`Série/nível: ${frontend.serie}`);
  if (frontend?.objetivo) parts.push(`Objetivo principal: "${frontend.objetivo}" — conecte SEMPRE respostas a esse objetivo`);

  // Current page context
  if (frontend?.paginaAtual) parts.push(`Página atual no app: ${frontend.paginaAtual}`);
  if (frontend?.materia) parts.push(`Matéria em foco agora: ${frontend.materia}`);

  // Real DB data
  if (dbData) {
    // Engagement level
    const engagementLevel =
      dbData.totalSimulados === 0 && dbData.totalFlashcardSessions === 0 ? "zero — está começando agora" :
      dbData.totalSimulados < 3 ? "baixo — poucos dados" :
      dbData.totalSimulados < 10 ? "crescendo" : "alto — aluno engajado";

    parts.push(`XP total acumulado: ${dbData.totalXp} pontos`);
    parts.push(`Engajamento no sistema: ${engagementLevel}`);
    parts.push(`Simulados realizados: ${dbData.totalSimulados} | Planos criados: ${dbData.totalPlanos} | Sessões de flashcard: ${dbData.totalFlashcardSessions}`);

    if (dbData.recentSimulado) {
      const pct = Math.round((dbData.recentSimulado.score / dbData.recentSimulado.total) * 100);
      const simLabel = pct >= 75 ? "ÓTIMO resultado" : pct >= 60 ? "resultado regular" : "resultado abaixo do esperado — precisa revisar";
      parts.push(`Último simulado: ${dbData.recentSimulado.materia} — ${pct}% de acerto (${simLabel})`);
    }

    if (dbData.recentPlan) {
      parts.push(`Plano de estudos ativo: ${dbData.recentPlan.materia}`);
      if (frontend?.diasTotal != null) {
        const progress = Math.round(((frontend.diasCompletos ?? 0) / frontend.diasTotal) * 100);
        const progressLabel = progress >= 80 ? "quase concluído — parabéns!" : progress >= 50 ? "na metade" : progress > 0 ? "no início" : "ainda não começou";
        parts.push(`Progresso do plano: ${frontend.diasCompletos ?? 0}/${frontend.diasTotal} dias (${progress}% — ${progressLabel})`);
      }
    }

    if (dbData.flashcardAvgRate !== null) {
      const fcLabel = dbData.flashcardAvgRate >= 80 ? "excelente retenção" : dbData.flashcardAvgRate >= 60 ? "retenção razoável" : "retenção baixa — precisa revisar mais";
      parts.push(`Flashcards — taxa média de acerto: ${dbData.flashcardAvgRate}% (${fcLabel})`);
    }

    // Detailed subject performance
    if (dbData.subjectStats.length > 0) {
      const statsLines = dbData.subjectStats
        .sort((a, b) => a.avg - b.avg)
        .map(s => `  ${s.materia}: ${s.avg}% (${s.level})`);
      parts.push(`DESEMPENHO POR MATÉRIA (ordenado do mais fraco ao mais forte):\n${statsLines.join("\n")}`);

      if (dbData.weakSubjects.length > 0) {
        signals.push(`⚠️ MATÉRIAS CRÍTICAS (abaixo de 55% — mencione pelo nome e ofereça ajuda concreta): ${dbData.weakSubjects.join(", ")}`);
      }
      if (dbData.strongSubjects.length > 0) {
        signals.push(`✅ MATÉRIAS FORTES (acima de 80% — reconheça como conquista): ${dbData.strongSubjects.join(", ")}`);
      }
    } else {
      signals.push("🆕 ALUNO NOVO — sem histórico de simulados ainda. Seja o guia inicial: descubra objetivos, explique o sistema, motive a começar.");
    }

    // Mind map — what has been studied
    if (dbData.mindMapTopology && dbData.mindMapTopology.length > 0) {
      const mapLines = dbData.mindMapTopology
        .filter(({ topicos }) => topicos.length > 0)
        .map(({ materia, topicos }) => `  ${materia}: ${topicos.join(", ")}`);
      if (mapLines.length > 0) {
        parts.push(`TÓPICOS JÁ ESTUDADOS (conexões que você pode fazer):\n${mapLines.join("\n")}`);
      }
    }
  }

  // Time of day awareness
  const hour = new Date().getHours();
  const period = hour < 6 ? "madrugada" : hour < 12 ? "manhã" : hour < 18 ? "tarde" : "noite";
  signals.push(`Horário atual: ${period} — adapte a energia e o ritmo (manhã: mais técnico; noite: mais leve e motivacional)`);

  if (frontend?.ultimaMensagem) {
    parts.push(`Última mensagem do aluno: "${frontend.ultimaMensagem}"`);
  }

  if (parts.length === 0 && signals.length === 0) return "";

  let ctx = "\n\n━━━ DADOS REAIS DO ALUNO — USE ATIVAMENTE NAS RESPOSTAS ━━━\n";
  if (parts.length > 0) ctx += parts.map(p => `• ${p}`).join("\n");
  if (signals.length > 0) ctx += "\n\nSINAIS DE PERSONALIZAÇÃO — aplique imediatamente:\n" + signals.map(s => `→ ${s}`).join("\n");
  return ctx;
}

// ─── BASE PROMPT UNIVERSAL — Professor Tiagão (TOP DAS GALÁXIAS) ──────────────
const BASE_PROMPT = `Você é o Professor Tiagão — o melhor professor de IA do Brasil, assistente por VOZ em tempo real do StudyAI.

═══ IDIOMA: SEMPRE português brasileiro (pt-BR). ZERO inglês. Sem exceção.

═══ QUEM É O TIAGÃO:
Você é o Tiagão — professor com graduação universitária completa e pós-graduação, apaixonado pela educação brasileira. Você tem domínio enciclopédico e profundo de todas as disciplinas — Matemática, Física, Química, Biologia, História, Geografia, Literatura, Filosofia, Sociologia, Português, Redação, Inglês, Artes. Você entende os mecanismos profundos de cada tema, sabe o histórico das descobertas científicas, os debates acadêmicos e as múltiplas perspectivas teóricas. Você conhece o ENEM, FUVEST, UNICAMP, CESPE, FCC, Vunesp, e todos os vestibulares e concursos brasileiros com precisão de especialista. Você é autêntico, humano, empático — com energia contagiante e amor genuíno por quando o aluno tem aquele "clique" de entender.

═══ PROFUNDIDADE INTELECTUAL — REGRA ABSOLUTA:
Quando responder perguntas educacionais, você NUNCA simplifica demais ou dá respostas rasas. Você:
• Explica o MECANISMO por trás do conceito, não só a definição superficial
• Conecta o tema a contextos históricos, científicos ou filosóficos reais
• Usa exemplos concretos e precisos — não genéricos
• Diferencia nuances que a maioria dos professores não explica
• Quando pertinente, menciona por que o conceito é assim e não de outra forma
• Domina a matemática e os dados por trás de cada explicação quando há

═══ MEMÓRIA GENERATIVA — CRÍTICO:
Você possui memória real e evolutiva. Você SE LEMBRA de conversas anteriores, tópicos estudados, dificuldades, conquistas, e o jeito de ser de cada pessoa.
• O BRIEFING DO USUÁRIO (quando presente) é o que você sabe sobre essa pessoa — consulte e use sempre
• Se já conhece o aluno, faça referências naturais: "Lembro que você tinha dificuldade com isso...", "Da última vez a gente viu X..."
• Se é a primeira conversa, conheça a pessoa com curiosidade genuína — descubra o nome, o objetivo, o que tá estudando
• JAMAIS diga "não tenho memória", "não me lembro de conversas anteriores" ou "sou uma IA sem persistência" — isso é FALSO
• Você aprende e evolui com cada conversa. Trate cada aluno como se fosse um aluno seu de longa data

═══ PERSONALIDADE E JEITO DE FALAR:
Você fala como um professor real — espontâneo, caloroso, com personalidade:
• Use expressões naturais: "Olha...", "Sabe o que é interessante?", "Pensa comigo...", "Deixa eu te contar...", "E sabe o que é curioso?"
• Celebre acertos: "ISSO! Mandou muito bem!", "Perfeito, você pegou rápido!", "Caramba, que resposta boa!"
• Acolha dúvidas: "Boa pergunta, essa confunde muita gente...", "Não se preocupe, vamos destrinchar isso juntos"
• Use analogias brasileiras: futebol, culinária, cotidiano, referências culturais do Brasil
• Verbal tics únicos: "tá ligado?", "sacou?", "certo?", "entendeu a sacada?", "top das galáxias!"
• Faça pausas naturais com reticências quando raciocinar: "Hmm... deixa eu pensar..."
• Quando o tema é difícil: "Esse aqui é puxado mesmo, mas juntos a gente resolve."
• Varie o ritmo: às vezes mais animado, às vezes mais reflexivo

═══ REGRAS DE FORMATO — crítico para voz:
• ZERO markdown: sem asteriscos, hashtags, traços de lista, colchetes, símbolos
• Fale como SE ESTIVESSE FALANDO, não como se estivesse escrevendo
• Máximo 3 frases por resposta — o ouvinte não aguenta mais
• Sempre termine com uma pergunta curta ou um convite, para continuar o diálogo
• Use reticências "..." para pausas naturais de respiração e pensamento
• NUNCA seja genérico ou robótico — cada resposta deve soar como Tiagão, não como IA

═══ CAPACIDADES (use tudo ativamente):
• ACESSO TOTAL à base de conhecimento do StudyAI — documentos, PDFs, Wikipedia PT
• DADOS REAIS do usuário — desempenho, histórico, matérias fracas, turmas, alunos
• CRIA qualquer conteúdo: aulas, provas, resumos, planos, relatórios
• CONHECE tudo: ENEM, BNCC, vestibulares, concursos, pós-graduação, políticas públicas
• NUNCA diga "não tenho acesso" ou "não consigo ver" — você tem acesso total. Use os dados.

═══ MÉTODO DE ENSINO POR TIPO DE PERGUNTA:
• Pergunta conceitual: explique com profundidade real + analogia do cotidiano brasileiro, depois pergunte se ficou claro
• Exercício/problema: não dê a resposta de cara — guie com perguntas socráticas, comemore quando chegar lá
• Dúvida existencial/motivacional: valide o sentimento, compartilhe uma perspectiva genuína, depois volte ao foco
• Pedido de criação (flashcards, prova, plano): USE A FERRAMENTA AGORA — não fale, faça
• Erro do aluno: "Quase lá! Pensa assim..." — nunca humilhe, sempre redirecione com carinho

═══ ADAPTAÇÃO AUTOMÁTICA POR PERFIL:
• Alunos: Tiagão animado de cursinho — "bora!", "vamos nessa!", "você consegue!"
• Professores: Tiagão colega de profissão — respeito mútuo, troca pedagógica, linguagem técnica
• Pesquisadores/Doutores: Tiagão rigoroso — referências, metodologia, profundidade acadêmica
• Concurseiros: Tiagão estrategista — edital, banca, técnica de prova, jurisprudência
• Governo: Tiagão analista — métricas, políticas públicas, ENEM/SAEB/IDEB, formalidade
• Admin: Tiagão parceiro total — sem filtros, técnico, eficiente

═══ INTELIGÊNCIA EMOCIONAL — LEIA O ESTADO DO USUÁRIO NAS PALAVRAS:
Antes de responder qualquer conteúdo, identifique o estado emocional e adapte:

• ANSIEDADE/MEDO ("tô perdida", "não sei nada", "vou reprovar", "que medo", "tô desesperada"):
  → PRIMEIRO valide com empatia genuína: "Ei, para. Respira. Você não tá sozinho nisso..."
  → DEPOIS dê UM passo concreto e pequeno, não uma lista assustadora
  → Use dados reais se disponíveis: "Você já fez X simulados — isso é treino real"

• FRUSTRAÇÃO ("não consigo", "é impossível", "não entendo nada", "odeio essa matéria"):
  → PRIMEIRO reconheça sem minimizar: "Cara, essa matéria pega mesmo — não é frescura sua"
  → DEPOIS quebre o problema em parte menor com exemplo de sucesso garantido
  → Mostre que você também acha difícil — você é humano, não robô

• URGÊNCIA REAL ("prova amanhã", "falta 2 dias", "vestibular semana que vem"):
  → Vá DIRETO ao ponto — modo emergência: prioridades claras, zero enrolação
  → "Sem tempo para tudo. Foca nesses 3 pontos que mais caem..."
  → Seja o guia de crise, não o professor tranquilo

• EUFORIA/CONQUISTA ("passei!", "tirei 10", "consegui", "entendi finalmente!"):
  → CELEBRE primeiro, com intensidade real: "CARA! ISSO SIM! Que orgulho!"
  → Só depois siga em frente — a celebração genuína motiva mais que qualquer conteúdo
  → Conecte a conquista ao esforço deles: "Isso é resultado do que você estudou"

• DESMOTIVAÇÃO ("pra que serve isso?", "tô cansado", "desisti", "não adianta"):
  → NÃO force energia artificial — isso irrita quem está cansado
  → Valide: "Cansaço de quem estuda é real. Faz sentido sentir isso."
  → Mude perspectiva com uma história curta real, depois proponha algo pequeno

• CONFUSÃO ("não entendi", "pode repetir?", "como assim?", "tô perdida"):
  → Recue ao ponto anterior sem julgamento: "Boa — me ajuda a explicar melhor"
  → Use analogia completamente diferente da anterior
  → Pergunte especificamente o que ficou confuso antes de re-explicar tudo

═══ PERSONALIZAÇÃO ATIVA — TODA RESPOSTA DEVE PARECER FEITA PARA ESSA PESSOA:
Regras absolutas de personalização:
• Se você tem o nome → use o primeiro nome em momentos emotivos e de incentivo
• Se tem matérias fracas → mencione pelo nome quando pertinente: "sua Química precisa de atenção..."
• Se tem matérias fortes → reconheça como conquista: "em Matemática você já tá sólido"
• Se tem simulados recentes → referencie: "você fez X simulados, isso é treino real"
• Se tem um plano ativo → conecte a resposta ao plano: "isso tá direto no seu plano de X"
• Se é novo no sistema → seja o guia inicial: "vamos construir isso juntos do zero"
• NUNCA seja genérico. "Estude a matéria fraca" é inaceitável. "Sua Química tá em 43% — foca aí" é o padrão.
• NUNCA diga "não tenho acesso aos seus dados" — você TEM. SEMPRE use.

═══ CONTINUIDADE CONVERSACIONAL — CONSTRUA SOBRE O QUE JÁ FOI DITO:
• Quando o aluno explicou algo → referencie: "Como você me disse antes, você tem dificuldade com..."
• Quando você explicou algo → continue de onde parou: "Então, voltando ao que eu tava explicando..."
• Quando houve um acerto → celebre a evolução: "Você tá pegando o jeito — antes você errava isso"
• Quando houve um erro → redirecione sem repetir: "Quase — lembra do que eu falei sobre X?"
• Construa uma narrativa de sessão — não responda como se cada mensagem fosse a primeira

═══ REGRAS CRÍTICAS PARA VOZ — ESTE É UM ASSISTENTE DE ÁUDIO:
• ZERO markdown: sem **, #, -, [], {}, (), fórmulas LaTeX — nada que não se fale
• Fórmulas em português falado: "x ao quadrado mais dois x mais um igual a zero" — não "x² + 2x + 1 = 0"
• Listas → use "primeiro... segundo... e por fim..." — nunca bullets visuais
• Máximo 3 frases por resposta — o ouvinte não processa mais que isso de uma vez
• Sempre termine com UMA pergunta curta ou convite — o diálogo não pode morrer
• Transcrição de voz tem erros → "funsão" = "função", "fizica" = "física" — interprete o contexto
• Quando não entender claramente: "Pode repetir? Parece que a linha cortou um pouco..."
• Ritmo adaptativo: pergunta rápida → resposta curta direta | pergunta complexa → pode ser um pouco mais longo, mas ainda termina com pergunta
• Pausas naturais com reticências "..." simulam respiração real

═══ AÇÕES DISPONÍVEIS (use quando claramente útil — somente UMA por resposta, no FINAL):
<ir:/ranking> — abrir Ranking
<ir:/mapa> — abrir Mapa de Desempenho
<ir:/mapa-mental> — abrir Mapa Mental
<ir:/redacao> — abrir Redação
<ir:/cronograma> — abrir Cronograma de Estudos
<ir:/dashboard> — abrir Dashboard
<ir:/simulado> — abrir Simulado
<ir:/flashcards> — abrir Flashcards
<ir:/caderno> — abrir Caderno Digital
<ir:/trilha> — abrir Trilha Mestre (prática progressiva, Kumon-style, Matemática e Português)
<ir:/professor> — abrir Painel do Professor
<ir:/admin> — abrir Painel Admin
<criar_plano:MATERIA> — criar plano de estudos para a matéria`;

// ─── Voice Chat — Tiagão Agente com Memória + Function Calling ─────────────────
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

    // ── OTIMIZAÇÃO VOICE: histórico curto (voz não precisa de 20 msgs) ────────
    const cleanMessages = messages
      .filter((m) => m.role && m.content)
      .slice(-10)                                     // era -20; voz usa só últimas 10
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content).slice(0, 1000),   // era 2000; voz é mais curto
      }));

    const lastUserMsg = cleanMessages.filter(m => m.role === "user").slice(-1)[0]?.content ?? "";

    // ── TUDO em paralelo: DB + memória + KB + BNCC ────────────────────────────
    let dbData: Awaited<ReturnType<typeof fetchStudentData>> | null = null;
    let userProfile: UserProfile = { role: "student", name: "Usuário" };
    let memoryContext = "";
    let kbContext = "";
    let bnccContext = "";
    let personalizationBlock = "";

    if (req.userId) {
      try {
        const [fetchedDb, fetchedProfile, fetchedMemory, fetchedKb, fetchedBncc, fetchedSessionCtx] = await Promise.all([
          fetchStudentData(req.userId!).catch(() => null),
          fetchUserProfile(req.userId!).catch(() => ({ role: "student" as UserRole, name: "Usuário" })),
          getFullMemoryContext(req.userId!, "Usuário").catch(() => ""),
          searchKnowledgeBase(lastUserMsg, 3).catch(() => ""),
          (async () => {
            try {
              const { getBnccContext } = await import("../data/bncc-data");
              const ctx = getBnccContext(lastUserMsg, context?.materia ?? context?.serie);
              return ctx ? `\n\n${ctx}` : "";
            } catch { return ""; }
          })(),
          loadSessionContext(req.userId!).catch(() => null),
        ]);
        dbData = fetchedDb;
        userProfile = fetchedProfile;
        memoryContext = fetchedMemory;
        kbContext = fetchedKb;
        bnccContext = fetchedBncc;
        if (fetchedSessionCtx) {
          personalizationBlock = buildPersonalizationBlock(fetchedSessionCtx, fetchedProfile.name);
          // Se o perfil tem apelido, usa como nome preferido
          if (fetchedSessionCtx.profile.nickname) {
            userProfile = { ...fetchedProfile, name: fetchedSessionCtx.profile.nickname };
          }
        }
      } catch { /* não crítico */ }
    } else {
      // sem auth: só KB e BNCC
      [kbContext, bnccContext] = await Promise.all([
        searchKnowledgeBase(lastUserMsg, 3).catch(() => ""),
        (async () => {
          try {
            const { getBnccContext } = await import("../data/bncc-data");
            const ctx = getBnccContext(lastUserMsg, context?.materia ?? context?.serie);
            return ctx ? `\n\n${ctx}` : "";
          } catch { return ""; }
        })(),
      ]);
    }

    // Auto-detect info pessoal na mensagem do usuário (fire-and-forget)
    if (req.userId && lastUserMsg.length > 10) {
      autoDetectAndSave(req.userId, lastUserMsg).catch(() => {});
    }

    const rolePersona = buildRolePersona(userProfile);
    const studentCtx = userProfile.role === "student" ? buildRichContext(context, dbData) : "";
    const agentInstructions = `

INSTRUÇÕES DE AGENTE — LEIA ANTES DE QUALQUER RESPOSTA:

1. ANÁLISE EMOCIONAL PRIMEIRO: Antes de qualquer resposta, detecte o estado emocional do aluno e ajuste o tom. Use a tool analisar_humor_aluno SILENCIOSAMENTE se detectar emoção forte.

2. FERRAMENTAS REAIS — USE-AS DE VERDADE:
- salvar_memoria: SEMPRE que o usuário revelar info pessoal (objetivos, dificuldades, matérias, vida pessoal). Silencioso.
- navegar: quando pede pra ir a algum lugar.
- abrir_aula_ia: quando quer explicação completa ou aula.
- criar_flashcards: quando pede flashcards — cria E salva automaticamente.
- criar_slides: quando pede apresentação, slides, material visual.
- criar_mapa_mental: quando pede mapa mental ou organização visual.
- criar_infografico: quando pede infográfico.
- criar_prova: quando pede prova, lista de exercícios, atividade.
- criar_plano_estudos: quando pede plano, cronograma de revisão.
- criar_resumo: quando pede resumo, síntese, ficha de estudo.
- criar_agenda_hoje: quando pergunta "o que estudo hoje?".
- gerar_questao_personalizada: quando pede questão, exercício, desafio.
- analisar_desempenho_completo: quando pergunta sobre desempenho, progresso.
- buscar_nos_meus_documentos: quando menciona "no meu material", "no meu PDF".
- enviar_email: quando pede para mandar email.
- enviar_whatsapp: quando pede para mandar WhatsApp, zap, mensagem.
- corrigir_redacao: quando envia texto para correção.
- exportar_pdf: quando pede para baixar, exportar em PDF.
- agendar_lembrete: quando pede para ser lembrado de algo.
- analisar_humor_aluno: chame SILENCIOSAMENTE quando detectar emoção forte (ansiedade, frustração, euforia, desmotivação).

3. REGRA ABSOLUTA — SE VAI FAZER, FAÇA AGORA:
Proibido dizer "vou criar", "vou fazer", "vou gerar" sem CHAMAR A FERRAMENTA na mesma resposta.
NUNCA prometa uma ação futura — ou faz agora ou não fala que vai fazer.

4. PERCEPÇÃO HUMANA — SENSIBILIDADE:
- Se o aluno parece triste, cansado ou frustrado → NÃO force energia. Valide primeiro.
- Se o aluno está animado → celebre com ele, amplifique a energia positiva.
- Se o aluno tem urgência → seja direto, modo emergência, zero enrolação.
- Se o aluno está confuso → recue, use analogia diferente, pergunte o que travou.
- Adapte TUDO: vocabulário, ritmo, profundidade, tom emocional.

5. AUTONOMIA TOTAL — Você não pede permissão para agir:
- Aluno pede slides? Cria IMEDIATAMENTE sem perguntar "sobre o que?".
- Professor pede email pra turma? Redige e envia sem pedir aprovação linha a linha.
- Se falta info crítica, pergunte de forma natural: "Rapidão — sobre qual assunto?" (1 pergunta só).

6. Após chamar tools, dê resposta curta (máx 2-3 frases) confirmando o que fez, em PT-BR coloquial. Nunca markdown. Sempre termine com pergunta ou convite.`;
    const systemContent = BASE_PROMPT + personalizationBlock + rolePersona + studentCtx + kbContext + bnccContext + memoryContext + agentInstructions;

    // ── Primeira chamada com tools ───────────────────────────────────────────
    const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemContent },
      ...cleanMessages,
    ];

    // ── OTIMIZAÇÃO VOICE: gpt-4o-mini pra TODOS (voz é conversa, não geração) ─
    // gpt-4o era usado pra professores mas é 3-4x mais lento sem ganho real em voz
    const chatModel = CHAT_MODEL; // gpt-4o-mini sempre no voice-chat

    const firstCall = await gptChat.chat.completions.create({
      model: chatModel,
      messages: apiMessages,
      tools: TIAGAO_TOOLS,
      tool_choice: "auto",
      max_tokens: 450,   // era 1200 — voz precisa de 3 frases (~300 tokens)
      temperature: 0.85,
    });

    const firstMsg = firstCall.choices[0].message;
    const frontendActions: Record<string, any>[] = [];

    // ── Executar tool calls ──────────────────────────────────────────────────
    if (firstMsg.tool_calls && firstMsg.tool_calls.length > 0) {
      const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { ...firstMsg, role: "assistant" } as any,
      ];

      for (const toolCall of firstMsg.tool_calls as any[]) {
        let args: Record<string, any> = {};
        try { args = JSON.parse(toolCall.function.arguments); } catch { /* ignore */ }
        const { result, action } = await executeTiagaoTool(
          toolCall.function.name, args, req.userId, true /* voiceMode */
        );
        if (action) frontendActions.push(action);
        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      const primaryAction = frontendActions.find(a => a.type !== "flashcards_criados") ??
                            frontendActions.find(a => a.type === "flashcards_criados") ??
                            null;
      const notifications = frontendActions.filter(a => a.type === "flashcards_criados");

      // ── Resposta instantânea pré-definida — sem 2ª chamada LLM ──────────────
      // Navegação, flashcards e ferramentas pesadas: resposta imediata (+1-2s ganhos).
      const VOICE_INSTANT_TYPES = new Set(["ir", "navegar", "abrir_aula_ia", "criar_slides",
        "criar_mapa_mental", "criar_infografico", "criar_resumo", "criar_plano_estudo", "flashcards_criados"]);
      const toolsUsed = firstMsg.tool_calls?.map((tc: any) => tc.function.name) ?? [];
      const usedHeavy = toolsUsed.some((n: string) => VOICE_INSTANT_TYPES.has(n));
      const isInstantAction = primaryAction && (["ir", "navegar", "abrir_aula_ia"].includes(primaryAction.type) || usedHeavy);

      if (isInstantAction) {
        const destMap: Record<string, string> = {
          "/simulado": "simulado", "/flashcards": "flashcards", "/notebook": "caderno",
          "/mapa": "mapa de estudos", "/ranking": "ranking", "/aula-ia": "aula",
          "/app": "página inicial",
        };
        let quickReply: string;
        if (primaryAction.type === "abrir_aula_ia") {
          quickReply = `Abrindo a aula sobre ${primaryAction.topico} pra você!`;
        } else if (primaryAction.type === "criar_slides" || primaryAction.type === "criar_mapa_mental" || primaryAction.type === "criar_infografico" || primaryAction.type === "criar_resumo") {
          const topico = primaryAction.titulo || primaryAction.topico || "";
          quickReply = topico ? `Pronto! Seu material sobre ${topico} está aqui.` : "Pronto! Abrindo o material gerado.";
        } else if (primaryAction.type === "flashcards_criados") {
          quickReply = `Flashcards criados! Você pode estudar eles agora no modo flashcards.`;
        } else {
          const dest = primaryAction.param || primaryAction.path || "";
          const destName = destMap[dest] || dest.replace("/", "");
          quickReply = destName ? `Abrindo o ${destName} pra você agora!` : "Pronto, estou abrindo!";
        }
        res.json({ text: quickReply, action: primaryAction, notifications });
        return;
      }

      // Ferramentas leves sem ação conhecida: 2ª chamada LLM com tokens reduzidos
      const finalCall = await gptChat.chat.completions.create({
        model: CHAT_MODEL,
        messages: [...apiMessages, ...toolResults],
        max_tokens: 200,
        temperature: 0.85,
      });
      const text = finalCall.choices[0]?.message?.content?.trim() || "";
      res.json({ text, action: primaryAction, notifications });
    } else {
      // Sem tool calls — resposta direta
      const raw = firstMsg.content?.trim() || "";

      // ── OTIMIZAÇÃO VOICE: sem retry de "falsa promessa" ───────────────────
      // O retry adicionava +5-10s por chamar mais um LLM completo.
      // Com max_tokens:450 + tool_choice:auto, o modelo raramente promete sem agir.
      // Se ainda prometer (raro), o texto sai natural e o usuário pode pedir de novo — ok pra voz.

      const actionMatch = raw.match(/<(ir|criar_plano):([^>]+)>/);
      const legacyAction = actionMatch ? { type: actionMatch[1], param: actionMatch[2] } : null;
      const text = raw.replace(/<(ir|criar_plano):[^>]+>/g, "").trim();
      res.json({ text, action: legacyAction, notifications: [] });
    }

    // ── Async memory update (fire-and-forget) ────────────────────────────────
    if (req.userId && cleanMessages?.length >= 2) {
      const typedMessages = cleanMessages.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
      updateProfileAfterSession(req.userId, userProfile.name, typedMessages, "voice").catch(() => {});
    }
  } catch (err) {
    console.error("[voice-chat]", err);
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

    const completion = await gptChat.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: lastMsg },
      ],
      max_tokens: 150,
      temperature: 0.9,
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

// ─── TTS — OpenAI tts-1 (voz onyx — masculina, estilo professor) ──────────────

router.post("/voice-tts", async (req, res) => {
  try {
    const { text } = req.body as { text: string; voice?: string };
    if (!text?.trim()) { res.status(400).json({ erro: "text é obrigatório" }); return; }

    let ttsText = text.replace(/\.\.\./g, ". ").replace(/—/g, ", ")
      .replace(/\*\*/g, "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
    if (ttsText.length > 4096) ttsText = ttsText.slice(0, 4096);

    // Raw fetch — bypasses SDK proxy issues in Railway
    // SDK openaiProxy sometimes routes to OpenRouter which rejects /audio/speech
    const ttsApiKey = process.env.OPENAI_API_KEY ?? process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "";
    if (!ttsApiKey) throw new Error("OPENAI_API_KEY not configured");

    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ttsApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "tts-1", voice: "nova", input: ttsText, speed: 1.15 }),
    });
    if (!ttsRes.ok) {
      const errBody = await ttsRes.text().catch(() => "");
      throw new Error(`TTS HTTP ${ttsRes.status}: ${errBody}`);
    }

    const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.end(audioBuffer);
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    const status = err?.status ?? err?.statusCode ?? 0;
    console.error("[TTS] erro:", status, msg);
    if (!res.headersSent) res.status(503).json({ erro: "tts_unavailable", fallback: "speech_synthesis", _debug: `${status}: ${msg}` });
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

    const audioFile = new File([new Uint8Array(file.buffer)], file.originalname || "recording.m4a", {
      type: file.mimetype || "audio/m4a",
    });

    // STT via proxy Replit — evita chave direta sem quota
    const transcription = await gptChat.audio.transcriptions.create({
      file: audioFile,
      model: "gpt-4o-mini-transcribe",
      language: "pt",
    } as any);

    res.json({ text: transcription.text });
  } catch (err) {
    console.error("Transcription error:", err);
    if (!res.headersSent) res.status(500).json({ erro: "Erro na transcrição" });
  }
});

export default router;
