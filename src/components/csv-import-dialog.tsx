"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";
import type { FieldDef } from "@/db/schema/lims";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { importEntitiesAction } from "@/app/(app)/t/[slug]/actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeSlug: string;
  fields: FieldDef[];
}

/** Match a CSV header to a field by label or key, case-insensitively. */
function matchField(header: string, fields: FieldDef[]) {
  const h = header.trim().toLowerCase();
  return fields.find((f) => f.label.toLowerCase() === h || f.key.toLowerCase() === h);
}

export function CsvImportDialog({ open, onOpenChange, typeSlug, fields }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failures, setFailures] = useState<{ row: number; message: string }[]>([]);

  function handleFile(file: File) {
    setPending(true);
    setFailures([]);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        const rows = parsed.data.flatMap((raw) => {
          const nameKey = Object.keys(raw).find((k) => k.trim().toLowerCase() === "name");
          const name = nameKey ? raw[nameKey] : "";
          if (!name?.trim()) return [];
          const data: Record<string, unknown> = {};
          for (const [header, value] of Object.entries(raw)) {
            const field = matchField(header, fields);
            if (!field || value === "" || value === undefined) continue;
            data[field.key] =
              field.type === "multiselect"
                ? value.split("|").map((s) => s.trim()).filter(Boolean)
                : value;
          }
          return [{ name: name.trim(), data }];
        });

        if (rows.length === 0) {
          toast.error("No rows with a 'name' column found");
          setPending(false);
          return;
        }

        const result = await importEntitiesAction(typeSlug, rows);
        setPending(false);
        setFailures(result.failures);
        if (result.created > 0) toast.success(`Imported ${result.created} record(s)`);
        if (result.failures.length > 0) toast.error(`${result.failures.length} row(s) failed`);
        else onOpenChange(false);
        router.refresh();
      },
      error: (err) => {
        toast.error(`Could not read CSV: ${err.message}`);
        setPending(false);
      },
    });
  }

  const expected = ["name", ...fields.map((f) => f.label)];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            Headers are matched to fields by label. Expected columns: {expected.join(", ")}.
            Multi-select values use <code>|</code> as a separator.
          </DialogDescription>
        </DialogHeader>

        <Input
          type="file"
          accept=".csv,text/csv"
          disabled={pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {failures.length > 0 && (
          <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/40 p-3 text-xs">
            <p className="mb-2 font-medium">Rows that failed validation:</p>
            <ul className="space-y-1">
              {failures.map((f) => (
                <li key={f.row}>
                  Row {f.row}: {f.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
