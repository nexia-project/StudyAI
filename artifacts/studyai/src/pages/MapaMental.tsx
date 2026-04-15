import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  ArrowLeft, Brain, BookOpen, LogIn, RefreshCw, Sparkles,
  Upload, X, FileText, CheckCircle, Lock, ChevronRight,
  BarChart2, Layers, Loader2, Trash2,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

const SUBJECT_COLORS: Record<string, string> = {
  "matemática": "#6366f1", "português": "#ec4899", "história": "#f59e0b",
  "geografia": "#10b981", "física": "#3b82f6", "química": "#8b5cf6",
  "biologia": "#06b6d4", "inglês": "#f97316", "literatura": "#ef4444",
  "filosofia": "#84cc16", "sociologia": "#14b8a6", "redação": "#a855f7",
};
function getColor(subject: string): string {
  const lower = subject.toLowerCase();
  for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
    if (lower.includes(key)) return color;
  }
  const colors = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#06b6d4", "#f97316"];
  let hash = 0;
  for (let i = 0; i < subject.length; i++) hash += subject.charCodeAt(i);
  return colors[hash % colors.length];
}

interface MindNode {
  id: string;
  label: string;
  children: MindNode[];
  color: string;
  level: number;
  hasContent: boolean;
  source: "personal" | "document";
  contentMeta?: {
    plans?: number;
    simulados?: number;
    flashcards?: number;
    topics?: string[];
    avgScore?: number;
  };
}

interface DocMap {
  id: number;
  doc_title: string;
  mind_map_json: {
    subject: string;
    topics: Array<{ name: string; subtopics: string[] }>;
    docTitle: string;
  };
  created_at: string;
}

