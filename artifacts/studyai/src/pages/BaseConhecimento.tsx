import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import {
  ArrowLeft, BookOpen, Upload, X, FileText, Trash2, Search,
  Link2, Loader2, CheckCircle, AlertCircle, FileImage,
  Database, RefreshCw, Globe, ChevronRight, Brain,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Doc {
  id: number;
  title: string;
  subject: string | null;
  source_file: string | null;
  file_size_kb: number | null;
  page_count: number | null;
  tags: string[] | null;
  preview: string;
  content_length: number;
  created_at: string;
}

interface WikiResult {
  pageid: number;
  title: string;
  snippet: string;
  url: string;
}

interface WikiSummary {
  title: string;
  description: string;
  extract: string;
  url: string;
  thumbnail?: string;
}

const SUBJECT_OPTIONS = [
  "Matemática", "Português", "História", "Geografia", "Física",
  "Química", "Biologia", "Inglês", "Literatura", "Filosofia",
  "Sociologia", "Redação", "Direito", "Informática", "Outro",
];

function formatSize(kb: number | null): string {
  if (!kb) return "";
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function fileIcon(sourceFile: string | null): string {
  if (!sourceFile) return "📄";
  const ext = sourceFile.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "📕";
  if (["doc", "docx"].includes(ext)) return "📘";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "🖼️";
  if (sourceFile.startsWith("http")) return "🌐";
  return "📄";
}

// ─── Upload File Modal ─────────────────────────────────────────────────────────
function UploadFileModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, "")); }
  }, [title]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, "")); }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Selecione um arquivo"); return; }
    setLoading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (title) fd.append("title", title);
      if (subject) fd.append("subject", subject);
      if (tags) fd.append("tags", tags);
      const res = await fetch(`${BASE_URL}/api/knowledge/user-upload`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Erro ao enviar arquivo");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-foreground">Enviar arquivo</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drop area */}
          <div
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${dragging ? "border-indigo-500 bg-indigo-50" : file ? "border-green-400 bg-green-50" : "border-border hover:border-indigo-300 hover:bg-indigo-50/50"}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" hidden accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp" onChange={handleFile} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-green-600" />
                <div className="text-left">
                  <p className="font-bold text-green-800 text-sm">{file.name}</p>
                  <p className="text-xs text-green-600">{formatSize(Math.round(file.size / 1024))}</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <p className="font-semibold text-sm text-foreground">Arraste ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, Word, TXT, imagens · Máx. 50 MB</p>
              </>
            )}
          </div>
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Título do documento (opcional)"
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <select value={subject} onChange={e => setSubject(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          >
            <option value="">Matéria (opcional)</option>
            {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            value={tags} onChange={e => setTags(e.target.value)}
            placeholder="Tags (opcional, separar por vírgula)"
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          {error && <p className="text-red-600 text-sm font-medium flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}
          <button type="submit" disabled={loading || !file}
            className="w-full py-3 rounded-2xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Processando...</> : <><Upload className="w-4 h-4" />Enviar ao banco de dados</>}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Upload URL Modal ──────────────────────────────────────────────────────────
function UploadUrlModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url) { setError("URL obrigatória"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE_URL}/api/knowledge/user-upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url, title, subject }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Erro ao processar URL");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-foreground">Salvar link / site</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">URL do site ou artigo</label>
            <div className="flex items-center gap-2 border border-border rounded-xl px-3 focus-within:ring-2 focus-within:ring-indigo-300">
              <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 py-2.5 text-sm focus:outline-none bg-transparent"
                type="url"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">O conteúdo da página será extraído e salvo automaticamente</p>
          </div>
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Título (opcional)"
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <select value={subject} onChange={e => setSubject(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          >
            <option value="">Matéria (opcional)</option>
            {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {error && <p className="text-red-600 text-sm font-medium flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}
          <button type="submit" disabled={loading || !url}
            className="w-full py-3 rounded-2xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Processando link...</> : <><Link2 className="w-4 h-4" />Salvar conteúdo</>}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Doc Card ──────────────────────────────────────────────────────────────────
function DocCard({ doc, onDelete, onMindMap }: { doc: Doc; onDelete: (id: number) => void; onMindMap: (doc: Doc) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white border border-border rounded-2xl p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0 mt-0.5">{fileIcon(doc.source_file)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-foreground truncate">{doc.title}</h3>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                {doc.subject && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{doc.subject}</span>
                )}
                {doc.page_count && <span className="text-xs text-muted-foreground">{doc.page_count} págs.</span>}
                {doc.file_size_kb && <span className="text-xs text-muted-foreground">{formatSize(doc.file_size_kb)}</span>}
                <span className="text-xs text-muted-foreground">{formatDate(doc.created_at)}</span>
              </div>
              {doc.tags && doc.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {doc.tags.map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{tag}</span>
                  ))}
                </div>
              )}
              {doc.preview && (
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{doc.preview}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => onMindMap(doc)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              <Brain className="w-3.5 h-3.5" />
              Mapa Mental
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            ) : (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-red-600 font-semibold">Confirmar?</span>
                <button onClick={() => onDelete(doc.id)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700">Sim</button>
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-secondary text-foreground hover:bg-secondary/80">Não</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function BaseConhecimento() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [modal, setModal] = useState<"file" | "url" | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Doc[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Wikipedia PT integration
  const [wikiQuery, setWikiQuery] = useState("");
  const [wikiResults, setWikiResults] = useState<WikiResult[]>([]);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [wikiSummary, setWikiSummary] = useState<WikiSummary | null>(null);
  const [wikiSummaryTitle, setWikiSummaryTitle] = useState("");

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadDocs() {
    if (!isAuthenticated) return;
    setLoadingDocs(true);
    try {
      const res = await fetch(`${BASE_URL}/api/knowledge/user-docs`, {
        credentials: "include",
      });
      const data = await res.json();
      setDocs(data.docs || []);
    } catch {
      showToast("Erro ao carregar documentos", "error");
    } finally {
      setLoadingDocs(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await fetch(`${BASE_URL}/api/knowledge/user-docs/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setDocs(prev => prev.filter(d => d.id !== id));
      if (searchResults) setSearchResults(prev => prev?.filter(d => d.id !== id) ?? null);
      showToast("Documento excluído");
    } catch {
      showToast("Erro ao excluir", "error");
    }
  }

  async function handleSearch(q: string) {
    if (!q.trim()) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const res = await fetch(`${BASE_URL}/api/knowledge/user-search?q=${encodeURIComponent(q)}`, {
        credentials: "include",
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      showToast("Erro na busca", "error");
    } finally {
      setSearching(false);
    }
  }

  function handleMindMap(doc: Doc) {
    navigate(`/mapa-mental`);
    showToast("Vá para Mapa Mental e clique em Meus Estudos para ver o mapa do documento");
  }

  function handleUploadSuccess() {
    setModal(null);
    showToast("✅ Conteúdo salvo com segurança no banco de dados!");
    loadDocs();
  }

  // ─── Wikipedia PT ─────────────────────────────────────────────────────────────
  async function handleWikiSearch(q: string) {
    if (!q.trim()) { setWikiResults([]); return; }
    setWikiLoading(true);
    setWikiSummary(null);
    setWikiSummaryTitle("");
    try {
      const res = await fetch(
        `${BASE_URL}/api/wikipedia/search?q=${encodeURIComponent(q)}&limit=6`,
        { credentials: "include" }
      );
      const data = await res.json();
      setWikiResults(data.results || []);
    } catch {
      showToast("Erro ao buscar na Wikipedia", "error");
    } finally {
      setWikiLoading(false);
    }
  }

  async function handleWikiSummary(title: string) {
    setWikiSummaryTitle(title);
    setWikiSummary(null);
    try {
      const res = await fetch(
        `${BASE_URL}/api/wikipedia/summary?title=${encodeURIComponent(title)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.summary) setWikiSummary(data.summary);
    } catch {
      showToast("Erro ao carregar artigo", "error");
    }
  }

  async function handleSaveWikiToBase(summary: WikiSummary) {
    try {
      const body = {
        url: summary.url,
        title: summary.title,
        subject: "",
        tags: ["Wikipedia", "enciclopédia"],
      };
      const res = await fetch(`${BASE_URL}/api/knowledge/user-upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Erro ao salvar");
      showToast("✅ Artigo salvo na sua base de conhecimento!");
      loadDocs();
    } catch (err: any) {
      showToast(err.message || "Erro ao salvar artigo", "error");
    }
  }

  const loadedRef = useRef(false);
  if (!loadedRef.current && isAuthenticated && !isLoading) {
    loadedRef.current = true;
    loadDocs();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <BookOpen className="w-12 h-12 text-indigo-400 mb-4" />
        <h1 className="text-xl font-black text-foreground mb-2">Base de Conhecimento</h1>
        <p className="text-muted-foreground mb-4">Faça login para acessar sua base de conhecimento pessoal.</p>
        <button onClick={() => navigate("/sign-in")} className="px-6 py-3 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700">
          Entrar
        </button>
      </div>
    );
  }

  const displayDocs = searchResults !== null ? searchResults : docs;

  return (
    <div className="min-h-screen bg-background">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2 ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          >
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {modal === "file" && <UploadFileModal onClose={() => setModal(null)} onSuccess={handleUploadSuccess} />}
        {modal === "url" && <UploadUrlModal onClose={() => setModal(null)} onSuccess={handleUploadSuccess} />}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/app")} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Database className="w-5 h-5 text-indigo-600" />
            <h1 className="text-base font-black text-foreground">Base de Conhecimento</h1>
          </div>
          <button onClick={loadDocs} className="p-2 rounded-xl hover:bg-secondary transition-colors" title="Atualizar">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loadingDocs ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Stats banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">Seus documentos</p>
              <p className="text-3xl font-black">{docs.length}</p>
              <p className="text-indigo-200 text-sm mt-0.5">
                {docs.length === 0 ? "Ainda não há documentos" : `${docs.reduce((a, d) => a + (d.content_length || 0), 0).toLocaleString()} caracteres indexados`}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Database className="w-10 h-10 text-indigo-300" />
              <p className="text-xs text-indigo-200 font-medium">Backup diário ativo</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setModal("file")}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-bold shadow-sm"
          >
            <Upload className="w-6 h-6" />
            <span className="text-sm">Enviar arquivo</span>
            <span className="text-xs font-normal text-indigo-200">PDF, Word, imagens</span>
          </button>
          <button
            onClick={() => setModal("url")}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 transition-colors font-bold shadow-sm"
          >
            <Globe className="w-6 h-6" />
            <span className="text-sm">Salvar link</span>
            <span className="text-xs font-normal text-purple-200">Sites e artigos</span>
          </button>
        </div>

        {/* Supported formats */}
        <div className="bg-secondary/30 rounded-2xl p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Formatos suportados</p>
          <div className="flex flex-wrap gap-2">
            {["📕 PDF", "📘 Word (.docx)", "📄 TXT", "🖼️ Imagem", "🌐 Link / Site"].map(f => (
              <span key={f} className="text-xs px-3 py-1 rounded-full bg-white border border-border text-foreground font-medium">{f}</span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Todo conteúdo enviado é indexado e usado pelo Tiagão para te ajudar nos estudos. Backup automático diário.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              if (!e.target.value) setSearchResults(null);
            }}
            onKeyDown={e => e.key === "Enter" && handleSearch(search)}
            placeholder="Buscar nos seus documentos..."
            className="w-full pl-10 pr-4 py-3 border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
          {search && (
            <button
              onClick={() => handleSearch(search)}
              disabled={searching}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : "Buscar"}
            </button>
          )}
        </div>

        {/* Docs list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-foreground">
              {searchResults !== null
                ? `${searchResults.length} resultado${searchResults.length !== 1 ? "s" : ""} encontrado${searchResults.length !== 1 ? "s" : ""}`
                : `${docs.length} documento${docs.length !== 1 ? "s" : ""}`}
            </p>
            {searchResults !== null && (
              <button onClick={() => { setSearch(""); setSearchResults(null); }} className="text-xs text-indigo-600 font-semibold hover:underline">
                Limpar busca
              </button>
            )}
          </div>

          {loadingDocs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : displayDocs.length === 0 ? (
            <div className="text-center py-12 bg-secondary/20 rounded-3xl">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-bold text-foreground mb-1">
                {searchResults !== null ? "Nenhum resultado encontrado" : "Nenhum documento ainda"}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchResults !== null ? "Tente outros termos de busca" : "Envie PDFs, apostilas, links e muito mais"}
              </p>
              {searchResults === null && (
                <button
                  onClick={() => setModal("file")}
                  className="mt-4 px-5 py-2.5 rounded-2xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Enviar primeiro documento
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {displayDocs.map(doc => (
                  <DocCard key={doc.id} doc={doc} onDelete={handleDelete} onMindMap={handleMindMap} />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Wikipedia PT integration panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="text-sm font-bold text-blue-800">Wikipedia em Português — base de conhecimento pública</p>
          </div>
          <p className="text-xs text-blue-700 leading-relaxed">
            Busque qualquer assunto diretamente na Wikipedia PT. O Tiagão também usa esses artigos automaticamente quando você faz perguntas. Salve artigos na sua base para estudar depois.
          </p>

          {/* Search bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={wikiQuery}
              onChange={e => setWikiQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleWikiSearch(wikiQuery)}
              placeholder="Ex: fotossíntese, Segunda Guerra Mundial, álgebra linear..."
              className="flex-1 px-3 py-2 rounded-xl border border-blue-200 bg-white text-sm placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={() => handleWikiSearch(wikiQuery)}
              disabled={wikiLoading}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {wikiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </button>
          </div>

          {/* Results */}
          {wikiResults.length > 0 && (
            <div className="space-y-1.5 mt-1">
              {wikiResults.map(r => (
                <div
                  key={r.pageid}
                  className="bg-white border border-blue-100 rounded-xl p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handleWikiSummary(r.title)}
                        className="text-sm font-bold text-blue-700 hover:underline text-left"
                      >
                        {r.title}
                      </button>
                      {r.snippet && (
                        <p className="text-xs text-blue-600/80 mt-0.5 line-clamp-2">{r.snippet}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-100"
                        title="Abrir na Wikipedia"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Expanded summary */}
                  {wikiSummaryTitle === r.title && (
                    <div className="mt-2 pt-2 border-t border-blue-100">
                      {!wikiSummary ? (
                        <div className="flex items-center gap-2 text-xs text-blue-500">
                          <Loader2 className="w-3 h-3 animate-spin" /> Carregando artigo...
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {wikiSummary.thumbnail && (
                            <img
                              src={wikiSummary.thumbnail}
                              alt={wikiSummary.title}
                              className="float-right ml-3 mb-1 w-20 h-16 object-cover rounded-lg"
                            />
                          )}
                          {wikiSummary.description && (
                            <p className="text-xs font-semibold text-blue-700">{wikiSummary.description}</p>
                          )}
                          <p className="text-xs text-blue-800/80 leading-relaxed line-clamp-6">{wikiSummary.extract}</p>
                          <div className="flex items-center gap-2 pt-1 clear-both">
                            <button
                              onClick={() => handleSaveWikiToBase(wikiSummary)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                              <Database className="w-3.5 h-3.5" />
                              Salvar na minha base
                            </button>
                            <a
                              href={wikiSummary.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200"
                            >
                              <Globe className="w-3.5 h-3.5" />
                              Ver artigo completo
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* INEP/MEC links */}
          <div className="pt-1 border-t border-blue-200">
            <p className="text-xs font-bold text-blue-700 mb-1.5">Fontes educacionais oficiais:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "INEP / ENEM", url: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem" },
                { label: "MEC / BNCC", url: "http://basenacionalcomum.mec.gov.br" },
                { label: "Dados ENEM abertos", url: "https://dados.gov.br/dados/conjuntos-dados?q=enem" },
                { label: "Khan Academy PT", url: "https://pt.khanacademy.org" },
              ].map(link => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                  <ChevronRight className="w-3 h-3" />
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
