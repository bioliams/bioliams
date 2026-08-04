import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { ServiceError } from "./entities";

const MAX_BYTES = 25 * 1024 * 1024;

function uploadRoot() {
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./uploads");
}

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

  // Store under org/entity so a leaked id from another org can't reach these bytes.
  const dir = path.join(uploadRoot(), orgId, entityId);
  await mkdir(dir, { recursive: true });
  const storedName = `${randomUUID()}${path.extname(file.name).slice(0, 16)}`;
  const fullPath = path.join(dir, storedName);
  await writeFile(fullPath, Buffer.from(await file.arrayBuffer()));

  const [row] = await db
    .insert(attachments)
    .values({
      organizationId: orgId,
      entityId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      storagePath: path.join(orgId, entityId, storedName),
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

/** Absolute path for a stored attachment, guarded against traversal. */
export function resolveAttachmentPath(storagePath: string) {
  const root = uploadRoot();
  const full = path.resolve(root, storagePath);
  if (!full.startsWith(root + path.sep)) throw new ServiceError("Invalid attachment path", 400);
  return full;
}

export async function deleteAttachment(orgId: string, actorId: string | null, id: string) {
  const row = await getAttachment(orgId, id);
  await db.delete(attachments).where(and(eq(attachments.organizationId, orgId), eq(attachments.id, id)));
  await unlink(resolveAttachmentPath(row.storagePath)).catch(() => {});
  await logAudit({
    orgId,
    actorId,
    action: "attachment.delete",
    targetKind: "attachment",
    targetId: id,
    targetLabel: row.fileName,
  });
}
