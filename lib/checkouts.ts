import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { checkouts, reigns, thrones } from "@/db/schema";
import type { Throne, Reign } from "@/lib/thrones";

export type CheckoutContext = {
  checkout: typeof checkouts.$inferSelect;
  throne: Throne | { category: string; slug: string; kingName: string; kingUrl: string; stakeCents: number; definition: string };
  reign?: Reign;
};

export async function getCheckout(id: string) {
  const [checkout] = await db
    .select()
    .from(checkouts)
    .where(eq(checkouts.id, id))
    .limit(1);
  return checkout;
}

export async function getCheckoutContext(id: string): Promise<CheckoutContext | undefined> {
  const checkout = await getCheckout(id);
  if (!checkout) return undefined;

  if (checkout.throneId) {
    const [throne] = await db
      .select()
      .from(thrones)
      .where(eq(thrones.id, checkout.throneId))
      .limit(1);
    let [reign] = await db
      .select()
      .from(reigns)
      .where(eq(reigns.checkoutId, id))
      .limit(1);

    // Defend checkouts never create a new reign row — once the payment has
    // been applied, fall back to the throne's current (defended) reign so
    // the checkout/return pages can render the outcome.
    if (!reign && checkout.kind === "defend" && checkout.status === "paid") {
      const [currentReign] = await db
        .select()
        .from(reigns)
        .where(and(eq(reigns.throneId, checkout.throneId), eq(reigns.status, "current")))
        .limit(1);
      reign = currentReign;
    }

    return throne ? { checkout, throne, reign } : undefined;
  }

  // Proposed new throne checkout
  if (checkout.proposedThrone) {
    const [reign] = await db
      .select()
      .from(reigns)
      .where(eq(reigns.checkoutId, id))
      .limit(1);

    const syntheticThrone = {
      category: checkout.proposedThrone.name,
      slug: checkout.proposedThrone.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      kingName: checkout.proposedThrone.defaultRivalName,
      kingUrl: checkout.proposedThrone.defaultRivalUrl,
      stakeCents: 0,
      definition: checkout.proposedThrone.definition,
    };

    return { checkout, throne: syntheticThrone, reign };
  }

  return undefined;
}
