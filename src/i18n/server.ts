import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { createT } from "./translate";
import { getMessages } from "./messages";

/**
 * The visitor's language: their saved choice, else the browser's preference
 * if it's one we speak, else English.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  const accept = (await headers()).get("accept-language") ?? "";
  const preferred = accept
    .split(",")
    .map((part) => part.split(";")[0].trim().slice(0, 2).toLowerCase())
    .find(isLocale);
  return preferred ?? DEFAULT_LOCALE;
});

export const getT = cache(async () => {
  const locale = await getLocale();
  return createT(locale, getMessages(locale));
});
