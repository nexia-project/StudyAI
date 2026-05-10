import { useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

export interface Slide {
  title: string;
  content: string[];
}

interface SlidesPreviewProps {
  slides: Slide[];
}

export default function SlidesPreview({ slides }: SlidesPreviewProps) {
  const [current, setCurrent]   = useState(0);
  const [fullscreen, setFull]   = useState(false);

  if (!slides.length) return null;

  const slide = slides[current];
  const prev = () => setCurrent(i => Math.max(0, i - 1));
  const next = () => setCurrent(i => Math.min(slides.length - 1, i + 1));

  const Card = ({ full = false }: { full?: boolean }) => (
    <div className={`bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl text-white flex flex-col ${
      full ? "h-full p-12" : "p-8 min-h-[220px]"
    }`}>
      <div className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-4">
        Slide {current + 1} / {slides.length}
      </div>
      <h2 className={`font-bold leading-tight mb-6 ${full ? "text-3xl" : "text-xl"}`}>
        {slide.title}
      </h2>
      <ul className="space-y-2 flex-1">
        {slide.content.map((item, i) => (
          <li key={i} className={`flex items-start gap-2 ${full ? "text-base" : "text-sm"} text-violet-100`}>
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-violet-300 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <>
      <div className="relative">
        <Card />
        <button onClick={() => setFull(true)}
          className="absolute top-3 right-3 p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-all">
          <Maximize2 className="w-3.5 h-3.5 text-white" />
        </button>
        <div className="flex items-center justify-between mt-3">
          <button onClick={prev} disabled={current === 0}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-all">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div className="flex gap-1">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-violet-600 w-4" : "bg-slate-300"}`} />
            ))}
          </div>
          <button onClick={next} disabled={current === slides.length - 1}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-all">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="w-full max-w-3xl h-[70vh] flex flex-col">
            <div className="flex-1">
              <Card full />
            </div>
            <div className="flex items-center justify-between mt-4">
              <button onClick={prev} disabled={current === 0}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-all">
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex gap-1.5">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)}
                    className={`h-2 rounded-full transition-all ${i === current ? "bg-white w-5" : "bg-white/40 w-2"}`} />
                ))}
              </div>
              <button onClick={next} disabled={current === slides.length - 1}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-all">
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          <button onClick={() => setFull(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </>
  );
}
