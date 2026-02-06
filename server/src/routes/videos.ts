import { Hono } from "hono";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { videos } from "../db/schema";
import { logger } from "../logger";
import { recaptcha } from "../middleware/recaptcha";

export const videosRoutes = new Hono();

// GET /api/videos - return all videos sorted by most views
videosRoutes.get("/videos", async (c) => {
  const allVideos = await db.select().from(videos).orderBy(desc(videos.views));
  return c.json(allVideos);
});

// POST /api/videos/:id/view - increment view count
videosRoutes.post("/videos/:id/view", recaptcha, async (c) => {
  const videoId = c.req.param("id");

  const result = await db
    .update(videos)
    .set({ views: sql`${videos.views} + 1` })
    .where(eq(videos.id, videoId))
    .returning();

  if (result.length === 0) {
    logger.warn({ videoId }, "video not found");
    return c.json({ error: "Video not found" }, 404);
  }

  return c.json({ views: result[0].views });
});
