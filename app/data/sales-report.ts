/**
 * Sales list report — the column layouts, filter options and row shape for
 * `app/pages/reports/sales_list.vue`. Ported from `jurnal-frontend-app`
 * (`src/pages/reports/sales_list/`).
 *
 * **The rows are not new mock data.** They are a projection of
 * [`sales-transactions.ts`](./sales-transactions.ts) — the same array the Sales
 * module's list, detail and form pages read and write. A report over a parallel
 * fixture would drift from the module it reports on, and the money and date
 * formats would drift with it (see `docs/patterns/page-recipes.md` § "one
 * format per value type, per module"). Edit an invoice on
 * `/sales/invoice/12` and this report shows the edited figure.
 *
 * **The AR mirror of [`purchase-report.ts`](./purchase-report.ts)**, and
 * deliberately a separate file rather than a shared generic one — the same
 * reason [`sales-status.ts`](./sales-status.ts) mirrors `purchase-status.ts`:
 * the two modules stay independently editable, so a column the Sales report
 * grows can't silently reshape the Purchases one. What genuinely is shared —
 * the column descriptor, the layout shape, the period presets — lives in
 * [`report-column.ts`](./report-column.ts) and
 * [`report-period.ts`](./report-period.ts), and both modules read it from
 * there.
 *
 * **Ported, not copied.** Production reads `api/v1/reports/sales_list` with a
 * saved `report_layout_id`, company custom fields, tag logic (`and`/`or`),
 * contact-group lookups, and a server-rendered PDF/XLSX/CSV export. Here the
 * layouts are three fixed column sets, the filter runs in memory, and Export is
 * a no-op that reports what it would produce. Deliberately absent: custom
 * fields, saved/editable templates, the export-limitation banners, and Mixpanel
 * tracking.
 */

import { SALES_STATUS_LABEL, type SalesStatus } from "./sales-status";
import type { ReportColumn, ReportLayout } from "./report-column";
import { DEFAULT_PERIOD_ID, buildReportPeriods, type ReportPeriod } from "./report-period";
import {
  TRANSACTION_TYPE_LABEL,
  getSalesTransactions,
  todayIsoDate,
  type TransactionType
} from "./sales-transactions";

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

/** A column of this report, keyed to its own row shape. */
export type SalesReportColumn = ReportColumn<keyof SalesReportRow & string>;

/**
 * Every column the report can show. Labels are verbatim from production's
 * shared table dictionary (`src/components/table-reports/i18n.json` → `table`),
 * which is why they read as Title Case while the rest of the app is sentence
 * case — report column heads are their own vocabulary in the product.
 */
export const SALES_REPORT_COLUMNS: SalesReportColumn[] = [
  { key: "date", label: "Date", labelId: "Tanggal", format: "date", width: 120 },
  { key: "number", label: "Transaction No.", labelId: "No. Transaksi", width: 200 },
  { key: "customerName", label: "Customer", labelId: "Pelanggan", width: 200 },
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
  // Sales-only, and the reason this is not a find-and-replace of the Purchases
  // report: a customer can pay a share of an invoice up front. Every third
  // invoice in the fixture carries one, so the column has something to say.
  { key: "deposit", label: "Deposit", labelId: "Deposit", format: "money", width: 150 },
  { key: "payment", label: "Payment", labelId: "Pembayaran", format: "money", width: 150 },
  {
    key: "balanceDue",
    label: "Balance Due",
    labelId: "Sisa Tagihan",
    format: "money",
    width: 150
  }
];

const COLUMN_BY_KEY = new Map(SALES_REPORT_COLUMNS.map((c) => [c.key, c]));

export function reportColumn(key: keyof SalesReportRow): SalesReportColumn {
  const column = COLUMN_BY_KEY.get(key);
  if (!column) throw new Error(`Unknown sales report column: ${key}`);
  return column;
}

// ---------------------------------------------------------------------------
// Layouts (production's "templates")
// ---------------------------------------------------------------------------

/**
 * Production lets a company save any number of column layouts and edit them in
 * a builder at `/reports/sales_list/custom_layouts/…`. With no backend to
 * persist one, this prototype ships three fixed sets — enough to show what
 * switching a template does to the table, which is the part worth prototyping.
 */
