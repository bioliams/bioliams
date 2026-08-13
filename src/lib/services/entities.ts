import "server-only";
import { and, eq, isNull, desc, sql, ilike, or } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { entities, entityTypes, locations, inventoryItems } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { validateEntityData } from "@/lib/entity-schema";

export class ServiceError extends Error {
  constructor(message: string, readonly status = 400, readonly fieldErrors?: Record<string, string>) {
    super(message);
  }
}

export async function listEntityTypes(orgId: string) {
  return db
    .select()
    .from(entityTypes)
    .where(eq(entityTypes.organizationId, orgId))
    .orderBy(entityTypes.name);
}

export async function getEntityTypeBySlug(orgId: string, slug: string) {
  const rows = await db
    .select()
    .from(entityTypes)
    .where(and(eq(entityTypes.organizationId, orgId), eq(entityTypes.slug, slug)))
    .limit(1);
  if (rows.length === 0) throw new ServiceError(`Unknown entity type: ${slug}`, 404);
  return rows[0];
}

/**
 * Reserve the next display ID for a type. Uses an atomic UPDATE ... RETURNING so
 * concurrent registrations can't collide on the counter.
 */
async function nextDisplayId(
  tx: Tx,
  orgId: string,
  entityTypeId: string
) {
  const updated = await tx
    .update(entityTypes)
    .set({ counter: sql`${entityTypes.counter} + 1` })
    .where(and(eq(entityTypes.id, entityTypeId), eq(entityTypes.organizationId, orgId)))
    .returning({ counter: entityTypes.counter, prefix: entityTypes.prefix });
  if (updated.length === 0) throw new ServiceError("Entity type not found", 404);
  const { counter, prefix } = updated[0];
  return `${prefix}-${String(counter).padStart(6, "0")}`;
}

export interface CreateEntityInput {
  typeSlug: string;
  name: string;
  status?: string;
  data?: Record<string, unknown>;
  locationId?: string | null;
  positionRow?: number | null;
  positionCol?: number | null;
  parentId?: string | null;
  quantity?: string | null;
  unit?: string | null;
  minThreshold?: string | null;
  lot?: string | null;
  expiresAt?: Date | null;
}

export async function createEntity(
  orgId: string,
  actorId: string | null,
  input: CreateEntityInput,
  /** Join a caller's transaction — used by splits, which create many at once. */
  outerTx?: Tx
) {
  const type = await getEntityTypeBySlug(orgId, input.typeSlug);
  const { data, errors } = validateEntityData(type.fields, input.data ?? {});
  if (errors) throw new ServiceError("Validation failed", 400, errors);
  if (!input.name?.trim()) throw new ServiceError("Validation failed", 400, { name: "Name is required" });

  const run = async (tx: Tx) => {
    const displayId = await nextDisplayId(tx, orgId, type.id);
    const [row] = await tx
      .insert(entities)
      .values({
        organizationId: orgId,
        entityTypeId: type.id,
        displayId,
        name: input.name.trim(),
        status: input.status ?? "active",
        data: data ?? {},
        locationId: input.locationId ?? null,
        positionRow: input.positionRow ?? null,
        positionCol: input.positionCol ?? null,
        parentId: input.parentId ?? null,
        createdBy: actorId,
      })
      .returning();

    if (type.isInventory) {
      await tx.insert(inventoryItems).values({
        organizationId: orgId,
        entityId: row.id,
        quantity: input.quantity ?? "0",
        unit: input.unit ?? "units",
        minThreshold: input.minThreshold ?? null,
        lot: input.lot ?? null,
        expiresAt: input.expiresAt ?? null,
      });
    }

    await logAudit(
      {
        orgId,
        actorId,
        action: "entity.create",
        targetKind: "entity",
        targetId: row.id,
        targetLabel: `${displayId} ${row.name}`,
        diff: { after: { name: row.name, status: row.status, data: row.data } },
      },
      tx
    );
    return row;
  };

  return outerTx ? run(outerTx) : db.transaction(run);
}

export async function getEntity(orgId: string, idOrDisplayId: string) {
  const rows = await db
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.organizationId, orgId),
        isNull(entities.deletedAt),
        or(eq(entities.id, idOrDisplayId), eq(entities.displayId, idOrDisplayId))
      )
    )
    .limit(1);
  if (rows.length === 0) throw new ServiceError("Entity not found", 404);
  return rows[0];
}

