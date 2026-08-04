/**
 * Seeds a demo lab: starter record types, a freezer tree, and sample records.
 * Usage: npm run db:seed -- <organization-slug>
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { organization, entityTypes, locations } from "../src/db/schema";
import { seedOrganization } from "../src/lib/services/seed-org";
import { createEntity } from "../src/lib/services/entities";
import { createApiKey } from "../src/lib/services/api-keys";

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npm run db:seed -- <organization-slug>");
    process.exit(1);
  }

  const [org] = await db.select().from(organization).where(eq(organization.slug, slug)).limit(1);
  if (!org) {
    console.error(`No organization with slug "${slug}". Sign up in the app first.`);
    process.exit(1);
  }

  const existing = await db
    .select()
    .from(entityTypes)
    .where(eq(entityTypes.organizationId, org.id));
  if (existing.length === 0) {
    await seedOrganization(org.id);
    console.log("Created starter record types and storage tree.");
  }

  const boxes = (await db.select().from(locations).where(eq(locations.organizationId, org.id)))
    .filter((l) => l.kind === "box");
  const box = boxes[0];

  const demo = [
    { name: "Patient 001 whole blood", data: { sample_type: "Blood", organism: "Homo sapiens", volume: 500 } },
    { name: "Patient 001 gDNA", data: { sample_type: "DNA", organism: "Homo sapiens", concentration: 82.4 } },
    { name: "HEK293 passage 12", data: { sample_type: "Cell Line", organism: "Homo sapiens" } },
  ];

  for (const [i, item] of demo.entries()) {
    const row = await createEntity(org.id, null, {
      typeSlug: "sample",
      name: item.name,
      data: item.data,
      locationId: box?.id ?? null,
      positionRow: box ? 0 : null,
      positionCol: box ? i : null,
    });
    console.log(`  ${row.displayId}  ${row.name}`);
  }

  await createEntity(org.id, null, {
    typeSlug: "reagent",
    name: "Taq polymerase",
    data: { vendor: "NEB", catalog_number: "M0273", storage_temp: "-20C" },
    quantity: "2",
    unit: "vials",
    minThreshold: "5",
  });

  const { plaintext } = await createApiKey(org.id, null, "Demo key");
  console.log(`\nDemo API key (save it now): ${plaintext}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
