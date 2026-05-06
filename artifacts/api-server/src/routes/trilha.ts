import { Router } from "express";
import { aiChat } from "../lib/aiClient";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { logAiUsage } from "../lib/aiCostLogger";
import { trackEvent } from "../lib/trackEvent";

const router = Router();

// ── Currículo por nível ──────────────────────────────────────────────────────

function getCurriculo(subject: string, level: number): string {
  if (subject === "matematica") {
    if (level <= 10) return `Nível ${level} — Aritmética básica: operações com inteiros (soma, subtração, multiplicação, divisão). Questões simples e diretas, sem contexto complexo.`;
    if (level <= 20) return `Nível ${level} — Frações e decimais: operações com frações, conversão fração↔decimal, comparação de frações. Dificuldade moderada.`;
    if (level <= 30) return `Nível ${level} — Porcentagem e proporção: cálculo de porcentagem, regra de três simples e composta, razão e proporção.`;
    if (level <= 40) return `Nível ${level} — Álgebra básica: simplificação de expressões algébricas, equações de 1º grau, inequações simples.`;
    if (level <= 50) return `Nível ${level} — Equações de 2º grau e fatoração: Bhaskara, produto notável, fatoração de polinômios.`;
    if (level <= 60) return `Nível ${level} — Funções: função do 1º e 2º grau, domínio, imagem, gráficos, raízes.`;
    if (level <= 70) return `Nível ${level} — Geometria plana: área e perímetro de figuras planas, teorema de Pitágoras, semelhança de triângulos.`;
    if (level <= 80) return `Nível ${level} — Geometria espacial: volume e área de prismas, pirâmides, cilindros, cones e esferas.`;
    if (level <= 90) return `Nível ${level} — Trigonometria: seno, cosseno e tangente no triângulo retângulo e na circunferência, lei dos senos e cossenos.`;
    return `Nível ${level} — Estatística, probabilidade e progressões: média, moda, mediana, PA, PG, probabilidade clássica. Nível ENEM difícil.`;
  }
  // português
  if (level <= 10) return `Nível ${level} — Ortografia e acentuação: regras de escrita, uso do hífen, acento agudo/circunflexo/grave, dígrafo.`;
  if (level <= 20) return `Nível ${level} — Pontuação: uso de vírgula, ponto e vírgula, dois pontos, travessão, reticências.`;
  if (level <= 30) return `Nível ${level} — Classes de palavras: substantivo, adjetivo, verbo, advérbio, pronome, preposição, conjunção, interjeição.`;
  if (level <= 40) return `Nível ${level} — Análise sintática: sujeito, predicado, objeto direto/indireto, adjunto adverbial, aposto, vocativo.`;
  if (level <= 50) return `Nível ${level} — Concordância verbal e nominal: regras e casos especiais de concordância.`;
  if (level <= 60) return `Nível ${level} — Regência verbal e nominal e crase: preposições exigidas por verbos e nomes, uso correto do acento grave.`;
  if (level <= 70) return `Nível ${level} — Interpretação de texto: inferência, intertextualidade, sentido conotativo/denotativo, gêneros textuais.`;
  if (level <= 80) return `Nível ${level} — Figuras de linguagem e semântica: metáfora, metonímia, ironia, hipérbole, sinonímia, antonímia, polissemia.`;
  if (level <= 90) return `Nível ${level} — Literatura brasileira: Barroco, Arcadismo, Romantismo, Realismo, Modernismo — principais autores e obras.`;
  return `Nível ${level} — Dissertação argumentativa e coesão textual: estrutura da redação ENEM, mecanismos de coesão, argumentação, proposta de intervenção.`;
}

function getSubjectLabel(subject: string) {
  return subject === "matematica" ? "Matemática" : "Língua Portuguesa";
}

