import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const imagesHistoryTable = pgTable("images_history", {
  id: serial("id").primaryKey(),
  account: text("account"),
  type: text("type").notNull().default("generated"), // generated | card
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  prompt: text("prompt"),
  width: integer("width").default(1080),
  height: integer("height").default(1350),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertImagesHistorySchema = createInsertSchema(imagesHistoryTable).omit({ id: true, createdAt: true });
export type InsertImagesHistory = z.infer<typeof insertImagesHistorySchema>;
export type ImagesHistory = typeof imagesHistoryTable.$inferSelect;
