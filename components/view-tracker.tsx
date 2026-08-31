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
    let visitorId: string | undefined;
    try {
      visitorId = window.localStorage.getItem("uk_vid") ?? undefined;
      if (!visitorId && window.crypto?.randomUUID) {
        visitorId = window.crypto.randomUUID();
        window.localStorage.setItem("uk_vid", visitorId);
      }
    } catch {
      // The server-side cookie remains the fallback when storage is unavailable.
    }

    const send = async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetch("/api/events/view", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(visitorId ? { "x-uk-visitor-id": visitorId } : {}),
            },
            body: JSON.stringify({ type, slug, publicId }),
            cache: "no-store",
            keepalive: true,
          });
          if (response.ok) return;
        } catch {
          // Retry transient failures; tracking must never block the page.
        }
        await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
      }
    };

    void send();
  }, [type, slug, publicId]);

  return null;
}
