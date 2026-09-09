/**
 * Purchase list report — the column layouts, period presets and row shape for
 * `app/pages/reports/purchases_list.vue`. Ported from `jurnal-frontend-app`
 * (`src/pages/reports/purchases_list/`).
 *
 * **The rows are not new mock data.** They are a projection of
 * [`purchase-transactions.ts`](./purchase-transactions.ts) — the same array the
 * Purchases module's list, detail and form pages read and write. A report over
 * a parallel fixture would drift from the module it reports on, and the money
 * and date formats would drift with it (see `docs/patterns/page-recipes.md`
 * § "one format per value type, per module"). Edit an invoice on
 * `/purchase/invoice/12` and this report shows the edited figure.
 *
 * **Ported, not copied.** Production reads
 * `api/v1/reports/purchases_list` with a saved `report_layout_id`, company
 * custom fields, tag logic (`and`/`or`), contact-group lookups, and a
 * server-rendered PDF/XLSX/CSV export. Here the layouts are three fixed column
 * sets, the filter runs in memory, and Export is a no-op that reports what it
 * would produce. Deliberately absent: custom fields, saved/editable templates
 * (production's Template popover links to a layout builder), the
 * export-limitation and unrealised-calculation banners, and Mixpanel tracking.
 */

import { PURCHASE_STATUS_LABEL, type PurchaseStatus } from "./purchase-status";
import type { ReportColumn, ReportLayout } from "./report-column";
import { DEFAULT_PERIOD_ID, buildReportPeriods, type ReportPeriod } from "./report-period";
import {
  TRANSACTION_TYPE_LABEL,
  getPurchaseTransactions,
  todayIsoDate,
  type TransactionType
} from "./purchase-transactions";

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

/** A column of this report, keyed to its own row shape. */
export type PurchaseReportColumn = ReportColumn<keyof PurchaseReportRow & string>;

/**
 * Every column the report can show. Labels are verbatim from production's
 * shared table dictionary (`src/components/table-reports/i18n.json` → `table`),
 * which is why they read as Title Case while the rest of the app is sentence
 * case — report column heads are their own vocabulary in the product.
 */
export const PURCHASE_REPORT_COLUMNS: PurchaseReportColumn[] = [
  { key: "date", label: "Date", labelId: "Tanggal", format: "date", width: 120 },
  { key: "number", label: "Transaction No.", labelId: "No. Transaksi", width: 200 },
  { key: "vendorName", label: "Vendor", labelId: "Supplier", width: 200 },
  { key: "referenceNo", label: "Reference No.", labelId: "No. Referensi", width: 140 },
  { key: "dueDate", label: "Due Date", labelId: "Jatuh Tempo", format: "date", width: 120 },
  { key: "status", label: "Status", labelId: "Status", width: 130 },
  { key: "tags", label: "Tags", labelId: "Tag", width: 140 },
  { key: "memo", label: "Memo", labelId: "Memo", width: 220 },
  { key: "warehouse", label: "Warehouse", labelId: "Gudang", width: 160 },
  { key: "currency", label: "Currency", labelId: "Mata Uang", width: 100 },
  {
    key: "grossAmount",
    label: "Gross Amount",
    labelId: "Jumlah Kotor",
    format: "money",
    width: 150
  },
  {
    key: "discountAmount",
    label: "Discount Amount",
    labelId: "Jumlah Diskon",
    format: "money",
    width: 150
  },
  { key: "taxAmount", label: "Tax Amount", labelId: "Jumlah Pajak", format: "money", width: 140 },
  { key: "total", label: "Total", labelId: "Total", format: "money", width: 150 },
  { key: "payment", label: "Payment", labelId: "Pembayaran", format: "money", width: 150 },
  {
    key: "balanceDue",
    label: "Balance Due",
    labelId: "Sisa Tagihan",
    format: "money",
    width: 150
  }
];

const COLUMN_BY_KEY = new Map(PURCHASE_REPORT_COLUMNS.map((c) => [c.key, c]));

export function reportColumn(key: keyof PurchaseReportRow): PurchaseReportColumn {
  const column = COLUMN_BY_KEY.get(key);
  if (!column) throw new Error(`Unknown purchase report column: ${key}`);
  return column;
}

// ---------------------------------------------------------------------------
// Layouts (production's "templates")
// ---------------------------------------------------------------------------

/**
 * Production lets a company save any number of column layouts and edit them in
 * a builder at `/reports/purchases_list/custom_layouts/…`. With no backend to
 * persist one, this prototype ships three fixed sets — enough to show what
 * switching a template does to the table, which is the part worth prototyping.
 */
