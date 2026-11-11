"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createPurchaseAction,
  setPurchaseStatusAction,
  updatePurchaseAction,
} from "./actions";
import { PageHeader } from "@/components/page-header";
import { useT } from "@/i18n/client";
import type { T } from "@/i18n/translate";
import { en } from "@/i18n/messages/en";

type Status = "requested" | "approved" | "ordered" | "received" | "rejected";

export interface PurchaseRow {
  id: string;
  itemName: string;
  vendor: string | null;
  catalogNumber: string | null;
  quantity: string;
  unit: string;
  estimatedCost: string | null;
  notes: string | null;
  status: string;
  requesterName: string | null;
  linkedLabel: string | null;
  createdAt: string;
}

type Step = keyof typeof en.purchasing.steps;

const NEXT_STEPS: Record<string, { to: Status; label: Step; variant?: "outline" }[]> = {
  requested: [
    { to: "approved", label: "approve" },
    { to: "rejected", label: "reject", variant: "outline" },
  ],
  approved: [
    { to: "ordered", label: "markOrdered" },
    { to: "rejected", label: "cancel", variant: "outline" },
  ],
  ordered: [{ to: "received", label: "received" }],
  rejected: [{ to: "requested", label: "reopen", variant: "outline" }],
  received: [],
};

function purchaseStatus(t: T, status: string) {
  return status in en.purchasing.statuses
    ? t(`purchasing.statuses.${status as Status}`)
    : status;
}

const STATUS_STYLE: Record<string, "secondary" | "outline" | "destructive"> = {
  requested: "outline",
  approved: "secondary",
  ordered: "secondary",
  received: "secondary",
  rejected: "destructive",
};

