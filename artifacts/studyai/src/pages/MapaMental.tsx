import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import {
  ArrowLeft, Brain, BookOpen, LogIn, RefreshCw, Sparkles,
  Upload, X, FileText, CheckCircle, Lock, ChevronRight,
  Loader2, Trash2, GraduationCap, BookMarked, User2,
  FolderOpen, Plus,
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
  source: "personal" | "document" | "professor";
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

interface ProfMap {
  id: number;
  doc_title: string;
  subject: string;
  mind_map_json: {
    subject: string;
    topics: Array<{ name: string; subtopics: string[] }>;
    docTitle: string;
  };
  created_at: string;
}

interface SubjectMap {
  subject: string;
  topics: Array<{ name: string; subtopics: string[] }>;
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
        {node.source === "document" && !node.hasContent && !isRoot && (
          <g transform={`translate(${w - 14}, ${h / 2 - 5})`}>
            <Lock width={8} height={8} stroke="#9ca3af" strokeWidth={1.5} fill="none" />
          </g>
        )}
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

// ─── Generic Mind Map SVG from JSON ───────────────────────────────────────────
function MindMapSVG({
  mapJson, rootLabel, onStudy,
}: {
  mapJson: { subject: string; topics: Array<{ name: string; subtopics: string[] }> };
  rootLabel?: string;
  onStudy?: (topic: string) => void;
}) {
  const [selectedNode, setSelectedNode] = useState<MindNode | null>(null);
  const [docTab, setDocTab] = useState<"estudar" | "videos" | "buscar">("estudar");
  const [, navigate] = useLocation();
  const color = getColor(mapJson.subject);
  const W = 920; const H = 680;

  // Build tree with parent info
  const topicsData = mapJson.topics.slice(0, 10);
  const root: MindNode = {
    id: "root",
    label: rootLabel || mapJson.subject,
    color,
    level: 0,
    hasContent: true,
    source: "document",
    children: topicsData.map((topic, ti) => ({
      id: `t${ti}`,
      label: topic.name,
      color,
      level: 1,
      hasContent: true,
      source: "document" as const,
      contentMeta: { topics: (topic.subtopics || []).slice(0, 5) },
      children: (topic.subtopics || []).slice(0, 5).map((sub, si) => ({
        id: `t${ti}s${si}`,
        label: sub,
        color,
        level: 2,
        hasContent: true,
        source: "document" as const,
        contentMeta: { topics: [topic.name] }, // parent topic
        children: [],
      })),
    })),
  };

  const positions = layoutTree(root, W / 2, H / 2);

  // Find subtopics for a clicked topic node
  const topicSubtopics = selectedNode?.level === 1
    ? (topicsData.find(t => t.name === selectedNode.label)?.subtopics ?? selectedNode.contentMeta?.topics ?? [])
    : [];
  // Parent topic for a subtopic node
  const parentTopic = selectedNode?.level === 2
    ? (selectedNode.contentMeta?.topics?.[0] ?? "")
    : "";

  function handleStudy() {
    const query = selectedNode ? `Explica o tópico "${selectedNode.label}" de ${mapJson.subject}` : "";
    navigate(`/app?q=${encodeURIComponent(query)}`);
  }

  return (
    <>
      <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 600 }}>
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
            </filter>
          </defs>
          {positions.map(({ node, x, y, parentX, parentY }) => (
            <MindMapNode key={node.id} node={node} x={x} y={y} parentX={parentX} parentY={parentY} onClick={setSelectedNode} />
          ))}
        </svg>
      </div>

      {/* Rich drawer for clicked nodes */}
      <AnimatePresence>
        {selectedNode && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/30 z-40"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedNode(null)}
            />
            <motion.div
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Header */}
              <div
                className="px-5 py-4 border-b border-border"
                style={{ borderTopColor: selectedNode.color, borderTopWidth: 4 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: selectedNode.color }}>
                      {selectedNode.level === 1 ? "Tópico" : "Subtópico"} · {mapJson.subject}
                    </p>
                    <h2 className="text-lg font-black text-foreground leading-tight">{selectedNode.label}</h2>
                    {selectedNode.level === 2 && parentTopic && (
                      <p className="text-xs text-muted-foreground mt-1">Parte de: <strong>{parentTopic}</strong></p>
                    )}
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="p-2 rounded-xl hover:bg-secondary shrink-0">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border">
                {([["estudar", "📚 Estudar"], ["videos", "▶️ Vídeos"], ["buscar", "🔍 Buscar"]] as const).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setDocTab(id)}
                    className={`flex-1 py-2.5 text-xs font-bold transition-colors ${docTab === id ? "border-b-2" : "text-muted-foreground hover:text-foreground"}`}
                    style={docTab === id ? { borderColor: selectedNode.color, color: selectedNode.color } : {}}
                  >{label}</button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* ESTUDAR */}
                {docTab === "estudar" && (
                  <>
                    {selectedNode.level === 1 && topicSubtopics.length > 0 && (
                      <div>
                        <p className="text-sm font-bold text-foreground mb-2">Subtópicos</p>
                        <div className="space-y-2">
                          {topicSubtopics.map((sub, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: selectedNode.color + "10" }}>
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: selectedNode.color }} />
                              <span className="text-sm text-foreground font-medium">{sub}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedNode.level === 2 && (
                      <div className="rounded-2xl p-4" style={{ backgroundColor: selectedNode.color + "10" }}>
                        <p className="text-xs text-muted-foreground mb-1">Subtópico dentro de</p>
                        <p className="text-sm font-bold" style={{ color: selectedNode.color }}>{parentTopic || mapJson.subject}</p>
                      </div>
                    )}
                    <button
                      onClick={handleStudy}
                      className="w-full py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                      style={{ backgroundColor: selectedNode.color }}
                    >
                      <Sparkles className="w-4 h-4" />
                      Estudar com Tiagão
                    </button>
                    <div className="bg-secondary/30 rounded-2xl p-3 text-center">
                      <p className="text-xs text-muted-foreground">📄 Conteúdo extraído do documento</p>
                    </div>
                  </>
                )}

                {/* VÍDEOS */}
                {docTab === "videos" && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Pesquisas no YouTube</p>
                    {[
                      { label: `${selectedNode.label} — aula completa`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(selectedNode.label + " aula")}` },
                      { label: `${selectedNode.label} para ENEM`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(selectedNode.label + " ENEM vestibular")}` },
                      { label: `${selectedNode.label} resumo`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(selectedNode.label + " resumo concurso")}` },
                      { label: `${mapJson.subject} exercícios resolvidos`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(mapJson.subject + " exercícios resolvidos")}` },
                    ].map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-2xl border-2 hover:shadow-md transition-all group"
                        style={{ borderColor: selectedNode.color + "40", backgroundColor: selectedNode.color + "08" }}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-red-600">
                          <span className="text-white text-sm font-black">▶</span>
                        </div>
                        <span className="text-sm font-semibold text-foreground group-hover:underline flex-1">{link.label}</span>
                        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: selectedNode.color }} />
                      </a>
                    ))}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                      <p className="text-xs text-amber-700 font-medium">🎬 Clique para abrir o YouTube e aprofundar os estudos com vídeos</p>
                    </div>
                  </div>
                )}

                {/* BUSCAR */}
                {docTab === "buscar" && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Buscar na internet</p>
                    {[
                      { icon: "🔍", label: `${selectedNode.label} — estudo completo`, url: `https://www.google.com/search?q=${encodeURIComponent(selectedNode.label + " resumo estudo")}` },
                      { icon: "📝", label: `${selectedNode.label} questões ENEM`, url: `https://www.google.com/search?q=${encodeURIComponent(selectedNode.label + " questões ENEM gabarito")}` },
                      { icon: "📖", label: `${selectedNode.label} Wikipedia`, url: `https://pt.wikipedia.org/w/index.php?search=${encodeURIComponent(selectedNode.label)}` },
                      { icon: "🧠", label: `${mapJson.subject} mapa mental`, url: `https://www.google.com/search?q=${encodeURIComponent(mapJson.subject + " mapa mental resumo")}` },
                    ].map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-2xl border-2 hover:shadow-md transition-all group"
                        style={{ borderColor: selectedNode.color + "40", backgroundColor: selectedNode.color + "08" }}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ backgroundColor: selectedNode.color + "20" }}>
                          {link.icon}
                        </div>
                        <span className="text-sm font-semibold text-foreground group-hover:underline flex-1">{link.label}</span>
                        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: selectedNode.color }} />
                      </a>
                    ))}
                    <button
                      onClick={handleStudy}
                      className="w-full py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mt-2"
                      style={{ backgroundColor: selectedNode.color }}
                    >
                      <Sparkles className="w-4 h-4" />
                      Ou perguntar ao Tiagão
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Node Drawer (for student map) ────────────────────────────────────────────
function NodeDrawer({ node, onClose }: { node: MindNode | null; onClose: () => void }) {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"estudar" | "videos" | "buscar">("estudar");

  const subject = node?.level === 1 ? node.label : (node?.contentMeta?.topics?.[0] || node?.label || "");
  const topicLabel = node?.label || "";

  const youtubeLinks = [
    { label: `${topicLabel} — aula completa`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topicLabel + " aula")}` },
    { label: `${topicLabel} para ENEM`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topicLabel + " ENEM vestibular")}` },
    { label: `${topicLabel} resumo`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topicLabel + " resumo concurso")}` },
    { label: `${subject} exercícios resolvidos`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(subject + " exercícios resolvidos")}` },
  ];

  const googleLinks = [
    { label: `${topicLabel} — estudo completo`, url: `https://www.google.com/search?q=${encodeURIComponent(topicLabel + " resumo estudo")}` },
    { label: `${topicLabel} questões ENEM`, url: `https://www.google.com/search?q=${encodeURIComponent(topicLabel + " questões ENEM gabarito")}` },
    { label: `${topicLabel} Wikipedia`, url: `https://pt.wikipedia.org/w/index.php?search=${encodeURIComponent(topicLabel)}` },
    { label: `${subject} mapa mental`, url: `https://www.google.com/search?q=${encodeURIComponent(subject + " mapa mental resumo")}` },
  ];

  function handleStudy() {
    if (!node) return;
    const query = `Explica ${node.level === 1 ? "a matéria" : "o tópico"} "${node.label}"`;
    navigate(`/app?q=${encodeURIComponent(query)}`);
  }

  function handleOpenPlan() {
    if (!node) return;
    const s = node.level === 1 ? node.label : (node.contentMeta?.topics?.[0] || node.label);
    navigate(`/app?planMateria=${encodeURIComponent(s)}`);
  }

  const TABS = [
    { id: "estudar" as const, label: "📚 Estudar" },
    { id: "videos" as const, label: "▶️ Vídeos" },
    { id: "buscar" as const, label: "🔍 Buscar" },
  ];

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

            {/* Tabs */}
            <div className="flex border-b border-border">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-2.5 text-xs font-bold transition-colors ${tab === t.id ? "border-b-2 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  style={tab === t.id ? { borderColor: node.color, color: node.color } : {}}
                >{t.label}</button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* ESTUDAR TAB */}
              {tab === "estudar" && (
                <>
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
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${node.contentMeta.avgScore}%`, backgroundColor: node.contentMeta.avgScore >= 70 ? "#10b981" : node.contentMeta.avgScore >= 50 ? "#f59e0b" : "#ef4444" }}
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
                          <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white" style={{ backgroundColor: node.color }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(node.contentMeta?.plans ?? 0) > 0 && (
                    <button
                      onClick={handleOpenPlan}
                      className="w-full py-3 rounded-2xl font-bold text-sm border-2 flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
                      style={{ borderColor: node.color, color: node.color, backgroundColor: node.color + "10" }}
                    >
                      <BookOpen className="w-4 h-4" />
                      Abrir plano de {node.level === 1 ? node.label : (node.contentMeta?.topics?.[0] || node.label)}
                    </button>
                  )}
                  <button
                    onClick={handleStudy}
                    className="w-full py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: node.color }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Estudar {node.level === 1 ? "esta matéria" : "este tópico"} com Tiagão
                  </button>
                  <div className="bg-secondary/30 rounded-2xl p-4">
                    <p className="text-xs text-muted-foreground">
                      {node.source === "personal" ? "📚 Conteúdo do seu histórico de estudos" : "📄 Conteúdo de documento carregado"}
                    </p>
                  </div>
                </>
              )}

              {/* VÍDEOS TAB */}
              {tab === "videos" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Pesquisas no YouTube</p>
                  {youtubeLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-2xl border-2 hover:shadow-md transition-all group"
                      style={{ borderColor: node.color + "40", backgroundColor: node.color + "08" }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#ff0000" }}>
                        <span className="text-white text-sm font-black">▶</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground group-hover:underline flex-1">{link.label}</span>
                      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: node.color }} />
                    </a>
                  ))}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                    <p className="text-xs text-amber-700 font-medium">🎬 Clique para abrir o YouTube e aprofundar seus estudos com vídeos</p>
                  </div>
                </div>
              )}

              {/* BUSCAR TAB */}
              {tab === "buscar" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Buscar na internet</p>
                  {googleLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-2xl border-2 hover:shadow-md transition-all group"
                      style={{ borderColor: node.color + "40", backgroundColor: node.color + "08" }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
                        style={{ backgroundColor: node.color + "20" }}>
                        {i === 2 ? "📖" : i === 3 ? "🧠" : "🔍"}
                      </div>
                      <span className="text-sm font-semibold text-foreground group-hover:underline flex-1">{link.label}</span>
                      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: node.color }} />
                    </a>
                  ))}
                  <button
                    onClick={handleStudy}
                    className="w-full py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mt-2"
                    style={{ backgroundColor: node.color }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Ou perguntar ao Tiagão
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Upload Modal (student or professor) ──────────────────────────────────────
function UploadModal({
  onClose, onSuccess, endpoint, forProfessor,
}: {
  onClose: () => void;
  onSuccess: () => void;
  endpoint: string;
  forProfessor?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (title) fd.append("title", title);
      if (forProfessor && subject) fd.append("subject", subject);
      const res = await fetch(`${BASE_URL}${endpoint}`, {
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
            <h3 className="text-lg font-black text-foreground">
              {forProfessor ? "Carregar Material do Professor" : "Carregar Documento"}
            </h3>
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
              placeholder={forProfessor ? "Ex: Plano de Aula — Funções" : "Ex: Resumo de Física Quântica"}
              className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {forProfessor && (
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Matéria (opcional)</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Ex: Matemática, Biologia..."
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">
              Arquivo <span className="text-muted-foreground font-normal">(PDF, DOCX, DOC ou TXT)</span>
            </label>
            <div
              className="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => document.getElementById(`file-input-${forProfessor ? "prof" : "student"}`)?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, DOC, TXT — máximo 50 MB</p>
                </>
              )}
              <input
                id={`file-input-${forProfessor ? "prof" : "student"}`}
                type="file"
                accept=".pdf,.docx,.doc,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
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
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MapaMentalPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, login } = useAuth();

  // Tabs
  const [tab, setTab] = useState<"aluno" | "materias" | "professor">("aluno");

  // Student state
  const [mindData, setMindData] = useState<MindNode | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [studentName, setStudentName] = useState("Você");
  const [selectedNode, setSelectedNode] = useState<MindNode | null>(null);
  const [showStudentUpload, setShowStudentUpload] = useState(false);
  const [docMaps, setDocMaps] = useState<DocMap[]>([]);
  const [activeDocId, setActiveDocId] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Subject state
  const [subjectMaps, setSubjectMaps] = useState<SubjectMap[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectMap | null>(null);

  // Professor state
  const [profMaps, setProfMaps] = useState<ProfMap[]>([]);
  const [loadingProf, setLoadingProf] = useState(false);
  const [selectedProfMap, setSelectedProfMap] = useState<ProfMap | null>(null);
  const [showProfUpload, setShowProfUpload] = useState(false);

  const W = 920; const H = 720;

  const buildTree = useCallback((
    hist: any,
    docMapJson?: DocMap["mind_map_json"] | null,
    docId?: number | null,
  ) => {
    const plans = hist?.plans ?? [];
    const simulados = hist?.simulados ?? [];
    const flashcards = hist?.flashcards ?? [];

    const subjectData: Record<string, {
      plans: number; simulados: number; flashcards: number;
      topics: string[]; scores: number[];
    }> = {};

    function addSubject(subj: string) {
      const key = subj.toLowerCase().trim();
      if (!subjectData[key]) subjectData[key] = { plans: 0, simulados: 0, flashcards: 0, topics: [], scores: [] };
      return key;
    }

    for (const p of plans) {
      if (p.materia) {
        const k = addSubject(p.materia);
        subjectData[k].plans++;
        if (p.topicos && Array.isArray(p.topicos)) subjectData[k].topics.push(...p.topicos.slice(0, 3));
      }
    }
    for (const s of simulados) {
      if (s.materia) {
        const k = addSubject(s.materia);
        subjectData[k].simulados++;
        if (s.score != null) subjectData[k].scores.push(s.score);
      }
    }
    for (const f of flashcards) {
      if (f.materia) {
        const k = addSubject(f.materia);
        subjectData[k].flashcards++;
      }
    }

    let docTopicsMap: Record<string, string[]> = {};
    if (docMapJson) {
      for (const topic of docMapJson.topics || []) {
        const sub = docMapJson.subject.toLowerCase().trim();
        if (!docTopicsMap[sub]) docTopicsMap[sub] = [];
        docTopicsMap[sub].push(topic.name);
        for (const st of topic.subtopics || []) docTopicsMap[sub].push(st);
      }
    }

    const allSubjects = new Set([
      ...Object.keys(subjectData),
      ...(docMapJson ? Object.keys(docTopicsMap) : []),
    ]);

    const children: MindNode[] = [];
    for (const subj of allSubjects) {
      const data = subjectData[subj];
      const hasPersonalContent = !!data;
      const docTopics = docTopicsMap[subj] || [];
      const color = getColor(subj);
      const displayName = subj.slice(0, 1).toUpperCase() + subj.slice(1);

      const topicNodes: MindNode[] = [];

      if (hasPersonalContent && data.topics.length > 0) {
        const uniqueTopics = [...new Set(data.topics)].slice(0, 5);
        for (const t of uniqueTopics) {
          topicNodes.push({
            id: `${subj}-t-${t}`, label: t, children: [], color,
            level: 2, hasContent: true, source: "personal",
          });
        }
      }

      for (const dt of docTopics.slice(0, Math.max(0, 5 - topicNodes.length))) {
        if (!topicNodes.find(n => n.label.toLowerCase() === dt.toLowerCase())) {
          topicNodes.push({
            id: `${subj}-doc-${dt}`, label: dt, children: [], color,
            level: 2, hasContent: hasPersonalContent, source: "document",
          });
        }
      }

      const avgScore = data?.scores.length
        ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        : undefined;

      children.push({
        id: `subj-${subj}`,
        label: displayName,
        children: topicNodes,
        color,
        level: 1,
        hasContent: hasPersonalContent,
        source: hasPersonalContent ? "personal" : "document",
        contentMeta: hasPersonalContent ? {
          plans: data.plans,
          simulados: data.simulados,
          flashcards: data.flashcards,
          topics: [...new Set(data.topics)].slice(0, 8),
          avgScore,
        } : undefined,
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

  async function loadStudentData(docId?: number | null) {
    setLoadingStudent(true);
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
      setLoadingStudent(false);
    }
  }

  async function loadSubjectMaps() {
    setLoadingSubjects(true);
    try {
      const res = await fetch(`${BASE_URL}/api/mapa-mental/materias`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSubjectMaps(data.subjects ?? []);
      }
    } finally {
      setLoadingSubjects(false);
    }
  }

  async function loadProfMaps() {
    setLoadingProf(true);
    try {
      const res = await fetch(`${BASE_URL}/api/mapa-mental/professor/my-maps`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProfMaps(data.maps ?? []);
      }
    } finally {
      setLoadingProf(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) { setLoadingStudent(false); return; }
    loadStudentData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (tab === "materias" && subjectMaps.length === 0) loadSubjectMaps();
    if (tab === "professor" && profMaps.length === 0) loadProfMaps();
  }, [tab, isAuthenticated]);

  function switchDoc(docId: number | null) {
    setActiveDocId(docId);
    setSelectedNode(null);
    loadStudentData(docId);
  }

  async function deleteDocMap(id: number) {
    if (!confirm("Remover este mapa?")) return;
    await fetch(`${BASE_URL}/api/mapa-mental/my-docs/${id}`, { method: "DELETE", credentials: "include" });
    if (activeDocId === id) switchDoc(null);
    else loadStudentData();
  }

  async function deleteProfMap(id: number) {
    if (!confirm("Remover este mapa?")) return;
    await fetch(`${BASE_URL}/api/mapa-mental/professor/my-maps/${id}`, { method: "DELETE", credentials: "include" });
    if (selectedProfMap?.id === id) setSelectedProfMap(null);
    loadProfMaps();
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

  const TABS = [
    { id: "aluno" as const, label: "Meus Estudos", icon: GraduationCap },
    { id: "materias" as const, label: "Por Matéria", icon: BookMarked },
    { id: "professor" as const, label: "Portal Professor", icon: User2 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/app")} className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-black text-foreground flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" /> Mapa Mental
              </h1>
              <p className="text-xs text-muted-foreground">Visual do seu conhecimento</p>
            </div>
          </div>
          <button onClick={() => {
            if (tab === "aluno") loadStudentData();
            else if (tab === "materias") loadSubjectMaps();
            else loadProfMaps();
          }} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${tab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary"}`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto space-y-4">

        {/* ─── TAB: ALUNO ────────────────────────────────────────────── */}
        {tab === "aluno" && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">Mapa gerado a partir do seu histórico e documentos</p>
              <button
                onClick={() => setShowStudentUpload(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Carregar Doc
              </button>
            </div>

            {/* Doc tabs */}
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
                    <button onClick={() => deleteDocMap(dm.id)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors text-muted-foreground">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {loadingStudent ? (
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
                  Gere planos de estudo e faça simulados para o mapa crescer — ou carregue um documento.
                </p>
                <div className="flex gap-3 flex-wrap justify-center">
                  <button onClick={() => navigate("/app")} className="px-5 py-2.5 rounded-2xl bg-primary text-white font-bold flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4" /> Gerar plano
                  </button>
                  <button onClick={() => setShowStudentUpload(true)} className="px-5 py-2.5 rounded-2xl border-2 border-primary text-primary font-bold flex items-center gap-2 text-sm">
                    <Upload className="w-4 h-4" /> Carregar doc
                  </button>
                </div>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
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
                <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                  <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 600 }}>
                    <defs>
                      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
                      </filter>
                    </defs>
                    {positions.map(({ node, x, y, parentX, parentY }) => (
                      <MindMapNode key={node.id} node={node} x={x} y={y} parentX={parentX} parentY={parentY} onClick={setSelectedNode} />
                    ))}
                  </svg>
                </div>
                <div className="px-6 py-4 border-t border-border bg-secondary/20 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span><strong className="text-foreground">{mindData.children.length}</strong> matérias</span>
                    <span><strong className="text-foreground">{mindData.children.reduce((a, b) => a + b.children.length, 0)}</strong> tópicos</span>
                    <span><strong className="text-foreground">{mindData.children.filter(c => c.hasContent).length}</strong> com conteúdo</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Nós coloridos = conteúdo estudado</p>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* ─── TAB: POR MATÉRIA ──────────────────────────────────────── */}
        {tab === "materias" && (
          <>
            {loadingSubjects ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground text-sm">Carregando mapas de matérias...</p>
              </div>
            ) : subjectMaps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
                  <BookMarked className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="font-black text-foreground text-lg">Nenhum material cadastrado</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Quando professores e administradores adicionarem conteúdo à base de conhecimento, os mapas de matérias aparecerão aqui.
                </p>
              </div>
            ) : selectedSubject ? (
              <div>
                <button onClick={() => setSelectedSubject(null)} className="flex items-center gap-2 text-sm font-semibold text-primary mb-4 hover:underline">
                  <ArrowLeft className="w-4 h-4" /> Todas as matérias
                </button>
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
                  <div className="px-6 pt-5 pb-3 border-b border-border">
                    <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: getColor(selectedSubject.subject) }} />
                      {selectedSubject.subject}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedSubject.topics.length} tópicos do material do professor</p>
                  </div>
                  <MindMapSVG mapJson={selectedSubject} rootLabel={selectedSubject.subject} />
                  <div className="px-6 py-4 border-t border-border bg-secondary/20">
                    <p className="text-xs text-muted-foreground">{selectedSubject.topics.length} tópicos · {selectedSubject.topics.reduce((a, t) => a + (t.subtopics?.length || 0), 0)} subtópicos</p>
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectMaps.map((sm, i) => {
                  const color = getColor(sm.subject);
                  return (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedSubject(sm)}
                      className="bg-white rounded-2xl border border-border shadow-sm p-5 text-left hover:shadow-md hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
                          <Brain className="w-5 h-5" style={{ color }} />
                        </div>
                        <div>
                          <p className="font-black text-foreground text-sm">{sm.subject}</p>
                          <p className="text-xs text-muted-foreground">{sm.topics.length} tópicos</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {sm.topics.slice(0, 3).map((t, j) => (
                          <span key={j} className="px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: color + "15", color }}>
                            {t.name.slice(0, 25)}{t.name.length > 25 ? "…" : ""}
                          </span>
                        ))}
                        {sm.topics.length > 3 && (
                          <span className="px-2 py-0.5 rounded-lg text-xs font-semibold text-muted-foreground bg-secondary">
                            +{sm.topics.length - 3}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ─── TAB: PORTAL PROFESSOR ─────────────────────────────────── */}
        {tab === "professor" && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">Seus mapas mentais de planos de aula, provas e trabalhos</p>
              <button
                onClick={() => setShowProfUpload(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Material
              </button>
            </div>

            {loadingProf ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground text-sm">Carregando seus mapas...</p>
              </div>
            ) : selectedProfMap ? (
              <div>
                <button onClick={() => setSelectedProfMap(null)} className="flex items-center gap-2 text-sm font-semibold text-primary mb-4 hover:underline">
                  <ArrowLeft className="w-4 h-4" /> Meus materiais
                </button>
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
                  <div className="px-6 pt-5 pb-3 border-b border-border flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{selectedProfMap.subject || "Material"}</p>
                      <h2 className="text-lg font-black text-foreground">{selectedProfMap.doc_title}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(selectedProfMap.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <button onClick={() => deleteProfMap(selectedProfMap.id)} className="p-2 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors text-muted-foreground">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <MindMapSVG mapJson={selectedProfMap.mind_map_json} rootLabel={selectedProfMap.doc_title} />
                  <div className="px-6 py-4 border-t border-border bg-secondary/20">
                    <p className="text-xs text-muted-foreground">{selectedProfMap.mind_map_json.topics.length} tópicos gerados pelo documento</p>
                  </div>
                </motion.div>
              </div>
            ) : profMaps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
                  <FolderOpen className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="font-black text-foreground text-lg">Nenhum mapa ainda</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Carregue planos de aula, provas, trabalhos ou qualquer material em PDF ou DOCX e gere mapas mentais automaticamente.
                </p>
                <button
                  onClick={() => setShowProfUpload(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm"
                >
                  <Upload className="w-4 h-4" /> Carregar material
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {profMaps.map((pm, i) => {
                  const color = getColor(pm.subject || pm.doc_title);
                  return (
                    <motion.div
                      key={pm.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-2xl border border-border shadow-sm p-5 group"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20" }}>
                          <FileText className="w-5 h-5" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-foreground text-sm truncate">{pm.doc_title}</p>
                          {pm.subject && <p className="text-xs font-semibold" style={{ color }}>{pm.subject}</p>}
                          <p className="text-xs text-muted-foreground">{new Date(pm.created_at).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <button onClick={() => deleteProfMap(pm.id)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(pm.mind_map_json.topics || []).slice(0, 3).map((t, j) => (
                          <span key={j} className="px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: color + "15", color }}>
                            {t.name.slice(0, 20)}{t.name.length > 20 ? "…" : ""}
                          </span>
                        ))}
                        {(pm.mind_map_json.topics || []).length > 3 && (
                          <span className="px-2 py-0.5 rounded-lg text-xs font-semibold text-muted-foreground bg-secondary">
                            +{pm.mind_map_json.topics.length - 3}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedProfMap(pm)}
                        className="w-full py-2 rounded-xl text-xs font-bold transition-colors"
                        style={{ backgroundColor: color + "10", color }}
                      >
                        Ver mapa completo →
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Drawers & Modals */}
      <NodeDrawer node={selectedNode} onClose={() => setSelectedNode(null)} />

      <AnimatePresence>
        {showStudentUpload && (
          <UploadModal
            endpoint="/api/mapa-mental/from-doc"
            onClose={() => setShowStudentUpload(false)}
            onSuccess={() => { setShowStudentUpload(false); loadStudentData(); }}
          />
        )}
        {showProfUpload && (
          <UploadModal
            endpoint="/api/mapa-mental/professor/from-doc"
            forProfessor
            onClose={() => setShowProfUpload(false)}
            onSuccess={() => { setShowProfUpload(false); loadProfMaps(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
