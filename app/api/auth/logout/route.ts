import { NextResponse } from "next/server";
import { clearSessionUser, SESSION_COOKIE_NAME, OAUTH_COOKIE_NAME, getCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await clearSessionUser();
  const isHttps = request.url.startsWith("https://") || request.headers.get("x-forwarded-proto") === "https";
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...getCookieOptions(isHttps), maxAge: 0 });
  response.cookies.set(OAUTH_COOKIE_NAME, "", { ...getCookieOptions(isHttps), maxAge: 0 });
  return response;
}

export async function GET(request: Request) {
  await clearSessionUser();
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") || "/";
  const isHttps = request.url.startsWith("https://") || request.headers.get("x-forwarded-proto") === "https";
  const response = NextResponse.redirect(new URL(returnTo, request.url));
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...getCookieOptions(isHttps), maxAge: 0 });
  response.cookies.set(OAUTH_COOKIE_NAME, "", { ...getCookieOptions(isHttps), maxAge: 0 });
  return response;
}
