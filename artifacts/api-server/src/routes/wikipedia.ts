/**
 * Wikipedia PT Integration
 * Integração com a Wikipédia em Português sem necessidade de API key.
 * Fontes: pt.wikipedia.org (gratuito, sem autenticação)
 *
 * Endpoints:
 *   GET /wikipedia/search?q=query&limit=5   — busca artigos
 *   GET /wikipedia/summary?title=titulo      — resumo de um artigo
 *   POST /wikipedia/enrich                   — enriquece tópico para Tiagão
 */

import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const WIKI_BASE = "https://pt.wikipedia.org";
const WIKI_API = `${WIKI_BASE}/w/api.php`;
const WIKI_REST = `${WIKI_BASE}/api/rest_v1`;
const WIKI_HEADERS = { "User-Agent": "StudyAI/1.0 (study.ia.br; contato@study.ia.br)" };

// ─── Types ────────────────────────────────────────────────────────────────────
interface WikiSearchResult {
  pageid: number;
  title: string;
  snippet: string;
  url: string;
}

interface WikiSummary {
  title: string;
  description: string;
  extract: string;
  url: string;
  thumbnail?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s{3,}/g, "\n").trim();
}

// ─── Public helper (used by other routes) ────────────────────────────────────
export async function fetchWikiSummary(title: string): Promise<WikiSummary | null> {
  try {
    const encodedTitle = encodeURIComponent(title.replace(/ /g, "_"));
    const res = await fetch(`${WIKI_REST}/page/summary/${encodedTitle}`, {
      headers: WIKI_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return {
      title: data.title || title,
      description: data.description || "",
      extract: data.extract || "",
      url: data.content_urls?.desktop?.page || `${WIKI_BASE}/wiki/${encodedTitle}`,
      thumbnail: data.thumbnail?.source,
    };
  } catch {
    return null;
  }
}

export async function searchWikipedia(query: string, limit = 5): Promise<WikiSearchResult[]> {
  try {
    const params = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      format: "json",
      srlimit: String(limit),
      srprop: "snippet|titlesnippet",
      origin: "*",
    });
    const res = await fetch(`${WIKI_API}?${params}`, {
      headers: WIKI_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    const results = data?.query?.search || [];
    return results.map((r: any) => ({
      pageid: r.pageid,
      title: r.title,
      snippet: cleanHtml(r.snippet || ""),
      url: `${WIKI_BASE}/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
    }));
  } catch {
    return [];
  }
}

/**
 * Enrich a topic for Tiagão — returns a text block suitable for inclusion
 * in the AI system prompt context. Combines the top Wikipedia result.
 */
export async function enrichTopicFromWikipedia(topic: string, subject?: string): Promise<string> {
  try {
    // Try subject-specific search first, then topic alone
    const query = subject ? `${topic} ${subject}` : topic;
    const results = await searchWikipedia(query, 3);
    if (!results.length) return "";

    // Fetch summary of the best match
    const best = results[0];
    const summary = await fetchWikiSummary(best.title);
    if (!summary || !summary.extract) return "";

    const block = [
      `[Wikipedia PT — ${summary.title}]`,
      summary.description ? `Descrição: ${summary.description}` : "",
      summary.extract.slice(0, 1200),
      `Fonte: ${summary.url}`,
    ].filter(Boolean).join("\n");

    return block;
  } catch {
    return "";
  }
}

// ─── GET /wikipedia/search ────────────────────────────────────────────────────
router.get("/wikipedia/search", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const q = String(req.query.q || "").trim();
  const limit = Math.min(parseInt(String(req.query.limit || "6")), 12);
  if (!q) { res.json({ results: [] }); return; }
  try {
    const results = await searchWikipedia(q, limit);
    res.json({ results, source: "Wikipedia PT", query: q });
  } catch (err) {
    req.log.error({ err }, "Wikipedia search error");
    res.status(500).json({ erro: "Erro ao buscar na Wikipedia" });
  }
});

// ─── GET /wikipedia/summary ───────────────────────────────────────────────────
router.get("/wikipedia/summary", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const title = String(req.query.title || "").trim();
  if (!title) { res.status(400).json({ erro: "title obrigatório" }); return; }
  try {
    const summary = await fetchWikiSummary(title);
    if (!summary) { res.status(404).json({ erro: "Artigo não encontrado" }); return; }
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar artigo" });
  }
});

// ─── POST /wikipedia/enrich ───────────────────────────────────────────────────
// Body: { topic: string, subject?: string }
// Returns enriched content for use in mind maps or study plans
router.post("/wikipedia/enrich", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { topic, subject } = req.body as { topic?: string; subject?: string };
  if (!topic) { res.status(400).json({ erro: "topic obrigatório" }); return; }
  try {
    const [wikiResults, summary] = await Promise.all([
      searchWikipedia(subject ? `${topic} ${subject}` : topic, 5),
      fetchWikiSummary(topic).catch(() => null),
    ]);
    res.json({
      topic,
      summary: summary || null,
      related: wikiResults,
      source: "Wikipedia PT",
    });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao enriquecer tópico" });
  }
});

// ─── GET /wikipedia/inep-enem ────────────────────────────────────────────────
// Searches the INEP ENEM knowledge on Wikipedia + government open data info
router.get("/wikipedia/inep-enem", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const subject = String(req.query.subject || "").trim();
  if (!subject) { res.status(400).json({ erro: "subject obrigatório" }); return; }
  try {
    // Search Wikipedia for ENEM-relevant content on the subject
    const [wikiResults] = await Promise.all([
      searchWikipedia(`${subject} ENEM vestibular Brasil`, 6),
    ]);
    res.json({
      subject,
      wikiResults,
      inepPortal: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem",
      dadosAbertos: `https://dados.gov.br/dados/conjuntos-dados?q=${encodeURIComponent(subject)}`,
      source: "Wikipedia PT + INEP Portal",
    });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar conteúdo ENEM" });
  }
});

export default router;
