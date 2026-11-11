/**
 * Turns an audit entry's stored diff into one line a person can read.
 *
 * The log is only useful if you can see *what* changed without opening JSON, so
 * every action that records a diff gets a summary here.
 */

import { createT, type T } from "@/i18n/translate";
import { en } from "@/i18n/messages/en";

const englishT = createT("en", en);

type Diff = Record<string, unknown> | null | undefined;

/** What happened, in words — "entity.split" belongs in a log file, not a UI. */
export function actionLabel(action: string, t: T = englishT): string {
  return action in en.audit.actions
    ? t(`audit.actions.${action as keyof typeof en.audit.actions}`)
    : action;
}

const MAX_FIELDS = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function show(value: unknown, t: T = englishT): string {
  if (value === null || value === undefined || value === "") return t("audit.empty");
  if (Array.isArray(value)) return value.length === 0 ? t("audit.empty") : value.join(", ");
  if (isRecord(value)) return JSON.stringify(value);
  return String(value);
}

/** Flatten `{name, data: {volume}}` to `{name, volume}` so nested field values compare. */
function flatten(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (key === "data" && isRecord(v)) {
      for (const [k2, v2] of Object.entries(v)) out[k2] = v2;
    } else {
      out[key] = v;
    }
  }
  return out;
}

function changedFields(diff: Diff, t: T): string[] {
  const before = flatten(diff?.before);
  const after = flatten(diff?.after);
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: string[] = [];
  for (const key of keys) {
    const a = before[key];
    const b = after[key];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    changes.push(`${key}: ${show(a, t)} ${t("audit.arrow")} ${show(b, t)}`);
  }
  return changes;
}

function truncate(changes: string[], t: T): string {
  if (changes.length === 0) return "";
  const shown = changes.slice(0, MAX_FIELDS).join(" · ");
  const rest = changes.length - MAX_FIELDS;
  return rest > 0 ? `${shown} · ${t("audit.more", { count: rest })}` : shown;
}

export function summariseAudit(action: string, diff: Diff, t: T = englishT): string {
  if (!diff) return "";
  const v = (value: unknown) => show(value, t);

  switch (action) {
    case "inventory.consume": {
      const base = t("audit.used", { used: v(diff.used), remaining: v(diff.remaining) });
      return diff.note ? `${base} · ${v(diff.note)}` : base;
    }
    case "inventory.discard":
    case "inventory.return": {
      const parts = [v(diff.amount), t("audit.left", { amount: v(diff.remaining) })];
      if (diff.reason) parts.push(t("audit.reason", { reason: v(diff.reason) }));
      return parts.join(" · ");
    }
    case "entity.transfer": {
      return diff.note ? `${v(diff.moved)} · ${v(diff.note)}` : v(diff.moved);
    }
    case "entity.checkout":
      return diff.note ? t("audit.takenOutNote", { note: v(diff.note) }) : t("audit.takenOut");
    case "entity.checkin":
      return t("audit.broughtBack");
    case "inventory.update": {
      const before = isRecord(diff.before) ? diff.before : {};
      const after = isRecord(diff.after) ? diff.after : {};
      if (before.quantity === after.quantity) return truncate(changedFields(diff, t), t);
      return t("audit.quantityChange", {
        from: `${v(before.quantity)} ${v(before.unit)}`,
        to: `${v(after.quantity)} ${v(after.unit)}`,
      });
    }
    case "entity.split": {
      const parts = [t("audit.split", { count: v(diff.aliquots), each: v(diff.each) })];
      if (diff.remaining !== undefined) parts.push(t("audit.left", { amount: v(diff.remaining) }));
      return parts.join(" · ");
    }
    case "entity.create":
    case "biobank.request": {
      const after = flatten(diff.after);
      const fields = Object.entries(after)
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([k, value]) => `${k}: ${v(value)}`);
      return truncate(fields, t);
    }
    default:
      return truncate(changedFields(diff, t), t);
  }
}
