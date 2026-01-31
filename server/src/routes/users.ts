import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";

// Generate a random username like @user-a7f3b2
function generateUsername(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `@user-${suffix}`;
}

// Hash IP for privacy (simple hash, not cryptographically secure but good enough)
async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + "jefftube-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Get or create user by IP
export async function getOrCreateUser(ip: string) {
  const ipHash = await hashIp(ip);

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.ipHash, ipHash))
    .limit(1);

  if (existingUser.length > 0) {
    return existingUser[0];
  }

  const newUser = await db
    .insert(users)
    .values({
      ipHash,
      username: generateUsername(),
    })
    .returning();

  return newUser[0];
}

// Get client IP from request
export function getClientIp(req: Request): string {
  // Check common proxy headers
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  // Fallback for local development
  return "127.0.0.1";
}

// GET /api/me - get current user
export async function handleGetMe(req: Request, corsHeaders: Record<string, string>) {
  const ip = getClientIp(req);
  const user = await getOrCreateUser(ip);
  return Response.json(
    { id: user.id, username: user.username },
    { headers: corsHeaders }
  );
}
