/**
 * material-style.ts
 * Sistema de temas dinâmicos para o Material Premium.
 * Seleciona paleta + estilo de imagem + densidade visual baseado em
 * matéria, nível de ensino e tópico/contexto.
 */

import type { UserStyleBias } from "./material-style-learning";
import { applyBiasToBaseTheme } from "./material-style-learning";

export type ThemeMode = "dark" | "light";

export type SelectedMaterialStyle = MaterialStyle & {
  decision: { reason: string; baseThemeId: MaterialStyle["themeId"] };
};

export type MaterialPalette = {
  bg: string; bg2: string; bg3: string;
  card: string; card2: string;
  border: string;
  text: string; text2: string; text3: string;
  accent: string;
  accent2: string;
  verde: string; azul: string; roxo: string;
  laranja: string; rosa: string; vermelho: string; ciano: string;
};

export type MaterialFonts = { display: string; body: string; code: string };

export type MaterialStyle = {
  themeName: string;
  themeId:
    | "dark-editorial"
    | "scientific-blueprint"
    | "lab-vibrant"
    | "clean-light"
    | "vintage-paper"
    | "natural-bright"
    | "kids-vibrant"
    | "magazine-bold";
  mode: ThemeMode;
  palette: MaterialPalette;
  fonts: MaterialFonts;
  imageStyle: string;        // descrição livre p/ instruir o LLM
  imageQueryHint: string;    // sufixo opcional para queries Unsplash ("cartoon", "watercolor"...)
  density: "image-heavy" | "chart-heavy" | "balanced" | "minimal-clean";
  vibe: string;              // descrição editorial p/ orientar o LLM
};

// ─── PALETAS PRÉ-DEFINIDAS ────────────────────────────────────────────────────

