import { describe, expect, it } from "vitest";
import { allowedNext, needsResponse } from "./biobank-flow";

describe("allowedNext", () => {
  it("lets the biobank work a request through to pickup", () => {
    expect(allowedNext("requested", ["biobank"])).toEqual(["processing", "ready", "declined"]);
    expect(allowedNext("processing", ["biobank"])).toEqual(["ready", "declined"]);
    expect(allowedNext("ready", ["biobank"])).toEqual(["processing", "collected"]);
  });

  it("lets a requester cancel before pickup, and confirm collection after", () => {
    expect(allowedNext("requested", ["requester"])).toEqual(["cancelled"]);
    expect(allowedNext("processing", ["requester"])).toEqual(["cancelled"]);
    expect(allowedNext("ready", ["requester"])).toEqual(["collected"]);
  });

  it("does not let a requester mark their own request ready", () => {
    expect(allowedNext("requested", ["requester"])).not.toContain("ready");
    expect(allowedNext("processing", ["requester"])).not.toContain("processing");
  });

  it("combines both when the requester also runs the biobank", () => {
    expect(allowedNext("requested", ["biobank", "requester"])).toEqual([
      "processing",
      "ready",
      "declined",
      "cancelled",
    ]);
  });

  it("ends at collected and cancelled", () => {
    expect(allowedNext("collected", ["biobank", "requester"])).toEqual([]);
    expect(allowedNext("cancelled", ["biobank", "requester"])).toEqual([]);
  });

  it("lets only the biobank reopen a declined request", () => {
    expect(allowedNext("declined", ["biobank"])).toEqual(["requested"]);
    expect(allowedNext("declined", ["requester"])).toEqual([]);
  });
});

describe("needsResponse", () => {
  it("requires a reason to decline", () => {
    expect(needsResponse("declined")).toBe(true);
    expect(needsResponse("ready")).toBe(false);
  });
});
