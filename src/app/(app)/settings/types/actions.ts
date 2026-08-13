"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { requireCan } from "@/lib/permissions";
import type { FieldDef } from "@/db/schema/lims";
import {
  createEntityType,
  updateEntityType,
  deleteEntityType,
} from "@/lib/services/entity-types";
import { type ActionResult, actionError } from "@/lib/action-result";

export async function createEntityTypeAction(input: {
  name: string;
  prefix?: string;
  color?: string;
  isInventory?: boolean;
  fields?: Partial<FieldDef>[];
}): Promise<ActionResult<string>> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "schema:write");
    const row = await createEntityType(ctx.orgId, ctx.userId, input);
    revalidatePath("/settings/types");
    revalidatePath("/", "layout");
    return { ok: true, value: row.slug };
  } catch (err) {
    return actionError(err);
  }
}

export async function updateEntityTypeAction(
  typeId: string,
  input: { name?: string; color?: string; isInventory?: boolean; fields?: Partial<FieldDef>[] }
): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "schema:write");
    await updateEntityType(ctx.orgId, ctx.userId, typeId, input);
    revalidatePath("/settings/types");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

export async function deleteEntityTypeAction(typeId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "schema:write");
    await deleteEntityType(ctx.orgId, ctx.userId, typeId);
    revalidatePath("/settings/types");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
