"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { requireCan } from "@/lib/permissions";
import { createLocation, deleteLocation, type LocationKind } from "@/lib/services/locations";
import { updateEntity } from "@/lib/services/entities";
import { type ActionResult, actionError } from "@/lib/action-result";

export async function createLocationAction(input: {
  name: string;
  kind: LocationKind;
  parentId?: string | null;
  gridRows?: number | null;
  gridCols?: number | null;
}): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "storage:write");
    await createLocation(ctx.orgId, ctx.userId, input);
    revalidatePath("/locations");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

export async function deleteLocationAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "storage:write");
    await deleteLocation(ctx.orgId, ctx.userId, id);
    revalidatePath("/locations");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

/** Place or clear an entity's position within a box. */
export async function assignPositionAction(
  entityId: string,
  locationId: string | null,
  positionRow: number | null,
  positionCol: number | null
): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "storage:write");
    await updateEntity(ctx.orgId, ctx.userId, entityId, { locationId, positionRow, positionCol });
    revalidatePath("/locations");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
