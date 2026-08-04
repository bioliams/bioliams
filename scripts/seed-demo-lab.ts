/**
 * Creates a self-contained demo lab with a shareable login and realistic data.
 * Safe to re-run: it does nothing if the demo user already exists.
 *
 * Usage: npm run db:seed:demo
 * Env:   DEMO_EMAIL, DEMO_PASSWORD (optional overrides)
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { user, member, organization, entityTypes, locations } from "../src/db/schema";
import { auth } from "../src/lib/auth";
import { seedOrganization } from "../src/lib/services/seed-org";
import { createEntity } from "../src/lib/services/entities";

const EMAIL = process.env.DEMO_EMAIL ?? "demo@biolims.dev";
const PASSWORD = process.env.DEMO_PASSWORD ?? "biolims-demo";
const ORG_NAME = "Demo Biotech Lab";
const ORG_SLUG = "demo-biotech-lab";

async function main() {
  const existing = await db.select().from(user).where(eq(user.email, EMAIL)).limit(1);
  if (existing.length > 0) {
    console.log(`Demo user ${EMAIL} already exists — nothing to do.`);
    process.exit(0);
  }

  // Sign up through better-auth so the password is hashed the same way the app expects.
  await auth.api.signUpEmail({
    body: { name: "Demo Scientist", email: EMAIL, password: PASSWORD },
  });
  const [demoUser] = await db.select().from(user).where(eq(user.email, EMAIL)).limit(1);

  const orgId = randomUUID();
  await db.insert(organization).values({ id: orgId, name: ORG_NAME, slug: ORG_SLUG });
  await db
    .insert(member)
    .values({ id: randomUUID(), organizationId: orgId, userId: demoUser.id, role: "owner" });

  await seedOrganization(orgId);
  console.log(`Created ${ORG_NAME} with starter record types and storage.`);

  const [box] = (
    await db.select().from(locations).where(eq(locations.organizationId, orgId))
  ).filter((l) => l.kind === "box");

  const samples = [
    { name: "PT-014 whole blood", sample_type: "Blood", organism: "Homo sapiens", volume: 500, collection_date: "2026-06-02" },
    { name: "PT-014 buffy coat", sample_type: "Blood", organism: "Homo sapiens", volume: 120, collection_date: "2026-06-02" },
    { name: "PT-021 whole blood", sample_type: "Blood", organism: "Homo sapiens", volume: 480, collection_date: "2026-06-11" },
    { name: "HEK293T p14", sample_type: "Cell Line", organism: "Homo sapiens", notes: "Mycoplasma tested clean" },
    { name: "Jurkat E6-1 p8", sample_type: "Cell Line", organism: "Homo sapiens" },
    { name: "Tumour biopsy T-07", sample_type: "Tissue", organism: "Homo sapiens", collection_date: "2026-05-28" },
    { name: "Mouse liver M-113", sample_type: "Tissue", organism: "Mus musculus", collection_date: "2026-07-15" },
    { name: "Total RNA HEK293T", sample_type: "RNA", organism: "Homo sapiens", concentration: 412.5, volume: 40 },
    { name: "Recombinant p53 prep", sample_type: "Protein", organism: "Homo sapiens", concentration: 2.1, volume: 250 },
  ];

  const created: Record<string, string> = {};
  for (const [i, s] of samples.entries()) {
    const { name, ...data } = s;
    const row = await createEntity(orgId, demoUser.id, {
      typeSlug: "sample",
      name,
      data,
      locationId: box?.id ?? null,
      positionRow: box ? Math.floor(i / 9) : null,
      positionCol: box ? i % 9 : null,
    });
    created[name] = row.id;
  }

  // Derived records, so the lineage panel has something to show.
  await createEntity(orgId, demoUser.id, {
    typeSlug: "sample",
    name: "PT-014 gDNA extraction",
    data: { sample_type: "DNA", organism: "Homo sapiens", concentration: 88.4, volume: 60 },
    parentId: created["PT-014 whole blood"],
    locationId: box?.id ?? null,
    positionRow: 1,
    positionCol: 1,
  });
  await createEntity(orgId, demoUser.id, {
    typeSlug: "sample",
    name: "PT-014 plasma aliquot 1",
    data: { sample_type: "Blood", organism: "Homo sapiens", volume: 200 },
    parentId: created["PT-014 whole blood"],
  });

  const reagents = [
    { name: "Q5 High-Fidelity Polymerase", vendor: "NEB", catalog_number: "M0491S", storage_temp: "-20C", qty: "8", unit: "vials", min: "3" },
    { name: "Taq DNA Polymerase", vendor: "NEB", catalog_number: "M0273", storage_temp: "-20C", qty: "2", unit: "vials", min: "5" },
    { name: "TRIzol Reagent", vendor: "Thermo", catalog_number: "15596026", storage_temp: "4C", qty: "1", unit: "bottles", min: "2" },
    { name: "DMEM + GlutaMAX", vendor: "Gibco", catalog_number: "10566016", storage_temp: "4C", qty: "12", unit: "bottles", min: "4" },
    { name: "Proteinase K", vendor: "Qiagen", catalog_number: "19131", storage_temp: "RT", qty: "6", unit: "vials", min: "2" },
  ];
  for (const r of reagents) {
    const { name, qty, unit, min, ...data } = r;
    await createEntity(orgId, demoUser.id, {
      typeSlug: "reagent",
      name,
      data,
      quantity: qty,
      unit,
      minThreshold: min,
    });
  }

  const primers = [
    { name: "GAPDH-F", sequence: "ACCACAGTCCATGCCATCAC", direction: "Forward", tm: 60.1, target_gene: "GAPDH" },
    { name: "GAPDH-R", sequence: "TCCACCACCCTGTTGCTGTA", direction: "Reverse", tm: 60.4, target_gene: "GAPDH" },
    { name: "TP53-ex7-F", sequence: "CTTGCCACAGGTCTCCCCAA", direction: "Forward", tm: 62.0, target_gene: "TP53" },
    { name: "TP53-ex7-R", sequence: "AGGGGTCAGAGGCAAGCAGA", direction: "Reverse", tm: 62.3, target_gene: "TP53" },
  ];
  for (const p of primers) {
    const { name, ...data } = p;
    await createEntity(orgId, demoUser.id, {
      typeSlug: "primer",
      name,
      data,
      quantity: "10",
      unit: "µM stock",
    });
  }

  const [types] = await db
    .select()
    .from(entityTypes)
    .where(eq(entityTypes.organizationId, orgId))
    .limit(1);

  console.log(`\nDemo lab ready (first record type: ${types?.name}).`);
  console.log(`  Sign in: ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
