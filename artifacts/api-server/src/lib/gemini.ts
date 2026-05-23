import { GoogleGenAI, Modality } from "@google/genai";
import { logger } from "./logger";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
}

export type GeminiImageQuality = "flash" | "pro";

export interface GeminiImageResult {
  b64: string;
  mimeType: string;
}

export async function generateImageGemini(
  prompt: string,
  quality: GeminiImageQuality = "flash",
): Promise<GeminiImageResult> {
  const ai = getClient();

  if (quality === "pro") {
    const response = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: "image/jpeg",
        aspectRatio: "4:5",
      },
    });

    const img = response.generatedImages?.[0]?.image;
    if (!img?.imageBytes) throw new Error("Imagen 3 returned no image");

    const b64 = Buffer.isBuffer(img.imageBytes)
      ? img.imageBytes.toString("base64")
      : Buffer.from(img.imageBytes).toString("base64");

    return { b64, mimeType: "image/jpeg" };
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-preview-image-generation",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p) => p.inlineData?.data);
  if (!imgPart?.inlineData) throw new Error("Gemini Flash returned no image");

  return {
    b64: imgPart.inlineData.data!,
    mimeType: imgPart.inlineData.mimeType ?? "image/png",
  };
}

export { logger };
