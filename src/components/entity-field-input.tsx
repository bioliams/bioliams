"use client";

import type { FieldDef } from "@/db/schema/lims";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  field: FieldDef;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}

/** Renders the right control for a user-defined field type. */
export function EntityFieldInput({ field, value, error, onChange }: Props) {
  const id = `field-${field.key}`;
  const label = (
    <Label htmlFor={id}>
      {field.label}
      {field.required && <span className="ml-0.5 text-red-600">*</span>}
      {field.unit && <span className="ml-1 text-xs text-muted-foreground">({field.unit})</span>}
    </Label>
  );

  let control: React.ReactNode;
  switch (field.type) {
    case "boolean":
      control = (
        <div className="flex h-9 items-center">
          <Checkbox
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(Boolean(checked))}
          />
        </div>
      );
      break;
    case "select":
      control = (
        <Select value={(value as string) ?? ""} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
      break;
    case "multiselect": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      control = (
        <div className="flex flex-wrap gap-3 rounded-md border p-2">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-sm">
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={(checked) =>
                  onChange(checked ? [...selected, opt] : selected.filter((s) => s !== opt))
                }
              />
              {opt}
            </label>
          ))}
        </div>
      );
      break;
    }
    case "number":
      control = (
        <Input
          id={id}
          type="number"
          step="any"
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
      break;
    case "date":
      control = (
        <Input
          id={id}
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
      break;
    default:
      control = (
        <Input
          id={id}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }

  return (
    <div className="space-y-2">
      {label}
      {control}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
