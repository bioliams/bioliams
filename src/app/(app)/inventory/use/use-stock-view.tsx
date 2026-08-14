"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { consumeInventoryAction } from "../actions";

export interface UsableItem {
  entityId: string;
  displayId: string;
  name: string;
  typeName: string;
  typeSlug: string;
  quantity: string;
  unit: string;
  minThreshold: string | null;
  lot: string | null;
  locationName: string | null;
}

export interface UsageEntry {
  id: string;
  kind: string;
  delta: string;
  quantityAfter: string;
  unit: string;
  entityName: string;
  displayId: string;
  actorName: string | null;
  createdAt: string;
}

/** "2.50" and "2.5" are the same stock level; show the shorter one. */
function tidy(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : value;
}

function relativeTime(iso: string) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function UseStockView({ items, usage }: { items: UsableItem[]; usage: UsageEntry[] }) {
  const [query, setQuery] = useState("");
  // entityId → amount to take. One protocol usually draws on several reagents,
  // so selection is a basket rather than a single highlighted card.
  const [basket, setBasket] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      [i.name, i.displayId, i.typeName, i.lot ?? "", i.locationName ?? ""].some((field) =>
        field.toLowerCase().includes(q)
      )
    );
  }, [items, query]);

  const selectedIds = Object.keys(basket);

  function toggle(item: UsableItem) {
    setBasket((prev) => {
      if (item.entityId in prev) {
        const rest = { ...prev };
        delete rest[item.entityId];
        return rest;
      }
      return { ...prev, [item.entityId]: "1" };
    });
  }

  function setAmount(entityId: string, value: string) {
    setBasket((prev) => ({ ...prev, [entityId]: value }));
  }

  function record() {
    const entries = selectedIds.map((entityId) => ({ entityId, amount: basket[entityId] }));
    if (entries.length === 0) return;
    startTransition(async () => {
      const result = await consumeInventoryAction(entries);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const used = result.value ?? [];
      const summary = used
        .map((u) => `${u.name}: ${tidy(u.quantity)} ${u.unit} left`)
        .join(" · ");
      toast.success(
        used.length === 1 ? `Used ${used[0].name}` : `Recorded ${used.length} items`,
        { description: summary }
      );
      setBasket({});
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Use stock</h1>
          <p className="text-sm text-muted-foreground">
            Search for what you took off the shelf, tick everything the experiment used, and
            record it in one go.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/inventory">All inventory</Link>
        </Button>
      </div>

      <Input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          // A barcode scanner is a keyboard: it types the ID and presses Enter.
          // Selecting the single match turns the search box into a scan target
          // with no extra hardware support needed.
          if (e.key !== "Enter" || matches.length !== 1) return;
          e.preventDefault();
          if (!(matches[0].entityId in basket)) toggle(matches[0]);
          setQuery("");
        }}
        placeholder="Search or scan — name, ID, freezer, type or lot…"
        className="max-w-md"
      />

      {matches.length === 0 && (
        <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
          {items.length === 0
            ? "No inventory-tracked records yet. Mark a record type as “tracks inventory” in Settings → Record types."
            : `Nothing matches “${query}”.`}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((item) => {
          const selected = item.entityId in basket;
          const available = Number(item.quantity);
          const low = item.minThreshold !== null && available <= Number(item.minThreshold);
          const empty = available <= 0;
          return (
            <Card
              key={item.entityId}
              onClick={() => toggle(item)}
              className={cn(
                "cursor-pointer transition-colors",
                selected ? "border-primary ring-1 ring-primary" : "hover:border-foreground/30"
              )}
            >
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <Link
                        href={`/t/${item.typeSlug}/${item.displayId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono hover:underline"
                      >
                        {item.displayId}
                      </Link>
                      {" · "}
                      {item.typeName}
                      {item.lot ? ` · lot ${item.lot}` : ""}
                    </p>
                    <p className="truncate text-xs font-medium text-primary">
                      {item.locationName ?? "No location"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {empty ? (
                      <Badge variant="destructive">Out</Badge>
                    ) : low ? (
                      <Badge variant="destructive">Low</Badge>
                    ) : null}
                    <Checkbox
                      checked={selected}
                      disabled={empty}
                      aria-label={`Select ${item.name}`}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => toggle(item)}
                    />
                  </div>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tabular-nums">
                    {tidy(item.quantity)}
                  </span>
                  <span className="text-sm text-muted-foreground">{item.unit} available</span>
                </div>
                {item.minThreshold !== null && (
                  <p className="text-xs text-muted-foreground">
                    Minimum {tidy(item.minThreshold)} {item.unit}
                  </p>
                )}

                {selected && (
                  <div
                    className="flex items-center gap-2 border-t pt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={basket[item.entityId]}
                      disabled={pending}
                      onChange={(e) => setAmount(item.entityId, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !pending) record();
                      }}
                      className="h-9 w-24"
                      aria-label={`Amount of ${item.name} to use`}
                    />
                    <span className="text-sm text-muted-foreground">to use</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedIds.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-md border bg-background/95 p-3 shadow-lg backdrop-blur">
          <span className="text-sm">
            <strong>{selectedIds.length}</strong>{" "}
            {selectedIds.length === 1 ? "item" : "items"} selected
          </span>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => setBasket({})}>
            Clear
          </Button>
          <Button className="ml-auto" disabled={pending} onClick={record}>
            {pending ? "Recording…" : `Use ${selectedIds.length === 1 ? "item" : "all"}`}
          </Button>
        </div>
      )}

      {usage.length > 0 && (
        <div className="space-y-2 pt-2">
          <h2 className="text-sm font-medium text-muted-foreground">Recent usage</h2>
          <ul className="divide-y rounded-md border bg-card text-sm shadow-sm">
            {usage.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-2 px-3 py-2">
                <span className="font-medium tabular-nums">
                  {tidy(e.delta)} {e.unit}
                </span>
                <span className="text-muted-foreground">
                  {e.kind === "consume" ? "used of" : "adjusted on"}
                </span>
                <span className="truncate">{e.entityName}</span>
                <span className="font-mono text-xs text-muted-foreground">{e.displayId}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {tidy(e.quantityAfter)} {e.unit} left · {e.actorName ?? "Someone"} ·{" "}
                  {relativeTime(e.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