// ── GET /api/trilha/status ───────────────────────────────────────────────────
router.get("/trilha/status", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  try {
    const rows = await db.execute<any>(sql`
      SELECT subject, level, total_sessions, total_correct, total_questions,
             current_streak, best_streak, last_session_at
      FROM trilha_mestre_progress
      WHERE user_id = ${userId}
    `);
    const data: Record<string, any> = {};
    for (const row of rows.rows) {
      data[row.subject] = {
        level: row.level,
        totalSessions: row.total_sessions,
        totalCorrect: row.total_correct,
        totalQuestions: row.total_questions,
        accuracy: row.total_questions > 0
          ? Math.round((row.total_correct / row.total_questions) * 100)
          : 0,
        currentStreak: row.current_streak,
        bestStreak: row.best_streak,
        lastSessionAt: row.last_session_at,
      };
    }
    // fill defaults for subjects not yet started
    for (const s of ["matematica", "portugues"]) {
      if (!data[s]) {
        data[s] = { level: 1, totalSessions: 0, totalCorrect: 0, totalQuestions: 0, accuracy: 0, currentStreak: 0, bestStreak: 0, lastSessionAt: null };
      }
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/trilha/generate ────────────────────────────────────────────────
router.post("/trilha/generate", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { subject, level } = req.body;
  if (!["matematica", "portugues"].includes(subject)) {
    return res.status(400).json({ error: "subject inválido" });
  }
  const lv = Math.max(1, Math.min(100, Number(level) || 1));
  const curriculo = getCurriculo(subject, lv);
  const subjectLabel = getSubjectLabel(subject);

  const systemPrompt = `Você é um gerador de questões de ${subjectLabel} para o ENEM e vestibulares brasileiros.
Gere EXATAMENTE 10 questões de múltipla escolha no formato JSON especificado.
Nível atual: ${curriculo}
REGRAS:
- Cada questão deve ter exatamente 5 alternativas (A, B, C, D, E)
- Apenas UMA alternativa é correta
- As questões devem cobrir aspectos variados do nível descrito
- Dificuldade calibrada: para níveis 1-30 use linguagem simples; 31-70 moderada; 71-100 ENEM avançado
- Forneça uma explicação curta e clara da resposta correta
- Responda SOMENTE com JSON válido, sem texto adicional`;

  const userPrompt = `Gere 10 questões de ${subjectLabel} — ${curriculo}
Retorne SOMENTE este JSON:
{
  "questions": [
    {
      "id": 1,
      "enunciado": "texto da questão",
      "opcoes": {"A": "...", "B": "...", "C": "...", "D": "...", "E": "..."},
      "correta": "A",
      "explicacao": "Por que A está correta..."
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 3000,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    logAiUsage({ feature: "trilha", model: "gpt-4o-mini", tokensIn: completion.usage?.prompt_tokens ?? 0, tokensOut: completion.usage?.completion_tokens ?? 0, userId: (req as any).userId ?? null });
    const parsed = JSON.parse(content);
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return res.status(500).json({ error: "Resposta inválida da IA" });
    }

    res.json({ questions: parsed.questions, curriculo, level: lv, subject });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/trilha/submit ──────────────────────────────────────────────────
router.post("/trilha/submit", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { subject, level, score, timeSeconds } = req.body;
  if (!["matematica", "portugues"].includes(subject)) {
    return res.status(400).json({ error: "subject inválido" });
  }

  const lv = Number(level) || 1;
  const sc = Number(score) || 0;
  const total = 10;
  const passed = sc >= 8; // 80% threshold (8/10)
  const newLevel = passed ? Math.min(100, lv + 1) : lv;

  try {
    // Save session record
    await db.execute(sql`
      INSERT INTO trilha_mestre_sessions (user_id, subject, level, score, total, time_seconds, passed)
      VALUES (${userId}, ${subject}, ${lv}, ${sc}, ${total}, ${timeSeconds || null}, ${passed})
    `);

    // Upsert progress
    await db.execute(sql`
      INSERT INTO trilha_mestre_progress (user_id, subject, level, total_sessions, total_correct, total_questions, current_streak, best_streak, last_session_at)
      VALUES (${userId}, ${subject}, ${newLevel}, 1, ${sc}, ${total}, ${passed ? 1 : 0}, ${passed ? 1 : 0}, NOW())
      ON CONFLICT (user_id, subject) DO UPDATE SET
        level = ${newLevel},
        total_sessions = trilha_mestre_progress.total_sessions + 1,
        total_correct = trilha_mestre_progress.total_correct + ${sc},
        total_questions = trilha_mestre_progress.total_questions + ${total},
        current_streak = CASE WHEN ${passed} THEN trilha_mestre_progress.current_streak + 1 ELSE 0 END,
        best_streak = CASE WHEN ${passed} AND trilha_mestre_progress.current_streak + 1 > trilha_mestre_progress.best_streak
                          THEN trilha_mestre_progress.current_streak + 1
                          ELSE trilha_mestre_progress.best_streak END,
        last_session_at = NOW(),
        updated_at = NOW()
    `);

    trackEvent({ userId, eventType: "trilha_session", metadata: { subject, level: lv, score: sc, passed, newLevel } });
    if (passed && newLevel >= 5) {
      trackEvent({ userId, eventType: "trilha_completed", metadata: { subject, level: newLevel } });
    }
    res.json({ passed, score: sc, total, newLevel, level: lv });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/trilha/diagnostic/generate ─────────────────────────────────────
// Generates a 10-question initial placement test (5 Math + 5 Portuguese)
// across difficulty checkpoints (levels 5, 15, 30, 50, 75) so we can place the
// student at the right level instead of forcing everyone to start at 1.
router.post("/trilha/diagnostic/generate", requireAuth, async (_req, res) => {
  const CHECKPOINTS = [5, 15, 30, 50, 75];
  const sysPromptFor = (subject: "matematica" | "portugues") => `Você é um gerador de questões de ${getSubjectLabel(subject)} para um TESTE DIAGNÓSTICO ENEM.
Gere EXATAMENTE 5 questões de múltipla escolha — uma para cada checkpoint de dificuldade abaixo.
Cada questão deve ser claramente do nível indicado (não mais fácil, não mais difícil).
Checkpoints (use o nível exato fornecido como "level" da questão):
${CHECKPOINTS.map((lv, i) => `Q${i + 1} → ${getCurriculo(subject, lv)}`).join("\n")}
REGRAS:
- Cada questão tem 5 alternativas (A, B, C, D, E), apenas UMA correta.
- Explicação curta e clara.
- Responda SOMENTE com JSON válido.`;

  const userPrompt = `Retorne SOMENTE este JSON:
{
  "questions": [
    {
      "id": 1,
      "level": 5,
      "enunciado": "...",
      "opcoes": {"A":"...","B":"...","C":"...","D":"...","E":"..."},
      "correta": "A",
      "explicacao": "..."
    }
  ]
}`;

  try {
    const [mat, pt] = await Promise.all((["matematica", "portugues"] as const).map(async (subject) => {
      const { response, config } = await aiChat({
        taskType: subject === "matematica" ? "math-reasoning" : "fast-qa",
        messages: [
          { role: "system", content: sysPromptFor(subject) },
          { role: "user", content: userPrompt },
        ],
        jsonMode: true,
      });
      const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
      logAiUsage({ feature: "trilha-diagnostico", model: config.model, tokensIn: response.usage?.prompt_tokens ?? 0, tokensOut: response.usage?.completion_tokens ?? 0, userId: (req as any).userId ?? null });
      const arr: any[] = Array.isArray(parsed.questions) ? parsed.questions : [];
      return arr.slice(0, 5).map((q, i) => ({
        ...q,
        id: i + 1,
        level: CHECKPOINTS[i],
        subject,
      }));
    }));

    if (mat.length !== 5 || pt.length !== 5) {
      return res.status(500).json({ error: "Diagnóstico incompleto. Tente novamente." });
    }

    // Interleave so the student alternates subjects (less monotonous).
    const questions: any[] = [];
    for (let i = 0; i < 5; i++) { questions.push(mat[i]); questions.push(pt[i]); }
    questions.forEach((q, i) => { q.id = i + 1; });

    res.json({ questions, checkpoints: CHECKPOINTS });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/trilha/diagnostic/submit ───────────────────────────────────────
// Body: { answers: [{ subject, level, correct }] }
// Heuristic: per subject, level = highest CONSECUTIVE checkpoint answered correctly,
// or 1 if the very first one was missed. Result is committed to trilha_mestre_progress.
router.post("/trilha/diagnostic/submit", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const answers: { subject: string; level: number; correct: boolean }[] = req.body?.answers || [];
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: "answers ausentes" });
  }

  function placeLevel(subj: "matematica" | "portugues") {
    const subjAnswers = answers
      .filter(a => a.subject === subj)
      .sort((a, b) => a.level - b.level);
    let placed = 1;
    for (const a of subjAnswers) {
      if (a.correct) placed = Math.max(placed, a.level);
      else break; // first miss locks placement
    }
    return Math.max(1, Math.min(95, placed));
  }

  const matLevel = placeLevel("matematica");
  const ptLevel = placeLevel("portugues");

  try {
    for (const [subject, level] of [["matematica", matLevel], ["portugues", ptLevel]] as const) {
      await db.execute(sql`
        INSERT INTO trilha_mestre_progress
          (user_id, subject, level, total_sessions, total_correct, total_questions,
           current_streak, best_streak, last_session_at)
        VALUES (${userId}, ${subject}, ${level}, 0, 0, 0, 0, 0, NOW())
        ON CONFLICT (user_id, subject) DO UPDATE SET
          level = GREATEST(trilha_mestre_progress.level, ${level}),
          updated_at = NOW()
      `);
    }
    res.json({
      matematica: { level: matLevel, topic: getCurriculo("matematica", matLevel) },
      portugues: { level: ptLevel, topic: getCurriculo("portugues", ptLevel) },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/trilha/history/:subject ────────────────────────────────────────
router.get("/trilha/history/:subject", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { subject } = req.params;
  try {
    const rows = await db.execute<any>(sql`
      SELECT level, score, total, time_seconds, passed, created_at
      FROM trilha_mestre_sessions
      WHERE user_id = ${userId} AND subject = ${subject}
      ORDER BY created_at DESC
      LIMIT 30
    `);
    res.json({ sessions: rows.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
