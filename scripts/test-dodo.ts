import assert from "node:assert";
import { loadEnvConfig } from "@next/env";
import { randomUUID, createHmac } from "node:crypto";

loadEnvConfig(process.cwd());

import { getDodoClient, paymentProvider } from "@/lib/payments";
import { db } from "@/db";
import { checkouts, thrones } from "@/db/schema";
import { eq } from "drizzle-orm";
import { applySteal } from "@/lib/steals";

async function runDodoTests() {
  console.log("==========================================");
  console.log("STARTING DODO PAYMENTS INTEGRATION TESTS");
  console.log("==========================================");

  // 1. Test Provider Selection
  console.log("\n[TEST 1] Testing Payment Provider Selection...");
  assert.strictEqual(process.env.STUB_PAYMENTS, "true", "Default env should be STUB_PAYMENTS=true");

  const [throne] = await db.select().from(thrones).limit(1);
  assert(throne, "Should find at least one throne");

  const stubCheckout = await paymentProvider.createCheckout({
    throneSlug: throne.slug,
    name: "DodoTestProduct",
    url: "https://dodotest.com",
    offerHeadline: "Test offer headline for Dodo integration testing",
    offerPitch: "Test pitch for Dodo payments integration and verification.",
    ctaLabel: "Try DodoTest",
    amountCents: 900,
    successUrl: "http://localhost:3000/checkout/return?ok=1",
    cancelUrl: "http://localhost:3000/",
  });

  assert(stubCheckout.checkoutId, "Stub checkout should return checkoutId");
  assert(stubCheckout.redirectUrl.includes("/checkout?id="), "Stub redirectUrl should point to /checkout?id=");
  console.log(`✓ Stub checkout created successfully: ${stubCheckout.checkoutId}`);

  // 2. Test Dodo Client Configuration
  console.log("\n[TEST 2] Testing Dodo SDK Initialization...");
  // Temporarily set dummy API key if none present to test client instantiation
  const originalApiKey = process.env.DODO_PAYMENTS_API_KEY;
  process.env.DODO_PAYMENTS_API_KEY = originalApiKey || "test_dodo_api_key_12345";

  const client = getDodoClient();
  assert(client, "DodoPayments client should initialize");
  assert(typeof client.checkoutSessions.create === "function", "checkoutSessions.create should be available");
  assert(typeof client.payments.retrieve === "function", "payments.retrieve should be available");
  assert(typeof client.webhooks.unwrap === "function", "webhooks.unwrap should be available");
  console.log("✓ Dodo SDK methods verified: checkoutSessions, payments, webhooks");

  // 3. Test Webhook Processing Logic & applySteal Idempotency
  console.log("\n[TEST 3] Testing Webhook Simulation & Idempotency...");
  const webhookCheckoutId = randomUUID();
  await db.insert(checkouts).values({
    id: webhookCheckoutId,
    throneId: throne.id,
    name: "WebhookKing",
    url: "https://webhookking.com",
    offerHeadline: "Webhook simulated takeover headline text 12345",
    offerPitch: "Webhook simulated takeover pitch text describing the product nicely.",
    ctaLabel: "Try WebhookKing",
    amountCents: throne.stakeCents === 0 ? 900 : throne.stakeCents + 100,
    expectedPreviousKing: throne.kingName,
    expectedPreviousStakeCents: throne.stakeCents,
  });

  // Simulate payment.succeeded webhook call
  const outcome1 = await applySteal(webhookCheckoutId);
  assert.strictEqual(outcome1.outcome, "sitting", "First applySteal should succeed");
  console.log(`✓ Webhook applySteal outcome: ${outcome1.outcome} (king: ${outcome1.name}, price: $${outcome1.price / 100})`);

  // Verify idempotency (second webhook delivery of same event)
  const outcome2 = await applySteal(webhookCheckoutId);
  assert.strictEqual(outcome2.outcome, "sitting", "Second applySteal with same checkoutId must be idempotent");
  assert.strictEqual(outcome2.publicId, outcome1.publicId, "Second applySteal must return exact same reign publicId");
  console.log(`✓ Webhook idempotency verified: identical publicId ${outcome2.publicId}`);

  // Restore API key
  if (!originalApiKey) delete process.env.DODO_PAYMENTS_API_KEY;

  console.log("\n==========================================");
  console.log("ALL DODO INTEGRATION TESTS PASSED!");
  console.log("==========================================");
}

runDodoTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Dodo test error:", err);
    process.exit(1);
  });
