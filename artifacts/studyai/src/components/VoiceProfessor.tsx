import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX, X } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

type Message = { role: "user" | "professor"; text: string };

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

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSpeakingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<Message[]>([]);

  const hasSpeechInput =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const hasSpeechOutput =
    typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    historyRef.current = messages;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, transcript]);

  const speakText = useCallback(
    (text: string) => {
      if (muted || !hasSpeechOutput) return Promise.resolve();
      return new Promise<void>((resolve) => {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = "pt-BR";
        utt.rate = 1.05;
        utt.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const ptVoice =
          voices.find((v) => v.lang.includes("pt") && v.name.toLowerCase().includes("google")) ||
          voices.find((v) => v.lang.includes("pt-BR")) ||
          voices.find((v) => v.lang.includes("pt"));
        if (ptVoice) utt.voice = ptVoice;
        utt.onstart = () => {
          isSpeakingRef.current = true;
          setSpeaking(true);
        };
        utt.onend = () => {
          isSpeakingRef.current = false;
          setSpeaking(false);
          resolve();
        };
        utt.onerror = () => {
          isSpeakingRef.current = false;
          setSpeaking(false);
          resolve();
        };
        window.speechSynthesis.speak(utt);
      });
    },
    [muted, hasSpeechOutput]
  );

  const stopSpeaking = useCallback(() => {
    if (hasSpeechOutput) window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    setSpeaking(false);
  }, [hasSpeechOutput]);

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim()) return;
      const userMsg: Message = { role: "user", text: userText };
      setMessages((prev) => [...prev, userMsg]);
      setTranscript("");
      setLoading(true);
      stopSpeaking();

      try {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        const history = historyRef.current.map((m) => ({
          role: m.role === "professor" ? "assistant" : "user",
          content: m.text,
        }));

        const res = await fetch(`${BASE_URL}/api/voice-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            messages: [...history, { role: "user", content: userText }],
          }),
          signal: abortRef.current.signal,
          credentials: "include",
        });

        if (!res.ok) throw new Error("Erro na resposta");

        let fullText = "";
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        setLoading(false);
        const placeholderMsg: Message = { role: "professor", text: "" };
        setMessages((prev) => [...prev, placeholderMsg]);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value).split("\n");
          for (const line of lines) {
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
    [speakText, stopSpeaking]
  );

  useEffect(() => {
    if (open && !greeted) {
      setGreeted(true);
      const profile = (() => {
        try {
          const raw = localStorage.getItem("studyai_profile");
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();
      const greeting = profile?.nome
        ? `Oi, ${profile.nome}! Tudo certo? Aqui é o Professor Alex, seu tutor do StudyAI. Sobre o que você quer estudar hoje?`
        : "Oi! Aqui é o Professor Alex, seu tutor do StudyAI. Sobre o que você quer estudar hoje? Pode ser qualquer matéria!";
      setMessages([{ role: "professor", text: greeting }]);
      setTimeout(() => speakText(greeting), 400);
    }
  }, [open, greeted, speakText]);

  const startListening = useCallback(() => {
    if (!hasSpeechInput) {
      setError("Seu navegador não suporta voz. Use Chrome ou Edge.");
      return;
    }
    stopSpeaking();
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
  }, [hasSpeechInput, sendMessage, stopSpeaking]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const handleClose = () => {
    stopSpeaking();
    stopListening();
    setOpen(false);
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => (open ? handleClose() : setOpen(true))}
        className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white"
        style={{ background: open ? "#6b7280" : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" }}
        title="Professor IA — Conversa por voz"
      >
        {open ? (
          <X className="w-5 h-5" />
        ) : (
          <div className="relative">
            <span className="text-2xl leading-none">👨‍🏫</span>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
          </div>
        )}
      </motion.button>

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
            <div
              className="flex items-center gap-3 p-4 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
            >
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                  👨‍🏫
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
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
              >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>

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
                      <MicOff className="w-4 h-4" /> Parar
                    </>
                  ) : speaking ? (
                    <>
                      <Mic className="w-4 h-4" /> Interromper
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" /> Falar com o Professor
                    </>
                  )}
                </motion.button>
                {speaking && (
                  <button
                    onClick={stopSpeaking}
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
