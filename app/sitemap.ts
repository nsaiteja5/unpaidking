import type { MetadataRoute } from "next";
import { seedThrones } from "@/db/seed-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return [
    "/",
    "/rules",
    "/how",
    "/start",
    ...seedThrones.map((st) => `/t/${st.slug}`),
  ].map((path) => ({ url: `${base}${path}` }));
}
