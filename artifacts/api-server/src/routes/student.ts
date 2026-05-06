import { Router, type IRouter, type Request, type Response } from "express";
import { openai, OR } from "../lib/aiClient";
import { db } from "@workspace/db";
import {
  usersTable, turmaMembershipsTable, activitiesTable, activitySubmissionsTable,
  redacoesTable, studySchedulesTable, cadernoNotesTable, simuladoResultsTable,
} from "@workspace/db/schema";
import { eq, and, desc, not } from "drizzle-orm";

const router: IRouter = Router();

// ─── Cronograma Adaptativo ────────────────────────────────────────────────────
router.get("/student/cronograma", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  try {
    const [row] = await db.select().from(studySchedulesTable)
      .where(and(eq(studySchedulesTable.userId, req.userId!), eq(studySchedulesTable.isActive, true)))
      .orderBy(desc(studySchedulesTable.createdAt)).limit(1);
    res.json({ cronograma: row ?? null });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar cronograma" });
  }
});

router.post("/student/cronograma", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const { targetDate, targetScore, hoursPerDay, objetivo, materiasFocais } = req.body as {
    targetDate?: string; targetScore?: number; hoursPerDay?: number; objetivo?: string; materiasFocais?: string[];
  };
  if (!targetDate || !objetivo) { res.status(400).json({ error: "targetDate e objetivo são obrigatórios" }); return; }

  try {
    const target = new Date(targetDate);
    const today = new Date();
    const weeksUntil = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const hoursDay = Math.min(Math.max(hoursPerDay ?? 2, 1), 8);

    const weakSubjects = materiasFocais ?? ["Matemática", "Português", "Ciências da Natureza", "Ciências Humanas"];

    const completion = await openai.chat.completions.create({
      model: OR.fast,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [{
        role: "system",
        content: `Você é um coach de estudos especialista em ENEM/vestibulares brasileiros.
Crie um cronograma de estudos personalizado adaptativo.
Retorne SOMENTE JSON:
{
  "titulo": "título do plano",
  "resumo": "resumo executivo do plano (2-3 frases)",
  "semanas": [
    {
      "numero": 1,
      "tema": "nome da semana (ex: Fundamentos de Matemática)",
      "foco": "objetivo principal desta semana",
      "dias": [
        {"dia": "Segunda", "materia": "Matemática", "topico": "Funções do 1º grau", "horas": 2, "atividade": "Vídeo + Exercícios"},
        {"dia": "Terça", "materia": "Português", "topico": "Interpretação de texto", "horas": 2, "atividade": "Simulado rápido"}
      ]
    }
  ],
  "metas": [
    {"semana": 4, "descricao": "meta de 4 semanas"},
    {"semana": 8, "descricao": "meta de 8 semanas"}
  ],
  "dicas": ["dica 1", "dica 2", "dica 3"]
}`,
      }, {
        role: "user",
        content: `Crie um cronograma de ${Math.min(weeksUntil, 16)} semanas para: Objetivo: ${objetivo}. Data alvo: ${targetDate}. Horas por dia: ${hoursDay}h. Matérias prioritárias: ${weakSubjects.join(", ")}. Nota alvo: ${targetScore ?? 750}/1000.`,
      }],
    });

    const schedule = JSON.parse(completion.choices[0].message.content ?? "{}");

    // Deactivate existing
    await db.update(studySchedulesTable).set({ isActive: false })
      .where(eq(studySchedulesTable.userId, req.userId!));

    const [created] = await db.insert(studySchedulesTable).values({
      userId: req.userId!,
      targetDate: target,
      targetScore: targetScore ?? 750,
      hoursPerDay: hoursDay,
      objetivo,
      materiasFocais: weakSubjects,
      schedule,
      isActive: true,
    }).returning();

    res.json({ ok: true, cronograma: created });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar cronograma" });
  }
});

// ─── Caderno Digital ──────────────────────────────────────────────────────────
router.get("/student/caderno", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  try {
    const notes = await db.select().from(cadernoNotesTable)
      .where(eq(cadernoNotesTable.userId, req.userId!))
      .orderBy(desc(cadernoNotesTable.updatedAt)).limit(50);
    res.json({ notes });
  } catch {
    res.status(500).json({ error: "Erro ao buscar notas" });
  }
});

