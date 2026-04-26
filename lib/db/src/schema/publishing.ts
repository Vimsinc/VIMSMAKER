import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const publishingTable = pgTable("publishing", {
  id: serial("id").primaryKey(),
  account: text("account").notNull(),
  caption: text("caption").notNull(),
  hashtags: text("hashtags"),
  imageUrl: text("image_url"),
  instagramPostId: text("instagram_post_id"),
  status: text("status").notNull().default("pending"), // pending | published | failed | scheduled | cancelled
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPublishingSchema = createInsertSchema(publishingTable).omit({ id: true, createdAt: true });
export type InsertPublishing = z.infer<typeof insertPublishingSchema>;
export type Publishing = typeof publishingTable.$inferSelect;
