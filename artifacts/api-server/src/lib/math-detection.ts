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

import { parse as mathjsParse } from "mathjs";

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

// ─── Geometria (PR-8) ────────────────────────────────────────────────────────

/**
 * Categorias de geometria que disparam um widget visual:
 *
 *   - "solido"          → cubo, esfera, cilindro, cone, prisma, pirâmide
 *   - "vetor"           → vetores, produto escalar/vetorial, ortogonalidade
 *   - "plano"           → equações do plano no R³
 *   - "trigonometria"   → seno/cosseno/tangente, ângulos
 *   - "circunferencia"  → círculo, raio, diâmetro
 *
 * A heurística é deliberadamente generosa: chamadas custam ~0 e o efeito
 * colateral de um widget extra é benigno (o renderer simplesmente esconde
 * quando `kind === null`).
 */
export type GeometryKind =
  | "solido"
  | "vetor"
  | "plano"
  | "trigonometria"
  | "circunferencia"
  | null;

/** Mapeamento de keywords → categoria. Ordem importa: testes específicos antes. */
const GEOMETRY_KEYWORDS: Array<{ kind: Exclude<GeometryKind, null>; words: string[] }> = [
  {
    kind: "solido",
    words: [
      "cubo", "cubos",
      "esfera", "esferas", "esférico", "esferico",
      "cilindro", "cilindros", "cilíndrico", "cilindrico",
      "cone", "cones", "cônico", "conico",
      "prisma", "prismas",
      "pirâmide", "piramide", "pirâmides", "piramides",
      "paralelepípedo", "paralelepipedo",
      "tetraedro", "octaedro", "dodecaedro", "icosaedro",
      "poliedro", "poliedros",
      "sólido", "solido", "sólidos", "solidos",
    ],
  },
  {
    kind: "vetor",
    words: [
      "vetor", "vetores",
      "produto vetorial",
      "produto escalar",
      "ortogonal", "ortogonais", "ortogonalidade",
      "perpendicular", "perpendiculares",
      "paralelo", "paralelos",
      "componente vetorial",
    ],
  },
  {
    kind: "plano",
    words: [
      "equação do plano", "equacao do plano",
      "equação geral do plano", "equacao geral do plano",
      "plano cartesiano",
      // Note: "plano" sozinho fica num bucket separado abaixo para evitar
      // colidir com "plano de estudos" etc.
    ],
  },
  {
    kind: "trigonometria",
    words: [
      "seno", "senos",
      "cosseno", "cossenos", "coseno",
      "tangente", "tangentes",
      "cotangente", "secante", "cossecante",
      "trigonometria", "trigonométrico", "trigonometrico",
      "ângulo", "angulo", "ângulos", "angulos",
      "lei dos senos", "lei dos cossenos",
      "razões trigonométricas", "razoes trigonometricas",
    ],
  },
  {
    kind: "circunferencia",
    words: [
      "circunferência", "circunferencia", "circunferências", "circunferencias",
      "círculo", "circulo", "círculos", "circulos",
      "raio", "raios",
      "diâmetro", "diametro", "diâmetros", "diametros",
      "corda", "cordas",
      "arco", "arcos",
      "setor circular",
    ],
  },
];

/**
 * Detecta a categoria de geometria de uma pergunta (PT-BR + acentos
 * normalizados). Retorna `null` quando não há sinal claro de geometria.
 *
 * Heurística:
 *   1. Normaliza acentos/case.
 *   2. Procura keywords da lista acima na ordem (sólido/vetor/plano/trig/circ).
 *   3. Caso `"plano"` apareça num contexto que sugira geometria espacial
 *      (junto de "vetor" ou "equação"), classifica como "plano".
 */
export function detectGeometryKind(text: string): GeometryKind {
  const raw = String(text ?? "").toLowerCase();
  if (!raw.trim()) return null;

  // Versão sem acentos para tolerância (cobre quem escreve "angulo" sem til).
  const ascii = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  for (const { kind, words } of GEOMETRY_KEYWORDS) {
    for (const w of words) {
      const wAscii = w.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (raw.includes(w) || ascii.includes(wAscii)) return kind;
    }
  }

  // Fallback contextual para "plano" (palavra polissêmica em PT).
  if (/\bplano\b/.test(ascii)) {
    if (/\b(equacao|equação|vetor|normal|cartesiano|tridimensional|r3|r\^3|reta|ponto)\b/.test(ascii)) {
      return "plano";
    }
  }

  return null;
}

// ─── Funções plotáveis (PR-8) ────────────────────────────────────────────────

/**
 * Indício de função plotável + extração de `f(x) = ...`, `y = ...`, etc.
 *
 * Heurísticas:
 *   - `gráfico`, `plote`, `esboce`, `parábola`, `função quadrática`, `função do
 *     primeiro grau` → fortes indicadores; tentamos extrair a RHS de uma
 *     equação no texto.
 *   - `f(x) = …`, `y = …`, `g(t) = …` → extrai RHS direto.
 *   - Validação final: `mathjs.parse(expr)` precisa funcionar. Caso contrário,
 *     retorna `null` (não vale a pena renderizar um plot quebrado).
 *
 * Sempre devolve a expressão sem o lado esquerdo da `=` e sem ponto final.
 */
