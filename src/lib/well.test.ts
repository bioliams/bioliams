import { describe, expect, it } from "vitest";
import { positionProblem, wellLabel } from "./well";

describe("wellLabel", () => {
  it("prints letter rows and 1-based columns", () => {
    expect(wellLabel(0, 0)).toBe("A1");
    expect(wellLabel(7, 11)).toBe("H12");
  });
});

describe("positionProblem", () => {
  const grid = { rows: 8, cols: 12 };

  it("accepts a free well inside the grid", () => {
    expect(positionProblem(grid, 0, 0)).toBeNull();
    expect(positionProblem(grid, 7, 11)).toBeNull();
  });

  it("rejects wells outside the grid", () => {
    expect(positionProblem(grid, 8, 0)).toMatch(/outside/);
    expect(positionProblem(grid, 0, 12)).toMatch(/outside/);
    expect(positionProblem(grid, -1, 0)).toMatch(/outside/);
  });

  it("rejects locations without a grid", () => {
    expect(positionProblem({ rows: null, cols: null }, 0, 0)).toMatch(/no grid/);
  });

  it("names whatever already occupies the well", () => {
    expect(positionProblem(grid, 1, 2, "SMP-000004")).toBe("B3 is already taken by SMP-000004");
  });

  it("rejects fractional positions", () => {
    expect(positionProblem(grid, 0.5, 0)).toMatch(/whole number/);
  });
});
