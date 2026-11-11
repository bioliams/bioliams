"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { LOCALES, LOCALE_NAMES } from "@/i18n/config";
import { setLocaleAction } from "@/i18n/actions";
import { useT } from "@/i18n/client";

/** Language choices, for dropping into any dropdown menu. */
export function LanguageMenuItems() {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <>
      <DropdownMenuLabel className="font-normal text-muted-foreground">
        {t("common.language")}
      </DropdownMenuLabel>
      {LOCALES.map((locale) => (
        <DropdownMenuItem
          key={locale}
          disabled={pending}
          lang={locale}
          onSelect={() =>
            startTransition(async () => {
              await setLocaleAction(locale);
              router.refresh();
            })
          }
        >
          {LOCALE_NAMES[locale]}
          {locale === t.locale && <Check className="ms-auto size-4" />}
        </DropdownMenuItem>
      ))}
    </>
  );
}
