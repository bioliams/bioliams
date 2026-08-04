"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { saveAttachment, deleteAttachment } from "@/lib/services/attachments";
import { getEntity } from "@/lib/services/entities";
import { type ActionResult, actionError } from "@/lib/action-result";

export async function uploadAttachmentAction(
  entityId: string,
  typeSlug: string,
  displayId: string,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    await getEntity(ctx.orgId, entityId); // ensures the entity belongs to this org
    const file = formData.get("file");
    if (!(file instanceof File)) return { error: "No file provided" };
    await saveAttachment(ctx.orgId, ctx.userId, entityId, file);
    revalidatePath(`/t/${typeSlug}/${displayId}`);
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

export async function deleteAttachmentAction(
  id: string,
  typeSlug: string,
  displayId: string
): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    await deleteAttachment(ctx.orgId, ctx.userId, id);
    revalidatePath(`/t/${typeSlug}/${displayId}`);
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
