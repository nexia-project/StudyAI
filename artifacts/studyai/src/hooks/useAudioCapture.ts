/**
 * useAudioCapture — Professor Tiagão V3
 * AudioCaptureManager com VAD, seleção de dispositivo e fallbacks
 *
 * Compatibilidade: Chrome/Firefox/Edge (desktop + Android), Safari iOS 14.5+,
 * Safari macOS, Edge Mobile. Trata graciosamente WebViews/HTTP/iOS antigos.
 */
import { useState, useRef, useCallback, useEffect } from "react";

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: "audioinput";
}

export interface CapturedAudio {
  blob: Blob;
  mimeType: string;
  extension: string; // sem ponto: "webm", "mp4", "ogg"
}

export interface AudioCaptureOptions {
  silenceTimeoutMs?: number;   // ms de silêncio para encerrar fala
  minSpeechMs?: number;        // duração mínima para aceitar como fala
  vadThreshold?: number;       // 0-100, RMS mínimo para "fala detectada"
  onSpeechStart?: () => void;
  onSpeechEnd?: (blob: Blob, info?: CapturedAudio) => void;
  onVolume?: (level: number) => void; // 0-100
  onError?: (err: string) => void;
}

// ── Helpers de ambiente ─────────────────────────────────────────────────────
function isMediaDevicesAvailable(): boolean {
  return typeof navigator !== "undefined"
    && typeof navigator.mediaDevices !== "undefined"
    && typeof navigator.mediaDevices.getUserMedia === "function";
}

function isSecureContextOk(): boolean {
  if (typeof window === "undefined") return false;
  // iOS exige HTTPS exceto para localhost
  if (window.isSecureContext) return true;
  const h = window.location?.hostname ?? "";
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (window.AudioContext || (window as any).webkitAudioContext) ?? null;
}

/**
 * Deriva extensão de arquivo a partir do mimeType real do MediaRecorder.
 * Compatível com Whisper API (aceita: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg).
 */
function extensionFromMime(mime: string, fallback: string): string {
  const m = (mime || "").toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mp4") || m.includes("m4a") || m.includes("mp4a")) return "m4a";
  if (m.includes("aac")) return "aac";
  if (m.includes("wav")) return "wav";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  return fallback || "webm";
}

/**
 * Escolhe um MIME type de gravação suportado pelo dispositivo.
 * Ordem de preferência:
 * - audio/webm;codecs=opus (Chrome/Firefox/Edge — melhor qualidade/peso)
 * - audio/webm
 * - audio/ogg;codecs=opus  (Firefox antigo)
 * - audio/mp4              (Safari iOS / macOS — única opção)
 * - audio/mp4;codecs=mp4a.40.2
 * - audio/aac
 * - "" (default do browser)
 */
function pickMimeType(): { mimeType: string; extension: string } {
  if (typeof MediaRecorder === "undefined") return { mimeType: "", extension: "webm" };
  const candidates: Array<{ mimeType: string; extension: string }> = [
    { mimeType: "audio/webm;codecs=opus", extension: "webm" },
    { mimeType: "audio/webm",             extension: "webm" },
    { mimeType: "audio/ogg;codecs=opus",  extension: "ogg"  },
    { mimeType: "audio/mp4;codecs=mp4a.40.2", extension: "m4a" },
    { mimeType: "audio/mp4",              extension: "m4a"  },
    { mimeType: "audio/aac",              extension: "aac"  },
  ];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c.mimeType)) return c;
    } catch { /* alguns browsers lançam */ }
  }
  return { mimeType: "", extension: "webm" };
}

