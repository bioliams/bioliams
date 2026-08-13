import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { inventoryItems, inventoryEvents, entities, entityTypes, user } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { createEntity, ServiceError } from "./entities";

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

  // A hand-edited quantity is still a stock movement — record it so the history
  // on an item accounts for every change, not only the ones made through "Use".
  if (input.quantity !== undefined && row.quantity !== before.quantity) {
    await db.insert(inventoryEvents).values({
      organizationId: orgId,
      entityId,
      kind: "adjust",
      delta: sql`${row.quantity}::numeric - ${before.quantity}::numeric`,
      quantityAfter: row.quantity,
      unit: row.unit,
      actorId,
    });
  }
  return row;
}

/**
 * Take stock off the shelf: decrement in one atomic statement, then record the
 * event. The `quantity >= amount` predicate lives in the UPDATE so two people
 * consuming the last of a reagent at the same moment can't drive it negative —
 * whoever loses the race matches no row and gets told what's actually left.
 */
export async function consumeInventory(
  orgId: string,
  actorId: string | null,
  entityId: string,
  amount: string
) {
  return consumeOne(db, orgId, actorId, entityId, amount);
}

/**
 * Use several items in one go — a protocol usually draws on more than one
 * reagent. All of it or none of it: one transaction, so a short item late in
 * the list can't leave the earlier ones already deducted.
 */
export async function consumeInventoryMany(
  orgId: string,
  actorId: string | null,
  entries: { entityId: string; amount: string }[]
) {
  if (entries.length === 0) throw new ServiceError("Nothing selected", 400);
  return db.transaction(async (tx) =>
    Promise.all(
      entries.map((e) => consumeOne(tx, orgId, actorId, e.entityId, e.amount))
    )
  );
}

async function consumeOne(
  tx: Tx,
  orgId: string,
  actorId: string | null,
  entityId: string,
  amount: string
) {
  const parsed = Number(amount);
  if (!amount.trim() || !Number.isFinite(parsed) || parsed <= 0) {
    throw new ServiceError("Enter an amount greater than zero", 400, {
      amount: "Enter an amount greater than zero",
    });
  }

  const [row] = await tx
    .update(inventoryItems)
    .set({
      // Subtract in Postgres so exact numerics stay exact; JS floats would
      // turn 0.3 - 0.1 into 0.19999999999999998 in the stock level.
      quantity: sql`${inventoryItems.quantity} - ${amount}::numeric`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inventoryItems.organizationId, orgId),
        eq(inventoryItems.entityId, entityId),
        sql`${inventoryItems.quantity} >= ${amount}::numeric`
      )
    )
    .returning();

  const [entity] = await tx
    .select({ displayId: entities.displayId, name: entities.name })
    .from(entities)
    .where(and(eq(entities.organizationId, orgId), eq(entities.id, entityId)))
    .limit(1);

  if (!row) {
    const [existing] = await tx
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.organizationId, orgId), eq(inventoryItems.entityId, entityId)))
      .limit(1);
    if (!existing) throw new ServiceError("This record does not track inventory", 404);
    // Name the item: in a batch the message is useless without it.
    throw new ServiceError(
      `Only ${existing.quantity} ${existing.unit} of ${entity?.name ?? "this item"} left — nothing was recorded`,
      400,
      { amount: `Only ${existing.quantity} ${existing.unit} available` }
    );
  }

  await tx.insert(inventoryEvents).values({
    organizationId: orgId,
    entityId,
    kind: "consume",
    delta: sql`-${amount}::numeric`,
    quantityAfter: row.quantity,
    unit: row.unit,
    actorId,
  });

  await logAudit(
    {
      orgId,
      actorId,
      action: "inventory.consume",
      targetKind: "inventory",
      targetId: entityId,
      targetLabel: entity ? `${entity.displayId} ${entity.name}` : undefined,
      diff: { used: `${amount} ${row.unit}`, remaining: `${row.quantity} ${row.unit}` },
    },
    tx
  );

  return {
    entityId,
    name: entity?.name ?? "",
    quantity: row.quantity,
    unit: row.unit,
  };
}

export interface AliquotGroup {
  /** How many vials go to this destination. */
  count: number;
  locationId: string | null;
}

/**
 * Split a stock record into individually tracked aliquots.
 *
 * Each vial becomes its own record — its own display ID, its own location, its
 * own remaining volume — linked back to the parent through the existing lineage
 * field. That is what lets eight vials of Proteinase K sit in three different
 * freezers and still be one traceable batch, and it is the only model where a
 * barcode can mean a *particular* vial rather than "some of this reagent".
 *
 * Non-inventory parents (a blood draw split into aliquots) work too: there is
 * no stock to deduct, so only the child records are created.
 */
