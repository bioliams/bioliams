"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { requireCan } from "@/lib/permissions";
import {
  createPurchase,
  updatePurchase,
  setPurchaseStatus,
  type PurchaseInput,
  type PurchaseStatus,
} from "@/lib/services/purchasing";
import { type ActionResult, actionError } from "@/lib/action-result";

export async function createPurchaseAction(input: PurchaseInput): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    // Anyone who can register a record can ask for something to be bought;
    // approving it is the part that needs authority.
    requireCan(ctx.role, "records:write");
    await createPurchase(ctx.orgId, ctx.userId, input);
    revalidatePath("/purchasing");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

export async function updatePurchaseAction(
  id: string,
  input: Partial<PurchaseInput>
): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "records:write");
    await updatePurchase(ctx.orgId, ctx.userId, id, input);
    revalidatePath("/purchasing");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

export async function setPurchaseStatusAction(
  id: string,
  status: PurchaseStatus
): Promise<ActionResult<{ receivedInto: string | null; unit: string }>> {
  const ctx = await requireOrg();
  try {
    // Approving, ordering and receiving spend the lab's money and change stock,
    // so they sit with the people who manage the lab rather than every member.
    requireCan(ctx.role, "members:manage");
    const row = await setPurchaseStatus(ctx.orgId, ctx.userId, id, status);
    revalidatePath("/purchasing");
    revalidatePath("/inventory");
    revalidatePath("/inventory/use");
    revalidatePath("/");
    return { ok: true, value: { receivedInto: row.receivedInto, unit: row.unit } };
  } catch (err) {
    return actionError(err);
  }
}
