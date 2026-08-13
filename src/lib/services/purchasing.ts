import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { purchaseRequests, inventoryItems, inventoryEvents, entities, user } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { ServiceError } from "@/lib/service-error";

export type PurchaseStatus = "requested" | "approved" | "ordered" | "received" | "rejected";

/** What can follow what. A request can't jump straight to received unread. */
const NEXT: Record<PurchaseStatus, PurchaseStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["ordered", "rejected"],
  ordered: ["received"],
  received: [],
  rejected: ["requested"],
};

export function canTransition(from: PurchaseStatus, to: PurchaseStatus) {
  return NEXT[from]?.includes(to) ?? false;
}

export async function listPurchases(orgId: string) {
  return db
    .select({
      request: purchaseRequests,
      requesterName: user.name,
      linkedName: entities.name,
      linkedDisplayId: entities.displayId,
    })
    .from(purchaseRequests)
    .leftJoin(user, eq(purchaseRequests.requestedBy, user.id))
    .leftJoin(entities, eq(purchaseRequests.entityId, entities.id))
    .where(eq(purchaseRequests.organizationId, orgId))
    .orderBy(desc(purchaseRequests.createdAt))
    .limit(200);
}

export interface PurchaseInput {
  itemName: string;
  vendor?: string | null;
  catalogNumber?: string | null;
  quantity: string;
  unit: string;
  estimatedCost?: string | null;
  notes?: string | null;
  entityId?: string | null;
}

export async function createPurchase(
  orgId: string,
  actorId: string | null,
  input: PurchaseInput
) {
  if (!input.itemName?.trim()) {
    throw new ServiceError("What are we buying?", 400, { itemName: "Name the item" });
  }
  if (!(Number(input.quantity) > 0)) {
    throw new ServiceError("How many?", 400, { quantity: "Enter a quantity above zero" });
  }

  const [row] = await db
    .insert(purchaseRequests)
    .values({
      organizationId: orgId,
      itemName: input.itemName.trim(),
      vendor: input.vendor || null,
      catalogNumber: input.catalogNumber || null,
      quantity: input.quantity,
      unit: input.unit || "units",
      estimatedCost: input.estimatedCost || null,
      notes: input.notes || null,
      entityId: input.entityId || null,
      requestedBy: actorId,
    })
    .returning();

  await logAudit({
    orgId,
    actorId,
    action: "purchase.request",
    targetKind: "purchase",
    targetId: row.id,
    targetLabel: row.itemName,
    diff: { after: { quantity: `${row.quantity} ${row.unit}`, vendor: row.vendor } },
  });
  return row;
}

/** Edit a request that hasn't been ordered yet — quantities change during review. */
export async function updatePurchase(
  orgId: string,
  actorId: string | null,
  id: string,
  input: Partial<PurchaseInput>
) {
  const existing = await getPurchase(orgId, id);
  if (existing.status === "received") {
    throw new ServiceError("This has already arrived — it can't be edited", 400);
  }

  const [row] = await db
    .update(purchaseRequests)
    .set({
      ...(input.itemName !== undefined ? { itemName: input.itemName.trim() } : {}),
      ...(input.vendor !== undefined ? { vendor: input.vendor || null } : {}),
      ...(input.catalogNumber !== undefined ? { catalogNumber: input.catalogNumber || null } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.estimatedCost !== undefined ? { estimatedCost: input.estimatedCost || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(purchaseRequests.organizationId, orgId), eq(purchaseRequests.id, id)))
    .returning();

  await logAudit({
    orgId,
    actorId,
    action: "purchase.update",
    targetKind: "purchase",
    targetId: id,
    targetLabel: row.itemName,
    diff: {
      before: { quantity: `${existing.quantity} ${existing.unit}`, vendor: existing.vendor },
      after: { quantity: `${row.quantity} ${row.unit}`, vendor: row.vendor },
    },
  });
  return row;
}

export async function getPurchase(orgId: string, id: string) {
  const [row] = await db
    .select()
    .from(purchaseRequests)
    .where(and(eq(purchaseRequests.organizationId, orgId), eq(purchaseRequests.id, id)))
    .limit(1);
  if (!row) throw new ServiceError("Request not found", 404);
  return row;
}

/**
 * Move a request along. Receiving is the interesting one: it adds the stock to
 * the linked record and writes a receive event, so the arrival shows up in the
 * same history as every consumption — the loop from "we need this" back to
 * "it's on the shelf" closes in one place.
 */
export async function setPurchaseStatus(
  orgId: string,
  actorId: string | null,
  id: string,
  status: PurchaseStatus
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(purchaseRequests)
      .where(and(eq(purchaseRequests.organizationId, orgId), eq(purchaseRequests.id, id)))
      .limit(1);
    if (!existing) throw new ServiceError("Request not found", 404);
    if (!canTransition(existing.status, status)) {
      throw new ServiceError(`A ${existing.status} request can't become ${status}`, 400);
    }

    const [row] = await tx
      .update(purchaseRequests)
      .set({ status, decidedBy: actorId, updatedAt: new Date() })
      .where(and(eq(purchaseRequests.organizationId, orgId), eq(purchaseRequests.id, id)))
      .returning();

    let receivedInto: string | null = null;
    if (status === "received" && existing.entityId) {
      const [stock] = await tx
        .update(inventoryItems)
        .set({
          quantity: sql`${inventoryItems.quantity} + ${existing.quantity}::numeric`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventoryItems.organizationId, orgId),
            eq(inventoryItems.entityId, existing.entityId)
          )
        )
        .returning();

      if (stock) {
        receivedInto = stock.quantity;
        await tx.insert(inventoryEvents).values({
          organizationId: orgId,
          entityId: existing.entityId,
          kind: "receive",
          delta: existing.quantity,
          quantityAfter: stock.quantity,
          unit: stock.unit,
          actorId,
        });
      }
    }

    await logAudit(
      {
        orgId,
        actorId,
        action: `purchase.${status}`,
        targetKind: "purchase",
        targetId: id,
        targetLabel: row.itemName,
        diff: {
          before: { status: existing.status },
          after: { status },
          ...(receivedInto ? { stockNow: `${receivedInto} ${row.unit}` } : {}),
        },
      },
      tx
    );

    return { ...row, receivedInto };
  });
}
