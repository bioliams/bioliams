"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { updateInventoryAction } from "./actions";

type Field = "quantity" | "minThreshold" | "zeroPoint" | "expiresAt";

const SAVED: Record<Field, string> = {
  quantity: "Quantity updated",
  minThreshold: "Minimum updated",
  zeroPoint: "Zero point updated",
  expiresAt: "Expiry date updated",
};

/**
 * One inline-editable stock setting; commits on blur or Enter. Blank clears
 * the minimum and expiry, and resets the zero point to 0.
 */
export function StockCell({
  entityId,
  field,
  value: initial,
  unit,
  placeholder,
  disabled,
}: {
  entityId: string;
  field: Field;
  value: string;
  unit?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function commit() {
    if (value === initial) return;
    if (field === "quantity" && !value.trim()) {
      setValue(initial);
      return;
    }
    setSaving(true);
    const result = await updateInventoryAction(entityId, { [field]: value });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      setValue(initial);
      return;
    }
    toast.success(SAVED[field]);
    router.refresh();
  }

  const isDate = field === "expiresAt";

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type={isDate ? "date" : "number"}
        step={isDate ? undefined : "any"}
        min={isDate ? undefined : "0"}
        value={value}
        placeholder={placeholder}
        disabled={saving || disabled}
        aria-label={SAVED[field].replace(" updated", "")}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className={isDate ? "h-8 w-36" : "h-8 w-24"}
      />
      {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
    </div>
  );
}
