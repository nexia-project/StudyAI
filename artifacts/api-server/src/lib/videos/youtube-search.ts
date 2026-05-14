/**
 * lib/videos/youtube-search.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * YouTube Data API v3 search — devolve vídeos educacionais em formato
 * normalizado (`YouTubeVideo`). Filtragem por whitelist de canais brasileiros
 * confiáveis e por duração máxima (default 30 min) são aplicadas in-process.
 *
 * Quotas / custo:
 *   - Google free tier: 10.000 unidades/dia por chave.
 *   - search.list      → 100 unidades/chamada
 *   - videos.list      → 1 unidade/chamada
 *   ⇒ ~100 buscas únicas/dia. Cache 24h agressivo + dedup garante uso saudável.
 *
 * Sem chave (`YOUTUBE_API_KEY` ausente / vazia): devolve `[]` imediatamente. O
 * caller faz fallback para `lookupCuratedVideos` (banco hand-picked).
 *
 * Embed-only: nunca scrapeamos ou re-hospedamos. `embedUrl` aponta para
 * `youtube-nocookie.com` (privacy-enhanced mode) com `rel=0&modestbranding=1`
 * para evitar vídeos relacionados fora da whitelist e branding minimal.
 */

import { isTrustedChannel } from "./trusted-channels";

export type YouTubeVideo = {
  videoId: string;
  title: string;
  channelId: string;
  channelName: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationSeconds?: number;
  /** youtube-nocookie.com (privacy mode, no related from outside channel) */
  embedUrl: string;
  /** youtube.com canonical watch URL — usado em "Assistir no YouTube ↗". */
  watchUrl: string;
};

interface SearchOpts {
  query: string;
  language?: string;
  region?: string;
  limit?: number;
  trustedOnly?: boolean;
  maxDurationSeconds?: number;
}

// ─── Cache (24h, capped at 200 entries) ──────────────────────────────────────
type CacheEntry = {
  ts: number;
  videos: YouTubeVideo[];
};
const CACHE_MAX_ENTRIES = 200;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache: Map<string, CacheEntry> = new Map();

function cacheKey(opts: SearchOpts): string {
  const q = opts.query.trim().toLowerCase();
  const trusted = opts.trustedOnly !== false ? "1" : "0";
  const limit = opts.limit ?? 5;
  const maxDur = opts.maxDurationSeconds ?? 1800;
  return `${q}|${trusted}|${limit}|${maxDur}`;
}

function cacheGet(key: string): YouTubeVideo[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  // Refresh insertion order (Map preserva ordem; re-set = LRU "touched").
  cache.delete(key);
  cache.set(key, hit);
  return hit.videos;
}

function cacheSet(key: string, videos: YouTubeVideo[]): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { ts: Date.now(), videos });
}

// ─── Throttle: ≤5 req/s ──────────────────────────────────────────────────────
const MIN_GAP_MS = 1000 / 5; // 200ms entre requests
let lastRequestAt = 0;
function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, lastRequestAt + MIN_GAP_MS - now);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────
const API_BASE = "https://www.googleapis.com/youtube/v3";
const TIMEOUT_MS = 8000;

async function fetchJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      // Falhas mais comuns: 403 (quota / key inválida), 400 (regionCode ruim).
      // Não vazamos para o caller — devolvemos null e logamos.
      if (process.env.NODE_ENV !== "production") {
        const txt = await res.text().catch(() => "");
        console.warn(`[videos/youtube] HTTP ${res.status}: ${txt.slice(0, 200)}`);
      }
      return null;
    }
    return await res.json();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[videos/youtube] fetch failed:", (err as Error)?.message ?? err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── ISO-8601 duration parser (PT#H#M#S) ─────────────────────────────────────
const ISO_DURATION_RE = /^P(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
function parseIsoDuration(iso: string | undefined | null): number | undefined {
  if (!iso) return undefined;
  const m = ISO_DURATION_RE.exec(String(iso));
  if (!m) return undefined;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  const total = h * 3600 + min * 60 + s;
  return Number.isFinite(total) && total > 0 ? total : undefined;
}

// ─── Constructors ────────────────────────────────────────────────────────────
export function buildEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}

export function buildWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// ─── Main search ─────────────────────────────────────────────────────────────
function isApiKeyAvailable(): boolean {
  const key = (process.env.YOUTUBE_API_KEY ?? "").trim();
  return key.length > 0;
}

