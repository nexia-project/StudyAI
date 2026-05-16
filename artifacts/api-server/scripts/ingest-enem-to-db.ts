/**
 * scripts/ingest-enem-to-db.ts — carrega questões ENEM (JSON) no Postgres (`enem_questions`).
 *
 * Pré-requisitos:
 *   - DATABASE_URL
 *   - Tabela criada pelo boot (`ensureAllSchemas`) ou migração equivalente
 *
 * Fonte JSON:
 *   - `ENEM_INGEST_JSON` — caminho absoluto ou relativo ao cwd (prioridade)
 *   - senão primeiro argumento posicional
 *   - senão default: `src/lib/enem/seed-questions.json` (relativo ao pacote api-server)
 *
 * Uso (raiz monorepo StudyAI):
 *   pnpm --filter @workspace/api-server run ingest:enem-db
 *   pnpm --filter @workspace/api-server run ingest:enem-db -- ./exports/enem-questions.json
 *   ENEM_INGEST_JSON=./data/enem.json pnpm --filter @workspace/api-server run ingest:enem-db
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "@workspace/db";
import { enemQuestionsTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";

type EnemArea = "LC" | "MT" | "CN" | "CH" | "R";

interface EnemQuestao {
  id: string;
  ano: number;
  area: EnemArea;
  disciplina?: string;
  alternativas?: unknown[];
  [key: string]: unknown;
}

function defaultJsonPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../src/lib/enem/seed-questions.json");
}

function resolveInputPath(argv: string[]): string {
  const fromEnv = process.env.ENEM_INGEST_JSON?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
  }
  const pos = argv[2];
  if (pos && !pos.startsWith("-")) {
    return path.isAbsolute(pos) ? pos : path.resolve(process.cwd(), pos);
  }
  return defaultJsonPath();
}

function isMc(q: EnemQuestao): boolean {
  return q.area !== "R" && Array.isArray(q.alternativas) && q.alternativas.length >= 2;
}

async function main(): Promise<void> {
  const input = resolveInputPath(process.argv);
  const raw = await readFile(input, "utf8");
  const arr = JSON.parse(raw) as unknown;
  if (!Array.isArray(arr)) {
    console.error("[ingest-enem-to-db] JSON deve ser um array de questões.");
    process.exit(1);
    return;
  }
  const questoes = arr.filter((x) => x && typeof x === "object") as EnemQuestao[];
  const mc = questoes.filter((q) => q.id && isMc(q));
  if (mc.length === 0) {
    console.error("[ingest-enem-to-db] Nenhuma questão MC válida encontrada.");
    process.exit(1);
    return;
  }

  let ok = 0;
  for (const q of mc) {
    await db
      .insert(enemQuestionsTable)
      .values({
        id: q.id,
        ano: q.ano,
        area: q.area,
        disciplina: q.disciplina ?? null,
        questao: q as object,
      })
      .onConflictDoUpdate({
        target: enemQuestionsTable.id,
        set: {
          ano: sql`excluded.ano`,
          area: sql`excluded.area`,
          disciplina: sql`excluded.disciplina`,
          questao: sql`excluded.questao`,
        },
      });
    ok++;
    if (ok % 200 === 0) console.log(`  … ${ok} upserts`);
  }

  console.log(`[ingest-enem-to-db] OK — ${ok} questões MC upsertadas a partir de ${input}`);
}

void main().catch((err) => {
  console.error("[ingest-enem-to-db] erro:", err);
  process.exit(1);
});