export interface ListEntitiesOptions {
  typeSlug?: string;
  search?: string;
  status?: string;
  locationId?: string;
  limit?: number;
  offset?: number;
}

export async function listEntities(orgId: string, opts: ListEntitiesOptions = {}) {
  const conditions = [eq(entities.organizationId, orgId), isNull(entities.deletedAt)];
  if (opts.typeSlug) {
    const type = await getEntityTypeBySlug(orgId, opts.typeSlug);
    conditions.push(eq(entities.entityTypeId, type.id));
  }
  if (opts.status) conditions.push(eq(entities.status, opts.status));
  if (opts.locationId) conditions.push(eq(entities.locationId, opts.locationId));
  if (opts.search) {
    const q = `%${opts.search}%`;
    conditions.push(
      or(
        ilike(entities.name, q),
        ilike(entities.displayId, q),
        // Custom fields live in jsonb, and "find the tube with lot A12" is a
        // question people actually ask, so search their values as text too.
        sql`${entities.data}::text ILIKE ${q}`
      )!
    );
  }

  return db
    .select({
      entity: entities,
      typeName: entityTypes.name,
      typeSlug: entityTypes.slug,
      locationName: locations.name,
    })
    .from(entities)
    .innerJoin(entityTypes, eq(entities.entityTypeId, entityTypes.id))
    .leftJoin(locations, eq(entities.locationId, locations.id))
    .where(and(...conditions))
    .orderBy(desc(entities.createdAt))
    .limit(Math.min(opts.limit ?? 100, 500))
    .offset(opts.offset ?? 0);
}

export interface UpdateEntityInput {
  name?: string;
  status?: string;
  data?: Record<string, unknown>;
  locationId?: string | null;
  positionRow?: number | null;
  positionCol?: number | null;
}

export async function updateEntity(
  orgId: string,
  actorId: string | null,
  entityId: string,
  input: UpdateEntityInput
) {
  const existing = await getEntity(orgId, entityId);
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (input.data !== undefined) {
    const [type] = await db.select().from(entityTypes).where(eq(entityTypes.id, existing.entityTypeId));
    const merged = { ...existing.data, ...input.data };
    const { data, errors } = validateEntityData(type.fields, merged);
    if (errors) throw new ServiceError("Validation failed", 400, errors);
    patch.data = data;
  }
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.status !== undefined) patch.status = input.status;
  if (input.locationId !== undefined) patch.locationId = input.locationId;
  if (input.positionRow !== undefined) patch.positionRow = input.positionRow;
  if (input.positionCol !== undefined) patch.positionCol = input.positionCol;

  const [row] = await db
    .update(entities)
    .set(patch)
    .where(and(eq(entities.id, existing.id), eq(entities.organizationId, orgId)))
    .returning();

  const moved = input.locationId !== undefined && input.locationId !== existing.locationId;
  await logAudit({
    orgId,
    actorId,
    action: moved ? "entity.move" : "entity.update",
    targetKind: "entity",
    targetId: row.id,
    targetLabel: `${row.displayId} ${row.name}`,
    diff: {
      before: { name: existing.name, status: existing.status, data: existing.data, locationId: existing.locationId },
      after: { name: row.name, status: row.status, data: row.data, locationId: row.locationId },
    },
  });
  return row;
}

export async function deleteEntity(orgId: string, actorId: string | null, entityId: string) {
  const existing = await getEntity(orgId, entityId);
  await db
    .update(entities)
    .set({ deletedAt: new Date() })
    .where(and(eq(entities.id, existing.id), eq(entities.organizationId, orgId)));
  await logAudit({
    orgId,
    actorId,
    action: "entity.delete",
    targetKind: "entity",
    targetId: existing.id,
    targetLabel: `${existing.displayId} ${existing.name}`,
  });
}

export async function getChildren(orgId: string, entityId: string) {
  return db
    .select()
    .from(entities)
    .where(
      and(eq(entities.organizationId, orgId), eq(entities.parentId, entityId), isNull(entities.deletedAt))
    );
}
