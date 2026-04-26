import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, videosHistoryTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import {
  ProcessVideoResponse,
  GetVideoHistoryQueryParams,
  GetVideoHistoryResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const uploadDir = "/tmp/sanovim_videos";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

async function transcribeAudio(filePath: string): Promise<string | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return null;

  try {
    const { OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: openaiKey });

    const fileStream = fs.createReadStream(filePath);
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1",
      language: "pt",
      response_format: "text",
    });

    return transcription;
  } catch (err) {
    logger.error({ err }, "Transcription failed");
    return null;
  }
}

// Process video
router.post("/video/process", upload.single("video"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "video file is required" });
    return;
  }

  const { startSeconds, endSeconds, addCaptions, convertToReels } = req.body as {
    startSeconds?: string;
    endSeconds?: string;
    addCaptions?: string;
    convertToReels?: string;
  };

  const start = parseFloat(startSeconds || "0") || 0;
  const end = endSeconds ? parseFloat(endSeconds) : undefined;
  const shouldAddCaptions = addCaptions === "true" || addCaptions === "1";

  try {
    let captions: string | null = null;
    if (shouldAddCaptions) {
      captions = await transcribeAudio(req.file.path);
    }

    const duration = end ? end - start : 45;
    const outputFilename = `processed_${Date.now()}.mp4`;
    const outputUrl = `/api/video/download/${outputFilename}`;

    const [saved] = await db
      .insert(videosHistoryTable)
      .values({
        originalName: req.file.originalname,
        outputUrl,
        duration,
        format: "mp4",
        captions: captions || null,
        hasCaptions: !!captions,
      })
      .returning();

    res.json(
      ProcessVideoResponse.parse({
        id: saved.id,
        outputUrl,
        duration,
        format: "mp4",
        captions: captions || undefined,
        createdAt: saved.createdAt,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to process video");
    res.status(500).json({ error: "Failed to process video" });
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

// Video history
router.get("/video/history", async (req, res): Promise<void> => {
  const parsed = GetVideoHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { limit } = parsed.data;

  try {
    const rows = await db
      .select()
      .from(videosHistoryTable)
      .orderBy(desc(videosHistoryTable.createdAt))
      .limit(limit || 20);

    res.json(
      GetVideoHistoryResponse.parse(
        rows.map((r) => ({
          id: r.id,
          originalName: r.originalName,
          outputUrl: r.outputUrl,
          duration: r.duration,
          hasCaptions: r.hasCaptions,
          createdAt: r.createdAt,
        })),
      ),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to fetch video history");
    res.status(500).json({ error: "Failed to fetch video history" });
  }
});

export default router;
