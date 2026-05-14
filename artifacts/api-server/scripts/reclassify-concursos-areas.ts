/**
 * scripts/reclassify-concursos-areas.ts
 *
 * Roda o classificador de áreas (`src/lib/concursos/area-classifier.ts`)
 * sobre o `seed-concursos.json` existente, sem rebuscar nada no Hugging
 * Face. Caso de uso: expandimos o enum `ConcursoArea` com especialidades
 * de saúde (Medicina, Enfermagem, Farmácia, etc.) e precisamos
 * reclassificar as 5.6k questões do healthqa-br que estavam todas em
 * `OUTROS`.
 *
 * Idempotente — pode rodar quantas vezes quiser, sempre converge no
 * mesmo estado. Mantém a indentação original (2 espaços, sem newline
 * final, formato `JSON.stringify(arr, null, 2)`).
 *
 * Uso:
 *   pnpm --filter @workspace/api-server exec tsx scripts/reclassify-concursos-areas.ts
 *   pnpm --filter @workspace/api-server run reclassify:concursos
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { classifyConcursoArea } from "../src/lib/concursos/area-classifier";
import {
  CONCURSO_AREA_LABEL,
  CONCURSO_AREAS,
  type ConcursoArea,
  type ConcursoQuestao,
} from "../src/lib/concursos/types";

const here = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.resolve(
  here,
  "..",
  "src",
  "lib",
  "concursos",
  "seed-concursos.json",
);

interface ReclassifyDelta {
  total: number;
  changed: number;
  unchanged: number;
  /** Matriz from→to (apenas pares com count > 0). */
  transitions: Record<string, number>;
}

function fmtArea(a: string): string {
  return `${a} (${CONCURSO_AREA_LABEL[a as ConcursoArea] ?? "?"})`;
}

async function main(): Promise<void> {
  console.log(`[reclassify] lendo ${SEED_PATH}`);
  const raw = await readFile(SEED_PATH, "utf8");
  const questoes = JSON.parse(raw) as ConcursoQuestao[];

  if (!Array.isArray(questoes)) {
    throw new Error("seed-concursos.json não é um array");
  }
  console.log(`[reclassify] total de questões: ${questoes.length}`);

  const delta: ReclassifyDelta = {
    total: questoes.length,
    changed: 0,
    unchanged: 0,
    transitions: {},
  };

  for (const q of questoes) {
    const before = (q.area ?? "OUTROS") as ConcursoArea;
    const after = classifyConcursoArea({
      area: q.area,
      cargo: q.cargo,
      fonte: q.fonte,
    });
    if (before !== after) {
      delta.changed += 1;
      const key = `${before} → ${after}`;
      delta.transitions[key] = (delta.transitions[key] ?? 0) + 1;
      q.area = after;
    } else {
      delta.unchanged += 1;
    }
  }

  // Breakdown final por área.
  const breakdown: Record<string, number> = {};
  for (const q of questoes) {
    const a = (q.area ?? "OUTROS") as string;
    breakdown[a] = (breakdown[a] ?? 0) + 1;
  }

  // Match `JSON.stringify(arr, null, 2)` SEM trailing newline — bate
  // byte-a-byte com o formato gerado pelo ingest-concursos.ts.
  const out = JSON.stringify(questoes, null, 2);
  await writeFile(SEED_PATH, out, "utf8");

  console.log("");
  console.log("[reclassify] ── transições ──────────────────────────────");
  if (delta.changed === 0) {
    console.log("  (nenhuma — banco já está classificado)");
  } else {
    const sorted = Object.entries(delta.transitions).sort((a, b) => b[1] - a[1]);
    for (const [from, count] of sorted) {
      console.log(`  ${count.toString().padStart(5)}  ${from}`);
    }
  }
  console.log(`  changed=${delta.changed}, unchanged=${delta.unchanged}`);

  console.log("");
  console.log("[reclassify] ── breakdown final por área ────────────────");
  // Ordena: primeiro pela ordem canônica do enum, depois áreas extras.
  const ordered: string[] = [];
  for (const a of CONCURSO_AREAS) {
    if (breakdown[a] !== undefined) ordered.push(a);
  }
  for (const a of Object.keys(breakdown)) {
    if (!ordered.includes(a)) ordered.push(a);
  }
  for (const a of ordered) {
    console.log(`  ${(breakdown[a] ?? 0).toString().padStart(5)}  ${fmtArea(a)}`);
  }
  console.log(`  total=${delta.total}`);
  console.log("");
  console.log(`[reclassify] arquivo atualizado: ${SEED_PATH}`);
}

void main().catch((err) => {
  console.error("[reclassify] erro fatal:", err);
  process.exit(1);
});
