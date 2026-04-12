/**
 * VoiceProfessor — Professora Paula
 *
 * Audio strategy: Web Audio API (AudioContext).
 * CRITICAL FIX: AudioContext.resume() MUST be called synchronously
 * (fire-and-forget, no await) inside the user-gesture handler.
 * Awaiting it inside an async handler can cause browsers to consider
 * the gesture "stale" and block subsequent audio playback.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Square, VolumeX, Volume2 } from "lucide-react";
import { useLocation } from "wouter";
import {
  collectStudentContext,
  triggerProfessorAction,
  type ProfessorProactiveDetail,
} from "@/lib/professor-events";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
const PROACTIVE_INTERVAL_MS = 5 * 60 * 1000;
const PROACTIVE_MIN_GAP_MS = 10 * 60 * 1000;

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
    console.warn("[Paula] AudioContext unlock failed:", e);
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

/** Fetch MP3 from TTS endpoint, decode via AudioContext, and play. */
async function playTTS(text: string, signal?: AbortSignal): Promise<void> {
  if (!text.trim()) return;
  stopCurrentAudio();

  const ctx = getCtx();
  // Context should already be "running" from unlockAudioSync().
  // If somehow still suspended, attempt resume (best-effort).
  if (ctx.state === "suspended") {
    console.warn("[Paula] AudioContext suspended at playback time — attempting resume");
    try { await ctx.resume(); } catch (e) {
      console.warn("[Paula] resume() failed:", e);
    }
  }
  if (ctx.state !== "running") {
    console.warn("[Paula] AudioContext state:", ctx.state, "— skipping playback");
    return;
  }

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
    if (e?.name !== "AbortError") console.warn("[Paula] TTS fetch error:", e);
    return;
  }

  if (signal?.aborted) return;

  if (!res.ok) {
    console.warn("[Paula] TTS endpoint error:", res.status, await res.text().catch(() => ""));
    return;
  }

  const ab = await res.arrayBuffer();
  if (signal?.aborted) return;

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(ab);
  } catch (e) {
    console.warn("[Paula] decodeAudioData failed:", e);
    return;
  }
  if (signal?.aborted) return;

  await new Promise<void>((resolve) => {
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(ctx.destination);
    src.onended = () => resolve();
    _currentSource = src;
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

  const mutedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const historyRef = useRef<Array<{ role: string; content: string }>>([]);
  const lastProactiveRef = useRef<number>(0);
  const greetedRef = useRef(false);
  const proactiveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const hasSpeechInput =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // ── Core: speak text ──────────────────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    if (mutedRef.current || !text.trim()) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setPhase("speaking");
    setSubtitle(text);
    try {
      await playTTS(text, abortRef.current.signal);
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

  // ── Send message to Paula ─────────────────────────────────────────────────
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

  // ── Proactive: Paula calls student on her own ──────────────────────────────
  const runProactive = useCallback(async () => {
    if (phase !== "idle" || mutedRef.current) return;
    if (Date.now() - lastProactiveRef.current < PROACTIVE_MIN_GAP_MS) return;
    const context = collectStudentContext();
    const lastMsg = [...historyRef.current].reverse().find(m => m.role === "assistant");
    if (lastMsg) context.ultimaMensagem = lastMsg.content.slice(0, 100);
    try {
      const res = await fetch(`${BASE_URL}/api/voice-proactive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
        credentials: "include",
      });
      if (!res.ok) return;
      const { message, action } = await res.json();
      if (!message) return;
      historyRef.current.push({ role: "assistant", content: message });
      lastProactiveRef.current = Date.now();
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
      speak(text);
    };
    window.addEventListener("professor:proactive", handler);
    return () => window.removeEventListener("professor:proactive", handler);
  }, [speak]);

  // ── Proactive timer ───────────────────────────────────────────────────────
  useEffect(() => {
    proactiveTimerRef.current = setInterval(runProactive, PROACTIVE_INTERVAL_MS);
    return () => { if (proactiveTimerRef.current) clearInterval(proactiveTimerRef.current); };
  }, [runProactive]);

  // ── FIRST PANEL OPEN — unlock audio + greet ──────────────────────────────
  // Audio is unlocked and Paula greets when user explicitly opens the panel.
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
          ? `Oi, ${ctx.nome}! Aqui é a Paula, sua tutora. Pode me chamar quando quiser estudar qualquer coisa!`
          : "Oi! Aqui é a Paula, sua tutora de estudos. Pode me chamar a qualquer hora!";
        historyRef.current.push({ role: "assistant", content: greeting });
        lastProactiveRef.current = Date.now();
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
    speaking: "#f97316",
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
        className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center select-none"
        style={{
          background: open
            ? "#6b7280"
            : "linear-gradient(135deg,#f97316,#ea580c)",
        }}
        title="Professora Paula — clique para falar"
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <div className="relative">
            <span className="text-2xl leading-none">👩‍🏫</span>
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
            className="fixed bottom-8 left-20 z-40 pointer-events-none"
          >
            <div className="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-xl shadow-lg whitespace-nowrap">
              👆 Toque aqui para falar com a Paula
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-2.5 h-2.5 bg-gray-900 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini card — shown when panel closed and Paula is active */}
      <AnimatePresence>
        {!open && (phase === "speaking" || phase === "thinking") && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="fixed bottom-24 left-4 right-4 sm:left-6 sm:right-auto sm:w-80 z-40 bg-white rounded-2xl shadow-xl border border-orange-100 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-xl flex-shrink-0 select-none">
                👩‍🏫
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-orange-600 mb-0.5">Professora Paula</p>
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
                        className="inline-block w-1 bg-orange-400 rounded-full animate-bounce"
                        style={{ height: `${h}px`, animationDelay: `${i * 70}ms` }} />
                    ))}
                    <span className="text-xs text-gray-400 ml-1.5 self-center">falando...</span>
                  </div>
                )}
                {subtitle && phase === "speaking" && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 italic">"{subtitle}"</p>
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

      {/* Full panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed bottom-24 left-4 right-4 sm:left-6 sm:right-auto sm:w-80 z-40 bg-white rounded-3xl shadow-2xl border border-orange-100 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 flex items-center gap-3"
              style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl select-none">
                  👩‍🏫
                </div>
                <motion.span
                  animate={phase === "speaking"
                    ? { scale: [1, 1.7, 1], opacity: [1, 0.5, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 0.7 }}
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                  style={{ backgroundColor: phaseColor[phase] }}
                />
              </div>
              <div className="flex-1">
                <p className="text-white font-black text-sm">Professora Paula</p>
                <p className="text-orange-100 text-xs">{phaseLabel[phase]}</p>
              </div>
              <button onClick={() => setMuted(m => !m)}
                className="text-white/70 hover:text-white transition-colors"
                title={muted ? "Ativar som" : "Silenciar"}>
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>

            {/* Orb */}
            <div className="flex flex-col items-center py-6 px-4 gap-4">
              <div className="relative w-24 h-24 flex items-center justify-center">
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
                  animate={phase === "thinking"
                    ? { rotate: 360 }
                    : phase === "speaking"
                    ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                  transition={phase === "thinking"
                    ? { repeat: Infinity, duration: 1.4, ease: "linear" }
                    : phase === "speaking"
                    ? { repeat: Infinity, duration: 0.55 } : {}}
                  className="w-20 h-20 rounded-full flex items-center justify-center text-4xl select-none shadow-xl"
                  style={{
                    background:
                      phase === "listening" ? "linear-gradient(135deg,#ef4444,#dc2626)"
                      : phase === "thinking" ? "linear-gradient(135deg,#f59e0b,#d97706)"
                      : "linear-gradient(135deg,#f97316,#ea580c)",
                    boxShadow: `0 8px 32px ${phaseColor[phase]}55`,
                  }}
                >
                  👩‍🏫
                </motion.div>
              </div>

              {userTranscript && phase !== "idle" && (
                <div className="w-full bg-gray-50 rounded-2xl px-4 py-2.5 text-sm text-gray-600 text-center italic">
                  "{userTranscript}"
                </div>
              )}

              {subtitle && phase === "speaking" && (
                <div className="w-full bg-orange-50 rounded-2xl px-4 py-2.5 text-sm text-orange-700 text-center leading-relaxed">
                  {subtitle}
                </div>
              )}

              {error && (
                <div className="w-full bg-red-50 text-red-600 text-xs rounded-xl px-3 py-2 text-center">
                  {error}{" "}
                  <button onClick={() => setError(null)} className="underline">OK</button>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="px-4 pb-4 flex flex-col gap-2">
              {phase === "speaking" ? (
                <button onClick={stopSpeaking}
                  className="w-full py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                  <Square className="w-4 h-4 fill-current" /> Interromper Paula
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
                  style={{
                    background: "linear-gradient(135deg,#f97316,#ea580c)",
                    boxShadow: "0 4px 16px #f9731640",
                  }}>
                  <Mic className="w-4 h-4" />
                  {phase === "thinking" ? "Pensando..." : "Falar com a Paula"}
                </button>
              )}

              {phase === "idle" && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { sendMessage(textInput); setTextInput(""); } }}
                    placeholder="Ou escreva aqui..."
                    className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-400 focus:outline-none"
                  />
                  <button
                    onClick={() => { if (textInput.trim()) { sendMessage(textInput); setTextInput(""); } }}
                    disabled={!textInput.trim()}
                    className="px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-40 transition-colors">
                    →
                  </button>
                </div>
              )}

              {!hasSpeechInput && (
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
