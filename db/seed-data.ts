import rawThrones from "../thrones.json";

export interface SeedThrone {
  slug: string;
  category: string;
  kingName: string;
  kingUrl: string;
  definition: string;
  defaultKingXHandle?: string;
  aliases?: string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extractDomainKeyword(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    return u.hostname.replace(/^www\./, "").split(".")[0] || "";
  } catch {
    return "";
  }
}

export const seedThrones: SeedThrone[] = rawThrones.map((item: {
  throne_name: string;
  what_belongs_here: string;
  default_rival_name: string;
  default_rival_url: string;
  default_rival_x_handle?: string;
  competitor_1_url?: string;
  competitor_2_url?: string;
}) => {
  const slug = slugify(item.throne_name);
  const handle = item.default_rival_x_handle
    ? item.default_rival_x_handle.replace(/^@/, "").trim()
    : undefined;

  const aliasesList: string[] = [];
  if (item.competitor_1_url) {
    const kw = extractDomainKeyword(item.competitor_1_url);
    if (kw) aliasesList.push(kw);
  }
  if (item.competitor_2_url) {
    const kw = extractDomainKeyword(item.competitor_2_url);
    if (kw) aliasesList.push(kw);
  }

  return {
    slug,
    category: item.throne_name,
    kingName: item.default_rival_name,
    kingUrl: item.default_rival_url,
    definition: item.what_belongs_here,
    defaultKingXHandle: handle || undefined,
    aliases: aliasesList.length > 0 ? aliasesList.join(", ") : undefined,
  };
});
