import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  entities,
  entityTypes,
  inventoryItems,
  member,
  notificationReads,
  notifications,
  organization,
  projectMembers,
  user,
} from "@/db/schema";
import { evaluateStock, ALERT_LABELS } from "@/lib/stock-alerts";
import { escapeHtml, sendEmail } from "@/lib/email";
import { baseUrl } from "@/lib/auth";
import { projectScope } from "./projects";
import { hasMovements } from "./inventory";

/** Roles that hear about alarms by email; everyone sees them in the app. */
const EMAILED_ROLES = ["owner", "admin", "storage"];

type Raised = { id: string; entityId: string; kind: string; message: string };

/**
 * Bring the open alarms in line with the stock as it stands.
 *
 * Alarms are derived, not hand-raised: every path that changes stock —
 * consumption, purchases received, biobank pickups, hand edits, the API — is
 * covered by re-evaluating here, and expiry needs re-evaluating anyway because
 * time passes without anyone touching the item. It runs on page loads and on
 * a daily schedule; when nothing changed it only reads.
 *
 * Returns the alarms it newly raised.
 */
export async function syncStockAlerts(orgId: string, now: Date = new Date()): Promise<Raised[]> {
  const [items, open] = await Promise.all([
    db
      .select({
        entityId: inventoryItems.entityId,
        name: entities.name,
        quantity: inventoryItems.quantity,
        unit: inventoryItems.unit,
        minThreshold: inventoryItems.minThreshold,
        zeroPoint: inventoryItems.zeroPoint,
        expiresAt: inventoryItems.expiresAt,
        hasMovements: hasMovements(),
      })
      .from(inventoryItems)
      .innerJoin(entities, eq(inventoryItems.entityId, entities.id))
      .where(and(eq(inventoryItems.organizationId, orgId), isNull(entities.deletedAt))),
    db
      .select({ id: notifications.id, entityId: notifications.entityId, kind: notifications.kind })
      .from(notifications)
      .where(and(eq(notifications.organizationId, orgId), isNull(notifications.resolvedAt))),
  ]);

  const wanted = new Map<string, { entityId: string; kind: Raised["kind"]; message: string }>();
  for (const item of items) {
    for (const alert of evaluateStock(item, now)) {
      wanted.set(`${item.entityId}:${alert.kind}`, { entityId: item.entityId, ...alert });
    }
  }
  const openKeys = new Set(open.map((n) => `${n.entityId}:${n.kind}`));

  // Resolved: the condition stopped (restocked, re-dated, or the record was
  // deleted, which drops it from `items`).
  const stale = open.filter((n) => !wanted.has(`${n.entityId}:${n.kind}`)).map((n) => n.id);
  if (stale.length > 0) {
    await db
      .update(notifications)
      .set({ resolvedAt: now })
      .where(and(eq(notifications.organizationId, orgId), inArray(notifications.id, stale)));
  }

  const fresh = [...wanted.entries()]
    .filter(([key]) => !openKeys.has(key))
    .map(([, a]) => ({
      organizationId: orgId,
      entityId: a.entityId,
      kind: a.kind as (typeof notifications.$inferInsert)["kind"],
      message: a.message,
      createdAt: now,
    }));
  if (fresh.length === 0) return [];

  // The partial unique index makes a concurrent evaluation a no-op rather than
  // a duplicate; only rows this call actually inserted come back.
  return db
    .insert(notifications)
    .values(fresh)
    .onConflictDoNothing()
    .returning({
      id: notifications.id,
      entityId: notifications.entityId,
      kind: notifications.kind,
      message: notifications.message,
    });
}

/** Sync, then email whoever looks after stock about anything new. */
export async function syncAndNotify(orgId: string) {
  const raised = await syncStockAlerts(orgId);
  if (raised.length > 0) await emailAlarms(orgId, raised);
  return raised;
}

/** Every lab with stock to watch — for the daily scheduled run. */
export async function syncAllOrgs() {
  const orgs = await db
    .selectDistinct({ id: inventoryItems.organizationId })
    .from(inventoryItems);
  let raised = 0;
  for (const org of orgs) {
    raised += (await syncAndNotify(org.id)).length;
  }
  return { orgs: orgs.length, raised };
}

