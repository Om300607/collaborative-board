import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const boardItems = pgTable("board_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull(),
  authorName: text("author_name").notNull(),
  reactionCount: integer("reaction_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const boardReactions = pgTable(
  "board_reactions",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id").notNull(),
    actorName: text("actor_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    itemActorUnique: unique("board_reactions_item_actor_unique").on(
      table.itemId,
      table.actorName,
    ),
  }),
);

export const boardActivity = pgTable("board_activity", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  actorName: text("actor_name").notNull(),
  action: text("action").notNull(),
  itemTitle: text("item_title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBoardItemSchema = createInsertSchema(boardItems).pick({
  title: true,
  body: true,
  category: true,
  authorName: true,
});

export type InsertBoardItem = z.infer<typeof insertBoardItemSchema>;
export type BoardItem = typeof boardItems.$inferSelect;
export type BoardActivity = typeof boardActivity.$inferSelect;