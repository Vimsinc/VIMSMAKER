import { pgTable, text, serial, timestamp, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const videosHistoryTable = pgTable("videos_history", {
  id: serial("id").primaryKey(),
  originalName: text("original_name").notNull(),
  outputUrl: text("output_url").notNull(),
  duration: real("duration").notNull().default(0),
  format: text("format").default("mp4"),
  captions: text("captions"),
  hasCaptions: boolean("has_captions").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVideosHistorySchema = createInsertSchema(videosHistoryTable).omit({ id: true, createdAt: true });
export type InsertVideosHistory = z.infer<typeof insertVideosHistorySchema>;
export type VideosHistory = typeof videosHistoryTable.$inferSelect;