const PALETTES: Record<MaterialStyle["themeId"], MaterialPalette> = {
  // Padrão atual — escuro editorial Apple Books
  "dark-editorial": {
    bg: "#0F1117", bg2: "#161922", bg3: "#1E2230",
    card: "#1A1F2E", card2: "#222840",
    border: "rgba(255,255,255,0.08)",
    text: "#E8EAF0", text2: "#9BA3B8", text3: "#6B7494",
    accent: "#00C896", accent2: "#3B82F6",
    verde: "#00C896", azul: "#3B82F6", roxo: "#8B5CF6",
    laranja: "#F59E0B", rosa: "#EC4899", vermelho: "#EF4444", ciano: "#06B6D4",
  },
  // Exatas — navy + cyan + amber
  "scientific-blueprint": {
    bg: "#0A1628", bg2: "#0F1E33", bg3: "#16273F",
    card: "#132238", card2: "#1A2B45",
    border: "rgba(120,180,255,0.12)",
    text: "#E6EEFB", text2: "#9DB3D4", text3: "#6B82A8",
    accent: "#22D3EE", accent2: "#60A5FA",
    verde: "#10B981", azul: "#60A5FA", roxo: "#A78BFA",
    laranja: "#FBBF24", rosa: "#F472B6", vermelho: "#F87171", ciano: "#22D3EE",
  },
  // Química/lab — escuro neon
  "lab-vibrant": {
    bg: "#0F0F1E", bg2: "#16162A", bg3: "#1E1E36",
    card: "#1A1A2E", card2: "#232342",
    border: "rgba(167,139,250,0.15)",
    text: "#F1ECFB", text2: "#A8A0C8", text3: "#766F95",
    accent: "#A855F7", accent2: "#22D3EE",
    verde: "#10B981", azul: "#3B82F6", roxo: "#A855F7",
    laranja: "#F59E0B", rosa: "#EC4899", vermelho: "#EF4444", ciano: "#22D3EE",
  },
  // Light premium — Notion/Apple Pages
  "clean-light": {
    bg: "#FAFAF7", bg2: "#F4F4EE", bg3: "#EEEEE5",
    card: "#FFFFFF", card2: "#F8F8F3",
    border: "rgba(20,20,40,0.08)",
    text: "#1A1A2E", text2: "#4A4A66", text3: "#7A7A92",
    accent: "#0D9488", accent2: "#0369A1",
    verde: "#059669", azul: "#0369A1", roxo: "#7C3AED",
    laranja: "#D97706", rosa: "#DB2777", vermelho: "#DC2626", ciano: "#0891B2",
  },
  // Humanas/literatura — pergaminho + bordô
  "vintage-paper": {
    bg: "#F8F4EA", bg2: "#F0EAD6", bg3: "#E8DFC4",
    card: "#FFFCF3", card2: "#F4EFDC",
    border: "rgba(80,50,20,0.15)",
    text: "#2D1B0E", text2: "#5A4632", text3: "#8B7660",
    accent: "#8B2635", accent2: "#5C4033",
    verde: "#3F6212", azul: "#1E40AF", roxo: "#6B21A8",
    laranja: "#C2410C", rosa: "#9F1239", vermelho: "#991B1B", ciano: "#155E75",
  },
  // Biologia/geografia — natural light
  "natural-bright": {
    bg: "#F4F9F4", bg2: "#E9F3E9", bg3: "#DCEDDC",
    card: "#FFFFFF", card2: "#F0F8F0",
    border: "rgba(20,80,40,0.10)",
    text: "#0F2E1F", text2: "#3B5C49", text3: "#6B8478",
    accent: "#16A34A", accent2: "#0891B2",
    verde: "#16A34A", azul: "#0891B2", roxo: "#7C3AED",
    laranja: "#EA580C", rosa: "#DB2777", vermelho: "#DC2626", ciano: "#0891B2",
  },
  // Fundamental 1 — vibrante para crianças
  "kids-vibrant": {
    bg: "#FFFEF5", bg2: "#FFF8DC", bg3: "#FFEFC4",
    card: "#FFFFFF", card2: "#FFFAE5",
    border: "rgba(255,140,0,0.20)",
    text: "#1F2937", text2: "#4B5563", text3: "#6B7280",
    accent: "#F97316", accent2: "#EC4899",
    verde: "#22C55E", azul: "#3B82F6", roxo: "#A855F7",
    laranja: "#F97316", rosa: "#EC4899", vermelho: "#EF4444", ciano: "#06B6D4",
  },
  // Magazine bold — artes/atualidades
  "magazine-bold": {
    bg: "#FFFFFF", bg2: "#F5F5F5", bg3: "#EAEAEA",
    card: "#FFFFFF", card2: "#FAFAFA",
    border: "rgba(0,0,0,0.10)",
    text: "#0A0A0A", text2: "#404040", text3: "#737373",
    accent: "#DC2626", accent2: "#0A0A0A",
    verde: "#16A34A", azul: "#2563EB", roxo: "#9333EA",
    laranja: "#EA580C", rosa: "#DB2777", vermelho: "#DC2626", ciano: "#0891B2",
  },
};

const FONTS: Record<MaterialStyle["themeId"], MaterialFonts> = {
  "dark-editorial":       { display: "'Playfair Display',serif",   body: "'DM Sans',sans-serif",     code: "'JetBrains Mono',monospace" },
  "scientific-blueprint": { display: "'Space Grotesk',sans-serif", body: "'Inter',sans-serif",       code: "'JetBrains Mono',monospace" },
  "lab-vibrant":          { display: "'Space Grotesk',sans-serif", body: "'Inter',sans-serif",       code: "'JetBrains Mono',monospace" },
  "clean-light":          { display: "'Fraunces',serif",           body: "'Inter',sans-serif",       code: "'JetBrains Mono',monospace" },
  "vintage-paper":        { display: "'Playfair Display',serif",   body: "'Lora',serif",             code: "'IBM Plex Mono',monospace"  },
  "natural-bright":       { display: "'Fraunces',serif",           body: "'Inter',sans-serif",       code: "'JetBrains Mono',monospace" },
  "kids-vibrant":         { display: "'Fredoka',sans-serif",       body: "'Nunito',sans-serif",      code: "'Fira Code',monospace"      },
  "magazine-bold":        { display: "'Archivo Black',sans-serif", body: "'Inter',sans-serif",       code: "'JetBrains Mono',monospace" },
};

// ─── HEURÍSTICAS DE NORMALIZAÇÃO ──────────────────────────────────────────────

function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

type GradeLevel = "fund1" | "fund2" | "medio" | "vestibular" | "superior" | "eja" | "default";

