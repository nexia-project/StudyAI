/**
 * ENEM Microdados — tipos compartilhados (PR-3, data scaffolding).
 *
 * Modelo enxuto que cobre o que precisamos para "questão do dia", banco de
 * questões e simulados orientados ao currículo. Quando integrarmos os
 * microdados oficiais do INEP, este tipo será o destino canônico do parser
 * — preserve a estabilidade da forma (campos opcionais > breaking changes).
 */

/**
 * Áreas oficiais do ENEM:
 *   - LC  Linguagens, Códigos e suas Tecnologias
 *   - MT  Matemática e suas Tecnologias
 *   - CN  Ciências da Natureza e suas Tecnologias
 *   - CH  Ciências Humanas e suas Tecnologias
 *   - R   Redação (não tem alternativas; tema dissertativo-argumentativo)
 */
export type EnemArea = "LC" | "MT" | "CN" | "CH" | "R";

/** Ano de aplicação da prova (ENEM regular). */
export type EnemAno = number;

/** Letra da alternativa (A–E). Redação não tem alternativas. */
export type EnemLetra = "A" | "B" | "C" | "D" | "E";

export interface EnemAlternativa {
  letra: EnemLetra;
  texto: string;
  /** Quando true, é o gabarito oficial. Exatamente UMA alternativa deve ser correta. */
  correta: boolean;
}

export interface EnemQuestao {
  /** Identificador canônico estável. Convenção: `enem-{ano}-{numero}` ou `enem-{ano}-r{tema}` para redação. */
  id: string;
  /** Ano de aplicação. */
  ano: EnemAno;
  /** Número da questão na prova (1-180 em provas regulares; 0 quando não aplicável). */
  numero: number;
  area: EnemArea;
  /** Disciplina específica (Matemática, Física, Sociologia, etc.) — informativo. */
  disciplina: string;
  /** Tema/conteúdo principal (cinemática, função afim, vanguardas modernistas, etc.). */
  tema: string;
  /** Texto-base / contexto. */
  enunciado: string;
  /** Pergunta direta ao candidato (pode coincidir com a última linha do enunciado). */
  comando: string;
  /** Alternativas A-E. Vazio para Redação. */
  alternativas: EnemAlternativa[];
  /** Letra do gabarito oficial (null para Redação). */
  gabarito: EnemLetra | null;
  /** Resolução curta (1 linha basta). */
  resolucao: string;
  /** Códigos BNCC alinhados (opcional, preenchido por alinhamento manual ou heurístico). */
  bnccCodigos?: string[];
  /**
   * Marca interna de proveniência:
   *   - `__SEED_PLACEHOLDER__`: placeholder do seed inicial (texto inventado), a
   *     ser substituído por dado oficial.
   *   - `__REAL__`: dado oficial inserido manualmente (curado).
   *   - `__OFFICIAL__`: dado oficial importado automaticamente via
   *     `scripts/ingest-enem.ts` (espelho api.enem.dev).
   */
  flag?: "__SEED_PLACEHOLDER__" | "__REAL__" | "__OFFICIAL__";
  /** URL canônica da prova/imagem oficial, quando conhecida. */
  fonteUrl?: string;
}
