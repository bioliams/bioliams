import { requireOrg } from "@/lib/tenant";
import { listInventory, listRecentUsage } from "@/lib/services/inventory";
import { UseStockView } from "./use-stock-view";

export default async function UseStockPage() {
  const ctx = await requireOrg();
  const [rows, usage] = await Promise.all([
    listInventory(ctx.orgId),
    listRecentUsage(ctx.orgId),
  ]);

  return (
    <UseStockView
      items={rows.map(({ item, entity, typeName, typeSlug, locationName }) => ({
        entityId: entity.id,
        displayId: entity.displayId,
        name: entity.name,
        typeName,
        typeSlug,
        quantity: item.quantity,
        unit: item.unit,
        minThreshold: item.minThreshold,
        lot: item.lot,
        locationName,
      }))}
      usage={usage.map(({ event, entityName, displayId, actorName }) => ({
        id: event.id,
        kind: event.kind,
        delta: event.delta,
        quantityAfter: event.quantityAfter,
        unit: event.unit,
        entityName,
        displayId,
        actorName,
        createdAt: event.createdAt.toISOString(),
      }))}
    />
  );
}
