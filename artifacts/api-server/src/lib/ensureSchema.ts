import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

let _initialized = false;

/**
 * Garante que todas as tabelas criadas via SQL cru existem.
 * Chame UMA VEZ no boot do servidor, não em cada request.
 */
export async function ensureAllSchemas(): Promise<void> {
  if (_initialized) return;

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notebook_documents (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        title VARCHAR(500) DEFAULT 'Documento sem título',
        original_text TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notebook_artifacts (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        doc_id INTEGER NOT NULL,
        kind VARCHAR(50) NOT NULL,
        title VARCHAR(500) DEFAULT '',
        payload JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notebook_overviews (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        doc_id INTEGER NOT NULL,
        summary TEXT DEFAULT '',
        key_topics JSONB DEFAULT '[]'::jsonb,
        faq JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, doc_id)
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notebook_chat_history (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        doc_id INTEGER NOT NULL,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tiagao_actions_log (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        payload JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(20) DEFAULT 'pending',
        executed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tiagao_video_jobs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        topico VARCHAR(500) NOT NULL,
        materia VARCHAR(120),
        formato VARCHAR(20) NOT NULL,
        num_scenes INTEGER DEFAULT 3,
        status VARCHAR(20) DEFAULT 'completed',
        video_url TEXT,
        duration_sec INTEGER,
        cost_estimate NUMERIC(8,4),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_tiagao_video_jobs_user_day
      ON tiagao_video_jobs (user_id, created_at)
    `);

    // ── Histórico universal de conteúdos gerados (aluno + professor) ─────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS generated_content (
        id SERIAL PRIMARY KEY,
        owner_id VARCHAR NOT NULL,
        owner_role VARCHAR(20) NOT NULL DEFAULT 'student',
        kind VARCHAR(50) NOT NULL,
        title VARCHAR(500) NOT NULL DEFAULT 'Sem título',
        materia VARCHAR(120),
        payload JSONB DEFAULT '{}'::jsonb,
        html_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_generated_content_owner
      ON generated_content (owner_id, deleted_at, created_at DESC)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_generated_content_kind
      ON generated_content (kind, owner_id)
    `);

    // ── Aprendizado de estilo do Material Premium ────────────────────────────
    // Registra eventos por usuário (geração, regeração, like/dislike, exportação)
    // pra calcular bias de tema e adaptar futuras gerações ao gosto da pessoa.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS material_style_events (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        theme_id VARCHAR(40) NOT NULL,
        action VARCHAR(20) NOT NULL,
        materia VARCHAR(120),
        nivel VARCHAR(120),
        weight NUMERIC(5,2) NOT NULL DEFAULT 1.0,
        content_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_material_style_events_user
      ON material_style_events (user_id, created_at DESC)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_material_style_events_user_materia
      ON material_style_events (user_id, materia, created_at DESC)
    `);

    // ── Perfil detalhado do estudante ────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS student_profiles (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR UNIQUE NOT NULL,
        nickname VARCHAR(80),
        age INTEGER,
        grade VARCHAR(50),
        school VARCHAR(200),
        city VARCHAR(100),
        learning_style VARCHAR(20) DEFAULT 'misto',
        interests TEXT[] DEFAULT '{}',
        weak_subjects TEXT[] DEFAULT '{}',
        strong_subjects TEXT[] DEFAULT '{}',
        goals TEXT[] DEFAULT '{}',
        preferred_study_time VARCHAR(30),
        humor_preference VARCHAR(20) DEFAULT 'informal',
        communication_style TEXT,
        important_dates JSONB DEFAULT '[]',
        personal_facts JSONB DEFAULT '[]',
        favorite_team VARCHAR(120),
        hobbies TEXT[] DEFAULT '{}',
        study_streak INTEGER DEFAULT 0,
        total_study_hours NUMERIC(10,1) DEFAULT 0,
        last_session_mood VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_student_profiles_user ON student_profiles (user_id)
    `);

    // ── Memórias do Tiagão (rich typed memories) ─────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tiagao_memories (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'fact',
        content TEXT NOT NULL,
        importance INTEGER DEFAULT 3,
        context VARCHAR(300),
        last_referenced_at TIMESTAMPTZ,
        times_referenced INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_tiagao_memories_user ON tiagao_memories (user_id, is_active, importance DESC)
    `);

    // ── Sessões do Tiagão ─────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tiagao_sessions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        mood_start VARCHAR(20),
        mood_end VARCHAR(20),
        topics_covered TEXT[] DEFAULT '{}',
        materials_created INTEGER DEFAULT 0,
        questions_asked INTEGER DEFAULT 0,
        summary TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_tiagao_sessions_user ON tiagao_sessions (user_id, started_at DESC)
    `);

    // ── Base de conhecimento auto-alimentada (FTS, sem pgvector) ─────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        type VARCHAR(30) NOT NULL DEFAULT 'material',
        title VARCHAR(500),
        content TEXT NOT NULL,
        source VARCHAR(30) NOT NULL DEFAULT 'tiagao',
        subject VARCHAR(120),
        topics TEXT[] DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        quality_score NUMERIC(4,2) DEFAULT 0.5,
        access_count INTEGER DEFAULT 0,
        last_accessed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_user ON knowledge_base (user_id, created_at DESC)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_subject ON knowledge_base (user_id, subject)
    `);

    // ── Lousa Imersiva — board lessons ───────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS board_lessons (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        title VARCHAR(500) NOT NULL,
        subject VARCHAR(120),
        topic VARCHAR(500),
        difficulty VARCHAR(20) DEFAULT 'medio',
        duration_seconds INTEGER,
        total_steps INTEGER DEFAULT 0,
        script JSONB NOT NULL DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'generating',
        views INTEGER DEFAULT 0,
        last_viewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_board_lessons_user ON board_lessons (user_id, created_at DESC)
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS board_lesson_progress (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        lesson_id INTEGER NOT NULL REFERENCES board_lessons(id) ON DELETE CASCADE,
        current_step INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        questions_asked INTEGER DEFAULT 0,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        UNIQUE(user_id, lesson_id)
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_board_lesson_progress_user ON board_lesson_progress (user_id)
    `);

    // ── AI Usage Logs ─────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id          BIGSERIAL PRIMARY KEY,
        ts          TIMESTAMPTZ DEFAULT NOW(),
        feature     TEXT NOT NULL,
        model       TEXT NOT NULL,
        tokens_in   INTEGER NOT NULL DEFAULT 0,
        tokens_out  INTEGER NOT NULL DEFAULT 0,
        user_id     TEXT,
        cost_usd    NUMERIC(10,8)
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_ts ON ai_usage_logs (ts DESC)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model ON ai_usage_logs (model)
    `);

    _initialized = true;
    logger.info("[ensureAllSchemas] All raw SQL tables verified/created.");
  } catch (err) {
    logger.error({ err }, "[ensureAllSchemas] Failed to ensure schemas");
    throw err;
  }
}
