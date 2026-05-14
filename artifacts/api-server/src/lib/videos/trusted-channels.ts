/**
 * lib/videos/trusted-channels.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Whitelist curada de canais brasileiros confiáveis para recomendação de vídeos
 * educacionais. Usada como filtro pós-busca (YouTube Data API) — se o
 * `channelId` retornado pela API estiver nesta lista, o vídeo é aceito.
 *
 * Estratégia de IDs:
 *   - IDs verificados via youtube.com/@<handle> (página > Compartilhar > ID).
 *   - Quando incerto, mantém best-effort: se o ID estiver errado, simplesmente
 *     não bate no filtro — sem crash. A lista é purga, não regra dura.
 *
 * Tags cobrem as 4 áreas do ENEM + verticais (vestibular, concurso, geral)
 * para que o orquestrador possa, no futuro, dar leve preferência a canais
 * cuja tag combine com a matéria do tópico.
 *
 * Para adicionar canal:
 *   1. Confirmar que é PT-BR, foco educacional explícito (ENEM/vest./conc./BNCC).
 *   2. Buscar o channel ID real (UC… 24 chars) em youtube.com.
 *   3. Adicionar entrada abaixo + tags relevantes.
 */

export type TrustedChannelTag =
  | "enem"
  | "vestibular"
  | "concurso"
  | "matematica"
  | "ciencias"
  | "humanas"
  | "linguagens"
  | "redacao"
  | "geral";

export type TrustedChannel = {
  /** YouTube channel ID (formato `UC` + 22 chars). */
  id: string;
  /** Nome de exibição amigável (para UI / atribuição). */
  name: string;
  /** Handle `@…` para exibição secundária e debugging. */
  handle?: string;
  tags: TrustedChannelTag[];
};

