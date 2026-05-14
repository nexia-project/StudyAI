/**
 * VideoEmbed.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Player de vídeo do YouTube — embed-only, privacy-enhanced.
 *
 * Padrões críticos:
 *  • Lazy thumbnail by default. NUNCA monta o iframe na render inicial.
 *    Mostra a thumbnail (~5KB) + play button; só troca para iframe (~500KB
 *    de JS do player do YouTube) quando o aluno clica. Economia direta de
 *    largura de banda e Cumulative Layout Shift.
 *  • youtube-nocookie.com (privacy-enhanced) → não dispara cookies do YT
 *    enquanto o aluno só vê a thumbnail. Cookies só carregam após o clique.
 *  • `rel=0&modestbranding=1` → vídeos relacionados só do mesmo canal
 *    (mantém o aluno dentro de canais confiáveis) e branding minimal.
 *  • Atribuição obrigatória ao canal logo abaixo + link "Assistir no YouTube".
 */

import { useState } from "react";
import { Play, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VideoEmbedProps {
  videoId: string;
  title?: string;
  channelName?: string;
  thumbnailUrl?: string;
  aspect?: "16/9" | "9/16";
  /** Quando true, embeda o iframe já na render inicial. Default: false (lazy). */
  autoplay?: boolean;
  /** Default: true. Quando false (raro), monta o iframe na hora. */
  lazy?: boolean;
  className?: string;
}

function defaultThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function buildEmbedUrl(videoId: string, opts: { autoplay: boolean }): string {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
  });
  if (opts.autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function buildWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function VideoEmbed({
  videoId,
  title,
  channelName,
  thumbnailUrl,
  aspect = "16/9",
  autoplay = false,
  lazy = true,
  className,
}: VideoEmbedProps) {
  // Quando lazy === false ou autoplay === true (caso raro de "abrir já"), pula
  // direto pro iframe. Caso contrário começa com a thumbnail (sem JS do YT).
  const [showIframe, setShowIframe] = useState(!lazy || autoplay);
  const thumb = thumbnailUrl ?? defaultThumb(videoId);

  const aspectClass = aspect === "9/16" ? "aspect-[9/16]" : "aspect-video";
  const containerClass = cn(
    "rounded-xl overflow-hidden border bg-black shadow-sm",
    aspectClass,
    className,
  );

  return (
    <figure className="w-full">
      <div className={containerClass}>
        {showIframe ? (
          // Iframe carregado: passamos autoplay=1 sempre que o user clicou na
          // thumbnail, pra dar a sensação de "play agora" sem clique duplo.
          <iframe
            src={buildEmbedUrl(videoId, { autoplay: showIframe })}
            title={title ?? "Vídeo educacional"}
            className="h-full w-full"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowIframe(true)}
            className="group relative block h-full w-full text-left"
            aria-label={title ? `Reproduzir vídeo: ${title}` : "Reproduzir vídeo"}
          >
            <img
              src={thumb}
              alt={title ?? "Capa do vídeo educacional"}
              className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              loading="lazy"
              draggable={false}
              referrerPolicy="no-referrer"
              onError={(e) => {
                // hqdefault às vezes 404; cai pra mqdefault (sempre disponível).
                const img = e.currentTarget;
                if (!img.dataset.fallback) {
                  img.dataset.fallback = "1";
                  img.src = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/20 transition group-hover:from-black/65" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-rose-600 shadow-lg ring-1 ring-black/10 transition group-hover:scale-110 group-hover:bg-white">
                <Play className="h-6 w-6 translate-x-[1px] fill-current" />
              </span>
            </div>
            {title && (
              <div className="absolute inset-x-0 bottom-0 px-3 pb-2 pt-6">
                <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-white drop-shadow-lg">
                  {title}
                </p>
              </div>
            )}
          </button>
        )}
      </div>
      <figcaption className="mt-1.5 flex items-center justify-between gap-2 px-0.5 text-[11px] text-slate-500">
        <span className="min-w-0 truncate">
          {channelName ?? "YouTube"}
        </span>
        <a
          href={buildWatchUrl(videoId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-violet-600 hover:text-violet-800"
        >
          Assistir no YouTube
          <ExternalLink className="h-3 w-3" />
        </a>
      </figcaption>
    </figure>
  );
}

export default VideoEmbed;
