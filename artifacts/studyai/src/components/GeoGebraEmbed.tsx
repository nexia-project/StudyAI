/**
 * GeoGebraEmbed — Wrapper leve para a calculadora GeoGebra (PR-8)
 *
 * Renderiza o `<iframe>` oficial em `https://www.geogebra.org/calculator/{tool}`
 * com `embed=true`. Cinco calculadoras suportadas:
 *
 *   - "3d"          → geometria espacial, sólidos, vetores em R³, planos
 *   - "geometry"    → 2D, polígonos, circunferências, transformações
 *   - "graphing"    → plot de funções (alternativa pesada ao function-plot)
 *   - "cas"         → álgebra simbólica
 *   - "scientific"  → calculadora científica simples
 *
 * Otimizações:
 *   - Lazy mount via IntersectionObserver: o iframe só carrega quando o
 *     componente fica visível na viewport. Numa conversa longa do Tiagão isso
 *     evita disparar dezenas de fetches simultâneos pesados.
 *   - Skeleton de loading até o `onLoad` do iframe disparar.
 *
 * ⚠️  Limitação da URL command API do GeoGebra
 * ─────────────────────────────────────────────
 * A documentação oficial do parâmetro `commands=` na URL da calculadora é
 * inconsistente: alguns appNames (notadamente `classic`) aceitam comandos
 * separados por `;` URL-encoded, mas o embed novo (`/calculator/{appName}`)
 * NÃO documenta esse parâmetro. Em testes manuais, comandos passados via URL
 * tendem a ser ignorados silenciosamente. Para garantir interatividade real
 * com comandos pré-definidos seria preciso usar a "Math Apps API" via
 * `window.ggbApplet` (postMessage / script injetado).
 *
 * Decisão: este componente aceita `commands` e os anexa à URL como
 * `&commands=` melhor-esforço; mas o caso de uso primário (3D livre e
 * Geometria 2D livre) já é altamente valioso sozinho. Não bloqueamos a
 * renderização quando `commands` não é honrado.
 *
 * Atribuição: rodapé sempre visível "Powered by GeoGebra" → geogebra.org.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";

export type GeoGebraTool = "3d" | "geometry" | "graphing" | "cas" | "scientific";

export interface GeoGebraEmbedProps {
  /** Qual calculadora carregar. Default: "3d". */
  tool?: GeoGebraTool;
  /**
   * Base64 do material GeoGebra (`.ggb`). Quando fornecido, carrega uma
   * construção pré-salva em vez da calculadora em branco. Optional —
   * suporta o flow "construção pronta vinda do backend".
   */
  ggbBase64?: string;
  /**
   * Lista de comandos GeoGebra (best-effort — veja header). Ex.:
   *   ["A = (1,2,3)", "B = (4,5,6)", "Segment(A,B)"]
   */
  commands?: string[];
  /** Altura em px do iframe. Default: 480. */
  height?: number;
  /** Título acessível do iframe (default "Visualização GeoGebra"). */
  title?: string;
  /** Classe extra opcional para o container externo. */
  className?: string;
}

const GEOGEBRA_BASE = "https://www.geogebra.org/calculator";

/** Constrói a URL de embed da calculadora correta com todos os flags úteis. */
function buildGeoGebraUrl(opts: {
  tool: GeoGebraTool;
  ggbBase64?: string;
  commands?: string[];
}): string {
  const url = new URL(`${GEOGEBRA_BASE}/${opts.tool}`);
  url.searchParams.set("embed", "true");
  url.searchParams.set("appName", opts.tool);
  // Defaults amigáveis ao consumidor educacional brasileiro.
  url.searchParams.set("lang", "pt");
  url.searchParams.set("showToolBar", "true");
  url.searchParams.set("showMenuBar", "false");
  url.searchParams.set("showAlgebraInput", "true");
  url.searchParams.set("enableShiftDragZoom", "true");
  if (opts.ggbBase64) url.searchParams.set("ggbBase64", opts.ggbBase64);
  if (opts.commands && opts.commands.length > 0) {
    // Best-effort: ver header do arquivo.
    url.searchParams.set("commands", opts.commands.join(";"));
  }
  return url.toString();
}

export function GeoGebraEmbed({
  tool = "3d",
  ggbBase64,
  commands,
  height = 480,
  title = "Visualização GeoGebra",
  className,
}: GeoGebraEmbedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // ── Lazy mount: monta o iframe só quando o usuário rolar até aqui ──────────
  useEffect(() => {
    if (visible) return;
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      // Fallback (SSR antigo ou navegador sem IO): mostra na hora.
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "120px 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [visible]);

  const url = buildGeoGebraUrl({ tool, ggbBase64, commands });

  const wrapperStyle: CSSProperties = { minHeight: height };

  return (
    <div
      ref={containerRef}
      className={
        "rounded-xl border border-violet-200/70 bg-white overflow-hidden shadow-sm " +
        (className ?? "")
      }
      data-testid="geogebra-embed"
      style={wrapperStyle}
    >
      <div className="relative w-full" style={{ height }}>
        {!loaded && (
          // Skeleton enquanto o iframe carrega (ou enquanto não está visível).
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-violet-50 to-fuchsia-50 text-violet-500 animate-pulse">
            <div className="w-10 h-10 rounded-full border-4 border-violet-200 border-t-violet-500 animate-spin" />
            <p className="text-xs font-medium tracking-wide uppercase">
              Carregando GeoGebra…
            </p>
          </div>
        )}
        {visible && (
          <iframe
            src={url}
            title={title}
            className="w-full h-full block"
            // Permissions úteis para WebGL no GeoGebra 3D.
            allow="fullscreen; accelerometer; gyroscope"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
            style={{ border: 0 }}
          />
        )}
      </div>
      <div className="px-3 py-2 flex items-center justify-between text-[11px] text-gray-500 border-t border-violet-100 bg-gradient-to-r from-white to-violet-50/40">
        <span className="truncate">
          Ferramenta:{" "}
          <span className="font-semibold text-violet-700">
            {tool === "3d" ? "Calculadora 3D" : tool === "geometry" ? "Geometria" : tool === "graphing" ? "Gráficos" : tool === "cas" ? "CAS" : "Científica"}
          </span>
        </span>
        <a
          href="https://geogebra.org"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-violet-600 hover:text-violet-800 transition-colors"
        >
          Powered by GeoGebra ↗
        </a>
      </div>
    </div>
  );
}

export default GeoGebraEmbed;