export function PurchasingView({
  requests,
  stockOptions,
  canRequest,
  canDecide,
}: {
  requests: PurchaseRow[];
  stockOptions: { entityId: string; label: string; unit: string }[];
  canRequest: boolean;
  canDecide: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseRow | null>(null);
  const [pending, startTransition] = useTransition();

  const open_ = requests.filter((r) => r.status !== "received" && r.status !== "rejected");
  const done = requests.filter((r) => r.status === "received" || r.status === "rejected");

  function advance(row: PurchaseRow, to: Status) {
    startTransition(async () => {
      const result = await setPurchaseStatusAction(row.id, to);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const stock = result.value?.receivedInto;
      toast.success(t("purchasing.advanced", { item: row.itemName, status: purchaseStatus(t, to) }), {
        description: stock
          ? t("purchasing.stockNow", { quantity: stock, unit: result.value?.unit ?? "" })
          : undefined,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("purchasing.title")}
        description={t("purchasing.description")}
        actions={
          canRequest && <Button onClick={() => setOpen(true)}>{t("purchasing.request")}</Button>
        }
      />

      <RequestTable
        title={t("purchasing.open")}
        rows={open_}
        canDecide={canDecide}
        canEdit={canRequest}
        pending={pending}
        onAdvance={advance}
        onEdit={setEditing}
        empty={t("purchasing.nothingOnOrder")}
      />

      {done.length > 0 && (
        <RequestTable
          title={t("purchasing.closed")}
          rows={done}
          canDecide={canDecide}
          canEdit={false}
          pending={pending}
          onAdvance={advance}
          onEdit={setEditing}
          empty=""
        />
      )}

      <PurchaseDialog
        open={open || editing !== null}
        row={editing}
        stockOptions={stockOptions}
        onOpenChange={(next) => {
          if (!next) {
            setOpen(false);
            setEditing(null);
          }
        }}
      />
    </div>
  );
}

function RequestTable({
  title,
  rows,
  canDecide,
  canEdit,
  pending,
  onAdvance,
  onEdit,
  empty,
}: {
  title: string;
  rows: PurchaseRow[];
  canDecide: boolean;
  canEdit: boolean;
  pending: boolean;
  onAdvance: (row: PurchaseRow, to: Status) => void;
  onEdit: (row: PurchaseRow) => void;
  empty: string;
}) {
  const t = useT();
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("purchasing.item")}</TableHead>
              <TableHead>{t("common.quantity")}</TableHead>
              <TableHead>{t("purchasing.vendor")}</TableHead>
              <TableHead>{t("purchasing.requestedBy")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-end">{t("purchasing.next")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <span className="font-medium">{row.itemName}</span>
                  {row.catalogNumber && (
                    <span className="ms-2 font-mono text-xs text-muted-foreground">
                      {row.catalogNumber}
                    </span>
                  )}
                  {row.linkedLabel && (
                    <p className="text-xs text-muted-foreground">
                      {t("purchasing.topsUp", { label: row.linkedLabel })}
                    </p>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {row.quantity} {row.unit}
                  {row.estimatedCost && (
                    <span className="ms-2 text-xs text-muted-foreground">
                      ~{row.estimatedCost}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{row.vendor ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.requesterName ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_STYLE[row.status] ?? "outline"}>
                    {purchaseStatus(t, row.status)}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2 text-end rtl:space-x-reverse">
                  {canEdit && row.status !== "received" && (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(row)}>
                      {t("common.edit")}
                    </Button>
                  )}
                  {canDecide &&
                    (NEXT_STEPS[row.status] ?? []).map((step) => (
                      <Button
                        key={step.to}
                        size="sm"
                        variant={step.variant}
                        disabled={pending}
                        onClick={() => onAdvance(row, step.to)}
                      >
                        {t(`purchasing.steps.${step.label}`)}
                      </Button>
                    ))}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PurchaseDialog({
  open,
  row,
  stockOptions,
  onOpenChange,
}: {
  open: boolean;
  row: PurchaseRow | null;
  stockOptions: { entityId: string; label: string; unit: string }[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = useTransition();

  function submit(form: FormData) {
    const input = {
      itemName: String(form.get("itemName") ?? ""),
      vendor: String(form.get("vendor") ?? ""),
      catalogNumber: String(form.get("catalogNumber") ?? ""),
      quantity: String(form.get("quantity") ?? "1"),
      unit: String(form.get("unit") ?? "units"),
      estimatedCost: String(form.get("estimatedCost") ?? ""),
      notes: String(form.get("notes") ?? ""),
      entityId: String(form.get("entityId") ?? ""),
    };
    startTransition(async () => {
      const result = row
        ? await updatePurchaseAction(row.id, input)
        : await createPurchaseAction(input);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(row ? t("purchasing.updated") : t("purchasing.raised"));
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{row ? t("purchasing.editTitle") : t("purchasing.request")}</DialogTitle>
          <DialogDescription>
            {t("purchasing.dialogDesc")}
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="itemName">{t("purchasing.item")}</Label>
            <Input id="itemName" name="itemName" defaultValue={row?.itemName} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quantity">{t("common.quantity")}</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="any"
                min="0"
                defaultValue={row?.quantity ?? "1"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">{t("common.unit")}</Label>
              <Input id="unit" name="unit" defaultValue={row?.unit ?? "units"} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vendor">{t("purchasing.vendor")}</Label>
              <Input id="vendor" name="vendor" defaultValue={row?.vendor ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="catalogNumber">{t("purchasing.catalog")}</Label>
              <Input
                id="catalogNumber"
                name="catalogNumber"
                defaultValue={row?.catalogNumber ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estimatedCost">{t("purchasing.cost")}</Label>
              <Input
                id="estimatedCost"
                name="estimatedCost"
                type="number"
                step="any"
                min="0"
                defaultValue={row?.estimatedCost ?? ""}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="entityId">{t("purchasing.topsUpOptional")}</Label>
            <select
              id="entityId"
              name="entityId"
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              disabled={row !== null}
            >
              <option value="">{t("purchasing.newItem")}</option>
              {stockOptions.map((o) => (
                <option key={o.entityId} value={o.entityId}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("common.notes")}</Label>
            <Input id="notes" name="notes" defaultValue={row?.notes ?? ""} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? t("common.saving")
                : row
                  ? t("record.dialog.saveChanges")
                  : t("purchasing.raise")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
