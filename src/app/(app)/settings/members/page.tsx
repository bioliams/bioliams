import { eq } from "drizzle-orm";
import { db } from "@/db";
import { member, user, invitation } from "@/db/schema";
import { requireOrg } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InviteForm } from "./invite-form";

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

  const canInvite = ctx.role === "owner" || ctx.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Members</h1>
        <p className="text-sm text-muted-foreground">Everyone with access to this lab.</p>
      </div>

      {canInvite && <InviteForm />}

      <div className="overflow-x-auto rounded-md border">
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
                <TableCell>{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{m.role}</Badge>
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
