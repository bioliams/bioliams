import { intlTag, type Locale } from "./config";

/** A date and time in the reader's calendar: Gregorian for English, Solar Hijri for Persian. */
export function formatDateTime(d: Date | string | null | undefined, locale: Locale) {
  if (!d) return "";
  return new Intl.DateTimeFormat(intlTag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(d));
}

export function formatDate(d: Date | string | null | undefined, locale: Locale) {
  if (!d) return "";
  return new Intl.DateTimeFormat(intlTag(locale), { dateStyle: "medium" }).format(new Date(d));
}

/** Short relative time — "3 hours ago" / "۳ ساعت پیش". */
export function formatRelative(d: Date | string, locale: Locale, now = Date.now()) {
  const diff = (new Date(d).getTime() - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(intlTag(locale), { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 30 * 86400) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(d, locale);
}