function detectGrade(nivel: string): GradeLevel {
  const n = normalize(nivel);
  // Mais específicos primeiro (evita falsos positivos)
  if (/vestibular|\benem\b|fuvest|unicamp|\bita\b|\bime\b|pre.?vestibular/.test(n)) return "vestibular";
  if (/superior|graduac|universit|faculdade|pos.?graduac|mestrado|doutorado/.test(n)) return "superior";
  if (/\beja\b|jovens.?adultos/.test(n)) return "eja";
  if (/\bensino\s*medio\b|\bmedio\b|\b2o.?grau\b|\be\.?m\.?\b|[123].?\s*ano.?(ensino.?medio|medio|em)/.test(n)) return "medio";
  if (/(fundamental|fund\.?)\s*(2|ii\b)|6.?\s*ano|7.?\s*ano|8.?\s*ano|9.?\s*ano/.test(n)) return "fund2";
  // Fund1 só com contexto EXPLÍCITO (evita falso positivo tipo "3º ano EM")
  if (/(fundamental|fund\.?)\s*(1|i\b)|anos\s*iniciais|1.?\s*ao?\s*5|\binfantil\b|alfabetiz/.test(n)) return "fund1";
  return "default";
}

type Subject =
  | "matematica" | "fisica" | "quimica" | "biologia" | "ciencias"
  | "historia" | "geografia" | "filosofia" | "sociologia"
  | "portugues" | "literatura" | "redacao" | "ingles" | "espanhol"
  | "artes" | "ed-fisica" | "musica" | "computacao" | "geral";

function detectSubject(materia: string, topico: string): Subject {
  const m = normalize(`${materia} ${topico}`);
  if (/\bmatematic|algebra|geometria|trigonom|calculo|funcao quadratic|equacao|estatistic|probabili|aritmetic/.test(m)) return "matematica";
  if (/\bfisica|cinematic|dinamic|termodinamic|eletromagnet|optic|mecanic|ondas|circuito/.test(m)) return "fisica";
  if (/\bquimica|atomo|molecul|reacao|organic|inorganic|estequiom|periodic|ph |acido |base /.test(m)) return "quimica";
  if (/\bbiologia|celul|genetic|evoluc|ecolog|botanic|zoolog|fisiolog|fotossintes|dna |rna /.test(m)) return "biologia";
  if (/\bciencias|natureza\b/.test(m)) return "ciencias";
  if (/\bhistoria|brasil colon|imperio|republica|guerra|revoluc|idade media|antigui|medieval/.test(m)) return "historia";
  if (/\bgeografi|clima|relevo|hidrograf|urbaniz|globaliz|biomas|cartograf|geopolitic/.test(m)) return "geografia";
  if (/\bfilosofia|filosof|etica|metafisic|epistemolog|socrat|platao|kant|nietzsche/.test(m)) return "filosofia";
  if (/\bsociolog|antropolog|cultura\s+popular|cultura\s+brasil|sociedade|cidadan|movimento\s+social|relac[oõ]es\s+sociais/.test(m)) return "sociologia";
  if (/\bportugues|gramatic|sintax|morfolog|fonetic|ortograf/.test(m)) return "portugues";
  if (/\bliteratur|romantismo|realismo|modernismo|machado|drummond|clarice|barroco|arcad/.test(m)) return "literatura";
  if (/\bredacao|dissertac|argumentat|texto.?motivad/.test(m)) return "redacao";
  if (/\bingles|english|grammar/.test(m)) return "ingles";
  if (/\bespanhol|spanish|castellano/.test(m)) return "espanhol";
  if (/\bartes|pintura|escultura|musica visual|design grafico|cinema/.test(m)) return "artes";
  if (/educacao fisica|esporte|atletism/.test(m)) return "ed-fisica";
  if (/\bmusica|ritmo|harmonia|melodia/.test(m)) return "musica";
  if (/computac|programac|algoritm|software|tecnologia da informac/.test(m)) return "computacao";
  return "geral";
}

// ─── PICKER PRINCIPAL ─────────────────────────────────────────────────────────