export async function splitIntoAliquots(
  orgId: string,
  actorId: string | null,
  parentId: string,
  input: { amountEach: string; groups: AliquotGroup[] }
) {
  const groups = input.groups.filter((g) => g.count > 0);
  const total = groups.reduce((sum, g) => sum + g.count, 0);
  if (total === 0) throw new ServiceError("Choose how many aliquots to make", 400, {
    count: "Enter at least one aliquot",
  });
  if (!groups.every((g) => Number.isInteger(g.count))) {
    throw new ServiceError("Aliquot counts must be whole numbers", 400, {
      count: "Use whole numbers",
    });
  }
  const each = Number(input.amountEach);
  if (!input.amountEach.trim() || !Number.isFinite(each) || each <= 0) {
    throw new ServiceError("Enter how much goes into each aliquot", 400, {
      amountEach: "Enter an amount greater than zero",
    });
  }

  return db.transaction(async (tx) => {
    const [parent] = await tx
      .select({
        id: entities.id,
        name: entities.name,
        displayId: entities.displayId,
        data: entities.data,
        typeSlug: entityTypes.slug,
      })
      .from(entities)
      .innerJoin(entityTypes, eq(entities.entityTypeId, entityTypes.id))
      .where(
        and(
          eq(entities.organizationId, orgId),
          eq(entities.id, parentId),
          isNull(entities.deletedAt)
        )
      )
      .limit(1);
    if (!parent) throw new ServiceError("Record not found", 404);

    const [stock] = await tx
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.organizationId, orgId), eq(inventoryItems.entityId, parentId)))
      .limit(1);

    let remaining: string | null = null;
    const unit = stock?.unit ?? "units";

    if (stock) {
      // Same guarded decrement as consumption: the split can't overdraw the
      // parent, and two people splitting at once can't both win.
      const [updated] = await tx
        .update(inventoryItems)
        .set({
          quantity: sql`${inventoryItems.quantity} - (${input.amountEach}::numeric * ${total})`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventoryItems.organizationId, orgId),
            eq(inventoryItems.entityId, parentId),
            sql`${inventoryItems.quantity} >= (${input.amountEach}::numeric * ${total})`
          )
        )
        .returning();

      if (!updated) {
        throw new ServiceError(
          `${total} × ${input.amountEach} ${stock.unit} is more than the ${stock.quantity} ${stock.unit} left of ${parent.name}`,
          400,
          { amountEach: `Only ${stock.quantity} ${stock.unit} available` }
        );
      }
      remaining = updated.quantity;

      await tx.insert(inventoryEvents).values({
        organizationId: orgId,
        entityId: parentId,
        kind: "split",
        delta: sql`-(${input.amountEach}::numeric * ${total})`,
        quantityAfter: updated.quantity,
        unit: updated.unit,
        actorId,
      });
    }

    // Continue the numbering rather than restarting it, so a second split of
    // the same batch doesn't produce a second "vial 1".
    const [{ existing }] = await tx
      .select({ existing: sql<number>`count(*)::int` })
      .from(entities)
      .where(and(eq(entities.organizationId, orgId), eq(entities.parentId, parentId)));

    const created = [];
    let n = existing;
    for (const group of groups) {
      for (let i = 0; i < group.count; i++) {
        n += 1;
        const child = await createEntity(
          orgId,
          actorId,
          {
            typeSlug: parent.typeSlug,
            name: `${parent.name} vial ${n}`,
            data: parent.data,
            parentId,
            locationId: group.locationId,
            quantity: input.amountEach,
            unit,
            lot: stock?.lot ?? null,
            expiresAt: stock?.expiresAt ?? null,
          },
          tx
        );
        created.push(child);
      }
    }

    await logAudit(
      {
        orgId,
        actorId,
        action: "entity.split",
        targetKind: "entity",
        targetId: parentId,
        targetLabel: `${parent.displayId} ${parent.name}`,
        diff: {
          aliquots: total,
          each: `${input.amountEach} ${unit}`,
          remaining: remaining === null ? undefined : `${remaining} ${unit}`,
        },
      },
      tx
    );

    return { created: created.length, remaining, unit };
  });
}

/** Most recent stock movements across the lab, for the usage feed. */
export async function listRecentUsage(orgId: string, limit = 8) {
  return db
    .select({
      event: inventoryEvents,
      entityName: entities.name,
      displayId: entities.displayId,
      typeSlug: entityTypes.slug,
      actorName: user.name,
    })
    .from(inventoryEvents)
    .innerJoin(entities, eq(inventoryEvents.entityId, entities.id))
    .innerJoin(entityTypes, eq(entities.entityTypeId, entityTypes.id))
    .leftJoin(user, eq(inventoryEvents.actorId, user.id))
    .where(eq(inventoryEvents.organizationId, orgId))
    .orderBy(desc(inventoryEvents.createdAt))
    .limit(limit);
}