router.post("/student/caderno", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const { title, content, materia } = req.body as { title?: string; content?: string; materia?: string };
  if (!title?.trim() || !content?.trim()) { res.status(400).json({ error: "Título e conteúdo são obrigatórios" }); return; }
  try {
    const [note] = await db.insert(cadernoNotesTable).values({
      userId: req.userId!, title, content, materia,
    }).returning();
    res.json({ ok: true, note });
  } catch {
    res.status(500).json({ error: "Erro ao salvar nota" });
  }
});

router.put("/student/caderno/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const { title, content, materia } = req.body as { title?: string; content?: string; materia?: string };
  try {
    const [note] = await db.update(cadernoNotesTable)
      .set({ title, content, materia, updatedAt: new Date() })
      .where(and(eq(cadernoNotesTable.id, String(req.params.id)), eq(cadernoNotesTable.userId, req.userId!)))
      .returning();
    res.json({ ok: true, note });
  } catch {
    res.status(500).json({ error: "Erro ao atualizar nota" });
  }
});

router.delete("/student/caderno/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  try {
    await db.delete(cadernoNotesTable)
      .where(and(eq(cadernoNotesTable.id, String(req.params.id)), eq(cadernoNotesTable.userId, req.userId!)));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao excluir nota" });
  }
});

router.post("/student/caderno/:id/process", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  try {
    const [note] = await db.select().from(cadernoNotesTable)
      .where(and(eq(cadernoNotesTable.id, String(req.params.id)), eq(cadernoNotesTable.userId, req.userId!))).limit(1);
    if (!note) { res.status(404).json({ error: "Nota não encontrada" }); return; }

    const completion = await openai.chat.completions.create({
      model: OR.pro, temperature: 0.4,
      response_format: { type: "json_object" },
      max_tokens: 4000,
      messages: [{
        role: "system",
        content: `Você é um professor universitário sênior especializado em ENEM e vestibulares. Processe as anotações do aluno e crie um pacote de aprendizagem RICO e DENSO — nunca superficial.

REGRAS OBRIGATÓRIAS:
- "resumo": 4-6 parágrafos com explicações completas, contexto histórico/científico, dados e exemplos reais. NUNCA apenas liste tópicos — explique profundamente cada um.
- "keyPoints": 6-8 pontos, cada um com 2-3 frases de explicação (não bullets curtos de 5 palavras).
- "mindMap": 4-5 filhos com 3-4 netos cada; cada neto com label descritivo (não apenas 2 palavras).
- "flashcards": 8-12 cards; "front" = pergunta específica não-óbvia; "back" = resposta em 3-4 frases com exemplo concreto e dica ENEM.
- "questoes": 5 questões no estilo exato ENEM com texto motivador, 4 alternativas plausíveis (A/B/C/D) e explicação detalhada do gabarito.

Retorne JSON:
{
  "resumo": "string com 4-6 parágrafos densos",
  "keyPoints": ["Ponto 1: explicação completa em 2-3 frases.", "Ponto 2: ..."],
  "mindMap": {"label": "tema central", "emoji": "🎯", "children": [{"label": "subtópico 1", "emoji": "📖", "children": [{"label": "conceito específico com dados", "emoji": "🔹"}, {"label": "outro conceito", "emoji": "🔸"}]}]},
  "flashcards": [{"front": "pergunta específica?", "back": "resposta em 3-4 frases com exemplo e dica ENEM"}],
  "questoes": [{"text": "texto motivador + enunciado", "alternatives": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": 0, "explanation": "Por que A está correta e por que B, C, D estão erradas"}]
}`,
      }, { role: "user", content: `Título: ${note.title}\n\nAnotações:\n${note.content}` }],
    });

    const processed = JSON.parse(completion.choices[0].message.content ?? "{}");
    await db.update(cadernoNotesTable).set({ processedContent: processed, updatedAt: new Date() })
      .where(eq(cadernoNotesTable.id, note.id));

    res.json({ ok: true, processed });
  } catch {
    res.status(500).json({ error: "Erro ao processar nota" });
  }
});

// ─── Redação do Aluno (submit + AI correction + save to DB) ───────────────────
router.get("/student/redacoes", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  try {
    const redacoes = await db.select().from(redacoesTable)
      .where(eq(redacoesTable.userId, req.userId!))
      .orderBy(desc(redacoesTable.createdAt)).limit(20);
    res.json({ redacoes });
  } catch {
    res.status(500).json({ error: "Erro ao buscar redações" });
  }
});

