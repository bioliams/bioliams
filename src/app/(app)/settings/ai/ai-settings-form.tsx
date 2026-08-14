"use client";

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
    name: "Google Gemini (free tier)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-flash-latest",
    hint: "Key from aistudio.google.com — no card needed",
  },
  {
    name: "Groq (free tier)",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    hint: "Key from console.groq.com",
  },
  {
    name: "Ollama (self-hosted)",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.1",
    hint: "Free forever; data never leaves your machine",
  },
  {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    hint: "Paid",
  },
];

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
  const [baseUrl, setBaseUrl] = useState(current.baseUrl);
  const [model, setModel] = useState(current.model);
  const [apiKey, setApiKey] = useState("");
  const [pending, startTransition] = useTransition();

  if (!canEdit) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Only owners and admins can change the AI provider.
          {current.hasKey
            ? " This lab has its own key configured."
            : sharedAvailable
              ? " This lab currently uses the deployment's shared model."
              : " Nothing is configured yet."}
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
      toast.success("AI settings saved");
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
            title={preset.hint}
            onClick={() => {
              setBaseUrl(preset.baseUrl);
              setModel(preset.model);
            }}
            className="rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {preset.name}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ai-base">Base URL</Label>
              <Input
                id="ai-base"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="font-mono text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-model">Model</Label>
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
                API key{" "}
                <span className="font-normal text-muted-foreground">
                  {current.hasKey
                    ? "— one is stored; leave blank to keep it, or type “clear” to remove it"
                    : sharedAvailable
                      ? "— blank uses the deployment's shared model"
                      : ""}
                </span>
              </Label>
              <Input
                id="ai-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={current.hasKey ? "••••••••" : "Paste a key"}
                className="font-mono text-sm"
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        The key is stored with this lab and used only server-side to call your chosen
        provider. The assistant is read-only: it searches records and stock through the same
        permission-checked services as every page, and cannot change anything.
      </p>
    </div>
  );
}
