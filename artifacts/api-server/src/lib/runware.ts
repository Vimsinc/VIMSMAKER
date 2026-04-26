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
  scheduler?: string;
  seed?: number;
  outputType?: string[];
  imageInitiator?: string;
  strength?: number;
  image?: string;
}

interface RunwareImageResult {
  taskType: string;
  taskUUID: string;
  imageUUID: string;
  imageURL: string;
  NSFWContent?: boolean;
}

interface RunwareUploadResult {
  taskType: string;
  taskUUID: string;
  imageUUID: string;
  imageURL: string;
}

function roundTo64(value: number): number {
  return Math.round(value / 64) * 64;
}

async function runwareFetch(tasks: RunwareTask[]): Promise<{ data?: (RunwareImageResult | RunwareUploadResult)[] } | null> {
  const key = process.env.RUNWARE_API_KEY;
  if (!key) {
    logger.warn("RUNWARE_API_KEY not configured");
    return null;
  }

  const resp = await fetch("https://api.runware.ai/v1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(tasks),
  });

  if (!resp.ok) {
    const text = await resp.text();
    logger.error({ status: resp.status, body: text }, "Runware API error");
    return null;
  }

  return resp.json() as Promise<{ data?: (RunwareImageResult | RunwareUploadResult)[] }>;
}

async function uploadImageToRunware(buffer: Buffer, mimeType: string): Promise<string | null> {
  const base64 = `data:${mimeType};base64,${buffer.toString("base64")}`;

  const task: RunwareTask = {
    taskType: "imageUpload",
    taskUUID: crypto.randomUUID(),
    image: base64,
  };

  try {
    const data = await runwareFetch([task]);
    const result = data?.data?.[0] as RunwareUploadResult | undefined;
    if (result?.imageUUID) {
      logger.info({ imageUUID: result.imageUUID }, "Uploaded image to Runware");
      return result.imageUUID;
    }
    return null;
  } catch (err) {
    logger.error({ err }, "Failed to upload image to Runware");
    return null;
  }
}

export async function generateImage(params: {
  prompt: string;
  width?: number;
  height?: number;
  imageBuffer?: Buffer;
  imageMimeType?: string;
}): Promise<{ url: string } | null> {
  const key = process.env.RUNWARE_API_KEY;
  if (!key) {
    logger.warn("RUNWARE_API_KEY not configured");
    return null;
  }

  const width = Math.max(128, Math.min(2048, roundTo64(params.width || 1080)));
  const height = Math.max(128, Math.min(2048, roundTo64(params.height || 1344)));

  let imageInitiator: string | undefined;
  if (params.imageBuffer) {
    const uuid = await uploadImageToRunware(params.imageBuffer, params.imageMimeType || "image/jpeg");
    if (uuid) {
      imageInitiator = uuid;
    }
  }

  const task: RunwareTask = {
    taskType: "imageInference",
    taskUUID: crypto.randomUUID(),
    positivePrompt: `${params.prompt}, professional medical photography, high quality, 8k`,
    model: "runware:100@1",
    width,
    height,
    numberResults: 1,
    outputFormat: "WEBP",
    steps: 20,
    CFGScale: 7,
    outputType: ["URL"],
    ...(imageInitiator && { imageInitiator, strength: 0.30 }),
  };

  try {
    const data = await runwareFetch([task]);
    const result = data?.data?.[0] as RunwareImageResult | undefined;
    if (result?.imageURL) {
      logger.info({ imageUUID: result.imageUUID, usedInitiator: !!imageInitiator }, "Generated image via Runware");
      return { url: result.imageURL };
    }
    return null;
  } catch (err) {
    logger.error({ err }, "Failed to generate image via Runware");
    return null;
  }
}
