"use client";

import { useT } from "@/i18n/client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { saveAiSettingsAction } from "@/app/(app)/assistant/actions";

const PRESETS = [
  {
    name: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-flash-latest",
    hint: "geminiHint",
  },
  {
    name: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    hint: "groqHint",
  },
  {
    name: "ollama",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.1",
    hint: "ollamaHint",
  },
  {
    name: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    hint: "openaiHint",
  },
] as const;

export function AiSettingsForm({
  canEdit,
  current,
  sharedAvailable,
}: {
  canEdit: boolean;
  current: { baseUrl: string; model: string; hasKey: boolean };
  sharedAvailable: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const [baseUrl, setBaseUrl] = useState(current.baseUrl);
  const [model, setModel] = useState(current.model);
  const [apiKey, setApiKey] = useState("");
  const [pending, startTransition] = useTransition();

  if (!canEdit) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          {t("settings.ai.onlyAdmins")}
          {current.hasKey
            ? t("settings.ai.ownKey")
            : sharedAvailable
              ? t("settings.ai.shared")
              : t("settings.ai.nothing")}
        </CardContent>
      </Card>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveAiSettingsAction({
        baseUrl,
        // empty field = keep the stored key; the word "clear" removes it
        apiKey: apiKey.trim() === "clear" ? null : apiKey.trim() || "",
        model,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("settings.ai.saved"));
      setApiKey("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            title={t(`settings.ai.presets.${preset.hint}`)}
            onClick={() => {
              setBaseUrl(preset.baseUrl);
              setModel(preset.model);
            }}
            className="rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {t(`settings.ai.presets.${preset.name}`)}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ai-base">{t("settings.ai.baseUrl")}</Label>
              <Input
                id="ai-base"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="font-mono text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-model">{t("settings.ai.model")}</Label>
              <Input
                id="ai-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="font-mono text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-key">
                {t("settings.ai.apiKey")}{" "}
                <span className="font-normal text-muted-foreground">
                  {current.hasKey
                    ? t("settings.ai.keyStored")
                    : sharedAvailable
                      ? t("settings.ai.blankShared")
                      : ""}
                </span>
              </Label>
              <Input
                id="ai-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={current.hasKey ? "••••••••" : t("settings.ai.paste")}
                className="font-mono text-sm"
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? t("common.saving") : t("common.save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {t("settings.ai.footnote")}
      </p>
    </div>
  );
}
