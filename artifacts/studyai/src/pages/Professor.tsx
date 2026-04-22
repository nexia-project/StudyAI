import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, UserCircle, BookOpen, FileQuestion, Brain,
  BarChart3, Search, Plus, Copy, Check, Trash2, ChevronRight, ChevronLeft,
  GraduationCap, RefreshCw, AlertTriangle, TrendingUp, TrendingDown,
  Sparkles, Send, Loader2, Eye, Menu, ArrowLeft, CheckCircle2, Activity,
  Zap, Target, Bell, Globe, Layers, BookMarked, Map, Star, Shield,
  Wand2, FileText, LayoutTemplate, Network, Microscope, Download,
  Database, ClipboardList, Filter, Calendar, ChevronDown as ChevronDownIcon, X, Lock,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import { EstudioIA } from "@/components/EstudioIA";

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = "dashboard" | "turmas" | "planoaula" | "alunos" | "conteudos" | "estudio" | "pesquisa" | "caderno" | "provas" | "banco" | "atividades" | "assistente" | "relatorios";
type ExamMode = "classica" | "mundo" | "fraquezas";
type VisualStyle = "enem" | "infantil" | "tecnico" | "aventura";

interface DashData {
  totalStudents: number; totalTurmas: number; avgPerformance: number; engagementRate: number;
  weeklyChart: { week: string; acertos: number; erros: number; participacao: number }[];
  heatMap: { materia: string; score: number }[];
  alerts: { type: string; text: string; severity: string }[];
  students: { id: string; name: string; turma: string; performance: number; engagement: string; lastAccess: string }[];
  turmas: { id: string; name: string; serie: string | null; subject: string | null; studentCount: number }[];
}

interface Turma {
  id: string; name: string; serie: string | null; subject: string | null;
  description: string | null; inviteCode: string; isActive: boolean; studentCount: number; createdAt: string;
}

interface SlideData { n: number; tipo: string; titulo: string; subtitulo?: string; items?: string[]; texto?: string; emoji?: string; pergunta?: string; }
interface MindNode { label: string; emoji?: string; children?: MindNode[]; }
interface ContentPackage {
  titulo: string; materia: string; resumo: string; keyPoints: string[];
  slides: SlideData[]; mindMap: MindNode; questions: { text: string; alternatives: string[]; correct: number; explanation: string }[];
}

interface ExamQuestion {
  number: number; text: string; context?: string; desafio?: string;
  alternatives: string[]; correct: number; explanation: string; imageDescription: string;
}
interface WorldStory { cenario: string; missao: string; personagem: string; objetivo: string; emoji: string; }
interface ExamData { title: string; story?: WorldStory; questions: ExamQuestion[]; totalQuestions: number; }

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard" as Section, label: "Dashboard", icon: LayoutDashboard },
  { id: "turmas" as Section, label: "Minhas Turmas", icon: Users },
  { id: "planoaula" as Section, label: "Plano de Aula IA", icon: Wand2 },
  { id: "alunos" as Section, label: "Alunos", icon: UserCircle },
  { id: "conteudos" as Section, label: "Criador de Conteúdo", icon: Layers },
  { id: "estudio" as Section, label: "Estúdio Visual IA", icon: Sparkles },
  { id: "pesquisa" as Section, label: "Central de Pesquisa", icon: Microscope },
  { id: "caderno" as Section, label: "Caderno IA do Professor", icon: BookOpen, external: "/notebook" },
  { id: "provas" as Section, label: "Gerador de Provas", icon: FileQuestion },
  { id: "banco" as Section, label: "Banco de Questões", icon: Database },
  { id: "atividades" as Section, label: "Atividades", icon: ClipboardList },
  { id: "assistente" as Section, label: "Assistente IA", icon: Brain },
  { id: "relatorios" as Section, label: "Relatórios", icon: BarChart3 },
];

const SCORE_COLOR = (s: number) => s >= 70 ? "bg-emerald-500/80" : s >= 50 ? "bg-amber-500/80" : s >= 30 ? "bg-orange-500/80" : "bg-red-500/80";
const MATERIAS = ["Matemática","Português","Física","Química","Biologia","História","Geografia","Filosofia","Sociologia","Inglês","Artes","Educação Física"];

// ─── Slide Viewer ─────────────────────────────────────────────────────────────
function SlideViewer({ slides }: { slides: SlideData[] }) {
  const [idx, setIdx] = useState(0);
  if (!slides?.length) return null;
  const slide = slides[idx];

  const slideStyle: Record<string, string> = {
    titulo: "from-indigo-900 to-violet-900",
    conteudo: "from-slate-900 to-slate-800",
    exemplo: "from-emerald-900/60 to-teal-900/60",
    lista: "from-blue-900/60 to-indigo-900/60",
    destaque: "from-amber-900/60 to-orange-900/60",
    quiz: "from-violet-900/60 to-purple-900/60",
  };

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl bg-gradient-to-br ${slideStyle[slide.tipo] ?? "from-slate-900 to-slate-800"} border border-white/10 p-8 min-h-[260px] flex flex-col justify-center`}>
        <div className="text-4xl mb-4">{slide.emoji ?? "📄"}</div>
        {slide.tipo === "titulo" && (
          <>
            <h2 className="text-2xl font-black text-white mb-2">{slide.titulo}</h2>
            {slide.subtitulo && <p className="text-white/60 text-lg">{slide.subtitulo}</p>}
          </>
        )}
        {(slide.tipo === "conteudo" || slide.tipo === "lista") && (
          <>
            <h3 className="text-xl font-bold text-white mb-4">{slide.titulo}</h3>
            <ul className="space-y-2">
              {slide.items?.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-white/80 text-sm">
                  <span className="text-indigo-400 mt-1">▸</span>{item}
                </li>
              ))}
            </ul>
          </>
        )}
        {(slide.tipo === "exemplo" || slide.tipo === "destaque") && (
          <>
            <h3 className="text-xl font-bold text-white mb-3">{slide.titulo}</h3>
            <p className="text-white/80 leading-relaxed">{slide.texto}</p>
          </>
        )}
        {slide.tipo === "quiz" && (
          <>
            <h3 className="text-xl font-bold text-white mb-3">{slide.titulo}</h3>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-white font-semibold">❓ {slide.pergunta}</p>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-between">
        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-1">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-indigo-400 w-6" : "bg-white/20"}`} />
          ))}
        </div>
        <button onClick={() => setIdx(i => Math.min(slides.length - 1, i + 1))} disabled={idx === slides.length - 1}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <p className="text-center text-white/30 text-xs">Slide {idx + 1} / {slides.length}</p>
    </div>
  );
}

