"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ScanLine,
  Snowflake,
  Boxes,
  FlaskConical,
  ShoppingCart,
  Search,
  FileText,
  HandHelping,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/translate";

interface RecordHit {
  displayId: string;
  name: string;
  typeName: string;
  href: string;
  location: string | null;
}

interface PageItem {
  label: MessageKey;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string;
}

const PAGES: PageItem[] = [
  { label: "nav.dashboard", href: "/", icon: LayoutDashboard, keywords: "home overview" },
  { label: "nav.scan", href: "/scan", icon: ScanLine, keywords: "barcode qr camera" },
  { label: "nav.storage", href: "/locations", icon: Snowflake, keywords: "freezer box rack location" },
  { label: "nav.inventory", href: "/inventory", icon: Boxes, keywords: "stock levels" },
  { label: "nav.useStock", href: "/inventory/use", icon: FlaskConical, keywords: "consume record usage" },
  { label: "nav.purchasing", href: "/purchasing", icon: ShoppingCart, keywords: "order buy request" },
  { label: "nav.biobank", href: "/biobank", icon: HandHelping, keywords: "biobank sample request pickup collect" },
  { label: "nav.auditLog", href: "/settings/audit", icon: FileText, keywords: "history changes" },
];

/**
 * ⌘K, and everything is two keystrokes away.
 *
 * Pages filter instantly; records stream in from the same scoped search the
 * rest of the app uses. Scientists live on keyboards more than people assume.
 */
export function CommandPalette() {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<RecordHit[]>([]);
  const [active, setActive] = useState(0);
  const fetchSeq = useRef(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setRecords([]);
      setActive(0);
    }
  }, []);

  // Debounced record search; a stale response must never overwrite a newer one.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const seq = ++fetchSeq.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/quick-search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { results: RecordHit[] };
        if (seq === fetchSeq.current) setRecords(data.results ?? []);
      } catch {
        // A failed lookup just means no record section this keystroke.
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const pages = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pages = PAGES.map((p) => ({ ...p, label: t(p.label) }));
    if (!q) return pages;
    return pages.filter(
      (p) => p.label.toLowerCase().includes(q) || p.keywords.includes(q)
    );
  }, [query, t]);

  const items = useMemo(
    () => [
      ...pages.map((p) => ({ kind: "page" as const, ...p })),
      ...records.map((r) => ({ kind: "record" as const, ...r })),
      ...(query.trim().length >= 2
        ? [{ kind: "search" as const, label: t("nav.palette.searchEverywhere", { query: query.trim() }) }]
        : []),
    ],
    [pages, records, query, t]
  );

  const go = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) return;
      setOpen(false);
      if (item.kind === "search") {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      } else {
        router.push(item.href);
      }
    },
    [items, query, router]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="top-24 max-w-lg translate-y-0 gap-0 p-0"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{t("nav.palette.title")}</DialogTitle>
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              if (e.target.value.trim().length < 2) setRecords([]);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(active);
              }
            }}
            placeholder={t("nav.palette.placeholder")}
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label={t("nav.palette.label")}
          />
          <kbd className="rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">
            esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t("nav.palette.nothing")}
            </p>
          )}
          {items.map((item, i) => (
            <button
              key={item.kind === "page" ? item.href : item.kind === "record" ? item.href : "search"}
              onClick={() => go(i)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-start text-sm",
                i === active ? "bg-accent text-accent-foreground" : "text-foreground"
              )}
            >
              {item.kind === "page" ? (
                <>
                  <item.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span>{item.label}</span>
                  <span className="ms-auto text-xs text-muted-foreground">{t("nav.palette.page")}</span>
                </>
              ) : item.kind === "record" ? (
                <>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {item.displayId}
                  </span>
                  <span className="min-w-0 truncate">{item.name}</span>
                  <span className="ms-auto shrink-0 text-xs text-muted-foreground">
                    {item.location ?? item.typeName}
                  </span>
                </>
              ) : (
                <>
                  <Search className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
