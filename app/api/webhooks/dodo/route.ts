import { NextResponse } from "next/server";
import { getDodoClient } from "@/lib/payments";
import { applySteal } from "@/lib/steals";
import { db } from "@/db";
import { checkouts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const webhookId = request.headers.get("webhook-id");
    const webhookSignature = request.headers.get("webhook-signature");
    const webhookTimestamp = request.headers.get("webhook-timestamp");

    if (!webhookId || !webhookSignature || !webhookTimestamp) {
      console.warn("Dodo webhook received without required headers");
      return NextResponse.json(
        { error: "Missing required webhook headers." },
        { status: 400 },
      );
    }

    const client = getDodoClient();
    let event: any;

    try {
      event = client.webhooks.unwrap(rawBody, {
        headers: {
          "webhook-id": webhookId,
          "webhook-signature": webhookSignature,
          "webhook-timestamp": webhookTimestamp,
        },
      });
    } catch (err: any) {
      console.error("Dodo webhook signature verification failed:", err?.message || err);
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 400 },
      );
    }

    console.log(`[Dodo Webhook] Event received: ${event.type}`, {
      eventId: event.id || webhookId,
      payloadType: event.data?.payload_type,
      paymentId: event.data?.payment_id,
    });

    if (event.type === "payment.succeeded") {
      const paymentData = event.data;
      const checkoutId = paymentData?.metadata?.checkoutId;

      if (!checkoutId) {
        console.warn("[Dodo Webhook] payment.succeeded missing metadata.checkoutId", paymentData);
        return NextResponse.json({ received: true, note: "missing checkoutId in metadata" });
      }

      console.log(`[Dodo Webhook] Applying steal for checkout: ${checkoutId}`);
      const stealResult = await applySteal(checkoutId);
      console.log(`[Dodo Webhook] Steal outcome for checkout ${checkoutId}:`, stealResult.outcome);

      return NextResponse.json({ received: true, outcome: stealResult.outcome });
    }

    if (event.type === "payment.failed") {
      const paymentData = event.data;
      const checkoutId = paymentData?.metadata?.checkoutId;

      if (checkoutId) {
        console.log(`[Dodo Webhook] Marking checkout ${checkoutId} as canceled due to payment failure`);
        await db
          .update(checkouts)
          .set({ status: "canceled" })
          .where(eq(checkouts.id, checkoutId));
      }

      return NextResponse.json({ received: true, status: "payment_failed" });
    }

    return NextResponse.json({ received: true, ignoredType: event.type });
  } catch (error: any) {
    console.error("[Dodo Webhook] Unexpected error handling webhook:", error);
    return NextResponse.json(
      { error: "Internal server error processing webhook." },
      { status: 500 },
    );
  }
}
