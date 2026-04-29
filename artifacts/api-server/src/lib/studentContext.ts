/**
 * studentContext.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Serviço compartilhado: busca e formata dados reais de desempenho do aluno.
 * Usado por chat.ts (texto) E professor.ts (voz) para que o Tiagão
 * tenha acesso completo ao histórico real de cada usuário.
 */

import { db } from "@workspace/db";
import {
  simuladoResultsTable,
  flashcardSessionsTable,
  studyPlansTable,
  userActivityTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface StudentPerformanceData {
  totalSimulados: number;
  totalPlanos: number;
  totalFlashcardSessions: number;
  totalXp: number;
  weakSubjects: string[];
  regularSubjects: string[];
  strongSubjects: string[];
  recentSimulado: { materia: string; score: number; total: number; pct: number } | null;
  recentPlan: { materia: string; serie: string | null } | null;
  flashcardAvgRate: number | null;
  subjectStats: Array<{ materia: string; avg: number; simulados: number; level: string }>;
  studiedTopics: Array<{ materia: string; topicos: string[] }>;
  streakDays: number;
}

// ─── Busca dados reais do aluno no banco ──────────────────────────────────────

export async function fetchStudentPerformance(userId: string): Promise<StudentPerformanceData> {
  const [simulados, flashcards, plans, activity] = await Promise.all([
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
      .limit(40),

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
      .limit(40),

    db
      .select({
        materia: studyPlansTable.materia,
        serie: studyPlansTable.serie,
        plan: studyPlansTable.plan,
        createdAt: studyPlansTable.createdAt,
      })
      .from(studyPlansTable)
      .where(eq(studyPlansTable.userId, userId))
      .orderBy(desc(studyPlansTable.createdAt))
      .limit(10),

    db
      .select({ currentStreak: userActivityTable.currentStreak })
      .from(userActivityTable)
      .where(eq(userActivityTable.userId, userId))
      .limit(1)
      .catch(() => []),
  ]);

  // ── XP calculation ──────────────────────────────────────────────────────────
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

  // ── Per-subject simulado stats ──────────────────────────────────────────────
  const simByMateria: Record<string, { scores: number[]; count: number }> = {};
  for (const s of simulados) {
    const key = (s.materia || "Geral").trim();
    if (!simByMateria[key]) simByMateria[key] = { scores: [], count: 0 };
    const pct = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0;
    simByMateria[key].scores.push(pct);
    simByMateria[key].count++;
  }

  const subjectStats = Object.entries(simByMateria).map(([materia, data]) => {
    const avg = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length);
    const level = avg < 50 ? "fraco" : avg < 65 ? "regular" : avg < 80 ? "bom" : "forte";
    return { materia, avg, simulados: data.count, level };
  }).sort((a, b) => b.avg - a.avg);

  const weakSubjects    = subjectStats.filter(s => s.level === "fraco")   .map(s => `${s.materia} (${s.avg}%)`);
  const regularSubjects = subjectStats.filter(s => s.level === "regular") .map(s => `${s.materia} (${s.avg}%)`);
  const strongSubjects  = subjectStats.filter(s => s.level === "forte" || s.level === "bom").map(s => `${s.materia} (${s.avg}%)`);

  // ── Recent simulado ─────────────────────────────────────────────────────────
  const recentSimulado = simulados[0]
    ? {
        materia: simulados[0].materia,
        score: simulados[0].score,
        total: simulados[0].total,
        pct: simulados[0].total > 0 ? Math.round((simulados[0].score / simulados[0].total) * 100) : 0,
      }
    : null;

  // ── Flashcard average ───────────────────────────────────────────────────────
  const flashcardAvgRate = flashcards.length > 0
    ? Math.round(
        flashcards.reduce((a, f) => a + (f.totalCards > 0 ? (f.known / f.totalCards) * 100 : 0), 0) / flashcards.length
      )
    : null;

  // ── Topics studied (from study plans) ──────────────────────────────────────
  const topicsBySubject: Record<string, Set<string>> = {};
  for (const p of plans) {
    const materia = (p.materia || "Geral").trim();
    if (!topicsBySubject[materia]) topicsBySubject[materia] = new Set();
    const dias = (p.plan as any)?.dias ?? [];
    for (const dia of dias) {
      for (const t of dia.topicos ?? []) {
        const nome = typeof t === "object" ? t.nome : t;
        if (nome) topicsBySubject[materia].add(String(nome));
      }
    }
  }
  // Add simulado subjects too
  for (const s of simulados) {
    const materia = (s.materia || "Geral").trim();
    if (!topicsBySubject[materia]) topicsBySubject[materia] = new Set();
    if (s.titulo) topicsBySubject[materia].add(s.titulo);
  }
  const studiedTopics = Object.entries(topicsBySubject).map(([materia, topics]) => ({
    materia,
    topicos: Array.from(topics).slice(0, 8),
  }));

  const streakDays = (activity[0] as any)?.currentStreak ?? 0;

  return {
    totalSimulados: simulados.length,
    totalPlanos: plans.length,
    totalFlashcardSessions: flashcards.length,
    totalXp,
    weakSubjects,
    regularSubjects,
    strongSubjects,
    recentSimulado,
    recentPlan: plans[0] ? { materia: plans[0].materia, serie: plans[0].serie } : null,
    flashcardAvgRate,
    subjectStats,
    studiedTopics,
    streakDays,
  };
}

