import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { ArrowLeft, Brain, BookOpen, LogIn, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

interface MindNode {
  id: string;
  label: string;
  children: MindNode[];
  color: string;
  level: number;
}

const SUBJECT_COLORS: Record<string, string> = {
  "matemática": "#6366f1",
  "português": "#ec4899",
  "história": "#f59e0b",
  "geografia": "#10b981",
  "física": "#3b82f6",
  "química": "#8b5cf6",
  "biologia": "#06b6d4",
  "inglês": "#f97316",
  "literatura": "#ef4444",
  "filosofia": "#84cc16",
  "sociologia": "#14b8a6",
  "redação": "#a855f7",
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

interface NodeProps {
  node: MindNode;
  x: number;
  y: number;
  parentX?: number;
  parentY?: number;
}

function MindMapNode({ node, x, y, parentX, parentY }: NodeProps) {
  const [hovered, setHovered] = useState(false);
  const isRoot = node.level === 0;
  const isSubject = node.level === 1;
  const w = isRoot ? 130 : isSubject ? 100 : 85;
  const h = isRoot ? 44 : isSubject ? 36 : 30;

  return (
    <g>
      {parentX !== undefined && parentY !== undefined && (
        <path
          d={`M${parentX},${parentY} C${(parentX + x) / 2},${parentY} ${(parentX + x) / 2},${y} ${x},${y}`}
          fill="none"
          stroke={node.color}
          strokeWidth={isSubject ? 2.5 : 1.5}
          strokeOpacity={0.4}
        />
      )}
      <g
        transform={`translate(${x - w / 2},${y - h / 2})`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: "default" }}
      >
        <rect
          width={w}
          height={h}
          rx={isRoot ? 14 : 10}
          fill={isRoot ? node.color : hovered ? node.color : "white"}
          stroke={node.color}
          strokeWidth={isRoot ? 0 : 2}
          opacity={isRoot ? 1 : hovered ? 0.9 : 1}
          style={{ transition: "all 0.2s" }}
          filter={isRoot || isSubject ? "url(#shadow)" : undefined}
        />
        <text
          x={w / 2}
          y={h / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={isRoot ? 12 : isSubject ? 11 : 10}
          fontWeight={isRoot || isSubject ? "bold" : "normal"}
          fill={isRoot || hovered ? "white" : node.color}
          style={{ transition: "all 0.2s", userSelect: "none" }}
        >
          {node.label.length > 14 ? node.label.slice(0, 13) + "…" : node.label}
        </text>
      </g>
    </g>
  );
}

function layoutTree(root: MindNode, cx: number, cy: number): Array<{ node: MindNode; x: number; y: number; parentX?: number; parentY?: number }> {
  const positions: Array<{ node: MindNode; x: number; y: number; parentX?: number; parentY?: number }> = [];
  positions.push({ node: root, x: cx, y: cy });

  const subjects = root.children;
  const angleStep = subjects.length > 0 ? (Math.PI * 2) / subjects.length : 0;
  const r1 = 190;

  subjects.forEach((subj, si) => {
    const angle = angleStep * si - Math.PI / 2;
    const sx = cx + Math.cos(angle) * r1;
    const sy = cy + Math.sin(angle) * r1;
    positions.push({ node: subj, x: sx, y: sy, parentX: cx, parentY: cy });

    const topics = subj.children;
    const topicCount = topics.length;
    const spread = Math.min(Math.PI * 0.6, (topicCount * 0.4));
    topics.forEach((topic, ti) => {
      const baseAngle = angle;
      const topicAngle = topicCount === 1
        ? baseAngle
        : baseAngle - spread / 2 + (spread / (topicCount - 1)) * ti;
      const r2 = 160;
      const tx = sx + Math.cos(topicAngle) * r2;
      const ty = sy + Math.sin(topicAngle) * r2;
      positions.push({ node: topic, x: tx, y: ty, parentX: sx, parentY: sy });
    });
  });

  return positions;
}

export default function MapaMentalPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, login } = useAuth();
  const [mindData, setMindData] = useState<MindNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("Você");
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 900;
  const H = 720;

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }

    Promise.all([
      fetch(`${BASE_URL}/api/history`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
      fetch(`${BASE_URL}/api/profile`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
    ]).then(([hist, prof]) => {
      if (prof?.studentName) setStudentName(prof.studentName);

      const plans = hist?.plans ?? [];
      const simulados = hist?.simulados ?? [];
      const flashcards = hist?.flashcards ?? [];

      const subjectMap: Record<string, Set<string>> = {};

      for (const p of plans) {
        const materia = p.materia || "Geral";
        if (!subjectMap[materia]) subjectMap[materia] = new Set();
        const dias = p.plan?.dias ?? [];
        for (const dia of dias) {
          for (const t of dia.topicos ?? []) {
            const nome = typeof t === "object" ? t.nome : t;
            if (nome) subjectMap[materia].add(nome);
          }
        }
      }

      for (const s of simulados) {
        const materia = s.materia || "Simulados";
        if (!subjectMap[materia]) subjectMap[materia] = new Set();
        if (s.titulo) subjectMap[materia].add(s.titulo);
      }

      for (const f of flashcards) {
        const materia = f.materia || "Flashcards";
        if (!subjectMap[materia]) subjectMap[materia] = new Set();
      }

      const children: MindNode[] = Object.entries(subjectMap)
        .filter(([, topics]) => topics.size > 0 || true)
        .slice(0, 10)
        .map(([materia, topics]) => {
          const color = getColor(materia);
          const topicNodes: MindNode[] = Array.from(topics).slice(0, 6).map((t, i) => ({
            id: `${materia}-${i}`,
            label: t,
            children: [],
            color,
            level: 2,
          }));
          return {
            id: materia,
            label: materia,
            children: topicNodes,
            color,
            level: 1,
          };
        });

      if (children.length === 0) {
        setMindData(null);
      } else {
        setMindData({
          id: "root",
          label: studentName,
          children,
          color: "#6366f1",
          level: 0,
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isAuthenticated]);

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
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/app")} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-black text-foreground flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" /> Mapa Mental
            </h1>
            <p className="text-xs text-muted-foreground">Visualização de todo seu conhecimento estudado</p>
          </div>
        </div>
        <button onClick={() => window.location.reload()} className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="p-4 max-w-6xl mx-auto">
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
              Gere planos de estudo, faça simulados e flashcards para o mapa ir crescendo com seu conhecimento.
            </p>
            <button
              onClick={() => navigate("/app")}
              className="px-6 py-3 rounded-2xl bg-primary text-white font-bold flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Gerar meu primeiro plano
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden"
          >
            {/* Legend */}
            <div className="px-6 pt-5 pb-3 border-b border-border flex flex-wrap gap-3">
              {mindData.children.map(child => (
                <div key={child.id} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: child.color }} />
                  <span className="text-xs font-semibold text-foreground">{child.label}</span>
                </div>
              ))}
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

                {positions.map(({ node, x, y, parentX, parentY }, i) => (
                  <MindMapNode
                    key={node.id}
                    node={node}
                    x={x}
                    y={y}
                    parentX={parentX}
                    parentY={parentY}
                  />
                ))}
              </svg>
            </div>

            <div className="px-6 py-4 border-t border-border bg-secondary/20 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span><strong className="text-foreground">{mindData.children.length}</strong> matérias</span>
                <span><strong className="text-foreground">{mindData.children.reduce((a, b) => a + b.children.length, 0)}</strong> tópicos estudados</span>
              </div>
              <p className="text-xs text-muted-foreground">Gere mais planos para expandir o mapa</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
