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

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TiagaoCharacter, type CharacterState } from "@/components/TiagaoCharacter";
import {
  Mic, MicOff, X, Square, VolumeX, Volume2, ThumbsUp, ThumbsDown,
  Timer, Maximize2, Minimize2, Send, Paperclip, Loader2, MessageSquare,
  Zap, Settings, RefreshCw, ChevronDown, Radio, Eye, EyeOff,
  RotateCcw, Trash2,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  collectStudentContext,
  triggerProfessorAction,
  triggerProfessor,
  type ProfessorProactiveDetail,
  type ProfessorBehaviorDetail,
} from "@/lib/professor-events";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useStudyAuth } from "@/hooks/useStudyAuth";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
const IDLE_TRIGGER_MS    = 10 * 60 * 1000;
const PROACTIVE_MIN_GAP  = 15 * 60 * 1000;
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
    // Resume immediately inside the user-gesture so the context starts running
    _ctx.resume().catch(() => {});
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
/**
 * Web Speech API funciona razoavelmente em Chrome desktop.
 * Em iOS/Android costuma falhar ou não captar — usamos MediaRecorder + API de transcrição.
 */
function shouldUseBrowserSpeechRecognition(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" &&
      ((navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints ?? 0) > 1);
  if (isIOS) return false;
  if (/Android/i.test(ua)) return false;
  const w = window as unknown as {
    SpeechRecognition?: new () => unknown;
    webkitSpeechRecognition?: new () => unknown;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return typeof Ctor === "function";
}

function detectEmotion(text: string): string {
  if (/parabéns|incrível|mandou bem|orgulho|excelente/i.test(text)) return "excited";
  if (/calma|tranquilo|sem pressa|respira|tá tudo bem/i.test(text)) return "calm";
  if (/vamos lá|bora|força|você consegue|não desiste/i.test(text)) return "encouraging";
  if (/importante|atenção|cuidado|prova|erro comum/i.test(text)) return "serious";
  return "neutral";
}

// ─── SpeechSynthesis fallback (quando servidor TTS indisponível) ──────────────
function pickPtBrVoicePreferMale(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const pt = voices.filter(v => v.lang === "pt-BR" || v.lang.startsWith("pt"));
  if (pt.length === 0) return undefined;
  const maleHints = /male|masculin|homem|antonio|daniel|thiago|felipe|ricardo|marcos|onyx|brasil\s*i\b/i;
  const femaleHints = /female|feminina|microsoft\s*maria|francisca|helena|camila/i;
  let best = pt[0];
  let bestScore = -99;
  for (const v of pt) {
    const n = `${v.name} ${v.voiceURI}`.toLowerCase();
    let s = 0;
    if (maleHints.test(n)) s += 4;
    if (femaleHints.test(n)) s -= 4;
    if (v.lang === "pt-BR") s += 1;
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  return best;
}

function playSpeechSynthesisFallback(text: string, onStart?: () => void, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { resolve(); return; }
    if (signal?.aborted) { resolve(); return; }
    window.speechSynthesis.cancel();
    const clean = text.replace(/\*\*/g, "").replace(/#{1,6}\s/g, "").replace(/\n+/g, " ").trim().slice(0, 800);
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = "pt-BR";
    utt.rate = 1.1;
    utt.pitch = 0.95;
    const applyVoice = () => {
      const v = pickPtBrVoicePreferMale(window.speechSynthesis.getVoices());
      if (v) utt.voice = v;
    };
    applyVoice();
    window.speechSynthesis.addEventListener("voiceschanged", applyVoice, { once: true });
    utt.onstart = () => onStart?.();
    utt.onend = () => resolve();
    utt.onerror = () => resolve();
    signal?.addEventListener("abort", () => { window.speechSynthesis.cancel(); resolve(); }, { once: true });
    window.speechSynthesis.speak(utt);
  });
}

async function playTTS(text: string, onStart?: () => void, signal?: AbortSignal): Promise<void> {
  if (!text.trim()) return;
  stopCurrentAudio();
  const ctx = getCtx();
  try { await ctx.resume(); } catch { /* best-effort */ }
  const emotion = detectEmotion(text);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/voice-tts`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, emotion }), credentials: "include", signal,
    });
  } catch (e: any) {
    if (e?.name !== "AbortError") {
      // Rede falhou: usa SpeechSynthesis direto
      await playSpeechSynthesisFallback(text, onStart, signal);
    }
    return;
  }
  if (signal?.aborted) return;

  // Server retornou 503 tts_unavailable → usa SpeechSynthesis
  if (!res.ok) {
    const isUnavailable = res.status === 503;
    if (isUnavailable) {
      await playSpeechSynthesisFallback(text, onStart, signal);
    }
    return;
  }

  const ab = await res.arrayBuffer();
  if (signal?.aborted) return;
  let audioBuffer: AudioBuffer;
  try { audioBuffer = await ctx.decodeAudioData(ab); } catch (e) {
    // Decodificação falhou (provavelmente resposta de erro): usa SpeechSynthesis
    console.warn("[Tiagão] decodeAudioData failed, usando SpeechSynthesis:", e);
    await playSpeechSynthesisFallback(text, onStart, signal);
    return;
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
  { label: "🔧 Desafio Fazedor",      text: "[Módulo Fazedores] Quero um Desafio Fazedor. Apresenta as 4 categorias (Consertar, Organizar, Criar, Estudar) e, depois que eu escolher uma, crie UMA situação completa seguindo: contexto do dia a dia; 3 perguntas antes de qualquer solução; só então um plano em 5 passos claros; um desafio +1; conexão com estudos; mensagem de orgulho. Nunca dê a solução pronta antes das minhas respostas. Respeite segurança: sem eletricidade aberta, fogo, químicos fortes ou trabalho em altura — só ferramentas simples e ajuda de adulto quando precisar." },
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
                ? level > 70 ? "bg-emerald-400" : level > 40 ? "bg-violet-400" : "bg-violet-300"
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
  const [location, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useStudyAuth();
  const [open, setOpen]           = useState(false);
  const [tab, setTab]             = useState<Tab>("conversa");
  const [phase, setPhase]         = useState<Phase>("idle");
  const [muted, setMuted]         = useState(false);
  // Modo voz pura — DEFAULT ON (sem texto, só áudio). Usuário pode ativar texto pelo botão olho.
  const [voicePure, setVoicePure] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("tiagao_voice_pure");
    return saved === null ? true : saved === "1";
  });
  useEffect(() => {
    try { localStorage.setItem("tiagao_voice_pure", voicePure ? "1" : "0"); } catch { /* ignore */ }
  }, [voicePure]);
  const [showHint, setShowHint]   = useState(true);
  const [textInput, setTextInput] = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [reaction, setReaction]   = useState<"up" | "down" | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [actionNotif, setActionNotif] = useState<{ text: string; path?: string } | null>(null);
  const [history, setHistory]     = useState<HistoryMsg[]>([]);
  const [volume, setVolume]       = useState(0);
  const [planIngestBusy, setPlanIngestBusy] = useState(false);
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
  const planMaterialRef = useRef<HTMLInputElement>(null);

  const useBrowserSpeech = useMemo(() => shouldUseBrowserSpeechRecognition(), []);

  // ── Audio capture (VAD + devices + Whisper fallback) ───────────────────────
  const audioCapture = useAudioCapture({
    silenceTimeoutMs: 1150,
    minSpeechMs: 220,
    vadThreshold: useBrowserSpeech ? 14 : 10,
    onVolume: setVolume,
    onSpeechStart: () => {
      // VAD detected speech — switch to listening phase
      if (!useBrowserSpeech) setPhase("listening");
    },
    onSpeechEnd: async (blob, info) => {
      // When SpeechRecognition is unavailable, send blob to Whisper
      if (useBrowserSpeech) return; // SpeechRecognition handles this
      setPhase("thinking");
      try {
        const ext = info?.extension ?? "webm";
        const form = new FormData();
        form.append("audio", blob, `recording.${ext}`);
        const r = await fetch(`${BASE_URL}/api/transcribe`, { method: "POST", body: form, credentials: "include" });
        if (r.ok) {
          const { text } = await r.json();
          if (text?.trim()) sendMessage(text);
          else setPhase("idle");
        } else {
          setPhase("idle");
          setError("Não consegui transcrever o áudio. Tente falar mais alto ou mais perto do microfone.");
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
      setActionNotif({ text: `📚 Material "${action.titulo}" criado! Abrindo Notebook...`, path: "/notebook" });
      setTimeout(() => setActionNotif(null), 8000);
      if (action.html || action.formato === "html_completo") {
        localStorage.setItem("tiagao_slides_criados", JSON.stringify({ html: action.html, titulo: action.titulo, formato: "html_completo" }));
        window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_slides_criados" } }));
        setTimeout(() => navigate("/notebook"), 1500);
      } else if (action.slides) {
        localStorage.setItem("tiagao_slides_criados", JSON.stringify(action.slides));
        window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_slides_criados" } }));
        setTimeout(() => navigate("/notebook"), 1500);
      }
    } else if (action.type === "criar_prova") {
      setActionNotif({ text: `📝 Prova "${action.titulo}" criada! Salva no Notebook.`, path: "/notebook" });
      setTimeout(() => setActionNotif(null), 8000);
      if (action.prova) {
        localStorage.setItem("tiagao_prova_criada", JSON.stringify(action.prova));
        window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_prova_criada" } }));
      }
    } else if (action.type === "criar_plano_estudos") {
      if (action.html || action.formato === "html_completo") {
        localStorage.setItem("tiagao_resumo", JSON.stringify({ html: action.html, topico: action.titulo, formato: "html_completo" }));
        window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_resumo" } }));
        setTimeout(() => navigate("/notebook"), 800);
      }
      setActionNotif({ text: `📅 Plano "${action.titulo}" criado! Ver no Notebook.`, path: "/notebook" });
      setTimeout(() => setActionNotif(null), 8000);
    } else if (action.type === "criar_mapa_mental") {
      if (action.mapa) {
        localStorage.setItem("tiagao_mapa_mental", JSON.stringify(action.mapa));
        window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_mapa_mental" } }));
      }
      setActionNotif({ text: `🗺️ Mapa mental "${action.titulo}" criado! Ver no Notebook.`, path: "/notebook" });
      setTimeout(() => setActionNotif(null), 8000);
    } else if (action.type === "criar_infografico") {
      if (action.html || action.formato === "html_completo") {
        localStorage.setItem("tiagao_resumo", JSON.stringify({ html: action.html, topico: action.topico, formato: "html_completo" }));
        window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_resumo" } }));
        setTimeout(() => navigate("/notebook"), 800);
      } else if (action.infografico) {
        localStorage.setItem("tiagao_infografico", JSON.stringify(action.infografico));
        window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_infografico" } }));
      }
      setActionNotif({ text: `📊 Infográfico "${action.topico ?? action.titulo}" criado! Ver no Notebook.`, path: "/notebook" });
      setTimeout(() => setActionNotif(null), 8000);
    } else if (action.type === "criar_resumo") {
      if (action.html || action.formato === "html_completo") {
        localStorage.setItem("tiagao_resumo", JSON.stringify({ html: action.html, topico: action.topico, formato: "html_completo" }));
        window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_resumo" } }));
      } else if (action.resumo) {
        localStorage.setItem("tiagao_resumo", JSON.stringify(action.resumo));
        window.dispatchEvent(new CustomEvent("tiagao_artifact", { detail: { key: "tiagao_resumo" } }));
      }
      setActionNotif({ text: `📚 Material de Resumo "${action.topico ?? action.titulo}" criado! Ver no Notebook.`, path: "/notebook" });
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
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(`HTTP ${res.status}${errBody?._debug ? `: ${errBody._debug}` : ""}`);
      }
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
        const detail = e?.message && e.message !== "Failed to fetch" ? ` (${e.message})` : "";
        setError(`Não consegui responder. Tente de novo.${detail}`);
        setRetrying(true);
      }
    }
  }, [speak, handleAgentActions, voicePure]);

  /**
   * Ingest plano: envia arquivos para extração leve no servidor e empurra para o voice-chat.
   *
   * Otimizações vs versão anterior:
   * - Mostra mensagem de progresso "Lendo o material..." no histórico (placeholder
   *   substituível) em vez de o usuário ficar olhando spinner mudo no clipe.
   * - 90s AbortController de timeout — se /tutor-extract-files travar, o usuário
   *   recebe erro acionável (com botão Retry) em vez de loading infinito.
   * - Truncate agressivo client-side (3500 chars) ANTES do voice-chat. O voice-chat
   *   já corta cada msg, então mandar 14k era puro desperdício de banda e tokens.
   * - Trim filename prefix antes do conteúdo: o modelo já recebe via `messages` a
   *   meta dos arquivos via context; aqui foco é só o conteúdo útil.
   */
  const ingestPlanMaterial = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setPlanIngestBusy(true);
    setError(null);

    // ── Placeholder visível no histórico — "Lendo material..." ────────────────
    const progressId = Date.now();
    const fileNamesPreview = Array.from(files).map(f => f.name).join(", ");
    setHistory(h => [
      ...h,
      {
        role: "assistant",
        text: `📎 Lendo o material que você me mandou (${fileNamesPreview})… isso costuma levar uns segundos.`,
        ts: progressId,
      },
    ]);

    const timeoutAc = new AbortController();
    const timeoutId = setTimeout(() => timeoutAc.abort(), 90_000);

    try {
      const form = new FormData();
      for (const f of Array.from(files)) form.append("files", f);
      const r = await fetch(`${BASE_URL}/api/tutor-extract-files`, {
        method: "POST",
        body: form,
        credentials: "include",
        signal: timeoutAc.signal,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(typeof j.erro === "string" ? j.erro : "Não consegui ler estes arquivos.");
        // Substitui o placeholder pelo erro curto
        setHistory(h => h.map(m =>
          m.ts === progressId
            ? { ...m, text: "Hmm, não consegui ler esses arquivos. Pode mandar de novo?" }
            : m,
        ));
        return;
      }
      const filenames = Array.isArray(j.filenames)
        ? (j.filenames as unknown[]).filter((x): x is string => typeof x === "string")
        : [];
      try {
        const rawLog = sessionStorage.getItem("studyai_tiagao_attachment_log");
        const prev = rawLog ? (JSON.parse(rawLog) as unknown) : [];
        const list = Array.isArray(prev) ? (prev as { t: number; f: string[] }[]) : [];
        list.push({ t: Date.now(), f: filenames.length ? filenames : ["anexo"] });
        sessionStorage.setItem("studyai_tiagao_attachment_log", JSON.stringify(list.slice(-12)));
      } catch { /* ignore */ }

      // ── Truncate agressivo: voice-chat corta msgs >4k chars; e o Tiagão usa
      // esse texto só pra ENTENDER, não pra reescrever. 3500 chars já cobre 1-2
      // páginas A4 de conteúdo, suficiente para esboçar plano de estudos.
      const extracted = String(j.extracted || "").slice(0, 3_500);
      const names = filenames.length ? filenames.join(", ") : "anexo";

      // Remove o placeholder antes do sendMessage (o sendMessage vai adicionar
      // a mensagem do usuário e a resposta — placeholder fica sobrando)
      setHistory(h => h.filter(m => m.ts !== progressId));

      await sendMessage(
        `Anexei material para montarmos o plano de estudos (${names}). Lê com calma e me orienta — conteúdo:\n\n${extracted}`,
        false,
      );
    } catch (e: any) {
      const isTimeout = e?.name === "AbortError";
      const msg = isTimeout
        ? "Demorou demais para ler os arquivos. Tenta arquivos menores ou um por vez."
        : "Falha ao enviar os arquivos. Tenta de novo.";
      setError(msg);
      setHistory(h => h.map(m =>
        m.ts === progressId ? { ...m, text: msg } : m,
      ));
    } finally {
      clearTimeout(timeoutId);
      setPlanIngestBusy(false);
      if (planMaterialRef.current) planMaterialRef.current.value = "";
    }
  }, [sendMessage]);

  // ── Saudação variada ao abrir o painel (uma vez por carga da página) ────────
  useEffect(() => {
    if (!open) return;
    if (greetedRef.current) return;
    unlockAudioSync();
    let cancelled = false;
    (async () => {
      let greeting = "";
      try {
        const r = await fetch(`${BASE_URL}/api/tiagao-opening`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context: collectStudentContext(), origem: "painel" }),
          credentials: "include",
        });
        if (r.ok) {
          const j = await r.json();
          greeting = String(j.text || "").trim();
        }
      } catch { /* ignore */ }
      if (cancelled) return;
      const ctx = collectStudentContext();
      if (!greeting || greeting.length < 25) {
        const n = ctx.nome && ctx.nome !== "Herói" ? ctx.nome.split(/\s+/)[0] : "";
        greeting = n
          ? `E aí, ${n}! Sou o Tiagão. O que você quer dominar agora? A gente pode montar um plano de estudos juntos — se tiver PDF, Word ou foto do caderno, anexa aqui no clipe que eu já leio. Por onde começamos?`
          : `Oi! Tiagão aqui. Me conta o foco de hoje: prova, matéria ou revisão? Posso criar um plano com você; manda PDF, Word ou imagem no anexo que eu já uso. Bora?`;
      }
      greetedRef.current = true;
      historyRef.current = [{ role: "assistant", content: greeting }];
      lastProactiveRef.current = Date.now();
      setHistory([{ role: "assistant", text: greeting, ts: Date.now() }]);
      setTimeout(() => { if (!cancelled) void speak(greeting); }, 300);
    })();
    return () => { cancelled = true; };
  }, [open, speak]);

  useEffect(() => {
    const lines = history.filter(m => m.role === "assistant").slice(-4).map(m => m.text.slice(0, 160));
    try {
      sessionStorage.setItem("studyai_tiagao_recent_assistant", JSON.stringify(lines));
    } catch { /* ignore */ }
  }, [history]);

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

  // ── Boas-vindas na entrada do app (1× por sessão) — primeira impressão ─────
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const path = location || "/";
    if (/^\/($|sign-in|sign-up)/.test(path)) return;

    const KEY = "studyai_tiagao_app_entry_greet_v1";
    let cancelled = false;
    let sto: ReturnType<typeof setTimeout> | undefined;

    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {
      return;
    }

    const delayMs = 3000;
    sto = setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        try {
          if (sessionStorage.getItem(KEY)) return;
          sessionStorage.setItem(KEY, "pending");
        } catch {
          return;
        }

        if (mutedRef.current || greetedRef.current) {
          try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
          return;
        }

        let greeting = "";
        try {
          const r = await fetch(`${BASE_URL}/api/tiagao-opening`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ context: collectStudentContext(), origem: "app_entry" }),
            credentials: "include",
          });
          if (r.ok) {
            const j = await r.json();
            greeting = String(j.text || "").trim();
          }
        } catch { /* ignore */ }

        if (cancelled || mutedRef.current || greetedRef.current) {
          try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
          return;
        }

        const ctx = collectStudentContext();
        if (!greeting || greeting.length < 25) {
          const n = ctx.nome && ctx.nome !== "Herói" ? ctx.nome.split(/\s+/)[0] : "";
          greeting = n
            ? `Oi, ${n}! Tiagão aqui com você no StudyAI. Me diz: por onde você quer que a gente comece hoje?`
            : `Oi! Tiagão por aqui no StudyAI. O que você quer organizar ou estudar primeiro?`;
        }

        try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
        greetedRef.current = true;
        lastProactiveRef.current = Date.now();
        triggerProfessor(greeting, "app_entry");
        setShowHint(true);
      })();
    }, delayMs);

    return () => {
      cancelled = true;
      if (sto) clearTimeout(sto);
      try {
        if (sessionStorage.getItem(KEY) === "pending") sessionStorage.removeItem(KEY);
      } catch { /* ignore */ }
    };
  }, [speak, isAuthenticated, authLoading, location]);

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

  // ── First open / close panel ───────────────────────────────────────────────
  const handlePanelToggle = useCallback(() => {
    setShowHint(false);
    setOpen(o => {
      const next = !o;
      if (next) unlockAudioSync();
      if (!next) {
        audioCapture.stop();
        setVolume(0);
      }
      return next;
    });
  }, [audioCapture]);

  // ── Speech recognition ──────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    stopSpeaking();

    // Aborta reconhecimento anterior sem disparar eventos (evita race conditions)
    if (recognitionRef.current) {
      const old = recognitionRef.current;
      old.onend = null; old.onerror = null; old.onresult = null;
      try { old.abort(); } catch { /* best-effort */ }
      recognitionRef.current = null;
    }

    // ── Fallback: sem SpeechRecognition → usa VAD + Whisper ─────────────────
    if (!useBrowserSpeech) {
      // Single start — o hook é mutex-protegido (não duplica streams)
      const ok = await audioCapture.start();
      if (!ok) return; // Error shown by hook
      setPhase("listening");
      return;
    }

    // ── SpeechRecognition disponível: ativa VAD em paralelo só pra visualizar volume
    // (start é idempotente; o mutex no hook impede duplicação)
    if (!audioCapture.isRecording) {
      audioCapture.start().catch(() => { /* silencioso */ });
    }

    // ── Primary: SpeechRecognition ───────────────────────────────────────────
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => { setPhase("listening"); };
    rec.onend = () => { setPhase(p => p === "listening" ? "idle" : p); };
    rec.onresult = (event: any) => {
      let interim = "", final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t; else interim += t;
      }
      if (final) {
        // Remove handlers ANTES de enviar para evitar que onerror("aborted")
        // sobrescreva o phase "thinking" enquanto a resposta é processada
        rec.onend = null; rec.onerror = null;
        setTextInput(""); sendMessage(final);
      } else if (!voicePure) setTextInput(interim);
    };
    rec.onerror = (e: any) => {
      // Só reseta para idle se ainda estiver ouvindo — não sobrescreve "thinking"/"speaking"
      setPhase(p => p === "listening" ? "idle" : p);
      if (e.error === "not-allowed" || e.error === "permission-denied") {
        setError("Permissão de microfone negada. Libere nas configurações do navegador.");
        setTab("config");
      } else if (e.error === "no-speech" || e.error === "aborted") {
        // não é erro real
      } else {
        setError("Erro no microfone: " + e.error);
      }
    };
    recognitionRef.current = rec;
    rec.start();
  }, [useBrowserSpeech, sendMessage, stopSpeaking, phase, audioCapture]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* ok */ }
    audioCapture.stop();
    setVolume(0);
    setPhase("idle");
  }, [audioCapture]);

  // ── UI config ───────────────────────────────────────────────────────────────
  // Cores alinhadas ao tema do StudyAI (violeta/fúcsia da sidebar).
  const phaseColor: Record<Phase, string> = {
    idle:      "#34d399", // emerald-400 — online
    listening: "#f43f5e", // rose-500 — gravando
    thinking:  "#f59e0b", // amber-500 — pensando
    speaking:  "#a78bfa", // violet-400 — falando
  };
  const phaseLabel: Record<Phase, string> = {
    idle:      "Online — pode falar",
    listening: "Ouvindo você…",
    thinking:  "Pensando…",
    speaking:  "Falando…",
  };

  const lastAssistantMsg = [...history].reverse().find(m => m.role === "assistant")?.text || "";
  const showReplyHint =
    open &&
    phase === "idle" &&
    history.length > 0 &&
    history[history.length - 1]?.role === "assistant";

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
        className="fixed bottom-20 md:bottom-6 left-4 md:left-auto md:right-6 z-40 select-none"
        style={{ background: "none", border: "none", padding: 0 }}
        title="Professor Tiagão — clique para falar"
      >
        {open ? (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1f0b3d] via-[#4b1791] to-[#c026d3] shadow-xl shadow-purple-950/45 ring-1 ring-white/25 flex items-center justify-center backdrop-blur-md">
            <X className="w-5 h-5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
          </div>
        ) : (
          <TiagaoCharacter state={phase as CharacterState} size={88} showLabel={false} className="md:scale-110" />
        )}
      </motion.button>

      {/* Hint tooltip — glassy deep purple */}
      <AnimatePresence>
        {showHint && !open && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }} transition={{ delay: 2, duration: 0.4 }}
            className="fixed bottom-[5.5rem] md:bottom-8 left-20 md:left-auto md:right-24 z-40 pointer-events-none">
            <div className="bg-[#2f1458]/95 backdrop-blur-xl text-white text-xs font-medium px-3 py-2 rounded-xl shadow-lg shadow-purple-950/45 ring-1 ring-white/15 whitespace-nowrap">
              👆 Toque aqui para falar com o Tiagão
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-2.5 h-2.5 bg-[#2f1458]/95 rotate-45 ring-1 ring-white/15" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini card while speaking/thinking — glass, matches sidebar theme */}
      <AnimatePresence>
        {!open && (phase === "speaking" || phase === "thinking") && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-40 rounded-2xl bg-white/80 backdrop-blur-2xl shadow-xl shadow-violet-300/30 border border-violet-200/55 p-3"
          >
            <div className="flex items-center gap-3">
              <TiagaoCharacter state={phase as CharacterState} size={48} showLabel={false} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black tracking-tight bg-gradient-to-r from-violet-600 via-fuchsia-500 to-purple-700 bg-clip-text text-transparent mb-1">Professor Tiagão</p>
                {phase === "thinking"
                  ? (
                    <div className="flex gap-1 items-center h-4">
                      {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                      <span className="text-[11px] text-violet-500/80 ml-1">{phaseLabel.thinking}</span>
                    </div>
                  )
                  : <VolumeBar level={60} />
                }
              </div>
              <button
                onClick={stopSpeaking}
                className="px-2.5 py-2 rounded-xl bg-rose-500/95 hover:bg-rose-600 text-white shadow-sm shadow-rose-300/40 transition-colors"
                title="Parar"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action notification toast — glass, fuchsia accent */}
      <AnimatePresence>
        {actionNotif && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-28 md:bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50">
            <div className="bg-gradient-to-r from-emerald-600/95 to-teal-600/95 backdrop-blur-md text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl shadow-emerald-400/30 ring-1 ring-emerald-300/40 flex items-center gap-3">
              <span className="flex-1">{actionNotif.text}</span>
              {actionNotif.path && (
                <button onClick={() => { navigate(actionNotif.path!); setActionNotif(null); }}
                  className="text-xs bg-white/20 hover:bg-white/30 ring-1 ring-white/30 px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors">Ver</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Focus mode overlay — deep purple wash, matches sidebar gradient */}
      <AnimatePresence>
        {focusMode && open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30"
            style={{
              background: "radial-gradient(circle at 30% 20%, rgba(120,50,210,0.55), rgba(15,5,40,0.92))",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }} />
        )}
      </AnimatePresence>

      {/* ── MAIN PANEL — glassmorphism, sidebar-matching purple ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={`fixed z-50 rounded-3xl shadow-2xl shadow-purple-950/35 ring-1 ring-violet-200/40 overflow-hidden flex flex-col transition-all duration-300 ${
              focusMode
                ? "inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[520px] sm:max-h-[90vh]"
                : "bottom-[8.5rem] md:bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-[368px] max-h-[72vh]"
            }`}
            style={{
              background: "linear-gradient(160deg, rgba(255,255,255,0.92) 0%, rgba(245,238,255,0.86) 100%)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
            }}
          >
            {/* Soft top gradient sheen */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-fuchsia-300/20 via-violet-200/10 to-transparent" />

            {/* ── HEADER — sidebar-matching deep purple, slightly translucent ── */}
            <div
              className="relative px-4 py-3 flex items-center gap-2.5 flex-shrink-0 border-b border-white/15"
              style={{
                background:
                  "linear-gradient(135deg, rgba(31,11,61,0.95) 0%, rgba(49,16,92,0.92) 45%, rgba(70,32,122,0.92) 100%)",
              }}
            >
              {/* Glow blobs to match sidebar feel */}
              <div className="pointer-events-none absolute -top-10 -left-6 h-24 w-24 rounded-full bg-fuchsia-400/25 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-10 right-0 h-20 w-20 rounded-full bg-violet-400/25 blur-2xl" />

              <div className="relative flex-shrink-0">
                <TiagaoCharacter state={phase as CharacterState} size={44} showLabel={false} />
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#1f0b3d] shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                  style={{ background: phaseColor[phase] }}
                />
              </div>
              <div className="relative flex-1 min-w-0">
                <p className="text-white font-black text-sm leading-none tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]">
                  Professor Tiagão
                </p>
                <p className="text-violet-100/85 text-[11px] mt-1 flex items-center gap-1.5">
                  {/* SINGLE source of truth for phase status — header pill */}
                  {phase === "thinking" ? (
                    <>
                      {[0, 130, 260].map(d => (
                        <span
                          key={d}
                          className="w-1 h-1 rounded-full bg-amber-300 animate-bounce"
                          style={{ animationDelay: `${d}ms` }}
                        />
                      ))}
                      <span className="ml-0.5">{phaseLabel.thinking}</span>
                    </>
                  ) : (
                    phaseLabel[phase]
                  )}
                </p>
                {focusMode && (
                  <span className="inline-flex items-center gap-1 text-violet-100 text-[10px] bg-white/15 ring-1 ring-white/20 backdrop-blur-md px-2 py-0.5 rounded-full mt-1">
                    <Timer className="w-2.5 h-2.5" /> {fmtFocusTime(focusSeconds)}
                  </span>
                )}
              </div>
              <div className="relative flex items-center gap-0.5">
                <button onClick={() => setVoicePure(v => !v)} title={voicePure ? "Mostrar texto" : "Modo voz pura"}
                  className={`p-1.5 rounded-lg transition-colors ${voicePure ? "text-amber-200 bg-white/15 ring-1 ring-white/20" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
                  {voicePure ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setFocusMode(f => !f)} title={focusMode ? "Sair do foco" : "Modo foco"}
                  className={`p-1.5 rounded-lg transition-colors ${focusMode ? "text-amber-200 bg-white/15 ring-1 ring-white/20" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
                  {focusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setMuted(m => !m)} title={muted ? "Ativar som" : "Silenciar"}
                  className="text-white/70 hover:text-white hover:bg-white/10 transition-colors p-1.5 rounded-lg">
                  {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button onClick={handlePanelToggle} className="text-white/70 hover:text-white hover:bg-white/10 transition-colors p-1.5 rounded-lg">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── TABS — glassy, violet accents ── */}
            <div className="flex bg-white/55 backdrop-blur-md border-b border-violet-100/60 flex-shrink-0">
              {([
                { key: "conversa", icon: MessageSquare, label: "Conversa" },
                { key: "comandos", icon: Zap,           label: "Comandos" },
                { key: "config",   icon: Settings,      label: "Config"   },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold transition-all ${
                    tab === t.key
                      ? "text-violet-700"
                      : "text-slate-500/80 hover:text-violet-600"
                  }`}>
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                  {t.key === "conversa" && history.length > 0 && (
                    <span className="min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-[9px] font-black flex items-center justify-center shadow-sm shadow-violet-300/40">
                      {Math.min(99, history.length)}
                    </span>
                  )}
                  {tab === t.key && (
                    <motion.span
                      layoutId="tiagao-tab-underline"
                      className="absolute left-3 right-3 -bottom-px h-[2px] rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-purple-700"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* ── TAB CONTENT ── */}
            <div className="flex-1 overflow-hidden flex flex-col">

              {/* CONVERSA TAB */}
              {tab === "conversa" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Avatar + last message — shown in voice-pure OR when no history.
                      Loading state lives ONLY in the header pill + the typing bubble
                      at the bottom of the history; we no longer render a third
                      "pensando..." line here. */}
                  {(voicePure || history.length === 0) && (
                    <div className="flex flex-col items-center px-4 py-5 gap-3 flex-shrink-0">
                      <TiagaoCharacter state={phase as CharacterState} size={focusMode ? 120 : 90} showLabel={true} />
                      {!voicePure && history.length === 0 && (
                        <p className="text-xs text-violet-500/80 text-center font-medium">Fale ou escreva para começar</p>
                      )}
                    </div>
                  )}

                  {/* Full conversation history — glass bubbles, violet/fuchsia */}
                  {!voicePure && history.length > 0 && (
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 [scrollbar-width:thin] [scrollbar-color:rgba(139,92,246,0.4)_transparent]">
                      {history.map((msg, i) => (
                        <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          {msg.role === "assistant" && (
                            <div className="flex-shrink-0 mt-0.5">
                              <TiagaoCharacter
                                state={i === history.length - 1 && phase !== "idle" ? phase as CharacterState : "idle"}
                                size={28} showLabel={false} />
                            </div>
                          )}
                          <div className={`max-w-[80%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            msg.role === "user"
                              ? "bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-tr-sm shadow-violet-300/40"
                              : "bg-white/75 backdrop-blur-md ring-1 ring-violet-200/55 text-slate-700 rounded-tl-sm shadow-violet-200/30"
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            <p className={`text-[9px] mt-1 ${msg.role === "user" ? "text-violet-100/85" : "text-violet-400/70"}`}>
                              {new Date(msg.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Single typing indicator at the bottom of history */}
                      {phase === "thinking" && (
                        <div className="flex gap-2 justify-start">
                          <TiagaoCharacter state="thinking" size={28} showLabel={false} />
                          <div className="bg-white/75 backdrop-blur-md ring-1 ring-violet-200/55 px-3 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-sm shadow-violet-200/30">
                            {[0, 130, 260].map(d => (
                              <span
                                key={d}
                                className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"
                                style={{ animationDelay: `${d}ms` }}
                              />
                            ))}
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
                        <span className="text-[10px] text-violet-500/80 mr-auto font-medium">Ajudou?</span>
                        <button onClick={() => { setReaction("up"); sendMessage("👍 Entendi bem! Pode continuar."); }}
                          disabled={reaction !== null}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            reaction === "up"
                              ? "bg-emerald-500 text-white shadow-sm shadow-emerald-300/50"
                              : "bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 ring-1 ring-emerald-200/50 disabled:opacity-40"
                          }`}>
                          <ThumbsUp className="w-3 h-3" /> {reaction === "up" ? "Ótimo!" : "Sim"}
                        </button>
                        <button onClick={() => { setReaction("down"); sendMessage("Não entendi. Explica de outro jeito, mais simples?"); }}
                          disabled={reaction !== null}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            reaction === "down"
                              ? "bg-orange-500 text-white shadow-sm shadow-orange-300/50"
                              : "bg-orange-50/80 text-orange-700 hover:bg-orange-100 ring-1 ring-orange-200/50 disabled:opacity-40"
                          }`}>
                          <ThumbsDown className="w-3 h-3" /> Não
                        </button>
                        {history.length > 2 && (
                          <button onClick={() => { setHistory([]); historyRef.current = []; setSessionMsgs(0); }}
                            title="Limpar conversa"
                            className="p-1 rounded-lg text-violet-300/70 hover:text-rose-500 hover:bg-rose-50/70 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error chip — glass red */}
                  {error && (
                    <div className="mx-3 mb-2 bg-rose-50/80 backdrop-blur-md text-rose-700 text-xs rounded-xl px-3 py-2 ring-1 ring-rose-200/70 flex items-center gap-2 flex-shrink-0 shadow-sm shadow-rose-200/30">
                      <span className="flex-1">{error}</span>
                      {retrying && (
                        <button onClick={() => {
                          const lastUser = [...historyRef.current].reverse().find(m => m.role === "user")?.content;
                          if (lastUser) sendMessage(lastUser, true);
                          setError(null);
                        }} className="flex items-center gap-1 text-rose-700 font-bold hover:text-rose-900">
                          <RotateCcw className="w-3 h-3" /> Retry
                        </button>
                      )}
                      <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-700"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              )}

              {/* COMANDOS TAB — glassy violet tiles */}
              {tab === "comandos" && (
                <div className="flex-1 overflow-y-auto px-3 py-3">
                  <p className="text-[10px] font-black text-violet-500/85 uppercase tracking-widest mb-3">Toque para perguntar</p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_COMMANDS.map((cmd, i) => (
                      <button key={i}
                        onClick={() => { sendMessage(cmd.text); setTab("conversa"); }}
                        disabled={phase !== "idle"}
                        className="text-left px-3 py-2.5 rounded-2xl bg-white/65 hover:bg-white/85 ring-1 ring-violet-200/50 hover:ring-violet-300 backdrop-blur-md text-xs font-bold text-violet-800 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 leading-snug shadow-sm shadow-violet-200/30">
                        {cmd.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-violet-100/60">
                    <p className="text-[10px] font-black text-violet-500/85 uppercase tracking-widest mb-2">Comandos de voz</p>
                    {[
                      { cmd: "\"Abra o simulado\"",         desc: "Navega para simulados" },
                      { cmd: "\"Crie um plano de estudos\"", desc: "Cria plano personalizado" },
                      { cmd: "\"Me explica [matéria]\"",    desc: "Abre aula sobre o tema" },
                      { cmd: "\"Cria flashcards\"",          desc: "Gera e salva flashcards" },
                      { cmd: "\"Pare / continue\"",          desc: "Controla a fala" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2 mb-2">
                        <code className="text-[10px] bg-violet-50/80 ring-1 ring-violet-100 text-violet-800 px-2 py-1 rounded-lg font-mono flex-shrink-0">{item.cmd}</code>
                        <span className="text-[10px] text-slate-600 pt-1">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CONFIG TAB — glassy cards */}
              {tab === "config" && (
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {/* Microfone */}
                  <div>
                    <p className="text-[10px] font-black text-violet-600/90 uppercase tracking-widest mb-2">Microfone</p>
                    <p className="text-[10px] text-slate-600 mb-3 leading-relaxed">
                      Use o site em <strong className="text-violet-800">https://</strong> (obrigatório no celular). Depois que o Tiagão responde,
                      toque outra vez no botão de voz — iOS e Android não permitem microfone ligado o tempo todo sem um novo toque seu.
                    </p>
                    {audioCapture.devices.length === 0 ? (
                      <button onClick={audioCapture.refreshDevices}
                        className="w-full py-2 bg-white/50 backdrop-blur-md text-violet-600 text-xs rounded-xl ring-1 ring-dashed ring-violet-300/60 hover:ring-violet-400 hover:bg-white/80 transition-colors flex items-center justify-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5" /> Detectar microfones
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        {audioCapture.devices.map(d => (
                          <button key={d.deviceId}
                            onClick={() => audioCapture.setSelectedDeviceId(d.deviceId)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                              audioCapture.selectedDeviceId === d.deviceId
                                ? "bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-sm shadow-violet-300/40"
                                : "bg-white/55 backdrop-blur-md ring-1 ring-violet-100 text-slate-700 hover:bg-white/85"
                            }`}>
                            🎙️ {d.label}
                          </button>
                        ))}
                        <button onClick={audioCapture.refreshDevices}
                          className="text-[10px] text-violet-500/80 hover:text-violet-700 flex items-center gap-1 pt-1">
                          <RefreshCw className="w-2.5 h-2.5" /> Atualizar lista
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Volume test */}
                  <div>
                    <p className="text-[10px] font-black text-violet-600/90 uppercase tracking-widest mb-2">Nível do microfone</p>
                    <div className="bg-white/55 backdrop-blur-md ring-1 ring-violet-100 rounded-xl p-3 flex items-center gap-3 shadow-sm shadow-violet-200/30">
                      <VolumeBar level={volume} />
                      <span className="text-[10px] text-slate-600">{volume > 5 ? "✅ Detectando áudio" : "Fale algo..."}</span>
                    </div>
                  </div>

                  {/* Modo voz pura */}
                  <div>
                    <p className="text-[10px] font-black text-violet-600/90 uppercase tracking-widest mb-2">Experiência</p>
                    <button onClick={() => setVoicePure(v => !v)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ring-1 text-xs font-bold transition-all ${
                        voicePure
                          ? "bg-gradient-to-r from-violet-600 to-purple-700 text-white ring-violet-700 shadow-sm shadow-violet-300/50"
                          : "bg-white/65 backdrop-blur-md text-slate-700 ring-violet-200 hover:ring-violet-400"
                      }`}>
                      {voicePure ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span className="flex-1 text-left">Modo voz pura (sem texto)</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${voicePure ? "bg-white/25" : "bg-violet-100 text-violet-700"}`}>
                        {voicePure ? "ON" : "OFF"}
                      </span>
                    </button>
                  </div>

                  {/* Stats */}
                  <div>
                    <p className="text-[10px] font-black text-violet-600/90 uppercase tracking-widest mb-2">Sessão atual</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Mensagens", value: sessionMsgs },
                        { label: "No histórico", value: history.length },
                      ].map(s => (
                        <div key={s.label} className="bg-white/55 backdrop-blur-md ring-1 ring-violet-100 rounded-xl px-3 py-2 text-center shadow-sm shadow-violet-200/30">
                          <p className="text-lg font-black bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">{s.value}</p>
                          <p className="text-[10px] text-violet-500/80 font-medium">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── CONTROLS — glassy footer ── */}
            <div className="px-3 pb-3 flex-shrink-0 bg-white/55 backdrop-blur-md border-t border-violet-100/60 pt-2.5">
              {/* Volume bar while listening */}
              {phase === "listening" && (
                <div className="mb-2 px-2">
                  <VolumeBar level={volume} />
                </div>
              )}

              {phase === "speaking" ? (
                <button onClick={stopSpeaking}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-300/45">
                  <Square className="w-3.5 h-3.5 fill-current" /> Interromper Tiagão
                </button>
              ) : phase === "listening" ? (
                <button onClick={stopListening}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 animate-pulse shadow-md shadow-rose-300/45">
                  <MicOff className="w-3.5 h-3.5" /> Parar de falar
                </button>
              ) : (
                <>
                  {showReplyHint && (
                    <p className="text-[10px] text-center text-violet-700/90 font-semibold mb-2 px-1 leading-snug">
                      Toque no botão para o microfone ouvir você de novo
                    </p>
                  )}
                  <button onClick={startListening} disabled={phase === "thinking"}
                    className={`relative overflow-hidden w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-60 text-white transition-all ${
                      showReplyHint ? "ring-2 ring-offset-2 ring-fuchsia-400 ring-offset-white/0 shadow-lg shadow-violet-400/50" : "shadow-md shadow-violet-300/45"
                    }`}
                    style={{
                      // Sidebar deep purple → vibrant violet → fuchsia accent
                      background: "linear-gradient(135deg, #1f0b3d 0%, #6d28d9 55%, #c026d3 100%)",
                    }}>
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/15 to-white/0 opacity-60" />
                    {phase === "thinking" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> {phaseLabel.thinking}
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        {useBrowserSpeech ? "Falar com o Tiagão" : "Gravar minha voz (microfone)"}
                      </>
                    )}
                  </button>

                  {/* Text input + anexo (PDF / Word / imagem) para plano */}
                  <div className="flex gap-1.5 mt-2">
                    <input
                      ref={planMaterialRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                      className="hidden"
                      onChange={e => { void ingestPlanMaterial(e.target.files); }}
                    />
                    <button
                      type="button"
                      title="Anexar PDF, Word ou imagem para o plano"
                      onClick={() => planMaterialRef.current?.click()}
                      disabled={planIngestBusy || phase === "thinking"}
                      className={`p-2 rounded-xl ring-1 transition-colors disabled:opacity-50 ${
                        planIngestBusy
                          ? "bg-violet-600 text-white ring-violet-700 shadow-sm shadow-violet-300/50"
                          : "bg-white/65 ring-violet-200 text-violet-700 hover:bg-white/85 hover:ring-violet-300"
                      }`}
                    >
                      {planIngestBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                    </button>
                    <input
                      type="text"
                      value={textInput}
                      onChange={e => setTextInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && textInput.trim()) { sendMessage(textInput); setTextInput(""); } }}
                      placeholder="Ou escreva sua dúvida…"
                      className="flex-1 text-xs bg-white/65 backdrop-blur-md rounded-xl px-3 py-2 text-slate-700 placeholder-violet-400/70 ring-1 ring-violet-200/70 focus:outline-none focus:ring-2 focus:ring-violet-400/70 focus:bg-white/85 transition-all"
                    />
                    <button onClick={() => { if (textInput.trim()) { sendMessage(textInput); setTextInput(""); } }}
                      disabled={!textInput.trim()}
                      className="p-2 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white disabled:opacity-40 transition-colors shadow-sm shadow-violet-300/50">
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
