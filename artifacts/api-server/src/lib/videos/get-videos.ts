/**
 * lib/videos/get-videos.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Orquestrador unificado para recomendação de vídeos educacionais. Função
 * pública: `getEducationalVideos`.
 *
 * Ordem de resolução:
 *   1. YouTube Data API v3 (`searchYouTubeVideos`) filtrado por whitelist de
 *      canais brasileiros + duração máxima. Precisa `YOUTUBE_API_KEY`.
 *   2. Banco curado (`lookupCuratedVideos`) — IDs hand-picked, sem API.
 *   3. `[]` quando nada resolve. O frontend simplesmente não mostra a strip.
 *
 * Nunca lança. Erros de rede / quota viram `[]` silencioso (logado em DEV).
 */

import { lookupCuratedVideos } from "./curated-bank";
import { searchYouTubeVideos, type YouTubeVideo } from "./youtube-search";

export type { YouTubeVideo } from "./youtube-search";

export async function getEducationalVideos(opts: {
  query: string;
  subject?: string;
  bnccCode?: string;
  limit?: number;
}): Promise<YouTubeVideo[]> {
  const query = (opts.query ?? "").trim();
  if (!query) return [];
  const limit = Math.max(1, Math.min(opts.limit ?? 3, 6));

  // Reforço de query: anexa `subject` quando ele não está embutido no tópico.
  // Ex.: query="cinemática" + subject="Física" → "cinemática Física".
  const subject = (opts.subject ?? "").trim();
  const effectiveQuery =
    subject && !query.toLowerCase().includes(subject.toLowerCase())
      ? `${query} ${subject}`
      : query;

  // 1) YouTube Data API (best path — vídeos atuais e ranqueados)
  try {
    const apiResults = await searchYouTubeVideos({
      query: effectiveQuery,
      language: "pt",
      region: "BR",
      limit,
      trustedOnly: true,
      maxDurationSeconds: 1800,
    });
    if (apiResults.length > 0) return apiResults;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[videos/get-videos] API path failed:", (err as Error)?.message ?? err);
    }
  }

  // 2) Banco curado (sem API — funciona 100% offline)
  try {
    const curated = lookupCuratedVideos(effectiveQuery, limit);
    if (curated.length > 0) return curated;

    // Última tentativa: só com o `query` (sem o sufixo subject) para o caso
    // de o subject estar atrapalhando o keyword match no banco.
    if (effectiveQuery !== query) {
      const fallback = lookupCuratedVideos(query, limit);
      if (fallback.length > 0) return fallback;
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[videos/get-videos] curated path failed:", (err as Error)?.message ?? err);
    }
  }

  // 3) Sem hits — frontend esconde a strip.
  return [];
}

/** Verifica se o módulo tem alguma fonte funcional (API ou banco). */
export function isVideosEnabled(): boolean {
  // O banco curado sempre existe; o módulo só fica inerte se o caller forçar.
  return true;
}
