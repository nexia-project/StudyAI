/**
 * lib/visuals/curated-bank.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Educational image lookup against the curated bank (Wikimedia Commons).
 *
 * The bank is zero-cost and returns CC-BY / CC0 images only — safe to use in
 * generated slides/resumos/aulas with attribution.
 *
 * Public surface:
 *   - lookupCuratedImage({ topic, subject?, bnccCode?, limit? })
 */

import { searchWikimediaImages, type WikimediaImage } from "./wikimedia";

/**
 * Tiny mapping from common BNCC competency codes to Portuguese search hints
 * that yield better Wikimedia Commons results than the raw topic alone.
 *
 * Intentionally small (~30 entries). When a code matches, we prefer the hint
 * over the raw topic; when it doesn't, we fall back to `topic + subject`.
 */
const BNCC_TO_QUERY_HINTS: Record<string, string> = {
  // ── Matemática (EM13MAT) ────────────────────────────────────────────────────
  EM13MAT101: "função quadrática gráfico parábola",
  EM13MAT301: "função linear gráfico cartesiano",
  EM13MAT302: "função exponencial gráfico",
  EM13MAT303: "função logarítmica gráfico",
  EM13MAT309: "geometria plana figuras",
  EM13MAT310: "geometria espacial sólidos",
  EM13MAT401: "probabilidade estatística",
  EM13MAT402: "estatística histograma",
  // ── Ciências da Natureza (EM13CNT) ──────────────────────────────────────────
  EM13CNT101: "célula biologia microscópio",
  EM13CNT102: "ecossistema biodiversidade",
  EM13CNT201: "tabela periódica química",
  EM13CNT202: "reação química laboratório",
  EM13CNT301: "física mecânica newton",
  EM13CNT302: "eletricidade circuito elétrico",
  EM13CNT303: "óptica luz prisma",
  EM13CNT304: "termodinâmica energia",
  // ── Ciências Humanas (EM13CHS) ──────────────────────────────────────────────
  EM13CHS101: "geografia mapa brasil",
  EM13CHS102: "história brasil colônia",
  EM13CHS103: "revolução francesa",
  EM13CHS104: "revolução industrial",
  EM13CHS201: "ditadura militar brasil",
  EM13CHS301: "globalização economia mundial",
  EM13CHS302: "demografia população brasil",
  EM13CHS401: "sociologia cultura",
  EM13CHS402: "filosofia pensamento",
  // ── Linguagens (EM13LGG) ────────────────────────────────────────────────────
  EM13LGG101: "literatura brasileira livros",
  EM13LGG102: "modernismo brasileiro arte",
  EM13LGG201: "gramática língua portuguesa",
  EM13LGG301: "arte renascimento pintura",
  EM13LGG302: "música brasileira",
};

function normaliseTopic(topic: string): string {
  let t = (topic ?? "").trim();
  if (!t) return "";
  t = t.replace(/["'`]/g, " ");
  t = t.replace(/^(o|a|os|as|um|uma|uns|umas|the|an)\s+/i, "");
  t = t.replace(/[.,;:!?]+$/g, "");
  t = t.replace(/\s+/g, " ").trim();
  return t.slice(0, 80);
}

function buildSearchQuery(opts: {
  topic: string;
  bnccCode?: string;
  subject?: string;
}): string {
  const topic = normaliseTopic(opts.topic);
  if (opts.bnccCode) {
    const hint = BNCC_TO_QUERY_HINTS[opts.bnccCode.toUpperCase()];
    if (hint) {
      const lowTopic = topic.toLowerCase();
      const lowHint = hint.toLowerCase();
      if (lowTopic && !lowHint.includes(lowTopic.slice(0, 12))) {
        return `${hint} ${topic}`.slice(0, 100);
      }
      return hint;
    }
  }
  const subject = (opts.subject ?? "").trim();
  if (!topic) return subject;
  if (!subject) return topic;
  if (topic.toLowerCase().includes(subject.toLowerCase())) return topic;
  return `${topic} ${subject}`.slice(0, 100);
}

export async function lookupCuratedImage(opts: {
  topic: string;
  bnccCode?: string;
  subject?: string;
  limit?: number;
}): Promise<WikimediaImage[]> {
  const limit = Math.max(1, Math.min(opts.limit ?? 3, 5));
  const query = buildSearchQuery(opts);
  if (!query) return [];
  const hits = await searchWikimediaImages(query, limit);
  if (hits.length > 0) return hits;
  if (opts.subject && opts.topic) {
    const fallback = await searchWikimediaImages(normaliseTopic(opts.topic), limit);
    if (fallback.length > 0) return fallback;
  }
  return [];
}

export { type WikimediaImage } from "./wikimedia";
