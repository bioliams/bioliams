import { eq } from "drizzle-orm";
import { db } from "@/db";
import { member, user } from "@/db/schema";
import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { listProjects, listProjectMembers } from "@/lib/services/projects";
import { ProjectsManager } from "./projects-manager";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Projects · BioLIMS" };

export default async function ProjectsPage() {
  const ctx = await requireOrg();
  const [rows, assignments, people] = await Promise.all([
    listProjects(ctx.orgId),
    listProjectMembers(ctx.orgId),
    db
      .select({ userId: member.userId, name: user.name, email: user.email })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, ctx.orgId)),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projects"
        description="Projects restrict what a collaborator sees. Someone assigned to no project sees the whole lab; assign them to one or more and they see only those, plus records that aren't filed under any project."
      />

      <ProjectsManager
        projects={rows.map(({ project, memberCount, recordCount }) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          memberCount,
          recordCount,
        }))}
        people={people.map((p) => ({
          userId: p.userId,
          name: p.name,
          email: p.email,
          projectIds: assignments.filter((a) => a.userId === p.userId).map((a) => a.projectId),
        }))}
        canManage={can(ctx.role, "members:manage")}
      />
    </div>
  );
}
