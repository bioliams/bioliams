"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { requireCan } from "@/lib/permissions";
import {
  discardInventory,
  returnInventory,
  transferEntity,
  setCustody,
} from "@/lib/services/inventory";
import { type ActionResult, actionError } from "@/lib/action-result";

function revalidate(slug: string, displayId: string) {
  revalidatePath(`/t/${slug}/${displayId}`);
  revalidatePath(`/t/${slug}`);
  revalidatePath("/inventory");
  revalidatePath("/inventory/use");
  revalidatePath("/locations");
  revalidatePath("/");
}

export async function discardStockAction(
  entityId: string,
  slug: string,
  displayId: string,
  amount: string,
  reason: string
): Promise<ActionResult<{ quantity: string; unit: string }>> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "records:write");
    const value = await discardInventory(ctx.orgId, ctx.userId, entityId, amount, reason);
    revalidate(slug, displayId);
    return { ok: true, value };
  } catch (err) {
    return actionError(err);
  }
}

export async function returnStockAction(
  entityId: string,
  slug: string,
  displayId: string,
  amount: string,
  note?: string
): Promise<ActionResult<{ quantity: string; unit: string }>> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "records:write");
    const value = await returnInventory(ctx.orgId, ctx.userId, entityId, amount, note);
    revalidate(slug, displayId);
    return { ok: true, value };
  } catch (err) {
    return actionError(err);
  }
}

export async function transferAction(
  entityId: string,
  slug: string,
  displayId: string,
  toLocationId: string | null,
  note?: string
): Promise<ActionResult<{ movement: string }>> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "storage:write");
    const value = await transferEntity(ctx.orgId, ctx.userId, entityId, toLocationId, note);
    revalidate(slug, displayId);
    return { ok: true, value };
  } catch (err) {
    return actionError(err);
  }
}

export async function custodyAction(
  entityId: string,
  slug: string,
  displayId: string,
  action: "checkout" | "checkin"
): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "records:write");
    await setCustody(ctx.orgId, ctx.userId, entityId, action);
    revalidate(slug, displayId);
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