export function selectMaterialStyle(opts: {
  materia?: string;
  nivel?: string;
  topico?: string;
  contexto?: string;
  userBias?: UserStyleBias;
  forceThemeId?: MaterialStyle["themeId"];
}): SelectedMaterialStyle {
  const materia = opts.materia ?? "";
  const nivel   = opts.nivel ?? "";
  const topico  = opts.topico ?? "";
  const contexto = opts.contexto ?? "";

  const grade   = detectGrade(nivel);
  const subject = detectSubject(materia, topico);
  const hint    = normalize(`${topico} ${contexto}`);

  // ── Decisão de tema ────────────────────────────────────────────────────────
  let themeId: MaterialStyle["themeId"];
  let imageStyle: string;
  let imageQueryHint: string;
  let density: MaterialStyle["density"];

  // 1) Fundamental 1 sempre vai pra kids-vibrant
  if (grade === "fund1") {
    themeId = "kids-vibrant";
    imageStyle = "ilustração cartoon colorida e amigável (estilo livro infantil), traços simples e expressivos";
    imageQueryHint = "cartoon-illustration";
    density = "image-heavy";
  }
  // 2) Decisão por matéria
  else {
    switch (subject) {
      case "matematica":
      case "fisica":
      case "computacao":
        themeId = "scientific-blueprint";
        density = "chart-heavy";
        imageStyle = grade === "fund2"
          ? "diagramas técnicos limpos com toques ilustrados"
          : "diagramas técnicos editoriais e fotografias realistas de laboratório";
        imageQueryHint = "diagram-technical";
        break;
      case "quimica":
        themeId = "lab-vibrant";
        density = "chart-heavy";
        imageStyle = "fotografias macro de reações químicas, cristais, moléculas em 3D renderizadas";
        imageQueryHint = "chemistry-laboratory";
        break;
      case "biologia":
      case "ciencias":
      case "geografia":
        themeId = "natural-bright";
        density = "image-heavy";
        imageStyle = grade === "fund2"
          ? "fotografias naturais vibrantes e ilustrações científicas amigáveis"
          : "fotografias naturais editoriais de alta qualidade (estilo National Geographic)";
        imageQueryHint = subject === "geografia" ? "landscape-aerial" : "nature-macro";
        break;
      case "historia":
      case "filosofia":
      case "sociologia":
      case "literatura":
        themeId = "vintage-paper";
        density = "image-heavy";
        imageStyle = "fotografias históricas em sépia, pinturas clássicas, retratos de época, documentos antigos";
        imageQueryHint = "historical-vintage";
        break;
      case "portugues":
      case "redacao":
        themeId = "clean-light";
        density = "balanced";
        imageStyle = "fotografias editoriais elegantes, tipografia em destaque, livros e cenas de leitura";
        imageQueryHint = "books-reading";
        break;
      case "ingles":
      case "espanhol":
        themeId = "magazine-bold";
        density = "balanced";
        imageStyle = "fotografias urbanas vibrantes de cidades anglo/hispânicas, cenas culturais autênticas";
        imageQueryHint = "city-culture";
        break;
      case "artes":
      case "musica":
        themeId = "magazine-bold";
        density = "image-heavy";
        imageStyle = "obras de arte de alta resolução, fotografia artística de galeria";
        imageQueryHint = "fine-art";
        break;
      case "ed-fisica":
        themeId = "natural-bright";
        density = "image-heavy";
        imageStyle = "fotografias dinâmicas de esportes em alta velocidade";
        imageQueryHint = "sports-action";
        break;
      default:
        themeId = "dark-editorial";
        density = "balanced";
        imageStyle = "fotografias editoriais sofisticadas em alta resolução";
        imageQueryHint = "";
    }
  }

  // 3) Override por nível superior — mais limpo e técnico
  if (grade === "superior" && themeId === "kids-vibrant") {
    themeId = "clean-light";
    imageStyle = "fotografias editoriais sóbrias e diagramas técnicos";
    imageQueryHint = "editorial";
    density = "balanced";
  }

  // 4) Hints do tópico/contexto
  if (/\b(infograf|visual|imagens|fotos)\b/.test(hint)) density = "image-heavy";
  if (/\b(grafic|dados|estatistic|tabela|numero)\b/.test(hint)) density = "chart-heavy";
  if (/\b(resumo|ficha|sintese|esquematic|minim)\b/.test(hint)) density = "minimal-clean";
  if (/\b(cartoon|infantil|divertid|colorid|criativo)\b/.test(hint) && grade !== "superior") {
    imageQueryHint = "cartoon-illustration";
    imageStyle = "ilustrações cartoon coloridas e divertidas";
  }
  if (/\b(realist|profissional|editorial|premium)\b/.test(hint)) {
    imageQueryHint = "editorial-realistic";
    imageStyle = "fotografias realistas editoriais de alta qualidade";
  }

  // 5) APRENDIZADO ADAPTATIVO: aplica bias do usuário ou override forçado
  const baseThemeId = themeId;
  let decisionReason = "base";
  if (opts.forceThemeId) {
    themeId = opts.forceThemeId;
    decisionReason = `forced(${opts.forceThemeId})`;
  } else if (opts.userBias) {
    const biased = applyBiasToBaseTheme(baseThemeId, opts.userBias);
    if (biased.themeId !== baseThemeId) {
      themeId = biased.themeId;
      decisionReason = biased.reason;
    } else {
      decisionReason = biased.reason;
    }
  }

  const palette = PALETTES[themeId];
  const fonts = FONTS[themeId];
  const mode: ThemeMode = ["dark-editorial", "scientific-blueprint", "lab-vibrant"].includes(themeId) ? "dark" : "light";

  const themeNames: Record<MaterialStyle["themeId"], string> = {
    "dark-editorial": "Apple Books Editorial Escuro",
    "scientific-blueprint": "Blueprint Científico (navy + cyan)",
    "lab-vibrant": "Laboratório Neon (roxo + ciano)",
    "clean-light": "Premium Clean (claro)",
    "vintage-paper": "Pergaminho Vintage (sépia + bordô)",
    "natural-bright": "Natural Bright (verde + areia)",
    "kids-vibrant": "Vibrante Infantil (laranja + rosa)",
    "magazine-bold": "Magazine Bold (preto + vermelho)",
  };

  const vibes: Record<MaterialStyle["themeId"], string> = {
    "dark-editorial": "Apple Books / Khan Academy avançado — sofisticado, denso, tecnológico",
    "scientific-blueprint": "Caderno técnico de engenharia — precisão, grids azuis, dados em destaque",
    "lab-vibrant": "Editorial científico moderno — molecular, neon, energético",
    "clean-light": "Notion / Apple Pages — limpo, premium, foco no conteúdo, máxima legibilidade",
    "vintage-paper": "Livro clássico encadernado — sépia, tipografia serifada, ilustrações de época",
    "natural-bright": "National Geographic / Khan Academy claro — verde-natureza, fotografias vibrantes",
    "kids-vibrant": "Livro didático infantil — alegre, cores quentes, tipografia arredondada, emojis grandes",
    "magazine-bold": "Magazine editorial bold — preto/branco/vermelho, tipografia impactante, fotos cheias",
  };

  return {
    themeName: themeNames[themeId],
    themeId,
    mode,
    palette,
    fonts,
    imageStyle,
    imageQueryHint,
    density,
    vibe: vibes[themeId],
    decision: { reason: decisionReason, baseThemeId },
  };
}

