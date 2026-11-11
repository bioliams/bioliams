import type { MessageKey, T, Vars } from "./translate";
import { en } from "./messages/en";

type Rule = [pattern: RegExp, key: MessageKey, vars?: (m: RegExpMatchArray, t: T) => Vars];

const exact = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);

/**
 * Every English message a service can throw, matched back to its key.
 *
 * Services keep speaking English — the REST API returns their words as-is —
 * and a server action translates on the way out. Anything not listed here
 * still reaches the user, just untranslated.
 */
const RULES: Rule[] = [
  ...(Object.keys(en.errors) as (keyof typeof en.errors)[])
    .filter((k) => typeof en.errors[k] === "string" && !(en.errors[k] as string).includes("{"))
    .map((k): Rule => [exact(en.errors[k] as string), `errors.${k}` as MessageKey]),
  [/^(API key|Attachment|Entity type|Entity|Location|Member|Project|Record|Request|View) not found$/, "errors.notFound",
    (m, t) => ({ thing: t(`errors.things.${m[1] as keyof typeof en.errors.things}`) })],
  [/^Unknown entity type: (.+)$/, "errors.unknownType", (m) => ({ slug: m[1] })],
  [/^(.+) has this out already — ask them to check it back in$/, "errors.heldBy", (m) => ({ name: m[1] })],
  [/^(\S+) (.+) across (\d+) aliquots is more than the (\S+) .+ left of (.+)$/, "errors.splitTooMuch",
    (m) => ({ total: m[1], unit: m[2], count: m[3], available: m[4], name: m[5] })],
  [/^A (\w+) request can't become (\w+)$/, "errors.badPurchaseMove", (m, t) => ({
    from: purchaseStatus(m[1], t),
    to: purchaseStatus(m[2], t),
  })],
  [/^Cannot delete: (\d+) record\(s\) still use this type$/, "errors.typeInUse", (m) => ({ count: m[1] })],
  [/^Only (\S+) (\S+) of (.+) left — nothing was recorded$/, "errors.onlyLeftNothing",
    (m) => ({ quantity: m[1], unit: m[2], name: m[3] })],
  [/^Only (\S+) (\S+) of (.+) left$/, "errors.onlyLeft", (m) => ({ quantity: m[1], unit: m[2], name: m[3] })],
  [/^Only (\S+) (\S+) available$/, "errors.onlyAvailable", (m) => ({ quantity: m[1], unit: m[2] })],
  [/^You can't move a (.+) request to (.+)$/, "errors.badBiobankMove", (m, t) => ({
    from: biobankStatus(m[1], t),
    to: biobankStatus(m[2], t),
  })],
  [/^Position is outside the (\d+)×(\d+) grid$/, "errors.outsideGrid", (m) => ({ rows: m[1], cols: m[2] })],
  [/^(\S+) is already taken by (\S+)$/, "errors.wellTaken", (m) => ({ well: m[1], id: m[2] })],
  [/^Rows must be 1–(\d+)$/, "errors.rowsRange", (m) => ({ max: m[1] })],
  [/^Columns must be 1–(\d+)$/, "errors.colsRange", (m) => ({ max: m[1] })],
  // Zod's defaults for the record-type form fields.
  [/^Invalid input: expected \w+, received undefined$/, "errors.required"],
  [/^Invalid input: expected number.*$/, "errors.expectedNumber"],
  [/^Invalid option.*$/, "errors.invalidOption"],
  [/^Invalid input.*$/, "errors.invalidInput"],
];

function purchaseStatus(s: string, t: T) {
  return s in en.purchasing.statuses
    ? t(`purchasing.statuses.${s as keyof typeof en.purchasing.statuses}`)
    : s;
}

function biobankStatus(label: string, t: T) {
  const key = (Object.keys(en.biobank.statuses) as (keyof typeof en.biobank.statuses)[]).find(
    (k) => en.biobank.statuses[k].toLowerCase() === label.toLowerCase()
  );
  return key ? t(`biobank.statuses.${key}`) : label;
}

export function translateServerMessage(message: string, t: T): string {
  if (t.locale === "en") return message;
  for (const [pattern, key, vars] of RULES) {
    const m = message.match(pattern);
    if (m) return t(key, vars?.(m, t));
  }
  return message;
}
