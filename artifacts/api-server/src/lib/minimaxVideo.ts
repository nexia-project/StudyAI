import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const MINIMAX_BASE = "https://api.minimax.io/v1";

export type MinimaxAspectRatio = "16:9" | "9:16" | "1:1";

export interface VideoJobInput {
  prompt: string;
  aspectRatio: MinimaxAspectRatio;
  duration?: 6 | 10; // seconds (6 default; 10 only on hailuo-02 pro)
  resolution?: "768P" | "1080P";
  model?: string;
}

// Ordem de fallback: tenta o melhor modelo disponível no plano do usuário.
// Hailuo-02 é o mais novo (precisa plano pago); T2V-01 funciona em todos os planos.
const MODEL_FALLBACK_ORDER = [
  "MiniMax-Hailuo-02",
  "T2V-01-Director",
  "T2V-01",
];

// Cache do modelo que funciona pra esta chave (evita tentar Hailuo-02 toda vez)
let _workingModel: string | null = null;

interface SubmitResponse {
  task_id?: string;
  base_resp?: { status_code: number; status_msg: string };
}

interface QueryResponse {
  status?: "Queueing" | "Preparing" | "Processing" | "Success" | "Fail";
  file_id?: string;
  base_resp?: { status_code: number; status_msg: string };
}

interface FileResponse {
  file?: { download_url?: string; file_id?: string };
  base_resp?: { status_code: number; status_msg: string };
}

