"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, LOCALE_NAMES } from "@/i18n/config";
import { setLocaleAction } from "@/i18n/actions";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** Inline language links, for pages without the user menu (sign-in, sign-up). */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className={cn("flex items-center gap-1 text-sm", className)} aria-label={t("common.language")}>
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          disabled={pending || locale === t.locale}
          aria-pressed={locale === t.locale}
          onClick={() =>
            startTransition(async () => {
              await setLocaleAction(locale);
              router.refresh();
            })
          }
          className={cn(
            "rounded-md px-2 py-1",
            locale === t.locale ? "font-medium text-foreground" : "text-muted-foreground hover:underline"
          )}
        >
          {LOCALE_NAMES[locale]}
        </button>
      ))}
    </div>
  );
}
