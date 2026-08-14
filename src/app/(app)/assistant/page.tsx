import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { getAiConfig } from "@/lib/services/assistant";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { AssistantChat } from "./assistant-chat";

export const metadata = { title: "Assistant · BioLIMS" };

export default async function AssistantPage() {
  const ctx = await requireOrg();
  const config = await getAiConfig(ctx.orgId);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title="Lab assistant"
        description="Ask about samples, stock and activity in plain language. It reads the same records you can — nothing more."
        actions={
          can(ctx.role, "keys:manage") && (
            <Button variant="outline" asChild>
              <Link href="/settings/ai">AI settings</Link>
            </Button>
          )
        }
      />
      <AssistantChat
        configured={config !== null}
        usingSharedKey={config?.source === "shared"}
      />
    </div>
  );
}
