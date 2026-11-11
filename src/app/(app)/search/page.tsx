import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { listEntities } from "@/lib/services/entities";
import { PageHeader } from "@/components/page-header";
import { getT } from "@/i18n/server";
import { statusLabel } from "@/i18n/labels";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("misc.search.title")} · BioLIMS` };
}

/** One box over every registry — the "where is that thing?" page. */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const ctx = await requireOrg();
  const t = await getT();
  const query = (q ?? "").trim();
  const { rows } = query
    ? await listEntities(ctx.orgId, { search: query, limit: 200, projectIds: ctx.projectIds })
    : { rows: [] };

  return (
    <div className="space-y-4">
      <PageHeader
        title={query ? t("misc.search.resultsFor", { query }) : t("misc.search.title")}
        description={
          query
            ? t("misc.search.found", { count: rows.length })
            : t("misc.search.hint")
        }
      />

      {query && (
        <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.id")}</TableHead>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("common.type")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("common.location")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ entity, typeName, typeSlug, locationName }) => (
                <TableRow key={entity.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      href={`/t/${typeSlug}/${entity.displayId}`}
                      className="hover:underline"
                    >
                      {entity.displayId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/t/${typeSlug}/${entity.displayId}`}
                      className="hover:underline"
                    >
                      {entity.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{typeName}</TableCell>
                  <TableCell>
                    <Badge variant={entity.status === "active" ? "secondary" : "outline"}>
                      {statusLabel(t, entity.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {locationName ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    {t("misc.search.nothing", { query })}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
