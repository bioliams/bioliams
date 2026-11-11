import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { describeNotification, listNotifications } from "@/lib/services/notifications";
import { EXPIRY_WARNING_DAYS } from "@/lib/stock-alerts";
import { getT } from "@/i18n/server";
import { formatDateTime } from "@/i18n/format";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MarkAllReadButton, OpenAlarmLink } from "./notification-controls";

const SEVERE = new Set(["expired", "out_of_stock"]);

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const resolved = view === "resolved";
  const ctx = await requireOrg();
  const t = await getT();
  // The layout has already synced the alarms for this request.
  const rows = await listNotifications(ctx.orgId, ctx.userId, ctx.projectIds, {
    open: !resolved,
  });
  const unread = rows.filter((r) => !r.read).length;

  const counts = new Map<string, number>();
  if (!resolved) for (const r of rows) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("alerts.page.title")}
        description={t("alerts.page.description", { days: EXPIRY_WARNING_DAYS })}
        actions={!resolved && unread > 0 ? <MarkAllReadButton /> : undefined}
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/notifications"
            className={cn(
              "rounded-md px-3 py-1.5 hover:bg-muted",
              !resolved && "bg-muted font-medium"
            )}
          >
            {t("alerts.page.active")}
          </Link>
          <Link
            href="/notifications?view=resolved"
            className={cn(
              "rounded-md px-3 py-1.5 hover:bg-muted",
              resolved && "bg-muted font-medium"
            )}
          >
            {t("alerts.page.resolved")}
          </Link>
          {!resolved &&
            (["out_of_stock", "expired", "low_stock", "expiring"] as const).map(
              (k) =>
                counts.get(k) && (
                  <Badge key={k} variant={SEVERE.has(k) ? "destructive" : "outline"}>
                    {t("alerts.page.count", { count: counts.get(k)!, kind: t(`alerts.kinds.${k}`) })}
                  </Badge>
                )
            )}
        </div>
      </PageHeader>

      <div className="divide-y rounded-md border bg-card shadow-sm">
        {rows.map((n) => (
          <div
            key={n.id}
            className={cn("flex items-start gap-3 p-4", !n.read && !resolved && "bg-muted/40")}
          >
            <span
              className={cn(
                "mt-1.5 size-2 shrink-0 rounded-full",
                resolved ? "bg-muted-foreground/40" : SEVERE.has(n.kind) ? "bg-red-500" : "bg-amber-500"
              )}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={!resolved && SEVERE.has(n.kind) ? "destructive" : "outline"}
                  className="shrink-0"
                >
                  {t(`alerts.kinds.${n.kind}`)}
                </Badge>
                <OpenAlarmLink
                  id={n.id}
                  read={n.read}
                  href={`/t/${n.typeSlug}/${n.displayId}`}
                  className={cn("text-sm hover:underline", !n.read && !resolved && "font-medium")}
                >
                  {describeNotification(n, t)}
                </OpenAlarmLink>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">{n.displayId}</span> ·{" "}
                {t("alerts.page.raised", { when: formatDateTime(n.createdAt, t.locale) })}
                {n.resolvedAt && (
                  <> · {t("alerts.page.resolvedAt", { when: formatDateTime(n.resolvedAt, t.locale) })}</>
                )}
              </p>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {resolved
              ? t("alerts.page.noneResolved")
              : t("alerts.page.allClear")}
          </p>
        )}
      </div>
    </div>
  );
}
