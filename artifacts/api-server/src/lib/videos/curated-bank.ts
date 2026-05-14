/**
 * lib/videos/curated-bank.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Banco curado de fallback — usado quando o YouTube Data API não está
 * configurado (`YOUTUBE_API_KEY` ausente) OU quando a busca não retorna nada
 * relevante. Cada entrada cobre um tópico de alta frequência em ENEM /
 * vestibular / BNCC, com 2-3 vídeo IDs hand-picked.
 *
 * Filosofia:
 *   - Embed-only. IDs apontam para vídeos públicos de canais brasileiros
 *     confiáveis. A renderização final é via `youtube-nocookie.com/embed/{id}`.
 *   - Best-effort: se um ID estiver errado/privatizado, o `<iframe>` ainda
 *     carrega — só mostra "vídeo indisponível". A busca real do YouTube cobre
 *     o caso geral; este banco é a rede de segurança.
 *
 * Matching:
 *   - Fuzzy keyword match no `topic` + lista de `aliases`. Stop-words PT-BR
 *     são removidas antes do match. Acentuação é normalizada (NFD + strip).
 *
 * Para adicionar tópico:
 *   1. Pegar 2-3 vídeos de canais já na whitelist (`trusted-channels.ts`)
 *      com Confiabilidade alta (Khan Academy BR, Curso Enem Gratuito, etc.).
 *   2. Adicionar uma entrada com `videoIds`, `channelHint`, `aliases`.
 */

import { hydrateVideo, type YouTubeVideo } from "./youtube-search";

interface CuratedTopic {
  topic: string;
  aliases?: string[];
  /** Matéria / área — usado para mostrar contexto ao aluno. */
  subject:
    | "matematica"
    | "fisica"
    | "quimica"
    | "biologia"
    | "historia"
    | "geografia"
    | "portugues"
    | "redacao"
    | "filosofia"
    | "sociologia";
  videoIds: string[];
  channelHint: string;
}

