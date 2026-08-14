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
  const entries = await listAudit(ctx.orgId, { limit: 250 });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit log"
        description="Append-only record of every change, for traceability and compliance."
      />

      <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(({ entry, actorName, actorImage }) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {entry.createdAt.toLocaleString()}
                </TableCell>
                <TableCell>
                  <ActorChip name={actorName ?? "API key"} image={actorImage} />
                </TableCell>
                <TableCell title={entry.action}>{actionLabel(entry.action)}</TableCell>
                <TableCell>{entry.targetLabel ?? entry.targetId}</TableCell>
                <TableCell className="text-muted-foreground">
                  {summariseAudit(entry.action, entry.diff) || "—"}
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nothing recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
