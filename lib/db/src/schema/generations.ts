import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const generationsTable = pgTable("vibe_generations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  theme: text("theme").notNull(),
  niche: text("niche"),
  type: text("type").notNull(), // ideas | carousel | legend | hashtags
  content: text("content").notNull(), // JSON string
  imageModel: text("image_model"), // runware | gemini-flash | gemini-pro
  imageUrls: text("image_urls"), // JSON array
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGenerationSchema = createInsertSchema(generationsTable).omit({ id: true, createdAt: true });
export type InsertGeneration = z.infer<typeof insertGenerationSchema>;
export type Generation = typeof generationsTable.$inferSelect;

export const trendingCacheTable = pgTable("vibe_trending_cache", {
  id: serial("id").primaryKey(),
  niche: text("niche").notNull(),
  topics: text("topics").notNull(), // JSON array
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});
