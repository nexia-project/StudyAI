/**
 * tiagao-method-state.ts
 *
 * Estado per-usuário do método pedagógico do Tiagão:
 *   • last_method            — último método aplicado
 *   • last_sentiment         — último sentimento detectado
 *   • frustration_streak     — contagem de mensagens "frustrado" consecutivas
 *   • method_override        — método forçado por comando do utilizador
 *   • method_override_until  — válido até este timestamp (3 turnos ≈ 10 min)
 *
 * Tabela: `tiagao_method_state` (criada em ensureSchema.ts).
 * Falhas de IO são engolidas — método volta ao default sem persistência.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import type { Sentimento, TeachingMethod } from "./teaching-method";

export interface TiagaoMethodState {
  lastMethod: TeachingMethod | null;
  lastSentiment: Sentimento | null;
  frustrationStreak: number;
  methodOverride: TeachingMethod | null;
  methodOverrideUntil: Date | null;
}

const EMPTY: TiagaoMethodState = {
  lastMethod: null,
  lastSentiment: null,
  frustrationStreak: 0,
  methodOverride: null,
  methodOverrideUntil: null,
};

function isValidMethod(m: unknown): m is TeachingMethod {
  return m === "analitico" || m === "pragmatico" || m === "conectivo";
}

function isValidSentiment(s: unknown): s is Sentimento {
  return s === "frustrado" || s === "confuso" || s === "cansado" || s === "animado" || s === "neutro";
}

export async function loadMethodState(userId: string): Promise<TiagaoMethodState> {
  if (!userId) return { ...EMPTY };
  try {
    const r = await db.execute(sql`
      SELECT last_method, last_sentiment, frustration_streak,
             method_override, method_override_until
      FROM tiagao_method_state
      WHERE user_id = ${userId}
      LIMIT 1
    `);
    if (!r.rows.length) return { ...EMPTY };
    const row = r.rows[0] as any;
    const until = row.method_override_until ? new Date(row.method_override_until) : null;
    const overrideActive = until && until.getTime() > Date.now();
    return {
      lastMethod: isValidMethod(row.last_method) ? row.last_method : null,
      lastSentiment: isValidSentiment(row.last_sentiment) ? row.last_sentiment : null,
      frustrationStreak: Number(row.frustration_streak ?? 0) || 0,
      methodOverride: overrideActive && isValidMethod(row.method_override) ? row.method_override : null,
      methodOverrideUntil: overrideActive ? until : null,
    };
  } catch {
    return { ...EMPTY };
  }
}

export interface SaveMethodStateInput {
  userId: string;
  method: TeachingMethod;
  sentiment: Sentimento;
  /** Se truthy: persiste override por até 10 min (≈ 3 turnos). */
  userOverrideMethod?: TeachingMethod | null;
}

export async function saveMethodState(input: SaveMethodStateInput): Promise<void> {
  if (!input.userId) return;
  try {
    // Incrementa streak se sentimento atual é "frustrado", senão zera.
    const overrideUntil = input.userOverrideMethod
      ? new Date(Date.now() + 10 * 60 * 1000)
      : null;

    await db.execute(sql`
      INSERT INTO tiagao_method_state (
        user_id, last_method, last_sentiment, frustration_streak,
        method_override, method_override_until, updated_at
      ) VALUES (
        ${input.userId},
        ${input.method},
        ${input.sentiment},
        ${input.sentiment === "frustrado" ? 1 : 0},
        ${input.userOverrideMethod ?? null},
        ${overrideUntil},
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        last_method = EXCLUDED.last_method,
        last_sentiment = EXCLUDED.last_sentiment,
        frustration_streak = CASE
          WHEN EXCLUDED.last_sentiment = 'frustrado'
            THEN tiagao_method_state.frustration_streak + 1
          ELSE 0
        END,
        method_override = COALESCE(EXCLUDED.method_override, tiagao_method_state.method_override),
        method_override_until = COALESCE(EXCLUDED.method_override_until, tiagao_method_state.method_override_until),
        updated_at = NOW()
    `);
  } catch {
    /* falha silenciosa — método volta ao default na próxima */
  }
}
