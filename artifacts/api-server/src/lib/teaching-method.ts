/**
 * teaching-method.ts
 *
 * PR-2 do Tiagão — seleção automática (invisível) do método pedagógico.
 *
 * Três métodos inspirados em escolas brasileiras:
 *   • analitico  — estilo Anglo: "aula dada, aula estudada hoje", rigor acadêmico.
 *   • pragmatico — estilo Objetivo: velocidade, mnemônicas, foco em prova.
 *   • conectivo  — estilo COC/SEB: interdisciplinar, analogias, currículo em espiral.
 *
 * O aluno NÃO escolhe método. Tiagão decide invisivelmente com base em:
 *   1. Frustração persistente (override forçado → conectivo)
 *   2. Cansaço (→ pragmático)
 *   3. Objetivo concurso (→ pragmático)
 *   4. Vestibular elite / cursinho (→ analítico)
 *   5. Aluno mais jovem (fund. / 1º médio) (→ conectivo)
 *   6. Default ENEM (→ conectivo)
 *
 * Comandos explícitos do utilizador (ex.: "resume", "vai com calma", "exemplo do
 * dia a dia") têm precedência sobre a auto-escolha — ver `USER_OVERRIDE_HINTS`.
 */

export type TeachingMethod = "analitico" | "pragmatico" | "conectivo";

export type Sentimento =
  | "frustrado"
  | "confuso"
  | "cansado"
  | "animado"
  | "neutro";

export interface MethodInput {
  /** studentGoal: "enem" | "vestibular" | "concurso" | "concurso_militar" | etc */
  objetivo?: string | null;
  concursoAlvo?: string | null;
  /** studentGrade — fundamental / 1º médio / etc. */
  serie?: string | null;
  lastMethod?: TeachingMethod | null;
  lastSentiment?: Sentimento | null;
  /** 0..1 — desempenho recente (não usado ainda, reservado para futura calibração) */
  acertoRecente?: number | null;
  /** Quantas mensagens consecutivas com sentimento "frustrado" */
  frustrationStreak?: number;
}

export interface MethodDecision {
  method: TeachingMethod;
  reason: string;
}

export function pickTeachingMethod(input: MethodInput): MethodDecision {
  // 1) Frustração persistente força Conectivo (analogias) independente do perfil.
  if ((input.frustrationStreak ?? 0) >= 2) {
    return { method: "conectivo", reason: "frustração persistente — migrar para analogias" };
  }

  // 2) Cansaço → Pragmático (curto, bullet).
  if (input.lastSentiment === "cansado") {
    return { method: "pragmatico", reason: "aluno cansado — respostas curtas" };
  }

  const obj = (input.objetivo ?? "").toLowerCase();

  // 3) Concurso → Pragmático.
  if (obj.includes("concurso") || !!input.concursoAlvo) {
    return { method: "pragmatico", reason: "objetivo concurso" };
  }

  // 4) Vestibular elite (FUVEST/UNICAMP/ITA/IME) ou cursinho → Analítico.
  if (/(fuvest|unicamp|ita\b|ime\b|cursinho)/.test(obj)) {
    return { method: "analitico", reason: "vestibular elite/cursinho" };
  }

  // 5) Fundamental ou primeiro ano do médio → Conectivo (analogias).
  const serie = (input.serie ?? "").toLowerCase();
  if (/(fundamental|1º|primeiro|6º|7º|8º|9º)/.test(serie)) {
    return { method: "conectivo", reason: "aluno mais jovem" };
  }

  // 6) Default ENEM → Conectivo (alinhado à marca StudyAI).
  return { method: "conectivo", reason: "default" };
}

/** Diretrizes de método inseridas no system prompt. NÃO mencionar o nome do método ao aluno. */
export const TEACHING_METHOD_PROMPTS: Record<TeachingMethod, string> = {
  analitico: `Você está no modo ANALÍTICO (estilo Anglo — "aula dada, aula estudada hoje"). Diretrizes:
- Estrutura: [1. Contexto], [2. Conceito Central detalhado], [3. Fórmulas/Regras com 1 exemplo passo a passo].
- Tom: acadêmico, rigoroso, claro.
- Ao final de toda explicação teórica, gere 2 perguntas rápidas de fixação para testar entendimento.
- NÃO mencione o nome do método.`,

  pragmatico: `Você está no modo PRAGMÁTICO (estilo Objetivo — velocidade e memorização). Diretrizes:
- Vá direto ao ponto. Use bullet points curtos. Evite parágrafos longos.
- Sempre que possível, crie acrônimos, mnemônicas ou rimas.
- Destaque em negrito as palavras-chave que costumam ser "pegadinhas" em provas (ENEM/FUVEST/CESPE/FGV).
- Termine com um resumo de 2 linhas chamado "O que você não pode esquecer".
- NÃO mencione o nome do método.`,

  conectivo: `Você está no modo CONECTIVO (estilo COC/SEB — interdisciplinar e currículo em espiral). Diretrizes:
- Conecte o conceito a pelo menos uma outra disciplina ou ao dia a dia moderno (tecnologia, esportes, redes sociais, economia).
- Use analogias fortes e atuais.
- Tom: empático, curioso, provocativo.
- Termine com uma pergunta reflexiva que faça o aluno pensar como aquele conceito se aplica no mundo dele.
- NÃO mencione o nome do método.`,
};

/** Temperatura ideal por método. Analítico/Pragmático = previsibilidade. */
export function temperatureFor(method: TeachingMethod): number {
  if (method === "conectivo") return 0.6;
  return 0.25;
}

/** Overlay de tom em cima do método — sentimento ajusta, método é a base. */
export const SENTIMENT_TONE_OVERLAY: Record<Sentimento, string> = {
  frustrado:
    "TOM: empático. O aluno parece frustrado. Comece com algo como 'vamos por partes' ou 'isso aqui trava muita gente, normal'. Reduza a densidade.",
  confuso:
    "TOM: paciente. O aluno parece confuso. Use uma analogia simples ANTES da explicação técnica. Pergunte se ele quer um exemplo mais concreto.",
  cansado:
    "TOM: gentil e curto. O aluno parece cansado. Resposta enxuta (no máximo 6 linhas). Sugira pausa se for adequado.",
  animado:
    "TOM: energético. O aluno está engajado. Pode subir o nível de profundidade e propor um desafio extra ao final.",
  neutro: "",
};

/**
 * Pistas de override por comando explícito do utilizador.
 * Sempre que o aluno pedir "vai com calma", "resume", "me dá um exemplo do dia
 * a dia", respeitamos a vontade dele — sobrescreve o método auto-escolhido.
 */
export const USER_OVERRIDE_HINTS: Array<{
  pattern: RegExp;
  method?: TeachingMethod;
  tone?: Sentimento;
}> = [
  { pattern: /\b(resume|resumido|curto|r[áa]pido|direto)\b/i, method: "pragmatico" },
  { pattern: /\b(vai com calma|devagar|passo a passo|explica direito)\b/i, method: "analitico" },
  { pattern: /\b(exemplo do dia a dia|analogia|tipo[,.]? por exemplo|exemplo pr[áa]tico)\b/i, method: "conectivo" },
  { pattern: /\b(n[ãa]o entendi|t[ôo] perdido|confuso|complicado)\b/i, tone: "confuso" },
];
