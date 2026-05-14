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
 * Macro-áreas que cobrem o conteúdo típico de concursos públicos +
 * licenciamento profissional na saúde.
 *
 * Direito cobre OAB. Medicina cobre Revalida + Enare (residência médica).
 * Especialidades multi-profissionais do Enare Multi viram áreas próprias
 * sempre que tiverem volume suficiente (≥10 questões) — o resto cai em
 * `OUTROS` (Saúde coletiva, Fonoaudiologia, Medicina veterinária, etc.).
 *
 * Declarado como `as const` array para servir tanto de fonte do tipo
 * (via `typeof`) quanto de set de validação em runtime (routes/concursos.ts)
 * — assim a lista nunca diverge entre compilação e validação HTTP.
 */
export const CONCURSO_AREAS = [
  "DIREITO",
  "PORTUGUES",
  "MATEMATICA",
  "RACIOCINIO_LOGICO",
  "INFORMATICA",
  "ATUALIDADES",
  "LEGISLACAO",
  "MEDICINA",
  "ENFERMAGEM",
  "FARMACIA",
  "ODONTOLOGIA",
  "FISIOTERAPIA",
  "NUTRICAO",
  "PSICOLOGIA",
  "SERVICO_SOCIAL",
  "BIOMEDICINA",
  "OUTROS",
] as const;

export type ConcursoArea = (typeof CONCURSO_AREAS)[number];

/**
 * Rótulos PT-BR amigáveis pra UI. Mantemos aqui (e não só no frontend)
 * porque scripts e logs do backend também precisam exibir nomes legíveis.
 */
export const CONCURSO_AREA_LABEL: Record<ConcursoArea, string> = {
  DIREITO: "Direito",
  PORTUGUES: "Português",
  MATEMATICA: "Matemática",
  RACIOCINIO_LOGICO: "Raciocínio Lógico",
  INFORMATICA: "Informática",
  ATUALIDADES: "Atualidades",
  LEGISLACAO: "Legislação",
  MEDICINA: "Medicina",
  ENFERMAGEM: "Enfermagem",
  FARMACIA: "Farmácia",
  ODONTOLOGIA: "Odontologia",
  FISIOTERAPIA: "Fisioterapia",
  NUTRICAO: "Nutrição",
  PSICOLOGIA: "Psicologia",
  SERVICO_SOCIAL: "Serviço Social",
  BIOMEDICINA: "Biomedicina",
  OUTROS: "Outros",
};

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
