import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { logger } from "../lib/logger";
import { processVideoForReels, VIDEOS_OUT_DIR } from "../lib/ffmpeg";

const router: IRouter = Router();

const uploadDir = "/tmp/vibemanager_videos";
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

router.get("/video/download/:filename", (req, res): void => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(VIDEOS_OUT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Video file not found" });
    return;
  }
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.sendFile(filePath);
});

router.post("/video/process", upload.single("video"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "video file is required" });
    return;
  }

  const { startTime, endTime, addCaptions, convertToReels } = req.body as {
    startTime?: string;
    endTime?: string;
    addCaptions?: string;
    convertToReels?: string;
  };

  const start = parseFloat(startTime || "0") || 0;
  const end = endTime ? parseFloat(endTime) : undefined;
  const shouldAddCaptions = addCaptions === "true" || addCaptions === "1";
  const shouldConvert = convertToReels !== "false" && convertToReels !== "0";

  try {
    let captions: string | null = null;
    if (shouldAddCaptions) {
      req.log.info("Transcribing audio with Whisper…");
      captions = await transcribeAudio(req.file.path);
    }

    const { outputPath, duration } = await processVideoForReels(req.file.path, {
      startSeconds: start,
      endSeconds: end,
      convertToReels: shouldConvert,
      captions,
    });

    const outputFilename = path.basename(outputPath);
    const downloadUrl = `/api/video/download/${outputFilename}`;

    res.json({
      filename: outputFilename,
      downloadUrl,
      duration,
      transcript: captions || null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to process video");
    res.status(500).json({ error: "Failed to process video" });
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

export default router;
