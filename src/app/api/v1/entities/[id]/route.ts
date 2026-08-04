import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth";
import { getEntity, updateEntity, deleteEntity } from "@/lib/services/entities";

type Params = { params: Promise<{ id: string }> };

function serialize(row: Awaited<ReturnType<typeof getEntity>>) {
  return {
    id: row.id,
    display_id: row.displayId,
    name: row.name,
    status: row.status,
    data: row.data,
    location_id: row.locationId,
    parent_id: row.parentId,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export const GET = withApiAuth(async (_req, ctx, { params }: Params) => {
  const { id } = await params;
  return NextResponse.json(serialize(await getEntity(ctx.orgId, id)));
});

export const PATCH = withApiAuth(async (req, ctx, { params }: Params) => {
  const { id } = await params;
  const body = await req.json();
  const existing = await getEntity(ctx.orgId, id);
  const row = await updateEntity(ctx.orgId, null, existing.id, {
    name: body.name,
    status: body.status,
    data: body.data,
    locationId: body.location_id,
    positionRow: body.position_row,
    positionCol: body.position_col,
  });
  return NextResponse.json(serialize(row));
});

export const DELETE = withApiAuth(async (_req, ctx, { params }: Params) => {
  const { id } = await params;
  const existing = await getEntity(ctx.orgId, id);
  await deleteEntity(ctx.orgId, null, existing.id);
  return new NextResponse(null, { status: 204 });
});
