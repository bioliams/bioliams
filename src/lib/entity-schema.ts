import { z } from "zod";
import type { FieldDef } from "@/db/schema/lims";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fieldToZod(field: FieldDef): z.ZodTypeAny {
  let schema: z.ZodTypeAny;
  switch (field.type) {
    case "text":
      schema = z.string().max(10_000);
      break;
    case "number":
      schema = z.coerce.number().finite();
      break;
    case "date":
      schema = z.string().regex(DATE_RE, "Expected YYYY-MM-DD");
      break;
    case "select":
      schema =
        field.options && field.options.length > 0
          ? z.enum(field.options as [string, ...string[]])
          : z.string();
      break;
    case "multiselect": {
      const item =
        field.options && field.options.length > 0
          ? z.enum(field.options as [string, ...string[]])
          : z.string();
      schema = z.array(item);
      break;
    }
    case "boolean":
      schema = z.coerce.boolean();
      break;
    case "entity-link":
    case "user":
    case "file":
      schema = z.string(); // id reference
      break;
    default:
      schema = z.unknown();
  }
  if (!field.required) {
    schema = schema.nullish().or(z.literal(""));
  }
  return schema;
}

/**
 * Build a Zod object schema from an entity type's field definitions.
 * Unknown keys are stripped; required fields must be present and non-empty.
 */
export function buildEntitySchema(fields: FieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.key] = fieldToZod(field);
  }
  return z.object(shape);
}

/** Validate entity data; returns {data} or {errors} keyed by field. */
export function validateEntityData(fields: FieldDef[], data: Record<string, unknown>) {
  const result = buildEntitySchema(fields).safeParse(data);
  if (result.success) return { data: result.data as Record<string, unknown>, errors: null };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    errors[String(issue.path[0] ?? "_")] = issue.message;
  }
  return { data: null, errors };
}

/** A safe machine key from a human label, e.g. "Storage Temp (C)" -> "storage_temp_c". */
export function keyFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}
