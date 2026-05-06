/**
 * BNCC — Base Nacional Comum Curricular
 * Documento oficial: http://basenacionalcomum.mec.gov.br
 * Resolução CNE/CP nº 2, de 22 de dezembro de 2017 (EF) + 4 de outubro de 2018 (EM)
 *
 * Este arquivo contém as habilidades do Ensino Médio (EM13) organizadas por
 * Área de Conhecimento e Componente Curricular, conforme a BNCC oficial.
 */

export interface BnccHabilidade {
  codigo: string;
  descricao: string;
  area: string;
  componente: string;
  unidade?: string;
  objeto?: string;
  tags: string[];
}

export interface BnccArea {
  codigo: string;
  nome: string;
  componentes: string[];
}

export const BNCC_AREAS: BnccArea[] = [
  {
    codigo: "LGG",
    nome: "Linguagens e suas Tecnologias",
    componentes: ["Língua Portuguesa", "Língua Inglesa", "Arte", "Educação Física"],
  },
  {
    codigo: "MAT",
    nome: "Matemática e suas Tecnologias",
    componentes: ["Matemática"],
  },
  {
    codigo: "CNT",
    nome: "Ciências da Natureza e suas Tecnologias",
    componentes: ["Física", "Química", "Biologia"],
  },
  {
    codigo: "CHS",
    nome: "Ciências Humanas e Sociais Aplicadas",
    componentes: ["História", "Geografia", "Filosofia", "Sociologia"],
  },
];

