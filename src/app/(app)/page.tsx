import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { getTypeCounts } from "@/lib/services/entity-types";
import { listLowStock } from "@/lib/services/inventory";
import { listAudit } from "@/lib/services/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { actionLabel } from "@/lib/audit-summary";
import { PageHeader } from "@/components/page-header";

export default async function DashboardPage() {
  const ctx = await requireOrg();
  const [counts, lowStock, recent] = await Promise.all([
    getTypeCounts(ctx.orgId),
    listLowStock(ctx.orgId),
    listAudit(ctx.orgId, { limit: 15 }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="What needs attention, and what just happened." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {counts.map((c) => (
          <Link key={c.typeId} href={`/t/${c.slug}`}>
            <Card className="transition-colors hover:border-primary/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ backgroundColor: c.color ?? "#64748b" }}
                  />
                  {c.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{c.total}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {counts.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-4">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No record types yet. Create one in Settings → Record types.
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Low stock</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Everything is above threshold.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lowStock.map(({ item, entity, typeSlug }) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <Link href={`/t/${typeSlug}/${entity.displayId}`} className="hover:underline">
                      {entity.name}
                    </Link>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge variant="destructive">
                        {item.quantity} {item.unit} left
                      </Badge>
                      <Link
                        href="/purchasing"
                        className="text-xs text-primary hover:underline"
                      >
                        Request more
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing has happened yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recent.map(({ entry, actorName }) => (
                  <li key={entry.id} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{actionLabel(entry.action)}</span>
                      {" — "}
                      <span className="text-muted-foreground">
                        {entry.targetLabel ?? entry.targetId}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {actorName ?? "system"} · {entry.createdAt.toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
