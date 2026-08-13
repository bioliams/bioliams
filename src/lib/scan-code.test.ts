import { describe, it, expect } from "vitest";
import { codeFromScan } from "@/app/(app)/scan/scanner";

describe("codeFromScan", () => {
  it("pulls the ID out of a scanned label URL", () => {
    expect(codeFromScan("https://bioliams.vercel.app/s/RGT-000006")).toBe("RGT-000006");
  });

  it("handles a percent-encoded ID", () => {
    expect(codeFromScan("https://lab.example.com/s/SMP%2D000142")).toBe("SMP-000142");
  });

  it("accepts a bare ID from a 1D barcode", () => {
    expect(codeFromScan("smp-000142")).toBe("SMP-000142");
  });

  it("leaves an unrelated URL alone rather than guessing", () => {
    expect(codeFromScan("https://example.com/other/thing")).toBe(
      "HTTPS://EXAMPLE.COM/OTHER/THING"
    );
  });
});