export const PURCHASE_REPORT_LAYOUTS: ReportLayout<keyof PurchaseReportRow & string>[] = [
  {
    id: "standard",
    name: "Standard",
    nameId: "Standar",
    columns: ["date", "number", "vendorName", "dueDate", "status", "total", "balanceDue"]
  },
  {
    id: "detailed",
    name: "Detailed",
    nameId: "Rinci",
    columns: [
      "date",
      "number",
      "vendorName",
      "referenceNo",
      "dueDate",
      "status",
      "tags",
      "grossAmount",
      "discountAmount",
      "taxAmount",
      "total",
      "payment",
      "balanceDue"
    ]
  },
  {
    id: "summary",
    name: "Summary",
    nameId: "Ringkas",
    columns: ["date", "number", "vendorName", "total"]
  }
];

// ---------------------------------------------------------------------------
// Period presets
// ---------------------------------------------------------------------------

/**
 * The 11 presets, resolved against the fixture's today (2 Sep 2026) rather than
 * the wall clock — the whole Purchases dataset is generated relative to it.
 * Sales offers the same list against its own fixture; see
 * [`report-period.ts`](./report-period.ts).
 */
export const PURCHASE_REPORT_PERIODS: ReportPeriod[] = buildReportPeriods(todayIsoDate);

export { DEFAULT_PERIOD_ID, type ReportPeriod };

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

/**
 * Production's transaction-type list is the seven *accounting* documents its
 * report API groups by, including two payment types this prototype doesn't
 * model. These are our own eight `TransactionType`s instead, so the filter can
 * only ever offer something the dataset actually contains.
 */
export const PURCHASE_REPORT_TYPE_OPTIONS: { value: TransactionType; label: string }[] = (
  Object.keys(TRANSACTION_TYPE_LABEL) as TransactionType[]
).map((value) => ({ value, label: TRANSACTION_TYPE_LABEL[value] }));

export const DEFAULT_TRANSACTION_TYPE: TransactionType = "invoice";

/** Production's "Date by" — which date the range filters against. */
export const DATE_BY_OPTIONS = [
  { value: "transaction_date", label: "Transaction date", labelId: "Tanggal transaksi" },
  { value: "due_date", label: "Due date", labelId: "Jatuh tempo" }
] as const;

export type DateBy = (typeof DATE_BY_OPTIONS)[number]["value"];

export const PURCHASE_REPORT_STATUS_OPTIONS = (
  Object.keys(PURCHASE_STATUS_LABEL) as PurchaseStatus[]
).map((value) => ({ value, label: PURCHASE_STATUS_LABEL[value] }));

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export interface PurchaseReportRow {
  id: number;
  /** ISO — the display string is produced at render time by `formatDisplayDate`. */
  date: string;
  number: string;
  vendorName: string;
  referenceNo: string;
  dueDate: string;
  status: PurchaseStatus;
  tags: string[];
  memo: string;
  warehouse: string;
  currency: string;
  grossAmount: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  payment: number;
  balanceDue: number;
}

/** Projects the shared Purchases dataset into report rows for one type. */
export function buildPurchaseReportRows(type: TransactionType): PurchaseReportRow[] {
  return getPurchaseTransactions()
    .filter((t) => t.type === type)
    .map((t) => ({
      id: t.id,
      date: t.transactionDateSort,
      number: t.number,
      vendorName: t.vendorName,
      referenceNo: t.referenceNo,
      dueDate: t.dueDateSort,
      status: t.status,
      tags: t.tags,
      memo: t.memo,
      warehouse: t.warehouse,
      currency: t.currency,
      // "Gross" is pre-discount, pre-tax — the report's own vocabulary, derived
      // here rather than stored, so it can't disagree with the transaction.
      grossAmount: t.subtotal + t.discountAmount + t.discountPerLines,
      discountAmount: t.discountAmount + t.discountPerLines,
      taxAmount: t.taxAmount,
      total: t.total,
      payment: t.amountReceived,
      balanceDue: t.balanceDue
    }));
}

/** Vendors present in the dataset — the drawer's vendor picker. */
export function purchaseReportVendors(): string[] {
  return [...new Set(getPurchaseTransactions().map((t) => t.vendorName))].sort();
}

/** Tags present in the dataset — the drawer's tag picker. */
export function purchaseReportTags(): string[] {
  return [...new Set(getPurchaseTransactions().flatMap((t) => t.tags))].sort();
}

/**
 * Where a transaction number links to, per type. Every type the Purchases
 * module has a detail page for gets one; `financing` has none, so a report
 * renders those numbers as plain text rather than a link that 404s.
 */
export const PURCHASE_TRANSACTION_ROUTE: Partial<Record<TransactionType, string>> = {
  invoice: "/purchase/invoice",
  join_invoice: "/purchase/join-invoice",
  delivery: "/purchase/delivery",
  order: "/purchase/order",
  quote: "/purchase/quote",
  request: "/purchase/request",
  return: "/purchase/return"
};
