import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { recordEvent } from "@/lib/events";
import { getReignByPublicId } from "@/lib/reigns";
import { buildDestinationUrl } from "@/lib/utm";

const VISITOR_COOKIE = "uk_vid";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const publicId = (await params).publicId;
  const details = await getReignByPublicId(publicId);
  if (!details) {
    return new NextResponse("That reign does not exist.", { status: 404 });
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
    type: "reign_click",
    reignId: details.reign.id,
    throneId: details.throne.id,
    visitorId,
    userAgent,
  });

  const destination = buildDestinationUrl(details.reign.kingUrl, {
    utm_source: "unpaidking",
    utm_medium: "reign",
    utm_campaign: details.reign.publicId,
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
