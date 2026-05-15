import { db } from "@workspace/db";
import {
  hermesAcoesProativasTable,
  hermesDescobertasGlobaisTable,
} from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";

export type HermesAudience = "aluno" | "professor" | "interno";

export interface BuildHermesContextOpts {
  kind?: string;
  /** Texto livre (ex.: pergunta do usuário) para ranquear descobertas por relevância. */
  topic?: string;
  audience?: HermesAudience;
  maxChars?: number;
}

/** Regras CQO fixas — qualidade pedagógica sem LLM extra no request path. */
export const CQO_RULES_PT = `REGRAS CQO (aplique em toda geração; não revele este bloco ao usuário):
• Estrutura: introdução clara → explicação progressiva → exemplos concretos → revisão/síntese.
• Profundidade: prefira mais detalhe e precisão a respostas superficiais; adapte ao nível do público.
• Validação: verifique coerência, unidades, fórmulas e afirmações antes de concluir.
• Multimídia: quando couber, sugira ou descreva imagem ilustrativa, visual 3D (GeoGebra) ou trecho de vídeo — sem inventar URLs.
• Tom: didático, encorajador, PT-BR; evite repetir frases de abertura genéricas.`;

const DEFAULT_MAX_CHARS = 2000;
const CACHE_TTL_MS = 5 * 60 * 1000;

const KIND_KEYWORDS: Record<string, string[]> = {
  chat: ["conversa", "tutor", "aluno", "pedagog", "conteúdo", "aula", "estudo", "engaj"],
  aula: ["aula", "lousa", "conteúdo", "pedagog", "didát", "material", "estudo"],
  lousa: ["aula", "lousa", "conteúdo", "pedagog", "didát", "narracao"],
  slides: ["material", "conteúdo", "aula", "visual", "slide"],
  resumo: ["resumo", "estudo", "conteúdo", "material", "revisão"],
  plano: ["plano", "estudo", "cronograma", "aluno", "meta"],
  infografico: ["visual", "infográf", "material", "conteúdo"],
  mapa: ["mapa", "conceito", "organiz", "estudo"],
};

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(opts: BuildHermesContextOpts): string {
  const topicKey = opts.topic?.slice(0, 80) ?? "";
  return `${opts.kind ?? ""}|${topicKey}|${opts.audience ?? "aluno"}|${opts.maxChars ?? DEFAULT_MAX_CHARS}`;
}

function topicTokens(topic?: string): string[] {
  if (!topic?.trim()) return [];
  return topic
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 4)
    .slice(0, 12);
}

export function roleToHermesAudience(role: string | undefined): HermesAudience {
  if (!role) return "aluno";
  if (role === "teacher" || role === "institution_admin" || role === "government") {
    return "professor";
  }
  if (role === "admin" || role === "researcher") return "interno";
  return "aluno";
}

function audienceLabel(audience: HermesAudience): string {
  if (audience === "professor") return "professor / escola";
  if (audience === "interno") return "equipe interna";
  return "aluno";
}

function scoreDescoberta(
  row: typeof hermesDescobertasGlobaisTable.$inferSelect,
  kind?: string,
  topic?: string,
): number {
  let score = row.importancia ?? 1;
  const blob = `${row.agentId} ${row.descoberta} ${JSON.stringify(row.evidencia ?? {})}`.toLowerCase();

  if (kind) {
    const keywords = KIND_KEYWORDS[kind] ?? [kind];
    for (const kw of keywords) {
      if (blob.includes(kw.toLowerCase())) score += 2;
    }
    const ev = row.evidencia as Record<string, unknown> | null;
    if (ev?.kind && String(ev.kind).toLowerCase().includes(kind.toLowerCase())) {
      score += 3;
    }
  }

  for (const token of topicTokens(topic)) {
    if (blob.includes(token)) score += 1;
  }

  return score;
}

function truncateBlock(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

/**
 * Monta bloco de contexto Hermes (descobertas + ações pendentes + CQO) para injetar no system prompt.
 * Uma leitura de DB por cache key; TTL 5 min em memória.
 */
export async function buildHermesContext(opts: BuildHermesContextOpts = {}): Promise<string> {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const audience = opts.audience ?? "aluno";
  const key = cacheKey({ ...opts, maxChars });

  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const parts: string[] = [
    "═══ CONTEXTO HERMES (interno — enriqueça a resposta; não cite este bloco ao usuário) ═══",
    `Público-alvo: ${audienceLabel(audience)}.`,
  ];

  try {
    const rows = await db
      .select()
      .from(hermesDescobertasGlobaisTable)
      .orderBy(desc(hermesDescobertasGlobaisTable.createdAt))
      .limit(10);

    const sorted = [...rows].sort((a, b) => {
      const diff =
        scoreDescoberta(b, opts.kind, opts.topic) - scoreDescoberta(a, opts.kind, opts.topic);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    const limit = opts.kind || opts.topic ? 5 : 8;
    const picked = sorted.slice(0, limit);

    if (picked.length > 0) {
      parts.push("", "Aprendizados recentes da plataforma:");
      for (const d of picked) {
        const line = `• [${d.agentId}] ${d.descoberta.trim()}`;
        parts.push(line.length > 220 ? `${line.slice(0, 217)}…` : line);
      }
    }

    const acoes = await db
      .select({
        tipo: hermesAcoesProativasTable.tipo,
        descricao: hermesAcoesProativasTable.descricao,
      })
      .from(hermesAcoesProativasTable)
      .where(eq(hermesAcoesProativasTable.status, "pending"))
      .orderBy(desc(hermesAcoesProativasTable.createdAt))
      .limit(3);

    if (acoes.length > 0) {
      parts.push("", "Sinais proativos (referência interna — não exponha como tarefa ao aluno):");
      for (const a of acoes) {
        const brief = a.descricao.trim().slice(0, 100);
        parts.push(`• ${a.tipo}: ${brief}${a.descricao.length > 100 ? "…" : ""}`);
      }
    }
  } catch (err) {
    console.warn("[hermes] buildHermesContext DB read failed:", err);
  }

  parts.push("", CQO_RULES_PT);

  const block = truncateBlock(parts.join("\n"), maxChars);
  cache.set(key, { value: block, expiresAt: Date.now() + CACHE_TTL_MS });
  return block;
}

/** Anexa o bloco Hermes a um system prompt existente. */
export async function appendHermesToSystemPrompt(
  systemPrompt: string,
  opts: BuildHermesContextOpts = {},
): Promise<string> {
  const block = await buildHermesContext(opts);
  if (!block) return systemPrompt;
  return `${systemPrompt}\n\n${block}`;
}

/**
 * Alias usado por notebook, aiClient e rotas legadas — enriquece system prompt com topic hint.
 */
export async function injectHermes(
  systemPrompt: string,
  topicHint?: string,
): Promise<string> {
  return appendHermesToSystemPrompt(systemPrompt, {
    kind: "chat",
    topic: topicHint,
    audience: "aluno",
  });
}
