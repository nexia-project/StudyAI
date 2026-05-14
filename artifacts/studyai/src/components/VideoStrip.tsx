/**
 * VideoStrip.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Strip de 1-3 vídeos recomendados, embed-only (via `VideoEmbed`). Mobile vira
 * scroll horizontal; tablet/desktop usa grid de até 3 colunas.
 *
 * Props:
 *  • videos: lista vinda do backend (`getEducationalVideos` → POST /api/videos/search
 *    ou tool `buscar_video_educacional`).
 *  • title:  opcional, ex.: "Vídeos sobre função quadrática" / "Veja também".
 *
 * Render é lazy: cada `VideoEmbed` mostra thumbnail + play overlay até o aluno
 * clicar, evitando ~500KB/video de player JS por strip.
 */

import { Tv } from "lucide-react";
import { VideoEmbed } from "./VideoEmbed";
import { cn } from "@/lib/utils";

export interface VideoStripVideo {
  videoId: string;
  title?: string;
  channelId?: string;
  channelName?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  durationSeconds?: number;
  embedUrl?: string;
  watchUrl?: string;
}

export interface VideoStripProps {
  videos: VideoStripVideo[];
  title?: string;
  className?: string;
  /** Mostra um label "Recomendado" pequeno acima da strip. Default: true. */
  showLabel?: boolean;
}

export function VideoStrip({
  videos,
  title,
  className,
  showLabel = true,
}: VideoStripProps) {
  const valid = (videos ?? []).filter((v): v is VideoStripVideo & { videoId: string } =>
    Boolean(v?.videoId),
  );
  if (valid.length === 0) return null;

  return (
    <section className={cn("mt-3 w-full", className)} aria-label={title ?? "Vídeos recomendados"}>
      {(title || showLabel) && (
        <div className="mb-2 flex items-center gap-2">
          {showLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600 ring-1 ring-rose-200/60">
              <Tv className="h-3 w-3" />
              Vídeos
            </span>
          )}
          {title && (
            <h3 className="truncate text-[12px] font-bold text-slate-700">{title}</h3>
          )}
        </div>
      )}
      <div
        className={cn(
          // Mobile: scroll horizontal com snap. Desktop: grid de 3 colunas.
          // `min-w-0` no item evita overflow estourar o pai.
          "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1",
          "sm:grid sm:grid-cols-2 sm:overflow-visible md:grid-cols-3",
        )}
      >
        {valid.map((v) => (
          <div
            key={v.videoId}
            className="w-[260px] shrink-0 snap-start sm:w-auto sm:min-w-0"
          >
            <VideoEmbed
              videoId={v.videoId}
              title={v.title}
              channelName={v.channelName}
              thumbnailUrl={v.thumbnailUrl}
              lazy
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default VideoStrip;
