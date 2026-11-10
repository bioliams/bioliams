"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FieldDef } from "@/db/schema/lims";
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
import { EntityFieldInput } from "@/components/entity-field-input";
import { PositionPicker, type Position } from "@/components/position-picker";
import { createEntityAction, updateEntityAction } from "@/app/(app)/t/[slug]/actions";

const NO_LOCATION = "__none__";

interface EntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: { name: string; slug: string; fields: FieldDef[]; isInventory: boolean };
  locations: {
    id: string;
    name: string;
    kind: string;
    gridRows: number | null;
    gridCols: number | null;
  }[];
  /** Provide to edit an existing record instead of creating one. */
  entity?: {
    id: string;
    name: string;
    status: string;
    data: Record<string, unknown>;
    locationId: string | null;
    positionRow: number | null;
    positionCol: number | null;
  };
}

export function EntityDialog({ open, onOpenChange, type, locations, entity }: EntityDialogProps) {
  const router = useRouter();
  const editing = Boolean(entity);
  const [name, setName] = useState(entity?.name ?? "");
  const [status, setStatus] = useState(entity?.status ?? "active");
  const [locationId, setLocationId] = useState(entity?.locationId ?? NO_LOCATION);
  const [position, setPosition] = useState<Position>(
    entity?.positionRow != null && entity?.positionCol != null
      ? { row: entity.positionRow, col: entity.positionCol }
      : null
  );
  const [data, setData] = useState<Record<string, unknown>>(entity?.data ?? {});
  const [quantity, setQuantity] = useState("0");
  const [unit, setUnit] = useState("units");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const selectedLocation = locations.find((l) => l.id === locationId);
  const grid =
    selectedLocation?.gridRows && selectedLocation.gridCols
      ? { rows: selectedLocation.gridRows, cols: selectedLocation.gridCols }
      : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErrors({});

    const resolvedLocation = locationId === NO_LOCATION ? null : locationId;
    const placed = grid && position ? position : null;
    const where = {
      locationId: resolvedLocation,
      positionRow: placed?.row ?? null,
      positionCol: placed?.col ?? null,
    };
    const result = editing
      ? await updateEntityAction(entity!.id, type.slug, {
          name,
          status,
          data,
          ...where,
        })
      : await createEntityAction({
          typeSlug: type.slug,
          name,
          status,
          data,
          ...where,
          ...(type.isInventory ? { quantity, unit } : {}),
        });

    setPending(false);
    if (result.error) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.error);
      return;
    }
    toast.success(editing ? "Record updated" : `Registered ${result.value}`);
    onOpenChange(false);
    if (!editing) {
      setName("");
      setData({});
      // Keep the box — the next sample usually goes next to this one.
      setPosition(null);
    }
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Edit ${entity!.name}` : `Register ${type.name}`}
          </DialogTitle>
          <DialogDescription>
            Fields come from this record type&apos;s schema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entity-name">
              Name<span className="ml-0.5 text-red-600">*</span>
            </Label>
            <Input id="entity-name" value={name} onChange={(e) => setName(e.target.value)} required />
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entity-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="entity-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["active", "in-use", "depleted", "archived"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-location">Location</Label>
              <Select
                value={locationId}
                onValueChange={(value) => {
                  setLocationId(value);
                  setPosition(null);
                }}
              >
                <SelectTrigger id="entity-location" className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LOCATION}>Unassigned</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.kind}
                      {l.gridRows && l.gridCols ? ` · ${l.gridRows}×${l.gridCols}` : ""})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {grid && (
            <div className="space-y-2">
              <Label>Position in {selectedLocation!.name}</Label>
              <PositionPicker
                locationId={locationId}
                rows={grid.rows}
                cols={grid.cols}
                value={position}
                onChange={setPosition}
                entityId={entity?.id}
              />
              {errors.position && <p className="text-xs text-red-600">{errors.position}</p>}
            </div>
          )}

          {type.isInventory && !editing && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entity-qty">Quantity</Label>
                <Input
                  id="entity-qty"
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity-unit">Unit</Label>
                <Input id="entity-unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
            </div>
          )}

          {type.fields.map((field) => (
            <EntityFieldInput
              key={field.key}
              field={field}
              value={data[field.key]}
              error={errors[field.key]}
              onChange={(value) => setData((prev) => ({ ...prev, [field.key]: value }))}
            />
          ))}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save changes" : "Register"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
