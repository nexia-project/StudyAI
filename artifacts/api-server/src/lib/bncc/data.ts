/**
 * BNCC — Base Nacional Comum Curricular (PR-3, data scaffolding)
 *
 * Representação tipada das Competências Gerais e Áreas de Conhecimento do
 * Ensino Médio, conforme a BNCC oficial homologada pelo MEC.
 *
 * Documentos-fonte:
 *   - Base Nacional Comum Curricular — Educação Infantil, Fundamental e Médio (2018)
 *     http://basenacionalcomum.mec.gov.br
 *   - Resolução CNE/CP nº 4, de 17 de dezembro de 2018 (homologa o Ensino Médio)
 *
 * Este arquivo contém um SEED MÍNIMO mas CORRETO: as 10 competências gerais
 * + as 4 áreas de conhecimento do EM + 3 a 5 competências específicas por área,
 * com seus respectivos códigos oficiais (EM13XXX###). O bcd completo do MEC
 * tem ~240 habilidades específicas — substituiremos por ingestão automatizada.
 *
 * TODO: substituir por import completo do CSV oficial do MEC (script de ingestão em /scripts/ingest-bncc.ts)
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

/** Sigla da Área de Conhecimento do Ensino Médio. */
export type BnccAreaCodigo = "LGG" | "MAT" | "CNT" | "CHS";

export interface BnccArea {
  /** Sigla curta — usada em códigos e queries. */
  codigo: BnccAreaCodigo;
  /** Nome oficial da Área de Conhecimento. */
  nome: string;
  /** Resumo curto da área (1-2 frases). */
  descricao: string;
  /** Componentes curriculares que pertencem à área. */
  componentes: string[];
}

export interface BnccCompetenciaGeral {
  /** Número (1-10). */
  numero: number;
  /** Título curto canônico da competência (Conhecimento, Pensamento científico, etc.). */
  titulo: string;
  /** Texto oficial completo da competência. */
  descricao: string;
}

export interface BnccCompetenciaEspecifica {
  /** Código oficial BNCC. Padrão: EM13{AREA}{COMP}{NN}. Ex.: EM13CNT101. */
  codigo: string;
  /** Sigla da Área. */
  area: BnccAreaCodigo;
  /** Número da competência específica dentro da área (1-6 normalmente). */
  competencia: number;
  /** Texto oficial da competência específica / habilidade. */
  descricao: string;
  /** Palavras-chave para busca textual. */
  palavrasChave: string[];
}

// ─── Áreas de Conhecimento do Ensino Médio ──────────────────────────────────

export const BNCC_AREAS: readonly BnccArea[] = [
  {
    codigo: "LGG",
    nome: "Linguagens e suas Tecnologias",
    descricao:
      "Estudo das linguagens verbal, corporal, visual, sonora e digital, suas práticas de uso e seus efeitos de sentido na produção e circulação de discursos.",
    componentes: ["Língua Portuguesa", "Língua Inglesa", "Arte", "Educação Física"],
  },
  {
    codigo: "MAT",
    nome: "Matemática e suas Tecnologias",
    descricao:
      "Ampliação e aprofundamento das aprendizagens em Matemática, articulando-as com tecnologias digitais e com situações da vida cotidiana, do mundo do trabalho e da pesquisa científica.",
    componentes: ["Matemática"],
  },
  {
    codigo: "CNT",
    nome: "Ciências da Natureza e suas Tecnologias",
    descricao:
      "Integração entre Biologia, Física e Química para compreensão de fenômenos naturais, processos tecnológicos e suas implicações socioambientais.",
    componentes: ["Biologia", "Física", "Química"],
  },
  {
    codigo: "CHS",
    nome: "Ciências Humanas e Sociais Aplicadas",
    descricao:
      "Estudo das relações sociais, políticas, econômicas, culturais, históricas e geográficas, com foco na formação cidadã, no exercício da democracia e nos direitos humanos.",
    componentes: ["História", "Geografia", "Filosofia", "Sociologia"],
  },
] as const;

// ─── 10 Competências Gerais da Educação Básica (válidas no EM) ─────────────

