/**
 * lib/visuals/html-injection.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Helpers to inject illustrative <figure> blocks into generated HTML (slides,
 * resumos). Designed to be conservative and idempotent — never mutates the
 * source tree, only inserts new elements at well-known anchors.
 *
 * Public surface:
 *   - injectHeroFigure(html, visual, alt)      — top-of-document hero
 *   - injectSectionImages(html, opts)          — illustrate <section> elements
 *   - renderFigure(visual, alt)                — raw figure HTML (used by both)
 */

import { getVisual, type VisualResult, type VisualContext } from "./get-visual";

const FIGURE_STYLE =
  "margin:1.25rem 0;text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;";
const IMG_STYLE =
  "max-width:100%;height:auto;border-radius:8px;display:inline-block;object-fit:cover;";
const CAPTION_STYLE =
  "font-size:0.75rem;color:#64748b;margin-top:6px;font-style:italic;";

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderFigure(visual: VisualResult, alt: string): string {
  const safeAlt = escapeHtml(alt || visual.title || "ilustração");
  const safeUrl = escapeHtml(visual.url);
  const bits: string[] = [];
  if (visual.author) bits.push(escapeHtml(visual.author));
  if (visual.license) bits.push(escapeHtml(visual.license));
  if (visual.source && visual.source !== "placeholder") {
    bits.push(`fonte: ${escapeHtml(visual.source)}`);
  }
  const caption = bits.length ? `<figcaption style="${CAPTION_STYLE}">${bits.join(" · ")}</figcaption>` : "";
  return `<figure style="${FIGURE_STYLE}"><img src="${safeUrl}" alt="${safeAlt}" loading="lazy" style="${IMG_STYLE}" />${caption}</figure>`;
}

export function injectHeroFigure(
  html: string,
  visual: VisualResult,
  alt: string,
): string {
  const fig = renderFigure(visual, alt);
  // Try to insert after the first <header>, <h1>, or hero section.
  const headerEnd = html.match(/<\/header>/i);
  if (headerEnd && headerEnd.index !== undefined) {
    const idx = headerEnd.index + headerEnd[0].length;
    return html.slice(0, idx) + fig + html.slice(idx);
  }
  const h1End = html.match(/<\/h1>/i);
  if (h1End && h1End.index !== undefined) {
    const idx = h1End.index + h1End[0].length;
    return html.slice(0, idx) + fig + html.slice(idx);
  }
  const bodyOpen = html.match(/<body[^>]*>/i);
  if (bodyOpen && bodyOpen.index !== undefined) {
    const idx = bodyOpen.index + bodyOpen[0].length;
    return html.slice(0, idx) + fig + html.slice(idx);
  }
  return fig + html;
}

type SectionAnchor = { start: number; end: number };

function findSectionOpenings(html: string): SectionAnchor[] {
  const out: SectionAnchor[] = [];
  const re = /<section\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length });
  }
  return out;
}

/**
 * Insert an image figure inside each eligible <section>. Skips:
 *   - the very first section (treated as hero/title)
 *   - the very last section (treated as recap/closer)
 *   - sections beyond maxImages cap
 *
 * If `thin === true`, additionally skips every other eligible section.
 *
 * `topics` provides the topic string to look up per section; length should
 * match `sections.length` (callers pad with empty strings if needed).
 */
export async function injectSectionImages(
  html: string,
  opts: {
    topics: string[];
    subject?: string;
    bnccCode?: string;
    context?: VisualContext;
    tier?: "default" | "premium";
    maxImages?: number;
    thin?: boolean;
  },
): Promise<{ html: string; count: number }> {
  const anchors = findSectionOpenings(html);
  if (anchors.length <= 2) return { html, count: 0 };

  const eligible: number[] = [];
  for (let i = 1; i < anchors.length - 1; i++) {
    if (opts.thin && (i - 1) % 2 === 1) continue;
    eligible.push(i);
  }
  const cap = Math.max(0, opts.maxImages ?? 10);
  const chosen = eligible.slice(0, cap);
  if (!chosen.length) return { html, count: 0 };

  const results = await Promise.allSettled(
    chosen.map((sectionIdx) => {
      const topic = (opts.topics[sectionIdx] ?? "").trim();
      if (!topic) return Promise.resolve<VisualResult>({ url: "", source: "placeholder" });
      return getVisual({
        topic,
        subject: opts.subject,
        bnccCode: opts.bnccCode,
        context: opts.context ?? "slide",
        tier: opts.tier,
      });
    }),
  );

  type Insert = { at: number; html: string };
  const inserts: Insert[] = [];
  for (let i = 0; i < chosen.length; i++) {
    const r = results[i];
    if (r.status !== "fulfilled") continue;
    const visual = r.value;
    if (!visual.url) continue;
    const sectionIdx = chosen[i];
    const anchor = anchors[sectionIdx];
    const topic = opts.topics[sectionIdx] ?? "ilustração";
    inserts.push({ at: anchor.end, html: renderFigure(visual, topic) });
  }
  inserts.sort((a, b) => b.at - a.at);
  let out = html;
  for (const ins of inserts) {
    out = out.slice(0, ins.at) + ins.html + out.slice(ins.at);
  }
  return { html: out, count: inserts.length };
}

export async function injectHero(
  html: string,
  opts: {
    topic: string;
    subject?: string;
    bnccCode?: string;
    context?: VisualContext;
    tier?: "default" | "premium";
  },
): Promise<{ html: string; visual: VisualResult | null }> {
  if (!opts.topic.trim()) return { html, visual: null };
  const visual = await getVisual({
    topic: opts.topic,
    subject: opts.subject,
    bnccCode: opts.bnccCode,
    context: opts.context ?? "resumo",
    tier: opts.tier,
  });
  if (!visual.url) return { html, visual: null };
  return { html: injectHeroFigure(html, visual, opts.topic), visual };
}
