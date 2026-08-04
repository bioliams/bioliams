import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth";
import { listLocations, createLocation } from "@/lib/services/locations";

export const GET = withApiAuth(async (_req, ctx) => {
  const rows = await listLocations(ctx.orgId);
  return NextResponse.json({
    data: rows.map((l) => ({
      id: l.id,
      name: l.name,
      kind: l.kind,
      parent_id: l.parentId,
      grid_rows: l.gridRows,
      grid_cols: l.gridCols,
    })),
  });
});

export const POST = withApiAuth(async (req, ctx) => {
  const body = await req.json();
  const row = await createLocation(ctx.orgId, null, {
    name: body.name,
    kind: body.kind,
    parentId: body.parent_id ?? null,
    gridRows: body.grid_rows,
    gridCols: body.grid_cols,
  });
  return NextResponse.json({ id: row.id, name: row.name, kind: row.kind }, { status: 201 });
});
