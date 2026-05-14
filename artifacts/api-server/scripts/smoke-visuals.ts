/**
 * scripts/smoke-visuals.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Manual smoke test for the curated bank lookup (Wikimedia Commons).
 *
 * Usage:
 *   pnpm tsx scripts/smoke-visuals.ts
 *   pnpm tsx scripts/smoke-visuals.ts "função quadrática" matemática
 *
 * Prints the first hit URL (or a clear "no hits" message). Network access is
 * required. Useful to verify Wikimedia connectivity / license filtering.
 */

import { lookupCuratedImage } from "../src/lib/visuals/curated-bank";

async function main(): Promise<void> {
  const [, , rawTopic, rawSubject] = process.argv;
  const topic = (rawTopic ?? "mitose").trim();
  const subject = (rawSubject ?? "biologia").trim();
  console.log(`[smoke-visuals] lookupCuratedImage(topic="${topic}", subject="${subject}")`);
  const hits = await lookupCuratedImage({ topic, subject, limit: 3 });
  if (!hits.length) {
    console.log("→ no hits (network down? license filter too strict? CC-only?)");
    process.exit(0);
  }
  console.log(`→ ${hits.length} hit(s)`);
  for (const h of hits) {
    console.log(JSON.stringify({
      url: h.url,
      title: h.title,
      licenseShort: h.licenseShort,
      author: h.author?.slice(0, 80),
    }, null, 2));
  }
}

main().catch((err) => {
  console.error("[smoke-visuals] failed:", err);
  process.exit(1);
});
