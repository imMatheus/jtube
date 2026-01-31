import { and, desc, eq, sql, isNull } from "drizzle-orm";
import { db } from "../db";
import { comments, commentLikes, users } from "../db/schema";
import { getClientIp, getOrCreateUser } from "./users";

// GET /api/videos/:videoId/comments - get comments for a video
export async function handleGetComments(
  req: Request,
  videoId: string,
  corsHeaders: Record<string, string>
) {
  const ip = getClientIp(req);
  const currentUser = await getOrCreateUser(ip);

  // Get all top-level comments (no parent)
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
    .orderBy(desc(comments.createdAt));

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

  let likeCounts: Record<string, { likes: number; dislikes: number }> = {};
  let userLikes: Record<string, boolean | null> = {};

  if (commentIds.length > 0) {
    // Get like/dislike counts
    const likeResults = await db
      .select({
        commentId: commentLikes.commentId,
        isLike: commentLikes.isLike,
        count: sql<number>`count(*)::int`,
      })
      .from(commentLikes)
      .where(sql`${commentLikes.commentId} IN ${commentIds}`)
      .groupBy(commentLikes.commentId, commentLikes.isLike);

    for (const row of likeResults) {
      if (!likeCounts[row.commentId]) {
        likeCounts[row.commentId] = { likes: 0, dislikes: 0 };
      }
      if (row.isLike) {
        likeCounts[row.commentId].likes = row.count;
      } else {
        likeCounts[row.commentId].dislikes = row.count;
      }
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
    likes: likeCounts[comment.id]?.likes || 0,
    dislikes: likeCounts[comment.id]?.dislikes || 0,
    userLike: userLikes[comment.id] ?? null,
  });

  const commentsWithReplies = topLevelComments.map((comment) => ({
    ...formatComment(comment),
    replies: allReplies
      .filter((r) => r.parentId === comment.id)
      .map(formatComment),
  }));

  const totalCount = topLevelComments.length + allReplies.length;

  return Response.json(
    { comments: commentsWithReplies, totalCount },
    { headers: corsHeaders }
  );
}

// POST /api/videos/:videoId/comments - create a comment
export async function handlePostComment(
  req: Request,
  videoId: string,
  corsHeaders: Record<string, string>
) {
  const ip = getClientIp(req);
  const user = await getOrCreateUser(ip);

  const body = await req.json();
  const { content, parentId } = body as { content: string; parentId?: string };

  if (!content || content.trim().length === 0) {
    return Response.json(
      { error: "Content is required" },
      { status: 400, headers: corsHeaders }
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

  return Response.json(
    {
      id: newComment[0].id,
      content: newComment[0].content,
      createdAt: newComment[0].createdAt,
      user: {
        id: user.id,
        username: user.username,
      },
      likes: 0,
      dislikes: 0,
      userLike: null,
      replies: [],
    },
    { status: 201, headers: corsHeaders }
  );
}

// POST /api/comments/:commentId/like - like a comment
export async function handleLikeComment(
  req: Request,
  commentId: string,
  corsHeaders: Record<string, string>
) {
  const ip = getClientIp(req);
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
    if (existing[0].isLike) {
      // Already liked, remove the like
      await db
        .delete(commentLikes)
        .where(eq(commentLikes.id, existing[0].id));
      return Response.json({ userLike: null }, { headers: corsHeaders });
    } else {
      // Was dislike, change to like
      await db
        .update(commentLikes)
        .set({ isLike: true })
        .where(eq(commentLikes.id, existing[0].id));
      return Response.json({ userLike: true }, { headers: corsHeaders });
    }
  }

  // No existing reaction, create like
  await db.insert(commentLikes).values({
    commentId,
    userId: user.id,
    isLike: true,
  });

  return Response.json({ userLike: true }, { headers: corsHeaders });
}

// POST /api/comments/:commentId/dislike - dislike a comment
export async function handleDislikeComment(
  req: Request,
  commentId: string,
  corsHeaders: Record<string, string>
) {
  const ip = getClientIp(req);
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
    if (!existing[0].isLike) {
      // Already disliked, remove the dislike
      await db
        .delete(commentLikes)
        .where(eq(commentLikes.id, existing[0].id));
      return Response.json({ userLike: null }, { headers: corsHeaders });
    } else {
      // Was like, change to dislike
      await db
        .update(commentLikes)
        .set({ isLike: false })
        .where(eq(commentLikes.id, existing[0].id));
      return Response.json({ userLike: false }, { headers: corsHeaders });
    }
  }

  // No existing reaction, create dislike
  await db.insert(commentLikes).values({
    commentId,
    userId: user.id,
    isLike: false,
  });

  return Response.json({ userLike: false }, { headers: corsHeaders });
}
