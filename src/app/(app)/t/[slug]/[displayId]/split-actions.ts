"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { requireCan } from "@/lib/permissions";
import { splitIntoAliquots, type AliquotGroup } from "@/lib/services/inventory";
import { type ActionResult, actionError } from "@/lib/action-result";

export async function splitEntityAction(
  entityId: string,
  slug: string,
  input: { groups: AliquotGroup[] }
): Promise<ActionResult<{ created: number; remaining: string | null; unit: string }>> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "records:write");
    const value = await splitIntoAliquots(ctx.orgId, ctx.userId, entityId, input);
    revalidatePath(`/t/${slug}`);
    revalidatePath("/inventory");
    revalidatePath("/inventory/use");
    revalidatePath("/locations");
    return { ok: true, value };
  } catch (err) {
    return actionError(err);
  }
}
