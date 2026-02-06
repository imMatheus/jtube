import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { videos, videoLikes } from "../db/schema";
import { getClientIp, getOrCreateUser } from "./users";
import { recaptcha } from "../middleware/recaptcha";
import { videoLikeRateLimiter } from "../middleware/ratelimiter";

export const videoLikesRoutes = new Hono();

// GET /api/videos/:videoId/like - get user's like status for a video
videoLikesRoutes.get("/videos/:videoId/like", async (c) => {
  const videoId = c.req.param("videoId");
  const ip = getClientIp(c.req.raw);
  const user = await getOrCreateUser(ip);

  const existing = await db
    .select({ isLike: videoLikes.isLike })
    .from(videoLikes)
    .where(
      and(
        eq(videoLikes.videoId, videoId),
        eq(videoLikes.userId, user.id)
      )
    )
    .limit(1);

  return c.json({ userLike: existing.length > 0 ? existing[0].isLike : null });
});

// POST /api/videos/:videoId/like - like a video
videoLikesRoutes.post("/videos/:videoId/like", recaptcha, videoLikeRateLimiter, async (c) => {
  const videoId = c.req.param("videoId");
  const ip = getClientIp(c.req.raw);
  const user = await getOrCreateUser(ip);

  // Check if user already has a reaction
  const existing = await db
    .select()
    .from(videoLikes)
    .where(
      and(
        eq(videoLikes.videoId, videoId),
        eq(videoLikes.userId, user.id)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Already liked, remove the like
    await db.delete(videoLikes).where(eq(videoLikes.id, existing[0].id));
    // Decrement likes count (floor at 0 to prevent negative)
    await db
      .update(videos)
      .set({ likes: sql`GREATEST(${videos.likes} - 1, 0)` })
      .where(eq(videos.id, videoId));
    return c.json({ userLike: null });
  }

  // No existing reaction, create like
  await db.insert(videoLikes).values({
    videoId,
    userId: user.id,
    isLike: true,
  });
  // Increment likes count
  await db
    .update(videos)
    .set({ likes: sql`${videos.likes} + 1` })
    .where(eq(videos.id, videoId));

  return c.json({ userLike: true });
});
