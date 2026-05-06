import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Brain, Presentation, Loader2, Download, ChevronRight, ChevronUp, ChevronDown,
  ChevronLeft, Wand2, X,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ─────────────────────────────────────────────────────────────────
interface MapaMental {
  subject: string;
  categories: Array<{
    name: string;
    topics: Array<{
      name: string;
      subtopics: Array<{ name: string; detail: string }>;
    }>;
  }>;
}
interface Infografico {
  b64_json: string; mimeType: string; titulo: string; subtitulo: string;
  estilo: string; orientacao: string;
}
interface Slide {
  n: number; tipo: string; titulo: string; subtitulo?: string;
  items?: string[]; texto?: string; emoji?: string; pergunta?: string;
  image_b64?: string;
}
interface Slides {
  titulo: string; subtitulo?: string; tema?: string; slides: Slide[];
}

type Tool = "infografico" | "mapa-mental" | "slides";

// ─── 4-level Mind Map Renderer ─────────────────────────────────────────────
const CAT_COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6", "#0ea5e9"];

function MapaMentalView({ map }: { map: MapaMental }) {
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set([0]));
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  if (!map?.categories?.length) return null;

  return (
    <div className="p-4 max-h-[600px] overflow-auto space-y-3">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg">
          <span className="text-lg">🧠</span>
          <span className="font-bold text-base">{map.subject}</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {map.categories.length} categorias · {map.categories.reduce((acc, c) => acc + (c.topics?.length ?? 0), 0)} tópicos
        </p>
      </div>

      {map.categories.map((cat, ci) => {
        const color = CAT_COLORS[ci % CAT_COLORS.length];
        const isOpen = expandedCats.has(ci);
        return (
          <div key={ci} className="rounded-2xl border overflow-hidden shadow-sm transition-all hover:shadow-md" style={{ borderColor: color + "30" }}>
            <button
              onClick={() => setExpandedCats(s => { const ns = new Set(s); ns.has(ci) ? ns.delete(ci) : ns.add(ci); return ns; })}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
              style={{ backgroundColor: color + "08" }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: color }}>
                {ci + 1}
              </div>
              <span className="font-bold text-sm flex-1 text-gray-800">{cat.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: color + "15", color }}>
                {cat.topics?.length ?? 0}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <div className="px-3 pb-3 pt-1 space-y-2 bg-white">
                {(cat.topics ?? []).map((topic, ti) => {
                  const key = `${ci}-${ti}`;
                  const topOpen = expandedTopics.has(key);
                  return (
                    <div key={ti} className="rounded-xl border border-gray-100 overflow-hidden">
                      <button
                        onClick={() => setExpandedTopics(s => { const ns = new Set(s); ns.has(key) ? ns.delete(key) : ns.add(key); return ns; })}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left bg-gray-50/50 hover:bg-gray-100/80 transition-colors"
                      >
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm font-semibold text-gray-700 flex-1">{topic.name}</span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{topic.subtopics?.length ?? 0}</span>
                        <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${topOpen ? "rotate-90" : ""}`} />
                      </button>
                      {topOpen && (
                        <div className="px-4 py-3 space-y-2.5 bg-white border-t border-gray-50">
                          {(topic.subtopics ?? []).map((sub, si) => (
                            <div key={si} className="flex items-start gap-2.5">
                              <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: color + "CC" }}>
                                {si + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-800">{sub.name}</p>
                                {sub.detail && <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{sub.detail}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Slides viewer with AI images ──────────────────────────────────────────
function SlidesView({ slides }: { slides: Slides }) {
  const [idx, setIdx] = useState(0);
  if (!slides?.slides?.length) return null;
  const slide = slides.slides[idx];

  const themeMap: Record<string, string> = {
    indigo: "from-indigo-900 to-violet-900",
    rose: "from-rose-900 to-pink-900",
    emerald: "from-emerald-900 to-teal-900",
    amber: "from-amber-900 to-orange-900",
  };
  const themeBg = themeMap[slides.tema ?? "indigo"];
  const tipoStyle: Record<string, string> = {
    titulo: themeBg,
    conteudo: "from-slate-900 to-slate-800",
    lista: "from-blue-900/70 to-indigo-900/70",
    exemplo: "from-emerald-900/60 to-teal-900/60",
    destaque: "from-amber-900/70 to-orange-900/70",
    quiz: "from-violet-900/70 to-purple-900/70",
    conclusao: themeBg,
  };

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl bg-gradient-to-br ${tipoStyle[slide.tipo] ?? "from-slate-900 to-slate-800"} border border-white/10 p-6 min-h-[280px] relative overflow-hidden`}>
        {slide.image_b64 && (
          <div className="absolute inset-0 opacity-25">
            <img src={`data:image/png;base64,${slide.image_b64}`} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          </div>
        )}
        <div className="relative">
          <div className="text-3xl mb-3">{slide.emoji ?? "📄"}</div>
          {slide.tipo === "titulo" && (
            <>
              <h2 className="text-2xl font-black text-white mb-2">{slide.titulo}</h2>
              {slide.subtitulo && <p className="text-white/70 text-base">{slide.subtitulo}</p>}
            </>
          )}
          {(slide.tipo === "conteudo" || slide.tipo === "lista") && (
            <>
              <h3 className="text-lg font-bold text-white mb-3">{slide.titulo}</h3>
              <ul className="space-y-1.5">
                {slide.items?.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-white/85 text-sm">
                    <span className="text-indigo-300 mt-0.5">▸</span>{item}
                  </li>
                ))}
              </ul>
            </>
          )}
          {(slide.tipo === "exemplo" || slide.tipo === "destaque" || slide.tipo === "conclusao") && (
            <>
              <h3 className="text-lg font-bold text-white mb-2">{slide.titulo}</h3>
              <p className="text-white/85 text-sm leading-relaxed">{slide.texto}</p>
            </>
          )}
          {slide.tipo === "quiz" && (
            <>
              <h3 className="text-lg font-bold text-white mb-2">{slide.titulo}</h3>
              <div className="bg-white/15 rounded-xl p-3 border border-white/20">
                <p className="text-white text-sm font-semibold">❓ {slide.pergunta}</p>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex gap-1 flex-wrap justify-center max-w-[60%]">
          {slides.slides.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "bg-indigo-400 w-6" : "bg-white/25 w-1.5"}`} />
          ))}
        </div>
        <button onClick={() => setIdx(i => Math.min(slides.slides.length - 1, i + 1))} disabled={idx === slides.slides.length - 1}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <p className="text-center text-white/40 text-xs">Slide {idx + 1} de {slides.slides.length}</p>
    </div>
  );
}

// ─── Main Estudio IA Component ─────────────────────────────────────────────
export interface EstudioIAProps {
  /** Optional default values */
  defaultTopico?: string;
  defaultMateria?: string;
  /** Override base API path (defaults to `/api`) */
  apiBase?: string;
  /** Title shown in the header */
  title?: string;
  /** Variant theming: "dark" for Professor, "light" for Instituicao */
  variant?: "dark" | "light";
}

export function EstudioIA({
  defaultTopico = "",
  defaultMateria = "Biologia",
  apiBase,
  title = "Estúdio Visual IA",
  variant = "dark",
}: EstudioIAProps) {
  const base = apiBase ?? `${BASE_URL}/api`;
  const [topico, setTopico] = useState(defaultTopico);
  const [materia, setMateria] = useState(defaultMateria);
  const [estilo, setEstilo] = useState<string>("profissional");
  const [comImagens, setComImagens] = useState(true);

  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState<Tool | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(t: Tool) {
    if (!topico.trim()) { setError("Informe o tópico"); return; }
    setError(null);
    setLoading(t);
    setTool(t);
    setResult(null);
    try {
      const body: any = { topico, materia };
      if (t === "infografico") body.estilo = estilo;
      if (t === "slides") body.comImagens = comImagens;
      const r = await fetch(`${base}/studio-ia/${t}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.erro ?? "Erro");
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? "Erro ao gerar");
    } finally {
      setLoading(null);
    }
  }

  const isDark = variant === "dark";
  const cardCls = isDark
    ? "bg-white/[0.03] border-white/10 hover:border-white/20 text-white"
    : "bg-white border-slate-200 hover:border-indigo-300 text-slate-800 shadow-sm";
  const inputCls = isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-400"
    : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-400";
  const labelCls = isDark ? "text-white/60" : "text-slate-600";
  const headerTitleCls = isDark ? "text-white" : "text-slate-800";
  const headerSubCls = isDark ? "text-white/50" : "text-slate-500";

  const TOOLS: { id: Tool; label: string; icon: React.ElementType; color: string; desc: string }[] = [
    { id: "infografico", label: "Infográfico",          icon: Sparkles,     color: "fuchsia", desc: "Pôster visual gerado por IA" },
    { id: "slides",      label: "Slides com imagens",   icon: Presentation, color: "violet",  desc: "Apresentação completa + imagens IA" },
    { id: "mapa-mental", label: "Mapa Mental 4 níveis", icon: Brain,        color: "emerald", desc: "Hierarquia categorias → tópicos → subtópicos" },
  ];

  const colorBg: Record<string, string> = {
    fuchsia: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
    violet:  "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  };
  const colorBgLight: Record<string, string> = {
    fuchsia: "bg-fuchsia-100 text-fuchsia-700",
    violet:  "bg-indigo-100 text-indigo-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className={isDark ? "space-y-4" : "space-y-4"}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Wand2 className={`w-5 h-5 ${isDark ? "text-indigo-400" : "text-indigo-600"}`} />
          <h2 className={`text-lg font-black ${headerTitleCls}`}>{title}</h2>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>NOVO</span>
        </div>
        <p className={`text-xs ${headerSubCls}`}>Gere infográficos, slides com imagens IA e mapas mentais hierárquicos a partir de um tema.</p>
      </div>

      {/* Inputs */}
      <div className={`rounded-2xl border p-4 space-y-3 ${cardCls}`}>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${labelCls}`}>Tópico *</label>
            <input value={topico} onChange={e => setTopico(e.target.value)}
              placeholder="Ex: Fotossíntese, Era Vargas, Funções de 2º grau"
              className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm focus:outline-none ${inputCls}`} />
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${labelCls}`}>Matéria</label>
            <select value={materia} onChange={e => setMateria(e.target.value)}
              className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm focus:outline-none ${inputCls}`}>
              {["Matemática","Português","Física","Química","Biologia","História","Geografia","Filosofia","Sociologia","Inglês","Artes","Educação Física","Geral"].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${labelCls}`}>Estilo (Infográfico)</label>
            <select value={estilo} onChange={e => setEstilo(e.target.value)}
              className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm focus:outline-none ${inputCls}`}>
              {["profissional","kawaii","cientifico","anime","esboco","minimalista"].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <label className={`flex items-end gap-2 cursor-pointer text-sm ${isDark ? "text-white/80" : "text-slate-700"}`}>
            <input type="checkbox" checked={comImagens} onChange={e => setComImagens(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-500" />
            <span className="pb-1">Slides com imagens IA por slide (mais lento)</span>
          </label>
        </div>
      </div>

      {/* Tool buttons */}
      <div className="grid sm:grid-cols-3 gap-3">
        {TOOLS.map(t => {
          const Icon = t.icon;
          const isLoading = loading === t.id;
          const tint = isDark ? colorBg[t.color] : colorBgLight[t.color];
          return (
            <button key={t.id} onClick={() => run(t.id)} disabled={!!loading || !topico.trim()}
              className={`text-left rounded-2xl border p-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${cardCls}`}>
              <div className="flex items-start gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${tint}`}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className={`font-black text-sm ${isDark ? "text-white" : "text-slate-800"}`}>{t.label}</p>
                  <p className={`text-[11px] mt-0.5 ${isDark ? "text-white/50" : "text-slate-500"}`}>{t.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className={`px-4 py-2 rounded-xl text-sm ${isDark ? "bg-red-500/15 border border-red-500/30 text-red-300" : "bg-red-50 border border-red-200 text-red-700"}`}>
          ⚠️ {error}
        </div>
      )}

      {/* Result viewer */}
      <AnimatePresence mode="wait">
        {tool && (loading === tool || !!result) && (
          <motion.div key={tool}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`rounded-2xl border overflow-hidden ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className={`px-4 py-2.5 border-b flex items-center justify-between ${isDark ? "border-white/10" : "border-slate-100"}`}>
              <p className={`text-xs font-black uppercase tracking-wider ${isDark ? "text-white/70" : "text-slate-700"}`}>
                {tool === "infografico" ? "Infográfico" : tool === "slides" ? "Slides" : "Mapa Mental"}
              </p>
              <button onClick={() => { setTool(null); setResult(null); }}
                className={isDark ? "text-white/40 hover:text-white" : "text-slate-400 hover:text-slate-700"}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className={isDark ? "p-3 text-white" : "p-3"}>
              {loading === tool && (
                <div className={`flex flex-col items-center justify-center py-12 gap-3 ${isDark ? "text-white/60" : "text-slate-500"}`}>
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                  <p className="text-sm">
                    {tool === "infografico" ? "Gerando imagem (10-25s)..." :
                     tool === "slides" ? (comImagens ? "Gerando slides + imagens (30-60s)..." : "Gerando slides...") :
                     "Construindo mapa mental..."}
                  </p>
                </div>
              )}
              {!loading && !!result && tool === "mapa-mental" && (
                <MapaMentalView map={result as MapaMental} />
              )}
              {!loading && !!result && tool === "slides" && (
                <SlidesView slides={result as Slides} />
              )}
              {!loading && !!result && tool === "infografico" && (() => {
                const r = result as Infografico;
                if (!r.b64_json) return <p className="text-sm text-red-400">Sem imagem retornada.</p>;
                const dataUrl = `data:${r.mimeType};base64,${r.b64_json}`;
                return (
                  <div className="space-y-3">
                    <img src={dataUrl} alt={r.titulo} className="w-full rounded-xl shadow-lg" />
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${isDark ? "text-white" : "text-slate-800"}`}>{r.titulo}</p>
                        <p className={`text-xs truncate ${isDark ? "text-white/50" : "text-slate-500"}`}>{r.subtitulo}</p>
                      </div>
                      <a href={dataUrl} download={`infografico-${r.titulo.replace(/\s+/g, "-")}.png`}
                        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">
                        <Download className="w-3.5 h-3.5" /> PNG
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default EstudioIA;
