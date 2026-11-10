import "server-only";
import { and, eq, isNull, ne, isNotNull, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { locations, entities } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { ServiceError } from "@/lib/service-error";
import { MAX_GRID_COLS, MAX_GRID_ROWS, positionProblem } from "@/lib/well";

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

export async function getLocation(orgId: string, id: string, tx: Tx = db) {
  const rows = await tx
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
  const grid = gridFor(input.kind, input.gridRows, input.gridCols);
  const [row] = await db
    .insert(locations)
    .values({
      organizationId: orgId,
      name: input.name.trim(),
      kind: input.kind,
      parentId: input.parentId ?? null,
      gridRows: grid.rows,
      gridCols: grid.cols,
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

/**
 * Boxes always have a grid (9×9 unless told otherwise). Racks have one only if
 * asked for — a tube rack has positions, a freezer rack that holds boxes
 * doesn't. Nothing else is gridded.
 */
function gridFor(kind: LocationKind, rows?: number | null, cols?: number | null) {
  const gridded = kind === "box" || (kind === "rack" && Boolean(rows) && Boolean(cols));
  if (!gridded) return { rows: null, cols: null };
  const r = rows ?? 9;
  const c = cols ?? 9;
  const errors: Record<string, string> = {};
  if (!Number.isInteger(r) || r < 1 || r > MAX_GRID_ROWS) errors.gridRows = `Rows must be 1–${MAX_GRID_ROWS}`;
  if (!Number.isInteger(c) || c < 1 || c > MAX_GRID_COLS) errors.gridCols = `Columns must be 1–${MAX_GRID_COLS}`;
  if (Object.keys(errors).length > 0) throw new ServiceError("Validation failed", 400, errors);
  return { rows: r, cols: c };
}

/** Which wells of a gridded location are taken, and by what. */
export async function getOccupiedPositions(orgId: string, locationId: string, tx: Tx = db) {
  return tx
    .select({
      entityId: entities.id,
      displayId: entities.displayId,
      name: entities.name,
      row: entities.positionRow,
      col: entities.positionCol,
    })
    .from(entities)
    .where(
      and(
        eq(entities.organizationId, orgId),
        eq(entities.locationId, locationId),
        isNull(entities.deletedAt),
        isNotNull(entities.positionRow),
        isNotNull(entities.positionCol)
      )
    ) as Promise<{ entityId: string; displayId: string; name: string; row: number; col: number }[]>;
}

/**
 * Throws a form-friendly error unless (row, col) is a free well in this
 * location. Both null means "somewhere in the location", which is always fine.
 */
export async function assertPositionAvailable(
  orgId: string,
  input: {
    locationId: string | null;
    row: number | null;
    col: number | null;
    /** The record being moved, which may keep its own well. */
    entityId?: string;
  },
  tx: Tx = db
) {
  const { locationId, row, col } = input;
  if (row == null && col == null) return;
  const fail = (message: string): never => {
    throw new ServiceError("Validation failed", 400, { position: message });
  };
  if (row == null || col == null) fail("Give both a row and a column");
  if (!locationId) fail("Pick a location before a position");

  const location = await getLocation(orgId, locationId!, tx);
  const occupant = await tx
    .select({ displayId: entities.displayId })
    .from(entities)
    .where(
      and(
        eq(entities.organizationId, orgId),
        eq(entities.locationId, locationId!),
        eq(entities.positionRow, row!),
        eq(entities.positionCol, col!),
        isNull(entities.deletedAt),
        ...(input.entityId ? [ne(entities.id, input.entityId)] : [])
      )
    )
    .limit(1);
  const problem = positionProblem(
    { rows: location.gridRows, cols: location.gridCols },
    row!,
    col!,
    occupant[0]?.displayId
  );
  if (problem) fail(problem);
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
