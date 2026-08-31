export function dollars(cents: number) {
  return `$${Math.round(cents / 100)}`;
}

export function nextStealPrice(stakeCents: number, isUnpaidDefault = false): number {
  if (isUnpaidDefault || stakeCents === 0) return 900;
  return stakeCents + 100;
}

export function relativeTime(date: Date) {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "0m";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

export function canonicalUrl(value: string): string {
  if (!value || typeof value !== "string") {
    throw new Error("Need a public http(s) URL.");
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Need a public http(s) URL.");
  }

  let urlStr = trimmed;
  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = `https://${urlStr}`;
  }

  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    throw new Error("Need a public http(s) URL.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Need a public http(s) URL.");
  }

  const hostname = (url.hostname || "").toLowerCase();
  if (!hostname || hostname.includes(" ")) {
    throw new Error("Need a public http(s) URL.");
  }

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "unpaidking.lol" ||
    hostname.endsWith(".unpaidking.lol")
  ) {
    throw new Error("That domain cannot be seated.");
  }

  url.hostname = hostname;
  url.hash = "";

  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || ["gclid", "fbclid"].includes(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }

  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}