export const BNCC_COMPETENCIAS_GERAIS: readonly BnccCompetenciaGeral[] = [
  {
    numero: 1,
    titulo: "Conhecimento",
    descricao:
      "Valorizar e utilizar os conhecimentos historicamente construídos sobre o mundo físico, social, cultural e digital para entender e explicar a realidade, continuar aprendendo e colaborar para a construção de uma sociedade justa, democrática e inclusiva.",
  },
  {
    numero: 2,
    titulo: "Pensamento científico, crítico e criativo",
    descricao:
      "Exercitar a curiosidade intelectual e recorrer à abordagem própria das ciências, incluindo a investigação, a reflexão, a análise crítica, a imaginação e a criatividade, para investigar causas, elaborar e testar hipóteses, formular e resolver problemas e criar soluções (inclusive tecnológicas) com base nos conhecimentos das diferentes áreas.",
  },
  {
    numero: 3,
    titulo: "Repertório cultural",
    descricao:
      "Valorizar e fruir as diversas manifestações artísticas e culturais, das locais às mundiais, e também participar de práticas diversificadas da produção artístico-cultural.",
  },
  {
    numero: 4,
    titulo: "Comunicação",
    descricao:
      "Utilizar diferentes linguagens — verbal (oral ou visual-motora, como Libras, e escrita), corporal, visual, sonora e digital —, bem como conhecimentos das linguagens artística, matemática e científica, para se expressar e partilhar informações, experiências, ideias e sentimentos em diferentes contextos e produzir sentidos que levem ao entendimento mútuo.",
  },
  {
    numero: 5,
    titulo: "Cultura digital",
    descricao:
      "Compreender, utilizar e criar tecnologias digitais de informação e comunicação de forma crítica, significativa, reflexiva e ética nas diversas práticas sociais (incluindo as escolares) para se comunicar, acessar e disseminar informações, produzir conhecimentos, resolver problemas e exercer protagonismo e autoria na vida pessoal e coletiva.",
  },
  {
    numero: 6,
    titulo: "Trabalho e projeto de vida",
    descricao:
      "Valorizar a diversidade de saberes e vivências culturais e apropriar-se de conhecimentos e experiências que lhe possibilitem entender as relações próprias do mundo do trabalho e fazer escolhas alinhadas ao exercício da cidadania e ao seu projeto de vida, com liberdade, autonomia, consciência crítica e responsabilidade.",
  },
  {
    numero: 7,
    titulo: "Argumentação",
    descricao:
      "Argumentar com base em fatos, dados e informações confiáveis, para formular, negociar e defender ideias, pontos de vista e decisões comuns que respeitem e promovam os direitos humanos, a consciência socioambiental e o consumo responsável em âmbito local, regional e global, com posicionamento ético em relação ao cuidado de si mesmo, dos outros e do planeta.",
  },
  {
    numero: 8,
    titulo: "Autoconhecimento e autocuidado",
    descricao:
      "Conhecer-se, apreciar-se e cuidar de sua saúde física e emocional, compreendendo-se na diversidade humana e reconhecendo suas emoções e as dos outros, com autocrítica e capacidade para lidar com elas.",
  },
  {
    numero: 9,
    titulo: "Empatia e cooperação",
    descricao:
      "Exercitar a empatia, o diálogo, a resolução de conflitos e a cooperação, fazendo-se respeitar e promovendo o respeito ao outro e aos direitos humanos, com acolhimento e valorização da diversidade de indivíduos e de grupos sociais, seus saberes, identidades, culturas e potencialidades, sem preconceitos de qualquer natureza.",
  },
  {
    numero: 10,
    titulo: "Responsabilidade e cidadania",
    descricao:
      "Agir pessoal e coletivamente com autonomia, responsabilidade, flexibilidade, resiliência e determinação, tomando decisões com base em princípios éticos, democráticos, inclusivos, sustentáveis e solidários.",
  },
] as const;

// ─── Competências Específicas (seed por área) ───────────────────────────────
// 3-5 competências por área, códigos oficiais BNCC do Ensino Médio.

