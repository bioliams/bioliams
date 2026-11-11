"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/i18n/client";
import { kindLabel } from "@/i18n/labels";
import { PageHeader } from "@/components/page-header";
import type { LocationNode, LocationKind } from "@/lib/services/locations";
import {
  Building2,
  DoorOpen,
  Snowflake,
  Rows3,
  Grid3x3,
  Package,
} from "lucide-react";

const KIND_ICONS: Record<LocationKind, React.ComponentType<{ className?: string }>> = {
  site: Building2,
  room: DoorOpen,
  freezer: Snowflake,
  shelf: Rows3,
  rack: Grid3x3,
  box: Package,
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLocationAction, deleteLocationAction, assignPositionAction } from "./actions";
import { MAX_GRID_COLS, MAX_GRID_ROWS, wellLabel } from "@/lib/well";

const KINDS: LocationKind[] = ["site", "room", "freezer", "shelf", "rack", "box"];
const ROOT = "__root__";

export interface SelectedLocation {
  id: string;
  name: string;
  kind: string;
  gridRows: number | null;
  gridCols: number | null;
  contents: {
    id: string;
    displayId: string;
    name: string;
    positionRow: number | null;
    positionCol: number | null;
  }[];
}

export function LocationsView({
  tree,
  selected,
}: {
  tree: LocationNode[];
  selected: SelectedLocation | null;
}) {
  const router = useRouter();
  const t = useT();
  const [addOpen, setAddOpen] = useState(false);

  async function handleDelete(id: string, name: string) {
    const result = await deleteLocationAction(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("storage.deleted", { name }));
    router.replace("/locations");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("storage.title")}
        description={t("storage.description")}
        actions={<Button onClick={() => setAddOpen(true)}>{t("storage.add")}</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("storage.hierarchy")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {tree.length === 0 ? (
              <p className="text-muted-foreground">{t("storage.none")}</p>
            ) : (
              <ul className="space-y-1">
                {tree.map((node) => (
                  <TreeNode key={node.id} node={node} depth={0} selectedId={selected?.id} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {selected ? (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                {selected.name}{" "}
                <span className="font-normal text-muted-foreground">({kindLabel(t, selected.kind)})</span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(selected.id, selected.name)}
              >
                {t("common.delete")}
              </Button>
            </CardHeader>
            <CardContent>
              {selected.gridRows && selected.gridCols ? (
                <BoxGrid selected={selected} />
              ) : (
                <ContentsList selected={selected} />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <Snowflake className="size-8 opacity-30" />
              <p>{t("storage.pick")}</p>
              <p className="text-xs">{t("storage.pickHint")}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <AddLocationDialog open={addOpen} onOpenChange={setAddOpen} tree={tree} />
    </div>
  );
}

function TreeNode({
  node,
  depth,
  selectedId,
}: {
  node: LocationNode;
  depth: number;
  selectedId?: string;
}) {
  const t = useT();
  return (
    <li>
      <Link
        href={`/locations?id=${node.id}`}
        className={`flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted ${
          selectedId === node.id ? "bg-accent font-medium text-accent-foreground" : ""
        }`}
        style={{ paddingInlineStart: `${depth * 14 + 8}px` }}
        title={kindLabel(t, node.kind)}
      >
        {(() => {
          const Icon = KIND_ICONS[node.kind];
          return <Icon className="size-3.5 shrink-0 text-muted-foreground" />;
        })()}
        <span className="min-w-0 truncate">{node.name}</span>
        {node.itemCount > 0 && (
          <span className="ms-auto shrink-0 rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
            {node.itemCount}
          </span>
        )}
      </Link>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId} />
          ))}
        </ul>
      )}
    </li>
  );
}

function ContentsList({ selected }: { selected: SelectedLocation }) {
  const t = useT();
  if (selected.contents.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("storage.nothingHere")}</p>;
  }
  return (
    <ul className="space-y-1 text-sm">
      {selected.contents.map((c) => (
        <li key={c.id} className="flex gap-2">
          <span className="font-mono text-xs text-muted-foreground">{c.displayId}</span>
          {c.name}
        </li>
      ))}
    </ul>
  );
}

/** Renders an r×c box, with occupied wells labelled and click-to-clear. */
function BoxGrid({ selected }: { selected: SelectedLocation }) {
  const router = useRouter();
  const t = useT();
  const rows = selected.gridRows!;
  const cols = selected.gridCols!;

  const occupancy = new Map<string, SelectedLocation["contents"][number]>();
  const unplaced: SelectedLocation["contents"] = [];
  for (const item of selected.contents) {
    if (item.positionRow != null && item.positionCol != null) {
      occupancy.set(`${item.positionRow}:${item.positionCol}`, item);
    } else {
      unplaced.push(item);
    }
  }

  async function clearWell(entityId: string) {
    const result = await assignPositionAction(entityId, selected.id, null, null);
    if (result.error) toast.error(result.error);
    else {
      toast.success(t("storage.removedFromWell"));
      router.refresh();
    }
  }

  async function placeInWell(entityId: string, row: number, col: number) {
    const result = await assignPositionAction(entityId, selected.id, row, col);
    if (result.error) toast.error(result.fieldErrors?.position ?? result.error);
    else {
      toast.success(t("storage.placedAt", { well: wellLabel(row, col) }));
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {/* A box reads A1 top-left in every language — it's the physical layout. */}
      <div className="overflow-x-auto" dir="ltr">
        <div
          className="grid w-fit gap-1"
          style={{ gridTemplateColumns: `auto repeat(${cols}, minmax(2.5rem, 1fr))` }}
        >
          <div />
          {Array.from({ length: cols }, (_, c) => (
            <div key={`h${c}`} className="text-center text-xs text-muted-foreground">
              {c + 1}
            </div>
          ))}
          {Array.from({ length: rows }, (_, r) => (
            <FragmentRow
              key={`r${r}`}
              row={r}
              cols={cols}
              occupancy={occupancy}
              onClear={clearWell}
            />
          ))}
        </div>
      </div>

      {unplaced.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("storage.unplaced")}</p>
          <ul className="space-y-1 text-sm">
            {unplaced.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{item.displayId}</span>
                <span className="flex-1">{item.name}</span>
                <PlacePicker
                  rows={rows}
                  cols={cols}
                  occupancy={occupancy}
                  onPlace={(r, c) => placeInWell(item.id, r, c)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FragmentRow({
  row,
  cols,
  occupancy,
  onClear,
}: {
  row: number;
  cols: number;
  occupancy: Map<string, { id: string; displayId: string; name: string }>;
  onClear: (entityId: string) => void;
}) {
  const t = useT();
  return (
    <>
      <div className="pe-1 text-end text-xs text-muted-foreground">
        {String.fromCharCode(65 + row)}
      </div>
      {Array.from({ length: cols }, (_, c) => {
        const item = occupancy.get(`${row}:${c}`);
        return (
          <button
            key={`${row}:${c}`}
            type="button"
            title={
              item
                ? t("storage.clickToClear", { id: item.displayId, name: item.name })
                : t("storage.empty")
            }
            onClick={() => item && onClear(item.id)}
            className={`aspect-square rounded border text-[10px] leading-none ${
              item ? "bg-primary/15 border-primary/40" : "bg-muted/30 hover:bg-muted"
            }`}
          >
            {item ? item.displayId.split("-")[1] : ""}
          </button>
        );
      })}
    </>
  );
}

function PlacePicker({
  rows,
  cols,
  occupancy,
  onPlace,
}: {
  rows: number;
  cols: number;
  occupancy: Map<string, unknown>;
  onPlace: (row: number, col: number) => void;
}) {
  const t = useT();
  const free: { row: number; col: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!occupancy.has(`${r}:${c}`)) free.push({ row: r, col: c });
    }
  }
  if (free.length === 0)
    return <span className="text-xs text-muted-foreground">{t("storage.boxFull")}</span>;

  return (
    <Select
      onValueChange={(value) => {
        const [r, c] = value.split(":").map(Number);
        onPlace(r, c);
      }}
    >
      <SelectTrigger size="sm" className="w-28">
        <SelectValue placeholder={t("storage.place")} />
      </SelectTrigger>
      <SelectContent>
        {free.slice(0, 100).map((pos) => (
          <SelectItem key={`${pos.row}:${pos.col}`} value={`${pos.row}:${pos.col}`}>
            {wellLabel(pos.row, pos.col)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function flatten(nodes: LocationNode[], depth = 0): { id: string; label: string }[] {
  return nodes.flatMap((n) => [
    { id: n.id, label: `${"— ".repeat(depth)}${n.name}` },
    ...flatten(n.children, depth + 1),
  ]);
}

function AddLocationDialog({
  open,
  onOpenChange,
  tree,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tree: LocationNode[];
}) {
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<LocationKind>("box");
  const [parentId, setParentId] = useState<string>(ROOT);
  const [gridRows, setGridRows] = useState("9");
  const [gridCols, setGridCols] = useState("9");
  const [rackGrid, setRackGrid] = useState(false);
  const gridded = kind === "box" || (kind === "rack" && rackGrid);
  const [pending, setPending] = useState(false);

  const options = flatten(tree);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await createLocationAction({
      name,
      kind,
      parentId: parentId === ROOT ? null : parentId,
      gridRows: gridded ? Number(gridRows) : null,
      gridCols: gridded ? Number(gridCols) : null,
    });
    setPending(false);
    if (result.error) {
      const fieldErrors = Object.values(result.fieldErrors ?? {});
      toast.error(fieldErrors.length > 0 ? fieldErrors.join(" · ") : result.error);
      return;
    }
    toast.success(t("storage.created"));
    setName("");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("storage.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("storage.dialogDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loc-name">{t("common.name")}</Label>
            <Input id="loc-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loc-kind">{t("storage.kind")}</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as LocationKind)}>
                <SelectTrigger id="loc-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {kindLabel(t, k)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-parent">{t("storage.parent")}</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger id="loc-parent" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROOT}>{t("storage.topLevel")}</SelectItem>
                  {options.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {kind === "rack" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={rackGrid} onCheckedChange={(v) => setRackGrid(v === true)} />
              {t("storage.rackGrid")}
            </label>
          )}
          {gridded && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loc-rows">{t("storage.rows")}</Label>
                <Input
                  id="loc-rows"
                  type="number"
                  min={1}
                  max={MAX_GRID_ROWS}
                  value={gridRows}
                  onChange={(e) => setGridRows(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-cols">{t("storage.columns")}</Label>
                <Input
                  id="loc-cols"
                  type="number"
                  min={1}
                  max={MAX_GRID_COLS}
                  value={gridCols}
                  onChange={(e) => setGridCols(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("storage.creating") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
