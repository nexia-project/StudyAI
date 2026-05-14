/**
 * Concursos públicos — tipos compartilhados.
 *
 * Espelha o shape do banco ENEM (`lib/enem/types.ts`) mas com vocabulário e
 * metadados próprios da realidade de concursos públicos brasileiros. Modelo
 * intencionalmente flexível (campos opcionais) porque misturamos:
 *   - Banca + cargo, quando disponíveis (CEBRASPE/FGV/VUNESP/FCC/OAB/etc.).
 *   - Área e ano, quando rotulados na fonte; sem inventar quando faltam.
 *   - Conteúdos de licenciamento profissional (OAB, Revalida, Enare) que, na
 *     prática, são tratados como concursos pelos candidatos.
 *
 * Quando passarmos a Postgres no futuro, este tipo é o destino canônico —
 * preserve a estabilidade da forma e prefira novos campos opcionais a breaking
 * changes.
 */

/**
 * Bancas examinadoras. `OUTRO` cobre exames de licenciamento (INEP/Revalida,
 * Ebserh/Enare) e bancas menores que não estão na lista canônica.
 */
export type ConcursoBanca = "CEBRASPE" | "FGV" | "VUNESP" | "FCC" | "OAB" | "OUTRO";

/**
 * Macro-áreas que cobrem o conteúdo típico de concursos públicos. `OUTROS`
 * absorve áreas técnicas (medicina, engenharia, etc.) até criarmos um
 * vocabulário mais rico.
 */
export type ConcursoArea =
  | "DIREITO"
  | "PORTUGUES"
  | "MATEMATICA"
  | "RACIOCINIO_LOGICO"
  | "INFORMATICA"
  | "ATUALIDADES"
  | "LEGISLACAO"
  | "OUTROS";

export interface ConcursoAlternativa {
  /** Letra da alternativa (geralmente A-E; OAB usa A-D). */
  letra: string;
  texto: string;
  /** True quando bate com o gabarito oficial. Exatamente UMA por questão. */
  correta: boolean;
}

export interface ConcursoQuestao {
  /** Identificador estável. Convenção: `concurso-{slug-fonte}-{id-original}`. */
  id: string;
  banca?: ConcursoBanca;
  area?: ConcursoArea;
  /** Ano de aplicação da prova (informativo). */
  ano?: number;
  /** Cargo / exame específico (ex.: "Advogado", "Médico", "Analista Judiciário"). */
  cargo?: string;
  enunciado: string;
  alternativas: ConcursoAlternativa[];
  /** Letra da alternativa correta (espelha `correta: true` em `alternativas`). */
  gabarito: string;
  /** Resolução curta / contexto extra (opcional). */
  explicacao?: string;
  /** Proveniência: nome do dataset HF + licença. Obrigatório para compliance. */
  fonte: string;
  /** URL canônica do dataset / registro original (HF dataset card, etc.). */
  fonteUrl?: string;
}
