/**
 * build-tiagao-prompt.ts
 *
 * Composição do system prompt do Tiagão com método pedagógico + tom de sentimento,
 * mais utilitários para:
 *   • parsear o bloco <<META>>{...} que o LLM devolve no fim da resposta
 *   • detectar override por comando explícito do utilizador
 *   • filtrar o marcador <<META>> de um stream SSE em tempo real
 *
 * A meta-tag fica em UMA LINHA SEPARADA no final da resposta e é removida antes
 * de entregar o texto ao frontend. O modelo é instruído a devolver:
 *   <<META>>{"sentimento_detectado":"frustrado|...","metodo_usado":"analitico|..."}
 */

import {
  SENTIMENT_TONE_OVERLAY,
  TEACHING_METHOD_PROMPTS,
  USER_OVERRIDE_HINTS,
  type Sentimento,
  type TeachingMethod,
} from "./teaching-method";

export interface ComposeOpts {
  /** o system prompt original do Tiagão (já com perfil, memória, KB, etc.) */
  basePrompt: string;
  method: TeachingMethod;
  sentiment: Sentimento;
  userOverride: { method?: TeachingMethod; tone?: Sentimento } | null;
}

export interface ComposeResult {
  prompt: string;
  /** método final (após override) — para persistência/avatar */
  method: TeachingMethod;
  /** tom de sentimento final (string já incluída no prompt) */
  sentimentTone: string;
}

export function composeTiagaoSystemPrompt(opts: ComposeOpts): ComposeResult {
  const finalMethod = opts.userOverride?.method ?? opts.method;
  const sentimentTone = opts.userOverride?.tone
    ? SENTIMENT_TONE_OVERLAY[opts.userOverride.tone] ?? ""
    : SENTIMENT_TONE_OVERLAY[opts.sentiment] ?? "";

  const parts = [
    opts.basePrompt,
    "",
    "═══ MÉTODO PEDAGÓGICO DESTA RESPOSTA (interno — não revele ao aluno) ═══",
    TEACHING_METHOD_PROMPTS[finalMethod],
  ];
  if (sentimentTone) {
    parts.push("");
    parts.push(sentimentTone);
  }
  parts.push("");
  parts.push(
    `IMPORTANTE: ao final da sua resposta, ANTES de qualquer outra coisa NÃO escreva nada após, devolva em UMA linha separada começando exatamente com "<<META>>", um JSON compacto:`,
  );
  parts.push(
    `<<META>>{"sentimento_detectado":"frustrado|confuso|cansado|animado|neutro","metodo_usado":"${finalMethod}"}`,
  );
  parts.push(
    "Não use markdown, comentário, código nem aspas extras. Essa linha NÃO aparece ao aluno — é uma anotação interna sua sobre como você LEU o aluno nesta mensagem.",
  );

  return { prompt: parts.join("\n"), method: finalMethod, sentimentTone };
}

/** Decodifica um JSON do tipo {"sentimento_detectado":"...","metodo_usado":"..."}. */
function safeParseMetaJson(jsonish: string): { sentiment: Sentimento; method: TeachingMethod | null } {
  try {
    const parsed = JSON.parse(jsonish);
    const s = String(parsed?.sentimento_detectado ?? "").toLowerCase();
    const m = String(parsed?.metodo_usado ?? "").toLowerCase();
    const sentiment: Sentimento =
      s === "frustrado" || s === "confuso" || s === "cansado" || s === "animado"
        ? (s as Sentimento)
        : "neutro";
    const method: TeachingMethod | null =
      m === "analitico" || m === "pragmatico" || m === "conectivo" ? (m as TeachingMethod) : null;
    return { sentiment, method };
  } catch {
    return { sentiment: "neutro", method: null };
  }
}

/**
 * Parse de resposta NÃO streaming. Extrai o JSON após `<<META>>` e devolve a
 * resposta limpa (sem o marcador). Tolerante a quebras de linha, espaços extras
 * e ao modelo deixar o JSON sem fechar a chave (corta no primeiro `}`).
 */
export function parseTiagaoMeta(text: string): {
  sentiment: Sentimento;
  method: TeachingMethod | null;
  cleanText: string;
} {
  const idx = text.indexOf("<<META>>");
  if (idx === -1) return { sentiment: "neutro", method: null, cleanText: text };
  const before = text.slice(0, idx);
  const after = text.slice(idx + "<<META>>".length);
  const jsonMatch = after.match(/\{[^}]*\}/);
  if (!jsonMatch) {
    return { sentiment: "neutro", method: null, cleanText: before.trimEnd() };
  }
  const parsed = safeParseMetaJson(jsonMatch[0]);
  return { ...parsed, cleanText: before.trimEnd() };
}

/** Verifica se a mensagem do aluno contém comando de override (método ou tom). */
export function detectUserOverride(
  userMessage: string,
): { method?: TeachingMethod; tone?: Sentimento } | null {
  for (const hint of USER_OVERRIDE_HINTS) {
    if (hint.pattern.test(userMessage)) {
      const out: { method?: TeachingMethod; tone?: Sentimento } = {};
      if (hint.method) out.method = hint.method;
      if (hint.tone) out.tone = hint.tone;
      return out;
    }
  }
  return null;
}

/**
 * Filtro de stream para SSE: garante que o marcador `<<META>>` e o JSON que
 * o segue NÃO sejam entregues ao cliente.
 *
 * Mantém um buffer de até `<<META>>`.length caracteres no fim para detectar
 * o marcador atravessando boundaries de chunks. Quando detecta, para de emitir
 * texto e acumula o resto em `meta`.
 */
export function createMetaStreamFilter() {
  const TAG = "<<META>>";
  let pending = ""; // texto ainda não emitido (cauda do buffer)
  let metaStarted = false;
  let metaRaw = "";

  return {
    /** processa um delta de texto e devolve o que pode ser entregue ao cliente */
    push(delta: string): string {
      if (!delta) return "";
      if (metaStarted) {
        metaRaw += delta;
        return "";
      }
      pending += delta;
      const idx = pending.indexOf(TAG);
      if (idx >= 0) {
        const emit = pending.slice(0, idx);
        metaRaw = pending.slice(idx + TAG.length);
        metaStarted = true;
        pending = "";
        return emit;
      }
      // mantém últimos TAG.length caracteres no buffer (caso o marcador
      // esteja sendo construído ao longo de vários chunks)
      const holdBack = TAG.length;
      if (pending.length <= holdBack) return "";
      const emit = pending.slice(0, pending.length - holdBack);
      pending = pending.slice(pending.length - holdBack);
      return emit;
    },
    /** chamado quando o stream acabar — devolve o que sobrou + os dados meta */
    flush(): { tail: string; meta: { sentiment: Sentimento; method: TeachingMethod | null } } {
      if (metaStarted) {
        const jsonMatch = metaRaw.match(/\{[^}]*\}/);
        const parsed = jsonMatch ? safeParseMetaJson(jsonMatch[0]) : { sentiment: "neutro" as Sentimento, method: null };
        return { tail: "", meta: parsed };
      }
      const tail = pending;
      pending = "";
      return { tail, meta: { sentiment: "neutro", method: null } };
    },
  };
}
