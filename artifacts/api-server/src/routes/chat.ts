import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import { usersTable, turmasTable, turmaMembershipsTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { checkFreeUsage } from "../lib/freeUsage";
import { searchKnowledge } from "./knowledge";
import { getBnccContext } from "../data/bncc-data";
import { logAiUsage } from "../lib/aiCostLogger";

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
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Detecção de intenção de slides ──────────────────────────────────────────
const SLIDES_INTENT_RE = /\b(cria[r]?\s+(um[a]?\s+)?(apresenta[çc][aã]o|slides?|slide\s+deck)|fa[çz][a-z]*\s+(um[a]?\s+)?(apresenta[çc][aã]o|slides?)|monta[r]?\s+(um[a]?\s+)?(apresenta[çc][aã]o|slides?)|ger[ae][r]?\s+(um[a]?\s+)?(apresenta[çc][aã]o|slides?))\b/i;

function extractSlideTopic(msg: string): string | null {
  const m = msg.match(/(?:sobre|de|a respeito de|com o tema|sobre o tema)\s+["']?(.+?)["']?\s*(?:\.|!|\?|$)/i);
  if (m) return m[1].trim().slice(0, 80);
  // fallback: tudo depois do verbo
  const m2 = msg.match(/(?:slides?|apresenta[çc][aã]o)\s+(?:sobre\s+)?(.+)/i);
  if (m2) return m2[1].trim().slice(0, 80);
  return null;
}

async function generateSlidesForChat(
  topico: string,
  materia: string,
  gpt: OpenAI
): Promise<Record<string, any> | null> {
  try {
    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `Você cria apresentações educacionais profissionais em português brasileiro.
Retorne APENAS JSON com a estrutura:
{
  "titulo": "Título da apresentação",
  "subtitulo": "Matéria | Nível",
  "tema": "indigo",
  "slides": [
    { "tipo": "capa", "titulo": "...", "subtitulo": "..." },
    { "tipo": "conteudo", "titulo": "...", "bullets": ["item 1","item 2","item 3"], "destaque": "..." },
    { "tipo": "encerramento", "titulo": "...", "mensagem": "...", "dicaEnem": "..." }
  ]
}
Tipos válidos: capa (1x início), agenda, conteudo, comparacao, citacao, encerramento (1x fim).
Gere 8 a 10 slides. Conteúdo curricular brasileiro alinhado ao ENEM.`,
        },
        { role: "user", content: `Crie uma apresentação sobre "${topico}"${materia && materia !== "Geral" ? ` da matéria ${materia}` : ""}.` },
      ],
    });
    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error("[chat:slides]", e);
    return null;
  }
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

    // ─── Detecção de intenção: criar slides ──────────────────────────────────
    if (SLIDES_INTENT_RE.test(lastUserMsg)) {
      const topico = extractSlideTopic(lastUserMsg) ?? lastUserMsg.slice(0, 60);
      const materia = contexto?.materia ?? "Geral";

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.flushHeaders();

      // Informa o usuário que está gerando
      res.write(`data: ${JSON.stringify({ text: `📊 Criando sua apresentação sobre **${topico}**... Aguarde alguns segundos!` })}\n\n`);

      const slidesData = await generateSlidesForChat(topico, materia, openai);

      if (slidesData?.slides?.length) {
        // Salva no notebook_artifacts se autenticado
        if (req.userId) {
          try {
            const { pool } = await import("@workspace/db");
            await pool.query(
              `INSERT INTO notebook_artifacts (user_id, doc_id, kind, title, payload)
               VALUES ($1, 0, 'slides', $2, $3::jsonb)`,
              [req.userId, slidesData.titulo ?? topico, JSON.stringify(slidesData)]
            );
          } catch { /* ignora erro de DB — slides ainda aparecem via ação */ }
        }
        res.write(`data: ${JSON.stringify({ action: { type: "criar_slides", slides: slidesData, titulo: slidesData.titulo ?? topico } })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ text: " Tive um problema ao gerar os slides. Tente novamente ou acesse o Estúdio IA para criar manualmente." })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders();

    // Fetch user profile + knowledge base in parallel
    const isAdvancedMatcher = ["teacher", "institution_admin", "government", "admin"];

    const [userProfile, kbContext] = await Promise.all([
      req.userId ? fetchUserProfile(req.userId) : Promise.resolve({ role: "student" as UserRole, name: contexto?.aluno || "Aluno" }),
      getFullKbContext(lastUserMsg, contexto?.materia, 5),
    ]);

    const isAdvanced = isAdvancedMatcher.includes(userProfile.role);
    // Removed extra sequential KB call — saves ~300-600ms before streaming starts
    const finalKb = kbContext;
    const systemPrompt = buildUniversalSystemPrompt(userProfile, contexto ?? {}) + (finalKb ? `\n\n${finalKb}` : "");

    // gpt-4o-mini: ~3x faster first-token, sufficient quality for educational Q&A
    // Use gpt-4o only for advanced professional users (teachers/gov) who need full depth
    const chatModel = isAdvanced ? "gpt-4o" : "gpt-4o-mini";
    const stream = await openai.chat.completions.create({
      model: chatModel,
      stream: true,
      stream_options: { include_usage: true },
      max_tokens: isAdvanced ? 1000 : 700,
      temperature: isAdvanced ? 0.4 : 0.75,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.slice(-16),
      ],
    });

    let usageIn = 0; let usageOut = 0;
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
      }
      if (chunk.usage) { usageIn = chunk.usage.prompt_tokens; usageOut = chunk.usage.completion_tokens; }
    }
    logAiUsage({ feature: "tiagao", model: chatModel, tokensIn: usageIn, tokensOut: usageOut, userId: (req as any).userId ?? null });

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
