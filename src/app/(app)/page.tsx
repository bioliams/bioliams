import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { getTypeCounts } from "@/lib/services/entity-types";
import { listLowStock } from "@/lib/services/inventory";
import { listAudit } from "@/lib/services/audit";
import {
  registrationsByWeek,
  stockFlowByWeek,
  mostUsedItems,
  activityByMember,
  summaryNumbers,
} from "@/lib/services/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { actionLabel } from "@/lib/audit-summary";
import { PageHeader } from "@/components/page-header";
import { ActorChip } from "@/components/actor-chip";
import { BarChart, DualBarChart, HBarList } from "@/components/charts";

function weekLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function DashboardPage() {
  const ctx = await requireOrg();

  const [counts, lowStock, recent] = await Promise.all([
    getTypeCounts(ctx.orgId),
    listLowStock(ctx.orgId),
    listAudit(ctx.orgId, { limit: 15 }),
  ]);

  const [regs, flow, topItems, byMember, totals] = await Promise.all([
    registrationsByWeek(ctx.orgId),
    stockFlowByWeek(ctx.orgId),
    mostUsedItems(ctx.orgId),
    activityByMember(ctx.orgId),
    summaryNumbers(ctx.orgId),
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
                {recent.map(({ entry, actorName, actorImage }) => (
                  <li key={entry.id} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{actionLabel(entry.action)}</span>
                      {" — "}
                      <span className="text-muted-foreground">
                        {entry.targetLabel ?? entry.targetId}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <ActorChip name={actorName} image={actorImage} /> ·{" "}
                      {entry.createdAt.toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
       <div className="space-y-4">
      <PageHeader
        title="Analytics"
        description="What the lab registers, uses and orders — the last twelve weeks."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const body = (
            <Card
              key={stat.label}
              className={stat.href ? "transition-colors hover:border-primary/40" : ""}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{stat.value}</p>
              </CardContent>
            </Card>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href}>
              {body}
            </Link>
          ) : (
            body
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Records registered per week</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={regs.map((r) => ({ label: weekLabel(r.week), value: r.count }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock used vs. received per week</CardTitle>
          </CardHeader>
          <CardContent>
            <DualBarChart
              data={flow.map((f) => ({ label: weekLabel(f.week), a: f.consumed, b: f.received }))}
              seriesLabels={["Used", "Received"]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most-used items</CardTitle>
          </CardHeader>
          <CardContent>
            <HBarList
              data={topItems.map((t) => ({
                label: t.name,
                value: t.uses,
                hint: `${t.total} ${t.unit}`,
              }))}
              formatValue={(v) => `${v} use${v === 1 ? "" : "s"}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock activity by member</CardTitle>
          </CardHeader>
          <CardContent>
            <HBarList
              data={byMember.map((m) => ({ label: m.name, value: m.events }))}
              formatValue={(v) => `${v} event${v === 1 ? "" : "s"}`}
            />
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Numbers come from the same events the audit log records — nothing is sampled or
        estimated. Export any registry to Excel for deeper analysis.
      </p>
    </div>
    </div>
  );
}
