import type { FieldDef } from "@/db/schema/lims";

/**
 * Human-readable rendering of a stored field value. Lives outside the client
 * component so server components can call it directly.
 */
export function formatFieldValue(field: FieldDef, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.type === "boolean") return value ? "Yes" : "No";
  if (field.type === "multiselect" && Array.isArray(value)) return value.join(", ");
  if (field.type === "number" && field.unit) return `${value} ${field.unit}`;
  return String(value);
}
