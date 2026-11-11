"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { markRead } from "@/lib/services/notifications";
import { type ActionResult, actionError } from "@/lib/action-result";

/** Mark the given alarms read, or all of them when no ids are passed. */
export async function markReadAction(ids?: string[]): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    await markRead(ctx.orgId, ctx.userId, ctx.projectIds, ids);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
