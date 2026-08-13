"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { createView, deleteView } from "@/lib/services/views";
import { type ActionResult, actionError } from "@/lib/action-result";

export async function saveViewAction(
  typeSlug: string,
  name: string,
  query: Record<string, string>
): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    await createView(ctx.orgId, ctx.userId, { typeSlug, name, query });
    revalidatePath(`/t/${typeSlug}`);
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

export async function deleteViewAction(
  typeSlug: string,
  viewId: string
): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    await deleteView(ctx.orgId, viewId);
    revalidatePath(`/t/${typeSlug}`);
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
