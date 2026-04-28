/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  BANCO DE FÓRMULAS ENEM — Exatas (Matemática, Física, Química)         ║
 * ║  Fonte curada local — zero custo, zero latência, 100% confiável        ║
 * ║  Cobre os tópicos de maior frequência no ENEM e vestibulares           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export type MateriaExatas = "matematica" | "fisica" | "quimica";
export type FrequenciaEnem = "alta" | "media" | "baixa";

export interface Formula {
  id: string;
  materia: MateriaExatas;
  topico: string;
  subtopico?: string;
  nome: string;
  formula: string;           // notação textual clara
  variaveis?: Record<string, string>;
  descricao: string;
  observacoes?: string;
  exemplo?: string;
  enem_frequencia: FrequenciaEnem;
  tags: string[];
}

// ─── MATEMÁTICA ───────────────────────────────────────────────────────────────
const matematica: Formula[] = [

  // ── Funções ─────────────────────────────────────────────────────────────────
  {
    id: "mat-funcao-linear",
    materia: "matematica", topico: "Funções", subtopico: "Função Afim",
    nome: "Função Afim (1º grau)",
    formula: "f(x) = ax + b",
    variaveis: { a: "coeficiente angular (taxa de variação / inclinação)", b: "coeficiente linear (valor quando x=0)", x: "variável independente" },
    descricao: "Representa uma reta no plano cartesiano. Se a > 0 a função é crescente; se a < 0 é decrescente. A raiz (zero) é x = -b/a.",
    exemplo: "f(x) = 3x - 6 → raiz: x = 2; f(4) = 6",
    enem_frequencia: "alta",
    tags: ["função linear", "função afim", "reta", "coeficiente angular", "coeficiente linear", "1 grau", "primeiro grau", "taxa variacao", "crescente", "decrescente"],
  },
  {
    id: "mat-funcao-quadratica",
    materia: "matematica", topico: "Funções", subtopico: "Função Quadrática",
    nome: "Função Quadrática (2º grau)",
    formula: "f(x) = ax² + bx + c  (a ≠ 0)\nVértice: x_v = -b/(2a)  |  y_v = -Δ/(4a)\nRaízes: x = (-b ± √Δ) / 2a   onde Δ = b² - 4ac",
    variaveis: { a: "coeficiente do x² (abre ↑ se a>0, abre ↓ se a<0)", b: "coeficiente do x", c: "termo independente (valor de f(0))", "Δ (delta)": "discriminante. Δ>0: 2 raízes reais; Δ=0: 1 raiz; Δ<0: sem raiz real" },
    descricao: "Parábola. Vértice é o ponto de máximo (a<0) ou mínimo (a>0). Bhaskara calcula as raízes. O eixo de simetria passa por x_v.",
    observacoes: "Soma das raízes: x1+x2 = -b/a. Produto das raízes: x1·x2 = c/a (Relações de Girard).",
    exemplo: "f(x)=x²-5x+6 → Δ=25-24=1 → x=(5±1)/2 → x1=3, x2=2",
    enem_frequencia: "alta",
    tags: ["bhaskara", "função quadratica", "2 grau", "segundo grau", "parabola", "delta", "discriminante", "vertice", "raiz", "maximo", "minimo", "girard"],
  },
  {
    id: "mat-funcao-exponencial",
    materia: "matematica", topico: "Funções", subtopico: "Função Exponencial",
    nome: "Função Exponencial",
    formula: "f(x) = aˣ  (a > 0, a ≠ 1)\nCrescente se a > 1; Decrescente se 0 < a < 1\nPassagem obrigatória: (0, 1) pois a⁰ = 1",
    variaveis: { a: "base (constante positiva ≠ 1)", x: "expoente (variável independente)" },
    descricao: "Modela crescimento/decrescimento exponencial. Usada em juros compostos, radioatividade, crescimento populacional. Nunca cruza o eixo x (f(x) > 0 sempre).",
    exemplo: "Dobramento a cada período: P(t) = P₀ · 2^t",
    enem_frequencia: "alta",
    tags: ["exponencial", "crescimento", "decrescimento", "juros compostos", "radioatividade", "base", "expoente"],
  },
  {
    id: "mat-logaritmo",
    materia: "matematica", topico: "Funções", subtopico: "Logaritmos",
    nome: "Logaritmos — Definição e Propriedades",
    formula: "log_a(b) = x  ⟺  aˣ = b  (a>0, a≠1, b>0)\nPropriedades:\n  log(A·B) = log A + log B\n  log(A/B) = log A - log B\n  log(Aⁿ) = n·log A\n  Mudança de base: log_a(b) = log(b)/log(a)\nlog₁₀ = log  |  logₑ = ln (logaritmo natural)",
    variaveis: { a: "base", b: "logaritmando", x: "logaritmo (resultado)" },
    descricao: "Logaritmo é o expoente. Inverso da função exponencial. log₁₀ 100 = 2 pois 10² = 100.",
    observacoes: "ln(e) = 1; log(1) = 0; log(10) = 1. No ENEM: log 2 ≈ 0,301; log 3 ≈ 0,477.",
    exemplo: "log₂(8) = 3 pois 2³ = 8. log(1000) = 3 pois 10³ = 1000.",
    enem_frequencia: "alta",
    tags: ["logaritmo", "log", "ln", "logaritmo natural", "propriedades logaritmo", "mudança de base", "log2", "log3"],
  },

  // ── Progressões ─────────────────────────────────────────────────────────────
  {
    id: "mat-pa",
    materia: "matematica", topico: "Progressões", subtopico: "Progressão Aritmética",
    nome: "Progressão Aritmética (PA)",
    formula: "Termo geral: aₙ = a₁ + (n-1)·r\nSoma dos n termos: Sₙ = n·(a₁ + aₙ)/2  =  n·(2a₁ + (n-1)r)/2",
    variaveis: { a1: "primeiro termo", an: "n-ésimo termo", r: "razão (diferença entre termos consecutivos)", n: "posição do termo / quantidade de termos" },
    descricao: "Sequência onde cada termo difere do anterior por uma constante r. PA crescente se r>0; decrescente se r<0; constante se r=0.",
    observacoes: "Em PA finita: termo do meio = média aritmética dos extremos. Propriedade: a+b = c+d (equidistantes dos extremos).",
    exemplo: "PA(2,5,8,11…): r=3; a₁₀=2+9·3=29; S₁₀=10·(2+29)/2=155",
    enem_frequencia: "alta",
    tags: ["pa", "progressao aritmetica", "razao", "termo geral", "soma pa", "sequencia aritmetica"],
  },
  {
    id: "mat-pg",
    materia: "matematica", topico: "Progressões", subtopico: "Progressão Geométrica",
    nome: "Progressão Geométrica (PG)",
    formula: "Termo geral: aₙ = a₁ · qⁿ⁻¹\nSoma dos n termos (q≠1): Sₙ = a₁·(qⁿ - 1)/(q - 1)\nSoma infinita (|q|<1): S∞ = a₁/(1 - q)",
    variaveis: { a1: "primeiro termo", q: "razão (fator multiplicativo entre termos)", n: "posição do termo" },
    descricao: "Sequência onde cada termo é o anterior multiplicado por q. PG crescente se q>1 (e a₁>0). Ligada ao crescimento exponencial e juros compostos.",
    observacoes: "Em PG: produto de termos equidistantes dos extremos é constante. b² = a·c para 3 termos em PG.",
    exemplo: "PG(3,6,12,24…): q=2; a₅=3·2⁴=48; S₄=3·(2⁴-1)/(2-1)=45",
    enem_frequencia: "alta",
    tags: ["pg", "progressao geometrica", "razao pg", "termo geral pg", "soma pg", "soma infinita", "sequencia geometrica"],
  },

  // ── Matemática Financeira ────────────────────────────────────────────────────
  {
    id: "mat-juros-simples",
    materia: "matematica", topico: "Matemática Financeira", subtopico: "Juros Simples",
    nome: "Juros Simples",
    formula: "J = C · i · t\nM = C + J = C·(1 + i·t)",
    variaveis: { J: "juros (valor dos juros)", C: "capital inicial (principal)", i: "taxa de juros (no mesmo período que t)", t: "tempo", M: "montante (capital + juros)" },
    descricao: "Os juros são calculados sempre sobre o capital inicial. Taxa e tempo devem estar na mesma unidade (mensal com meses, anual com anos).",
    exemplo: "C=R$1000, i=2%/mês, t=6 meses → J=1000·0,02·6=R$120 → M=R$1120",
    enem_frequencia: "alta",
    tags: ["juros simples", "capital", "taxa", "montante", "financeira", "emprestimo"],
  },
  {
    id: "mat-juros-compostos",
    materia: "matematica", topico: "Matemática Financeira", subtopico: "Juros Compostos",
    nome: "Juros Compostos",
    formula: "M = C · (1 + i)ᵗ\nJ = M - C = C·[(1 + i)ᵗ - 1]",
    variaveis: { M: "montante final", C: "capital inicial", i: "taxa de juros por período", t: "número de períodos" },
    descricao: "Juros calculados sobre o montante acumulado (juros sobre juros). Cresce exponencialmente. Regra da 72: tempo para dobrar ≈ 72/taxa%.",
    observacoes: "Taxa equivalente mensal ↔ anual: (1+ia) = (1+im)¹². Para ENEM use: (1,1)¹²≈3,14 se necessário.",
    exemplo: "C=R$2000, i=10%/ano, t=3 anos → M=2000·(1,1)³=2000·1,331=R$2.662",
    enem_frequencia: "alta",
    tags: ["juros compostos", "montante", "capital", "taxa", "capitalização", "investimento", "financiamento", "regra 72"],
  },

  // ── Geometria Plana ──────────────────────────────────────────────────────────
  {
    id: "mat-geo-plana",
    materia: "matematica", topico: "Geometria Plana", subtopico: "Áreas",
    nome: "Áreas de Figuras Planas",
    formula: "Quadrado: A = l²\nRetângulo: A = b · h\nTriângulo: A = (b · h) / 2\nTriângulo (Heron): A = √[s(s-a)(s-b)(s-c)]  onde s=(a+b+c)/2\nParalelogramo: A = b · h\nTrapézio: A = (B + b) · h / 2\nCircunferência / Círculo: C = 2πr  |  A = πr²\nSetor circular: A = (θ/360)·πr²  (θ em graus)\nLosango: A = D · d / 2  (D e d são as diagonais)",
    variaveis: { b: "base", h: "altura", r: "raio", l: "lado", B: "base maior (trapézio)", d: "base menor / diagonal menor", D: "diagonal maior", "s": "semiperímetro" },
    descricao: "Coleção das principais fórmulas de área para o ENEM. Sempre verifique se h é a altura PERPENDICULAR à base.",
    observacoes: "π ≈ 3,14159. O ENEM geralmente fornece π quando necessário ou usa π como símbolo.",
    exemplo: "Triângulo de lados 3,4,5: s=6; A=√(6·3·2·1)=6",
    enem_frequencia: "alta",
    tags: ["area", "geometria plana", "triangulo", "quadrado", "retangulo", "circulo", "trapezio", "losango", "paralelogramo", "setor circular", "heron", "perimetro"],
  },
  {
    id: "mat-pitagoras",
    materia: "matematica", topico: "Geometria Plana", subtopico: "Teorema de Pitágoras",
    nome: "Teorema de Pitágoras e Triângulos Notáveis",
    formula: "c² = a² + b²  (hipotenusa² = soma dos catetos²)\nTriângulo 30-60-90: lados proporcionais a 1 : √3 : 2\nTriângulo 45-45-90 (isósceles): lados proporcionais a 1 : 1 : √2\nDiagonal do quadrado de lado l: d = l√2\nAltura do triângulo equilátero de lado l: h = l√3/2\nÁrea do triângulo equilátero: A = l²√3/4",
    variaveis: { c: "hipotenusa (lado oposto ao ângulo de 90°)", a: "cateto", b: "cateto" },
    descricao: "Fundamental para qualquer problema com triângulo retângulo. Ternos pitagóricos comuns: (3,4,5), (5,12,13), (6,8,10), (7,24,25), (8,15,17).",
    exemplo: "Catetos 6 e 8: c²=36+64=100 → c=10",
    enem_frequencia: "alta",
    tags: ["pitagoras", "hipotenusa", "cateto", "triangulo retangulo", "terno pitagorico", "30-60-90", "45-45-90", "triangulo equilatero", "diagonal quadrado", "isosceles"],
  },

  // ── Trigonometria ────────────────────────────────────────────────────────────
  {
    id: "mat-trigonometria",
    materia: "matematica", topico: "Trigonometria", subtopico: "Razões Trigonométricas",
    nome: "Trigonometria — Razões e Leis",
    formula: "No triângulo retângulo:\n  sen θ = cateto oposto / hipotenusa\n  cos θ = cateto adjacente / hipotenusa\n  tg θ = cateto oposto / cateto adjacente = sen θ / cos θ\n\nValores notáveis:\n  sen 30°=cos 60°=1/2       cos 30°=sen 60°=√3/2    tg 30°=√3/3    tg 60°=√3\n  sen 45°=cos 45°=√2/2      tg 45°=1\n  sen 90°=1   cos 90°=0\n\nIdentidade fundamental: sen²θ + cos²θ = 1\n\nLei dos Senos: a/sen A = b/sen B = c/sen C = 2R\nLei dos Cossenos: a² = b² + c² - 2bc·cos A",
    variaveis: { θ: "ângulo", a: "lado oposto ao ângulo A", R: "raio da circunferência circunscrita" },
    descricao: "Razões trigonométricas válidas em qualquer triângulo retângulo. Lei dos senos/cossenos para triângulos quaisquer.",
    observacoes: "SOH-CAH-TOA: Sen=Oposto/Hipotenusa, Cos=Adjacente/Hipotenusa, Tg=Oposto/Adjacente",
    enem_frequencia: "alta",
    tags: ["seno", "cosseno", "tangente", "trigonometria", "lei dos senos", "lei dos cossenos", "sen", "cos", "tg", "razoes trigonometricas", "angulo", "valores notaveis"],
  },

  // ── Geometria Espacial ───────────────────────────────────────────────────────
  {
    id: "mat-geo-espacial",
    materia: "matematica", topico: "Geometria Espacial", subtopico: "Volumes e Áreas",
    nome: "Volumes e Áreas de Sólidos Geométricos",
    formula: "Cubo (lado l): V = l³  |  A_total = 6l²  |  diagonal = l√3\nParaleleplípedo (a,b,c): V = a·b·c\nPrisma: V = A_base · h\nPirâmide: V = (A_base · h) / 3\nCilindro (r,h): V = πr²h  |  A_lateral = 2πrh  |  A_total = 2πr(r+h)\nCone (r,h,g): V = πr²h/3  |  A_lateral = πrg  |  A_total = πr(r+g)  onde g=√(r²+h²)\nEsfera (r): V = 4πr³/3  |  A = 4πr²",
    variaveis: { l: "aresta/lado", r: "raio", h: "altura", g: "geratriz (cone)", "A_base": "área da base" },
    descricao: "Fórmulas de volume e área total para os principais sólidos. Relação de Euler para poliedros: V - A + F = 2 (Vértices - Arestas + Faces).",
    observacoes: "Tronco de cone: V = πh(R²+Rr+r²)/3  |  Tronco de pirâmide: V = h(A₁+A₂+√(A₁A₂))/3",
    exemplo: "Esfera r=3: V=4π·27/3=36π≈113,1",
    enem_frequencia: "alta",
    tags: ["volume", "area", "geometria espacial", "cubo", "esfera", "cilindro", "cone", "piramide", "prisma", "solido", "geratriz", "euler"],
  },

  // ── Estatística e Probabilidade ──────────────────────────────────────────────
  {
    id: "mat-estatistica",
    materia: "matematica", topico: "Estatística", subtopico: "Medidas Estatísticas",
    nome: "Estatística — Medidas de Tendência Central e Dispersão",
    formula: "Média aritmética: x̄ = (x₁+x₂+…+xₙ) / n\nMédia ponderada: x̄_p = Σ(xᵢ·pᵢ) / Σpᵢ\nMediana: valor central (n ímpar) ou média dos dois centrais (n par) após ordenação\nModa: valor mais frequente\nVariância: σ² = Σ(xᵢ - x̄)² / n\nDesvio padrão: σ = √(variância)",
    descricao: "Medidas de tendência central resumem um conjunto de dados. O ENEM costuma pedir média, mediana e interpretação de gráficos (histograma, boxplot, pictograma).",
    observacoes: "Em distribuição simétrica: média = mediana = moda. Boxplot: mínimo, Q1, mediana, Q3, máximo.",
    exemplo: "Notas: 5,6,7,7,8,9,10 → Média=52/7≈7,43; Mediana=7 (4º valor); Moda=7",
    enem_frequencia: "alta",
    tags: ["media", "mediana", "moda", "estatistica", "variancia", "desvio padrao", "tendencia central", "dispersao", "boxplot", "histograma"],
  },
  {
    id: "mat-probabilidade",
    materia: "matematica", topico: "Probabilidade", subtopico: "Probabilidade Clássica",
    nome: "Probabilidade",
    formula: "P(A) = n(A) / n(Ω)   (casos favoráveis / casos totais possíveis)\nP(A∪B) = P(A) + P(B) - P(A∩B)\nP(A∩B) = P(A) · P(B)  (eventos independentes)\nP(A | B) = P(A∩B) / P(B)  (probabilidade condicional)\nP(Aᶜ) = 1 - P(A)  (complementar)\nBinomial: P(X=k) = C(n,k) · pᵏ · (1-p)ⁿ⁻ᵏ",
    variaveis: { "n(A)": "número de casos favoráveis ao evento A", "n(Ω)": "espaço amostral total", "P(A)": "probabilidade de A ocorrer" },
    descricao: "Probabilidade clássica pressupõe eventos igualmente prováveis. Sempre entre 0 e 1. P=0 (impossível), P=1 (certo).",
    exemplo: "Dado: P(par) = 3/6 = 1/2. Dois dados: P(soma=7) = 6/36 = 1/6.",
    enem_frequencia: "alta",
    tags: ["probabilidade", "chance", "evento", "espaco amostral", "condicional", "independente", "complementar", "binomial", "combinatoria"],
  },
  {
    id: "mat-combinatoria",
    materia: "matematica", topico: "Combinatória", subtopico: "Análise Combinatória",
    nome: "Análise Combinatória",
    formula: "Fatorial: n! = n·(n-1)·(n-2)···2·1   |   0!=1\nPermutação simples (todos os n): P(n) = n!\nPermutação com repetição: P(n;n₁,n₂…) = n! / (n₁!·n₂!···)\nCombinação C(n,k)=nCk: C(n,k) = n! / [k!·(n-k)!]\nArranjo A(n,k): A(n,k) = n! / (n-k)!",
    variaveis: { n: "total de elementos", k: "elementos escolhidos", "n!": "fatorial de n" },
    descricao: "DIFERENÇA-CHAVE: Combinação → ordem NÃO importa (escolher). Arranjo → ordem IMPORTA (posicionar/ordenar). Permutação → todos os elementos são usados.",
    observacoes: "Triângulo de Pascal: C(n,k) = C(n-1,k-1) + C(n-1,k). Binômio de Newton: (a+b)ⁿ = Σ C(n,k)·aⁿ⁻ᵏ·bᵏ",
    exemplo: "C(10,3) = 10!/(3!7!) = 120. A(5,2) = 5!/3! = 20. P(4) = 4! = 24.",
    enem_frequencia: "alta",
    tags: ["combinatoria", "combinacao", "arranjo", "permutacao", "fatorial", "analise combinatoria", "binomio newton", "pascal"],
  },

  // ── Álgebra / Outros ────────────────────────────────────────────────────────
  {
    id: "mat-sistemas",
    materia: "matematica", topico: "Álgebra", subtopico: "Sistemas de Equações",
    nome: "Sistemas de Equações Lineares",
    formula: "Sistema 2×2:\n  a₁x + b₁y = c₁\n  a₂x + b₂y = c₂\nMétodos: substituição, adição (combinação linear), Cramer\nDeterminante 2×2: det = a₁·b₂ - a₂·b₁\n  x = det_x / det   |   y = det_y / det\nClassificação: det≠0 → SPD (1 solução) | det=0 e compatível → SPI | det=0 e incompatível → SI",
    descricao: "Sistemas lineares aparecem em problemas de mistura, velocidade, trabalho, geometria. Método mais rápido no ENEM é geralmente substituição ou adição.",
    enem_frequencia: "alta",
    tags: ["sistema", "equacao", "substituicao", "adicao", "determinante", "cramer", "spd", "spi", "linear"],
  },
  {
    id: "mat-modulo",
    materia: "matematica", topico: "Álgebra", subtopico: "Módulo e Inequações",
    nome: "Módulo (Valor Absoluto) e Inequações",
    formula: "|x| = x se x≥0 ; |x| = -x se x<0\n|x| = a  →  x = a  ou  x = -a\n|x| < a  →  -a < x < a\n|x| > a  →  x < -a  ou  x > a\nInequação quadrática: f(x) < 0 → entre as raízes (se a>0); f(x) > 0 → fora das raízes",
    descricao: "Módulo representa distância na reta numérica. Inequações quadráticas: faça o gráfico da parábola mentalmente (abre para cima se a>0).",
    enem_frequencia: "media",
    tags: ["modulo", "valor absoluto", "inequacao", "inequação", "menor que", "maior que", "intervalo"],
  },
  {
    id: "mat-sequencias",
    materia: "matematica", topico: "Álgebra", subtopico: "Sequências e Recorrência",
    nome: "Sequências — Reconhecimento de Padrões",
    formula: "PA: diferença constante entre termos → aₙ = a₁ + (n-1)r\nPG: razão constante entre termos → aₙ = a₁ · qⁿ⁻¹\nFibonacci: F(n) = F(n-1) + F(n-2)  →  1,1,2,3,5,8,13,21,34,55,89…\nRecorrência linear: identificar padrão, verificar se é PA, PG ou outra regra",
    descricao: "No ENEM, problemas de sequência geralmente são PA ou PG. Identifique a razão/diferença nos primeiros termos.",
    enem_frequencia: "media",
    tags: ["sequencia", "fibonacci", "recorrencia", "padrao", "pa", "pg", "progressao"],
  },
  {
    id: "mat-proporcionalidade",
    materia: "matematica", topico: "Razão e Proporção", subtopico: "Proporcionalidade",
    nome: "Razão, Proporção e Regra de Três",
    formula: "Razão: a/b\nProporção: a/b = c/d  ↔  a·d = b·c (produto dos meios = produto dos extremos)\nRegra de 3 simples (grandezas diretamente proporcionais): a/b = c/x → x = b·c/a\nRegra de 3 (grandezas inversamente proporcionais): a·b = c·x → x = a·b/c\nPortagem: se aumentar A em p% → multiplica por (1 + p/100); diminuir → (1 - p/100)",
    descricao: "Base de problemas práticos (receita, escala, velocidade, concentração). Sempre identifique se grandezas são DIP (diretamente prop.) ou IP (inversamente prop.).",
    observacoes: "Variação percentual: [(valor final - valor inicial)/valor inicial]·100. Desconto e acréscimo se compõem multiplicando fatores.",
    enem_frequencia: "alta",
    tags: ["razao", "proporcao", "regra de tres", "porcentagem", "percentagem", "percentual", "desconto", "acrescimo", "escala", "proporcionalidade"],
  },
];

