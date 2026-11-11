import type { StockAlertKind } from "@/db/schema/lims";

/** How far ahead an expiry date starts raising an alarm. */
export const EXPIRY_WARNING_DAYS = 30;

const DAY = 24 * 60 * 60 * 1000;

export interface StockState {
  name: string;
  quantity: string;
  unit: string;
  minThreshold: string | null;
  zeroPoint: string;
  expiresAt: Date | null;
  /**
   * Whether stock was ever recorded against this item (any movement). A record
   * registered at the default 0 and never touched hasn't run out — nobody has
   * counted it yet — so it raises no stock alarm. Omit when unknown.
   */
  hasMovements?: boolean;
}

export interface StockAlert {
  kind: StockAlertKind;
  message: string;
}

/**
 * Whole days from today to the expiry date, by calendar date in UTC — the
 * date printed on the bottle is what counts, not the hour it was entered.
 * 0 means it expires today; negative means it already has.
 */
export function daysUntil(expiresAt: Date, now: Date = new Date()): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const day = Date.UTC(
    expiresAt.getUTCFullYear(),
    expiresAt.getUTCMonth(),
    expiresAt.getUTCDate()
  );
  return Math.round((day - today) / DAY);
}

/** Strip trailing zeros Postgres numerics carry: "2.500" → "2.5". */
function tidy(n: string) {
  return String(Number(n));
}

/**
 * Which alarms an item should have open right now.
 *
 * Stock and expiry are independent: a bottle can be both out of date and
 * nearly empty. Within each, only the worse state is raised — an item that is
 * out of stock is not also "low", and an expired one is not also "expiring".
 */
export function evaluateStock(item: StockState, now: Date = new Date()): StockAlert[] {
  const alerts: StockAlert[] = [];
  const qty = Number(item.quantity);
  const zero = Number(item.zeroPoint);

  const tracked = item.hasMovements !== false || qty > 0;

  if (!tracked) {
    // Never stocked: say nothing about levels.
  } else if (qty <= zero) {
    alerts.push({
      kind: "out_of_stock",
      message:
        zero > 0
          ? `${item.name} is out of stock — ${tidy(item.quantity)} ${item.unit} left, at or below its zero point of ${tidy(item.zeroPoint)} ${item.unit}`
          : `${item.name} is out of stock`,
    });
  } else if (item.minThreshold !== null && qty <= Number(item.minThreshold)) {
    alerts.push({
      kind: "low_stock",
      message: `${item.name} is running low — ${tidy(item.quantity)} ${item.unit} left (minimum ${tidy(item.minThreshold)} ${item.unit})`,
    });
  }

  if (item.expiresAt) {
    const days = daysUntil(item.expiresAt, now);
    const date = item.expiresAt.toISOString().slice(0, 10);
    if (days < 0) {
      alerts.push({ kind: "expired", message: `${item.name} expired on ${date}` });
    } else if (days <= EXPIRY_WARNING_DAYS) {
      alerts.push({
        kind: "expiring",
        message:
          days === 0
            ? `${item.name} expires today (${date})`
            : `${item.name} expires in ${days} day${days === 1 ? "" : "s"} (${date})`,
      });
    }
  }

  return alerts;
}

export const ALERT_LABELS: Record<StockAlertKind, string> = {
  expired: "Expired",
  expiring: "Expiring soon",
  out_of_stock: "Out of stock",
  low_stock: "Low stock",
};

/** Parse a YYYY-MM-DD form value into the stored midnight-UTC date. */
export function parseExpiryDate(value: string | null | undefined): Date | null {
  if (!value || !value.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return new Date(NaN);
  const d = new Date(`${value.trim()}T00:00:00Z`);
  // Reject dates JS rolls over, like 2026-02-31.
  return d.toISOString().slice(0, 10) === value.trim() ? d : new Date(NaN);
}

export function formatExpiryDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}
