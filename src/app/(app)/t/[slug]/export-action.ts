"use server";

import { requireOrg } from "@/lib/tenant";
import { listEntities } from "@/lib/services/entities";

interface ExportFilters {
  q?: string;
  status?: string;
  locationId?: string;
  sort?: string;
  dir?: "asc" | "desc";
}

/** Hard ceiling on one export, so a huge registry can't exhaust memory. */
const EXPORT_LIMIT = 5000;

/**
 * Export the whole filtered set, not the page on screen.
 *
 * Once the table is paginated, exporting what's loaded would quietly hand
 * someone 50 rows labelled as their registry — the kind of wrong that only
 * shows up after a decision has been made on it.
 */
export async function exportEntitiesAction(typeSlug: string, filters: ExportFilters) {
  const ctx = await requireOrg();
  const collected: {
    displayId: string;
    name: string;
    status: string;
    locationName: string | null;
    data: Record<string, unknown>;
  }[] = [];

  // listEntities caps a single query at 500, so page through to the ceiling.
  const pageSize = 500;
  for (let offset = 0; offset < EXPORT_LIMIT; offset += pageSize) {
    const { rows, total } = await listEntities(ctx.orgId, {
      typeSlug,
      search: filters.q || undefined,
      status: filters.status || undefined,
      locationId: filters.locationId || undefined,
      sort: filters.sort || undefined,
      dir: filters.dir,
      limit: pageSize,
      offset,
    });
    collected.push(
      ...rows.map((r) => ({
        displayId: r.entity.displayId,
        name: r.entity.name,
        status: r.entity.status,
        locationName: r.locationName,
        data: r.entity.data,
      }))
    );
    if (collected.length >= total || rows.length < pageSize) {
      return { rows: collected, total, truncated: collected.length < total };
    }
  }

  return { rows: collected, total: collected.length, truncated: true };
}
