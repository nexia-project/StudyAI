/**
 * Classificador de área para questões de concursos.
 *
 * Recebe os metadados textuais (`cargo`, `fonte`) de uma questão e devolve a
 * `ConcursoArea` apropriada. Usado em dois lugares:
 *   - `scripts/ingest-concursos.ts` durante a ingestão dos datasets HF.
 *   - `scripts/reclassify-concursos-areas.ts` quando precisamos rerodar a
 *     classificação sobre o seed-concursos.json já gerado (sem refetch).
 *
 * Regras (em ordem de prioridade, primeiro que casar vence; matching é
 * accent + case-insensitive):
 *   1. `area` já é "DIREITO" → preserva (OAB).
 *   2. Especialidades multi-profissionais via keyword no cargo/fonte:
 *      enfermagem, farmácia, odontologia, fisioterapia, nutrição, psicologia,
 *      serviço social, biomedicina.
 *   3. "revalida" no cargo/fonte → MEDICINA.
 *   4. "enare" sem "enare multi" → MEDICINA (residência médica).
 *   5. Senão → OUTROS (Saúde coletiva, Ciências biológicas, Fonoaudiologia,
 *      Terapia ocupacional, Educação física, Física médica, Medicina
 *      veterinária — todos < 100 questões, não justificam bucket próprio).
 */

import type { ConcursoArea } from "./types";

/** Normaliza pra lowercase ASCII (sem acentos) — facilita keyword matching. */
function normalize(text: string): string {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export interface ClassifyInput {
  /** Área pré-existente (se já estiver setada como DIREITO, preserva). */
  area?: ConcursoArea;
  cargo?: string;
  fonte?: string;
}

/**
 * Classifica uma questão de concurso em uma `ConcursoArea`.
 *
 * Idempotente: rodar duas vezes produz o mesmo resultado. Determinístico:
 * a ordem das regras é fixa (primeiro match vence).
 */
export function classifyConcursoArea(input: ClassifyInput): ConcursoArea {
  // OAB / Direito já vem rotulado da ingestão — não tocamos.
  if (input.area === "DIREITO") return "DIREITO";

  const haystack = normalize(`${input.cargo ?? ""} ${input.fonte ?? ""}`);
  if (!haystack) return "OUTROS";

  // Especialidades multi-profissionais (Enare Multi). Ordem importa pra
  // termos com sobreposição (não há nesta lista, mas mantemos explícito).
  if (haystack.includes("enfermag")) return "ENFERMAGEM";
  if (haystack.includes("farmac")) return "FARMACIA";
  if (haystack.includes("odontol")) return "ODONTOLOGIA";
  if (haystack.includes("fisioter")) return "FISIOTERAPIA";
  if (haystack.includes("nutri")) return "NUTRICAO";
  if (haystack.includes("psicol")) return "PSICOLOGIA";
  if (haystack.includes("servico social")) return "SERVICO_SOCIAL";
  if (haystack.includes("biomedic")) return "BIOMEDICINA";

  // Medicina: Revalida (INEP) ou Enare Residência Médica (Ebserh).
  if (haystack.includes("revalida")) return "MEDICINA";
  // "Enare Multi" não é medicina — só Enare puro (residência médica).
  if (haystack.includes("enare") && !haystack.includes("enare multi")) {
    return "MEDICINA";
  }

  return "OUTROS";
}
