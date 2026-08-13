"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

/** Header search. Submits rather than searching as you type — a lab-wide query
 * hits every registry, so it waits until you mean it. */
export function GlobalSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <form
      className="hidden sm:block"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) router.push(`/search?q=${encodeURIComponent(value.trim())}`);
      }}
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search everything…"
        aria-label="Search all records"
        className="h-9 w-44 lg:w-64"
      />
    </form>
  );
}
