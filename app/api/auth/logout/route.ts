import { NextResponse } from "next/server";
import { clearSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  await clearSessionUser();
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  await clearSessionUser();
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") || "/";
  return NextResponse.redirect(new URL(returnTo, request.url));
}
