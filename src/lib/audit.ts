import "server-only";
import { db, type Db } from "@/db";
import { auditLog } from "@/db/schema";

interface AuditEntry {
  orgId: string;
  actorId: string | null;
  action: string; // e.g. "entity.create"
  targetKind: "entity" | "entity_type" | "location" | "inventory" | "api_key" | "attachment";
  targetId: string;
  targetLabel?: string;
  diff?: Record<string, unknown>;
}

/** Append an audit-log entry. Pass `tx` to include it in a transaction. */
export async function logAudit(entry: AuditEntry, tx: Db | Parameters<Parameters<Db["transaction"]>[0]>[0] = db) {
  await tx.insert(auditLog).values({
    organizationId: entry.orgId,
    actorId: entry.actorId,
    action: entry.action,
    targetKind: entry.targetKind,
    targetId: entry.targetId,
    targetLabel: entry.targetLabel,
    diff: entry.diff,
  });
}
