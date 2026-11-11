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
  STATUS_LABELS,
  type BiobankStatus,
} from "@/lib/biobank-flow";
import { cn } from "@/lib/utils";
import { createBiobankRequestAction, setBiobankStatusAction } from "./actions";

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
  items: { displayId: string; name: string; href: string; where: string | null }[];
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

/** Button wording for each move, from the point of view of whoever clicks it. */
const ACTION_LABEL: Record<BiobankStatus, string> = {
  requested: "Reopen",
  processing: "Start processing",
  ready: "Ready for pickup",
  collected: "Mark collected",
  declined: "Decline",
  cancelled: "Cancel request",
};

const QUIET: BiobankStatus[] = ["declined", "cancelled", "requested"];

export function BiobankView({
  requests,
  userId,
  canRequest,
  canManage,
}: {
  requests: BiobankRow[];
  userId: string;
  canRequest: boolean;
  canManage: boolean;
}) {
  // The biobank wants the whole queue; everyone else mostly wants their own.
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
        title="Biobank requests"
        description={
          canManage
            ? "Samples people have asked the biobank for. Move each one along so they know when to come and collect it."
            : "Ask the biobank for samples, and see when they're ready to pick up."
        }
        actions={canRequest && <Button onClick={() => setCreating(true)}>New request</Button>}
      />

      <div className="flex items-center gap-1 text-sm" role="group" aria-label="Whose requests">
        {[
          { mine: false, label: "Everyone's" },
          { mine: true, label: "Mine" },
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
        <h2 className="text-sm font-medium text-muted-foreground">Open ({open.length})</h2>
        {open.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {mineOnly ? "You have no open requests." : "No open requests."}
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
          <h2 className="text-sm font-medium text-muted-foreground">Closed ({closed.length})</h2>
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
      <MoveDialog move={moving} onClose={() => setMoving(null)} />
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
              {row.requesterName ?? "Someone"} · {formatDate(row.createdAt)}
              {row.neededBy && (
                <span className={cn(overdue && "font-medium text-red-600 dark:text-red-400")}>
                  {" "}
                  · needed by {formatDate(row.neededBy)}
                </span>
              )}
            </p>
          </div>
          <Badge variant="outline" className={cn("shrink-0", STATUS_STYLE[row.status])}>
            {STATUS_LABELS[row.status]}
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
                {item.where && (
                  <span className="ml-auto text-xs text-muted-foreground">{item.where}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {row.response && (
          <p className="rounded-md border-l-2 border-primary/50 bg-primary/5 px-3 py-2 text-sm">
            <span className="text-xs font-medium text-muted-foreground">
              {row.handlerName ?? "Biobank"}:{" "}
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
                  {stepBack ? "Back to processing" : ACTION_LABEL[to]}
                </Button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Confirms a status change, with room for a note. Ready and declined are the
 * ones where a note matters most: where to collect, or why not.
 */
function MoveDialog({
  move,
  onClose,
}: {
  move: { row: BiobankRow; to: BiobankStatus } | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const to = move?.to;
  // Requesters cancelling or confirming pickup don't leave a note — that field
  // is the biobank's voice.
  const askNote = to === "ready" || to === "declined" || to === "processing";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!move) return;
    startTransition(async () => {
      const result = await setBiobankStatusAction(move.row.id, move.to, askNote ? note : null);
      if (result.error) {
        setError(result.fieldErrors?.response ?? result.error);
        return;
      }
      toast.success(`${move.row.title} — ${STATUS_LABELS[move.to].toLowerCase()}`);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{to ? ACTION_LABEL[to] : ""}</DialogTitle>
          <DialogDescription>{move?.row.title}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {askNote && (
            <div className="space-y-1.5">
              <Label htmlFor="move-note">
                {to === "ready"
                  ? "Where to collect it (optional)"
                  : to === "declined"
                    ? "Reason"
                    : "Note for the requester (optional)"}
              </Label>
              <Textarea
                id="move-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  to === "ready"
                    ? "e.g. Front desk, -20 °C freezer B, top shelf"
                    : to === "declined"
                      ? "e.g. Consent doesn't cover this use"
                      : "e.g. Thawing now, should be ready Thursday"
                }
                required={to ? needsResponse(to) : false}
              />
              {to === "ready" && (
                <p className="text-xs text-muted-foreground">
                  The requester gets an email when it&apos;s ready, if email is set up for this lab.
                </p>
              )}
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Back
            </Button>
            <Button type="submit" disabled={pending} variant={to === "declined" || to === "cancelled" ? "destructive" : "default"}>
              {pending ? "Saving…" : to ? ACTION_LABEL[to] : ""}
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
        recordIds: picked.map((p) => p.displayId),
      });
      if (result.error) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success("Request sent to the biobank");
      reset();
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request from the biobank</DialogTitle>
          <DialogDescription>
            Say what you need. If you know which samples, add them — the biobank will see
            exactly where each one is stored.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bb-title">
              What do you need?<span className="ml-0.5 text-red-600">*</span>
            </Label>
            <Input
              id="bb-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 3 aliquots of PT-014 plasma for ELISA"
              required
            />
            {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bb-records">Specific samples (optional)</Label>
            {picked.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {picked.map((p) => (
                  <li
                    key={p.displayId}
                    className="flex items-center gap-1 rounded-full border bg-muted/50 py-0.5 pr-1 pl-2 text-xs"
                  >
                    <span className="font-mono">{p.displayId}</span>
                    <span className="max-w-40 truncate">{p.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${p.displayId}`}
                      className="rounded-full p-0.5 hover:bg-muted"
                      onClick={() => setPicked((prev) => prev.filter((x) => x.displayId !== p.displayId))}
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Input
              id="bb-records"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or ID…"
              autoComplete="off"
              onKeyDown={(e) => {
                // Enter picks the top match rather than sending a half-filled request.
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (shown[0]) {
                  setPicked((prev) => [...prev, shown[0]]);
                  setQuery("");
                }
              }}
            />
            {shown.length > 0 && (
              <ul className="max-h-48 overflow-y-auto rounded-md border text-sm">
                {shown.map((r) => (
                  <li key={r.displayId}>
                    <button
                      type="button"
                      className="flex w-full items-baseline gap-2 px-2 py-1.5 text-left hover:bg-muted"
                      onClick={() => {
                        setPicked((prev) => [...prev, r]);
                        setQuery("");
                      }}
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
            <Label htmlFor="bb-details">Details (optional)</Label>
            <Textarea
              id="bb-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Volumes, how many aliquots, thawed or frozen, which project it's for…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bb-needed">Needed by (optional)</Label>
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
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Fixed locale and zone, so the server render and the browser agree. */
function formatDate(iso: string) {
  return DATE_FORMAT.format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso));
}
