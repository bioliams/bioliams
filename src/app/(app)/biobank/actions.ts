"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { can, requireCan } from "@/lib/permissions";
import {
  createBiobankRequest,
  setBiobankStatus,
  type BiobankRequestInput,
  type TakeEntry,
} from "@/lib/services/biobank";
import { BIOBANK_STATUSES, type BiobankStatus } from "@/lib/biobank-flow";
import { type ActionResult, actionError } from "@/lib/action-result";

export async function createBiobankRequestAction(input: BiobankRequestInput): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    // Anyone who works with records can ask; viewers are read-only.
    requireCan(ctx.role, "records:write");
    await createBiobankRequest(ctx.orgId, ctx.userId, ctx.projectIds, input);
    revalidatePath("/biobank");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

export async function setBiobankStatusAction(
  id: string,
  status: BiobankStatus,
  response?: string | null,
  take?: TakeEntry[]
): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    if (!BIOBANK_STATUSES.includes(status)) throw new Error("Unknown status");
    // Which moves are allowed (biobank vs. the requester) is decided in the
    // service from the request itself — this only says which hats they wear.
    await setBiobankStatus(
      ctx.orgId,
      { id: ctx.userId, canManage: can(ctx.role, "biobank:manage") },
      id,
      status,
      response,
      take
    );
    revalidatePath("/biobank");
    // Marking ready can take stock, so the stock pages are stale too.
    if (status === "ready") {
      revalidatePath("/inventory");
      revalidatePath("/inventory/use");
      revalidatePath("/");
    }
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

