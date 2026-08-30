import { db } from "./index";
import { seedThrones } from "./seed-data";
import { reigns, thrones } from "./schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { generatePublicId } from "@/lib/id";

async function seed() {
  for (const item of seedThrones) {
    const [existing] = await db.select().from(thrones).where(eq(thrones.slug, item.slug)).limit(1);
    if (existing) continue;
    const throneId = randomUUID();
    await db.insert(thrones).values({
      id: throneId,
      slug: item.slug,
      category: item.category,
      definition: item.definition,
      source: "seeded",
      status: "live",
      aliases: item.aliases ?? null,
      defaultKingName: item.kingName,
      defaultKingUrl: item.kingUrl,
      defaultKingXHandle: item.defaultKingXHandle ?? null,
      kingName: item.kingName,
      kingUrl: item.kingUrl,
      stakeCents: 0,
    });
    await db.insert(reigns).values({
      id: randomUUID(),
      publicId: generatePublicId(10),
      throneId,
      kingName: item.kingName,
      kingUrl: item.kingUrl,
      productXHandle: item.defaultKingXHandle ?? null,
      amountCents: 0,
      status: "current",
    });
  }
  console.log(`Seeded ${seedThrones.length} starter thrones.`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
