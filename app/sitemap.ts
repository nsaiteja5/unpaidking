import type { MetadataRoute } from "next";
import { seedThrones } from "@/db/seed-data";
import { getBaseUrl } from "@/lib/auth";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getBaseUrl();
  return [
    "/",
    "/rules",
    "/how",
    "/start",
    ...seedThrones.map((st) => `/t/${st.slug}`),
  ].map((path) => ({ url: `${base}${path}` }));
}
