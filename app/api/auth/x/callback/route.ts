import { NextResponse } from "next/server";
import { getAndClearOAuthState, setSessionUser, upsertXUser } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const oauthData = await getAndClearOAuthState();
  const returnTo = oauthData?.returnTo || "/";

  if (error || !code || !state || !oauthData || oauthData.state !== state) {
    console.error("OAuth callback error or state mismatch:", { error, hasCode: Boolean(code), hasState: Boolean(state) });
    return NextResponse.redirect(new URL(`${returnTo}?auth_error=cancelled`, request.url));
  }

  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const callbackUrl = process.env.X_CALLBACK_URL || `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/x/callback`;

  if (!clientId) {
    return NextResponse.redirect(new URL(`${returnTo}?auth_error=missing_config`, request.url));
  }

  try {
    // 1. Exchange code for access token
    const tokenParams = new URLSearchParams();
    tokenParams.set("code", code);
    tokenParams.set("grant_type", "authorization_code");
    tokenParams.set("client_id", clientId);
    tokenParams.set("redirect_uri", callbackUrl);
    tokenParams.set("code_verifier", oauthData.verifier);

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    if (clientSecret) {
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      headers["Authorization"] = `Basic ${basicAuth}`;
    }

    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers,
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.text();
      console.error("Failed to exchange token with Twitter API:", tokenErr);
      return NextResponse.redirect(new URL(`${returnTo}?auth_error=token_failed`, request.url));
    }

    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    // 2. Fetch authenticated user profile
    const userRes = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userRes.ok) {
      console.error("Failed to fetch user profile from Twitter API");
      return NextResponse.redirect(new URL(`${returnTo}?auth_error=profile_failed`, request.url));
    }

    const userJson = await userRes.json();
    const xUser = userJson.data;

    const sessionUser = await upsertXUser({
      xUserId: xUser.id,
      xHandle: xUser.username,
      xName: xUser.name,
      xAvatarUrl: xUser.profile_image_url || null,
    });

    await setSessionUser(sessionUser);

    return NextResponse.redirect(new URL(returnTo, request.url));
  } catch (err) {
    console.error("Unexpected error in Twitter OAuth callback:", err);
    return NextResponse.redirect(new URL(`${returnTo}?auth_error=server_error`, request.url));
  }
}
