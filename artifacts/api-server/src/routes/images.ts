import { Router, type IRouter } from "express";
import multer from "multer";
import { db, imagesHistoryTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";
import {
  GenerateImageBody,
  GenerateImageResponse,
  CreateProfessionalCardResponse,
  GetImageHistoryQueryParams,
  GetImageHistoryResponse,
} from "@workspace/api-zod";
import { generateImage } from "../lib/runware";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Generate image with Runware
router.post("/images/generate", async (req, res): Promise<void> => {
  const parsed = GenerateImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { prompt, account, style, width, height } = parsed.data;
  const fullPrompt = `${prompt}, ${style || "professional medical photography"}, high quality`;

  try {
    const result = await generateImage({ prompt: fullPrompt, width: width || 1080, height: height || 1350 });

    const imageUrl = result?.url ||
      `https://placehold.co/${width || 1080}x${height || 1350}/0f1729/38bdf8?text=${encodeURIComponent((prompt || "Imagem").slice(0, 40))}`;

    const [saved] = await db
      .insert(imagesHistoryTable)
      .values({
        account: account || null,
        type: "generated",
        url: imageUrl,
        thumbnailUrl: imageUrl,
        prompt: fullPrompt,
        width: width || 1080,
        height: height || 1350,
      })
      .returning();

    res.json(
      GenerateImageResponse.parse({
        id: saved.id,
        url: imageUrl,
        thumbnailUrl: imageUrl,
        width: width || 1080,
        height: height || 1350,
        account: account || undefined,
        prompt: fullPrompt,
        createdAt: saved.createdAt,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to generate image");
    res.status(500).json({ error: "Failed to generate image" });
  }
});

// Create professional card
router.post("/images/create-card", upload.single("image"), async (req, res): Promise<void> => {
  const { account, text, subtext, description } = req.body as { account?: string; text?: string; subtext?: string; description?: string };

  if (!text) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const accountNames: Record<string, string> = {
    drdaniel: "Dr. Daniel",
    angelica: "Enf. Angélica",
    loysby: "Loysby",
  };

  const displayName = account ? accountNames[account] || account : "";
  const hasUploadedImage = !!req.file;
  const sceneDescription = description?.trim();

  if (hasUploadedImage) {
    req.log.info({ fileSize: req.file!.size, mimetype: req.file!.mimetype }, "Received photo for card creation");
  } else {
    req.log.info("No photo uploaded, generating card from prompt only");
  }

  const prompt = hasUploadedImage
    ? `Preserve the person's face, identity, and body exactly. Keep the person completely unchanged.${sceneDescription ? ` Apply changes only to: ${sceneDescription}.` : " Change only the background to a professional medical setting."} Professional medical marketing card for ${displayName}, elegant branding overlay, title text: "${text}"${subtext ? `, subtitle: "${subtext}"` : ""}, blue and white medical accents, Instagram portrait 1080x1350, photorealistic, high quality`
    : `Professional medical card design for ${displayName}${sceneDescription ? `, scene: ${sceneDescription}` : ""}, text: "${text}"${subtext ? `, subtitle: "${subtext}"` : ""}, clean medical background, blue and white color scheme, 1080x1350 Instagram portrait format, high quality`;

  try {
    const result = await generateImage({
      prompt,
      width: 1080,
      height: 1350,
      imageBuffer: req.file?.buffer,
      imageMimeType: req.file?.mimetype,
    });

    const imageUrl = result?.url || `https://placehold.co/1080x1350/1e3a5f/ffffff?text=${encodeURIComponent(text)}`;

    const [saved] = await db
      .insert(imagesHistoryTable)
      .values({
        account: account || null,
        type: "card",
        url: imageUrl,
        thumbnailUrl: imageUrl,
        prompt: text,
        width: 1080,
        height: 1350,
      })
      .returning();

    res.json(
      CreateProfessionalCardResponse.parse({
        id: saved.id,
        url: imageUrl,
        thumbnailUrl: imageUrl,
        width: 1080,
        height: 1350,
        account: account || undefined,
        prompt: text,
        createdAt: saved.createdAt,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to create card");
    res.status(500).json({ error: "Failed to create professional card" });
  }
});

// Get image history
router.get("/images/history", async (req, res): Promise<void> => {
  const parsed = GetImageHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { account, limit } = parsed.data;
  const conditions = account ? [eq(imagesHistoryTable.account, account)] : [];

  try {
    const rows = await db
      .select()
      .from(imagesHistoryTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(imagesHistoryTable.createdAt))
      .limit(limit || 20);

    res.json(
      GetImageHistoryResponse.parse(
        rows.map((r) => ({
          id: r.id,
          url: r.url,
          account: r.account || undefined,
          type: (r.type as "generated" | "card") || "generated",
          prompt: r.prompt || undefined,
          createdAt: r.createdAt,
        })),
      ),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to fetch image history");
    res.status(500).json({ error: "Failed to fetch image history" });
  }
});

export default router;
