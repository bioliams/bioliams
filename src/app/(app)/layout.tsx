import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { listEntityTypes } from "@/lib/services/entities";
import { db } from "@/db";
import { organization } from "@/db/schema";
import { eq } from "drizzle-orm";
import { UserMenu } from "@/components/user-menu";
import { NavLink } from "@/components/nav-link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrg();
  // Both only need the org id — issue them together rather than round-tripping twice.
  const [[org], types] = await Promise.all([
    db.select().from(organization).where(eq(organization.id, ctx.orgId)),
    listEntityTypes(ctx.orgId),
  ]);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" className="font-semibold tracking-tight">
            🧪 BioLIMS
          </Link>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto p-3 text-sm">
          <div className="space-y-1">
            <NavLink href="/">Dashboard</NavLink>
            <NavLink href="/locations">Storage</NavLink>
            <NavLink href="/inventory" exact>
              Inventory
            </NavLink>
            <NavLink href="/inventory/use">Use stock</NavLink>
          </div>

          <div className="space-y-1">
            <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
            <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Settings
            </p>
            <NavLink href="/settings/types">Record types</NavLink>
            <NavLink href="/settings/members">Members</NavLink>
            <NavLink href="/settings/api-keys">API keys</NavLink>
            <NavLink href="/settings/audit">Audit log</NavLink>
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <span className="truncate text-sm font-medium">{org?.name ?? "Lab"}</span>
          <UserMenu name={ctx.userName} role={ctx.role} />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
