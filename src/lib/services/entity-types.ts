import "server-only";
import { and, eq, count, isNull } from "drizzle-orm";
import { db } from "@/db";
import { entityTypes, entities } from "@/db/schema";
import type { FieldDef, FieldType } from "@/db/schema/lims";
import { logAudit } from "@/lib/audit";
import { keyFromLabel } from "@/lib/entity-schema";
import { ServiceError } from "./entities";

export const FIELD_TYPES: FieldType[] = [
  "text",
  "number",
  "date",
  "select",
  "multiselect",
  "boolean",
  "entity-link",
  "user",
  "file",
];

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

/** Normalize incoming field defs: fill keys, dedupe, drop empties. */
export function normalizeFields(raw: Partial<FieldDef>[]): FieldDef[] {
  const seen = new Set<string>();
  const out: FieldDef[] = [];
  for (const f of raw) {
    const label = (f.label ?? "").trim();
    if (!label) continue;
    let key = f.key?.trim() || keyFromLabel(label);
    if (!key) continue;
    while (seen.has(key)) key = `${key}_2`;
    seen.add(key);
    const type = (FIELD_TYPES as string[]).includes(f.type ?? "") ? (f.type as FieldType) : "text";
    out.push({
      key,
      label,
      type,
      required: Boolean(f.required),
      ...(f.options?.length ? { options: f.options.filter((o) => o.trim()) } : {}),
      ...(f.unit ? { unit: f.unit } : {}),
      ...(f.linkedTypeSlug ? { linkedTypeSlug: f.linkedTypeSlug } : {}),
    });
  }
  return out;
}

export async function createEntityType(
  orgId: string,
  actorId: string | null,
  input: { name: string; prefix?: string; color?: string; isInventory?: boolean; fields?: Partial<FieldDef>[] }
) {
  const name = input.name?.trim();
  if (!name) throw new ServiceError("Validation failed", 400, { name: "Name is required" });
  const slug = slugify(name);
  if (!slug) throw new ServiceError("Validation failed", 400, { name: "Name must contain letters or numbers" });

  const existing = await db
    .select({ id: entityTypes.id })
    .from(entityTypes)
    .where(and(eq(entityTypes.organizationId, orgId), eq(entityTypes.slug, slug)))
    .limit(1);
  if (existing.length > 0)
    throw new ServiceError("Validation failed", 400, { name: "A type with this name already exists" });

  const prefix = (input.prefix?.trim() || name.slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, "");

  const [row] = await db
    .insert(entityTypes)
    .values({
      organizationId: orgId,
      name,
      slug,
      prefix: prefix || "GEN",
      color: input.color ?? "#64748b",
      isInventory: Boolean(input.isInventory),
      fields: normalizeFields(input.fields ?? []),
    })
    .returning();

  await logAudit({
    orgId,
    actorId,
    action: "entity_type.create",
    targetKind: "entity_type",
    targetId: row.id,
    targetLabel: row.name,
  });
  return row;
}

export async function updateEntityType(
  orgId: string,
  actorId: string | null,
  typeId: string,
  input: { name?: string; color?: string; isInventory?: boolean; fields?: Partial<FieldDef>[] }
) {
  const rows = await db
    .select()
    .from(entityTypes)
    .where(and(eq(entityTypes.organizationId, orgId), eq(entityTypes.id, typeId)))
    .limit(1);
  if (rows.length === 0) throw new ServiceError("Entity type not found", 404);
  const before = rows[0];

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name?.trim()) patch.name = input.name.trim();
  if (input.color) patch.color = input.color;
  if (input.isInventory !== undefined) patch.isInventory = input.isInventory;
  if (input.fields) patch.fields = normalizeFields(input.fields);

  const [row] = await db
    .update(entityTypes)
    .set(patch)
    .where(and(eq(entityTypes.organizationId, orgId), eq(entityTypes.id, typeId)))
    .returning();

  await logAudit({
    orgId,
    actorId,
    action: "entity_type.update",
    targetKind: "entity_type",
    targetId: row.id,
    targetLabel: row.name,
    diff: { before: { fields: before.fields }, after: { fields: row.fields } },
  });
  return row;
}

export async function deleteEntityType(orgId: string, actorId: string | null, typeId: string) {
  const [{ value: entityCount }] = await db
    .select({ value: count() })
    .from(entities)
    .where(and(eq(entities.organizationId, orgId), eq(entities.entityTypeId, typeId)));
  if (entityCount > 0)
    throw new ServiceError(`Cannot delete: ${entityCount} record(s) still use this type`, 400);

  const [row] = await db
    .delete(entityTypes)
    .where(and(eq(entityTypes.organizationId, orgId), eq(entityTypes.id, typeId)))
    .returning();
  if (!row) throw new ServiceError("Entity type not found", 404);

  await logAudit({
    orgId,
    actorId,
    action: "entity_type.delete",
    targetKind: "entity_type",
    targetId: typeId,
    targetLabel: row.name,
  });
}

/** Per-type record counts for the dashboard. */
export async function getTypeCounts(orgId: string) {
  return db
    .select({
      typeId: entityTypes.id,
      name: entityTypes.name,
      slug: entityTypes.slug,
      color: entityTypes.color,
      total: count(entities.id),
    })
    .from(entityTypes)
    .leftJoin(entities, and(eq(entities.entityTypeId, entityTypes.id), isNull(entities.deletedAt)))
    .where(eq(entityTypes.organizationId, orgId))
    .groupBy(entityTypes.id, entityTypes.name, entityTypes.slug, entityTypes.color)
    .orderBy(entityTypes.name);
}
