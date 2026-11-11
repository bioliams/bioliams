"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { dirOf } from "@/i18n/config";

export interface NavSection {
  label?: string;
  links: { href: string; label: string; color?: string | null }[];
}

/**
 * The sidebar is desktop-only, which left phones with no way to move around the
 * app — the one place a phone is actually used.
 */
export function MobileNav({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useT();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("nav.openMenu")}>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side={dirOf(t.locale) === "rtl" ? "right" : "left"} className="w-64 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand-mark.png" alt="" className="size-5" />
            BioLIMS
          </SheetTitle>
        </SheetHeader>
        <nav className="space-y-5 overflow-y-auto p-3 text-sm">
          {sections.map((section, i) => (
            <div key={i} className="space-y-1">
              {section.label && (
                <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {section.label}
                </p>
              )}
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2",
                    pathname === link.href ? "bg-muted font-medium" : "hover:bg-muted"
                  )}
                >
                  {link.color && (
                    <span
                      className="me-2 inline-block size-2 rounded-full align-middle"
                      style={{ backgroundColor: link.color }}
                    />
                  )}
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
