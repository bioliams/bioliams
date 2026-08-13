import { describe, it, expect } from "vitest";
import { summariseAudit } from "./audit-summary";

describe("summariseAudit", () => {
  it("spells out what was used and what is left", () => {
    expect(
      summariseAudit("inventory.consume", { used: "2 vials", remaining: "6 vials" })
    ).toBe("Used 2 vials · 6 vials left");
  });

  it("reports a hand-edited quantity as a before and after", () => {
    expect(
      summariseAudit("inventory.update", {
        before: { quantity: "8", unit: "vials" },
        after: { quantity: "7", unit: "vials" },
      })
    ).toBe("Quantity 8 vials → 7 vials");
  });

  it("says nothing when an inventory edit left the quantity alone", () => {
    expect(
      summariseAudit("inventory.update", {
        before: { quantity: "8", unit: "vials" },
        after: { quantity: "8", unit: "vials" },
      })
    ).toBe("");
  });

  it("looks inside the custom-field blob so field edits are visible", () => {
    expect(
      summariseAudit("entity.update", {
        before: { name: "PT-014", data: { volume: 500, sample_type: "Blood" } },
        after: { name: "PT-014", data: { volume: 400, sample_type: "Blood" } },
      })
    ).toBe("volume: 500 → 400");
  });

  it("marks a cleared value as empty rather than dropping it", () => {
    expect(
      summariseAudit("entity.update", {
        before: { data: { lot: "A12" } },
        after: { data: { lot: null } },
      })
    ).toBe("lot: A12 → empty");
  });

  it("caps a long list of changes", () => {
    const before = { data: { a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 } };
    const after = { data: { a: 2, b: 2, c: 2, d: 2, e: 2, f: 2 } };
    expect(summariseAudit("entity.update", before && { before, after })).toContain("+2 more");
  });

  it("returns nothing for an entry with no diff", () => {
    expect(summariseAudit("entity.delete", null)).toBe("");
  });
});
