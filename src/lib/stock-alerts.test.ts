import { describe, expect, it } from "vitest";
import { daysUntil, evaluateStock, parseExpiryDate, type StockState } from "./stock-alerts";

const now = new Date("2026-11-11T15:30:00Z");
const base: StockState = {
  name: "Taq",
  quantity: "10",
  unit: "mL",
  minThreshold: null,
  zeroPoint: "0",
  expiresAt: null,
};
const kinds = (s: Partial<StockState>) => evaluateStock({ ...base, ...s }, now).map((a) => a.kind);

describe("evaluateStock", () => {
  it("raises nothing for healthy stock", () => {
    expect(kinds({})).toEqual([]);
  });

  it("is out of stock at zero by default", () => {
    expect(kinds({ quantity: "0" })).toEqual(["out_of_stock"]);
  });

  it("ignores items that never held stock", () => {
    expect(kinds({ quantity: "0", hasMovements: false })).toEqual([]);
    expect(kinds({ quantity: "0", hasMovements: true })).toEqual(["out_of_stock"]);
    expect(kinds({ quantity: "1", minThreshold: "5", hasMovements: false })).toEqual(["low_stock"]);
  });

  it("honours a zero point above zero", () => {
    expect(kinds({ quantity: "2", zeroPoint: "2" })).toEqual(["out_of_stock"]);
    expect(kinds({ quantity: "2.5", zeroPoint: "2" })).toEqual([]);
  });

  it("reports low stock, but not alongside out of stock", () => {
    expect(kinds({ quantity: "3", minThreshold: "5" })).toEqual(["low_stock"]);
    expect(kinds({ quantity: "0", minThreshold: "5" })).toEqual(["out_of_stock"]);
  });

  it("warns before expiry and flags after", () => {
    expect(kinds({ expiresAt: new Date("2026-12-11T00:00:00Z") })).toEqual(["expiring"]);
    expect(kinds({ expiresAt: new Date("2026-12-12T00:00:00Z") })).toEqual([]);
    expect(kinds({ expiresAt: new Date("2026-11-11T00:00:00Z") })).toEqual(["expiring"]);
    expect(kinds({ expiresAt: new Date("2026-11-10T00:00:00Z") })).toEqual(["expired"]);
  });

  it("raises stock and expiry together", () => {
    expect(kinds({ quantity: "0", expiresAt: new Date("2026-01-01T00:00:00Z") })).toEqual([
      "out_of_stock",
      "expired",
    ]);
  });
});

describe("daysUntil", () => {
  it("counts calendar days, ignoring the time of day", () => {
    expect(daysUntil(new Date("2026-11-12T00:00:00Z"), now)).toBe(1);
    expect(daysUntil(new Date("2026-11-11T00:00:00Z"), now)).toBe(0);
  });
});

describe("parseExpiryDate", () => {
  it("parses dates and rejects nonsense", () => {
    expect(parseExpiryDate("2027-03-01")?.toISOString()).toBe("2027-03-01T00:00:00.000Z");
    expect(parseExpiryDate("")).toBeNull();
    expect(Number.isNaN(parseExpiryDate("2027-02-31")!.getTime())).toBe(true);
    expect(Number.isNaN(parseExpiryDate("soon")!.getTime())).toBe(true);
  });
});
