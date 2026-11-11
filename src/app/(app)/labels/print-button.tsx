"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function PrintButton() {
  const t = useT();
  return <Button onClick={() => window.print()}>{t("misc.labels.print")}</Button>;
}
