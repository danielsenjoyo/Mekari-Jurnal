/**
 * The column descriptor every report table is built from.
 *
 * Lives on its own, not inside one report's data file, because the shared
 * report chrome (`app/components/reports/ReportTable.vue` and friends) has to
 * name this type without importing a specific report's row shape.
 *
 * See `docs/patterns/reports-page-format.md`.
 */
export interface ReportColumn<K extends string = string> {
  key: K;
  /** Title Case, per production's shared report dictionary — reports are their
   *  own vocabulary in the product, so these don't follow the app's sentence
   *  case (see `docs/patterns/reports-page-format.md` § Gotchas). */
  label: string;
  labelId?: string;
  /**
   * Fixed px width. The table is `table-layout: fixed` with a matching
   * `<colgroup>`, so this is authoritative: the sum of the visible columns is
   * the table's width, and the container scrolls when that exceeds it.
   */
  width: number;
  /**
   * How the value is written. `money` uses the Purchases module's
   * `formatAmount`; `number` is a plain count or quantity; `date` takes an ISO
   * string. Anything else is text.
   */
  format?: "money" | "number" | "date";
  /** Defaults to right for `money` and `number`, left otherwise. */
  align?: "left" | "right";
  /**
   * Sum this column into the TOTAL row. Defaults to true for `money` and false
   * for everything else — a column of unit *prices* is money and right-aligned
   * but its sum is meaningless, so it opts out; a column of quantities is not
   * money but its sum is meaningful, so it opts in.
   */
  total?: boolean;
}

/**
 * A named column set — what production calls a report "template", and what the
 * Template ▾ picker in a report's title band switches between.
 *
 * Generic over the row's own keys so a layout can only ever name columns that
 * report actually has, while the shape stays shared across modules.
 */
export interface ReportLayout<K extends string = string> {
  id: string;
  name: string;
  nameId: string;
  columns: K[];
}

/** Whether a column's cells sit right of centre. */
export function isRightAligned(col: ReportColumn): boolean {
  if (col.align) return col.align === "right";
  return col.format === "money" || col.format === "number";
}

/** Whether a column contributes a figure to the TOTAL row. */
export function isTotalled(col: ReportColumn): boolean {
  return col.total ?? col.format === "money";
}

/** Sums one column across a whole row set. */
export function sumColumn<T>(rows: readonly T[], key: string): number {
  return rows.reduce((sum, row) => {
    const value = (row as Record<string, unknown>)[key];
    return sum + (typeof value === "number" ? value : 0);
  }, 0);
}
