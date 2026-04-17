import { describe, expect, it } from "vitest";

import {
  findSpreadsheetBoundary,
  isCellNonEmpty,
  moveCell,
  normalizeRange,
  type SpreadsheetGrid,
} from "./spreadsheetNavigation";

const grid: SpreadsheetGrid = [
  ["A1", "B1", "C1", "", "", "F1"],
  ["A2", "", "", "", "", "F2"],
  ["A3", "B3", "C3", "D3", "", ""],
  ["", "", "C4", "", "", ""],
  ["A5", "B5", "C5", "D5", "E5", "F5"],
];

describe("spreadsheetNavigation", () => {
  it("normalizes ranges regardless of drag direction", () => {
    expect(normalizeRange({ row: 4, col: 3 }, { row: 1, col: 5 })).toEqual({
      start: { row: 1, col: 3 },
      end: { row: 4, col: 5 },
    });
  });

  it("treats trimmed empty values as empty", () => {
    expect(isCellNonEmpty([[" value ", "   ", null, undefined]], { row: 0, col: 0 })).toBe(true);
    expect(isCellNonEmpty([[" value ", "   ", null, undefined]], { row: 0, col: 1 })).toBe(false);
    expect(isCellNonEmpty([[" value ", "   ", null, undefined]], { row: 0, col: 2 })).toBe(false);
    expect(isCellNonEmpty([[" value ", "   ", null, undefined]], { row: 0, col: 3 })).toBe(false);
  });

  it("moves one cell for normal arrow navigation and clamps at table edges", () => {
    expect(moveCell(grid, { row: 0, col: 0 }, "right")).toEqual({ row: 0, col: 1 });
    expect(moveCell(grid, { row: 0, col: 0 }, "left")).toEqual({ row: 0, col: 0 });
    expect(moveCell(grid, { row: 4, col: 5 }, "down")).toEqual({ row: 4, col: 5 });
  });

  it("jumps to the last filled cell inside a contiguous filled row block", () => {
    expect(findSpreadsheetBoundary(grid, { row: 0, col: 0 }, "right")).toEqual({
      row: 0,
      col: 2,
    });
  });

  it("jumps from an empty cell to the next filled cell or edge", () => {
    expect(findSpreadsheetBoundary(grid, { row: 0, col: 3 }, "right")).toEqual({
      row: 0,
      col: 5,
    });
    expect(findSpreadsheetBoundary(grid, { row: 2, col: 5 }, "right")).toEqual({
      row: 2,
      col: 5,
    });
  });

  it("continues naturally across filled and empty regions on repeated jumps", () => {
    const first = findSpreadsheetBoundary(grid, { row: 0, col: 0 }, "right");
    const second = findSpreadsheetBoundary(grid, first, "right");

    expect(first).toEqual({ row: 0, col: 2 });
    expect(second).toEqual({ row: 0, col: 5 });
  });

  it("supports left and vertical boundary scanning", () => {
    expect(findSpreadsheetBoundary(grid, { row: 4, col: 5 }, "left")).toEqual({
      row: 4,
      col: 0,
    });
    expect(findSpreadsheetBoundary(grid, { row: 0, col: 0 }, "down")).toEqual({
      row: 2,
      col: 0,
    });
    expect(findSpreadsheetBoundary(grid, { row: 4, col: 2 }, "up")).toEqual({
      row: 2,
      col: 2,
    });
  });

  it("lands on the table edge when no later filled cell exists", () => {
    expect(findSpreadsheetBoundary(grid, { row: 2, col: 4 }, "right")).toEqual({
      row: 2,
      col: 5,
    });
    expect(findSpreadsheetBoundary(grid, { row: 3, col: 4 }, "up")).toEqual({
      row: 0,
      col: 4,
    });
  });
});
