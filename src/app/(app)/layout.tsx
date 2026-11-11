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
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import { after } from "next/server";
import { NotificationBell } from "@/components/notification-bell";
import {
  countUnread,
  describeNotification,
  emailAlarms,
  listNotifications,
  syncStockAlerts,
} from "@/lib/services/notifications";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrg();
  const t = await getT();
  // Both only need the org id — issue them together rather than round-tripping twice.
  const [[org], types] = await Promise.all([
    db.select().from(organization).where(eq(organization.id, ctx.orgId)),
    listEntityTypes(ctx.orgId),
  ]);

  // Re-evaluate alarms on every load: stock changes through many paths, and
  // expiry changes with nothing but the date. Email goes out after the
  // response so nobody waits on the mail server.
  const raised = await syncStockAlerts(ctx.orgId);
  if (raised.length > 0) after(() => emailAlarms(ctx.orgId, raised));
  const [unread, recentAlarms] = await Promise.all([
    countUnread(ctx.orgId, ctx.userId, ctx.projectIds),
    listNotifications(ctx.orgId, ctx.userId, ctx.projectIds, { open: true, limit: 8 }),
  ]);

  const navSections: NavSection[] = [
    {
      links: [
        { href: "/", label: t("nav.dashboard") },
        { href: "/notifications", label: t("nav.notifications") },
        { href: "/scan", label: t("nav.scan") },
        { href: "/locations", label: t("nav.storage") },
        { href: "/inventory", label: t("nav.inventory") },
        { href: "/inventory/use", label: t("nav.useStock") },
        { href: "/purchasing", label: t("nav.purchasing") },
        { href: "/biobank", label: t("nav.biobank") },
        { href: "/assistant", label: t("nav.assistant") },
      ],
    },
    {
      label: t("nav.registries"),
      links: types.map((t) => ({ href: `/t/${t.slug}`, label: t.name, color: t.color })),
    },
    {
      label: t("nav.settings"),
      links: [
        { href: "/settings/types", label: t("nav.recordTypes") },
        { href: "/settings/members", label: t("nav.members") },
        { href: "/settings/projects", label: t("nav.projects") },
        { href: "/settings/api-keys", label: t("nav.apiKeys") },
        { href: "/settings/ai", label: t("nav.aiAssistant") },
        { href: "/settings/audit", label: t("nav.auditLog") },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground md:flex print:hidden">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand-mark.png" alt="" className="size-6" />
            BioLIMS
          </Link>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto p-3 text-sm">
          <div className="space-y-1">
            <NavLink href="/">{t("nav.dashboard")}</NavLink>
            <NavLink href="/notifications">
              {t("nav.notifications")}
              {unread > 0 && (
                <span className="ms-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              )}
            </NavLink>
            <NavLink href="/scan">{t("nav.scan")}</NavLink>
            <NavLink href="/locations">{t("nav.storage")}</NavLink>
            <NavLink href="/inventory" exact>
              {t("nav.inventory")}
            </NavLink>
            <NavLink href="/inventory/use">{t("nav.useStock")}</NavLink>
            <NavLink href="/purchasing">{t("nav.purchasing")}</NavLink>
            <NavLink href="/biobank">{t("nav.biobank")}</NavLink>
            <NavLink href="/assistant">{t("nav.assistant")}</NavLink>
          </div>

          <div className="space-y-1">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("nav.registries")}
            </p>
            {types.map((t) => (
              <NavLink key={t.id} href={`/t/${t.slug}`}>
                <span
                  className="me-2 inline-block size-2 rounded-full align-middle"
                  style={{ backgroundColor: t.color ?? "#64748b" }}
                />
                {t.name}
              </NavLink>
            ))}
            {types.length === 0 && (
              <p className="px-3 text-xs text-muted-foreground">{t("nav.noTypes")}</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("nav.settings")}
            </p>
            <NavLink href="/settings/types">{t("nav.recordTypes")}</NavLink>
            <NavLink href="/settings/members">{t("nav.members")}</NavLink>
            <NavLink href="/settings/projects">{t("nav.projects")}</NavLink>
            <NavLink href="/settings/api-keys">{t("nav.apiKeys")}</NavLink>
            <NavLink href="/settings/ai">{t("nav.aiAssistant")}</NavLink>
            <NavLink href="/settings/audit">{t("nav.auditLog")}</NavLink>
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-2 border-b bg-card px-4 md:px-6 print:hidden">
          <div className="flex min-w-0 items-center gap-1">
            <MobileNav sections={navSections} />
            <span className="truncate text-sm font-medium">{org?.name ?? t("nav.lab")}</span>
          </div>
          <div className="flex items-center gap-1">
            <GlobalSearch />
            <NotificationBell
              unread={unread}
              items={recentAlarms.map((n) => ({
                id: n.id,
                kind: n.kind,
                message: describeNotification(n, t),
                href: `/t/${n.typeSlug}/${n.displayId}`,
                read: n.read,
              }))}
            />
            <ThemeToggle />
            <Button variant="ghost" size="icon" asChild aria-label={t("nav.scan")}>
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
