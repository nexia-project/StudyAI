/**
 * math-detection.ts — Heurísticas para detectar perguntas de Matemática (PR-7)
 *
 * Usado em duas frentes (a serem ligadas DEPOIS do merge do PR-2):
 *   - Roteamento de modelo: se `isMathQuestion(text)` → usar Qwen Math no
 *     OpenRouter em vez do GPT padrão.
 *   - Tool `resolver_calculo` do Tiagão: extrair a expressão e chamar
 *     `/api/math/solve` quando a pergunta for um cálculo direto.
 *
 * É HEURÍSTICA — propositalmente generosa. Falsos positivos custam pouco
 * (cair em Qwen Math). Falsos negativos custam mais (resposta ruim em mate).
 */

const MATH_OPERATORS = ["=", "+", "-", "*", "/", "^", "√", "∫", "π", "÷", "×", "≤", "≥", "≠", "≈"];

const MATH_KEYWORDS = [
  // PT-BR
  "integral",
  "integrais",
  "derivada",
  "derivadas",
  "equação",
  "equacao",
  "equações",
  "equacoes",
  "inequação",
  "inequacao",
  "resolva",
  "resolver",
  "simplifique",
  "simplificar",
  "calcule",
  "calcular",
  "calculo",
  "cálculo",
  "fatore",
  "fatorar",
  "fatoração",
  "fatoracao",
  "expanda",
  "expandir",
  "raízes",
  "raizes",
  "raiz quadrada",
  "raiz cúbica",
  "raiz cubica",
  "matriz",
  "determinante",
  "limite",
  "limites",
  "área",
  "area",
  "volume",
  "perímetro",
  "perimetro",
  "diagonal",
  "ângulo",
  "angulo",
  "hipotenusa",
  "catetos",
  "teorema",
  "pitágoras",
  "pitagoras",
  "cosseno",
  "seno",
  "tangente",
  "secante",
  "cossecante",
  "cotangente",
  "logaritmo",
  "logaritmica",
  "exponencial",
  "função",
  "funcao",
  "funções",
  "funcoes",
  "polinômio",
  "polinomio",
  "vetor",
  "vetores",
  "produto escalar",
  "produto vetorial",
  "média",
  "media aritmética",
  "média aritmetica",
  "desvio padrão",
  "desvio padrao",
  "probabilidade",
  "combinatória",
  "combinatoria",
  "fatorial",
  // EN (vestibulandos misturam às vezes)
  "derivative",
  "derivatives",
  "integral",
  "equation",
  "equations",
  "inequality",
  "solve",
  "simplify",
  "calculate",
  "compute",
  "factor",
  "expand",
  "roots",
  "matrix",
  "determinant",
  "limit",
  "area",
  "perimeter",
  "angle",
  "hypotenuse",
  "theorem",
  "cosine",
  "sine",
  "tangent",
  "logarithm",
  "exponential",
  "function",
  "polynomial",
  "vector",
  "mean",
  "standard deviation",
  "probability",
  "factorial",
];

const MATH_PATTERN_REGEXES: RegExp[] = [
  /\bx\s*[²³⁴⁵⁶⁷⁸⁹]/i,            // x², x³ …
  /\bx\s*\^\s*\d+/i,                  // x^2
  /[a-z]\s*\^\s*\d+/i,                // qualquer var^N
  /\bf\s*\(\s*[a-z]\s*\)/i,           // f(x), g(t) etc.
  /\d+\s*[+\-*/^]\s*\d+/,             // 2+3, 4*5 …
  /\d+\s*\/\s*\d+/,                   // frações 1/2
  /\d+%/,                              // percentuais
  /√\s*\d/,
  /\b\d+x\b/i,                         // 2x, 3x
  /\b\d+\s*[a-z]\s*[+\-=]/i,           // 2x + 3 = ...
  /\b(sin|cos|tan|log|ln|exp)\s*\(/i,
];

/**
 * Detecta se um texto provavelmente é uma pergunta matemática.
 * Generoso por design — quando em dúvida, retorna true.
 */
export function isMathQuestion(text: string): boolean {
  const s = String(text ?? "").toLowerCase();
  if (!s.trim()) return false;

  // 1. Operadores literais em qualquer lugar do texto
  for (const op of MATH_OPERATORS) {
    if (s.includes(op)) return true;
  }
  // 2. Palavras-chave matemáticas
  for (const kw of MATH_KEYWORDS) {
    if (s.includes(kw)) return true;
  }
  // 3. Padrões numéricos típicos
  for (const re of MATH_PATTERN_REGEXES) {
    if (re.test(s)) return true;
  }
  return false;
}

/**
 * Tenta extrair a expressão matemática "principal" de um texto em linguagem
 * natural. Heurística:
 *
 *   1. Se o texto inteiro já parecer uma expressão pura, retorna como está.
 *   2. Senão, procura sub-string entre `$...$` (LaTeX inline) — devolve o
 *      conteúdo de dentro do PRIMEIRO par.
 *   3. Senão, procura o maior trecho contínuo formado por dígitos, letras
 *      simples, operadores e parênteses.
 *   4. Fallback: devolve o input trimado.
 */
export function extractMathExpression(text: string): string {
  const raw = String(text ?? "").trim();
  if (!raw) return "";

  // 1. Já parece uma expressão pura?
  if (/^[-+0-9a-zA-Z_().,\s*\/^=√π!]+$/.test(raw) && /[0-9=+\-*/^]/.test(raw)) {
    return raw;
  }

  // 2. LaTeX inline $...$
  const tex = raw.match(/\$([^$]+)\$/);
  if (tex && tex[1].trim().length > 0) return tex[1].trim();

  // 3. Maior trecho contínuo "tipo expressão"
  const candidates = raw.match(/[-+0-9a-zA-Z_().,\s*\/^=√π!]{3,}/g) ?? [];
  // Filtra trechos que tenham pelo menos um dígito OU um operador relevante.
  const scored = candidates
    .map((c) => c.trim())
    .filter((c) => /[0-9]/.test(c) || /[+\-*/^=]/.test(c))
    .sort((a, b) => b.length - a.length);
  if (scored.length > 0) return scored[0];

  // 4. Fallback
  return raw;
}
