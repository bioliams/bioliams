import { requireOrg } from "@/lib/tenant";
import { listPurchases } from "@/lib/services/purchasing";
import { listInventory } from "@/lib/services/inventory";
import { can } from "@/lib/permissions";
import { PurchasingView } from "./purchasing-view";

export const metadata = { title: "Purchasing · BioLIMS" };

export default async function PurchasingPage() {
  const ctx = await requireOrg();
  const [rows, stock] = await Promise.all([
    listPurchases(ctx.orgId),
    listInventory(ctx.orgId),
  ]);

  return (
    <PurchasingView
      requests={rows.map(({ request, requesterName, linkedName, linkedDisplayId }) => ({
        id: request.id,
        itemName: request.itemName,
        vendor: request.vendor,
        catalogNumber: request.catalogNumber,
        quantity: request.quantity,
        unit: request.unit,
        estimatedCost: request.estimatedCost,
        notes: request.notes,
        status: request.status,
        requesterName,
        linkedLabel: linkedDisplayId ? `${linkedDisplayId} ${linkedName}` : null,
        createdAt: request.createdAt.toISOString(),
      }))}
      stockOptions={stock.map(({ entity, item }) => ({
        entityId: entity.id,
        label: `${entity.displayId} ${entity.name}`,
        unit: item.unit,
      }))}
      canRequest={can(ctx.role, "records:write")}
      canDecide={can(ctx.role, "members:manage")}
    />
  );
}