// ⚠️ IDs abaixo são best-effort de canais educacionais brasileiros. Se algum
// ID estiver desatualizado, o iframe simplesmente exibe "vídeo indisponível"
// e o caller cai para a próxima entrada / busca por API.
const BANK: CuratedTopic[] = [
  // ── Matemática ───────────────────────────────────────────────────────────
  {
    topic: "função quadrática",
    aliases: ["funcao quadratica", "função do 2º grau", "parábola", "vertice", "bhaskara"],
    subject: "matematica",
    videoIds: ["EHkzM34Y0FE", "Q6oHkRy_jKM", "1apoBzM3xQg"],
    channelHint: "Khan Academy Brasil",
  },
  {
    topic: "função afim",
    aliases: ["funcao afim", "função do 1º grau", "função linear", "reta"],
    subject: "matematica",
    videoIds: ["mLxhowB3v1g", "Yfsfh3ZbXmA"],
    channelHint: "Matemática Rio com Prof. Rafael Procopio",
  },
  {
    topic: "trigonometria",
    aliases: ["seno cosseno tangente", "ciclo trigonométrico", "razões trigonométricas"],
    subject: "matematica",
    videoIds: ["6KBC2H6tQNo", "iCKwxXjFmkA"],
    channelHint: "Equaciona Com Paulo Pereira",
  },
  {
    topic: "geometria espacial",
    aliases: ["solidos geometricos", "prisma pirâmide cone", "volume sólido"],
    subject: "matematica",
    videoIds: ["DmpZQB0BAWA", "iN1Wh2t3JcQ"],
    channelHint: "Dicasdemat - Sandro Curió",
  },
  {
    topic: "probabilidade",
    aliases: ["probabilidades", "eventos", "espaço amostral"],
    subject: "matematica",
    videoIds: ["uzkc-qNVoOk", "8s6f7r7v_Pk"],
    channelHint: "Matemática Rio com Prof. Rafael Procopio",
  },
  {
    topic: "juros compostos",
    aliases: ["juros simples", "matemática financeira", "porcentagem composta"],
    subject: "matematica",
    videoIds: ["6w_ipQJK-mw", "i9LtxxK1qFQ"],
    channelHint: "Me Salva!",
  },
  {
    topic: "análise combinatória",
    aliases: ["analise combinatoria", "permutação", "combinação", "arranjo", "fatorial"],
    subject: "matematica",
    videoIds: ["B07XaiTfvE0", "_qsavmwGqDM"],
    channelHint: "Equaciona Com Paulo Pereira",
  },
  {
    topic: "logaritmos",
    aliases: ["logaritmo", "função logarítmica", "log natural"],
    subject: "matematica",
    videoIds: ["fmAFy3y86z4", "qZWE7nU14yc"],
    channelHint: "Matemática Rio com Prof. Rafael Procopio",
  },
  {
    topic: "progressão aritmética",
    aliases: ["pa progressão aritmetica", "sequência numérica", "termo geral"],
    subject: "matematica",
    videoIds: ["EFZOLyM3hOM", "yK6c1aZ2tT8"],
    channelHint: "Khan Academy Brasil",
  },
  {
    topic: "progressão geométrica",
    aliases: ["pg progressão geometrica", "razão", "soma infinita"],
    subject: "matematica",
    videoIds: ["L0M6qd1tH-c", "lI-Hrx4cVxk"],
    channelHint: "Khan Academy Brasil",
  },

  // ── Física ──────────────────────────────────────────────────────────────
  {
    topic: "cinemática",
    aliases: ["cinematica", "mru", "mruv", "movimento uniforme", "movimento uniformemente variado"],
    subject: "fisica",
    videoIds: ["c7w-D1mLBhI", "v2C8FzGYTNk"],
    channelHint: "Física Total",
  },
  {
    topic: "leis de newton",
    aliases: ["leis newton", "dinâmica", "primeira lei", "segunda lei", "terceira lei"],
    subject: "fisica",
    videoIds: ["szXp4yRSr1k", "Hgnt7t6zHj8"],
    channelHint: "Manual do Mundo",
  },
  {
    topic: "eletricidade",
    aliases: ["circuito elétrico", "lei de ohm", "corrente tensão resistência", "associação resistores"],
    subject: "fisica",
    videoIds: ["O7r8KAh3-7c", "WQy2dVLBoP4"],
    channelHint: "Física Total",
  },
  {
    topic: "energia",
    aliases: ["energia mecânica", "trabalho energia potência", "conservação de energia"],
    subject: "fisica",
    videoIds: ["g0FBOJDjOzo", "P-q6q5_2KsM"],
    channelHint: "Física Total",
  },
  {
    topic: "óptica",
    aliases: ["optica", "reflexão refração luz", "lentes espelhos", "prisma"],
    subject: "fisica",
    videoIds: ["w26P5VKxBbI", "fwh1USPzVuw"],
    channelHint: "Me Salva!",
  },
  {
    topic: "termodinâmica",
    aliases: ["termodinamica", "calor temperatura", "leis termodinamica"],
    subject: "fisica",
    videoIds: ["Xb05CaG7TsQ", "QnQe0xW_JY4"],
    channelHint: "Me Salva!",
  },

  // ── Química ─────────────────────────────────────────────────────────────
  {
    topic: "estequiometria",
    aliases: ["cálculo estequiométrico", "mol reação química", "balanceamento"],
    subject: "quimica",
    videoIds: ["bvFnoMLNJsg", "GxKtwxoEN_0"],
    channelHint: "Química em Ação",
  },
  {
    topic: "soluções químicas",
    aliases: ["concentração", "molaridade", "soluto solvente", "diluição"],
    subject: "quimica",
    videoIds: ["7m0fzVMyXAo", "BAGyG3JhPpA"],
    channelHint: "Química em Ação",
  },
  {
    topic: "ácido-base",
    aliases: ["acido base", "ph", "neutralização", "ácidos e bases"],
    subject: "quimica",
    videoIds: ["LS67vS10O5Y", "uHWPMaTwQpw"],
    channelHint: "Me Salva!",
  },
  {
    topic: "química orgânica",
    aliases: ["quimica organica", "hidrocarbonetos", "funções orgânicas", "carbono"],
    subject: "quimica",
    videoIds: ["uVgsfLDoG1Q", "MzgrYJyXajU"],
    channelHint: "Química em Ação",
  },
  {
    topic: "tabela periódica",
    aliases: ["tabela periodica", "elementos químicos", "famílias da tabela"],
    subject: "quimica",
    videoIds: ["JS50dcMcfUg", "8mWAW0nFc7g"],
    channelHint: "Manual do Mundo",
  },

  // ── Biologia ────────────────────────────────────────────────────────────
  {
    topic: "mitose meiose",
    aliases: ["mitose", "meiose", "divisão celular"],
    subject: "biologia",
    videoIds: ["fjMVybQ-zPI", "fU9ZWtN35aM"],
    channelHint: "Biologia Total com Prof. Jubilut",
  },
  {
    topic: "genética",
    aliases: ["genetica", "leis de mendel", "primeira lei mendel", "segunda lei mendel", "hereditariedade"],
    subject: "biologia",
    videoIds: ["Mehz7tCxjSE", "9b8x2t8I4HU"],
    channelHint: "Biologia Total com Prof. Jubilut",
  },
  {
    topic: "ecologia",
    aliases: ["cadeia alimentar", "ecossistema", "biomas", "ciclos biogeoquímicos"],
    subject: "biologia",
    videoIds: ["AjP3w2yxhVE", "RBOsuJpaNXQ"],
    channelHint: "Biologia Total com Prof. Jubilut",
  },
  {
    topic: "evolução",
    aliases: ["evolucao", "darwin", "seleção natural", "teoria sintética"],
    subject: "biologia",
    videoIds: ["WdMW3Wnvw9c", "GfFwsRn_C8I"],
    channelHint: "Nerdologia",
  },
  {
    topic: "citologia",
    aliases: ["célula", "organelas", "membrana plasmática", "citoplasma"],
    subject: "biologia",
    videoIds: ["ECDA8x4cuQg", "vSnHvDZpJUg"],
    channelHint: "Biologia Total com Prof. Jubilut",
  },
  {
    topic: "fisiologia humana",
    aliases: ["sistema digestório", "sistema circulatório", "sistema respiratório"],
    subject: "biologia",
    videoIds: ["nHFlbn2pIGE", "FrkE3xv7-AY"],
    channelHint: "Biologia Total com Prof. Jubilut",
  },

  // ── História ────────────────────────────────────────────────────────────
  {
    topic: "brasil colônia",
    aliases: ["brasil colonial", "período colonial", "colonização do brasil", "capitanias hereditárias"],
    subject: "historia",
    videoIds: ["DjbE_l4l52U", "QrSyKnh5oM0"],
    channelHint: "Débora Aladim",
  },
  {
    topic: "revolução francesa",
    aliases: ["revolucao francesa", "queda da bastilha", "iluminismo"],
    subject: "historia",
    videoIds: ["7Lz39gZSPS4", "nN-FoTr0X1c"],
    channelHint: "Nerdologia",
  },
  {
    topic: "era vargas",
    aliases: ["getulio vargas", "estado novo", "republica nova", "revolução de 1930"],
    subject: "historia",
    videoIds: ["yL_o5_HUKAo", "M0XQHzS3RtY"],
    channelHint: "Débora Aladim",
  },
  {
    topic: "guerra fria",
    aliases: ["bipolaridade", "eua urss", "cortina de ferro", "muro de berlim"],
    subject: "historia",
    videoIds: ["wgYhh76uvVY", "yqWvCwQQ5UA"],
    channelHint: "Débora Aladim",
  },
  {
    topic: "revolução industrial",
    aliases: ["revolucao industrial", "primeira revolução industrial", "máquina a vapor"],
    subject: "historia",
    videoIds: ["lgYJKpBg5KM", "X-LbkX1g_J0"],
    channelHint: "Curso Enem Gratuito",
  },
  {
    topic: "ditadura militar",
    aliases: ["ditadura no brasil", "ai-5", "golpe 1964", "regime militar"],
    subject: "historia",
    videoIds: ["x5OojUYG1aE", "QkVrM_2lZRY"],
    channelHint: "Débora Aladim",
  },

  // ── Geografia ───────────────────────────────────────────────────────────
  {
    topic: "clima",
    aliases: ["climas do brasil", "tipos de clima", "fenômenos climáticos", "el niño"],
    subject: "geografia",
    videoIds: ["wjUR2H4WLvE", "Bw3tszr3Cck"],
    channelHint: "Geobrasil Prof Rodrigo Rodrigues",
  },
  {
    topic: "urbanização",
    aliases: ["urbanizacao", "cidades", "metrópoles", "êxodo rural"],
    subject: "geografia",
    videoIds: ["s8Lqg2OFqXg", "v_zd6E1mU8w"],
    channelHint: "Geobrasil Prof Rodrigo Rodrigues",
  },
  {
    topic: "globalização",
    aliases: ["globalizacao", "mundo globalizado", "economia mundial"],
    subject: "geografia",
    videoIds: ["mYNRG9OkE5Y", "B5K6T6f1Vmk"],
    channelHint: "Curso Enem Gratuito",
  },
  {
    topic: "geopolítica",
    aliases: ["geopolitica", "blocos econômicos", "conflitos internacionais", "ordem mundial"],
    subject: "geografia",
    videoIds: ["KkLpfQEf4Ec", "ZTbF7TQBMUE"],
    channelHint: "Nerdologia",
  },
  {
    topic: "industrialização brasileira",
    aliases: ["industrializacao brasil", "industria brasileira", "modelo de substituição"],
    subject: "geografia",
    videoIds: ["AzeAFM4xX5g", "GfXgIw7CdJk"],
    channelHint: "Geobrasil Prof Rodrigo Rodrigues",
  },

  // ── Português / Linguagens ──────────────────────────────────────────────
  {
    topic: "análise sintática",
    aliases: ["analise sintatica", "sujeito predicado", "função sintática", "termos da oração"],
    subject: "portugues",
    videoIds: ["FQQ9oqkVbVU", "RXg7p59VYqs"],
    channelHint: "Professor Noslen",
  },
  {
    topic: "figuras de linguagem",
    aliases: ["metáfora metonímia", "hipérbole", "antítese", "personificação"],
    subject: "portugues",
    videoIds: ["AjyHxa-7Gn8", "wqEqg-N5sP4"],
    channelHint: "Professor Noslen",
  },
  {
    topic: "gêneros textuais",
    aliases: ["generos textuais", "tipos textuais", "dissertativo argumentativo", "narrativo descritivo"],
    subject: "portugues",
    videoIds: ["s_Gn7AhKnpw", "lEpCgRMqPGE"],
    channelHint: "Professor Noslen",
  },
  {
    topic: "concordância verbal",
    aliases: ["concordancia verbal", "concordância nominal", "gramática"],
    subject: "portugues",
    videoIds: ["VAk0z9Sg2Lk", "qrEZuI0EuPg"],
    channelHint: "Português com Letícia",
  },
  {
    topic: "literatura brasileira",
    aliases: ["modernismo", "romantismo", "realismo", "machado de assis", "escolas literárias"],
    subject: "portugues",
    videoIds: ["1A4tvKnD2P4", "AFGfaiJqxhk"],
    channelHint: "Curso Enem Gratuito",
  },

  // ── Redação ENEM ────────────────────────────────────────────────────────
  {
    topic: "redação enem",
    aliases: ["redacao enem", "estrutura da redação", "dissertação argumentativa", "competências enem"],
    subject: "redacao",
    videoIds: ["GfXBI6r1V8I", "vS5SfL4t2gw", "z0XS3M9XCgw"],
    channelHint: "Redação e Resenha",
  },
  {
    topic: "introdução redação",
    aliases: ["como começar redação", "introdução enem", "contextualização"],
    subject: "redacao",
    videoIds: ["jaC1Nwqe8t4", "p3DaVjUZ4hk"],
    channelHint: "Redação e Resenha",
  },
  {
    topic: "proposta de intervenção",
    aliases: ["proposta intervencao", "conclusão redação enem", "competência 5"],
    subject: "redacao",
    videoIds: ["e26oCjLdkAM", "p9Q1lWVrFnQ"],
    channelHint: "Redação e Resenha",
  },

  // ── Filosofia / Sociologia ──────────────────────────────────────────────
  {
    topic: "filosofia antiga",
    aliases: ["sócrates platão aristóteles", "pré-socráticos", "filósofos gregos"],
    subject: "filosofia",
    videoIds: ["vNZxhxlpfM4", "L1wQrPHvWuk"],
    channelHint: "Curso Enem Gratuito",
  },
  {
    topic: "sociologia clássica",
    aliases: ["durkheim weber marx", "fundadores da sociologia"],
    subject: "sociologia",
    videoIds: ["B2DjBoIQ4LI", "F0nGiTzZpTI"],
    channelHint: "Curso Enem Gratuito",
  },
];

