import { createMiddleware } from "hono/factory";

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export const recaptcha = createMiddleware(async (c, next) => {
  const secretKey = Bun.env.RECAPTCHA_SECRET_KEY;

  // Skip verification if secret key is not configured (local dev)
  if (!secretKey) {
    return next();
  }

  const token = c.req.header("X-Recaptcha-Token");
  if (!token) {
    return c.json({ error: "Invalid request" }, 403);
  }

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    });

    const data = (await response.json()) as { success: boolean; score?: number };

    if (!data.success || (data.score !== undefined && data.score < 0.5)) {
      return c.json({ error: "reCAPTCHA verification failed" }, 403);
    }
  } catch (err) {
    console.error("reCAPTCHA verification error:", err);
    return c.json({ error: "reCAPTCHA verification error" }, 500);
  }

  return next();
});
