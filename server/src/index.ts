import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { rateLimiter } from "hono-rate-limiter";
import { usersRoutes } from "./routes/users";
import { videosRoutes } from "./routes/videos";
import { commentsRoutes } from "./routes/comments";
import { videoLikesRoutes } from "./routes/videoLikes";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors());
app.use(
  "/api/*",
  rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    limit: 100, // 100 requests per window
    keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "", // Use IP address as key
  })
);

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
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

const port = parseInt(Bun.env.PORT || "3001", 10);


console.log(`Server running at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
