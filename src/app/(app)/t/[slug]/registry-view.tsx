"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FieldDef } from "@/db/schema/lims";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EntityDialog } from "@/components/entity-dialog";
import { CsvImportDialog } from "@/components/csv-import-dialog";
import { formatFieldValue } from "@/lib/format-field";

export interface RegistryRow {
  id: string;
  displayId: string;
  name: string;
  status: string;
  data: Record<string, unknown>;
  locationId: string | null;
  locationName: string | null;
  createdAt: string;
}

export interface RegistryType {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  fields: FieldDef[];
  isInventory: boolean;
}

export interface LocationOption {
  id: string;
  name: string;
  kind: string;
}

export function RegistryView({
  type,
  rows,
  locations,
  initialSearch,
}: {
  type: RegistryType;
  rows: RegistryRow[];
  locations: LocationOption[];
  initialSearch: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [, startTransition] = useTransition();

  // Only the first four custom fields get their own column; the rest live on the detail page.
  const columns = useMemo(() => type.fields.slice(0, 4), [type.fields]);

  function applySearch(value: string) {
    setSearch(value);
    startTransition(() => {
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      router.replace(`/t/${type.slug}${params.size ? `?${params}` : ""}`);
    });
  }

  function exportCsv() {
    const headers = ["id", "name", "status", "location", ...type.fields.map((f) => f.label)];
    const lines = rows.map((r) =>
      [
        r.displayId,
        r.name,
        r.status,
        r.locationName ?? "",
        ...type.fields.map((f) => {
          const v = r.data[f.key];
          if (v === null || v === undefined) return "";
          return Array.isArray(v) ? v.join("|") : String(v);
        }),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[headers.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type.slug}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} record(s)`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <span
              className="inline-block size-3 rounded-full"
              style={{ backgroundColor: type.color ?? "#64748b" }}
            />
            {type.name}
          </h1>
          <p className="text-sm text-muted-foreground">{rows.length} record(s)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            Export CSV
          </Button>
          <Button onClick={() => setDialogOpen(true)}>Register {type.name}</Button>
        </div>
      </div>

      <Input
        placeholder="Search by name or ID…"
        value={search}
        onChange={(e) => applySearch(e.target.value)}
        className="max-w-xs"
      />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              {columns.map((f) => (
                <TableHead key={f.key}>{f.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">
                  <Link href={`/t/${type.slug}/${row.displayId}`} className="hover:underline">
                    {row.displayId}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/t/${type.slug}/${row.displayId}`} className="hover:underline">
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={row.status === "active" ? "secondary" : "outline"}>
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{row.locationName ?? "—"}</TableCell>
                {columns.map((f) => (
                  <TableCell key={f.key}>{formatFieldValue(f, row.data[f.key])}</TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4 + columns.length}
                  className="py-10 text-center text-muted-foreground"
                >
                  No records yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <EntityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={type}
        locations={locations}
      />
      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        typeSlug={type.slug}
        fields={type.fields}
      />
    </div>
  );
}
