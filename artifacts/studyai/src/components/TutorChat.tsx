import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StudyPlan } from "@/hooks/use-study-plan";

interface Message {
  role: "user" | "assistant";
  content: string;
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

const QUICK_ACTIONS = [
  { label: "Me explica o conteúdo de hoje", icon: BookOpen },
  { label: "Me faz uma questão de prova", icon: Zap },
  { label: "Cria flashcards para revisar", icon: Brain },
  { label: "Cria slides do que estudei", icon: Presentation },
  { label: "Monta um plano de estudos", icon: CalendarDays },
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
  const isUser = message.role === "user";
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
        {message.content.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            {i < message.content.split("\n").length - 1 && <br />}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

const MAX_STORED_MESSAGES = 40;

export function TutorChat({ plan, serie, diaAtual, topicosCompletos, totalTopicos, topicosAtual }: TutorChatProps) {
  const [, navigate] = useLocation();
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

  // ── Persistent conversation memory (survives page navigation) ───────────────
  const storageKey = `tiagao_chat_${plan.materia?.replace(/\s+/g, "_").toLowerCase() ?? "geral"}`;

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  });

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
    if (isOpen && messages.length === 0) {
      const greeting: Message = {
        role: "assistant",
        content: `Olá, ${plan.aluno}! 👋 Sou seu Tutor IA — estou aqui para te ajudar a dominar **${plan.materia}** e arrasar na prova! 🎯\n\nPosso explicar qualquer coisa, criar flashcards, slides, provas, mapas mentais, plano de estudos e muito mais. Lembro de tudo que conversamos! 🧠`,
      };
      setMessages([greeting]);
    }
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

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

    switch (action.type) {
      case "ir":
        setTimeout(() => navigate(action.param ?? "/app"), 600);
        break;

      case "navegar":
        setTimeout(() => navigate(action.path ?? "/app"), 700);
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

      case "criar_slides":
        if (action.slides) {
          localStorage.setItem("tiagao_slides_criados", JSON.stringify(action.slides));
          window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_slides_criados" } }));
        }
        showNotif({
          icon: <Presentation className="w-5 h-5 flex-shrink-0" />,
          text: `🎨 Apresentação criada!`,
          sub: action.titulo ? `"${action.titulo}"` : undefined,
          path: "/notebook",
        });
        setTimeout(() => navigate("/notebook"), 2000);
        break;

      case "criar_prova":
        if (action.prova) {
          localStorage.setItem("tiagao_prova_criada", JSON.stringify(action.prova));
          window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_prova_criada" } }));
        }
        showNotif({
          icon: <FileText className="w-5 h-5 flex-shrink-0" />,
          text: `📝 Prova criada e salva!`,
          sub: action.titulo ? `"${action.titulo}"` : undefined,
          path: "/notebook",
        });
        break;

      case "criar_plano_estudos":
        showNotif({
          icon: <CalendarDays className="w-5 h-5 flex-shrink-0" />,
          text: `📅 Plano de estudos criado!`,
          sub: action.titulo ? `"${action.titulo}"` : undefined,
          path: "/cronograma",
        });
        break;

      case "criar_mapa_mental":
        if (action.mapa) {
          localStorage.setItem("tiagao_mapa_mental", JSON.stringify(action.mapa));
          window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_mapa_mental" } }));
        }
        showNotif({
          icon: <Network className="w-5 h-5 flex-shrink-0" />,
          text: `🗺️ Mapa mental criado!`,
          sub: action.titulo ? `"${action.titulo}"` : undefined,
          path: "/notebook",
        });
        break;

      case "criar_infografico":
        if (action.infografico) {
          localStorage.setItem("tiagao_infografico", JSON.stringify(action.infografico));
          window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_infografico" } }));
        }
        showNotif({
          icon: <BarChart3 className="w-5 h-5 flex-shrink-0" />,
          text: `📊 Infográfico criado!`,
          sub: action.titulo ? `"${action.titulo}"` : undefined,
          path: "/notebook",
        });
        break;

      case "criar_resumo":
        if (action.resumo) {
          localStorage.setItem("tiagao_resumo", JSON.stringify(action.resumo));
          window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_resumo" } }));
        }
        showNotif({
          icon: <ScrollText className="w-5 h-5 flex-shrink-0" />,
          text: `📄 Resumo criado!`,
          sub: action.titulo ? `"${action.titulo}"` : undefined,
          path: "/notebook",
        });
        break;

      case "busca_docs":
        showNotif({
          icon: <CheckCircle2 className="w-5 h-5 flex-shrink-0" />,
          text: `🔍 Busca concluída`,
          sub: action.encontrados ? `${action.encontrados} resultado(s) encontrado(s)` : undefined,
        });
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
                copy[copy.length - 1] = { role: "assistant", content: fullText };
                return copy;
              });
              scrollToBottom();
            }
            if (parsed.action) {
              handleAction(parsed.action);
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
