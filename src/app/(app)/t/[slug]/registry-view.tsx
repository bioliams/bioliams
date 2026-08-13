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
import { saveViewAction, deleteViewAction } from "./view-actions";

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: string;
  sort: { key: string; dir: "asc" | "desc" };
  onSort: (key: string) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <TableHead>
      <button
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-foreground"
        aria-label={`Sort by ${label}`}
      >
        {label}
        <span className={active ? "" : "opacity-0 group-hover:opacity-40"}>
          {active ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </TableHead>
  );
}

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

export interface SavedView {
  id: string;
  name: string;
  query: Record<string, string>;
}

export function RegistryView({
  type,
  rows,
  locations,
  views,
  filters,
  canWrite,
}: {
  type: RegistryType;
  rows: RegistryRow[];
  locations: LocationOption[];
  views: SavedView[];
  filters: { q: string; status: string; locationId: string };
  canWrite: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.q);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({
    key: "displayId",
    dir: "desc",
  });
  const [, startTransition] = useTransition();

  // Only the first four custom fields get their own column; the rest live on the detail page.
  const columns = useMemo(() => type.fields.slice(0, 4), [type.fields]);

  const query = useMemo(
    () => ({
      ...(search ? { q: search } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.locationId ? { locationId: filters.locationId } : {}),
    }),
    [search, filters.status, filters.locationId]
  );

  function navigate(next: Record<string, string>) {
    startTransition(() => {
      const params = new URLSearchParams(Object.entries(next).filter(([, v]) => v));
      router.replace(`/t/${type.slug}${params.size ? `?${params}` : ""}`);
    });
  }

  function applySearch(value: string) {
    setSearch(value);
    navigate({ ...query, q: value });
  }

  /** Sorting is client-side over the loaded page, so a click reorders instantly. */
  const sorted = useMemo(() => {
    const cell = (row: RegistryRow, key: string): unknown => {
      switch (key) {
        case "displayId":
          return row.displayId;
        case "name":
          return row.name;
        case "status":
          return row.status;
        case "location":
          return row.locationName ?? "";
        default:
          return row.data[key];
      }
    };
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = cell(a, sort.key);
      const bv = cell(b, sort.key);
      // Empty cells sink to the bottom either way — a blank is not a value.
      if (av === null || av === undefined || av === "") return 1;
      if (bv === null || bv === undefined || bv === "") return -1;
      const an = Number(av);
      const bn = Number(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn) && av !== "" && bv !== "") {
        return (an - bn) * factor;
      }
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * factor;
    });
  }, [rows, sort]);

  function toggleSort(key: string) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  }

  async function saveCurrentView() {
    const name = window.prompt("Name this view (shared with the whole lab)");
    if (!name?.trim()) return;
    const result = await saveViewAction(type.slug, name, { ...query, sort: `${sort.key}:${sort.dir}` });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Saved “${name.trim()}”`);
    router.refresh();
  }

  function applyView(view: SavedView) {
    const { sort: savedSort, ...params } = view.query;
    if (savedSort) {
      const [key, dir] = savedSort.split(":");
      setSort({ key, dir: dir === "asc" ? "asc" : "desc" });
    }
    setSearch(params.q ?? "");
    navigate(params);
  }

  async function removeView(view: SavedView) {
    const result = await deleteViewAction(type.slug, view.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("View deleted");
    router.refresh();
  }

  const exportHeaders = ["id", "name", "status", "location", ...type.fields.map((f) => f.label)];

  function exportCell(r: RegistryRow, f: FieldDef) {
    const v = r.data[f.key];
    if (v === null || v === undefined) return "";
    return Array.isArray(v) ? v.join("|") : String(v);
  }

  async function exportExcel() {
    const { toXlsxBlob, downloadBlob } = await import("@/lib/spreadsheet");
    const blob = await toXlsxBlob(
      type.name,
      exportHeaders,
      sorted.map((r) => [
        r.displayId,
        r.name,
        r.status,
        r.locationName ?? "",
        ...type.fields.map((f) => exportCell(r, f)),
      ])
    );
    downloadBlob(blob, `${type.slug}-export.xlsx`);
    toast.success(`Exported ${sorted.length} record(s) to Excel`);
  }

  function exportCsv() {
    const headers = exportHeaders;
    const lines = sorted.map((r) =>
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
          {canWrite && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              Import
            </Button>
          )}
          <Button variant="outline" onClick={exportExcel} disabled={rows.length === 0}>
            Export Excel
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()} disabled={rows.length === 0}>
            Print / PDF
          </Button>
          {canWrite && (
            <Button onClick={() => setDialogOpen(true)}>Register {type.name}</Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Input
          placeholder="Search by name or ID…"
          value={search}
          onChange={(e) => applySearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={filters.status}
          onChange={(e) => navigate({ ...query, status: e.target.value })}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          aria-label="Filter by status"
        >
          <option value="">Any status</option>
          {["active", "in-use", "depleted", "archived"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filters.locationId}
          onChange={(e) => navigate({ ...query, locationId: e.target.value })}
          className="h-9 max-w-[14rem] rounded-md border bg-background px-2 text-sm"
          aria-label="Filter by location"
        >
          <option value="">Anywhere</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.kind})
            </option>
          ))}
        </select>
        <Button variant="ghost" size="sm" onClick={saveCurrentView}>
          Save as view
        </Button>
      </div>

      {views.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Views</span>
          {views.map((view) => (
            <span
              key={view.id}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs"
            >
              <button onClick={() => applyView(view)} className="hover:underline">
                {view.name}
              </button>
              <button
                onClick={() => removeView(view)}
                aria-label={`Delete view ${view.name}`}
                className="text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="ID" sortKey="displayId" sort={sort} onSort={toggleSort} />
              <SortHeader label="Name" sortKey="name" sort={sort} onSort={toggleSort} />
              <SortHeader label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
              <SortHeader label="Location" sortKey="location" sort={sort} onSort={toggleSort} />
              {columns.map((f) => (
                <SortHeader
                  key={f.key}
                  label={f.label}
                  sortKey={f.key}
                  sort={sort}
                  onSort={toggleSort}
                />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => (
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
