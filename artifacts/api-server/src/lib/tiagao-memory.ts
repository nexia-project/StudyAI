/**
 * tiagao-memory.ts
 * Memória evolutiva e perfil profundo do Tiagão.
 * Carrega contexto completo da sessão, salva memórias tipadas,
 * atualiza perfil e detecta automaticamente info pessoal.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export type MemoryType =
  | "fact" | "preference" | "struggle" | "achievement"
  | "promise" | "emotion" | "goal" | "routine";

export interface TiagaoMemory {
  id: number;
  userId: string;
  type: MemoryType;
  content: string;
  importance: number;
  context: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface StudentProfile {
  userId: string;
  nickname: string | null;
  age: number | null;
  grade: string | null;
  school: string | null;
  city: string | null;
  learningStyle: string | null;
  interests: string[];
  weakSubjects: string[];
  strongSubjects: string[];
  goals: string[];
  humorPreference: string;
  importantDates: Array<{ date: string; description: string; subject?: string }>;
  personalFacts: Array<{ fact: string; addedAt: string }>;
  favoriteTeam: string | null;
  hobbies: string[];
  studyStreak: number;
  totalStudyHours: number;
  lastSessionMood: string | null;
}

export interface SessionContext {
  profile: StudentProfile;
  recentMemories: TiagaoMemory[];
  pendingPromises: TiagaoMemory[];
  upcomingDates: Array<{ date: string; description: string; subject?: string }>;
  lastSession: { topics: string[]; mood: string; daysAgo: number } | null;
  studyStats: { streak: number; hoursThisWeek: number };
}

// ─── Carregar perfil (cria se não existe) ─────────────────────────────────────
async function getOrCreateProfile(userId: string): Promise<StudentProfile> {
  try {
    const r = await db.execute(sql`
      SELECT * FROM student_profiles WHERE user_id = ${userId} LIMIT 1
    `);
    if (r.rows.length > 0) return mapProfile(r.rows[0] as any);
    await db.execute(sql`
      INSERT INTO student_profiles (user_id) VALUES (${userId})
      ON CONFLICT (user_id) DO NOTHING
    `);
    return emptyProfile(userId);
  } catch { return emptyProfile(userId); }
}

function emptyProfile(userId: string): StudentProfile {
  return {
    userId, nickname: null, age: null, grade: null, school: null, city: null,
    learningStyle: "misto", interests: [], weakSubjects: [], strongSubjects: [],
    goals: [], humorPreference: "informal", importantDates: [], personalFacts: [],
    favoriteTeam: null, hobbies: [], studyStreak: 0, totalStudyHours: 0, lastSessionMood: null,
  };
}

function mapProfile(r: any): StudentProfile {
  return {
    userId: r.user_id,
    nickname: r.nickname ?? null,
    age: r.age ?? null,
    grade: r.grade ?? null,
    school: r.school ?? null,
    city: r.city ?? null,
    learningStyle: r.learning_style ?? "misto",
    interests: r.interests ?? [],
    weakSubjects: r.weak_subjects ?? [],
    strongSubjects: r.strong_subjects ?? [],
    goals: r.goals ?? [],
    humorPreference: r.humor_preference ?? "informal",
    importantDates: r.important_dates ?? [],
    personalFacts: r.personal_facts ?? [],
    favoriteTeam: r.favorite_team ?? null,
    hobbies: r.hobbies ?? [],
    studyStreak: r.study_streak ?? 0,
    totalStudyHours: Number(r.total_study_hours ?? 0),
    lastSessionMood: r.last_session_mood ?? null,
  };
}

// ─── Carregar contexto completo da sessão ─────────────────────────────────────
export async function loadSessionContext(userId: string): Promise<SessionContext> {
  try {
    const [profile, memoriesRes, lastSessionRes] = await Promise.all([
      getOrCreateProfile(userId),
      db.execute(sql`
        SELECT * FROM tiagao_memories
        WHERE user_id = ${userId} AND is_active = true
        ORDER BY importance DESC, created_at DESC
        LIMIT 25
      `).catch(() => ({ rows: [] })),
      db.execute(sql`
        SELECT * FROM tiagao_sessions
        WHERE user_id = ${userId}
        ORDER BY started_at DESC
        LIMIT 1
      `).catch(() => ({ rows: [] })),
    ]);

    const memories = (memoriesRes.rows as any[]).map(r => ({
      id: r.id,
      userId: r.user_id,
      type: r.type as MemoryType,
      content: r.content,
      importance: r.importance,
      context: r.context ?? null,
      isActive: r.is_active,
      createdAt: r.created_at,
    }));

    const pendingPromises = memories.filter(m => m.type === "promise");

    const now = new Date();
    const upcomingDates = (profile.importantDates ?? []).filter(d => {
      const date = new Date(d.date);
      const diffDays = (date.getTime() - now.getTime()) / 86400000;
      return diffDays >= -1 && diffDays <= 14;
    });

    let lastSession: SessionContext["lastSession"] = null;
    if (lastSessionRes.rows.length > 0) {
      const s = lastSessionRes.rows[0] as any;
      lastSession = {
        topics: s.topics_covered ?? [],
        mood: s.mood_end ?? "neutral",
        daysAgo: Math.floor((Date.now() - new Date(s.started_at).getTime()) / 86400000),
      };
    }

    return {
      profile,
      recentMemories: memories,
      pendingPromises,
      upcomingDates,
      lastSession,
      studyStats: { streak: profile.studyStreak, hoursThisWeek: 0 },
    };
  } catch {
    return {
      profile: emptyProfile(userId),
      recentMemories: [], pendingPromises: [], upcomingDates: [],
      lastSession: null, studyStats: { streak: 0, hoursThisWeek: 0 },
    };
  }
}

// ─── Salvar memória ───────────────────────────────────────────────────────────
export async function saveMemory(userId: string, memory: {
  type: MemoryType;
  content: string;
  importance?: number;
  context?: string;
}): Promise<void> {
  try {
    const snippet = memory.content.slice(0, 60);
    const existing = await db.execute(sql`
      SELECT id FROM tiagao_memories
      WHERE user_id = ${userId} AND type = ${memory.type}
        AND content ILIKE ${'%' + snippet + '%'} AND is_active = true
      LIMIT 1
    `);
    if (existing.rows.length > 0) {
      await db.execute(sql`
        UPDATE tiagao_memories SET
          content = ${memory.content},
          importance = GREATEST(importance, ${memory.importance ?? 3}),
          last_referenced_at = NOW()
        WHERE id = ${(existing.rows[0] as any).id}
      `);
      return;
    }
    await db.execute(sql`
      INSERT INTO tiagao_memories (user_id, type, content, importance, context)
      VALUES (${userId}, ${memory.type}, ${memory.content}, ${memory.importance ?? 3}, ${memory.context ?? null})
    `);
  } catch { /* non-critical */ }
}

