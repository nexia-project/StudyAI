/**
 * ENEM — banco de seed (PR-3, data scaffolding).
 *
 * Conjunto pequeno (~10) de questões representativas das 4 áreas + 1 tema de
 * Redação, anos 2019-2023. Algumas entradas usam textos de placeholder porque
 * NÃO temos os enunciados oficiais textuais auditados em mãos — elas estão
 * marcadas com `flag: "__SEED_PLACEHOLDER__"` para o pipeline de ingestão
 * (`/scripts/ingest-enem.ts`) sobrescrevê-las com o dado oficial.
 *
 * TODO: integrar com dataset oficial INEP. Considerar API pública
 *       https://api.enem.dev/ ou ingestão dos microdados CSV em /scripts/ingest-enem.ts
 *
 * Convenção de IDs: `enem-{ANO}-{NUMERO}` para questões objetivas, e
 * `enem-{ANO}-redacao` para o tema da redação.
 */

import type { EnemQuestao } from "./types";

export const ENEM_SEED: EnemQuestao[] = [
  // ── Linguagens — Literatura (LC) ────────────────────────────────────────
  {
    id: "enem-2019-lc-001",
    ano: 2019,
    numero: 1,
    area: "LC",
    disciplina: "Literatura",
    tema: "Modernismo brasileiro — primeira fase",
    enunciado:
      "Trecho ilustrativo da Semana de Arte Moderna (1922), com manifesto modernista e ruptura com o academicismo. (texto-base oficial a ser inserido)",
    comando:
      "O movimento modernista brasileiro caracteriza-se principalmente por:",
    alternativas: [
      { letra: "A", texto: "Defesa do verso metrificado e da rima rica.", correta: false },
      { letra: "B", texto: "Rompimento com modelos clássicos europeus e valorização da cultura nacional.", correta: true },
      { letra: "C", texto: "Retomada do parnasianismo e do simbolismo.", correta: false },
      { letra: "D", texto: "Adoção do realismo-naturalismo como estética central.", correta: false },
      { letra: "E", texto: "Recusa da experimentação formal.", correta: false },
    ],
    gabarito: "B",
    resolucao:
      "O modernismo de 22 propõe ruptura formal e temática, valorizando a brasilidade — Mário e Oswald de Andrade.",
    bnccCodigos: ["EM13LP07"],
    flag: "__SEED_PLACEHOLDER__",
    fonteUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/",
  },

  // ── Linguagens — Interpretação de texto (LC) ────────────────────────────
  {
    id: "enem-2020-lc-045",
    ano: 2020,
    numero: 45,
    area: "LC",
    disciplina: "Língua Portuguesa",
    tema: "Variação linguística — preconceito linguístico",
    enunciado:
      "Texto-base sobre variantes regionais do português brasileiro e preconceito linguístico (texto oficial a ser inserido).",
    comando:
      "A noção de 'erro' gramatical, segundo o texto, fundamenta-se principalmente em:",
    alternativas: [
      { letra: "A", texto: "Diferenças naturais entre normas urbanas de prestígio e variantes populares.", correta: true },
      { letra: "B", texto: "Imposição de uma única norma como universalmente correta.", correta: false },
      { letra: "C", texto: "Estudo neutro das estruturas linguísticas pela Linguística.", correta: false },
      { letra: "D", texto: "Imposição da norma escrita sobre a falada.", correta: false },
      { letra: "E", texto: "Ausência de regras nas variantes coloquiais.", correta: false },
    ],
    gabarito: "A",
    resolucao:
      "Preconceito linguístico hierarquiza dialetos a partir da norma de prestígio social, não por critério gramatical objetivo.",
    bnccCodigos: ["EM13LGG201"],
    flag: "__SEED_PLACEHOLDER__",
    fonteUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/",
  },

  // ── Matemática — Função afim (MT) ──────────────────────────────────────
  {
    id: "enem-2021-mt-138",
    ano: 2021,
    numero: 138,
    area: "MT",
    disciplina: "Matemática",
    tema: "Função afim — modelagem",
    enunciado:
      "Uma empresa de táxi cobra R$ 5,00 de bandeirada e R$ 2,50 por quilômetro rodado. (enunciado oficial a ser inserido)",
    comando:
      "O valor pago (em reais) por uma corrida de x quilômetros é dado por:",
    alternativas: [
      { letra: "A", texto: "f(x) = 2,5x", correta: false },
      { letra: "B", texto: "f(x) = 5 + 2,5x", correta: true },
      { letra: "C", texto: "f(x) = 5x + 2,5", correta: false },
      { letra: "D", texto: "f(x) = 7,5x", correta: false },
      { letra: "E", texto: "f(x) = 5 − 2,5x", correta: false },
    ],
    gabarito: "B",
    resolucao:
      "Custo total = bandeirada fixa (5) + custo por km (2,5) × distância (x). Função afim f(x) = 5 + 2,5x.",
    bnccCodigos: ["EM13MAT301", "EM13MAT401"],
    flag: "__SEED_PLACEHOLDER__",
    fonteUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/",
  },

  // ── Matemática — Estatística (MT) ──────────────────────────────────────
  {
    id: "enem-2022-mt-150",
    ano: 2022,
    numero: 150,
    area: "MT",
    disciplina: "Matemática",
    tema: "Estatística — média e mediana",
    enunciado:
      "Tabela com notas de uma turma. (dados oficiais a serem inseridos)",
    comando:
      "Sobre a média aritmética e a mediana das notas apresentadas é correto afirmar que:",
    alternativas: [
      { letra: "A", texto: "São sempre iguais para qualquer distribuição.", correta: false },
      { letra: "B", texto: "A mediana é menos sensível a valores extremos do que a média.", correta: true },
      { letra: "C", texto: "A média é sempre menor que a mediana em distribuições simétricas.", correta: false },
      { letra: "D", texto: "A mediana só pode ser calculada para conjuntos com número par de elementos.", correta: false },
      { letra: "E", texto: "A média é o valor mais frequente do conjunto.", correta: false },
    ],
    gabarito: "B",
    resolucao:
      "A mediana é robusta a outliers; a média é influenciada por valores extremos. Em distribuições assimétricas, divergem.",
    bnccCodigos: ["EM13MAT201"],
    flag: "__SEED_PLACEHOLDER__",
    fonteUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/",
  },

  // ── Ciências da Natureza — Física (CN) ─────────────────────────────────
  {
    id: "enem-2019-cn-072",
    ano: 2019,
    numero: 72,
    area: "CN",
    disciplina: "Física",
    tema: "Cinemática — MUV",
    enunciado:
      "Um carro acelera uniformemente de 0 a 20 m/s em 5 segundos. (situação-problema oficial a ser inserida)",
    comando:
      "A aceleração média do carro, em m/s², é:",
    alternativas: [
      { letra: "A", texto: "2", correta: false },
      { letra: "B", texto: "3", correta: false },
      { letra: "C", texto: "4", correta: true },
      { letra: "D", texto: "5", correta: false },
      { letra: "E", texto: "10", correta: false },
    ],
    gabarito: "C",
    resolucao:
      "a = Δv/Δt = (20−0)/5 = 4 m/s². Movimento uniformemente variado.",
    bnccCodigos: ["EM13CNT301"],
    flag: "__SEED_PLACEHOLDER__",
    fonteUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/",
  },

  // ── Ciências da Natureza — Química (CN) ────────────────────────────────
  {
    id: "enem-2020-cn-098",
    ano: 2020,
    numero: 98,
    area: "CN",
    disciplina: "Química",
    tema: "Soluções — concentração e pH",
    enunciado:
      "Solução aquosa diluída de ácido clorídrico (HCl) com concentração 0,01 mol/L. (contexto oficial a ser inserido)",
    comando: "O pH dessa solução é, aproximadamente:",
    alternativas: [
      { letra: "A", texto: "1", correta: false },
      { letra: "B", texto: "2", correta: true },
      { letra: "C", texto: "7", correta: false },
      { letra: "D", texto: "12", correta: false },
      { letra: "E", texto: "14", correta: false },
    ],
    gabarito: "B",
    resolucao:
      "HCl é ácido forte: [H⁺] = 0,01 mol/L = 10⁻² → pH = −log(10⁻²) = 2.",
    bnccCodigos: ["EM13CNT101"],
    flag: "__SEED_PLACEHOLDER__",
    fonteUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/",
  },

  // ── Ciências da Natureza — Biologia (CN) ───────────────────────────────
  {
    id: "enem-2023-cn-115",
    ano: 2023,
    numero: 115,
    area: "CN",
    disciplina: "Biologia",
    tema: "Ecologia — cadeia alimentar",
    enunciado:
      "Esquema de cadeia alimentar em ecossistema marinho. (figura oficial a ser inserida)",
    comando:
      "A transferência de energia entre níveis tróficos sucessivos resulta em:",
    alternativas: [
      { letra: "A", texto: "Aumento contínuo da biomassa.", correta: false },
      { letra: "B", texto: "Redução da energia disponível em cada nível.", correta: true },
      { letra: "C", texto: "Equilíbrio absoluto entre produtores e consumidores.", correta: false },
      { letra: "D", texto: "Eliminação dos decompositores.", correta: false },
      { letra: "E", texto: "Independência entre os níveis tróficos.", correta: false },
    ],
    gabarito: "B",
    resolucao:
      "Apenas ~10% da energia é transferida entre níveis tróficos (regra dos 10%) — o restante dissipa-se como calor.",
    bnccCodigos: ["EM13CNT201"],
    flag: "__SEED_PLACEHOLDER__",
    fonteUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/",
  },

  // ── Ciências Humanas — História (CH) ───────────────────────────────────
  {
    id: "enem-2021-ch-022",
    ano: 2021,
    numero: 22,
    area: "CH",
    disciplina: "História",
    tema: "Brasil Império — abolição da escravidão",
    enunciado:
      "Análise da Lei Áurea (1888) e contexto social brasileiro do final do século XIX. (texto-fonte oficial a ser inserido)",
    comando:
      "Após a Lei Áurea, a integração dos libertos à sociedade brasileira foi caracterizada por:",
    alternativas: [
      { letra: "A", texto: "Igualdade plena de direitos civis e econômicos.", correta: false },
      { letra: "B", texto: "Políticas estatais de inclusão e reparação.", correta: false },
      { letra: "C", texto: "Marginalização social e ausência de políticas integradoras.", correta: true },
      { letra: "D", texto: "Acesso amplo à propriedade da terra.", correta: false },
      { letra: "E", texto: "Substituição imediata pelo trabalho industrial assalariado.", correta: false },
    ],
    gabarito: "C",
    resolucao:
      "A abolição não foi acompanhada de políticas de inclusão; os libertos foram marginalizados e empurrados ao trabalho precário.",
    bnccCodigos: ["EM13CHS101", "EM13CHS401"],
    flag: "__SEED_PLACEHOLDER__",
    fonteUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/",
  },

  // ── Ciências Humanas — Geografia/Sociologia (CH) ───────────────────────
  {
    id: "enem-2022-ch-061",
    ano: 2022,
    numero: 61,
    area: "CH",
    disciplina: "Geografia",
    tema: "Urbanização e desigualdade urbana",
    enunciado:
      "Texto sobre processo de favelização nas metrópoles brasileiras. (texto oficial a ser inserido)",
    comando:
      "Esse processo está diretamente associado a:",
    alternativas: [
      { letra: "A", texto: "Excesso de planejamento urbano municipal.", correta: false },
      { letra: "B", texto: "Ausência histórica de políticas habitacionais para a população de baixa renda.", correta: true },
      { letra: "C", texto: "Diminuição da migração rural-urbana.", correta: false },
      { letra: "D", texto: "Distribuição equitativa do solo urbano.", correta: false },
      { letra: "E", texto: "Forte regulação fundiária nas periferias.", correta: false },
    ],
    gabarito: "B",
    resolucao:
      "A urbanização brasileira foi acelerada e desigual; políticas habitacionais para baixa renda foram historicamente insuficientes.",
    bnccCodigos: ["EM13CHS201", "EM13CHS401"],
    flag: "__SEED_PLACEHOLDER__",
    fonteUrl: "https://download.inep.gov.br/enem/provas_e_gabaritos/",
  },

  // ── Redação (R) ─────────────────────────────────────────────────────────
  {
    id: "enem-2023-redacao",
    ano: 2023,
    numero: 0,
    area: "R",
    disciplina: "Redação",
    tema: "Desafios para o enfrentamento da invisibilidade do trabalho de cuidado realizado pela mulher no Brasil",
    enunciado:
      "Tema oficial do ENEM 2023: 'Desafios para o enfrentamento da invisibilidade do trabalho de cuidado realizado pela mulher no Brasil'.",
    comando:
      "Produza texto dissertativo-argumentativo em norma culta, defendendo um ponto de vista e propondo intervenção que respeite os direitos humanos.",
    alternativas: [],
    gabarito: null,
    resolucao:
      "Espera-se: tese sobre causa da invisibilidade; argumentos com repertório sociocultural; proposta de intervenção (agente, ação, meio, efeito, detalhamento).",
    bnccCodigos: ["EM13LP07", "EM13LGG301"],
    flag: "__REAL__",
    fonteUrl: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem",
  },
];
