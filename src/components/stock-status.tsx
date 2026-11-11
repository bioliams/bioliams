import { Badge } from "@/components/ui/badge";
import { ALERT_LABELS, daysUntil, evaluateStock, type StockState } from "@/lib/stock-alerts";

/** The alarms an item would raise right now, as badges; "OK" when none. */
export function StockStatus({ item }: { item: StockState }) {
  const alerts = evaluateStock(item);
  if (alerts.length === 0) {
    const uncounted = item.hasMovements === false && Number(item.quantity) <= 0;
    return uncounted ? (
      <Badge variant="outline" className="text-muted-foreground" title="No stock has been recorded for this item">
        Not stocked
      </Badge>
    ) : (
      <Badge variant="secondary">OK</Badge>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {alerts.map((a) => {
        const label =
          a.kind === "expiring" && item.expiresAt
            ? (() => {
                const d = daysUntil(item.expiresAt);
                return d === 0 ? "Expires today" : `Expires in ${d}d`;
              })()
            : ALERT_LABELS[a.kind];
        return (
          <Badge
            key={a.kind}
            variant={a.kind === "low_stock" || a.kind === "expiring" ? "outline" : "destructive"}
            className={
              a.kind === "low_stock" || a.kind === "expiring"
                ? "border-amber-500/60 text-amber-700 dark:text-amber-400"
                : undefined
            }
            title={a.message}
          >
            {label}
          </Badge>
        );
      })}
    </div>
  );
}
