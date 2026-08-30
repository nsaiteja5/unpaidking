export function buildDestinationUrl(
  rawUrl: string,
  params: { utm_source?: string; utm_medium: "throne" | "reign"; utm_campaign: string },
): string {
  try {
    const url = new URL(rawUrl);
    // Append default utm params if not already set on buyer's url
    if (!url.searchParams.has("utm_source")) {
      url.searchParams.set("utm_source", params.utm_source ?? "unpaidking");
    }
    if (!url.searchParams.has("utm_medium")) {
      url.searchParams.set("utm_medium", params.utm_medium);
    }
    if (!url.searchParams.has("utm_campaign")) {
      url.searchParams.set("utm_campaign", params.utm_campaign);
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}
