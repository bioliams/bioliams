import { requireOrg } from "@/lib/tenant";
import { getEntityTypeBySlug, listEntities } from "@/lib/services/entities";
import { listLocations } from "@/lib/services/locations";
import { notFoundOn404 } from "@/lib/not-found";
import { RegistryView } from "./registry-view";

export default async function RegistryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { slug } = await params;
  const { q, status } = await searchParams;
  const ctx = await requireOrg();

  // listEntities resolves the slug itself, so all three can go out at once.
  const [type, rows, locations] = await Promise.all([
    getEntityTypeBySlug(ctx.orgId, slug).catch(notFoundOn404),
    listEntities(ctx.orgId, { typeSlug: slug, search: q, status, limit: 500 }),
    listLocations(ctx.orgId),
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
      initialSearch={q ?? ""}
    />
  );
}
