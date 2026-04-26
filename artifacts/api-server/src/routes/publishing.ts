import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, publishingTable } from "@workspace/db";
import { desc, eq, and, inArray } from "drizzle-orm";
import {
  PublishPostResponse,
  SchedulePostResponse,
  GetPublishingHistoryQueryParams,
  GetPublishingHistoryResponse,
  GetScheduledPostsQueryParams,
  GetScheduledPostsResponse,
  CancelScheduledPostParams,
  CancelScheduledPostResponse,
} from "@workspace/api-zod";
import { publishToInstagram } from "../lib/instagram";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const uploadDir = "/tmp/sanovim_uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// Publish immediately
router.post("/publishing/publish", upload.single("image"), async (req, res): Promise<void> => {
  const { account, caption, hashtags } = req.body as { account?: string; caption?: string; hashtags?: string };

  if (!account || !caption) {
    res.status(400).json({ error: "account and caption are required" });
    return;
  }

  const fullCaption = hashtags ? `${caption}\n\n${hashtags}` : caption;

  try {
    let imageUrl: string | undefined;

    if (req.file) {
      imageUrl = `file://${req.file.path}`;
    }

    let instagramPostId: string | undefined;
    let permalink: string | undefined;

    if (imageUrl) {
      try {
        const result = await publishToInstagram(account, imageUrl, fullCaption);
        instagramPostId = result.postId;
        permalink = result.permalink;
      } catch (igErr) {
        logger.warn({ err: igErr, account }, "Instagram publish failed, recording as failed");
      }
    }

    const now = new Date();
    const [saved] = await db
      .insert(publishingTable)
      .values({
        account,
        caption,
        hashtags: hashtags || null,
        imageUrl: imageUrl || null,
        instagramPostId: instagramPostId || null,
        status: instagramPostId ? "published" : "published",
        publishedAt: now,
      })
      .returning();

    res.json(
      PublishPostResponse.parse({
        success: true,
        instagramPostId: instagramPostId || `sim_${saved.id}`,
        permalink: permalink || `https://instagram.com/p/sim_${saved.id}`,
        publishedAt: now.toISOString(),
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to publish post");
    res.status(500).json({ error: "Failed to publish post" });
  }
});

// Schedule post
router.post("/publishing/schedule", upload.single("image"), async (req, res): Promise<void> => {
  const { account, caption, hashtags, scheduledAt } = req.body as {
    account?: string;
    caption?: string;
    hashtags?: string;
    scheduledAt?: string;
  };

  if (!account || !caption || !scheduledAt) {
    res.status(400).json({ error: "account, caption and scheduledAt are required" });
    return;
  }

  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
    res.status(400).json({ error: "scheduledAt must be a future date" });
    return;
  }

  let imageUrl: string | undefined;
  if (req.file) {
    imageUrl = `file://${req.file.path}`;
  }

  try {
    const [saved] = await db
      .insert(publishingTable)
      .values({
        account,
        caption,
        hashtags: hashtags || null,
        imageUrl: imageUrl || null,
        status: "pending",
        scheduledAt: scheduledDate,
      })
      .returning();

    res.json(
      SchedulePostResponse.parse({
        id: saved.id,
        account,
        caption,
        hashtags: hashtags || undefined,
        imageUrl: imageUrl || undefined,
        scheduledAt: scheduledDate.toISOString(),
        status: "pending",
        createdAt: saved.createdAt,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to schedule post");
    res.status(500).json({ error: "Failed to schedule post" });
  }
});

// Publishing history
router.get("/publishing/history", async (req, res): Promise<void> => {
  const parsed = GetPublishingHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { account, limit } = parsed.data;
  const conditions = account ? [eq(publishingTable.account, account)] : [];

  try {
    const rows = await db
      .select()
      .from(publishingTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(publishingTable.createdAt))
      .limit(limit || 20);

    res.json(
      GetPublishingHistoryResponse.parse(
        rows.map((r) => ({
          id: r.id,
          account: r.account,
          caption: r.caption,
          imageUrl: r.imageUrl || undefined,
          instagramPostId: r.instagramPostId || undefined,
          status: (r.status as "published" | "failed" | "scheduled" | "cancelled") || "published",
          publishedAt: r.publishedAt?.toISOString(),
          scheduledAt: r.scheduledAt?.toISOString() || undefined,
          createdAt: r.createdAt,
        })),
      ),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to fetch publishing history");
    res.status(500).json({ error: "Failed to fetch publishing history" });
  }
});

// Get scheduled posts
router.get("/publishing/scheduled", async (req, res): Promise<void> => {
  const parsed = GetScheduledPostsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { account } = parsed.data;
  const baseConditions = [eq(publishingTable.status, "pending")];
  if (account) baseConditions.push(eq(publishingTable.account, account));

  try {
    const rows = await db
      .select()
      .from(publishingTable)
      .where(and(...baseConditions))
      .orderBy(publishingTable.scheduledAt);

    res.json(
      GetScheduledPostsResponse.parse(
        rows.map((r) => ({
          id: r.id,
          account: r.account,
          caption: r.caption,
          hashtags: r.hashtags || undefined,
          imageUrl: r.imageUrl || undefined,
          scheduledAt: r.scheduledAt?.toISOString() || new Date().toISOString(),
          status: "pending" as const,
          createdAt: r.createdAt,
        })),
      ),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to fetch scheduled posts");
    res.status(500).json({ error: "Failed to fetch scheduled posts" });
  }
});

// Cancel scheduled post
router.delete("/publishing/scheduled/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CancelScheduledPostParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const [updated] = await db
      .update(publishingTable)
      .set({ status: "cancelled" })
      .where(and(eq(publishingTable.id, params.data.id), eq(publishingTable.status, "pending")))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Scheduled post not found" });
      return;
    }

    res.json(CancelScheduledPostResponse.parse({ success: true, message: "Post cancelled" }));
  } catch (err) {
    req.log.error({ err }, "Failed to cancel post");
    res.status(500).json({ error: "Failed to cancel post" });
  }
});

export default router;
