import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, BookOpen, Trash2, Sparkles, ChevronLeft, Save, Tag,
  BookMarked, Lightbulb, Brain, HelpCircle, List, Loader2, X,
  Search, StickyNote, GraduationCap,
} from "lucide-react";
import {
  SIMULADO_ERROR_REVIEW_DRAFT_KEY,
  completeErrorReviewMission,
  clearErrorReviewMission,
  emitHermesLearningSignal,
  readErrorReviewHistory,
  readErrorReviewMission,
  type ErrorReviewCompletion,
  type ErrorReviewDraft,
} from "@/lib/error-review";
import { clearSimuladoRecoveryMission, completeSimuladoRecoveryMission, readSimuladoRecoveryMission } from "@/lib/next-best-action";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

const MATERIAS = [
  "Matemática", "Português", "Redação", "História", "Geografia",
  "Biologia", "Física", "Química", "Inglês", "Filosofia", "Sociologia",
  "Artes", "Educação Física", "Informática", "Outro",
];

const MATERIA_COLORS: Record<string, string> = {
  "Matemática": "bg-violet-100 text-violet-700",
  "Português": "bg-emerald-100 text-emerald-700",
  "Redação": "bg-pink-100 text-pink-700",
  "História": "bg-amber-100 text-amber-700",
  "Geografia": "bg-green-100 text-green-700",
  "Biologia": "bg-lime-100 text-lime-700",
  "Física": "bg-violet-100 text-gray-700",
  "Química": "bg-orange-100 text-orange-700",
  "Inglês": "bg-violet-100 text-violet-700",
  "Filosofia": "bg-violet-100 text-violet-700",
  "Sociologia": "bg-rose-100 text-rose-700",
};