// ─── Atualizar perfil ─────────────────────────────────────────────────────────
export async function updateProfile(userId: string, field: string, value: string): Promise<void> {
  try {
    const arrayFields = ["interests", "weak_subjects", "strong_subjects", "goals", "hobbies"];
    const fieldMap: Record<string, string> = {
      nickname: "nickname", age: "age", grade: "grade", school: "school",
      city: "city", learningStyle: "learning_style", interests: "interests",
      weakSubjects: "weak_subjects", strongSubjects: "strong_subjects",
      goals: "goals", humorPreference: "humor_preference", favoriteTeam: "favorite_team",
      hobbies: "hobbies",
    };
    const col = fieldMap[field] ?? field;
    const isArray = arrayFields.includes(col);

    await db.execute(sql`
      INSERT INTO student_profiles (user_id) VALUES (${userId})
      ON CONFLICT (user_id) DO NOTHING
    `);

    if (isArray) {
      const arr = value.split(",").map(s => s.trim()).filter(Boolean);
      await db.execute(sql`
        UPDATE student_profiles SET ${sql.raw(col)} = ${arr}, updated_at = NOW()
        WHERE user_id = ${userId}
      `);
    } else if (col === "age") {
      await db.execute(sql`
        UPDATE student_profiles SET age = ${parseInt(value) || null}, updated_at = NOW()
        WHERE user_id = ${userId}
      `);
    } else {
      await db.execute(sql`
        UPDATE student_profiles SET ${sql.raw(col)} = ${value}, updated_at = NOW()
        WHERE user_id = ${userId}
      `);
    }
  } catch { /* non-critical */ }
}

