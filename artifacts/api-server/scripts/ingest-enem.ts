/**
 * scripts/ingest-enem.ts — ingestão de questões oficiais do ENEM via api.enem.dev.
 *
 * Por que essa API?
 *   `api.enem.dev` é um espelho público (gratuito, sem auth) dos microdados
 *   oficiais do INEP, mantido pela comunidade — github.com/yunger7/enem-api.
 *   Pegamos as questões com texto, alternativas e gabarito em JSON limpo, em
 *   vez de baixar 5 GB de CSVs do INEP e parsear PDFs.
 *
 * O que esse script faz:
 *   1. Para cada ano em `--years`, paginar `GET /v1/exams/{year}/questions`
 *      (a resposta da listagem já traz alternatives + correctAlternative +
 *      context, então NÃO é necessário um segundo round-trip por questão).
 *   2. Filtrar fora as questões com figuras (`files.length > 0`) — a UI atual
 *      ainda não renderiza imagens dentro do chat do Tiagão; TODO renderizar.
 *   3. Mapear para o shape canônico `EnemQuestao` (lib/enem/types.ts).
 *   4. Throttle gentil de ~5 req/s (200 ms entre requisições, sem deps novas).
 *   5. Tolerância a erro: log + continue. Nenhum 4xx/5xx aborta o job.
 *   6. Gravar resultado em `seed-questions.json` (formatado, indentado),
 *      adjacente a `seed.ts` em `src/lib/enem/`.
 *
 * Uso:
 *   pnpm --filter @workspace/api-server run ingest:enem
 *   pnpm --filter @workspace/api-server run ingest:enem -- --years=2022,2023 --limit-per-year=50
 *   pnpm --filter @workspace/api-server run ingest:enem -- --verbose
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── Tipos ───────────────────────────────────────────────────────────────────

/**
 * Shape canônico do projeto. Replicado aqui (em vez de importar de
 * `src/lib/enem/types.ts`) para evitar coupling do script ao runtime do
 * api-server e manter o ingest executável standalone.
 */
type EnemArea = "LC" | "MT" | "CN" | "CH" | "R";
type EnemLetra = "A" | "B" | "C" | "D" | "E";

interface EnemAlternativa {
  letra: EnemLetra;
  texto: string;
  correta: boolean;
}

interface EnemQuestao {
  id: string;
  ano: number;
  numero: number;
  area: EnemArea;
  disciplina: string;
  tema: string;
  enunciado: string;
  comando: string;
  alternativas: EnemAlternativa[];
  gabarito: EnemLetra | null;
  resolucao: string;
  bnccCodigos?: string[];
  flag?: "__SEED_PLACEHOLDER__" | "__REAL__" | "__OFFICIAL__";
  fonteUrl?: string;
}

/** Shape devolvido por api.enem.dev. */
interface RemoteAlternativa {
  letter: string;
  text: string | null;
  file: string | null;
  isCorrect: boolean;
}

interface RemoteQuestao {
  title: string;
  index: number;
  discipline?: string | null;
  language?: string | null;
  year: number;
  context?: string | null;
  files?: string[];
  correctAlternative?: string | null;
  alternativesIntroduction?: string | null;
  alternatives?: RemoteAlternativa[];
}

interface RemoteListingResponse {
  metadata: { limit: number; offset: number; total: number; hasMore: boolean };
  questions: RemoteQuestao[];
}

// ─── Config / CLI ────────────────────────────────────────────────────────────

const API_BASE = "https://api.enem.dev";
const USER_AGENT = "StudyAI/1.0 (https://study.ia.br)";
const MIN_INTERVAL_MS = 250; // 4 req/s — folga sob o limite de 5 req/s pedido pelo plano
const PAGE_SIZE = 50;
const RATE_LIMIT_BACKOFF_MS = 8_000;
/** Cap no retry-after: o api.enem.dev às vezes devolve >5000s, o que trava o job. */
const RATE_LIMIT_MAX_BACKOFF_MS = 60_000;
const MAX_RATE_LIMIT_RETRIES = 3;
/** Cooldown entre anos: ajuda a evitar 429 acumulado entre lotes. */
const PER_YEAR_COOLDOWN_MS = 4_000;

interface CliArgs {
  years: number[];
  limitPerYear: number;
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
  const defaultOutput = path.resolve(here, "..", "src", "lib", "enem", "seed-questions.json");

