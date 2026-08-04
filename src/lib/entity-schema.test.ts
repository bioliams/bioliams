import { describe, it, expect } from "vitest";
import { validateEntityData, keyFromLabel } from "./entity-schema";
import type { FieldDef } from "@/db/schema/lims";

const fields: FieldDef[] = [
  { key: "sample_type", label: "Sample Type", type: "select", required: true, options: ["DNA", "RNA"] },
  { key: "volume", label: "Volume", type: "number", unit: "µL" },
  { key: "collected", label: "Collected", type: "date" },
  { key: "tags", label: "Tags", type: "multiselect", options: ["urgent", "qc"] },
  { key: "hazardous", label: "Hazardous", type: "boolean" },
];

describe("validateEntityData", () => {
  it("accepts a valid record", () => {
    const { data, errors } = validateEntityData(fields, {
      sample_type: "DNA",
      volume: 25,
      collected: "2026-08-04",
      tags: ["qc"],
      hazardous: true,
    });
    expect(errors).toBeNull();
    expect(data).toMatchObject({ sample_type: "DNA", volume: 25 });
  });

  it("rejects a missing required field", () => {
    const { errors } = validateEntityData(fields, { volume: 10 });
    expect(errors).not.toBeNull();
    expect(errors).toHaveProperty("sample_type");
  });

  it("rejects a value outside a select's options", () => {
    const { errors } = validateEntityData(fields, { sample_type: "Protein" });
    expect(errors).toHaveProperty("sample_type");
  });

  it("rejects a malformed date", () => {
    const { errors } = validateEntityData(fields, { sample_type: "RNA", collected: "04/08/2026" });
    expect(errors).toHaveProperty("collected");
  });

  it("coerces numeric strings, as CSV imports produce", () => {
    const { data, errors } = validateEntityData(fields, { sample_type: "RNA", volume: "12.5" });
    expect(errors).toBeNull();
    expect(data?.volume).toBe(12.5);
  });

  it("allows optional fields to be omitted", () => {
    const { errors } = validateEntityData(fields, { sample_type: "DNA" });
    expect(errors).toBeNull();
  });

  it("strips keys that are not in the schema", () => {
    const { data } = validateEntityData(fields, { sample_type: "DNA", rogue: "x" });
    expect(data).not.toHaveProperty("rogue");
  });
});

describe("keyFromLabel", () => {
  it("makes a safe machine key", () => {
    expect(keyFromLabel("Storage Temp (°C)")).toBe("storage_temp_c");
    expect(keyFromLabel("  Catalog # ")).toBe("catalog");
  });
});
