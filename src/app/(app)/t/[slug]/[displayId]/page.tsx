import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFoundOn404 } from "@/lib/not-found";
import { db } from "@/db";
import { entities, user } from "@/db/schema";
import { requireOrg } from "@/lib/tenant";
import { getEntityTypeBySlug, getEntity, getChildren } from "@/lib/services/entities";
import { listLocations, getLocationPath } from "@/lib/services/locations";
import { listAttachments } from "@/lib/services/attachments";
import { listAudit } from "@/lib/services/audit";
import { getInventoryForEntity } from "@/lib/services/inventory";
import { listProjects } from "@/lib/services/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { qrSvg } from "@/lib/barcode";
import { can } from "@/lib/permissions";
import { formatFieldValue } from "@/lib/format-field";
import { summariseAudit } from "@/lib/audit-summary";
import { EntityDetailActions } from "./detail-actions";
import { AttachmentsPanel } from "./attachments-panel";
import { StockPanel } from "./stock-panel";

export default async function EntityDetailPage({
  params,
}: {
  params: Promise<{ slug: string; displayId: string }>;
}) {
  const { slug, displayId } = await params;
  const ctx = await requireOrg();

  const [type, entity] = await Promise.all([
    getEntityTypeBySlug(ctx.orgId, slug).catch(notFoundOn404),
    getEntity(ctx.orgId, displayId, ctx.projectIds).catch(notFoundOn404),
  ]);

  const [children, locations, files, history, inventory, projects] = await Promise.all([
    getChildren(ctx.orgId, entity.id),
    listLocations(ctx.orgId),
    listAttachments(ctx.orgId, entity.id),
    listAudit(ctx.orgId, { targetId: entity.id, limit: 50 }),
    getInventoryForEntity(ctx.orgId, entity.id),
    listProjects(ctx.orgId),
  ]);

  const labelSvg = await qrSvg(entity.displayId, 112);

  let holderName: string | null = null;
  if (entity.checkedOutBy) {
    const [holder] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, entity.checkedOutBy))
      .limit(1);
    holderName = holder?.name ?? "Someone";
  }

  const locationPath = entity.locationId
    ? await getLocationPath(ctx.orgId, entity.locationId)
    : [];

  let parent: { displayId: string; name: string } | null = null;
  if (entity.parentId) {
    const rows = await db
      .select({ displayId: entities.displayId, name: entities.name })
      .from(entities)
      .where(eq(entities.id, entity.parentId))
      .limit(1);
    parent = rows[0] ?? null;
  }

  const well =
    entity.positionRow !== null && entity.positionCol !== null
      ? `${String.fromCharCode(65 + entity.positionRow)}${entity.positionCol + 1}`
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/t/${slug}`} className="text-sm text-muted-foreground hover:underline">
            ← {type.name}
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{entity.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">{entity.displayId}</p>
        </div>
        <EntityDetailActions
          type={{
            name: type.name,
            slug: type.slug,
            fields: type.fields,
            isInventory: type.isInventory,
          }}
          entity={{
            id: entity.id,
            name: entity.name,
            status: entity.status,
            data: entity.data,
            locationId: entity.locationId,
          }}
          locations={locations.map((l) => ({ id: l.id, name: l.name, kind: l.kind }))}
          stock={inventory ? { quantity: inventory.quantity, unit: inventory.unit } : null}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Status">
                <Badge variant={entity.status === "active" ? "secondary" : "outline"}>
                  {entity.status}
                </Badge>
              </Field>
              <Field label="Location">
                {locationPath.length > 0 ? (
                  <span>
                    {locationPath.map((l) => l.name).join(" › ")}
                    {well && <span className="ml-1 font-mono text-xs">[{well}]</span>}
                  </span>
                ) : (
                  "—"
                )}
              </Field>
              {inventory && (
                <Field label="Quantity">
                  {inventory.quantity} {inventory.unit}
                  {inventory.lot && (
                    <span className="ml-2 text-muted-foreground">lot {inventory.lot}</span>
                  )}
                </Field>
              )}
              <Field label="Created">{entity.createdAt.toLocaleString()}</Field>
              {type.fields.map((f) => (
                <Field key={f.key} label={f.label}>
                  {formatFieldValue(f, entity.data[f.key])}
                </Field>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lineage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Parent</p>
              {parent ? (
                <Link href={`/t/${slug}/${parent.displayId}`} className="hover:underline">
                  {parent.displayId} · {parent.name}
                </Link>
              ) : (
                <p className="text-muted-foreground">None</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Derived records ({children.length})
              </p>
              {children.length === 0 ? (
                <p className="text-muted-foreground">None</p>
              ) : (
                <>
                  <ul className="space-y-1">
                    {children.map((c) => (
                      <li key={c.id}>
                        <Link href={`/t/${slug}/${c.displayId}`} className="hover:underline">
                          {c.displayId} · {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/labels?ids=${children.map((c) => c.displayId).join(",")}`}
                    className="mt-2 inline-block text-xs text-muted-foreground hover:underline"
                  >
                    Print labels for all {children.length} →
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StockPanel
          entityId={entity.id}
          slug={slug}
          displayId={entity.displayId}
          stock={inventory ? { quantity: inventory.quantity, unit: inventory.unit } : null}
          locations={locations.map((l) => ({ id: l.id, name: l.name, kind: l.kind }))}
          currentLocationId={entity.locationId}
          custody={{
            holderName,
            isMine: entity.checkedOutBy === ctx.userId,
            since: entity.checkedOutAt ? entity.checkedOutAt.toLocaleString() : null,
          }}
          canWrite={can(ctx.role, "records:write")}
          projects={projects.map((p) => ({ id: p.project.id, name: p.project.name }))}
          projectId={entity.projectId}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Label</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div
              className="shrink-0 [&>svg]:h-28 [&>svg]:w-28"
              dangerouslySetInnerHTML={{ __html: labelSvg }}
            />
            <div className="space-y-2 text-sm">
              <p className="font-mono font-semibold">{entity.displayId}</p>
              <p className="text-muted-foreground">
                Scan with any phone camera to open this record — no app needed.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/labels?ids=${entity.displayId}`}>Print label</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <AttachmentsPanel
          entityId={entity.id}
          typeSlug={slug}
          displayId={entity.displayId}
          files={files.map((f) => ({
            id: f.id,
            fileName: f.fileName,
            sizeBytes: f.sizeBytes,
          }))}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recorded changes.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {history.map(({ entry, actorName }) => {
                  const details = summariseAudit(entry.action, entry.diff);
                  return (
                    <li key={entry.id} className="space-y-0.5">
                      <div className="flex justify-between gap-3">
                        <span className="font-mono text-xs">{entry.action}</span>
                        <span className="text-xs text-muted-foreground">
                          {actorName ?? "system"} · {entry.createdAt.toLocaleString()}
                        </span>
                      </div>
                      {details && <p className="text-xs text-muted-foreground">{details}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}
