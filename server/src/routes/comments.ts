import { Hono } from "hono";
import { and, eq, sql, isNull, desc } from "drizzle-orm";
import { db } from "../db";
import { comments, commentLikes, users } from "../db/schema";
import { getClientIp, getOrCreateUser } from "./users";
import { recaptcha } from "../middleware/recaptcha";

export const commentsRoutes = new Hono();

// GET /api/videos/:videoId/comments - get comments for a video
commentsRoutes.get("/videos/:videoId/comments", async (c) => {
  const videoId = c.req.param("videoId");
  const ip = getClientIp(c.req.raw);
  const currentUser = await getOrCreateUser(ip);

  // Get 100 newest top-level comments
  const topLevelComments = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
      userId: comments.userId,
      username: users.username,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(and(eq(comments.videoId, videoId), isNull(comments.parentId)))
    .orderBy(desc(comments.createdAt))
    .limit(100);

  // Get all replies
  const allReplies = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
      userId: comments.userId,
      username: users.username,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(and(eq(comments.videoId, videoId), sql`${comments.parentId} IS NOT NULL`))
    .orderBy(comments.createdAt);

  // Get like counts and user's likes for all comments
  const commentIds = [...topLevelComments, ...allReplies].map((c) => c.id);

  const likeCounts: Record<string, number> = {};
  const userLikes: Record<string, boolean | null> = {};

  if (commentIds.length > 0) {
    // Get like counts
    const likeResults = await db
      .select({
        commentId: commentLikes.commentId,
        count: sql<number>`count(*)::int`,
      })
      .from(commentLikes)
      .where(sql`${commentLikes.commentId} IN ${commentIds}`)
      .groupBy(commentLikes.commentId);

    for (const row of likeResults) {
      likeCounts[row.commentId] = row.count;
    }

    // Get current user's likes
    const userLikeResults = await db
      .select({
        commentId: commentLikes.commentId,
        isLike: commentLikes.isLike,
      })
      .from(commentLikes)
      .where(
        and(
          sql`${commentLikes.commentId} IN ${commentIds}`,
          eq(commentLikes.userId, currentUser.id)
        )
      );

    for (const row of userLikeResults) {
      userLikes[row.commentId] = row.isLike;
    }
  }

  // Build response with nested replies
  const formatComment = (comment: (typeof topLevelComments)[0]) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    user: {
      id: comment.userId,
      username: comment.username,
    },
    likes: likeCounts[comment.id] || 0,
    userLike: userLikes[comment.id] ?? null,
  });

  const commentsWithReplies = topLevelComments.map((comment) => ({
    ...formatComment(comment),
    replies: allReplies
      .filter((r) => r.parentId === comment.id)
      .map(formatComment),
  }));

  const totalCount = topLevelComments.length + allReplies.length;

  return c.json({ comments: commentsWithReplies, totalCount });
});

// POST /api/videos/:videoId/comments - create a comment
commentsRoutes.post("/videos/:videoId/comments", recaptcha, async (c) => {
  const videoId = c.req.param("videoId");
  const ip = getClientIp(c.req.raw);
  const user = await getOrCreateUser(ip);

  const body = await c.req.json();
  const { content, parentId } = body as { content: string; parentId?: string };

  if (!content || content.trim().length === 0) {
    return c.json({ error: "Content is required" }, 400);
  }

  if (content.trim().length > 300) {
    return c.json({ error: "Comment must be 300 characters or less" }, 400);
  }

  if (content.includes('hamburger891') || content === 'Yo') {
    return c.json({ error: "Stop you weirdo" }, 400);
  }

  // Rate limit: max 3 comments per user per video per day
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentComments = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(
        eq(comments.videoId, videoId),
        eq(comments.userId, user.id),
        sql`${comments.createdAt} > ${oneDayAgo}`
      )
    );

  if (recentComments[0].count >= 3) {
    return c.json(
      { error: "You have left too many comments already" },
      429
    );
  }

  const newComment = await db
    .insert(comments)
    .values({
      videoId,
      userId: user.id,
      parentId: parentId || null,
      content: content.trim(),
    })
    .returning();

  return c.json(
    {
      id: newComment[0].id,
      content: newComment[0].content,
      createdAt: newComment[0].createdAt,
      user: {
        id: user.id,
        username: user.username,
      },
      likes: 0,
      userLike: null,
      replies: [],
    },
    201
  );
});

// POST /api/comments/:commentId/like - like a comment
commentsRoutes.post("/comments/:commentId/like", recaptcha, async (c) => {
  const commentId = c.req.param("commentId");
  const ip = getClientIp(c.req.raw);
  const user = await getOrCreateUser(ip);

  // Check if user already has a reaction
  const existing = await db
    .select()
    .from(commentLikes)
    .where(
      and(
        eq(commentLikes.commentId, commentId),
        eq(commentLikes.userId, user.id)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Already liked, remove the like
    await db
      .delete(commentLikes)
      .where(eq(commentLikes.id, existing[0].id));
    return c.json({ userLike: null });
  }

  // No existing reaction, create like
  await db.insert(commentLikes).values({
    commentId,
    userId: user.id,
    isLike: true,
  });

  return c.json({ userLike: true });
});
