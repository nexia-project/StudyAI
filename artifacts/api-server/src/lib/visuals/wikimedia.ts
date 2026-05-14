/**
 * lib/visuals/wikimedia.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Curated visual bank: search Wikimedia Commons for CC-BY / CC-BY-SA / CC0 /
 * public domain images suitable for educational use (slides, resumos, aulas).
 *
 * Free tier (no API key needed). Wikimedia Commons usage policy is generous
 * but asks for: identifiable User-Agent, max ~2 req/s, and license attribution
 * downstream when displayed to the user.
 *
 * Public surface:
 *   - WikimediaImage           — normalized result shape
 *   - searchWikimediaImages()  — fail-safe (returns [] on any error)
 *   - sleep(ms)                — small helper, re-exported for callers
 */

export type WikimediaImage = {
  url: string;
  thumbUrl: string;
  title: string;
  licenseShort: string;
  author: string;
  source: "wikimedia";
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "StudyAI-Visuals/1.0 (https://study.ia.br; contato@study.ia.br)";
const TIMEOUT_MS = 6000;

// Strict allow-list for license short names (case-insensitive substring match).
const ALLOWED_LICENSE_PATTERNS = [
  /\bcc[-\s]?by\b/i,         // CC-BY, CC BY, CC-BY-SA, CC BY-SA-...
  /\bcc[-\s]?0\b/i,          // CC0, CC-0
  /\bpublic[-\s]?domain\b/i, // Public Domain, public-domain
  /^pd(-|\s|$)/i,            // PD, PD-Art, PD-old
  /\bno restrictions\b/i,    // Library of Congress style
];

function isAllowedLicense(licenseShort: string | undefined | null): boolean {
  if (!licenseShort) return false;
  const s = String(licenseShort).trim();
  if (!s) return false;
  return ALLOWED_LICENSE_PATTERNS.some((re) => re.test(s));
}

// Simple in-process throttle: ensure ≥500ms between outgoing requests.
let lastRequestAt = 0;
async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, lastRequestAt + 500 - now);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

function decodeWikitext(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWithTimeout(url: string, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  try {
    return await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Search Wikimedia Commons for images matching the query. Filters strictly
 * to CC-BY / CC-BY-SA / CC0 / Public Domain. Returns at most `limit` hits.
 * Never throws — returns [] on network/parse/no-result errors.
 */
export async function searchWikimediaImages(
  query: string,
  limit = 5,
): Promise<WikimediaImage[]> {
  const q = (query ?? "").trim();
  if (!q) return [];
  const lim = Math.max(1, Math.min(limit, 10));

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: q,
    gsrnamespace: "6", // File namespace
    gsrlimit: String(lim),
    prop: "imageinfo",
    iiprop: "url|extmetadata|mime|size",
    iiurlwidth: "1024",
    origin: "*",
  });
  const url = `${COMMONS_API}?${params.toString()}`;

  try {
    await throttle();
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const pages: any[] = Array.isArray(data?.query?.pages) ? data.query.pages : [];
    if (!pages.length) return [];

    const out: WikimediaImage[] = [];
    for (const page of pages) {
      const info = Array.isArray(page?.imageinfo) ? page.imageinfo[0] : null;
      if (!info) continue;
      const mime = String(info?.mime ?? "");
      if (!/^image\/(jpe?g|png|gif|webp|svg\+xml)$/i.test(mime)) continue;
      const meta = info?.extmetadata ?? {};
      const licenseShort = String(meta?.LicenseShortName?.value ?? "").trim();
      if (!isAllowedLicense(licenseShort)) continue;
      const author = decodeWikitext(meta?.Artist?.value ?? meta?.Credit?.value ?? "") || "Wikimedia Commons";
      const mainUrl = String(info?.url ?? "");
      const thumbUrl = String(info?.thumburl ?? mainUrl);
      const title = String(page?.title ?? "").replace(/^File:/, "").replace(/_/g, " ");
      if (!mainUrl) continue;
      out.push({
        url: mainUrl,
        thumbUrl,
        title,
        licenseShort,
        author: author.slice(0, 200),
        source: "wikimedia",
      });
      if (out.length >= lim) break;
    }
    return out;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[visuals/wikimedia] search failed:", (err as Error)?.message ?? err);
    }
    return [];
  }
}
