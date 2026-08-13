"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { member } from "@/db/schema";
import { requireOrg } from "@/lib/tenant";
import { requireCan, ROLES, type Role } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { ServiceError } from "@/lib/service-error";
import { type ActionResult, actionError } from "@/lib/action-result";

export async function setMemberRoleAction(
  memberId: string,
  role: string
): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "members:manage");
    if (!ROLES.includes(role as Role)) throw new ServiceError("Unknown role", 400);

    const [target] = await db
      .select()
      .from(member)
      .where(and(eq(member.organizationId, ctx.orgId), eq(member.id, memberId)))
      .limit(1);
    if (!target) throw new ServiceError("Member not found", 404);

    // Locking yourself out of your own lab is not a recoverable mistake.
    if (target.userId === ctx.userId) {
      throw new ServiceError("You can't change your own role — ask another admin", 400);
    }
    if (target.role === "owner") {
      const others = await db
        .select({ id: member.id })
        .from(member)
        .where(
          and(
            eq(member.organizationId, ctx.orgId),
            eq(member.role, "owner"),
            ne(member.id, memberId)
          )
        );
      if (others.length === 0) throw new ServiceError("A lab needs at least one owner", 400);
    }

    await db
      .update(member)
      .set({ role })
      .where(and(eq(member.organizationId, ctx.orgId), eq(member.id, memberId)));

    await logAudit({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: "member.role",
      targetKind: "member",
      targetId: memberId,
      diff: { before: { role: target.role }, after: { role } },
    });

    revalidatePath("/settings/members");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
