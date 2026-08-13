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

type Mode = "discard" | "return" | "transfer" | null;

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
}: {
  entityId: string;
  slug: string;
  displayId: string;
  stock: { quantity: string; unit: string } | null;
  locations: { id: string; name: string; kind: string }[];
  currentLocationId: string | null;
  custody: { holderName: string | null; isMine: boolean; since: string | null };
  canWrite: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [amount, setAmount] = useState("1");
  const [note, setNote] = useState("");
  const [destination, setDestination] = useState(currentLocationId ?? "");
  const [pending, startTransition] = useTransition();

  function close() {
    setMode(null);
    setAmount("1");
    setNote("");
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
                  : "Move this record"}
            </DialogTitle>
            <DialogDescription>
              {mode === "discard"
                ? "Expired, contaminated or spilt. Kept separate from usage so consumption rates stay honest."
                : mode === "return"
                  ? "Stock that came back to the shelf unused."
                  : "Recorded as a movement, so the history shows where it went and when."}
            </DialogDescription>
          </DialogHeader>

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

          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={pending || (mode === "discard" && !note.trim())}
            >
              {pending ? "Recording…" : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
