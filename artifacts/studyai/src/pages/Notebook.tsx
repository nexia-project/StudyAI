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
  Loader2, Trash2, Send, ChevronRight, X, Plus, Zap,
  ClipboardList, Layers, GraduationCap, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, Star, StickyNote, HelpCircle,
  ExternalLink, ArrowLeft, RefreshCw, Mic, Play, Pause,
  Volume2, Users,
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
  fontes?: Array<{ numero: number; titulo: string; trecho: string }>;
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

type Tool = "overview" | "study-guide" | "flashcards" | "questoes" | "mapa-mental" | "podcast" | "tiagao";

const TOOL_CONFIG: Record<Tool, { label: string; icon: React.ElementType; color: string; desc: string; badge?: string }> = {
  overview:      { label: "Visão Geral",      icon: Star,          color: "indigo",   desc: "Resumo + tópicos-chave + FAQ" },
  "study-guide": { label: "Guia de Estudo",   icon: ClipboardList, color: "violet",   desc: "Q&A com cronograma ENEM" },
  flashcards:    { label: "Flashcards",        icon: Layers,        color: "pink",     desc: "15 flashcards para memorizar" },
  questoes:      { label: "Questões ENEM",     icon: GraduationCap, color: "amber",    desc: "5 questões estilo ENEM" },
  "mapa-mental": { label: "Mapa Mental",       icon: Brain,         color: "green",    desc: "Mapa visual interativo" },
  podcast:       { label: "Podcast",           icon: Mic,           color: "rose",     desc: "Conversa educativa sobre o doc", badge: "NOVO" },
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
        body: JSON.stringify({ pergunta: q, docIds: selectedDocIds.length ? selectedDocIds : null }),
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
    };

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
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0 flex items-center gap-3">
        <div className="w-7 h-7">
          <TiagaoCharacter state={chatLoading ? "thinking" : "idle"} size={28} showLabel={false} />
        </div>
        <div>
          <p className="text-xs font-black text-slate-800">
            {selectedDocs.length === 0 ? "Chat com todos os documentos" : selectedDocs.length === 1 ? `"${selectedDocs[0]?.title}"` : `${selectedDocs.length} fontes selecionadas`}
          </p>
          <p className="text-[10px] text-slate-400">Respostas baseadas nos seus documentos</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Limpar chat">
            <RefreshCw className="w-3.5 h-3.5" />
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

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
            {msg.role === "assistant" && <div className="flex-shrink-0 mt-1"><TiagaoCharacter state="idle" size={28} showLabel={false} /></div>}
            <div className="max-w-[82%] space-y-2">
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-800"
              }`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
              {msg.fontes && msg.fontes.length > 0 && (
                <div className="space-y-1">
                  {msg.fontes.slice(0, 3).map(f => (
                    <div key={f.numero} className="flex items-start gap-1.5 px-2 py-1.5 bg-slate-100 rounded-xl">
                      <span className="text-[10px] font-black text-indigo-600 flex-shrink-0">[{f.numero}]</span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-700 truncate">{f.titulo}</p>
                        <p className="text-[10px] text-slate-500 leading-tight line-clamp-1">{f.trecho}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

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
