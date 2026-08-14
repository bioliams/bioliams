import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { listEntities } from "@/lib/services/entities";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Search · BioLIMS" };

/** One box over every registry — the "where is that thing?" page. */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const ctx = await requireOrg();
  const query = (q ?? "").trim();
  const { rows } = query
    ? await listEntities(ctx.orgId, { search: query, limit: 200, projectIds: ctx.projectIds })
    : { rows: [] };

  return (
    <div className="space-y-4">
      <PageHeader
        title={query ? `Results for “${query}”` : "Search"}
        description={
          query
            ? `${rows.length} record${rows.length === 1 ? "" : "s"} across every registry — names, IDs and field values.`
            : "Search every registry at once from the box in the header."
        }
      />

      {query && (
        <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
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
                      {entity.status}
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
                    Nothing matches “{query}”.
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
