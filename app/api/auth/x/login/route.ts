import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { base64url, generatePkce, setOAuthState, setSessionUser, upsertXUser } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") || "/";

  const clientId = process.env.X_CLIENT_ID;
  const callbackUrl = process.env.X_CALLBACK_URL || `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/x/callback`;
  const isStub = process.env.STUB_X_AUTH === "true" || !clientId;

  // If STUB_X_AUTH is active or client ID is not configured, support quick dev login
  if (isStub) {
    const handle = searchParams.get("handle") || "dev";
    const devUser = await upsertXUser({
      xUserId: `stub_${handle.toLowerCase().replace(/[^a-z0-9_]/g, "")}`,
      xHandle: handle,
      xName: `${handle.charAt(0).toUpperCase() + handle.slice(1)} Founder`,
      xAvatarUrl: null,
    });
    await setSessionUser(devUser);
    return NextResponse.redirect(new URL(returnTo, request.url));
  }

  // Real Twitter OAuth 2.0 PKCE flow
  const { codeVerifier, codeChallenge } = generatePkce();
  const state = base64url(randomBytes(16));

  await setOAuthState(state, codeVerifier, returnTo);

  const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("scope", "tweet.read users.read offline.access");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(authUrl.toString());
}
