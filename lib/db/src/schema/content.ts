import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentHistoryTable = pgTable("content_history", {
  id: serial("id").primaryKey(),
  account: text("account").notNull(), // drdaniel | angelica | loysby
  type: text("type").notNull(), // post | reels_script
  topic: text("topic").notNull(),
  specialty: text("specialty"),
  content: text("content").notNull(),
  hashtags: text("hashtags"), // JSON array stored as text
  cfmCompliant: boolean("cfm_compliant").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContentHistorySchema = createInsertSchema(contentHistoryTable).omit({ id: true, createdAt: true });
export type InsertContentHistory = z.infer<typeof insertContentHistorySchema>;
export type ContentHistory = typeof contentHistoryTable.$inferSelect;
