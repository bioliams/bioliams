import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth";
import { listEntities, createEntity } from "@/lib/services/entities";

export const GET = withApiAuth(async (req, ctx) => {
  const url = new URL(req.url);
  const { rows, total } = await listEntities(ctx.orgId, {
    typeSlug: url.searchParams.get("type") ?? undefined,
    search: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    locationId: url.searchParams.get("location_id") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 100),
    offset: Number(url.searchParams.get("offset") ?? 0),
    sort: url.searchParams.get("sort") ?? undefined,
    dir: url.searchParams.get("dir") === "asc" ? "asc" : "desc",
  });

  return NextResponse.json({
    total,
    data: rows.map(({ entity, typeSlug, locationName }) => ({
      id: entity.id,
      display_id: entity.displayId,
      type: typeSlug,
      name: entity.name,
      status: entity.status,
      data: entity.data,
      location: locationName,
      location_id: entity.locationId,
      created_at: entity.createdAt,
    })),
  });
});

export const POST = withApiAuth(async (req, ctx) => {
  const body = await req.json();
  const row = await createEntity(ctx.orgId, null, {
    typeSlug: body.type,
    name: body.name,
    status: body.status,
    data: body.data ?? {},
    locationId: body.location_id ?? null,
    parentId: body.parent_id ?? null,
    quantity: body.quantity,
    unit: body.unit,
  });

  return NextResponse.json(
    {
      id: row.id,
      display_id: row.displayId,
      name: row.name,
      status: row.status,
      data: row.data,
    },
    { status: 201 }
  );
});
