import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";
import { generateImage } from "../lib/runware";
import { generateImageGemini } from "../lib/gemini";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { sql, eq } from "drizzle-orm";

const router: IRouter = Router();

const CARDS_DIR = "/tmp/vibemanager-cards";
fs.mkdirSync(CARDS_DIR, { recursive: true });

function cleanOldFiles(dir: string, maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    const files = fs.readdirSync(dir);
    const now = Date.now();
    for (const f of files) {
      const fp = path.join(dir, f);
      const stat = fs.statSync(fp);
      if (now - stat.mtimeMs > maxAgeMs) fs.unlinkSync(fp);
    }
  } catch {}
}
cleanOldFiles(CARDS_DIR);

async function getUserPlan(email?: string | null): Promise<string> {
  if (!email) return "free";
  try {
    const rows = await db
      .select({ plan: usersTable.plan })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    return rows[0]?.plan ?? "free";
  } catch {
    return "free";
  }
}

router.get("/images/card-file/:filename", (req, res): void => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(CARDS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const ext = path.extname(filename).toLowerCase();
  const ct = ext === ".png" ? "image/png" : "image/jpeg";
  res.setHeader("Content-Type", ct);
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.sendFile(filePath);
});

router.post("/images/generate", async (req, res): Promise<void> => {
  const { prompt, width, height } = req.body as { prompt?: string; width?: number; height?: number };
  if (!prompt) { res.status(400).json({ error: "prompt obrigatório" }); return; }

  try {
    const result = await generateImage({ prompt, width: width || 1080, height: height || 1350 });
    const imageUrl = result?.url || `https://placehold.co/${width || 1080}x${height || 1350}/f8fafc/0D6EFD?text=Imagem`;
    res.json({ url: imageUrl });
  } catch (err) {
    req.log.error(err, "generate image error");
    res.status(500).json({ error: "Erro ao gerar imagem" });
  }
});

router.post("/images/generate-gemini", async (req, res): Promise<void> => {
  const { prompt, quality } = req.body as { prompt?: string; quality?: "flash" | "pro" };
  if (!prompt) { res.status(400).json({ error: "prompt obrigatório" }); return; }

  const userEmail = (req as any).user?.email as string | undefined;
  const plan = await getUserPlan(userEmail);

  if (plan === "free") {
    res.status(403).json({ error: "Nano Banana e Imagen 3 estão disponíveis a partir do plano Essencial. Use Runware (gratuito) ou faça upgrade." });
    return;
  }
  if (quality === "pro" && plan !== "premium") {
    res.status(403).json({ error: "Imagen 3 é exclusivo do plano Premium. Faça upgrade ou use Nano Banana (Flash)." });
    return;
  }

  try {
    const sharp = (await import("sharp")).default;
    const { b64, mimeType } = await generateImageGemini(prompt, quality ?? "flash");
    const imgBuffer = Buffer.from(b64, "base64");
    const ext = mimeType.includes("png") ? "png" : "jpg";
    const filename = `gemini_${Date.now()}.${ext}`;
    const filePath = path.join(CARDS_DIR, filename);
    fs.writeFileSync(filePath, imgBuffer);

    const resized = await sharp(imgBuffer)
      .resize(1080, 1350, { fit: "cover" })
      .jpeg({ quality: 92 })
      .toBuffer();
    const resizedFilename = `gemini_${Date.now()}_resized.jpg`;
    const resizedPath = path.join(CARDS_DIR, resizedFilename);
    fs.writeFileSync(resizedPath, resized);

    await db.update(usersTable).set({ nanoBananaUsed: sql`${usersTable.nanoBananaUsed} + 1` }).where(eq(usersTable.id, 1));
    res.json({ url: `/api/images/card-file/${resizedFilename}` });
  } catch (err) {
    req.log.error(err, "generate gemini image error");
    res.status(500).json({ error: "Erro ao gerar imagem com Gemini" });
  }
});

export default router;
