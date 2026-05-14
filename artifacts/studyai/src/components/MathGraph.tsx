/**
 * MathGraph — Plot 2D de funções matemáticas (PR-8)
 *
 * Wrapper React em torno do `function-plot` (D3-based, ~30KB gzip). Plota uma
 * expressão `fn` (string parseável por mathjs/built-in-math-eval) num domínio
 * configurável.
 *
 * Uso típico:
 *   <MathGraph expr="x^2 - 4" varName="x" xMin={-5} xMax={5} />
 *
 * Trata erros: se `function-plot` lançar (expressão malformada, range
 * inválido, container sem dimensão), troca o gráfico por uma mensagem amigável
 * em PT-BR. Sem fallback de catch silencioso — devolve sinal pro usuário.
 *
 * Limpeza: cada render destrói o SVG antigo via `innerHTML = ""` antes de
 * reconstruir. Funciona bem em hot-reload e quando o componente desmonta.
 */

import { useEffect, useRef, useState } from "react";
import functionPlot from "function-plot";

export interface MathGraphProps {
  expr: string;
  varName?: string;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  height?: number;
  title?: string;
  className?: string;
}

export function MathGraph({
  expr,
  varName: _varName = "x",
  xMin = -10,
  xMax = 10,
  yMin,
  yMax,
  height = 320,
  title,
  className,
}: MathGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    // Reset estado a cada nova expressão.
    setError(null);
    node.innerHTML = "";

    // Sanity check: domínio precisa ser monotônico crescente e finito.
    if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin >= xMax) {
      setError("Intervalo do eixo X inválido (xMin precisa ser menor que xMax).");
      return;
    }

    try {
      // `function-plot` usa o container como `target`; ele cuida do SVG.
      functionPlot({
        target: node,
        // Não passamos `width`: function-plot mede o container e ocupa 100%.
        height,
        grid: true,
        title,
        xAxis: { label: "x", domain: [xMin, xMax] },
        yAxis: {
          label: "y",
          ...(typeof yMin === "number" && typeof yMax === "number"
            ? { domain: [yMin, yMax] }
            : {}),
        },
        data: [{ fn: expr, graphType: "polyline", sampler: "builtIn" }],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[MathGraph] function-plot falhou:", msg);
      setError(
        `Não consegui plotar "${expr}". A expressão pode estar mal formada ou usar uma função que o plotter não conhece.`,
      );
      node.innerHTML = "";
    }

    return () => {
      // Desmonta o SVG ao trocar a expressão / desmontar o componente.
      if (node) node.innerHTML = "";
    };
  }, [expr, xMin, xMax, yMin, yMax, height, title]);

  return (
    <div
      className={
        "rounded-xl border border-violet-200/70 bg-white p-4 shadow-sm " +
        (className ?? "")
      }
      data-testid="math-graph"
    >
      {title && (
        <p className="text-xs font-semibold text-violet-700 mb-2 truncate">
          {title}
        </p>
      )}
      {error ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-rose-700 bg-rose-50/60 rounded-lg" style={{ minHeight: height }}>
          <span className="text-2xl">📈</span>
          <p className="max-w-xs">{error}</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="w-full overflow-hidden"
          style={{ minHeight: height }}
        />
      )}
      <p className="mt-2 text-[10px] text-gray-400 text-right">
        f({_varName}) = <span className="font-mono">{expr}</span>
      </p>
    </div>
  );
}

export default MathGraph;
