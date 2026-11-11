"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markReadAction } from "@/app/(app)/notifications/actions";
import { cn } from "@/lib/utils";

export interface BellItem {
  id: string;
  kind: "expired" | "expiring" | "out_of_stock" | "low_stock";
  message: string;
  href: string;
  read: boolean;
}

const DOT: Record<BellItem["kind"], string> = {
  expired: "bg-red-500",
  out_of_stock: "bg-red-500",
  expiring: "bg-amber-500",
  low_stock: "bg-amber-500",
};

/** Header bell: unread alarm count, the latest open alarms, and a way through to all of them. */
export function NotificationBell({ unread, items }: { unread: number; items: BellItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function open(item: BellItem) {
    startTransition(async () => {
      if (!item.read) await markReadAction([item.id]);
      router.push(item.href);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between">
          <DropdownMenuLabel>Stock alarms</DropdownMenuLabel>
          {unread > 0 && (
            <button
              type="button"
              disabled={pending}
              className="px-2 text-xs text-muted-foreground hover:underline"
              onClick={() =>
                startTransition(async () => {
                  await markReadAction();
                  router.refresh();
                })
              }
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Nothing expired, expiring or out of stock.
          </p>
        ) : (
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="items-start gap-2"
              onSelect={(e) => {
                e.preventDefault();
                open(item);
              }}
            >
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[item.kind])} />
              <span className={cn("text-sm", item.read && "text-muted-foreground")}>
                {item.message}
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="justify-center text-sm">
            Open notification center
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
