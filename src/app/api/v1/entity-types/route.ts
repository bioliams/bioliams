import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth";
import { listEntityTypes } from "@/lib/services/entities";
import { createEntityType } from "@/lib/services/entity-types";

export const GET = withApiAuth(async (_req, ctx) => {
  const rows = await listEntityTypes(ctx.orgId);
  return NextResponse.json({
    data: rows.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      prefix: t.prefix,
      is_inventory: t.isInventory,
      fields: t.fields,
    })),
  });
});

export const POST = withApiAuth(async (req, ctx) => {
  const body = await req.json();
  const row = await createEntityType(ctx.orgId, null, {
    name: body.name,
    prefix: body.prefix,
    color: body.color,
    isInventory: body.is_inventory,
    fields: body.fields ?? [],
  });
  return NextResponse.json(
    { id: row.id, name: row.name, slug: row.slug, prefix: row.prefix, fields: row.fields },
    { status: 201 }
  );
});
