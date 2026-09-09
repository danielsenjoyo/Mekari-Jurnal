import { computed, reactive, ref } from "vue";
import { SALES_REPORT_PERIODS } from "~/data/sales-report";
import {
  defaultSalesReportFilter,
  isReportAsOfValid,
  isReportFilterActive,
  isReportRangeValid,
  type SalesReportFilter
} from "~/data/sales-report-filter";

/**
 * The run contract every Sales report shares — the AR mirror of
 * `usePurchaseReport`.
 *
 * **Two filter objects, never one.** `filter` is what the controls edit;
 * `applied` is what the table reads. A report does not re-run as you type — you
 * set a range and press Filter — which is the whole reason these pages have a
 * Filter button and a "Report will appear here" blank state at all. Collapsing
 * them into a single ref makes both meaningless.
 *
 * `applied === null` **is** the not-run-yet state, so there is no separate
 * `hasRun` flag that could drift out of sync with it.
 *
 * See `docs/patterns/reports-page-format.md`.
 */
export function useSalesReport(options?: {
  /** Report-specific defaults — e.g. Delivery pins `transactionType`. */
  defaults?: Partial<SalesReportFilter>;
  /**
   * `range` (default) validates the two dates; `as-of` validates the single
   * one, and writes it into the meta strip instead of a range. Must match the
   * `mode` handed to `ReportFilterBar`.
   */
  mode?: "range" | "as-of";
  /** Runs after each successful run — the page resets its pager here. */
  onRun?: () => void;
}) {
  const makeDefault = (): SalesReportFilter => ({
    ...defaultSalesReportFilter(),
    ...options?.defaults
  });

  const filter = reactive<SalesReportFilter>(makeDefault());
  const applied = ref<SalesReportFilter | null>(null);
  const isFilterDrawerOpen = ref(false);
  const isLoading = ref(false);

  const hasRun = computed(() => applied.value !== null);
  const isAsOf = options?.mode === "as-of";
  const isRangeValid = computed(() =>
    isAsOf ? isReportAsOfValid(filter) : isReportRangeValid(filter)
  );
  const isDrawerFilterActive = computed(() => isReportFilterActive(filter));

  function snapshot(): SalesReportFilter {
    return {
      ...filter,
      customers: [...filter.customers],
      statuses: [...filter.statuses],
      tags: [...filter.tags],
      products: [...filter.products]
    };
  }

  /**
   * Stands in for production's fetch. The delay is deliberate: it is what makes
   * the skeleton rows reachable, and a report that returned instantly would
   * misrepresent a screen whose whole shape is built around waiting for one.
   */
  function runReport() {
    if (!isRangeValid.value) return;
    applied.value = snapshot();
    options?.onRun?.();
    isLoading.value = true;
    window.setTimeout(() => (isLoading.value = false), 450);
  }

  function onApplyFilter(next: SalesReportFilter) {
    Object.assign(filter, next);
    isFilterDrawerOpen.value = false;
    runReport();
  }

  function clearFilters() {
    Object.assign(filter, makeDefault());
    runReport();
  }

  /**
   * The strip above the table. Production prints the same facts there so an
   * exported page reads on its own; it also gives the Filter button visible
   * feedback, since the criteria that produced the table are otherwise only
   * visible inside the drawer.
   */
  function metaLine(subject: string): string {
    const f = applied.value;
    if (!f) return "";
    // A balance report has one date and no period — printing a range it never
    // used would misdescribe the table underneath it.
    if (isAsOf) return `${subject} · As of ${f.asOfDate} · IDR`;
    const period = SALES_REPORT_PERIODS.find((p) => p.id === f.periodId);
    const label = period && period.id !== "custom" ? period.label : "Custom range";
    return `${subject} · ${label} · ${f.startDate} – ${f.endDate} · IDR`;
  }

  return {
    filter,
    applied,
    isFilterDrawerOpen,
    isLoading,
    hasRun,
    isRangeValid,
    isDrawerFilterActive,
    runReport,
    onApplyFilter,
    clearFilters,
    metaLine
  };
}
