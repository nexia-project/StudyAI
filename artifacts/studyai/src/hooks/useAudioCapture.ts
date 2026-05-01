/**
 * useAudioCapture — Professor Tiagão V3
 * AudioCaptureManager com VAD, seleção de dispositivo e fallbacks
 */
import { useState, useRef, useCallback, useEffect } from "react";

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: "audioinput";
}

export interface AudioCaptureOptions {
  silenceTimeoutMs?: number;   // ms de silêncio para encerrar fala
  minSpeechMs?: number;        // duração mínima para aceitar como fala
  vadThreshold?: number;       // 0-255, RMS mínimo para "fala detectada"
  onSpeechStart?: () => void;
  onSpeechEnd?: (blob: Blob) => void;
  onVolume?: (level: number) => void; // 0-100
  onError?: (err: string) => void;
}

export function useAudioCapture(options: AudioCaptureOptions = {}) {
  const {
    silenceTimeoutMs = 1200,
    minSpeechMs = 300,
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
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechStartRef = useRef<number>(0);
  const isSpeakingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  // ── Listar dispositivos de áudio ──────────────────────────────────────────
  const refreshDevices = useCallback(async () => {
    try {
      // Precisamos de permissão antes de ver labels
      const perm = await navigator.permissions?.query?.({ name: "microphone" as PermissionName }).catch(() => null);
      if (!perm || perm.state === "prompt") {
        // Pedimos permissão só para listar, depois parar
        const tmp = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
        tmp?.getTracks().forEach(t => t.stop());
      }
      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all
        .filter(d => d.kind === "audioinput")
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Microfone ${d.deviceId.slice(0, 8)}`,
          kind: "audioinput" as const,
        }));
      setDevices(inputs);
      // Auto-seleciona: prefere headset/USB/Bluetooth sobre built-in
      if (!selectedDeviceId && inputs.length > 0) {
        const priority = ["headset", "usb", "bluetooth", "airpod"];
        const best = inputs.find(d => priority.some(p => d.label.toLowerCase().includes(p)));
        setSelectedDeviceId(best?.deviceId ?? inputs[0].deviceId);
      }
    } catch { /* silencioso */ }
  }, [selectedDeviceId]);

  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices.addEventListener?.("devicechange", refreshDevices);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", refreshDevices);
  }, []);

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

      if (hasSpeech && !hadSpeech) {
        // Início de fala
        isSpeakingRef.current = true;
        setIsSpeaking(true);
        speechStartRef.current = Date.now();
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        onSpeechStart?.();
        // Começa a gravar
        if (recorderRef.current && recorderRef.current.state === "inactive") {
          chunksRef.current = [];
          try { recorderRef.current.start(50); } catch { /* já gravando */ }
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
            recorderRef.current.stop();
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
  const start = useCallback(async (): Promise<boolean> => {
    if (isRecording) return true;
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: selectedDeviceId ? { ideal: selectedDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // AudioContext + Analyser — must resume on iOS/Safari/Chrome where it starts "suspended"
      const ctx = new AudioContext({ sampleRate: 48000, latencyHint: "interactive" });
      audioCtxRef.current = ctx;
      try {
        if (ctx.state === "suspended") await ctx.resume();
      } catch { /* best-effort — proceed even if resume fails */ }
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
          chunksRef.current = [];
          onSpeechEnd?.(blob);
        }
      };

      activeRef.current = true;
      setIsRecording(true);
      startVAD();
      return true;
    } catch (e: any) {
      const msg =
        e.name === "NotAllowedError" ? "Permissão de microfone negada. Libere nas configurações do navegador." :
        e.name === "NotFoundError" ? "Nenhum microfone encontrado." :
        "Erro ao acessar microfone: " + (e.message || e.name);
      onError?.(msg);
      return false;
    }
  }, [isRecording, selectedDeviceId, startVAD, onSpeechEnd, onError]);

  // ── Parar captura ─────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    try { recorderRef.current?.stream.getTracks().forEach(t => t.stop()); } catch { /* ok */ }
    try { if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop(); } catch { /* ok */ }
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
