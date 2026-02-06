import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { defaultRateLimiter } from "./middleware/ratelimiter";
import { logger } from "./logger";
import { usersRoutes } from "./routes/users";
import { videosRoutes } from "./routes/videos";
import { commentsRoutes } from "./routes/comments";
import { videoLikesRoutes } from "./routes/videoLikes";

const app = new Hono();

// Middleware
app.use("*", honoLogger());
app.use("*", cors());

// defined in middleware/ratelimiter.ts, 100 requests per minute per IP for all API routes
app.use("/api/*", defaultRateLimiter);


// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.route("/api", usersRoutes);
app.route("/api", videosRoutes);
app.route("/api", commentsRoutes);
app.route("/api", videoLikesRoutes);

app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

// Error handler
app.onError((err, c) => {
  logger.error({ err }, "unhandled error");
  return c.json({ error: "Internal server error" }, 500);
});

const port = parseInt(Bun.env.PORT || "3001", 10);

logger.info({ port }, `server running at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
