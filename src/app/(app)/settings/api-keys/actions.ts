"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { requireCan } from "@/lib/permissions";
import { createApiKey, revokeApiKey } from "@/lib/services/api-keys";
import { type ActionResult, actionError } from "@/lib/action-result";

export async function createApiKeyAction(name: string): Promise<ActionResult<string>> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "keys:manage");
    const { plaintext } = await createApiKey(ctx.orgId, ctx.userId, name);
    revalidatePath("/settings/api-keys");
    return { ok: true, value: plaintext };
  } catch (err) {
    return actionError(err);
  }
}

export async function revokeApiKeyAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "keys:manage");
    await revokeApiKey(ctx.orgId, ctx.userId, id);
    revalidatePath("/settings/api-keys");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