export const SALES_REPORT_LAYOUTS: ReportLayout<keyof SalesReportRow & string>[] = [
  {
    id: "standard",
    name: "Standard",
    nameId: "Standar",
    columns: ["date", "number", "customerName", "dueDate", "status", "total", "balanceDue"]
  },
  {
    id: "detailed",
    name: "Detailed",
    nameId: "Rinci",
    columns: [
      "date",
      "number",
      "customerName",
      "referenceNo",
      "dueDate",
      "status",
      "tags",
      "grossAmount",
      "discountAmount",
      "taxAmount",
      "total",
      "deposit",
      "payment",
      "balanceDue"
    ]
  },
  {
    id: "summary",
    name: "Summary",
    nameId: "Ringkas",
    columns: ["date", "number", "customerName", "total"]
  }
];

// ---------------------------------------------------------------------------
// Period presets
// ---------------------------------------------------------------------------

/**
 * The 11 presets, resolved against the fixture's today (2 Sep 2026) rather than
 * the wall clock — the whole Sales dataset is generated relative to it.
 */
export const SALES_REPORT_PERIODS: ReportPeriod[] = buildReportPeriods(todayIsoDate);

export { DEFAULT_PERIOD_ID, type ReportPeriod };

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

/**
 * Production's transaction-type list is the *accounting* documents its report
 * API groups by, including payment types this prototype doesn't model. These
 * are our own eight `TransactionType`s instead, so the filter can only ever
 * offer something the dataset actually contains.
 */
export const SALES_REPORT_TYPE_OPTIONS: { value: TransactionType; label: string }[] = (
  Object.keys(TRANSACTION_TYPE_LABEL) as TransactionType[]
).map((value) => ({ value, label: TRANSACTION_TYPE_LABEL[value] }));

export const DEFAULT_TRANSACTION_TYPE: TransactionType = "invoice";

/** Production's "Date by" — which date the range filters against. */
export const DATE_BY_OPTIONS = [
  { value: "transaction_date", label: "Transaction date", labelId: "Tanggal transaksi" },
  { value: "due_date", label: "Due date", labelId: "Jatuh tempo" }
] as const;

export type DateBy = (typeof DATE_BY_OPTIONS)[number]["value"];

export const SALES_REPORT_STATUS_OPTIONS = (Object.keys(SALES_STATUS_LABEL) as SalesStatus[]).map(
  (value) => ({ value, label: SALES_STATUS_LABEL[value] })
);

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export interface SalesReportRow {
  id: number;
  /** ISO — the display string is produced at render time by `formatDisplayDate`. */
  date: string;
  number: string;
  customerName: string;
  referenceNo: string;
  dueDate: string;
  status: SalesStatus;
  tags: string[];
  memo: string;
  warehouse: string;
  currency: string;
  grossAmount: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  deposit: number;
  payment: number;
  balanceDue: number;
}

/** Projects the shared Sales dataset into report rows for one type. */
export function buildSalesReportRows(type: TransactionType): SalesReportRow[] {
  return getSalesTransactions()
    .filter((t) => t.type === type)
    .map((t) => ({
      id: t.id,
      date: t.transactionDateSort,
      number: t.number,
      customerName: t.customerName,
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
      deposit: t.depositAmount,
      payment: t.amountReceived,
      balanceDue: t.balanceDue
    }));
}

/** Customers present in the dataset — the drawer's customer picker. */
export function salesReportCustomers(): string[] {
  return [...new Set(getSalesTransactions().map((t) => t.customerName))].sort();
}

/** Tags present in the dataset — the drawer's tag picker. */
export function salesReportTags(): string[] {
  return [...new Set(getSalesTransactions().flatMap((t) => t.tags))].sort();
}

/**
 * Where a transaction number links to, per type. Unlike Purchases — where
 * `financing` has no detail page and so renders as plain text — every Sales
 * type has one, so every number in every Sales report is a link.
 */
export const SALES_TRANSACTION_ROUTE: Record<TransactionType, string> = {
  invoice: "/sales/invoice",
  join_invoice: "/sales/join-invoice",
  delivery: "/sales/delivery",
  order: "/sales/order",
  quotation: "/sales/quotation",
  return: "/sales/return",
  proforma_invoice: "/sales/proforma-invoice",
  proforma_order: "/sales/proforma-order"
};
