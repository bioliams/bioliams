"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  allowedNext,
  needsResponse,
  OPEN_STATUSES,
  type BiobankStatus,
} from "@/lib/biobank-flow";
import { cn } from "@/lib/utils";
import { createBiobankRequestAction, setBiobankStatusAction } from "./actions";
import { useT } from "@/i18n/client";
import { intlTag, type Locale } from "@/i18n/config";

/** A stock-tracked record the biobank can take from (managers only). */
export interface StockOption {
  entityId: string;
  displayId: string;
  name: string;
  typeName: string;
  quantity: string;
  unit: string;
}

export interface BiobankRow {
  id: string;
  title: string;
  details: string | null;
  neededBy: string | null;
  status: BiobankStatus;
  response: string | null;
  requestedBy: string | null;
  requesterName: string | null;
  handlerName: string | null;
  items: {
    id: string;
    displayId: string;
    name: string;
    href: string;
    where: string | null;
    /** Amount asked for, in the stock unit. */
    quantity: string | null;
    /** Amount the biobank took from stock when it made this ready. */
    takenQuantity: string | null;
    /** Current stock, or null when this record doesn't track stock. */
    stock: { quantity: string; unit: string } | null;
  }[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_STYLE: Record<BiobankStatus, string> = {
  requested: "border-border text-muted-foreground",
  processing: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ready: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  collected: "border-border bg-muted text-muted-foreground",
  declined: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  cancelled: "border-border bg-muted text-muted-foreground",
};

const QUIET: BiobankStatus[] = ["declined", "cancelled", "requested"];

export function BiobankView({
  requests,
  userId,
  canRequest,
  canManage,
  stockOptions,
}: {
  requests: BiobankRow[];
  userId: string;
  canRequest: boolean;
  canManage: boolean;
  stockOptions: StockOption[];
}) {
  // The biobank wants the whole queue; everyone else mostly wants their own.
  const t = useT();
  const [mineOnly, setMineOnly] = useState(!canManage);
  const [creating, setCreating] = useState(false);
  const [moving, setMoving] = useState<{ row: BiobankRow; to: BiobankStatus } | null>(null);

  const visible = mineOnly ? requests.filter((r) => r.requestedBy === userId) : requests;
  const open = visible.filter((r) => OPEN_STATUSES.includes(r.status));
  const closed = visible.filter((r) => !OPEN_STATUSES.includes(r.status));
  // Ready first (someone should go and get it), then oldest-waiting first.
  const order: Record<string, number> = { ready: 0, processing: 1, requested: 2 };
  open.sort((a, b) => order[a.status] - order[b.status] || a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("biobank.title")}
        description={canManage ? t("biobank.descManager") : t("biobank.descMember")}
        actions={
          canRequest && <Button onClick={() => setCreating(true)}>{t("biobank.newRequest")}</Button>
        }
      />

      <div className="flex items-center gap-1 text-sm" role="group" aria-label={t("biobank.whose")}>
        {[
          { mine: false, label: t("biobank.everyones") },
          { mine: true, label: t("biobank.mine") },
        ].map((opt) => (
          <Button
            key={opt.label}
            size="sm"
            variant={mineOnly === opt.mine ? "secondary" : "ghost"}
            aria-pressed={mineOnly === opt.mine}
            onClick={() => setMineOnly(opt.mine)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("biobank.open", { count: open.length })}
        </h2>
        {open.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {mineOnly ? t("biobank.noneMine") : t("biobank.none")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {open.map((row) => (
              <RequestCard
                key={row.id}
                row={row}
                userId={userId}
                canManage={canManage}
                onMove={(to) => setMoving({ row, to })}
              />
            ))}
          </div>
        )}
      </section>

      {closed.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t("biobank.closed", { count: closed.length })}
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {closed.map((row) => (
              <RequestCard
                key={row.id}
                row={row}
                userId={userId}
                canManage={canManage}
                onMove={(to) => setMoving({ row, to })}
              />
            ))}
          </div>
        </section>
      )}

      <NewRequestDialog open={creating} onOpenChange={setCreating} />
      <MoveDialog
        key={moving ? `${moving.row.id}:${moving.to}` : "none"}
        move={moving}
        stockOptions={stockOptions}
        onClose={() => setMoving(null)}
      />
    </div>
  );
}

function RequestCard({
  row,
  userId,
  canManage,
  onMove,
}: {
  row: BiobankRow;
  userId: string;
  canManage: boolean;
  onMove: (to: BiobankStatus) => void;
}) {
  const t = useT();
  const hats: ("biobank" | "requester")[] = [];
  if (canManage) hats.push("biobank");
  if (row.requestedBy === userId) hats.push("requester");
  const next = allowedNext(row.status, hats);
  const overdue =
    row.neededBy && OPEN_STATUSES.includes(row.status) && row.neededBy < new Date().toISOString().slice(0, 10);

  return (
    <Card className={cn(row.status === "ready" && "border-emerald-500/40")}>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="text-xs text-muted-foreground">
              {row.requesterName ?? t("common.someone")} · {formatDate(row.createdAt, t.locale)}
              {row.neededBy && (
                <span className={cn(overdue && "font-medium text-red-600 dark:text-red-400")}>
                  {t("biobank.neededBy", { date: formatDate(row.neededBy, t.locale) })}
                </span>
              )}
            </p>
          </div>
          <Badge variant="outline" className={cn("shrink-0", STATUS_STYLE[row.status])}>
            {t(`biobank.statuses.${row.status}`)}
          </Badge>
        </div>

        {row.details && <p className="whitespace-pre-wrap text-sm">{row.details}</p>}

        {row.items.length > 0 && (
          <ul className="space-y-1 rounded-md border bg-muted/30 p-2 text-sm">
            {row.items.map((item) => (
              <li key={item.displayId} className="flex flex-wrap items-baseline gap-x-2">
                <Link href={item.href} className="font-mono text-xs hover:underline">
                  {item.displayId}
                </Link>
                <span>{item.name}</span>
                <StockNote item={item} open={OPEN_STATUSES.includes(row.status)} />
                {item.where && (
                  <span className="ms-auto text-xs text-muted-foreground">{item.where}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {row.response && (
          <p className="rounded-md border-s-2 border-primary/50 bg-primary/5 px-3 py-2 text-sm">
            <span className="text-xs font-medium text-muted-foreground">
              {row.handlerName ?? t("biobank.biobank")}:{" "}
            </span>
            {row.response}
          </p>
        )}

        {next.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {next.map((to) => {
              const stepBack = row.status === "ready" && to === "processing";
              return (
                <Button
                  key={to}
                  size="sm"
                  variant={QUIET.includes(to) || stepBack ? "outline" : "default"}
                  onClick={() => onMove(to)}
                >
                  {stepBack ? t("biobank.backToProcessing") : t(`biobank.actions.${to}`)}
                </Button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** What this request means for the item's stock, in one short phrase. */
function StockNote({ item, open }: { item: BiobankRow["items"][number]; open: boolean }) {
  const t = useT();
  if (!item.stock) return null;
  const unit = item.stock.unit;
  if (item.takenQuantity) {
    return (
      <span className="text-xs text-emerald-700 dark:text-emerald-300">
        {t("biobank.taken", { quantity: tidy(item.takenQuantity), unit })}
      </span>
    );
  }
  // Once a request is closed, today's stock level says nothing about it.
  if (!open) return null;
  const short = item.quantity !== null && Number(item.quantity) > Number(item.stock.quantity);
  return (
    <span className="text-xs text-muted-foreground">
      {item.quantity && t("biobank.asked", { quantity: tidy(item.quantity), unit })}
      <span className={cn(short && "font-medium text-red-600 dark:text-red-400")}>
        {t("biobank.inStock", { quantity: tidy(item.stock.quantity), unit })}
      </span>
    </span>
  );
}

function AmountInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useT();
  return (
    <Input
      aria-label={t("biobank.amountOf", { label })}
      type="number"
      step="any"
      min="0"
      placeholder={t("biobank.amount")}
      className="h-8 w-24"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** "50.000" and "50" are the same amount; show the shorter one. */
function tidy(n: string) {
  const x = Number(n);
  return Number.isFinite(x) ? String(x) : n;
}

/**
 * Confirms a status change, with room for a note. Ready and declined are the
 * ones where a note matters most: where to collect, or why not.
 */
function MoveDialog({
  move,
  stockOptions,
  onClose,
}: {
  move: { row: BiobankRow; to: BiobankStatus } | null;
  stockOptions: StockOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const t = useT();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const to = move?.to;
  // Making it ready is when things leave the shelf, so that's when stock
  // comes off — like Use stock, but filed under this request.
  const ready = to === "ready";
  const attached = ready ? (move?.row.items ?? []) : [];
  const takeable = attached.filter((i) => i.stock && !i.takenQuantity);
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(takeable.map((i) => [i.id, i.quantity ? tidy(i.quantity) : ""]))
  );
  // Anything else from stock the biobank hands over — requests are often
  // free text, so what comes off the shelf is decided here.
  const [extra, setExtra] = useState<(StockOption & { amount: string })[]>([]);
  const [search, setSearch] = useState("");
  const listed = new Set([...attached.map((i) => i.displayId), ...extra.map((x) => x.displayId)]);
  const q = search.trim().toLowerCase();
  const matches = q
    ? stockOptions
        .filter((o) => !listed.has(o.displayId))
        .filter((o) => `${o.displayId} ${o.name} ${o.typeName}`.toLowerCase().includes(q))
        .slice(0, 8)
    : [];
  // Requesters cancelling or confirming pickup don't leave a note — that field
  // is the biobank's voice.
  const askNote = to === "ready" || to === "declined" || to === "processing";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!move) return;
    startTransition(async () => {
      const result = await setBiobankStatusAction(
        move.row.id,
        move.to,
        askNote ? note : null,
        ready
          ? [
              ...takeable.map((i) => ({ itemId: i.id, amount: amounts[i.id] ?? "" })),
              ...extra.map((x) => ({ entityId: x.entityId, amount: x.amount })),
            ]
          : undefined
      );
      if (result.error) {
        setError(result.fieldErrors?.response ?? result.fieldErrors?.take ?? result.error);
        return;
      }
      const took =
        takeable.filter((i) => Number(amounts[i.id]) > 0).length +
        extra.filter((x) => Number(x.amount) > 0).length;
      toast.success(
        t("biobank.moved", { title: move.row.title, status: t(`biobank.statuses.${move.to}`) }),
        { description: took ? t("biobank.takenFor", { count: took }) : undefined }
      );
      setNote("");
      setError(null);
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={move !== null}
      onOpenChange={(next) => {
        if (!next) {
          setNote("");
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent className={cn("max-h-[85vh] overflow-y-auto", ready ? "sm:max-w-lg" : "sm:max-w-md")}>
        <DialogHeader>
          <DialogTitle>{to ? t(`biobank.actions.${to}`) : ""}</DialogTitle>
          <DialogDescription>{move?.row.title}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {ready && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t("biobank.takeFromStock")}</legend>
              <p className="text-xs text-muted-foreground">
                {t("biobank.takeHelp")}
              </p>
              {move?.row.details && (
                <p className="rounded-md bg-muted/50 px-2 py-1.5 text-xs whitespace-pre-wrap">
                  <span className="font-medium">{t("biobank.theyAsked")}</span>
                  {move.row.details}
                </p>
              )}
              {(attached.length > 0 || extra.length > 0) && (
                <ul className="space-y-1.5">
                  {attached.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-xs text-muted-foreground">{item.displayId}</span>
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      {item.takenQuantity ? (
                        <span className="text-xs text-muted-foreground">
                          {t("biobank.alreadyTaken", {
                            quantity: tidy(item.takenQuantity),
                            unit: item.stock?.unit ?? "",
                          })}
                        </span>
                      ) : item.stock ? (
                        <>
                          <AmountInput
                            label={item.displayId}
                            value={amounts[item.id] ?? ""}
                            onChange={(v) => setAmounts((prev) => ({ ...prev, [item.id]: v }))}
                          />
                          <span className="w-28 text-xs text-muted-foreground">
                            {t("biobank.unitOf", { unit: item.stock.unit, quantity: tidy(item.stock.quantity) })}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("biobank.notTracked")}</span>
                      )}
                    </li>
                  ))}
                  {extra.map((x) => (
                    <li key={x.entityId} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-xs text-muted-foreground">{x.displayId}</span>
                      <span className="min-w-0 flex-1 truncate">{x.name}</span>
                      <AmountInput
                        label={x.displayId}
                        value={x.amount}
                        onChange={(v) =>
                          setExtra((prev) => prev.map((p) => (p.entityId === x.entityId ? { ...p, amount: v } : p)))
                        }
                      />
                      <span className="w-28 text-xs text-muted-foreground">
                        {t("biobank.unitOf", { unit: x.unit, quantity: tidy(x.quantity) })}
                      </span>
                      <button
                        type="button"
                        aria-label={t("biobank.removeItem", { id: x.displayId })}
                        className="rounded-full p-1 hover:bg-muted"
                        onClick={() => setExtra((prev) => prev.filter((p) => p.entityId !== x.entityId))}
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Input
                aria-label={t("biobank.addFromStock")}
                placeholder={t("biobank.addFromStockPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (matches[0]) {
                    setExtra((prev) => [...prev, { ...matches[0], amount: "" }]);
                    setSearch("");
                  }
                }}
                autoComplete="off"
              />
              {matches.length > 0 && (
                <ul className="max-h-40 overflow-y-auto rounded-md border text-sm">
                  {matches.map((o) => (
                    <li key={o.entityId}>
                      <button
                        type="button"
                        className="flex w-full items-baseline gap-2 px-2 py-1.5 text-start hover:bg-muted"
                        onClick={() => {
                          setExtra((prev) => [...prev, { ...o, amount: "" }]);
                          setSearch("");
                        }}
                      >
                        <span className="font-mono text-xs text-muted-foreground">{o.displayId}</span>
                        <span className="flex-1 truncate">{o.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {tidy(o.quantity)} {o.unit}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {q && matches.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("biobank.noStockMatch")}
                </p>
              )}
            </fieldset>
          )}
          {askNote && (
            <div className="space-y-1.5">
              <Label htmlFor="move-note">
                {to === "ready"
                  ? t("biobank.whereToCollect")
                  : to === "declined"
                    ? t("biobank.reason")
                    : t("biobank.noteForRequester")}
              </Label>
              <Textarea
                id="move-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  to === "ready"
                    ? t("biobank.wherePlaceholder")
                    : to === "declined"
                      ? t("biobank.reasonPlaceholder")
                      : t("biobank.notePlaceholder")
                }
                required={to ? needsResponse(to) : false}
              />
              {to === "ready" && (
                <p className="text-xs text-muted-foreground">
                  {t("biobank.emailNote")}
                </p>
              )}
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.back")}
            </Button>
            <Button type="submit" disabled={pending} variant={to === "declined" || to === "cancelled" ? "destructive" : "default"}>
              {pending ? t("common.saving") : to ? t(`biobank.actions.${to}`) : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface SearchResult {
  displayId: string;
  name: string;
  typeName: string;
  location: string | null;
}

function NewRequestDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const t = useT();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [picked, setPicked] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/quick-search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { results: SearchResult[] }) => setResults(data.results ?? []))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const shown = query.trim().length < 2 ? [] : results.filter((r) => !picked.some((p) => p.displayId === r.displayId));

  function pick(result: SearchResult) {
    setPicked((prev) => [...prev, result]);
    setQuery("");
  }

  function reset() {
    setTitle("");
    setDetails("");
    setNeededBy("");
    setPicked([]);
    setQuery("");
    setResults([]);
    setErrors({});
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createBiobankRequestAction({
        title,
        details,
        neededBy: neededBy || null,
        // No amounts: how much comes off stock is the biobank's call when it's made ready.
        items: picked.map((p) => ({ displayId: p.displayId })),
      });
      if (result.error) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success(t("biobank.sent"));
      reset();
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("biobank.newTitle")}</DialogTitle>
          <DialogDescription>
            {t("biobank.newDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bb-title">
              {t("biobank.what")}<span className="ms-0.5 text-red-600">*</span>
            </Label>
            <Input
              id="bb-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("biobank.whatPlaceholder")}
              required
            />
            {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bb-records">{t("biobank.specific")}</Label>
            {picked.length > 0 && (
              <ul className="divide-y rounded-md border text-sm">
                {picked.map((p) => (
                  <li key={p.displayId} className="flex items-center gap-2 px-2 py-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{p.displayId}</span>
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.typeName}</span>
                    <button
                      type="button"
                      aria-label={t("biobank.removeItem", { id: p.displayId })}
                      className="rounded-full p-1 hover:bg-muted"
                      onClick={() => setPicked((prev) => prev.filter((x) => x.displayId !== p.displayId))}
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Input
              id="bb-records"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("registry.searchPlaceholder")}
              autoComplete="off"
              onKeyDown={(e) => {
                // Enter picks the top match rather than sending a half-filled request.
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (shown[0]) pick(shown[0]);
              }}
            />
            {shown.length > 0 && (
              <ul className="max-h-48 overflow-y-auto rounded-md border text-sm">
                {shown.map((r) => (
                  <li key={r.displayId}>
                    <button
                      type="button"
                      className="flex w-full items-baseline gap-2 px-2 py-1.5 text-start hover:bg-muted"
                      onClick={() => pick(r)}
                    >
                      <span className="font-mono text-xs text-muted-foreground">{r.displayId}</span>
                      <span className="flex-1 truncate">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{r.typeName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {errors.recordIds && <p className="text-xs text-red-600">{errors.recordIds}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bb-details">{t("biobank.detailsLabel")}</Label>
            <Textarea
              id="bb-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t("biobank.detailsPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bb-needed">{t("biobank.neededByLabel")}</Label>
            <Input
              id="bb-needed"
              type="date"
              value={neededBy}
              onChange={(e) => setNeededBy(e.target.value)}
              className="w-48"
            />
            {errors.neededBy && <p className="text-xs text-red-600">{errors.neededBy}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("biobank.sending") : t("biobank.send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Fixed zone, so the server render and the browser agree. */
function formatDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(intlTag(locale), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso));
}
