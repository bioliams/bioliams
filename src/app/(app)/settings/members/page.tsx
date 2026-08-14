import { eq } from "drizzle-orm";
import { db } from "@/db";
import { member, user, invitation } from "@/db/schema";
import { requireOrg } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InviteForm } from "./invite-form";
import { PageHeader } from "@/components/page-header";
import { RoleSelect } from "./role-select";
import { can, ROLE_DESCRIPTIONS, ROLES } from "@/lib/permissions";

export default async function MembersPage() {
  const ctx = await requireOrg();

  const [members, invites] = await Promise.all([
    db
      .select({ member, user })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, ctx.orgId)),
    db.select().from(invitation).where(eq(invitation.organizationId, ctx.orgId)),
  ]);

  const canManage = can(ctx.role, "members:manage");

  return (
    <div className="space-y-6">
      <PageHeader title="Members" description="Everyone with access to this lab." />

      <dl className="grid gap-1 rounded-md border bg-muted/30 p-3 text-xs sm:grid-cols-2">
        {ROLES.map((r) => (
          <div key={r} className="flex gap-2">
            <dt className="w-20 shrink-0 font-medium">{r}</dt>
            <dd className="text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</dd>
          </div>
        ))}
      </dl>

      {canManage && <InviteForm />}

      <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(({ member: m, user: u }) => (
              <TableRow key={m.id}>
                <TableCell>
                  <span className="flex items-center gap-2.5">
                    <Avatar className="size-7">
                      {u.image && <AvatarImage src={u.image} alt="" />}
                      <AvatarFallback className="bg-accent text-[10px] font-semibold text-accent-foreground">
                        {initials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    {u.name}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  {canManage ? (
                    <RoleSelect memberId={m.id} role={m.role} disabled={m.userId === ctx.userId} />
                  ) : (
                    <Badge variant="secondary">{m.role}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {invites.filter((i) => i.status === "pending").length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Pending invitations</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {invites
              .filter((i) => i.status === "pending")
              .map((i) => (
                <li key={i.id}>
                  {i.email} — invite link:{" "}
                  <code className="text-xs">/accept-invite/{i.id}</code>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
