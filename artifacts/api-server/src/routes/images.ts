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
import { generateImage, removeBackground, generateBackground } from "../lib/runware";
import { generateImageGemini } from "../lib/gemini";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const CARDS_DIR = "/tmp/sanovim-cards";
fs.mkdirSync(CARDS_DIR, { recursive: true });

async function fetchBuffer(url: string): Promise<Buffer> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

// Auto-correct EXIF rotation and return normalized JPEG buffer
async function normalizeOrientation(buffer: Buffer, mimetype: string): Promise<Buffer> {
  return sharp(buffer)
    .rotate()           // reads EXIF orientation and auto-rotates
    .jpeg({ quality: 95 })
    .toBuffer();
}

// Gradient fallback background
async function buildGradientBackground(w: number, h: number): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stop-color="#0a1628"/>
        <stop offset="55%" stop-color="#1a3a6b"/>
        <stop offset="100%" stop-color="#0e7490"/>
      </linearGradient>
      <radialGradient id="glow" cx="65%" cy="25%" r="55%">
        <stop offset="0%" stop-color="#1e88e5" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    <rect width="${w}" height="${h}" fill="url(#glow)"/>
    <circle cx="${w * 0.82}" cy="${h * 0.12}" r="${w * 0.32}" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.1"/>
    <circle cx="${w * 0.82}" cy="${h * 0.12}" r="${w * 0.22}" fill="none" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.08"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// Text overlay SVG — clean layout with accent bar
function buildTextOverlaySvg(w: number, h: number, text: string, subtext: string, displayName: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const gradH = Math.round(h * 0.40);
  const gradY = h - gradH;
  const pad = Math.round(w * 0.08);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="textbg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#000000" stop-opacity="0"/>
        <stop offset="35%"  stop-color="#060e1e" stop-opacity="0.65"/>
        <stop offset="100%" stop-color="#060e1e" stop-opacity="0.97"/>
      </linearGradient>
    </defs>
    <rect x="0" y="${gradY}" width="${w}" height="${gradH}" fill="url(#textbg)"/>

    <!-- accent line -->
    <rect x="${pad}" y="${h - Math.round(gradH * 0.76)}"
          width="${Math.round(w * 0.055)}" height="3" rx="1.5" fill="#38bdf8"/>

    <!-- main title -->
    <text x="${pad}" y="${h - Math.round(gradH * 0.58)}"
      font-family="Arial Black, Arial, Helvetica, sans-serif"
      font-weight="900" font-size="${Math.round(w * 0.062)}"
      fill="#ffffff" letter-spacing="-0.5">${esc(text)}</text>

    <!-- subtitle -->
    <text x="${pad}" y="${h - Math.round(gradH * 0.40)}"
      font-family="Arial, Helvetica, sans-serif"
      font-weight="400" font-size="${Math.round(w * 0.034)}"
      fill="#b0d8e8">${esc(subtext)}</text>

    <!-- brand name -->
    <text x="${pad}" y="${h - Math.round(gradH * 0.12)}"
      font-family="Arial, Helvetica, sans-serif"
      font-weight="700" font-size="${Math.round(w * 0.027)}"
      fill="#38bdf8" letter-spacing="3">${esc(displayName).toUpperCase()}</text>
  </svg>`;
}

// Ground shadow ellipse — makes person look anchored
function buildGroundShadowSvg(w: number, h: number, personW: number): string {
  const cx = w / 2;
  const cy = h - 2;
  const rx = Math.round(personW * 0.38);
  const ry = Math.round(w * 0.018);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"
      fill="rgba(0,0,0,0.45)"/>
  </svg>`;
}

