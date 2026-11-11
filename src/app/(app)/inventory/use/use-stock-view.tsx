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
import { PageHeader } from "@/components/page-header";
import { useT } from "@/i18n/client";
import { formatRelative } from "@/i18n/format";

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
  /** Why — e.g. "Biobank request: …" when a pickup took it. */
  note: string | null;
  createdAt: string;
}

/** "2.50" and "2.5" are the same stock level; show the shorter one. */
function tidy(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : value;
}

export function UseStockView({ items, usage }: { items: UsableItem[]; usage: UsageEntry[] }) {
  const t = useT();
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
        .map((u) => t("inventory.use.leftSummary", { name: u.name, quantity: tidy(u.quantity), unit: u.unit }))
        .join(" · ");
      toast.success(
        used.length === 1
          ? t("inventory.use.usedOne", { name: used[0].name })
          : t("inventory.use.usedMany", { count: used.length }),
        { description: summary }
      );
      setBasket({});
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("inventory.use.title")}
        description={t("inventory.use.description")}
        actions={
          <Button variant="outline" asChild>
            <Link href="/inventory">{t("inventory.use.all")}</Link>
          </Button>
        }
      >
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
        placeholder={t("inventory.use.placeholder")}
        className="max-w-md"
      />
      </PageHeader>

      {matches.length === 0 && (
        <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
          {items.length === 0
            ? t("inventory.empty")
            : t("inventory.use.nothingMatches", { query })}
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
                      {item.lot ? t("inventory.use.lotPart", { lot: item.lot }) : ""}
                    </p>
                    <p className="truncate text-xs font-medium text-primary">
                      {item.locationName ?? t("common.noLocation")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {empty ? (
                      <Badge variant="destructive">{t("inventory.use.out")}</Badge>
                    ) : low ? (
                      <Badge variant="destructive">{t("inventory.use.low")}</Badge>
                    ) : null}
                    <Checkbox
                      checked={selected}
                      disabled={empty}
                      aria-label={t("inventory.use.select", { name: item.name })}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => toggle(item)}
                    />
                  </div>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tabular-nums">
                    {tidy(item.quantity)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t("inventory.use.available", { unit: item.unit })}
                  </span>
                </div>
                {item.minThreshold !== null && (
                  <p className="text-xs text-muted-foreground">
                    {t("inventory.use.minimum", { min: tidy(item.minThreshold), unit: item.unit })}
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
                      aria-label={t("inventory.use.amountOf", { name: item.name })}
                    />
                    <span className="text-sm text-muted-foreground">{t("inventory.use.toUse")}</span>
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
            {t("inventory.use.selected", { count: selectedIds.length })}
          </span>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => setBasket({})}>
            {t("inventory.use.clear")}
          </Button>
          <Button className="ms-auto" disabled={pending} onClick={record}>
            {pending
              ? t("inventory.use.recording")
              : selectedIds.length === 1
                ? t("inventory.use.useOne")
                : t("inventory.use.useAll")}
          </Button>
        </div>
      )}

      {usage.length > 0 && (
        <div className="space-y-2 pt-2">
          <h2 className="text-sm font-medium text-muted-foreground">{t("inventory.use.recent")}</h2>
          <ul className="divide-y rounded-md border bg-card text-sm shadow-sm">
            {usage.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-2 px-3 py-2">
                <span className="font-medium tabular-nums">
                  {tidy(e.delta)} {e.unit}
                </span>
                <span className="text-muted-foreground">
                  {e.kind === "consume" ? t("inventory.use.usedOf") : t("inventory.use.adjustedOn")}
                </span>
                <span className="truncate">{e.entityName}</span>
                <span className="font-mono text-xs text-muted-foreground">{e.displayId}</span>
                {e.note && <span className="truncate text-xs text-muted-foreground">· {e.note}</span>}
                <span className="ms-auto text-xs text-muted-foreground">
                  {t("inventory.use.left", { quantity: tidy(e.quantityAfter), unit: e.unit })} ·{" "}
                  {e.actorName ?? t("common.someone")} · {formatRelative(e.createdAt, t.locale)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
