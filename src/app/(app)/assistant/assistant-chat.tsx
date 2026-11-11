"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { askAssistantAction } from "./actions";
import { useT } from "@/i18n/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const SUGGESTIONS = ["low", "where", "week", "proteinase"] as const;

export function AssistantChat({
  configured,
  usingSharedKey,
}: {
  configured: boolean;
  usingSharedKey: boolean;
}) {
  const t = useT();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  function ask(question: string) {
    const text = question.trim();
    if (!text || pending) return;
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    startTransition(async () => {
      const result = await askAssistantAction(
        next.map(({ role, content }) => ({ role, content }))
      );
      setMessages((prev) => [
        ...prev,
        result.error
          ? { role: "assistant", content: result.error, error: true }
          : { role: "assistant", content: result.value ?? "" },
      ]);
    });
  }

  if (!configured) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          <Sparkles className="mx-auto mb-3 size-8 opacity-30" />
          {t("assistant.notConfigured")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-[36rem] flex-col overflow-hidden py-0">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Sparkles className="size-8 text-primary/40" />
            <p className="text-sm text-muted-foreground">
              {t("assistant.empty")}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((key) => t(`assistant.suggestions.${key}`)).map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : m.error
                    ? "border border-destructive/40 bg-destructive/5 text-destructive"
                    : "bg-muted"
              )}
            >
              <span dir="auto">{m.content}</span>
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
              {t("assistant.checking")}
            </div>
          </div>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pending}
          placeholder={t("assistant.placeholder")}
          className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          aria-label={t("assistant.label")}
        />
        <Button type="submit" disabled={pending || !input.trim()}>
          {t("assistant.ask")}
        </Button>
      </form>
      {usingSharedKey && (
        <p className="border-t px-3 py-1.5 text-center text-[11px] text-muted-foreground">
          {t("assistant.sharedKey")}
        </p>
      )}
    </Card>
  );
}
