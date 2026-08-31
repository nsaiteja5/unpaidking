import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { recordEvent } from "@/lib/events";
import { getThrone } from "@/lib/thrones";
import { getReignByPublicId } from "@/lib/reigns";

const VISITOR_COOKIE = "uk_vid";

export async function POST(request: Request) {
  try {
    const userAgent = request.headers.get("user-agent") ?? "";
    const cookieStore = await cookies();
    const suppliedVisitorId = request.headers.get("x-uk-visitor-id")?.trim();
    const cookieVisitorId = cookieStore.get(VISITOR_COOKIE)?.value;
    const validVisitorId = (value?: string) => Boolean(value && /^[A-Za-z0-9_-]{8,128}$/.test(value));
    let visitorId = validVisitorId(suppliedVisitorId)
      ? suppliedVisitorId
      : validVisitorId(cookieVisitorId)
        ? cookieVisitorId
        : undefined;
    let isNewVisitor = false;

    if (!visitorId) {
      visitorId = randomUUID();
      isNewVisitor = true;
    }

    const body = await request.json();
    const { type, slug, publicId } = body;

    if (type !== "throne_view" && type !== "reign_view") {
      return NextResponse.json({ ok: false, error: "Unsupported event." }, { status: 400 });
    }

    let throneId: string | undefined = undefined;
    let reignId: string | undefined = undefined;

    if (type === "throne_view" && slug) {
      const throne = await getThrone(slug);
      if (throne) {
        throneId = throne.id;
      }
    } else if (type === "reign_view" && publicId) {
      const details = await getReignByPublicId(publicId);
      if (details) {
        reignId = details.reign.id;
        throneId = details.throne.id;
      }
    }

    if (throneId || reignId) {
      await recordEvent({
        type: type === "reign_view" ? "reign_view" : "throne_view",
        throneId,
        reignId,
        visitorId,
        userAgent,
      });
    }

    const response = NextResponse.json({ ok: true });
    if (isNewVisitor) {
      response.cookies.set(VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60, // 1 year
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("View tracking error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
