import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth";

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "boolean"
  | "entity-link"
  | "user"
  | "file";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[]; // for select / multiselect
  unit?: string; // for number
  linkedTypeSlug?: string; // for entity-link
}

const id = (name = "id") =>
  text(name)
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const orgId = () =>
  text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" });

export const entityTypes = pgTable(
  "entity_types",
  {
    id: id(),
    organizationId: orgId(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    icon: text("icon"),
    color: text("color"),
    prefix: text("prefix").notNull(), // display-ID prefix, e.g. "SMP"
    counter: integer("counter").notNull().default(0),
    fields: jsonb("fields").$type<FieldDef[]>().notNull().default([]),
    isInventory: boolean("is_inventory").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("entity_types_org_slug_idx").on(t.organizationId, t.slug)]
);

export const locations = pgTable(
  "locations",
  {
    id: id(),
    organizationId: orgId(),
    parentId: text("parent_id"),
    name: text("name").notNull(),
    kind: text("kind", {
      enum: ["site", "room", "freezer", "shelf", "rack", "box"],
    }).notNull(),
    gridRows: integer("grid_rows"),
    gridCols: integer("grid_cols"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("locations_org_idx").on(t.organizationId), index("locations_parent_idx").on(t.parentId)]
);

export const entities = pgTable(
  "entities",
  {
    id: id(),
    organizationId: orgId(),
    entityTypeId: text("entity_type_id")
      .notNull()
      .references(() => entityTypes.id, { onDelete: "cascade" }),
    displayId: text("display_id").notNull(), // e.g. SMP-000123
    name: text("name").notNull(),
    status: text("status").notNull().default("active"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    locationId: text("location_id").references(() => locations.id, {
      onDelete: "set null",
    }),
    positionRow: integer("position_row"),
    positionCol: integer("position_col"),
    parentId: text("parent_id"),
    createdBy: text("created_by").references(() => user.id),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("entities_org_display_idx").on(t.organizationId, t.displayId),
    index("entities_org_type_idx").on(t.organizationId, t.entityTypeId),
    index("entities_location_idx").on(t.locationId),
    index("entities_parent_idx").on(t.parentId),
  ]
);

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: id(),
    organizationId: orgId(),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" })
      .unique(),
    quantity: numeric("quantity").notNull().default("0"),
    unit: text("unit").notNull().default("units"),
    minThreshold: numeric("min_threshold"),
    lot: text("lot"),
    expiresAt: timestamp("expires_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("inventory_org_idx").on(t.organizationId)]
);

/**
 * Every movement of stock, kept as an append-only history.
 *
 * `inventory_items.quantity` is the current level; this is how it got there.
 * A bare quantity can answer "how much is left" but never "who used the last of
 * it, and when" — which is the question a lab actually asks.
 */
export const inventoryEvents = pgTable(
  "inventory_events",
  {
    id: id(),
    organizationId: orgId(),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["consume", "receive", "adjust", "split"] }).notNull(),
    delta: numeric("delta").notNull(), // signed: negative for consumption
    quantityAfter: numeric("quantity_after").notNull(),
    unit: text("unit").notNull(),
    actorId: text("actor_id").references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("inventory_events_org_created_idx").on(t.organizationId, t.createdAt),
    index("inventory_events_entity_idx").on(t.entityId),
  ]
);

/**
 * A named search: "my cell lines", "everything low in the -80".
 *
 * Saved for the whole lab rather than per person — the useful views in a lab
 * are shared conventions, and a colleague asking "how do you find X?" should be
 * answerable with "it's in the views list".
 */
export const savedViews = pgTable(
  "saved_views",
  {
    id: id(),
    organizationId: orgId(),
    typeSlug: text("type_slug").notNull(),
    name: text("name").notNull(),
    query: jsonb("query").$type<Record<string, string>>().notNull().default({}),
    createdBy: text("created_by").references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("saved_views_org_type_idx").on(t.organizationId, t.typeSlug)]
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    organizationId: orgId(),
    actorId: text("actor_id").references(() => user.id),
    action: text("action").notNull(), // e.g. entity.create, entity.move
    targetKind: text("target_kind").notNull(), // entity | entity_type | location | inventory | api_key
    targetId: text("target_id").notNull(),
    targetLabel: text("target_label"),
    diff: jsonb("diff").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_org_created_idx").on(t.organizationId, t.createdAt),
    index("audit_target_idx").on(t.targetKind, t.targetId),
  ]
);

export const attachments = pgTable(
  "attachments",
  {
    id: id(),
    organizationId: orgId(),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storagePath: text("storage_path").notNull(),
    uploadedBy: text("uploaded_by").references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("attachments_entity_idx").on(t.entityId)]
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: id(),
    organizationId: orgId(),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    keyPrefix: text("key_prefix").notNull(), // first chars shown in UI
    createdBy: text("created_by").references(() => user.id),
    lastUsedAt: timestamp("last_used_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("api_keys_org_idx").on(t.organizationId)]
);
