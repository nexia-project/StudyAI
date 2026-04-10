import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, VolumeX, X, BellDot } from "lucide-react";
import type { ProfessorProactiveDetail } from "@/lib/professor-events";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

type Message = { role: "user" | "professor"; text: string };

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

export function VoiceProfessor() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState("");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [greeted, setGreeted] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingMessages, setPendingMessages] = useState<string[]>([]);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<Message[]>([]);
  const mutedRef = useRef(false);
  const openRef = useRef(false);

  const hasSpeechInput =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    historyRef.current = messages;
  }, [messages]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, transcript]);

  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    ttsAbortRef.current?.abort();
    setSpeaking(false);
  }, []);

  const speakText = useCallback(
    async (text: string) => {
      if (mutedRef.current) return;
      stopAudio();
      ttsAbortRef.current = new AbortController();
      setSpeaking(true);
      const audio = await fetchTTS(text, ttsAbortRef.current.signal);
      if (!audio) {
        setSpeaking(false);
        return;
      }
      currentAudioRef.current = audio;
      return new Promise<void>((resolve) => {
        audio.onended = () => {
          currentAudioRef.current = null;
          setSpeaking(false);
          resolve();
        };
        audio.onerror = () => {
          currentAudioRef.current = null;
          setSpeaking(false);
          resolve();
        };
        audio.play().catch(() => {
          currentAudioRef.current = null;
          setSpeaking(false);
          resolve();
        });
      });
    },
    [stopAudio]
  );

  const addProfessorMessage = useCallback(
    async (text: string, speak = true) => {
      setMessages((prev) => [...prev, { role: "professor", text }]);
      if (speak) await speakText(text);
    },
    [speakText]
  );

  // Listen for proactive professor events from anywhere in the app
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ProfessorProactiveDetail>).detail;
      if (!detail?.text) return;

      if (openRef.current) {
        addProfessorMessage(detail.text, true);
      } else {
        setPendingMessages((prev) => [...prev, detail.text]);
        setPendingCount((n) => n + 1);
      }
    };
    window.addEventListener("professor:proactive", handler);
    return () => window.removeEventListener("professor:proactive", handler);
  }, [addProfessorMessage]);

  // When panel opens: greet + flush any pending proactive messages
  useEffect(() => {
    if (!open) return;

    const profile = (() => {
      try {
        const raw = localStorage.getItem("studyai_profile");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

    if (!greeted) {
      setGreeted(true);
      const greeting = profile?.nome
        ? `Oi, ${profile.nome}! Aqui é o Professor Alex. Sobre o que você quer estudar hoje?`
        : "Oi! Aqui é o Professor Alex, seu tutor do StudyAI. Sobre o que você quer estudar hoje?";
      setMessages([{ role: "professor", text: greeting }]);
      setPendingCount(0);

      // After greeting, flush pending proactive messages
      const pending = pendingMessages.slice();
      setPendingMessages([]);

      setTimeout(async () => {
        await speakText(greeting);
        for (const msg of pending) {
          if (!mutedRef.current) await addProfessorMessage(msg, true);
        }
      }, 300);
    } else if (pendingMessages.length > 0) {
      const pending = pendingMessages.slice();
      setPendingMessages([]);
      setPendingCount(0);
      setTimeout(async () => {
        for (const msg of pending) {
          await addProfessorMessage(msg, true);
        }
      }, 300);
    } else {
      setPendingCount(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim()) return;
      setMessages((prev) => [...prev, { role: "user", text: userText }]);
      setTranscript("");
      setLoading(true);
      stopAudio();

      try {
        chatAbortRef.current?.abort();
        chatAbortRef.current = new AbortController();

        const history = historyRef.current.map((m) => ({
          role: m.role === "professor" ? "assistant" : "user",
          content: m.text,
        }));

        const res = await fetch(`${BASE_URL}/api/voice-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({
            messages: [...history, { role: "user", content: userText }],
          }),
          signal: chatAbortRef.current.signal,
          credentials: "include",
        });

        if (!res.ok) throw new Error("Erro na resposta");

        let fullText = "";
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        setLoading(false);
        setMessages((prev) => [...prev, { role: "professor", text: "" }]);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "professor", text: fullText };
                  return updated;
                });
              }
            } catch {}
          }
        }

        if (fullText) await speakText(fullText);
      } catch (err: any) {
        setLoading(false);
        if (err?.name !== "AbortError") {
          setError("Não consegui responder. Tente novamente.");
        }
      }
    },
    [speakText, stopAudio]
  );

  const startListening = useCallback(() => {
    if (!hasSpeechInput) {
      setError("Seu navegador não suporta voz. Use Chrome ou Edge.");
      return;
    }
    stopAudio();
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (event: any) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      setTranscript(finalText || interimText);
      if (finalText) {
        sendMessage(finalText);
        setTranscript("");
      }
    };
    rec.onerror = (e: any) => {
      setListening(false);
      if (e.error !== "no-speech") setError("Erro no microfone: " + e.error);
    };
    recognitionRef.current = rec;
    rec.start();
  }, [hasSpeechInput, sendMessage, stopAudio]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const handleClose = () => {
    stopAudio();
    stopListening();
    setOpen(false);
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => (open ? handleClose() : setOpen(true))}
        className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white"
        style={{
          background: open
            ? "#6b7280"
            : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
        }}
        title="Professor Alex — Tutor por voz"
      >
        {open ? (
          <X className="w-5 h-5" />
        ) : (
          <div className="relative">
            <span className="text-2xl leading-none">👨‍🏫</span>
            {pendingCount > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-black animate-bounce">
                {pendingCount}
              </span>
            ) : (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
            )}
          </div>
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed bottom-24 left-4 right-4 sm:left-6 sm:right-auto sm:w-96 z-40 rounded-3xl shadow-2xl overflow-hidden border border-orange-100 bg-white"
            style={{ maxHeight: "72vh", display: "flex", flexDirection: "column" }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 p-4 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
            >
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                  👨‍🏫
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white transition-colors ${
                    speaking
                      ? "bg-yellow-400 animate-pulse"
                      : listening
                      ? "bg-red-400 animate-pulse"
                      : "bg-green-400"
                  }`}
                />
              </div>
              <div className="flex-1">
                <p className="text-white font-black text-sm leading-none">Professor Alex</p>
                <p className="text-orange-100 text-xs mt-0.5">
                  {speaking
                    ? "Falando..."
                    : listening
                    ? "Ouvindo você..."
                    : loading
                    ? "Pensando..."
                    : "Tutor de Voz IA • Online"}
                </p>
              </div>
              <button
                onClick={() => setMuted((m) => !m)}
                className="text-white/70 hover:text-white transition-colors p-1"
                title={muted ? "Ativar som" : "Silenciar"}
              >
                {muted ? <VolumeX className="w-5 h-5" /> : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072" />
                  </svg>
                )}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {msg.role === "professor" && (
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-base flex-shrink-0 mt-0.5">
                      👨‍🏫
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 max-w-[82%] text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-sm"
                        : "bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm"
                    }`}
                  >
                    {msg.text || (
                      <span className="flex gap-1 py-1">
                        {[0, 150, 300].map((d) => (
                          <span
                            key={d}
                            className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${d}ms` }}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Interim transcript */}
              {transcript && (
                <div className="flex flex-row-reverse">
                  <div className="rounded-2xl px-4 py-2.5 max-w-[82%] text-sm bg-orange-50 text-orange-600 italic rounded-tr-sm border border-orange-100">
                    {transcript}
                  </div>
                </div>
              )}

              {error && (
                <div className="text-center text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">
                  {error}{" "}
                  <button onClick={() => setError(null)} className="underline">
                    OK
                  </button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Controls */}
            <div className="p-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={listening ? stopListening : startListening}
                  disabled={loading}
                  className={`flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md ${
                    listening
                      ? "bg-red-500 text-white shadow-red-200"
                      : "bg-orange-500 text-white shadow-orange-200 hover:bg-orange-600"
                  }`}
                >
                  {listening ? (
                    <>
                      <MicOff className="w-4 h-4" /> Parar de falar
                    </>
                  ) : speaking ? (
                    <>
                      <Mic className="w-4 h-4" /> Interromper e falar
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" /> Falar com o Professor
                    </>
                  )}
                </motion.button>
                {speaking && (
                  <button
                    onClick={stopAudio}
                    title="Silenciar resposta atual"
                    className="px-3 py-3 rounded-2xl bg-gray-200 hover:bg-gray-300 transition-colors"
                  >
                    <VolumeX className="w-4 h-4 text-gray-600" />
                  </button>
                )}
              </div>
              {!hasSpeechInput && (
                <p className="text-xs text-center text-gray-400 mt-2">
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
