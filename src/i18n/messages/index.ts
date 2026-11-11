import type { Locale } from "../config";
import { en, type Messages } from "./en";
import { fa } from "./fa";

const ALL: Record<Locale, Messages> = { en, fa };

export function getMessages(locale: Locale): Messages {
  return ALL[locale];
}