// Main composite function
async function compositeCard(
  backgroundBuffer: Buffer,
  personPngBuffer: Buffer | null,
  text: string,
  subtext: string,
  displayName: string,
  w = 1080,
  h = 1350,
): Promise<Buffer> {
  // Resize background to exact card size
  const bg = await sharp(backgroundBuffer)
    .resize(w, h, { fit: "cover", position: "center" })
    .png()
    .toBuffer();

  const layers: sharp.OverlayOptions[] = [];

  if (personPngBuffer) {
    const meta = await sharp(personPngBuffer).metadata();
    const pw = meta.width || 600;
    const ph = meta.height || 900;
    const aspect = pw / ph;

    // Scale person to 88% of card height, centered horizontally, anchored to bottom
    const personH = Math.round(h * 0.88);
    let personW = Math.round(personH * aspect);
    // Clamp width to 95% of card width
    if (personW > Math.round(w * 0.95)) {
      personW = Math.round(w * 0.95);
    }
    const finalH = Math.round(personW / aspect);

    const personResized = await sharp(personPngBuffer)
      .resize(personW, finalH, { fit: "fill" })
      .png()
      .toBuffer();

    const left = Math.round((w - personW) / 2);
    const top = h - finalH; // anchor to bottom

    // Ground shadow
    const shadowSvg = buildGroundShadowSvg(w, h, personW);
    const shadowBuf = await sharp(Buffer.from(shadowSvg)).png().toBuffer();
    layers.push({ input: shadowBuf, blend: "multiply" });

    // Person
    layers.push({ input: personResized, left, top });
  }

  // Text + gradient overlay
  const textBuf = await sharp(Buffer.from(buildTextOverlaySvg(w, h, text, subtext, displayName)))
    .png()
    .toBuffer();
  layers.push({ input: textBuf, blend: "over" });

  return sharp(bg)
    .composite(layers)
    .jpeg({ quality: 93 })
    .toBuffer();
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

// Generate image
router.post("/images/generate", async (req, res): Promise<void> => {
  const parsed = GenerateImageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { prompt, account, style, width, height } = parsed.data;
  const fullPrompt = `${prompt}, ${style || "professional medical photography"}, high quality`;

  try {
    const result = await generateImage({ prompt: fullPrompt, width: width || 1080, height: height || 1350 });
    const imageUrl = result?.url ||
      `https://placehold.co/${width || 1080}x${height || 1350}/0f1729/38bdf8?text=${encodeURIComponent((prompt || "Imagem").slice(0, 40))}`;

    const [saved] = await db.insert(imagesHistoryTable).values({
      account: account || null, type: "generated", url: imageUrl,
      thumbnailUrl: imageUrl, prompt: fullPrompt,
      width: width || 1080, height: height || 1350,
    }).returning();

    res.json(GenerateImageResponse.parse({
      id: saved.id, url: imageUrl, thumbnailUrl: imageUrl,
      width: width || 1080, height: height || 1350,
      account: account || undefined, prompt: fullPrompt, createdAt: saved.createdAt,
    }));
  } catch (err) {
    req.log.error({ err }, "Failed to generate image");
    res.status(500).json({ error: "Failed to generate image" });
  }
});

// Create professional card
router.post("/images/create-card", upload.single("image"), async (req, res): Promise<void> => {
  const { account, text, subtext, description } = req.body as {
    account?: string; text?: string; subtext?: string; description?: string;
  };

  if (!text) { res.status(400).json({ error: "text is required" }); return; }

  const accountNames: Record<string, string> = {
    drdaniel: "Dr. Daniel", angelica: "Enf. Angélica", loysby: "Loysby",
  };
  const displayName = account ? accountNames[account] || account : "";
  const hasPhoto = !!req.file;
  const sceneDesc = description?.trim() || "";

  try {
    let imageUrl: string;

    if (hasPhoto) {
      req.log.info({ fileSize: req.file!.size, mimetype: req.file!.mimetype }, "Photo received");

      // Step 1: auto-correct EXIF orientation (fixes upside-down phone photos)
      const orientedBuffer = await normalizeOrientation(req.file!.buffer, req.file!.mimetype);
      req.log.info("EXIF orientation corrected");

      // Build background prompt — include "person standing" context for better integration
      const bgPrompt = sceneDesc
        ? `Professional medical background scene: ${sceneDesc}. Clean studio environment, soft natural lighting from front, realistic depth of field, no people in background, no text. Designed for a portrait of a medical professional standing in foreground.`
        : `Professional medical clinic reception or consultation room. Clean modern interior, white and blue tones, soft ambient lighting, bokeh background, no people, no text. Designed for a portrait composite.`;

      req.log.info("Starting background removal + AI background generation in parallel");

      // Step 2: remove background + generate AI background in parallel
      const [noBgUrl, bgUrl] = await Promise.all([
        removeBackground(orientedBuffer, "image/jpeg"),
        generateBackground({ prompt: bgPrompt, width: 1080, height: 1344 }),
      ]);

      req.log.info({ noBgUrl: !!noBgUrl, bgUrl: !!bgUrl }, "Pipeline results");

      // Step 3: download both (or fall back)
      const [personBuffer, backgroundBuffer] = await Promise.all([
        noBgUrl ? fetchBuffer(noBgUrl) : Promise.resolve(orientedBuffer),
        bgUrl   ? fetchBuffer(bgUrl)   : buildGradientBackground(1080, 1350),
      ]);

      if (!noBgUrl) req.log.warn("Background removal failed — using original photo");
      if (!bgUrl)   req.log.warn("Background generation failed — using gradient fallback");

      // Step 4: composite
      const cardBuffer = await compositeCard(backgroundBuffer, personBuffer, text, subtext || "", displayName);
      const filename = `${crypto.randomUUID()}.jpg`;
      fs.writeFileSync(path.join(CARDS_DIR, filename), cardBuffer);
      imageUrl = `/api/images/card-file/${filename}`;
      req.log.info({ filename, size: cardBuffer.length }, "Card composited and saved");
    } else {
      // No photo — pure AI card
      const prompt = sceneDesc
        ? `Professional medical marketing poster: ${sceneDesc}. Heading: "${text}"${subtext ? `, subtitle: "${subtext}"` : ""}. Clean typography, blue and white medical design, 1080x1350 portrait, high quality.`
        : `Professional medical marketing poster for ${displayName}. Heading: "${text}"${subtext ? `, subtitle: "${subtext}"` : ""}. Modern blue and white clinic design, clean typography, 1080x1350 portrait.`;

      const runwareUrl = await generateBackground({ prompt, width: 1080, height: 1344 });

      let bgBuffer: Buffer;
      if (runwareUrl) {
        bgBuffer = await fetchBuffer(runwareUrl);
      } else {
        req.log.warn("Runware unavailable — gradient fallback");
        bgBuffer = await buildGradientBackground(1080, 1350);
      }

      const cardBuffer = await compositeCard(bgBuffer, null, text, subtext || "", displayName);
      const filename = `${crypto.randomUUID()}.jpg`;
      fs.writeFileSync(path.join(CARDS_DIR, filename), cardBuffer);
      imageUrl = `/api/images/card-file/${filename}`;
    }

    const [saved] = await db.insert(imagesHistoryTable).values({
      account: account || null, type: "card", url: imageUrl,
      thumbnailUrl: imageUrl, prompt: text, width: 1080, height: 1350,
    }).returning();

    res.json(CreateProfessionalCardResponse.parse({
      id: saved.id, url: imageUrl, thumbnailUrl: imageUrl,
      width: 1080, height: 1350, account: account || undefined,
      prompt: text, createdAt: saved.createdAt,
    }));
  } catch (err) {
    req.log.error({ err }, "Failed to create card");
    res.status(500).json({ error: "Failed to create professional card" });
  }
});

// Generate image with Gemini (Nano Banana / Imagen 3)
router.post("/images/generate-gemini", async (req, res): Promise<void> => {
  const { prompt, account, quality } = req.body as {
    prompt?: string; account?: string; quality?: "flash" | "pro";
  };

  if (!prompt?.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  const fullPrompt = `${prompt}, professional medical photography, high quality, Brazilian healthcare context`;

  try {
    const { b64, mimeType } = await generateImageGemini(fullPrompt, quality ?? "flash");

    // Save to disk and serve via file endpoint
    const imgBuffer = Buffer.from(b64, "base64");
    const ext = mimeType.includes("png") ? "png" : "jpg";
    const filename = `gemini_${Date.now()}.${ext}`;
    const filePath = path.join(CARDS_DIR, filename);
    fs.writeFileSync(filePath, imgBuffer);
    const imageUrl = `/api/images/card-file/${filename}`;

    const [saved] = await db.insert(imagesHistoryTable).values({
      account: account || null,
      type: "generated",
      url: imageUrl,
      thumbnailUrl: imageUrl,
      prompt: fullPrompt,
      width: 1080,
      height: 1350,
    }).returning();

    res.json({
      id: saved.id,
      url: imageUrl,
      thumbnailUrl: imageUrl,
      width: 1080,
      height: 1350,
      account: account || undefined,
      prompt: fullPrompt,
      createdAt: saved.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Gemini image generation failed");
    res.status(500).json({ error: "Failed to generate image with Gemini" });
  }
});

// Get image history
router.get("/images/history", async (req, res): Promise<void> => {
  const parsed = GetImageHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { account, limit } = parsed.data;
  const conditions = account ? [eq(imagesHistoryTable.account, account)] : [];

  try {
    const rows = await db.select().from(imagesHistoryTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(imagesHistoryTable.createdAt))
      .limit(limit || 20);

    res.json(GetImageHistoryResponse.parse(rows.map((r) => ({
      id: r.id, url: r.url, account: r.account || undefined,
      type: (r.type as "generated" | "card") || "generated",
      prompt: r.prompt || undefined, createdAt: r.createdAt,
    }))));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch image history");
    res.status(500).json({ error: "Failed to fetch image history" });
  }
});

export default router;
