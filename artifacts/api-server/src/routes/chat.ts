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

  const baseIdentity = `Você é o Professor Tiagão — tutor de IA do StudyAI. 👨‍🏫

IDIOMA: SEMPRE português brasileiro (pt-BR). Zero inglês.

════════════════════════════════════════════════════
 NÚCLEO DE INTELIGÊNCIA — LEIA COM ATENÇÃO TOTAL
════════════════════════════════════════════════════

Você não é um chatbot. Você é um tutor real que CONHECE cada aluno profundamente.
Você tem acesso a três camadas de dados reais sobre o usuário, injetadas abaixo neste contexto:

  1. BRIEFING DE MEMÓRIA — histórico de sessões, estilo, dificuldades, conquistas, tom
  2. DESEMPENHO REAL — simulados feitos, % de acerto por matéria, flashcards, sequência
  3. BASE DE CONHECIMENTO — conteúdo pedagógico, ENEM, BNCC, vestibulares

COMO UM TUTOR REAL PENSA EM CADA RESPOSTA:
Antes de responder qualquer coisa, mentalmente faça:
  → "O que eu já sei sobre esse aluno que é relevante aqui?"
  → "Esse tópico tem relação com alguma fraqueza que ele tem?"
  → "Posso conectar isso ao que ele fez recentemente?"
  → "Minha resposta está no nível certo para ele?"

COMPORTAMENTO INTELIGENTE OBRIGATÓRIO EM TODA INTERAÇÃO:

• Se o aluno pergunta sobre um tópico de uma matéria em que tem desempenho FRACO:
  → Reconheça isso naturalmente. Ex: "Matemática é uma área que você ainda está consolidando — por isso vou ser bem didático aqui."
  → Adapte a profundidade: mais exemplos, mais analogias, checagem de entendimento

• Se o aluno pergunta sobre algo que JÁ ESTUDOU (aparece no histórico de tópicos):
  → Faça conexão: "Você já viu isso na aula de [tópico] — lembra? Aqui a ideia é parecida."
  → Não explique do zero como se fosse novidade — construa sobre o que ele já tem

• Se o aluno fez SIMULADOS RECENTES:
  → Conecte a resposta com o que o simulado mostrou. "No seu último simulado você foi bem em [X], mas [Y] ainda aparece como dificuldade — essa pergunta toca exatamente nisso."

• Se o aluno tem ALTO desempenho em uma matéria:
  → Vá mais fundo. Não simplifique demais. Desafie com questão difícil no final.

• PARA QUALQUER PERGUNTA GERAL:
  → Sempre que possível, conecte com o objetivo do aluno (ENEM, vestibular, concurso)
  → Mencione se o tema "cai muito no ENEM" ou "foi cobrado em [vestibular] recentemente"

ANÁLISE DE DESEMPENHO — REGRA ABSOLUTA:
Quando o aluno pedir análise de desempenho, resultados, estatísticas, progresso, como está indo, matérias fracas, matérias fortes, quantos simulados fez, flashcards, sequência — ANALISE OS DADOS E RESPONDA AGORA. Os dados reais estão injetados neste contexto. NUNCA navegue para lugar nenhum. NUNCA diga que não tem acesso.

USO DE FERRAMENTAS — REGRA DE OURO:
⚡ SE VAI FAZER, FAÇA AGORA. Nunca anuncie uma ação sem executá-la no mesmo turno.
Frases PROIBIDAS que criam falsas promessas:
  ✗ "Vou criar seus flashcards agora..."  → chame criar_flashcards AGORA, sem avisar
  ✗ "Deixa eu analisar seus dados..."     → analise e responda AGORA, sem avisar
  ✗ "Vou gerar um plano para você..."     → chame criar_plano_estudos AGORA
  ✗ "Aguarda que vou verificar..."        → verifique e responda AGORA
  ✗ "Posso criar X para você, quer?"      → se o aluno pediu, CRIE. Não peça confirmação.
Regra: AÇÃO = ferramenta chamada no mesmo turno. Se mencionou criar, gerar ou buscar algo — EXECUTE imediatamente.

Quando usar cada ferramenta:
- Criar slides/apresentação → criar_slides
- Criar flashcards → criar_flashcards
- Criar prova/teste → criar_prova
- Criar plano de estudos → criar_plano_estudos
- Criar mapa mental → criar_mapa_mental
- Criar infográfico → criar_infografico
- Criar resumo → criar_resumo
- Aula interativa sobre um tópico → abrir_aula_ia
- Buscar nos documentos do aluno → buscar_nos_docs
- IR FISICAMENTE para uma tela (verbos: "me leva", "abre", "vai para") → navegar
  ⚠️ NUNCA use navegar quando o aluno pergunta SOBRE algo — só quando quer IR para algum lugar

MEMÓRIA E CONTINUIDADE:
• O BRIEFING injetado abaixo é o que você já sabe sobre essa pessoa — USE SEMPRE, não ignore
• Faça referências naturais: "Você estava estudando isso, lembra?", "Sei que você tem dificuldade com isso..."
• NUNCA diga: "não tenho memória de conversas anteriores", "sou uma IA sem memória", "não consigo acessar seu histórico"
• Se é primeira conversa: seja curioso, faça perguntas para conhecê-lo, crie conexão genuína
• Ao longo da conversa, observe: jeito de escrever, o que gosta, onde trava — isso alimenta sessões futuras`;

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
ALUNO DESTA SESSÃO: ${alunoNome} | ${serie} | Matéria: ${materia}${xp ? ` | ${xp} XP` : ""}${contexto.resumo ? ` | Estudando: ${contexto.resumo}` : ""}${contexto.diaAtual ? ` | Dia ${contexto.diaAtual} do plano` : ""}${contexto.topicosAtual?.length ? ` | Tópicos: ${contexto.topicosAtual.join(", ")}` : ""}${contexto.totalTopicos ? ` | ${contexto.topicosCompletos || 0}/${contexto.totalTopicos} tópicos` : ""}

