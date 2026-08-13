import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { savedViews } from "@/db/schema";
import { ServiceError } from "./entities";

export async function listViews(orgId: string, typeSlug: string) {
  return db
    .select()
    .from(savedViews)
    .where(and(eq(savedViews.organizationId, orgId), eq(savedViews.typeSlug, typeSlug)))
    .orderBy(asc(savedViews.name));
}

export async function createView(
  orgId: string,
  actorId: string | null,
  input: { typeSlug: string; name: string; query: Record<string, string> }
) {
  const name = input.name.trim();
  if (!name) throw new ServiceError("Name this view", 400, { name: "Give the view a name" });

  const [row] = await db
    .insert(savedViews)
    .values({
      organizationId: orgId,
      typeSlug: input.typeSlug,
      name,
      query: input.query,
      createdBy: actorId,
    })
    .returning();
  return row;
}

export async function deleteView(orgId: string, viewId: string) {
  const deleted = await db
    .delete(savedViews)
    .where(and(eq(savedViews.organizationId, orgId), eq(savedViews.id, viewId)))
    .returning();
  if (deleted.length === 0) throw new ServiceError("View not found", 404);
}