export const BNCC_HABILIDADES: BnccHabilidade[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // LINGUAGENS E SUAS TECNOLOGIAS — Língua Portuguesa
  // ═══════════════════════════════════════════════════════════════════════════
  { codigo: "EM13LP01", area: "LGG", componente: "Língua Portuguesa", descricao: "Relacionar o texto, tanto na produção como na leitura/escuta, com suas condições de produção e seu contexto sócio-histórico de circulação.", tags: ["leitura", "produção textual", "contexto", "gêneros textuais"] },
  { codigo: "EM13LP02", area: "LGG", componente: "Língua Portuguesa", descricao: "Estabelecer relações entre as partes do texto, tanto na produção como na leitura/escuta, considerando a construção composicional e o estilo do gênero.", tags: ["coesão", "coerência", "redação", "gêneros"] },
  { codigo: "EM13LP03", area: "LGG", componente: "Língua Portuguesa", descricao: "Analisar relações de intertextualidade e interdiscursividade que permitem a compreensão do texto.", tags: ["intertextualidade", "interdiscursividade", "leitura", "interpretação"] },
  { codigo: "EM13LP04", area: "LGG", componente: "Língua Portuguesa", descricao: "Compreender e usar a variação e o fenômeno da mudança linguística, sempre percebidos e avaliados à luz das ideologias linguísticas.", tags: ["variação linguística", "mudança linguística", "norma culta", "sociolinguística"] },
  { codigo: "EM13LP05", area: "LGG", componente: "Língua Portuguesa", descricao: "Analisar, em textos argumentativos e propositivos, os movimentos argumentativos utilizados na defesa de pontos de vista.", tags: ["argumentação", "dissertação", "redação ENEM", "texto argumentativo"] },
  { codigo: "EM13LP06", area: "LGG", componente: "Língua Portuguesa", descricao: "Analisar efeitos de sentido decorrentes de usos de recursos estilísticos (figuras de linguagem, intertextualidade, etc.).", tags: ["figuras de linguagem", "estilo", "literatura", "efeitos de sentido"] },
  { codigo: "EM13LP07", area: "LGG", componente: "Língua Portuguesa", descricao: "Analisar, em textos de diferentes gêneros, os efeitos de sentido decorrentes do uso de recursos linguístico-gramaticais.", tags: ["gramática", "morfossintaxe", "semântica", "análise linguística"] },
  { codigo: "EM13LP08", area: "LGG", componente: "Língua Portuguesa", descricao: "Planejar e produzir textos em diferentes gêneros na modalidade escrita da língua, a partir de experiências e reflexões feitas em sala.", tags: ["redação", "produção textual", "planejamento", "ENEM"] },
  { codigo: "EM13LP09", area: "LGG", componente: "Língua Portuguesa", descricao: "Fazer curadoria de informação, reconhecendo que os textos fazem parte de uma rede e que retextualizar, reescrever e remixar são práticas que integram a produção escrita.", tags: ["curadoria", "internet", "fake news", "informação"] },
  { codigo: "EM13LP10", area: "LGG", componente: "Língua Portuguesa", descricao: "Analisar o fenômeno da variação linguística, em suas diferentes dimensões (fônica, lexical, sintática, semântica, pragmático-discursiva), para compreender sua natureza heterogênea e dinâmica.", tags: ["variação linguística", "dialetos", "sociolinguística", "norma padrão"] },
  { codigo: "EM13LP11", area: "LGG", componente: "Língua Portuguesa", descricao: "Interpretar e fazer uso de gráficos, tabelas, infográficos e outros textos multissemióticos em diferentes práticas de linguagem.", tags: ["multissemiose", "gráficos", "tabelas", "infográficos", "leitura"] },
  { codigo: "EM13LP26", area: "LGG", componente: "Língua Portuguesa", descricao: "Posicionar-se criticamente em relação a textos pertencentes a gêneros como o manifesto, o ensaio literário, a crítica cultural, o artigo de opinião.", tags: ["artigo de opinião", "manifesto", "posicionamento crítico", "argumentação"] },
  { codigo: "EM13LP27", area: "LGG", componente: "Língua Portuguesa", descricao: "Engajar-se em práticas de leitura literária que possibilitem o desenvolvimento do senso estético.", tags: ["literatura", "leitura literária", "cânone", "senso estético"] },
  { codigo: "EM13LP46", area: "LGG", componente: "Língua Portuguesa", descricao: "Analisar aspectos da norma gramatical, notadamente no que se refere ao uso do acento, da pontuação, da grafia das palavras e das regras de concordância e regência.", tags: ["gramática normativa", "ortografia", "pontuação", "concordância", "regência"] },
  { codigo: "EM13LP48", area: "LGG", componente: "Língua Portuguesa", descricao: "Escrever textos em norma culta, compreendendo a importância de produzir textos adequados à situação comunicativa.", tags: ["norma culta", "produção textual", "redação", "adequação"] },
  { codigo: "EM13LP49", area: "LGG", componente: "Língua Portuguesa", descricao: "Produzir textos de diferentes gêneros argumentativos — artigo de opinião, editorial, carta de reclamação, proposta de intervenção ENEM.", tags: ["redação ENEM", "proposta de intervenção", "artigo de opinião", "editorial"] },
  { codigo: "EM13LP51", area: "LGG", componente: "Língua Portuguesa", descricao: "Analisar textos literários, identificando o processo de formação da literatura brasileira e portuguesa, desde as primeiras manifestações até a contemporaneidade.", tags: ["literatura brasileira", "história da literatura", "movimentos literários", "cânone"] },
  { codigo: "EM13LP52", area: "LGG", componente: "Língua Portuguesa", descricao: "Analisar obras significativas da literatura brasileira e mundial, a partir de diferentes paradigmas críticos.", tags: ["literatura", "obras literárias", "crítica literária", "vestibular"] },

  // ═══════════════════════════════════════════════════════════════════════════
  // LINGUAGENS — Língua Inglesa
  // ═══════════════════════════════════════════════════════════════════════════
  { codigo: "EM13LGG101", area: "LGG", componente: "Língua Inglesa", descricao: "Compreender e analisar processos de produção e circulação de discursos, nas diferentes línguas, para posicionar-se criticamente diante deles.", tags: ["inglês", "leitura", "compreensão", "língua estrangeira"] },
  { codigo: "EM13LGG102", area: "LGG", componente: "Língua Inglesa", descricao: "Analisar visões de mundo, conflitos de interesse, preconceitos e ideologias presentes nos discursos veiculados nas diferentes mídias.", tags: ["inglês", "mídia", "ideologia", "leitura crítica"] },
  { codigo: "EM13LGG201", area: "LGG", componente: "Língua Inglesa", descricao: "Utilizar as diversas linguagens (artísticas, corporais e verbais) em diferentes contextos, relacionando-as a aspectos da cultura, da identidade e da diferença.", tags: ["inglês", "cultura", "identidade", "multiculturalismo"] },
  { codigo: "EM13LGG401", area: "LGG", componente: "Língua Inglesa", descricao: "Reconhecer e usar língua(s) e linguagem(ns) como fenômeno (multi)semiótico, histórico, social, cultural e situado.", tags: ["inglês", "semiótica", "multiculturalismo", "língua"] },

  // ═══════════════════════════════════════════════════════════════════════════
  // MATEMÁTICA E SUAS TECNOLOGIAS
  // ═══════════════════════════════════════════════════════════════════════════
  { codigo: "EM13MAT101", area: "MAT", componente: "Matemática", unidade: "Números", descricao: "Interpretar situações econômicas, sociais e das Ciências da Natureza que envolvem a variação de grandezas, pela análise dos gráficos das funções representadas.", tags: ["funções", "gráficos", "variação de grandezas", "análise"] },
  { codigo: "EM13MAT102", area: "MAT", componente: "Matemática", unidade: "Números", descricao: "Analisar gráficos e representações de funções do 1º e 2º graus, bem como funções exponencial, logarítmica e trigonométrica.", tags: ["função de 1º grau", "função de 2º grau", "função exponencial", "logaritmo", "trigonometria"] },
  { codigo: "EM13MAT103", area: "MAT", componente: "Matemática", unidade: "Números", descricao: "Interpretar e comparar situações que envolvem juros simples e compostos, desconto simples, porcentagem, e outras relações financeiras.", tags: ["juros simples", "juros compostos", "matemática financeira", "porcentagem"] },
  { codigo: "EM13MAT104", area: "MAT", componente: "Matemática", unidade: "Números", descricao: "Interpretar e resolver situações-problema que envolvem sequências numéricas (progressões aritméticas e geométricas).", tags: ["progressão aritmética", "progressão geométrica", "sequências", "PA PG"] },
  { codigo: "EM13MAT201", area: "MAT", componente: "Matemática", unidade: "Álgebra", descricao: "Resolver e elaborar problemas que envolvam equações e inequações (1º e 2º graus, sistemas), associando as soluções a representações algébricas.", tags: ["equações", "inequações", "sistemas", "álgebra"] },
  { codigo: "EM13MAT202", area: "MAT", componente: "Matemática", unidade: "Álgebra", descricao: "Analisar problemas que envolvem polinômios por meio de suas representações algébricas e gráficas.", tags: ["polinômios", "fatoração", "álgebra", "equações polinomiais"] },
  { codigo: "EM13MAT301", area: "MAT", componente: "Matemática", unidade: "Geometria", descricao: "Interpretar e resolver situações-problema referentes a figuras planas e espaciais, como área, perímetro, volume e relações métricas.", tags: ["geometria plana", "geometria espacial", "área", "volume", "perímetro"] },
  { codigo: "EM13MAT302", area: "MAT", componente: "Matemática", unidade: "Geometria", descricao: "Resolver e elaborar problemas utilizando a semelhança de triângulos e as relações dos ângulos em polígonos regulares.", tags: ["semelhança de triângulos", "polígonos", "teorema de Pitágoras", "geometria"] },
  { codigo: "EM13MAT303", area: "MAT", componente: "Matemática", unidade: "Geometria", descricao: "Utilizar relações métricas do triângulo retângulo para resolver e elaborar problemas em variados contextos.", tags: ["triângulo retângulo", "Pitágoras", "trigonometria", "geometria"] },
  { codigo: "EM13MAT304", area: "MAT", componente: "Matemática", unidade: "Geometria", descricao: "Resolver e elaborar problemas que envolvam geometria analítica — reta, circunferência e cônicas.", tags: ["geometria analítica", "reta", "circunferência", "cônicas", "plano cartesiano"] },
  { codigo: "EM13MAT305", area: "MAT", componente: "Matemática", unidade: "Geometria", descricao: "Resolver problemas de trigonometria envolvendo seno, cosseno e tangente e as relações fundamentais da trigonometria no triângulo retângulo e círculo trigonométrico.", tags: ["trigonometria", "seno", "cosseno", "tangente", "círculo trigonométrico"] },
  { codigo: "EM13MAT401", area: "MAT", componente: "Matemática", unidade: "Grandezas e Medidas", descricao: "Analisar situações que envolvem grandezas diretas e inversamente proporcionais, por meio de representações gráficas e algébricas.", tags: ["grandezas proporcionais", "regra de três", "razão", "proporção"] },
  { codigo: "EM13MAT501", area: "MAT", componente: "Matemática", unidade: "Probabilidade e Estatística", descricao: "Investigar e estabelecer conjecturas a respeito de medidas de tendência central (média, mediana, moda) de conjuntos de dados.", tags: ["média", "mediana", "moda", "estatística descritiva"] },
  { codigo: "EM13MAT502", area: "MAT", componente: "Matemática", unidade: "Probabilidade e Estatística", descricao: "Analisar e utilizar, criticamente, medidas de dispersão (variância, desvio padrão e coeficiente de variação) para comparar grupos de variáveis.", tags: ["variância", "desvio padrão", "dispersão", "estatística"] },
  { codigo: "EM13MAT503", area: "MAT", componente: "Matemática", unidade: "Probabilidade e Estatística", descricao: "Utilizar a linguagem dos eventos, espaço amostral e probabilidade de um evento para analisar situações cotidianas.", tags: ["probabilidade", "espaço amostral", "eventos", "combinatória"] },
  { codigo: "EM13MAT504", area: "MAT", componente: "Matemática", unidade: "Probabilidade e Estatística", descricao: "Avaliar propostas de intervenção na realidade utilizando conceitos de contagem (princípio multiplicativo, permutações, combinações).", tags: ["análise combinatória", "permutação", "combinação", "arranjo", "contagem"] },

  // ═══════════════════════════════════════════════════════════════════════════
  // CIÊNCIAS DA NATUREZA E SUAS TECNOLOGIAS — Física
  // ═══════════════════════════════════════════════════════════════════════════
  { codigo: "EM13CNT101", area: "CNT", componente: "Física", descricao: "Analisar e representar, com ou sem o uso de dispositivos e de aplicativos digitais, as transformações e conservações em sistemas físicos, químicos e biológicos.", tags: ["energia", "transformação de energia", "conservação", "física geral"] },
  { codigo: "EM13CNT102", area: "CNT", componente: "Física", descricao: "Realizar previsões, avaliar intervenções e/ou construir protótipos de sistemas simples, usando os princípios da mecânica clássica (leis de Newton, cinemática).", tags: ["mecânica", "cinemática", "dinâmica", "leis de Newton"] },
  { codigo: "EM13CNT103", area: "CNT", componente: "Física", descricao: "Avaliar e prever efeitos de intervenções nos ecossistemas e nos demais sistemas físico-químico-biológicos, com base nos princípios do equilíbrio e da conservação.", tags: ["equilíbrio", "ecossistema", "conservação da energia", "termodinâmica"] },
  { codigo: "EM13CNT201", area: "CNT", componente: "Física", descricao: "Analisar e discutir modelos, teorias e leis, argumentar sobre suas limitações e previsões.", tags: ["modelos científicos", "teoria", "física moderna", "epistemologia"] },
  { codigo: "EM13CNT202", area: "CNT", componente: "Física", descricao: "Analisar as diversas formas de energia envolvidas em transformações nos sistemas naturais e tecnológicos (ondulatória, eletromagnética, mecânica, térmica, química e nuclear).", tags: ["formas de energia", "eletromagnetismo", "ondulatória", "energia nuclear", "calor"] },
  { codigo: "EM13CNT203", area: "CNT", componente: "Física", descricao: "Avaliar e prever efeitos das radiações ionizantes e não ionizantes (UV, infravermelho, micro-ondas, raios-X) no organismo humano e em materiais.", tags: ["radiação", "luz", "espectro eletromagnético", "raios-X", "UV"] },
  { codigo: "EM13CNT301", area: "CNT", componente: "Física", descricao: "Construir questões, elaborar hipóteses, previsões e estimativas, empregar instrumentos de medição e representar e interpretar modelos explicativos de fenômenos físicos.", tags: ["método científico", "hipótese", "experimento", "medição", "física experimental"] },
  { codigo: "EM13CNT302", area: "CNT", componente: "Física", descricao: "Comunicar, para públicos variados, em diversos contextos, resultados de análises, pesquisas e/ou experimentos.", tags: ["comunicação científica", "divulgação", "experimentos", "relatório"] },
  { codigo: "EM13CNT303", area: "CNT", componente: "Física", descricao: "Interpretar textos de divulgação científica que tratem de situações relacionadas à Física do cotidiano.", tags: ["divulgação científica", "física do cotidiano", "interpretação de texto", "ciência"] },
  { codigo: "EM13CNT304", area: "CNT", componente: "Física", descricao: "Analisar e discutir fontes de energia — renováveis e não renováveis — e seu impacto ambiental.", tags: ["energia renovável", "energia não renovável", "sustentabilidade", "matriz energética"] },

  // Física — tópicos específicos ENEM
  { codigo: "EM13CNT_MECANICA", area: "CNT", componente: "Física", descricao: "Cinemática escalar e vetorial: movimento uniforme (MU), movimento uniformemente variado (MUV), queda livre, lançamento de projéteis.", tags: ["cinemática", "MU", "MUV", "queda livre", "lançamento oblíquo", "velocidade", "aceleração"] },
  { codigo: "EM13CNT_DINAMICA", area: "CNT", componente: "Física", descricao: "Dinâmica: 1ª, 2ª e 3ª leis de Newton, força de atrito, força normal, força gravitacional, peso.", tags: ["leis de Newton", "força resultante", "atrito", "gravidade", "peso", "massa"] },
  { codigo: "EM13CNT_ONDAS", area: "CNT", componente: "Física", descricao: "Ondulatória: ondas mecânicas e eletromagnéticas, frequência, comprimento de onda, velocidade, refração, difração, interferência, som e luz.", tags: ["ondas", "luz", "som", "frequência", "comprimento de onda", "refração", "optica"] },
  { codigo: "EM13CNT_ELETRO", area: "CNT", componente: "Física", descricao: "Eletricidade e Magnetismo: lei de Coulomb, campo elétrico, potencial elétrico, corrente elétrica, resistência, leis de Ohm, circuitos elétricos, campo magnético, indução eletromagnética.", tags: ["eletricidade", "magnetismo", "resistência", "corrente elétrica", "Ohm", "circuitos", "campo elétrico"] },
  { codigo: "EM13CNT_TERMO", area: "CNT", componente: "Física", descricao: "Termodinâmica: temperatura, calor, calorimetria, mudanças de estado, leis da termodinâmica, entropia, máquinas térmicas.", tags: ["termologia", "calor", "temperatura", "calorimetria", "termodinâmica", "entropia"] },

  // ═══════════════════════════════════════════════════════════════════════════
  // CIÊNCIAS DA NATUREZA — Química
  // ═══════════════════════════════════════════════════════════════════════════
  { codigo: "EM13CNT_QUIMICA_GERAL", area: "CNT", componente: "Química", descricao: "Estrutura atômica, tabela periódica, ligações químicas (iônica, covalente, metálica), geometria molecular, forças intermoleculares.", tags: ["átomo", "tabela periódica", "ligação iônica", "ligação covalente", "estrutura atômica", "elétrons"] },
  { codigo: "EM13CNT_REACOES", area: "CNT", componente: "Química", descricao: "Reações químicas, estequiometria, leis de conservação, balanceamento, tipos de reações (síntese, análise, deslocamento, dupla troca).", tags: ["reações químicas", "estequiometria", "balanceamento", "equações químicas"] },
  { codigo: "EM13CNT_SOLUCOES", area: "CNT", componente: "Química", descricao: "Soluções: concentração comum, molar (molaridade), pH, ácidos e bases (Arrhenius, Brønsted-Lowry), hidrólise, tampão.", tags: ["soluções", "concentração", "molaridade", "pH", "ácidos e bases", "neutralização"] },
  { codigo: "EM13CNT_ELETROQUIMICA", area: "CNT", componente: "Química", descricao: "Eletroquímica: oxirredução, número de oxidação (NOX), pilhas galvânicas, eletrólise, corrosão.", tags: ["eletroquímica", "oxirredução", "NOX", "pilhas", "eletrólise", "oxidação"] },
  { codigo: "EM13CNT_ORGANICA", area: "CNT", componente: "Química", descricao: "Química orgânica: hidrocarbonetos, funções orgânicas (álcool, ácido carboxílico, éster, amina, aldeído, cetona), isomeria, reações orgânicas (adição, substituição, eliminação).", tags: ["química orgânica", "hidrocarbonetos", "funções orgânicas", "isomeria", "polímeros"] },
  { codigo: "EM13CNT_CINETICA", area: "CNT", componente: "Química", descricao: "Cinética química e equilíbrio: velocidade de reação, fatores, lei da ação das massas (Kc, Kp), deslocamento de equilíbrio (Le Chatelier).", tags: ["cinética química", "equilíbrio", "Le Chatelier", "velocidade de reação"] },
  { codigo: "EM13CNT_QUIMICA_VIDA", area: "CNT", componente: "Química", descricao: "Química da vida: bioquímica (proteínas, carboidratos, lipídeos, ácidos nucleicos), vitaminas, fermentação, combustíveis, polímeros naturais e sintéticos.", tags: ["bioquímica", "proteínas", "carboidratos", "DNA", "lipídeos", "combustíveis"] },

  // ═══════════════════════════════════════════════════════════════════════════
  // CIÊNCIAS DA NATUREZA — Biologia
  // ═══════════════════════════════════════════════════════════════════════════
  { codigo: "EM13CNT_CELULA", area: "CNT", componente: "Biologia", descricao: "Citologia: estrutura celular, organelas, membrana plasmática, núcleo, mitose e meiose, ciclo celular, diferença entre célula procariótica e eucariótica.", tags: ["citologia", "célula", "organelas", "mitose", "meiose", "DNA", "reprodução celular"] },
  { codigo: "EM13CNT_GENETICA", area: "CNT", componente: "Biologia", descricao: "Genética: leis de Mendel, herança (dominância, recessividade, codominância), ligação gênica, mutações, biotecnologia, genoma, DNA recombinante.", tags: ["genética", "leis de Mendel", "hereditariedade", "DNA", "biotecnologia", "mutação"] },
  { codigo: "EM13CNT_EVOLUCAO", area: "CNT", componente: "Biologia", descricao: "Evolução: teorias (Lamarck, Darwin, síntese moderna), seleção natural, especiação, deriva genética, adaptação, evidências da evolução.", tags: ["evolução", "Darwin", "seleção natural", "Lamarck", "especiação", "adaptação"] },
  { codigo: "EM13CNT_ECOLOGIA", area: "CNT", componente: "Biologia", descricao: "Ecologia: ecossistemas, cadeias e teias alimentares, ciclos biogeoquímicos, relações ecológicas, biomas brasileiros, impactos ambientais.", tags: ["ecologia", "ecossistema", "biomas", "cadeia alimentar", "ciclos biogeoquímicos", "biodiversidade"] },
  { codigo: "EM13CNT_FISIOLOGIA", area: "CNT", componente: "Biologia", descricao: "Fisiologia humana: sistemas digestório, circulatório, respiratório, excretor, nervoso, endócrino, imunológico e reprodutor.", tags: ["fisiologia", "sistema digestório", "circulação", "respiração", "nervoso", "imunologia", "hormônios"] },
  { codigo: "EM13CNT_BOTANICA_ZOO", area: "CNT", componente: "Biologia", descricao: "Botânica e zoologia: reinos dos seres vivos, classificação biológica, grupos vegetais e animais, vírus, bactérias, fungos, protistas.", tags: ["botânica", "zoologia", "seres vivos", "classificação", "reinos", "vírus", "bactérias"] },

  // ═══════════════════════════════════════════════════════════════════════════
  // CIÊNCIAS HUMANAS E SOCIAIS APLICADAS — História
  // ═══════════════════════════════════════════════════════════════════════════
  { codigo: "EM13CHS101", area: "CHS", componente: "História", descricao: "Analisar e comparar diferentes formas de compreensão do tempo e do espaço: concepções presentes em diferentes culturas, sociedades e ciências.", tags: ["tempo histórico", "espaço", "historiografia", "cultura", "civilização"] },
  { codigo: "EM13CHS102", area: "CHS", componente: "História", descricao: "Analisar e avaliar os impasses éticos, filosóficos, estéticos e religiosos decorrentes das transformações científicas e tecnológicas no mundo contemporâneo.", tags: ["modernidade", "ciência e tecnologia", "ética", "contemporâneo"] },
  { codigo: "EM13CHS103", area: "CHS", componente: "História", descricao: "Elaborar hipóteses, selecionar evidências e compor argumentos relativos a processos políticos, econômicos, sociais, ambientais, culturais e epistêmicos.", tags: ["argumentação", "evidências históricas", "processo histórico", "historiografia"] },
  { codigo: "EM13CHS201", area: "CHS", componente: "História", descricao: "Analisar o surgimento das primeiras civilizações (Mesopotâmia, Egito, Grécia e Roma) e suas contribuições para as civilizações posteriores.", tags: ["civilizações antigas", "Grécia", "Roma", "Egito", "Mesopotâmia", "Antiguidade"] },
  { codigo: "EM13CHS202", area: "CHS", componente: "História", descricao: "Analisar os processos de formação e desenvolvimento do feudalismo europeu, a Igreja Católica e as Cruzadas.", tags: ["feudalismo", "Idade Média", "Igreja Católica", "cruzadas", "senhores feudais"] },
  { codigo: "EM13CHS203", area: "CHS", componente: "História", descricao: "Analisar os processos de conquista e colonização das Américas e da África, os sistemas de exploração e a escravidão.", tags: ["colonização", "escravidão", "exploração colonial", "Américas", "Brasil colonial"] },
  { codigo: "EM13CHS204", area: "CHS", componente: "História", descricao: "Analisar os processos das Revoluções burguesas (Inglesa, Francesa e Industrial) e suas repercussões globais.", tags: ["Revolução Francesa", "Revolução Industrial", "iluminismo", "liberalismo", "burguesia"] },
  { codigo: "EM13CHS205", area: "CHS", componente: "História", descricao: "Analisar os processos do imperialismo e neocolonialismo europeu e seus impactos na África, Ásia e Américas.", tags: ["imperialismo", "neocolonialismo", "África", "Ásia", "século XIX"] },
  { codigo: "EM13CHS206", area: "CHS", componente: "História", descricao: "Analisar a Primeira e Segunda Guerras Mundiais, o Holocausto, totalitarismos (nazismo, fascismo, stalinismo) e suas consequências.", tags: ["Primeira Guerra Mundial", "Segunda Guerra Mundial", "nazismo", "fascismo", "Holocausto", "totalitarismo"] },
  { codigo: "EM13CHS207", area: "CHS", componente: "História", descricao: "Analisar a Guerra Fria, o processo de descolonização, os movimentos de resistência e a Nova Ordem Mundial.", tags: ["Guerra Fria", "EUA", "URSS", "descolonização", "capitalismo", "socialismo"] },
  { codigo: "EM13CHS208", area: "CHS", componente: "História", descricao: "Analisar a formação do Brasil, da Independência à República, incluindo o período imperial, abolição da escravidão e proclamação da República.", tags: ["história do Brasil", "Independência do Brasil", "Império", "abolição", "República Velha"] },
  { codigo: "EM13CHS209", area: "CHS", componente: "História", descricao: "Analisar a Era Vargas, o Estado Novo, a redemocratização, o período militar e a redemocratização pós-1985.", tags: ["Era Vargas", "ditadura militar", "redemocratização", "golpe de 1964", "Brasil republicano"] },
  { codigo: "EM13CHS210", area: "CHS", componente: "História", descricao: "Analisar o período contemporâneo: globalização, neoliberalismo, movimentos sociais, direitos humanos, identidade cultural.", tags: ["globalização", "neoliberalismo", "movimentos sociais", "direitos humanos", "contemporâneo"] },

  // ═══════════════════════════════════════════════════════════════════════════
  // CIÊNCIAS HUMANAS — Geografia
  // ═══════════════════════════════════════════════════════════════════════════
  { codigo: "EM13CHS301", area: "CHS", componente: "Geografia", descricao: "Analisar e comparar as matrizes conceituais e as dinâmicas das diferentes formas de organização do espaço geográfico.", tags: ["espaço geográfico", "território", "lugar", "região", "cartografia"] },
  { codigo: "EM13CHS302", area: "CHS", componente: "Geografia", descricao: "Analisar as dinâmicas das populações e os processos migratórios em diferentes escalas.", tags: ["população", "migração", "crescimento demográfico", "urbanização", "êxodo rural"] },
  { codigo: "EM13CHS303", area: "CHS", componente: "Geografia", descricao: "Analisar a formação, a expansão e as transformações da rede urbana brasileira e mundial.", tags: ["urbanização", "cidade", "metropolização", "redes urbanas", "hierarquia urbana"] },
  { codigo: "EM13CHS304", area: "CHS", componente: "Geografia", descricao: "Relacionar as transformações territoriais resultantes de processos de industrialização, globalização e desenvolvimento econômico.", tags: ["industrialização", "globalização", "economia", "desigualdade regional", "PIB"] },
  { codigo: "EM13CHS305", area: "CHS", componente: "Geografia", descricao: "Analisar os fenômenos naturais (clima, relevo, hidrografia, biomas, solos) e suas interações com o espaço geográfico.", tags: ["clima", "biomas", "relevo", "hidrografia", "meio ambiente", "solos"] },
  { codigo: "EM13CHS306", area: "CHS", componente: "Geografia", descricao: "Analisar os impactos das atividades humanas no ambiente — desmatamento, poluição, aquecimento global, escassez hídrica.", tags: ["impacto ambiental", "desmatamento", "poluição", "aquecimento global", "Amazônia", "recursos naturais"] },
  { codigo: "EM13CHS307", area: "CHS", componente: "Geografia", descricao: "Identificar e analisar as relações entre o campo e a cidade, a questão agrária, os conflitos fundiários e as políticas agrícolas.", tags: ["campo e cidade", "agricultura", "reforma agrária", "agronegócio", "MST"] },
  { codigo: "EM13CHS308", area: "CHS", componente: "Geografia", descricao: "Analisar as geopolíticas mundiais (organizações internacionais, blocos econômicos, conflitos territoriais) e o papel do Brasil.", tags: ["geopolítica", "ONU", "blocos econômicos", "BRICS", "conflitos geopolíticos", "MERCOSUL"] },

  // ═══════════════════════════════════════════════════════════════════════════
  // CIÊNCIAS HUMANAS — Filosofia
  // ═══════════════════════════════════════════════════════════════════════════
  { codigo: "EM13CHS401", area: "CHS", componente: "Filosofia", descricao: "Analisar o surgimento da filosofia na Grécia Antiga e as principais correntes filosóficas (pré-socráticos, Sócrates, Platão, Aristóteles).", tags: ["filosofia grega", "Sócrates", "Platão", "Aristóteles", "pré-socráticos", "antiguidade"] },
  { codigo: "EM13CHS402", area: "CHS", componente: "Filosofia", descricao: "Analisar as principais teorias do conhecimento (epistemologia): empirismo, racionalismo, criticismo kantiano, ceticismo.", tags: ["epistemologia", "conhecimento", "empirismo", "racionalismo", "Kant", "ceticismo"] },
  { codigo: "EM13CHS403", area: "CHS", componente: "Filosofia", descricao: "Analisar teorias éticas (utilitarismo, deontologia, virtue ethics) e aplicá-las a dilemas morais contemporâneos.", tags: ["ética", "moral", "utilitarismo", "Kant", "dilemas morais", "valores"] },
  { codigo: "EM13CHS404", area: "CHS", componente: "Filosofia", descricao: "Analisar as relações entre o indivíduo e a sociedade, as teorias políticas (contrato social, democracia, liberalismo, marxismo).", tags: ["filosofia política", "democracia", "contrato social", "Locke", "Rousseau", "Marx", "liberalismo"] },
  { codigo: "EM13CHS405", area: "CHS", componente: "Filosofia", descricao: "Identificar e analisar argumentos — premissas, conclusões, falácias — e construir raciocínios válidos em diferentes contextos.", tags: ["lógica", "argumentação", "falácias", "silogismo", "raciocínio"] },

  // ═══════════════════════════════════════════════════════════════════════════
  // CIÊNCIAS HUMANAS — Sociologia
  // ═══════════════════════════════════════════════════════════════════════════
  { codigo: "EM13CHS501", area: "CHS", componente: "Sociologia", descricao: "Analisar os fundadores da sociologia (Durkheim, Weber, Marx) e suas principais contribuições para a compreensão da sociedade.", tags: ["sociologia", "Durkheim", "Weber", "Marx", "fundadores", "teoria sociológica"] },
  { codigo: "EM13CHS502", area: "CHS", componente: "Sociologia", descricao: "Analisar os processos de estratificação social, desigualdade, mobilidade e as formas de dominação e resistência.", tags: ["estratificação social", "desigualdade", "classes sociais", "dominação", "mobilidade social"] },
  { codigo: "EM13CHS503", area: "CHS", componente: "Sociologia", descricao: "Analisar os movimentos sociais (trabalhistas, feministas, LGBTQIA+, étnico-raciais, ambientalistas) e suas conquistas.", tags: ["movimentos sociais", "feminismo", "direitos civis", "LGBTQIA+", "racismo", "trabalhismo"] },
  { codigo: "EM13CHS504", area: "CHS", componente: "Sociologia", descricao: "Analisar as relações étnico-raciais no Brasil, o racismo estrutural, a escravidão e suas heranças contemporâneas.", tags: ["racismo", "relações raciais", "escravidão", "identidade racial", "discriminação", "cotas"] },
  { codigo: "EM13CHS505", area: "CHS", componente: "Sociologia", descricao: "Analisar os processos de globalização e seus impactos sobre identidade cultural, consumo, trabalho e democracia.", tags: ["globalização", "cultura", "identidade", "consumismo", "trabalho", "redes sociais"] },
  { codigo: "EM13CHS506", area: "CHS", componente: "Sociologia", descricao: "Analisar as transformações no mundo do trabalho (automação, uberização, trabalho precário, sindicalismo).", tags: ["trabalho", "automação", "sindicalismo", "emprego", "capitalismo", "uberização"] },
];

