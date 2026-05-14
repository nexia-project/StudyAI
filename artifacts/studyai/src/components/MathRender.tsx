/**
 * MathRender — Renderização de fórmulas matemáticas via KaTeX (PR-7)
 *
 * Componentes para a UI de Matemática / Exatas. Renderiza LaTeX inline ou em
 * bloco (display mode) com saída sanitizada do KaTeX. CSS do KaTeX é
 * importado no topo — o Vite injeta no bundle automaticamente.
 *
 *   <MathRender latex="\\int_0^1 x^2 \\,dx" displayMode />
 *   <MathSteps steps={["Passo 1: x = 2", "Passo 2: $y = x^2 = 4$"]} />
 *
 * Tolerante a erros: se o KaTeX falhar, mostra a string crua em <code>.
 */

import "katex/dist/katex.min.css";
import katex from "katex";
import { useMemo } from "react";
import { GeoGebraEmbed } from "./GeoGebraEmbed";
import { MathGraph } from "./MathGraph";

export interface MathRenderProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

/** Renderiza uma string LaTeX como HTML via KaTeX. */
export function MathRender({ latex, displayMode = false, className }: MathRenderProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        output: "html",
        strict: "ignore",
      });
    } catch (err) {
      console.warn("[MathRender] KaTeX falhou:", err);
      return "";
    }
  }, [latex, displayMode]);

  if (!html) {
    return (
      <code className={className} data-testid="math-render-fallback">
        {latex}
      </code>
    );
  }

  return (
    <span
      className={className}
      data-testid="math-render"
      // KaTeX produz HTML sanitizado — uso de dangerouslySetInnerHTML é seguro.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export interface MathStepsProps {
  steps: string[];
  className?: string;
}

// Divide uma string em segmentos { type: 'text' | 'math', value: string }
// usando os delimitadores LaTeX inline `$...$`. Aceita escape `\$`.
function splitInlineLatex(s: string): Array<{ type: "text" | "math"; value: string }> {
  const out: Array<{ type: "text" | "math"; value: string }> = [];
  let i = 0;
  let buf = "";
  while (i < s.length) {
    const ch = s[i];
    if (ch === "\\" && s[i + 1] === "$") {
      buf += "$";
      i += 2;
      continue;
    }
    if (ch === "$") {
      // Procura o próximo `$` não escapado
      let j = i + 1;
      let math = "";
      while (j < s.length) {
        const ch2 = s[j];
        if (ch2 === "\\" && s[j + 1] === "$") {
          math += "$";
          j += 2;
          continue;
        }
        if (ch2 === "$") break;
        math += ch2;
        j += 1;
      }
      if (j < s.length && math.trim().length > 0) {
        if (buf) out.push({ type: "text", value: buf });
        out.push({ type: "math", value: math });
        buf = "";
        i = j + 1;
        continue;
      }
    }
    buf += ch;
    i += 1;
  }
  if (buf) out.push({ type: "text", value: buf });
  return out;
}

/**
 * Renderiza uma lista numerada de passos. Trechos delimitados por `$...$`
 * são renderizados como LaTeX inline; o resto é texto normal.
 */
export function MathSteps({ steps, className }: MathStepsProps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return <div className={className} data-testid="math-steps-empty" />;
  }
  return (
    <ol className={className} data-testid="math-steps">
      {steps.map((step, idx) => {
        const parts = splitInlineLatex(step ?? "");
        return (
          <li key={idx} className="leading-relaxed">
            {parts.map((p, j) =>
              p.type === "math"
                ? <MathRender key={j} latex={p.value} />
                : <span key={j}>{p.value}</span>,
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─── PR-8 — Widget visual (GeoGebra 3D / 2D ou function-plot) ────────────────

/**
 * Categoria de geometria devolvida pela engine de detecção (`math-detection.ts`).
 * Mantém-se em sync com o tipo do backend; copiamos aqui pra evitar uma
 * dependência cruzada entre os pacotes.
 */
export type MathVisualGeometryKind =
  | "solido"
  | "vetor"
  | "plano"
  | "trigonometria"
  | "circunferencia";

/**
 * Payload do widget visual anexado a um resultado matemático. Espelha o
 * formato devolvido por `/api/math/solve` (campo `visual`) e pelo executor das
 * tools `visualizar_geometria_3d` / `plotar_funcao` do Tiagão.
 */
export type MathVisualPayload =
  | {
      kind: "geogebra";
      geometry: { kind: MathVisualGeometryKind; suggestedTool: "3d" | "2d" };
      title?: string;
      commands?: string[];
    }
  | {
      kind: "function-plot";
      plot: { expr: string; varName: string; xMin: number; xMax: number };
      title?: string;
    }
  | { kind: null };

export interface MathVisualProps {
  visual: MathVisualPayload | null | undefined;
  className?: string;
}

/**
 * Renderer único para o campo `visual` do resultado matemático. Suporta:
 *
 *   - `kind: "geogebra"`      → `<GeoGebraEmbed tool={"3d" | "geometry"} />`
 *     A escolha entre 3D e Geometria 2D vem de `geometry.suggestedTool`.
 *   - `kind: "function-plot"` → `<MathGraph expr=... xMin=... xMax=... />`
 *   - `kind: null` (ou ausente) → renderiza `null` (sem ocupar espaço).
 *
 * Inclui legendas em PT-BR pra contextualizar o aluno ("Visualize em 3D",
 * "Visualize no plano", "Gráfico da função").
 */
export function MathVisual({ visual, className }: MathVisualProps) {
  if (!visual || visual.kind === null) return null;

  if (visual.kind === "geogebra") {
    const tool = visual.geometry.suggestedTool === "3d" ? "3d" : "geometry";
    const caption =
      visual.geometry.suggestedTool === "3d"
        ? "Visualize em 3D"
        : "Visualize no plano";
    return (
      <div className={"mt-3 " + (className ?? "")} data-testid="math-visual-geogebra">
        <p className="text-xs font-semibold text-violet-700 mb-1.5 tracking-wide uppercase">
          {visual.title ?? caption}
        </p>
        <GeoGebraEmbed
          tool={tool}
          commands={visual.commands}
          title={visual.title ?? caption}
        />
      </div>
    );
  }

  if (visual.kind === "function-plot") {
    return (
      <div className={"mt-3 " + (className ?? "")} data-testid="math-visual-plot">
        <p className="text-xs font-semibold text-violet-700 mb-1.5 tracking-wide uppercase">
          {visual.title ?? "Gráfico da função"}
        </p>
        <MathGraph
          expr={visual.plot.expr}
          varName={visual.plot.varName}
          xMin={visual.plot.xMin}
          xMax={visual.plot.xMax}
        />
      </div>
    );
  }

  return null;
}

export default MathRender;
