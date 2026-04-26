import { Router, type IRouter } from "express";
import multer from "multer";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { db, imagesHistoryTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";
import {
  GenerateImageBody,
  GenerateImageResponse,
  CreateProfessionalCardResponse,
  GetImageHistoryQueryParams,
  GetImageHistoryResponse,
} from "@workspace/api-zod";
import { generateImage, generateBackground } from "../lib/runware";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const CARDS_DIR = "/tmp/sanovim-cards";
fs.mkdirSync(CARDS_DIR, { recursive: true });

// Build a professional gradient background as PNG buffer using Sharp + SVG
async function buildGradientBackground(
  w: number,
  h: number,
  colorStop1 = "#0a1628",
  colorStop2 = "#1a3a6b",
  colorStop3 = "#0e7490",
): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stop-color="${colorStop1}"/>
        <stop offset="50%" stop-color="${colorStop2}"/>
        <stop offset="100%" stop-color="${colorStop3}"/>
      </linearGradient>
      <radialGradient id="glow" cx="70%" cy="30%" r="50%">
        <stop offset="0%" stop-color="#1e88e5" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    <rect width="${w}" height="${h}" fill="url(#glow)"/>
    <!-- decorative lines -->
    <line x1="0" y1="${h * 0.7}" x2="${w * 0.5}" y2="${h * 0.7}" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.3"/>
    <circle cx="${w * 0.85}" cy="${h * 0.15}" r="${w * 0.3}" fill="none" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.12"/>
    <circle cx="${w * 0.85}" cy="${h * 0.15}" r="${w * 0.2}" fill="none" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.1"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// Build bottom text overlay as SVG PNG
function buildTextOverlaySvg(
  w: number,
  h: number,
  text: string,
  subtext: string,
  displayName: string,
): string {
  const escapedText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedSub = subtext.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedName = displayName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const overlayH = Math.round(h * 0.38);
  const overlayY = h - overlayH;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <!-- gradient overlay for readability -->
    <defs>
      <linearGradient id="textbg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000" stop-opacity="0"/>
        <stop offset="40%" stop-color="#0a1628" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#0a1628" stop-opacity="0.95"/>
      </linearGradient>
    </defs>
    <rect x="0" y="${overlayY}" width="${w}" height="${overlayH}" fill="url(#textbg)"/>

    <!-- accent line -->
    <rect x="${w * 0.08}" y="${h - Math.round(overlayH * 0.78)}" width="${Math.round(w * 0.06)}" height="3" fill="#38bdf8"/>

    <!-- main title -->
    <text
      x="${w * 0.08}"
      y="${h - Math.round(overlayH * 0.6)}"
      font-family="Arial, Helvetica, sans-serif"
      font-weight="bold"
      font-size="${Math.round(w * 0.058)}"
      fill="#ffffff"
      letter-spacing="0.5"
    >${escapedText}</text>

    <!-- subtitle -->
    <text
      x="${w * 0.08}"
      y="${h - Math.round(overlayH * 0.42)}"
      font-family="Arial, Helvetica, sans-serif"
      font-weight="normal"
      font-size="${Math.round(w * 0.036)}"
      fill="#94d2e0"
    >${escapedSub}</text>

    <!-- display name / brand -->
    <text
      x="${w * 0.08}"
      y="${h - Math.round(overlayH * 0.14)}"
      font-family="Arial, Helvetica, sans-serif"
      font-weight="bold"
      font-size="${Math.round(w * 0.028)}"
      fill="#38bdf8"
      letter-spacing="2"
      text-transform="uppercase"
    >${escapedName.toUpperCase()}</text>
  </svg>`;
}

async function buildLocalCard(
  photoBuffer: Buffer | null,
  text: string,
  subtext: string,
  displayName: string,
  w = 1080,
  h = 1350,
): Promise<Buffer> {
  // 1. Build gradient background
  const background = await buildGradientBackground(w, h);

  let withPhoto: Buffer;

  if (photoBuffer && photoBuffer.length > 0) {
    // 2a. Resize photo to fill full height, crop width to fit
    const photoResized = await sharp(photoBuffer)
      .resize(w, h, { fit: "cover", position: "north" })
      .png()
      .toBuffer();

    // 3a. Composite photo over background
    withPhoto = await sharp(background)
      .composite([{ input: photoResized, blend: "over" }])
      .png()
      .toBuffer();
  } else {
    // 2b. No photo — use gradient only
    withPhoto = background;
  }

  // 4. Build text + gradient overlay SVG
  const svgOverlay = buildTextOverlaySvg(w, h, text, subtext, displayName);
  const svgBuffer = await sharp(Buffer.from(svgOverlay)).png().toBuffer();

  // 5. Composite overlay on top
  const final = await sharp(withPhoto)
    .composite([{ input: svgBuffer, blend: "over" }])
    .jpeg({ quality: 93 })
    .toBuffer();

  return final;
}

// Serve locally composited card files
router.get("/images/card-file/:filename", (req, res): void => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(CARDS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.sendFile(filePath);
});

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
  const { account, text, subtext, description } = req.body as {
    account?: string;
    text?: string;
    subtext?: string;
    description?: string;
  };

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
  const sceneDescription = description?.trim();
  const hasPhoto = !!req.file;

  if (hasPhoto) {
    req.log.info({ fileSize: req.file!.size, mimetype: req.file!.mimetype }, "Photo received — compositing card locally with Sharp");
  }

  try {
    let imageUrl: string;

    if (hasPhoto) {
      // Local pipeline: Sharp compositing — guaranteed to preserve the person
      const cardBuffer = await buildLocalCard(
        req.file!.buffer,
        text,
        subtext || "",
        displayName,
        1080,
        1350,
      );

      const filename = `${crypto.randomUUID()}.jpg`;
      const filePath = path.join(CARDS_DIR, filename);
      fs.writeFileSync(filePath, cardBuffer);
      imageUrl = `/api/images/card-file/${filename}`;
      req.log.info({ filename, size: cardBuffer.length }, "Card composited locally");
    } else {
      // No photo — try Runware, fall back to gradient-only card
      const prompt = sceneDescription
        ? `Professional medical marketing card for ${displayName}, scene: ${sceneDescription}, text: "${text}"${subtext ? `, subtitle: "${subtext}"` : ""}, clean medical background, blue and white, 1080x1350, high quality`
        : `Professional medical clinic poster for ${displayName}, heading: "${text}", modern blue and teal design, 1080x1350, high quality`;

      const runwareUrl = await generateBackground({ prompt, width: 1080, height: 1344 });

      if (runwareUrl) {
        imageUrl = runwareUrl;
      } else {
        // Runware unavailable — generate gradient card with text using Sharp
        const gradientBuffer = await buildLocalCard(
          null,
          text,
          subtext || "",
          displayName,
          1080,
          1350,
        );
        const filename = `${crypto.randomUUID()}.jpg`;
        const filePath = path.join(CARDS_DIR, filename);
        fs.writeFileSync(filePath, gradientBuffer);
        imageUrl = `/api/images/card-file/${filename}`;
      }
    }

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