  const yearsRaw = typeof args.years === "string" ? args.years : "2019,2020,2021,2022,2023";
  const years = yearsRaw
    .split(",")
    .map((y) => parseInt(y.trim(), 10))
    .filter((y) => Number.isFinite(y) && y >= 2009 && y <= 2099);

  // Default 200 (não 100) para garantir cobertura das 4 áreas: ENEM tem 180
  // questões/ano (LC 1-45, CH 46-90, CN 91-135, MT 136-180). Com limite 100 a
  // gente nunca chega em MT.
  const limitPerYearRaw = typeof args["limit-per-year"] === "string" ? args["limit-per-year"] : "200";
  const limitPerYear = Math.max(1, parseInt(limitPerYearRaw, 10) || 200);

  const output = typeof args.output === "string" ? args.output : defaultOutput;
  const verbose = args.verbose === true;

  return { years, limitPerYear, output, verbose };
}

// ─── Throttle simples ────────────────────────────────────────────────────────

let lastRequestAt = 0;

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Faz um GET respeitando o intervalo mínimo entre requisições. Em caso de 429,
 * obedece `Retry-After` (se presente) ou faz backoff fixo, até MAX_RATE_LIMIT_RETRIES.
 */
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
      `  [rate-limit] HTTP 429 — aguardando ${backoff}ms (server pediu ${requested}ms; cap=${RATE_LIMIT_MAX_BACKOFF_MS}ms), retry ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES}`,
    );
    await sleep(backoff);
  }
  // unreachable, mas TS quer um return
  return new Response(null, { status: 599 });
}

// ─── Mapping ─────────────────────────────────────────────────────────────────

function disciplineToArea(discipline: string | null | undefined): EnemArea | null {
  switch (discipline) {
    case "linguagens":
      return "LC";
    case "matematica":
      return "MT";
    case "ciencias-natureza":
      return "CN";
    case "ciencias-humanas":
      return "CH";
    default:
      return null;
  }
}

/** Heurística de fallback: ENEM regular usa as faixas [1..45]=LC, [46..90]=CH, [91..135]=CN, [136..180]=MT. */
function indexToArea(index: number): EnemArea | null {
  if (index >= 1 && index <= 45) return "LC";
  if (index >= 46 && index <= 90) return "CH";
  if (index >= 91 && index <= 135) return "CN";
  if (index >= 136 && index <= 180) return "MT";
  return null;
}

function areaToDisciplina(area: EnemArea): string {
  switch (area) {
    case "LC":
      return "Linguagens, Códigos e suas Tecnologias";
    case "MT":
      return "Matemática e suas Tecnologias";
    case "CN":
      return "Ciências da Natureza e suas Tecnologias";
    case "CH":
      return "Ciências Humanas e suas Tecnologias";
    case "R":
      return "Redação";
  }
}

function pickLetra(letter: string): EnemLetra | null {
  const up = (letter ?? "").toUpperCase();
  if (up === "A" || up === "B" || up === "C" || up === "D" || up === "E") return up;
  return null;
}

/**
 * Extrai a última frase/linha de `text` como heurística de "comando" (pergunta
 * direta ao candidato). Útil quando a API empacotou o estímulo inteiro dentro
 * de `alternativesIntroduction` e o `context` veio nulo.
 */
function extractLastSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  // Tenta separar por linhas primeiro (mais robusto para estímulos com poemas/tabelas).
  const lines = trimmed.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) return lines[lines.length - 1]!;
  // Fallback: separar por sentenças.
  const sentences = trimmed.split(/(?<=[.!?:])\s+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length >= 2) return sentences[sentences.length - 1]!;
  return trimmed.slice(-300);
}

interface EnunciadoComando {
  enunciado: string;
  comando: string;
}

/**
 * Decide enunciado (texto-base + estímulo) e comando (pergunta direta) a partir
 * dos campos `context` e `alternativesIntroduction` devolvidos pela API.
 *
 * Casos:
 *   - context não vazio → enunciado = context (+ intro se distinta), comando = intro
 *   - context vazio + intro longa (>200 chars) → estímulo embutido na intro;
 *     enunciado = intro inteira, comando = última frase da intro
 *   - context vazio + intro curta → enunciado = comando = intro
 */
