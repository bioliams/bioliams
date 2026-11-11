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
        `Discarded ${amount} ${stock?.unit ?? ""}`
      );
    } else if (mode === "return") {
      run(
        () => returnStockAction(entityId, slug, displayId, amount, note),
        `Returned ${amount} ${stock?.unit ?? ""}`
      );
    } else if (mode === "settings") {
      run(() => updateInventoryAction(entityId, settings), "Stock settings saved");
    } else if (mode === "transfer") {
      run(
        () => transferAction(entityId, slug, displayId, destination || null, note),
        "Moved"
      );
    }
  }

  const held = custody.holderName !== null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {held && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">Checked out</Badge>
              <span className="text-muted-foreground">
                {custody.isMine ? "You have this" : `${custody.holderName} has this`}
                {custody.since ? ` since ${custody.since}` : ""}
              </span>
            </div>
          )}

          {projects.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Project</span>
              <select
                value={projectId ?? ""}
                disabled={!canWrite || pending}
                aria-label="Project"
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
                    "Project updated"
                  )
                }
              >
                <option value="">Not filed under a project</option>
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
                    held ? "Checked back in" : "Checked out to you"
                  )
                }
              >
                {held ? "Check in" : "Check out"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMode("transfer")}>
                Move
              </Button>
              {stock && (
                <>
                  <Button variant="outline" size="sm" onClick={openSettings}>
                    Stock settings
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setMode("return")}>
                    Return unused
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setMode("discard")}>
                    Discard
                  </Button>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your role can&rsquo;t change this record.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={mode !== null} onOpenChange={(next) => !next && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === "discard"
                ? "Discard stock"
                : mode === "return"
                  ? "Return unused stock"
                  : mode === "settings"
                    ? "Stock settings"
                    : "Move this record"}
            </DialogTitle>
            <DialogDescription>
              {mode === "discard"
                ? "Expired, contaminated or spilt. Kept separate from usage so consumption rates stay honest."
                : mode === "return"
                  ? "Stock that came back to the shelf unused."
                  : mode === "settings"
                    ? "When this item should raise an alarm. Leave the expiry blank if it doesn't go off."
                    : "Recorded as a movement, so the history shows where it went and when."}
            </DialogDescription>
          </DialogHeader>

          {mode === "settings" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="stock-expires">Expiry date</Label>
                <Input
                  id="stock-expires"
                  type="date"
                  value={settings.expiresAt}
                  onChange={(e) => setSettings((s) => ({ ...s, expiresAt: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock-min">Low at ({settings.unit})</Label>
                <Input
                  id="stock-min"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="No warning"
                  value={settings.minThreshold}
                  onChange={(e) => setSettings((s) => ({ ...s, minThreshold: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock-zero">Zero point ({settings.unit})</Label>
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
                At or below the zero point the item counts as out of stock — set it above 0 for
                dead volume you can&rsquo;t draw.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="stock-unit">Unit</Label>
                <Input
                  id="stock-unit"
                  value={settings.unit}
                  onChange={(e) => setSettings((s) => ({ ...s, unit: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock-lot">Lot</Label>
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
                <Label htmlFor="stock-amount">Amount</Label>
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
                    {stock?.unit} — {stock?.quantity} available
                  </span>
                </div>
              </div>
            )}

            {mode === "transfer" && (
              <div className="space-y-1.5">
                <Label htmlFor="stock-destination">New location</Label>
                <select
                  id="stock-destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  <option value="">No location</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.kind})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="stock-note">
                {mode === "discard" ? "Reason" : "Note (optional)"}
              </Label>
              <Input
                id="stock-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  mode === "discard" ? "Expired, thawed, contaminated…" : "Anything worth saying"
                }
              />
            </div>
          </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={pending || (mode === "discard" && !note.trim())}
            >
              {pending ? "Saving…" : mode === "settings" ? "Save" : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
