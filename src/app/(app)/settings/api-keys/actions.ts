"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { createApiKey, revokeApiKey } from "@/lib/services/api-keys";
import { type ActionResult, actionError } from "@/lib/action-result";

export async function createApiKeyAction(name: string): Promise<ActionResult<string>> {
  const ctx = await requireOrg();
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return { error: "Only owners and admins can create API keys" };
  }
  try {
    const { plaintext } = await createApiKey(ctx.orgId, ctx.userId, name);
    revalidatePath("/settings/api-keys");
    return { ok: true, value: plaintext };
  } catch (err) {
    return actionError(err);
  }
}

export async function revokeApiKeyAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return { error: "Only owners and admins can revoke API keys" };
  }
  try {
    await revokeApiKey(ctx.orgId, ctx.userId, id);
    revalidatePath("/settings/api-keys");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
