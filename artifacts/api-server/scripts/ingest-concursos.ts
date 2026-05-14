/**
 * scripts/ingest-concursos.ts — ingestão de questões de concursos públicos.
 *
 * Por que essa fonte?
 *   Datasets abertos no Hugging Face já compilaram milhares de questões reais
 *   de provas oficiais. Em vez de scrappear bancas (CEBRASPE/FGV/VUNESP) — o
 *   que tem implicações legais — usamos datasets curados com licença explícita
 *   e tudo já em PT-BR.
 *
 * Datasets usados (ambos verificados antes de ingerir):
 *   1. eduagarcia/oab_exams (HF) — 2210 questões oficiais da OAB (1ª fase),
 *      fonte pública (https://exame.oab.org.br/), benchmark amplamente citado
 *      (Edu Garcia, mantenedor do Open PT-LLM Leaderboard). Sem licença
 *      explícita no card, mas as provas da OAB são publicamente distribuídas
 *      pelo próprio órgão e o dataset cita-se academicamente há 2+ anos.
 *      → Tratamos como uso educacional permitido. Citamos dataset + URL como
 *        proveniência.
 *   2. Larxel/healthqa-br (HF) — 5632 questões de Revalida (INEP) + Enare
 *      (Ebserh) + Enare Multiprofissional. Licença explícita CC-BY-4.0.
 *      Curadoria do Andrew Maranhão Ventura D'addario, financiamento MS/CNPq.
 *      → Atribuição obrigatória (mantida no campo `fonte`).
 *
 * Como acessamos:
 *   Os dois datasets só publicam Parquet, e nossa regra esta noite proíbe
 *   instalar `parquetjs`. Solução: a HF datasets-server expõe os mesmos dados
 *   em JSON paginado pela URL pública
 *     https://datasets-server.huggingface.co/rows?dataset=...&offset=...&length=100
 *   Acessível sem auth, com até 100 linhas por página. Throttle gentil de
 *   ~3 req/s e backoff em 429.
 *
 * Saída:
 *   `src/lib/concursos/seed-concursos.json` (consumido por `lib/concursos/bank.ts`).
 *
 * Uso:
 *   pnpm --filter @workspace/api-server run ingest:concursos
 *   pnpm --filter @workspace/api-server run ingest:concursos -- --limit-per-source=500
 *   pnpm --filter @workspace/api-server run ingest:concursos -- --verbose
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── Tipos (replicados do `src/lib/concursos/types.ts` para deixar o script
// standalone, sem coupling com o runtime do api-server) ───────────────────────

type ConcursoBanca = "CEBRASPE" | "FGV" | "VUNESP" | "FCC" | "OAB" | "OUTRO";
type ConcursoArea =
  | "DIREITO"
  | "PORTUGUES"
  | "MATEMATICA"
  | "RACIOCINIO_LOGICO"
  | "INFORMATICA"
  | "ATUALIDADES"
  | "LEGISLACAO"
  | "OUTROS";

interface ConcursoAlternativa {
  letra: string;
  texto: string;
  correta: boolean;
}

interface ConcursoQuestao {
  id: string;
  banca?: ConcursoBanca;
  area?: ConcursoArea;
  ano?: number;
  cargo?: string;
  enunciado: string;
  alternativas: ConcursoAlternativa[];
  gabarito: string;
  explicacao?: string;
  fonte: string;
  fonteUrl?: string;
}

// ─── Config / CLI ────────────────────────────────────────────────────────────

const DS_API = "https://datasets-server.huggingface.co/rows";
const USER_AGENT = "StudyAI/1.0 (https://study.ia.br) ingest-concursos";
const MIN_INTERVAL_MS = 350;
const PAGE_SIZE = 100;
const RATE_LIMIT_BACKOFF_MS = 6_000;
const RATE_LIMIT_MAX_BACKOFF_MS = 60_000;
const MAX_RATE_LIMIT_RETRIES = 4;

interface CliArgs {
  limitPerSource: number;
  output: string;
  verbose: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Record<string, string | boolean> = {};
  for (const a of argv.slice(2)) {
    if (!a.startsWith("--")) continue;
    const eq = a.indexOf("=");
    if (eq === -1) {
      args[a.slice(2)] = true;
    } else {
      args[a.slice(2, eq)] = a.slice(eq + 1);
    }
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const defaultOutput = path.resolve(
    here,
    "..",
    "src",
    "lib",
    "concursos",
    "seed-concursos.json",
  );

  // 0 = sem limite (pega tudo). Default = 0.
  const limitRaw = typeof args["limit-per-source"] === "string" ? args["limit-per-source"] : "0";
  const limitPerSource = Math.max(0, parseInt(limitRaw, 10) || 0);
  const output = typeof args.output === "string" ? args.output : defaultOutput;
  const verbose = args.verbose === true;
  return { limitPerSource, output, verbose };
}

// ─── Fetch helpers ───────────────────────────────────────────────────────────

let lastRequestAt = 0;

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function throttledFetch(url: string): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (res.status !== 429 || attempt === MAX_RATE_LIMIT_RETRIES) return res;
    const retryAfter = Number(res.headers.get("retry-after"));
    const requested =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : RATE_LIMIT_BACKOFF_MS * (attempt + 1);
    const backoff = Math.min(requested, RATE_LIMIT_MAX_BACKOFF_MS);
    console.warn(
      `  [rate-limit] HTTP 429 — aguardando ${backoff}ms, retry ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES}`,
    );
    await sleep(backoff);
  }
  return new Response(null, { status: 599 });
}

interface DSRow {
  row_idx: number;
  row: Record<string, unknown>;
}

interface DSResponse {
  rows: DSRow[];
  num_rows_total: number;
}

interface FetchAllOpts {
  dataset: string;
  config: string;
  split: string;
  cap: number;
  verbose: boolean;
}

async function fetchAllRows(opts: FetchAllOpts): Promise<DSRow[]> {
  const all: DSRow[] = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const remaining = opts.cap > 0 ? opts.cap - all.length : Infinity;
    if (remaining <= 0) break;
    const length = Math.min(PAGE_SIZE, remaining);
    const url =
      `${DS_API}?dataset=${encodeURIComponent(opts.dataset)}` +
      `&config=${encodeURIComponent(opts.config)}` +
      `&split=${encodeURIComponent(opts.split)}` +
      `&offset=${offset}&length=${length}`;
    if (opts.verbose) console.log(`  → GET ${url}`);
    const res = await throttledFetch(url);
    if (!res.ok) {
      console.warn(`  HTTP ${res.status} em offset=${offset} — abortando ${opts.dataset}`);
      break;
    }
    let body: DSResponse;
    try {
      body = (await res.json()) as DSResponse;
    } catch (err) {
      console.warn(`  JSON inválido em offset=${offset}: ${(err as Error).message}`);
      break;
    }
    const rows = body.rows ?? [];
    if (rows.length === 0) break;
    for (const r of rows) all.push(r);
    total = Math.min(total, body.num_rows_total ?? Infinity);
    offset += rows.length;
    if (opts.verbose) console.log(`  ... ${all.length}/${total}`);
  }
  return all;
}

// ─── Mapping: eduagarcia/oab_exams ───────────────────────────────────────────

interface OabRow {
  id: string;
  question_number: number;
  exam_id: string;
  exam_year: string;
  question_type: string | null;
  nullified: boolean;
  question: string;
  choices: { text: string[]; label: string[] };
  answerKey: string;
}

const OAB_AREA_BY_TYPE: Record<string, ConcursoArea> = {
  // Tudo que é OAB cai em DIREITO; mantemos question_type só pra compor cargo.
};

function mapOab(row: OabRow): ConcursoQuestao | { skipped: true; reason: string } {
  if (row.nullified) return { skipped: true, reason: "anulada" };

  const labels = row.choices?.label ?? [];
  const texts = row.choices?.text ?? [];
  if (labels.length === 0 || labels.length !== texts.length) {
    return { skipped: true, reason: "alternativas-malformadas" };
  }
  const gabarito = (row.answerKey ?? "").trim().toUpperCase();
  if (!gabarito) return { skipped: true, reason: "sem-gabarito" };

  const alternativas: ConcursoAlternativa[] = labels.map((letra, i) => ({
    letra: String(letra).trim().toUpperCase(),
    texto: String(texts[i] ?? "").trim(),
    correta: String(letra).trim().toUpperCase() === gabarito,
  }));

  if (!alternativas.some((a) => a.correta)) {
    return { skipped: true, reason: "gabarito-nao-bate" };
  }

  const enunciado = (row.question ?? "").trim();
  if (!enunciado || enunciado.length < 20) {
    return { skipped: true, reason: "enunciado-vazio" };
  }

  const ano = parseInt(row.exam_year ?? "", 10);
  const tipo = row.question_type ? String(row.question_type).trim() : "";
  const cargo = tipo ? `Advogado (OAB) — ${tipo}` : "Advogado (OAB)";

  const area: ConcursoArea = OAB_AREA_BY_TYPE[tipo] ?? "DIREITO";

  return {
    id: `concurso-oab-${row.id}`,
    banca: "OAB",
    area,
    ano: Number.isFinite(ano) ? ano : undefined,
    cargo,
    enunciado,
    alternativas,
    gabarito,
    explicacao: `Gabarito oficial: ${gabarito}. Prova ${row.exam_id} (OAB 1ª fase).`,
    fonte: "huggingface:eduagarcia/oab_exams (OAB exams — uso educacional)",
    fonteUrl: "https://huggingface.co/datasets/eduagarcia/oab_exams",
  };
}

// ─── Mapping: Larxel/healthqa-br ─────────────────────────────────────────────

interface HealthRow {
  id: string;
  source: string;
  year: number;
  group: string | null;
  question: string;
  answer: string;
}

const HEALTH_BANCA_BY_SOURCE: Record<string, { banca: ConcursoBanca; cargoBase: string }> = {
  Revalida: { banca: "OUTRO", cargoBase: "Médico (Revalida — INEP)" },
  "Enare Residência Médica": { banca: "OUTRO", cargoBase: "Médico Residente (Enare — Ebserh)" },
  "Enare Multiprofissional": { banca: "OUTRO", cargoBase: "Profissional da Saúde (Enare Multi — Ebserh)" },
};

/**
 * Parser do campo `question` do HealthQA-BR.
 *
 * Formato observado:
 *   "...enunciado completo...\n\n'A': 'texto da A'\n'B': 'texto da B'\n..."
 *
 * Estratégia: encontrar o primeiro marcador `\n'X':` e usar tudo antes dele
 * como enunciado. As alternativas são extraídas via regex tolerante a
 * apóstrofos dentro do texto (lookahead pelo próximo `\n'X':` ou fim de string).
 */
