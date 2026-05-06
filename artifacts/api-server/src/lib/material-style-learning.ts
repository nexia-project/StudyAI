/**
 * material-style-learning.ts
 * Camada de APRENDIZADO ADAPTATIVO de estilos.
 *
 * Registra eventos de uso (geração, regeração, exportação, like, dislike, deleção)
 * e calcula scores ponderados por tema → permite que o picker se adapte ao gosto
 * do usuário ao longo do tempo, mantendo regras duras de qualidade.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";
import type { MaterialStyle } from "./material-style";

export type StyleAction =
  | "generated"      // +1.0  — usuário gerou material com esse tema
  | "exported"       // +2.5  — exportou (PDF/imprimir/download) → forte sinal de aprovação
  | "saved"          // +1.5  — salvou nos favoritos
  | "liked"          // +3.0  — explicitamente gostou
  | "regenerated"    // -1.5  — pediu regeração (provavelmente não gostou)
  | "disliked"       // -3.0  — explicitamente não gostou
  | "deleted";       // -2.0  — apagou do histórico

const ACTION_WEIGHTS: Record<StyleAction, number> = {
  generated: 1.0,
  exported: 2.5,
  saved: 1.5,
  liked: 3.0,
  regenerated: -1.5,
  disliked: -3.0,
  deleted: -2.0,
};

/**
 * Registra um evento de estilo. Nunca lança — apenas loga em caso de erro.
 */
export async function recordStyleEvent(opts: {
  userId: string;
  themeId: MaterialStyle["themeId"];
  action: StyleAction;
  materia?: string | null;
  nivel?: string | null;
  contentId?: number | null;
}): Promise<void> {
  try {
    if (!opts.userId || !opts.themeId) return;
    const weight = ACTION_WEIGHTS[opts.action] ?? 1.0;
    await db.execute(sql`
      INSERT INTO material_style_events (user_id, theme_id, action, materia, nivel, weight, content_id)
      VALUES (
        ${opts.userId},
        ${opts.themeId},
        ${opts.action},
        ${opts.materia ?? null},
        ${opts.nivel ?? null},
        ${weight},
        ${opts.contentId ?? null}
      )
    `);
  } catch (err) {
    logger.warn({ err, action: opts.action }, "[material-style-learning] failed to record event (non-fatal)");
  }
}

export type ThemeBias = {
  themeId: MaterialStyle["themeId"];
  score: number;
  count: number;
};

export type UserStyleBias = {
  global: ThemeBias[];        // todos os temas, ordenado por score desc
  forMateria: ThemeBias[];    // temas usados naquela matéria especificamente
  totalEvents: number;
};

/**
 * Calcula o bias de estilo do usuário a partir do histórico recente.
 *
 * - Aplica decaimento exponencial por idade (eventos antigos pesam menos)
 * - Separa scores globais vs específicos da matéria atual
 * - Janela: últimos 90 dias, máximo 200 eventos
 */
export async function getUserStyleBias(userId: string, materia?: string | null): Promise<UserStyleBias> {
  const empty: UserStyleBias = { global: [], forMateria: [], totalEvents: 0 };
  if (!userId) return empty;

  try {
    const r = await db.execute<{
      theme_id: string;
      weight: string;
      materia: string | null;
      age_days: string;
    }>(sql`
      SELECT theme_id, weight, materia,
             EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 AS age_days
      FROM material_style_events
      WHERE user_id = ${userId}
        AND created_at > NOW() - INTERVAL '90 days'
      ORDER BY created_at DESC
      LIMIT 200
    `);

    if (!r.rows.length) return empty;

    // Decaimento exponencial: meia-vida de 30 dias
    const HALF_LIFE_DAYS = 30;
    const decay = (ageDays: number) => Math.pow(0.5, ageDays / HALF_LIFE_DAYS);

    const globalAcc = new Map<string, { score: number; count: number }>();
    const materiaAcc = new Map<string, { score: number; count: number }>();
    const targetMateria = (materia ?? "").trim().toLowerCase();

    for (const row of r.rows) {
      const w = parseFloat(row.weight) * decay(parseFloat(row.age_days));
      const cur = globalAcc.get(row.theme_id) ?? { score: 0, count: 0 };
      cur.score += w;
      cur.count += 1;
      globalAcc.set(row.theme_id, cur);

      if (targetMateria && (row.materia ?? "").trim().toLowerCase() === targetMateria) {
        const m = materiaAcc.get(row.theme_id) ?? { score: 0, count: 0 };
        m.score += w;
        m.count += 1;
        materiaAcc.set(row.theme_id, m);
      }
    }

    const toSorted = (acc: Map<string, { score: number; count: number }>): ThemeBias[] =>
      Array.from(acc.entries())
        .map(([themeId, v]) => ({ themeId: themeId as MaterialStyle["themeId"], score: v.score, count: v.count }))
        .sort((a, b) => b.score - a.score);

    return {
      global: toSorted(globalAcc),
      forMateria: toSorted(materiaAcc),
      totalEvents: r.rows.length,
    };
  } catch (err) {
    logger.warn({ err }, "[material-style-learning] failed to compute bias (non-fatal)");
    return empty;
  }
}

