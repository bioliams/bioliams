import { requireOrg } from "@/lib/tenant";
import { getEntityTypeBySlug, listEntities } from "@/lib/services/entities";
import { listLocations } from "@/lib/services/locations";
import { listViews } from "@/lib/services/views";
import { can } from "@/lib/permissions";
import { notFoundOn404 } from "@/lib/not-found";
import { RegistryView } from "./registry-view";

export default async function RegistryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; status?: string; locationId?: string }>;
}) {
  const { slug } = await params;
  const { q, status, locationId } = await searchParams;
  const ctx = await requireOrg();

  // listEntities resolves the slug itself, so all of these can go out at once.
  const [type, rows, locations, views] = await Promise.all([
    getEntityTypeBySlug(ctx.orgId, slug).catch(notFoundOn404),
    listEntities(ctx.orgId, { typeSlug: slug, search: q, status, locationId, limit: 500 }),
    listLocations(ctx.orgId),
    listViews(ctx.orgId, slug),
  ]);

  return (
    <RegistryView
      type={{
        id: type.id,
        name: type.name,
        slug: type.slug,
        color: type.color,
        fields: type.fields,
        isInventory: type.isInventory,
      }}
      rows={rows.map((r) => ({
        id: r.entity.id,
        displayId: r.entity.displayId,
        name: r.entity.name,
        status: r.entity.status,
        data: r.entity.data,
        locationId: r.entity.locationId,
        locationName: r.locationName,
        createdAt: r.entity.createdAt.toISOString(),
      }))}
      locations={locations.map((l) => ({ id: l.id, name: l.name, kind: l.kind }))}
      views={views.map((v) => ({ id: v.id, name: v.name, query: v.query }))}
      filters={{ q: q ?? "", status: status ?? "", locationId: locationId ?? "" }}
      canWrite={can(ctx.role, "records:write")}
    />
  );
}
