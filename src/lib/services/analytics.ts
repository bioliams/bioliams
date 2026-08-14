import "server-only";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  entities,
  entityTypes,
  inventoryEvents,
  inventoryItems,
  purchaseRequests,
  user,
} from "@/db/schema";

/** Twelve ISO weeks of registrations, bucketed in the database. */
export async function registrationsByWeek(orgId: string) {
  return db
    .select({
      week: sql<string>`to_char(date_trunc('week', ${entities.createdAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(entities)
    .where(
      and(
        eq(entities.organizationId, orgId),
        isNull(entities.deletedAt),
        gte(entities.createdAt, sql`now() - interval '12 weeks'`)
      )
    )
    .groupBy(sql`date_trunc('week', ${entities.createdAt})`)
    .orderBy(sql`date_trunc('week', ${entities.createdAt})`);
}

/** Stock movements per week, split by direction — usage vs. arrivals. */
export async function stockFlowByWeek(orgId: string) {
  return db
    .select({
      week: sql<string>`to_char(date_trunc('week', ${inventoryEvents.createdAt}), 'YYYY-MM-DD')`,
      consumed: sql<number>`coalesce(sum(case when ${inventoryEvents.delta} < 0 and ${inventoryEvents.kind} in ('consume','discard') then -${inventoryEvents.delta} end), 0)::float`,
      received: sql<number>`coalesce(sum(case when ${inventoryEvents.delta} > 0 and ${inventoryEvents.kind} in ('receive','return') then ${inventoryEvents.delta} end), 0)::float`,
    })
    .from(inventoryEvents)
    .where(
      and(
        eq(inventoryEvents.organizationId, orgId),
        gte(inventoryEvents.createdAt, sql`now() - interval '12 weeks'`)
      )
    )
    .groupBy(sql`date_trunc('week', ${inventoryEvents.createdAt})`)
    .orderBy(sql`date_trunc('week', ${inventoryEvents.createdAt})`);
}

/** The reagents the lab actually goes through, by number of uses. */
export async function mostUsedItems(orgId: string, limit = 8) {
  return db
    .select({
      name: entities.name,
      displayId: entities.displayId,
      typeSlug: entityTypes.slug,
      uses: sql<number>`count(*)::int`,
      total: sql<number>`sum(-${inventoryEvents.delta})::float`,
      unit: sql<string>`max(${inventoryEvents.unit})`,
    })
    .from(inventoryEvents)
    .innerJoin(entities, eq(inventoryEvents.entityId, entities.id))
    .innerJoin(entityTypes, eq(entities.entityTypeId, entityTypes.id))
    .where(
      and(
        eq(inventoryEvents.organizationId, orgId),
        eq(inventoryEvents.kind, "consume")
      )
    )
    .groupBy(entities.id, entities.name, entities.displayId, entityTypes.slug)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

/** Who recorded the most activity — a lab-meeting talking point, not surveillance. */
export async function activityByMember(orgId: string, limit = 8) {
  return db
    .select({
      name: user.name,
      events: sql<number>`count(*)::int`,
    })
    .from(inventoryEvents)
    .innerJoin(user, eq(inventoryEvents.actorId, user.id))
    .where(eq(inventoryEvents.organizationId, orgId))
    .groupBy(user.id, user.name)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function summaryNumbers(orgId: string) {
  const [[records], [low], [openOrders], [held]] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(entities)
      .where(and(eq(entities.organizationId, orgId), isNull(entities.deletedAt))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.organizationId, orgId),
          sql`${inventoryItems.minThreshold} IS NOT NULL AND ${inventoryItems.quantity} <= ${inventoryItems.minThreshold}`
        )
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(purchaseRequests)
      .where(
        and(
          eq(purchaseRequests.organizationId, orgId),
          sql`${purchaseRequests.status} in ('requested','approved','ordered')`
        )
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(entities)
      .where(
        and(
          eq(entities.organizationId, orgId),
          isNull(entities.deletedAt),
          sql`${entities.checkedOutBy} is not null`
        )
      ),
  ]);
  return {
    records: records?.n ?? 0,
    lowStock: low?.n ?? 0,
    openOrders: openOrders?.n ?? 0,
    checkedOut: held?.n ?? 0,
  };
}
