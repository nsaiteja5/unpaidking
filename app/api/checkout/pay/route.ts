import { NextResponse } from "next/server";
import { applySteal } from "@/lib/steals";

export async function POST(request: Request) {
  const body = await request.json();
  if (!body?.id) {
    return NextResponse.json(
      { error: "Payment did not go through. The king did not move." },
      { status: 400 },
    );
  }

  try {
    const result = await applySteal(body.id);
    if (result.outcome === "sitting") {
      return NextResponse.json({
        redirectUrl: `/checkout/return?ok=1&id=${body.id}`,
      });
    }
    return NextResponse.json({
      redirectUrl: `/checkout/return?ok=0&id=${body.id}`,
    });
  } catch (error) {
    console.error("Payment application error:", error);
    return NextResponse.json({
      redirectUrl: `/checkout/return?ok=0&id=${body.id}`,
    });
  }
}
