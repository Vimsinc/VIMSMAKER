import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("vibe_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  plan: text("plan").notNull().default("free"), // free | essencial | premium
  postsUsed: integer("posts_used").notNull().default(0),
  videoSecondsUsed: integer("video_seconds_used").notNull().default(0),
  nanoBananaUsed: integer("nano_banana_used").notNull().default(0),
  isAdmin: boolean("is_admin").notNull().default(false),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
