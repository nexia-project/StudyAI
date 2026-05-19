/**
 * Provider-free smoke test for Notebook RAG fallback artifacts.
 *
 * Uses the TypeScript compiler API instead of tsx/esbuild so it can run in the
 * Windows workspace where platform-specific esbuild binaries are intentionally
 * excluded.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const helperPath = resolve(__dirname, "../src/lib/notebook-fallbacks.ts");
const source = readFileSync(helperPath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
  fileName: helperPath,
}).outputText;

const sandbox = { exports: {}, module: { exports: {} } };
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(compiled, sandbox, { filename: helperPath });

const {
  buildUnreadableDocumentMindMap,
  isUsableExtractedDocumentText,
  normalizeMindMap,
  normalizeSlides,
} = sandbox.module.exports;

const title = "Função quadrática no ENEM";
const content = `
Função quadrática é uma função polinomial do segundo grau escrita como f(x)=ax²+bx+c, com a diferente de zero.
O gráfico é uma parábola, e a concavidade depende do sinal de a: se a é positivo, a parábola abre para cima; se é negativo, abre para baixo.
As raízes representam os pontos em que a parábola cruza o eixo x e podem ser calculadas pela fórmula de Bhaskara.
O vértice indica o ponto máximo ou mínimo da função, sendo essencial para problemas de otimização.
No ENEM, esse conteúdo aparece em situações de lançamento, lucro máximo, área máxima e leitura de gráficos.
O estudante deve relacionar coeficientes, raízes, vértice e interpretação contextual, sempre justificando a resposta com evidências do enunciado.
`;
const pdfContainerNoise = `
%PDF-1.7
1 0 obj << /Type /Catalog /Pages 2 0 R /Metadata 7 0 R >> endobj
2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj
3 0 obj << /Type /Page /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /XObject /Subtype /Image /Filter /FlateDecode /Length 47321 >> stream
qwerty zzzz qqqq stream image bytes image bytes image bytes
endstream endobj
xref trailer << /Root 1 0 R /Size 8 /Producer (Scanner App) >> startxref
`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function roundTrip(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertSerializablePreview(label, value) {
  const serialized = JSON.stringify(value);
  assert(serialized.length > 500, `${label} should serialize to a non-empty preview/export payload`);
  assert(!serialized.includes("[object Object]"), `${label} should not collapse nested objects`);
  return JSON.parse(serialized);
}

function assertSlideExportContract(deck) {
  const copy = assertSerializablePreview("slide deck", {
    kind: "slides",
    titulo: deck.titulo,
    apresentacao: deck,
  });
  const slides = copy.apresentacao.slides ?? [];
  const contentSlides = slides.filter((slide) => !["capa", "agenda", "encerramento"].includes(slide.tipo));
  assert(contentSlides.length >= 5, "slide preview should include at least five development slides");

  for (const slide of contentSlides.slice(0, 5)) {
    assert(slide.layout, `slide "${slide.titulo}" should keep layout for preview`);
    assert(slide.visual?.descricao || slide.visual?.caption, `slide "${slide.titulo}" should keep visual placeholder/caption`);
    assert(slide.evidencia, `slide "${slide.titulo}" should keep source evidence`);
    assert(slide.comoExplicar, `slide "${slide.titulo}" should keep teacher notes`);
    assert(slide.exemplo || slide.checkpoint, `slide "${slide.titulo}" should keep example or checkpoint`);
  }

  const exportText = slides.map((slide) => [
    slide.titulo,
    slide.subtitulo,
    ...(slide.bullets ?? []),
    slide.visual?.titulo,
    slide.visual?.descricao,
    slide.visual?.caption,
    slide.visual?.credito,
    slide.evidencia,
    slide.comoExplicar,
    slide.exemplo,
    slide.checkpoint,
  ].filter(Boolean).join("\n")).join("\n---\n");
  assert(exportText.includes("Checkpoint"), "slide export should preserve checkpoints");
  assert(/Visual estruturado|Cards|Imagem|Evidencia|evidencia/i.test(exportText), "slide export should preserve visual/evidence copy");
}

function assertMindMapPreviewContract(map) {
  const copy = assertSerializablePreview("mind map", {
    kind: "mapa-mental",
    payload: map,
  });
  assert(copy.payload.categories.every((cat) => cat.cor && cat.icone), "mind map preview should preserve branch colors/icons");
  assert(copy.payload.topics.every((topic) => topic.category && topic.color), "flattened mind map topics should keep category metadata");
  assert((copy.payload.conexoesCruzadas ?? []).length >= 3, "mind map export should keep cross-connections");
}

const deck = normalizeSlides({}, title, content);
assert(isUsableExtractedDocumentText(content), "real extracted study text should be considered usable");
assert(!isUsableExtractedDocumentText(pdfContainerNoise), "PDF container noise should not bypass unreadable-document fallback");
assert(deck.generatedByFallback === true, "slides should mark weak input as fallback");
assert(deck.slides.length >= 8, "fallback deck should include at least 8 slides");
assert(deck.slides.some((slide) => slide.visual), "fallback deck should include visual plans");
assert(deck.slides.some((slide) => slide.checkpoint), "fallback deck should include checkpoints");
assert((deck.objetivos?.length ?? 0) >= 3, "fallback deck should include learning objectives");
assertSlideExportContract(deck);

const map = normalizeMindMap({}, title, content);
assert(map.generatedByFallback === true, "mind map should mark weak input as fallback");
assert(map.categories.length >= 6, "fallback mind map should include major branches");
assert(map.topics.length >= 18, "fallback mind map should include flattened topics");
assert((map.conexoesCruzadas?.length ?? 0) >= 3, "fallback mind map should include cross-connections");
assertMindMapPreviewContract(map);

const unreadablePdfMap = buildUnreadableDocumentMindMap("VELA", {
  fileName: "VELA.pdf",
  fileSizeKb: 812,
  mime: "application/pdf",
  userTitle: "VELA",
});
assert(unreadablePdfMap.generatedByFallback === true, "unreadable PDF map should be marked as fallback");
assert(unreadablePdfMap.fallbackReason === "PDF_TEXT_EXTRACTION_EMPTY", "unreadable PDF map should expose a technical fallback reason");
assert(/PDF com texto selecionável|DOCX\/TXT/i.test(unreadablePdfMap.providerWarning), "unreadable PDF map should guide the user to a readable source");
assertMindMapPreviewContract(unreadablePdfMap);

const strongDeck = roundTrip(normalizeSlides(deck, title, content));
assert(strongDeck.generatedByFallback === false, "strong normalized deck should survive JSON roundtrip without fallback");
assertSlideExportContract(strongDeck);

console.log(JSON.stringify({
  ok: true,
  slides: deck.slides.length,
  slideFallback: deck.generatedByFallback,
  slideContentSlides: deck.slides.filter((slide) => !["capa", "agenda", "encerramento"].includes(slide.tipo)).length,
  mindMapBranches: map.categories.length,
  mindMapTopics: map.topics.length,
  mindMapFallback: map.generatedByFallback,
  unreadablePdfFallback: unreadablePdfMap.fallbackReason,
  serialization: "preview-export-contract-ok",
}, null, 2));
