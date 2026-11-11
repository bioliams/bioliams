import { getT } from "@/i18n/server";
import { formatDateTime } from "@/i18n/format";
import { requireOrg } from "@/lib/tenant";
import { listAudit } from "@/lib/services/audit";
import { summariseAudit, actionLabel } from "@/lib/audit-summary";
import { PageHeader } from "@/components/page-header";
import { ActorChip } from "@/components/actor-chip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AuditPage() {
  const ctx = await requireOrg();
  const t = await getT();
  const entries = await listAudit(ctx.orgId, { limit: 250 });

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("audit.page.title")}
        description={t("audit.page.description")}
      />

      <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("audit.page.when")}</TableHead>
              <TableHead>{t("audit.page.who")}</TableHead>
              <TableHead>{t("audit.page.what")}</TableHead>
              <TableHead>{t("audit.page.target")}</TableHead>
              <TableHead>{t("audit.page.details")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(({ entry, actorName, actorImage }) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(entry.createdAt, t.locale)}
                </TableCell>
                <TableCell>
                  <ActorChip name={actorName ?? t("audit.page.apiKey")} image={actorImage} />
                </TableCell>
                <TableCell title={entry.action}>{actionLabel(entry.action, t)}</TableCell>
                <TableCell>{entry.targetLabel ?? entry.targetId}</TableCell>
                <TableCell className="text-muted-foreground">
                  {summariseAudit(entry.action, entry.diff, t) || "—"}
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {t("audit.page.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
