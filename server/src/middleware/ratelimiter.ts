import { rateLimiter } from "hono-rate-limiter";

// rate limiter for comment creation to prevent spam 
export const commentWriteRateLimiter = rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    limit: 3, // 3 comments per minute
    keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "", // Use IP address as key
});

// Separate rate limiter for liking/unliking comments to prevent abuse of like system
export const commentLikeRateLimiter = rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    limit: 10, // 10 like/unlike actions per minute
    keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "", // Use IP address as key
});

// Separate rate limiter for liking videos to prevent abuse of like system
export const videoLikeRateLimiter = rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    limit: 15, // 15 like/unlike actions per minute
    keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "", // Use IP address as key
});

// Separate rate limiter for viewing videos to prevent abuse of view count
export const videoViewRateLimiter = rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    limit: 30, // 30 video views per minute
    keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "", // Use IP address as key
});

export const defaultRateLimiter = rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    limit: 50, // 100 requests per window
    keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "", // Use IP address as key
  })