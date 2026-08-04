import "server-only";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { getStorage, storageIsEphemeral } from "@/lib/storage";
import { ServiceError } from "./entities";

const MAX_BYTES = 25 * 1024 * 1024;

export async function listAttachments(orgId: string, entityId: string) {
  return db
    .select()
    .from(attachments)
    .where(and(eq(attachments.organizationId, orgId), eq(attachments.entityId, entityId)));
}

export async function saveAttachment(
  orgId: string,
  actorId: string | null,
  entityId: string,
  file: File
) {
  if (file.size > MAX_BYTES) throw new ServiceError("File exceeds the 25 MB limit", 400);
  if (storageIsEphemeral()) {
    throw new ServiceError(
      "File storage is not configured for this deployment. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable attachments.",
      501
    );
  }

  // Key by org and entity so a leaked id from another org can't reach these bytes.
  const key = path.posix.join(
    orgId,
    entityId,
    `${randomUUID()}${path.extname(file.name).slice(0, 16)}`
  );
  const contentType = file.type || "application/octet-stream";
  await getStorage().put(key, new Uint8Array(await file.arrayBuffer()), contentType);

  const [row] = await db
    .insert(attachments)
    .values({
      organizationId: orgId,
      entityId,
      fileName: file.name,
      mimeType: contentType,
      sizeBytes: file.size,
      storagePath: key,
      uploadedBy: actorId,
    })
    .returning();

  await logAudit({
    orgId,
    actorId,
    action: "attachment.create",
    targetKind: "attachment",
    targetId: row.id,
    targetLabel: file.name,
  });
  return row;
}

export async function getAttachment(orgId: string, id: string) {
  const rows = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.organizationId, orgId), eq(attachments.id, id)))
    .limit(1);
  if (rows.length === 0) throw new ServiceError("Attachment not found", 404);
  return rows[0];
}

export async function readAttachmentBytes(storagePath: string) {
  return getStorage().get(storagePath);
}

export async function deleteAttachment(orgId: string, actorId: string | null, id: string) {
  const row = await getAttachment(orgId, id);
  await db
    .delete(attachments)
    .where(and(eq(attachments.organizationId, orgId), eq(attachments.id, id)));
  await getStorage().remove(row.storagePath);
  await logAudit({
    orgId,
    actorId,
    action: "attachment.delete",
    targetKind: "attachment",
    targetId: id,
    targetLabel: row.fileName,
  });
}
