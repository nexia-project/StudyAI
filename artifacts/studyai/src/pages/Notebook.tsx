/**
 * StudyAI Notebook — melhor que o NotebookLM
 * Layout 3 painéis: [Fontes] | [Chat RAG] | [Ferramentas]
 * Features: RAG textual, Flashcards, Questões ENEM, Mapa Mental, Guia de Estudo,
 *           Podcast Educativo (exclusivo!), Tiagão na Lousa
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Upload, FileText, Link2, MessageSquare, Brain, BookOpen,
  Loader2, Trash2, Send, ChevronRight, ChevronLeft, X, Plus, Zap,
  ClipboardList, Layers, GraduationCap, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, Star, StickyNote, HelpCircle,
  ExternalLink, ArrowLeft, RefreshCw, Mic, Play, Pause,
  Volume2, Users, Clock, Presentation, Lock, Unlock, Quote, Printer,
} from "lucide-react";
import { TiagaoCharacter } from "@/components/TiagaoCharacter";
import { AppNav } from "@/components/AppNav";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ─────────────────────────────────────────────────────────────────
interface Doc {
  id: number;
  title: string;
  source_file: string | null;
  file_size_kb: number | null;
  created_at: string;
  content_length: number;
}
interface ChatMsg {
  role: "user" | "assistant";
  text: string;
  fontes?: Array<{ numero: number; titulo: string; trecho: string; trechoCompleto?: string }>;
}
interface Timeline {
  titulo: string;
  tema: string;
  eventos: Array<{
    data: string;
    titulo: string;
    descricao: string;
    importancia?: "alta" | "media" | "baixa";
    categoria?: string;
    dicaEnem?: string;
  }>;
}
interface Slides {
  titulo: string;
  subtitulo?: string;
  autor?: string;
  tema?: "indigo" | "rose" | "emerald" | "amber";
  slides: Array<
    | { tipo: "capa"; titulo: string; subtitulo?: string }
    | { tipo: "agenda"; titulo: string; itens: string[] }
    | { tipo: "conteudo"; titulo: string; subtitulo?: string; bullets: string[]; destaque?: string }
    | { tipo: "comparacao"; titulo: string; esquerda: { titulo: string; itens: string[] }; direita: { titulo: string; itens: string[] } }
    | { tipo: "citacao"; texto: string; autor?: string }
    | { tipo: "encerramento"; titulo: string; mensagem: string; dicaEnem?: string }
  >;
}
interface Overview {
  summary: string;
  keyTopics: string[];
  faq: Array<{ q: string; a: string }>;
}
interface MindMap {
  subject: string;
  color: string;
  topics: Array<{ name: string; color: string; subtopics: Array<{ name: string; detail: string }> }>;
}
interface Flashcard { frente: string; verso: string; materia: string; dificuldade: string; }
interface Questao {
  enunciado: string;
  alternativas: Record<string, string>;
  gabarito: string;
  explicacao: string;
}
interface StudyGuide {
  titulo: string;
  introducao: string;
  questoes: Array<{ tipo: string; pergunta: string; resposta: string; dicaEnem: string }>;
  cronogramaSugerido: string[];
}
interface PodcastRoteiro {
  titulo: string;
  subtitulo: string;
  duracao: string;
  roteiro: Array<{ speaker: "ANA" | "MARCOS"; fala: string }>;
  destaques: string[];
}

type Tool = "overview" | "study-guide" | "flashcards" | "questoes" | "mapa-mental" | "podcast" | "tiagao" | "timeline" | "slides";

const TOOL_CONFIG: Record<Tool, { label: string; icon: React.ElementType; color: string; desc: string; badge?: string }> = {
  overview:      { label: "Visão Geral",      icon: Star,          color: "indigo",   desc: "Resumo + tópicos-chave + FAQ" },
  "study-guide": { label: "Guia de Estudo",   icon: ClipboardList, color: "violet",   desc: "Q&A com cronograma ENEM" },
  flashcards:    { label: "Flashcards",        icon: Layers,        color: "pink",     desc: "15 flashcards para memorizar" },
  questoes:      { label: "Questões ENEM",     icon: GraduationCap, color: "amber",    desc: "5 questões estilo ENEM" },
  "mapa-mental": { label: "Mapa Mental",       icon: Brain,         color: "green",    desc: "Mapa visual interativo" },
  podcast:       { label: "Podcast",           icon: Mic,           color: "rose",     desc: "Conversa educativa sobre o doc" },
  timeline:      { label: "Linha do Tempo",    icon: Clock,         color: "amber",    desc: "Cronologia didática (História!)", badge: "NOVO" },
  slides:        { label: "Apresentação",      icon: Presentation,  color: "violet",   desc: "Slides profissionais prontos", badge: "NOVO" },
  tiagao:        { label: "Tiagão na Lousa",   icon: Zap,           color: "blue",     desc: "Aula animada na lousa" },
};

const COLOR_MAP: Record<string, string> = {
  indigo: "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100",
  violet: "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100",
  pink:   "bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100",
  amber:  "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
  green:  "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
  blue:   "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
  rose:   "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100",
};

// ─── Mind Map Renderer ─────────────────────────────────────────────────────
function MindMapView({ map }: { map: MindMap }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0, 1]));
  return (
    <div className="p-3">
      <div className="flex justify-center mb-4">
        <div className="px-5 py-2.5 rounded-2xl font-black text-white text-sm shadow-lg"
          style={{ backgroundColor: map.color || "#6366f1" }}>
          {map.subject}
        </div>
      </div>
      <div className="space-y-2">
        {map.topics.map((topic, i) => (
          <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: (topic.color || "#6366f1") + "40" }}>
            <button
              onClick={() => setExpanded(s => { const ns = new Set(s); ns.has(i) ? ns.delete(i) : ns.add(i); return ns; })}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left"
              style={{ backgroundColor: (topic.color || "#6366f1") + "15" }}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: topic.color || "#6366f1" }} />
              <span className="font-bold text-sm flex-1 text-slate-800">{topic.name}</span>
              <span className="text-xs text-slate-400">{topic.subtopics?.length ?? 0}</span>
              {expanded.has(i) ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>
            {expanded.has(i) && (
              <div className="px-3 pb-2 pt-1 space-y-1 bg-white">
                {(topic.subtopics ?? []).map((sub, j) => (
                  <div key={j} className="flex items-start gap-2 py-1">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{sub.name}</p>
                      {sub.detail && <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{sub.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Flashcard Viewer ────────────────────────────────────────────────────────
function FlashcardViewer({ cards }: { cards: Flashcard[] }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[idx];
  const diffColors: Record<string, string> = {
    facil: "bg-green-100 text-green-700",
    medio: "bg-yellow-100 text-yellow-700",
    dificil: "bg-red-100 text-red-700",
  };
  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-slate-500 font-medium">{idx + 1} / {cards.length}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diffColors[card.dificuldade] ?? "bg-slate-100 text-slate-600"}`}>
          {card.dificuldade?.toUpperCase() ?? ""}
        </span>
        <span className="text-xs text-indigo-600 font-medium">{card.materia}</span>
      </div>
      <motion.div
        className="relative cursor-pointer select-none"
        onClick={() => setFlipped(f => !f)}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.4 }}
        style={{ transformStyle: "preserve-3d", minHeight: 140 }}>
        <div className="absolute inset-0 rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 flex flex-col justify-center"
          style={{ backfaceVisibility: "hidden" }}>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-2">Pergunta</p>
          <p className="text-sm font-bold text-slate-800 text-center leading-snug">{card.frente}</p>
          <p className="text-[10px] text-indigo-400 text-center mt-3">Toque para ver a resposta</p>
        </div>
        <div className="absolute inset-0 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 flex flex-col justify-center"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wider mb-2">Resposta</p>
          <p className="text-sm text-slate-800 leading-snug text-center">{card.verso}</p>
        </div>
      </motion.div>
      <div className="flex gap-2 mt-3">
        <button onClick={() => { setIdx(i => Math.max(0, i - 1)); setFlipped(false); }}
          disabled={idx === 0}
          className="flex-1 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-50">
          ← Anterior
        </button>
        <button onClick={() => { setIdx(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); }}
          disabled={idx === cards.length - 1}
          className="flex-1 py-1.5 rounded-xl border border-indigo-200 text-xs font-bold text-indigo-600 disabled:opacity-30 hover:bg-indigo-50">
          Próximo →
        </button>
      </div>
    </div>
  );
}

// ─── Questão ENEM Viewer ──────────────────────────────────────────────────────
function QuestaViewer({ questoes }: { questoes: Questao[] }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showExpl, setShowExpl] = useState(false);
  const q = questoes[idx];
  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-slate-500 font-medium">Questão {idx + 1} / {questoes.length}</span>
        {selected && (
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${selected === q.gabarito ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
            {selected === q.gabarito ? "✓ Correto!" : "✗ Errado"}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-800 font-medium leading-snug mb-3">{q.enunciado}</p>
      <div className="space-y-1.5">
        {Object.entries(q.alternativas).map(([key, text]) => {
          const correct = selected && key === q.gabarito;
          const wrong = selected && selected === key && key !== q.gabarito;
          return (
            <button key={key} onClick={() => { if (!selected) setSelected(key); }}
              className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-all flex items-start gap-2 ${
                correct ? "bg-emerald-50 border-emerald-400 text-emerald-800" :
                wrong   ? "bg-red-50 border-red-400 text-red-700" :
                selected ? "bg-slate-50 border-slate-200 text-slate-500" :
                "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
              }`}>
              <span className="font-black flex-shrink-0 mt-0.5">{key})</span>
              <span className="leading-snug">{text}</span>
              {correct && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5 ml-auto" />}
              {wrong   && <X className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5 ml-auto" />}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="mt-2">
          <button onClick={() => setShowExpl(s => !s)}
            className="text-xs text-indigo-600 font-bold flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            {showExpl ? "Ocultar explicação" : "Ver explicação completa"}
          </button>
          {showExpl && (
            <p className="text-xs text-slate-700 mt-1.5 p-2.5 bg-indigo-50 rounded-xl leading-relaxed">{q.explicacao}</p>
          )}
        </div>
      )}
      <div className="flex gap-2 mt-3">
        <button onClick={() => { setIdx(i => Math.max(0, i-1)); setSelected(null); setShowExpl(false); }}
          disabled={idx === 0} className="flex-1 py-1.5 rounded-xl border text-xs font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-50">
          ← Anterior
        </button>
        <button onClick={() => { setIdx(i => Math.min(questoes.length-1, i+1)); setSelected(null); setShowExpl(false); }}
          disabled={idx === questoes.length - 1} className="flex-1 py-1.5 rounded-xl border border-indigo-200 text-xs font-bold text-indigo-600 disabled:opacity-30 hover:bg-indigo-50">
          Próxima →
        </button>
      </div>
    </div>
  );
}

// ─── Podcast Viewer ───────────────────────────────────────────────────────────
function PodcastViewer({ podcast }: { podcast: PodcastRoteiro }) {
  const [playing, setPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playNext = useCallback((idx: number) => {
    if (idx >= podcast.roteiro.length) { setPlaying(false); setCurrentIdx(-1); return; }
    setCurrentIdx(idx);
    const wordCount = podcast.roteiro[idx].fala.split(" ").length;
    const duration = Math.max(2000, wordCount * 280); // ~250ms per word
    timerRef.current = setTimeout(() => playNext(idx + 1), duration);
  }, [podcast.roteiro]);

  const startPlay = useCallback(() => {
    setPlaying(true);
    setCurrentIdx(0);
    playNext(0);
  }, [playNext]);

  const stopPlay = useCallback(() => {
    setPlaying(false);
    setCurrentIdx(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-2xl p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Mic className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-wider">Podcast Educativo</span>
        </div>
        <p className="font-black text-sm leading-tight">{podcast.titulo}</p>
        <p className="text-[10px] text-rose-100 mt-0.5">{podcast.subtitulo}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] text-rose-200">⏱ {podcast.duracao}</span>
          <span className="text-[10px] text-rose-200">🎙 {podcast.roteiro.length} falas</span>
        </div>
      </div>

      {/* Speakers */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-1.5 p-2 bg-violet-50 rounded-xl border border-violet-100">
          <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center text-white text-[10px] font-black">A</div>
          <div>
            <p className="text-[10px] font-black text-violet-700">ANA</p>
            <p className="text-[9px] text-violet-400">Professora</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-1.5 p-2 bg-blue-50 rounded-xl border border-blue-100">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-black">M</div>
          <div>
            <p className="text-[10px] font-black text-blue-700">MARCOS</p>
            <p className="text-[9px] text-blue-400">Estudante ENEM</p>
          </div>
        </div>
      </div>

      {/* Play control */}
      <button
        onClick={playing ? stopPlay : startPlay}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
          playing ? "bg-rose-100 border-2 border-rose-300 text-rose-700" : "bg-rose-500 text-white hover:bg-rose-600"
        }`}>
        {playing ? <><Pause className="w-4 h-4" /> Pausar leitura</> : <><Play className="w-4 h-4" /> Simular leitura</>}
      </button>

      {/* Roteiro */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {podcast.roteiro.map((linha, i) => {
          const isAna = linha.speaker === "ANA";
          const isActive = currentIdx === i;
          return (
            <motion.div key={i}
              animate={{ scale: isActive ? 1.02 : 1, opacity: currentIdx >= 0 && currentIdx !== i ? 0.5 : 1 }}
              className={`flex gap-2 ${isAna ? "" : "flex-row-reverse"}`}>
              <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-black mt-0.5 ${isAna ? "bg-violet-500" : "bg-blue-500"}`}>
                {linha.speaker[0]}
              </div>
              <div className={`flex-1 px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                isActive
                  ? isAna ? "bg-violet-100 border-2 border-violet-300 text-violet-900" : "bg-blue-100 border-2 border-blue-300 text-blue-900"
                  : isAna ? "bg-violet-50 text-slate-700" : "bg-blue-50 text-slate-700"
              }`}>
                <span className={`text-[9px] font-black block mb-0.5 ${isAna ? "text-violet-500" : "text-blue-500"}`}>{linha.speaker}</span>
                {linha.fala}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Destaques */}
      {podcast.destaques?.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Pontos-chave</p>
          <div className="space-y-1">
            {podcast.destaques.map((d, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                <span className="text-rose-400 font-black flex-shrink-0">•</span>
                {d}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Timeline (linha do tempo) ────────────────────────────────────────────────
function TimelineView({ t }: { t: Timeline }) {
  const importanciaCor = { alta: "bg-rose-500", media: "bg-amber-500", baixa: "bg-slate-400" } as const;
  return (
    <div className="p-3 space-y-3">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-wider">Linha do Tempo</span>
        </div>
        <p className="font-black text-sm leading-tight">{t.titulo}</p>
        {t.tema && <p className="text-[10px] text-amber-100 mt-0.5">{t.tema}</p>}
        <p className="text-[10px] text-amber-100 mt-2">{t.eventos.length} eventos cronológicos</p>
      </div>

      <div className="relative pl-5">
        <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gradient-to-b from-amber-300 via-orange-300 to-rose-300" />
        {t.eventos.map((ev, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative mb-3"
          >
            <div className={`absolute -left-3.5 top-1 w-3 h-3 rounded-full ring-2 ring-white ${importanciaCor[ev.importancia ?? "media"]}`} />
            <div className="bg-white rounded-xl border border-slate-200 p-2.5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">{ev.data}</span>
                {ev.categoria && (
                  <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{ev.categoria}</span>
                )}
              </div>
              <p className="text-xs font-black text-slate-800 leading-tight mb-1">{ev.titulo}</p>
              <p className="text-[11px] text-slate-600 leading-relaxed">{ev.descricao}</p>
              {ev.dicaEnem && (
                <div className="mt-2 flex items-start gap-1.5 px-2 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
                  <GraduationCap className="w-3 h-3 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-indigo-700 leading-tight"><span className="font-black">ENEM:</span> {ev.dicaEnem}</p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Slides (apresentação profissional) ──────────────────────────────────────
const SLIDE_THEMES = {
  indigo:  { bg: "from-indigo-600 to-purple-700",  accent: "text-indigo-200", chip: "bg-indigo-500", border: "border-indigo-400" },
  rose:    { bg: "from-rose-600 to-pink-700",      accent: "text-rose-200",   chip: "bg-rose-500",   border: "border-rose-400" },
  emerald: { bg: "from-emerald-600 to-teal-700",   accent: "text-emerald-200",chip: "bg-emerald-500",border: "border-emerald-400" },
  amber:   { bg: "from-amber-500 to-orange-600",   accent: "text-amber-100",  chip: "bg-amber-500",  border: "border-amber-400" },
} as const;

function SlidesView({ deck, idx, setIdx }: { deck: Slides; idx: number; setIdx: (n: number) => void }) {
  const theme = SLIDE_THEMES[deck.tema ?? "indigo"];
  const slide = deck.slides[idx] ?? deck.slides[0];
  const total = deck.slides.length;

  const handlePrint = () => window.print();

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Presentation className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Apresentação</span>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-violet-600 px-2 py-1 rounded-md hover:bg-violet-50">
          <Printer className="w-3 h-3" /> Imprimir / PDF
        </button>
      </div>

      {/* Slide canvas — 16:9 */}
      <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className={`absolute inset-0 rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br ${theme.bg} text-white p-5 flex flex-col`}
          >
            {slide.tipo === "capa" && (
              <div className="flex-1 flex flex-col justify-center items-center text-center">
                <div className={`w-10 h-10 rounded-full ${theme.chip} flex items-center justify-center mb-3`}>
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <p className="text-lg font-black leading-tight mb-1">{slide.titulo}</p>
                {slide.subtitulo && <p className={`text-xs ${theme.accent}`}>{slide.subtitulo}</p>}
                {deck.autor && <p className={`text-[10px] ${theme.accent} mt-3`}>por {deck.autor}</p>}
              </div>
            )}

            {slide.tipo === "agenda" && (
              <div className="flex-1 flex flex-col">
                <p className={`text-[10px] font-black uppercase tracking-wider ${theme.accent} mb-1`}>Agenda</p>
                <p className="text-base font-black mb-3">{slide.titulo}</p>
                <div className="flex-1 space-y-1.5">
                  {slide.itens.map((it, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-full ${theme.chip} flex items-center justify-center text-[11px] font-black flex-shrink-0`}>{i + 1}</span>
                      <p className="text-xs font-semibold">{it}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {slide.tipo === "conteudo" && (
              <div className="flex-1 flex flex-col">
                <p className="text-base font-black leading-tight">{slide.titulo}</p>
                {slide.subtitulo && <p className={`text-[11px] ${theme.accent} mb-2`}>{slide.subtitulo}</p>}
                <div className="flex-1 space-y-1.5 mt-2">
                  {slide.bullets.map((b, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.chip} flex-shrink-0 mt-1.5`} />
                      <p className="text-xs leading-snug">{b}</p>
                    </div>
                  ))}
                </div>
                {slide.destaque && (
                  <div className={`mt-3 px-3 py-2 rounded-lg bg-white/15 backdrop-blur border ${theme.border}`}>
                    <p className="text-[11px] font-black">{slide.destaque}</p>
                  </div>
                )}
              </div>
            )}

            {slide.tipo === "comparacao" && (
              <div className="flex-1 flex flex-col">
                <p className="text-base font-black leading-tight mb-3">{slide.titulo}</p>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {[slide.esquerda, slide.direita].map((col, ci) => (
                    <div key={ci} className="rounded-lg bg-white/10 p-2.5 backdrop-blur">
                      <p className={`text-[10px] font-black ${theme.accent} uppercase tracking-wider mb-1.5`}>{col.titulo}</p>
                      <div className="space-y-1">
                        {col.itens.map((it, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-white flex-shrink-0 mt-1.5" />
                            <p className="text-[11px] leading-snug">{it}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {slide.tipo === "citacao" && (
              <div className="flex-1 flex flex-col justify-center">
                <Quote className={`w-6 h-6 ${theme.accent} mb-2`} />
                <p className="text-sm font-bold italic leading-snug">"{slide.texto}"</p>
                {slide.autor && <p className={`text-[10px] ${theme.accent} mt-3`}>— {slide.autor}</p>}
              </div>
            )}

            {slide.tipo === "encerramento" && (
              <div className="flex-1 flex flex-col justify-center items-center text-center">
                <p className={`text-[10px] font-black uppercase tracking-wider ${theme.accent}`}>Conclusão</p>
                <p className="text-base font-black mt-1 mb-2">{slide.titulo}</p>
                <p className="text-xs leading-snug max-w-[90%]">{slide.mensagem}</p>
                {slide.dicaEnem && (
                  <div className={`mt-3 px-3 py-1.5 rounded-lg bg-white/20 border ${theme.border}`}>
                    <p className="text-[10px] font-bold"><span className="font-black">📝 ENEM:</span> {slide.dicaEnem}</p>
                  </div>
                )}
              </div>
            )}

            <div className="absolute bottom-2 right-3 text-[9px] font-bold opacity-60">{idx + 1} / {total}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIdx(Math.max(0, idx - 1))}
          disabled={idx === 0}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 flex gap-0.5">
          {deck.slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${i === idx ? "bg-violet-500" : i < idx ? "bg-violet-200" : "bg-slate-200"}`}
            />
          ))}
        </div>
        <button
          onClick={() => setIdx(Math.min(total - 1, idx + 1))}
          disabled={idx >= total - 1}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Thumbnails / index */}
      <div className="grid grid-cols-3 gap-1.5 mt-1">
        {deck.slides.map((s, i) => {
          const t = s.tipo === "capa" ? "Capa"
            : s.tipo === "agenda" ? "Agenda"
            : s.tipo === "comparacao" ? "Comparação"
            : s.tipo === "citacao" ? "Citação"
            : s.tipo === "encerramento" ? "Conclusão"
            : (s as { titulo?: string }).titulo ?? "Slide";
          return (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`text-left p-1.5 rounded-md border text-[9px] font-semibold truncate transition-all ${
                i === idx ? "bg-violet-50 border-violet-300 text-violet-700" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              <span className="font-black mr-1">{i + 1}.</span>{t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Notebook() {
  const [, navigate] = useLocation();

  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const [uploadMode, setUploadMode] = useState<"file" | "text" | "url" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [toolLoading, setToolLoading] = useState(false);
  const [toolResult, setToolResult] = useState<unknown>(null);
  const [toolError, setToolError] = useState<string | null>(null);

  const [mobilePanel, setMobilePanel] = useState<"sources" | "chat" | "tools">("chat");

  // Citações clicáveis: msgIdx + numero da fonte → expandida
  const [openFonte, setOpenFonte] = useState<{ msgIdx: number; numero: number } | null>(null);
  // Toggle "perguntar só sobre os documentos selecionados"
  const [restrictToSelected, setRestrictToSelected] = useState(true);
  // Slides nav
  const [slideIdx, setSlideIdx] = useState(0);

  const loadDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/docs`, { credentials: "include" });
      if (r.ok) {
        const raw = await r.json();
        const data: Doc[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.rows) ? raw.rows : []);
        setDocs(data);
        if (data.length && selectedDocIds.length === 0) {
          setSelectedDocIds([data[0].id]);
        }
      }
    } catch { /* silent */ }
    finally { setLoadingDocs(false); }
  }, []); // eslint-disable-line

  useEffect(() => { loadDocs(); }, [loadDocs]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadMsg(null);
    const form = new FormData();
    form.append("file", file);
    form.append("title", file.name.replace(/\.[^.]+$/, ""));
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/upload-file`, { method: "POST", body: form, credentials: "include" });
      const data = await r.json();
      if (r.ok) {
        setUploadMsg({ ok: true, text: data.message ?? `✓ "${data.title}" adicionado` });
        await loadDocs();
        setUploadMode(null);
      } else {
        setUploadMsg({ ok: false, text: data.erro ?? "Erro ao enviar" });
      }
    } catch { setUploadMsg({ ok: false, text: "Erro de conexão" }); }
    finally { setUploading(false); }
  }, [loadDocs]);

  const handleTextUpload = useCallback(async () => {
    if (!uploadTitle.trim() || !uploadText.trim()) return;
    setUploading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/upload-text`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ title: uploadTitle, content: uploadText }),
      });
      const data = await r.json();
      if (r.ok) {
        setUploadMsg({ ok: true, text: data.message ?? `✓ "${data.title}" adicionado` });
        setUploadTitle(""); setUploadText(""); await loadDocs(); setUploadMode(null);
      } else { setUploadMsg({ ok: false, text: data.erro ?? "Erro" }); }
    } catch { setUploadMsg({ ok: false, text: "Erro de conexão" }); }
    finally { setUploading(false); }
  }, [uploadTitle, uploadText, loadDocs]);

  const handleUrlUpload = useCallback(async () => {
    if (!uploadUrl.trim()) return;
    setUploading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/upload-url`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ url: uploadUrl, title: uploadTitle || undefined }),
      });
      const data = await r.json();
      if (r.ok) {
        setUploadMsg({ ok: true, text: data.message ?? `✓ "${data.title}" importado` });
        setUploadUrl(""); setUploadTitle(""); await loadDocs(); setUploadMode(null);
      } else { setUploadMsg({ ok: false, text: data.erro ?? "Erro" }); }
    } catch { setUploadMsg({ ok: false, text: "Erro de conexão" }); }
    finally { setUploading(false); }
  }, [uploadUrl, uploadTitle, loadDocs]);

  const handleDelete = useCallback(async (id: number) => {
    await fetch(`${BASE_URL}/api/notebook/docs/${id}`, { method: "DELETE", credentials: "include" });
    setSelectedDocIds(ids => ids.filter(i => i !== id));
    await loadDocs();
  }, [loadDocs]);

  const toggleDoc = useCallback((id: number) => {
    setSelectedDocIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!inputMsg.trim() || chatLoading) return;
    const q = inputMsg.trim();
    setInputMsg("");
    setMessages(m => [...m, { role: "user", text: q }]);
    setChatLoading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          pergunta: q,
          docIds: restrictToSelected && selectedDocIds.length ? selectedDocIds : null,
        }),
      });
      const data = await r.json();
      if (r.ok) { setMessages(m => [...m, { role: "assistant", text: data.resposta, fontes: data.fontes }]); }
      else { setMessages(m => [...m, { role: "assistant", text: `Erro: ${data.erro ?? "tente novamente"}` }]); }
    } catch { setMessages(m => [...m, { role: "assistant", text: "Erro de conexão. Tente novamente." }]); }
    finally { setChatLoading(false); }
  }, [inputMsg, chatLoading, selectedDocIds]);

  const runTool = useCallback(async (tool: Tool, docId?: number) => {
    const targetDocId = docId ?? selectedDocIds[0];
    if (!targetDocId) return;
    setToolError(null);

    if (tool === "tiagao") {
      setToolLoading(true);
      try {
        const r = await fetch(`${BASE_URL}/api/notebook/tiagao-explica`, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ docId: targetDocId }),
        });
        const data = await r.json();
        if (r.ok) {
          localStorage.setItem("tiagao_aula_data", JSON.stringify(data.aula));
          localStorage.setItem("tiagao_aula_topico", data.titulo);
          navigate("/aula-ia");
        } else { setToolError(data.erro ?? "Erro ao gerar aula"); }
      } catch { setToolError("Erro de conexão"); }
      finally { setToolLoading(false); }
      return;
    }

    setActiveTool(tool);
    setToolResult(null);
    setToolLoading(true);
    setMobilePanel("tools");

    const endpoints: Partial<Record<Tool, string>> = {
      overview: "/api/notebook/overview",
      "study-guide": "/api/notebook/study-guide",
      flashcards: "/api/notebook/flashcards",
      questoes: "/api/notebook/questoes",
      "mapa-mental": "/api/notebook/mapa-mental",
      podcast: "/api/notebook/podcast",
      timeline: "/api/notebook/timeline",
      slides: "/api/notebook/slides",
    };
    if (tool === "slides") setSlideIdx(0);

    try {
      const r = await fetch(`${BASE_URL}${endpoints[tool]}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ docId: targetDocId }),
      });
      const data = await r.json();
      if (r.ok) { setToolResult(data); }
      else { setToolError(data.erro ?? "Erro ao gerar conteúdo"); }
    } catch { setToolError("Erro de conexão. Tente novamente."); }
    finally { setToolLoading(false); }
  }, [selectedDocIds, navigate]);

  const selectedDocs = docs.filter(d => selectedDocIds.includes(d.id));

  // ─── SOURCES PANEL ─────────────────────────────────────────────────────────
  const SourcesPanel = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Fontes</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Selecione para usar no chat e ferramentas</p>
      </div>

      {/* Upload buttons */}
      <div className="p-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex gap-1.5">
          {[
            { mode: "file" as const, icon: FileText, label: "PDF" },
            { mode: "text" as const, icon: StickyNote, label: "Texto" },
            { mode: "url"  as const, icon: Link2,    label: "URL" },
          ].map(({ mode, icon: Icon, label }) => (
            <button key={mode} onClick={() => setUploadMode(m => m === mode ? null : mode)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border text-[10px] font-bold transition-all ${
                uploadMode === mode ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {uploadMode && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-3 space-y-2">
                {uploadMode === "file" && (
                  <>
                    <input type="file" ref={fileRef} className="hidden"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="w-full border-2 border-dashed border-indigo-300 rounded-xl p-4 text-xs text-indigo-600 font-medium hover:bg-indigo-50 flex flex-col items-center gap-2">
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                      {uploading ? "Processando... aguarde" : "Clique para enviar PDF / DOC / TXT"}
                      {!uploading && <span className="text-[10px] text-slate-400">Máx. 50MB</span>}
                    </button>
                  </>
                )}
                {uploadMode === "text" && (
                  <>
                    <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                      placeholder="Título do conteúdo *"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-indigo-400" />
                    <textarea value={uploadText} onChange={e => setUploadText(e.target.value)}
                      placeholder="Cole o texto aqui..."
                      rows={5}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-indigo-400 resize-none" />
                    <button onClick={handleTextUpload} disabled={uploading || !uploadTitle.trim() || !uploadText.trim()}
                      className="w-full py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1.5">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Adicionar
                    </button>
                  </>
                )}
                {uploadMode === "url" && (
                  <>
                    <input value={uploadUrl} onChange={e => setUploadUrl(e.target.value)}
                      placeholder="https://... *"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-indigo-400" />
                    <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                      placeholder="Título (opcional)"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-indigo-400" />
                    <button onClick={handleUrlUpload} disabled={uploading || !uploadUrl.trim()}
                      className="w-full py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1.5">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                      Importar URL
                    </button>
                  </>
                )}
                {uploadMsg && (
                  <div className={`flex items-start gap-1.5 text-[10px] font-medium px-2 py-1.5 rounded-lg ${uploadMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                    {uploadMsg.ok ? <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />}
                    {uploadMsg.text}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Doc list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loadingDocs ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
        ) : docs.length === 0 ? (
          <div className="text-center py-8 px-4">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-semibold">Nenhuma fonte ainda</p>
            <p className="text-[10px] text-slate-400 mt-1">Adicione PDFs, textos ou URLs acima para começar</p>
          </div>
        ) : (
          docs.map(doc => {
            const isSelected = selectedDocIds.includes(doc.id);
            return (
              <div key={doc.id}
                className={`flex items-start gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                  isSelected ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                }`}
                onClick={() => toggleDoc(doc.id)}>
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                  isSelected ? "border-indigo-500 bg-indigo-500" : "border-slate-300"
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2">{doc.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {doc.file_size_kb ? `${doc.file_size_kb}KB · ` : ""}
                    {Math.round(doc.content_length / 1000)}K chars
                  </p>
                </div>
                <button onClick={e => { e.stopPropagation(); handleDelete(doc.id); }}
                  className="flex-shrink-0 p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {selectedDocIds.length > 0 && (
        <div className="p-2 border-t border-slate-100 flex-shrink-0">
          <p className="text-[10px] text-indigo-600 font-bold text-center">
            {selectedDocIds.length} fonte{selectedDocIds.length > 1 ? "s" : ""} ativa{selectedDocIds.length > 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );

  // ─── CHAT PANEL ────────────────────────────────────────────────────────────
  const ChatPanel = (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7">
            <TiagaoCharacter state={chatLoading ? "thinking" : "idle"} size={28} showLabel={false} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-800 truncate">
              {!restrictToSelected || selectedDocs.length === 0
                ? `Todos os documentos (${docs.length})`
                : selectedDocs.length === 1 ? `"${selectedDocs[0]?.title}"` : `${selectedDocs.length} fontes selecionadas`}
            </p>
            <p className="text-[10px] text-slate-400">Respostas exclusivamente baseadas no que você adicionou</p>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Limpar chat">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {selectedDocIds.length > 0 && (
          <button
            onClick={() => setRestrictToSelected(v => !v)}
            className={`mt-2 w-full flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${
              restrictToSelected
                ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
            }`}
            title={restrictToSelected ? "Clique para perguntar em TODOS os documentos" : "Clique para perguntar SÓ nos documentos marcados"}
          >
            {restrictToSelected ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            <span className="flex-1 text-left">
              {restrictToSelected
                ? `Perguntar só sobre ${selectedDocIds.length} ${selectedDocIds.length === 1 ? "fonte" : "fontes"} marcada${selectedDocIds.length === 1 ? "" : "s"}`
                : "Perguntar sobre todos os documentos"}
            </span>
            <span className={`w-7 h-3.5 rounded-full relative transition-colors ${restrictToSelected ? "bg-indigo-500" : "bg-slate-300"}`}>
              <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-all ${restrictToSelected ? "left-3.5" : "left-0.5"}`} />
            </span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="mb-4">
              <TiagaoCharacter state="idle" size={80} showLabel={false} />
            </div>
            <p className="text-base font-black text-slate-700 mb-1">Pergunte sobre seus documentos</p>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {docs.length === 0
                ? "Adicione um documento na coluna de Fontes para começar"
                : "As respostas vêm exclusivamente do conteúdo que você adicionou"}
            </p>
            {docs.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {["Faça um resumo do documento", "Quais são os pontos mais importantes?", "Como isso cai no ENEM?", "Explique o conceito principal"].map(q => (
                  <button key={q} onClick={() => setInputMsg(q)}
                    className="px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => {
          // Renderiza texto com [Fonte N] como chips clicáveis
          const fontesMap = new Map((msg.fontes ?? []).map(f => [f.numero, f]));
          const parts = msg.role === "assistant"
            ? msg.text.split(/(\[Fonte \d+\])/g).map((part, idx) => {
                const m = part.match(/^\[Fonte (\d+)\]$/);
                if (m) {
                  const n = parseInt(m[1]);
                  const f = fontesMap.get(n);
                  return (
                    <button
                      key={idx}
                      onClick={() => setOpenFonte(o => o?.msgIdx === i && o?.numero === n ? null : { msgIdx: i, numero: n })}
                      className={`inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 mx-0.5 rounded-md text-[10px] font-black align-baseline transition-all ${
                        f ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white cursor-pointer" : "bg-slate-100 text-slate-400"
                      }`}
                      title={f ? `Ver trecho de "${f.titulo}"` : "Fonte não disponível"}
                      disabled={!f}
                    >
                      {n}
                    </button>
                  );
                }
                return <span key={idx}>{part}</span>;
              })
            : null;

          const fonteAberta = openFonte?.msgIdx === i ? msg.fontes?.find(f => f.numero === openFonte.numero) : null;

          return (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
              {msg.role === "assistant" && <div className="flex-shrink-0 mt-1"><TiagaoCharacter state="idle" size={28} showLabel={false} /></div>}
              <div className="max-w-[82%] space-y-2">
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-800"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.role === "assistant" ? parts : msg.text}</p>
                </div>

                {/* Trecho expandido (clicado) */}
                <AnimatePresence>
                  {fonteAberta && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -4, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Quote className="w-3 h-3 text-indigo-600" />
                            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">Fonte {fonteAberta.numero}</span>
                            <span className="text-[10px] font-bold text-slate-700">· {fonteAberta.titulo}</span>
                          </div>
                          <button onClick={() => setOpenFonte(null)} className="p-0.5 hover:bg-indigo-100 rounded">
                            <X className="w-3 h-3 text-indigo-600" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {fonteAberta.trechoCompleto ?? fonteAberta.trecho}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Chips de citações da resposta */}
                {msg.fontes && msg.fontes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {msg.fontes.map(f => {
                      const isOpen = openFonte?.msgIdx === i && openFonte?.numero === f.numero;
                      return (
                        <button
                          key={f.numero}
                          onClick={() => setOpenFonte(o => o?.msgIdx === i && o?.numero === f.numero ? null : { msgIdx: i, numero: f.numero })}
                          className={`flex items-start gap-1.5 px-2 py-1.5 rounded-xl text-left transition-all max-w-full ${
                            isOpen ? "bg-indigo-100 ring-1 ring-indigo-300" : "bg-slate-100 hover:bg-slate-200"
                          }`}
                        >
                          <span className="text-[10px] font-black text-indigo-600 flex-shrink-0">[{f.numero}]</span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-700 truncate">{f.titulo}</p>
                            <p className="text-[10px] text-slate-500 leading-tight line-clamp-1">{f.trecho}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {chatLoading && (
          <div className="flex justify-start gap-2">
            <TiagaoCharacter state="thinking" size={28} showLabel={false} />
            <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              <span className="text-xs text-slate-500">Buscando nas fontes...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="flex-shrink-0 p-3 bg-white border-t border-slate-200">
        <div className="flex gap-2">
          <input value={inputMsg} onChange={e => setInputMsg(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder={docs.length === 0 ? "Adicione um documento para começar..." : "Pergunte algo sobre seus documentos..."}
            disabled={docs.length === 0 || chatLoading}
            className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-indigo-400 focus:outline-none text-sm text-slate-800 placeholder-slate-400 disabled:opacity-50" />
          <button onClick={sendMessage} disabled={!inputMsg.trim() || chatLoading || docs.length === 0}
            className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center disabled:opacity-30 hover:bg-indigo-700 transition-colors flex-shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // ─── TOOLS PANEL ───────────────────────────────────────────────────────────
  const ToolsPanel = (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      <div className="px-3 py-3 border-b border-slate-100 flex-shrink-0">
        <p className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">Ferramentas</p>
        {selectedDocIds.length === 0 ? (
          <p className="text-[10px] text-slate-400">Selecione um documento para usar as ferramentas</p>
        ) : (
          <div className="space-y-1.5">
            {(Object.entries(TOOL_CONFIG) as [Tool, typeof TOOL_CONFIG[Tool]][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const isActive = activeTool === key;
              const isLoading = toolLoading && isActive;
              return (
                <button key={key}
                  onClick={() => runTool(key, selectedDocIds[0])}
                  disabled={toolLoading}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all disabled:opacity-60 ${
                    isActive ? `${COLOR_MAP[cfg.color]} border-current` : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-800 truncate">{cfg.label}</p>
                      {cfg.badge && (
                        <span className="text-[9px] font-black bg-rose-500 text-white px-1 py-0.5 rounded-md">{cfg.badge}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">{cfg.desc}</p>
                  </div>
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {toolLoading && !toolResult && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <TiagaoCharacter state="thinking" size={60} showLabel />
            <p className="text-xs text-slate-500 font-medium">
              {activeTool === "podcast" ? "Preparando o episódio..." :
               activeTool === "flashcards" ? "Criando flashcards..." :
               activeTool === "questoes" ? "Gerando questões ENEM..." :
               activeTool === "mapa-mental" ? "Desenhando o mapa..." :
               "Gerando..."}
            </p>
          </div>
        )}

        {toolError && !toolLoading && (
          <div className="m-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{toolError}</p>
            </div>
          </div>
        )}

        {!toolLoading && toolResult && activeTool && (
          <div>
            <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
              {(() => { const Icon = TOOL_CONFIG[activeTool].icon; return <Icon className="w-4 h-4 text-indigo-500" />; })()}
              <p className="text-xs font-bold text-slate-700">{TOOL_CONFIG[activeTool].label}</p>
              <button onClick={() => { setActiveTool(null); setToolResult(null); setToolError(null); }}
                className="ml-auto text-slate-300 hover:text-slate-500">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeTool === "overview" && (() => {
              const r = toolResult as Overview;
              return (
                <div className="p-3 space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-1.5">Resumo</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{r.summary}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider mb-1.5">Tópicos-chave</p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.keyTopics?.map((t, i) => (
                        <span key={i} className="px-2 py-0.5 bg-violet-50 border border-violet-200 rounded-full text-[10px] font-medium text-violet-700">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1.5">FAQ</p>
                    <div className="space-y-2">
                      {r.faq?.map((item, i) => (
                        <details key={i} className="group">
                          <summary className="text-xs font-semibold text-slate-700 cursor-pointer list-none flex items-center gap-1.5 py-1">
                            <ChevronRight className="w-3 h-3 text-amber-500 group-open:rotate-90 transition-transform flex-shrink-0" />
                            {item.q}
                          </summary>
                          <p className="text-xs text-slate-600 mt-1 pl-4 leading-relaxed">{item.a}</p>
                        </details>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {activeTool === "study-guide" && (() => {
              const r = toolResult as StudyGuide;
              return (
                <div className="p-3 space-y-3">
                  <p className="text-xs text-slate-600 italic leading-relaxed">{r.introducao}</p>
                  <div className="space-y-2">
                    {r.questoes?.map((q, i) => (
                      <details key={i} className="group rounded-xl border border-slate-200 overflow-hidden">
                        <summary className="px-3 py-2 cursor-pointer list-none bg-slate-50 flex items-center gap-2">
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                            q.tipo === "conceito" ? "bg-indigo-100 text-indigo-700" :
                            q.tipo === "aplicacao" ? "bg-green-100 text-green-700" :
                            "bg-amber-100 text-amber-700"
                          }`}>{q.tipo}</span>
                          <p className="text-xs font-semibold text-slate-700 flex-1 line-clamp-1">{q.pergunta}</p>
                        </summary>
                        <div className="px-3 py-2 space-y-2">
                          <p className="text-xs text-slate-700 leading-relaxed">{q.resposta}</p>
                          {q.dicaEnem && (
                            <div className="flex items-start gap-1.5 p-2 bg-amber-50 rounded-lg">
                              <GraduationCap className="w-3 h-3 text-amber-600 flex-shrink-0 mt-0.5" />
                              <p className="text-[10px] text-amber-800">{q.dicaEnem}</p>
                            </div>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                  {r.cronogramaSugerido?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Cronograma</p>
                      {r.cronogramaSugerido.map((d, i) => (
                        <p key={i} className="text-[10px] text-slate-600 py-0.5">• {d}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {activeTool === "flashcards" && (() => {
              const r = toolResult as { flashcards: Flashcard[] };
              return r.flashcards ? <FlashcardViewer cards={r.flashcards} /> : null;
            })()}

            {activeTool === "questoes" && (() => {
              const r = toolResult as { questoes: Questao[] };
              return r.questoes ? <QuestaViewer questoes={r.questoes} /> : null;
            })()}

            {activeTool === "mapa-mental" && (() => {
              const r = toolResult as MindMap;
              return r.subject ? <MindMapView map={r} /> : null;
            })()}

            {activeTool === "podcast" && (() => {
              const r = toolResult as PodcastRoteiro;
              return r.titulo ? <PodcastViewer podcast={r} /> : null;
            })()}

            {activeTool === "timeline" && (() => {
              const r = toolResult as { timeline: Timeline };
              return r.timeline?.eventos?.length ? <TimelineView t={r.timeline} /> : null;
            })()}

            {activeTool === "slides" && (() => {
              const r = toolResult as { apresentacao: Slides };
              return r.apresentacao?.slides?.length
                ? <SlidesView deck={r.apresentacao} idx={slideIdx} setIdx={setSlideIdx} />
                : null;
            })()}
          </div>
        )}

        {!toolLoading && !toolResult && !toolError && !activeTool && selectedDocIds.length > 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <Users className="w-8 h-8 text-slate-200 mb-2" />
            <p className="text-xs text-slate-400 font-medium">Escolha uma ferramenta para gerar conteúdo</p>
            <p className="text-[10px] text-slate-300 mt-1">O Podcast é uma exclusividade do StudyAI!</p>
          </div>
        )}
      </div>
    </div>
  );

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <AppNav />

      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate("/app")} className="text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="font-black text-slate-800 text-sm leading-tight">StudyAI Notebook</p>
            <p className="text-[10px] text-slate-400">RAG · Flashcards · Questões · Mapa Mental · Podcast</p>
          </div>
        </div>

        <div className="ml-auto lg:hidden flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
          {(["sources", "chat", "tools"] as const).map(p => (
            <button key={p} onClick={() => setMobilePanel(p)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                mobilePanel === p ? "bg-white shadow text-slate-800" : "text-slate-500"
              }`}>
              {p === "sources" ? "Fontes" : p === "chat" ? "Chat" : "Ferramentas"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden lg:flex w-72 xl:w-80 flex-shrink-0 flex-col overflow-hidden">{SourcesPanel}</div>
        <div className="hidden lg:flex flex-1 flex-col overflow-hidden">{ChatPanel}</div>
        <div className="hidden lg:flex w-72 xl:w-80 flex-shrink-0 flex-col overflow-hidden">{ToolsPanel}</div>

        <div className="flex lg:hidden flex-1 flex-col overflow-hidden">
          {mobilePanel === "sources" && SourcesPanel}
          {mobilePanel === "chat"    && ChatPanel}
          {mobilePanel === "tools"   && ToolsPanel}
        </div>
      </div>
    </div>
  );
}
