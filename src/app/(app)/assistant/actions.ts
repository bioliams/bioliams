"use server";

import { requireOrg } from "@/lib/tenant";
import { requireCan } from "@/lib/permissions";
import { askAssistant, getAiConfig, saveAiSettings } from "@/lib/services/assistant";
import { type ActionResult, actionError } from "@/lib/action-result";

export async function askAssistantAction(
  history: { role: "user" | "assistant"; content: string }[]
): Promise<ActionResult<string>> {
  const ctx = await requireOrg();
  try {
    const config = await getAiConfig(ctx.orgId);
    if (!config) {
      return {
        error:
          "No AI provider is configured for this lab yet — an admin can add a key under Settings → AI assistant.",
      };
    }
    const value = await askAssistant(ctx.orgId, ctx.projectIds, config, history);
    return { ok: true, value };
  } catch (err) {
    return actionError(err);
  }
}

export async function saveAiSettingsAction(input: {
  baseUrl: string;
  apiKey: string | null;
  model: string;
}): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    requireCan(ctx.role, "keys:manage");
    await saveAiSettings(ctx.orgId, input);
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