export const BNCC_COMPETENCIAS_ESPECIFICAS: readonly BnccCompetenciaEspecifica[] = [
  // ── Linguagens e suas Tecnologias ─────────────────────────────────────────
  {
    codigo: "EM13LGG101",
    area: "LGG",
    competencia: 1,
    descricao:
      "Compreender e analisar processos de produção e circulação de discursos, nas diferentes linguagens, para fazer escolhas fundamentadas em função de interesses pessoais e coletivos.",
    palavrasChave: ["discurso", "linguagem", "comunicação", "produção de texto", "circulação"],
  },
  {
    codigo: "EM13LGG201",
    area: "LGG",
    competencia: 2,
    descricao:
      "Utilizar as diversas linguagens (artísticas, corporais e verbais) em diferentes contextos, valorizando-as como fenômeno social, cultural, histórico, variável, heterogêneo e sensível aos contextos de uso.",
    palavrasChave: ["linguagens artísticas", "variação linguística", "contexto", "cultura"],
  },
  {
    codigo: "EM13LGG301",
    area: "LGG",
    competencia: 3,
    descricao:
      "Utilizar diferentes linguagens (artísticas, corporais e verbais) para exercer, com autonomia e colaboração, protagonismo e autoria na vida pessoal e coletiva, de forma crítica, criativa, ética e solidária, defendendo pontos de vista que respeitem o outro e promovam os direitos humanos.",
    palavrasChave: ["protagonismo", "autoria", "ética", "direitos humanos", "argumentação"],
  },
  {
    codigo: "EM13LGG401",
    area: "LGG",
    competencia: 4,
    descricao:
      "Compreender o funcionamento das diferentes linguagens e práticas culturais (artísticas, corporais e verbais) e mobilizar esses conhecimentos na recepção e produção de discursos nos diferentes campos de atuação social e nas diversas mídias, para ampliar as formas de participação social, o entendimento e as possibilidades de explicação e interpretação crítica da realidade.",
    palavrasChave: ["mídias", "campos de atuação", "recepção", "produção textual"],
  },
  {
    codigo: "EM13LP07",
    area: "LGG",
    competencia: 4,
    descricao:
      "Analisar, em textos de diferentes gêneros, marcas que expressam a posição do enunciador frente àquilo que é dito: uso de diferentes vozes (no discurso direto, indireto e indireto livre), modalidade (epistêmica, deôntica e apreciativa) e expressões avaliativas.",
    palavrasChave: ["gêneros textuais", "discurso", "argumentação", "redação ENEM"],
  },

  // ── Matemática e suas Tecnologias ─────────────────────────────────────────
  {
    codigo: "EM13MAT101",
    area: "MAT",
    competencia: 1,
    descricao:
      "Interpretar criticamente situações econômicas, sociais e fatos relativos às Ciências da Natureza que envolvam a variação de grandezas, pela análise dos gráficos das funções representadas e das taxas de variação, com ou sem apoio de tecnologias digitais.",
    palavrasChave: ["funções", "gráficos", "taxa de variação", "grandezas"],
  },
  {
    codigo: "EM13MAT201",
    area: "MAT",
    competencia: 2,
    descricao:
      "Propor ou participar de ações para investigar desafios do mundo contemporâneo e tomar decisões éticas e socialmente responsáveis, com base na análise de problemas sociais, como os voltados a situações de saúde, sustentabilidade, das implicações da tecnologia no mundo do trabalho, entre outros, mobilizando e articulando conceitos, procedimentos e linguagens próprios da Matemática.",
    palavrasChave: ["modelagem matemática", "resolução de problemas", "interdisciplinaridade"],
  },
  {
    codigo: "EM13MAT301",
    area: "MAT",
    competencia: 3,
    descricao:
      "Resolver e elaborar problemas com diferentes funções (afim, quadrática, exponencial, logarítmica e trigonométrica) em contextos da Matemática ou em outras áreas do conhecimento, expressando o resultado por meio de representações algébricas, geométricas e numéricas.",
    palavrasChave: ["função afim", "função quadrática", "exponencial", "logaritmo", "trigonometria"],
  },
  {
    codigo: "EM13MAT401",
    area: "MAT",
    competencia: 4,
    descricao:
      "Converter representações algébricas de funções polinomiais de 1º grau em representações geométricas no plano cartesiano, distinguindo os casos nos quais o comportamento é proporcional, recorrendo ou não a softwares ou aplicativos de álgebra e geometria dinâmica.",
    palavrasChave: ["função do 1º grau", "plano cartesiano", "proporcionalidade", "geometria"],
  },
  {
    codigo: "EM13MAT501",
    area: "MAT",
    competencia: 5,
    descricao:
      "Investigar relações entre números expressos em tabelas para representá-los no plano cartesiano, identificando padrões e criando conjecturas para generalizar e expressar algebricamente essa generalização, reconhecendo quando essa representação é de função polinomial de 1º grau.",
    palavrasChave: ["padrões", "regularidades", "generalização algébrica", "função"],
  },

  // ── Ciências da Natureza e suas Tecnologias ───────────────────────────────
  {
    codigo: "EM13CNT101",
    area: "CNT",
    competencia: 1,
    descricao:
      "Analisar e representar, com ou sem o uso de dispositivos e de aplicativos digitais específicos, as transformações e conservações em sistemas que envolvam quantidade de matéria, de energia e de movimento para realizar previsões em situações cotidianas e processos produtivos que priorizem o desenvolvimento sustentável, o uso consciente dos recursos naturais e a preservação da vida em todas as suas formas.",
    palavrasChave: ["energia", "conservação", "transformação", "sustentabilidade"],
  },
  {
    codigo: "EM13CNT201",
    area: "CNT",
    competencia: 2,
    descricao:
      "Analisar e discutir modelos, teorias e leis propostos em diferentes épocas e culturas para comparar distintas explicações sobre o surgimento e a evolução da Vida, da Terra e do Universo com as teorias científicas aceitas atualmente.",
    palavrasChave: ["evolução", "Big Bang", "história da ciência", "modelos científicos"],
  },
  {
    codigo: "EM13CNT301",
    area: "CNT",
    competencia: 3,
    descricao:
      "Construir questões, elaborar hipóteses, previsões e estimativas, empregar instrumentos de medição e representar e interpretar modelos explicativos, dados e/ou resultados experimentais para construir, avaliar e justificar conclusões no enfrentamento de situações-problema sob uma perspectiva científica.",
    palavrasChave: ["método científico", "hipótese", "experimento", "modelagem"],
  },
  {
    codigo: "EM13CNT302",
    area: "CNT",
    competencia: 3,
    descricao:
      "Comunicar, para públicos variados, em diversos contextos, resultados de análises, pesquisas e/ou experimentos, elaborando e/ou interpretando textos, gráficos, tabelas, símbolos, códigos, sistemas de classificação e equações, por meio de diferentes linguagens, mídias, tecnologias digitais de informação e comunicação (TDIC), de modo a participar e/ou promover debates em torno de temas científicos e/ou tecnológicos.",
    palavrasChave: ["divulgação científica", "comunicação", "gráficos", "tabelas"],
  },

  // ── Ciências Humanas e Sociais Aplicadas ──────────────────────────────────
  {
    codigo: "EM13CHS101",
    area: "CHS",
    competencia: 1,
    descricao:
      "Identificar, analisar e comparar diferentes fontes e narrativas expressas em diversas linguagens, com vistas à compreensão de ideias filosóficas e de processos e eventos históricos, geográficos, políticos, econômicos, sociais, ambientais e culturais.",
    palavrasChave: ["fontes históricas", "narrativas", "interpretação", "história"],
  },
  {
    codigo: "EM13CHS201",
    area: "CHS",
    competencia: 2,
    descricao:
      "Analisar e caracterizar as dinâmicas das populações, das mercadorias e do capital nos diversos continentes, com destaque para a mobilidade e a fixação de pessoas, grupos humanos e povos, em função de eventos naturais, políticos, econômicos, sociais, religiosos e culturais, compreendendo o papel desses processos na construção das diferentes culturas, sociedades e nas transformações geográficas.",
    palavrasChave: ["migração", "globalização", "demografia", "geografia"],
  },
  {
    codigo: "EM13CHS301",
    area: "CHS",
    competencia: 3,
    descricao:
      "Contextualizar, comparar e avaliar os impactos de diferentes modelos socioeconômicos no uso dos recursos naturais e na promoção da sustentabilidade econômica e socioambiental do planeta.",
    palavrasChave: ["sustentabilidade", "recursos naturais", "modelos econômicos", "meio ambiente"],
  },
  {
    codigo: "EM13CHS401",
    area: "CHS",
    competencia: 4,
    descricao:
      "Identificar e analisar as relações entre sujeitos, grupos, classes sociais e sociedades com culturas distintas diante das transformações técnicas, tecnológicas e informacionais e das novas formas de trabalho ao longo do tempo, em diferentes espaços (urbanos, rurais, comunidades indígenas, etc.) e contextos.",
    palavrasChave: ["trabalho", "classes sociais", "tecnologia", "sociologia"],
  },
  {
    codigo: "EM13CHS501",
    area: "CHS",
    competencia: 5,
    descricao:
      "Analisar os fundamentos da ética em diferentes culturas, tempos e espaços, identificando processos que contribuem para a formação de sujeitos éticos que valorizem a liberdade, a autonomia, a consciência crítica e a responsabilidade.",
    palavrasChave: ["ética", "filosofia", "autonomia", "moral", "cidadania"],
  },
];

// ─── Índices auxiliares (build-time) ────────────────────────────────────────

/** Mapa código→competência específica para lookup O(1). */
export const BNCC_COMPETENCIAS_BY_CODIGO: Readonly<Record<string, BnccCompetenciaEspecifica>> =
  Object.freeze(
    Object.fromEntries(
      BNCC_COMPETENCIAS_ESPECIFICAS.map((c) => [c.codigo, c] as const),
    ),
  );

/** Mapa sigla→área. */
export const BNCC_AREA_BY_CODIGO: Readonly<Record<BnccAreaCodigo, BnccArea>> = Object.freeze(
  Object.fromEntries(BNCC_AREAS.map((a) => [a.codigo, a] as const)) as Record<
    BnccAreaCodigo,
    BnccArea
  >,
);

/** Total de itens carregados no seed atual (útil para debugging / health). */
export const BNCC_SEED_STATS = Object.freeze({
  areas: BNCC_AREAS.length,
  competenciasGerais: BNCC_COMPETENCIAS_GERAIS.length,
  competenciasEspecificas: BNCC_COMPETENCIAS_ESPECIFICAS.length,
  fonte: "BNCC — MEC, homologada 2018 (EM)",
  versao: "seed-pr3",
});
