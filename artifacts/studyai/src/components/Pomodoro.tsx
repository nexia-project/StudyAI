import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Play, Pause, RotateCcw, X, Coffee, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "idle" | "work" | "break";

const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;
const CYCLES_BEFORE_LONG_BREAK = 4;

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export function PomodoroWidget() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WORK_MINUTES * 60);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = phase === "break"
    ? (cycles % CYCLES_BEFORE_LONG_BREAK === 0 && cycles > 0 ? LONG_BREAK_MINUTES : BREAK_MINUTES) * 60
    : WORK_MINUTES * 60;

  const pct = (secondsLeft / totalSeconds) * 100;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  const startWork = useCallback(() => {
    setPhase("work");
    setSecondsLeft(WORK_MINUTES * 60);
    setRunning(true);
  }, []);

  const startBreak = useCallback((cyclesDone: number) => {
    const isLong = cyclesDone % CYCLES_BEFORE_LONG_BREAK === 0;
    setPhase("break");
    setSecondsLeft((isLong ? LONG_BREAK_MINUTES : BREAK_MINUTES) * 60);
    setRunning(true);
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("idle");
    setRunning(false);
    setSecondsLeft(WORK_MINUTES * 60);
    setCycles(0);
  }, []);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          if (phase === "work") {
            const newCycles = cycles + 1;
            setCycles(newCycles);
            startBreak(newCycles);
          } else {
            startWork();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [running, phase, cycles, startBreak, startWork]);

  const phaseLabel = phase === "work" ? "Foco 🔥" : phase === "break" ? "Pausa ☕" : "Pronto";
  const phaseColor = phase === "work" ? "#8b5cf6" : phase === "break" ? "#10b981" : "#6b7280";
  const breakDuration = (cycles > 0 && cycles % CYCLES_BEFORE_LONG_BREAK === 0) ? LONG_BREAK_MINUTES : BREAK_MINUTES;

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-xl shadow-violet-300/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        title="Pomodoro Timer"
      >
        <Timer className="w-6 h-6" />
        {running && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 left-6 z-40 w-72 bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-gray-50">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-violet-600" />
                <span className="font-black text-gray-900">Pomodoro</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-600" />
              </button>
            </div>

            <div className="px-5 py-6 flex flex-col items-center gap-5">
              {/* Circle Timer */}
              <div className="relative w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="54" fill="none"
                    stroke={phaseColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={phase === "idle" ? 0 : strokeDashoffset}
                    style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-gray-900 tabular-nums">
                    {formatTime(secondsLeft)}
                  </span>
                  <span className="text-xs font-bold mt-0.5" style={{ color: phaseColor }}>
                    {phaseLabel}
                  </span>
                </div>
              </div>

              {/* Cycles indicator */}
              <div className="flex gap-1.5 items-center">
                {Array.from({ length: CYCLES_BEFORE_LONG_BREAK }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-3 h-3 rounded-full transition-all",
                      i < (cycles % CYCLES_BEFORE_LONG_BREAK)
                        ? "bg-violet-500 scale-110"
                        : "bg-gray-200"
                    )}
                  />
                ))}
                <span className="text-xs text-gray-400 font-medium ml-1">
                  {cycles} ciclo{cycles !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Info */}
              <div className="w-full text-center text-xs text-gray-400 space-y-1">
                <div className="flex justify-between px-2">
                  <span className="flex items-center gap-1"><Brain className="w-3 h-3" /> Foco: 25 min</span>
                  <span className="flex items-center gap-1"><Coffee className="w-3 h-3" /> Pausa: {breakDuration} min</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-2 w-full">
                {phase === "idle" ? (
                  <button
                    onClick={startWork}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 text-sm"
                  >
                    <Play className="w-4 h-4" /> Iniciar Foco
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setRunning((r) => !r)}
                      className={cn(
                        "flex-1 font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 text-sm",
                        running
                          ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                          : "bg-violet-100 hover:bg-violet-200 text-violet-700"
                      )}
                    >
                      {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {running ? "Pausar" : "Continuar"}
                    </button>
                    <button
                      onClick={reset}
                      className="w-12 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                    >
                      <RotateCcw className="w-4 h-4 text-gray-600" />
                    </button>
                  </>
                )}
              </div>

              {/* Tips */}
              <div className={cn(
                "w-full rounded-2xl p-3 text-xs font-medium text-center transition-all",
                phase === "work" ? "bg-violet-50 text-violet-700" : phase === "break" ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-500"
              )}>
                {phase === "work"
                  ? "📵 Celular na gaveta. Foco total por 25 min."
                  : phase === "break"
                  ? "🚶 Levante, beba água, descanse os olhos."
                  : "Técnica usada em universidades finlandesas e japonesas."}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
