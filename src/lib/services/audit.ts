import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, user } from "@/db/schema";

export async function listAudit(
  orgId: string,
  opts: { targetId?: string; limit?: number } = {}
) {
  const conditions = [eq(auditLog.organizationId, orgId)];
  if (opts.targetId) conditions.push(eq(auditLog.targetId, opts.targetId));

  return db
    .select({
      entry: auditLog,
      actorName: user.name,
    })
    .from(auditLog)
    .leftJoin(user, eq(auditLog.actorId, user.id))
    .where(and(...conditions))
    .orderBy(desc(auditLog.createdAt))
    .limit(opts.limit ?? 100);
}
