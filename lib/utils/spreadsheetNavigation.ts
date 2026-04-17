export type SpreadsheetDirection = "left" | "right" | "up" | "down";

export interface CellCoord {
  row: number;
  col: number;
}

export interface SpreadsheetSelectionState {
  activeCell: CellCoord | null;
  anchorCell: CellCoord | null;
  extentCell: CellCoord | null;
}

export interface CellRange {
  start: CellCoord;
  end: CellCoord;
}

type SpreadsheetGridValue = string | number | boolean | null | undefined;
export type SpreadsheetGrid = SpreadsheetGridValue[][];

interface KeyboardLikeEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}

export function getArrowDirection(key: string): SpreadsheetDirection | null {
  switch (key) {
    case "ArrowLeft":
      return "left";
    case "ArrowRight":
      return "right";
    case "ArrowUp":
      return "up";
    case "ArrowDown":
      return "down";
    default:
      return null;
  }
}

function isMacPlatform() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
}

export function isPlatformJumpModifier(
  event: Pick<KeyboardLikeEvent, "metaKey" | "ctrlKey">,
) {
  return isMacPlatform() ? event.metaKey : event.ctrlKey;
}

export function isEditableEventTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;

  const editableSelector = [
    "input",
    "textarea",
    "select",
    "button",
    "a[href]",
    '[contenteditable=""]',
    '[contenteditable="true"]',
    '[role="textbox"]',
  ].join(",");

  return Boolean(target.closest(editableSelector));
}

export function normalizeRange(anchor: CellCoord, extent: CellCoord): CellRange {
  return {
    start: {
      row: Math.min(anchor.row, extent.row),
      col: Math.min(anchor.col, extent.col),
    },
    end: {
      row: Math.max(anchor.row, extent.row),
      col: Math.max(anchor.col, extent.col),
    },
  };
}

function getColumnCount(grid: SpreadsheetGrid) {
  return grid.reduce((max, row) => Math.max(max, row.length), 0);
}

function clampCell(grid: SpreadsheetGrid, cell: CellCoord): CellCoord {
  const rowCount = grid.length;
  const colCount = getColumnCount(grid);

  return {
    row: Math.min(Math.max(cell.row, 0), Math.max(rowCount - 1, 0)),
    col: Math.min(Math.max(cell.col, 0), Math.max(colCount - 1, 0)),
  };
}

function stepCell(
  grid: SpreadsheetGrid,
  cell: CellCoord,
  direction: SpreadsheetDirection,
): CellCoord | null {
  const rowCount = grid.length;
  const colCount = getColumnCount(grid);
  if (rowCount === 0 || colCount === 0) return null;

  const next = { ...cell };
  if (direction === "left") next.col -= 1;
  if (direction === "right") next.col += 1;
  if (direction === "up") next.row -= 1;
  if (direction === "down") next.row += 1;

  if (
    next.row < 0 ||
    next.row >= rowCount ||
    next.col < 0 ||
    next.col >= colCount
  ) {
    return null;
  }

  return next;
}

export function isCellNonEmpty(grid: SpreadsheetGrid, cell: CellCoord) {
  const value = grid[cell.row]?.[cell.col];
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
}

export function moveCell(
  grid: SpreadsheetGrid,
  start: CellCoord,
  direction: SpreadsheetDirection,
) {
  const clampedStart = clampCell(grid, start);
  return stepCell(grid, clampedStart, direction) ?? clampedStart;
}

export function findSpreadsheetBoundary(
  grid: SpreadsheetGrid,
  start: CellCoord,
  direction: SpreadsheetDirection,
) {
  const clampedStart = clampCell(grid, start);
  const firstStep = stepCell(grid, clampedStart, direction);
  if (!firstStep) return clampedStart;

  const startIsFilled = isCellNonEmpty(grid, clampedStart);
  const firstStepIsFilled = isCellNonEmpty(grid, firstStep);

  if (startIsFilled && firstStepIsFilled) {
    let boundary = firstStep;
    while (true) {
      const next = stepCell(grid, boundary, direction);
      if (!next || !isCellNonEmpty(grid, next)) return boundary;
      boundary = next;
    }
  }

  let boundary = firstStep;
  while (true) {
    if (isCellNonEmpty(grid, boundary)) return boundary;
    const next = stepCell(grid, boundary, direction);
    if (!next) return boundary;
    boundary = next;
  }
}

export function getSpreadsheetCellElement(
  container: HTMLElement | null,
  cell: CellCoord,
) {
  if (!container) return null;
  return container.querySelector<HTMLElement>(
    `[data-spreadsheet-cell="true"][data-row="${cell.row}"][data-col="${cell.col}"]`,
  );
}

export function focusSpreadsheetCell(
  container: HTMLElement | null,
  cell: CellCoord,
) {
  const element = getSpreadsheetCellElement(container, cell);
  if (!element) return;

  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: "nearest", inline: "nearest" });
}
