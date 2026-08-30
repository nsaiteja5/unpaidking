import { cookies } from "next/headers";
import { createHmac, randomBytes, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, ensureDatabaseReady, pool } from "@/db";
import { users } from "@/db/schema";
import { randomUUID } from "node:crypto";

export type SessionUser = {
  id: string;
  xUserId: string;
  xHandle: string;
  xName: string;
  xAvatarUrl: string | null;
};

export interface OAuthStateData {
  state: string;
  verifier: string;
  returnTo: string;
  callbackUrl: string;
}

export const SESSION_COOKIE_NAME = "unpaid_king_user_session";
export const OAUTH_COOKIE_NAME = "unpaid_king_oauth_state";

const SESSION_SECRET = process.env.SESSION_SECRET || "unpaid-king-court-session-secret-key-32chars";

export function signPayload(data: string): string {
  const sig = createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyPayload(signedData: string): string | null {
  const parts = signedData.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  if (sig !== expectedSig) return null;
  return data;
}

export function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generatePkce() {
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

export function getCallbackUrl(request?: Request): string {
  if (process.env.X_CALLBACK_URL) {
    return process.env.X_CALLBACK_URL;
  }

  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || (forwardedHost?.includes("localhost") ? "http" : "https");
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}/api/auth/x/callback`;
    }
  }

  const base = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/api/auth/x/callback`;
}

export function getCookieOptions(isHttps = false) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isHttps || process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function createSignedSessionPayload(user: SessionUser): string {
  const payload = JSON.stringify({
    id: user.id,
    xUserId: user.xUserId,
    xHandle: user.xHandle,
    xName: user.xName,
    xAvatarUrl: user.xAvatarUrl,
    iat: Date.now(),
  });
  return signPayload(payload);
}

export function createSignedOAuthPayload(data: OAuthStateData): string {
  return signPayload(JSON.stringify(data));
}

export async function setSessionUser(user: SessionUser) {
  const store = await cookies();
  const signed = createSignedSessionPayload(user);
  store.set(SESSION_COOKIE_NAME, signed, {
    ...getCookieOptions(process.env.NODE_ENV === "production"),
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearSessionUser() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  store.delete(OAUTH_COOKIE_NAME);
}

export function parseSessionUserFromCookie(cookieValue?: string | null): SessionUser | null {
  if (!cookieValue) return null;
  try {
    const raw = verifyPayload(cookieValue);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.id || !parsed.xHandle) return null;
    return {
      id: parsed.id,
      xUserId: parsed.xUserId,
      xHandle: parsed.xHandle,
      xName: parsed.xName || parsed.xHandle,
      xAvatarUrl: parsed.xAvatarUrl || null,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE_NAME)?.value;
  return parseSessionUserFromCookie(cookie);
}

export function parseOAuthStateFromCookie(cookieValue?: string | null): OAuthStateData | null {
  if (!cookieValue) return null;
  try {
    const raw = verifyPayload(cookieValue);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setOAuthState(data: OAuthStateData) {
  const store = await cookies();
  const signed = createSignedOAuthPayload(data);
  store.set(OAUTH_COOKIE_NAME, signed, {
    ...getCookieOptions(process.env.NODE_ENV === "production"),
    maxAge: 600, // 10 minutes
  });
}

export async function getAndClearOAuthState(): Promise<OAuthStateData | null> {
  const store = await cookies();
  const cookie = store.get(OAUTH_COOKIE_NAME)?.value;
  if (!cookie) return null;
  store.delete(OAUTH_COOKIE_NAME);
  return parseOAuthStateFromCookie(cookie);
}

export async function upsertXUser(xData: {
  xUserId: string;
  xHandle: string;
  xName: string;
  xAvatarUrl?: string | null;
}): Promise<SessionUser> {
  await ensureDatabaseReady(pool);
  const cleanHandle = xData.xHandle.replace(/^@/, "").trim();

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.xUserId, xData.xUserId))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({
        xHandle: cleanHandle,
        xName: xData.xName.trim(),
        xAvatarUrl: xData.xAvatarUrl || existing.xAvatarUrl,
      })
      .where(eq(users.id, existing.id));

    return {
      id: existing.id,
      xUserId: existing.xUserId,
      xHandle: cleanHandle,
      xName: xData.xName.trim(),
      xAvatarUrl: xData.xAvatarUrl || existing.xAvatarUrl,
    };
  }

  const userId = randomUUID();
  await db.insert(users).values({
    id: userId,
    xUserId: xData.xUserId,
    xHandle: cleanHandle,
    xName: xData.xName.trim(),
    xAvatarUrl: xData.xAvatarUrl || null,
  });

  return {
    id: userId,
    xUserId: xData.xUserId,
    xHandle: cleanHandle,
    xName: xData.xName.trim(),
    xAvatarUrl: xData.xAvatarUrl || null,
  };
}
