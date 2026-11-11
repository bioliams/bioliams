import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { getAiConfig } from "@/lib/services/assistant";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { AssistantChat } from "./assistant-chat";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("nav.assistant")} · BioLIMS` };
}

export default async function AssistantPage() {
  const ctx = await requireOrg();
  const t = await getT();
  const config = await getAiConfig(ctx.orgId);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title={t("assistant.title")}
        description={t("assistant.description")}
        actions={
          can(ctx.role, "keys:manage") && (
            <Button variant="outline" asChild>
              <Link href="/settings/ai">{t("assistant.settings")}</Link>
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
