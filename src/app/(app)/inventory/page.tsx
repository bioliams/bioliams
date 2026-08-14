import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { listInventory } from "@/lib/services/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QuantityCell } from "./quantity-cell";
import { PageHeader } from "@/components/page-header";

export default async function InventoryPage() {
  const ctx = await requireOrg();
  const rows = await listInventory(ctx.orgId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory"
        description="Consumable stock levels. Edit a quantity inline to correct it, or record what you took off the shelf."
        actions={
          <Button asChild>
            <Link href="/inventory/use">Use stock</Link>
          </Button>
        }
      />

      <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Min</TableHead>
              <TableHead>Lot</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ item, entity, typeName, typeSlug }) => {
              const low =
                item.minThreshold !== null && Number(item.quantity) <= Number(item.minThreshold);
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/t/${typeSlug}/${entity.displayId}`} className="hover:underline">
                      {entity.displayId}
                    </Link>
                  </TableCell>
                  <TableCell>{entity.name}</TableCell>
                  <TableCell className="text-muted-foreground">{typeName}</TableCell>
                  <TableCell>
                    <QuantityCell
                      entityId={entity.id}
                      quantity={item.quantity}
                      unit={item.unit}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.minThreshold ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.lot ?? "—"}</TableCell>
                  <TableCell>
                    {low ? <Badge variant="destructive">Low stock</Badge> : <Badge variant="secondary">OK</Badge>}
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
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