// ─── Formata o bloco de contexto para injeção no prompt do sistema ────────────

export function buildStudentContextBlock(data: StudentPerformanceData): string {
  if (
    data.totalSimulados === 0 &&
    data.totalFlashcardSessions === 0 &&
    data.totalPlanos === 0
  ) {
    return "\n\n📊 DESEMPENHO DO ALUNO: Ainda não realizou simulados, flashcards ou planos de estudo — está começando agora no StudyAI.";
  }

  const lines: string[] = [];
  lines.push("📊 DESEMPENHO REAL DO ALUNO NO STUDYAI (dados do banco — use para análises):");

  // Activity overview
  const overview: string[] = [];
  if (data.totalSimulados > 0)        overview.push(`${data.totalSimulados} simulados`);
  if (data.totalFlashcardSessions > 0) overview.push(`${data.totalFlashcardSessions} sessões de flashcard`);
  if (data.totalPlanos > 0)           overview.push(`${data.totalPlanos} planos de estudo`);
  if (data.streakDays > 0)            overview.push(`${data.streakDays} dias seguidos de estudo`);
  if (overview.length > 0) lines.push(`• Atividade total: ${overview.join(", ")}`);

  // XP
  if (data.totalXp > 0) lines.push(`• XP acumulado: ${data.totalXp} pontos`);

  // Recent simulado
  if (data.recentSimulado) {
    lines.push(`• Último simulado: ${data.recentSimulado.materia} — ${data.recentSimulado.score}/${data.recentSimulado.total} (${data.recentSimulado.pct}% de acerto)`);
  }

  // Flashcard average
  if (data.flashcardAvgRate !== null) {
    lines.push(`• Taxa média em flashcards: ${data.flashcardAvgRate}%`);
  }

  // Subject breakdown
  if (data.weakSubjects.length > 0) {
    lines.push(`• ⚠️ Matérias FRACAS (abaixo de 50%): ${data.weakSubjects.join(", ")}`);
  }
  if (data.regularSubjects.length > 0) {
    lines.push(`• 📈 Matérias REGULARES (50-65%): ${data.regularSubjects.join(", ")}`);
  }
  if (data.strongSubjects.length > 0) {
    lines.push(`• ✅ Matérias FORTES (acima de 65%): ${data.strongSubjects.join(", ")}`);
  }

  // Full subject stats table
  if (data.subjectStats.length > 0) {
    lines.push(`• Detalhamento por matéria:`);
    for (const s of data.subjectStats) {
      lines.push(`  - ${s.materia}: ${s.avg}% de acerto em ${s.simulados} simulado${s.simulados > 1 ? "s" : ""} (${s.level})`);
    }
  }

  // Topics studied
  if (data.studiedTopics.length > 0) {
    lines.push(`• Tópicos já estudados:`);
    for (const { materia, topicos } of data.studiedTopics.slice(0, 5)) {
      if (topicos.length > 0) lines.push(`  - ${materia}: ${topicos.join(", ")}`);
    }
  }

  lines.push(`\n⚡ INSTRUÇÕES: Estes são dados REAIS do banco. Use-os diretamente para análises. Nunca diga que não tem acesso ao desempenho — você TEM.`);

  return `\n\n${lines.join("\n")}`;
}
