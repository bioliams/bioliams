"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FieldDef, FieldType } from "@/db/schema/lims";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createEntityTypeAction,
  updateEntityTypeAction,
  deleteEntityTypeAction,
} from "./actions";
import { useT } from "@/i18n/client";

const FIELD_TYPES: FieldType[] = [
  "text",
  "number",
  "date",
  "select",
  "multiselect",
  "boolean",
];

export interface ManagedType {
  id: string;
  name: string;
  slug: string;
  prefix: string;
  color: string | null;
  isInventory: boolean;
  fields: FieldDef[];
}

export function TypesManager({ types }: { types: ManagedType[] }) {
  const router = useRouter();
  const t = useT();
  const [editing, setEditing] = useState<ManagedType | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleDelete(type: ManagedType) {
    const result = await deleteEntityTypeAction(type.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("settings.types.deleted", { name: type.name }));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("settings.types.title")}
        description={t("settings.types.description")}
        actions={<Button onClick={() => setCreating(true)}>{t("settings.types.new")}</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {types.map((type) => (
          <Card key={type.id}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span
                    className="inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: type.color ?? "#64748b" }}
                  />
                  {type.name}
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("settings.types.idsLike")}{" "}
                  <span className="font-mono">{type.prefix}-000001</span>
                  {type.isInventory && t("settings.types.tracksInventory")}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setEditing(type)}>
                  {t("common.edit")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(type)}>
                  {t("common.delete")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {type.fields.length === 0 && (
                  <span className="text-sm text-muted-foreground">{t("settings.types.noFields")}</span>
                )}
                {type.fields.map((f) => (
                  <Badge key={f.key} variant="secondary" className="font-normal">
                    {f.label}
                    <span className="ms-1 text-muted-foreground">{t(`settings.types.fieldTypes.${f.type}`)}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TypeDialog
        key={editing?.id ?? "new"}
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        existing={editing}
      />
    </div>
  );
}

interface DraftField {
  key?: string;
  label: string;
  type: FieldType;
  required: boolean;
  optionsText: string;
  unit: string;
}

function toDraft(fields: FieldDef[]): DraftField[] {
  return fields.map((f) => ({
    key: f.key,
    label: f.label,
    type: f.type,
    required: Boolean(f.required),
    optionsText: (f.options ?? []).join(", "),
    unit: f.unit ?? "",
  }));
}

function TypeDialog({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: ManagedType | null;
}) {
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState(existing?.name ?? "");
  const [prefix, setPrefix] = useState(existing?.prefix ?? "");
  const [color, setColor] = useState(existing?.color ?? "#2563eb");
  const [isInventory, setIsInventory] = useState(existing?.isInventory ?? false);
  const [fields, setFields] = useState<DraftField[]>(toDraft(existing?.fields ?? []));
  const [pending, setPending] = useState(false);

  function updateField(index: number, patch: Partial<DraftField>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function move(index: number, delta: number) {
    setFields((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);

    const payload = fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      options: f.optionsText
        ? f.optionsText.split(/[,،]/).map((s) => s.trim()).filter(Boolean)
        : undefined,
      unit: f.unit || undefined,
    }));

    const result = existing
      ? await updateEntityTypeAction(existing.id, { name, color, isInventory, fields: payload })
      : await createEntityTypeAction({ name, prefix, color, isInventory, fields: payload });

    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(existing ? t("settings.types.updated") : t("settings.types.created"));
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {existing
              ? t("settings.types.editTitle", { name: existing.name })
              : t("settings.types.new")}
          </DialogTitle>
          <DialogDescription>
            {t("settings.types.dialogDesc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="type-name">{t("common.name")}</Label>
              <Input
                id="type-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("settings.types.namePlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-prefix">{t("settings.types.prefix")}</Label>
              <Input
                id="type-prefix"
                value={prefix}
                disabled={Boolean(existing)}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="CL"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-color">{t("settings.types.color")}</Label>
              <Input
                id="type-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 p-1"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isInventory}
              onCheckedChange={(checked) => setIsInventory(Boolean(checked))}
            />
            {t("settings.types.trackStock")}
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("settings.types.fields")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setFields((prev) => [
                    ...prev,
                    { label: "", type: "text", required: false, optionsText: "", unit: "" },
                  ])
                }
              >
                {t("settings.types.addField")}
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("settings.types.noFieldsYet")}
              </p>
            )}

            {fields.map((field, i) => (
              <div key={i} className="space-y-2 rounded-md border p-3">
                <div className="flex gap-2">
                  <Input
                    value={field.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                    placeholder={t("settings.types.fieldLabel")}
                    className="flex-1"
                  />
                  <Select
                    value={field.type}
                    onValueChange={(v) => updateField(i, { type: v as FieldType })}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((ft) => (
                        <SelectItem key={ft} value={ft}>
                          {t(`settings.types.fieldTypes.${ft}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t("settings.types.moveUp")}
                    onClick={() => move(i, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t("settings.types.moveDown")}
                    onClick={() => move(i, 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t("settings.types.removeField")}
                    onClick={() => setFields((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={field.required}
                      onCheckedChange={(checked) => updateField(i, { required: Boolean(checked) })}
                    />
                    {t("settings.types.required")}
                  </label>
                  {(field.type === "select" || field.type === "multiselect") && (
                    <Input
                      value={field.optionsText}
                      onChange={(e) => updateField(i, { optionsText: e.target.value })}
                      placeholder={t("settings.types.options")}
                      className="flex-1"
                    />
                  )}
                  {field.type === "number" && (
                    <Input
                      value={field.unit}
                      onChange={(e) => updateField(i, { unit: e.target.value })}
                      placeholder={t("settings.types.unitPlaceholder")}
                      className="w-40"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? t("common.saving")
                : existing
                  ? t("record.dialog.saveChanges")
                  : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
