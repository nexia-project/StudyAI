import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export type EventType =
  | "login"
  | "study_plan_created"
  | "quiz_started" | "quiz_completed"
  | "flashcard_reviewed"
  | "essay_submitted" | "essay_corrected"
  | "notebook_chat" | "notebook_source_added" | "notebook_created"
  | "notebook_material_generated" | "notebook_generation_failed"
  | "teacher_notebook_output_generated"
  | "notebook_export" | "notebook_feedback"
  | "trilha_session" | "trilha_completed"
  | "plano_aula_created"
  | "activity_assigned" | "activity_submitted"
  | "simulado_started" | "simulado_completed";

export interface TrackEventPayload {
  userId: string;
  eventType: EventType;
  entityType?: string;
  entityId?: string;
  classId?: string;
  notebookId?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget event tracker. Never throws — failure is logged, not propagated.
 */
export async function trackEvent(payload: TrackEventPayload): Promise<void> {
  if (!payload.userId || !payload.eventType) {
    console.warn("[trackEvent] Missing required fields", payload);
    return;
  }

  const meta = payload.metadata ? JSON.stringify(payload.metadata) : "{}";

  // Fire and forget — intentionally not awaited by callers
  Promise.resolve().then(async () => {
    try {
      await db.execute(sql`
        INSERT INTO activity_events
          (user_id, event_type, entity_type, entity_id, class_id, notebook_id, metadata, created_at)
        VALUES (
          ${payload.userId},
          ${payload.eventType},
          ${payload.entityType ?? null},
          ${payload.entityId ?? null},
          ${payload.classId ?? null},
          ${payload.notebookId ?? null},
          ${meta}::jsonb,
          NOW()
        )
      `);

      // Upsert daily_metrics
      await upsertDailyMetrics(payload);
    } catch (err) {
      console.error("[trackEvent] Failed to persist event:", err);
    }
  });
}

async function upsertDailyMetrics(p: TrackEventPayload) {
  const today = new Date().toISOString().slice(0, 10);
  const classId = p.classId ?? null;

  const increments: Record<string, string> = {
    login: "login_count = daily_metrics.login_count + 1",
    quiz_completed: "quizzes_completed = daily_metrics.quizzes_completed + 1",
    flashcard_reviewed: "flashcards_reviewed = daily_metrics.flashcards_reviewed + 1",
    notebook_chat: "notebook_chats = daily_metrics.notebook_chats + 1",
    notebook_source_added: "notebook_sources_added = daily_metrics.notebook_sources_added + 1",
    essay_submitted: "essays_submitted = daily_metrics.essays_submitted + 1",
    trilha_session: "trilha_sessions = daily_metrics.trilha_sessions + 1",
  };

  const inc = increments[p.eventType];
  if (!inc) return;

  await db.execute(sql`
    INSERT INTO daily_metrics (user_id, date, class_id, last_active_at)
    VALUES (${p.userId}, ${today}::date, ${classId}, NOW())
    ON CONFLICT (user_id, date, class_id) DO UPDATE
    SET ${sql.raw(inc)}, last_active_at = NOW()
  `);
}
