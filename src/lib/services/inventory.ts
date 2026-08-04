import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { inventoryItems, entities, entityTypes } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { ServiceError } from "./entities";

export async function listInventory(orgId: string) {
  return db
    .select({
      item: inventoryItems,
      entity: entities,
      typeName: entityTypes.name,
      typeSlug: entityTypes.slug,
    })
    .from(inventoryItems)
    .innerJoin(entities, eq(inventoryItems.entityId, entities.id))
    .innerJoin(entityTypes, eq(entities.entityTypeId, entityTypes.id))
    .where(and(eq(inventoryItems.organizationId, orgId), isNull(entities.deletedAt)))
    .orderBy(entities.name);
}

/** Items at or below their configured minimum threshold. */
export async function listLowStock(orgId: string) {
  return db
    .select({
      item: inventoryItems,
      entity: entities,
      typeSlug: entityTypes.slug,
    })
    .from(inventoryItems)
    .innerJoin(entities, eq(inventoryItems.entityId, entities.id))
    .innerJoin(entityTypes, eq(entities.entityTypeId, entityTypes.id))
    .where(
      and(
        eq(inventoryItems.organizationId, orgId),
        isNull(entities.deletedAt),
        sql`${inventoryItems.minThreshold} IS NOT NULL AND ${inventoryItems.quantity} <= ${inventoryItems.minThreshold}`
      )
    );
}

export async function getInventoryForEntity(orgId: string, entityId: string) {
  const rows = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.organizationId, orgId), eq(inventoryItems.entityId, entityId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateInventory(
  orgId: string,
  actorId: string | null,
  entityId: string,
  input: { quantity?: string; unit?: string; minThreshold?: string | null; lot?: string | null }
) {
  const before = await getInventoryForEntity(orgId, entityId);
  if (!before) throw new ServiceError("This record does not track inventory", 404);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.quantity !== undefined) patch.quantity = input.quantity;
  if (input.unit !== undefined) patch.unit = input.unit;
  if (input.minThreshold !== undefined) patch.minThreshold = input.minThreshold;
  if (input.lot !== undefined) patch.lot = input.lot;

  const [row] = await db
    .update(inventoryItems)
    .set(patch)
    .where(and(eq(inventoryItems.organizationId, orgId), eq(inventoryItems.entityId, entityId)))
    .returning();

  // Label the entry with the record it belongs to; an id alone is unreadable
  // in the activity feed.
  const [entity] = await db
    .select({ displayId: entities.displayId, name: entities.name })
    .from(entities)
    .where(eq(entities.id, entityId))
    .limit(1);

  await logAudit({
    orgId,
    actorId,
    action: "inventory.update",
    targetKind: "inventory",
    targetId: entityId,
    targetLabel: entity ? `${entity.displayId} ${entity.name}` : undefined,
    diff: {
      before: { quantity: before.quantity, unit: before.unit },
      after: { quantity: row.quantity, unit: row.unit },
    },
  });
  return row;
}
