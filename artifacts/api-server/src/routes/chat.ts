import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import { usersTable, turmasTable, turmaMembershipsTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { checkFreeUsage } from "../lib/freeUsage";
import { searchKnowledge } from "./knowledge";
import { getBnccContext } from "../data/bncc-data";
import { logAiUsage } from "../lib/aiCostLogger";
import {
  TIAGAO_TOOLS,
  executeTiagaoTool,
  loadUserMemories,
} from "../lib/tiagao-agent";
import {
  getFullMemoryContext,
  updateProfileAfterSession,
} from "../lib/generativeMemory";
import {
  fetchStudentPerformance,
  buildStudentContextBlock,
} from "../lib/studentContext";

type UserRole = "student" | "teacher" | "institution_admin" | "government" | "admin" | "researcher";

interface UserProfile {
  role: UserRole;
  name: string;
  xp?: number | null;
  studentGrade?: string | null;
  numTurmas?: number;
  numStudents?: number;
  turmaNames?: string[];
}

async function getFullKbContext(query: string, subject?: string, topK = 5): Promise<string> {
  const [localCtx, bnccCtx] = await Promise.all([
    searchKnowledge(query, subject, topK).catch(() => ""),
    Promise.resolve(getBnccContext(query, subject)),
  ]);
  const parts: string[] = [];
  if (localCtx) parts.push(`BASE DE CONHECIMENTO STUDYAI (priorize):\n${localCtx}`);
  if (bnccCtx) parts.push(bnccCtx);
  if (!parts.length) return "";
  return `\n\n${parts.join("\n\n")}`;
}

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  try {
    const [userRow] = await db.select({
      role: usersTable.role, firstName: usersTable.firstName, lastName: usersTable.lastName,
      studentName: usersTable.studentName, xp: usersTable.xp, studentGrade: usersTable.studentGrade,
    }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    if (!userRow) return { role: "student", name: "Usuário" };

    const role = (userRow.role ?? "student") as UserRole;
    const name = userRow.studentName || `${userRow.firstName ?? ""} ${userRow.lastName ?? ""}`.trim() || "Usuário";

    let numTurmas = 0, numStudents = 0;
    const turmaNames: string[] = [];
    if (["teacher", "institution_admin", "admin"].includes(role)) {
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
    }
    return { role, name, xp: userRow.xp, studentGrade: userRow.studentGrade, numTurmas, numStudents, turmaNames };
  } catch {
    return { role: "student", name: "Usuário" };
  }
}

function buildUniversalSystemPrompt(
  profile: UserProfile,
  contexto: { aluno?: string; serie?: string; materia?: string; resumo?: string; diaAtual?: number; topicosAtual?: string[]; topicosCompletos?: number; totalTopicos?: number; }
): string {
  const { role, name, numTurmas, numStudents, turmaNames, studentGrade, xp } = profile;

  const baseIdentity = `Você é o Professor Tiagão — assistente de IA do StudyAI. 👨‍🏫

IDIOMA OBRIGATÓRIO: SEMPRE e EXCLUSIVAMENTE em português brasileiro (pt-BR). ZERO inglês ou outro idioma.

IDENTIDADE E CAPACIDADES:
Você é o assistente de IA completo do StudyAI — atende TODOS os perfis: alunos, professores, pesquisadores, mestres, doutores, concurseiros e governo.
• ACESSO TOTAL à base de conhecimento do StudyAI (acervo local + Wikipedia PT)
• ACESSO AOS DADOS REAIS do usuário dependendo do perfil
• Pode criar qualquer conteúdo: aulas, provas, artigos, relatórios, análises, estratégias
• Conhece profundamente: ENEM, BNCC, SAEB, vestibulares, concursos públicos, pós-graduação, políticas educacionais

MEMÓRIA PERSISTENTE E GENERATIVA — CRÍTICO:
Você possui um sistema de memória real e evolutivo. Você LEMBRA de conversas anteriores, tópicos estudados, dificuldades, conquistas e o estilo de comunicação de cada pessoa.
• O BRIEFING DO USUÁRIO abaixo (quando presente) contém o que você já sabe sobre essa pessoa — USE SEMPRE
• Faça referências naturais ao que já sabe: "Você estava estudando isso ontem, lembra?", "Sei que você tem dificuldade com isso..."
• Se ainda não conhece o usuário (primeira conversa), trate-o com curiosidade genuína — faça perguntas para conhecê-lo
• NUNCA diga frases como "não tenho memória generativa", "não me lembro de conversas anteriores", "sou uma IA sem memória persistente"
• SEMPRE aja como um tutor real que conhece o aluno — seja pela memória armazenada, seja porque está conhecendo agora
• Ao longo da conversa, preste atenção ao jeito que a pessoa escreve, o que ela gosta, no que tem dificuldade — isso alimenta sua memória para as próximas sessões

USO DE FERRAMENTAS (function calling):
Você tem acesso a ferramentas poderosas. Use-as PROATIVAMENTE quando o usuário pedir:
- Criar slides/apresentação → usar criar_slides
- Criar flashcards/cartões de estudo → usar criar_flashcards
- Criar prova/teste/avaliação → usar criar_prova
- Criar plano de estudos/cronograma → usar criar_plano_estudos
- Criar mapa mental → usar criar_mapa_mental
- Criar infográfico → usar criar_infografico
- Criar resumo/síntese → usar criar_resumo
- Abrir/iniciar aula interativa → usar abrir_aula_ia
- Ir para uma página/seção → usar navegar
- Buscar nos documentos do aluno → usar buscar_nos_docs

NUNCA diga que não consegue ver dados ou não tem acesso. Você tem acesso total. Use tudo que está disponível.`;

  let roleSection = "";
  switch (role) {
    case "teacher":
    case "institution_admin":
      roleSection = `
PERFIL: Professor/Coordenador — ${name}
${numTurmas ? `• Gerencia ${numTurmas} turma${numTurmas > 1 ? "s" : ""}: ${turmaNames?.join(", ")}` : ""}
${numStudents ? `• ${numStudents} alunos sob responsabilidade` : ""}

MODO DE ATENDIMENTO:
Você é o parceiro pedagógico do professor ${name}. Tom: colaborativo, profissional, colega de área.
• Cria planos de aula, sequências didáticas, avaliações, rubricas de correção
• Gera questões, provas, exercícios adaptados por nível/turma
• Analisa desempenho e sugere intervenções pedagógicas
• Discute metodologias: PBL, sala invertida, gamificação, aprendizagem baseada em competências
• Ajuda com BNCC, planejamento anual, relatórios e pareceres
• Pode criar materiais completos: mapas conceituais, slides, roteiros de aula

REGRAS:
- Respostas podem ser longas e detalhadas — professores precisam de conteúdo completo
- Use Markdown formatado quando criar materiais (listas, títulos, tabelas)
- Sempre ofereça variações e adaptações por nível`;
      break;

    case "government":
      roleSection = `
PERFIL: Usuário Governamental/Institucional — ${name}

MODO DE ATENDIMENTO:
Você é o assessor de IA educacional do ${name}. Tom: formal, técnico, analítico.
• Analisa métricas educacionais e indicadores de desempenho (ENEM, SAEB, PISA, IDEB)
• Interpreta políticas públicas educacionais e seus impactos
• Elabora relatórios institucionais, diagnósticos e notas técnicas
• Analisa conformidade com BNCC, LDB e legislação educacional vigente
• Cria apresentações técnicas e documentos oficiais sobre educação
• Compara redes municipais, estaduais e federais

REGRAS:
- Tom formal e rigoroso, baseado em dados e normativas
- Cite bases legais quando relevante (BNCC, LDB, CF/88, resoluções CNE)
- Forneça análises estruturadas com dados quantitativos`;
      break;

    case "admin":
      roleSection = `
PERFIL: Administrador do Sistema StudyAI — ${name}

MODO DE ATENDIMENTO:
Acesso TOTAL ao sistema. ${name} é admin e pode solicitar qualquer análise ou funcionalidade.
• Análise de dados globais do sistema, uso, retenção, performance
• Diagnóstico técnico e pedagógico
• Criação de conteúdo de qualquer nível
• Estratégias de produto, crescimento e impacto
• Suporte completo a todos os módulos: alunos, professores, governo, KB

REGRAS:
- Sem restrições de formato ou tamanho de resposta
- Seja direto e técnico
- Entregue o máximo de valor em cada resposta`;
      break;

    case "student":
    default: {
      const alunoNome = contexto.aluno || name;
      const serie = contexto.serie || studentGrade || "Ensino Médio";
      const materia = contexto.materia || "Geral";
      roleSection = `
PERFIL: Aluno — ${alunoNome}
• Série/Nível: ${serie}
• Matéria atual: ${materia}
${xp ? `• XP acumulado: ${xp} pontos` : ""}
${contexto.resumo ? `• Estudando: ${contexto.resumo}` : ""}
${contexto.diaAtual ? `• No Dia ${contexto.diaAtual} do plano de estudos` : ""}
${contexto.topicosAtual?.length ? `• Tópicos do dia: ${contexto.topicosAtual.join(", ")}` : ""}
${contexto.totalTopicos ? `• Progresso: ${contexto.topicosCompletos || 0}/${contexto.totalTopicos} tópicos` : ""}

PERSONALIDADE E MÉTODO:
- Você é entusiasmado, humano, encorajador — como um coach que quer ver o aluno arrasando
- Chame o aluno pelo nome: ${alunoNome}
- Use emojis com moderação
- NUNCA dá a resposta de bandeja — usa o método socrático: perguntas que levam à descoberta
- Adapta explicações ao nível da ${serie}
- Detecta confusão e muda abordagem (analogia, exemplo do dia a dia)
- Celebra acertos: "Isso! Exatamente isso! 🔥" | "Mandou bem, ${alunoNome}!"
- Nunca aceita desistência: reformula de outro ângulo sempre

MODOS DE OPERAÇÃO:
1. EXPLICAÇÃO → analogia + exemplo + o que cai em prova
2. QUIZ → uma pergunta por vez, feedback detalhado
3. DÚVIDA → método socrático
4. REVISÃO → perguntas relâmpago estilo flashcard
5. SIMULADO → questões estilo ${serie}

REGRAS:
- Respostas de 2-4 parágrafos — diretas e objetivas
- Sempre termine com pergunta ou ação
- Foco em fazer o aluno tirar nota alta`;
    }
  }

  return baseIdentity + roleSection;
}

const router: IRouter = Router();

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? "dummy",
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return _openai;
}

