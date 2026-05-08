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
    // ── CORE ORM TABLES (Drizzle schema — must exist before any query) ────────
    // Order matters: parent tables before child tables (FK dependencies)

    // 1. sessions (no deps)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid     VARCHAR PRIMARY KEY,
        sess    JSONB    NOT NULL,
        expire  TIMESTAMP NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire)
    `);

    // 2. users (no deps)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id                        VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        clerk_id                  VARCHAR UNIQUE,
        email                     VARCHAR UNIQUE,
        first_name                VARCHAR,
        last_name                 VARCHAR,
        profile_image_url         VARCHAR,
        stripe_customer_id        VARCHAR UNIQUE,
        stripe_subscription_id    VARCHAR,
        stripe_subscription_status VARCHAR DEFAULT 'free',
        free_ai_uses              INTEGER NOT NULL DEFAULT 0,
        xp                        INTEGER NOT NULL DEFAULT 0,
        student_name              VARCHAR,
        student_grade             VARCHAR,
        student_goal              VARCHAR,
        student_concurso_alvo     VARCHAR,
        student_phone             VARCHAR,
        student_school_type       VARCHAR,
        role                      VARCHAR(50) DEFAULT 'student',
        escola                    VARCHAR(255),
        cidade                    VARCHAR(100),
        estado                    VARCHAR(50),
        created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // Safe migration: add clerk_id to existing tables that were created without it
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id VARCHAR`).catch(() => {});
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_id ON users (clerk_id) WHERE clerk_id IS NOT NULL`).catch(() => {});

    // 3. ai_cache (no deps)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_cache (
        id             SERIAL PRIMARY KEY,
        question_hash  TEXT NOT NULL UNIQUE,
        question_text  TEXT NOT NULL,
        response_text  TEXT NOT NULL,
        slides_json    TEXT,
        model_used     TEXT NOT NULL,
        task_type      TEXT NOT NULL,
        created_at     TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // 4. waitlist + corporate_leads (no deps)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS waitlist (
        id         VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        email      VARCHAR(255) NOT NULL UNIQUE,
        name       VARCHAR(255),
        source     VARCHAR(100) DEFAULT 'landing',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS corporate_leads (
        id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(255) NOT NULL,
        email       VARCHAR(255) NOT NULL,
        institution VARCHAR(255) NOT NULL,
        type        VARCHAR(100) NOT NULL,
        students    VARCHAR(50),
        message     VARCHAR(1000),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 5. ai_cost_log (no deps)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_cost_log (
        id         VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    VARCHAR(255),
        feature    VARCHAR(100) NOT NULL,
        model      VARCHAR(100) NOT NULL,
        tokens_in  INTEGER NOT NULL DEFAULT 0,
        tokens_out INTEGER NOT NULL DEFAULT 0,
        cost_usd   TEXT NOT NULL DEFAULT '0',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 6. study_plans (→ users)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS study_plans (
        id         VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        materia    VARCHAR(255) NOT NULL,
        serie      VARCHAR(100),
        dias_prova INTEGER,
        plan       JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 7. simulado_results, flashcard_sessions, user_activity (→ users / study_plans)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS simulado_results (
        id             VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id        VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        study_plan_id  VARCHAR(36) REFERENCES study_plans(id) ON DELETE SET NULL,
        materia        VARCHAR(255) NOT NULL,
        titulo         VARCHAR(500),
        score          INTEGER NOT NULL,
        total          INTEGER NOT NULL,
        time_taken     INTEGER,
        nota           VARCHAR(10),
        answers        JSONB,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS flashcard_sessions (
        id             VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id        VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        study_plan_id  VARCHAR(36) REFERENCES study_plans(id) ON DELETE SET NULL,
        materia        VARCHAR(255) NOT NULL,
        dia_numero     INTEGER,
        total_cards    INTEGER NOT NULL,
        known          INTEGER NOT NULL,
        unknown        INTEGER NOT NULL,
        completed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_activity (
        id         VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        study_date VARCHAR(10) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, study_date)
      )
    `);

    // 8. instituicoes (→ users)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS instituicoes (
        id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        name            VARCHAR(255) NOT NULL,
        logo_url        VARCHAR(1000),
        primary_color   VARCHAR(20) DEFAULT '#6366f1',
        city            VARCHAR(100),
        state           VARCHAR(50),
        cnpj            VARCHAR(20),
        admin_user_id   VARCHAR REFERENCES users(id),
        plan_type       VARCHAR(50) DEFAULT 'trial',
        contract_start  TIMESTAMPTZ,
        contract_end    TIMESTAMPTZ,
        max_users       INTEGER DEFAULT 100,
        max_teachers    INTEGER DEFAULT 10,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 9. turmas (→ users)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS turmas (
        id             VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id     VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        institution_id VARCHAR(36),
        name           VARCHAR(255) NOT NULL,
        serie          VARCHAR(100),
        subject        VARCHAR(255),
        description    VARCHAR(1000),
        invite_code    VARCHAR(20) UNIQUE NOT NULL,
        is_active      BOOLEAN DEFAULT TRUE,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 10. turma_memberships, turma_tarefas (→ turmas, users)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS turma_memberships (
        id         VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        turma_id   VARCHAR(36) NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
        student_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS turma_tarefas (
        id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        turma_id    VARCHAR(36) NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
        type        VARCHAR(50) NOT NULL,
        title       VARCHAR(500) NOT NULL,
        description VARCHAR(2000),
        materia     VARCHAR(255),
        due_date    TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 11. institution_users, institution_invites (→ instituicoes, users)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS institution_users (
        id             VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        institution_id VARCHAR(36) NOT NULL REFERENCES instituicoes(id) ON DELETE CASCADE,
        user_id        VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role           VARCHAR(50) NOT NULL DEFAULT 'teacher',
        is_approved    BOOLEAN DEFAULT FALSE,
        invited_by     VARCHAR,
        invite_email   VARCHAR(255),
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS institution_invites (
        id             VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        institution_id VARCHAR(36) NOT NULL REFERENCES instituicoes(id) ON DELETE CASCADE,
        email          VARCHAR(255) NOT NULL,
        role           VARCHAR(50) NOT NULL DEFAULT 'teacher',
        token          VARCHAR(64) NOT NULL,
        invited_by     VARCHAR,
        used_at        TIMESTAMPTZ,
        expires_at     TIMESTAMPTZ NOT NULL,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 12. role_requests, question_bank, redacoes, study_schedules, caderno_notes, user_profile_memory (→ users)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS role_requests (
        id             VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id        VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        requested_role VARCHAR(50) NOT NULL,
        status         VARCHAR(20) NOT NULL DEFAULT 'pending',
        school         VARCHAR(255),
        subject        VARCHAR(255),
        organ          VARCHAR(255),
        position       VARCHAR(255),
        cpf            VARCHAR(20),
        message        VARCHAR(1000),
        reviewed_by    VARCHAR,
        reviewed_at    TIMESTAMPTZ,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS question_bank (
        id                VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id        VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        materia           VARCHAR(100) NOT NULL,
        tema              VARCHAR(255) NOT NULL,
        nivel             VARCHAR(50) DEFAULT 'Médio',
        text              TEXT NOT NULL,
        context           TEXT,
        alternatives      JSONB NOT NULL,
        correct           INTEGER NOT NULL DEFAULT 0,
        explanation       TEXT,
        image_description TEXT,
        tags              JSONB,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS redacoes (
        id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tema        VARCHAR(500) NOT NULL,
        tipo        VARCHAR(50) DEFAULT 'enem',
        texto       TEXT NOT NULL,
        correction  JSONB,
        score_total INTEGER,
        comp1       INTEGER,
        comp2       INTEGER,
        comp3       INTEGER,
        comp4       INTEGER,
        comp5       INTEGER,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS study_schedules (
        id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_date     TIMESTAMPTZ,
        target_score    INTEGER,
        hours_per_day   INTEGER DEFAULT 2,
        objetivo        VARCHAR(200),
        materias_focais JSONB,
        schedule        JSONB,
        is_active       BOOLEAN DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS caderno_notes (
        id                VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id           VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title             VARCHAR(500) NOT NULL,
        content           TEXT NOT NULL,
        materia           VARCHAR(100),
        tags              JSONB,
        processed_content JSONB,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_profile_memory (
        id                 VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id            VARCHAR(255) NOT NULL UNIQUE,
        perfil             JSONB DEFAULT '{}',
        topicos_frequentes JSONB DEFAULT '[]',
        ultimas_sessoes    JSONB DEFAULT '[]',
        fatos_importantes  JSONB DEFAULT '[]',
        atualizado_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 13. activities (→ users, turmas) + activity_submissions (→ activities, users)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS activities (
        id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id   VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        turma_id     VARCHAR(36) REFERENCES turmas(id) ON DELETE CASCADE,
        title        VARCHAR(500) NOT NULL,
        description  TEXT,
        type         VARCHAR(50) NOT NULL DEFAULT 'prova',
        content      JSONB NOT NULL,
        due_date     TIMESTAMPTZ,
        is_published BOOLEAN DEFAULT TRUE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS activity_submissions (
        id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        activity_id         VARCHAR(36) NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
        student_id          VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        answers             JSONB,
        score               INTEGER,
        total               INTEGER,
        time_spent_seconds  INTEGER,
        submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // ── END ORM TABLES ─────────────────────────────────────────────────────────

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
