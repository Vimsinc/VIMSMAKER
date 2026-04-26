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

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const CARDS_DIR = "/tmp/sanovim-cards";
fs.mkdirSync(CARDS_DIR, { recursive: true });

async function fetchBuffer(url: string): Promise<Buffer> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

// Gradient fallback background
async function buildGradientBackground(w: number, h: number): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stop-color="#0a1628"/>
        <stop offset="50%" stop-color="#1a3a6b"/>
        <stop offset="100%" stop-color="#0e7490"/>
      </linearGradient>
      <radialGradient id="glow" cx="70%" cy="30%" r="50%">
        <stop offset="0%" stop-color="#1e88e5" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    <rect width="${w}" height="${h}" fill="url(#glow)"/>
    <circle cx="${w * 0.85}" cy="${h * 0.15}" r="${w * 0.3}" fill="none" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.12"/>
    <circle cx="${w * 0.85}" cy="${h * 0.15}" r="${w * 0.2}" fill="none" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.1"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// Text overlay SVG
function buildTextOverlaySvg(w: number, h: number, text: string, subtext: string, displayName: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const overlayH = Math.round(h * 0.38);
  const overlayY = h - overlayH;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="textbg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000" stop-opacity="0"/>
        <stop offset="40%" stop-color="#0a1628" stop-opacity="0.72"/>
        <stop offset="100%" stop-color="#0a1628" stop-opacity="0.96"/>
      </linearGradient>
    </defs>
    <rect x="0" y="${overlayY}" width="${w}" height="${overlayH}" fill="url(#textbg)"/>
    <rect x="${w * 0.08}" y="${h - Math.round(overlayH * 0.78)}" width="${Math.round(w * 0.06)}" height="3" fill="#38bdf8"/>
    <text x="${w * 0.08}" y="${h - Math.round(overlayH * 0.6)}"
      font-family="Arial, Helvetica, sans-serif" font-weight="bold"
      font-size="${Math.round(w * 0.058)}" fill="#ffffff" letter-spacing="0.5">${esc(text)}</text>
    <text x="${w * 0.08}" y="${h - Math.round(overlayH * 0.42)}"
      font-family="Arial, Helvetica, sans-serif" font-weight="normal"
      font-size="${Math.round(w * 0.036)}" fill="#94d2e0">${esc(subtext)}</text>
    <text x="${w * 0.08}" y="${h - Math.round(overlayH * 0.14)}"
      font-family="Arial, Helvetica, sans-serif" font-weight="bold"
      font-size="${Math.round(w * 0.028)}" fill="#38bdf8" letter-spacing="2">${esc(displayName).toUpperCase()}</text>
  </svg>`;
}

// Composite any background buffer + optional person (transparent PNG) + text overlay
async function compositeCard(
  backgroundBuffer: Buffer,
  personPngBuffer: Buffer | null,
  text: string,
  subtext: string,
  displayName: string,
  w = 1080,
  h = 1350,
): Promise<Buffer> {
  // Resize background
  const bg = await sharp(backgroundBuffer)
    .resize(w, h, { fit: "cover", position: "center" })
    .png()
    .toBuffer();

  const layers: sharp.OverlayOptions[] = [];

  if (personPngBuffer) {
    // Scale person to fill bottom 85% of card height, keep aspect ratio
    const meta = await sharp(personPngBuffer).metadata();
    const pw = meta.width || 800;
    const ph = meta.height || 1000;
    const targetH = Math.round(h * 0.85);
    const targetW = Math.round(targetH * (pw / ph));
    const finalW = Math.min(targetW, w);
    const finalH = Math.round(finalW * (ph / pw));

    const personResized = await sharp(personPngBuffer)
      .resize(finalW, finalH, { fit: "inside" })
      .png()
      .toBuffer();

    layers.push({ input: personResized, gravity: "south" });
  }

  // Text overlay
  const svgBuf = await sharp(Buffer.from(buildTextOverlaySvg(w, h, text, subtext, displayName)))
    .png()
    .toBuffer();
  layers.push({ input: svgBuf, blend: "over" });

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

    const [saved] = await db.insert(imagesHistoryTable).values({
      account: account || null,
      type: "generated",
      url: imageUrl,
      thumbnailUrl: imageUrl,
      prompt: fullPrompt,
      width: width || 1080,
      height: height || 1350,
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

  try {
    let imageUrl: string;

    if (hasPhoto) {
      req.log.info({ fileSize: req.file!.size }, "Photo received — running Runware pipeline");

      // Build background prompt
      const bgPrompt = description?.trim()
        ? `Professional medical background: ${description.trim()}, clean, elegant, blue and white tones, studio lighting, high quality, no people`
        : `Professional medical clinic studio background, dark navy blue gradient with soft ambient light, elegant, clean, no people, no text, high quality`;

      // Step 1: remove background + generate AI background in parallel
      const [noBgUrl, bgUrl] = await Promise.all([
        removeBackground(req.file!.buffer, req.file!.mimetype),
        generateBackground({ prompt: bgPrompt, width: 1080, height: 1344 }),
      ]);

      req.log.info({ noBgUrl: !!noBgUrl, bgUrl: !!bgUrl }, "Runware pipeline results");

      let backgroundBuffer: Buffer;
      let personBuffer: Buffer | null = null;

      if (bgUrl) {
        backgroundBuffer = await fetchBuffer(bgUrl);
      } else {
        req.log.warn("Background generation failed, using gradient fallback");
        backgroundBuffer = await buildGradientBackground(1080, 1350);
      }

      if (noBgUrl) {
        personBuffer = await fetchBuffer(noBgUrl);
      } else {
        req.log.warn("Background removal failed, using original photo");
        personBuffer = req.file!.buffer;
      }

      const cardBuffer = await compositeCard(backgroundBuffer, personBuffer, text, subtext || "", displayName);
      const filename = `${crypto.randomUUID()}.jpg`;
      fs.writeFileSync(path.join(CARDS_DIR, filename), cardBuffer);
      imageUrl = `/api/images/card-file/${filename}`;
      req.log.info({ filename, size: cardBuffer.length }, "Card composited and saved");
    } else {
      // No photo — pure AI generation
      const prompt = description?.trim()
        ? `Professional medical marketing card for ${displayName}, scene: ${description.trim()}, heading: "${text}"${subtext ? `, subtitle: "${subtext}"` : ""}, blue and white, 1080x1350, high quality`
        : `Professional medical clinic poster for ${displayName}, heading: "${text}"${subtext ? `, subtitle: "${subtext}"` : ""}, modern blue and teal design, 1080x1350, high quality`;

      const runwareUrl = await generateBackground({ prompt, width: 1080, height: 1344 });

      if (runwareUrl) {
        // Composite text overlay on top of AI image
        const aiBgBuffer = await fetchBuffer(runwareUrl);
        const cardBuffer = await compositeCard(aiBgBuffer, null, text, subtext || "", displayName);
        const filename = `${crypto.randomUUID()}.jpg`;
        fs.writeFileSync(path.join(CARDS_DIR, filename), cardBuffer);
        imageUrl = `/api/images/card-file/${filename}`;
      } else {
        // Full local fallback
        req.log.warn("Runware unavailable, using gradient fallback");
        const gradBg = await buildGradientBackground(1080, 1350);
        const cardBuffer = await compositeCard(gradBg, null, text, subtext || "", displayName);
        const filename = `${crypto.randomUUID()}.jpg`;
        fs.writeFileSync(path.join(CARDS_DIR, filename), cardBuffer);
        imageUrl = `/api/images/card-file/${filename}`;
      }
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
