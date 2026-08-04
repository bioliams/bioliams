"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import {
  createEntity,
  updateEntity,
  deleteEntity,
  ServiceError,
  type CreateEntityInput,
  type UpdateEntityInput,
} from "@/lib/services/entities";
import { type ActionResult, actionError } from "@/lib/action-result";

/** `value` carries the record's display ID on success. */
export async function createEntityAction(
  input: CreateEntityInput
): Promise<ActionResult<string>> {
  const ctx = await requireOrg();
  try {
    const row = await createEntity(ctx.orgId, ctx.userId, input);
    revalidatePath(`/t/${input.typeSlug}`);
    revalidatePath("/");
    return { ok: true, value: row.displayId };
  } catch (err) {
    return actionError(err);
  }
}

export async function updateEntityAction(
  entityId: string,
  typeSlug: string,
  input: UpdateEntityInput
): Promise<ActionResult<string>> {
  const ctx = await requireOrg();
  try {
    const row = await updateEntity(ctx.orgId, ctx.userId, entityId, input);
    revalidatePath(`/t/${typeSlug}`);
    revalidatePath(`/t/${typeSlug}/${row.displayId}`);
    revalidatePath("/locations");
    return { ok: true, value: row.displayId };
  } catch (err) {
    return actionError(err);
  }
}

export async function deleteEntityAction(
  entityId: string,
  typeSlug: string
): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    await deleteEntity(ctx.orgId, ctx.userId, entityId);
    revalidatePath(`/t/${typeSlug}`);
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

/** Bulk create from a parsed CSV. Reports per-row errors without aborting the import. */
export async function importEntitiesAction(
  typeSlug: string,
  rows: { name: string; data: Record<string, unknown> }[]
): Promise<{ created: number; failures: { row: number; message: string }[] }> {
  const ctx = await requireOrg();
  const failures: { row: number; message: string }[] = [];
  let created = 0;

  for (const [i, row] of rows.entries()) {
    try {
      await createEntity(ctx.orgId, ctx.userId, { typeSlug, name: row.name, data: row.data });
      created++;
    } catch (err) {
      const detail =
        err instanceof ServiceError && err.fieldErrors
          ? Object.entries(err.fieldErrors)
              .map(([k, v]) => `${k}: ${v}`)
              .join("; ")
          : err instanceof Error
            ? err.message
            : "Unknown error";
      failures.push({ row: i + 2, message: detail }); // +2 = header row + 1-indexed
    }
  }
  revalidatePath(`/t/${typeSlug}`);
  return { created, failures };
}
