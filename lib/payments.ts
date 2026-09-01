import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import DodoPayments from "dodopayments";
import { db, ensureDatabaseReady, pool } from "@/db";
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
  kind?: "steal" | "defend";
  expectedPreviousKing?: string;
  expectedPreviousStakeCents?: number;
  clientIp?: string;
  customerEmail?: string;
  customerName?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<{ checkoutId: string; redirectUrl: string }>;
}

let _dodoClient: DodoPayments | null = null;

export function getDodoClient(): DodoPayments {
  if (!_dodoClient) {
    const apiKey = (process.env.DODO_PAYMENTS_API_KEY || "").trim();
    if (!apiKey) {
      throw new Error("DODO_PAYMENTS_API_KEY is not configured in environment variables.");
    }
    const rawEnv = (process.env.DODO_PAYMENTS_ENVIRONMENT || "").trim().toLowerCase();
    const isLive = rawEnv === "live" || rawEnv === "live_mode" || rawEnv === "production";
    const baseURL = isLive ? "https://live.dodopayments.com" : "https://test.dodopayments.com";
    const webhookKey = (process.env.DODO_PAYMENTS_WEBHOOK_KEY || "").trim() || undefined;

    _dodoClient = new DodoPayments({
      bearerToken: apiKey,
      webhookKey,
      baseURL,
    });
  }
  return _dodoClient;
}

class StubProvider implements PaymentProvider {
  async createCheckout(input: CreateCheckoutInput) {
    await ensureDatabaseReady(pool);
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
      kind: input.kind ?? "steal",
      clientIp: input.clientIp ?? null,
    });

    return { checkoutId, redirectUrl: `/checkout?id=${checkoutId}` };
  }
}

let _cachedDefaultProductId: string | null = null;

async function getOrCreateDodoProductId(client: DodoPayments): Promise<string> {
  if (process.env.DODO_PAYMENTS_PRODUCT_ID) {
    return process.env.DODO_PAYMENTS_PRODUCT_ID;
  }
  if (_cachedDefaultProductId) {
    return _cachedDefaultProductId;
  }

  const defaultKnownId = "pdt_0NmZ2axWydvYV8A0Eltxz";
  try {
    const existing = await client.products.retrieve(defaultKnownId);
    if (existing?.product_id) {
      _cachedDefaultProductId = existing.product_id;
      return existing.product_id;
    }
  } catch {
    // If not found in account/mode, create dynamically
  }

  // Create a default Pay What You Want product on Dodo Payments
  try {
    const product = await client.products.create({
      name: "Throne Takeover",
      description: "Takeover of a category throne on unpaidking.lol",
      tax_category: "digital_products",
      price: {
        type: "one_time_price",
        currency: "USD",
        price: 100, // $1.00 minimum
        discount: 0,
        pay_what_you_want: true,
      },
    });
    _cachedDefaultProductId = product.product_id;
    return product.product_id;
  } catch (error) {
    console.error("Failed to auto-create Dodo product:", error);
    return defaultKnownId;
  }
}

class DodoPaymentProvider implements PaymentProvider {
  async createCheckout(input: CreateCheckoutInput) {
    await ensureDatabaseReady(pool);
    const client = getDodoClient();
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
      kind: input.kind ?? "steal",
      clientIp: input.clientIp ?? null,
    });

    const productId = await getOrCreateDodoProductId(client);

    // Build return URL with checkoutId attached
    let returnUrlStr: string;
    try {
      const u = new URL(input.successUrl);
      u.searchParams.set("id", checkoutId);
      returnUrlStr = u.toString();
    } catch {
      const base = process.env.NEXT_PUBLIC_BASE_URL || "https://unpaidking.lol";
      const u = new URL(input.successUrl, base);
      u.searchParams.set("id", checkoutId);
      returnUrlStr = u.toString();
    }

    const session = await client.checkoutSessions.create({
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
          amount: input.amountCents,
        },
      ],
      return_url: returnUrlStr,
      cancel_url: input.cancelUrl,
      metadata: {
        checkoutId,
        throneSlug: input.throneSlug || "",
        userId: input.userId || "",
        productName: input.name,
      },
      customer: input.customerEmail
        ? {
            email: input.customerEmail,
            name: input.customerName || input.name,
          }
        : undefined,
      feature_flags: {
        allow_phone_number_collection: false,
        ...(input.customerEmail
          ? {
              allow_customer_editing_email: false,
              allow_customer_editing_name: false,
            }
          : {}),
      },
    });

    if (!session.checkout_url) {
      throw new Error("Dodo Payments checkout session did not return a checkout URL.");
    }

    return { checkoutId, redirectUrl: session.checkout_url };
  }
}

class DynamicPaymentProvider implements PaymentProvider {
  private stub = new StubProvider();
  private dodo = new DodoPaymentProvider();

  async createCheckout(input: CreateCheckoutInput) {
    if (process.env.STUB_PAYMENTS === "true") {
      return this.stub.createCheckout(input);
    }
    return this.dodo.createCheckout(input);
  }
}

export const paymentProvider: PaymentProvider = new DynamicPaymentProvider();
