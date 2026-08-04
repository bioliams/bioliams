import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, desc } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { ServiceError } from "./entities";

const PREFIX = "lk_";

function hashKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export async function listApiKeys(orgId: string) {
  return db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.organizationId, orgId), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt));
}

/** Creates a key; the plaintext is returned once and never stored. */
export async function createApiKey(orgId: string, actorId: string | null, name: string) {
  if (!name.trim()) throw new ServiceError("Name is required", 400);
  const raw = `${PREFIX}${randomBytes(24).toString("hex")}`;
  const [row] = await db
    .insert(apiKeys)
    .values({
      organizationId: orgId,
      name: name.trim(),
      keyHash: hashKey(raw),
      keyPrefix: raw.slice(0, 11),
      createdBy: actorId,
    })
    .returning();

  await logAudit({
    orgId,
    actorId,
    action: "api_key.create",
    targetKind: "api_key",
    targetId: row.id,
    targetLabel: row.name,
  });
  return { row, plaintext: raw };
}

export async function revokeApiKey(orgId: string, actorId: string | null, id: string) {
  const [row] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.organizationId, orgId), eq(apiKeys.id, id)))
    .returning();
  if (!row) throw new ServiceError("API key not found", 404);
  await logAudit({
    orgId,
    actorId,
    action: "api_key.revoke",
    targetKind: "api_key",
    targetId: id,
    targetLabel: row.name,
  });
}

/** Resolve a bearer token to its organization, or null if invalid/revoked. */
export async function resolveApiKey(rawKey: string) {
  if (!rawKey.startsWith(PREFIX)) return null;
  const rows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hashKey(rawKey)), isNull(apiKeys.revokedAt)))
    .limit(1);
  if (rows.length === 0) return null;

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, rows[0].id));

  return { orgId: rows[0].organizationId, keyId: rows[0].id };
}
