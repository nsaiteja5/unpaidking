import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getCallbackUrl,
  getCookieOptions,
  parseOAuthStateFromCookie,
  verifySignedOAuthState,
  createSignedSessionPayload,
  upsertXUser,
  OAUTH_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const isHttps =
    request.url.startsWith("https://") ||
    request.headers.get("x-forwarded-proto") === "https" ||
    (process.env.NODE_ENV === "production" && !request.url.includes("localhost"));

  // ─── Primary: verify state from URL (stateless, works even when cookie was dropped) ───
  let oauthData = stateParam ? verifySignedOAuthState(stateParam) : null;

  // ─── Fallback: check the cookie if URL state verification failed ───
  if (!oauthData) {
    const cookieStore = await cookies();
    const rawOAuthCookie = cookieStore.get(OAUTH_COOKIE_NAME)?.value;
    oauthData = parseOAuthStateFromCookie(rawOAuthCookie);
  }

  const returnTo = oauthData?.returnTo || "/";

  // Twitter user denied access or an error occurred
  if (error) {
    const isCancel = error === "access_denied";
    console.error("[auth] Twitter returned an error in callback:", error, errorDescription);
    const errCode = isCancel ? "cancelled" : encodeURIComponent(error);
    const dest = `${returnTo}${returnTo.includes("?") ? "&" : "?"}auth_error=${errCode}`;
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (!code || !stateParam) {
    console.error("[auth] Missing code or state in callback request:", { hasCode: Boolean(code), hasState: Boolean(stateParam) });
    return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}auth_error=missing_code_or_state`, request.url));
  }

  // If neither the signed state nor the cookie yielded valid OAuth data, state_mismatch
  if (!oauthData) {
    console.error("[auth] OAuth state verification failed — signed state invalid or expired and no valid cookie found.");
    return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}auth_error=state_mismatch`, request.url));
  }

  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const callbackUrl = oauthData.callbackUrl || getCallbackUrl(request);

  if (!clientId) {
    console.error("[auth] Missing X_CLIENT_ID in server environment");
    return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}auth_error=missing_client_id`, request.url));
  }

  try {
    // 1. Exchange authorization code for access token
    const tokenParams = new URLSearchParams();
    tokenParams.set("code", code);
    tokenParams.set("grant_type", "authorization_code");
    tokenParams.set("client_id", clientId);
    tokenParams.set("redirect_uri", callbackUrl);
    tokenParams.set("code_verifier", oauthData.verifier);

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    // If clientSecret is provided (Confidential client), send Basic Auth header
    if (clientSecret) {
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      headers["Authorization"] = `Basic ${basicAuth}`;
    }

    let tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers,
      body: tokenParams.toString(),
    });

    // If Basic auth failed and clientSecret was passed, retry without Authorization header
    if (!tokenRes.ok && clientSecret) {
      const firstErr = await tokenRes.text();
      console.warn("[auth] Basic auth token exchange failed, retrying with body credentials:", firstErr);

      const retryParams = new URLSearchParams(tokenParams);
      retryParams.set("client_secret", clientSecret);

      tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: retryParams.toString(),
      });
    }

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.text();
      console.error("[auth] Failed to exchange token with Twitter API:", tokenRes.status, tokenErr);
      return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}auth_error=token_exchange_failed`, request.url));
    }

    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    if (!accessToken) {
      console.error("[auth] No access_token returned by Twitter API:", tokenJson);
      return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}auth_error=no_access_token`, request.url));
    }

    // 2. Fetch authenticated user profile
    const userRes = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userRes.ok) {
      const userErr = await userRes.text();
      console.error("[auth] Failed to fetch user profile from Twitter API:", userRes.status, userErr);
      return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}auth_error=profile_fetch_failed`, request.url));
    }

    const userJson = await userRes.json();
    const xUser = userJson.data;

    if (!xUser || !xUser.id || !xUser.username) {
      console.error("[auth] Invalid user data returned by Twitter API:", userJson);
      return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}auth_error=invalid_user_data`, request.url));
    }

    // 3. Upsert user in Database
    const sessionUser = await upsertXUser({
      xUserId: xUser.id,
      xHandle: xUser.username,
      xName: xUser.name || xUser.username,
      xAvatarUrl: xUser.profile_image_url ? xUser.profile_image_url.replace("_normal.", ".") : null,
    });

    console.log(`[auth] Successfully logged in @${sessionUser.xHandle} (ID: ${sessionUser.id})`);

    // 4. Create signed session payload and redirect response
    const sessionPayload = createSignedSessionPayload(sessionUser);
    const cookieOpts = getCookieOptions(isHttps);

    const redirectUrl = new URL(returnTo, request.url);
    redirectUrl.searchParams.delete("auth_error");

    const response = NextResponse.redirect(redirectUrl);

    // Set 30-day session cookie
    response.cookies.set(SESSION_COOKIE_NAME, sessionPayload, {
      ...cookieOpts,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Clear the OAuth state cookie
    response.cookies.set(OAUTH_COOKIE_NAME, "", {
      ...cookieOpts,
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("[auth] Unexpected error in Twitter OAuth callback:", err);
    return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}auth_error=server_exception`, request.url));
  }
}
