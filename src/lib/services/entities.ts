import "server-only";
import { and, asc, eq, isNull, desc, sql, ilike, or } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { entities, entityTypes, locations, inventoryItems } from "@/db/schema";
import type { FieldDef } from "@/db/schema/lims";
import { logAudit } from "@/lib/audit";
import { validateEntityData } from "@/lib/entity-schema";
import { ServiceError } from "@/lib/service-error";
import { projectScope } from "./projects";

export { ServiceError } from "@/lib/service-error";

export async function listEntityTypes(orgId: string) {
  return db
    .select()
    .from(entityTypes)
    .where(eq(entityTypes.organizationId, orgId))
    .orderBy(entityTypes.name);
}

export async function getEntityTypeBySlug(orgId: string, slug: string, tx: Tx = db) {
  const rows = await tx
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
  // Under transaction pooling the pool is one connection wide: any query sent
  // to the pool while a transaction holds that connection deadlocks the
  // function against itself. Everything must ride the caller's transaction.
  const type = await getEntityTypeBySlug(orgId, input.typeSlug, outerTx ?? db);
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

export async function getEntity(
  orgId: string,
  idOrDisplayId: string,
  /** Same restriction as the list: a record outside it must not be reachable by
   *  typing its ID into the address bar. */
  projectIds: string[] = []
) {
  const scope = projectScope(projectIds);
  const rows = await db
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.organizationId, orgId),
        isNull(entities.deletedAt),
        or(eq(entities.id, idOrDisplayId), eq(entities.displayId, idOrDisplayId)),
        ...(scope ? [scope] : [])
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
  /** A built-in column ("name", "status", "location", "displayId", "createdAt")
   *  or the key of a custom field. */
  sort?: string;
  dir?: "asc" | "desc";
  /** Restrict to these projects (plus unfiled records). Empty = no restriction. */
  projectIds?: string[];
}

/**
 * Turn a sort key into SQL.
 *
 * Custom fields live in jsonb, where everything is text — so a number field has
 * to be cast, or 9 sorts above 10 and the column is worse than useless.
 * Anything unparseable sorts last rather than erroring the query.
 */
function orderExpression(sort: string | undefined, fields: FieldDef[]) {
  switch (sort) {
    case undefined:
    case "":
    case "createdAt":
      return entities.createdAt;
    case "displayId":
      // Display IDs are zero-padded to a fixed width, so text order is numeric order.
      return entities.displayId;
    case "name":
      return entities.name;
    case "status":
      return entities.status;
    case "location":
      return locations.name;
    default: {
      const field = fields.find((f) => f.key === sort);
      if (!field) return entities.createdAt;
      const value = sql`${entities.data}->>${sort}`;
      return field.type === "number"
        ? sql`NULLIF(${value}, '')::numeric`
        : field.type === "date"
          ? sql`NULLIF(${value}, '')::timestamp`
          : value;
    }
  }
}

export async function listEntities(orgId: string, opts: ListEntitiesOptions = {}) {
  const conditions = [eq(entities.organizationId, orgId), isNull(entities.deletedAt)];
  let fields: FieldDef[] = [];
  if (opts.typeSlug) {
    const type = await getEntityTypeBySlug(orgId, opts.typeSlug);
    conditions.push(eq(entities.entityTypeId, type.id));
    fields = type.fields;
  }
  const scope = projectScope(opts.projectIds ?? []);
  if (scope) conditions.push(scope);
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

  const order = orderExpression(opts.sort, fields);
  const direction = opts.dir === "asc" ? asc : desc;

  const [rows, [counted]] = await Promise.all([
    db
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
      // NULLS LAST in both directions: an empty cell is not a value, and it
      // should never win a "highest concentration" sort by being absent.
      .orderBy(sql`${direction(order)} NULLS LAST`, desc(entities.createdAt))
      .limit(Math.min(opts.limit ?? 100, 500))
      .offset(opts.offset ?? 0),
    // The count uses the same predicates, so pagination reports the real total
    // rather than the size of the page.
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(entities)
      .innerJoin(entityTypes, eq(entities.entityTypeId, entityTypes.id))
      .leftJoin(locations, eq(entities.locationId, locations.id))
      .where(and(...conditions)),
  ]);

  return { rows, total: counted?.total ?? 0 };
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
