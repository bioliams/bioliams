import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { listBiobankRequests } from "@/lib/services/biobank";
import { BiobankView } from "./biobank-view";

export const metadata = { title: "Biobank requests · BioLIMS" };

export default async function BiobankPage() {
  const ctx = await requireOrg();
  const rows = await listBiobankRequests(ctx.orgId);

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
        items,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
      }))}
      userId={ctx.userId}
      canRequest={can(ctx.role, "records:write")}
      canManage={can(ctx.role, "biobank:manage")}
    />
  );
}