function buildEnunciadoComando(rq: RemoteQuestao): EnunciadoComando {
  const ctx = (rq.context ?? "").trim();
  const intro = (rq.alternativesIntroduction ?? "").trim();

  if (ctx) {
    const enunciado = !intro || ctx.endsWith(intro) ? ctx : `${ctx}\n\n${intro}`;
    const comando = intro || extractLastSentence(ctx);
    return { enunciado, comando };
  }

  if (intro.length > 200) {
    return { enunciado: intro, comando: extractLastSentence(intro) };
  }

  return { enunciado: intro, comando: intro };
}

function mapQuestion(rq: RemoteQuestao, year: number): EnemQuestao | { skipped: true; reason: string } {
  if (rq.files && rq.files.length > 0) {
    return { skipped: true, reason: "figura" };
  }

  const area = disciplineToArea(rq.discipline) ?? indexToArea(rq.index);
  if (!area) {
    return { skipped: true, reason: "area-desconhecida" };
  }

  const alternativas: EnemAlternativa[] = [];
  for (const alt of rq.alternatives ?? []) {
    if (alt.file) {
      // alternativa contém imagem — questão fica inutilizável no chat
      return { skipped: true, reason: "alt-com-figura" };
    }
    const letra = pickLetra(alt.letter);
    if (!letra) continue;
    alternativas.push({
      letra,
      texto: (alt.text ?? "").trim(),
      correta: Boolean(alt.isCorrect),
    });
  }

  if (alternativas.length !== 5) {
    return { skipped: true, reason: `apenas-${alternativas.length}-alternativas` };
  }

  const gabarito = pickLetra(rq.correctAlternative ?? "");
  if (!gabarito) {
    return { skipped: true, reason: "sem-gabarito" };
  }

  const { enunciado, comando } = buildEnunciadoComando(rq);
  if (!enunciado || enunciado.length < 20) {
    return { skipped: true, reason: "enunciado-vazio" };
  }

  const id = `enem-${year}-${rq.index}`;
  const tema = `${areaToDisciplina(area)} — questão ${rq.index}`;

  return {
    id,
    ano: year,
    numero: rq.index,
    area,
    disciplina: areaToDisciplina(area),
    tema,
    enunciado,
    comando,
    alternativas,
    gabarito,
    resolucao: `Gabarito oficial: ${gabarito}. Fonte: api.enem.dev (espelho dos microdados INEP).`,
    flag: "__OFFICIAL__",
    fonteUrl: `https://enem.dev/${year}/questions/${rq.index}`,
  };
}

// ─── Per-year fetch ──────────────────────────────────────────────────────────

interface YearStats {
  ano: number;
  fetched: number;
  kept: number;
  skipped: number;
  skippedReasons: Record<string, number>;
  errors: number;
}