// ─── HELPERS PARA CSS / INSTRUCTIONS ──────────────────────────────────────────

/**
 * Gera bloco CSS de override para injetar APÓS o MATERIAL_CSS base.
 * Sobrepõe as CSS variables e ajustes específicos de modo claro.
 */
export function buildStyleOverrideCSS(style: MaterialStyle): string {
  const p = style.palette;
  const f = style.fonts;

  // Carregar fonts específicas do tema (Google Fonts)
  const googleFontFamilies = (() => {
    const set = new Set<string>();
    [f.display, f.body, f.code].forEach(ff => {
      const name = ff.split(",")[0].replace(/['"]/g, "").trim();
      if (!["serif", "sans-serif", "monospace"].includes(name)) {
        set.add(name);
      }
    });
    const families = Array.from(set).map(n => n.replace(/\s+/g, "+") + ":wght@400;600;700;900").join("&family=");
    return families ? `<link href="https://fonts.googleapis.com/css2?family=${families}&display=swap" rel="stylesheet">` : "";
  })();

  const isLight = style.mode === "light";
  const gridOpacity = isLight ? "0.04" : "0.025";
  const gridStroke = isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)";
  const heroGradient = isLight
    ? `radial-gradient(ellipse 80% 60% at 60% 40%, ${hexA(p.accent, 0.10)} 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 20% 80%, ${hexA(p.accent2, 0.08)} 0%, transparent 55%)`
    : `radial-gradient(ellipse 80% 60% at 60% 40%, ${hexA(p.accent, 0.12)} 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 20% 80%, ${hexA(p.accent2, 0.10)} 0%, transparent 55%)`;

  return `${googleFontFamilies}
<style>
  :root {
    --verde:${p.verde}; --verde-esc:${darken(p.verde, 0.2)}; --azul:${p.azul}; --roxo:${p.roxo};
    --laranja:${p.laranja}; --rosa:${p.rosa}; --vermelho:${p.vermelho}; --ciano:${p.ciano};
    --bg:${p.bg}; --bg2:${p.bg2}; --bg3:${p.bg3}; --card:${p.card}; --card2:${p.card2};
    --border:${p.border}; --text:${p.text}; --text2:${p.text2}; --text3:${p.text3};
    --fonte-display:${f.display}; --fonte-body:${f.body}; --fonte-code:${f.code};
    --accent:${p.accent}; --accent-2:${p.accent2};
  }
  /* Overrides de modo claro / texturas */
  .hero-bg { background: ${heroGradient} !important; }
  .hero-grid {
    background-image: linear-gradient(${isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.025)"} 1px,transparent 1px),
                      linear-gradient(90deg, ${isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.025)"} 1px,transparent 1px) !important;
  }
  .sidebar::-webkit-scrollbar-thumb { background: ${p.accent} !important; }
  .btn-primary {
    background: linear-gradient(135deg, ${p.accent} 0%, ${darken(p.accent, 0.25)} 100%) !important;
    color: ${isLight ? "#FFFFFF" : "#0F1117"} !important;
    box-shadow: 0 4px 20px ${hexA(p.accent, 0.35)} !important;
  }
  .btn-primary:hover { box-shadow: 0 8px 30px ${hexA(p.accent, 0.45)} !important; }
  .hero h1 .destaque { background: linear-gradient(135deg, ${p.accent} 0%, ${p.accent2} 100%) !important; -webkit-background-clip: text !important; background-clip: text !important; -webkit-text-fill-color: transparent !important; }
  .nav-item:hover { color: ${p.accent} !important; background: ${hexA(p.accent, 0.06)} !important; border-left-color: ${p.accent} !important; }
  .nav-item.active { color: ${p.accent} !important; background: ${hexA(p.accent, 0.10)} !important; border-left-color: ${p.accent} !important; }
  .progress-bar { background: linear-gradient(90deg, ${p.accent}, ${p.rosa}, ${p.laranja}) !important; }
  /* Grid SVG line color (canvas dos simuladores) — ajusta para tema */
  ${isLight ? `
  .quiz .opcao { background: ${p.bg3} !important; }
  .formula-box { background: ${p.bg3} !important; }
  .coef-table th, .tabela th, .tabela-sinal th { background: ${p.bg3} !important; }
  .ex-num { background: linear-gradient(135deg, ${p.roxo}, ${p.rosa}) !important; }
  ` : ""}
</style>`;
}

// ─── HELPERS DE COR ───────────────────────────────────────────────────────────

function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function darken(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = Math.max(0, Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ─── BLOCO DE INSTRUÇÕES DINÂMICAS ────────────────────────────────────────────

/**
 * Bloco a ser PREPENDED no system prompt do LLM, descrevendo o estilo escolhido.
 * Substitui as regras estéticas hardcoded de tema escuro do MATERIAL_HTML_INSTRUCTIONS.
 */
export function buildStyleInstructions(style: MaterialStyle): string {
  const densityRules = (() => {
    switch (style.density) {
      case "image-heavy":
        return `- DENSIDADE: IMAGE-HEAVY → MÍNIMO **6 imagens** reais (Unsplash) bem distribuídas + apenas 1 gráfico opcional. Capa com imagem ampla. Quase toda seção tem ao menos 1 figura.`;
      case "chart-heavy":
        return `- DENSIDADE: CHART-HEAVY → MÍNIMO **3 gráficos SVG** (barras, linha, pizza), MÍNIMO **2 tabelas estilizadas**, simulador interativo OBRIGATÓRIO se o tema permitir. Imagens são opcionais (1-2 no máximo).`;
      case "minimal-clean":
        return `- DENSIDADE: MINIMAL-CLEAN → poucos elementos, muito espaço em branco, foco na tipografia e conteúdo essencial. Máximo 2 imagens, sem simulador, callouts pontuais.`;
      case "balanced":
      default:
        return `- DENSIDADE: BALANCED → 3-4 imagens, 1-2 gráficos, 2 quizzes, 2 exercícios, callouts variados.`;
    }
  })();

  const queryHint = style.imageQueryHint
    ? `- Para Unsplash, ANEXE o sufixo "${style.imageQueryHint}" às queries quando fizer sentido (ex: "https://source.unsplash.com/1200x600/?mitochondria-cell,${style.imageQueryHint}") para garantir o estilo visual desejado.`
    : `- Use queries Unsplash naturais (sem sufixo de estilo).`;

  const modeNote = style.mode === "light"
    ? `- TEMA CLARO: textos escuros sobre fundo claro. Sombras devem ser sutis. Callouts mantêm cores vibrantes mas com fundo levemente tingido (já tratado no CSS).`
    : `- TEMA ESCURO: textos claros sobre fundo escuro. Use brilhos sutis e gradientes de luz nas seções hero.`;

  return `
ESTÉTICA ESCOLHIDA AUTOMATICAMENTE PARA ESSE MATERIAL:

🎨 TEMA: **${style.themeName}**
   Vibe: ${style.vibe}
   Modo: ${style.mode === "light" ? "CLARO" : "ESCURO"}

🎨 PALETA (já injetada via CSS variables — apenas USE as classes do template, NÃO sobrescreva cores hardcoded):
   - Accent principal: ${style.palette.accent}  |  Accent secundário: ${style.palette.accent2}
   - Background: ${style.palette.bg}  |  Texto: ${style.palette.text}
   - Auxiliares (cards, callouts, gráficos): verde ${style.palette.verde}, azul ${style.palette.azul}, roxo ${style.palette.roxo}, laranja ${style.palette.laranja}, rosa ${style.palette.rosa}, vermelho ${style.palette.vermelho}

🖼️ ESTILO DE IMAGEM: ${style.imageStyle}
${queryHint}

📊 DENSIDADE VISUAL:
${densityRules}

⚠️ SUBSTITUIÇÃO OBRIGATÓRIA DE CORES — os exemplos do guia abaixo trazem hex do tema escuro padrão (#00C896, #0F1117, #1E2230, #1A1F2E, #E8EAF0, #9BA3B8, rgba(255,255,255,*)). VOCÊ DEVE substituí-los pela paleta atual ao reproduzir os snippets:
   - #00C896  → ${style.palette.accent}
   - #3B82F6  → ${style.palette.azul}
   - #8B5CF6  → ${style.palette.roxo}
   - #F59E0B  → ${style.palette.laranja}
   - #EC4899  → ${style.palette.rosa}
   - #EF4444  → ${style.palette.vermelho}
   - #0F1117 / #1E2230 / #1A1F2E → ${style.palette.bg} / ${style.palette.bg3} / ${style.palette.card}
   - #E8EAF0 (texto)  → ${style.palette.text}
   - #9BA3B8 (texto2) → ${style.palette.text2}
   - rgba(255,255,255,X) (grid/eixos) → ${style.mode === "light" ? "rgba(0,0,0,X)" : "rgba(255,255,255,X)"}

📐 GRÁFICOS SVG e CANVAS dos simuladores:
   - Cor das linhas de grid: ${style.mode === "light" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)"}
   - Cor dos eixos: ${style.mode === "light" ? "rgba(0,0,0,0.20)" : "rgba(255,255,255,0.20)"}
   - Cor de fundo do canvas (ctx.fillStyle inicial): ${style.palette.bg3}
   - Cor da curva principal: ${style.palette.accent}

${modeNote}

⚠️ NÃO mencione paleta nem tema na saída — apenas APLIQUE.
`;
}
