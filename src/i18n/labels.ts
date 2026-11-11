import type { T } from "./translate";
import { en } from "./messages/en";

/** A record status in the reader's language; statuses we don't know pass through. */
export function statusLabel(t: T, status: string) {
  return status in en.record.statuses
    ? t(`record.statuses.${status as keyof typeof en.record.statuses}`)
    : status;
}

/** A storage kind (freezer, box…) in the reader's language. */
export function kindLabel(t: T, kind: string) {
  return kind in en.record.kinds ? t(`record.kinds.${kind as keyof typeof en.record.kinds}`) : kind;
}

/** A better-auth error in the reader's language, falling back to its own message. */
export function authError(
  t: T,
  error: { code?: string; message?: string } | null | undefined,
  fallback: string
) {
  const code = error?.code;
  if (code && code in en.auth.codes) return t(`auth.codes.${code as keyof typeof en.auth.codes}`);
  return t.locale === "en" ? (error?.message ?? fallback) : fallback;
}
