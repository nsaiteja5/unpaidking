import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { checkouts, thrones } from "@/db/schema";

export interface CreateCheckoutInput {
  throneSlug?: string;
  userId?: string;
  proposedThrone?: {
    name: string;
    definition: string;
    defaultRivalName: string;
    defaultRivalUrl: string;
    defaultRivalXHandle?: string;
    competitorUrls: [string, string];
  };
  name: string;
  url: string;
  productXHandle?: string;
  productLogoUrl?: string;
  offerHeadline: string;
  offerPitch: string;
  ctaLabel: string;
  offerExpiresAt?: Date;
  amountCents: number;
  expectedPreviousKing?: string;
  expectedPreviousStakeCents?: number;
  clientIp?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<{ checkoutId: string; redirectUrl: string }>;
}

class StubProvider implements PaymentProvider {
  async createCheckout(input: CreateCheckoutInput) {
    let throneId: string | null = null;
    let expectedPrevKing = input.expectedPreviousKing;
    let expectedPrevStake = input.expectedPreviousStakeCents;

    if (input.throneSlug) {
      const [throne] = await db
        .select()
        .from(thrones)
        .where(eq(thrones.slug, input.throneSlug))
        .limit(1);
      if (!throne) throw new Error("missing throne");
      throneId = throne.id;
      expectedPrevKing = throne.kingName;
      expectedPrevStake = throne.stakeCents;
    }

    const checkoutId = randomUUID();
    await db.insert(checkouts).values({
      id: checkoutId,
      throneId,
      userId: input.userId ?? null,
      proposedThrone: input.proposedThrone ?? null,
      name: input.name,
      url: input.url,
      productXHandle: input.productXHandle ?? null,
      productLogoUrl: input.productLogoUrl ?? null,
      offerHeadline: input.offerHeadline,
      offerPitch: input.offerPitch,
      ctaLabel: input.ctaLabel,
      offerExpiresAt: input.offerExpiresAt ?? null,
      expectedPreviousKing: expectedPrevKing ?? null,
      expectedPreviousStakeCents: expectedPrevStake ?? null,
      amountCents: input.amountCents,
      clientIp: input.clientIp ?? null,
    });

    return { checkoutId, redirectUrl: `/checkout?id=${checkoutId}` };
  }
}

// TODO: swap StubProvider for Dodo / live payment provider when ready
export const paymentProvider: PaymentProvider = new StubProvider();
