/**
 * Positions inside a gridded box or rack. Rows are letters (A, B, …) and
 * columns are 1-based numbers, the way they're printed on the box; the database
 * keeps both 0-based.
 */

export const MAX_GRID_ROWS = 26; // one letter per row
export const MAX_GRID_COLS = 48;

export function wellLabel(row: number, col: number) {
  return `${String.fromCharCode(65 + row)}${col + 1}`;
}

/**
 * What's wrong with a requested position, or null if it can be used.
 * `occupiedBy` is whatever already sits in that well (the record being edited
 * is excluded by the caller, so it can stay where it is).
 */
export function positionProblem(
  grid: { rows: number | null; cols: number | null },
  row: number,
  col: number,
  occupiedBy?: string | null
): string | null {
  if (!grid.rows || !grid.cols) return "This location has no grid of positions";
  if (!Number.isInteger(row) || !Number.isInteger(col)) return "Position must be a whole number";
  if (row < 0 || col < 0 || row >= grid.rows || col >= grid.cols) {
    return `Position is outside the ${grid.rows}×${grid.cols} grid`;
  }
  if (occupiedBy) return `${wellLabel(row, col)} is already taken by ${occupiedBy}`;
  return null;
}
