"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { askAssistantAction } from "./actions";

interface Message {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const SUGGESTIONS = [
  "What's running low?",
  "Where are the PT-014 aliquots?",
  "What was used this week?",
  "Do we have any Proteinase K left?",
];

export function AssistantChat({
  configured,
  usingSharedKey,
}: {
  configured: boolean;
  usingSharedKey: boolean;
}) {
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
          No AI provider is configured for this lab yet. An admin can add a key — Gemini,
          Groq, OpenAI or a self-hosted Ollama all work — under Settings → AI assistant.
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
              Ask anything about the lab&rsquo;s records and stock.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
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
              {m.content}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
              Checking the records…
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
          placeholder="e.g. how much Taq do we have, and where is it?"
          className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          aria-label="Ask the lab assistant"
        />
        <Button type="submit" disabled={pending || !input.trim()}>
          Ask
        </Button>
      </form>
      {usingSharedKey && (
        <p className="border-t px-3 py-1.5 text-center text-[11px] text-muted-foreground">
          Using the shared demo model — add your lab&rsquo;s own key in Settings → AI assistant.
        </p>
      )}
    </Card>
  );
}
