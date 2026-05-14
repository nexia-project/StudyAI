/**
 * math-narration.ts — Q6 follow-up
 *
 * Converte notação LaTeX/matemática simples para português falado, para que
 * o TTS (rota `/voice-tts`) leia o resultado de `resolver_calculo` em voz
 * natural sem cuspir símbolos como "^", "/", "\sqrt" ou "\frac".
 *
 * Filosofia: regex-based, leve, e tolerante a entrada bagunçada — não é um
 * parser CAS. Cobre o caso "voz lê o RESULTADO final"; passos detalhados
 * (`MathSteps`) seguem visuais na bolha do chat.
 *
 * Exemplos:
 *   "x = 2"         → "x igual a 2"
 *   "x^2 + 3"       → "x ao quadrado mais 3"
 *   "x^3"           → "x ao cubo"
 *   "x^5"           → "x elevado a 5"
 *   "\\sqrt{2}"     → "raiz quadrada de 2"
 *   "\\frac{1}{2}"  → "1 sobre 2"
 *   "2 * 3"         → "2 vezes 3"
 *   "10 / 5"        → "10 dividido por 5"
 *   "\\pi"          → "pi"
 *   "\\infty"       → "infinito"
 *   "sin(x)"        → "seno de x"
 *
 * Não é perfeito, mas é "good enough" para narrar o resultado final.
 */

const REPLACEMENTS: Array<[RegExp, string]> = [
  // ── LaTeX delimiters / cercas ───────────────────────────────────────────
  [/\\\(|\\\)/g, " "],
  [/\\\[|\\\]/g, " "],
  [/\$+/g, " "],
  [/\\,|\\;|\\:|\\!/g, " "],
  [/\\left|\\right/g, ""],

  // ── Frações: \frac{a}{b} → "a sobre b" (suporta níveis simples)
  // Loop até estabilizar em chamadas externas (a função aplica reduceFracs).

  // ── Raízes ──────────────────────────────────────────────────────────────
  [/\\sqrt\s*\{([^{}]+)\}/g, " raiz quadrada de $1 "],
  [/\\sqrt\s*\[\s*([^\]]+)\s*\]\s*\{([^{}]+)\}/g, " raiz $1 de $2 "],

  // ── Constantes / símbolos ───────────────────────────────────────────────
  [/\\pi\b/gi, " pi "],
  [/\\infty\b/gi, " infinito "],
  [/\\theta\b/gi, " teta "],
  [/\\alpha\b/gi, " alfa "],
  [/\\beta\b/gi, " beta "],
  [/\\gamma\b/gi, " gama "],
  [/\\delta\b/gi, " delta "],

  // ── Funções comuns ──────────────────────────────────────────────────────
  // Aceita "\sin(x)", "sin(x)", "sin x" — converte para "seno de x".
  [/\\?\bsin\s*\(?\s*([^()\s,;]+)\s*\)?/gi, " seno de $1 "],
  [/\\?\bcos\s*\(?\s*([^()\s,;]+)\s*\)?/gi, " cosseno de $1 "],
  [/\\?\btan\s*\(?\s*([^()\s,;]+)\s*\)?/gi, " tangente de $1 "],
  [/\\?\blog\s*\(?\s*([^()\s,;]+)\s*\)?/gi, " log de $1 "],
  [/\\?\bln\s*\(?\s*([^()\s,;]+)\s*\)?/gi, " logaritmo natural de $1 "],

  // ── Comparadores ────────────────────────────────────────────────────────
  [/\\leq\b|<=/g, " menor ou igual a "],
  [/\\geq\b|>=/g, " maior ou igual a "],
  [/\\neq\b|!=/g, " diferente de "],

  // ── Expoentes especiais ─────────────────────────────────────────────────
  // ^{2} ou ^2 → "ao quadrado"; ^{3} ou ^3 → "ao cubo"; demais → "elevado a N"
  [/\^\s*\{?\s*2\s*\}?/g, " ao quadrado "],
  [/\^\s*\{?\s*3\s*\}?/g, " ao cubo "],
  [/\^\s*\{\s*([^{}]+?)\s*\}/g, " elevado a $1 "],
  [/\^\s*([0-9a-zA-Z]+)/g, " elevado a $1 "],

  // ── Operadores ──────────────────────────────────────────────────────────
  [/\\times\b/g, " vezes "],
  [/\\cdot\b/g, " vezes "],
  [/\\div\b/g, " dividido por "],
  [/\*/g, " vezes "],
  [/\//g, " dividido por "],
  [/=/g, " igual a "],
  [/\+/g, " mais "],
  // Hífen / sinal de menos: convertemos sempre para " menos ". Funciona para
  // "x - 2" ("x menos 2") e para "-2" ("menos 2"), ambos OK em PT-BR falado.
  [/-/g, " menos "],

  // ── Limpeza final ───────────────────────────────────────────────────────
  [/[{}\\]/g, " "],
  [/\s+/g, " "],
];

/** Achata frações \frac{a}{b} (com até 4 níveis) para "a sobre b". */
function reduceFracs(input: string): string {
  let s = input;
  for (let i = 0; i < 4; i++) {
    const next = s.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, " $1 sobre $2 ");
    if (next === s) return next;
    s = next;
  }
  return s;
}

/**
 * Humaniza notação matemática para narração TTS em PT-BR.
 * Tolerante a string vazia / inválida — devolve o input "como veio" se nada
 * casar (importante para não bloquear o TTS quando o resultado não tem
 * notação a humanizar, ex.: já está em texto puro).
 */
export function humanizeMathForTTS(input: string): string {
  if (typeof input !== "string") return "";
  let s = input.trim();
  if (!s) return "";

  s = reduceFracs(s);
  for (const [pattern, replacement] of REPLACEMENTS) {
    s = s.replace(pattern, replacement);
  }
  return s.replace(/\s+/g, " ").trim();
}