// ─── Node component ───────────────────────────────────────────────────────────
function MindMapNode({
  node, x, y, parentX, parentY, onClick,
}: {
  node: MindNode; x: number; y: number;
  parentX?: number; parentY?: number;
  onClick?: (node: MindNode) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isRoot = node.level === 0;
  const isSubject = node.level === 1;
  const w = isRoot ? 130 : isSubject ? 105 : 90;
  const h = isRoot ? 44 : isSubject ? 36 : 30;
  const clickable = node.hasContent && !isRoot;
  const opacity = node.source === "document" && !node.hasContent ? 0.45 : 1;

  return (
    <g style={{ opacity }}>
      {parentX !== undefined && parentY !== undefined && (
        <path
          d={`M${parentX},${parentY} C${(parentX + x) / 2},${parentY} ${(parentX + x) / 2},${y} ${x},${y}`}
          fill="none"
          stroke={node.color}
          strokeWidth={isSubject ? 2.5 : 1.5}
          strokeOpacity={node.source === "document" && !node.hasContent ? 0.25 : 0.4}
          strokeDasharray={node.source === "document" && !node.hasContent ? "4 3" : undefined}
        />
      )}
      <g
        transform={`translate(${x - w / 2},${y - h / 2})`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => clickable && onClick?.(node)}
        style={{ cursor: clickable ? "pointer" : "default" }}
      >
        <rect
          width={w}
          height={h}
          rx={isRoot ? 14 : 10}
          fill={isRoot ? node.color : hovered && clickable ? node.color : node.source === "document" && !node.hasContent ? "#f3f4f6" : "white"}
          stroke={node.color}
          strokeWidth={isRoot ? 0 : 2}
          filter={isRoot || isSubject ? "url(#shadow)" : undefined}
          style={{ transition: "all 0.2s" }}
        />
        {/* Lock icon for non-clickable doc nodes */}
        {node.source === "document" && !node.hasContent && !isRoot && (
          <g transform={`translate(${w - 14}, ${h / 2 - 5})`}>
            <Lock width={8} height={8} stroke="#9ca3af" strokeWidth={1.5} fill="none" />
          </g>
        )}
        {/* Check icon for clickable nodes */}
        {clickable && !isRoot && (
          <g transform={`translate(${w - 14}, ${h / 2 - 5})`}>
            <circle cx={4} cy={5} r={4.5} fill={hovered ? "white" : node.color} opacity={hovered ? 0.3 : 0.2} />
            <ChevronRight width={9} height={9} stroke={hovered ? "white" : node.color} strokeWidth={2} fill="none" />
          </g>
        )}
        <text
          x={clickable ? (w - 8) / 2 : w / 2}
          y={h / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={isRoot ? 12 : isSubject ? 11 : 10}
          fontWeight={isRoot || isSubject ? "bold" : "normal"}
          fill={isRoot || (hovered && clickable) ? "white" : node.source === "document" && !node.hasContent ? "#9ca3af" : node.color}
          style={{ transition: "all 0.2s", userSelect: "none" }}
        >
          {node.label.length > 13 ? node.label.slice(0, 12) + "…" : node.label}
        </text>
      </g>
    </g>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
function layoutTree(root: MindNode, cx: number, cy: number) {
  const positions: Array<{ node: MindNode; x: number; y: number; parentX?: number; parentY?: number }> = [];
  positions.push({ node: root, x: cx, y: cy });
  const subjects = root.children;
  const angleStep = subjects.length > 0 ? (Math.PI * 2) / subjects.length : 0;
  const r1 = 200;
  subjects.forEach((subj, si) => {
    const angle = angleStep * si - Math.PI / 2;
    const sx = cx + Math.cos(angle) * r1;
    const sy = cy + Math.sin(angle) * r1;
    positions.push({ node: subj, x: sx, y: sy, parentX: cx, parentY: cy });
    const topics = subj.children;
    const topicCount = topics.length;
    const spread = Math.min(Math.PI * 0.6, topicCount * 0.4);
    topics.forEach((topic, ti) => {
      const topicAngle = topicCount === 1
        ? angle
        : angle - spread / 2 + (spread / (topicCount - 1)) * ti;
      const r2 = 165;
      const tx = sx + Math.cos(topicAngle) * r2;
      const ty = sy + Math.sin(topicAngle) * r2;
      positions.push({ node: topic, x: tx, y: ty, parentX: sx, parentY: sy });
    });
  });
  return positions;
}

// ─── Drawer ───────────────────────────────────────────────────────────────────
function NodeDrawer({ node, onClose }: { node: MindNode | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {node && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/30 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border" style={{ borderTopColor: node.color, borderTopWidth: 4 }}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: node.color }}>
                  {node.level === 1 ? "Matéria" : "Tópico"}
                </p>
                <h2 className="text-lg font-black text-foreground">{node.label}</h2>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {node.contentMeta && (
                <div className="grid grid-cols-3 gap-3">
                  {node.contentMeta.plans !== undefined && (
                    <div className="bg-indigo-50 rounded-2xl p-3 text-center">
                      <p className="text-2xl font-black text-indigo-600">{node.contentMeta.plans}</p>
                      <p className="text-xs text-indigo-500 font-semibold mt-0.5">planos</p>
                    </div>
                  )}
                  {node.contentMeta.simulados !== undefined && (
                    <div className="bg-pink-50 rounded-2xl p-3 text-center">
                      <p className="text-2xl font-black text-pink-600">{node.contentMeta.simulados}</p>
                      <p className="text-xs text-pink-500 font-semibold mt-0.5">simulados</p>
                    </div>
                  )}
                  {node.contentMeta.flashcards !== undefined && (
                    <div className="bg-amber-50 rounded-2xl p-3 text-center">
                      <p className="text-2xl font-black text-amber-600">{node.contentMeta.flashcards}</p>
                      <p className="text-xs text-amber-500 font-semibold mt-0.5">flashcards</p>
                    </div>
                  )}
                </div>
              )}
              {node.contentMeta?.avgScore !== undefined && (
                <div className="bg-secondary/40 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-foreground mb-1">Desempenho em simulados</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${node.contentMeta.avgScore}%`,
                          backgroundColor: node.contentMeta.avgScore >= 70 ? "#10b981" : node.contentMeta.avgScore >= 50 ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    </div>
                    <span className="text-sm font-black" style={{ color: node.contentMeta.avgScore >= 70 ? "#10b981" : node.contentMeta.avgScore >= 50 ? "#f59e0b" : "#ef4444" }}>
                      {node.contentMeta.avgScore}%
                    </span>
                  </div>
                </div>
              )}
              {node.contentMeta?.topics && node.contentMeta.topics.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Tópicos estudados</p>
                  <div className="flex flex-wrap gap-2">
                    {node.contentMeta.topics.map((t, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white" style={{ backgroundColor: node.color }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {node.level === 2 && node.contentMeta?.topics === undefined && (
                <div className="text-center py-8">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: node.color }} />
                  <p className="font-bold text-foreground">Tópico estudado!</p>
                  <p className="text-sm text-muted-foreground mt-1">Este tópico faz parte do seu histórico de estudos.</p>
                </div>
              )}
              <div className="bg-secondary/30 rounded-2xl p-4">
                <p className="text-xs text-muted-foreground">
                  {node.source === "personal"
                    ? "📚 Conteúdo do seu histórico de estudos"
                    : "📄 Conteúdo de documento carregado (com histórico de estudo)"}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file && !title) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      if (file) fd.append("file", file);
      if (title) fd.append("title", title);
      const res = await fetch(`${BASE_URL}/api/mapa-mental/from-doc`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Erro ao processar documento");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6"
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-black text-foreground">Carregar Documento</h3>
              <p className="text-xs text-muted-foreground mt-0.5">O sistema cria um mapa mental automaticamente</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Título (opcional)</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Resumo de Física Quântica"
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Arquivo (PDF ou TXT)</label>
              <div
                className="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => document.getElementById("file-input")?.click()}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-sm font-semibold text-foreground">{file.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Clique para selecionar PDF ou TXT</p>
                    <p className="text-xs text-muted-foreground mt-1">Máximo 25 MB</p>
                  </>
                )}
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><Sparkles className="w-4 h-4" /> Gerar Mapa Mental</>}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MapaMentalPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, login } = useAuth();
  const [mindData, setMindData] = useState<MindNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("Você");
  const [selectedNode, setSelectedNode] = useState<MindNode | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [docMaps, setDocMaps] = useState<DocMap[]>([]);
  const [activeDocId, setActiveDocId] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 920;
  const H = 720;

  const buildTree = useCallback((
    hist: any,
    docMapJson?: DocMap["mind_map_json"] | null,
    docId?: number | null,
  ) => {
    const plans = hist?.plans ?? [];
    const simulados = hist?.simulados ?? [];
    const flashcards = hist?.flashcards ?? [];

    // Build personal subject map
    const personalSubjectMap: Record<string, {
      topics: Set<string>;
      plans: number;
      simulados: number;
      flashcards: number;
      scores: number[];
    }> = {};

    for (const p of plans) {
      const materia = p.materia || "Geral";
      if (!personalSubjectMap[materia]) personalSubjectMap[materia] = { topics: new Set(), plans: 0, simulados: 0, flashcards: 0, scores: [] };
      personalSubjectMap[materia].plans++;
      for (const dia of p.plan?.dias ?? []) {
        for (const t of dia.topicos ?? []) {
          const nome = typeof t === "object" ? t.nome : t;
          if (nome) personalSubjectMap[materia].topics.add(nome);
        }
      }
    }
    for (const s of simulados) {
      const materia = s.materia || "Geral";
      if (!personalSubjectMap[materia]) personalSubjectMap[materia] = { topics: new Set(), plans: 0, simulados: 0, flashcards: 0, scores: [] };
      personalSubjectMap[materia].simulados++;
      if (s.titulo) personalSubjectMap[materia].topics.add(s.titulo);
      if (s.score != null && s.total > 0) personalSubjectMap[materia].scores.push(Math.round((s.score / s.total) * 100));
    }
    for (const f of flashcards) {
      const materia = f.materia || "Geral";
      if (!personalSubjectMap[materia]) personalSubjectMap[materia] = { topics: new Set(), plans: 0, simulados: 0, flashcards: 0, scores: [] };
      personalSubjectMap[materia].flashcards++;
    }

    let children: MindNode[] = [];

    if (docMapJson && docId !== null) {
      // Mode: showing a specific doc mind map merged with personal history
      const color = getColor(docMapJson.subject);
      const personalData = personalSubjectMap[docMapJson.subject];

      const topicNodes: MindNode[] = [];
      for (const topic of (docMapJson.topics ?? []).slice(0, 8)) {
        const topicHasContent = personalData?.topics.has(topic.name) ?? false;

        // Add the topic node
        topicNodes.push({
          id: `${docMapJson.subject}-${topic.name}`,
          label: topic.name,
          children: [],
          color,
          level: 2,
          hasContent: topicHasContent,
          source: topicHasContent ? "personal" : "document",
          contentMeta: topicHasContent ? { topics: [topic.name] } : undefined,
        });

        // Add subtopics as level-3 nodes (won't show in layoutTree but stored)
        // For now, subtopics are shown in drawer when clicking topic
      }

      const subjectHasContent = !!personalData && (personalData.plans > 0 || personalData.simulados > 0 || personalData.flashcards > 0);
      const avgScore = personalData?.scores.length
        ? Math.round(personalData.scores.reduce((a, b) => a + b, 0) / personalData.scores.length)
        : undefined;

      children = [{
        id: docMapJson.subject,
        label: docMapJson.subject,
        children: topicNodes,
        color,
        level: 1,
        hasContent: subjectHasContent,
        source: "document",
        contentMeta: subjectHasContent ? {
          plans: personalData?.plans,
          simulados: personalData?.simulados,
          flashcards: personalData?.flashcards,
          topics: Array.from(personalData?.topics ?? []).slice(0, 10),
          avgScore,
        } : undefined,
      }];

      // Also add other personal subjects alongside the doc subject
      for (const [materia, data] of Object.entries(personalSubjectMap)) {
        if (materia === docMapJson.subject) continue;
        if (data.plans + data.simulados + data.flashcards === 0) continue;
        const c2 = getColor(materia);
        const avg2 = data.scores.length
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
          : undefined;
        const topicNodes2: MindNode[] = Array.from(data.topics).slice(0, 6).map((t, i) => ({
          id: `${materia}-${i}`,
          label: t,
          children: [],
          color: c2,
          level: 2,
          hasContent: true,
          source: "personal" as const,
          contentMeta: { topics: [t] },
        }));
        children.push({
          id: materia,
          label: materia,
          children: topicNodes2,
          color: c2,
          level: 1,
          hasContent: true,
          source: "personal",
          contentMeta: { plans: data.plans, simulados: data.simulados, flashcards: data.flashcards, topics: Array.from(data.topics).slice(0, 10), avgScore: avg2 },
        });
      }
    } else {
      // Mode: personal history only
      children = Object.entries(personalSubjectMap)
        .filter(([, d]) => d.plans + d.simulados + d.flashcards > 0 || d.topics.size > 0)
        .slice(0, 10)
        .map(([materia, data]) => {
          const color = getColor(materia);
          const avg = data.scores.length
            ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
            : undefined;
          const topicNodes: MindNode[] = Array.from(data.topics).slice(0, 6).map((t, i) => ({
            id: `${materia}-${i}`,
            label: t,
            children: [],
            color,
            level: 2,
            hasContent: true,
            source: "personal" as const,
            contentMeta: { topics: [t] },
          }));
          return {
            id: materia,
            label: materia,
            children: topicNodes,
            color,
            level: 1,
            hasContent: true,
            source: "personal" as const,
            contentMeta: {
              plans: data.plans,
              simulados: data.simulados,
              flashcards: data.flashcards,
              topics: Array.from(data.topics).slice(0, 10),
              avgScore: avg,
            },
          };
        });
    }

    if (children.length === 0) return null;
    return {
      id: "root",
      label: studentName,
      children: children.slice(0, 12),
      color: "#6366f1",
      level: 0,
      hasContent: true,
      source: "personal" as const,
    };
  }, [studentName]);

  async function loadData(docId?: number | null) {
    setLoading(true);
    try {
      const [hist, prof, docMapsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/history`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
        fetch(`${BASE_URL}/api/profile`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
        fetch(`${BASE_URL}/api/mapa-mental/my-docs`, { credentials: "include" }).then(r => r.ok ? r.json() : { maps: [] }),
      ]);

      if (prof?.studentName) setStudentName(prof.studentName);
      const maps: DocMap[] = docMapsRes.maps ?? [];
      setDocMaps(maps);

      const targetDocId = docId ?? activeDocId;
      let docMapJson: DocMap["mind_map_json"] | null = null;
      if (targetDocId !== null) {
        const found = maps.find(m => m.id === targetDocId);
        if (found) docMapJson = found.mind_map_json;
      }

      setMindData(buildTree(hist, docMapJson, targetDocId ?? null));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    loadData();
  }, [isAuthenticated]);

  function switchDoc(docId: number | null) {
    setActiveDocId(docId);
    setSelectedNode(null);
    loadData(docId);
  }

  async function deleteDocMap(id: number) {
    if (!confirm("Remover este mapa de documento?")) return;
    await fetch(`${BASE_URL}/api/mapa-mental/my-docs/${id}`, { method: "DELETE", credentials: "include" });
    if (activeDocId === id) switchDoc(null);
    else loadData();
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-black text-foreground mb-2">Mapa Mental</h2>
          <p className="text-muted-foreground mb-6 text-sm">Faça login para ver o mapa visual de tudo que você estudou</p>
          <button onClick={login} className="flex items-center gap-2 mx-auto px-6 py-3 rounded-2xl bg-primary text-white font-bold">
            <LogIn className="w-4 h-4" /> Entrar
          </button>
        </div>
      </div>
    );
  }

  const positions = mindData ? layoutTree(mindData, W / 2, H / 2) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/app")} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-black text-foreground flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" /> Mapa Mental
            </h1>
            <p className="text-xs text-muted-foreground">Clique nos nós coloridos para ver detalhes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Carregar Doc
          </button>
          <button onClick={() => loadData()} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto space-y-4">
        {/* Doc selector tabs */}
        {docMaps.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => switchDoc(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${activeDocId === null ? "bg-primary text-white" : "bg-white border border-border text-foreground hover:bg-secondary"}`}
            >
              📚 Meu Histórico
            </button>
            {docMaps.map(dm => (
              <div key={dm.id} className="flex items-center gap-1">
                <button
                  onClick={() => switchDoc(dm.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${activeDocId === dm.id ? "bg-indigo-600 text-white" : "bg-white border border-border text-foreground hover:bg-secondary"}`}
                >
                  📄 {dm.doc_title}
                </button>
                <button
                  onClick={() => deleteDocMap(dm.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors text-muted-foreground"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">Montando seu mapa...</p>
          </div>
        ) : !mindData ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-black text-foreground text-lg">Mapa vazio por enquanto</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Gere planos de estudo e faça simulados para o mapa crescer — ou carregue um documento para ver o mapa do conteúdo.
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
              <button
                onClick={() => navigate("/app")}
                className="px-5 py-2.5 rounded-2xl bg-primary text-white font-bold flex items-center gap-2 text-sm"
              >
                <Sparkles className="w-4 h-4" /> Gerar plano
              </button>
              <button
                onClick={() => setShowUpload(true)}
                className="px-5 py-2.5 rounded-2xl border-2 border-primary text-primary font-bold flex items-center gap-2 text-sm"
              >
                <Upload className="w-4 h-4" /> Carregar doc
              </button>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden"
          >
            {/* Legend */}
            <div className="px-6 pt-5 pb-3 border-b border-border flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap gap-3">
                {mindData.children.map(child => (
                  <div key={child.id} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: child.color }} />
                    <span className="text-xs font-semibold text-foreground">{child.label}</span>
                    {!child.hasContent && <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> clicável</span>
                <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> sem estudo</span>
              </div>
            </div>

            {/* SVG Mind Map */}
            <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
              <svg
                ref={svgRef}
                width={W}
                height={H}
                viewBox={`0 0 ${W} ${H}`}
                className="w-full"
                style={{ minWidth: 600 }}
              >
                <defs>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
                  </filter>
                </defs>
                {positions.map(({ node, x, y, parentX, parentY }) => (
                  <MindMapNode
                    key={node.id}
                    node={node}
                    x={x}
                    y={y}
                    parentX={parentX}
                    parentY={parentY}
                    onClick={setSelectedNode}
                  />
                ))}
              </svg>
            </div>

            <div className="px-6 py-4 border-t border-border bg-secondary/20 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span><strong className="text-foreground">{mindData.children.length}</strong> matérias</span>
                <span><strong className="text-foreground">{mindData.children.reduce((a, b) => a + b.children.length, 0)}</strong> tópicos</span>
                <span><strong className="text-foreground">{mindData.children.filter(c => c.hasContent).length}</strong> com conteúdo</span>
              </div>
              <p className="text-xs text-muted-foreground">Nós coloridos e clicáveis = conteúdo estudado</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Node Drawer */}
      <NodeDrawer node={selectedNode} onClose={() => setSelectedNode(null)} />

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
