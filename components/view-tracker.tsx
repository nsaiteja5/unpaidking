"use client";
import { useEffect } from "react";

export function ViewTracker({
  type,
  slug,
  publicId,
}: {
  type: "throne_view" | "reign_view";
  slug?: string;
  publicId?: string;
}) {
  useEffect(() => {
    fetch("/api/events/view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, slug, publicId }),
    }).catch(() => {});
  }, [type, slug, publicId]);

  return null;
}
