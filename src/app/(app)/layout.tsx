import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { listEntityTypes } from "@/lib/services/entities";
import { db } from "@/db";
import { organization } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ScanLine } from "lucide-react";
import { UserMenu } from "@/components/user-menu";
import { NavLink } from "@/components/nav-link";
import { MobileNav, type NavSection } from "@/components/mobile-nav";
import { GlobalSearch } from "@/components/global-search";
import { CommandPalette } from "@/components/command-palette";
import { Button } from "@/components/ui/button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrg();
  // Both only need the org id — issue them together rather than round-tripping twice.
  const [[org], types] = await Promise.all([
    db.select().from(organization).where(eq(organization.id, ctx.orgId)),
    listEntityTypes(ctx.orgId),
  ]);

  const navSections: NavSection[] = [
    {
      links: [
        { href: "/", label: "Dashboard" },
        { href: "/scan", label: "Scan a label" },
        { href: "/locations", label: "Storage" },
        { href: "/inventory", label: "Inventory" },
        { href: "/inventory/use", label: "Use stock" },
        { href: "/purchasing", label: "Purchasing" },
        { href: "/analytics", label: "Analytics" },
        { href: "/assistant", label: "Assistant" },
      ],
    },
    {
      label: "Registries",
      links: types.map((t) => ({ href: `/t/${t.slug}`, label: t.name, color: t.color })),
    },
    {
      label: "Settings",
      links: [
        { href: "/settings/types", label: "Record types" },
        { href: "/settings/members", label: "Members" },
        { href: "/settings/projects", label: "Projects" },
        { href: "/settings/api-keys", label: "API keys" },
        { href: "/settings/ai", label: "AI assistant" },
        { href: "/settings/audit", label: "Audit log" },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex print:hidden">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand-mark.png" alt="" className="size-6" />
            BioLIMS
          </Link>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto p-3 text-sm">
          <div className="space-y-1">
            <NavLink href="/">Dashboard</NavLink>
            <NavLink href="/scan">Scan a label</NavLink>
            <NavLink href="/locations">Storage</NavLink>
            <NavLink href="/inventory" exact>
              Inventory
            </NavLink>
            <NavLink href="/inventory/use">Use stock</NavLink>
            <NavLink href="/purchasing">Purchasing</NavLink>
            <NavLink href="/analytics">Analytics</NavLink>
            <NavLink href="/assistant">Assistant</NavLink>
          </div>

          <div className="space-y-1">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Registries
            </p>
            {types.map((t) => (
              <NavLink key={t.id} href={`/t/${t.slug}`}>
                <span
                  className="mr-2 inline-block size-2 rounded-full align-middle"
                  style={{ backgroundColor: t.color ?? "#64748b" }}
                />
                {t.name}
              </NavLink>
            ))}
            {types.length === 0 && (
              <p className="px-3 text-xs text-muted-foreground">No record types yet.</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Settings
            </p>
            <NavLink href="/settings/types">Record types</NavLink>
            <NavLink href="/settings/members">Members</NavLink>
            <NavLink href="/settings/projects">Projects</NavLink>
            <NavLink href="/settings/api-keys">API keys</NavLink>
            <NavLink href="/settings/ai">AI assistant</NavLink>
            <NavLink href="/settings/audit">Audit log</NavLink>
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-2 border-b bg-card px-4 md:px-6 print:hidden">
          <div className="flex min-w-0 items-center gap-1">
            <MobileNav sections={navSections} />
            <span className="truncate text-sm font-medium">{org?.name ?? "Lab"}</span>
          </div>
          <div className="flex items-center gap-1">
            <GlobalSearch />
            <Button variant="ghost" size="icon" asChild aria-label="Scan a label">
              <Link href="/scan">
                <ScanLine className="size-5" />
              </Link>
            </Button>
            <UserMenu name={ctx.userName} role={ctx.role} image={ctx.userImage} />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
        <CommandPalette />
      </div>
    </div>
  );
}
