import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { normalizeTiagaoLegacyPath } from "@/lib/tiagao-navigation";
import { triggerProfessorAction } from "@/lib/professor-events";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  BookOpen,
  Zap,
  Brain,
  Trophy,
  ChevronDown,
  Presentation,
  ExternalLink,
  FileText,
  CalendarDays,
  Network,
  BarChart3,
  ScrollText,
  CheckCircle2,
  Trash2,
  FileCode2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STUDYAI_ACCOUNT_CHANGED } from "@/lib/account-storage";
import { StudyPlan } from "@/hooks/use-study-plan";
import {
  type Citation,
  CitationsSection,
  renderTextWithCitations,
} from "@/components/CitationChip";
import {
  MathRender,
  MathSteps,
  MathVisual,
  type MathVisualPayload,
} from "@/components/MathRender";
import { VideoStrip, type VideoStripVideo } from "@/components/VideoStrip";

/**
 * PR-7 — LaTeX rendering.
 *
 * Quebra um texto em segmentos preservando ordem:
 *  • `$$…$$` ou `\[…\]` → bloco (KaTeX displayMode)
 *  • `$…$` ou `\(…\)`   → inline
 *  • resto              → texto puro com quebras de linha preservadas
 *
 * Block math primeiro na alternação (regex match left-to-right por alternativa)
 * para que `$$…$$` não seja capturado pelo padrão inline.
 */
const MATH_DELIMITER_RE =
  /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^\n$]+?)\$/g;

function renderMessageContentWithMath(text: string): ReactNode[] {
  if (!text) return [];
  const nodes: ReactNode[] = [];
  const re = new RegExp(MATH_DELIMITER_RE.source, "g");
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(
        <span key={`t-${key++}`} className="whitespace-pre-wrap">
          {text.slice(lastIdx, match.index)}
        </span>,
      );
    }
    const blockA = match[1]; // $$...$$
    const blockB = match[2]; // \[...\]
    const inlineA = match[3]; // \(...\)
    const inlineB = match[4]; // $...$
    const block = blockA ?? blockB;
    const inline = inlineA ?? inlineB;
    if (block && block.trim().length > 0) {
      nodes.push(
        <div key={`mb-${key++}`} className="my-2 text-center overflow-x-auto">
          <MathRender latex={block.trim()} displayMode />
        </div>,
      );
    } else if (inline && inline.trim().length > 0) {
      nodes.push(<MathRender key={`mi-${key++}`} latex={inline.trim()} />);
    }
    lastIdx = re.lastIndex;
  }
  if (lastIdx < text.length) {
    nodes.push(
      <span key={`t-${key++}`} className="whitespace-pre-wrap">
        {text.slice(lastIdx)}
      </span>,
    );
  }
  return nodes;
}

/** PR-2 — meta interna devolvida pelo backend: método pedagógico aplicado +
 * sentimento detectado. NÃO é exibida ao aluno, mas pode reagir avatar/UI. */
export type TiagaoMethod = "analitico" | "pragmatico" | "conectivo";
export type TiagaoSentiment = "frustrado" | "confuso" | "cansado" | "animado" | "neutro";
export interface TiagaoMeta {
  method: TiagaoMethod;
  sentiment: TiagaoSentiment;
}

/** PR-7 — payload do tool `resolver_calculo` anexado à última mensagem. */
export interface MathResultPayload {
  engine: "wolfram" | "free" | "none";
  result: string;
  steps: string[];
  latex?: string;
  problema?: string;
  /** PR-8 — widget visual (GeoGebra 3D / 2D ou function-plot) sugerido. */
  visual?: MathVisualPayload;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  prova?: any;
  video?: { url: string; titulo?: string; formato?: string };
  fontes?: Citation[];
  tiagao_meta?: TiagaoMeta;
  /** PR-7 — passos de resolução matemática vindos do tool `resolver_calculo`. */
  mathResult?: MathResultPayload;
  /** PR-8 — widget visual avulso (tools de geometria/plot, sem solve completo). */
  visual?: MathVisualPayload;
  /** Imagem ilustrativa anexada via tool `gerar_imagem_educacional`. */
  imagem?: {
    url: string;
    topico?: string;
    source?: string;
    license?: string;
    author?: string;
    title?: string;
  };
  /** Vídeos educacionais YouTube embed-only (tool `buscar_video_educacional`). */
  videos?: VideoStripVideo[];
  videoTopico?: string;
}

interface ActionNotif {
  icon: React.ReactNode;
  text: string;
  sub?: string;
  path?: string;
}

interface TutorChatProps {
  plan: StudyPlan;
  serie: string;
  diaAtual?: number;
  topicosCompletos?: number;
  totalTopicos?: number;
  topicosAtual?: string[];
}

/**
 * Defesa client-side: o backend Tiagão às vezes emite ações "guarda-chuva"
 * (`criar_slides`/`criar_slide`/`criar_resumo`/`criar_infografico`/
 * `criar_plano_estudos`) com títulos do tipo "Plano de Estudos: …",
 * "Mapa mental de …", "Cronograma semanal …", "Redação sobre …",
 * "Flashcards de …". Sem este detector, esses pedidos viram artefato no
 * Notebook em vez de abrir a página dedicada (`/app`, `/cronograma`,
 * `/mapa-mental`, `/redacao`).
 *
 * TODO(roteamento): extrair para um módulo partilhado entre
 * VoiceProfessor.tsx e TutorChat.tsx (`@/lib/tiagao-intent`).
 */
