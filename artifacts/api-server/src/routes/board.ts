import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  CreateBoardItemBody,
  DeleteBoardItemParams,
  GetBoardSummaryResponse,
  ListBoardActivityResponse,
  ListBoardItemsResponse,
  ToggleBoardItemReactionBody,
  ToggleBoardItemReactionParams,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import {
  boardActivity,
  boardItems,
  boardReactions,
} from "@workspace/db/schema";

const router: IRouter = Router();
const CURRENT_USER = "Om";

function toBoardItem(
  item: typeof boardItems.$inferSelect,
  reactedByCurrentUser: boolean,
) {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    category: item.category as "idea" | "question" | "update",
    authorName: item.authorName,
    reactions: item.reactionCount,
    reactedByCurrentUser,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

router.get("/board/items", async (req, res) => {
  try {
    const items = await db
      .select()
      .from(boardItems)
      .orderBy(desc(boardItems.createdAt));
    const reactions = await db
      .select({ itemId: boardReactions.itemId })
      .from(boardReactions)
      .where(eq(boardReactions.actorName, CURRENT_USER));
    const reactedIds = new Set(reactions.map((reaction) => reaction.itemId));
    const data = ListBoardItemsResponse.parse(
      items.map((item) => toBoardItem(item, reactedIds.has(item.id))),
    );
    res.json(data);
  } catch (error) {
    req.log.error({ err: error }, "Failed to list board items");
    res.status(500).json({ error: "Unable to load board items" });
  }
});

router.post("/board/items", async (req, res) => {
  const parsed = CreateBoardItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Title, body, category, and author are required" });
    return;
  }

  try {
    const [item] = await db
      .insert(boardItems)
      .values({
        ...parsed.data,
        title: parsed.data.title.trim(),
        body: parsed.data.body.trim(),
        authorName: parsed.data.authorName.trim(),
      })
      .returning();

    await db.insert(boardActivity).values({
      itemId: item.id,
      actorName: item.authorName,
      action: "created",
      itemTitle: item.title,
    });

    const data = {
      ...toBoardItem(item, item.authorName === CURRENT_USER),
      reactions: 0,
    };
    res.status(201).json(data);
  } catch (error) {
    req.log.error({ err: error }, "Failed to create board item");
    res.status(500).json({ error: "Unable to create board item" });
  }
});

router.patch("/board/items/:id/reaction", async (req, res) => {
  const params = ToggleBoardItemReactionParams.safeParse(req.params);
  const body = ToggleBoardItemReactionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "A valid item and author are required" });
    return;
  }

  try {
    const [item] = await db
      .select()
      .from(boardItems)
      .where(eq(boardItems.id, params.data.id));
    if (!item) {
      res.status(404).json({ error: "Board item not found" });
      return;
    }

    const actorName = body.data.authorName.trim();
    const [existingReaction] = await db
      .select()
      .from(boardReactions)
      .where(
        and(
          eq(boardReactions.itemId, item.id),
          eq(boardReactions.actorName, actorName),
        ),
      );

    const reacted = !existingReaction;
    if (existingReaction) {
      await db.delete(boardReactions).where(eq(boardReactions.id, existingReaction.id));
    } else {
      await db.insert(boardReactions).values({
        itemId: item.id,
        actorName,
      });
    }

    const [updatedItem] = await db
      .update(boardItems)
      .set({
        reactionCount: reacted
          ? sql<number>`${boardItems.reactionCount} + 1`
          : sql<number>`${boardItems.reactionCount} - 1`,
        updatedAt: new Date(),
      })
      .where(eq(boardItems.id, item.id))
      .returning();

    await db.insert(boardActivity).values({
      itemId: item.id,
      actorName,
      action: reacted ? "reacted" : "unreacted",
      itemTitle: item.title,
    });

    res.json(toBoardItem(updatedItem, reacted && actorName === CURRENT_USER));
  } catch (error) {
    req.log.error({ err: error }, "Failed to toggle board reaction");
    res.status(500).json({ error: "Unable to update reaction" });
  }
});

router.delete("/board/items/:id", async (req, res) => {
  const params = DeleteBoardItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "A valid item is required" });
    return;
  }

  try {
    const [item] = await db
      .select()
      .from(boardItems)
      .where(eq(boardItems.id, params.data.id));
    if (!item) {
      res.status(404).json({ error: "Board item not found" });
      return;
    }

    await db.delete(boardReactions).where(eq(boardReactions.itemId, item.id));
    await db.delete(boardItems).where(eq(boardItems.id, item.id));
    await db.insert(boardActivity).values({
      itemId: item.id,
      actorName: CURRENT_USER,
      action: "deleted",
      itemTitle: item.title,
    });
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete board item");
    res.status(500).json({ error: "Unable to delete board item" });
  }
});

router.get("/board/activity", async (req, res) => {
  try {
    const activity = await db
      .select()
      .from(boardActivity)
      .orderBy(desc(boardActivity.createdAt))
      .limit(12);
    res.json(ListBoardActivityResponse.parse(activity));
  } catch (error) {
    req.log.error({ err: error }, "Failed to list board activity");
    res.status(500).json({ error: "Unable to load activity" });
  }
});

router.get("/board/summary", async (req, res) => {
  try {
    const [summary] = await db
      .select({
        totalItems: sql<number>`count(*)::int`,
        reactions: sql<number>`coalesce(sum(${boardItems.reactionCount}), 0)::int`,
      })
      .from(boardItems);
    const categoryCounts = await db
      .select({
        category: boardItems.category,
        count: sql<number>`count(*)::int`,
      })
      .from(boardItems)
      .groupBy(boardItems.category);
    const counts = new Map(categoryCounts.map((row) => [row.category, row.count]));
    res.json(
      GetBoardSummaryResponse.parse({
        totalItems: summary?.totalItems ?? 0,
        ideas: counts.get("idea") ?? 0,
        questions: counts.get("question") ?? 0,
        updates: counts.get("update") ?? 0,
        reactions: summary?.reactions ?? 0,
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Failed to load board summary");
    res.status(500).json({ error: "Unable to load board summary" });
  }
});

export default router;