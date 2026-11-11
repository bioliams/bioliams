import { getT } from "@/i18n/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiSettings } from "@/db/schema";
import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { AiSettingsForm } from "./ai-settings-form";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("nav.aiAssistant")} · BioLIMS` };
}

export default async function AiSettingsPage() {
  const ctx = await requireOrg();
  const t = await getT();
  const [row] = await db
    .select()
    .from(aiSettings)
    .where(eq(aiSettings.organizationId, ctx.orgId))
    .limit(1);

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        title={t("settings.ai.title")}
        description={t("settings.ai.description")}
      />
      <AiSettingsForm
        canEdit={can(ctx.role, "keys:manage")}
        current={{
          baseUrl: row?.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta/openai",
          model: row?.model ?? "gemini-flash-latest",
          hasKey: Boolean(row?.apiKey),
        }}
        sharedAvailable={Boolean(process.env.GEMINI_API_KEY)}
      />
    </div>
  );
}