// ─── FÍSICA ───────────────────────────────────────────────────────────────────
const fisica: Formula[] = [

  // ── Cinemática ───────────────────────────────────────────────────────────────
  {
    id: "fis-mru",
    materia: "fisica", topico: "Cinemática", subtopico: "MRU",
    nome: "Movimento Retilíneo Uniforme (MRU)",
    formula: "v = Δs/Δt  →  s = s₀ + v·t\nGráfico s×t: reta (inclinação = v)\nGráfico v×t: reta horizontal\nÁrea sob gráfico v×t = deslocamento",
    variaveis: { v: "velocidade (m/s) — constante no MRU", s: "posição (m)", s0: "posição inicial (m)", t: "tempo (s)", "Δs": "deslocamento = s - s₀" },
    descricao: "Velocidade constante, aceleração zero. O gráfico posição×tempo é uma reta com inclinação igual à velocidade.",
    observacoes: "Cuidado: velocidade ≠ rapidez quando há mudança de direção. Velocidade média = Δs/Δt.",
    exemplo: "Carro a 20 m/s durante 5 s: s = 100 m. Em 2 horas a 80 km/h: d = 160 km.",
    enem_frequencia: "alta",
    tags: ["mru", "velocidade", "movimento uniforme", "posicao", "deslocamento", "cinetica", "cinematica"],
  },
  {
    id: "fis-mrua",
    materia: "fisica", topico: "Cinemática", subtopico: "MRUA",
    nome: "Movimento Retilíneo Uniformemente Acelerado (MRUA)",
    formula: "v = v₀ + a·t\ns = s₀ + v₀·t + (a·t²)/2\nv² = v₀² + 2·a·Δs  ← Equação de Torricelli (sem t)\nVelocidade média: v̄ = (v₀ + v)/2  (válida só para MRUA)\nGráfico s×t: parábola  |  Gráfico v×t: reta (inclinação = a)",
    variaveis: { v: "velocidade final (m/s)", v0: "velocidade inicial (m/s)", a: "aceleração (m/s²) — constante no MRUA", t: "tempo (s)", s: "posição", "Δs": "deslocamento" },
    descricao: "Aceleração constante e diferente de zero. Torricelli elimina o tempo. Queda livre é MRUA com a=g≈10 m/s² (ou 9,8 m/s²).",
    observacoes: "Desaceleração: a e v têm sinais opostos. Alcance máximo de projétil em 45°. g=10 m/s² para o ENEM (salvo indicação).",
    exemplo: "Freada: v₀=20m/s, v=0, a=-4m/s² → v²=v₀²+2aΔs → 0=400-8Δs → Δs=50m",
    enem_frequencia: "alta",
    tags: ["mrua", "aceleracao", "queda livre", "torricelli", "movimento acelerado", "desaceleracao", "cinematica", "mruv", "equacoes horarias"],
  },
  {
    id: "fis-lancamento",
    materia: "fisica", topico: "Cinemática", subtopico: "Lançamento",
    nome: "Lançamentos (Oblíquo e Horizontal)",
    formula: "Lançamento horizontal (v₀ vertical=0):\n  x = v₀·t  (horizontal, MRU)\n  y = g·t²/2  (vertical, MRUA a partir do repouso)\n\nLançamento oblíquo (ângulo θ):\n  v₀x = v₀·cos θ  (componente horizontal — MRU)\n  v₀y = v₀·sen θ  (componente vertical — MRUA)\n  Altura máxima: H = v₀y² / (2g)\n  Alcance máximo: R = v₀²·sen(2θ) / g  →  máximo em θ=45°\n  Tempo de subida = Tempo de descida = v₀y/g",
    variaveis: { v0: "velocidade inicial total", theta: "ângulo de lançamento", g: "gravidade ≈ 10 m/s²", H: "altura máxima", R: "alcance horizontal" },
    descricao: "O lançamento oblíquo é a composição de MRU horizontal + MRUA vertical. As componentes são independentes entre si.",
    enem_frequencia: "alta",
    tags: ["lancamento obliquo", "lancamento horizontal", "projetil", "alcance", "altura maxima", "componente", "cinematica bidimensional"],
  },

  // ── Dinâmica ─────────────────────────────────────────────────────────────────
  {
    id: "fis-newton",
    materia: "fisica", topico: "Dinâmica", subtopico: "Leis de Newton",
    nome: "Leis de Newton",
    formula: "1ª Lei (Inércia): F_resultante = 0 ↔ aceleração = 0 (repouso ou MRU)\n2ª Lei (Força): F = m·a  →  ΣF = m·a (resultante)\n3ª Lei (Ação-Reação): F_AB = -F_BA (mesma intensidade, sentidos opostos, corpos diferentes)\n\nPeso: P = m·g\nNormal (superfície horizontal): N = P = m·g  (sem aceleração vertical)\nAtrito: f = μ·N  (μ = coef. atrito; f_est_max = μ_e·N; f_cin = μ_c·N)",
    variaveis: { F: "força (N = kg·m/s²)", m: "massa (kg)", a: "aceleração (m/s²)", g: "gravidade ≈ 10 m/s²", mu: "coeficiente de atrito", N: "força normal" },
    descricao: "A 2ª Lei relaciona causa (força resultante) e efeito (aceleração). Para resolver: desenhe o diagrama de forças e aplique ΣF=ma em cada eixo.",
    observacoes: "Atrito estático ≤ μe·N. Quando o objeto desliza, usa-se atrito cinético μc·N (geralmente μc < μe).",
    enem_frequencia: "alta",
    tags: ["newton", "lei de newton", "forca", "massa", "aceleracao", "peso", "normal", "atrito", "inercia", "dinamica", "resultante"],
  },
  {
    id: "fis-energia",
    materia: "fisica", topico: "Dinâmica", subtopico: "Trabalho e Energia",
    nome: "Trabalho, Energia e Potência",
    formula: "Trabalho: W = F·d·cos θ  (θ = ângulo entre F e deslocamento)\nEnergia cinética: Ec = m·v²/2\nEnergia potencial gravitacional: Ep = m·g·h\nEnergia potencial elástica: Ee = k·x²/2  (k=constante da mola, x=deformação)\nConservação de energia mecânica (sem atrito): Ec + Ep = constante\nTeoreme trabalho-energia: W_resultante = ΔEc = Ec_final - Ec_inicial\nPotência: P = W/t = F·v  (unidade: W=Watt=J/s)",
    variaveis: { W: "trabalho (J)", F: "força (N)", d: "deslocamento (m)", theta: "ângulo entre força e deslocamento", m: "massa (kg)", v: "velocidade (m/s)", h: "altura (m)", k: "constante elástica da mola (N/m)", x: "deformação (m)", P: "potência (W)" },
    descricao: "W>0: força favorece movimento. W<0: força opõe ao movimento. W=0: força perpendicular ao deslocamento (ex: força normal).",
    observacoes: "1 kW = 1000 W. 1 CV (cavalo-vapor) ≈ 736 W. Rendimento: η = P_útil/P_total × 100%",
    exemplo: "Bola m=0,5kg lançada de h=20m: Ec_max = m·g·h = 0,5·10·20 = 100J → v=√(2·100/0,5)=20m/s",
    enem_frequencia: "alta",
    tags: ["trabalho", "energia", "energia cinetica", "energia potencial", "potencia", "conservacao energia", "watt", "joule", "rendimento", "mola", "elastica"],
  },
  {
    id: "fis-impulso",
    materia: "fisica", topico: "Dinâmica", subtopico: "Impulso e Quantidade de Movimento",
    nome: "Impulso e Quantidade de Movimento (Momento Linear)",
    formula: "Quantidade de movimento: p = m·v\nImpulso: J = F·Δt = Δp = m·v_f - m·v_i\nConservação do momento (sem forças externas): p_total_antes = p_total_depois\n  m₁·v₁ + m₂·v₂ = m₁·v₁' + m₂·v₂'\nColisão perfeitamente inelástica: m₁·v₁ + m₂·v₂ = (m₁+m₂)·V\nColisão elástica: conserva energia E e momento p",
    variaveis: { p: "quantidade de movimento (kg·m/s)", m: "massa (kg)", v: "velocidade (m/s)", J: "impulso (N·s)", F: "força média", "Δt": "intervalo de tempo" },
    descricao: "Lei da Conservação do Momento: em sistema isolado (sem forças externas resultantes), o momento total se conserva.",
    observacoes: "Coeficiente de restituição e: e=1 (elástica), 0<e<1 (parcialmente inelástica), e=0 (perfeitamente inelástica).",
    enem_frequencia: "alta",
    tags: ["impulso", "momento", "quantidade de movimento", "colisao", "conservacao momento", "choque elastico", "choque inelastico"],
  },

  // ── Gravitação ───────────────────────────────────────────────────────────────
  {
    id: "fis-gravitacao",
    materia: "fisica", topico: "Gravitação", subtopico: "Lei da Gravitação Universal",
    nome: "Gravitação Universal e Leis de Kepler",
    formula: "Lei da Gravitação Universal: F = G·m₁·m₂/d²\nG = 6,67×10⁻¹¹ N·m²/kg²\nCampo gravitacional: g = G·M/r²  (g≈9,8 m/s² na superfície da Terra)\nVelocidade orbital: v = √(G·M/r)  (órbita circular)\n1ª Lei de Kepler: órbitas são elipses com o Sol num foco\n2ª Lei: áreas iguais em tempos iguais (conserva momento angular)\n3ª Lei: T²/r³ = constante → T₁²/r₁³ = T₂²/r₂³",
    variaveis: { G: "constante gravitacional universal", m1: "massa 1", m2: "massa 2", d: "distância entre centros", M: "massa do astro central", r: "raio da órbita", T: "período orbital" },
    descricao: "Força diminui com o quadrado da distância (lei do inverso do quadrado). A 3ª Lei de Kepler relaciona período e raio orbital.",
    enem_frequencia: "media",
    tags: ["gravitacao", "newton gravitacao", "campo gravitacional", "kepler", "orbita", "satelite", "periodo orbital", "velocidade orbital"],
  },

  // ── Termologia ───────────────────────────────────────────────────────────────
  {
    id: "fis-termologia",
    materia: "fisica", topico: "Termologia", subtopico: "Temperatura e Calor",
    nome: "Temperatura, Dilatação e Calor",
    formula: "Conversões de temperatura:\n  T_K = T_°C + 273  |  T_°C = (5/9)·(T_°F - 32)  |  T_°F = (9/5)·T_°C + 32\n\nDilatação linear: ΔL = L₀·α·ΔT\nDilatação superficial: ΔA = A₀·β·ΔT  (β ≈ 2α)\nDilatação volumétrica: ΔV = V₀·γ·ΔT  (γ ≈ 3α)\n\nCalor sensível: Q = m·c·ΔT\nCalor latente (mudança de fase): Q = m·L\nCalorimetria: Q_cedido = Q_recebido  →  m₁·c₁·ΔT₁ = m₂·c₂·ΔT₂",
    variaveis: { T: "temperatura", alpha: "coef. de dilatação linear", c: "calor específico (J/kg·°C)", L: "calor latente (J/kg)", m: "massa", "ΔT": "variação de temperatura" },
    descricao: "Água: c=4186 J/(kg·°C) ≈ 1 cal/(g·°C). Calor específico maior → mais difícil de aquecer/resfriar.",
    observacoes: "Fusão da água: L_f=334 kJ/kg. Vaporização: L_v=2260 kJ/kg. 0°C=273K.",
    enem_frequencia: "alta",
    tags: ["temperatura", "celsius", "kelvin", "fahrenheit", "calor", "dilatacao", "calorimetria", "calor especifico", "calor latente", "mudanca de fase", "fusao", "vaporizacao"],
  },
  {
    id: "fis-termodinamica",
    materia: "fisica", topico: "Termodinâmica", subtopico: "Leis da Termodinâmica",
    nome: "Leis da Termodinâmica",
    formula: "1ª Lei: ΔU = Q - W  (energia interna = calor absorvido - trabalho realizado)\nTrabalho de um gás: W = p·ΔV  (pressão constante = processo isobárico)\nProcessos:\n  Isotérmico (T=cte): p·V = cte (Lei de Boyle)\n  Isobárico (p=cte): V/T = cte (Lei de Charles-Gay-Lussac)\n  Isocórico (V=cte): p/T = cte\n  Adiabático (Q=0): ΔU = -W\nEquação de Clapeyron: p·V = n·R·T  (R=8,314 J/mol·K)\nEficiência de máquina térmica: η = W/Q_H = 1 - Q_C/Q_H = 1 - T_C/T_H",
    variaveis: { U: "energia interna (J)", Q: "calor trocado (J) — positivo se absorvido", W: "trabalho (J) — positivo se realizado pelo gás", p: "pressão (Pa)", V: "volume (m³)", T: "temperatura absoluta (K)", n: "quantidade (moles)", R: "constante dos gases", eta: "eficiência (0 a 1)" },
    descricao: "2ª Lei: calor flui espontaneamente do quente para o frio. Nunca se converte 100% de calor em trabalho (Kelvin). Entropia sempre aumenta em processos irreversíveis.",
    enem_frequencia: "alta",
    tags: ["termodinamica", "primeira lei", "segunda lei", "eficiencia", "maquina termica", "entropia", "ciclo de carnot", "isobarico", "isocórico", "isocórico", "isotermico", "adiabatico", "clapeyron", "gas perfeito"],
  },

  // ── Óptica ───────────────────────────────────────────────────────────────────
  {
    id: "fis-optica",
    materia: "fisica", topico: "Óptica", subtopico: "Reflexão e Refração",
    nome: "Óptica Geométrica — Espelhos e Lentes",
    formula: "Reflexão: θᵢ = θᵣ (ângulo de incidência = ângulo de reflexão)\nRefração — Lei de Snell: n₁·sen θ₁ = n₂·sen θ₂\nÍndice de refração: n = c/v  (c=3×10⁸ m/s no vácuo)\nEquação de Gauss (espelhos e lentes): 1/f = 1/p + 1/p'\nAumento linear: A = -p'/p  (A>0 → imagem direita; A<0 → imagem invertida)\nFoco de espelhos: f = R/2  (R=raio de curvatura)",
    variaveis: { n: "índice de refração", theta: "ângulo com a normal", f: "foco (distância focal)", p: "distância objeto ao vértice", "p'": "distância imagem ao vértice (p'>0 real; p'<0 virtual)", A: "aumento linear" },
    descricao: "Convenção de sinais: real=positivo, virtual=negativo. Lente convergente f>0; divergente f<0. Espelho côncavo f>0; convexo f<0.",
    observacoes: "Miopia: lente divergente. Hipermetropia: lente convergente. Potência da lente (Dioptrias): D = 1/f (f em metros).",
    enem_frequencia: "alta",
    tags: ["optica", "espelho", "lente", "reflexao", "refracao", "snell", "indice de refracao", "gauss", "convergente", "divergente", "miopia", "hipermetropia", "dioptria"],
  },

  // ── Eletricidade ─────────────────────────────────────────────────────────────
  {
    id: "fis-eletrostatica",
    materia: "fisica", topico: "Eletricidade", subtopico: "Eletrostática",
    nome: "Eletrostática",
    formula: "Lei de Coulomb: F = k·|q₁|·|q₂| / d²  (k=9×10⁹ N·m²/C²)\nCampo elétrico: E = F/q = k·Q/r²\nPotencial elétrico: V = k·Q/r\nTrabalho elétrico: W_AB = q·(V_A - V_B) = q·U_AB\nEnergia potencial elétrica: Ep = q·V",
    variaveis: { k: "constante eletrostática = 9×10⁹ N·m²/C²", q1: "carga 1 (Coulombs)", q2: "carga 2", d: "distância entre cargas", E: "campo elétrico (N/C)", V: "potencial elétrico (V=Volt)", F: "força elétrica (N)" },
    descricao: "Cargas iguais se repelem; cargas opostas se atraem. O campo aponta do positivo para o negativo. Próton: +e=+1,6×10⁻¹⁹C; Elétron: -1,6×10⁻¹⁹C.",
    enem_frequencia: "alta",
    tags: ["eletrostatica", "coulomb", "campo eletrico", "potencial eletrico", "carga", "eletron", "proton", "forca eletrica"],
  },
  {
    id: "fis-circuitos",
    materia: "fisica", topico: "Eletricidade", subtopico: "Circuitos Elétricos",
    nome: "Eletrodinâmica — Circuitos",
    formula: "Lei de Ohm: V = R·i  (U = R·I)\nResistência: R = ρ·L/A  (ρ=resistividade, L=comprimento, A=seção)\nPotência elétrica: P = V·i = R·i² = V²/R\nEnergia elétrica: E = P·t  (kWh: 1 kWh = 3,6×10⁶ J)\nAssociação série: R_total = R₁+R₂+R₃  |  i igual em todos\nAssociação paralela: 1/R_total = 1/R₁+1/R₂+...  |  V igual em todos\nLeis de Kirchhoff: ΣV(malha)=0  |  ΣI(nó)=0",
    variaveis: { V: "tensão / ddp (Volt)", R: "resistência (Ω = Ohm)", i: "corrente (A = Ampere)", P: "potência (W)", rho: "resistividade (Ω·m)", L: "comprimento (m)", A: "área da seção (m²)" },
    descricao: "Circuitos: em série a corrente é igual; em paralelo a tensão é igual. Potência é fundamental para cálculo de conta de luz.",
    observacoes: "1 A = 1 C/s. Resistores iguais em paralelo: R_eq = R/n. Para dois resistores em paralelo: R_eq = R₁·R₂/(R₁+R₂).",
    enem_frequencia: "alta",
    tags: ["ohm", "circuito", "resistencia", "corrente", "tensao", "ddp", "voltagem", "potencia eletrica", "kwh", "serie", "paralelo", "kirchhoff"],
  },

  // ── Ondas e Som ──────────────────────────────────────────────────────────────
  {
    id: "fis-ondas",
    materia: "fisica", topico: "Ondas", subtopico: "Ondas e Som",
    nome: "Ondas e Som",
    formula: "Equação fundamental das ondas: v = λ·f  (velocidade = comprimento de onda × frequência)\nPeríodo: T = 1/f\nEfeito Doppler: f' = f·(v±v_obs)/(v∓v_fonte)\n  (+v_obs quando observador se aproxima da fonte)\n  (-v_fonte quando fonte se aproxima do observador)\nIntensidade sonora: I = P/(4πr²)  (diminui com r²)\nnível sonoro (dB): β = 10·log(I/I₀)  (I₀=10⁻¹² W/m²)",
    variaveis: { v: "velocidade da onda (m/s)", lambda: "comprimento de onda (m)", f: "frequência (Hz = 1/s)", T: "período (s)", "f'": "frequência percebida (Doppler)" },
    descricao: "Velocidade do som no ar ≈ 340 m/s. Luz no vácuo: c=3×10⁸ m/s. Ondas transversais: oscilação ⊥ propagação. Longitudinais: oscilação ∥ propagação (som).",
    enem_frequencia: "media",
    tags: ["onda", "som", "frequencia", "comprimento de onda", "velocidade onda", "periodo", "doppler", "decibel", "intensidade sonora", "ultrassom"],
  },

  // ── Física Moderna ───────────────────────────────────────────────────────────
  {
    id: "fis-moderna",
    materia: "fisica", topico: "Física Moderna", subtopico: "Quantização e Relatividade",
    nome: "Física Moderna",
    formula: "Energia do fóton: E = h·f = h·c/λ  (h=6,626×10⁻³⁴ J·s)\nEfeito fotoelétrico: E_c = h·f - φ  (φ=trabalho de extração)\nE=mc²: energia de repouso (m=massa, c=velocidade da luz)\nNúcleo atômico: Z=prótons (N.A.), A=Z+N (N.A.M.)\nMeia-vida (decaimento radioativo): N(t) = N₀·(1/2)^(t/T₁/₂)\nDualidade onda-partícula: λ = h/(m·v)  (comprimento de onda de De Broglie)",
    variaveis: { h: "constante de Planck = 6,626×10⁻³⁴ J·s", f: "frequência (Hz)", lambda: "comprimento de onda (m)", E: "energia (J ou eV)", phi: "função trabalho (eV)", "T1/2": "meia-vida", c: "velocidade da luz = 3×10⁸ m/s" },
    descricao: "1 eV = 1,6×10⁻¹⁹ J. Fóton com frequência maior tem mais energia. Radioatividade: decaimento alfa (perde He-4), beta (n→p+e), gama (radiação EM).",
    enem_frequencia: "media",
    tags: ["fisica moderna", "foton", "efeito fotoeletrico", "planck", "relatividade", "einstein", "meia vida", "radioatividade", "decaimento", "nucleo", "atomo", "quantizacao", "de broglie"],
  },

  // ── Hidrostática ─────────────────────────────────────────────────────────────
  {
    id: "fis-hidrostatica",
    materia: "fisica", topico: "Mecânica dos Fluidos", subtopico: "Hidrostática",
    nome: "Hidrostática e Hidrodinâmica",
    formula: "Pressão: p = F/A  (Pa = N/m²)  |  p_atm ≈ 10⁵ Pa = 1 atm\nPressão hidrostática: p = ρ·g·h\nPressão absoluta: p_abs = p_atm + p_man\nPrincípio de Arquimedes: E = ρ_fluido·V_submerso·g  (empuxo = peso do fluido deslocado)\nPrincípio de Pascal: p aplicada = p transmitida (prensa hidráulica)\nVazão (Equação da Continuidade): Q = A·v = constante\nEquação de Bernoulli: p + ρ·v²/2 + ρ·g·h = constante",
    variaveis: { p: "pressão (Pa)", F: "força (N)", A: "área (m²)", rho: "densidade do fluido (kg/m³)", h: "profundidade (m)", E: "empuxo (N)", Q: "vazão (m³/s)", v: "velocidade do fluido" },
    descricao: "Água: ρ=1000 kg/m³. Objeto flutua se ρ_objeto < ρ_fluido. Objeto afunda se ρ_objeto > ρ_fluido. Bernoulli: maior velocidade → menor pressão.",
    enem_frequencia: "media",
    tags: ["pressao", "hidrostatica", "arquimedes", "empuxo", "pascal", "flutuacao", "afundamento", "densidade", "fluido", "bernoulli", "vazao", "continuidade"],
  },
];

