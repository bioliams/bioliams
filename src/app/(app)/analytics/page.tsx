import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import {
  registrationsByWeek,
  stockFlowByWeek,
  mostUsedItems,
  activityByMember,
  summaryNumbers,
} from "@/lib/services/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, DualBarChart, HBarList } from "@/components/charts";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Analytics · BioLIMS" };

function weekLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function AnalyticsPage() {
  const ctx = await requireOrg();
  const [regs, flow, topItems, byMember, totals] = await Promise.all([
    registrationsByWeek(ctx.orgId),
    stockFlowByWeek(ctx.orgId),
    mostUsedItems(ctx.orgId),
    activityByMember(ctx.orgId),
    summaryNumbers(ctx.orgId),
  ]);

  const stats = [
    { label: "Records", value: totals.records, href: "/search" },
    { label: "Low stock", value: totals.lowStock, href: "/inventory" },
    { label: "Open orders", value: totals.openOrders, href: "/purchasing" },
    { label: "Checked out", value: totals.checkedOut, href: null },
  ];

  return (
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
  );
}
