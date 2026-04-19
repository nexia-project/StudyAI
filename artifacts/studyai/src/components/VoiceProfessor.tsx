/**
 * VoiceProfessor — Professor Tiagão
 *
 * Audio strategy: Web Audio API (AudioContext).
 * CRITICAL FIX: AudioContext.resume() MUST be called synchronously
 * (fire-and-forget, no await) inside the user-gesture handler.
 * Awaiting it inside an async handler can cause browsers to consider
 * the gesture "stale" and block subsequent audio playback.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Square, VolumeX, Volume2, ThumbsUp, ThumbsDown, Timer, Maximize2, Minimize2, Send } from "lucide-react";
import { useLocation } from "wouter";
import {
  collectStudentContext,
  triggerProfessorAction,
  type ProfessorProactiveDetail,
  type ProfessorBehaviorDetail,
} from "@/lib/professor-events";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
const IDLE_TRIGGER_MS = 3 * 60 * 1000;
const PROACTIVE_MIN_GAP_MS = 8 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000;

// ─── Shared AudioContext ─────────────────────────────────────────────────────
let _ctx: AudioContext | null = null;
let _currentSource: AudioBufferSourceNode | null = null;
let _isAudioUnlocked = false;

/**
 * MUST be called synchronously inside a user-gesture handler.
 * Creating AudioContext inside a gesture handler gives it "running" state
 * automatically (Chrome 70+, Firefox 68+, Safari 14+) — no resume() needed.
 * This is more reliable than creating it outside and calling resume() later.
 */
function unlockAudioSync(): void {
  if (_isAudioUnlocked) return;
  try {
    // Create INSIDE the user gesture → auto "running" state in all modern browsers
    _ctx = new AudioContext();
    _isAudioUnlocked = true;
    // Warm up: play a silent 1-frame buffer immediately
    const buf = _ctx.createBuffer(1, 1, _ctx.sampleRate);
    const src = _ctx.createBufferSource();
    src.buffer = buf;
    src.connect(_ctx.destination);
    src.start(0);
  } catch (e) {
    console.warn("[Tiagão] AudioContext unlock failed:", e);
  }
}

function getCtx(): AudioContext {
  if (!_ctx) {
    // Fallback: create context (may be suspended if outside gesture)
    _ctx = new AudioContext();
  }
  return _ctx;
}

function stopCurrentAudio() {
  try { _currentSource?.stop(); } catch { /* already stopped */ }
  _currentSource = null;
}

/**
 * Fetch MP3 from TTS endpoint and play via AudioContext.
 * onStart() is called right when audio begins — use it to update UI state.
 */
async function playTTS(text: string, onStart?: () => void, signal?: AbortSignal): Promise<void> {
  if (!text.trim()) return;
  stopCurrentAudio();

  const ctx = getCtx();
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch { /* best-effort */ }
  }
  if (ctx.state !== "running") return;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/voice-tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      credentials: "include",
      signal,
    });
  } catch (e: any) {
    if (e?.name !== "AbortError") console.warn("[Tiagão] TTS fetch error:", e);
    return;
  }

  if (signal?.aborted || !res.ok) return;

  const ab = await res.arrayBuffer();
  if (signal?.aborted) return;

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(ab);
  } catch (e) {
    console.warn("[Tiagão] decodeAudioData failed:", e);
    return;
  }
  if (signal?.aborted) return;

  await new Promise<void>((resolve) => {
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(ctx.destination);
    src.onended = () => resolve();
    _currentSource = src;
    // Notify caller that audio is actually starting now
    onStart?.();
    src.start(0);
  });
  _currentSource = null;
}

// ─── Component ───────────────────────────────────────────────────────────────

type Phase = "idle" | "listening" | "thinking" | "speaking";