/**
 * Quais temas são considerados "compatíveis substitutos" um do outro.
 * Usado pra aplicar bias respeitando regras de qualidade — só troca dentro
 * de buckets compatíveis (ex.: nunca trocaria kids-vibrant por dark-editorial).
 */
const COMPATIBLE_THEMES: Record<MaterialStyle["themeId"], MaterialStyle["themeId"][]> = {
  // Dark editorial pode virar blueprint ou lab (ainda escuros, ainda sofisticados)
  "dark-editorial":       ["dark-editorial", "scientific-blueprint", "lab-vibrant"],
  "scientific-blueprint": ["scientific-blueprint", "dark-editorial", "lab-vibrant"],
  "lab-vibrant":          ["lab-vibrant", "scientific-blueprint", "dark-editorial"],
  // Light premium / humanas / natural — todos claros editoriais
  "clean-light":          ["clean-light", "magazine-bold", "natural-bright"],
  "vintage-paper":        ["vintage-paper", "clean-light", "magazine-bold"],
  "natural-bright":       ["natural-bright", "clean-light", "magazine-bold"],
  "magazine-bold":        ["magazine-bold", "clean-light", "vintage-paper"],
  // Kids é INTOCÁVEL — não troca por nada (regra dura)
  "kids-vibrant":         ["kids-vibrant"],
};

/**
 * Aplica o bias do usuário sobre uma escolha base de tema.
 * Se um tema compatível tiver score >> base, substitui.
 *
 * - LIMIAR mínimo: bias score precisa ser ≥ 3.0 + 1.5*(score do tema base) pra trocar
 * - SÓ troca dentro do bucket compatível (mantém qualidade visual)
 * - SEMPRE respeita kids-vibrant (Fund 1) — nunca substitui
 */
export function applyBiasToBaseTheme(
  baseThemeId: MaterialStyle["themeId"],
  bias: UserStyleBias,
): { themeId: MaterialStyle["themeId"]; reason: string } {
  // 1) Regra dura: kids-vibrant nunca troca
  if (baseThemeId === "kids-vibrant") {
    return { themeId: baseThemeId, reason: "regra-dura-fundamental-1" };
  }

  // 2) Sem dados → mantém base
  if (bias.totalEvents < 3) {
    return { themeId: baseThemeId, reason: "bias-insuficiente" };
  }

  const compatible = COMPATIBLE_THEMES[baseThemeId] ?? [baseThemeId];
  const compatSet = new Set<string>(compatible);

  // 3) Prioridade 1: bias da matéria específica (sinal mais forte)
  const materiaCandidate = bias.forMateria.find(b => compatSet.has(b.themeId) && b.themeId !== baseThemeId);
  if (materiaCandidate && materiaCandidate.score >= 4.0 && materiaCandidate.count >= 2) {
    return { themeId: materiaCandidate.themeId, reason: `bias-materia(${materiaCandidate.score.toFixed(1)}, n=${materiaCandidate.count})` };
  }

  // 4) Prioridade 2: bias global forte (≥ 8.0 acumulado, n ≥ 4)
  const globalCandidate = bias.global.find(b => compatSet.has(b.themeId) && b.themeId !== baseThemeId);
  if (globalCandidate && globalCandidate.score >= 8.0 && globalCandidate.count >= 4) {
    return { themeId: globalCandidate.themeId, reason: `bias-global(${globalCandidate.score.toFixed(1)}, n=${globalCandidate.count})` };
  }

  return { themeId: baseThemeId, reason: "base-mantida" };
}
