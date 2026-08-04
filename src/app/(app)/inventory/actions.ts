"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { updateInventory } from "@/lib/services/inventory";
import { type ActionResult, actionError } from "@/lib/action-result";

export async function updateInventoryAction(
  entityId: string,
  input: { quantity?: string; unit?: string; minThreshold?: string | null; lot?: string | null }
): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    await updateInventory(ctx.orgId, ctx.userId, entityId, input);
    revalidatePath("/inventory");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
