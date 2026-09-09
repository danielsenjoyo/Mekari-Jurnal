/**
 * The date-range presets every report's filter bar offers.
 *
 * Lives on its own rather than inside one module's report data because both
 * Purchases and Sales offer the same eleven presets, and the shared chrome
 * (`app/components/reports/ReportFilterBar.vue`) has to render a list without
 * importing either module.
 *
 * The presets are **relative to a module's own fixture "today"**, not the wall
 * clock — each dataset is generated around one, so a preset built from the real
 * date would return nothing. That is why this exports a builder rather than a
 * ready-made array: the caller passes its own `todayIsoDate`.
 *
 * See `docs/patterns/reports-page-format.md`.
 */

import { parseLocalIsoDate, toLocalIsoDate } from "~/utils/dates";

export interface ReportPeriod {
  id: string;
  label: string;
  labelId: string;
  /** `null` for "Custom" — the two date fields stand on their own. */
  range: (() => { start: string; end: string }) | null;
}

/**
 * Production defaults to "Today", because a real company books transactions
 * every day. These fixtures hold ~13 records per type spread over ~5 weeks, so
 * "Today" would return a single row and show nothing worth looking at — default
 * to the quarter that contains the whole set instead.
 */
export const DEFAULT_PERIOD_ID = "this_quarter";

function shift(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(d: Date): Date {
  // Monday-first, matching the Indonesian business week production assumes.
  const day = (d.getDay() + 6) % 7;
  return shift(d, -day);
}

function range(start: Date, end: Date) {
  return { start: toLocalIsoDate(start), end: toLocalIsoDate(end) };
}

/**
 * The 11 presets from production's `PERIODS_RANGE`, in the same order.
 *
 * `todayIso` is taken as a **function**, not a string: each range is resolved
 * when the preset is picked, so a dataset that moves its own "today" is
 * followed rather than snapshotted at module load.
 */
export function buildReportPeriods(todayIso: () => string): ReportPeriod[] {
  const today = () => parseLocalIsoDate(todayIso());

  return [
    { id: "today", label: "Today", labelId: "Hari ini", range: () => range(today(), today()) },
    {
      id: "this_week",
      label: "This week",
      labelId: "Minggu ini",
      range: () => range(startOfWeek(today()), shift(startOfWeek(today()), 6))
    },
    {
      id: "this_month",
      label: "This month",
      labelId: "Bulan ini",
      range: () => {
        const t = today();
        return range(
          new Date(t.getFullYear(), t.getMonth(), 1),
          new Date(t.getFullYear(), t.getMonth() + 1, 0)
        );
      }
    },
    {
      id: "this_quarter",
      label: "This quarter",
      labelId: "Kuartal ini",
      range: () => {
        const t = today();
        const q = Math.floor(t.getMonth() / 3);
        return range(new Date(t.getFullYear(), q * 3, 1), new Date(t.getFullYear(), q * 3 + 3, 0));
      }
    },
    {
      id: "this_year",
      label: "This year",
      labelId: "Tahun ini",
      range: () => {
        const t = today();
        return range(new Date(t.getFullYear(), 0, 1), new Date(t.getFullYear(), 11, 31));
      }
    },
    {
      id: "yesterday",
      label: "Yesterday",
      labelId: "Kemarin",
      range: () => range(shift(today(), -1), shift(today(), -1))
    },
    {
      id: "last_week",
      label: "Last week",
      labelId: "Minggu lalu",
      range: () => {
        const start = shift(startOfWeek(today()), -7);
        return range(start, shift(start, 6));
      }
    },
    {
      id: "last_month",
      label: "Last month",
      labelId: "Bulan lalu",
      range: () => {
        const t = today();
        return range(
          new Date(t.getFullYear(), t.getMonth() - 1, 1),
          new Date(t.getFullYear(), t.getMonth(), 0)
        );
      }
    },
    {
      id: "last_quarter",
      label: "Last quarter",
      labelId: "Kuartal lalu",
      range: () => {
        const t = today();
        const q = Math.floor(t.getMonth() / 3);
        return range(
          new Date(t.getFullYear(), (q - 1) * 3, 1),
          new Date(t.getFullYear(), q * 3, 0)
        );
      }
    },
    {
      id: "last_year",
      label: "Last year",
      labelId: "Tahun lalu",
      range: () => {
        const t = today();
        return range(new Date(t.getFullYear() - 1, 0, 1), new Date(t.getFullYear() - 1, 11, 31));
      }
    },
    { id: "custom", label: "Custom", labelId: "Custom", range: null }
  ];
}
