import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@workspace/db";
import { enemQuestionsTable } from "@workspace/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { EnemArea, EnemLetra, EnemQuestao } from "./types";
import bundledSeed from "./seed-questions.json";

/** `json` (padrão): lê arquivo JSON embutido ou `ENEM_BANK_JSON_PATH`. `db`: Postgres (`enem_questions`). */
export function getEnemBankSource(): "json" | "db" {
  const v = (process.env.ENEM_BANK_SOURCE ?? "json").toLowerCase().trim();
  return v === "db" ? "db" : "json";
}

function resolveJsonPathFromEnv(): string {
  const fromEnv = process.env.ENEM_BANK_JSON_PATH?.trim();
  if (!fromEnv) throw new Error("ENEM_BANK_JSON_PATH não definido");
  return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
}

let jsonCache: EnemQuestao[] | null = null;

async function loadQuestionsFromJson(): Promise<EnemQuestao[]> {
  if (jsonCache) return jsonCache;
  const fromEnv = process.env.ENEM_BANK_JSON_PATH?.trim();
  if (!fromEnv) {
    jsonCache = (bundledSeed as unknown as EnemQuestao[]) ?? [];
    return jsonCache;
  }
  const p = resolveJsonPathFromEnv();
  const raw = await readFile(p, "utf8");
  const arr = JSON.parse(raw) as unknown;
  if (!Array.isArray(arr)) {
    jsonCache = [];
    return jsonCache;
  }
  jsonCache = arr.filter((x) => x && typeof x === "object") as EnemQuestao[];
  return jsonCache;
}

async function countDbQuestions(): Promise<number> {
  const r = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(enemQuestionsTable);
  return Number(r[0]?.c ?? 0);
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

/** Mapeia dia do simulado ENEM (1–4) para área oficial. */
export function enemDiaToArea(dia: number): EnemArea | null {
  if (dia === 1) return "LC";
  if (dia === 2) return "CH";
  if (dia === 3) return "CN";
  if (dia === 4) return "MT";
  return null;
}

function isMcQuestion(q: EnemQuestao): boolean {
  return q.area !== "R" && Array.isArray(q.alternativas) && q.alternativas.length >= 2;
}

/**
 * Carrega questões MC do banco configurado (JSON ou Postgres).
 */
export async function loadMcQuestionsForArea(
  area: EnemArea,
  anos?: number[],
): Promise<EnemQuestao[]> {
  const source = getEnemBankSource();

  if (source === "db") {
    const n = await countDbQuestions();
    if (n < 1) return [];
    const conds = [eq(enemQuestionsTable.area, area)];
    if (anos && anos.length > 0) {
      conds.push(inArray(enemQuestionsTable.ano, anos));
    }
    const rows = await db
      .select({ questao: enemQuestionsTable.questao })
      .from(enemQuestionsTable)
      .where(and(...conds));
    return rows
      .map((r) => r.questao as EnemQuestao)
      .filter((q) => q && isMcQuestion(q));
  }

  const all = await loadQuestionsFromJson();
  return all.filter(
    (q) =>
      q.area === area &&
      isMcQuestion(q) &&
      (!anos?.length || anos.includes(q.ano)),
  );
}

/**
 * Amostra aleatória de até `count` questões MC para o simulado.
 */
export async function pickRandomMcQuestions(args: {
  area: EnemArea;
  count: number;
  anos?: number[];
}): Promise<EnemQuestao[]> {
  const pool = await loadMcQuestionsForArea(args.area, args.anos);
  if (pool.length === 0) return [];
  shuffleInPlace(pool);
  const n = Math.min(args.count, pool.length);
  return pool.slice(0, n);
}

/** Formato esperado pelo app (legado do gerador LLM). */
export interface SimuladoEnemQuestaoApi {
  numero: number;
  materia: string;
  enunciado: string;
  pergunta: string;
  alternativas: Record<EnemLetra, string>;
  gabarito: EnemLetra;
  explicacao: string;
  dificuldade: "facil" | "medio" | "dificil";
  idOficial?: string;
  ano?: number;
}

function toAlternativasRecord(q: EnemQuestao): Record<EnemLetra, string> {
  const out = {} as Record<EnemLetra, string>;
  for (const a of q.alternativas) {
    out[a.letra] = a.texto;
  }
  const letters: EnemLetra[] = ["A", "B", "C", "D", "E"];
  for (const L of letters) {
    if (!out[L]) out[L] = "";
  }
  return out;
}

export function enemQuestaoToSimuladoApi(q: EnemQuestao, numero: number): SimuladoEnemQuestaoApi {
  const gab = (q.gabarito ?? "A") as EnemLetra;
  return {
    numero,
    materia: q.disciplina || q.area,
    enunciado: q.enunciado || "",
    pergunta: q.comando || "",
    alternativas: toAlternativasRecord(q),
    gabarito: gab,
    explicacao: q.resolucao || "",
    dificuldade: "medio",
    idOficial: q.id,
    ano: q.ano,
  };
}

// ─── API síncrona `/api/enem/*` (PR-3) — usa apenas o JSON embutido `seed-questions.json` ───

function questoesParaApiEnem(): EnemQuestao[] {
  return (bundledSeed as unknown as EnemQuestao[]) ?? [];
}

export function getEnemSeedStats(): {
  total: number;
  porArea: Record<EnemArea, number>;
  anos: number[];
} {
  const all = questoesParaApiEnem();
  const porArea: Record<EnemArea, number> = { LC: 0, MT: 0, CN: 0, CH: 0, R: 0 };
  const anosSet = new Set<number>();
  for (const q of all) {
    if (q.area in porArea) porArea[q.area]++;
    anosSet.add(q.ano);
  }
  return { total: all.length, porArea, anos: [...anosSet].sort((a, b) => b - a) };
}

export function getQuestao(id: string): EnemQuestao | undefined {
  return questoesParaApiEnem().find((q) => q.id === id);
}

export interface SearchEnemArgs {
  query?: string;
  area?: EnemArea;
  ano?: number;
  limit?: number;
}

export function searchEnem(args: SearchEnemArgs): EnemQuestao[] {
  const limit = Math.min(50, Math.max(1, args.limit ?? 20));
  const q = (args.query ?? "").toLowerCase().trim();
  let list = questoesParaApiEnem().filter((x) => {
    if (args.area && x.area !== args.area) return false;
    if (args.ano != null && x.ano !== args.ano) return false;
    return true;
  });
  if (q) {
    list = list.filter((x) => {
      const blob = `${x.enunciado} ${x.comando} ${x.disciplina} ${x.tema}`.toLowerCase();
      return blob.includes(q);
    });
  }
  return list.slice(0, limit);
}

export function getRandomQuestao(filters: { area?: EnemArea; ano?: number }): EnemQuestao | null {
  const pool = questoesParaApiEnem().filter((x) => {
    if (filters.area && x.area !== filters.area) return false;
    if (filters.ano != null && x.ano !== filters.ano) return false;
    return true;
  });
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
