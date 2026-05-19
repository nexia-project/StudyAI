import {
  scorePremiumMaterialMetadata,
  type PremiumMaterialMetadata,
  type PremiumMaterialQualityScore,
} from "./premium-material-standard";

/** Extrai valor de linha tipo `- Chave: valor` ou `- **Chave:** valor`. */
function extractBulletValue(section: string, keyPattern: RegExp): string | null {
  const lines = section.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(keyPattern);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function extractSection(text: string, heading: string): string {
  const re = new RegExp(
    `##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`,
    "i",
  );
  const m = text.match(re);
  return m?.[1]?.trim() ?? "";
}

function splitListItems(block: string): string[] {
  return block
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*]\s+/, "").trim())
    .filter((l) => l.length > 2 && !l.startsWith("#"));
}

function parsePrerequisites(section: string): string[] {
  const raw = extractBulletValue(section, /pre[- ]?requisitos?:\s*(.+)/i);
  if (!raw) return [];
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseKeyConcepts(section: string): string[] {
  const raw = extractBulletValue(section, /conceitos[- ]?chave:\s*(.+)/i);
  if (!raw) return [];
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseVocabulary(section: string): string[] {
  const raw = extractBulletValue(section, /vocabul[aá]rio essencial:\s*(.+)/i);
  if (!raw) return [];
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseCommonErrors(section: string): PremiumMaterialMetadata["commonErrors"] {
  const blocks = section.split(/\n(?=- Erro comum:)/i).filter((b) => /erro comum/i.test(b));
  const out: PremiumMaterialMetadata["commonErrors"] = [];
  for (const block of blocks) {
    const error = extractBulletValue(block, /erro comum:\s*(.+)/i);
    const likelyCause = extractBulletValue(block, /causa prov[aá]vel:\s*(.+)/i);
    const suggestedIntervention = extractBulletValue(
      block,
      /interven[cç][aã]o sugerida:\s*(.+)/i,
    );
    if (error && likelyCause && suggestedIntervention) {
      out.push({ error, likelyCause, suggestedIntervention });
    }
  }
  return out;
}

function parseExercises(section: string): PremiumMaterialMetadata["exercises"] {
  const exercises: PremiumMaterialMetadata["exercises"] = [];
  const blocks = section.split(/\n(?=\d+\.\s)/).filter((b) => /^\d+\./m.test(b));
  for (const block of blocks) {
    const statementMatch = block.match(/^\d+\.\s+([\s\S]*?)(?=\n\s*-\s*Resposta:|\n\s*-\s*Resposta esperada:)/im);
    const answerMatch = block.match(
      /-\s*Resposta(?:\s+esperada)?:\s*([\s\S]*?)(?=\n\s*-\s*Justificativa:|\n\s*-\s*Resposta poss[ií]vel:)/i,
    );
    const rationaleMatch = block.match(
      /-\s*Justificativa:\s*([\s\S]*?)(?=\n\s*-\s*Resposta poss[ií]vel:|\n\d+\.|$)/i,
    );
    const altAnswer = block.match(/-\s*Resposta poss[ií]vel:\s*([\s\S]*?)(?=\n\s*-\s*Justificativa:|$)/i);
    const statement = statementMatch?.[1]?.replace(/\*\*/g, "").trim();
    const answer = (answerMatch?.[1] ?? altAnswer?.[1])?.trim();
    const rationale = rationaleMatch?.[1]?.trim() ?? answer ?? "";
    if (statement && answer) {
      exercises.push({ statement, answer, rationale: rationale || answer });
    }
  }
  return exercises;
}

function parseSources(section: string, frontmatter: Record<string, string | boolean>): PremiumMaterialMetadata["sources"] {
  const sources: PremiumMaterialMetadata["sources"] = [];
  const fonte = extractBulletValue(section, /fonte:\s*(.+)/i);
  if (fonte) {
    sources.push({
      kind: "curadoria_professor",
      title: fonte,
      verified: true,
    });
  }
  if (sources.length === 0 && frontmatter.source === "postulado") {
    sources.push({
      kind: "curadoria_professor",
      title: "Postulado curado StudyAI (CQO)",
      verified: true,
    });
  }
  return sources;
}

/**
 * Heurística para materiais Markdown no padrão CQO/premium (docs/postulados-cqo).
 * Não substitui revisão humana; alimenta score e metadados na ingestão.
 */
export function extractPremiumMetadataFromPostuladoMarkdown(
  text: string,
  frontmatter: Record<string, string | boolean> = {},
): { metadata: Partial<PremiumMaterialMetadata>; quality: PremiumMaterialQualityScore } {
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  const ident = extractSection(body, "Identificacao pedagogica") || extractSection(body, "Identificação pedagógica");
  const erros = extractSection(body, "Erros comuns e intervencoes") || extractSection(body, "Erros comuns e intervenções");
  const exercicios = extractSection(body, "Exercicios graduados") || extractSection(body, "Exercícios graduados");
  const fontes = extractSection(body, "Fontes e observacoes") || extractSection(body, "Fontes e observações");

  const objective =
    extractBulletValue(ident, /objetivo pedag[oó]gico:\s*(.+)/i) ??
    (typeof frontmatter.topic === "string" ? `Estudar ${frontmatter.topic}` : "");
  const subject =
    (typeof frontmatter.subject === "string" ? frontmatter.subject : null) ??
    extractBulletValue(ident, /mat[eé]ria:\s*(.+)/i) ??
    "";
  const targetLevel = extractBulletValue(ident, /p[uú]blico\/s[eé]rie sugerida:\s*(.+)/i) ?? undefined;
  const skillDesc = extractBulletValue(ident, /habilidade\/compet[eê]ncia:\s*(.+)/i);
  const qualityStatus =
    typeof frontmatter.quality_status === "string" ? frontmatter.quality_status : undefined;

  const metadata: Partial<PremiumMaterialMetadata> = {
    objective,
    subject,
    targetLevel,
    skill: skillDesc
      ? { kind: "taxonomia_interna", description: skillDesc }
      : undefined,
    prerequisites: parsePrerequisites(ident),
    keyConcepts: parseKeyConcepts(ident),
    vocabulary: parseVocabulary(ident),
    commonErrors: parseCommonErrors(erros),
    explanationLevels: {
      curta: extractSection(body, "Explicacao curta") || extractSection(body, "Explicação curta"),
      passo_a_passo:
        extractSection(body, "Explicacao passo a passo") ||
        extractSection(body, "Explicação passo a passo"),
      aprofundada:
        extractSection(body, "Explicacao profunda") || extractSection(body, "Explicação profunda"),
    },
    exercises: parseExercises(exercicios),
    sources: parseSources(fontes, frontmatter),
    humanReviewed: frontmatter.human_reviewed === true,
  };

  let quality = scorePremiumMaterialMetadata(metadata);
  if (qualityStatus === "aprovado_premium" && quality.status === "precisa_revisao" && quality.missingFields.length <= 2) {
    quality = { ...quality, status: "aprovado_premium" };
  }

  return { metadata, quality };
}
