import Link from "next/link";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { entities, entityTypes, locations } from "@/db/schema";
import { requireOrg } from "@/lib/tenant";
import { qrSvg } from "@/lib/barcode";
import { Button } from "@/components/ui/button";
import { PrintButton } from "./print-button";

/**
 * A printable sheet of labels. Takes display IDs in the query string so any
 * page can link to it — one tube, or every aliquot a split just produced.
 */
export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const ctx = await requireOrg();
  const wanted = (ids ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const rows = wanted.length
    ? await db
        .select({
          displayId: entities.displayId,
          name: entities.name,
          typeName: entityTypes.name,
          locationName: locations.name,
        })
        .from(entities)
        .innerJoin(entityTypes, eq(entities.entityTypeId, entityTypes.id))
        .leftJoin(locations, eq(entities.locationId, locations.id))
        .where(
          and(
            eq(entities.organizationId, ctx.orgId),
            inArray(entities.displayId, wanted),
            isNull(entities.deletedAt)
          )
        )
        .orderBy(entities.displayId)
    : [];

  const labels = await Promise.all(
    rows.map(async (row) => ({ ...row, svg: await qrSvg(row.displayId, 96) }))
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-semibold">Labels</h1>
          <p className="text-sm text-muted-foreground">
            {labels.length} label{labels.length === 1 ? "" : "s"}. Scanning one opens that
            record — a phone camera is enough, there is nothing to install.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/">Done</Link>
          </Button>
          <PrintButton />
        </div>
      </div>

      {labels.length === 0 ? (
        <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
          Nothing to print. Open a record and choose “Print label”.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
          {labels.map((label) => (
            <div
              key={label.displayId}
              className="flex items-center gap-3 rounded-md border p-3 print:break-inside-avoid print:rounded-none"
            >
              <div
                className="shrink-0 [&>svg]:h-20 [&>svg]:w-20"
                dangerouslySetInnerHTML={{ __html: label.svg }}
              />
              <div className="min-w-0 text-xs leading-tight">
                <p className="font-mono font-semibold">{label.displayId}</p>
                <p className="truncate font-medium">{label.name}</p>
                <p className="truncate text-muted-foreground">{label.typeName}</p>
                {label.locationName && (
                  <p className="truncate text-muted-foreground">{label.locationName}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