export async function searchYouTubeVideos(opts: SearchOpts): Promise<YouTubeVideo[]> {
  const query = (opts.query ?? "").trim();
  if (!query) return [];

  const limit = Math.max(1, Math.min(opts.limit ?? 5, 25));
  const trustedOnly = opts.trustedOnly !== false; // default true
  const maxDuration = Math.max(60, opts.maxDurationSeconds ?? 1800);
  const language = (opts.language ?? "pt").trim() || "pt";
  const region = (opts.region ?? "BR").trim() || "BR";

  // Sem API key → curto-circuita; caller faz fallback ao banco curado.
  if (!isApiKeyAvailable()) return [];

  const key = cacheKey({ ...opts, limit, trustedOnly, maxDurationSeconds: maxDuration });
  const cached = cacheGet(key);
  if (cached) return cached.slice(0, limit);

  const apiKey = (process.env.YOUTUBE_API_KEY ?? "").trim();

  // Buscamos mais resultados do que `limit` porque o filtro de canal/duração
  // pode descartar boa parte. 3× costuma sobrar margem para 1-3 vídeos finais.
  const fetchCount = Math.min(50, Math.max(limit * 3, 12));

  const searchParams = new URLSearchParams({
    part: "snippet",
    type: "video",
    relevanceLanguage: language,
    regionCode: region,
    safeSearch: "moderate",
    videoEmbeddable: "true",
    maxResults: String(fetchCount),
    q: query,
    key: apiKey,
  });
  const searchUrl = `${API_BASE}/search?${searchParams.toString()}`;

  await throttle();
  const searchData = await fetchJson(searchUrl);
  if (!searchData) return [];
  const items: any[] = Array.isArray(searchData?.items) ? searchData.items : [];
  if (items.length === 0) return [];

  // Filtra logo aqui pelos canais confiáveis para economizar quota no videos.list
  // (não pagamos a chamada de duração para algo que vamos descartar).
  const filteredItems = trustedOnly
    ? items.filter((it) => isTrustedChannel(it?.snippet?.channelId))
    : items;

  if (filteredItems.length === 0) {
    // Cacheia o "vazio" também para evitar refazer a mesma busca ruim 24h.
    cacheSet(key, []);
    return [];
  }

  const videoIds = filteredItems
    .map((it) => String(it?.id?.videoId ?? ""))
    .filter(Boolean)
    .slice(0, 50);

  if (videoIds.length === 0) {
    cacheSet(key, []);
    return [];
  }

  // Segunda chamada (1 unidade) — pega `contentDetails` (duração) para filtro.
  const detailsParams = new URLSearchParams({
    part: "contentDetails,statistics",
    id: videoIds.join(","),
    key: apiKey,
  });
  const detailsUrl = `${API_BASE}/videos?${detailsParams.toString()}`;

  await throttle();
  const detailsData = await fetchJson(detailsUrl);
  const detailsMap: Map<string, { duration?: number }> = new Map();
  if (detailsData && Array.isArray(detailsData.items)) {
    for (const d of detailsData.items as any[]) {
      const id = String(d?.id ?? "");
      if (!id) continue;
      detailsMap.set(id, {
        duration: parseIsoDuration(d?.contentDetails?.duration),
      });
    }
  }

  const out: YouTubeVideo[] = [];
  for (const it of filteredItems) {
    const videoId = String(it?.id?.videoId ?? "");
    if (!videoId) continue;
    const snippet = it?.snippet ?? {};
    const det = detailsMap.get(videoId);
    const duration = det?.duration;
    if (duration !== undefined && duration > maxDuration) continue;

    const thumbs = snippet?.thumbnails ?? {};
    const thumb =
      thumbs?.high?.url ||
      thumbs?.medium?.url ||
      thumbs?.default?.url ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    out.push({
      videoId,
      title: String(snippet?.title ?? "").trim() || "Vídeo educacional",
      channelId: String(snippet?.channelId ?? ""),
      channelName: String(snippet?.channelTitle ?? "").trim() || "Canal",
      thumbnailUrl: thumb,
      publishedAt: String(snippet?.publishedAt ?? ""),
      durationSeconds: duration,
      embedUrl: buildEmbedUrl(videoId),
      watchUrl: buildWatchUrl(videoId),
    });

    if (out.length >= limit) break;
  }

  cacheSet(key, out);
  return out.slice(0, limit);
}

/**
 * Hidrata um vídeo a partir de campos parciais (ex.: curated-bank). Útil
 * porque o banco curado só guarda IDs + dicas; aqui montamos o shape final.
 */
export function hydrateVideo(input: {
  videoId: string;
  title?: string;
  channelId?: string;
  channelName?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  durationSeconds?: number;
}): YouTubeVideo {
  const videoId = input.videoId;
  return {
    videoId,
    title: input.title ?? "Vídeo recomendado",
    channelId: input.channelId ?? "",
    channelName: input.channelName ?? "Canal recomendado",
    thumbnailUrl:
      input.thumbnailUrl ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    publishedAt: input.publishedAt ?? "",
    durationSeconds: input.durationSeconds,
    embedUrl: buildEmbedUrl(videoId),
    watchUrl: buildWatchUrl(videoId),
  };
}
