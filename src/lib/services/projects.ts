import "server-only";
import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects, projectMembers, entities, user } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { ServiceError } from "@/lib/service-error";

export async function listProjects(orgId: string) {
  const rows = await db
    .select({
      project: projects,
      memberCount: sql<number>`(
        select count(*)::int from ${projectMembers}
        where ${projectMembers.projectId} = ${projects.id}
      )`,
      recordCount: sql<number>`(
        select count(*)::int from ${entities}
        where ${entities.projectId} = ${projects.id} and ${entities.deletedAt} is null
      )`,
    })
    .from(projects)
    .where(eq(projects.organizationId, orgId))
    .orderBy(asc(projects.name));
  return rows;
}

export async function listProjectMembers(orgId: string) {
  return db
    .select({
      projectId: projectMembers.projectId,
      userId: projectMembers.userId,
      userName: user.name,
    })
    .from(projectMembers)
    .innerJoin(user, eq(projectMembers.userId, user.id))
    .where(eq(projectMembers.organizationId, orgId));
}

/**
 * Which projects a person is confined to.
 *
 * An empty array means "not restricted" rather than "sees nothing" — the
 * safe-by-default reading would silently blank the lab for everyone the day
 * projects were introduced.
 */
export async function visibleProjectIds(orgId: string, userId: string): Promise<string[]> {
  const rows = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(and(eq(projectMembers.organizationId, orgId), eq(projectMembers.userId, userId)));
  return rows.map((r) => r.projectId);
}

/**
 * The predicate every record query adds for a restricted member: records in one
 * of their projects, or records belonging to no project at all — shared
 * equipment and stock aren't anyone's private business.
 */
export function projectScope(projectIds: string[]) {
  if (projectIds.length === 0) return undefined;
  return or(isNull(entities.projectId), inArray(entities.projectId, projectIds));
}

export async function createProject(
  orgId: string,
  actorId: string | null,
  input: { name: string; description?: string | null }
) {
  if (!input.name?.trim()) {
    throw new ServiceError("Name the project", 400, { name: "Give the project a name" });
  }
  const [row] = await db
    .insert(projects)
    .values({
      organizationId: orgId,
      name: input.name.trim(),
      description: input.description || null,
      createdBy: actorId,
    })
    .returning();

  await logAudit({
    orgId,
    actorId,
    action: "project.create",
    targetKind: "project",
    targetId: row.id,
    targetLabel: row.name,
  });
  return row;
}

export async function deleteProject(orgId: string, actorId: string | null, projectId: string) {
  const [existing] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.organizationId, orgId), eq(projects.id, projectId)))
    .limit(1);
  if (!existing) throw new ServiceError("Project not found", 404);

  // Records outlive the project they were filed under; unfile them rather than
  // deleting anything a lab spent time producing.
  await db
    .update(entities)
    .set({ projectId: null })
    .where(and(eq(entities.organizationId, orgId), eq(entities.projectId, projectId)));
  await db
    .delete(projects)
    .where(and(eq(projects.organizationId, orgId), eq(projects.id, projectId)));

  await logAudit({
    orgId,
    actorId,
    action: "project.delete",
    targetKind: "project",
    targetId: projectId,
    targetLabel: existing.name,
  });
}

export async function setProjectMember(
  orgId: string,
  actorId: string | null,
  projectId: string,
  userId: string,
  member: boolean
) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.organizationId, orgId), eq(projects.id, projectId)))
    .limit(1);
  if (!project) throw new ServiceError("Project not found", 404);

  if (member) {
    await db
      .insert(projectMembers)
      .values({ organizationId: orgId, projectId, userId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.organizationId, orgId),
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId)
        )
      );
  }

  await logAudit({
    orgId,
    actorId,
    action: member ? "project.assign" : "project.unassign",
    targetKind: "project",
    targetId: projectId,
    targetLabel: project.name,
    diff: { user: userId },
  });
}

/** File a record under a project, or remove it from one. */
export async function setEntityProject(
  orgId: string,
  actorId: string | null,
  entityId: string,
  projectId: string | null
) {
  if (projectId) {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.organizationId, orgId), eq(projects.id, projectId)))
      .limit(1);
    if (!project) throw new ServiceError("Project not found", 404);
  }

  const [row] = await db
    .update(entities)
    .set({ projectId, updatedAt: new Date() })
    .where(and(eq(entities.organizationId, orgId), eq(entities.id, entityId)))
    .returning();
  if (!row) throw new ServiceError("Record not found", 404);

  await logAudit({
    orgId,
    actorId,
    action: "entity.project",
    targetKind: "entity",
    targetId: entityId,
    targetLabel: `${row.displayId} ${row.name}`,
    diff: { projectId },
  });
  return row;
}
