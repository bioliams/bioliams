/**
 * Turns an audit entry's stored diff into one line a person can read.
 *
 * The log is only useful if you can see *what* changed without opening JSON, so
 * every action that records a diff gets a summary here.
 */

type Diff = Record<string, unknown> | null | undefined;

const MAX_FIELDS = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "empty";
  if (Array.isArray(value)) return value.length === 0 ? "empty" : value.join(", ");
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

function changedFields(diff: Diff): string[] {
  const before = flatten(diff?.before);
  const after = flatten(diff?.after);
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: string[] = [];
  for (const key of keys) {
    const a = before[key];
    const b = after[key];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    changes.push(`${key}: ${show(a)} → ${show(b)}`);
  }
  return changes;
}

function truncate(changes: string[]): string {
  if (changes.length === 0) return "";
  const shown = changes.slice(0, MAX_FIELDS).join(" · ");
  const rest = changes.length - MAX_FIELDS;
  return rest > 0 ? `${shown} · +${rest} more` : shown;
}

export function summariseAudit(action: string, diff: Diff): string {
  if (!diff) return "";

  switch (action) {
    case "inventory.consume": {
      const used = show(diff.used);
      const remaining = show(diff.remaining);
      return `Used ${used} · ${remaining} left`;
    }
    case "inventory.discard":
    case "inventory.return": {
      const parts = [`${show(diff.amount)}`, `${show(diff.remaining)} left`];
      if (diff.reason) parts.push(`reason: ${show(diff.reason)}`);
      return parts.join(" · ");
    }
    case "entity.transfer": {
      return diff.note ? `${show(diff.moved)} · ${show(diff.note)}` : `${show(diff.moved)}`;
    }
    case "entity.checkout":
      return diff.note ? `Taken out — ${show(diff.note)}` : "Taken out";
    case "entity.checkin":
      return "Brought back";
    case "inventory.update": {
      const before = isRecord(diff.before) ? diff.before : {};
      const after = isRecord(diff.after) ? diff.after : {};
      if (before.quantity === after.quantity) return "";
      return `Quantity ${show(before.quantity)} ${show(before.unit)} → ${show(after.quantity)} ${show(after.unit)}`;
    }
    case "entity.split": {
      const parts = [`Split into ${show(diff.aliquots)} aliquots of ${show(diff.each)}`];
      if (diff.remaining !== undefined) parts.push(`${show(diff.remaining)} left`);
      return parts.join(" · ");
    }
    case "entity.create": {
      const after = flatten(diff.after);
      const fields = Object.entries(after)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => `${k}: ${show(v)}`);
      return truncate(fields);
    }
    case "entity.move":
    case "entity.update":
    case "entity_type.update":
      return truncate(changedFields(diff));
    default:
      return truncate(changedFields(diff));
  }
}
