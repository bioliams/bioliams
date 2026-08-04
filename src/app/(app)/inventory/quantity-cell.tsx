"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { updateInventoryAction } from "./actions";

/** Inline-editable stock quantity; commits on blur or Enter. */
export function QuantityCell({
  entityId,
  quantity,
  unit,
}: {
  entityId: string;
  quantity: string;
  unit: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(quantity);
  const [saving, setSaving] = useState(false);

  async function commit() {
    if (value === quantity) return;
    setSaving(true);
    const result = await updateInventoryAction(entityId, { quantity: value });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      setValue(quantity);
      return;
    }
    toast.success("Quantity updated");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        step="any"
        value={value}
        disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="h-8 w-24"
      />
      <span className="text-xs text-muted-foreground">{unit}</span>
    </div>
  );
}
