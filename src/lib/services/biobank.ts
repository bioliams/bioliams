import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  biobankRequests,
  biobankRequestItems,
  entities,
  entityTypes,
  locations,
  organization,
  user,
} from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { ServiceError } from "@/lib/service-error";
import { allowedNext, needsResponse, STATUS_LABELS, type BiobankStatus } from "@/lib/biobank-flow";
import { escapeHtml, sendEmail } from "@/lib/email";
import { baseUrl } from "@/lib/auth";
import { wellLabel } from "@/lib/well";
import { projectScope } from "./projects";

const handler = alias(user, "handler");

export async function listBiobankRequests(orgId: string) {
  const rows = await db
    .select({
      request: biobankRequests,
      requesterName: user.name,
      handlerName: handler.name,
    })
    .from(biobankRequests)
    .leftJoin(user, eq(biobankRequests.requestedBy, user.id))
    .leftJoin(handler, eq(biobankRequests.handledBy, handler.id))
    .where(eq(biobankRequests.organizationId, orgId))
    .orderBy(desc(biobankRequests.createdAt))
    .limit(300);

  const ids = rows.map((r) => r.request.id);
  const items = ids.length
    ? await db
        .select({
          requestId: biobankRequestItems.requestId,
          displayId: entities.displayId,
          name: entities.name,
          typeSlug: entityTypes.slug,
          locationName: locations.name,
          positionRow: entities.positionRow,
          positionCol: entities.positionCol,
        })
        .from(biobankRequestItems)
        .innerJoin(entities, eq(biobankRequestItems.entityId, entities.id))
        .innerJoin(entityTypes, eq(entities.entityTypeId, entityTypes.id))
        .leftJoin(locations, eq(entities.locationId, locations.id))
        .where(inArray(biobankRequestItems.requestId, ids))
    : [];

  const itemsFor = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsFor.get(item.requestId) ?? [];
    list.push(item);
    itemsFor.set(item.requestId, list);
  }

  return rows.map((r) => ({
    ...r,
    items: (itemsFor.get(r.request.id) ?? []).map((i) => ({
      displayId: i.displayId,
      name: i.name,
      href: `/t/${i.typeSlug}/${i.displayId}`,
      // The biobank's question is "where is it?" — answer it down to the well.
      where:
        i.locationName && i.positionRow != null && i.positionCol != null
          ? `${i.locationName} · ${wellLabel(i.positionRow, i.positionCol)}`
          : i.locationName,
    })),
  }));
}

export interface BiobankRequestInput {
  title: string;
  details?: string | null;
  neededBy?: string | null; // yyyy-mm-dd
  /** Display IDs (e.g. SMP-000012) of specific records being asked for. */
  recordIds?: string[];
}

export async function createBiobankRequest(
  orgId: string,
  actorId: string,
  projectIds: string[],
  input: BiobankRequestInput
) {
  const title = input.title?.trim();
  if (!title) throw new ServiceError("What do you need?", 400, { title: "Say what you need" });

  let neededBy: Date | null = null;
  if (input.neededBy) {
    neededBy = new Date(`${input.neededBy}T00:00:00Z`);
    if (Number.isNaN(neededBy.getTime())) {
      throw new ServiceError("Validation failed", 400, { neededBy: "Not a valid date" });
    }
  }

  const wanted = [...new Set((input.recordIds ?? []).map((s) => s.trim()).filter(Boolean))];
  if (wanted.length > 200) {
    throw new ServiceError("Validation failed", 400, { recordIds: "At most 200 records per request" });
  }

  return db.transaction(async (tx) => {
    let found: { id: string; displayId: string }[] = [];
    if (wanted.length) {
      const scope = projectScope(projectIds);
      found = await tx
        .select({ id: entities.id, displayId: entities.displayId })
        .from(entities)
        .where(
          and(
            eq(entities.organizationId, orgId),
            inArray(entities.displayId, wanted),
            isNull(entities.deletedAt),
            ...(scope ? [scope] : [])
          )
        );
      const missing = wanted.filter((d) => !found.some((f) => f.displayId === d));
      if (missing.length) {
        throw new ServiceError("Validation failed", 400, {
          recordIds: `Not found: ${missing.join(", ")}`,
        });
      }
    }

    const [row] = await tx
      .insert(biobankRequests)
      .values({
        organizationId: orgId,
        title,
        details: input.details?.trim() || null,
        neededBy,
        requestedBy: actorId,
      })
      .returning();

    if (found.length) {
      await tx
        .insert(biobankRequestItems)
        .values(found.map((f) => ({ requestId: row.id, entityId: f.id })));
    }

    await logAudit(
      {
        orgId,
        actorId,
        action: "biobank.request",
        targetKind: "biobank_request",
        targetId: row.id,
        targetLabel: row.title,
        diff: {
          after: {
            records: found.map((f) => f.displayId).join(", ") || null,
            neededBy: input.neededBy || null,
          },
        },
      },
      tx
    );
    return row;
  });
}