// ─── Indexes for fast lookup ──────────────────────────────────────────────────
export const HABILIDADES_BY_AREA: Record<string, BnccHabilidade[]> = {};
export const HABILIDADES_BY_COMPONENTE: Record<string, BnccHabilidade[]> = {};

for (const h of BNCC_HABILIDADES) {
  if (!HABILIDADES_BY_AREA[h.area]) HABILIDADES_BY_AREA[h.area] = [];
  HABILIDADES_BY_AREA[h.area].push(h);

  if (!HABILIDADES_BY_COMPONENTE[h.componente]) HABILIDADES_BY_COMPONENTE[h.componente] = [];
  HABILIDADES_BY_COMPONENTE[h.componente].push(h);
}

// ─── Full-text search over habilidades ───────────────────────────────────────
export function searchBncc(query: string, componente?: string, area?: string): BnccHabilidade[] {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const words = q.split(/\s+/).filter(w => w.length >= 2);
  if (!words.length) return [];

  let pool = BNCC_HABILIDADES;
  if (area) pool = pool.filter(h => h.area === area);
  if (componente) pool = pool.filter(h => h.componente.toLowerCase().includes(componente.toLowerCase()));

  return pool
    .map(h => {
      const haystack = [h.descricao, h.codigo, h.componente, h.unidade || "", ...(h.tags || [])]
        .join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const score = words.filter(w => haystack.includes(w)).length;
      return { h, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ h }) => h)
    .slice(0, 15);
}

/**
 * Get related BNCC habilidades for AI context.
 * Returns a compact text block ready for inclusion in a system prompt.
 */
export function getBnccContext(query: string, componente?: string): string {
  const results = searchBncc(query, componente);
  if (!results.length) return "";

  const lines = results.slice(0, 5).map(h =>
    `[BNCC ${h.codigo} — ${h.componente}${h.unidade ? " / " + h.unidade : ""}] ${h.descricao}`
  );
  return `\n\nHABILIDADES BNCC RELACIONADAS:\n${lines.join("\n")}`;
}