/** Email the people who look after stock about newly raised alarms. */
export async function emailAlarms(orgId: string, raised: Raised[]) {
  const [lab] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  const recipients = await db
    .select({ userId: user.id, email: user.email })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(and(eq(member.organizationId, orgId), inArray(member.role, EMAILED_ROLES)));
  if (recipients.length === 0) return;

  // Respect project confinement: a member restricted to projects only hears
  // about records they could open.
  const [scopes, records] = await Promise.all([
    db
      .select({ userId: projectMembers.userId, projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.organizationId, orgId)),
    db
      .select({
        id: entities.id,
        displayId: entities.displayId,
        projectId: entities.projectId,
        typeSlug: entityTypes.slug,
      })
      .from(entities)
      .innerJoin(entityTypes, eq(entities.entityTypeId, entityTypes.id))
      .where(inArray(entities.id, [...new Set(raised.map((r) => r.entityId))])),
  ]);
  const byId = new Map(records.map((r) => [r.id, r]));
  const root = baseUrl();

  await Promise.all(
    recipients.map(async (person) => {
      const confined = scopes.filter((s) => s.userId === person.userId).map((s) => s.projectId);
      const theirs = raised.filter((r) => {
        const rec = byId.get(r.entityId);
        return (
          rec &&
          (confined.length === 0 || rec.projectId === null || confined.includes(rec.projectId))
        );
      });
      if (theirs.length === 0) return;

      const lines = theirs
        .map((r) => {
          const rec = byId.get(r.entityId)!;
          const label = ALERT_LABELS[r.kind as keyof typeof ALERT_LABELS];
          return `<li><strong>${escapeHtml(label)}:</strong> <a href="${root}/t/${rec.typeSlug}/${rec.displayId}">${escapeHtml(r.message)}</a></li>`;
        })
        .join("");
      const subject =
        theirs.length === 1
          ? `Stock alarm: ${theirs[0].message}`
          : `${theirs.length} stock alarms in ${lab?.name ?? "your lab"}`;
      await sendEmail(
        person.email,
        subject,
        `<p>New stock alarms in ${escapeHtml(lab?.name ?? "your lab")}:</p><ul>${lines}</ul><p><a href="${root}/notifications">Open the notification center</a></p>`
      );
    })
  );
}

/** Alarms the person can see, newest first, with whether they've read each. */
export async function listNotifications(
  orgId: string,
  userId: string,
  projectIds: string[],
  opts: { open?: boolean; limit?: number } = {}
) {
  return db
    .select({
      id: notifications.id,
      kind: notifications.kind,
      message: notifications.message,
      createdAt: notifications.createdAt,
      resolvedAt: notifications.resolvedAt,
      displayId: entities.displayId,
      entityName: entities.name,
      typeSlug: entityTypes.slug,
      read: sql<boolean>`${notificationReads.userId} IS NOT NULL`,
    })
    .from(notifications)
    .innerJoin(entities, eq(notifications.entityId, entities.id))
    .innerJoin(entityTypes, eq(entities.entityTypeId, entityTypes.id))
    .leftJoin(
      notificationReads,
      and(
        eq(notificationReads.notificationId, notifications.id),
        eq(notificationReads.userId, userId)
      )
    )
    .where(
      and(
        eq(notifications.organizationId, orgId),
        opts.open === undefined
          ? undefined
          : opts.open
            ? isNull(notifications.resolvedAt)
            : isNotNull(notifications.resolvedAt),
        projectScope(projectIds)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(opts.limit ?? 200);
}

/** Open alarms this person hasn't read — the number on the bell. */
export async function countUnread(orgId: string, userId: string, projectIds: string[]) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .innerJoin(entities, eq(notifications.entityId, entities.id))
    .leftJoin(
      notificationReads,
      and(
        eq(notificationReads.notificationId, notifications.id),
        eq(notificationReads.userId, userId)
      )
    )
    .where(
      and(
        eq(notifications.organizationId, orgId),
        isNull(notifications.resolvedAt),
        isNull(notificationReads.userId),
        projectScope(projectIds)
      )
    );
  return row?.n ?? 0;
}

/** Mark some alarms read, or every one this person can see when `ids` is omitted. */
export async function markRead(
  orgId: string,
  userId: string,
  projectIds: string[],
  ids?: string[]
) {
  const visible = await db
    .select({ id: notifications.id })
    .from(notifications)
    .innerJoin(entities, eq(notifications.entityId, entities.id))
    .where(
      and(
        eq(notifications.organizationId, orgId),
        ids ? inArray(notifications.id, ids) : undefined,
        projectScope(projectIds)
      )
    );
  if (visible.length === 0) return;
  await db
    .insert(notificationReads)
    .values(visible.map((n) => ({ notificationId: n.id, userId })))
    .onConflictDoNothing();
}
