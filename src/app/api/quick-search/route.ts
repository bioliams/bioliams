import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { member } from "@/db/schema";
import { listEntities } from "@/lib/services/entities";
import { visibleProjectIds } from "@/lib/services/projects";

/**
 * Powers the command palette: the few best record matches, fast.
 * Session-authed and project-scoped exactly like every page read.
 */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ results: [] }, { status: 401 });

  const orgId = session.session.activeOrganizationId;
  if (!orgId) return NextResponse.json({ results: [] });

  const [membership] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.organizationId, orgId), eq(member.userId, session.user.id)))
    .limit(1);
  if (!membership) return NextResponse.json({ results: [] }, { status: 403 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const { rows } = await listEntities(orgId, {
    search: q,
    limit: 8,
    projectIds: await visibleProjectIds(orgId, session.user.id),
  });

  return NextResponse.json({
    results: rows.map(({ entity, typeName, typeSlug, locationName }) => ({
      displayId: entity.displayId,
      name: entity.name,
      typeName,
      href: `/t/${typeSlug}/${entity.displayId}`,
      location: locationName,
    })),
  });
}
