import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export const VIDEOS_OUT_DIR = "/tmp/sanovim_videos_out";
fs.mkdirSync(VIDEOS_OUT_DIR, { recursive: true });

export interface VideoProcessOptions {
  startSeconds?: number;
  endSeconds?: number;
  convertToReels?: boolean;
  captions?: string | null;
}

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-y", ...args], { stdio: ["pipe", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited ${code}: ${stderr.slice(-800)}`));
    });
    proc.on("error", reject);
  });
}

export async function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn("ffprobe", [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      inputPath,
    ]);
    let stdout = "";
    proc.stdout?.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.on("close", () => {
      try {
        const info = JSON.parse(stdout) as { format?: { duration?: string } };
        resolve(parseFloat(info.format?.duration ?? "0"));
      } catch {
        resolve(0);
      }
    });
    proc.on("error", () => resolve(0));
  });
}

export async function processVideoForReels(
  inputPath: string,
  options: VideoProcessOptions,
): Promise<{ outputPath: string; duration: number }> {
  const { startSeconds = 0, endSeconds, convertToReels = true, captions } = options;

  const outputFilename = `processed_${Date.now()}.mp4`;
  const outputPath = path.join(VIDEOS_OUT_DIR, outputFilename);

  const args: string[] = [];

  if (startSeconds > 0) {
    args.push("-ss", String(startSeconds));
  }

  args.push("-i", inputPath);

  if (endSeconds !== undefined && endSeconds > startSeconds) {
    const clipDuration = Math.min(endSeconds - startSeconds, 90);
    args.push("-t", String(clipDuration));
  }

  const filters: string[] = [];

  if (convertToReels) {
    filters.push(
      "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
    );
  }

  if (captions?.trim()) {
    const safe = captions
      .slice(0, 100)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\u2019")
      .replace(/:/g, "\\:")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]");
    filters.push(
      `drawtext=text='${safe}':fontsize=38:fontcolor=white:x=(w-text_w)/2:y=h-130:box=1:boxcolor=black@0.55:boxborderw=14`,
    );
  }

  if (filters.length > 0) {
    args.push("-vf", filters.join(","));
  }

  args.push(
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-profile:v", "high",
    "-level", "4.0",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    outputPath,
  );

  await runFFmpeg(args);

  const actualDuration = endSeconds !== undefined
    ? Math.min(endSeconds - startSeconds, 90)
    : await getVideoDuration(outputPath);

  return { outputPath, duration: actualDuration || 45 };
}
