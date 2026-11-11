import { Badge } from "@/components/ui/badge";
import { daysUntil, evaluateStock, type StockState } from "@/lib/stock-alerts";
import type { T } from "@/i18n/translate";

/** The alarms an item would raise right now, as badges; "OK" when none. */
export function StockStatus({ item, t }: { item: StockState; t: T }) {
  const alerts = evaluateStock(item, new Date(), t);
  if (alerts.length === 0) {
    const uncounted = item.hasMovements === false && Number(item.quantity) <= 0;
    return uncounted ? (
      <Badge variant="outline" className="text-muted-foreground" title={t("alerts.notStockedTitle")}>
        {t("alerts.notStocked")}
      </Badge>
    ) : (
      <Badge variant="secondary">{t("alerts.ok")}</Badge>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {alerts.map((a) => {
        const label =
          a.kind === "expiring" && item.expiresAt
            ? (() => {
                const d = daysUntil(item.expiresAt);
                return d === 0
                  ? t("alerts.badgeExpiresToday")
                  : t("alerts.badgeExpiresIn", { count: d });
              })()
            : t(`alerts.kinds.${a.kind}`);
        const soft = a.kind === "low_stock" || a.kind === "expiring";
        return (
          <Badge
            key={a.kind}
            variant={soft ? "outline" : "destructive"}
            className={soft ? "border-amber-500/60 text-amber-700 dark:text-amber-400" : undefined}
            title={a.message}
          >
            {label}
          </Badge>
        );
      })}
    </div>
  );
}
