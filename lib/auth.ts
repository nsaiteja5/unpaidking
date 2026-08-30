import { cookies } from "next/headers";
import { createHmac, randomBytes, createHash, timingSafeEqual } from "node:crypto";
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

const PRIMARY_SESSION_SECRET = process.env.SESSION_SECRET || "unpaid-king-court-session-secret-key-32chars";

// List of fallback secrets so sessions and state verification never break if env changes
const SESSION_SECRETS: string[] = Array.from(
  new Set([
    PRIMARY_SESSION_SECRET,
    "change-me-to-a-random-secret",
    "unpaid-king-court-session-secret-key-32chars",
    "unpaidking_prod_session_secret_2024",
  ])
);

/**
 * Signs payload data using base64url encoding for data + HMAC-SHA256 signature.
 * Base64url encoding prevents dots in JSON (like avatar URLs or handles) from breaking signature splitting.
 */
export function signPayload(data: string): string {
  const encoded = Buffer.from(data, "utf8").toString("base64url");
  const sig = createHmac("sha256", PRIMARY_SESSION_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

/**
 * Verifies signed payload data against HMAC-SHA256 signatures with constant-time equality check.
 * Supports fallback secrets for seamless zero-downtime key rotation.
 */
export function verifyPayload(signedData: string): string | null {
  if (!signedData || typeof signedData !== "string") return null;

  const lastDot = signedData.lastIndexOf(".");
  if (lastDot === -1) return null;

  const encoded = signedData.slice(0, lastDot);
  const sig = signedData.slice(lastDot + 1);
  if (!encoded || !sig) return null;

  const sigBuf = Buffer.from(sig);

  for (const secret of SESSION_SECRETS) {
    try {
      const expectedSig = createHmac("sha256", secret).update(encoded).digest("base64url");
      const expBuf = Buffer.from(expectedSig);
      if (sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf)) {
        return Buffer.from(encoded, "base64url").toString("utf8");
      }
    } catch {}
  }

  // Backwards compatibility check for raw JSON without base64url encoding (if no dots were present)
  for (const secret of SESSION_SECRETS) {
    try {
      const expectedSig = createHmac("sha256", secret).update(encoded).digest("base64url");
      const expBuf = Buffer.from(expectedSig);
      if (sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf)) {
        return encoded;
      }
    } catch {}
  }

  return null;
}

export function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generatePkce() {
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

export function getBaseUrl(request?: Request): string {
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || (forwardedHost?.includes("localhost") ? "http" : "https");
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
    }
  }

  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  return "https://unpaidking.lol";
}

export function getCallbackUrl(request?: Request): string {
  if (process.env.X_CALLBACK_URL) {
    return process.env.X_CALLBACK_URL;
  }

  const base = getBaseUrl(request);
  return `${base}/api/auth/x/callback`;
}

export function getCookieOptions(isHttps = false) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isHttps,
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

/**
 * Creates a self-contained, HMAC-signed OAuth state string.
 * The entire OAuth payload is embedded in the `state` param sent to Twitter,
 * so the callback works even when the browser drops the session cookie
 * (e.g. Safari ITP, Brave, cross-site redirects with partitioned cookies).
 */
export function createSignedOAuthState(data: OAuthStateData): string {
  const payload = JSON.stringify({ ...data, iat: Date.now() });
  return signPayload(payload);
}

/**
 * Verifies a self-contained signed OAuth state string and returns the payload.
 * Returns null if the signature is invalid or the state is older than 15 minutes.
 */
export function verifySignedOAuthState(signedState: string): OAuthStateData | null {
  try {
    const raw = verifyPayload(signedState);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Enforce 15-minute expiry
    if (!parsed.iat || Date.now() - parsed.iat > 15 * 60 * 1000) return null;

    return {
      state: parsed.state,
      verifier: parsed.verifier,
      returnTo: parsed.returnTo || "/",
      callbackUrl: parsed.callbackUrl,
    };
  } catch {
    return null;
  }
}

export async function setSessionUser(user: SessionUser, isHttps = false) {
  const store = await cookies();
  const signed = createSignedSessionPayload(user);
  store.set(SESSION_COOKIE_NAME, signed, {
    ...getCookieOptions(isHttps),
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
  try {
    const store = await cookies();
    const cookie = store.get(SESSION_COOKIE_NAME)?.value;
    return parseSessionUserFromCookie(cookie);
  } catch {
    return null;
  }
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

export async function setOAuthState(data: OAuthStateData, isHttps = false) {
  const store = await cookies();
  const signed = createSignedOAuthPayload(data);
  store.set(OAUTH_COOKIE_NAME, signed, {
    ...getCookieOptions(isHttps),
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
