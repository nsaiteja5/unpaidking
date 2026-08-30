export function dollars(cents: number) { return `$${Math.round(cents / 100)}`; }
export function nextStealPrice(stakeCents: number, isUnpaidDefault = false): number {
  if (isUnpaidDefault || stakeCents === 0) return 900;
  return stakeCents + 100;
}
export function relativeTime(date: Date) { const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000)); if (seconds < 60) return "0m"; const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes}m`; const hours = Math.floor(minutes / 60); return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`; }
export function canonicalUrl(value: string) { const url = new URL(value); if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("invalid protocol"); if (url.hostname === "localhost" || url.hostname === "unpaidking.lol" || url.hostname.endsWith(".unpaidking.lol")) throw new Error("blocked host"); url.hostname = url.hostname.toLowerCase(); url.hash = ""; for (const key of [...url.searchParams.keys()]) if (key.toLowerCase().startsWith("utm_") || ["gclid", "fbclid"].includes(key.toLowerCase())) url.searchParams.delete(key); if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, ""); return url.toString(); }
