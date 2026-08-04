import { requireOrg } from "@/lib/tenant";
import { getLocationTree, getLocationContents, getLocation } from "@/lib/services/locations";
import { LocationsView } from "./locations-view";
import { notFoundOn404 } from "@/lib/not-found";

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const ctx = await requireOrg();
  const tree = await getLocationTree(ctx.orgId);

  let selected = null;
  if (id) {
    const location = await getLocation(ctx.orgId, id).catch(notFoundOn404);
    const contents = await getLocationContents(ctx.orgId, id);
    selected = {
      id: location.id,
      name: location.name,
      kind: location.kind,
      gridRows: location.gridRows,
      gridCols: location.gridCols,
      contents: contents.map((c) => ({
        id: c.id,
        displayId: c.displayId,
        name: c.name,
        positionRow: c.positionRow,
        positionCol: c.positionCol,
      })),
    };
  }

  return <LocationsView tree={tree} selected={selected} />;
}