/**
 * Move a request along. The caller says which hats the actor wears; the flow
 * rules decide what that permits, so a requester can never mark their own
 * request ready unless they also run the biobank.
 */
export async function setBiobankStatus(
  orgId: string,
  actor: { id: string; canManage: boolean },
  id: string,
  to: BiobankStatus,
  response?: string | null
) {
  const note = response?.trim() || null;
  if (needsResponse(to) && !note) {
    throw new ServiceError("Say why", 400, { response: "Give the requester a reason" });
  }

  const row = await db.transaction(async (tx) => {
    // Lock the row so two people clicking at once can't both move it.
    const [existing] = await tx
      .select()
      .from(biobankRequests)
      .where(and(eq(biobankRequests.organizationId, orgId), eq(biobankRequests.id, id)))
      .for("update")
      .limit(1);
    if (!existing) throw new ServiceError("Request not found", 404);

    const hats: ("biobank" | "requester")[] = [];
    if (actor.canManage) hats.push("biobank");
    if (existing.requestedBy === actor.id) hats.push("requester");
    if (!allowedNext(existing.status, hats).includes(to)) {
      throw new ServiceError(
        `You can't move a ${STATUS_LABELS[existing.status].toLowerCase()} request to ${STATUS_LABELS[to].toLowerCase()}`,
        403
      );
    }

    const byBiobank = actor.canManage && to !== "cancelled";
    const now = new Date();
    const [updated] = await tx
      .update(biobankRequests)
      .set({
        status: to,
        updatedAt: now,
        ...(byBiobank ? { handledBy: actor.id } : {}),
        // Keep the last thing the biobank said unless they say something new.
        ...(note !== null && byBiobank ? { response: note } : {}),
        ...(to === "ready" ? { readyAt: now } : {}),
        ...(to === "collected" ? { collectedAt: now } : {}),
        ...(to === "requested" || to === "processing" ? { readyAt: null } : {}),
      })
      .where(eq(biobankRequests.id, id))
      .returning();

    await logAudit(
      {
        orgId,
        actorId: actor.id,
        action: `biobank.${to}`,
        targetKind: "biobank_request",
        targetId: id,
        targetLabel: updated.title,
        diff: {
          before: { status: existing.status },
          after: { status: to, ...(note ? { note } : {}) },
        },
      },
      tx
    );
    return { updated, existing };
  });

  // After commit: tell the requester when there's something for them to do.
  const { updated } = row;
  if ((to === "ready" || to === "declined") && updated.requestedBy && updated.requestedBy !== actor.id) {
    await notifyRequester(orgId, updated.requestedBy, updated.title, to, updated.response);
  }
  return updated;
}

async function notifyRequester(
  orgId: string,
  userId: string,
  title: string,
  status: "ready" | "declined",
  response: string | null
) {
  const [[person], [lab]] = await Promise.all([
    db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, userId)).limit(1),
    db.select({ name: organization.name }).from(organization).where(eq(organization.id, orgId)).limit(1),
  ]);
  if (!person?.email) return;

  const safeTitle = escapeHtml(title);
  const note = response ? `<p><strong>From the biobank:</strong> ${escapeHtml(response)}</p>` : "";
  const link = `${baseUrl()}/biobank`;
  const subject =
    status === "ready"
      ? `Ready for pickup: ${title}`
      : `Biobank request declined: ${title}`;
  const lead =
    status === "ready"
      ? `Your biobank request <strong>${safeTitle}</strong> in ${escapeHtml(lab?.name ?? "your lab")} is ready to be picked up.`
      : `Your biobank request <strong>${safeTitle}</strong> in ${escapeHtml(lab?.name ?? "your lab")} was declined.`;

  await sendEmail(
    person.email,
    subject,
    `<p>${lead}</p>${note}<p><a href="${link}">Open biobank requests</a></p>`
  );
}