// ─── Atividades do Aluno (professor → aluno) ─────────────────────────────────
router.get("/student/activities", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  try {
    // Get student's turmas
    const memberships = await db.select({ turmaId: turmaMembershipsTable.turmaId })
      .from(turmaMembershipsTable).where(eq(turmaMembershipsTable.studentId, req.userId!));
    const turmaIds = memberships.map(m => m.turmaId);

    if (!turmaIds.length) { res.json({ activities: [] }); return; }

    // Get activities for those turmas
    const { inArray } = await import("drizzle-orm");
    const activities = await db.select().from(activitiesTable)
      .where(and(inArray(activitiesTable.turmaId, turmaIds), eq(activitiesTable.isPublished, true)))
      .orderBy(desc(activitiesTable.createdAt)).limit(30);

    // Get student's submissions
    const activityIds = activities.map(a => a.id);
    const submissions = activityIds.length ? await db.select().from(activitySubmissionsTable)
      .where(and(inArray(activitySubmissionsTable.activityId, activityIds), eq(activitySubmissionsTable.studentId, req.userId!)))
      : [];

    const submittedIds = new Set(submissions.map(s => s.activityId));
    const result = activities.map(a => ({
      ...a,
      submitted: submittedIds.has(a.id),
      submission: submissions.find(s => s.activityId === a.id) ?? null,
    }));

    res.json({ activities: result });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar atividades" });
  }
});

router.post("/student/activities/:id/submit", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const { answers, timeSpentSeconds } = req.body as { answers?: Record<string, number>; timeSpentSeconds?: number };
  try {
    const [activity] = await db.select().from(activitiesTable).where(eq(activitiesTable.id, String(req.params.id))).limit(1);
    if (!activity) { res.status(404).json({ error: "Atividade não encontrada" }); return; }

    // Calculate score
    const questions = (activity.content as any)?.questions ?? [];
    let score = 0;
    if (answers) {
      for (const [idx, selected] of Object.entries(answers)) {
        if (questions[Number(idx)]?.correct === selected) score++;
      }
    }

    const [submission] = await db.insert(activitySubmissionsTable).values({
      activityId: String(req.params.id),
      studentId: req.userId!,
      answers,
      score,
      total: questions.length,
      timeSpentSeconds,
    }).returning();

    res.json({ ok: true, submission, score, total: questions.length });
  } catch {
    res.status(500).json({ error: "Erro ao enviar resposta" });
  }
});

// ─── SISU / Notas de Corte ────────────────────────────────────────────────────
router.post("/student/sisu", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const { curso, universidade, estado } = req.body as { curso?: string; universidade?: string; estado?: string };
  if (!curso) { res.status(400).json({ error: "Curso é obrigatório" }); return; }
  try {
    const completion = await openai.chat.completions.create({
      model: OR.fast, temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [{
        role: "system",
        content: `Você é um especialista em SISU, PROUNI e FIES brasileiros. Forneça informações educacionais baseadas em dados históricos do ENEM/SISU.
Retorne JSON:
{
  "curso": "nome do curso",
  "universidades": [
    {
      "nome": "nome da universidade",
      "sigla": "sigla",
      "cidade": "cidade",
      "estado": "estado",
      "turno": "Integral/Noturno/Matutino",
      "vagas": 40,
      "notaCorteBrasil": 720,
      "notaCorteAmpla": 680,
      "modalidade": "Ampla concorrência",
      "dificuldade": "Alta/Média/Baixa"
    }
  ],
  "mediaGeral": 710,
  "planoDeEstudo": "o que estudar para alcançar a nota corte",
  "materia_critica": "matéria que mais influencia a nota para este curso",
  "dicas": ["dica 1", "dica 2", "dica 3"],
  "observacao": "aviso sobre atualização dos dados"
}`,
      }, { role: "user", content: `Buscar: Curso="${curso}"${universidade ? `, Universidade="${universidade}"` : ""}${estado ? `, Estado="${estado}"` : ""}. Traga as 5 principais universidades públicas federais ou estaduais com as melhores notas de corte históricas do SISU.` }],
    });

    const result = JSON.parse(completion.choices[0].message.content ?? "{}");
    res.json({ ok: true, result });
  } catch {
    res.status(500).json({ error: "Erro ao buscar informações SISU" });
  }
});

export default router;
