import { getT } from "@/i18n/server";
import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { listBiobankRequests } from "@/lib/services/biobank";
import { listInventory } from "@/lib/services/inventory";
import { BiobankView } from "./biobank-view";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("nav.biobank")} · BioLIMS` };
}

export default async function BiobankPage() {
  const ctx = await requireOrg();
  const canManage = can(ctx.role, "biobank:manage");
  const [rows, stock] = await Promise.all([
    listBiobankRequests(ctx.orgId),
    // Only the biobank takes from stock, so only it gets the stock list.
    canManage ? listInventory(ctx.orgId) : Promise.resolve([]),
  ]);

  return (
    <BiobankView
      requests={rows.map(({ request, requesterName, handlerName, items }) => ({
        id: request.id,
        title: request.title,
        details: request.details,
        neededBy: request.neededBy?.toISOString().slice(0, 10) ?? null,
        status: request.status,
        response: request.response,
        requestedBy: request.requestedBy,
        requesterName,
        handlerName,
        // Stock levels and freezer positions are the biobank's business, not the
        // requester's — strip them here so they never reach the browser.
        items: canManage
          ? items
          : items.map((i) => ({ ...i, stock: null, quantity: null, takenQuantity: null, where: null })),
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
      }))}
      userId={ctx.userId}
      canRequest={can(ctx.role, "records:write")}
      canManage={canManage}
      stockOptions={stock.map(({ entity, item, typeName }) => ({
        entityId: entity.id,
        displayId: entity.displayId,
        name: entity.name,
        typeName,
        quantity: item.quantity,
        unit: item.unit,
      }))}
    />
  );
}