function authHeaders(): Record<string, string> {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) throw new Error("MINIMAX_API_KEY not set");
  return {
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function trySubmit(model: string, input: VideoJobInput): Promise<{ ok: true; taskId: string } | { ok: false; planError: boolean; msg: string }> {
  const body: Record<string, any> = {
    model,
    prompt: input.prompt.slice(0, 1500),
    prompt_optimizer: true,
    aspect_ratio: input.aspectRatio,
  };
  // Apenas o Hailuo-02 aceita os parâmetros duration/resolution
  if (model.startsWith("MiniMax-Hailuo")) {
    body.duration = input.duration ?? 6;
    body.resolution = input.resolution ?? "768P";
  }
  const res = await fetch(`${MINIMAX_BASE}/video_generation`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as SubmitResponse;
  if (json.task_id) return { ok: true, taskId: json.task_id };
  const msg = json.base_resp?.status_msg ?? "no task_id";
  const planError = /plan not support|insufficient|permission/i.test(msg);
  return { ok: false, planError, msg };
}

// Throttle global de submits pra respeitar o RPM (rate limit por minuto) da MiniMax.
// Plano free ≈ 5 RPM → 1 submit a cada ~13s é seguro.
const SUBMIT_MIN_INTERVAL_MS = 13_000;
let _lastSubmitAt = 0;
let _submitChain: Promise<any> = Promise.resolve();

function throttleSubmit<T>(fn: () => Promise<T>): Promise<T> {
  const next = _submitChain.then(async () => {
    const now = Date.now();
    const wait = Math.max(0, _lastSubmitAt + SUBMIT_MIN_INTERVAL_MS - now);
    if (wait > 0) {
      console.log(`[minimax-video] ⏳ Throttle: aguardando ${(wait / 1000).toFixed(1)}s pra respeitar RPM...`);
      await new Promise(r => setTimeout(r, wait));
    }
    _lastSubmitAt = Date.now();
    return fn();
  });
  _submitChain = next.catch(() => {}); // não quebra a chain em erro
  return next;
}

/**
 * Submits a text-to-video job, automatically falling back through models
 * (Hailuo-02 → T2V-01-Director → T2V-01) if the current plan doesn't support one.
 */
export async function submitVideoJob(input: VideoJobInput): Promise<string> {
  return throttleSubmit(() => submitVideoJobInner(input));
}

async function submitVideoJobInner(input: VideoJobInput): Promise<string> {
  const candidates = _workingModel
    ? [_workingModel]
    : (input.model ? [input.model, ...MODEL_FALLBACK_ORDER.filter(m => m !== input.model)] : MODEL_FALLBACK_ORDER);

  const MAX_RATE_RETRIES = 4;
  let lastErr = "";

  for (const model of candidates) {
    let rateRetries = 0;
    while (true) {
      const r = await trySubmit(model, input);
      if (r.ok) {
        if (!_workingModel) {
          _workingModel = model;
          console.log(`[minimax-video] 🔓 Plano suporta modelo: ${model} (cacheado)`);
        }
        console.log(`[minimax-video] 🎬 Submitted task ${r.taskId} (${model}, ${input.aspectRatio})`);
        return r.taskId;
      }
      lastErr = `${model}: ${r.msg}`;

      // Rate limit (RPM/TPM) — espera e tenta de novo o MESMO modelo
      if (/rate limit|RPM|TPM|too many requests/i.test(r.msg)) {
        if (rateRetries >= MAX_RATE_RETRIES) {
          throw new Error(`MiniMax rate limit excedido após ${MAX_RATE_RETRIES} tentativas. Tenta novamente em 1-2 minutos.`);
        }
        rateRetries++;
        const backoff = Math.min(60_000, 15_000 * Math.pow(1.5, rateRetries - 1));
        console.warn(`[minimax-video] ⏱️ Rate limit (${model}), retry ${rateRetries}/${MAX_RATE_RETRIES} em ${(backoff / 1000).toFixed(0)}s...`);
        await new Promise(res => setTimeout(res, backoff));
        continue; // tenta de novo o mesmo modelo
      }

      if (!r.planError) {
        throw new Error(`MiniMax submit failed: ${r.msg}`);
      }
      console.warn(`[minimax-video] ⚠️ ${model} indisponível no plano, tentando próximo...`);
      break; // sai do while, vai pro próximo modelo
    }
  }
  throw new Error(`MiniMax submit failed (all models): ${lastErr}`);
}

/**
 * Polls a video generation job until completion or timeout.
 * Returns the file_id when ready.
 */
export async function pollVideoJob(taskId: string, maxWaitMs = 8 * 60 * 1000): Promise<string> {
  const start = Date.now();
  let attempts = 0;
  while (Date.now() - start < maxWaitMs) {
    attempts++;
    await new Promise(r => setTimeout(r, 8000)); // 8s between polls
    const res = await fetch(`${MINIMAX_BASE}/query/video_generation?task_id=${taskId}`, {
      headers: authHeaders(),
    });
    const json = (await res.json()) as QueryResponse;
    const status = json.status ?? "Unknown";
    console.log(`[minimax-video] Poll #${attempts} task ${taskId}: ${status}`);
    if (status === "Success" && json.file_id) return json.file_id;
    if (status === "Fail") {
      throw new Error(`MiniMax job ${taskId} failed: ${json.base_resp?.status_msg ?? "unknown"}`);
    }
  }
  throw new Error(`MiniMax job ${taskId} timed out after ${maxWaitMs}ms`);
}

/**
 * Retrieves the download URL for a file_id and downloads to a local /tmp file.
 */
export async function downloadVideoFile(fileId: string): Promise<string> {
  const res = await fetch(`${MINIMAX_BASE}/files/retrieve?file_id=${fileId}`, {
    headers: authHeaders(),
  });
  const json = (await res.json()) as FileResponse;
  const url = json.file?.download_url;
  if (!url) throw new Error(`MiniMax file ${fileId} has no download_url`);
  const videoRes = await fetch(url);
  if (!videoRes.ok) throw new Error(`Download failed ${videoRes.status}`);
  const buf = Buffer.from(await videoRes.arrayBuffer());
  const localPath = path.join(os.tmpdir(), `minimax-${fileId}.mp4`);
  await fs.writeFile(localPath, buf);
  console.log(`[minimax-video] ⬇️ Downloaded ${(buf.length / 1024 / 1024).toFixed(2)}MB → ${localPath}`);
  return localPath;
}

/** End-to-end: submit + poll + download. Returns local mp4 path. */
export async function generateVideoClip(input: VideoJobInput): Promise<string> {
  const taskId = await submitVideoJob(input);
  const fileId = await pollVideoJob(taskId);
  return downloadVideoFile(fileId);
}
