import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { recordEvent } from "@/lib/events";
import { getThrone } from "@/lib/thrones";
import { buildDestinationUrl } from "@/lib/utm";

const VISITOR_COOKIE = "uk_vid";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const slug = (await params).slug;
  const throne = await getThrone(slug);
  if (!throne) {
    return new NextResponse("That throne does not exist.", { status: 404 });
  }

  const cookieStore = await cookies();
  let visitorId = cookieStore.get(VISITOR_COOKIE)?.value;
  let isNewVisitor = false;

  if (!visitorId) {
    visitorId = randomUUID();
    isNewVisitor = true;
  }

  const userAgent = request.headers.get("user-agent") ?? "";

  await recordEvent({
    type: "throne_click",
    throneId: throne.id,
    visitorId,
    userAgent,
  });

  const destination = buildDestinationUrl(throne.kingUrl, {
    utm_source: "unpaidking",
    utm_medium: "throne",
    utm_campaign: throne.slug,
  });

  const response = NextResponse.redirect(destination, 302);
  if (isNewVisitor) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
    });
  }

  return response;
}
