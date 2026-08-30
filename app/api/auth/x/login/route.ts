import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import {
  base64url,
  generatePkce,
  getCallbackUrl,
  getCookieOptions,
  createSignedOAuthPayload,
  createSignedSessionPayload,
  upsertXUser,
  OAUTH_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") || "/";

  const clientId = process.env.X_CLIENT_ID;
  const callbackUrl = getCallbackUrl(request);
  const isStub = process.env.STUB_X_AUTH === "true" || !clientId;

  const isHttps = request.url.startsWith("https://") || request.headers.get("x-forwarded-proto") === "https";

  // If STUB_X_AUTH is active or client ID is not configured, support quick dev login
  if (isStub) {
    const handle = searchParams.get("handle") || "dev";
    const devUser = await upsertXUser({
      xUserId: `stub_${handle.toLowerCase().replace(/[^a-z0-9_]/g, "")}`,
      xHandle: handle,
      xName: `${handle.charAt(0).toUpperCase() + handle.slice(1)} Founder`,
      xAvatarUrl: null,
    });
    
    const response = NextResponse.redirect(new URL(returnTo, request.url));
    const sessionPayload = createSignedSessionPayload(devUser);
    response.cookies.set(SESSION_COOKIE_NAME, sessionPayload, {
      ...getCookieOptions(isHttps),
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }

  // Real Twitter OAuth 2.0 PKCE flow
  const { codeVerifier, codeChallenge } = generatePkce();
  const state = base64url(randomBytes(16));

  const oauthData = {
    state,
    verifier: codeVerifier,
    returnTo,
    callbackUrl,
  };

  const signedPayload = createSignedOAuthPayload(oauthData);

  const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("scope", "tweet.read users.read offline.access");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set(OAUTH_COOKIE_NAME, signedPayload, {
    ...getCookieOptions(isHttps),
    maxAge: 900, // 15 minutes
  });

  return response;
}