export const TRUSTED_CHANNELS: TrustedChannel[] = [
  // ── Generalistas / multi-área ─────────────────────────────────────────────
  {
    id: "UCD4ZIp53l_xKqs-NEhqOj1A",
    name: "Khan Academy Brasil",
    handle: "@khanacademybrasil",
    tags: ["geral", "matematica", "ciencias", "humanas", "linguagens", "enem"],
  },
  {
    id: "UC8XnE1QzC91scECwt6OcXEg",
    name: "Curso Enem Gratuito",
    handle: "@cursoenemgratuito",
    tags: ["enem", "geral", "matematica", "ciencias", "humanas", "linguagens", "redacao"],
  },
  {
    id: "UC51jbVqZNbQNCNGGvW17DAA",
    name: "Me Salva!",
    handle: "@MeSalva",
    tags: ["enem", "vestibular", "matematica", "ciencias", "humanas", "linguagens"],
  },
  {
    id: "UCgwLeBQ0pV-z4f02Z8jJgZA",
    name: "Stoodi",
    handle: "@Stoodi",
    tags: ["enem", "vestibular", "geral", "redacao"],
  },
  {
    id: "UC4cVlIPMZQ59IY13Yg-X8Bw",
    name: "Descomplica",
    handle: "@Descomplica",
    tags: ["enem", "vestibular", "geral", "redacao"],
  },
  {
    id: "UCktEU2KzfBHPILEhYO2nMwA",
    name: "Hexag Medicina",
    handle: "@hexagmedicina",
    tags: ["vestibular", "ciencias", "matematica"],
  },

  // ── Matemática ───────────────────────────────────────────────────────────
  {
    id: "UCDvA9-Fdn22mt6dCmqHZ_DA",
    name: "Matemática Rio com Prof. Rafael Procopio",
    handle: "@matematicario",
    tags: ["matematica", "enem", "vestibular"],
  },
  {
    id: "UCs6ZtmFqfvkPpCnWcAj-yug",
    name: "Equaciona Com Paulo Pereira",
    handle: "@Equaciona",
    tags: ["matematica", "enem", "vestibular"],
  },
  {
    id: "UCw7C7CL_pP3oOlEqXIeOSqw",
    name: "Dicasdemat - Sandro Curió",
    handle: "@dicasdemat",
    tags: ["matematica", "enem", "vestibular", "concurso"],
  },
  {
    id: "UCJbI0G_K6FltSCkFLHTrMrw",
    name: "Matemática com AMORim",
    handle: "@MatematicacomAMORim",
    tags: ["matematica", "enem"],
  },

  // ── Ciências da Natureza (Física, Química, Biologia) ─────────────────────
  {
    id: "UCdAU2qDLOuQvkAd34Z3K7Sg",
    name: "Manual do Mundo",
    handle: "@manualdomundo",
    tags: ["ciencias", "geral"],
  },
  {
    id: "UCueOY7nf67RJoCAQq_-PEzg",
    name: "Ciência Todo Dia",
    handle: "@CienciaTodoDia",
    tags: ["ciencias", "enem"],
  },
  {
    id: "UCkChqOyZTQ8mxlrcpcgKvuw",
    name: "Biologia Total com Prof. Jubilut",
    handle: "@BiologiaTotalcomProfJubilut",
    tags: ["ciencias", "enem", "vestibular"],
  },
  {
    id: "UC1MPmkv3MfPnt2zPzVxnXcw",
    name: "Física Total",
    handle: "@fisicatotaloficial",
    tags: ["ciencias", "enem", "vestibular"],
  },
  {
    id: "UCWoFV0E5IUNvBxHnZ8WMUWQ",
    name: "Química em Ação",
    handle: "@QuimicaemAcao",
    tags: ["ciencias", "enem", "vestibular"],
  },

  // ── Ciências Humanas (História, Geografia, Filosofia, Sociologia) ────────
  {
    id: "UClu474HMt895mVxZdlIHXEA",
    name: "Nerdologia",
    handle: "@nerdologia",
    tags: ["humanas", "ciencias", "geral"],
  },
  {
    id: "UCSqfukExBCfYMzM2NWqyrjA",
    name: "Débora Aladim",
    handle: "@deboraaladim",
    tags: ["humanas", "enem"],
  },
  {
    id: "UCG7QkPnUYjnNCS41r05wmrA",
    name: "Professor Diogo Viana - História",
    handle: "@diogoviana",
    tags: ["humanas", "enem", "vestibular"],
  },
  {
    id: "UCnu8WVcWKHfdvP4CTuvkrkA",
    name: "Geobrasil Prof Rodrigo Rodrigues",
    handle: "@geobrasilprofessorrodrigorodri",
    tags: ["humanas", "enem"],
  },

  // ── Linguagens / Português / Redação ─────────────────────────────────────
  {
    id: "UCcvJMRtAvweciNZB5W2cGTw",
    name: "Professor Noslen",
    handle: "@professornoslen",
    tags: ["linguagens", "redacao", "enem", "vestibular"],
  },
  {
    id: "UC8DkOHwO3kBFnsxgyf8tpHA",
    name: "Redação e Resenha",
    handle: "@RedacaoeResenha",
    tags: ["redacao", "linguagens", "enem"],
  },
  {
    id: "UCwt7DSPB7AnBDSGz1Z0p2LA",
    name: "Português com Letícia",
    handle: "@portuguescomleticia",
    tags: ["linguagens", "enem", "concurso"],
  },

  // ── Concursos ────────────────────────────────────────────────────────────
  {
    id: "UCC8M_oP_8nKxCKjwUYJzGGw",
    name: "AlfaCon Concursos Públicos",
    handle: "@AlfaConConcursos",
    tags: ["concurso", "geral"],
  },
  {
    id: "UCFygTzJrwH7nuVHCFEd_b2A",
    name: "Gran Cursos Online",
    handle: "@grancursosonline",
    tags: ["concurso", "geral"],
  },
];

/**
 * Lookup rápido por ID. Devolve `undefined` quando o canal não está na
 * whitelist — usado por `youtube-search.ts` para filtrar resultados.
 */
const TRUSTED_BY_ID: Map<string, TrustedChannel> = new Map(
  TRUSTED_CHANNELS.map((c) => [c.id, c]),
);

export function findTrustedChannel(channelId: string | undefined | null): TrustedChannel | undefined {
  if (!channelId) return undefined;
  return TRUSTED_BY_ID.get(channelId);
}

export function isTrustedChannel(channelId: string | undefined | null): boolean {
  return !!findTrustedChannel(channelId);
}
