/**
 * lib/visuals/get-visual.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified visual orchestrator. Strategy:
 *   1. (Default) Try curated bank first — Wikimedia Commons CC-BY / CC0.
 *   2. Fall back to AI generation (FLUX schnell / DALL-E 3) gated by env keys.
 *   3. Last resort: return a static placeholder URL — guarantees the field
 *      always has a usable `url`, callers don't need null-checks for layout.
 *
 * Env gates:
 *   - VISUALS_ENABLED=false                  → returns placeholder
 *   - VISUALS_ENABLED unset + no API keys    → curated-only, then placeholder
 *
 * Public surface:
 *   - VisualResult, VisualContext
 *   - getVisual(opts)
 *   - isVisualsEnabled()
 *   - VISUALS_PLACEHOLDER_URL
 */

import { lookupCuratedImage } from "./curated-bank";
import {
  generateImage,
  buildEducationalPrompt,
  isImageGenKilled,
  type ImageGenAspect,
  type ImageGenTier,
} from "./image-gen";

export type VisualSource = "wikimedia" | "flux-schnell" | "dalle-3" | "placeholder";
export type VisualContext = "slide" | "resumo" | "aula" | "mapa";

export type VisualResult = {
  url: string;
  source: VisualSource;
  license?: string;
  author?: string;
  title?: string;
};

export const VISUALS_PLACEHOLDER_URL = "/visuals/placeholder.png";

export function isVisualsEnabled(): boolean {
  if (isImageGenKilled()) return false;
  // Even without paid keys we can still serve Wikimedia (free).
  return true;
}

function placeholder(): VisualResult {
  return { url: VISUALS_PLACEHOLDER_URL, source: "placeholder" };
}

function pickAspect(context?: VisualContext): ImageGenAspect {
  switch (context) {
    case "slide":
      return "16:9";
    case "resumo":
      return "16:9";
    case "aula":
      return "16:9";
    case "mapa":
      return "4:3";
    default:
      return "16:9";
  }
}

export async function getVisual(opts: {
  topic: string;
  subject?: string;
  bnccCode?: string;
  context?: VisualContext;
  tier?: ImageGenTier;
  preferGenerated?: boolean;
}): Promise<VisualResult> {
  const topic = (opts.topic ?? "").trim();
  if (!topic) return placeholder();
  if (isImageGenKilled()) return placeholder();

  const aspect = pickAspect(opts.context);
  const tier: ImageGenTier = opts.tier ?? "default";

  // 1) Curated bank first (unless caller insists on AI).
  if (!opts.preferGenerated) {
    try {
      const hits = await lookupCuratedImage({
        topic,
        subject: opts.subject,
        bnccCode: opts.bnccCode,
        limit: 1,
      });
      const top = hits[0];
      if (top) {
        return {
          url: top.url,
          source: "wikimedia",
          license: top.licenseShort,
          author: top.author,
          title: top.title,
        };
      }
    } catch {
      /* fall through */
    }
  }

  // 2) AI generation fallback.
  try {
    const prompt = buildEducationalPrompt(
      opts.subject ? `${topic} — ${opts.subject}` : topic,
    );
    const gen = await generateImage({ prompt, tier, aspect });
    if (gen) {
      return {
        url: gen.url,
        source: gen.provider,
        license: "AI-generated",
        author: gen.provider === "dalle-3" ? "DALL-E 3" : "FLUX schnell",
        title: topic,
      };
    }
  } catch {
    /* fall through */
  }

  // 3) If we were asked to prefer generated but AI failed, retry curated.
  if (opts.preferGenerated) {
    try {
      const hits = await lookupCuratedImage({
        topic,
        subject: opts.subject,
        bnccCode: opts.bnccCode,
        limit: 1,
      });
      const top = hits[0];
      if (top) {
        return {
          url: top.url,
          source: "wikimedia",
          license: top.licenseShort,
          author: top.author,
          title: top.title,
        };
      }
    } catch {
      /* fall through */
    }
  }

  return placeholder();
}