// ─── Matching ────────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  "o","a","os","as","um","uma","uns","umas","de","da","do","das","dos","e",
  "ou","que","se","na","no","nas","nos","em","para","por","com","sem","sobre",
  "ao","aos","à","às","como","qual","quais","quando","onde","quanto","quem",
  "isso","esse","essa","este","esta","aquele","aquela","mais","menos","muito",
  "pouco","muita","pouca","pelo","pela","pelos","pelas","entre","seu","sua",
]);

function normalise(input: string): string {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenise(input: string): string[] {
  return normalise(input)
    .split(" ")
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function scoreEntry(entry: CuratedTopic, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const haystack = [entry.topic, ...(entry.aliases ?? [])].map(normalise).join(" ");
  const haystackTokens = new Set(haystack.split(" ").filter(Boolean));
  let hits = 0;
  for (const t of queryTokens) {
    if (haystackTokens.has(t)) {
      hits += 2;
    } else {
      // Match parcial (prefixo/substring) — peso menor.
      for (const h of haystackTokens) {
        if (t.length >= 4 && (h.startsWith(t) || t.startsWith(h))) {
          hits += 1;
          break;
        }
      }
    }
  }
  return hits;
}

const SUBJECT_LABEL: Record<CuratedTopic["subject"], string> = {
  matematica: "Matemática",
  fisica: "Física",
  quimica: "Química",
  biologia: "Biologia",
  historia: "História",
  geografia: "Geografia",
  portugues: "Português",
  redacao: "Redação",
  filosofia: "Filosofia",
  sociologia: "Sociologia",
};

/**
 * Devolve até `limit` vídeos hidratados do banco curado para a query dada.
 * Sem chamada de API — todos os campos saem dos metadados locais + URLs
 * computadas (`buildEmbedUrl`/`buildWatchUrl`).
 *
 * Quando nenhum tópico bate, devolve `[]` — o orquestrador segue o caminho
 * normal (placeholder no UI / esconder strip).
 */
export function lookupCuratedVideos(topic: string, limit = 3): YouTubeVideo[] {
  const queryTokens = tokenise(topic);
  if (queryTokens.length === 0) return [];

  const scored = BANK
    .map((entry) => ({ entry, score: scoreEntry(entry, queryTokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  // Pega o tópico mais bem pontuado e devolve seus videoIds hidratados.
  const top = scored[0].entry;
  const ids = top.videoIds.slice(0, Math.max(1, Math.min(limit, 3)));

  return ids.map((videoId) =>
    hydrateVideo({
      videoId,
      title: `${top.topic.charAt(0).toUpperCase()}${top.topic.slice(1)} — ${SUBJECT_LABEL[top.subject]}`,
      channelName: top.channelHint,
    }),
  );
}

/** Quantos tópicos vivem no banco — útil para health / report. */
export function curatedBankSize(): number {
  return BANK.length;
}