type ArtifactIntent = "plano" | "cronograma" | "mapa_mental" | "redacao" | "flashcards" | null;

function detectArtifactIntent(action: any): ArtifactIntent {
  const t = String(action?.titulo ?? action?.topico ?? action?.tema ?? "").toLowerCase().trim();
  if (!t) return null;
  if (/\bplan(?:o|os|ejamento)\b|\bplano\s+de\s+estudo/.test(t)) return "plano";
  if (/\bcronograma|\brotina\s+de\s+estud|\borganiza(?:ç|c)ão\s+da\s+semana|\bsemanal/.test(t)) return "cronograma";
  if (/\bmapa\s+mental|\bmapa\s+conceitual|\bdiagrama\s+(?:hier|conce)/.test(t)) return "mapa_mental";
  if (/\bflashcards?|\bcart(?:ões|elas)\s+de\s+revis/.test(t)) return "flashcards";
  if (/\bredação|\btexto\s+dissertativo|\bdissertaç/.test(t)) return "redacao";
  return null;
}

const QUICK_ACTIONS = [
  { label: "Me explica o conteúdo de hoje", icon: BookOpen },
  { label: "Me faz uma questão de prova", icon: Zap },
  { label: "Cria flashcards para revisar", icon: Brain },
  { label: "Cria slides do que estudei", icon: Presentation },
  { label: "Monta um plano de estudos", icon: CalendarDays },
  { label: "Cria material em HTML completo", icon: FileCode2 },
  { label: "Simular prova rápida", icon: Trophy },
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-primary/60"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const [, navigate] = useLocation();
  const isUser = message.role === "user";

  if (message.imagem) {
    const img = message.imagem;
    const attribution = [img.author, img.license].filter(Boolean).join(" · ");
    const sourceLabel =
      img.source === "wikimedia" ? "Wikimedia Commons" :
      img.source === "flux-schnell" ? "FLUX schnell" :
      img.source === "dalle-3" ? "DALL-E 3" : img.source;
    return (
      <motion.div initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex flex-row items-end gap-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-1 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
          <Bot className="w-4 h-4" />
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden max-w-sm">
          <div className="bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-2.5 text-white">
            <p className="text-[10px] font-bold tracking-widest uppercase opacity-80">🖼️ STUDYAI · IMAGEM</p>
            {img.topico && <h3 className="text-sm font-bold mt-1 line-clamp-1">{img.topico}</h3>}
          </div>
          <img
            src={img.url}
            alt={img.topico ?? img.title ?? "ilustração"}
            loading="lazy"
            className="w-full aspect-[16/9] object-cover bg-gray-100"
          />
          <div className="px-4 py-2 flex items-center justify-between text-[11px] text-gray-500 gap-2">
            <span className="truncate">
              {attribution || (sourceLabel ? `Fonte: ${sourceLabel}` : "")}
            </span>
            <a href={img.url} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline font-medium flex-shrink-0">
              Abrir ↗
            </a>
          </div>
        </div>
      </motion.div>
    );
  }

  if (message.video) {
    const v = message.video;
    const isShorts = v.formato === "shorts";
    return (
      <motion.div initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex flex-row items-end gap-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-1 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
          <Bot className="w-4 h-4" />
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden max-w-sm">
          <div className="bg-gradient-to-r from-fuchsia-600 to-pink-600 px-5 py-3 text-white">
            <p className="text-[10px] font-bold tracking-widest uppercase opacity-80">🎬 STUDYAI · VÍDEO IA</p>
            {v.titulo && <h3 className="text-sm font-bold mt-1">{v.titulo}</h3>}
          </div>
          <div className={`bg-black ${isShorts ? "max-w-[260px] mx-auto" : ""}`}>
            <video
              src={v.url}
              controls
              autoPlay
              playsInline
              className={`w-full ${isShorts ? "aspect-[9/16]" : "aspect-video"}`}
            >
              Seu navegador não suporta vídeo HTML5.
            </video>
          </div>
          <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500">
            <span>{isShorts ? "📱 Reels/Shorts" : "🎞️ Vídeo-aula"}</span>
            <a href={v.url} download className="text-fuchsia-600 hover:underline font-medium">⬇️ Baixar</a>
          </div>
        </div>
      </motion.div>
    );
  }

  if (message.prova) {
    const prova = message.prova;
    return (
      <motion.div initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex flex-row items-end gap-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-1 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
          <Bot className="w-4 h-4" />
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden max-w-sm">
          <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-4 text-white">
            <p className="text-[10px] font-bold tracking-widest uppercase opacity-80">STUDYAI · AVALIAÇÃO</p>
            <h3 className="text-base font-bold mt-1">{prova.titulo}</h3>
            <div className="flex gap-3 mt-2 text-xs opacity-90 flex-wrap">
              <span>📚 {prova.materia}</span>
              {prova.tempo_minutos && <span>⏱ {prova.tempo_minutos} min</span>}
              <span>📝 {prova.questoes?.length} questões</span>
            </div>
          </div>
          <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
            {prova.questoes?.slice(0, 3).map((q: any, i: number) => (
              <div key={i} className="border border-gray-100 rounded-xl p-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-md bg-violet-50 text-violet-600 text-[10px] font-bold flex items-center justify-center">{q.numero ?? i + 1}</span>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">{q.tipo === "multipla_escolha" ? "Múltipla escolha" : "Dissertativa"}</span>
                </div>
                <p className="text-xs text-gray-700 line-clamp-2">{q.enunciado}</p>
              </div>
            ))}
            {(prova.questoes?.length > 3) && (
              <p className="text-xs text-gray-400 text-center">+ {prova.questoes.length - 3} questões...</p>
            )}
          </div>
          <div className="border-t border-gray-100 p-3 flex justify-center">
            <button
              onClick={() => navigate("/notebook")}
              className="bg-violet-600 text-white px-5 py-2 rounded-xl text-xs font-semibold hover:bg-violet-700 transition-colors"
            >
              Iniciar Prova →
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn("flex items-end gap-2", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-1",
        isUser ? "bg-primary text-white" : "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={cn(
        "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
        isUser
          ? "bg-primary text-white rounded-br-sm"
          : "bg-white border border-border text-foreground rounded-bl-sm shadow-sm"
      )}>
        {/* PR-7 — texto com suporte a LaTeX inline ($..$) e bloco ($$..$$).
            Para mensagens do usuário, mantém renderização simples (sem LaTeX). */}
        {isUser ? (
          message.content.split("\n").map((line, i, arr) => (
            <span key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </span>
          ))
        ) : (
          renderMessageContentWithMath(message.content)
        )}
        {/* PR-7 — passos verificáveis do resolver_calculo */}
        {!isUser && message.mathResult && message.mathResult.steps?.length > 0 && (
          <div
            className="mt-3 pt-2 border-t border-gray-200/70 text-xs text-gray-600"
            data-testid="message-math-steps"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-gray-700">Passos da resolução</span>
              <span className="text-[10px] uppercase tracking-wide text-gray-400">
                {message.mathResult.engine === "wolfram"
                  ? "Wolfram"
                  : message.mathResult.engine === "free"
                    ? "mathjs/algebrite"
                    : "—"}
              </span>
            </div>
            <MathSteps
              steps={message.mathResult.steps}
              className="list-decimal pl-5 space-y-0.5"
            />
            {message.mathResult.result && (
              <p className="mt-2">
                <span className="font-semibold text-gray-700">Resultado:</span>{" "}
                {message.mathResult.latex
                  ? <MathRender latex={message.mathResult.latex} />
                  : <span>{message.mathResult.result}</span>}
              </p>
            )}
            {/* PR-8 — widget visual sob a resolução textual (GeoGebra / plot). */}
            {message.mathResult.visual && message.mathResult.visual.kind && (
              <MathVisual visual={message.mathResult.visual} />
            )}
          </div>
        )}
        {/* PR-8 — visual avulso (tools visualizar_geometria_3d / plotar_funcao). */}
        {!isUser && message.visual && message.visual.kind && (
          <div className="mt-3 pt-2 border-t border-gray-200/70">
            <MathVisual visual={message.visual} />
          </div>
        )}
        {/* Vídeos educacionais (embed-only, lazy thumbnail → iframe nocookie). */}
        {!isUser && message.videos && message.videos.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-200/70">
            <VideoStrip
              videos={message.videos}
              title={
                message.videoTopico
                  ? `Vídeos sobre ${message.videoTopico}`
                  : "Vídeos recomendados"
              }
              showLabel
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

const MAX_STORED_MESSAGES = 40;

export function TutorChat({ plan, serie, diaAtual, topicosCompletos, totalTopicos, topicosAtual }: TutorChatProps) {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const userId = user?.id;
  const materiaSlug = useMemo(
    () => plan.materia?.replace(/\s+/g, "_").toLowerCase() ?? "geral",
    [plan.materia],
  );
  const storageKey = useMemo(
    () => `tiagao_chat_u_${userId ?? "guest"}_${materiaSlug}`,
    [userId, materiaSlug],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [actionNotif, setActionNotif] = useState<ActionNotif | null>(null);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Persistent conversation memory (scoped by signed-in user when available) ─
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHydrated, setChatHydrated] = useState(false);

  useEffect(() => {
    const onAccountChange = () => {
      setMessages([]);
      setChatHydrated(false);
    };
    window.addEventListener(STUDYAI_ACCOUNT_CHANGED, onAccountChange);
    return () => window.removeEventListener(STUDYAI_ACCOUNT_CHANGED, onAccountChange);
  }, []);

  useEffect(() => {
    setChatHydrated(false);
    try {
      let raw = localStorage.getItem(storageKey);
      if (!raw && userId) {
        const legacy = `tiagao_chat_${materiaSlug}`;
        raw = localStorage.getItem(legacy);
        if (raw) {
          localStorage.setItem(storageKey, raw);
          localStorage.removeItem(legacy);
        }
      }
      if (raw) {
        const parsed = JSON.parse(raw) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setChatHydrated(true);
          return;
        }
      }
      setMessages([]);
    } catch {
      setMessages([]);
    }
    setChatHydrated(true);
  }, [storageKey, userId, materiaSlug]);

  // Save messages to localStorage whenever they change (throttled)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (messages.length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        const toStore = messages.slice(-MAX_STORED_MESSAGES);
        localStorage.setItem(storageKey, JSON.stringify(toStore));
      } catch { /* quota exceeded — ignore */ }
    }, 500);
  }, [messages, storageKey]);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setHasUnread(false);
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !chatHydrated) return;
    if (messages.length > 0) return;
    const greeting: Message = {
      role: "assistant",
      content: `Olá, ${plan.aluno}! 👋 Sou seu Tutor IA — estou aqui para te ajudar a dominar **${plan.materia}** e arrasar na prova! 🎯\n\nPosso explicar qualquer coisa, criar flashcards, slides, provas, mapas mentais, plano de estudos e muito mais. Lembro de tudo que conversamos! 🧠`,
    };
    setMessages([greeting]);
  }, [isOpen, chatHydrated, plan.aluno, plan.materia, messages.length]);

  const clearHistory = () => {
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    setMessages([]);
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
    else if (messages.length > 0 && messages[messages.length - 1].role === "assistant") {
      setHasUnread(true);
    }
  }, [messages, isOpen]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 80);
  };

  const showNotif = (notif: ActionNotif, durationMs = 9000) => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setActionNotif(notif);
    notifTimerRef.current = setTimeout(() => setActionNotif(null), durationMs);
  };

  const handleAction = useCallback((action: Record<string, any>) => {
    if (!action?.type) return;

    // ── Multi-intent guard ───────────────────────────────────────────────────
    // Se o Tiagão emitiu uma ação "guarda-chuva" mas o título sugere outra
    // categoria (plano, cronograma, mapa mental, redação, flashcards), reroteia
    // para a página dedicada em vez de despejar tudo no Notebook RAG.
    const GUARDED_TYPES = new Set<string>([
      "criar_slides", "criar_slide", "criar_resumo",
      "criar_infografico", "criar_plano_estudos",
    ]);
    if (typeof action.type === "string" && GUARDED_TYPES.has(action.type)) {
      const intent = detectArtifactIntent(action);
      if (intent) {
        const topic =
          (typeof action.titulo === "string" && action.titulo.trim()) ||
          (typeof action.topico === "string" && action.topico.trim()) ||
          (typeof action.tema === "string" && action.tema.trim()) ||
          "Material personalizado";
        if (intent === "plano") {
          navigate("/app");
          window.setTimeout(() => {
            triggerProfessorAction("criar_plano", topic);
          }, 650);
          showNotif({
            icon: <CalendarDays className="w-5 h-5 flex-shrink-0" />,
            text: `📅 Abrindo o gerador de plano…`,
            sub: topic ? `"${topic}"` : undefined,
            path: "/app",
          });
          return;
        }
        if (intent === "cronograma") {
          try {
            localStorage.setItem(
              "tiagao_cronograma_intent",
              JSON.stringify({ topic, ts: Date.now() }),
            );
          } catch { /* ignore */ }
          showNotif({
            icon: <CalendarDays className="w-5 h-5 flex-shrink-0" />,
            text: "🗓️ Abrindo cronograma de estudos…",
            sub: topic ? `"${topic}"` : undefined,
            path: "/cronograma",
          });
          window.setTimeout(() => navigate("/cronograma"), 700);
          return;
        }
        if (intent === "mapa_mental") {
          try {
            localStorage.setItem(
              "tiagao_mapa_mental_intent",
              JSON.stringify({ topic, ts: Date.now() }),
            );
            if (action.mapa) {
              localStorage.setItem("tiagao_mapa_mental", JSON.stringify(action.mapa));
            }
          } catch { /* ignore */ }
          showNotif({
            icon: <Network className="w-5 h-5 flex-shrink-0" />,
            text: "🗺️ Abrindo mapa mental…",
            sub: topic ? `"${topic}"` : undefined,
            path: "/mapa-mental",
          });
          window.setTimeout(() => navigate("/mapa-mental"), 700);
          return;
        }
        if (intent === "redacao") {
          try {
            localStorage.setItem(
              "tiagao_redacao_intent",
              JSON.stringify({ tema: topic, ts: Date.now() }),
            );
          } catch { /* ignore */ }
          showNotif({
            icon: <ScrollText className="w-5 h-5 flex-shrink-0" />,
            text: "✍️ Abrindo correção de redação…",
            sub: topic ? `"${topic}"` : undefined,
            path: "/redacao",
          });
          window.setTimeout(() => navigate("/redacao"), 700);
          return;
        }
        if (intent === "flashcards") {
          // TODO: criar página `/flashcards` real para receber este desvio.
          showNotif({
            icon: <Brain className="w-5 h-5 flex-shrink-0" />,
            text: "🎯 Flashcards estão sendo gerados…",
            sub: topic ? `"${topic}"` : undefined,
          });
          return;
        }
      }
    }

    switch (action.type) {
      case "ir":
        setTimeout(() => navigate(normalizeTiagaoLegacyPath(action.param ?? "/app")), 600);
        break;

      case "criar_plano": {
        const topic = typeof action.param === "string" ? action.param.trim() : "";
        navigate("/app");
        window.setTimeout(() => {
          triggerProfessorAction("criar_plano", topic || "Plano de estudos personalizado (com o Tiagão)");
        }, 650);
        break;
      }

      case "navegar":
        setTimeout(() => navigate(normalizeTiagaoLegacyPath(action.path ?? "/app")), 700);
        break;

      case "abrir_aula_ia":
        localStorage.setItem("tiagao_aula_topico", action.topico ?? "");
        localStorage.setItem("tiagao_aula_estilo", action.estilo ?? "ENEM");
        window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_aula_topico" } }));
        setTimeout(() => navigate("/aula-ia"), 700);
        break;

      case "flashcards_criados":
        showNotif({
          icon: <Brain className="w-5 h-5 flex-shrink-0" />,
          text: `✅ ${action.quantidade ?? ""} flashcards criados`,
          sub: action.topico ? `"${action.topico}"` : undefined,
          path: "/app",
        });
        break;

      case "imagem_gerada": {
        if (typeof action.url === "string" && action.url) {
          const imgMsg: Message = {
            role: "assistant",
            content: "",
            imagem: {
              url: action.url,
              topico: typeof action.topico === "string" ? action.topico : undefined,
              source: typeof action.source === "string" ? action.source : undefined,
              license: typeof action.license === "string" ? action.license : undefined,
              author: typeof action.author === "string" ? action.author : undefined,
              title: typeof action.title === "string" ? action.title : undefined,
            },
          };
          setMessages((prev) => [...prev, imgMsg]);
          showNotif({
            icon: <Sparkles className="w-5 h-5 flex-shrink-0" />,
            text: "🖼️ Imagem adicionada",
            sub: action.topico ? `"${action.topico}"` : undefined,
          });
        }
        break;
      }

      // PR-7 — resultado do resolver_calculo: anexa passos verificáveis à última
      // mensagem do assistente para renderização via MathSteps no bubble.
      case "math_result": {
        const payload: MathResultPayload = {
          engine: action.engine ?? "none",
          result: typeof action.result === "string" ? action.result : "",
          steps: Array.isArray(action.steps) ? action.steps.filter((s: unknown) => typeof s === "string") : [],
          latex: typeof action.latex === "string" ? action.latex : undefined,
          problema: typeof action.problema === "string" ? action.problema : undefined,
          // PR-8 — widget visual opcional (vem do backend quando o enunciado
          // contém geometria 3D ou função plotável).
          visual:
            action.visual && typeof action.visual === "object"
              ? (action.visual as MathVisualPayload)
              : undefined,
        };
        setMessages((prev) => {
          const copy = [...prev];
          for (let i = copy.length - 1; i >= 0; i--) {
            if (copy[i].role === "assistant") {
              copy[i] = { ...copy[i], mathResult: payload };
              break;
            }
          }
          return copy;
        });
        break;
      }

      // PR-8 — tool visualizar_geometria_3d → renderiza um GeoGebra inline.
      case "geogebra_render": {
        const tool: "3d" | "2d" = action.tool === "2d" ? "2d" : "3d";
        const validKinds = ["solido", "vetor", "plano", "trigonometria", "circunferencia"] as const;
        const kind =
          typeof action.kind === "string" && (validKinds as readonly string[]).includes(action.kind)
            ? (action.kind as typeof validKinds[number])
            : "solido";
        const visual: MathVisualPayload = {
          kind: "geogebra",
          geometry: { kind, suggestedTool: tool },
          title: typeof action.title === "string" ? action.title : undefined,
          commands: Array.isArray(action.commands)
            ? action.commands.filter((c: unknown): c is string => typeof c === "string")
            : undefined,
        };
        setMessages((prev) => {
          const copy = [...prev];
          for (let i = copy.length - 1; i >= 0; i--) {
            if (copy[i].role === "assistant") {
              copy[i] = { ...copy[i], visual };
              break;
            }
          }
          return copy;
        });
        showNotif({
          icon: <Sparkles className="w-5 h-5 flex-shrink-0" />,
          text: tool === "3d" ? "🧊 Visualização 3D" : "📐 Visualização 2D",
          sub: typeof action.title === "string" ? action.title : undefined,
        });
        break;
      }

      // PR-8 — tool plotar_funcao → renderiza um function-plot inline.
      case "function_plot": {
        const expr = typeof action.expr === "string" ? action.expr : "";
        if (!expr) break;
        const visual: MathVisualPayload = {
          kind: "function-plot",
          plot: {
            expr,
            varName: typeof action.varName === "string" ? action.varName : "x",
            xMin: typeof action.xMin === "number" ? action.xMin : -10,
            xMax: typeof action.xMax === "number" ? action.xMax : 10,
          },
          title: typeof action.title === "string" ? action.title : undefined,
        };
        setMessages((prev) => {
          const copy = [...prev];
          for (let i = copy.length - 1; i >= 0; i--) {
            if (copy[i].role === "assistant") {
              copy[i] = { ...copy[i], visual };
              break;
            }
          }
          return copy;
        });
        showNotif({
          icon: <Sparkles className="w-5 h-5 flex-shrink-0" />,
          text: "📈 Gráfico gerado",
          sub: typeof action.title === "string" ? action.title : `f(x) = ${expr}`,
        });
        break;
      }

      // PR-4 — fontes RAG multi-fonte (notif sutil; bubble fica com texto + [Fonte N]).
      case "fontes_externas": {
        const n = Array.isArray(action.sources) ? action.sources.length : 0;
        if (n > 0) {
          showNotif({
            icon: <BookOpen className="w-5 h-5 flex-shrink-0" />,
            text: `📚 ${n} fonte${n > 1 ? "s" : ""} verificada${n > 1 ? "s" : ""}`,
            sub: typeof action.query === "string" ? `"${action.query}"` : undefined,
          });
        }
        break;
      }

      // Vídeos educacionais YouTube (embed-only, youtube-nocookie).
      // Anexa 1-3 vídeos de canais brasileiros confiáveis à última msg
      // do assistente — render é lazy via <VideoStrip />.
      case "video_recomendado": {
        const incoming = Array.isArray(action.videos) ? action.videos : [];
        const cleaned: VideoStripVideo[] = incoming
          .filter((v: any) => v && typeof v.videoId === "string" && v.videoId.length > 0)
          .map((v: any) => ({
            videoId: String(v.videoId),
            title: typeof v.title === "string" ? v.title : undefined,
            channelId: typeof v.channelId === "string" ? v.channelId : undefined,
            channelName: typeof v.channelName === "string" ? v.channelName : undefined,
            thumbnailUrl: typeof v.thumbnailUrl === "string" ? v.thumbnailUrl : undefined,
            publishedAt: typeof v.publishedAt === "string" ? v.publishedAt : undefined,
            durationSeconds:
              typeof v.durationSeconds === "number" ? v.durationSeconds : undefined,
            embedUrl: typeof v.embedUrl === "string" ? v.embedUrl : undefined,
            watchUrl: typeof v.watchUrl === "string" ? v.watchUrl : undefined,
          }));
        if (cleaned.length === 0) break;
        const topico = typeof action.topico === "string" ? action.topico : undefined;
        setMessages((prev) => {
          const copy = [...prev];
          for (let i = copy.length - 1; i >= 0; i--) {
            if (copy[i].role === "assistant") {
              copy[i] = { ...copy[i], videos: cleaned, videoTopico: topico };
              break;
            }
          }
          return copy;
        });
        showNotif({
          icon: <Sparkles className="w-5 h-5 flex-shrink-0" />,
          text: `📺 ${cleaned.length} vídeo${cleaned.length > 1 ? "s" : ""} recomendado${cleaned.length > 1 ? "s" : ""}`,
          sub: topico ? `"${topico}"` : undefined,
        });
        break;
      }

      case "criar_slides":
        if (action.html || action.formato === "html_completo") {
          localStorage.setItem("tiagao_slides_criados", JSON.stringify({ html: action.html, titulo: action.titulo, formato: "html_completo" }));
          window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_slides_criados" } }));
        } else if (action.slides) {
          localStorage.setItem("tiagao_slides_criados", JSON.stringify(action.slides));
          window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_slides_criados" } }));
        }
        showNotif({
          icon: <Presentation className="w-5 h-5 flex-shrink-0" />,
          text: `📚 Material criado!`,
          sub: action.titulo ? `"${action.titulo}"` : undefined,
          path: "/notebook",
        });
        setTimeout(() => navigate("/notebook"), 800);
        break;

      case "criar_prova":
        if (action.prova) {
          localStorage.setItem("tiagao_prova_criada", JSON.stringify(action.prova));
          window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_prova_criada" } }));
          setMessages(prev => [...prev, { role: "assistant", content: "", prova: action.prova }]);
        }
        showNotif({
          icon: <FileText className="w-5 h-5 flex-shrink-0" />,
          text: `📝 Prova criada e salva!`,
          sub: action.titulo ? `"${action.titulo}"` : undefined,
          path: "/notebook",
        });
        break;

      case "criar_plano_estudos": {
        const paramStr = typeof action.param === "string" ? action.param.trim() : "";
        const tituloStr = typeof action.titulo === "string" ? action.titulo.trim() : "";
        const topicoStr = typeof action.topico === "string" ? action.topico.trim() : "";
        const topic = paramStr || tituloStr || topicoStr;
        // Antes gravávamos em `tiagao_resumo`, o que fazia o Notebook abrir o
        // plano como "material" na próxima visita. Movemos para
        // `tiagao_plano_html` (read-only por enquanto); o backend já persiste
        // em `notebook_artifacts`.
        if (action.html || action.formato === "html_completo") {
          try {
            localStorage.setItem(
              "tiagao_plano_html",
              JSON.stringify({
                html: action.html,
                topico: action.titulo ?? action.topico,
                formato: "html_completo",
              }),
            );
          } catch { /* ignore quota / private mode */ }
        }
        navigate("/app");
        window.setTimeout(() => {
          triggerProfessorAction("criar_plano", topic || "Plano de estudos personalizado (com o Tiagão)");
        }, 650);
        showNotif({
          icon: <CalendarDays className="w-5 h-5 flex-shrink-0" />,
          text: `📅 Abrindo gerador de plano de estudos`,
          sub: topic ? `"${topic}"` : undefined,
          path: "/app",
        });
        break;
      }

      case "criar_mapa_mental":
        // Página dedicada `/mapa-mental` é a destinatária canónica; o
        // dispatch `tiagao_artifact` segue para retro-compat com qualquer
        // listener antigo (ex.: Notebook RAG legacy).
        if (action.mapa) {
          localStorage.setItem("tiagao_mapa_mental", JSON.stringify(action.mapa));
          window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_mapa_mental" } }));
        }
        showNotif({
          icon: <Network className="w-5 h-5 flex-shrink-0" />,
          text: `🗺️ Mapa mental criado!`,
          sub: action.titulo ? `"${action.titulo}"` : undefined,
          path: "/mapa-mental",
        });
        setTimeout(() => navigate("/mapa-mental"), 800);
        break;

      case "criar_video": {
        if (action.video_url) {
          localStorage.setItem("tiagao_video", JSON.stringify({
            url: action.video_url,
            titulo: action.titulo,
            formato: action.formato,
            duration_sec: action.duration_sec,
          }));
          window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_video" } }));
          setMessages(prev => [...prev, {
            role: "assistant",
            content: "",
            video: { url: action.video_url, titulo: action.titulo, formato: action.formato },
          } as any]);
        }
        showNotif({
          icon: <Presentation className="w-5 h-5 flex-shrink-0" />,
          text: `🎬 Vídeo criado!`,
          sub: action.titulo ? `"${action.titulo}" • ${action.usado_hoje}/${action.limite_diario} hoje` : undefined,
          path: "/notebook",
        });
        break;
      }

      case "video_limit_reached":
        showNotif({
          icon: <FileText className="w-5 h-5 flex-shrink-0" />,
          text: `⏳ Limite diário de vídeos atingido (${action.used}/${action.limit})`,
          sub: "Volta amanhã ou faça upgrade Premium",
        });
        break;

      case "criar_infografico": {
        if (action.html || action.formato === "html_completo") {
          localStorage.setItem("tiagao_resumo", JSON.stringify({ html: action.html, topico: action.topico, formato: "html_completo" }));
          window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_resumo" } }));
        } else {
          const infoPayload = action.infografico ?? action.brief;
          if (infoPayload) {
            localStorage.setItem("tiagao_infografico", JSON.stringify(infoPayload));
            window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_infografico" } }));
          }
        }
        showNotif({
          icon: <BarChart3 className="w-5 h-5 flex-shrink-0" />,
          text: `📊 Infográfico criado!`,
          sub: action.topico ? `"${action.topico}"` : undefined,
          path: "/notebook",
        });
        setTimeout(() => navigate("/notebook"), 800);
        break;
      }

      case "criar_resumo":
        if (action.html || action.formato === "html_completo") {
          localStorage.setItem("tiagao_resumo", JSON.stringify({ html: action.html, topico: action.topico, formato: "html_completo" }));
          window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_resumo" } }));
        } else if (action.resumo) {
          localStorage.setItem("tiagao_resumo", JSON.stringify(action.resumo));
          window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_resumo" } }));
        }
        showNotif({
          icon: <ScrollText className="w-5 h-5 flex-shrink-0" />,
          text: `📄 Resumo criado!`,
          sub: action.topico ?? action.titulo ? `"${action.topico ?? action.titulo}"` : undefined,
          path: "/notebook",
        });
        setTimeout(() => navigate("/notebook"), 800);
        break;

      case "busca_docs":
        showNotif({
          icon: <CheckCircle2 className="w-5 h-5 flex-shrink-0" />,
          text: `🔍 Busca concluída`,
          sub: action.encontrados ? `${action.encontrados} resultado(s) encontrado(s)` : undefined,
        });
        break;

      case "agenda_criada":
        try {
          localStorage.setItem(
            "tiagao_agenda_hoje",
            JSON.stringify(action.agenda ?? action),
          );
        } catch { /* ignore */ }
        showNotif({
          icon: <CalendarDays className="w-5 h-5 flex-shrink-0" />,
          text: "🗓️ Agenda do dia criada!",
          sub: action.titulo ? `"${action.titulo}"` : undefined,
          path: "/cronograma",
        });
        setTimeout(() => navigate("/cronograma"), 800);
        break;

      case "correcao_redacao":
        try {
          localStorage.setItem(
            "tiagao_redacao_correcao",
            JSON.stringify(action.correcao ?? action),
          );
        } catch { /* ignore */ }
        showNotif({
          icon: <ScrollText className="w-5 h-5 flex-shrink-0" />,
          text: "✍️ Redação corrigida!",
          sub: action.tema ? `"${action.tema}"` : action.titulo ? `"${action.titulo}"` : undefined,
          path: "/redacao",
        });
        setTimeout(() => navigate("/redacao"), 800);
        break;

      case "exportar_pdf":
        showNotif({
          icon: <FileText className="w-5 h-5 flex-shrink-0" />,
          text: "📄 PDF pronto!",
          sub: action.titulo,
        });
        break;

      case "lembrete_agendado":
        showNotif({
          icon: <CalendarDays className="w-5 h-5 flex-shrink-0" />,
          text: "⏰ Lembrete agendado!",
          sub: action.titulo ?? action.quando,
        });
        break;

      case "email_enviado":
        showNotif({
          icon: <CheckCircle2 className="w-5 h-5 flex-shrink-0" />,
          text: "📧 E-mail enviado!",
          sub: action.assunto ?? action.para,
        });
        break;

      case "whatsapp_enviado":
        showNotif({
          icon: <CheckCircle2 className="w-5 h-5 flex-shrink-0" />,
          text: "💬 WhatsApp enviado!",
          sub: action.para,
        });
        break;

      case "info":
        // Ignorado silenciosamente — payload sem efeito útil de UI/rota.
        break;

      default:
        break;
    }
  }, [navigate]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsStreaming(true);
    setTimeout(() => scrollToBottom(), 50);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages([...updated, assistantMsg]);

    try {
      abortRef.current = new AbortController();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: updated,
          contexto: {
            aluno: plan.aluno,
            serie,
            materia: plan.materia,
            resumo: plan.resumoDoConteudo,
            diaAtual,
            topicosAtual,
            topicosCompletos,
            totalTopicos,
          },
        }),
      });

      if (!res.ok) {
        let detail = "";
        try {
          const errBody = await res.json() as { _debug?: string };
          if (import.meta.env.DEV && typeof errBody?._debug === "string") {
            detail = `: ${String(errBody._debug).slice(0, 500)}`;
          }
        } catch { /* ignore */ }
        throw new Error(`Erro do servidor (${res.status})${detail}`);
      }

      if (!res.body) throw new Error("Sem corpo na resposta");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullText += parsed.text;
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                copy[copy.length - 1] = { ...last, role: "assistant", content: fullText };
                return copy;
              });
              scrollToBottom();
            }
            if (parsed.action) {
              handleAction(parsed.action);
            }
            // PR-2 — meta interna (método + sentimento detectado). Não exibimos
            // ao aluno, só anexamos à última mensagem do assistant para o
            // avatar/UI reagir (e debug via React DevTools).
            if (parsed.tiagao_meta && typeof parsed.tiagao_meta === "object") {
              const meta = parsed.tiagao_meta as TiagaoMeta;
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant") {
                  copy[copy.length - 1] = { ...last, tiagao_meta: meta };
                }
                return copy;
              });
              if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.debug("[Tiagão] meta:", meta);
              }
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: "Ops, tive um problema de conexão. Tente novamente! 🔄",
          };
          return copy;
        });
      }
    } finally {
      setIsStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center",
          "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white",
          isOpen && "hidden"
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", delay: 0.5 }}
      >
        <MessageCircle className="w-7 h-7" />
        {hasUnread && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"
          />
        )}
      </motion.button>

      {/* Action notification banner */}
      <AnimatePresence>
        {actionNotif && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-28 right-6 z-[60] flex items-center gap-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-2xl px-4 py-3 shadow-2xl max-w-[320px]"
          >
            {actionNotif.icon}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold leading-tight">{actionNotif.text}</p>
              {actionNotif.sub && (
                <p className="text-white/80 text-xs truncate">{actionNotif.sub}</p>
              )}
            </div>
            {actionNotif.path && (
              <button
                onClick={() => { setActionNotif(null); navigate(actionNotif.path!); }}
                className="flex items-center gap-1 text-xs font-bold bg-white/20 hover:bg-white/30 rounded-xl px-3 py-1.5 transition-colors flex-shrink-0"
              >
                <ExternalLink className="w-3 h-3" />
                Ver
              </button>
            )}
            <button
              onClick={() => setActionNotif(null)}
              className="p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] h-[600px] max-h-[82vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border bg-[#f8f8fc]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-sm leading-tight">Tutor IA</p>
                <p className="text-white/75 text-xs truncate">{plan.materia}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-white/80 text-xs">Online</span>
              </div>
              {messages.length > 1 && (
                <button
                  onClick={clearHistory}
                  title="Limpar conversa"
                  className="p-1.5 rounded-full hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress bar */}
            {totalTopicos && totalTopicos > 0 && (
              <div className="px-4 py-2 bg-white border-b border-border flex items-center gap-3">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {topicosCompletos || 0}/{totalTopicos} tópicos
                </span>
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round(((topicosCompletos || 0) / totalTopicos) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-primary">
                  {Math.round(((topicosCompletos || 0) / totalTopicos) * 100)}%
                </span>
              </div>
            )}

            {/* Messages */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
            >
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {isStreaming && messages[messages.length - 1]?.content === "" && (
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-border rounded-2xl rounded-bl-sm shadow-sm">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            <AnimatePresence>
              {showScrollBtn && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => scrollToBottom()}
                  className="absolute bottom-24 right-6 w-8 h-8 bg-white border border-border rounded-full shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Quick actions — shown only at the start */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {QUICK_ACTIONS.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => sendMessage(label)}
                    disabled={isStreaming}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-border text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-4 pt-2 bg-white border-t border-border">
              <div className="flex items-end gap-2 bg-secondary rounded-2xl px-4 py-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte ou peça qualquer coisa..."
                  disabled={isStreaming}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none leading-relaxed py-1 max-h-[100px] disabled:opacity-50"
                  style={{ height: "auto" }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isStreaming}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white transition-opacity disabled:opacity-40 hover:opacity-90 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2">
                Enter para enviar · Shift+Enter nova linha
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
