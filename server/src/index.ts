import { handleGetMe } from "./routes/users";
import { handleGetVideos, handlePostView } from "./routes/videos";
import {
  handleGetComments,
  handlePostComment,
  handleLikeComment,
  handleDislikeComment,
} from "./routes/comments";

const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // GET /api/me - get current user
    if (url.pathname === "/api/me" && req.method === "GET") {
      return handleGetMe(req, corsHeaders);
    }

    // GET /api/videos - return all videos sorted by most views
    if (url.pathname === "/api/videos" && req.method === "GET") {
      return handleGetVideos(corsHeaders);
    }

    // POST /api/videos/:id/view - increment view count
    const viewMatch = url.pathname.match(/^\/api\/videos\/([^/]+)\/view$/);
    if (viewMatch && req.method === "POST") {
      return handlePostView(viewMatch[1], corsHeaders);
    }

    // GET /api/videos/:videoId/comments - get comments for a video
    const commentsGetMatch = url.pathname.match(/^\/api\/videos\/([^/]+)\/comments$/);
    if (commentsGetMatch && req.method === "GET") {
      return handleGetComments(req, commentsGetMatch[1], corsHeaders);
    }

    // POST /api/videos/:videoId/comments - create a comment
    const commentsPostMatch = url.pathname.match(/^\/api\/videos\/([^/]+)\/comments$/);
    if (commentsPostMatch && req.method === "POST") {
      return handlePostComment(req, commentsPostMatch[1], corsHeaders);
    }

    // POST /api/comments/:commentId/like - like a comment
    const likeMatch = url.pathname.match(/^\/api\/comments\/([^/]+)\/like$/);
    if (likeMatch && req.method === "POST") {
      return handleLikeComment(req, likeMatch[1], corsHeaders);
    }

    // POST /api/comments/:commentId/dislike - dislike a comment
    const dislikeMatch = url.pathname.match(/^\/api\/comments\/([^/]+)\/dislike$/);
    if (dislikeMatch && req.method === "POST") {
      return handleDislikeComment(req, dislikeMatch[1], corsHeaders);
    }

    // 404 for other routes
    return Response.json(
      { error: "Not found" },
      { status: 404, headers: corsHeaders }
    );
  },
});

console.log(`Server running at http://localhost:${server.port}`);