// ─── Adicionar data importante ────────────────────────────────────────────────
export async function addImportantDate(userId: string, date: string, description: string, subject?: string): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO student_profiles (user_id) VALUES (${userId})
      ON CONFLICT (user_id) DO NOTHING
    `);
    const entry = JSON.stringify([{ date, description, subject: subject ?? null }]);
    await db.execute(sql`
      UPDATE student_profiles
      SET important_dates = important_dates || ${entry}::jsonb, updated_at = NOW()
      WHERE user_id = ${userId}
    `);
  } catch { /* non-critical */ }
}

// ─── Detecção automática de informação pessoal ────────────────────────────────
export async function autoDetectAndSave(userId: string, userMessage: string): Promise<void> {
  const patterns: Array<{ regex: RegExp; type: MemoryType; importance: number }> = [
    { regex: /(?:tenho|vou ter|minha|meu)\s+(?:prova|simulado|vestibular|enem)\s+(?:de\s+)?([^\n,\.]+?)(?:\s+(?:dia|no dia|em|na|,)\s+([^\n,\.]+))?[,\.\s]/i, type: "fact", importance: 5 },
    { regex: /(?:não entendo|não consigo|dificuldade|odeio|detesto|travei)\s+(?:em\s+|de\s+|com\s+)?([a-záéíóúãõç\s]{3,40})/i, type: "struggle", importance: 4 },
    { regex: /(?:tirei|consegui|passei|nota)\s+(\d+(?:[,\.]\d+)?)/i, type: "achievement", importance: 4 },
    { regex: /(?:quero|preciso|minha meta|meu objetivo)\s+(.{10,80})/i, type: "goal", importance: 4 },
    { regex: /(?:gosto de|adoro|curto|torço|meu time)\s+(.{5,60})/i, type: "preference", importance: 2 },
    { regex: /(?:to |estou |me sinto\s*)(triste|cansado|animado|frustrado|feliz|ansioso|nervoso|estressado|desmotivado)/i, type: "emotion", importance: 3 },
    { regex: /(?:meu nome[eé]?|pode me chamar de|me chama de)\s+([A-Z][a-záéíóú]+)/i, type: "fact", importance: 5 },
  ];

  const saves: Promise<void>[] = [];
  for (const p of patterns) {
    const m = userMessage.match(p.regex);
    if (m) {
      saves.push(saveMemory(userId, {
        type: p.type,
        content: m[0].trim(),
        importance: p.importance,
        context: userMessage.slice(0, 120),
      }));
      // Se menciona apelido/nome, atualiza perfil
      if (p.type === "fact" && /nome|chamar/i.test(m[0])) {
        const nameMatch = m[0].match(/(?:nome[eé]?|chamar de|chama de)\s+([A-Z][a-záéíóú]+)/i);
        if (nameMatch?.[1]) saves.push(updateProfile(userId, "nickname", nameMatch[1]));
      }
    }
  }
  await Promise.allSettled(saves);
}

// ─── Bloco de personalização para injetar no system prompt ───────────────────
export function buildPersonalizationBlock(ctx: SessionContext, fallbackName: string): string {
  const { profile, recentMemories, pendingPromises, upcomingDates, lastSession, studyStats } = ctx;
  const name = profile.nickname ?? fallbackName;
  const lines: string[] = [];

  lines.push(`\n\n═══ PERFIL DESTE ALUNO — ${name.toUpperCase()} ═══`);
  if (profile.nickname) lines.push(`• Apelido preferido: ${profile.nickname}`);
  if (profile.grade) lines.push(`• Série/Ano: ${profile.grade}`);
  if (profile.school) lines.push(`• Escola: ${profile.school}`);
  if (profile.city) lines.push(`• Cidade: ${profile.city}`);
  if (profile.learningStyle && profile.learningStyle !== "misto") lines.push(`• Aprende melhor: ${profile.learningStyle}`);
  if (profile.weakSubjects?.length) lines.push(`• Dificuldades em: ${profile.weakSubjects.join(", ")}`);
  if (profile.strongSubjects?.length) lines.push(`• Forte em: ${profile.strongSubjects.join(", ")}`);
  if (profile.goals?.length) lines.push(`• Objetivos: ${profile.goals.join(", ")}`);
  if (profile.hobbies?.length) lines.push(`• Hobbies: ${profile.hobbies.join(", ")}`);
  if (profile.favoriteTeam) lines.push(`• Time favorito: ${profile.favoriteTeam}`);
  if (profile.interests?.length) lines.push(`• Interesses: ${profile.interests.join(", ")}`);
  if (studyStats.streak > 0) lines.push(`• Streak de estudo: ${studyStats.streak} dias seguidos 🔥`);

  if (upcomingDates.length > 0) {
    lines.push(`\n• DATAS IMPORTANTES PRÓXIMAS:`);
    upcomingDates.forEach(d => lines.push(`  – ${d.date}: ${d.description}${d.subject ? ` (${d.subject})` : ""}`));
  }

  if (pendingPromises.length > 0) {
    lines.push(`\n• PROMESSAS PENDENTES (CUMPRIR HOJE!):`);
    pendingPromises.forEach(p => lines.push(`  – ${p.content}`));
  }

  const topMemories = recentMemories.filter(m => m.type !== "promise").slice(0, 12);
  if (topMemories.length > 0) {
    lines.push(`\n• MEMÓRIAS IMPORTANTES:`);
    topMemories.forEach(m => lines.push(`  [${m.type}] ${m.content}`));
  }

  const now = new Date();
  if (!lastSession) {
    lines.push(`\n• CONTEXTO: Primeira sessão! Conheça o aluno com curiosidade genuína.`);
  } else if (lastSession.daysAgo === 0) {
    lines.push(`\n• CONTEXTO: Aluno voltou hoje. Última sessão cobriu: ${lastSession.topics.join(", ") || "conversa geral"}`);
  } else if (lastSession.daysAgo === 1) {
    lines.push(`\n• CONTEXTO: Aluno voltou ontem. Última sessão: ${lastSession.topics.join(", ") || "conversa geral"}`);
  } else if (lastSession.daysAgo > 7) {
    lines.push(`\n• CONTEXTO: Aluno sumiu por ${lastSession.daysAgo} dias! Dê boas-vindas calorosas.`);
  } else {
    lines.push(`\n• CONTEXTO: Voltou depois de ${lastSession.daysAgo} dias. Última sessão: ${lastSession.topics.join(", ") || "conversa geral"}`);
  }

  lines.push(`\nUSE este perfil para personalizar CADA resposta. Chame pelo nome. Referencie memórias naturalmente. Se tem prova chegando, PRIORIZE. Se prometeu algo, CUMPRA agora.`);

  return lines.join("\n");
}
