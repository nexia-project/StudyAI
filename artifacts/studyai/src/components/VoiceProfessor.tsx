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
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

// How long between proactive checks (5 min)
const PROACTIVE_INTERVAL = 5 * 60 * 1000;
// Minimum time between Paula speaking proactively (10 min)
const PROACTIVE_MIN_GAP = 10 * 60 * 1000;

type Phase = "idle" | "listening" | "thinking" | "speaking";

async function fetchTTS(text: string, signal?: AbortSignal): Promise<HTMLAudioElement | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/voice-tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      credentials: "include",
      signal,
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    return audio;
  } catch {
    return null;
  }
}

function playAudio(audio: HTMLAudioElement): Promise<void> {
  return new Promise((resolve) => {
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}

export function VoiceProfessor() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [muted, setMuted] = useState(false);
  const [subtitle, setSubtitle] = useState<string>("");
  const [userTranscript, setUserTranscript] = useState<string>("");
  const [greeted, setGreeted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");

  const ttsAbortRef = useRef<AbortController | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const historyRef = useRef<Array<{ role: string; content: string }>>([]);
  const audioUnlockedRef = useRef(false);
  const mutedRef = useRef(false);
  const lastProactiveRef = useRef<number>(0);
  const proactiveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasSpeechInput =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // Unlock browser autoplay on first user click anywhere
  useEffect(() => {
    const unlock = () => {
      if (audioUnlockedRef.current) return;
      const a = new Audio(SILENT_WAV);
      a.volume = 0;
      a.play()
        .then(() => { audioUnlockedRef.current = true; })
        .catch(() => {});
    };
    document.addEventListener("click", unlock, { capture: true, once: true });
    document.addEventListener("touchstart", unlock, { capture: true, once: true });
    return () => {
      document.removeEventListener("click", unlock, true);
      document.removeEventListener("touchstart", unlock, true);
    };
  }, []);

  const stopAudio = useCallback(() => {
    currentAudioRef.current?.pause();
    currentAudioRef.current = null;
    ttsAbortRef.current?.abort();
    setPhase("idle");
    setSubtitle("");
  }, []);

  // Core speak: fetch TTS and play — no text-first lag
  const speakText = useCallback(
    async (text: string): Promise<void> => {
      if (mutedRef.current || !text.trim()) return;
      stopAudio();
      ttsAbortRef.current = new AbortController();
      setPhase("speaking");
      setSubtitle(text);

      const audio = await fetchTTS(text, ttsAbortRef.current.signal);
      if (!audio) {
        setPhase("idle");
        setSubtitle("");
        return;
      }
      currentAudioRef.current = audio;
      await playAudio(audio);
      currentAudioRef.current = null;
      setPhase("idle");
      setSubtitle("");
    },
    [stopAudio]
  );

  // Execute actions from Paula (navigate, create plan)
  const executeAction = useCallback(
    (action: { type: string; param: string }) => {
      if (action.type === "ir") {
        setTimeout(() => navigate(action.param), 800);
      } else if (action.type === "criar_plano") {
        triggerProfessorAction("criar_plano", action.param);
      }
    },
    [navigate]
  );

  // Send a message to Paula and receive a response
  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim()) return;
      setPhase("thinking");
      setUserTranscript(userText);
      setError(null);

      const context = collectStudentContext();
      historyRef.current.push({ role: "user", content: userText });

      try {
        const res = await fetch(`${BASE_URL}/api/voice-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: historyRef.current.slice(-20),
            context,
          }),
          credentials: "include",
        });

        if (!res.ok) throw new Error("Erro na resposta");
        const data = await res.json();
        const text: string = data.text || "";
        const action = data.action || null;

        historyRef.current.push({ role: "assistant", content: text });

        // Update last proactive time so we don't interrupt right after a conversation
        lastProactiveRef.current = Date.now();

        // Execute action if present (navigate / create plan)
        if (action) executeAction(action);

        // Speak directly — no text-first display
        await speakText(text);
        setUserTranscript("");
      } catch (e: any) {
        setPhase("idle");
        setUserTranscript("");
        if (e?.name !== "AbortError")
          setError("Não consegui responder. Tente novamente.");
      }
    },
    [speakText, executeAction]
  );

  // Listen for proactive events from other parts of the app (plan generated, XP, etc.)
  useEffect(() => {
    const handler = (e: Event) => {
      const { text } = (e as CustomEvent<ProfessorProactiveDetail>).detail;
      if (!text) return;
      historyRef.current.push({ role: "assistant", content: text });
      lastProactiveRef.current = Date.now();
      speakText(text);
    };
    window.addEventListener("professor:proactive", handler);
    return () => window.removeEventListener("professor:proactive", handler);
  }, [speakText]);

  // Proactive intelligence loop — Paula decides to speak every PROACTIVE_INTERVAL
  const runProactiveCheck = useCallback(async () => {
    // Don't interrupt if already speaking or listening
    if (phase !== "idle") return;
    // Respect minimum gap
    if (Date.now() - lastProactiveRef.current < PROACTIVE_MIN_GAP) return;

    const context = collectStudentContext();
    // Include last message so Paula doesn't repeat herself
    if (historyRef.current.length > 0) {
      const lastAssistant = [...historyRef.current]
        .reverse()
        .find((m) => m.role === "assistant");
      if (lastAssistant) context.ultimaMensagem = lastAssistant.content.slice(0, 100);
    }

    try {
      const res = await fetch(`${BASE_URL}/api/voice-proactive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.message) return;

      historyRef.current.push({ role: "assistant", content: data.message });
      lastProactiveRef.current = Date.now();

      if (data.action) executeAction(data.action);
      speakText(data.message);
    } catch {
      // silent fail
    }
  }, [phase, speakText, executeAction]);

  useEffect(() => {
    proactiveTimerRef.current = setInterval(runProactiveCheck, PROACTIVE_INTERVAL);
    return () => {
      if (proactiveTimerRef.current) clearInterval(proactiveTimerRef.current);
    };
  }, [runProactiveCheck]);

  // Greet student when panel is opened for the first time
  useEffect(() => {
    if (!open || greeted) return;
    setGreeted(true);
    const ctx = collectStudentContext();
    const greeting = ctx.nome
      ? `Oi, ${ctx.nome}! Tô aqui, pode perguntar qualquer coisa. O que você quer estudar hoje?`
      : "Oi! Pode falar, tô aqui pra te ajudar. O que você quer estudar hoje?";
    historyRef.current.push({ role: "assistant", content: greeting });
    lastProactiveRef.current = Date.now();
    speakText(greeting);
  }, [open, greeted, speakText]);

  // Voice recognition
  const startListening = useCallback(() => {
    if (!hasSpeechInput) {
      setError("Use Chrome ou Edge para usar o microfone.");
      return;
    }
    stopAudio();
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onstart = () => { setPhase("listening"); setUserTranscript(""); };
    rec.onend = () => {
      if (phase === "listening") setPhase("idle");
    };
    rec.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) {
        setUserTranscript(final);
        sendMessage(final);
      } else {
        setUserTranscript(interim);
      }
    };
    rec.onerror = (e: any) => {
      setPhase("idle");
      if (e.error !== "no-speech") setError("Erro no microfone: " + e.error);
    };
    recognitionRef.current = rec;
    rec.start();
  }, [hasSpeechInput, sendMessage, stopAudio, phase]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setPhase("idle");
  }, []);

  const handleClose = () => {
    stopAudio();
    stopListening();
    setOpen(false);
  };

  const handleTextSend = () => {
    if (!textInput.trim()) return;
    const txt = textInput.trim();
    setTextInput("");
    sendMessage(txt);
  };

  const phaseLabel: Record<Phase, string> = {
    idle: "Online — pode falar",
    listening: "Ouvindo você...",
    thinking: "Pensando...",
    speaking: "Falando...",
  };

  const phaseColor: Record<Phase, string> = {
    idle: "#22c55e",
    listening: "#ef4444",
    thinking: "#f59e0b",
    speaking: "#f97316",
  };

  return (
    <>
      {/* Floating toggle button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, type: "spring" }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => (open ? handleClose() : setOpen(true))}
        className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center"
        style={{
          background: open
            ? "#6b7280"
            : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
        }}
        title="Professora Paula"
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <div className="relative">
            <span className="text-2xl leading-none select-none">👩‍🏫</span>
            <motion.span
              animate={phase === "speaking" ? { scale: [1, 1.5, 1] } : { scale: 1 }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
              style={{ backgroundColor: phaseColor[phase] }}
            />
          </div>
        )}
      </motion.button>

      {/* Mini speaking card — shown when panel is CLOSED and Paula is speaking */}
      <AnimatePresence>
        {!open && (phase === "speaking" || phase === "thinking") && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="fixed bottom-24 left-4 right-4 sm:left-6 sm:right-auto sm:w-80 z-40 bg-white rounded-2xl shadow-xl border border-orange-100 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-xl flex-shrink-0 select-none">
                👩‍🏫
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-orange-600 leading-none mb-1">
                  Professora Paula
                </p>
                {phase === "thinking" ? (
                  <div className="flex gap-1 items-center h-4">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                    <span className="text-xs text-gray-400 ml-1">pensando...</span>
                  </div>
                ) : (
                  <div className="flex gap-0.5 items-end h-4">
                    {[3, 6, 9, 6, 4, 8, 5].map((h, i) => (
                      <span
                        key={i}
                        className="inline-block w-1 bg-orange-400 rounded-full animate-bounce"
                        style={{ height: `${h}px`, animationDelay: `${i * 70}ms` }}
                      />
                    ))}
                    <span className="text-xs text-gray-400 ml-1.5 self-center">
                      falando...
                    </span>
                  </div>
                )}
                {subtitle && phase === "speaking" && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 italic">
                    "{subtitle}"
                  </p>
                )}
              </div>
              <button
                onClick={stopAudio}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex-shrink-0 transition-colors"
              >
                <Square className="w-3 h-3 fill-current" />
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
            <div
              className="p-4 flex items-center gap-3"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl select-none">
                  👩‍🏫
                </div>
                <motion.span
                  animate={
                    phase === "speaking" ? { scale: [1, 1.6, 1], opacity: [1, 0.6, 1] } : {}
                  }
                  transition={{ repeat: Infinity, duration: 0.7 }}
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                  style={{ backgroundColor: phaseColor[phase] }}
                />
              </div>
              <div className="flex-1">
                <p className="text-white font-black text-sm leading-tight">
                  Professora Paula
                </p>
                <p className="text-orange-100 text-xs">{phaseLabel[phase]}</p>
              </div>
              <button
                onClick={() => setMuted((m) => !m)}
                className="text-white/70 hover:text-white transition-colors"
                title={muted ? "Ativar som" : "Silenciar"}
              >
                {muted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Orb + state visualization */}
            <div className="flex flex-col items-center py-6 px-4 gap-4">
              {/* Animated orb */}
              <div className="relative flex items-center justify-center w-24 h-24">
                {/* Outer pulse rings */}
                {(phase === "speaking" || phase === "listening") && (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: phaseColor[phase] + "44" }}
                    />
                    <motion.div
                      animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.2,
                        ease: "easeOut",
                        delay: 0.3,
                      }}
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: phaseColor[phase] + "55" }}
                    />
                  </>
                )}

                {/* Core orb */}
                <motion.div
                  animate={
                    phase === "thinking"
                      ? { rotate: 360 }
                      : phase === "speaking"
                      ? { scale: [1, 1.05, 1] }
                      : { scale: 1 }
                  }
                  transition={
                    phase === "thinking"
                      ? { repeat: Infinity, duration: 1.5, ease: "linear" }
                      : phase === "speaking"
                      ? { repeat: Infinity, duration: 0.6 }
                      : {}
                  }
                  className="w-20 h-20 rounded-full flex items-center justify-center text-4xl select-none shadow-lg"
                  style={{
                    background:
                      phase === "idle"
                        ? "linear-gradient(135deg, #f97316, #ea580c)"
                        : phase === "listening"
                        ? "linear-gradient(135deg, #ef4444, #dc2626)"
                        : phase === "thinking"
                        ? "linear-gradient(135deg, #f59e0b, #d97706)"
                        : "linear-gradient(135deg, #f97316, #ea580c)",
                    boxShadow: `0 8px 32px ${phaseColor[phase]}66`,
                  }}
                >
                  👩‍🏫
                </motion.div>
              </div>

              {/* What user said */}
              {userTranscript && phase !== "idle" && (
                <div className="w-full bg-gray-50 rounded-2xl px-4 py-2.5 text-sm text-gray-600 text-center italic">
                  "{userTranscript}"
                </div>
              )}

              {/* Subtitle — what Paula is saying */}
              {subtitle && phase === "speaking" && (
                <div className="w-full bg-orange-50 rounded-2xl px-4 py-2.5 text-sm text-orange-700 text-center leading-relaxed">
                  {subtitle}
                </div>
              )}

              {error && (
                <div className="w-full bg-red-50 text-red-600 text-xs rounded-xl px-3 py-2 text-center">
                  {error}{" "}
                  <button onClick={() => setError(null)} className="underline">
                    OK
                  </button>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="px-4 pb-4 flex flex-col gap-2">
              {/* Voice button or stop */}
              {phase === "speaking" ? (
                <button
                  onClick={stopAudio}
                  className="w-full py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Square className="w-4 h-4 fill-current" /> Interromper Paula
                </button>
              ) : phase === "listening" ? (
                <button
                  onClick={stopListening}
                  className="w-full py-3 rounded-2xl bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 animate-pulse"
                >
                  <MicOff className="w-4 h-4" /> Parar de falar
                </button>
              ) : (
                <button
                  onClick={startListening}
                  disabled={phase === "thinking"}
                  className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-white"
                  style={{
                    background: "linear-gradient(135deg, #f97316, #ea580c)",
                    boxShadow: "0 4px 16px #f9731640",
                  }}
                >
                  <Mic className="w-4 h-4" />
                  {phase === "thinking" ? "Pensando..." : "Falar com a Paula"}
                </button>
              )}

              {/* Text input fallback */}
              {phase === "idle" && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleTextSend()}
                    placeholder="Ou escreva aqui..."
                    className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-400 focus:outline-none"
                  />
                  <button
                    onClick={handleTextSend}
                    disabled={!textInput.trim()}
                    className="px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-40 transition-colors"
                  >
                    →
                  </button>
                </div>
              )}

              {!hasSpeechInput && (
                <p className="text-xs text-center text-gray-400">
                  Use Chrome ou Edge para ativar o microfone
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