async function ingestYear(year: number, limit: number, verbose: boolean): Promise<{
  stats: YearStats;
  questoes: EnemQuestao[];
}> {
  const stats: YearStats = {
    ano: year,
    fetched: 0,
    kept: 0,
    skipped: 0,
    skippedReasons: {},
    errors: 0,
  };
  const questoes: EnemQuestao[] = [];

  let offset = 0;
  let hasMore = true;
  let cap = limit;

  while (hasMore && stats.fetched < cap) {
    const pageLimit = Math.min(PAGE_SIZE, cap - stats.fetched);
    const url = `${API_BASE}/v1/exams/${year}/questions?limit=${pageLimit}&offset=${offset}`;
    if (verbose) console.log(`  → GET ${url}`);

    let res: Response;
    try {
      res = await throttledFetch(url);
    } catch (err) {
      stats.errors += 1;
      console.warn(`  [${year}] erro de rede em offset=${offset}: ${(err as Error).message}`);
      break;
    }

    if (!res.ok) {
      stats.errors += 1;
      console.warn(`  [${year}] HTTP ${res.status} em offset=${offset} — abortando ano`);
      break;
    }

    let body: RemoteListingResponse;
    try {
      body = (await res.json()) as RemoteListingResponse;
    } catch (err) {
      stats.errors += 1;
      console.warn(`  [${year}] JSON inválido em offset=${offset}: ${(err as Error).message}`);
      break;
    }

    const list = body.questions ?? [];
    if (list.length === 0) break;

    for (const rq of list) {
      stats.fetched += 1;
      try {
        const mapped = mapQuestion(rq, year);
        if ("skipped" in mapped) {
          stats.skipped += 1;
          stats.skippedReasons[mapped.reason] = (stats.skippedReasons[mapped.reason] ?? 0) + 1;
        } else {
          questoes.push(mapped);
          stats.kept += 1;
        }
      } catch (err) {
        stats.errors += 1;
        if (verbose) {
          console.warn(`  [${year}] erro mapeando q=${rq.index}: ${(err as Error).message}`);
        }
      }
    }

    hasMore = Boolean(body.metadata?.hasMore);
    offset += list.length;
    if (cap > body.metadata.total) cap = body.metadata.total;
  }

  return { stats, questoes };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  console.log("[ingest-enem] fonte: api.enem.dev (espelho INEP)");
  console.log(`[ingest-enem] anos: ${args.years.join(", ")}`);
  console.log(`[ingest-enem] limite/ano: ${args.limitPerYear}`);
  console.log(`[ingest-enem] saída: ${args.output}`);
  console.log("");

  const allQuestoes: EnemQuestao[] = [];
  const allStats: YearStats[] = [];

  // Garante que o diretório de saída existe ANTES do loop para podermos fazer
  // flushes parciais (em caso de 429 que mate algum ano, não perdemos os anos
  // anteriores).
  await mkdir(path.dirname(args.output), { recursive: true });

  for (let i = 0; i < args.years.length; i += 1) {
    const year = args.years[i]!;
    console.log(`[ingest-enem] === ${year} ===`);
    const { stats, questoes } = await ingestYear(year, args.limitPerYear, args.verbose);
    allQuestoes.push(...questoes);
    allStats.push(stats);
    console.log(
      `  ${year}: fetched=${stats.fetched} kept=${stats.kept} skipped=${stats.skipped} errors=${stats.errors}`,
    );
    if (stats.skipped > 0) {
      const reasons = Object.entries(stats.skippedReasons)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      console.log(`    skipped breakdown: ${reasons}`);
    }
    // Flush parcial após cada ano — protege contra crashes/429 nos próximos anos.
    if (allQuestoes.length > 0) {
      await writeFile(args.output, JSON.stringify(allQuestoes, null, 2), "utf8");
      if (args.verbose) console.log(`  → flushed parcial: ${allQuestoes.length} questões`);
    }
    // Cooldown antes do próximo ano para deixar o rate-limit "respirar".
    if (i < args.years.length - 1) {
      await sleep(PER_YEAR_COOLDOWN_MS);
    }
  }

  if (allQuestoes.length === 0) {
    console.error("\n[ingest-enem] NENHUMA questão importada — abortando sem escrever arquivo.");
    process.exitCode = 1;
    return;
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalFetched = allStats.reduce((s, x) => s + x.fetched, 0);
  const totalKept = allStats.reduce((s, x) => s + x.kept, 0);
  const totalSkipped = allStats.reduce((s, x) => s + x.skipped, 0);
  const totalErrors = allStats.reduce((s, x) => s + x.errors, 0);

  const porArea: Record<EnemArea, number> = { LC: 0, MT: 0, CN: 0, CH: 0, R: 0 };
  for (const q of allQuestoes) porArea[q.area] += 1;

  console.log("\n[ingest-enem] ── summary ─────────────────────────────");
  console.log(`  arquivo:        ${args.output}`);
  console.log(`  total fetched:  ${totalFetched}`);
  console.log(`  total kept:     ${totalKept}`);
  console.log(`  total skipped:  ${totalSkipped}`);
  console.log(`  total errors:   ${totalErrors}`);
  console.log(`  por área:       LC=${porArea.LC} MT=${porArea.MT} CN=${porArea.CN} CH=${porArea.CH}`);
  console.log("  por ano:");
  for (const s of allStats) {
    console.log(`    ${s.ano}: kept=${s.kept} skipped=${s.skipped} errors=${s.errors}`);
  }

  console.log("\n[ingest-enem] sample (primeiras 2 questões):");
  for (const q of allQuestoes.slice(0, 2)) {
    console.log(JSON.stringify(q, null, 2));
  }
}

void main().catch((err) => {
  console.error("[ingest-enem] erro fatal:", err);
  process.exit(1);
});
