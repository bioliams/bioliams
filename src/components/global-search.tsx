"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";

/** Header search. Submits rather than searching as you type — a lab-wide query
 * hits every registry, so it waits until you mean it. */
export function GlobalSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const t = useT();

  return (
    <form
      className="hidden sm:block"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) router.push(`/search?q=${encodeURIComponent(value.trim())}`);
      }}
    >
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("nav.searchPlaceholder")}
          aria-label={t("nav.searchLabel")}
          className="h-9 w-44 pe-12 lg:w-64"
        />
        <kbd className="pointer-events-none absolute top-1/2 end-2 -translate-y-1/2 rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </div>
    </form>
  );
}