// ─── QUÍMICA ──────────────────────────────────────────────────────────────────
const quimica: Formula[] = [

  {
    id: "qui-estequiometria",
    materia: "quimica", topico: "Estequiometria", subtopico: "Cálculo Estequiométrico",
    nome: "Estequiometria",
    formula: "Número de Avogadro: Nₐ = 6,022×10²³ partículas/mol\nMassa molar (M): g/mol → soma das massas atômicas\nQuantidade de matéria: n = m/M  (moles = massa / massa molar)\nn = N/Nₐ  (moles = número de partículas / Avogadro)\n\nEstequiometria: coeficientes da equação balanceada → proporção em moles\nRendimento: % rendimento = (massa real / massa teórica)×100\nExcesso e limitante: calcule moles de cada reagente; identifique o limitante",
    variaveis: { n: "quantidade de matéria (mol)", m: "massa (g)", M: "massa molar (g/mol)", N: "número de partículas", Na: "6,022×10²³" },
    descricao: "Sempre balancear a equação antes. Proporção em moles = proporção dos coeficientes. 1 mol de qualquer gás ideal a CNTP (0°C, 1atm) ocupa 22,4 L.",
    observacoes: "Massas atômicas comuns: H=1, C=12, N=14, O=16, Na=23, Mg=24, Al=27, S=32, Cl=35,5, K=39, Ca=40, Fe=56, Cu=64, Zn=65, Br=80, Ag=108, I=127, Ba=137, Pb=207.",
    exemplo: "2H₂+O₂→2H₂O: 4g H₂ → n=4/2=2mol → reage com 1mol O₂=32g → produz 2mol H₂O=36g",
    enem_frequencia: "alta",
    tags: ["estequiometria", "mol", "mole", "massa molar", "avogadro", "reagente limitante", "rendimento", "balanceamento", "proporcao", "calculo quimico"],
  },
  {
    id: "qui-solucoes",
    materia: "quimica", topico: "Soluções", subtopico: "Concentração",
    nome: "Soluções — Concentração e Diluição",
    formula: "Concentração comum: C = m/V  (g/L)\nMolaridade (concentração molar): M = n/V = C/MM  (mol/L)\nDiluição: C₁·V₁ = C₂·V₂  (moles conservados)\nMistura de soluções: C_final = (C₁·V₁ + C₂·V₂) / (V₁+V₂)\nFração molar: x_i = n_i / n_total\nMolalidade (m): soluto em mol / solvente em kg\nConcentração em %: m/m = (m_soluto/m_solução)×100  |  v/v = (V_soluto/V_solução)×100",
    variaveis: { C: "concentração (g/L)", m: "massa do soluto (g)", V: "volume da solução (L)", M: "molaridade (mol/L)", MM: "massa molar (g/mol)", n: "moles de soluto" },
    descricao: "Diluição conserva a quantidade de soluto (moles). Ao adicionar água, a concentração cai. Sempre converter volume para litros.",
    exemplo: "Solução HCl: 36,5g em 500mL → C=73g/L; Molaridade=73/36,5=2mol/L",
    enem_frequencia: "alta",
    tags: ["solucao", "concentracao", "molaridade", "diluicao", "soluto", "solvente", "mol por litro", "gramas por litro", "fracao molar"],
  },
  {
    id: "qui-ph",
    materia: "quimica", topico: "Equilíbrio Químico", subtopico: "pH e pOH",
    nome: "pH, pOH e Equilíbrio Ácido-Base",
    formula: "pH = -log[H⁺] = -log[H₃O⁺]\npOH = -log[OH⁻]\npH + pOH = 14  (a 25°C)\n[H⁺]·[OH⁻] = Kw = 10⁻¹⁴  (produto iônico da água a 25°C)\nÁcido: pH < 7  |  Neutro: pH = 7  |  Base: pH > 7\nVariação de 1 unidade de pH → concentração muda 10×\nForça de ácidos/bases: Ka e Kb (constante de ionização)",
    variaveis: { "[H+]": "concentração de íons H⁺ (mol/L)", "[OH-]": "concentração de íons OH⁻ (mol/L)", Kw: "produto iônico da água = 10⁻¹⁴", Ka: "constante de ionização do ácido", Kb: "constante de ionização da base" },
    descricao: "pH escala de 0-14 (em soluções aquosas diluídas). pH 7 = neutro. Cada unidade é 10× mais ácido/básico. Indicadores mudam de cor com o pH.",
    exemplo: "HCl 0,01 mol/L (ácido forte): [H⁺]=0,01=10⁻² → pH=2. NaOH 0,1 mol/L: [OH⁻]=0,1=10⁻¹ → pOH=1 → pH=13.",
    enem_frequencia: "alta",
    tags: ["ph", "poh", "acido", "base", "acidez", "basicidade", "hidroxido", "neutralizacao", "kw", "ionizacao", "indicador", "escala de ph"],
  },
  {
    id: "qui-gases",
    materia: "quimica", topico: "Gases", subtopico: "Leis dos Gases",
    nome: "Leis dos Gases Ideais",
    formula: "Lei de Boyle (T=cte): p₁·V₁ = p₂·V₂\nLei de Charles (p=cte): V₁/T₁ = V₂/T₂  (T em Kelvin!)\nLei de Gay-Lussac (V=cte): p₁/T₁ = p₂/T₂\nLei Geral dos Gases: p₁·V₁/T₁ = p₂·V₂/T₂\nEquação de Clapeyron: p·V = n·R·T  (R=0,082 atm·L/mol·K = 8,314 J/mol·K)\nCNTP: T=0°C=273K, p=1atm → V_molar=22,4 L/mol",
    variaveis: { p: "pressão (atm ou Pa)", V: "volume (L ou m³)", T: "temperatura em Kelvin = °C + 273", n: "moles de gás", R: "constante dos gases" },
    descricao: "SEMPRE usar temperatura em Kelvin! CNTP = Condições Normais de T e P. CPTP (padrão) = 25°C=298K, 1 atm → V_molar ≈ 24,5 L/mol.",
    exemplo: "Gás ocupa 2L a 300K e 2atm. Na CNTP: p₁V₁/T₁=p₂V₂/T₂ → 2·2/300 = 1·V₂/273 → V₂≈3,64L",
    enem_frequencia: "alta",
    tags: ["gases", "lei boyle", "charles", "gay-lussac", "clapeyron", "gas ideal", "cntp", "volume molar", "pressao", "temperatura absoluta"],
  },
  {
    id: "qui-termoquimica",
    materia: "quimica", topico: "Termoquímica", subtopico: "Entalpia",
    formula: "ΔH = H_produtos - H_reagentes\nExotérmica: ΔH < 0 (libera calor)\nEndotérmica: ΔH > 0 (absorve calor)\nLei de Hess: ΔH_total = ΣΔH_etapas (independe do caminho)\nΔH°_rxn = ΣΔH°f(produtos) - ΣΔH°f(reagentes)\nEnergia de ligação: ΔH = Σ(E_ligações quebradas) - Σ(E_ligações formadas)",
    nome: "Termoquímica — Entalpia e Lei de Hess",
    variaveis: { "ΔH": "variação de entalpia (kJ/mol)", "ΔH°f": "entalpia de formação padrão", H: "entalpia do sistema" },
    descricao: "Hess: se você pode obter a reação somando/subtraindo outras reações, o ΔH soma/subtrai igualmente. Combustão completa gera CO₂ e H₂O.",
    enem_frequencia: "alta",
    tags: ["termoquimica", "entalpia", "hess", "exotermica", "endotermica", "calor reacao", "energia ligacao", "formacao padrao", "combustao"],
  },
  {
    id: "qui-eletroquimica",
    materia: "quimica", topico: "Eletroquímica", subtopico: "Pilhas e Eletrólise",
    nome: "Eletroquímica — Pilhas e Eletrólise",
    formula: "Pilha: E°_célula = E°_catodo - E°_anodo  (usando potencial de redução padrão)\nAnodo: oxidação (perda de elétrons — OILRIG: Oxidation Is Loss)\nCatodo: redução (ganho de elétrons — Reduction Is Gain)\nLeis de Faraday:\n  m = (M·i·t) / (n·F)  (F=96500 C/mol de elétrons)\nNernst (simplificado): E = E° - (RT/nF)·ln Q",
    variaveis: { E: "potencial (V)", m: "massa depositada/dissolvida (g)", M: "massa molar", i: "corrente (A)", t: "tempo (s)", n: "elétrons transferidos por mol", F: "constante de Faraday=96500 C/mol" },
    descricao: "Em pilhas: o polo negativo é o anodo (oxidação); o polo positivo é o catodo (redução). Em eletrólise: catodo (-) atrai cátions; anodo (+) atrai ânions.",
    observacoes: "Série de atividade: metais mais ativos (Li,K,Ca,Na…) são mais facilmente oxidados. Ouro e platina são muito nobres (difíceis de oxidar).",
    enem_frequencia: "media",
    tags: ["eletroquimica", "pilha", "eletrolise", "anodo", "catodo", "oxidacao", "reducao", "faraday", "potencial celula", "corrosao", "galvanico"],
  },
  {
    id: "qui-propriedades-coligativas",
    materia: "quimica", topico: "Soluções", subtopico: "Propriedades Coligativas",
    nome: "Propriedades Coligativas",
    formula: "Número de partículas: i = 1 + α·(q-1)  (fator de Van't Hoff; α=grau ionização, q=número de íons)\nEbulhioscopia (eleva T ebulição): ΔTe = Ke · m · i\nCrioscopia (abaixa T fusão): ΔTf = Kf · m · i\nOsmoscopia (pressão osmótica): π = M · R · T · i\nTonoscopia (baixa pressão vapor): Δp/p₀ = x_soluto",
    variaveis: { i: "fator de Van't Hoff", m: "molalidade (mol/kg)", Ke: "constante ebulhioscópica (°C·kg/mol)", Kf: "constante crioscópica", M: "molaridade", R: "constante dos gases", T: "temperatura (K)" },
    descricao: "Dependem apenas da QUANTIDADE de partículas dissolvidas, não da sua natureza. Eletrólitos têm i>1; não eletrólitos i=1.",
    exemplo: "NaCl → Na⁺ + Cl⁻: q=2, α≈1 → i=2. Para 1 mol de sacarose: i=1.",
    enem_frequencia: "media",
    tags: ["propriedades coligativas", "ebulhioscopia", "crioscopia", "osmose", "pressao osmotica", "tonoscopia", "van hoff", "eletrólito", "ponto de ebulicao", "ponto de fusao", "antigelo"],
  },
  {
    id: "qui-organica",
    materia: "quimica", topico: "Química Orgânica", subtopico: "Nomenclatura e Grupos Funcionais",
    nome: "Química Orgânica — Grupos Funcionais e Reações",
    formula: "Grupos funcionais:\n  Álcool: R-OH  (ex: etanol C₂H₅OH)\n  Aldeirdo: R-CHO\n  Cetona: R-CO-R'\n  Ácido carboxílico: R-COOH\n  Éster: R-COO-R'\n  Amina: R-NH₂\n  Amida: R-CO-NH₂\n  Éter: R-O-R'\n  Halogênio: R-X (X=F,Cl,Br,I)\n\nReações principais:\n  Combustão completa: CₓHᵧ + O₂ → CO₂ + H₂O\n  Esterificação: R-COOH + R'-OH ⇌ R-COO-R' + H₂O\n  Adição: C=C + XY → X-C-C-Y\n  Substituição: R-H + XY → R-X + HY (catalisador)",
    descricao: "Prefixo: met=1C, et=2C, prop=3C, but=4C, pent=5C, hex=6C, hept=7C, oct=8C, non=9C, dec=10C. -ano (simples), -eno (dupla), -ino (tripla).",
    observacoes: "Isômeros: mesma fórmula molecular, estruturas diferentes. Isomeria de cadeia, posição, função, metameria, tautomeria, geométrica (cis-trans), óptica (quiralidade).",
    enem_frequencia: "alta",
    tags: ["quimica organica", "alcool", "aldeido", "cetona", "acido carboxilico", "ester", "amina", "grupo funcional", "nomenclatura organica", "combustao", "esterificacao", "polimero", "isomeria", "carbono"],
  },
];

