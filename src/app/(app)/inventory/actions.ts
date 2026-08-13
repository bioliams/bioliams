"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { consumeInventory, updateInventory } from "@/lib/services/inventory";
import { type ActionResult, actionError } from "@/lib/action-result";

export async function updateInventoryAction(
  entityId: string,
  input: { quantity?: string; unit?: string; minThreshold?: string | null; lot?: string | null }
): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    await updateInventory(ctx.orgId, ctx.userId, entityId, input);
    revalidatePath("/inventory");
    revalidatePath("/inventory/use");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

/** Record stock being used up. Returns what's left, so the card can say so. */
export async function consumeInventoryAction(
  entityId: string,
  amount: string
): Promise<ActionResult<{ quantity: string; unit: string }>> {
  const ctx = await requireOrg();
  try {
    const value = await consumeInventory(ctx.orgId, ctx.userId, entityId, amount);
    revalidatePath("/inventory/use");
    revalidatePath("/inventory");
    revalidatePath("/");
    return { ok: true, value };
  } catch (err) {
    return actionError(err);
  }
}
