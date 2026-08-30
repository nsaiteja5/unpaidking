import { NextResponse } from "next/server";
import { setSessionUser, upsertXUser } from "@/lib/auth";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && process.env.STUB_X_AUTH !== "true") {
    return NextResponse.json({ error: "Dev login is only available in development or stub mode." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const handle = String(body.handle || "dev").replace(/^@/, "").trim() || "dev";
    const name = String(body.name || `${handle.charAt(0).toUpperCase() + handle.slice(1)} Founder`).trim();

    const devUser = await upsertXUser({
      xUserId: `dev_${handle.toLowerCase().replace(/[^a-z0-9_]/g, "")}`,
      xHandle: handle,
      xName: name,
      xAvatarUrl: null,
    });

    await setSessionUser(devUser);

    return NextResponse.json({ ok: true, user: devUser });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to log in as dev user." }, { status: 500 });
  }
}
