import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { member } from "@/db/schema";
import { visibleProjectIds } from "@/lib/services/projects";

export interface OrgContext {
  userId: string;
  userName: string;
  userImage: string | null;
  orgId: string;
  role: string;
  /** Projects this member is confined to; empty means the whole lab. */
  projectIds: string[];
}

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Resolve the signed-in user's active organization, or redirect. */
export async function requireOrg(): Promise<OrgContext> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  let orgId = session.session.activeOrganizationId ?? null;

  if (!orgId) {
    // Fall back to the user's first membership.
    const memberships = await db
      .select()
      .from(member)
      .where(eq(member.userId, session.user.id))
      .limit(1);
    if (memberships.length === 0) redirect("/onboarding");
    orgId = memberships[0].organizationId;
    await auth.api.setActiveOrganization({
      headers: await headers(),
      body: { organizationId: orgId },
    });
  }

  const membership = await db
    .select()
    .from(member)
    .where(and(eq(member.userId, session.user.id), eq(member.organizationId, orgId)))
    .limit(1);
  if (membership.length === 0) redirect("/onboarding");

  return {
    userId: session.user.id,
    userName: session.user.name,
    userImage: session.user.image ?? null,
    orgId,
    role: membership[0].role,
    projectIds: await visibleProjectIds(orgId, session.user.id),
  };
}
