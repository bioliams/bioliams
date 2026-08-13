import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { entities, entityTypes } from "@/db/schema";
import { requireOrg } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Where every scanned label lands.
 *
 * Labels carry `/s/<display id>` rather than a record's internal id, so a code
 * printed today still resolves after a restore into a fresh database, and the
 * number under the QR is the same one a person reads out loud.
 */
export default async function ScanPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ctx = await requireOrg();

  const [match] = await db
    .select({ displayId: entities.displayId, slug: entityTypes.slug })
    .from(entities)
    .innerJoin(entityTypes, eq(entities.entityTypeId, entityTypes.id))
    .where(
      and(
        eq(entities.organizationId, ctx.orgId),
        eq(entities.displayId, decodeURIComponent(code).trim().toUpperCase()),
        isNull(entities.deletedAt)
      )
    )
    .limit(1);

  if (match) redirect(`/t/${match.slug}/${match.displayId}`);

  // Deliberately not a 404 page: someone is standing at a freezer holding a
  // tube, and "which lab is this label from?" is the useful answer.
  return (
    <div className="mx-auto max-w-md space-y-3 py-16 text-center">
      <h1 className="text-xl font-semibold">No record for that label</h1>
      <p className="text-sm text-muted-foreground">
        Nothing in this lab has the ID <span className="font-mono">{code}</span>. The label may
        belong to another lab, or the record may have been archived.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
