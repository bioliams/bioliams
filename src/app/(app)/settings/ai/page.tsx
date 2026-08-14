import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiSettings } from "@/db/schema";
import { requireOrg } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { AiSettingsForm } from "./ai-settings-form";

export const metadata = { title: "AI assistant · BioLIMS" };

export default async function AiSettingsPage() {
  const ctx = await requireOrg();
  const [row] = await db
    .select()
    .from(aiSettings)
    .where(eq(aiSettings.organizationId, ctx.orgId))
    .limit(1);

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        title="AI assistant"
        description="Bring your own model. Any OpenAI-compatible endpoint works: Google Gemini (free tier), Groq, OpenAI, or a self-hosted Ollama — your key never leaves this lab's row."
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