export function useAudioCapture(options: AudioCaptureOptions = {}) {
  const {
    silenceTimeoutMs = 700,   // antes: 1200 — reduz "delay morto" entre fim de fala e início do pipeline
    minSpeechMs = 250,         // antes: 300 — aceita falas curtas mais rápido
    vadThreshold = 15,
    onSpeechStart,
    onSpeechEnd,
    onVolume,
    onError,
  } = options;

  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderMimeRef = useRef<string>("");
  const recorderExtRef = useRef<string>("webm");
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechStartRef = useRef<number>(0);
  const isSpeakingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const startingRef = useRef(false); // mutex para evitar starts concorrentes

  // ── Listar dispositivos de áudio ──────────────────────────────────────────
  // IMPORTANTE: NUNCA chama getUserMedia aqui. Em iOS Safari isso só pode ser
  // disparado dentro de um gesto do usuário — chamar no mount quebra a permissão.
  // Os labels só ficam disponíveis após o usuário conceder permissão (via start()).
  const refreshDevices = useCallback(async () => {
    try {
      if (!isMediaDevicesAvailable()) return;
      if (typeof navigator.mediaDevices.enumerateDevices !== "function") return;
      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all
        .filter(d => d.kind === "audioinput")
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Microfone ${d.deviceId ? d.deviceId.slice(0, 8) : "padrão"}`,
          kind: "audioinput" as const,
        }));
      setDevices(inputs);
      // Auto-seleciona: prefere headset/USB/Bluetooth sobre built-in
      setSelectedDeviceId(prev => {
        if (prev && inputs.some(d => d.deviceId === prev)) return prev;
        if (inputs.length === 0) return "";
        const priority = ["headset", "usb", "bluetooth", "airpod"];
        const best = inputs.find(d => priority.some(p => d.label.toLowerCase().includes(p)));
        return best?.deviceId ?? inputs[0].deviceId;
      });
    } catch { /* silencioso — alguns WebViews bloqueiam enumerateDevices */ }
  }, []);

  useEffect(() => {
    refreshDevices();
    if (!isMediaDevicesAvailable()) return;
    navigator.mediaDevices.addEventListener?.("devicechange", refreshDevices);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", refreshDevices);
  }, [refreshDevices]);

  // ── VAD loop (requestAnimationFrame) ──────────────────────────────────────
  const startVAD = useCallback(() => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      if (!activeRef.current) return;
      analyser.getByteTimeDomainData(data);

      // RMS
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const level = Math.min(100, Math.round(rms * 500));
      onVolume?.(level);

      // Detecção de fala
      const hadSpeech = isSpeakingRef.current;
      const hasSpeech = level >= vadThreshold;

      // Sempre que houver fala, cancela qualquer timer de silêncio pendente
      // (mesmo se já estava em estado "speaking" — evita stop prematuro durante pausas curtas)
      if (hasSpeech && silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      if (hasSpeech && !hadSpeech) {
        // Início de fala
        isSpeakingRef.current = true;
        setIsSpeaking(true);
        speechStartRef.current = Date.now();
        onSpeechStart?.();
        // Começa a gravar (alguns iOS exigem timeslice mais alto)
        if (recorderRef.current && recorderRef.current.state === "inactive") {
          chunksRef.current = [];
          try { recorderRef.current.start(250); } catch { /* já gravando */ }
        }
      } else if (!hasSpeech && hadSpeech) {
        // Silêncio detectado — aguarda timeout
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (!isSpeakingRef.current) return;
          const dur = Date.now() - speechStartRef.current;
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          if (recorderRef.current && recorderRef.current.state === "recording") {
            try { recorderRef.current.stop(); } catch { /* ok */ }
            if (dur < minSpeechMs) {
              chunksRef.current = []; // Muito curto → ruído
            }
          }
        }, silenceTimeoutMs);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [vadThreshold, silenceTimeoutMs, minSpeechMs, onSpeechStart, onVolume]);

  // ── Iniciar captura ───────────────────────────────────────────────────────
  // DEVE ser chamado dentro de um gesto do usuário (click/touch) para iOS.
  const start = useCallback(async (): Promise<boolean> => {
    if (isRecording) return true;
    // Mutex síncrono — evita inicializações paralelas em cliques rápidos
    if (startingRef.current) return false;
    startingRef.current = true;

    // ── Pré-checagens de ambiente ─────────────────────────────────────────
    if (!isSecureContextOk()) {
      startingRef.current = false;
      onError?.("Microfone exige conexão HTTPS. Acesse o site com https:// para gravar.");
      return false;
    }
    if (!isMediaDevicesAvailable()) {
      startingRef.current = false;
      onError?.("Seu navegador não suporta captura de áudio. Tente Chrome, Firefox ou Safari atualizados.");
      return false;
    }

    try {
      // Constraints flexíveis — usar `ideal` para evitar OverconstrainedError em devices restritos
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (selectedDeviceId) {
        audioConstraints.deviceId = { ideal: selectedDeviceId };
      }
      const constraints: MediaStreamConstraints = { audio: audioConstraints };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e1: any) {
        // Fallback: se OverconstrainedError, tenta com `audio: true` puro
        if (e1?.name === "OverconstrainedError" || e1?.name === "ConstraintNotSatisfiedError") {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw e1;
        }
      }
      streamRef.current = stream;

      // Após permissão, atualiza lista de devices (agora com labels)
      refreshDevices();

      // ── AudioContext ──────────────────────────────────────────────────────
      const Ctx = getAudioContextCtor();
      if (!Ctx) {
        // Sem AudioContext (raro) — segue só com gravação, sem VAD
        onError?.("Visualização de volume indisponível neste navegador, mas a gravação funciona.");
      } else {
        // NÃO força sampleRate — alguns devices só suportam 16k/44.1k
        const ctx = new Ctx({ latencyHint: "interactive" });
        audioCtxRef.current = ctx;
        try {
          if (ctx.state === "suspended") await ctx.resume();
        } catch { /* best-effort */ }
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3;
        source.connect(analyser);
        analyserRef.current = analyser;
      }

      // ── MediaRecorder ─────────────────────────────────────────────────────
      if (typeof MediaRecorder === "undefined") {
        onError?.("Seu navegador não suporta gravação de áudio (MediaRecorder ausente). Atualize o navegador.");
        // Limpa stream
        try { stream.getTracks().forEach(t => t.stop()); } catch { /* ok */ }
        return false;
      }
      const { mimeType, extension } = pickMimeType();
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      } catch (e: any) {
        // Algumas versões do Safari rejeitam {mimeType: ""} ou o tipo escolhido
        try {
          recorder = new MediaRecorder(stream);
        } catch (e2: any) {
          onError?.("Não foi possível iniciar a gravação: " + (e2?.message ?? e2?.name ?? "erro desconhecido"));
          try { stream.getTracks().forEach(t => t.stop()); } catch { /* ok */ }
          return false;
        }
      }
      recorderRef.current = recorder;
      // Deriva o mime/extensão a partir do recorder em runtime — fallback usa mime escolhido
      const runtimeMime = recorder.mimeType || mimeType || "audio/webm";
      recorderMimeRef.current = runtimeMime;
      recorderExtRef.current = extensionFromMime(runtimeMime, extension);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const finalMime = recorderMimeRef.current || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: finalMime });
          chunksRef.current = [];
          onSpeechEnd?.(blob, { blob, mimeType: finalMime, extension: recorderExtRef.current });
        }
      };
      recorder.onerror = (ev: any) => {
        onError?.("Erro durante a gravação: " + (ev?.error?.message ?? "desconhecido"));
      };

      activeRef.current = true;
      setIsRecording(true);
      // Se tem analyser → ativa VAD; senão grava continuamente
      if (analyserRef.current) {
        startVAD();
      } else {
        try { recorder.start(250); } catch { /* ok */ }
      }
      return true;
    } catch (e: any) {
      const name = e?.name ?? "";
      const msg =
        name === "NotAllowedError" || name === "SecurityError"
          ? "Permissão de microfone negada. Toque no cadeado da barra de endereços e libere o microfone."
        : name === "NotFoundError" || name === "DevicesNotFoundError"
          ? "Nenhum microfone encontrado. Conecte um microfone e tente novamente."
        : name === "NotReadableError" || name === "TrackStartError"
          ? "O microfone está sendo usado por outro aplicativo. Feche outras chamadas/gravadores e tente de novo."
        : name === "OverconstrainedError"
          ? "Microfone selecionado não suporta as configurações necessárias. Escolha outro dispositivo."
        : name === "TypeError"
          ? "Acesso ao microfone bloqueado. Verifique se o site está em HTTPS."
        : "Erro ao acessar microfone: " + (e?.message ?? name ?? "desconhecido");
      onError?.(msg);
      // Limpa qualquer stream parcial
      try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch { /* ok */ }
      streamRef.current = null;
      return false;
    } finally {
      // Sempre libera o mutex — sucesso ou falha
      startingRef.current = false;
    }
  }, [isRecording, selectedDeviceId, startVAD, onSpeechEnd, onError, refreshDevices]);

  // ── Parar captura ─────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    try { recorderRef.current?.stream.getTracks().forEach(t => t.stop()); } catch { /* ok */ }
    try { if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop(); } catch { /* ok */ }
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch { /* ok */ }
    try { audioCtxRef.current?.close(); } catch { /* ok */ }
    streamRef.current = null;
    recorderRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    isSpeakingRef.current = false;
    setIsRecording(false);
    setIsSpeaking(false);
    onVolume?.(0);
  }, [onVolume]);

  // Cleanup automático ao desmontar
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try { recorderRef.current?.stream.getTracks().forEach(t => t.stop()); } catch { /* ok */ }
      try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch { /* ok */ }
      try { audioCtxRef.current?.close(); } catch { /* ok */ }
    };
  }, []);

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    refreshDevices,
    isRecording,
    isSpeaking,
    start,
    stop,
  };
}
