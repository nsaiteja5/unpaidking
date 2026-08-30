import assert from "node:assert";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { getThrones, getThroneView, searchThrones } from "@/lib/thrones";
import { getReignByPublicId } from "@/lib/reigns";
import { applySteal } from "@/lib/steals";
import { paymentProvider } from "@/lib/payments";
import { buildDestinationUrl } from "@/lib/utm";
import {
  checkDuplicateCategory,
  validateDisallowedCategoryTerms,
  validateFourDistinctDomains,
  validateOfferContent,
} from "@/lib/guardrails";
import { recordEvent } from "@/lib/events";

async function runTests() {
  console.log("==========================================");
  console.log("STARTING INTEGRATION & UNIT TESTS");
  console.log("==========================================");

  // 1. Guardrail tests
  console.log("\n[TEST 1] Testing Guardrails...");
  const dupCheck = checkDuplicateCategory("SaaS Boilerplate", [
    { category: "SaaS boilerplates", aliases: "starter kit" },
  ]);
  assert.strictEqual(dupCheck.isDuplicate, true, "Should detect duplicate SaaS Boilerplate");
  console.log(`✓ Duplicate category detection passed (similarity: ${dupCheck.similarity})`);

  const disallowedCheck = validateDisallowedCategoryTerms("Best AI Code Editor", "MyEditor");
  assert.strictEqual(disallowedCheck.valid, false, "Should reject 'best'");
  console.log("✓ Disallowed word check passed");

  const domainCheck = validateFourDistinctDomains([
    "https://myproduct.com",
    "https://rival.com",
    "https://competitor1.com",
    "https://myproduct.com/other",
  ]);
  assert.strictEqual(domainCheck.valid, false, "Should reject duplicate domains");
  console.log("✓ 4-domain uniqueness check passed");

  const validDomains = validateFourDistinctDomains([
    "https://myproduct.com",
    "https://rival.com",
    "https://competitor1.com",
    "https://competitor2.com",
  ]);
  assert.strictEqual(validDomains.valid, true, "Should accept 4 distinct domains");
  console.log("✓ 4 distinct domains validated successfully");

  const offerCheck = validateOfferContent(
    "Free migration from Stripe for the first 10 founders",
    "Move subscriptions, taxes, and global payments without rebuilding your billing stack.",
  );
  assert.strictEqual(offerCheck.valid, true, "Valid offer should pass");
  console.log("✓ Offer content validation passed");

  // 2. Starter Thrones Check
  console.log("\n[TEST 2] Verifying 8 Starter Thrones...");
  const starterThrones = await getThrones();
  assert.strictEqual(starterThrones.length >= 8, true, "Should have at least 8 starter thrones");
  const first = starterThrones[0];
  console.log(`✓ First starter throne: "${first.category}" occupied by ${first.kingName} ($${first.stakeCents / 100})`);

  // 3. Search Thrones
  console.log("\n[TEST 3] Testing Throne Search...");
  const searchResults = await searchThrones("boilerplate");
  assert.strictEqual(searchResults.length >= 1, true, "Should find boilerplates throne");
  console.log(`✓ Search for 'boilerplate' returned "${searchResults[0].category}"`);

  // 4. UTM Builder
  console.log("\n[TEST 4] Testing UTM Builder...");
  const throneUtm = buildDestinationUrl("https://shipfa.st?ref=tw", {
    utm_medium: "throne",
    utm_campaign: "saas-boilerplates",
  });
  assert.strictEqual(throneUtm.includes("utm_source=unpaidking"), true);
  assert.strictEqual(throneUtm.includes("utm_medium=throne"), true);
  assert.strictEqual(throneUtm.includes("ref=tw"), true);
  console.log(`✓ UTM preserved existing query params: ${throneUtm}`);

  // 5. Existing Throne Takeover Flow
  console.log("\n[TEST 5] Testing Takeover on 'saas-boilerplates'...");
  const throneBefore = await getThroneView("saas-boilerplates");
  assert(throneBefore, "Throne saas-boilerplates should exist");

  const checkout1 = await paymentProvider.createCheckout({
    throneSlug: "saas-boilerplates",
    name: "BoilerCode",
    url: "https://boilercode.dev",
    productXHandle: "boilercode",
    offerHeadline: "Save 40 hours with our pre-built Auth & Stripe modules",
    offerPitch: "Production-ready boilerplate with integrated Drizzle ORM, Next.js 15, and Tailwind.",
    ctaLabel: "Try BoilerCode",
    amountCents: throneBefore.stakeCents === 0 ? 900 : throneBefore.stakeCents + 100,
    successUrl: "http://localhost:3000/checkout/return?ok=1",
    cancelUrl: "http://localhost:3000/t/saas-boilerplates#steal",
  });
  console.log(`✓ Created takeover checkout: ${checkout1.checkoutId}`);

  const applyResult1 = await applySteal(checkout1.checkoutId);
  assert.strictEqual(applyResult1.outcome, "sitting");
  assert(applyResult1.publicId, "Should return publicId for permanent reign");
  console.log(`✓ Takeover applied! New king: ${applyResult1.name} ($${applyResult1.price / 100}), Permanent Public ID: ${applyResult1.publicId}`);

  // 6. Verify Permanent Reign Page Data
  console.log("\n[TEST 6] Testing Permanent Reign Retrieval (/r/[publicId])...");
  const reignDetails1 = await getReignByPublicId(applyResult1.publicId);
  assert(reignDetails1, "Reign details should exist");
  assert.strictEqual(reignDetails1.isCurrentlySitting, true, "Should be currently sitting");
  assert.strictEqual(reignDetails1.reign.kingName, "BoilerCode");
  assert.strictEqual(reignDetails1.reign.offerHeadline, "Save 40 hours with our pre-built Auth & Stripe modules");
  console.log(`✓ Permanent reign verified as CURRENT REIGN: "${reignDetails1.reign.offerHeadline}"`);

  // 7. Test Dethroning & Former Reign State
  console.log("\n[TEST 7] Testing Subsequent Dethroning & Former Reign Preservation...");
  const checkout2 = await paymentProvider.createCheckout({
    throneSlug: "saas-boilerplates",
    name: "Supafast",
    url: "https://supafast.io",
    productXHandle: "supafast",
    offerHeadline: "Launch fullstack AI apps with zero configuration in 5 minutes",
    offerPitch: "Automated database provisioning, vector search, and edge deployments out of the box.",
    ctaLabel: "Start free",
    amountCents: applyResult1.price + 100,
    successUrl: "http://localhost:3000/checkout/return?ok=1",
    cancelUrl: "http://localhost:3000/t/saas-boilerplates#steal",
  });
  const applyResult2 = await applySteal(checkout2.checkoutId);
  assert.strictEqual(applyResult2.outcome, "sitting");
  console.log(`✓ Second king seated: ${applyResult2.name} ($${applyResult2.price / 100})`);

  // Check the first buyer's permanent reign page
  const reignDetailsFormer = await getReignByPublicId(applyResult1.publicId);
  assert(reignDetailsFormer, "Original reign should still exist");
  assert.strictEqual(reignDetailsFormer.isCurrentlySitting, false, "Original reign should now be FORMER");
  assert.strictEqual(reignDetailsFormer.reign.kingName, "BoilerCode", "Original product preserved");
  assert.strictEqual(reignDetailsFormer.reign.offerHeadline, "Save 40 hours with our pre-built Auth & Stripe modules", "Original offer preserved");
  assert.strictEqual(reignDetailsFormer.dethronedBy?.name, "Supafast", "Historical successor tracked");
  console.log(`✓ Former reign verified: still promotes BoilerCode, correctly marked dethroned by Supafast`);

  // 8. Instant New Throne Creation
  console.log("\n[TEST 8] Testing Instant New Throne Creation (/start)...");
  const newThroneCheckout = await paymentProvider.createCheckout({
    proposedThrone: {
      name: "AI Code Editors",
      definition: "Code editors with native generative AI autocompletion and agent capabilities.",
      defaultRivalName: "Cursor",
      defaultRivalUrl: "https://cursor.com",
      defaultRivalXHandle: "cursor_ai",
      competitorUrls: ["https://windsurf.ai", "https://zed.dev"],
    },
    name: "Void Editor",
    url: "https://voideditor.com",
    productXHandle: "voideditor",
    offerHeadline: "Open-source AI editor with local LLM support and privacy",
    offerPitch: "Keep all your code on your local machine with full Cursor-level AI power.",
    ctaLabel: "Start free",
    amountCents: 900,
    successUrl: "http://localhost:3000/checkout/return?ok=1",
    cancelUrl: "http://localhost:3000/start",
  });

  const applyNewThrone = await applySteal(newThroneCheckout.checkoutId);
  assert.strictEqual(applyNewThrone.outcome, "sitting");
  assert.strictEqual(applyNewThrone.isNewThrone, true);
  console.log(`✓ New throne created atomically: "${applyNewThrone.category}" (slug: ${applyNewThrone.slug}), occupied by ${applyNewThrone.name} ($9)`);

  const createdThrone = await getThroneView(applyNewThrone.slug);
  assert(createdThrone, "Created throne must exist in DB");
  assert.strictEqual(createdThrone.source, "user_created");
  assert.strictEqual(createdThrone.defaultKingName, "Cursor");
  assert.strictEqual(createdThrone.kingName, "Void Editor");
  console.log(`✓ Verified user-created throne in DB with seed rival Cursor and active king Void Editor`);

  // 9. Deduplicated Visitor Tracking
  console.log("\n[TEST 9] Testing Deduplicated Visitor Event Tracking...");
  const visitor1 = "test-visitor-uuid-1";
  const ev1 = await recordEvent({
    type: "throne_view",
    throneId: createdThrone.id,
    visitorId: visitor1,
  });
  assert.strictEqual(ev1.recorded, true, "First visit in 24h must be recorded");

  const ev2 = await recordEvent({
    type: "throne_view",
    throneId: createdThrone.id,
    visitorId: visitor1,
  });
  assert.strictEqual(ev2.recorded, false, "Second visit from same visitor in 24h must be deduplicated");
  console.log("✓ 24-hour visitor deduplication verified successfully");

  console.log("\n==========================================");
  console.log("ALL INTEGRATION TESTS PASSED SUCCESSFULLY!");
  console.log("==========================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
