/** Languages the interface speaks. Client-safe: no server imports here. */
export const LOCALES = ["en", "fa"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  fa: "فارسی",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return locale === "fa" ? "rtl" : "ltr";
}

/** The Intl tag to format with: Persian gets the Solar Hijri calendar it reads in. */
export function intlTag(locale: Locale) {
  return locale === "fa" ? "fa-IR" : "en-GB";
}