export function VoiceProfessor() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [muted, setMuted] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const [userTranscript, setUserTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [lastAssistantMsg, setLastAssistantMsg] = useState("");
  const [reaction, setReaction] = useState<"up" | "down" | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(0);

  const mutedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const historyRef = useRef<Array<{ role: string; content: string }>>([]);
  const lastProactiveRef = useRef<number>(0);
  const lastUserActivityRef = useRef<number>(Date.now());
  const greetedRef = useRef(false);
  const proactiveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Focus mode timer
  useEffect(() => {
    if (focusMode) {
      setFocusSeconds(0);
      focusTimerRef.current = setInterval(() => setFocusSeconds(s => s + 1), 1000);
    } else {
      if (focusTimerRef.current) clearInterval(focusTimerRef.current);
    }
    return () => { if (focusTimerRef.current) clearInterval(focusTimerRef.current); };
  }, [focusMode]);

  const fmtFocusTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const hasSpeechInput =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // ── Core: speak text ──────────────────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    if (mutedRef.current || !text.trim()) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    // Show "thinking" while fetching TTS — text never shown before audio starts
    setPhase("thinking");
    setSubtitle("");
    try {
      await playTTS(
        text,
        () => setPhase("speaking"), // called exactly when audio starts
        abortRef.current.signal,
      );
    } catch { /* aborted or error */ }
    setPhase("idle");
    setSubtitle("");
  }, []);

  const stopSpeaking = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopCurrentAudio();
    setPhase("idle");
    setSubtitle("");
  }, []);

  // ── Send message to Tiagão ─────────────────────────────────────────────────
  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim()) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setPhase("thinking");
    setUserTranscript(userText);
    setError(null);
    historyRef.current.push({ role: "user", content: userText });
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
      if (!res.ok) throw new Error("Erro");
      const { text, action } = await res.json();
      historyRef.current.push({ role: "assistant", content: text || "" });
      lastProactiveRef.current = Date.now();
      setLastAssistantMsg(text || "");
      setReaction(null);
      if (action?.type === "ir") setTimeout(() => navigate(action.param), 600);
      if (action?.type === "criar_plano") triggerProfessorAction("criar_plano", action.param);
      await speak(text || "");
      setUserTranscript("");
    } catch (e: any) {
      setPhase("idle");
      setUserTranscript("");
      if (e?.name !== "AbortError") setError("Não consegui responder. Tente de novo.");
    }
  }, [speak, navigate]);

  // ── Proactive: Tiagão calls student on his own ──────────────────────────────
  const runProactive = useCallback(async (triggerReason?: string) => {
    if (phase !== "idle" || mutedRef.current) return;
    if (Date.now() - lastProactiveRef.current < PROACTIVE_MIN_GAP_MS) return;
    const context = collectStudentContext();
    const lastMsg = [...historyRef.current].reverse().find(m => m.role === "assistant");
    if (lastMsg) context.ultimaMensagem = lastMsg.content.slice(0, 100);
    const idleMs = Date.now() - lastUserActivityRef.current;
    try {
      const res = await fetch(`${BASE_URL}/api/voice-proactive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, triggerReason: triggerReason || "idle", idleMs }),
        credentials: "include",
      });
      if (!res.ok) return;
      const { message, action } = await res.json();
      if (!message) return;
      historyRef.current.push({ role: "assistant", content: message });
      lastProactiveRef.current = Date.now();
      setLastAssistantMsg(message);
      setReaction(null);
      if (action?.type === "ir") setTimeout(() => navigate(action.param), 600);
      if (action?.type === "criar_plano") triggerProfessorAction("criar_plano", action.param);
      await speak(message);
    } catch { /* ignore */ }
  }, [phase, speak, navigate]);

  // ── Proactive events from app (plan generated, XP, etc.) ─────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { text } = (e as CustomEvent<ProfessorProactiveDetail>).detail;
      if (!text || mutedRef.current) return;
      historyRef.current.push({ role: "assistant", content: text });
      lastProactiveRef.current = Date.now();
      setLastAssistantMsg(text);
      setReaction(null);
      speak(text);
    };
    window.addEventListener("professor:proactive", handler);
    return () => window.removeEventListener("professor:proactive", handler);
  }, [speak]);

  // ── Behavior events from app (simulado done, flashcards done, etc.) ───────
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

  // ── Activity tracking + behavior-based proactive ─────────────────────────
  useEffect(() => {
    const recordActivity = () => { lastUserActivityRef.current = Date.now(); };

    window.addEventListener("click", recordActivity, { passive: true });
    window.addEventListener("keydown", recordActivity, { passive: true });
    window.addEventListener("scroll", recordActivity, { passive: true });
    window.addEventListener("touchstart", recordActivity, { passive: true });

    // Page visibility: when user returns after being away, maybe Tiagão should comment
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const away = Date.now() - lastUserActivityRef.current;
        // If away > 5 minutes and Tiagão hasn't spoken recently, greet return
        if (away > 5 * 60 * 1000) {
          lastUserActivityRef.current = Date.now();
          setTimeout(() => runProactive("page_return"), 2000);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Polling check: every 30s, check if user is idle
    proactiveTimerRef.current = setInterval(() => {
      const idleMs = Date.now() - lastUserActivityRef.current;
      if (idleMs >= IDLE_TRIGGER_MS) {
        runProactive("idle");
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener("click", recordActivity);
      window.removeEventListener("keydown", recordActivity);
      window.removeEventListener("scroll", recordActivity);
      window.removeEventListener("touchstart", recordActivity);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (proactiveTimerRef.current) clearInterval(proactiveTimerRef.current);
    };
  }, [runProactive]);

  // ── FIRST PANEL OPEN — unlock audio + greet ──────────────────────────────
  // Audio is unlocked and Tiagão greets when user explicitly opens the panel.
  // This is intentional: the open button click IS the user gesture.
  const handlePanelToggle = useCallback(() => {
    setShowHint(false);
    setOpen(o => {
      const next = !o;
      if (next && !greetedRef.current) {
        greetedRef.current = true;
        // Synchronous unlock INSIDE this click handler
        unlockAudioSync();
        const ctx = collectStudentContext();
        const greeting = ctx.nome
          ? `Oi, ${ctx.nome}! Aqui é o Tiagão, seu professor. Pode me chamar quando quiser estudar qualquer coisa!`
          : "Oi! Aqui é o Tiagão, seu professor de estudos. Pode me chamar a qualquer hora!";
        historyRef.current.push({ role: "assistant", content: greeting });
        lastProactiveRef.current = Date.now();
        setLastAssistantMsg(greeting);
        setReaction(null);
        // Short delay so AudioContext finishes warming up
        setTimeout(() => speak(greeting), 300);
      }
      return next;
    });
  }, [speak]);

  // ── Voice recognition ─────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!hasSpeechInput) { setError("Use Chrome ou Edge para o microfone."); return; }
    stopSpeaking();
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => { setPhase("listening"); setUserTranscript(""); };
    rec.onend = () => { if (phase === "listening") setPhase("idle"); };
    rec.onresult = (event: any) => {
      let interim = "", final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t; else interim += t;
      }
      if (final) { setUserTranscript(final); sendMessage(final); }
      else setUserTranscript(interim);
    };
    rec.onerror = (e: any) => {
      setPhase("idle");
      if (e.error !== "no-speech") setError("Erro no microfone: " + e.error);
    };
    recognitionRef.current = rec;
    rec.start();
  }, [hasSpeechInput, sendMessage, stopSpeaking, phase]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setPhase("idle");
  }, []);

  // ── UI helpers ────────────────────────────────────────────────────────────
  const phaseColor: Record<Phase, string> = {
    idle: "#22c55e",
    listening: "#ef4444",
    thinking: "#f59e0b",
    speaking: "#6366f1",
  };
  const phaseLabel: Record<Phase, string> = {
    idle: "Online — pode falar",
    listening: "Ouvindo...",
    thinking: "Pensando...",
    speaking: "Falando...",
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, type: "spring" }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        onClick={handlePanelToggle}
        className="fixed bottom-20 md:bottom-6 left-4 md:left-6 z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center select-none"
        style={{
          background: open
            ? "#6b7280"
            : "linear-gradient(135deg,#6366f1,#4f46e5)",
        }}
        title="Professor Tiagão — clique para falar"
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <div className="relative">
            <img src="/tiagao-robot.jpg" alt="Professor Tiagão" className="w-10 h-10 rounded-full object-cover object-top" />
            <motion.span
              animate={phase === "speaking"
                ? { scale: [1, 1.8, 1], opacity: [1, 0.4, 1] }
                : { scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: phase === "speaking" ? 0.8 : 2 }}
              className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
              style={{ backgroundColor: phaseColor[phase] }}
            />
          </div>
        )}
      </motion.button>

      {/* Hint tooltip for first time — show before first open */}
      <AnimatePresence>
        {showHint && !open && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ delay: 2, duration: 0.4 }}
            className="fixed bottom-[5.5rem] md:bottom-8 left-20 z-40 pointer-events-none"
          >
            <div className="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-xl shadow-lg whitespace-nowrap">
              👆 Toque aqui para falar com o Tiagão
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-2.5 h-2.5 bg-gray-900 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini card — shown when panel closed and Tiagão is active */}
      <AnimatePresence>
        {!open && (phase === "speaking" || phase === "thinking") && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="fixed bottom-24 left-4 right-4 sm:left-6 sm:right-auto sm:w-80 z-40 bg-white rounded-2xl shadow-xl border border-indigo-100 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex-shrink-0 select-none overflow-hidden">
                <img src="/tiagao-robot.jpg" alt="Professor Tiagão" className="w-full h-full object-cover object-top" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-indigo-600 mb-0.5">Professor Tiagão</p>
                {phase === "thinking" ? (
                  <div className="flex gap-1 items-center h-4">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${d}ms` }} />
                    ))}
                    <span className="text-xs text-gray-400 ml-1">pensando...</span>
                  </div>
                ) : (
                  <div className="flex gap-0.5 items-end h-4">
                    {[3, 7, 10, 7, 4, 9, 5].map((h, i) => (
                      <span key={i}
                        className="inline-block w-1 bg-indigo-400 rounded-full animate-bounce"
                        style={{ height: `${h}px`, animationDelay: `${i * 70}ms` }} />
                    ))}
                    <span className="text-xs text-gray-400 ml-1.5 self-center">falando...</span>
                  </div>
                )}
              </div>
              <button
                onClick={stopSpeaking}
                className="px-2.5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white flex-shrink-0 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Focus mode overlay */}
      <AnimatePresence>
        {focusMode && open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30"
            style={{ background: "rgba(5,5,16,0.88)", backdropFilter: "blur(8px)" }}
          />
        )}
      </AnimatePresence>

      {/* Full panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={`fixed z-50 bg-white rounded-3xl shadow-2xl border border-indigo-100 overflow-hidden transition-all duration-300 ${
              focusMode
                ? "inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[480px] sm:max-h-[85vh]"
                : "bottom-[8.5rem] md:bottom-24 left-4 right-4 sm:left-6 sm:right-auto sm:w-80"
            }`}
          >
            {/* Header */}
            <div className="p-4 flex items-center gap-3"
              style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
              <div className="relative flex-shrink-0">
                <div className={`rounded-full overflow-hidden select-none ${focusMode ? "w-14 h-14" : "w-12 h-12"}`}>
                  <img src="/tiagao-robot.jpg" alt="Professor Tiagão" className="w-full h-full object-cover object-top" />
                </div>
                <motion.span
                  animate={phase === "speaking" ? { scale: [1, 1.7, 1], opacity: [1, 0.5, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 0.7 }}
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                  style={{ backgroundColor: phaseColor[phase] }}
                />
              </div>
              <div className="flex-1">
                <p className="text-white font-black text-sm">Professor Tiagão</p>
                <div className="flex items-center gap-2">
                  <p className="text-indigo-100 text-xs">{phaseLabel[phase]}</p>
                  {focusMode && (
                    <span className="flex items-center gap-1 text-indigo-200 text-xs bg-white/10 px-2 py-0.5 rounded-full">
                      <Timer className="w-3 h-3" /> {fmtFocusTime(focusSeconds)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setFocusMode(f => !f)}
                  className={`transition-colors p-1.5 rounded-lg ${focusMode ? "text-amber-300 bg-white/15 hover:bg-white/25" : "text-white/60 hover:text-white"}`}
                  title={focusMode ? "Sair do Modo Foco" : "Modo Foco"}>
                  {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button onClick={() => setMuted(m => !m)}
                  className="text-white/60 hover:text-white transition-colors p-1.5"
                  title={muted ? "Ativar som" : "Silenciar"}>
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Last message bubble + orb */}
            <div className={`flex flex-col items-center px-4 gap-3 ${focusMode ? "py-6" : "py-5"}`}>
              {/* Orb */}
              <div className={`relative flex items-center justify-center ${focusMode ? "w-28 h-28" : "w-20 h-20"}`}>
                {(phase === "speaking" || phase === "listening") && (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.7], opacity: [0.3, 0] }}
                      transition={{ repeat: Infinity, duration: 1.1, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: phaseColor[phase] + "55" }}
                    />
                    <motion.div
                      animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.1, ease: "easeOut", delay: 0.25 }}
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: phaseColor[phase] + "66" }}
                    />
                  </>
                )}
                <motion.div
                  animate={phase === "thinking" ? { rotate: 360 } : phase === "speaking" ? { scale: [1, 1.07, 1] } : { scale: 1 }}
                  transition={phase === "thinking" ? { repeat: Infinity, duration: 1.4, ease: "linear" } : phase === "speaking" ? { repeat: Infinity, duration: 0.55 } : {}}
                  className={`rounded-full select-none shadow-xl overflow-hidden ${focusMode ? "w-24 h-24" : "w-16 h-16"}`}
                  style={{ boxShadow: `0 8px 32px ${phaseColor[phase]}55`, outline: `3px solid ${phaseColor[phase]}`, outlineOffset: "2px" }}
                >
                  <img src="/tiagao-robot.jpg" alt="Professor Tiagão" className="w-full h-full object-cover object-top" />
                </motion.div>
              </div>

              {/* Last Tiagão message */}
              {lastAssistantMsg && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={lastAssistantMsg.slice(0, 40)}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="w-full rounded-2xl px-4 py-3 text-sm text-gray-700 leading-relaxed relative"
                    style={{ background: "linear-gradient(135deg,#eef2ff,#f0f4ff)", border: "1px solid #c7d2fe" }}
                  >
                    <div className="absolute -top-1.5 left-6 w-3 h-3 rotate-45 bg-indigo-50 border-l border-t border-indigo-200" />
                    <p className={focusMode ? "text-base" : "text-sm"}>{lastAssistantMsg}</p>

                    {/* Reaction buttons */}
                    {phase === "idle" && (
                      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-indigo-100">
                        <span className="text-xs text-gray-400 mr-auto">Essa explicação te ajudou?</span>
                        <button
                          onClick={() => {
                            setReaction("up");
                            sendMessage("👍 Ótimo, entendi bem! Pode continuar.");
                          }}
                          disabled={reaction !== null}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            reaction === "up" ? "bg-emerald-500 text-white scale-110" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40"
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {reaction === "up" ? "Ótimo!" : "Entendi"}
                        </button>
                        <button
                          onClick={() => {
                            setReaction("down");
                            sendMessage("Não entendi bem. Pode explicar de outro jeito, mais simples?");
                          }}
                          disabled={reaction !== null}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            reaction === "down" ? "bg-orange-500 text-white scale-110" : "bg-orange-50 text-orange-600 hover:bg-orange-100 disabled:opacity-40"
                          }`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          {reaction === "down" ? "Pedindo..." : "Não entendi"}
                        </button>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}

              {/* User transcript */}
              {userTranscript && phase !== "idle" && (
                <div className="w-full bg-gray-50 rounded-2xl px-4 py-2.5 text-sm text-gray-500 text-center italic border border-gray-100">
                  "{userTranscript}"
                </div>
              )}

              {phase === "thinking" && (
                <div className="flex gap-1.5 items-center text-indigo-400 text-xs">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                  <span className="ml-1 text-gray-400">Tiagão pensando...</span>
                </div>
              )}

              {error && (
                <div className="w-full bg-red-50 text-red-600 text-xs rounded-xl px-3 py-2 text-center border border-red-100">
                  {error}{" "}
                  <button onClick={() => setError(null)} className="underline ml-1">OK</button>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="px-4 pb-4 flex flex-col gap-2">
              {phase === "speaking" ? (
                <button onClick={stopSpeaking}
                  className="w-full py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                  <Square className="w-4 h-4 fill-current" /> Interromper Tiagão
                </button>
              ) : phase === "listening" ? (
                <button onClick={stopListening}
                  className="w-full py-3 rounded-2xl bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 animate-pulse">
                  <MicOff className="w-4 h-4" /> Parar de falar
                </button>
              ) : (
                <button onClick={startListening}
                  disabled={phase === "thinking"}
                  className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 text-white transition-all"
                  style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", boxShadow: "0 4px 16px #6366f140" }}>
                  <Mic className="w-4 h-4" />
                  {phase === "thinking" ? "Pensando..." : hasSpeechInput ? "Falar com o Tiagão" : "Perguntar ao Tiagão"}
                </button>
              )}

              {phase === "idle" && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && textInput.trim()) { sendMessage(textInput); setTextInput(""); } }}
                    placeholder="Ou escreva sua dúvida..."
                    className={`flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 focus:outline-none ${focusMode ? "text-base py-3" : ""}`}
                  />
                  <button
                    onClick={() => { if (textInput.trim()) { sendMessage(textInput); setTextInput(""); } }}
                    disabled={!textInput.trim()}
                    className="px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold disabled:opacity-40 transition-colors flex items-center">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}

              {focusMode && (
                <button onClick={() => { setFocusMode(false); }}
                  className="w-full py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-amber-200">
                  <Minimize2 className="w-3.5 h-3.5" /> Sair do Modo Foco — {fmtFocusTime(focusSeconds)} focado
                </button>
              )}

              {!hasSpeechInput && !focusMode && (
                <p className="text-xs text-center text-gray-400">
                  Use Chrome ou Edge para o microfone
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
