import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowLeft, Play, Pause, RotateCcw, Users, Send, Coffee, BookOpen,
  Target, Flame, Timer, Bell, BellOff, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";

type ModoTimer = "pomodoro" | "pausa-curta" | "pausa-longa";

const TIMER_CONFIGS: Record<ModoTimer, { label: string; minutos: number; cor: string; emoji: string }> = {
  "pomodoro":    { label: "Foco Total",    minutos: 25, cor: "from-rose-500 to-orange-500",   emoji: "🍅" },
  "pausa-curta": { label: "Pausa Rápida",  minutos: 5,  cor: "from-emerald-500 to-teal-500",  emoji: "☕" },
  "pausa-longa": { label: "Pausa Longa",   minutos: 15, cor: "from-violet-500 to-purple-600",   emoji: "🌿" },
};

function gerarSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function SalaEstudosPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Timer
  const [modo, setModo] = useState<ModoTimer>("pomodoro");
  const [rodando, setRodando] = useState(false);
  const [segundos, setSegundos] = useState(TIMER_CONFIGS.pomodoro.minutos * 60);
  const [pomodorosCompletos, setPomodorosCompletos] = useState(0);
  const [som, setSom] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sala
  const [sessionId] = useState(() => gerarSessionId());
  const [online, setOnline] = useState(1);
  const [estudantes, setEstudantes] = useState<{ nome?: string; meta?: string }[]>([]);
  const [meta, setMeta] = useState("");
  const [metaInput, setMetaInput] = useState("");
  const [metaSalva, setMetaSalva] = useState(false);

  const config = TIMER_CONFIGS[modo];

  // Entrar na sala ao carregar
  useEffect(() => {
    const nome = user?.firstName || undefined;
    fetch("/api/sala-estudos/entrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sessionId, nome, meta: meta || undefined }),
    }).then(r => r.json()).then(d => {
      setOnline(d.online || 1);
    }).catch(() => {});

    return () => {
      fetch("/api/sala-estudos/sair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    };
  }, []);

  // Heartbeat a cada 60s + busca status
  useEffect(() => {
    const hb = setInterval(() => {
      fetch("/api/sala-estudos/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId }),
      }).then(r => r.json()).then(d => setOnline(d.online || 1)).catch(() => {});
    }, 30000);

    const statusInterval = setInterval(() => {
      fetch("/api/sala-estudos/status", { credentials: "include" })
        .then(r => r.json())
        .then(d => {
          setOnline(d.online || 1);
          setEstudantes(d.estudantes || []);
        }).catch(() => {});
    }, 10000);

    // Fetch inicial
    fetch("/api/sala-estudos/status", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setOnline(d.online || 1);
        setEstudantes(d.estudantes || []);
      }).catch(() => {});

    return () => { clearInterval(hb); clearInterval(statusInterval); };
  }, []);

  // Timer logic
  useEffect(() => {
    if (rodando) {
      timerRef.current = setInterval(() => {
        setSegundos(s => {
          if (s <= 1) {
            clearInterval(timerRef.current!);
            setRodando(false);
            if (modo === "pomodoro") {
              setPomodorosCompletos(p => p + 1);
              if (som) {
                try {
                  const ctx = new AudioContext();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.frequency.value = 880;
                  gain.gain.setValueAtTime(0.3, ctx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
                  osc.start();
                  osc.stop(ctx.currentTime + 1);
                } catch {}
              }
            }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [rodando, modo, som]);

  function trocarModo(novoModo: ModoTimer) {
    setModo(novoModo);
    setRodando(false);
    setSegundos(TIMER_CONFIGS[novoModo].minutos * 60);
  }

  function reiniciar() {
    setRodando(false);
    setSegundos(config.minutos * 60);
  }

  function salvarMeta() {
    if (!metaInput.trim()) return;
    setMeta(metaInput.trim());
    setMetaSalva(true);
    // Atualiza na sala
    fetch("/api/sala-estudos/entrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sessionId, nome: user?.firstName, meta: metaInput.trim() }),
    }).catch(() => {});
    setTimeout(() => setMetaSalva(false), 2000);
  }

  const minutos = Math.floor(segundos / 60);
  const secs = segundos % 60;
  const progresso = 1 - segundos / (config.minutos * 60);

  const circumference = 2 * Math.PI * 90;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/app")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-300 font-bold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Sair da sala
          </button>
          <div className="flex-1 text-center">
            <span className="font-black text-white">🍅 Sala de Estudos</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-bold">{online} online</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Modo selector */}
        <div className="flex gap-2 bg-white/5 rounded-2xl p-1.5">
          {(Object.entries(TIMER_CONFIGS) as [ModoTimer, typeof TIMER_CONFIGS.pomodoro][]).map(([key, val]) => (
            <button
              key={key}
              onClick={() => trocarModo(key)}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                modo === key
                  ? `bg-gradient-to-r ${val.cor} text-white shadow-lg`
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              {val.emoji} {val.label}
            </button>
          ))}
        </div>

        {/* Timer circle */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-56 h-56">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle
                cx="100" cy="100" r="90" fill="none"
                stroke="url(#timerGrad)" strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progresso)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
              <defs>
                <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-white tabular-nums">
                {String(minutos).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </span>
              <span className="text-slate-400 text-sm mt-1">{config.emoji} {config.label}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={reiniciar}
              className="w-12 h-12 rounded-2xl bg-white/10 text-slate-300 hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setRodando(r => !r)}
              className={cn(
                "w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl transition-all",
                `bg-gradient-to-br ${config.cor} hover:scale-105`
              )}
            >
              {rodando
                ? <Pause className="w-8 h-8 text-white" />
                : <Play className="w-8 h-8 text-white ml-1" />
              }
            </button>
            <button
              onClick={() => setSom(s => !s)}
              className="w-12 h-12 rounded-2xl bg-white/10 text-slate-300 hover:bg-white/20 flex items-center justify-center transition-all"
              title={som ? "Silenciar" : "Ativar som"}
            >
              {som ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </button>
          </div>

          {/* Pomodoros */}
          {pomodorosCompletos > 0 && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(pomodorosCompletos, 8) }).map((_, i) => (
                <span key={i} className="text-lg">🍅</span>
              ))}
              <span className="text-slate-400 text-sm ml-1">{pomodorosCompletos} pomodoro{pomodorosCompletos !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* Meta do dia */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <h3 className="font-bold text-slate-300 text-sm mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            Minha meta para hoje
          </h3>
          {meta ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-white text-sm">{meta}</p>
              <button
                onClick={() => { setMeta(""); setMetaInput(""); }}
                className="ml-auto text-slate-500 hover:text-slate-300 text-xs"
              >
                alterar
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={metaInput}
                onChange={e => setMetaInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && salvarMeta()}
                placeholder="Ex: Revisar capítulo 5 de Química..."
                className="flex-1 bg-white/10 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-violet-400"
              />
              <button
                onClick={salvarMeta}
                className="px-3 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
          {metaSalva && (
            <p className="text-emerald-400 text-xs mt-2">✓ Meta publicada na sala!</p>
          )}
        </div>

        {/* Estudantes online */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <h3 className="font-bold text-slate-300 text-sm mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Estudando agora — {online} pessoa{online !== 1 ? "s" : ""}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm text-white font-medium">
                {user?.firstName || "Você"} (eu)
              </span>
              {meta && <span className="ml-auto text-xs text-slate-500 truncate max-w-[140px]">{meta}</span>}
            </div>
            {estudantes.filter(e => e.nome !== user?.firstName).slice(0, 10).map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-emerald-400 opacity-60" />
                <span className="text-sm text-slate-300">{e.nome || "Estudante"}</span>
                {e.meta && <span className="ml-auto text-xs text-slate-500 truncate max-w-[140px]">{e.meta}</span>}
              </div>
            ))}
            {online > 1 && estudantes.length === 0 && (
              <p className="text-slate-500 text-xs">+ {online - 1} estudante{online - 1 !== 1 ? "s" : ""} online (sem nome público)</p>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { emoji: "🎯", label: "25 min foco", desc: "Técnica Pomodoro" },
            { emoji: "☕", label: "5 min pausa", desc: "Descanso curto" },
            { emoji: "🌿", label: "15 min longa", desc: "A cada 4 pomodoros" },
          ].map(tip => (
            <div key={tip.label} className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
              <div className="text-2xl mb-1">{tip.emoji}</div>
              <div className="text-xs font-bold text-slate-300">{tip.label}</div>
              <div className="text-xs text-slate-500">{tip.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
