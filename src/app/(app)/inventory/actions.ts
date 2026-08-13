"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { requireCan } from "@/lib/permissions";
import { consumeInventoryMany, updateInventory } from "@/lib/services/inventory";
import { type ActionResult, actionError } from "@/lib/action-result";

export async function updateInventoryAction(
  entityId: string,
  input: { quantity?: string; unit?: string; minThreshold?: string | null; lot?: string | null }
): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "records:write");
    await updateInventory(ctx.orgId, ctx.userId, entityId, input);
    revalidatePath("/inventory");
    revalidatePath("/inventory/use");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

/**
 * Record stock being used up — one item or a whole protocol's worth. Returns
 * what's left of each, so the cards can say so without a second read.
 */
export async function consumeInventoryAction(
  entries: { entityId: string; amount: string }[]
): Promise<ActionResult<{ entityId: string; name: string; quantity: string; unit: string }[]>> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "records:write");
    const value = await consumeInventoryMany(ctx.orgId, ctx.userId, entries);
    revalidatePath("/inventory/use");
    revalidatePath("/inventory");
    revalidatePath("/");
    return { ok: true, value };
  } catch (err) {
    return actionError(err);
  }
}
