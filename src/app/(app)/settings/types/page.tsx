import { requireOrg } from "@/lib/tenant";
import { listEntityTypes } from "@/lib/services/entities";
import { TypesManager } from "./types-manager";

export default async function TypesSettingsPage() {
  const ctx = await requireOrg();
  const types = await listEntityTypes(ctx.orgId);

  return (
    <TypesManager
      types={types.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        prefix: t.prefix,
        color: t.color,
        isInventory: t.isInventory,
        fields: t.fields,
      }))}
    />
  );
}
