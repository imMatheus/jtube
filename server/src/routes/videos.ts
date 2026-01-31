import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { videos } from "../db/schema";

// GET /api/videos - return all videos sorted by most views
export async function handleGetVideos(corsHeaders: Record<string, string>) {
  const allVideos = await db.select().from(videos).orderBy(desc(videos.views));
  return Response.json(allVideos, { headers: corsHeaders });
}

// POST /api/videos/:id/view - increment view count
export async function handlePostView(
  videoId: string,
  corsHeaders: Record<string, string>
) {
  const result = await db
    .update(videos)
    .set({ views: sql`${videos.views} + 1` })
    .where(eq(videos.id, videoId))
    .returning();

  if (result.length === 0) {
    return Response.json(
      { error: "Video not found" },
      { status: 404, headers: corsHeaders }
    );
  }

  return Response.json({ views: result[0].views }, { headers: corsHeaders });
}
