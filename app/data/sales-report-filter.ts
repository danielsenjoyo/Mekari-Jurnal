// The sales reports' filter — its shape, its defaults, and the one function
// that decides whether a row survives it.
//
// Ported from jurnal-frontend-app
// src/pages/reports/sales_list/components/more-filter.vue plus the payload the
// page builds around it.
//
// Same split as `sales-filter.ts`, and for the same reason: the drawer edits a
// draft of this object and the page applies the committed one, so the predicate
// has to live somewhere both can reach or it drifts the first time a field is
// added.
//
// The AR mirror of `purchase-report-filter.ts`, kept separate for the reason
// given at the top of `sales-report.ts` — the two modules' filters can grow
// apart (Sales already has eight transaction types where Purchases has its own
// set) without either editing the other.

import type { SalesStatus } from "./sales-status";
import {
  DEFAULT_PERIOD_ID,
  DEFAULT_TRANSACTION_TYPE,
  SALES_REPORT_PERIODS,
  type DateBy
} from "./sales-report";
import type { TransactionType } from "./sales-transactions";
import { dmyToIso, isoToDmy } from "~/utils/dates";

export interface SalesReportFilter {
  /** Both dates are DD/MM/YYYY, the format MpDatePicker emits. */
  startDate: string;
  endDate: string;
  periodId: string;
  transactionType: TransactionType;
  /** Which date the range is measured against. */
  dateBy: DateBy;
  customers: string[];
  statuses: SalesStatus[];
  tags: string[];
  /** `and` = must carry every selected tag; `or` = any one of them. */
  tagsLogic: "and" | "or";
  /** Product names. Only the product-grained reports offer this — a
   *  transaction-grained row has no single product to match against. */
  products: string[];
}

export function defaultSalesReportFilter(): SalesReportFilter {
  const period = SALES_REPORT_PERIODS.find((p) => p.id === DEFAULT_PERIOD_ID);
  const bounds = period?.range?.();
  return {
    startDate: bounds ? isoToDmy(bounds.start) : "",
    endDate: bounds ? isoToDmy(bounds.end) : "",
    periodId: DEFAULT_PERIOD_ID,
    transactionType: DEFAULT_TRANSACTION_TYPE,
    dateBy: "transaction_date",
    customers: [],
    statuses: [],
    tags: [],
    tagsLogic: "and",
    products: []
  };
}

/**
 * Whether anything *beyond the date range and transaction type* is set — those
 * two live on the filter bar itself and are always visible, so they must not
 * light the dot on the More filter button. Only the drawer-only criteria count,
 * because those are the ones that vanish when it closes.
 */
export function isReportFilterActive(f: SalesReportFilter): boolean {
  return Boolean(
    f.customers.length ||
    f.statuses.length ||
    f.tags.length ||
    f.products.length ||
    f.dateBy !== "transaction_date"
  );
}

/**
 * The fields the predicate below reads. Kept structural rather than tied to one
 * report's row type: the other four Sales reports have their own row shapes (a
 * line item, a product aggregate, an order) and every one of them still filters
 * by date, customer, status and tags. A field a report doesn't carry is simply
 * absent, and the clause that reads it is skipped.
 */
export interface FilterableSalesReportRow {
  date: string;
  dueDate?: string;
  customerName?: string;
  status?: SalesStatus;
  tags?: string[];
  productName?: string;
}

export function matchesSalesReportFilter(
  row: FilterableSalesReportRow,
  f: SalesReportFilter
): boolean {
  const subject = f.dateBy === "due_date" ? (row.dueDate ?? row.date) : row.date;
  const start = dmyToIso(f.startDate);
  const end = dmyToIso(f.endDate);
  if (start && (!subject || subject < start)) return false;
  if (end && (!subject || subject > end)) return false;

  if (f.customers.length && row.customerName && !f.customers.includes(row.customerName))
    return false;
  if (f.statuses.length && row.status && !f.statuses.includes(row.status)) return false;
  if (f.products.length && row.productName && !f.products.includes(row.productName)) return false;

  if (f.tags.length && row.tags) {
    const tags = row.tags;
    const matched =
      f.tagsLogic === "and"
        ? f.tags.every((t) => tags.includes(t))
        : f.tags.some((t) => tags.includes(t));
    if (!matched) return false;
  }
  return true;
}

/** The date range is only usable once both ends parse — production disables its
 *  Filter button on the same condition. */
export function isReportRangeValid(f: SalesReportFilter): boolean {
  return Boolean(dmyToIso(f.startDate) && dmyToIso(f.endDate));
}
