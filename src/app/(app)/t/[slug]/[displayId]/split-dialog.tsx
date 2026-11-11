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
import { useT } from "@/i18n/client";
import { kindLabel } from "@/i18n/labels";

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
  const t = useT();
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
          ? t("record.split.leftOfParent", { quantity: result.value.remaining ?? "", unit: result.value.unit })
          : undefined;
      toast.success(t("record.split.created", { count: result.value?.created ?? 0 }), { description: left });
      onOpenChange(false);
      setDestinations([{ count: "1", amountEach: "1", locationId: NO_LOCATION }]);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("record.split.title")}</DialogTitle>
          <DialogDescription>
            {t("record.split.description", { name: entityName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("record.split.howMuch")}</Label>
            {destinations.map((dest, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={dest.count}
                  onChange={(e) => update(i, { count: e.target.value })}
                  className="w-16"
                  aria-label={t("record.split.count")}
                />
                <span className="text-sm text-muted-foreground">×</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={dest.amountEach}
                  onChange={(e) => update(i, { amountEach: e.target.value })}
                  className="w-20"
                  aria-label={t("record.split.each")}
                />
                <span className="text-sm text-muted-foreground">
                  {unit ?? t("record.split.units")} {t("audit.arrow")}
                </span>
                <Select
                  value={dest.locationId}
                  onValueChange={(value) => update(i, { locationId: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_LOCATION}>{t("record.split.noLocationYet")}</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name} ({kindLabel(t, l.kind)})
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
                    {t("common.remove")}
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
              {t("record.split.anotherFreezer")}
            </Button>
          </div>

          <p className={overdrawn ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {t("record.split.summary", {
              count: totalVials,
              total: String(totalAmount),
              unit: unit ?? t("record.split.units"),
            })}
            {available !== null &&
              t("record.split.ofAvailable", { available, unit: unit ?? t("record.split.units") })}
            {overdrawn && t("record.split.tooMuch")}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={pending || totalVials === 0 || overdrawn}>
            {pending ? t("record.split.splitting") : t("record.split.create", { count: totalVials })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
