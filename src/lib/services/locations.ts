import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { locations, entities } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { ServiceError } from "./entities";

export type LocationKind = "site" | "room" | "freezer" | "shelf" | "rack" | "box";

export interface LocationNode {
  id: string;
  name: string;
  kind: LocationKind;
  parentId: string | null;
  gridRows: number | null;
  gridCols: number | null;
  /** Records stored directly at this location. */
  itemCount: number;
  children: LocationNode[];
}

export async function listLocations(orgId: string) {
  return db
    .select()
    .from(locations)
    .where(eq(locations.organizationId, orgId))
    .orderBy(locations.name);
}

/** Build the storage hierarchy as a nested tree. */
export async function getLocationTree(orgId: string): Promise<LocationNode[]> {
  const rows = await listLocations(orgId);
  // One grouped count instead of a query per node.
  const counts = await db
    .select({ locationId: entities.locationId, n: sql<number>`count(*)::int` })
    .from(entities)
    .where(and(eq(entities.organizationId, orgId), isNull(entities.deletedAt)))
    .groupBy(entities.locationId);
  const countFor = new Map(counts.map((c) => [c.locationId, c.n]));

  const byId = new Map<string, LocationNode>();
  for (const r of rows) {
    byId.set(r.id, {
      id: r.id,
      name: r.name,
      kind: r.kind,
      parentId: r.parentId,
      gridRows: r.gridRows,
      gridCols: r.gridCols,
      itemCount: countFor.get(r.id) ?? 0,
      children: [],
    });
  }
  const roots: LocationNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export async function getLocation(orgId: string, id: string) {
  const rows = await db
    .select()
    .from(locations)
    .where(and(eq(locations.organizationId, orgId), eq(locations.id, id)))
    .limit(1);
  if (rows.length === 0) throw new ServiceError("Location not found", 404);
  return rows[0];
}

/** Breadcrumb from root down to the given location. */
export async function getLocationPath(orgId: string, id: string) {
  const all = await listLocations(orgId);
  const byId = new Map(all.map((l) => [l.id, l]));
  const path: typeof all = [];
  let current = byId.get(id);
  while (current) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

export async function createLocation(
  orgId: string,
  actorId: string | null,
  input: { name: string; kind: LocationKind; parentId?: string | null; gridRows?: number | null; gridCols?: number | null }
) {
  if (!input.name?.trim()) throw new ServiceError("Validation failed", 400, { name: "Name is required" });
  if (input.parentId) await getLocation(orgId, input.parentId); // ensure same org
  const [row] = await db
    .insert(locations)
    .values({
      organizationId: orgId,
      name: input.name.trim(),
      kind: input.kind,
      parentId: input.parentId ?? null,
      gridRows: input.kind === "box" ? input.gridRows ?? 9 : null,
      gridCols: input.kind === "box" ? input.gridCols ?? 9 : null,
    })
    .returning();
  await logAudit({
    orgId,
    actorId,
    action: "location.create",
    targetKind: "location",
    targetId: row.id,
    targetLabel: row.name,
  });
  return row;
}

export async function deleteLocation(orgId: string, actorId: string | null, id: string) {
  const loc = await getLocation(orgId, id);
  const children = await db
    .select({ id: locations.id })
    .from(locations)
    .where(and(eq(locations.organizationId, orgId), eq(locations.parentId, id)))
    .limit(1);
  if (children.length > 0) throw new ServiceError("Cannot delete a location that has sub-locations", 400);
  await db.delete(locations).where(and(eq(locations.organizationId, orgId), eq(locations.id, id)));
  await logAudit({
    orgId,
    actorId,
    action: "location.delete",
    targetKind: "location",
    targetId: id,
    targetLabel: loc.name,
  });
}

/** Entities stored directly in a location (used for the box grid view). */
export async function getLocationContents(orgId: string, locationId: string) {
  return db
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.organizationId, orgId),
        eq(entities.locationId, locationId),
        isNull(entities.deletedAt)
      )
    );
}
