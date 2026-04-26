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
}

interface RunwareImageResult {
  taskType: string;
  taskUUID: string;
  imageUUID: string;
  imageURL: string;
  NSFWContent?: boolean;
}

export async function generateImage(params: {
  prompt: string;
  width?: number;
  height?: number;
}): Promise<{ url: string } | null> {
  const key = process.env.RUNWARE_API_KEY;
  if (!key) {
    logger.warn("RUNWARE_API_KEY not configured");
    return null;
  }

  const task: RunwareTask = {
    taskType: "imageInference",
    taskUUID: crypto.randomUUID(),
    positivePrompt: `${params.prompt}, professional medical photography, high quality, 8k`,
    model: "runware:100@1",
    width: params.width || 1080,
    height: params.height || 1350,
    numberResults: 1,
    outputFormat: "WEBP",
    steps: 20,
    CFGScale: 7,
    outputType: ["URL"],
  };

  try {
    const resp = await fetch("https://api.runware.ai/v1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify([task]),
    });

    if (!resp.ok) {
      const text = await resp.text();
      logger.error({ status: resp.status, body: text }, "Runware API error");
      return null;
    }

    const data = (await resp.json()) as { data?: RunwareImageResult[] };
    const result = data.data?.[0];
    if (result?.imageURL) {
      logger.info({ imageUUID: result.imageUUID }, "Generated image via Runware");
      return { url: result.imageURL };
    }
    return null;
  } catch (err) {
    logger.error({ err }, "Failed to generate image via Runware");
    return null;
  }
}
