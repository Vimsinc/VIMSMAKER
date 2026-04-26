import { logger } from "./logger";

interface RunwareTask {
  taskType: string;
  taskUUID: string;
  positivePrompt?: string;
  model?: string;
  width?: number;
  height?: number;
  numberResults?: number;
  outputFormat?: string;
  steps?: number;
  CFGScale?: number;
  outputType?: string[];
  image?: string;
  inputImage?: string;
  strength?: number;
  imageInitiator?: string;
}

interface RunwareImageResult {
  taskType: string;
  taskUUID: string;
  imageUUID: string;
  imageURL: string;
}

function roundTo64(value: number): number {
  return Math.round(value / 64) * 64;
}

function uuid(): string {
  return crypto.randomUUID();
}

async function runwareFetch(tasks: RunwareTask[]): Promise<{ data?: RunwareImageResult[] } | null> {
  const key = process.env.RUNWARE_API_KEY;
  if (!key) {
    logger.warn("RUNWARE_API_KEY not configured");
    return null;
  }
  const resp = await fetch("https://api.runware.ai/v1", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(tasks),
  });
  if (!resp.ok) {
    const text = await resp.text();
    logger.error({ status: resp.status, body: text }, "Runware API error");
    return null;
  }
  return resp.json() as Promise<{ data?: RunwareImageResult[] }>;
}

export async function uploadToRunware(buffer: Buffer, mimeType: string): Promise<string | null> {
  const base64 = `data:${mimeType};base64,${buffer.toString("base64")}`;
  const data = await runwareFetch([{ taskType: "imageUpload", taskUUID: uuid(), image: base64 }]);
  const result = data?.data?.[0];
  if (result?.imageUUID) {
    logger.info({ imageUUID: result.imageUUID }, "Uploaded image to Runware");
    return result.imageUUID;
  }
  return null;
}

export async function removeBackground(buffer: Buffer, mimeType: string): Promise<string | null> {
  const base64 = `data:${mimeType};base64,${buffer.toString("base64")}`;
  const data = await runwareFetch([{
    taskType: "imageBackgroundRemoval",
    taskUUID: uuid(),
    inputImage: base64,
    outputType: ["URL"],
    outputFormat: "PNG",
  }]);
  const result = data?.data?.[0];
  if (result?.imageURL) {
    logger.info({ imageUUID: result.imageUUID }, "Background removed via Runware");
    return result.imageURL;
  }
  return null;
}

export async function generateBackground(params: {
  prompt: string;
  width?: number;
  height?: number;
}): Promise<string | null> {
  const width = Math.max(128, Math.min(2048, roundTo64(params.width || 1080)));
  const height = Math.max(128, Math.min(2048, roundTo64(params.height || 1344)));

  const data = await runwareFetch([{
    taskType: "imageInference",
    taskUUID: uuid(),
    positivePrompt: params.prompt,
    model: "runware:100@1",
    width,
    height,
    numberResults: 1,
    outputFormat: "WEBP",
    steps: 20,
    CFGScale: 7,
    outputType: ["URL"],
  }]);
  const result = data?.data?.[0];
  if (result?.imageURL) {
    logger.info({ imageUUID: result.imageUUID }, "Generated background via Runware");
    return result.imageURL;
  }
  return null;
}

export async function generateImage(params: {
  prompt: string;
  width?: number;
  height?: number;
}): Promise<{ url: string } | null> {
  const url = await generateBackground(params);
  return url ? { url } : null;
}
