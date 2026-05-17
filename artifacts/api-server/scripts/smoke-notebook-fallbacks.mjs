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

const { normalizeMindMap, normalizeSlides } = sandbox.module.exports;

const title = "Função quadrática no ENEM";
const content = `
Função quadrática é uma função polinomial do segundo grau escrita como f(x)=ax²+bx+c, com a diferente de zero.
O gráfico é uma parábola, e a concavidade depende do sinal de a: se a é positivo, a parábola abre para cima; se é negativo, abre para baixo.
As raízes representam os pontos em que a parábola cruza o eixo x e podem ser calculadas pela fórmula de Bhaskara.
O vértice indica o ponto máximo ou mínimo da função, sendo essencial para problemas de otimização.
No ENEM, esse conteúdo aparece em situações de lançamento, lucro máximo, área máxima e leitura de gráficos.
O estudante deve relacionar coeficientes, raízes, vértice e interpretação contextual, sempre justificando a resposta com evidências do enunciado.
`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const deck = normalizeSlides({}, title, content);
assert(deck.generatedByFallback === true, "slides should mark weak input as fallback");
assert(deck.slides.length >= 8, "fallback deck should include at least 8 slides");
assert(deck.slides.some((slide) => slide.visual), "fallback deck should include visual plans");
assert(deck.slides.some((slide) => slide.checkpoint), "fallback deck should include checkpoints");
assert((deck.objetivos?.length ?? 0) >= 3, "fallback deck should include learning objectives");

const map = normalizeMindMap({}, title, content);
assert(map.generatedByFallback === true, "mind map should mark weak input as fallback");
assert(map.categories.length >= 6, "fallback mind map should include major branches");
assert(map.topics.length >= 18, "fallback mind map should include flattened topics");
assert((map.conexoesCruzadas?.length ?? 0) >= 3, "fallback mind map should include cross-connections");

console.log(JSON.stringify({
  ok: true,
  slides: deck.slides.length,
  slideFallback: deck.generatedByFallback,
  mindMapBranches: map.categories.length,
  mindMapTopics: map.topics.length,
  mindMapFallback: map.generatedByFallback,
}, null, 2));