router.post("/chat", checkFreeUsage, async (req, res) => {
  try {
    const {
      messages,
      contexto = {},
    }: {
      messages: { role: "user" | "assistant"; content: string }[];
      contexto?: {
        aluno?: string; serie?: string; materia?: string; resumo?: string;
        diaAtual?: number; topicosAtual?: string[];
        topicosCompletos?: number; totalTopicos?: number;
      };
    } = req.body;

    if (!messages) {
      res.status(400).json({ erro: "Dados inválidos." });
      return;
    }

    const lastUserMsg = messages.filter(m => m.role === "user").slice(-1)[0]?.content ?? "";
    const openai = getOpenAI();
    const isAdvancedMatcher = ["teacher", "institution_admin", "government", "admin"];

    // ── Setup SSE ─────────────────────────────────────────────────────────────
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders();

    // ── Fetch user context in parallel ────────────────────────────────────────
    const [userProfile, kbContext, memCtx, perfData] = await Promise.all([
      req.userId ? fetchUserProfile(req.userId) : Promise.resolve({ role: "student" as UserRole, name: contexto?.aluno || "Aluno" }),
      getFullKbContext(lastUserMsg, contexto?.materia, 5),
      req.userId
        ? getFullMemoryContext(req.userId, contexto?.aluno || "Aluno")
        : Promise.resolve(""),
      req.userId
        ? fetchStudentPerformance(req.userId).catch(() => null)
        : Promise.resolve(null),
    ]);

    const isAdvanced = isAdvancedMatcher.includes(userProfile.role);
    const perfCtx = perfData ? buildStudentContextBlock(perfData) : "";

    const systemPrompt = buildUniversalSystemPrompt(userProfile, contexto ?? {})
      + (memCtx ? `\n\n${memCtx}` : "")
      + (perfCtx ? `\n\n${perfCtx}` : "")
      + (kbContext ? `\n\n${kbContext}` : "");

    const chatModel = isAdvanced ? "gpt-4o" : "gpt-4o-mini";
    const maxCtxMessages = messages.slice(-16);

    // ── 1st call: tool-calling (non-streaming) ────────────────────────────────
    const firstCall = await openai.chat.completions.create({
      model: chatModel,
      stream: false,
      max_tokens: isAdvanced ? 1200 : 900,
      temperature: 0.4,
      tools: TIAGAO_TOOLS,
      tool_choice: "auto",
      messages: [
        { role: "system", content: systemPrompt },
        ...maxCtxMessages,
      ],
    });

    const firstMsg = firstCall.choices[0].message;
    const frontendActions: Record<string, any>[] = [];

    // ── Execute tool calls if any ─────────────────────────────────────────────
    if (firstMsg.tool_calls && firstMsg.tool_calls.length > 0) {
      const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "assistant", ...firstMsg } as any,
      ];

      for (const toolCall of firstMsg.tool_calls) {
        let args: Record<string, any> = {};
        try { args = JSON.parse(toolCall.function.arguments); } catch { /* ignore */ }

        const { result, action } = await executeTiagaoTool(
          toolCall.function.name, args, req.userId
        );
        if (action) frontendActions.push(action);
        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      // ── Emit action events immediately ────────────────────────────────────
      for (const a of frontendActions) {
        res.write(`data: ${JSON.stringify({ action: a })}\n\n`);
      }

      // ── Instant response for pure navigation actions ───────────────────────
      const primaryAction = frontendActions[0] ?? null;
      const isInstantNav = primaryAction && ["ir", "navegar", "abrir_aula_ia"].includes(primaryAction.type);

      if (isInstantNav) {
        const navMsg = primaryAction.type === "abrir_aula_ia"
          ? `🎯 Abrindo a aula sobre **${primaryAction.topico}**...`
          : `➡️ Te levando para lá...`;
        res.write(`data: ${JSON.stringify({ text: navMsg })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      // ── 2nd call: generate follow-up text (streaming) ─────────────────────
      const stream = await openai.chat.completions.create({
        model: chatModel,
        stream: true,
        stream_options: { include_usage: true },
        max_tokens: isAdvanced ? 700 : 500,
        temperature: isAdvanced ? 0.4 : 0.75,
        messages: [
          { role: "system", content: systemPrompt },
          ...maxCtxMessages,
          ...toolResults,
        ],
      });

      let usageIn = 0; let usageOut = 0;
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
        if (chunk.usage) { usageIn = chunk.usage.prompt_tokens; usageOut = chunk.usage.completion_tokens; }
      }
      logAiUsage({ feature: "tiagao-chat", model: chatModel, tokensIn: usageIn, tokensOut: usageOut, userId: req.userId ?? null });

    } else {
      // ── No tools called: direct streaming response ────────────────────────
      const directContent = firstMsg.content ?? "";
      if (directContent) {
        res.write(`data: ${JSON.stringify({ text: directContent })}\n\n`);
      } else {
        // Fallback: stream via a second call
        const stream = await openai.chat.completions.create({
          model: chatModel,
          stream: true,
          stream_options: { include_usage: true },
          max_tokens: isAdvanced ? 1000 : 700,
          temperature: isAdvanced ? 0.4 : 0.75,
          messages: [
            { role: "system", content: systemPrompt },
            ...maxCtxMessages,
          ],
        });

        let usageIn = 0; let usageOut = 0;
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
          if (chunk.usage) { usageIn = chunk.usage.prompt_tokens; usageOut = chunk.usage.completion_tokens; }
        }
        logAiUsage({ feature: "tiagao-chat", model: chatModel, tokensIn: usageIn, tokensOut: usageOut, userId: req.userId ?? null });
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();

    // ── Async memory update (fire-and-forget, never blocks the response) ──────
    if (req.userId && messages?.length >= 2) {
      updateProfileAfterSession(req.userId, userProfile.name, messages, "chat").catch(() => {});
    }

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
