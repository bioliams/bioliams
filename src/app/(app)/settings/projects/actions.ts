"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { requireCan } from "@/lib/permissions";
import {
  createProject,
  deleteProject,
  setProjectMember,
  setEntityProject,
} from "@/lib/services/projects";
import { type ActionResult, actionError } from "@/lib/action-result";

export async function createProjectAction(
  name: string,
  description?: string
): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "members:manage");
    await createProject(ctx.orgId, ctx.userId, { name, description });
    revalidatePath("/settings/projects");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "members:manage");
    await deleteProject(ctx.orgId, ctx.userId, projectId);
    revalidatePath("/settings/projects");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

export async function setProjectMemberAction(
  projectId: string,
  userId: string,
  member: boolean
): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "members:manage");
    await setProjectMember(ctx.orgId, ctx.userId, projectId, userId, member);
    revalidatePath("/settings/projects");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

export async function setEntityProjectAction(
  entityId: string,
  slug: string,
  displayId: string,
  projectId: string | null
): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "records:write");
    await setEntityProject(ctx.orgId, ctx.userId, entityId, projectId);
    revalidatePath(`/t/${slug}/${displayId}`);
    revalidatePath(`/t/${slug}`);
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
