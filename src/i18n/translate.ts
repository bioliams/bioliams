import type { Messages } from "./messages/en";
import { intlTag, type Locale } from "./config";

/** A string, or a plural pair picked by `count`. */
type Leaf = string | { one: string; other: string };

/** Every dot-path in the dictionary that ends at a translatable leaf. */
type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends Leaf
    ? `${P}${K}`
    : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Paths<Messages>;
export type Vars = Record<string, string | number | null | undefined>;
export type T = ((key: MessageKey, vars?: Vars) => string) & { locale: Locale };

/**
 * Build a translator over one locale's messages. `{name}` placeholders are
 * filled from `vars`; numbers are written in the locale's digits so Persian
 * prose reads "۳ مورد", while strings (quantities, IDs) pass through untouched.
 */
export function createT(locale: Locale, messages: Messages): T {
  const numbers = new Intl.NumberFormat(intlTag(locale));
  const plurals = new Intl.PluralRules(intlTag(locale));

  const fn = (key: MessageKey, vars?: Vars) => {
    const node = lookup(messages, key.split("."));
    let text: string;
    if (typeof node === "string") text = node;
    else if (node && typeof node === "object" && "other" in node) {
      const n = Number(vars?.count ?? 0);
      const pair = node as { one: string; other: string };
      text = plurals.select(n) === "one" ? pair.one : pair.other;
    } else text = key;

    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (match, name: string) => {
      const v = vars[name];
      if (v === undefined || v === null) return match;
      return typeof v === "number" ? numbers.format(v) : v;
    });
  };
  return Object.assign(fn, { locale });
}

/**
 * Walk a dot path. Some keys contain dots themselves (audit actions like
 * "entity.create"), so when a segment isn't found it is joined with the next.
 */
function lookup(node: unknown, parts: string[]): unknown {
  if (parts.length === 0) return node;
  if (!node || typeof node !== "object") return undefined;
  const record = node as Record<string, unknown>;
  for (let take = 1; take <= parts.length; take++) {
    const segment = parts.slice(0, take).join(".");
    if (segment in record) {
      const found = lookup(record[segment], parts.slice(take));
      if (found !== undefined) return found;
    }
  }
  return undefined;
}
