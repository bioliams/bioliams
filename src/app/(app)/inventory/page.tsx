import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { listInventory } from "@/lib/services/inventory";
import { formatExpiryDate } from "@/lib/stock-alerts";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StockStatus } from "@/components/stock-status";
import { StockCell } from "./stock-cell";
import { PageHeader } from "@/components/page-header";

export default async function InventoryPage() {
  const ctx = await requireOrg();
  const rows = await listInventory(ctx.orgId);
  const readOnly = !can(ctx.role, "records:write");
  const undated = rows.filter((r) => !r.item.expiresAt).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory"
        description="Stock levels, expiry dates and the points at which items count as low or out of stock. Edit any of them inline; alarms go to the notification center."
        actions={
          <Button asChild>
            <Link href="/inventory/use">Use stock</Link>
          </Button>
        }
      />

      {undated > 0 && !readOnly && (
        <p className="text-sm text-muted-foreground">
          {undated} item{undated === 1 ? " has" : "s have"} no expiry date yet — fill it in below
          so you hear before {undated === 1 ? "it goes" : "they go"} off.
        </p>
      )}

      <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead title="Warn when stock falls to this level">Low at</TableHead>
              <TableHead title="Counts as out of stock at or below this level">
                Zero point
              </TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Lot</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ item, entity, typeName, typeSlug, hasMovements }) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">
                  <Link href={`/t/${typeSlug}/${entity.displayId}`} className="hover:underline">
                    {entity.displayId}
                  </Link>
                </TableCell>
                <TableCell>
                  <div>{entity.name}</div>
                  <div className="text-xs text-muted-foreground">{typeName}</div>
                </TableCell>
                <TableCell>
                  <StockCell
                    entityId={entity.id}
                    field="quantity"
                    value={item.quantity}
                    unit={item.unit}
                    disabled={readOnly}
                  />
                </TableCell>
                <TableCell>
                  <StockCell
                    entityId={entity.id}
                    field="minThreshold"
                    value={item.minThreshold ?? ""}
                    placeholder="—"
                    disabled={readOnly}
                  />
                </TableCell>
                <TableCell>
                  <StockCell
                    entityId={entity.id}
                    field="zeroPoint"
                    value={item.zeroPoint}
                    disabled={readOnly}
                  />
                </TableCell>
                <TableCell>
                  <StockCell
                    entityId={entity.id}
                    field="expiresAt"
                    value={formatExpiryDate(item.expiresAt)}
                    disabled={readOnly}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">{item.lot ?? "—"}</TableCell>
                <TableCell>
                  <StockStatus item={{ ...item, name: entity.name, hasMovements }} />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No inventory-tracked records yet. Mark a record type as &ldquo;tracks
                  inventory&rdquo; in Settings → Record types.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
