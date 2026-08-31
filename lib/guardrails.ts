import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { thrones } from "@/db/schema";

const GENERIC_SUFFIXES = ["tools", "tool", "software", "apps", "app", "platform", "platforms", "service", "services"];

const DISALLOWED_WORDS = [
  "best", "top", "#1", "cheapest", "free", "cheap", "ultimate", "leader",
  "winner", "winning", "greatest", "finest", "easiest", "fastest",
  "casino", "gambling", "betting", "adult", "porn", "xxx", "crypto-drainer",
  "hack", "crack", "warez", "phishing",
];

const GEOGRAPHIES = [
  "us", "usa", "uk", "india", "europe", "germany", "france", "canada", "australia",
  "asia", "latam", "africa", "brazil", "japan", "china", "global", "local",
];

export function extractRegistrableDomain(urlString: string): string {
  if (!urlString || typeof urlString !== "string") return "";
  try {
    let raw = urlString.trim();
    if (!/^https?:\/\//i.test(raw)) {
      raw = `https://${raw}`;
    }
    const parsed = new URL(raw);
    let host = (parsed.hostname || "").toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    if (!host) return "";
    const parts = host.split(".");
    if (parts.length >= 2) {
      return parts.slice(-2).join(".");
    }
    return host;
  } catch {
    return "";
  }
}

export function normalizeCategoryString(input: string): string {
  if (!input || typeof input !== "string") return "";
  let s = input.toLowerCase().trim();
  // Remove punctuation
  s = s.replace(/[^\w\s-]/g, "").replace(/[-_]+/g, " ");
  const tokens = s.split(/\s+/).filter(Boolean);
  const normalizedTokens = tokens.map((token) => {
    if (!token) return "";
    // Strip simple plural
    if (token.endsWith("ies") && token.length > 4) {
      token = token.slice(0, -3) + "y";
    } else if (token.endsWith("es") && token.length > 3) {
      token = token.slice(0, -2);
    } else if (token.endsWith("s") && token.length > 2 && !token.endsWith("ss")) {
      token = token.slice(0, -1);
    }
    return token;
  }).filter((token) => token && !GENERIC_SUFFIXES.includes(token));

  return normalizedTokens.join(" ");
}

export function diceCoefficient(a: string, b: string): number {
  const s1 = normalizeCategoryString(a);
  const s2 = normalizeCategoryString(b);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;

  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.slice(i, i + 2));
    }
    return bigrams;
  };

  const bg1 = getBigrams(s1);
  const bg2 = getBigrams(s2);
  let intersection = 0;
  for (const bg of bg1) {
    if (bg2.has(bg)) intersection++;
  }

  return (2 * intersection) / (bg1.size + bg2.size);
}

export function checkDuplicateCategory(
  proposedName: string,
  existingThrones: { category: string; aliases?: string | null }[],
): { isDuplicate: boolean; matchedWith?: string; similarity: number } {
  const normProposed = normalizeCategoryString(proposedName);
  let highestSim = 0;
  let matchName = "";

  for (const throne of existingThrones) {
    const directSim = diceCoefficient(proposedName, throne.category);
    if (directSim > highestSim) {
      highestSim = directSim;
      matchName = throne.category;
    }

    if (throne.aliases) {
      const aliasList = throne.aliases.split(",").map((a) => a.trim());
      for (const alias of aliasList) {
        const aliasSim = diceCoefficient(proposedName, alias);
        if (aliasSim > highestSim) {
          highestSim = aliasSim;
          matchName = `${throne.category} (${alias})`;
        }
      }
    }
  }

  // Threshold is 0.72 as specified in prompt section 10
  if (highestSim >= 0.72) {
    return { isDuplicate: true, matchedWith: matchName, similarity: highestSim };
  }

  return { isDuplicate: false, similarity: highestSim };
}

