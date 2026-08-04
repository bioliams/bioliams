"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-md px-3 py-1.5 transition-colors hover:bg-muted",
        active && "bg-muted font-medium"
      )}
    >
      {children}
    </Link>
  );
}