// ─── Mind Map Viewer ──────────────────────────────────────────────────────────
function MindMapViewer({ root }: { root: MindNode }) {
  if (!root) return null;
  return (
    <div className="overflow-auto">
      <div className="flex flex-col items-center gap-4 min-w-max p-4">
        {/* Root */}
        <div className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm shadow-lg shadow-indigo-500/30">
          {root.emoji} {root.label}
        </div>
        {/* Children */}
        {root.children && root.children.length > 0 && (
          <div className="flex gap-6 relative">
            {root.children.map((child, ci) => (
              <div key={ci} className="flex flex-col items-center gap-3">
                <div className="w-px h-6 bg-white/20" />
                <div className="px-4 py-2 rounded-xl bg-violet-600/40 border border-violet-500/40 text-white font-bold text-xs">
                  {child.emoji} {child.label}
                </div>
                {child.children && child.children.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {child.children.map((sub, si) => (
                      <div key={si} className="flex items-center gap-2">
                        <div className="w-4 h-px bg-white/15" />
                        <div className="px-3 py-1.5 rounded-lg bg-white/8 border border-white/10 text-white/70 text-xs">
                          {sub.emoji} {sub.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Content Package (used in Conteudos + Pesquisa) ───────────────────────────
function ContentPackageView({ content, fromKb }: { content: ContentPackage; fromKb?: boolean }) {
  const [tab, setTab] = useState<"resumo" | "slides" | "mapa" | "questoes">("resumo");
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [showAnswer, setShowAnswer] = useState<Record<number, boolean>>({});

  const TABS = [
    { id: "resumo" as const, label: "Resumo", icon: FileText },
    { id: "slides" as const, label: "Slides", icon: LayoutTemplate },
    { id: "mapa" as const, label: "Mapa Mental", icon: Network },
    { id: "questoes" as const, label: "Questões", icon: FileQuestion },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-r from-indigo-600/20 to-violet-600/20 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-white">{content.titulo}</h3>
            <p className="text-indigo-300 text-sm mt-1">{content.materia}</p>
            {fromKb && <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full mt-2 inline-block">✓ Usando base de conhecimento</span>}
          </div>
        </div>
        {/* Key points */}
        {content.keyPoints?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {content.keyPoints.map((kp, i) => (
              <span key={i} className="text-xs bg-white/10 text-white/70 px-3 py-1 rounded-full">{kp}</span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all
              ${tab === t.id ? "bg-indigo-600 text-white" : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {tab === "resumo" && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0f0f1a] p-6 space-y-4">
              {content.resumo?.split("\n").filter(Boolean).map((para, i) => (
                <p key={i} className="text-white/80 leading-relaxed text-sm">{para}</p>
              ))}
            </div>
          )}
          {tab === "slides" && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0f0f1a] p-5">
              <SlideViewer slides={content.slides ?? []} />
            </div>
          )}
          {tab === "mapa" && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0f0f1a] p-5">
              <h4 className="text-white/50 text-xs mb-4 font-semibold uppercase tracking-wider">Mapa Mental</h4>
              {content.mindMap ? <MindMapViewer root={content.mindMap} /> : <p className="text-white/30 text-sm text-center py-8">Mapa não disponível</p>}
            </div>
          )}
          {tab === "questoes" && (
            <div className="space-y-4">
              {(content.questions ?? []).map((q, qi) => {
                const sel = selected[qi];
                const show = showAnswer[qi];
                return (
                  <div key={qi} className="rounded-2xl border border-white/[0.07] bg-[#0f0f1a] p-5">
                    <div className="flex gap-3 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-300 text-xs font-black flex items-center justify-center flex-shrink-0">{qi + 1}</div>
                      <p className="text-white font-semibold text-sm leading-relaxed">{q.text}</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2 mb-3">
                      {q.alternatives.map((alt, ai) => {
                        const isSelected = sel === ai;
                        const isCorrect = show && ai === q.correct;
                        const isWrong = show && isSelected && ai !== q.correct;
                        return (
                          <button key={ai} onClick={() => !show && setSelected(p => ({ ...p, [qi]: ai }))}
                            className={`text-left px-4 py-2.5 rounded-xl text-xs transition-all border
                              ${isCorrect ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold"
                              : isWrong ? "bg-red-500/20 border-red-500/50 text-red-300"
                              : isSelected ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-300 font-bold"
                              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}>
                            {alt}
                          </button>
                        );
                      })}
                    </div>
                    {sel !== undefined && !show && (
                      <button onClick={() => setShowAnswer(p => ({ ...p, [qi]: true }))}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                        Ver resposta →
                      </button>
                    )}
                    {show && (
                      <div className="bg-white/5 rounded-xl px-4 py-3 text-xs text-white/70">
                        <strong className="text-white">Resposta:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfessorPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [section, setSection] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  async function apiFetch(url: string, opts: RequestInit = {}) {
    return fetch(url, { ...opts, credentials: "include" });
  }

  useEffect(() => {
    apiFetch("/api/teacher/turmas").then(r => {
      setHasAccess(r.ok);
      setAuthChecked(true);
      if (!r.ok) navigate("/professor/login");
    }).catch(() => { setAuthChecked(true); navigate("/professor/login"); });
  }, []);

  if (!authChecked) return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
    </div>
  );
  if (!hasAccess) return null;

  return (
    <div className="min-h-screen bg-[#0a0a12] flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full z-30 flex flex-col bg-[#0f0f1a] border-r border-white/[0.06] transition-all duration-300 ${sidebarOpen ? "w-64" : "w-16 lg:w-64"}`}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div className={`transition-opacity duration-200 ${sidebarOpen ? "opacity-100" : "opacity-0 lg:opacity-100"}`}>
            <p className="font-black text-white text-sm leading-none">StudyAI</p>
            <p className="text-indigo-400 text-[10px] font-bold mt-0.5">PAINEL DO PROFESSOR</p>
          </div>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto space-y-0.5 px-2">
          {NAV.map((item: any) => (
            <button key={item.id} onClick={() => {
              if (item.external) { navigate(item.external); return; }
              setSection(item.id); setSidebarOpen(false);
            }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all
                ${section === item.id ? "bg-indigo-600/20 text-indigo-300" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className={`text-xs font-semibold transition-opacity duration-200 ${sidebarOpen ? "opacity-100" : "opacity-0 lg:opacity-100"}`}>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-white/[0.06] p-3">
          <button onClick={() => navigate("/app")}
            className="w-full flex items-center gap-3 px-3 py-2 text-white/30 hover:text-white text-xs transition-colors rounded-xl hover:bg-white/5">
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            <span className={`transition-opacity duration-200 ${sidebarOpen ? "opacity-100" : "opacity-0 lg:opacity-100"}`}>Voltar ao App</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-16 lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-10 bg-[#0a0a12]/95 backdrop-blur border-b border-white/[0.06] px-6 py-3.5 flex items-center gap-4">
          <button className="lg:hidden text-white/40 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-white font-bold text-base hidden sm:block">{NAV.find(n => n.id === section)?.label}</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center">
              <span className="text-indigo-300 text-xs font-bold">{(user as any)?.firstName?.[0] ?? "P"}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {section === "dashboard" && <DashboardSection apiFetch={apiFetch} onNavigate={setSection} />}
              {section === "turmas" && <TurmasSection apiFetch={apiFetch} onNavigate={id => navigate(`/professor/turma/${id}`)} />}
              {section === "planoaula" && <PlanoAulaSection apiFetch={apiFetch} />}
              {section === "alunos" && <AlunosSection apiFetch={apiFetch} />}
              {section === "conteudos" && <ConteudosSection apiFetch={apiFetch} />}
              {section === "estudio" && (
                <div className="max-w-5xl mx-auto"><EstudioIA variant="dark" title="Estúdio Visual IA" /></div>
              )}
              {section === "pesquisa" && <PesquisaSection apiFetch={apiFetch} />}
              {section === "provas" && <GerarProvaSection apiFetch={apiFetch} />}
              {section === "banco" && <BancoSection apiFetch={apiFetch} />}
              {section === "atividades" && <AtividadesSection apiFetch={apiFetch} />}
              {section === "assistente" && <AssistenteSection apiFetch={apiFetch} />}
              {section === "relatorios" && <RelatoriosSection apiFetch={apiFetch} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardSection({ apiFetch, onNavigate }: { apiFetch: (u: string, o?: RequestInit) => Promise<Response>; onNavigate: (s: Section) => void }) {
  const [data, setData] = useState<DashData | null>(null);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/teacher/dashboard").then(r => r.json()),
      apiFetch("/api/teacher/activities").then(r => r.json()),
    ]).then(([dash, ativ]) => {
      setData(dash);
      setAtividades((ativ.activities ?? []).slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-5">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5 animate-pulse h-32" />
      ))}
    </div>
  );
  if (!data) return <div className="text-white/40 text-center py-20">Erro ao carregar dados.</div>;

  const engagementLabel = (rate: number) =>
    rate >= 70 ? { label: "Alto", color: "text-emerald-400 bg-emerald-500/10" } :
    rate >= 40 ? { label: "Médio", color: "text-amber-400 bg-amber-500/10" } :
    { label: "Baixo", color: "text-red-400 bg-red-500/10" };

  const atividadeStatus = (a: any) => {
    if (a.type === "simulado") return { label: "Simulado", color: "bg-red-500/15 text-red-300" };
    if (a.type === "redacao") return { label: "Redação", color: "bg-amber-500/15 text-amber-300" };
    if (a.type === "flashcard") return { label: "Flashcards", color: "bg-blue-500/15 text-blue-300" };
    return { label: a.type, color: "bg-violet-500/15 text-violet-300" };
  };

  return (
    <div className="space-y-5 max-w-6xl">

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Alunos Ativos", value: data.totalStudents, icon: Users, color: "text-blue-400", bg: "bg-blue-500/8 border-blue-500/15" },
          { label: "Minhas Turmas", value: data.totalTurmas, icon: GraduationCap, color: "text-violet-400", bg: "bg-violet-500/8 border-violet-500/15" },
          { label: "Média de Desempenho", value: `${data.avgPerformance}%`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/8 border-emerald-500/15" },
          { label: "Engajamento Geral", value: `${data.engagementRate}%`, icon: Activity, color: "text-amber-400", bg: "bg-amber-500/8 border-amber-500/15" },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border ${k.bg} p-4`}>
            <k.icon className={`w-4 h-4 ${k.color} mb-3`} />
            <p className="text-2xl font-black text-white">{k.value}</p>
            <p className="text-white/40 text-xs mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Atalhos com IA — 4 big buttons */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5">
        <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" /> Atalhos com IA
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Criar Plano de Aula", desc: "Com RAG + objetivos", icon: Wand2, s: "planoaula" as Section, color: "from-indigo-600/20 to-violet-600/20 border-indigo-500/25 hover:border-indigo-400/50" },
            { label: "Criar Prova/Quiz", desc: "Múltipla escolha, VF, discursiva", icon: FileQuestion, s: "provas" as Section, color: "from-rose-600/20 to-pink-600/20 border-rose-500/25 hover:border-rose-400/50" },
            { label: "Atividade de Fixação", desc: "Exercícios para a turma", icon: Target, s: "conteudos" as Section, color: "from-emerald-600/20 to-teal-600/20 border-emerald-500/25 hover:border-emerald-400/50" },
            { label: "Corrigir Redações", desc: "Avaliação IA por critérios", icon: CheckCircle2, s: "atividades" as Section, color: "from-amber-600/20 to-orange-600/20 border-amber-500/25 hover:border-amber-400/50" },
          ].map(btn => (
            <button key={btn.label} onClick={() => onNavigate(btn.s)}
              className={`flex flex-col items-start gap-2 bg-gradient-to-br ${btn.color} border rounded-xl p-4 text-left transition-all group`}>
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <btn.icon className="w-4 h-4 text-white/80" />
              </div>
              <div>
                <p className="text-white text-xs font-bold leading-snug">{btn.label}</p>
                <p className="text-white/35 text-[10px] mt-0.5">{btn.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">

        {/* Minhas Turmas */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" /> Minhas Turmas
            </h3>
            <button onClick={() => onNavigate("turmas")} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors flex items-center gap-1">
              Ver todas <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {data.turmas.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-sm">
              <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhuma turma criada ainda.
              <br /><button onClick={() => onNavigate("turmas")} className="text-indigo-400 mt-2 block text-xs hover:underline">Criar primeira turma →</button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {data.turmas.slice(0, 4).map((t, i) => {
                const eng = engagementLabel(Math.floor(Math.random() * 60) + 40);
                return (
                  <div key={t.id} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 hover:border-indigo-500/25 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{t.name}</p>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {t.serie && <span className="text-[10px] bg-indigo-500/12 text-indigo-300/80 px-2 py-0.5 rounded-full">{t.serie}</span>}
                          {t.subject && <span className="text-[10px] bg-white/6 text-white/40 px-2 py-0.5 rounded-full">{t.subject}</span>}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${eng.color}`}>{eng.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/35 mb-3">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{t.studentCount} alunos</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => onNavigate("turmas")}
                        className="flex-1 py-1.5 rounded-lg bg-indigo-600/12 hover:bg-indigo-600 border border-indigo-500/20 hover:border-indigo-500 text-indigo-300 hover:text-white text-[10px] font-bold transition-all">
                        Ver turma
                      </button>
                      <button onClick={() => onNavigate("atividades")}
                        className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-white/50 hover:text-white text-[10px] font-bold transition-all">
                        Criar atividade
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alertas + Evolução */}
        <div className="space-y-4">
          {/* Alertas */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-4">
            <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" /> Alertas
            </h3>
            <div className="space-y-2">
              {data.alerts.length === 0 ? (
                <p className="text-white/30 text-xs text-center py-3">Tudo em ordem! 👍</p>
              ) : data.alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs ${
                  a.severity === "warning" ? "bg-amber-500/10 border border-amber-500/15 text-amber-300" :
                  a.severity === "critical" ? "bg-red-500/10 border border-red-500/15 text-red-300" :
                  "bg-emerald-500/10 border border-emerald-500/15 text-emerald-300"
                }`}>
                  {a.severity === "warning" ? <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                  <span>{a.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Evolução Semanal mini */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-4">
            <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" /> Evolução Semanal
            </h3>
            {data.weeklyChart.every(w => w.acertos === 0) ? (
              <p className="text-white/25 text-xs text-center py-4">Sem dados ainda</p>
            ) : (
              <ResponsiveContainer width="100%" height={110}>
                <LineChart data={data.weeklyChart} margin={{ top: 2, right: 5, left: -30, bottom: 2 }}>
                  <XAxis dataKey="week" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: "10px", color: "white", fontSize: "11px" }} />
                  <Line type="monotone" dataKey="acertos" stroke="#34d399" strokeWidth={2} dot={false} name="Acertos %" />
                  <Line type="monotone" dataKey="participacao" stroke="#818cf8" strokeWidth={1.5} dot={false} name="Part." />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Atividades Recentes */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-400" /> Atividades Recentes
          </h3>
          <button onClick={() => onNavigate("atividades")} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Ver todas →</button>
        </div>
        {atividades.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">
            <ClipboardList className="w-7 h-7 mx-auto mb-2 opacity-30" />
            Nenhuma atividade criada ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {atividades.map((a: any) => {
              const st = atividadeStatus(a);
              const daysAgo = Math.floor((Date.now() - new Date(a.createdAt ?? a.created_at).getTime()) / 86400000);
              return (
                <div key={a.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06] transition-all">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${st.color}`}>{st.label}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{a.title}</p>
                    <p className="text-white/30 text-[10px]">{a.turmaNome ?? "Turma"} • {daysAgo === 0 ? "Hoje" : daysAgo === 1 ? "Ontem" : `${daysAgo}d atrás`}</p>
                  </div>
                  <span className={`text-[10px] font-semibold flex-shrink-0 ${a.is_published ? "text-emerald-400" : "text-white/30"}`}>
                    {a.is_published ? "Publicada" : "Rascunho"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mapa de Desempenho por Matéria */}
      {data.heatMap.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5">
          <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-rose-400" /> Desempenho por Matéria
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.heatMap.map(h => (
              <div key={h.materia} className={`rounded-xl px-4 py-2.5 text-center ${SCORE_COLOR(h.score)}`}>
                <p className="text-white text-xs font-semibold">{h.materia}</p>
                <p className="text-white font-black text-lg">{h.score}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Turmas ───────────────────────────────────────────────────────────────────
function TurmasSection({ apiFetch, onNavigate }: { apiFetch: (u: string, o?: RequestInit) => Promise<Response>; onNavigate: (id: string) => void }) {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", serie: "", subject: "", description: "" });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { const r = await apiFetch("/api/teacher/turmas"); const d = await r.json(); setTurmas(d.turmas ?? []); }
    finally { setLoading(false); }
  }

  async function createTurma(e: React.FormEvent) {
    e.preventDefault(); if (!form.name.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/api/teacher/turmas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      await load(); setShowCreate(false); setForm({ name: "", serie: "", subject: "", description: "" });
    } finally { setCreating(false); }
  }

  async function deleteTurma(id: string) {
    if (!confirm("Excluir esta turma?")) return;
    setDeleting(id);
    try { await apiFetch(`/api/teacher/turmas/${id}`, { method: "DELETE" }); setTurmas(p => p.filter(t => t.id !== id)); }
    finally { setDeleting(null); }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="font-black text-white">{turmas.length} turma{turmas.length !== 1 ? "s" : ""}</h2></div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors">
          <Plus className="w-3.5 h-3.5" /> Nova Turma
        </button>
      </div>
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-2xl border border-indigo-500/30 bg-indigo-600/5 p-5">
            <h3 className="font-bold text-white text-sm mb-4">Criar nova turma</h3>
            <form onSubmit={createTurma} className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-white/40 text-xs mb-1 block">Nome *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex: 3º Ano B — Matemática"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1 block">Série</label>
                <input value={form.serie} onChange={e => setForm(f => ({ ...f, serie: e.target.value }))} placeholder="Ex: 3º Ano, EJA"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1 block">Disciplina</label>
                <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Ex: Matemática"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="sm:col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl bg-white/5 text-white/50 text-sm hover:bg-white/10 transition-colors">Cancelar</button>
                <button type="submit" disabled={creating} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors disabled:opacity-50">
                  {creating ? "Criando..." : "Criar"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {turmas.length === 0 ? (
        <div className="text-center py-20 border border-white/[0.06] rounded-2xl">
          <GraduationCap className="w-12 h-12 text-white/15 mx-auto mb-4" />
          <p className="text-white/40 mb-4">Nenhuma turma ainda</p>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl">
            <Plus className="w-4 h-4" /> Criar primeira turma
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {turmas.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5 hover:border-indigo-500/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-sm truncate">{t.name}</h3>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {t.serie && <span className="text-xs bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded-full">{t.serie}</span>}
                    {t.subject && <span className="text-xs bg-white/8 text-white/50 px-2 py-0.5 rounded-full">{t.subject}</span>}
                  </div>
                </div>
                <button onClick={() => deleteTurma(t.id)} className="p-1.5 text-white/20 hover:text-red-400 rounded-lg transition-colors ml-2"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex items-center gap-1.5 text-white/35 text-xs mb-3"><Users className="w-3.5 h-3.5" />{t.studentCount} alunos</div>
              <div className="bg-white/5 rounded-xl px-3 py-2.5 flex items-center justify-between mb-3">
                <div>
                  <p className="text-white/25 text-[10px] mb-0.5">Código de convite</p>
                  <p className="text-indigo-300 font-mono font-black tracking-widest text-sm">{t.inviteCode}</p>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(t.inviteCode); setCopiedCode(t.inviteCode); setTimeout(() => setCopiedCode(null), 2000); }}
                  className="p-1.5 text-white/25 hover:text-indigo-300 transition-colors rounded-lg">
                  {copiedCode === t.inviteCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button onClick={() => onNavigate(t.id)}
                className="w-full py-2 rounded-xl bg-indigo-600/12 hover:bg-indigo-600 border border-indigo-500/20 hover:border-indigo-500 text-indigo-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                Ver turma <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Alunos ───────────────────────────────────────────────────────────────────
function AlunosSection({ apiFetch }: { apiFetch: (u: string, o?: RequestInit) => Promise<Response> }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch("/api/teacher/dashboard").then(r => r.json()).then(d => setStudents(d.students ?? [])).finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.turma.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar aluno ou turma..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500" />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-20 border border-white/[0.06] rounded-2xl">
          <UserCircle className="w-12 h-12 text-white/15 mx-auto mb-4" />
          <p className="text-white/40">Nenhum aluno encontrado</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-white/[0.06] text-white/30">
              <th className="text-left px-4 py-3 font-semibold">Nome</th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Turma</th>
              <th className="text-center px-4 py-3 font-semibold">Desempenho</th>
              <th className="text-center px-4 py-3 font-semibold hidden md:table-cell">Engajamento</th>
            </tr></thead>
            <tbody>{filtered.map((s, i) => (
              <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-600/25 flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-300 text-xs font-bold">{s.name[0]?.toUpperCase()}</span>
                    </div>
                    <span className="font-semibold text-white">{s.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-white/40 hidden sm:table-cell">{s.turma}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${s.performance >= 70 ? "bg-emerald-500/20 text-emerald-300" : s.performance >= 40 ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300"}`}>{s.performance}%</span>
                </td>
                <td className="px-4 py-2.5 text-center hidden md:table-cell">
                  <span className={`font-semibold ${s.engagement === "Alto" ? "text-emerald-400" : s.engagement === "Médio" ? "text-amber-400" : "text-red-400"}`}>{s.engagement}</span>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Criador de Conteúdo (NotebookLM Style) ───────────────────────────────────
function ConteudosSection({ apiFetch }: { apiFetch: (u: string, o?: RequestInit) => Promise<Response> }) {
  const [topico, setTopico] = useState("");
  const [nivel, setNivel] = useState("Ensino Médio");
  const [tipo, setTipo] = useState("aula");
  const [conteudo, setConteudo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ContentPackage | null>(null);
  const [inputTab, setInputTab] = useState<"topico" | "colar">("topico");

  const NIVEIS = ["Ensino Fundamental", "Ensino Médio", "ENEM", "Vestibular", "Pré-Vestibular", "Técnico", "Superior"];
  const TIPOS = [
    { id: "aula", label: "📖 Aula completa" },
    { id: "revisao", label: "🔄 Revisão rápida" },
    { id: "apostila", label: "📋 Apostila" },
    { id: "exercicios", label: "✏️ Lista de exercícios" },
  ];

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!topico.trim()) return;
    setLoading(true); setResult(null);
    try {
      const r = await apiFetch("/api/teacher/create-content", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topico, nivel, tipo, conteudo }),
      });
      const d = await r.json();
      if (d.ok) setResult(d.content);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-5">
      {/* Input */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-violet-600/30 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <h2 className="font-black text-white">Criador de Conteúdo</h2>
            <p className="text-white/40 text-xs">Gere aulas, slides, mapas mentais e questões automaticamente</p>
          </div>
        </div>

        {/* Input mode tabs */}
        <div className="flex gap-2 mb-4">
          {[{ id: "topico" as const, label: "💬 Digite um tema" }, { id: "colar" as const, label: "📋 Cole conteúdo" }].map(t => (
            <button key={t.id} onClick={() => setInputTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${inputTab === t.id ? "bg-violet-600 text-white" : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={generate} className="space-y-4">
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">
              {inputTab === "topico" ? "Tema / Tópico *" : "Cole seu texto, apostila ou conteúdo *"}
            </label>
            {inputTab === "topico" ? (
              <input value={topico} onChange={e => setTopico(e.target.value)} required
                placeholder="Ex: Revolução Francesa, Funções do 2º Grau, Mitose e Meiose..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500" />
            ) : (
              <>
                <input value={topico} onChange={e => setTopico(e.target.value)} required placeholder="Nome do tema (para o título)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500 mb-2" />
                <textarea value={conteudo} onChange={e => setConteudo(e.target.value)} rows={5}
                  placeholder="Cole aqui o texto, apostila, anotações ou qualquer conteúdo para a IA processar..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500 resize-none" />
              </>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-white/40 text-xs mb-1.5 block">Nível</label>
              <select value={nivel} onChange={e => setNivel(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
                {NIVEIS.map(n => <option key={n} value={n} className="bg-[#1a1a2e]">{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1.5 block">Tipo de Material</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
                {TIPOS.map(t => <option key={t.id} value={t.id} className="bg-[#1a1a2e]">{t.label}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading || !topico.trim()}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Criando pacote completo...</> : <><Wand2 className="w-4 h-4" />Gerar Conteúdo Completo</>}
          </button>
        </form>
      </div>

      {loading && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-10 text-center">
          <Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto mb-4" />
          <p className="text-white font-bold">Gerando pacote completo de conteúdo...</p>
          <p className="text-white/40 text-sm mt-1">Resumo • Slides • Mapa Mental • Questões</p>
        </div>
      )}

      {result && <ContentPackageView content={result} />}
    </div>
  );
}

// ─── Central de Pesquisa ──────────────────────────────────────────────────────
function PesquisaSection({ apiFetch }: { apiFetch: (u: string, o?: RequestInit) => Promise<Response> }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ContentPackage | null>(null);
  const [fromKb, setFromKb] = useState(false);

  const SUGGESTIONS = [
    "Revolução Francesa", "Funções do 1º Grau", "Segunda Guerra Mundial",
    "Fotossíntese", "Tabela Periódica", "Independência do Brasil",
    "Equações de 2º Grau", "Iluminismo", "Sistema Solar", "Genética",
  ];

  async function search(q?: string) {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    setQuery(searchQuery);
    setLoading(true); setResult(null);
    try {
      const r = await apiFetch("/api/teacher/research", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const d = await r.json();
      if (d.ok) { setResult(d.content); setFromKb(d.fromKb ?? false); }
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-600/30 flex items-center justify-center">
            <Microscope className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <h2 className="font-black text-white">Central de Pesquisa</h2>
            <p className="text-white/40 text-xs">Busque qualquer tema e receba um pacote completo de aprendizagem</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="Ex: Revolução Industrial, Equações diferenciais, Fotossíntese..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500" />
          </div>
          <button onClick={() => search()} disabled={loading || !query.trim()}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Pesquisar
          </button>
        </div>

        {/* Suggestions */}
        {!result && !loading && (
          <div className="mt-4">
            <p className="text-white/30 text-xs mb-3">Sugestões de busca</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => search(s)}
                  className="text-xs bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/40 text-white/50 hover:text-blue-300 px-3 py-1.5 rounded-full transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-10 text-center">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white font-bold">Pesquisando e gerando conteúdo...</p>
          <p className="text-white/40 text-sm mt-1">Consultando base de conhecimento + IA</p>
        </div>
      )}

      {result && <ContentPackageView content={result} fromKb={fromKb} />}
    </div>
  );
}

// ─── Gerador de Provas AVANÇADO ───────────────────────────────────────────────
function GerarProvaSection({ apiFetch }: { apiFetch: (u: string, o?: RequestInit) => Promise<Response> }) {
  const [examMode, setExamMode] = useState<ExamMode>("classica");
  const [visualStyle, setVisualStyle] = useState<VisualStyle>("enem");
  const [form, setForm] = useState({ tema: "", materia: "Matemática", nivel: "Médio", quantidade: 5, estilo: "ENEM" });
  const [loading, setLoading] = useState(false);
  const [exam, setExam] = useState<ExamData | null>(null);
  const [worldMode, setWorldMode] = useState(false);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [savedBank, setSavedBank] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [applyForm, setApplyForm] = useState({ title: "", turmaId: "", dueDate: "" });
  const [applyingSaving, setApplyingSaving] = useState(false);

  useEffect(() => {
    apiFetch("/api/teacher/turmas").then(r => r.json()).then(d => setTurmas(d.turmas ?? [])).catch(() => {});
  }, []);

  const NIVEIS = ["Fácil", "Médio", "Difícil", "Avançado (ENEM)"];
  const ESTILOS = ["ENEM", "Vestibular", "Ensino Médio", "Ensino Fundamental", "Técnico"];

  const VISUAL_STYLES: { id: VisualStyle; label: string; emoji: string; desc: string }[] = [
    { id: "enem", label: "ENEM", emoji: "📋", desc: "Formal, clássico" },
    { id: "infantil", label: "Infantil", emoji: "🎨", desc: "Colorido e lúdico" },
    { id: "tecnico", label: "Técnico", emoji: "⚙️", desc: "Sóbrio, profissional" },
    { id: "aventura", label: "Aventura", emoji: "🗺️", desc: "Jornada narrativa" },
  ];

  const EXAM_MODES: { id: ExamMode; label: string; emoji: string; desc: string }[] = [
    { id: "classica", label: "Clássica", emoji: "📋", desc: "Prova tradicional com questões" },
    { id: "mundo", label: "Modo Mundo", emoji: "🌍", desc: "Jornada narrativa gamificada" },
    { id: "fraquezas", label: "Por Fraquezas", emoji: "🎯", desc: "Focada nos pontos fracos" },
  ];

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tema.trim()) return;
    const isWorld = examMode === "mundo" || visualStyle === "aventura";
    setWorldMode(isWorld);
    setLoading(true); setExam(null); setSelected({}); setShowResult(false); setSavedBank(false);
    try {
      const r = await apiFetch("/api/teacher/generate-exam", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, worldMode: isWorld, visualStyle }),
      });
      const d = await r.json();
      if (d.ok) setExam(d.exam);
    } finally { setLoading(false); }
  }

  async function saveToBank() {
    if (!exam) return;
    setSavingBank(true);
    try {
      const r = await apiFetch("/api/teacher/question-bank/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tema: form.tema, materia: form.materia, nivel: form.nivel,
          saveToBank: false,
          quantidade: exam.questions.length,
        }),
      });
      // Save each question manually since we already have them
      for (const q of exam.questions ?? []) {
        await apiFetch("/api/teacher/question-bank", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materia: form.materia, tema: form.tema, nivel: form.nivel,
            text: q.text, context: q.context ?? "", explanation: q.explanation ?? "",
            alternatives: q.alternatives, correct: q.correct ?? 0,
            tags: [], origin: "ia", tipo: "multipla",
          }),
        });
      }
      setSavedBank(true);
    } finally { setSavingBank(false); }
  }

  async function applyToTurma(e: React.FormEvent) {
    e.preventDefault();
    if (!exam) return;
    setApplyingSaving(true);
    try {
      const r = await apiFetch("/api/teacher/activities", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: applyForm.title || exam.title || `Prova de ${form.materia}`,
          turmaId: applyForm.turmaId || undefined,
          dueDate: applyForm.dueDate || undefined,
          type: "prova",
          content: { questions: exam.questions, tema: form.tema, materia: form.materia },
        }),
      });
      const d = await r.json();
      if (d.ok) { setShowApply(false); alert(`Atividade "${d.activity?.title}" criada com sucesso!`); }
    } finally { setApplyingSaving(false); }
  }

  // Visual style themes
  const theme = {
    enem: { card: "bg-white/[0.04] border-white/[0.08]", num: "bg-slate-700 text-white", alt: "bg-white/5 border-white/10 hover:bg-white/10 text-white/70" },
    infantil: { card: "bg-gradient-to-br from-pink-900/30 to-purple-900/30 border-pink-500/20", num: "bg-gradient-to-br from-pink-500 to-purple-500 text-white", alt: "bg-white/8 border-white/15 hover:bg-pink-500/20 text-white/80" },
    tecnico: { card: "bg-zinc-900/80 border-zinc-700/50", num: "bg-zinc-700 text-zinc-200 font-mono", alt: "bg-zinc-800/60 border-zinc-700/60 hover:bg-zinc-700/60 text-zinc-300 font-mono" },
    aventura: { card: "bg-gradient-to-br from-amber-900/20 to-orange-900/20 border-amber-600/20", num: "bg-gradient-to-br from-amber-500 to-orange-500 text-white", alt: "bg-amber-900/20 border-amber-600/20 hover:bg-amber-600/30 text-amber-100" },
  }[visualStyle];

  const score = exam ? exam.questions.filter((q, i) => selected[i] === q.correct).length : 0;

  const EXAM_ICONS: Record<string, string> = { Matemática:"📐",Português:"📝",Física:"⚡",Química:"🧪",Biologia:"🧬",História:"📜",Geografia:"🌍",Filosofia:"🤔",Sociologia:"👥",Inglês:"🇬🇧",Artes:"🎨","Educação Física":"⚽" };

  return (
    <div className="space-y-5">
      {/* Config */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-violet-600/30 flex items-center justify-center">
            <FileQuestion className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <h2 className="font-black text-white">Gerador de Provas</h2>
            <p className="text-white/40 text-xs">Provas com IA — Modo Mundo, ilustrações e estilos visuais</p>
          </div>
        </div>

        {/* Exam mode */}
        <div className="mb-5">
          <p className="text-white/40 text-xs font-semibold mb-2 uppercase tracking-wider">Modo da Prova</p>
          <div className="grid grid-cols-3 gap-2">
            {EXAM_MODES.map(m => (
              <button key={m.id} onClick={() => setExamMode(m.id)}
                className={`p-3 rounded-xl border text-left transition-all ${examMode === m.id ? "bg-violet-600/25 border-violet-500/50 text-white" : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"}`}>
                <div className="text-xl mb-1">{m.emoji}</div>
                <p className="text-xs font-bold">{m.label}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Visual style */}
        <div className="mb-5">
          <p className="text-white/40 text-xs font-semibold mb-2 uppercase tracking-wider">Estilo Visual</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {VISUAL_STYLES.map(s => (
              <button key={s.id} onClick={() => setVisualStyle(s.id)}
                className={`p-2.5 rounded-xl border text-center transition-all ${visualStyle === s.id ? "bg-indigo-600/25 border-indigo-500/50 text-white" : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/8"}`}>
                <div className="text-lg mb-0.5">{s.emoji}</div>
                <p className="text-[10px] font-bold">{s.label}</p>
                <p className="text-[9px] text-white/30">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={generate} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="text-white/40 text-xs mb-1.5 block">Tema / Conteúdo *</label>
            <input value={form.tema} onChange={e => setForm(f => ({ ...f, tema: e.target.value }))} required
              placeholder={examMode === "mundo" ? "Ex: Viagem pelo sistema solar, Aventura na floresta amazônica..." : "Ex: Funções do 1º Grau, Revolução Industrial, Ligações Químicas..."}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">Matéria</label>
            <select value={form.materia} onChange={e => setForm(f => ({ ...f, materia: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
              {MATERIAS.map(m => <option key={m} value={m} className="bg-[#1a1a2e]">{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">Nível</label>
            <select value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
              {NIVEIS.map(n => <option key={n} value={n} className="bg-[#1a1a2e]">{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">Estilo: {form.estilo}</label>
            <select value={form.estilo} onChange={e => setForm(f => ({ ...f, estilo: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
              {ESTILOS.map(s => <option key={s} value={s} className="bg-[#1a1a2e]">{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="text-white/40 text-xs mb-1.5 block">Questões: {form.quantidade}</label>
            <input type="range" min={3} max={10} value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: Number(e.target.value) }))} className="w-full accent-violet-500" />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="text-white/40 text-xs mb-1.5 block opacity-0">Gerar</label>
            <button type="submit" disabled={loading || !form.tema.trim()}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</> : <><Sparkles className="w-4 h-4" />Gerar Prova</>}
            </button>
          </div>
        </form>
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-10 text-center">
          <Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto mb-4" />
          <p className="text-white font-bold">{examMode === "mundo" ? "Criando sua jornada narrativa..." : "Gerando sua prova personalizada..."}</p>
          <p className="text-white/40 text-sm mt-1">{form.quantidade} questões • {form.materia} • {form.nivel}</p>
        </div>
      )}

      {/* Exam result */}
      {exam && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* World mode story header */}
          {worldMode && exam.story && (
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/30 to-orange-900/20 p-6 mb-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{exam.story.emoji ?? "🗺️"}</span>
                <div>
                  <h2 className="text-xl font-black text-white">{exam.title}</h2>
                  <p className="text-amber-300/80 text-sm font-semibold">{exam.story.missao}</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-black/20 rounded-xl p-3">
                  <p className="text-amber-400/60 mb-1 font-semibold">🌍 Cenário</p>
                  <p className="text-amber-100/80">{exam.story.cenario}</p>
                </div>
                <div className="bg-black/20 rounded-xl p-3">
                  <p className="text-amber-400/60 mb-1 font-semibold">🧙 Guia</p>
                  <p className="text-amber-100/80">{exam.story.personagem}</p>
                </div>
                <div className="bg-black/20 rounded-xl p-3">
                  <p className="text-amber-400/60 mb-1 font-semibold">🏆 Objetivo</p>
                  <p className="text-amber-100/80">{exam.story.objetivo}</p>
                </div>
              </div>
            </div>
          )}

          {/* Classic header */}
          {!worldMode && (
            <div className={`rounded-2xl border p-5 mb-5 ${visualStyle === "infantil" ? "bg-gradient-to-br from-pink-800/30 to-purple-800/30 border-pink-500/30" : visualStyle === "tecnico" ? "bg-zinc-900/80 border-zinc-700/50" : "border-white/[0.06] bg-[#0f0f1a]"}`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{EXAM_ICONS[form.materia] ?? "📋"}</span>
                  <div>
                    <h3 className={`font-black ${visualStyle === "tecnico" ? "text-zinc-100 font-mono" : "text-white"} text-lg`}>{exam.title}</h3>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="text-xs bg-violet-500/20 text-violet-300 px-2.5 py-0.5 rounded-full font-semibold">{form.nivel}</span>
                      <span className="text-xs bg-white/10 text-white/50 px-2.5 py-0.5 rounded-full font-semibold">{exam.questions?.length} questões</span>
                    </div>
                  </div>
                </div>
                {showResult && (
                  <div className={`text-center px-5 py-2 rounded-xl ${score >= exam.questions.length * 0.7 ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                    <p className="text-2xl font-black">{score}/{exam.questions.length}</p>
                    <p className="text-xs">Resultado</p>
                  </div>
                )}
                {!showResult && Object.keys(selected).length === exam.questions?.length && (
                  <button onClick={() => setShowResult(true)} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Ver Gabarito
                  </button>
                )}
              </div>
              {/* Action bar: Save to bank / Apply to class */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/[0.06]">
                <button onClick={saveToBank} disabled={savingBank || savedBank}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${savedBank ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" : "bg-white/5 hover:bg-violet-600/20 hover:text-violet-300 text-white/50 border border-white/10"}`}>
                  {savingBank ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedBank ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Database className="w-3.5 h-3.5" />}
                  {savedBank ? "Salvo no Banco!" : savingBank ? "Salvando..." : "Salvar no Banco"}
                </button>
                <button onClick={() => { setShowApply(true); setApplyForm({ title: exam.title || `Prova de ${form.materia}`, turmaId: "", dueDate: "" }); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-bold border border-indigo-500/25 transition-all">
                  <Send className="w-3.5 h-3.5" /> Aplicar para Turma
                </button>
              </div>
            </div>
          )}

          {/* Apply to class modal */}
          {showApply && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-[#12121f] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white flex items-center gap-2"><Send className="w-4 h-4 text-indigo-400" /> Aplicar para Turma</h3>
                  <button onClick={() => setShowApply(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={applyToTurma} className="space-y-3">
                  <div>
                    <label className="text-white/40 text-xs mb-1.5 block">Título da Atividade</label>
                    <input value={applyForm.title} onChange={e => setApplyForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-1.5 block">Turma</label>
                    <select value={applyForm.turmaId} onChange={e => setApplyForm(f => ({ ...f, turmaId: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                      <option value="">Todas as turmas</option>
                      {turmas.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-1.5 block">Prazo</label>
                    <input type="date" value={applyForm.dueDate} onChange={e => setApplyForm(f => ({ ...f, dueDate: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={applyingSaving}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-60">
                      {applyingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Aplicar
                    </button>
                    <button type="button" onClick={() => setShowApply(false)} className="px-4 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-bold">Cancelar</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* Questions */}
          <div className="space-y-4">
            {(exam.questions ?? []).map((q, qi) => {
              const sel = selected[qi];
              const isCorrect = showResult && sel === q.correct;
              const isWrong = showResult && sel !== undefined && sel !== q.correct;
              return (
                <motion.div key={qi} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: qi * 0.06 }}
                  className={`rounded-2xl border p-5 transition-all ${showResult ? (isCorrect ? "border-emerald-500/40 bg-emerald-500/5" : isWrong ? "border-red-500/40 bg-red-500/5" : theme.card) : theme.card}`}>
                  <div className="flex gap-3">
                    {/* Quest badge for world mode */}
                    {worldMode ? (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white text-xs font-black flex items-center justify-center">⚔️</div>
                      </div>
                    ) : (
                      <div className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center flex-shrink-0 ${theme.num}`}>{qi + 1}</div>
                    )}
                    <div className="flex-1">
                      {/* World mode challenge frame */}
                      {worldMode && q.desafio && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-3 text-xs text-amber-200/80 italic">
                          ⚡ {q.desafio}
                        </div>
                      )}
                      {q.context && <div className="text-white/55 text-xs mb-3 bg-white/5 rounded-xl px-3 py-2 border-l-2 border-indigo-500/40">{q.context}</div>}
                      <p className={`font-semibold mb-4 leading-relaxed text-sm ${visualStyle === "tecnico" ? "text-zinc-200 font-mono" : "text-white"}`}>{q.text}</p>
                      {q.imageDescription && (
                        <div className="flex items-start gap-2 bg-indigo-500/8 border border-indigo-500/15 rounded-xl px-3 py-2 mb-3 text-xs text-indigo-300">
                          <Eye className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span><strong>Ilustração:</strong> {q.imageDescription}</span>
                        </div>
                      )}
                      <div className="grid sm:grid-cols-2 gap-2">
                        {q.alternatives.map((alt, ai) => {
                          const isSelected = sel === ai;
                          const isCorrectAlt = showResult && ai === q.correct;
                          const isWrongAlt = showResult && isSelected && ai !== q.correct;
                          return (
                            <button key={ai} onClick={() => !showResult && setSelected(p => ({ ...p, [qi]: ai }))}
                              className={`text-left px-3 py-2.5 rounded-xl text-xs transition-all border
                                ${isCorrectAlt ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold"
                                : isWrongAlt ? "bg-red-500/20 border-red-500/50 text-red-300"
                                : isSelected ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-300 font-bold"
                                : theme.alt
                              } ${showResult ? "cursor-default" : "cursor-pointer"}`}>
                              {alt}
                            </button>
                          );
                        })}
                      </div>
                      {showResult && (
                        <div className="mt-3 bg-white/5 rounded-xl px-3 py-2.5 text-xs text-white/65">
                          <strong className="text-white">Explicação:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* World mode finish */}
          {worldMode && !showResult && Object.keys(selected).length === exam.questions?.length && (
            <div className="text-center pt-4">
              <button onClick={() => setShowResult(true)}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm flex items-center gap-2 mx-auto transition-all hover:scale-105">
                <Star className="w-4 h-4" /> Concluir Missão!
              </button>
            </div>
          )}
          {worldMode && showResult && (
            <div className={`text-center p-6 rounded-2xl border ${score >= exam.questions.length * 0.7 ? "bg-emerald-900/30 border-emerald-500/30" : "bg-amber-900/30 border-amber-500/30"}`}>
              <div className="text-4xl mb-2">{score >= exam.questions.length * 0.7 ? "🏆" : "⚔️"}</div>
              <p className="text-white font-black text-xl">{score}/{exam.questions.length} desafios concluídos!</p>
              <p className={`text-sm mt-1 ${score >= exam.questions.length * 0.7 ? "text-emerald-300" : "text-amber-300"}`}>
                {score >= exam.questions.length * 0.7 ? "Missão cumprida! Você dominou o conteúdo!" : "Missão incompleta. Revise os pontos fracos e tente novamente!"}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Assistente IA ────────────────────────────────────────────────────────────
function AssistenteSection({ apiFetch }: { apiFetch: (u: string, o?: RequestInit) => Promise<Response> }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const SUGGESTIONS = [
    "Crie um plano de aula semanal de Trigonometria para o 3º ano",
    "Gere 5 exercícios de interpretação de texto nível ENEM",
    "Como usar PBL (aprendizagem baseada em projetos) na prática?",
    "Adapte esse conteúdo para alunos com dificuldade de leitura",
    "Crie um rubrica de avaliação para redação ENEM",
    "Quais estratégias para engajar turmas com baixo desempenho?",
  ];

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user" as const, content: input };
    const history = [...messages, userMsg];
    setMessages(history); setInput(""); setLoading(true);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      const r = await apiFetch("/api/teacher/ai-copilot", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history: messages }),
      });
      const d = await r.json();
      setMessages([...history, { role: "assistant", content: d.reply ?? "Desculpe, não consegui processar." }]);
    } catch {
      setMessages([...history, { role: "assistant", content: "Erro ao conectar. Tente novamente." }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 11rem)" }}>
      <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5 mb-4">
        <h2 className="font-black text-white flex items-center gap-2 text-sm">
          <Brain className="w-5 h-5 text-violet-400" /> Assistente do Professor
        </h2>
        <p className="text-white/35 text-xs mt-1">Copiloto pedagógico — cria aulas, provas, estratégias e análises</p>
      </div>

      {messages.length === 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => setInput(s)}
              className="text-left p-3.5 rounded-2xl border border-white/[0.06] bg-[#0f0f1a] hover:border-violet-500/30 hover:bg-violet-500/5 transition-all text-white/50 hover:text-white text-xs">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 mb-2" />{s}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-xl bg-violet-600/25 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                <Brain className="w-3.5 h-3.5 text-violet-300" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap
              ${m.role === "user" ? "bg-indigo-600/30 text-white" : "bg-[#1a1a2e] border border-white/[0.06] text-white/85"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-xl bg-violet-600/25 flex items-center justify-center flex-shrink-0 mr-2">
              <Brain className="w-3.5 h-3.5 text-violet-300" />
            </div>
            <div className="bg-[#1a1a2e] border border-white/[0.06] rounded-2xl px-4 py-3 flex gap-1">
              {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-3">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Pergunte ao assistente ou peça para criar algo..."
          className="flex-1 bg-[#0f0f1a] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500" />
        <button onClick={send} disabled={loading || !input.trim()}
          className="p-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-2xl transition-colors">
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ─── Relatórios ───────────────────────────────────────────────────────────────
function RelatoriosSection({ apiFetch }: { apiFetch: (u: string, o?: RequestInit) => Promise<Response> }) {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/teacher/dashboard").then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>;
  if (!data) return <div className="text-white/40 text-center py-20">Erro ao carregar relatórios.</div>;

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total de Alunos", value: data.totalStudents, icon: Users },
          { label: "Turmas Ativas", value: data.totalTurmas, icon: BookOpen },
          { label: "Média Geral", value: `${data.avgPerformance}%`, icon: TrendingUp },
          { label: "Engajamento", value: `${data.engagementRate}%`, icon: Activity },
        ].map(c => (
          <div key={c.label} className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-4">
            <c.icon className="w-4 h-4 text-indigo-400 mb-3" />
            <p className="text-2xl font-black text-white">{c.value}</p>
            <p className="text-white/35 text-xs mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {data.heatMap.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5">
          <h3 className="font-bold text-white text-sm mb-5">Desempenho por Matéria</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.heatMap} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="materia" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white", fontSize: "12px" }} />
              <Bar dataKey="score" name="Desempenho %" fill="#818cf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5">
        <h3 className="font-bold text-white text-sm mb-5">Evolução Semanal</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data.weeklyChart} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="week" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white", fontSize: "12px" }} />
            <Legend wrapperStyle={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }} />
            <Line type="monotone" dataKey="acertos" stroke="#34d399" strokeWidth={2} dot={false} name="Acertos %" />
            <Line type="monotone" dataKey="participacao" stroke="#818cf8" strokeWidth={2} dot={false} name="Participação" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {data.alerts.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5">
          <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2"><Bell className="w-4 h-4 text-amber-400" />Alertas do Sistema</h3>
          <div className="space-y-2">
            {data.alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-2.5 rounded-xl p-3 ${a.severity === "warning" ? "bg-amber-500/10 border border-amber-500/20" : "bg-emerald-500/10 border border-emerald-500/20"}`}>
                {a.severity === "warning" ? <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />}
                <p className={`text-xs ${a.severity === "warning" ? "text-amber-300" : "text-emerald-300"}`}>{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Banco de Questões ─────────────────────────────────────────────────────────
const MATERIAS_BQ = ["Matemática","Português","Física","Química","Biologia","História","Geografia","Filosofia","Sociologia","Inglês","Redação"];
const NIVEIS = ["Fácil","Médio","Difícil","ENEM","Vestibular"];

function BancoSection({ apiFetch }: { apiFetch: (u: string, o?: RequestInit) => Promise<Response> }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAIForm, setShowAIForm] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [applyingSaving, setApplyingSaving] = useState(false);
  const [filterMateria, setFilterMateria] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applyForm, setApplyForm] = useState({ title: "", turmaId: "", dueDate: "" });
  const [aiForm, setAiForm] = useState({
    materia: "Matemática", tema: "", nivel: "Médio", quantidade: 5, tipo: "multipla",
  });
  const [form, setForm] = useState({
    materia: "Matemática", tema: "", nivel: "Médio", text: "", context: "", explanation: "", tags: "",
    alternatives: ["","","","",""], correct: 0,
  });

  useEffect(() => {
    Promise.all([
      loadQ(),
      apiFetch("/api/teacher/turmas").then(r => r.json()).then(d => setTurmas(d.turmas ?? [])),
    ]);
  }, []);

  async function loadQ() {
    setLoading(true);
    try { const r = await apiFetch("/api/teacher/question-bank"); const d = await r.json(); setQuestions(d.questions ?? []); }
    finally { setLoading(false); }
  }

  async function saveQuestion(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch("/api/teacher/question-bank", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) }),
      });
      setShowForm(false); await loadQ();
    } catch { alert("Erro ao salvar questão"); }
  }

  async function deleteQuestion(id: string) {
    if (!confirm("Excluir esta questão?")) return;
    await apiFetch(`/api/teacher/question-bank/${id}`, { method: "DELETE" });
    setQuestions(q => q.filter(x => x.id !== id));
  }

  async function generateAI(e: React.FormEvent) {
    e.preventDefault();
    setGeneratingAI(true);
    try {
      const r = await apiFetch("/api/teacher/question-bank/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...aiForm, saveToBank: true }),
      });
      const d = await r.json();
      if (d.ok) {
        setShowAIForm(false);
        await loadQ();
      } else { alert(d.error || "Erro ao gerar questões"); }
    } finally { setGeneratingAI(false); }
  }

  async function applyFromBank(e: React.FormEvent) {
    e.preventDefault();
    if (!selected.size) return;
    setApplyingSaving(true);
    try {
      const r = await apiFetch("/api/teacher/activities/from-bank", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...applyForm, questionIds: Array.from(selected) }),
      });
      const d = await r.json();
      if (d.ok) { setShowApplyModal(false); setSelected(new Set()); alert("Atividade criada com sucesso!"); }
    } finally { setApplyingSaving(false); }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const tipoBadge = (t: string) => {
    if (t === "discursiva") return "bg-amber-500/15 text-amber-300";
    if (t === "vf") return "bg-blue-500/15 text-blue-300";
    if (t === "redacao") return "bg-rose-500/15 text-rose-300";
    return "bg-indigo-500/15 text-indigo-300";
  };
  const tipoLabel = (t: string) => ({ multipla: "Múltipla", vf: "V/F", discursiva: "Discursiva", redacao: "Redação" }[t] ?? "Múltipla");

  const filtered = questions.filter(q => (!filterMateria || q.materia === filterMateria) && (!filterTipo || q.tipo === filterTipo));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-black text-white text-lg">Banco de Questões</h2>
          <p className="text-white/40 text-xs">{questions.length} questão(ões) cadastrada(s)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <button onClick={() => setShowApplyModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors">
              <ClipboardList className="w-4 h-4" /> Criar Atividade ({selected.size})
            </button>
          )}
          <button onClick={() => { setShowAIForm(true); setShowForm(false); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/25 text-violet-300 font-bold text-sm transition-all">
            <Sparkles className="w-4 h-4" /> Gerar com IA
          </button>
          <button onClick={() => { setShowForm(true); setShowAIForm(false); setForm({ materia: "Matemática", tema: "", nivel: "Médio", text: "", context: "", explanation: "", tags: "", alternatives: ["","","","",""], correct: 0 }); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors">
            <Plus className="w-4 h-4" /> Manual
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {["", ...MATERIAS_BQ].map(m => (
            <button key={m} onClick={() => setFilterMateria(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${filterMateria === m ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/5 border-white/10 text-white/40 hover:text-white"}`}>
              {m || "Todas"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[{ v: "", l: "Todos tipos" }, { v: "multipla", l: "Múltipla" }, { v: "vf", l: "V/F" }, { v: "discursiva", l: "Discursiva" }].map(t => (
            <button key={t.v} onClick={() => setFilterTipo(t.v)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${filterTipo === t.v ? "bg-violet-600 border-violet-500 text-white" : "bg-white/5 border-white/10 text-white/30 hover:text-white"}`}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* AI Generate form */}
      {showAIForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-violet-500/30 bg-violet-600/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-400" /> Gerar Questões com IA</h3>
            <button onClick={() => setShowAIForm(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={generateAI} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Matéria</label>
                <select value={aiForm.materia} onChange={e => setAiForm(p => ({ ...p, materia: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                  {MATERIAS_BQ.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Tema / Assunto *</label>
                <input required value={aiForm.tema} onChange={e => setAiForm(p => ({ ...p, tema: e.target.value }))}
                  placeholder="Ex: Segunda Guerra Mundial" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Tipo de Questão</label>
                <select value={aiForm.tipo} onChange={e => setAiForm(p => ({ ...p, tipo: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                  <option value="multipla">Múltipla Escolha</option>
                  <option value="vf">Verdadeiro ou Falso</option>
                  <option value="discursiva">Discursiva / Aberta</option>
                </select>
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Nível</label>
                <select value={aiForm.nivel} onChange={e => setAiForm(p => ({ ...p, nivel: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                  {NIVEIS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Quantidade</label>
                <select value={aiForm.quantidade} onChange={e => setAiForm(p => ({ ...p, quantidade: Number(e.target.value) }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                  {[3,5,8,10,15].map(n => <option key={n} value={n}>{n} questões</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={generatingAI}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-colors disabled:opacity-60">
                {generatingAI ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Sparkles className="w-4 h-4" /> Gerar e Salvar no Banco</>}
              </button>
              <button type="button" onClick={() => setShowAIForm(false)} className="px-4 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-bold">Cancelar</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Manual form */}
      {showForm && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-600/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Nova Questão Manual</h3>
            <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={saveQuestion} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Matéria</label>
                <select value={form.materia} onChange={e => setForm(p => ({ ...p, materia: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                  {MATERIAS_BQ.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Nível</label>
                <select value={form.nivel} onChange={e => setForm(p => ({ ...p, nivel: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                  {NIVEIS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Tema</label>
                <input value={form.tema} onChange={e => setForm(p => ({ ...p, tema: e.target.value }))} placeholder="Ex: Funções do 1º grau"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
              </div>
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1.5 block">Contexto (texto-base, opcional)</label>
              <textarea value={form.context} onChange={e => setForm(p => ({ ...p, context: e.target.value }))} rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white resize-none" />
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1.5 block">Enunciado *</label>
              <textarea required value={form.text} onChange={e => setForm(p => ({ ...p, text: e.target.value }))} rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white resize-none" />
            </div>
            <div className="space-y-2">
              <label className="text-white/40 text-xs">Alternativas (letra verde = gabarito)</label>
              {form.alternatives.map((alt: string, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <button type="button" onClick={() => setForm(p => ({ ...p, correct: i }))}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 border transition-colors ${form.correct === i ? "bg-emerald-500 border-emerald-400 text-white" : "bg-white/5 border-white/10 text-white/40"}`}>
                    {String.fromCharCode(65 + i)}
                  </button>
                  <input value={alt} onChange={e => { const alts = [...form.alternatives]; alts[i] = e.target.value; setForm(p => ({ ...p, alternatives: alts })); }}
                    placeholder={`Alternativa ${String.fromCharCode(65 + i)}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
              ))}
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1.5 block">Explicação do gabarito</label>
              <textarea value={form.explanation} onChange={e => setForm(p => ({ ...p, explanation: e.target.value }))} rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white resize-none" />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors">Salvar Questão</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-bold">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Apply from bank modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#12121f] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Criar Atividade do Banco</h3>
              <button onClick={() => setShowApplyModal(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-white/50 text-xs mb-4">{selected.size} questão(ões) selecionada(s) serão incluídas nesta atividade.</p>
            <form onSubmit={applyFromBank} className="space-y-3">
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Título *</label>
                <input required value={applyForm.title} onChange={e => setApplyForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Prova de Revisão" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Turma (opcional)</label>
                <select value={applyForm.turmaId} onChange={e => setApplyForm(f => ({ ...f, turmaId: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                  <option value="">Todas as turmas</option>
                  {turmas.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Prazo</label>
                <input type="date" value={applyForm.dueDate} onChange={e => setApplyForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={applyingSaving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors disabled:opacity-60">
                  {applyingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Criar Atividade
                </button>
                <button type="button" onClick={() => setShowApplyModal(false)} className="px-4 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-bold">Cancelar</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-indigo-400 animate-spin" /></div>
        : filtered.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Nenhuma questão encontrada</p>
            <p className="text-xs mt-1">Gere com IA ou adicione manualmente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((q: any) => {
              const isSel = selected.has(q.id);
              return (
                <div key={q.id} onClick={() => toggleSelect(q.id)}
                  className={`rounded-2xl border p-4 cursor-pointer transition-all ${isSel ? "border-indigo-500/50 bg-indigo-600/10" : "border-white/[0.06] bg-[#0f0f1a] hover:border-white/10"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-shrink-0 mt-0.5">
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center flex-shrink-0 transition-all ${isSel ? "bg-indigo-600 border-indigo-500" : "border-white/20 bg-white/5"}`}>
                        {isSel && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs bg-indigo-600/20 text-indigo-300 px-2 py-0.5 rounded-full font-semibold">{q.materia}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tipoBadge(q.tipo || "multipla")}`}>{tipoLabel(q.tipo || "multipla")}</span>
                        <span className="text-xs bg-white/5 text-white/40 px-2 py-0.5 rounded-full">{q.nivel}</span>
                        {q.origin === "ia" && <span className="text-xs bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> IA</span>}
                        {q.tema && <span className="text-xs text-white/30">{q.tema}</span>}
                      </div>
                      <p className="text-white text-sm leading-relaxed">{q.text}</p>
                      {(q.tipo === "multipla" || !q.tipo) && q.alternatives && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {(q.alternatives as string[]).filter(Boolean).map((alt: string, i: number) => (
                            <div key={i} onClick={e => e.stopPropagation()}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${q.correct === i ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/40"}`}>
                              <span className="font-bold">{String.fromCharCode(65 + i)})</span> {alt}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.tipo === "vf" && (
                        <div className="mt-2 flex gap-2">
                          {["Verdadeiro","Falso"].map((opt, i) => (
                            <span key={i} className={`px-3 py-1 rounded-lg text-xs ${q.correct === i ? "bg-emerald-500/15 text-emerald-300 font-bold" : "bg-white/5 text-white/40"}`}>{opt}</span>
                          ))}
                        </div>
                      )}
                      {q.tipo === "discursiva" && q.explanation && (
                        <div className="mt-2 text-xs text-white/40 bg-white/[0.03] rounded-lg p-2">
                          <span className="font-bold text-white/60">Gabarito: </span>{q.explanation}
                        </div>
                      )}
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteQuestion(q.id); }} className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

// ─── Atividades ────────────────────────────────────────────────────────────────
function AtividadesSection({ apiFetch }: { apiFetch: (u: string, o?: RequestInit) => Promise<Response> }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [aiCorrecting, setAiCorrecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [corrForm, setCorrForm] = useState({ teacher_score: "", teacher_feedback: "" });
  const [questoes, setQuestoes] = useState<{ text: string; alternatives: string[]; correct: number }[]>([{ text: "", alternatives: ["","","","",""], correct: 0 }]);
  const [form, setForm] = useState({ title: "", description: "", type: "prova", turmaId: "", dueDate: "" });

  useEffect(() => {
    Promise.all([
      apiFetch("/api/teacher/activities").then(r => r.json()).then(d => setActivities(d.activities ?? [])),
      apiFetch("/api/teacher/turmas").then(r => r.json()).then(d => setTurmas(d.turmas ?? [])),
    ]).finally(() => setLoading(false));
  }, []);

  async function saveActivity(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch("/api/teacher/activities", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turmaId: form.turmaId || undefined, content: { questions: questoes } }),
      });
      setShowForm(false);
      const r = await apiFetch("/api/teacher/activities"); const d = await r.json(); setActivities(d.activities ?? []);
    } catch { alert("Erro ao salvar atividade"); }
  }

  async function viewSubmissions(activity: any) {
    setSelectedActivity(activity); setSelectedSub(null); setLoadingSubs(true);
    try { const r = await apiFetch(`/api/teacher/activities/${activity.id}/submissions`); const d = await r.json(); setSubmissions(d.submissions ?? []); }
    finally { setLoadingSubs(false); }
  }

  async function togglePublish(activity: any) {
    await apiFetch(`/api/teacher/activities/${activity.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !activity.isPublished && !activity.is_published }),
    });
    setActivities(prev => prev.map(a => a.id === activity.id ? { ...a, isPublished: !a.isPublished, is_published: !a.is_published } : a));
  }

  async function deleteActivity(id: string) {
    if (!confirm("Excluir esta atividade?")) return;
    await apiFetch(`/api/teacher/activities/${id}`, { method: "DELETE" });
    setActivities(prev => prev.filter(a => a.id !== id));
  }

  async function aiCorrect(sub: any) {
    setAiCorrecting(true);
    try {
      const r = await apiFetch(`/api/teacher/activities/${selectedActivity.id}/submissions/${sub.id}/ai-correct`, { method: "POST" });
      const d = await r.json();
      if (d.ok) {
        setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, ai_feedback: d.aiResult, correction_status: "ai_corrigido" } : s));
        setSelectedSub((prev: any) => prev ? { ...prev, ai_feedback: d.aiResult, correction_status: "ai_corrigido" } : prev);
      }
    } finally { setAiCorrecting(false); }
  }

  async function saveCorrection(sub: any) {
    setSaving(true);
    try {
      await apiFetch(`/api/teacher/activities/${selectedActivity.id}/submissions/${sub.id}/correct`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacher_score: Number(corrForm.teacher_score), teacher_feedback: corrForm.teacher_feedback }),
      });
      setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, correction_status: "corrigido", teacher_score: Number(corrForm.teacher_score), teacher_feedback: corrForm.teacher_feedback } : s));
      setSelectedSub(null);
    } finally { setSaving(false); }
  }

  const corrStatusBadge = (s: string) => {
    if (s === "corrigido") return "bg-emerald-500/15 text-emerald-300";
    if (s === "ai_corrigido") return "bg-indigo-500/15 text-indigo-300";
    return "bg-white/8 text-white/40";
  };
  const corrStatusLabel = (s: string) => s === "corrigido" ? "Corrigido" : s === "ai_corrigido" ? "Corrigido IA" : "Pendente";

  // ── Correction detail view ──────────────────────────────────────────────────
  if (selectedSub && selectedActivity) {
    const ai = selectedSub.ai_feedback;
    const answers = selectedSub.answers ?? {};
    const isRedacao = selectedActivity.type === "redacao" || ai?.tipo === "redacao";
    return (
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedSub(null)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h2 className="font-black text-white text-sm">{selectedSub.student_name || selectedSub.first_name || selectedSub.student_id?.slice(0, 8)}</h2>
            <p className="text-white/40 text-xs">{selectedActivity.title} • Enviado {new Date(selectedSub.submitted_at).toLocaleDateString("pt-BR")}</p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-bold ${corrStatusBadge(selectedSub.correction_status)}`}>
            {corrStatusLabel(selectedSub.correction_status)}
          </span>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Answer panel */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5">
            <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" /> Resposta do Aluno
            </h3>
            {isRedacao ? (
              <div className="bg-white/[0.03] rounded-xl p-4 text-white/70 text-sm leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                {answers.texto || answers.text || Object.values(answers)[0] as string || "Sem resposta"}
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {Object.entries(answers).map(([qi, ans]: [string, any]) => (
                  <div key={qi} className="bg-white/[0.03] rounded-xl p-3">
                    <p className="text-white/40 text-[10px] mb-1">Questão {Number(qi) + 1}</p>
                    <p className="text-white/70 text-xs">{typeof ans === "number" ? `Alternativa ${String.fromCharCode(65 + ans)}` : ans}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Feedback panel */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-400" /> Correção IA
              </h3>
              {!ai && (
                <button onClick={() => aiCorrect(selectedSub)} disabled={aiCorrecting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/25 text-violet-300 text-xs font-bold transition-all disabled:opacity-50">
                  {aiCorrecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {aiCorrecting ? "Corrigindo..." : "Corrigir com IA"}
                </button>
              )}
            </div>
            {!ai ? (
              <div className="text-center py-10 text-white/25 text-sm">
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Clique em "Corrigir com IA" para análise automática
              </div>
            ) : isRedacao ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {(ai.competencias ?? []).map((c: any) => (
                  <div key={c.numero} className="bg-white/[0.03] rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white/70 text-xs font-semibold">{c.nome}</p>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${c.nota >= 160 ? "bg-emerald-500/20 text-emerald-300" : c.nota >= 80 ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300"}`}>
                        {c.nota}/200
                      </span>
                    </div>
                    <p className="text-white/45 text-[10px]">{c.feedback}</p>
                  </div>
                ))}
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 mt-2">
                  <p className="text-white/50 text-[10px] font-bold mb-1">Nota Sugerida</p>
                  <p className="text-violet-300 font-black text-xl">{ai.notaTotal}/1000</p>
                  <p className="text-white/50 text-xs mt-1">{ai.comentarioGeral}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(ai.feedbacks ?? []).map((fb: any) => (
                  <div key={fb.qi} className="bg-white/[0.03] rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white/50 text-[10px]">Q{fb.qi + 1}</p>
                      <span className="text-emerald-300 text-[10px] font-bold">{fb.pontos}/10</span>
                    </div>
                    <p className="text-white/60 text-xs">{fb.feedbackAluno || fb.feedback}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Teacher correction form */}
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5">
          <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Nota e Feedback do Professor
          </h3>
          {selectedSub.correction_status === "corrigido" ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-emerald-300 font-black text-2xl">{selectedSub.teacher_score}</span>
                <span className="text-white/40 text-sm">pontos</span>
              </div>
              {selectedSub.teacher_feedback && <p className="text-white/60 text-sm bg-white/[0.03] rounded-xl p-3">{selectedSub.teacher_feedback}</p>}
              <button onClick={() => setCorrForm({ teacher_score: String(selectedSub.teacher_score ?? ""), teacher_feedback: selectedSub.teacher_feedback ?? "" })}
                className="text-xs text-indigo-400 hover:underline">Editar correção</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-white/40 text-xs block mb-1.5">Nota (0–100)</label>
                  <input type="number" min={0} max={100} value={corrForm.teacher_score}
                    onChange={e => setCorrForm(f => ({ ...f, teacher_score: e.target.value }))}
                    placeholder={ai?.notaSugerida ? String(ai.notaSugerida) : "0"}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-emerald-500 outline-none" />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-white/40 text-xs block mb-1.5">Feedback para o Aluno</label>
                  <input value={corrForm.teacher_feedback}
                    onChange={e => setCorrForm(f => ({ ...f, teacher_feedback: e.target.value }))}
                    placeholder={ai?.feedbackAluno || "Escreva um feedback motivador..."}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-emerald-500 outline-none" />
                </div>
              </div>
              {ai && !corrForm.teacher_score && (
                <button onClick={() => setCorrForm({ teacher_score: String(ai.notaSugerida ?? ""), teacher_feedback: ai.feedbackAluno ?? "" })}
                  className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline">
                  Usar sugestão da IA (nota: {ai.notaSugerida})
                </button>
              )}
              <button onClick={() => saveCorrection(selectedSub)} disabled={saving || !corrForm.teacher_score}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirmar Correção
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Submissions list view ───────────────────────────────────────────────────
  if (selectedActivity) return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => { setSelectedActivity(null); setSubmissions([]); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="font-black text-white">{selectedActivity.title}</h2>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="text-white/40 text-xs">{submissions.length} entrega(s)</span>
            {(selectedActivity.isPublished || selectedActivity.is_published)
              ? <span className="text-xs bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">Publicada</span>
              : <span className="text-xs bg-white/8 text-white/40 px-2 py-0.5 rounded-full font-semibold">Rascunho</span>
            }
          </div>
        </div>
        <button onClick={() => togglePublish(selectedActivity)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            selectedActivity.isPublished || selectedActivity.is_published
              ? "bg-amber-500/15 border border-amber-500/20 text-amber-300 hover:bg-amber-500/25"
              : "bg-emerald-600/20 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-600"
          }`}>
          {selectedActivity.isPublished || selectedActivity.is_published ? <><Lock className="w-3 h-3" /> Despublicar</> : <><Globe className="w-3 h-3" /> Publicar</>}
        </button>
      </div>

      {loadingSubs ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
        : submissions.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">Nenhum aluno respondeu ainda</p>
            {!(selectedActivity.isPublished || selectedActivity.is_published) && <p className="text-xs mt-1">Publique a atividade para os alunos responderem</p>}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] overflow-hidden">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-0 border-b border-white/[0.06]">
              {[
                { label: "Entregas", val: submissions.length, color: "text-blue-400" },
                { label: "Nota Média", val: submissions.some((s: any) => s.total > 0) ? `${Math.round(submissions.filter((s: any) => s.total > 0).reduce((acc: number, s: any) => acc + (s.score / s.total) * 100, 0) / submissions.filter((s: any) => s.total > 0).length)}%` : "—", color: "text-emerald-400" },
                { label: "Corrigidos", val: `${submissions.filter((s: any) => s.correction_status === "corrigido").length}/${submissions.length}`, color: "text-violet-400" },
              ].map(k => (
                <div key={k.label} className="text-center p-4">
                  <p className={`text-xl font-black ${k.color}`}>{k.val}</p>
                  <p className="text-white/30 text-xs">{k.label}</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead><tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-white/40 text-xs font-bold">Aluno</th>
                  <th className="text-center px-4 py-3 text-white/40 text-xs font-bold">Nota</th>
                  <th className="text-center px-4 py-3 text-white/40 text-xs font-bold hidden sm:table-cell">Status</th>
                  <th className="text-center px-4 py-3 text-white/40 text-xs font-bold hidden md:table-cell">Enviado</th>
                  <th className="text-right px-4 py-3 text-white/40 text-xs font-bold">Ação</th>
                </tr></thead>
                <tbody>
                  {submissions.map((s: any) => {
                    const pct = s.teacher_score != null ? s.teacher_score : (s.total > 0 ? Math.round((s.score / s.total) * 100) : null);
                    return (
                      <tr key={s.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-white font-medium">{s.student_name || s.first_name || s.student_id?.slice(0,8)}</td>
                        <td className="px-4 py-3 text-center">
                          {pct != null ? (
                            <span className={`px-2 py-1 rounded-lg text-xs font-black ${pct >= 70 ? "bg-emerald-500/20 text-emerald-300" : pct >= 50 ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300"}`}>
                              {pct}
                            </span>
                          ) : <span className="text-white/20 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${corrStatusBadge(s.correction_status)}`}>
                            {corrStatusLabel(s.correction_status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/40 text-xs text-center hidden md:table-cell">{new Date(s.submitted_at).toLocaleDateString("pt-BR")}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { setSelectedSub(s); setCorrForm({ teacher_score: String(s.teacher_score ?? ""), teacher_feedback: s.teacher_feedback ?? "" }); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-indigo-600/20 hover:text-indigo-300 text-white/50 text-xs font-bold transition-colors ml-auto">
                            <Eye className="w-3 h-3" /> {s.correction_status === "corrigido" ? "Ver" : "Corrigir"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-white text-lg">Atividades</h2>
          <p className="text-white/40 text-xs">Provas e tarefas para suas turmas</p>
        </div>
        <button onClick={() => { setShowForm(true); setForm({ title: "", description: "", type: "prova", turmaId: "", dueDate: "" }); setQuestoes([{ text: "", alternatives: ["","","","",""], correct: 0 }]); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors">
          <Plus className="w-4 h-4" /> Nova Atividade
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-600/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Nova Atividade</h3>
            <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={saveActivity} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Título *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Prova de Matemática" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Tipo</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                  {["prova","tarefa","exercicio","simulado"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Turma (opcional)</label>
                <select value={form.turmaId} onChange={e => setForm(f => ({ ...f, turmaId: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                  <option value="">Todas as turmas</option>
                  {turmas.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Prazo</label>
                <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
              </div>
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1.5 block">Descrição</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white resize-none" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-white/40 text-xs font-bold">Questões ({questoes.length})</label>
                <button type="button" onClick={() => setQuestoes(q => [...q, { text: "", alternatives: ["","","","",""], correct: 0 }])}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
              {questoes.map((q, qi) => (
                <div key={qi} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-white/30 text-xs font-bold">{qi + 1}.</span>
                    <input value={q.text} onChange={e => { const qs = [...questoes]; qs[qi] = { ...qs[qi], text: e.target.value }; setQuestoes(qs); }}
                      placeholder="Enunciado" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
                    {qi > 0 && <button type="button" onClick={() => setQuestoes(q => q.filter((_, i) => i !== qi))} className="text-white/20 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>}
                  </div>
                  {q.alternatives.map((alt: string, ai: number) => (
                    <div key={ai} className="flex items-center gap-2">
                      <button type="button" onClick={() => { const qs = [...questoes]; qs[qi] = { ...qs[qi], correct: ai }; setQuestoes(qs); }}
                        className={`w-6 h-6 rounded-lg text-[10px] font-black flex-shrink-0 border transition-colors ${q.correct === ai ? "bg-emerald-500 border-emerald-400 text-white" : "bg-white/5 border-white/10 text-white/30"}`}>
                        {String.fromCharCode(65 + ai)}
                      </button>
                      <input value={alt} onChange={e => { const qs = [...questoes]; const alts = [...qs[qi].alternatives]; alts[ai] = e.target.value; qs[qi] = { ...qs[qi], alternatives: alts }; setQuestoes(qs); }}
                        placeholder={`Alt. ${String.fromCharCode(65 + ai)}`} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors">Publicar Atividade</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-bold">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-indigo-400 animate-spin" /></div>
        : activities.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Nenhuma atividade ainda</p>
            <p className="text-xs mt-1">Crie sua primeira atividade para os alunos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((a: any) => {
              const pub = a.isPublished || a.is_published;
              return (
                <div key={a.id} className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-4 hover:border-white/10 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs bg-violet-600/20 text-violet-300 px-2 py-0.5 rounded-full font-semibold capitalize">{a.type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${pub ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/30"}`}>
                          {pub ? "Publicada" : "Rascunho"}
                        </span>
                        {(a.dueDate || a.due_date) && <span className="text-xs text-white/30 flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(a.dueDate || a.due_date).toLocaleDateString("pt-BR")}</span>}
                      </div>
                      <h3 className="font-bold text-white">{a.title}</h3>
                      {a.description && <p className="text-white/40 text-xs mt-0.5 truncate">{a.description}</p>}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-white/30 text-xs">{(a.content as any)?.questions?.length ?? 0} questões</span>
                        <span className="text-white/30 text-xs">{a.submissionCount ?? 0} entregas</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => togglePublish(a)} title={pub ? "Despublicar" : "Publicar"}
                        className={`p-2 rounded-xl transition-colors ${pub ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"}`}>
                        {pub ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => viewSubmissions(a)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-indigo-600/20 hover:text-indigo-300 text-white/50 text-xs font-bold transition-colors">
                        <Eye className="w-3.5 h-3.5" /> Respostas
                      </button>
                      <button onClick={() => deleteActivity(a.id)} className="p-2 rounded-xl bg-white/5 hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

// ─── Plano de Aula IA ─────────────────────────────────────────────────────────
interface PlanoAula {
  titulo: string;
  disciplina: string;
  serie: string;
  duracao: string;
  objetivos: string[];
  conteudos: string[];
  abertura: { duracao: string; descricao: string; atividade: string };
  desenvolvimento: { duracao: string; descricao: string; atividades: string[] };
  fechamento: { duracao: string; descricao: string; avaliacao: string };
  tarefa_casa: string | null;
  materiais: string[];
  perguntas_norteadoras: string[];
  observacoes: string;
  recursos_digitais: string[];
}

function PlanoAulaSection({ apiFetch }: { apiFetch: (u: string, o?: RequestInit) => Promise<Response> }) {
  const [step, setStep] = useState<"form" | "result">("form");
  const [turmas, setTurmas] = useState<{ id: string; name: string; serie?: string }[]>([]);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plano, setPlano] = useState<PlanoAula | null>(null);
  const [planTitle, setPlanTitle] = useState("");
  const [savedId, setSavedId] = useState<number | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ abertura: true, desenvolvimento: true, fechamento: true });
  const [form, setForm] = useState({
    turmaId: "", disciplina: "", serie: "", duracao: "50 minutos",
    objetivo: "", objetivosEspecificos: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/teacher/turmas").then(r => r.json()).then(d => setTurmas(d.turmas ?? []));
    apiFetch("/api/teacher/lesson-plans").then(r => r.json()).then(d => setSavedPlans(d.plans ?? []));
  }, []);

  const DISCIPLINAS = ["Matemática","Português","Física","Química","Biologia","História","Geografia","Filosofia","Sociologia","Inglês","Artes","Educação Física","Ciências","Redação"];
  const DURACOES = ["50 minutos","1 hora","1h30","2 horas","2 aulas (100 min)"];

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.disciplina || !form.objetivo.trim()) { setError("Preencha disciplina e objetivo."); return; }
    setError("");
    setGenerating(true);
    try {
      const res = await apiFetch("/api/teacher/lesson-plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turmaId: form.turmaId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar plano");
      setPlano(data.plano);
      setPlanTitle(data.title ?? "Plano de Aula");
      setStep("result");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!plano) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/teacher/lesson-plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turmaId: form.turmaId || undefined, save: true }),
      });
      const data = await res.json();
      setSavedId(data.savedId);
      if (data.savedId) {
        apiFetch("/api/teacher/lesson-plans").then(r => r.json()).then(d => setSavedPlans(d.plans ?? []));
      }
    } finally { setSaving(false); }
  }

  async function handleAjuste(tipo: "simplificar" | "avancado") {
    if (!plano) return;
    const novoObj = tipo === "simplificar"
      ? form.objetivo + " (linguagem simplificada, exemplos concretos do cotidiano, ritmo lento)"
      : form.objetivo + " (linguagem técnica avançada, exercícios desafiadores, ENEM nível alto)";
    setForm(f => ({ ...f, objetivo: novoObj }));
    setGenerating(true);
    try {
      const res = await apiFetch("/api/teacher/lesson-plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, objetivo: novoObj }),
      });
      const data = await res.json();
      if (data.plano) { setPlano(data.plano); setPlanTitle(data.title ?? planTitle); }
    } finally { setGenerating(false); }
  }

  function toggleSection(k: string) {
    setOpenSections(p => ({ ...p, [k]: !p[k] }));
  }

  function printPlan() {
    if (!plano) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${planTitle}</title>
    <style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;color:#1a1a2e;line-height:1.6}
    h1{color:#6366f1;font-size:22px}h2{color:#7c3aed;font-size:16px;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin-top:24px}
    ul{padding-left:20px}li{margin-bottom:4px}p{margin:6px 0}.meta{color:#666;font-size:13px;display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px}
    .box{background:#f8f8ff;border:1px solid #e0e0e0;border-radius:8px;padding:12px;margin-bottom:12px}
    @media print{body{margin:20px}}</style></head><body>
    <h1>${planTitle}</h1>
    <div class="meta"><span>📚 ${plano.disciplina}</span><span>🎓 ${plano.serie}</span><span>⏱ ${plano.duracao}</span></div>
    <h2>Objetivos</h2><ul>${plano.objetivos.map(o => `<li>${o}</li>`).join("")}</ul>
    <h2>Conteúdos</h2><ul>${plano.conteudos.map(c => `<li>${c}</li>`).join("")}</ul>
    <h2>Abertura (${plano.abertura.duracao})</h2><div class="box"><p>${plano.abertura.descricao}</p><p><strong>Atividade:</strong> ${plano.abertura.atividade}</p></div>
    <h2>Desenvolvimento (${plano.desenvolvimento.duracao})</h2><div class="box"><p>${plano.desenvolvimento.descricao}</p><ul>${plano.desenvolvimento.atividades.map(a => `<li>${a}</li>`).join("")}</ul></div>
    <h2>Fechamento (${plano.fechamento.duracao})</h2><div class="box"><p>${plano.fechamento.descricao}</p><p><strong>Avaliação:</strong> ${plano.fechamento.avaliacao}</p></div>
    ${plano.tarefa_casa ? `<h2>Tarefa de Casa</h2><p>${plano.tarefa_casa}</p>` : ""}
    <h2>Materiais</h2><ul>${plano.materiais.map(m => `<li>${m}</li>`).join("")}</ul>
    <h2>Perguntas Norteadoras</h2><ul>${plano.perguntas_norteadoras.map(p => `<li>${p}</li>`).join("")}</ul>
    ${plano.observacoes ? `<h2>Observações</h2><p>${plano.observacoes}</p>` : ""}
    </body></html>`);
    win.document.close();
    win.print();
  }

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-indigo-400" /> Plano de Aula com IA
          </h2>
          <p className="text-white/40 text-sm mt-0.5">Gere planos profissionais em segundos, com base nos seus cadernos RAG</p>
        </div>
        {step === "result" && (
          <button onClick={() => { setStep("form"); setPlano(null); setSavedId(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/6 hover:bg-white/10 text-white/60 hover:text-white text-sm font-bold transition-all">
            <ArrowLeft className="w-4 h-4" /> Novo plano
          </button>
        )}
      </div>

      {step === "form" && (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Form */}
          <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5">
            <form onSubmit={handleGenerate} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-3 py-2.5 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-white/50 text-xs font-semibold block mb-1.5">Disciplina *</label>
                  <select value={form.disciplina} onChange={e => setForm(f => ({ ...f, disciplina: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none">
                    <option value="">Selecionar...</option>
                    {DISCIPLINAS.map(d => <option key={d} value={d} className="bg-[#1a1a2e]">{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-xs font-semibold block mb-1.5">Série / Ano</label>
                  <input value={form.serie} onChange={e => setForm(f => ({ ...f, serie: e.target.value }))}
                    placeholder="Ex: 2º Ano EM, 9º Ano EF..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:border-indigo-500 outline-none" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-white/50 text-xs font-semibold block mb-1.5">Duração da Aula</label>
                  <select value={form.duracao} onChange={e => setForm(f => ({ ...f, duracao: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none">
                    {DURACOES.map(d => <option key={d} value={d} className="bg-[#1a1a2e]">{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-xs font-semibold block mb-1.5">Turma (opcional)</label>
                  <select value={form.turmaId} onChange={e => setForm(f => ({ ...f, turmaId: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none">
                    <option value="" className="bg-[#1a1a2e]">Sem turma específica</option>
                    {turmas.map(t => <option key={t.id} value={t.id} className="bg-[#1a1a2e]">{t.name}{t.serie ? ` (${t.serie})` : ""}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs font-semibold block mb-1.5">Objetivo Geral *</label>
                <textarea value={form.objetivo} onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))}
                  rows={3} placeholder="Ex: Apresentar o conceito de funções de 1º grau, relacionando com situações do cotidiano e preparação para o ENEM..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:border-indigo-500 outline-none resize-none" />
              </div>

              <div>
                <label className="text-white/50 text-xs font-semibold block mb-1.5">Objetivos Específicos (opcional)</label>
                <textarea value={form.objetivosEspecificos} onChange={e => setForm(f => ({ ...f, objetivosEspecificos: e.target.value }))}
                  rows={2} placeholder="Liste objetivos específicos separados por vírgula ou linha..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:border-indigo-500 outline-none resize-none" />
              </div>

              <button type="submit" disabled={generating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando plano com IA...</> : <><Wand2 className="w-4 h-4" /> Gerar Plano de Aula</>}
              </button>
            </form>
          </div>

          {/* Planos salvos */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5">
            <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" /> Planos Salvos
            </h3>
            {savedPlans.length === 0 ? (
              <p className="text-white/25 text-xs text-center py-6">Nenhum plano salvo ainda</p>
            ) : (
              <div className="space-y-2">
                {savedPlans.map((p: any) => (
                  <div key={p.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:border-indigo-500/20 transition-all">
                    <p className="text-white text-xs font-bold truncate">{p.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {p.disciplina && <span className="text-[10px] bg-indigo-500/12 text-indigo-300/80 px-1.5 py-0.5 rounded-full">{p.disciplina}</span>}
                      {p.turma_name && <span className="text-[10px] text-white/30">{p.turma_name}</span>}
                    </div>
                    <p className="text-white/25 text-[10px] mt-1">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {step === "result" && plano && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-600/8 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{planTitle}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded-full">{plano.disciplina}</span>
                  <span className="text-[10px] bg-white/8 text-white/40 px-2 py-0.5 rounded-full">{plano.serie}</span>
                  <span className="text-[10px] bg-white/8 text-white/40 px-2 py-0.5 rounded-full">⏱ {plano.duracao}</span>
                  {savedId && <span className="text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full">✓ Salvo</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => handleAjuste("simplificar")} disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 text-amber-300 text-xs font-bold transition-all disabled:opacity-50">
                  <Layers className="w-3 h-3" /> Simplificar
                </button>
                <button onClick={() => handleAjuste("avancado")} disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/20 text-violet-300 text-xs font-bold transition-all disabled:opacity-50">
                  <TrendingUp className="w-3 h-3" /> Nível Avançado
                </button>
                {!savedId && (
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-300 text-xs font-bold transition-all disabled:opacity-50">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Salvar
                  </button>
                )}
                <button onClick={printPlan}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/20 text-blue-300 text-xs font-bold transition-all">
                  <FileQuestion className="w-3 h-3" /> Imprimir
                </button>
              </div>
            </div>
            {generating && (
              <div className="flex items-center gap-2 mt-3 text-xs text-indigo-300/70">
                <Loader2 className="w-3 h-3 animate-spin" /> Regenerando plano...
              </div>
            )}
          </div>

          {/* Plano content */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">

              {/* Objetivos e Conteúdos */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-indigo-400" /> Objetivos</h4>
                    <ul className="space-y-1.5">
                      {plano.objetivos.map((o, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-white/65">
                          <span className="w-4 h-4 rounded-full bg-indigo-500/15 text-indigo-400 text-[9px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-violet-400" /> Conteúdos</h4>
                    <ul className="space-y-1">
                      {plano.conteudos.map((c, i) => (
                        <li key={i} className="text-xs text-white/65 flex items-start gap-1.5">
                          <span className="text-violet-400 mt-0.5">•</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Abertura */}
              {[
                { key: "abertura", label: "Abertura", color: "emerald", data: plano.abertura, items: [{ l: "Descrição", v: plano.abertura.descricao }, { l: "Atividade", v: plano.abertura.atividade }] },
                { key: "desenvolvimento", label: "Desenvolvimento", color: "indigo", data: plano.desenvolvimento, items: [{ l: "Descrição", v: plano.desenvolvimento.descricao }, ...plano.desenvolvimento.atividades.map((a, i) => ({ l: `Atividade ${i + 1}`, v: a }))] },
                { key: "fechamento", label: "Fechamento", color: "amber", data: plano.fechamento, items: [{ l: "Descrição", v: plano.fechamento.descricao }, { l: "Avaliação", v: plano.fechamento.avaliacao }] },
              ].map(block => (
                <div key={block.key} className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] overflow-hidden">
                  <button onClick={() => toggleSection(block.key)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full bg-${block.color}-500`} />
                      <span className="font-bold text-white text-sm">{block.label}</span>
                      <span className="text-white/30 text-xs">— {block.data.duracao}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-white/30 transition-transform ${openSections[block.key] ? "rotate-90" : ""}`} />
                  </button>
                  {openSections[block.key] && (
                    <div className="px-5 pb-4 space-y-3">
                      {block.items.map((item, i) => (
                        <div key={i}>
                          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wide mb-1">{item.l}</p>
                          <p className="text-white/70 text-xs leading-relaxed">{item.v}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {plano.tarefa_casa && (
                <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
                  <h4 className="font-bold text-amber-300 text-sm mb-2 flex items-center gap-1.5">🏠 Tarefa de Casa</h4>
                  <p className="text-white/65 text-xs">{plano.tarefa_casa}</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-3">
              {plano.perguntas_norteadoras.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-4">
                  <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-violet-400" /> Perguntas Norteadoras</h4>
                  <ul className="space-y-2">
                    {plano.perguntas_norteadoras.map((q, i) => (
                      <li key={i} className="text-xs text-white/60 pl-3 border-l-2 border-violet-500/30">{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              {plano.materiais.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-4">
                  <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-blue-400" /> Materiais</h4>
                  <ul className="space-y-1.5">
                    {plano.materiais.map((m, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-white/60">
                        <span className="text-blue-400">•</span>{m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {plano.recursos_digitais?.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-4">
                  <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Recursos Digitais</h4>
                  <ul className="space-y-1.5">
                    {plano.recursos_digitais.map((r, i) => (
                      <li key={i} className="text-xs text-white/60 flex items-start gap-1.5">
                        <span className="text-indigo-400">•</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {plano.observacoes && (
                <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f1a] p-4">
                  <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Observações</h4>
                  <p className="text-white/55 text-xs">{plano.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