export function validateDisallowedCategoryTerms(
  categoryName: string,
  buyerBrand: string,
): { valid: boolean; reason?: string } {
  const lower = categoryName.toLowerCase().trim();
  const words = lower.split(/[\s-_]+/);

  for (const word of words) {
    if (DISALLOWED_WORDS.includes(word)) {
      return { valid: false, reason: `Category cannot contain superlatives, unverified claims, or forbidden terms like "${word}".` };
    }
    if (GEOGRAPHIES.includes(word)) {
      return { valid: false, reason: `Category cannot be restricted by geography ("${word}").` };
    }
  }

  // Cannot be the buyer's brand name
  const brandClean = buyerBrand.toLowerCase().replace(/[^\w]/g, "");
  const catClean = lower.replace(/[^\w]/g, "");
  if (catClean === brandClean || (brandClean.length > 3 && catClean.includes(brandClean))) {
    return { valid: false, reason: "Category cannot be named after your own product or brand." };
  }

  // Word count check: 2-4 words, max 32 chars
  if (words.length < 2 || words.length > 4) {
    return { valid: false, reason: "Throne name must be between 2 and 4 words." };
  }
  if (categoryName.length > 32) {
    return { valid: false, reason: "Throne name must be 32 characters or fewer." };
  }

  return { valid: true };
}

export function validateFourDistinctDomains(
  urls: [string, string, string, string],
): { valid: boolean; domains: string[]; reason?: string } {
  const domains: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    const d = extractRegistrableDomain(urls[i]);
    if (!d) {
      return { valid: false, domains: [], reason: `URL #${i + 1} is invalid.` };
    }
    domains.push(d);
  }

  const unique = new Set(domains);
  if (unique.size < 4) {
    return {
      valid: false,
      domains,
      reason: `Must provide 4 distinct product domains (buyer, default rival, and 2 competitors). Found duplicates among: ${domains.join(", ")}.`,
    };
  }

  return { valid: true, domains };
}

export function validateOfferContent(
  headline: string,
  pitch: string,
): { valid: boolean; reason?: string } {
  const hTrim = headline.trim();
  const pTrim = pitch.trim();

  if (hTrim.length < 20 || hTrim.length > 90) {
    return { valid: false, reason: "Offer headline must be between 20 and 90 characters." };
  }
  if (pTrim.length < 40 || pTrim.length > 180) {
    return { valid: false, reason: "Why choose you pitch must be between 40 and 180 characters." };
  }

  const combined = `${hTrim.toLowerCase()} ${pTrim.toLowerCase()}`;
  for (const word of ["#1", "number 1", "number one", "guaranteed 100%", "guaranteed roi", "best tool", "best software"]) {
    if (combined.includes(word)) {
      return { valid: false, reason: `Offer cannot make unverified superiority claims such as "${word}".` };
    }
  }

  return { valid: true };
}

export async function checkRateLimits(
  buyerDomain: string,
  buyerXHandle?: string | null,
): Promise<{ allowed: boolean; reason?: string }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // 1. One new throne per product domain every 30 days
  if (buyerDomain) {
    const [recentDomain] = await db
      .select({ count: sql<number>`count(*)` })
      .from(thrones)
      .where(and(eq(thrones.createdByDomain, buyerDomain), gt(thrones.reignStartedAt, thirtyDaysAgo)));
    if (recentDomain && Number(recentDomain.count) >= 1) {
      return { allowed: false, reason: "Your product domain has already created a throne in the last 30 days." };
    }

    // 2. A product may hold at most 2 live thrones
    const [liveCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(thrones)
      .where(and(sql`king_url LIKE ${`%${buyerDomain}%`}`, eq(thrones.status, "live")));
    if (liveCount && Number(liveCount.count) >= 2) {
      return { allowed: false, reason: "A product may currently hold at most two live thrones." };
    }
  }

  // 3. One X handle may create at most one new throne per 30 days
  if (buyerXHandle) {
    const handleClean = buyerXHandle.replace(/^@/, "").toLowerCase();
    const [recentHandle] = await db
      .select({ count: sql<number>`count(*)` })
      .from(thrones)
      .where(and(eq(thrones.createdByXHandle, handleClean), gt(thrones.reignStartedAt, thirtyDaysAgo)));
    if (recentHandle && Number(recentHandle.count) >= 1) {
      return { allowed: false, reason: "Your X handle has already created a throne in the last 30 days." };
    }
  }

  return { allowed: true };
}
