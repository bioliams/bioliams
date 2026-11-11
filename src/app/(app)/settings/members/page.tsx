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
import { CopyLinkButton } from "./copy-link-button";
import { PageHeader } from "@/components/page-header";
import { RoleSelect } from "./role-select";
import { can, ROLES, type Role } from "@/lib/permissions";
import { getT } from "@/i18n/server";

export default async function MembersPage() {
  const ctx = await requireOrg();
  const t = await getT();
  const roleName = (r: string) =>
    (ROLES as readonly string[]).includes(r) ? t(`roles.${r as Role}`) : r;

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
      <PageHeader title={t("settings.members.title")} description={t("settings.members.description")} />

      <dl className="grid gap-1 rounded-md border bg-muted/30 p-3 text-xs sm:grid-cols-2">
        {ROLES.map((r) => (
          <div key={r} className="flex gap-2">
            <dt className="w-28 shrink-0 font-medium">{roleName(r)}</dt>
            <dd className="text-muted-foreground">{t(`roles.desc.${r}`)}</dd>
          </div>
        ))}
      </dl>

      {canManage && <InviteForm />}

      <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("settings.members.email")}</TableHead>
              <TableHead>{t("settings.members.role")}</TableHead>
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
                    <Badge variant="secondary">{roleName(m.role)}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {invites.filter((i) => i.status === "pending").length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">{t("settings.members.pending")}</h2>
          {!process.env.RESEND_API_KEY && (
            <p className="text-xs text-muted-foreground">
              {t("settings.members.noEmail")}
            </p>
          )}
          <ul className="space-y-1 text-sm text-muted-foreground">
            {invites
              .filter((i) => i.status === "pending")
              .map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-2">
                  <span>{i.email}</span>
                  <CopyLinkButton path={`/accept-invite/${i.id}`} />
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