interface Note {
  id: string;
  title: string;
  content: string;
  materia?: string;
  processedContent?: {
    resumo?: string;
    keyPoints?: string[];
    flashcards?: Array<{ front: string; back: string }>;
    questoes?: Array<{ text: string; alternatives: string[]; correct: number; explanation: string }>;
  };
  createdAt: string;
  updatedAt: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "agora";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d atrás`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

type AITab = "resumo" | "pontos" | "flashcards" | "questoes";

export default function Caderno() {
  const [, navigate] = useLocation();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMateria, setFilterMateria] = useState<string>("Todas");
  const [showEditor, setShowEditor] = useState(false);
  const [importedErrorReview, setImportedErrorReview] = useState<ErrorReviewDraft | null>(null);
  const [reviewHistory, setReviewHistory] = useState<ErrorReviewCompletion[]>([]);

  // Editor state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editMateria, setEditMateria] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [dirty, setDirty] = useState(false);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiTab, setAiTab] = useState<AITab>("resumo");
  const [flipCard, setFlipCard] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<Record<number, number>>({});

  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedNote = notes.find(n => n.id === selectedId) ?? null;

  // Load notes
  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/student/caderno`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setNotes(data.notes ?? data ?? []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const refreshReviewHistory = useCallback(() => {
    setReviewHistory(readErrorReviewHistory());
  }, []);

  useEffect(() => {
    refreshReviewHistory();
    window.addEventListener("storage", refreshReviewHistory);
    window.addEventListener("focus", refreshReviewHistory);
    return () => {
      window.removeEventListener("storage", refreshReviewHistory);
      window.removeEventListener("focus", refreshReviewHistory);
    };
  }, [refreshReviewHistory]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIMULADO_ERROR_REVIEW_DRAFT_KEY);
      if (!raw) return;
      localStorage.removeItem(SIMULADO_ERROR_REVIEW_DRAFT_KEY);
      const draft = JSON.parse(raw) as ErrorReviewDraft;
      if (!draft?.title || !draft?.content) return;
      setSelectedId(null);
      setEditTitle(draft.title);
      setEditContent(draft.content);
      setEditMateria(draft.materia ?? "");
      setImportedErrorReview(draft);
      setIsCreating(true);
      setDirty(false);
      setShowEditor(true);
      emitHermesLearningSignal({
        surface: "caderno",
        event: "error_review_draft_loaded",
        source: draft.source ?? "simulado-enem",
        errorType: draft.errorType ?? null,
        errors: draft.errors?.length ?? null,
        primarySubject: draft.materia ?? null,
        recommendation: draft.recommendation ?? null,
      });
    } catch {
      localStorage.removeItem(SIMULADO_ERROR_REVIEW_DRAFT_KEY);
    }
  }, []);

  // Select note
  const selectNote = useCallback((note: Note) => {
    setSelectedId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditMateria(note.materia ?? "");
    setIsCreating(false);
    setDirty(false);
    setShowEditor(true);
    setFlipCard(null);
    setSelectedAnswer({});
    setImportedErrorReview(null);
  }, []);

  // New note
  const startNewNote = useCallback(() => {
    setSelectedId(null);
    setEditTitle("");
    setEditContent("");
    setEditMateria("");
    setIsCreating(true);
    setDirty(false);
    setShowEditor(true);
    setImportedErrorReview(null);
  }, []);

  // Auto-save on edit (2s debounce)
  useEffect(() => {
    if (!dirty || isCreating) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      if (!selectedId || !editTitle.trim()) return;
      await fetch(`${BASE_URL}/api/student/caderno/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: editTitle, content: editContent, materia: editMateria }),
      });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
      setNotes(prev => prev.map(n =>
        n.id === selectedId ? { ...n, title: editTitle, content: editContent, materia: editMateria } : n
      ));
      setDirty(false);
    }, 2000);
  }, [dirty, editTitle, editContent, editMateria, selectedId, isCreating]);

  // Save new / update existing
  const handleSave = useCallback(async () => {
    if (!editTitle.trim() || !editContent.trim()) return;
    setSaving(true);
    try {
      if (isCreating) {
        const res = await fetch(`${BASE_URL}/api/student/caderno`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title: editTitle, content: editContent, materia: editMateria }),
        });
        const { note } = await res.json();
        setNotes(prev => [note, ...prev]);
        setSelectedId(note.id);
        setIsCreating(false);
        setDirty(false);
        if (importedErrorReview) {
          const currentMission = readErrorReviewMission();
          if (currentMission) {
            completeErrorReviewMission({
              mission: currentMission,
              savedNoteId: note?.id ?? null,
              completion: "saved_review_note",
            });
          } else {
            clearErrorReviewMission();
          }
          const recoveryMission = readSimuladoRecoveryMission();
          if (recoveryMission) {
            completeSimuladoRecoveryMission(recoveryMission, "sent_to_caderno");
          } else {
            clearSimuladoRecoveryMission();
          }
          refreshReviewHistory();
          emitHermesLearningSignal({
            surface: "caderno",
            event: "error_review_note_created",
            source: importedErrorReview.source ?? "simulado-enem",
            errorType: importedErrorReview.errorType ?? null,
            errors: importedErrorReview.errors?.length ?? null,
            primarySubject: importedErrorReview.materia ?? null,
            recommendation: importedErrorReview.recommendation ?? null,
          });
          emitHermesLearningSignal({
            surface: "caderno",
            event: "error_review_mission_completed",
            source: importedErrorReview.source ?? "simulado-enem",
            primarySubject: importedErrorReview.materia ?? null,
            savedNoteId: note?.id ?? null,
            completion: "saved_review_note",
          });
          setImportedErrorReview(null);
        }
      } else if (selectedId) {
        await fetch(`${BASE_URL}/api/student/caderno/${selectedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title: editTitle, content: editContent, materia: editMateria }),
        });
        setNotes(prev => prev.map(n =>
          n.id === selectedId ? { ...n, title: editTitle, content: editContent, materia: editMateria } : n
        ));
        setDirty(false);
      }
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
    } finally { setSaving(false); }
  }, [isCreating, selectedId, editTitle, editContent, editMateria, importedErrorReview, refreshReviewHistory]);

  // Delete note
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Excluir esta nota?")) return;
    await fetch(`${BASE_URL}/api/student/caderno/${id}`, { method: "DELETE", credentials: "include" });
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedId === id) { setSelectedId(null); setShowEditor(false); }
  }, [selectedId]);

  // AI process
  const handleProcess = useCallback(async () => {
    if (!selectedId) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/student/caderno/${selectedId}/process`, {
        method: "POST", credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error ?? body?.erro ?? "Erro ao processar com IA";
        setAiError(msg);
        return;
      }
      const data = await res.json();
      const processed = data?.processed ?? data;
      if (!processed || typeof processed !== "object") {
        setAiError("Resposta inválida da IA. Tente novamente.");
        return;
      }
      setNotes(prev => prev.map(n =>
        n.id === selectedId ? { ...n, processedContent: processed } : n
      ));
      setAiError(null);
    } catch {
      setAiError("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setAiLoading(false);
    }
  }, [selectedId]);

  // Filtered notes
  const filteredNotes = notes.filter(n => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) ||
                        n.content.toLowerCase().includes(search.toLowerCase());
    const matchMateria = filterMateria === "Todas" || n.materia === filterMateria;
    return matchSearch && matchMateria;
  });

  const processed = selectedNote?.processedContent;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/app")} className="p-2 rounded-xl hover:bg-amber-50 text-amber-700 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-black text-gray-900 leading-none">Caderno Digital</h1>
                <p className="text-xs text-amber-600 font-medium">{notes.length} nota{notes.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>
          <button
            onClick={startNewNote}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Nota</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4 h-[calc(100vh-65px)]">
        {/* Sidebar */}
        <div className={`flex-shrink-0 w-72 flex flex-col gap-3 ${showEditor ? "hidden md:flex" : "flex"}`}>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar notas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-amber-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 shadow-sm"
            />
          </div>

          {/* Matéria filter */}
          <select
            value={filterMateria}
            onChange={e => setFilterMateria(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-white border border-amber-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 shadow-sm text-gray-700"
          >
            <option>Todas</option>
            {MATERIAS.map(m => <option key={m}>{m}</option>)}
          </select>

          <div className="rounded-2xl border border-violet-100 bg-white/85 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-500">
                  Revisões concluídas
                </p>
                <p className="text-xs text-gray-500">
                  Histórico local do Caderno de Erros
                </p>
              </div>
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-700">
                {reviewHistory.length}
              </span>
            </div>
            {reviewHistory.length > 0 ? (
              <div className="mt-3 space-y-2">
                {reviewHistory.slice(0, 3).map(item => (
                  <div key={`${item.createdAt}-${item.completedAt}`} className="rounded-xl bg-violet-50/60 px-3 py-2">
                    <p className="truncate text-xs font-black text-slate-800">{item.subject}</p>
                    <p className="text-[11px] text-slate-500">
                      {item.errorsCount} erro{item.errorsCount !== 1 ? "s" : ""} · {item.accuracy}% · {formatDate(item.completedAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-gray-500">
                Ao salvar uma revisão importada do simulado, ela aparece aqui como concluída sem inventar progresso global.
              </p>
            )}
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
            {loading ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-amber-50" />
                ))}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-12">
                <StickyNote className="w-10 h-10 text-amber-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Nenhuma nota encontrada</p>
                <button onClick={startNewNote} className="mt-3 text-sm text-amber-600 font-semibold hover:underline">
                  Criar primeira nota
                </button>
              </div>
            ) : (
              filteredNotes.map(note => (
                <motion.button
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedId === note.id
                      ? "bg-amber-50 border-amber-300 shadow-sm"
                      : "bg-white border-amber-100 hover:border-amber-200 hover:shadow-sm"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-sm text-gray-900 leading-tight line-clamp-1 flex-1">
                      {note.title}
                    </h3>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(note.id); }}
                      className="p-0.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{note.content}</p>
                  <div className="flex items-center justify-between">
                    {note.materia ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MATERIA_COLORS[note.materia] ?? "bg-gray-100 text-gray-600"}`}>
                        {note.materia}
                      </span>
                    ) : <span />}
                    <div className="flex items-center gap-1.5">
                      {note.processedContent && (
                        <span title="IA processada"><Brain className="w-3 h-3 text-violet-400" /></span>
                      )}
                      <span className="text-xs text-gray-400">{formatDate(note.updatedAt)}</span>
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </div>

        {/* Editor + AI Panel */}
        <AnimatePresence mode="wait">
          {showEditor ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex gap-4 min-w-0 overflow-hidden"
            >
              {/* Editor */}
              <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden min-w-0">
                {/* Editor toolbar */}
                <div className="px-4 py-3 border-b border-amber-50 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowEditor(false)}
                    className="md:hidden p-2 rounded-lg hover:bg-amber-50 text-amber-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <select
                    value={editMateria}
                    onChange={e => { setEditMateria(e.target.value); setDirty(true); }}
                    className="flex-shrink-0 text-xs px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 text-amber-800 font-medium"
                  >
                    <option value="">Matéria...</option>
                    {MATERIAS.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <div className="flex-1" />
                  {/* Save indicator */}
                  <AnimatePresence>
                    {savedOk && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-emerald-600 font-semibold flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" /> Salvo!
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <button
                    onClick={handleSave}
                    disabled={saving || !editTitle.trim() || !editContent.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {isCreating ? "Criar" : "Salvar"}
                  </button>
                  {!isCreating && selectedId && (
                    <button
                      onClick={handleProcess}
                      disabled={aiLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Tiagão IA
                    </button>
                  )}
                </div>

                {/* AI error banner */}
                {aiError && (
                  <div className="mx-4 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
                    <X className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{aiError}</span>
                    <button onClick={() => setAiError(null)} className="ml-auto p-0.5 hover:bg-red-100 rounded">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {importedErrorReview && (
                  <div className="mx-4 mt-3 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
                          Caderno de erros premium
                        </p>
                        <h2 className="mt-1 text-sm font-black text-slate-900">
                          Tiagão organizou seus erros por causa provável e próxima revisão.
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          Salve esta nota para manter o histórico e use o botão do Tiagão IA para transformar a revisão em flashcards e questões.
                        </p>
                      </div>
                      <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-violet-700 shadow-sm">
                        {importedErrorReview.errors?.length ?? 0} erro{(importedErrorReview.errors?.length ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl bg-white/80 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tipo</p>
                        <p className="mt-1 text-xs font-bold text-slate-800">{importedErrorReview.errorType ?? "revisão ENEM"}</p>
                      </div>
                      <div className="rounded-xl bg-white/80 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Causa provável</p>
                        <p className="mt-1 text-xs font-bold text-slate-800">{importedErrorReview.probableCause ?? "lacuna a revisar"}</p>
                      </div>
                      <div className="rounded-xl bg-white/80 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Próxima missão</p>
                        <p className="mt-1 text-xs font-bold text-slate-800">{importedErrorReview.nextMission ?? "refazer erro comentado"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Title */}
                <input
                  type="text"
                  placeholder="Título da nota..."
                  value={editTitle}
                  onChange={e => { setEditTitle(e.target.value); setDirty(true); }}
                  className="px-5 pt-4 pb-2 text-xl font-black text-gray-900 bg-transparent border-none focus:outline-none placeholder:text-gray-300 w-full"
                />

                {/* Content */}
                <textarea
                  placeholder="Comece a anotar aqui... Use este caderno para registrar o que aprendeu, dúvidas, fórmulas, trechos importantes. O Tiagão vai transformar suas anotações em resumos, flashcards e questões!"
                  value={editContent}
                  onChange={e => { setEditContent(e.target.value); setDirty(true); }}
                  className="flex-1 px-5 py-2 text-sm text-gray-700 bg-transparent border-none focus:outline-none resize-none leading-relaxed placeholder:text-gray-300"
                />

                {/* Word count */}
                <div className="px-5 py-2 border-t border-amber-50 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {editContent.split(/\s+/).filter(Boolean).length} palavras
                  </span>
                  {editContent.length > 100 && !isCreating && !processed && (
                    <button onClick={handleProcess} disabled={aiLoading} className="text-xs text-violet-600 hover:underline font-medium">
                      ✨ Processar com IA
                    </button>
                  )}
                </div>
              </div>

              {/* AI Panel */}
              {processed && !isCreating && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="w-80 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden flex flex-col hidden lg:flex"
                >
                  <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    <span className="font-bold text-sm">Tiagão IA — Insights</span>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-violet-50">
                    {([
                      { id: "resumo", icon: List, label: "Resumo" },
                      { id: "pontos", icon: Lightbulb, label: "Pontos" },
                      { id: "flashcards", icon: BookMarked, label: "Cards" },
                      { id: "questoes", icon: HelpCircle, label: "Questões" },
                    ] as const).map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setAiTab(tab.id)}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-semibold transition-colors ${
                          aiTab === tab.id ? "text-violet-600 border-b-2 border-violet-500" : "text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {aiTab === "resumo" && processed.resumo && (
                      <p className="text-sm text-gray-700 leading-relaxed">{processed.resumo}</p>
                    )}

                    {aiTab === "pontos" && processed.keyPoints && (
                      <ul className="space-y-2">
                        {processed.keyPoints.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="w-5 h-5 rounded-full bg-violet-100 text-gray-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    )}

                    {aiTab === "flashcards" && processed.flashcards && (
                      <div className="space-y-3">
                        {processed.flashcards.map((card, i) => (
                          <button
                            key={i}
                            onClick={() => setFlipCard(flipCard === i ? null : i)}
                            className="w-full text-left"
                          >
                            <div className={`p-3 rounded-xl border-2 transition-all ${
                              flipCard === i ? "bg-violet-50 border-violet-200" : "bg-gray-50 border-gray-100"
                            }`}>
                              <p className="text-xs font-bold text-gray-700 mb-1">
                                {flipCard === i ? "📖 Resposta" : "❓ Pergunta"}
                              </p>
                              <p className="text-sm text-gray-800">
                                {flipCard === i ? card.back : card.front}
                              </p>
                              {flipCard !== i && (
                                <p className="text-xs text-gray-400 mt-1">Toque para ver resposta</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {aiTab === "questoes" && processed.questoes && (
                      <div className="space-y-4">
                        {processed.questoes.map((q, qi) => (
                          <div key={qi} className="bg-gray-50 rounded-xl p-3">
                            <p className="text-sm font-semibold text-gray-800 mb-2">{qi + 1}. {q.text}</p>
                            <div className="space-y-1.5">
                              {q.alternatives.map((alt, ai) => (
                                <button
                                  key={ai}
                                  onClick={() => setSelectedAnswer(prev => ({ ...prev, [qi]: ai }))}
                                  className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-all ${
                                    selectedAnswer[qi] === undefined
                                      ? "border-gray-200 bg-white hover:border-violet-300"
                                      : ai === q.correct
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold"
                                        : selectedAnswer[qi] === ai
                                          ? "border-red-300 bg-red-50 text-red-700"
                                          : "border-gray-100 bg-white text-gray-400"
                                  }`}
                                >
                                  {alt}
                                </button>
                              ))}
                            </div>
                            {selectedAnswer[qi] !== undefined && (
                              <p className="text-xs text-gray-600 mt-2 p-2 bg-amber-50 rounded-lg">
                                💡 {q.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Empty AI panel state */}
              {!processed && !isCreating && selectedId && (
                <div className="w-72 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-dashed border-violet-200 items-center justify-center text-center p-8 hidden lg:flex flex-col">
                  <Brain className="w-10 h-10 text-violet-200 mb-3" />
                  <p className="text-sm text-gray-500 mb-4">Clique em <strong>Tiagão IA</strong> para gerar resumo, flashcards e questões automaticamente</p>
                  <button
                    onClick={handleProcess}
                    disabled={aiLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-colors"
                  >
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Processar com IA
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 hidden md:flex items-center justify-center text-center"
            >
              <div>
                <div className="w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-10 h-10 text-amber-500" />
                </div>
                <h3 className="text-lg font-black text-gray-800 mb-2">Seu Caderno Digital</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
                  Anote o que aprender. O Tiagão transforma suas anotações em resumos, flashcards e questões automaticamente.
                </p>
                <button
                  onClick={startNewNote}
                  className="flex items-center gap-2 mx-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-bold shadow hover:shadow-md transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Criar primeira nota
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