export function detectGraphableFunction(
  text: string,
): { expr: string; varName: string } | null {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  const ascii = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Indicadores fortes de pedido de gráfico/função plotável.
  const PLOT_HINTS = [
    "grafico", "gráfico",
    "plote", "plotar", "plotagem",
    "esboce", "esboco", "esboço",
    "trace o grafico", "trace o gráfico",
    "parabola", "parábola",
    "funcao quadratica", "função quadrática",
    "funcao do primeiro grau", "função do primeiro grau",
    "funcao do segundo grau", "função do segundo grau",
    "funcao linear", "função linear",
    "funcao exponencial", "função exponencial",
    "funcao logaritmica", "função logarítmica",
    "funcao trigonometrica", "função trigonométrica",
  ];
  const hasHint = PLOT_HINTS.some((h) => ascii.includes(h.normalize("NFD").replace(/[\u0300-\u036f]/g, "")));

  // Tentativa 1: `f(x) = ...` / `g(t) = ...` / `y = ...`.
  // Captura: nome opcional + variável entre parênteses (ou "y") + "=" + RHS.
  const eqMatch = raw.match(
    /(?:\b([a-zA-Z])\s*\(\s*([a-zA-Z])\s*\)|\b([yY]))\s*=\s*([^.,;\n]+)/,
  );

  let expr: string | null = null;
  let varName = "x";

  if (eqMatch) {
    const funcVar = eqMatch[2];
    const isY = !!eqMatch[3];
    const rhs = (eqMatch[4] ?? "").trim();
    // Rejeita RHS com `=` adicional (sistema/equação multi-passo) ou texto
    // explicativo solto sem operadores matemáticos.
    if (rhs.length > 0 && !rhs.includes("=")) {
      expr = rhs;
      varName = isY ? "x" : (funcVar ?? "x");
    }
  }

  // Tentativa 2: sem `=` explícito, mas com hint forte — pega o maior bloco
  // que se pareça com uma expressão (dígitos, letras, operadores).
  if (!expr && hasHint) {
    const candidates = raw.match(/[-+0-9a-zA-Z_().\s*\/^√π!]{3,}/g) ?? [];
    const best = candidates
      .map((c) => c.trim())
      .filter((c) => /[0-9]/.test(c) && /[+\-*/^x]/i.test(c))
      .sort((a, b) => b.length - a.length)[0];
    if (best) expr = best;
  }

  if (!expr) return null;

  // Higieniza a expressão: tira ponto final, "respostas:" finais etc.
  expr = expr
    .replace(/[.;]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!expr) return null;

  // Detecta variável "principal" dentro da expressão se ainda não veio do LHS.
  if (varName === "x") {
    const m = expr.match(/\b([a-zA-Z])\b/);
    if (m && m[1] && !/^(e|pi|sin|cos|tan|log|ln|sqrt)$/i.test(m[1])) {
      // Mantém "x" como default canônico, mas se a expressão usa só "t",
      // preserva. Heurística simples: se "x" não aparece e há outra letra
      // simples, use-a.
      if (!/\bx\b/i.test(expr)) {
        varName = m[1];
      }
    }
  }

  // Validação final via mathjs.parse — se não parsear, não vale renderizar.
  try {
    mathjsParse(expr);
  } catch {
    return null;
  }

  return { expr, varName };
}

// ─── Sanity-check defensivo (dev only) ───────────────────────────────────────
// Roda só uma vez na inicialização do módulo. Loga divergências em assertions
// óbvias — pode ser removido sem mudar contratos.
if (process.env.NODE_ENV !== "production" && process.env.MATH_DETECTION_SELFTEST === "1") {
  try {
    const assert = (cond: boolean, label: string) => {
      if (!cond) console.warn(`[math-detection][selftest] FAIL: ${label}`);
    };
    assert(detectGeometryKind("Calcule o volume do cubo de aresta 3") === "solido", "cubo→solido");
    assert(detectGeometryKind("Mostre o vetor v = (1,2,3)") === "vetor", "vetor→vetor");
    assert(detectGeometryKind("Equação do plano que passa por A=(1,0,0)") === "plano", "plano→plano");
    assert(detectGeometryKind("Calcule o seno de 30 graus") === "trigonometria", "seno→trig");
    assert(detectGeometryKind("Área de uma circunferência de raio 5") === "circunferencia", "circ→circ");
    assert(detectGeometryKind("Quem foi Pelé?") === null, "off-topic→null");

    const f1 = detectGraphableFunction("Esboce o gráfico de f(x) = x^2 - 4");
    assert(!!f1 && /x\^2/.test(f1!.expr), "f(x)=x^2-4");
    const f2 = detectGraphableFunction("Plote y = 2*x + 1");
    assert(!!f2 && f2!.varName === "x", "y=2x+1");
    const f3 = detectGraphableFunction("Quanto é 2+2?");
    assert(f3 === null, "2+2→null");
  } catch (err) {
    console.warn("[math-detection][selftest] erro:", err);
  }
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
