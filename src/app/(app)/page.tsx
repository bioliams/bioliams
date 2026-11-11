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
import { getT } from "@/i18n/server";
import { formatDate } from "@/i18n/format";
import { intlTag, type Locale } from "@/i18n/config";

function weekLabel(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(intlTag(locale), { month: "short", day: "numeric" }).format(
    new Date(iso)
  );
}

export default async function DashboardPage() {
  const ctx = await requireOrg();
  const t = await getT();

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

  const stats = [
    { label: t("dashboard.stats.records"), value: totals.records, href: "/search" },
    { label: t("dashboard.stats.lowStock"), value: totals.lowStock, href: "/inventory" },
    { label: t("dashboard.stats.openOrders"), value: totals.openOrders, href: "/purchasing" },
    { label: t("dashboard.stats.checkedOut"), value: totals.checkedOut, href: null },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("dashboard.title")} description={t("dashboard.description")} />

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
              {t("dashboard.noTypes")}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.lowStock")}</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.allAbove")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lowStock.map(({ item, entity, typeSlug }) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <Link href={`/t/${typeSlug}/${entity.displayId}`} className="hover:underline">
                      {entity.name}
                    </Link>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge variant="destructive">
                        {t("dashboard.left", { quantity: item.quantity, unit: item.unit })}
                      </Badge>
                      <Link
                        href="/purchasing"
                        className="text-xs text-primary hover:underline"
                      >
                        {t("dashboard.requestMore")}
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
            <CardTitle className="text-base">{t("dashboard.recent")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.nothingYet")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recent.map(({ entry, actorName, actorImage }) => (
                  <li key={entry.id} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{actionLabel(entry.action, t)}</span>
                      {" — "}
                      <span className="text-muted-foreground">
                        {entry.targetLabel ?? entry.targetId}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <ActorChip name={actorName} image={actorImage} /> ·{" "}
                      {formatDate(entry.createdAt, t.locale)}
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
        title={t("dashboard.analytics")}
        description={t("dashboard.analyticsDesc")}
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
            <CardTitle className="text-base">{t("dashboard.registered")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={regs.map((r) => ({ label: weekLabel(r.week, t.locale), value: r.count }))}
              emptyText={t("dashboard.noData")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.flow")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DualBarChart
              data={flow.map((f) => ({
                label: weekLabel(f.week, t.locale),
                a: f.consumed,
                b: f.received,
              }))}
              seriesLabels={[t("dashboard.used"), t("dashboard.received")]}
              emptyText={t("dashboard.noData")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.mostUsed")}</CardTitle>
          </CardHeader>
          <CardContent>
            <HBarList
              data={topItems.map((item) => ({
                label: item.name,
                value: item.uses,
                hint: `${item.total} ${item.unit}`,
              }))}
              formatValue={(v) => t("dashboard.uses", { count: v })}
              emptyText={t("dashboard.noData")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.byMember")}</CardTitle>
          </CardHeader>
          <CardContent>
            <HBarList
              data={byMember.map((m) => ({ label: m.name, value: m.events }))}
              formatValue={(v) => t("dashboard.events", { count: v })}
              emptyText={t("dashboard.noData")}
            />
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("dashboard.footnote")}
      </p>
    </div>
    </div>
  );
}
