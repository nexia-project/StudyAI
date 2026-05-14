/**
 * lib/visuals/image-gen.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * AI image generation with two providers:
 *   - default tier  → FLUX schnell via Together AI (~$0.003/img)
 *   - premium tier  → DALL-E 3 via OpenAI         (~$0.04 / $0.08 per img)
 *
 * Both providers return ephemeral URLs (valid ~24h) which we re-serve as-is.
 * Caller is responsible for caching/persisting if longer durability is needed.
 *
 * Public surface:
 *   - buildEducationalPrompt(rawTopic, style?)
 *   - generateImage({ prompt, tier?, aspect? })
 *   - isImageGenEnabled() / isImageGenKilled()
 *
 * Cache: simple in-process LRU capped at 500 entries.
 */

import { createHash } from "node:crypto";

export type ImageGenTier = "default" | "premium";
export type ImageGenProvider = "flux-schnell" | "dalle-3";
export type ImageGenAspect = "1:1" | "16:9" | "4:3";

export type ImageGenResult = {
  url: string;
  provider: ImageGenProvider;
  costEstimateUsd: number;
};

// ── LRU cache ────────────────────────────────────────────────────────────────
const CACHE_MAX = 500;
const cache = new Map<string, ImageGenResult>();

function cacheKey(prompt: string, provider: ImageGenProvider, aspect: ImageGenAspect): string {
  return createHash("sha256")
    .update(`${provider}::${aspect}::${prompt}`)
    .digest("hex");
}

function cacheGet(key: string): ImageGenResult | null {
  const hit = cache.get(key);
  if (!hit) return null;
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

function cacheSet(key: string, value: ImageGenResult): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

// ── Kill switch / availability ───────────────────────────────────────────────
export function isImageGenKilled(): boolean {
  return String(process.env.VISUALS_ENABLED ?? "").toLowerCase() === "false";
}

export function isImageGenEnabled(): boolean {
  if (isImageGenKilled()) return false;
  return Boolean(process.env.TOGETHER_API_KEY || process.env.OPENAI_API_KEY);
}

// ── Prompt builder ───────────────────────────────────────────────────────────
const STYLE_PREFIX =
  "clean educational illustration, flat design, soft pastel colors, white background, no text, no watermarks, suitable for a school presentation, subject:";

export function buildEducationalPrompt(rawTopic: string, style?: string): string {
  let topic = String(rawTopic ?? "").trim();
  if (!topic) topic = "educational concept";
  topic = topic.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ");
  if (topic.length > 220) topic = topic.slice(0, 220);
  const suffix = style ? `, style: ${String(style).trim().slice(0, 80)}` : "";
  return `${STYLE_PREFIX} ${topic}${suffix}`.trim();
}

// ── Aspect → provider-specific size ──────────────────────────────────────────
function aspectToDalleSize(aspect: ImageGenAspect): { size: string; cost: number } {
  switch (aspect) {
    case "16:9":
      return { size: "1792x1024", cost: 0.08 };
    case "4:3":
      return { size: "1024x1024", cost: 0.04 };
    case "1:1":
    default:
      return { size: "1024x1024", cost: 0.04 };
  }
}

function aspectToFluxSize(aspect: ImageGenAspect): { width: number; height: number } {
  switch (aspect) {
    case "16:9":
      return { width: 1024, height: 576 };
    case "4:3":
      return { width: 1024, height: 768 };
    case "1:1":
    default:
      return { width: 1024, height: 1024 };
  }
}

// ── HTTP helper ──────────────────────────────────────────────────────────────
async function fetchWithTimeout(url: string, init: RequestInit, ms = 45_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Provider calls ───────────────────────────────────────────────────────────
async function callDalle3(prompt: string, aspect: ImageGenAspect): Promise<ImageGenResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const { size, cost } = aspectToDalleSize(aspect);
  try {
    const res = await fetchWithTimeout(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt,
          n: 1,
          size,
          response_format: "url",
          quality: "standard",
        }),
      },
      60_000,
    );
    if (!res.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[visuals/dalle3] non-OK", res.status, await res.text().catch(() => ""));
      }
      return null;
    }
    const data = (await res.json()) as any;
    const url = data?.data?.[0]?.url;
    if (!url || typeof url !== "string") return null;
    return { url, provider: "dalle-3", costEstimateUsd: cost };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[visuals/dalle3] error:", (err as Error)?.message ?? err);
    }
    return null;
  }
}

async function callFluxSchnell(prompt: string, aspect: ImageGenAspect): Promise<ImageGenResult | null> {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) return null;
  const { width, height } = aspectToFluxSize(aspect);
  try {
    const res = await fetchWithTimeout(
      "https://api.together.xyz/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "black-forest-labs/FLUX.1-schnell",
          prompt,
          n: 1,
          steps: 4,
          width,
          height,
          output_format: "png",
          response_format: "url",
        }),
      },
      45_000,
    );
    if (!res.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[visuals/flux] non-OK", res.status, await res.text().catch(() => ""));
      }
      return null;
    }
    const data = (await res.json()) as any;
    const url = data?.data?.[0]?.url ?? data?.output?.[0]?.url ?? data?.images?.[0]?.url;
    if (!url || typeof url !== "string") return null;
    return { url, provider: "flux-schnell", costEstimateUsd: 0.003 };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[visuals/flux] error:", (err as Error)?.message ?? err);
    }
    return null;
  }
}

// ── Public entry ─────────────────────────────────────────────────────────────
export async function generateImage(opts: {
  prompt: string;
  tier?: ImageGenTier;
  aspect?: ImageGenAspect;
}): Promise<ImageGenResult | null> {
  if (isImageGenKilled()) return null;
  const tier: ImageGenTier = opts.tier ?? "default";
  const aspect: ImageGenAspect = opts.aspect ?? "16:9";
  const prompt = (opts.prompt ?? "").trim();
  if (!prompt) return null;

  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasTogether = !!process.env.TOGETHER_API_KEY;

  // Decide provider order based on tier + available keys.
  const order: ImageGenProvider[] = [];
  if (tier === "premium") {
    if (hasOpenAI) order.push("dalle-3");
    if (hasTogether) order.push("flux-schnell");
  } else {
    if (hasTogether) order.push("flux-schnell");
    if (hasOpenAI) order.push("dalle-3");
  }
  if (order.length === 0) return null;

  for (const provider of order) {
    const key = cacheKey(prompt, provider, aspect);
    const cached = cacheGet(key);
    if (cached) return cached;
    const result =
      provider === "dalle-3"
        ? await callDalle3(prompt, aspect)
        : await callFluxSchnell(prompt, aspect);
    if (result) {
      cacheSet(key, result);
      return result;
    }
  }
  return null;
}