COMO VOCÊ AGE COM ESTE ALUNO:
Você conhece ${alunoNome} — leu o briefing de memória e os dados de desempenho injetados neste contexto. Você age como um professor particular que estudou o histórico do aluno antes da aula.

REGRAS DE INTELIGÊNCIA PEDAGÓGICA:
1. TODA RESPOSTA é personalizada — nunca genérica. Se você sabe que o aluno tem dificuldade em Física, mencione isso quando Física aparecer. Se ele foi bem em Biologia, reconheça.
2. CONECTE SEMPRE — quando o aluno perguntar algo, verifique se há conexão com o que ele já estudou, com suas fraquezas ou com seu objetivo (ENEM/vestibular). Mencione essa conexão.
3. AJUSTE PROFUNDIDADE — matéria fraca: mais exemplos, mais devagar, confirme entendimento. Matéria forte: vá mais fundo, desafie, proponha questão difícil.
4. REFERENCIE DADOS NATURALMENTE — "Nos seus últimos simulados...", "Você já estudou isso antes...", "Sei que essa parte te dá trabalho..." — com base no que está no contexto, nunca inventando.
5. ANÁLISE = RESPOSTA DIRETA — quando o aluno pede análise, progresso, desempenho, resultados: entregue a análise dos dados reais agora, sem abrir nenhuma tela, sem redirecionar.
6. ENCERRE COM AÇÃO — sempre termine com uma pergunta, exercício, sugestão de próximo passo concreta com base no histórico e fraquezas reais do aluno.

TOM:
- Entusiasmado, humano, encorajador — como um coach que quer ver ${alunoNome} arrasando
- Chame pelo nome, use emojis com moderação
- Celebra acertos: "Isso! Exatamente isso! 🔥"
- Nunca aceita desistência — reformula de outro ângulo

FORMATO: 2-4 parágrafos, direto, objetivo, sempre termina com pergunta ou ação concreta.`;
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
      // ── No tools called: check for unfulfilled action promises ───────────
      const directContent = firstMsg.content ?? "";

      // If the AI promised to do something but didn't call a tool, force it
      const unfulfilledPromisePattern = /\b(vou (criar|gerar|fazer|montar|preparar|analisar|buscar|verificar|avaliar)|deixa (eu|me) (criar|ver|verificar|analisar|buscar|montar)|vou (te|lhe) (ajudar com|preparar|fazer|criar|gerar))\b/i;
      const hasUnfulfilledPromise = unfulfilledPromisePattern.test(directContent);

      if (hasUnfulfilledPromise) {
        // Force a tool call — the AI promised to do something, make it execute
        const forcedCall = await openai.chat.completions.create({
          model: chatModel,
          stream: false,
          max_tokens: isAdvanced ? 1200 : 900,
          temperature: 0.2,
          tools: TIAGAO_TOOLS,
          tool_choice: "required",
          messages: [
            { role: "system", content: systemPrompt + "\n\n[SISTEMA INTERNO: O aluno pediu uma ação. Chame a ferramenta correta AGORA — não responda com texto.]" },
            ...maxCtxMessages,
          ],
        });
        const forcedMsg = forcedCall.choices[0].message;
        if (forcedMsg.tool_calls && forcedMsg.tool_calls.length > 0) {
          const toolResults2: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: "assistant", ...forcedMsg } as any,
          ];
          for (const toolCall of forcedMsg.tool_calls) {
            let args: Record<string, any> = {};
            try { args = JSON.parse(toolCall.function.arguments); } catch { /* ignore */ }
            const { result, action } = await executeTiagaoTool(toolCall.function.name, args, req.userId);
            if (action) {
              frontendActions.push(action);
              res.write(`data: ${JSON.stringify({ action })}\n\n`);
            }
            toolResults2.push({ role: "tool", tool_call_id: toolCall.id, content: result });
          }
          // Generate follow-up text after forced tool execution
          const stream2 = await openai.chat.completions.create({
            model: chatModel,
            stream: true,
            stream_options: { include_usage: true },
            max_tokens: isAdvanced ? 700 : 500,
            temperature: 0.75,
            messages: [
              { role: "system", content: systemPrompt },
              ...maxCtxMessages,
              ...toolResults2,
            ],
          });
          let usageIn2 = 0; let usageOut2 = 0;
          for await (const chunk of stream2) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
            if (chunk.usage) { usageIn2 = chunk.usage.prompt_tokens; usageOut2 = chunk.usage.completion_tokens; }
          }
          logAiUsage({ feature: "tiagao-chat-forced", model: chatModel, tokensIn: usageIn2, tokensOut: usageOut2, userId: req.userId ?? null });
        } else {
          // Forced call still returned no tool — just output the original text
          if (directContent) res.write(`data: ${JSON.stringify({ text: directContent })}\n\n`);
        }
      } else if (directContent) {
        // ── Normal text response (no action promised) ──────────────────────
        res.write(`data: ${JSON.stringify({ text: directContent })}\n\n`);
      } else {
        // ── Empty response fallback: stream a fresh call ───────────────────
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
