import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { entities } from "@/db/schema";
import { requireOrg } from "@/lib/tenant";
import { getEntityTypeBySlug, getEntity, getChildren } from "@/lib/services/entities";
import { listLocations, getLocationPath } from "@/lib/services/locations";
import { listAttachments } from "@/lib/services/attachments";
import { listAudit } from "@/lib/services/audit";
import { getInventoryForEntity } from "@/lib/services/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFieldValue } from "@/lib/format-field";
import { EntityDetailActions } from "./detail-actions";
import { AttachmentsPanel } from "./attachments-panel";

export default async function EntityDetailPage({
  params,
}: {
  params: Promise<{ slug: string; displayId: string }>;
}) {
  const { slug, displayId } = await params;
  const ctx = await requireOrg();

  const type = await getEntityTypeBySlug(ctx.orgId, slug);
  const entity = await getEntity(ctx.orgId, displayId);

  const [children, locations, files, history, inventory] = await Promise.all([
    getChildren(ctx.orgId, entity.id),
    listLocations(ctx.orgId),
    listAttachments(ctx.orgId, entity.id),
    listAudit(ctx.orgId, { targetId: entity.id, limit: 50 }),
    getInventoryForEntity(ctx.orgId, entity.id),
  ]);

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
                <ul className="space-y-1">
                  {children.map((c) => (
                    <li key={c.id}>
                      <Link href={`/t/${slug}/${c.displayId}`} className="hover:underline">
                        {c.displayId} · {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
                {history.map(({ entry, actorName }) => (
                  <li key={entry.id} className="flex justify-between gap-3">
                    <span className="font-mono text-xs">{entry.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {actorName ?? "system"} · {entry.createdAt.toLocaleString()}
                    </span>
                  </li>
                ))}
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