// ─── Banco Completo ───────────────────────────────────────────────────────────
export const BANCO_EXATAS: Formula[] = [...matematica, ...fisica, ...quimica];

// ─── Busca ────────────────────────────────────────────────────────────────────
/**
 * Busca fórmulas relevantes para a query.
 * Retorna até `limit` fórmulas ordenadas por relevância.
 */
export function searchExatas(
  query: string,
  opts?: { materia?: MateriaExatas; limit?: number }
): Formula[] {
  const limit = opts?.limit ?? 4;
  const q = query.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9\s]/g, " ");
  const words = q.split(/\s+/).filter(w => w.length > 2);

  if (words.length === 0) return [];

  // Filtra por matéria se especificada
  let pool = opts?.materia
    ? BANCO_EXATAS.filter(f => f.materia === opts.materia)
    : BANCO_EXATAS;

  // Scoring: pontuação por matches em campos diferentes
  const scored = pool.map(formula => {
    let score = 0;
    const searchFields = [
      formula.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " "),
      formula.topico.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " "),
      (formula.subtopico ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " "),
      formula.tags.join(" "),
      formula.descricao.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " "),
    ];

    for (const word of words) {
      for (let i = 0; i < searchFields.length; i++) {
        if (searchFields[i].includes(word)) {
          // Peso maior para nome e tags
          score += i === 0 ? 4 : i === 3 ? 3 : i === 1 ? 2 : 1;
        }
      }
      // Bônus para enem_frequencia alta
      if (formula.enem_frequencia === "alta") score += 0.5;
    }

    return { formula, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.formula);
}

/**
 * Formata fórmulas encontradas em bloco de texto para injeção em system prompt.
 */
export function formatExatasBlock(formulas: Formula[]): string {
  if (formulas.length === 0) return "";
  const lines = [
    "━━━ BANCO DE FÓRMULAS ENEM — EXATAS ━━━",
    "(Fórmulas curadas e verificadas — use exatamente como apresentadas)",
    "",
  ];
  for (const f of formulas) {
    lines.push(`📐 ${f.nome} [${f.materia.toUpperCase()}]`);
    lines.push(f.formula);
    if (f.variaveis) {
      const vars = Object.entries(f.variaveis).map(([k, v]) => `  ${k}: ${v}`).join("\n");
      lines.push(`Variáveis:\n${vars}`);
    }
    if (f.observacoes) lines.push(`Obs: ${f.observacoes}`);
    if (f.exemplo) lines.push(`Exemplo: ${f.exemplo}`);
    lines.push("");
  }
  return lines.join("\n");
}