function parseHealthQuestion(raw: string): {
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
} {
  const text = String(raw ?? "");
  // Primeira ocorrência do marcador de alternativa em uma linha nova.
  const firstAltMatch = text.match(/\n\s*'([A-E])'\s*:\s*'/);
  const firstStart = firstAltMatch?.index ?? -1;

  const enunciado = firstStart > 0 ? text.slice(0, firstStart).trim() : text.trim();

  const alternativas: { letra: string; texto: string }[] = [];
  if (firstStart >= 0) {
    const tail = text.slice(firstStart);
    // Pattern: \n'X': 'corpo' (corpo pode conter apóstrofos; usa lookahead)
    const altRegex = /\n\s*'([A-E])'\s*:\s*'([\s\S]*?)'(?=\s*(?:\n\s*'[A-E]'\s*:|$))/g;
    let m: RegExpExecArray | null;
    while ((m = altRegex.exec(tail)) !== null) {
      const letra = m[1]!.toUpperCase();
      const texto = (m[2] ?? "").trim();
      if (texto) alternativas.push({ letra, texto });
    }
  }

  return { enunciado, alternativas };
}

function mapHealth(row: HealthRow): ConcursoQuestao | { skipped: true; reason: string } {
  const gabarito = (row.answer ?? "").trim().toUpperCase();
  if (!gabarito) return { skipped: true, reason: "sem-gabarito" };

  const { enunciado, alternativas: parsed } = parseHealthQuestion(row.question);
  if (!enunciado || enunciado.length < 20) {
    return { skipped: true, reason: "enunciado-vazio" };
  }
  if (parsed.length < 2) {
    return { skipped: true, reason: `alternativas-${parsed.length}` };
  }

  const alternativas: ConcursoAlternativa[] = parsed.map((p) => ({
    letra: p.letra,
    texto: p.texto,
    correta: p.letra === gabarito,
  }));
  if (!alternativas.some((a) => a.correta)) {
    return { skipped: true, reason: "gabarito-nao-bate" };
  }

  const meta = HEALTH_BANCA_BY_SOURCE[row.source] ?? {
    banca: "OUTRO" as const,
    cargoBase: row.source || "Profissional da Saúde",
  };
  const cargo = row.group ? `${meta.cargoBase} — ${row.group}` : meta.cargoBase;

  return {
    id: `concurso-healthbr-${row.id}`,
    banca: meta.banca,
    area: "OUTROS",
    ano: typeof row.year === "number" && Number.isFinite(row.year) ? row.year : undefined,
    cargo,
    enunciado,
    alternativas,
    gabarito,
    explicacao: `Gabarito oficial: ${gabarito}. Fonte: ${row.source} ${row.year}${row.group ? ` — ${row.group}` : ""}.`,
    fonte: "huggingface:Larxel/healthqa-br (CC-BY-4.0, D'addario 2025)",
    fonteUrl: "https://huggingface.co/datasets/Larxel/healthqa-br",
  };
}

// ─── Per-source ingest ───────────────────────────────────────────────────────

interface SourceStats {
  dataset: string;
  fetched: number;
  kept: number;
  skipped: number;
  skippedReasons: Record<string, number>;
}

async function ingestOab(args: CliArgs): Promise<{ stats: SourceStats; questoes: ConcursoQuestao[] }> {
  const stats: SourceStats = {
    dataset: "eduagarcia/oab_exams",
    fetched: 0,
    kept: 0,
    skipped: 0,
    skippedReasons: {},
  };
  const rows = await fetchAllRows({
    dataset: "eduagarcia/oab_exams",
    config: "default",
    split: "train",
    cap: args.limitPerSource,
    verbose: args.verbose,
  });
  const questoes: ConcursoQuestao[] = [];
  for (const r of rows) {
    stats.fetched += 1;
    try {
      const mapped = mapOab(r.row as unknown as OabRow);
      if ("skipped" in mapped) {
        stats.skipped += 1;
        stats.skippedReasons[mapped.reason] = (stats.skippedReasons[mapped.reason] ?? 0) + 1;
      } else {
        questoes.push(mapped);
        stats.kept += 1;
      }
    } catch (err) {
      stats.skipped += 1;
      stats.skippedReasons["exception"] = (stats.skippedReasons["exception"] ?? 0) + 1;
      if (args.verbose) console.warn(`  [oab] erro mapeando: ${(err as Error).message}`);
    }
  }
  return { stats, questoes };
}

async function ingestHealth(args: CliArgs): Promise<{ stats: SourceStats; questoes: ConcursoQuestao[] }> {
  const stats: SourceStats = {
    dataset: "Larxel/healthqa-br",
    fetched: 0,
    kept: 0,
    skipped: 0,
    skippedReasons: {},
  };
  const rows = await fetchAllRows({
    dataset: "Larxel/healthqa-br",
    config: "default",
    split: "train",
    cap: args.limitPerSource,
    verbose: args.verbose,
  });
  const questoes: ConcursoQuestao[] = [];
  for (const r of rows) {
    stats.fetched += 1;
    try {
      const mapped = mapHealth(r.row as unknown as HealthRow);
      if ("skipped" in mapped) {
        stats.skipped += 1;
        stats.skippedReasons[mapped.reason] = (stats.skippedReasons[mapped.reason] ?? 0) + 1;
      } else {
        questoes.push(mapped);
        stats.kept += 1;
      }
    } catch (err) {
      stats.skipped += 1;
      stats.skippedReasons["exception"] = (stats.skippedReasons["exception"] ?? 0) + 1;
      if (args.verbose) console.warn(`  [health] erro mapeando: ${(err as Error).message}`);
    }
  }
  return { stats, questoes };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  console.log("[ingest-concursos] fontes: eduagarcia/oab_exams + Larxel/healthqa-br");
  console.log(`[ingest-concursos] limit-per-source: ${args.limitPerSource || "(sem limite)"}`);
  console.log(`[ingest-concursos] saída: ${args.output}`);
  console.log("");

  await mkdir(path.dirname(args.output), { recursive: true });

  const all: ConcursoQuestao[] = [];
  const allStats: SourceStats[] = [];

  console.log("[ingest-concursos] === eduagarcia/oab_exams ===");
  const oab = await ingestOab(args);
  all.push(...oab.questoes);
  allStats.push(oab.stats);
  console.log(
    `  fetched=${oab.stats.fetched} kept=${oab.stats.kept} skipped=${oab.stats.skipped}`,
  );
  if (oab.stats.skipped > 0) {
    console.log(
      `    skipped breakdown: ${Object.entries(oab.stats.skippedReasons).map(([k, v]) => `${k}=${v}`).join(", ")}`,
    );
  }
  // Flush parcial
  if (all.length > 0) {
    await writeFile(args.output, JSON.stringify(all, null, 2), "utf8");
  }

  console.log("");
  console.log("[ingest-concursos] === Larxel/healthqa-br ===");
  const hq = await ingestHealth(args);
  all.push(...hq.questoes);
  allStats.push(hq.stats);
  console.log(
    `  fetched=${hq.stats.fetched} kept=${hq.stats.kept} skipped=${hq.stats.skipped}`,
  );
  if (hq.stats.skipped > 0) {
    console.log(
      `    skipped breakdown: ${Object.entries(hq.stats.skippedReasons).map(([k, v]) => `${k}=${v}`).join(", ")}`,
    );
  }

  if (all.length === 0) {
    console.error("\n[ingest-concursos] NENHUMA questão importada — abortando.");
    process.exitCode = 1;
    return;
  }

  await writeFile(args.output, JSON.stringify(all, null, 2), "utf8");

  // ── Summary ─────────────────────────────────────────────────────────────────
  const porBanca: Record<string, number> = {};
  const porArea: Record<string, number> = {};
  const anosSet = new Set<number>();
  for (const q of all) {
    const b = q.banca ?? "OUTRO";
    porBanca[b] = (porBanca[b] ?? 0) + 1;
    const a = q.area ?? "OUTROS";
    porArea[a] = (porArea[a] ?? 0) + 1;
    if (typeof q.ano === "number") anosSet.add(q.ano);
  }

  console.log("\n[ingest-concursos] ── summary ─────────────────────────────");
  console.log(`  arquivo:        ${args.output}`);
  console.log(`  total kept:     ${all.length}`);
  console.log(
    `  por banca:      ${Object.entries(porBanca).map(([k, v]) => `${k}=${v}`).join(" ")}`,
  );
  console.log(
    `  por área:       ${Object.entries(porArea).map(([k, v]) => `${k}=${v}`).join(" ")}`,
  );
  console.log(`  anos:           ${[...anosSet].sort((a, b) => a - b).join(", ")}`);
  console.log("  por fonte:");
  for (const s of allStats) {
    console.log(`    ${s.dataset}: kept=${s.kept} skipped=${s.skipped}`);
  }

  console.log("\n[ingest-concursos] sample (primeiras 2):");
  for (const q of all.slice(0, 2)) {
    console.log(JSON.stringify(q, null, 2));
  }
}

void main().catch((err) => {
  console.error("[ingest-concursos] erro fatal:", err);
  process.exit(1);
});
