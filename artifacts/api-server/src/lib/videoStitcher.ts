import { spawn } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { randomUUID } from "crypto";

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr?.on("data", (d) => { stderr += d.toString(); });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
    });
  });
}

/**
 * Combines video clips with their respective narration audio tracks,
 * concatenates them all, and produces a final mp4.
 *
 * Each scene: video clip (silent) + audio track (narration).
 * If audio is shorter than video, video is trimmed. If audio is longer,
 * the last frame is held using -shortest (audio is trimmed).
 */
export async function stitchScenes(
  scenes: Array<{ videoPath: string; audioPath?: string }>,
  outputPath: string,
): Promise<void> {
  if (scenes.length === 0) throw new Error("No scenes to stitch");

  const tmpDir = path.join(os.tmpdir(), `stitch-${randomUUID()}`);
  await fs.mkdir(tmpDir, { recursive: true });

  // Step 1: For each scene, mux video + audio into a single clip
  const muxedClips: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const out = path.join(tmpDir, `clip-${i}.mp4`);
    if (s.audioPath) {
      // Mix narration over silent video; audio defines length (-shortest).
      await runFfmpeg([
        "-y",
        "-i", s.videoPath,
        "-i", s.audioPath,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-map", "0:v:0", "-map", "1:a:0",
        "-shortest",
        out,
      ]);
    } else {
      // Re-encode for consistent codec/format
      await runFfmpeg([
        "-y",
        "-i", s.videoPath,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-an",
        out,
      ]);
    }
    muxedClips.push(out);
  }

  // Step 2: Concat all clips using concat demuxer
  const listPath = path.join(tmpDir, "list.txt");
  const listContent = muxedClips.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
  await fs.writeFile(listPath, listContent);

  await runFfmpeg([
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", listPath,
    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
    outputPath,
  ]);

  // Cleanup
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
}

/** Generates TTS narration via OpenAI tts-1 for a single scene. */
export async function generateNarration(text: string, outputPath: string, voice = "nova"): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set for narration");
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice,
      input: text.slice(0, 4000),
      response_format: "mp3",
      speed: 1.05,
    }),
  });
  if (!res.ok) throw new Error(`TTS failed ${res.status}: ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outputPath, buf);
}
