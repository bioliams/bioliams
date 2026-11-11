"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  custodyAction,
  discardStockAction,
  returnStockAction,
  transferAction,
} from "./stock-actions";
import { setEntityProjectAction } from "@/app/(app)/settings/projects/actions";

import { updateInventoryAction } from "@/app/(app)/inventory/actions";
import { useT } from "@/i18n/client";
import { kindLabel } from "@/i18n/labels";

type Mode = "discard" | "return" | "transfer" | "settings" | null;

export interface StockInfo {
  quantity: string;
  unit: string;
  minThreshold: string | null;
  zeroPoint: string;
  lot: string | null;
  /** YYYY-MM-DD, or "" when not set. */
  expiresAt: string;
}

/**
 * The movements a record can go through that aren't ordinary consumption:
 * discarded, returned unused, moved elsewhere, or taken to a bench and brought
 * back.
 */
export function StockPanel({
  entityId,
  slug,
  displayId,
  stock,
  locations,
  currentLocationId,
  custody,
  canWrite,
  projects,
  projectId,
}: {
  entityId: string;
  slug: string;
  displayId: string;
  stock: StockInfo | null;
  locations: { id: string; name: string; kind: string }[];
  currentLocationId: string | null;
  custody: { holderName: string | null; isMine: boolean; since: string | null };
  canWrite: boolean;
  projects: { id: string; name: string }[];
  projectId: string | null;
}) {
  const router = useRouter();
  const t = useT();
  const [mode, setMode] = useState<Mode>(null);
  const [amount, setAmount] = useState("1");
  const [note, setNote] = useState("");
  const [destination, setDestination] = useState(currentLocationId ?? "");
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState({
    unit: stock?.unit ?? "",
    minThreshold: stock?.minThreshold ?? "",
    zeroPoint: stock?.zeroPoint ?? "0",
    lot: stock?.lot ?? "",
    expiresAt: stock?.expiresAt ?? "",
  });

  function close() {
    setMode(null);
    setAmount("1");
    setNote("");
  }

  function openSettings() {
    setSettings({
      unit: stock?.unit ?? "",
      minThreshold: stock?.minThreshold ?? "",
      zeroPoint: stock?.zeroPoint ?? "0",
      lot: stock?.lot ?? "",
      expiresAt: stock?.expiresAt ?? "",
    });
    setMode("settings");
  }

  function run(fn: () => Promise<{ error?: string }>, success: string) {
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      close();
      router.refresh();
    });
  }

  function submit() {
    if (mode === "discard") {
      run(
        () => discardStockAction(entityId, slug, displayId, amount, note),
        t("record.movements.discarded", { amount, unit: stock?.unit ?? "" })
      );
    } else if (mode === "return") {
      run(
        () => returnStockAction(entityId, slug, displayId, amount, note),
        t("record.movements.returned", { amount, unit: stock?.unit ?? "" })
      );
    } else if (mode === "settings") {
      run(() => updateInventoryAction(entityId, settings), t("record.movements.settingsSaved"));
    } else if (mode === "transfer") {
      run(
        () => transferAction(entityId, slug, displayId, destination || null, note),
        t("record.movements.moved")
      );
    }
  }

  const held = custody.holderName !== null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("record.movements.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {held && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{t("record.movements.checkedOut")}</Badge>
              <span className="text-muted-foreground">
                {custody.isMine
                  ? t("record.movements.youHave")
                  : t("record.movements.theyHave", { name: custody.holderName })}
                {custody.since ? t("record.movements.since", { when: custody.since }) : ""}
              </span>
            </div>
          )}

          {projects.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t("record.movements.project")}</span>
              <select
                value={projectId ?? ""}
                disabled={!canWrite || pending}
                aria-label={t("record.movements.project")}
                className="h-8 rounded-md border bg-background px-2 text-sm"
                onChange={(e) =>
                  run(
                    () =>
                      setEntityProjectAction(
                        entityId,
                        slug,
                        displayId,
                        e.target.value || null
                      ),
                    t("record.movements.projectUpdated")
                  )
                }
              >
                <option value="">{t("record.movements.noProject")}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {canWrite ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(
                    () =>
                      custodyAction(entityId, slug, displayId, held ? "checkin" : "checkout"),
                    held ? t("record.movements.checkedIn") : t("record.movements.checkedOutToYou")
                  )
                }
              >
                {held ? t("record.movements.checkIn") : t("record.movements.checkOut")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMode("transfer")}>
                {t("record.movements.move")}
              </Button>
              {stock && (
                <>
                  <Button variant="outline" size="sm" onClick={openSettings}>
                    {t("record.movements.stockSettings")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setMode("return")}>
                    {t("record.movements.returnUnused")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setMode("discard")}>
                    {t("record.movements.discard")}
                  </Button>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("record.movements.cantChange")}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={mode !== null} onOpenChange={(next) => !next && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === "discard"
                ? t("record.movements.discardTitle")
                : mode === "return"
                  ? t("record.movements.returnTitle")
                  : mode === "settings"
                    ? t("record.movements.stockSettings")
                    : t("record.movements.moveTitle")}
            </DialogTitle>
            <DialogDescription>
              {mode === "discard"
                ? t("record.movements.discardDesc")
                : mode === "return"
                  ? t("record.movements.returnDesc")
                  : mode === "settings"
                    ? t("record.movements.settingsDesc")
                    : t("record.movements.moveDesc")}
            </DialogDescription>
          </DialogHeader>

          {mode === "settings" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="stock-expires">{t("record.dialog.expiryDate")}</Label>
                <Input
                  id="stock-expires"
                  type="date"
                  value={settings.expiresAt}
                  onChange={(e) => setSettings((s) => ({ ...s, expiresAt: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock-min">{t("record.movements.lowAtUnit", { unit: settings.unit })}</Label>
                <Input
                  id="stock-min"
                  type="number"
                  step="any"
                  min="0"
                  placeholder={t("record.dialog.noWarning")}
                  value={settings.minThreshold}
                  onChange={(e) => setSettings((s) => ({ ...s, minThreshold: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock-zero">{t("record.movements.zeroPointUnit", { unit: settings.unit })}</Label>
                <Input
                  id="stock-zero"
                  type="number"
                  step="any"
                  min="0"
                  value={settings.zeroPoint}
                  onChange={(e) => setSettings((s) => ({ ...s, zeroPoint: e.target.value }))}
                />
              </div>
              <p className="col-span-2 -mt-1 text-xs text-muted-foreground">
                {t("record.movements.zeroHelp")}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="stock-unit">{t("common.unit")}</Label>
                <Input
                  id="stock-unit"
                  value={settings.unit}
                  onChange={(e) => setSettings((s) => ({ ...s, unit: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock-lot">{t("common.lot")}</Label>
                <Input
                  id="stock-lot"
                  value={settings.lot}
                  onChange={(e) => setSettings((s) => ({ ...s, lot: e.target.value }))}
                />
              </div>
            </div>
          ) : (
          <div className="space-y-3">
            {mode !== "transfer" && (
              <div className="space-y-1.5">
                <Label htmlFor="stock-amount">{t("record.movements.amount")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="stock-amount"
                    type="number"
                    step="any"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t("record.movements.available", { unit: stock?.unit ?? "", quantity: stock?.quantity ?? "" })}
                  </span>
                </div>
              </div>
            )}

            {mode === "transfer" && (
              <div className="space-y-1.5">
                <Label htmlFor="stock-destination">{t("record.movements.newLocation")}</Label>
                <select
                  id="stock-destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  <option value="">{t("common.noLocation")}</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({kindLabel(t, l.kind)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="stock-note">
                {mode === "discard" ? t("record.movements.reason") : t("record.movements.noteOptional")}
              </Label>
              <Input
                id="stock-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  mode === "discard"
                    ? t("record.movements.reasonPlaceholder")
                    : t("record.movements.notePlaceholder")
                }
              />
            </div>
          </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={submit}
              disabled={pending || (mode === "discard" && !note.trim())}
            >
              {pending
                ? t("common.saving")
                : mode === "settings"
                  ? t("common.save")
                  : t("record.movements.record")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
