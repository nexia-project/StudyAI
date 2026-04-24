/**
 * Professor Tiagão V3.0
 * ─────────────────────────────────────────────────────────────────────────────
 * Melhorias V3:
 *  • Histórico de conversa completo (scroll)
 *  • Seleção de microfone (device selector)
 *  • Visualizador de volume real-time (VAD)
 *  • Modo voz pura (sem texto, só avatar)
 *  • Comandos rápidos clicáveis
 *  • Tabs: Conversa / Comandos / Config
 *  • Retry automático em erro
 *  • Melhor tratamento de permissões
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TiagaoCharacter, type CharacterState } from "@/components/TiagaoCharacter";
import {
  Mic, MicOff, X, Square, VolumeX, Volume2, ThumbsUp, ThumbsDown,
  Timer, Maximize2, Minimize2, Send, Camera, Loader2, MessageSquare,
  Zap, Settings, RefreshCw, ChevronDown, Radio, Eye, EyeOff,
  RotateCcw, Trash2,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  collectStudentContext,
  triggerProfessorAction,
  type ProfessorProactiveDetail,
  type ProfessorBehaviorDetail,
} from "@/lib/professor-events";
import { useAudioCapture } from "@/hooks/useAudioCapture";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
const IDLE_TRIGGER_MS    = 3 * 60 * 1000;
const PROACTIVE_MIN_GAP  = 8 * 60 * 1000;
const CHECK_INTERVAL     = 30 * 1000;

// ─── Shared AudioContext ──────────────────────────────────────────────────────
let _ctx: AudioContext | null = null;
let _currentSource: AudioBufferSourceNode | null = null;
let _isAudioUnlocked = false;

function unlockAudioSync(): void {
  if (_isAudioUnlocked) return;
  try {
    _ctx = new AudioContext();
    _isAudioUnlocked = true;
    const buf = _ctx.createBuffer(1, 1, _ctx.sampleRate);
    const src = _ctx.createBufferSource();
    src.buffer = buf; src.connect(_ctx.destination); src.start(0);
  } catch (e) { console.warn("[Tiagão] AudioContext unlock failed:", e); }
}
function getCtx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  return _ctx;
}
function stopCurrentAudio() {
  try { _currentSource?.stop(); } catch { /* already stopped */ }
  _currentSource = null;
}
async function playTTS(text: string, onStart?: () => void, signal?: AbortSignal): Promise<void> {
  if (!text.trim()) return;
  stopCurrentAudio();
  const ctx = getCtx();
  if (ctx.state === "suspended") { try { await ctx.resume(); } catch { /* best-effort */ } }
  if (ctx.state !== "running") return;
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/voice-tts`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }), credentials: "include", signal,
    });
  } catch (e: any) {
    if (e?.name !== "AbortError") console.warn("[Tiagão] TTS fetch error:", e);
    return;
  }
  if (signal?.aborted || !res.ok) return;
  const ab = await res.arrayBuffer();
  if (signal?.aborted) return;
  let audioBuffer: AudioBuffer;
  try { audioBuffer = await ctx.decodeAudioData(ab); } catch (e) {
    console.warn("[Tiagão] decodeAudioData failed:", e); return;
  }
  if (signal?.aborted) return;
  await new Promise<void>((resolve) => {
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer; src.connect(ctx.destination);
    src.onended = () => resolve(); _currentSource = src;
    onStart?.(); src.start(0);
  });
  _currentSource = null;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "idle" | "listening" | "thinking" | "speaking";
type Tab = "conversa" | "comandos" | "config";

interface HistoryMsg {
  role: "user" | "assistant";
  text: string;
  ts: number;
}

// ─── Quick commands by context ────────────────────────────────────────────────
const QUICK_COMMANDS = [
  { label: "📅 Meu plano hoje",      text: "Qual é meu plano de estudos para hoje?" },
  { label: "⚡ Simulado rápido",      text: "Quero fazer um simulado rápido agora." },
  { label: "📖 Explicar matéria",     text: "Me explica a matéria mais difícil pra mim." },
  { label: "🃏 Criar flashcards",     text: "Cria flashcards do que estudei hoje." },
  { label: "📊 Meu desempenho",       text: "Como está meu desempenho geral?" },
  { label: "🎯 Dica de estudo",       text: "Me dá uma dica de estudo pra agora." },
  { label: "📝 Corrigir redação",     text: "Quero corrigir uma redação." },
  { label: "🏆 Meu ranking",          text: "Como estou no ranking?" },
  { label: "🔥 Streak",               text: "Qual é meu streak atual?" },
  { label: "📚 Abrir notebook",       text: "Abre o notebook pra mim." },
];

// ─── Volume visualizer component ──────────────────────────────────────────────
function VolumeBar({ level }: { level: number }) {
  const bars = 9;
  return (
    <div className="flex items-end justify-center gap-0.5 h-6">
      {Array.from({ length: bars }, (_, i) => {
        const threshold = (i / bars) * 100;
        const active = level >= threshold;
        return (
          <motion.div
            key={i}
            animate={{ height: active ? `${8 + i * 2}px` : "3px" }}
            transition={{ duration: 0.08, ease: "easeOut" }}
            className={`w-1.5 rounded-full transition-colors duration-75 ${
              active
                ? level > 70 ? "bg-emerald-400" : level > 40 ? "bg-indigo-400" : "bg-indigo-300"
                : "bg-slate-200"
            }`}
          />
        );
      })}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function VoiceProfessor() {
  const [, navigate] = useLocation();
  const [open, setOpen]           = useState(false);
  const [tab, setTab]             = useState<Tab>("conversa");
  const [phase, setPhase]         = useState<Phase>("idle");
  const [muted, setMuted]         = useState(false);
  const [voicePure, setVoicePure] = useState(false); // Modo voz pura
  const [showHint, setShowHint]   = useState(true);
  const [textInput, setTextInput] = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [reaction, setReaction]   = useState<"up" | "down" | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [actionNotif, setActionNotif] = useState<{ text: string; path?: string } | null>(null);
  const [history, setHistory]     = useState<HistoryMsg[]>([]);
  const [volume, setVolume]       = useState(0);
  const [analisandoImagem, setAnalisandoImagem] = useState(false);
  const [retrying, setRetrying]   = useState(false);
  const [sessionMsgs, setSessionMsgs] = useState(0);

  const mutedRef        = useRef(false);
  const abortRef        = useRef<AbortController | null>(null);
  const recognitionRef  = useRef<any>(null);
  const historyRef      = useRef<Array<{ role: string; content: string }>>([]);
  const lastProactiveRef    = useRef<number>(0);
  const lastUserActivityRef = useRef<number>(Date.now());
  const greetedRef      = useRef(false);
  const proactiveTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const focusTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef      = useRef<HTMLDivElement>(null);
  const cameraInputRef  = useRef<HTMLInputElement>(null);

  const hasSpeechInput = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // ── Audio capture (VAD + devices + Whisper fallback) ───────────────────────
  const audioCapture = useAudioCapture({
    onVolume: setVolume,
    onSpeechStart: () => {
      // VAD detected speech — switch to listening phase
      if (!hasSpeechInput) setPhase("listening");
    },
    onSpeechEnd: async (blob) => {
      // When SpeechRecognition is unavailable, send blob to Whisper
      if (hasSpeechInput) return; // SpeechRecognition handles this
      setPhase("thinking");
      try {
        const form = new FormData();
        form.append("audio", blob, "recording.webm");
        const r = await fetch(`${BASE_URL}/api/transcribe`, { method: "POST", body: form, credentials: "include" });
        if (r.ok) {
          const { text } = await r.json();
          if (text?.trim()) sendMessage(text);
        } else {
          setPhase("idle");
        }
      } catch {
        setPhase("idle");
        setError("Não consegui transcrever o áudio.");
      }
    },
    onError: (msg) => setError(msg),
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const fmtFocusTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (focusMode) {
      setFocusSeconds(0);
      focusTimerRef.current = setInterval(() => setFocusSeconds(s => s + 1), 1000);
    } else {
      if (focusTimerRef.current) clearInterval(focusTimerRef.current);
    }
    return () => { if (focusTimerRef.current) clearInterval(focusTimerRef.current); };
  }, [focusMode]);

  // Auto-scroll conversation
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // ── speak ───────────────────────────────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    if (mutedRef.current || !text.trim()) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setPhase("thinking"); setError(null);
    try {
      await playTTS(text, () => setPhase("speaking"), abortRef.current.signal);
    } catch { /* aborted or error */ }
    setPhase("idle");
  }, []);

  const stopSpeaking = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopCurrentAudio();
    setPhase("idle");
  }, []);

  // ── Handle agent actions ────────────────────────────────────────────────────
  const handleAgentActions = useCallback((
    action: Record<string, any> | null | undefined,
    notifications: Record<string, any>[]
  ) => {
    if (!action) return;
    if (action.type === "ir") setTimeout(() => navigate(action.param), 600);
    else if (action.type === "criar_plano") triggerProfessorAction("criar_plano", action.param);
    else if (action.type === "navegar") setTimeout(() => navigate(action.path ?? "/app"), 700);
    else if (action.type === "abrir_aula_ia") {
      localStorage.setItem("tiagao_aula_topico", action.topico ?? "");
      localStorage.setItem("tiagao_aula_estilo", action.estilo ?? "ENEM");
      setTimeout(() => navigate("/aula-ia"), 700);
    } else if (action.type === "flashcards_criados") {
      setActionNotif({ text: `✅ ${action.quantidade} flashcards criados sobre "${action.topico}"`, path: "/app" });
      setTimeout(() => setActionNotif(null), 6000);
    } else if (action.type === "criar_slides") {
      setActionNotif({ text: `🎨 Slides "${action.titulo}" criados! Abrindo Notebook...`, path: "/notebook" });
      setTimeout(() => setActionNotif(null), 8000);
      if (action.slides) {
        localStorage.setItem("tiagao_slides_criados", JSON.stringify(action.slides));
        setTimeout(() => navigate("/notebook"), 1500);
      }
    } else if (action.type === "criar_prova") {
      setActionNotif({ text: `📝 Prova "${action.titulo}" criada! Salva no Notebook.`, path: "/notebook" });
      setTimeout(() => setActionNotif(null), 8000);
      if (action.prova) {
        localStorage.setItem("tiagao_prova_criada", JSON.stringify(action.prova));
      }
    } else if (action.type === "criar_plano_estudos") {
      setActionNotif({ text: `📅 Plano "${action.titulo}" criado! Ver no Cronograma.`, path: "/cronograma" });
      setTimeout(() => setActionNotif(null), 8000);
    } else if (action.type === "busca_docs") {
      setActionNotif({ text: `🔍 Encontrado nos seus documentos.`, path: "/notebook" });
      setTimeout(() => setActionNotif(null), 5000);
    }
    for (const notif of notifications) {
      if (notif.type === "flashcards_criados") {
        setActionNotif({ text: `✅ ${notif.quantidade} flashcards criados sobre "${notif.topico}"`, path: "/app" });
        setTimeout(() => setActionNotif(null), 6000);
      }
    }
  }, [navigate]);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (userText: string, isRetry = false) => {
    if (!userText.trim()) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setPhase("thinking"); setError(null); setRetrying(false);

    if (!isRetry) {
      historyRef.current.push({ role: "user", content: userText });
      setHistory(h => [...h, { role: "user", text: userText, ts: Date.now() }]);
      setSessionMsgs(n => n + 1);
    }

    try {
      const res = await fetch(`${BASE_URL}/api/voice-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyRef.current.slice(-20),
          context: collectStudentContext(),
        }),
        credentials: "include",
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const { text, action, notifications } = await res.json();
      historyRef.current.push({ role: "assistant", content: text || "" });
      lastProactiveRef.current = Date.now();
      setReaction(null);
      setHistory(h => [...h, { role: "assistant", text: text || "...", ts: Date.now() }]);
      handleAgentActions(action, notifications ?? []);
      if (!voicePure) {
        // Auto-switch to conversa tab if not there
        setTab("conversa");
      }
      await speak(text || "");
    } catch (e: any) {
      setPhase("idle");
      if (e?.name !== "AbortError") {
        setError("Não consegui responder. Tente de novo.");
        setRetrying(true);
      }
    }
  }, [speak, handleAgentActions, voicePure]);

  // ── Proactive ───────────────────────────────────────────────────────────────
  const runProactive = useCallback(async (triggerReason?: string) => {
    if (phase !== "idle" || mutedRef.current) return;
    if (Date.now() - lastProactiveRef.current < PROACTIVE_MIN_GAP) return;
    const context = collectStudentContext();
    const lastMsg = [...historyRef.current].reverse().find(m => m.role === "assistant");
    if (lastMsg) context.ultimaMensagem = lastMsg.content.slice(0, 100);
    const idleMs = Date.now() - lastUserActivityRef.current;
    try {
      const res = await fetch(`${BASE_URL}/api/voice-proactive`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, triggerReason: triggerReason || "idle", idleMs }),
        credentials: "include",
      });
      if (!res.ok) return;
      const { message, action, notifications } = await res.json();
      if (!message) return;
      historyRef.current.push({ role: "assistant", content: message });
      lastProactiveRef.current = Date.now();
      setHistory(h => [...h, { role: "assistant", text: message, ts: Date.now() }]);
      setReaction(null);
      handleAgentActions(action, notifications ?? []);
      await speak(message);
    } catch { /* ignore */ }
  }, [phase, speak, handleAgentActions]);

  // ── Camera / Gemini ─────────────────────────────────────────────────────────
  const analisarImagem = useCallback(async (file: File) => {
    setAnalisandoImagem(true);
    try {
      const form = new FormData();
      form.append("imagem", file);
      if (textInput.trim()) form.append("pergunta", textInput.trim());
      const r = await fetch(`${BASE_URL}/api/gemini/analisar-problema`, { method: "POST", body: form });
      if (r.ok) {
        const { resposta } = await r.json();
        if (resposta) sendMessage(`📸 [Analisei a imagem] ${resposta}`);
        setTextInput("");
      }
    } catch { /* silent */ }
    finally { setAnalisandoImagem(false); }
  }, [textInput, sendMessage]);

  // ── Events from app ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { text } = (e as CustomEvent<ProfessorProactiveDetail>).detail;
      if (!text || mutedRef.current) return;
      historyRef.current.push({ role: "assistant", content: text });
      lastProactiveRef.current = Date.now();
      setHistory(h => [...h, { role: "assistant", text, ts: Date.now() }]);
      setReaction(null); speak(text);
    };
    window.addEventListener("professor:proactive", handler);
    return () => window.removeEventListener("professor:proactive", handler);
  }, [speak]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { reason } = (e as CustomEvent<ProfessorBehaviorDetail>).detail;
      if (mutedRef.current) return;
      lastUserActivityRef.current = Date.now();
      setTimeout(() => runProactive(reason), 1500);
    };
    window.addEventListener("professor:behavior", handler);
    return () => window.removeEventListener("professor:behavior", handler);
  }, [runProactive]);

  // ── Activity tracking ───────────────────────────────────────────────────────
  useEffect(() => {
    const record = () => { lastUserActivityRef.current = Date.now(); };
    window.addEventListener("click", record, { passive: true });
    window.addEventListener("keydown", record, { passive: true });
    window.addEventListener("scroll", record, { passive: true });
    window.addEventListener("touchstart", record, { passive: true });
    const handleVis = () => {
      if (document.visibilityState === "visible") {
        const away = Date.now() - lastUserActivityRef.current;
        if (away > 5 * 60 * 1000) {
          lastUserActivityRef.current = Date.now();
          setTimeout(() => runProactive("page_return"), 2000);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVis);
    proactiveTimerRef.current = setInterval(() => {
      const idleMs = Date.now() - lastUserActivityRef.current;
      if (idleMs >= IDLE_TRIGGER_MS) runProactive("idle");
    }, CHECK_INTERVAL);
    return () => {
      window.removeEventListener("click", record);
      window.removeEventListener("keydown", record);
      window.removeEventListener("scroll", record);
      window.removeEventListener("touchstart", record);
      document.removeEventListener("visibilitychange", handleVis);
      if (proactiveTimerRef.current) clearInterval(proactiveTimerRef.current);
    };
  }, [runProactive]);

  // ── First open — unlock audio + greet ──────────────────────────────────────
  const handlePanelToggle = useCallback(() => {
    setShowHint(false);
    setOpen(o => {
      const next = !o;
      if (next && !greetedRef.current) {
        greetedRef.current = true;
        unlockAudioSync();
        // Start volume capture for VAD visualization
        audioCapture.start().catch(() => { /* silencioso */ });
        const ctx = collectStudentContext();
        const greeting = ctx.nome
          ? `Oi, ${ctx.nome}! Aqui é o Tiagão, seu professor. Pode me chamar quando quiser!`
          : "Oi! Aqui é o Tiagão, seu professor de estudos. Pode me chamar a qualquer hora!";
        historyRef.current.push({ role: "assistant", content: greeting });
        lastProactiveRef.current = Date.now();
        setHistory([{ role: "assistant", text: greeting, ts: Date.now() }]);
        setTimeout(() => speak(greeting), 300);
      }
      if (!next) {
        // Stop VAD when closed
        audioCapture.stop();
        setVolume(0);
      }
      return next;
    });
  }, [speak, audioCapture]);

  // ── Speech recognition ──────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    stopSpeaking();

    // Ativa VAD para visualização de volume (independente do método de STT)
    if (!audioCapture.isRecording) {
      audioCapture.start().catch(() => { /* silencioso */ });
    }

    // ── Fallback: sem SpeechRecognition → usa VAD + Whisper ─────────────────
    if (!hasSpeechInput) {
      // VAD + Whisper — o hook gerencia automaticamente (onSpeechEnd → transcribe)
      const ok = await audioCapture.start();
      if (!ok) return; // Error shown by hook
      setPhase("listening");
      return;
    }

    // ── Primary: SpeechRecognition ───────────────────────────────────────────
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => { setPhase("listening"); };
    rec.onend = () => { if (phase === "listening") setPhase("idle"); };
    rec.onresult = (event: any) => {
      let interim = "", final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t; else interim += t;
      }
      if (final) { setTextInput(""); sendMessage(final); }
      else setTextInput(interim);
    };
    rec.onerror = (e: any) => {
      setPhase("idle");
      if (e.error === "not-allowed" || e.error === "permission-denied") {
        setError("Permissão de microfone negada. Libere nas configurações do navegador.");
        setTab("config");
      } else if (e.error !== "no-speech") {
        setError("Erro no microfone: " + e.error);
      }
    };
    recognitionRef.current = rec;
    rec.start();
  }, [hasSpeechInput, sendMessage, stopSpeaking, phase, audioCapture]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop(); setPhase("idle");
  }, []);

  // ── UI config ───────────────────────────────────────────────────────────────
  const phaseColor: Record<Phase, string> = {
    idle: "#22c55e", listening: "#ef4444", thinking: "#f59e0b", speaking: "#6366f1",
  };
  const phaseLabel: Record<Phase, string> = {
    idle: "Online — pode falar", listening: "Ouvindo você...",
    thinking: "Pensando...", speaking: "Falando...",
  };

  const lastAssistantMsg = [...history].reverse().find(m => m.role === "assistant")?.text || "";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 1.2, type: "spring", damping: 18, stiffness: 280 }}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.92 }}
        onClick={handlePanelToggle}
        className="fixed bottom-20 md:bottom-6 left-4 md:left-6 z-40 select-none"
        style={{ background: "none", border: "none", padding: 0 }}
        title="Professor Tiagão — clique para falar"
      >
        {open ? (
          <div className="w-12 h-12 rounded-full bg-slate-600 shadow-xl flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </div>
        ) : (
          <TiagaoCharacter state={phase as CharacterState} size={88} showLabel={false} className="md:scale-110" />
        )}
      </motion.button>

      {/* Hint tooltip */}
      <AnimatePresence>
        {showHint && !open && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }} transition={{ delay: 2, duration: 0.4 }}
            className="fixed bottom-[5.5rem] md:bottom-8 left-20 z-40 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-xl shadow-lg whitespace-nowrap">
              👆 Toque aqui para falar com o Tiagão
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-2.5 h-2.5 bg-gray-900 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini card while speaking/thinking */}
      <AnimatePresence>
        {!open && (phase === "speaking" || phase === "thinking") && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="fixed bottom-24 left-4 right-4 sm:left-6 sm:right-auto sm:w-80 z-40 bg-white rounded-2xl shadow-xl border border-indigo-100 p-3">
            <div className="flex items-center gap-3">
              <TiagaoCharacter state={phase as CharacterState} size={48} showLabel={false} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-indigo-600 mb-1">Professor Tiagão</p>
                {phase === "thinking"
                  ? <div className="flex gap-1 items-center h-4">
                      {[0,150,300].map(d=><span key={d} className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}}/>)}
                      <span className="text-xs text-gray-400 ml-1">pensando...</span>
                    </div>
                  : <VolumeBar level={60} />
                }
              </div>
              <button onClick={stopSpeaking} className="px-2.5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors">
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action notification toast */}
      <AnimatePresence>
        {actionNotif && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-28 md:bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50">
            <div className="bg-emerald-600 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3">
              <span className="flex-1">{actionNotif.text}</span>
              {actionNotif.path && (
                <button onClick={() => { navigate(actionNotif.path!); setActionNotif(null); }}
                  className="text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors">Ver</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Focus mode overlay */}
      <AnimatePresence>
        {focusMode && open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30" style={{ background: "rgba(5,5,16,0.88)", backdropFilter: "blur(8px)" }} />
        )}
      </AnimatePresence>

      {/* ── MAIN PANEL ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={`fixed z-50 bg-white rounded-3xl shadow-2xl border border-indigo-100 overflow-hidden flex flex-col transition-all duration-300 ${
              focusMode
                ? "inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[520px] sm:max-h-[90vh]"
                : "bottom-[8.5rem] md:bottom-24 left-4 right-4 sm:left-6 sm:right-auto sm:w-[360px] max-h-[70vh]"
            }`}
          >
            {/* ── HEADER ── */}
            <div className="px-4 py-3 flex items-center gap-2.5 flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
              <div className="relative flex-shrink-0">
                <TiagaoCharacter state={phase as CharacterState} size={44} showLabel={false} />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
                  style={{ background: phaseColor[phase] }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm leading-none">Professor Tiagão</p>
                <p className="text-indigo-200 text-[11px] mt-0.5">{phaseLabel[phase]}</p>
                {focusMode && (
                  <span className="inline-flex items-center gap-1 text-indigo-200 text-[10px] bg-white/10 px-2 py-0.5 rounded-full mt-1">
                    <Timer className="w-2.5 h-2.5" /> {fmtFocusTime(focusSeconds)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setVoicePure(v => !v)} title={voicePure ? "Mostrar texto" : "Modo voz pura"}
                  className={`p-1.5 rounded-lg transition-colors ${voicePure ? "text-amber-300 bg-white/15" : "text-white/60 hover:text-white"}`}>
                  {voicePure ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setFocusMode(f => !f)} title={focusMode ? "Sair do foco" : "Modo foco"}
                  className={`p-1.5 rounded-lg transition-colors ${focusMode ? "text-amber-300 bg-white/15" : "text-white/60 hover:text-white"}`}>
                  {focusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setMuted(m => !m)} title={muted ? "Ativar som" : "Silenciar"}
                  className="text-white/60 hover:text-white transition-colors p-1.5">
                  {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button onClick={handlePanelToggle} className="text-white/60 hover:text-white transition-colors p-1.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── TABS ── */}
            <div className="flex bg-slate-50 border-b border-slate-100 flex-shrink-0">
              {([
                { key: "conversa", icon: MessageSquare, label: "Conversa" },
                { key: "comandos", icon: Zap,           label: "Comandos" },
                { key: "config",   icon: Settings,      label: "Config"   },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold transition-all border-b-2 ${
                    tab === t.key
                      ? "border-indigo-500 text-indigo-700 bg-white"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}>
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                  {t.key === "conversa" && history.length > 0 && (
                    <span className="min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center">
                      {Math.min(99, history.length)}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── TAB CONTENT ── */}
            <div className="flex-1 overflow-hidden flex flex-col">

              {/* CONVERSA TAB */}
              {tab === "conversa" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Avatar + last message — shown in voice-pure OR when no history */}
                  {(voicePure || history.length === 0) && (
                    <div className="flex flex-col items-center px-4 py-4 gap-3 flex-shrink-0">
                      <TiagaoCharacter state={phase as CharacterState} size={focusMode ? 120 : 90} showLabel={true} />
                      {!voicePure && history.length === 0 && (
                        <p className="text-xs text-slate-400 text-center">Fale ou escreva para começar</p>
                      )}
                      {phase === "thinking" && (
                        <div className="flex gap-1.5 items-center text-indigo-400 text-xs">
                          {[0,150,300].map(d => <span key={d} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}}/>)}
                          <span className="text-gray-400 ml-1">pensando...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Full conversation history */}
                  {!voicePure && history.length > 0 && (
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
                      {history.map((msg, i) => (
                        <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          {msg.role === "assistant" && (
                            <div className="flex-shrink-0 mt-0.5">
                              <TiagaoCharacter
                                state={i === history.length - 1 && phase !== "idle" ? phase as CharacterState : "idle"}
                                size={28} showLabel={false} />
                            </div>
                          )}
                          <div className={`max-w-[80%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            msg.role === "user"
                              ? "bg-indigo-600 text-white rounded-tr-sm"
                              : "bg-indigo-50 border border-indigo-100 text-slate-700 rounded-tl-sm"
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            <p className={`text-[9px] mt-1 ${msg.role === "user" ? "text-indigo-200" : "text-slate-400"}`}>
                              {new Date(msg.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Thinking indicator at bottom of history */}
                      {phase === "thinking" && (
                        <div className="flex gap-2 justify-start">
                          <TiagaoCharacter state="thinking" size={28} showLabel={false} />
                          <div className="bg-indigo-50 border border-indigo-100 px-3 py-2.5 rounded-2xl flex items-center gap-1.5">
                            {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}}/>)}
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}

                  {/* Reaction + error (only for non-voicePure) */}
                  {!voicePure && lastAssistantMsg && phase === "idle" && (
                    <div className="px-3 pb-1 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 mr-auto">Ajudou?</span>
                        <button onClick={() => { setReaction("up"); sendMessage("👍 Entendi bem! Pode continuar."); }}
                          disabled={reaction !== null}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            reaction === "up" ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40"
                          }`}>
                          <ThumbsUp className="w-3 h-3" /> {reaction === "up" ? "Ótimo!" : "Sim"}
                        </button>
                        <button onClick={() => { setReaction("down"); sendMessage("Não entendi. Explica de outro jeito, mais simples?"); }}
                          disabled={reaction !== null}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            reaction === "down" ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-600 hover:bg-orange-100 disabled:opacity-40"
                          }`}>
                          <ThumbsDown className="w-3 h-3" /> Não
                        </button>
                        {history.length > 2 && (
                          <button onClick={() => { setHistory([]); historyRef.current = []; setSessionMsgs(0); }}
                            title="Limpar conversa"
                            className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="mx-3 mb-2 bg-red-50 text-red-600 text-xs rounded-xl px-3 py-2 border border-red-100 flex items-center gap-2 flex-shrink-0">
                      <span className="flex-1">{error}</span>
                      {retrying && (
                        <button onClick={() => {
                          const lastUser = [...historyRef.current].reverse().find(m => m.role === "user")?.content;
                          if (lastUser) sendMessage(lastUser, true);
                          setError(null);
                        }} className="flex items-center gap-1 text-red-600 font-bold hover:text-red-800">
                          <RotateCcw className="w-3 h-3" /> Retry
                        </button>
                      )}
                      <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              )}

              {/* COMANDOS TAB */}
              {tab === "comandos" && (
                <div className="flex-1 overflow-y-auto px-3 py-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Toque para perguntar</p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_COMMANDS.map((cmd, i) => (
                      <button key={i}
                        onClick={() => { sendMessage(cmd.text); setTab("conversa"); }}
                        disabled={phase !== "idle"}
                        className="text-left px-3 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-xs font-bold text-indigo-800 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 leading-snug">
                        {cmd.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Comandos de voz</p>
                    {[
                      { cmd: "\"Abra o simulado\"",         desc: "Navega para simulados" },
                      { cmd: "\"Crie um plano de estudos\"", desc: "Cria plano personalizado" },
                      { cmd: "\"Me explica [matéria]\"",    desc: "Abre aula sobre o tema" },
                      { cmd: "\"Cria flashcards\"",          desc: "Gera e salva flashcards" },
                      { cmd: "\"Pare / continue\"",          desc: "Controla a fala" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2 mb-2">
                        <code className="text-[10px] bg-slate-100 text-slate-700 px-2 py-1 rounded-lg font-mono flex-shrink-0">{item.cmd}</code>
                        <span className="text-[10px] text-slate-500 pt-1">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CONFIG TAB */}
              {tab === "config" && (
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {/* Microfone */}
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Microfone</p>
                    {audioCapture.devices.length === 0 ? (
                      <button onClick={audioCapture.refreshDevices}
                        className="w-full py-2 bg-slate-50 text-slate-500 text-xs rounded-xl border border-dashed border-slate-300 hover:border-indigo-300 transition-colors flex items-center justify-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5" /> Detectar microfones
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        {audioCapture.devices.map(d => (
                          <button key={d.deviceId}
                            onClick={() => audioCapture.setSelectedDeviceId(d.deviceId)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                              audioCapture.selectedDeviceId === d.deviceId
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}>
                            🎙️ {d.label}
                          </button>
                        ))}
                        <button onClick={audioCapture.refreshDevices}
                          className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 pt-1">
                          <RefreshCw className="w-2.5 h-2.5" /> Atualizar lista
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Volume test */}
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Nível do microfone</p>
                    <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                      <VolumeBar level={volume} />
                      <span className="text-[10px] text-slate-400">{volume > 5 ? "✅ Detectando áudio" : "Fale algo..."}</span>
                    </div>
                  </div>

                  {/* Modo voz pura */}
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Experiência</p>
                    <button onClick={() => setVoicePure(v => !v)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        voicePure ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                      }`}>
                      {voicePure ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span className="flex-1 text-left">Modo voz pura (sem texto)</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${voicePure ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                        {voicePure ? "ON" : "OFF"}
                      </span>
                    </button>
                  </div>

                  {/* Stats */}
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Sessão atual</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Mensagens", value: sessionMsgs },
                        { label: "No histórico", value: history.length },
                      ].map(s => (
                        <div key={s.label} className="bg-slate-50 rounded-xl px-3 py-2 text-center">
                          <p className="text-lg font-black text-indigo-600">{s.value}</p>
                          <p className="text-[10px] text-slate-400">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── CONTROLS (always visible) ── */}
            <div className="px-3 pb-3 flex-shrink-0 bg-white border-t border-slate-50 pt-2.5">
              {/* Volume bar while listening */}
              {phase === "listening" && (
                <div className="mb-2 px-2">
                  <VolumeBar level={volume} />
                </div>
              )}

              {phase === "speaking" ? (
                <button onClick={stopSpeaking}
                  className="w-full py-2.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors">
                  <Square className="w-3.5 h-3.5 fill-current" /> Interromper Tiagão
                </button>
              ) : phase === "listening" ? (
                <button onClick={stopListening}
                  className="w-full py-2.5 rounded-2xl bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 animate-pulse">
                  <MicOff className="w-3.5 h-3.5" /> Parar de falar
                </button>
              ) : (
                <>
                  <button onClick={startListening} disabled={phase === "thinking"}
                    className="w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 text-white transition-all"
                    style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", boxShadow: "0 4px 16px #6366f140" }}>
                    {phase === "thinking"
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Pensando...</>
                      : <><Mic className="w-3.5 h-3.5" /> {hasSpeechInput ? "Falar com o Tiagão" : "Iniciar voz"}</>
                    }
                  </button>

                  {/* Text input + camera */}
                  <div className="flex gap-1.5 mt-2">
                    <input ref={cameraInputRef as any} type="file" accept="image/*" capture="environment"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) analisarImagem(f); e.target.value = ""; }} />
                    <button onClick={() => cameraInputRef.current?.click()} disabled={analisandoImagem}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
                      {analisandoImagem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    </button>
                    <input type="text" value={textInput} onChange={e => setTextInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && textInput.trim()) { sendMessage(textInput); setTextInput(""); } }}
                      placeholder="Ou escreva sua dúvida..."
                      className="flex-1 text-xs bg-slate-50 rounded-xl px-3 py-2 text-slate-700 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-indigo-300 transition-colors" />
                    <button onClick={() => { if (textInput.trim()) { sendMessage(textInput); setTextInput(""); } }}
                      disabled={!textInput.trim()}
                      className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
