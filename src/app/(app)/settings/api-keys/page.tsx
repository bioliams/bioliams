import { requireOrg } from "@/lib/tenant";
import { listApiKeys } from "@/lib/services/api-keys";
import { ApiKeysManager } from "./api-keys-manager";

export default async function ApiKeysPage() {
  const ctx = await requireOrg();
  const keys = await listApiKeys(ctx.orgId);

  return (
    <ApiKeysManager
      keys={keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      }))}
    />
  );
}
