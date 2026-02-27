export const DAY_GRID_COLUMNS = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 5,
} as const;

export const dayGridTemplateColumns = {
  xs: `repeat(${DAY_GRID_COLUMNS.xs}, minmax(0, 1fr))`,
  sm: `repeat(${DAY_GRID_COLUMNS.sm}, minmax(0, 1fr))`,
  md: `repeat(${DAY_GRID_COLUMNS.md}, minmax(0, 1fr))`,
  lg: `repeat(${DAY_GRID_COLUMNS.lg}, minmax(0, 1fr))`,
  xl: `repeat(${DAY_GRID_COLUMNS.xl}, minmax(0, 1fr))`,
} as const;

interface DayGridBreakpointMatches {
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
}

export function getDayGridColumnCount({
  sm,
  md,
  lg,
  xl,
}: DayGridBreakpointMatches): number {
  if (xl) return DAY_GRID_COLUMNS.xl;
  if (lg) return DAY_GRID_COLUMNS.lg;
  if (md) return DAY_GRID_COLUMNS.md;
  if (sm) return DAY_GRID_COLUMNS.sm;
  return DAY_GRID_COLUMNS.xs;
}
