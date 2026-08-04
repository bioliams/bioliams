import "server-only";
import { db } from "@/db";
import { entityTypes, locations } from "@/db/schema";
import type { FieldDef } from "@/db/schema/lims";

interface TypeTemplate {
  name: string;
  slug: string;
  prefix: string;
  color: string;
  isInventory?: boolean;
  fields: FieldDef[];
}

export const DEFAULT_TYPES: TypeTemplate[] = [
  {
    name: "Sample",
    slug: "sample",
    prefix: "SMP",
    color: "#2563eb",
    fields: [
      { key: "sample_type", label: "Sample Type", type: "select", required: true, options: ["Blood", "Tissue", "Cell Line", "DNA", "RNA", "Protein", "Other"] },
      { key: "organism", label: "Organism", type: "text" },
      { key: "collection_date", label: "Collection Date", type: "date" },
      { key: "volume", label: "Volume", type: "number", unit: "µL" },
      { key: "concentration", label: "Concentration", type: "number", unit: "ng/µL" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    name: "Reagent",
    slug: "reagent",
    prefix: "RGT",
    color: "#16a34a",
    isInventory: true,
    fields: [
      { key: "vendor", label: "Vendor", type: "text" },
      { key: "catalog_number", label: "Catalog Number", type: "text" },
      { key: "storage_temp", label: "Storage Temp", type: "select", options: ["RT", "4C", "-20C", "-80C", "LN2"] },
      { key: "hazard", label: "Hazardous", type: "boolean" },
    ],
  },
  {
    name: "Primer",
    slug: "primer",
    prefix: "OLI",
    color: "#9333ea",
    isInventory: true,
    fields: [
      { key: "sequence", label: "Sequence (5'->3')", type: "text", required: true },
      { key: "direction", label: "Direction", type: "select", options: ["Forward", "Reverse"] },
      { key: "tm", label: "Tm", type: "number", unit: "°C" },
      { key: "target_gene", label: "Target Gene", type: "text" },
    ],
  },
];

/** Create starter entity types and a demo storage tree for a new organization. */
export async function seedOrganization(orgId: string) {
  await db.insert(entityTypes).values(
    DEFAULT_TYPES.map((t) => ({
      organizationId: orgId,
      name: t.name,
      slug: t.slug,
      prefix: t.prefix,
      color: t.color,
      isInventory: t.isInventory ?? false,
      fields: t.fields,
    }))
  );

  const [lab] = await db
    .insert(locations)
    .values({ organizationId: orgId, name: "Main Lab", kind: "room" })
    .returning();
  const [freezer] = await db
    .insert(locations)
    .values({ organizationId: orgId, parentId: lab.id, name: "Freezer A (-80C)", kind: "freezer" })
    .returning();
  const [rack] = await db
    .insert(locations)
    .values({ organizationId: orgId, parentId: freezer.id, name: "Rack 1", kind: "rack" })
    .returning();
  await db.insert(locations).values([
    { organizationId: orgId, parentId: rack.id, name: "Box 1", kind: "box" as const, gridRows: 9, gridCols: 9 },
    { organizationId: orgId, parentId: rack.id, name: "Box 2", kind: "box" as const, gridRows: 9, gridCols: 9 },
  ]);
}
