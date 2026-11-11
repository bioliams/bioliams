import { describe, expect, it } from "vitest";
import { createT, type MessageKey } from "./translate";
import { en } from "./messages/en";
import { fa } from "./messages/fa";
import { translateServerMessage } from "./server-errors";
import { evaluateStock } from "@/lib/stock-alerts";

const tEn = createT("en", en);
const tFa = createT("fa", fa);

/** Every leaf path in a dictionary, so the two languages can be compared. */
function leaves(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "string" || (v && "other" in v)
      ? [`${prefix}${k}`]
      : leaves(v as object, `${prefix}${k}.`)
  );
}

describe("dictionaries", () => {
  it("Persian covers every English key, and no Persian string is left in English", () => {
    expect(leaves(fa)).toEqual(leaves(en));
  });

  it("keeps the same placeholders in both languages", () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const path of leaves(en)) {
      const a = tEn(path as MessageKey, {});
      const b = tFa(path as MessageKey, {});
      expect(vars(b), path).toEqual(vars(a));
    }
  });
});

describe("createT", () => {
  it("fills placeholders and picks plurals", () => {
    expect(tEn("inventory.use.selected", { count: 1 })).toBe("1 item selected");
    expect(tEn("inventory.use.selected", { count: 3 })).toBe("3 items selected");
  });

  it("writes numbers in Persian digits but leaves strings alone", () => {
    expect(tFa("inventory.use.selected", { count: 3 })).toBe("۳ مورد انتخاب شده");
    expect(tFa("dashboard.left", { quantity: "2.5", unit: "mL" })).toBe("2.5 mL باقی‌مانده");
  });

  it("finds keys that contain dots", () => {
    expect(tEn("audit.actions.entity.create")).toBe("Registered");
    expect(tFa("audit.actions.inventory.consume")).toBe("موجودی مصرف شد");
  });

  it("falls back to the key for an unknown path", () => {
    // @ts-expect-error — deliberately not a key
    expect(tEn("nope.nothing")).toBe("nope.nothing");
  });
});

describe("translateServerMessage", () => {
  it("leaves English untouched", () => {
    expect(translateServerMessage("Record not found", tEn)).toBe("Record not found");
  });

  it("translates fixed and templated messages", () => {
    expect(translateServerMessage("Record not found", tFa)).toBe("رکورد پیدا نشد");
    expect(translateServerMessage("Only 2 mL of Taq left — nothing was recorded", tFa)).toBe(
      "فقط 2 mL از Taq باقی مانده — چیزی ثبت نشد"
    );
    expect(translateServerMessage("A requested request can't become received", tFa)).toBe(
      "درخواست «درخواست‌شده» نمی‌تواند به «دریافت‌شده» تغییر کند"
    );
  });

  it("passes through what it doesn't know", () => {
    expect(translateServerMessage("Something brand new", tFa)).toBe("Something brand new");
  });
});

describe("stock alarms in Persian", () => {
  it("words an alarm in the reader's language", () => {
    const [alert] = evaluateStock(
      { name: "Taq", quantity: "0", unit: "mL", minThreshold: null, zeroPoint: "0", expiresAt: null },
      new Date(),
      tFa
    );
    expect(alert.message).toBe("موجودی Taq تمام شده است");
  });
});
