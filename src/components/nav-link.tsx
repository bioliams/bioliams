"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  exact,
  children,
}: {
  href: string;
  /** Match this path only, so a parent doesn't light up on its sub-pages. */
  exact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = href === "/" || exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-md px-3 py-1.5 transition-colors hover:bg-white/5 hover:text-white",
        active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
      )}
    >
      {children}
    </Link>
  );
}
