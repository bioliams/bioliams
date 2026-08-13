"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { splitEntityAction } from "./split-actions";

const NO_LOCATION = "__none__";

interface Destination {
  count: string;
  amountEach: string;
  locationId: string;
}

/**
 * Splitting is normally "five vials in one freezer and three in another", so
 * destinations are a list rather than a single location field — and each
 * destination has its own portion size, because 300 mL to one freezer and
 * 200 mL to another is a real way to split a bottle.
 */
export function SplitDialog({
  open,
  onOpenChange,
  entityId,
  entityName,
  slug,
  unit,
  available,
  locations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  entityName: string;
  slug: string;
  unit: string | null;
  available: string | null;
  locations: { id: string; name: string; kind: string }[];
}) {
  const router = useRouter();
  const [destinations, setDestinations] = useState<Destination[]>([
    { count: "1", amountEach: "1", locationId: NO_LOCATION },
  ]);
  const [pending, startTransition] = useTransition();

  const totalVials = destinations.reduce((sum, d) => sum + (Number(d.count) || 0), 0);
  const totalAmount = destinations.reduce(
    (sum, d) => sum + (Number(d.count) || 0) * (Number(d.amountEach) || 0),
    0
  );
  const overdrawn = available !== null && totalAmount > Number(available);

  function update(index: number, patch: Partial<Destination>) {
    setDestinations((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function submit() {
    startTransition(async () => {
      const result = await splitEntityAction(entityId, slug, {
        groups: destinations.map((d) => ({
          count: Number(d.count) || 0,
          amountEach: d.amountEach,
          locationId: d.locationId === NO_LOCATION ? null : d.locationId,
        })),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const left =
        result.value?.remaining !== null && result.value
          ? `${result.value.remaining} ${result.value.unit} left of the parent`
          : undefined;
      toast.success(`Created ${result.value?.created ?? 0} aliquots`, { description: left });
      onOpenChange(false);
      setDestinations([{ count: "1", amountEach: "1", locationId: NO_LOCATION }]);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Split into aliquots</DialogTitle>
          <DialogDescription>
            Each aliquot becomes its own record, linked back to {entityName}, so it can be
            stored, scanned and used up separately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>How much goes where</Label>
            {destinations.map((dest, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={dest.count}
                  onChange={(e) => update(i, { count: e.target.value })}
                  className="w-16"
                  aria-label="Number of aliquots"
                />
                <span className="text-sm text-muted-foreground">×</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={dest.amountEach}
                  onChange={(e) => update(i, { amountEach: e.target.value })}
                  className="w-20"
                  aria-label="Amount in each aliquot"
                />
                <span className="text-sm text-muted-foreground">{unit ?? "units"} →</span>
                <Select
                  value={dest.locationId}
                  onValueChange={(value) => update(i, { locationId: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_LOCATION}>No location yet</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name} ({l.kind})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {destinations.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDestinations((prev) => prev.filter((_, j) => j !== i))}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDestinations((prev) => [
                  ...prev,
                  { count: "1", amountEach: prev[prev.length - 1]?.amountEach ?? "1", locationId: NO_LOCATION },
                ])
              }
            >
              Another freezer
            </Button>
          </div>

          <p className={overdrawn ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {totalVials} aliquot{totalVials === 1 ? "" : "s"} using {totalAmount}{" "}
            {unit ?? "units"}
            {available !== null && ` of the ${available} ${unit ?? "units"} available`}
            {overdrawn && " — that's more than there is"}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || totalVials === 0 || overdrawn}>
            {pending ? "Splitting…" : `Create ${totalVials} aliquot${totalVials === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
