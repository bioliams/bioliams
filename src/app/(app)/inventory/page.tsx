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
import { getT } from "@/i18n/server";

export default async function InventoryPage() {
  const ctx = await requireOrg();
  const t = await getT();
  const rows = await listInventory(ctx.orgId);
  const readOnly = !can(ctx.role, "records:write");
  const undated = rows.filter((r) => !r.item.expiresAt).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("inventory.title")}
        description={t("inventory.description")}
        actions={
          <Button asChild>
            <Link href="/inventory/use">{t("inventory.useStock")}</Link>
          </Button>
        }
      />

      {undated > 0 && !readOnly && (
        <p className="text-sm text-muted-foreground">
          {t("inventory.undated", { count: undated })}
        </p>
      )}

      <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.id")}</TableHead>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.quantity")}</TableHead>
              <TableHead title={t("inventory.lowAtTitle")}>{t("inventory.lowAt")}</TableHead>
              <TableHead title={t("inventory.zeroPointTitle")}>{t("inventory.zeroPoint")}</TableHead>
              <TableHead>{t("inventory.expires")}</TableHead>
              <TableHead>{t("common.lot")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
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
                  <StockStatus item={{ ...item, name: entity.name, hasMovements }} t={t} />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  {t("inventory.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
