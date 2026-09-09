/**
 * The other four Sales reports — by customer, delivery, by product, order
 * completion. Ported from `jurnal-frontend-app` (`src/pages/reports/
 * sales_by_customer | sales_delivery | sales_by_product |
 * sales_order_completion`).
 *
 * Same contract as [`sales-report.ts`](./sales-report.ts), which holds the
 * Sales list report and everything all five share (periods, filter options, the
 * route map): **rows are a projection of
 * [`sales-transactions.ts`](./sales-transactions.ts)**, never a parallel
 * fixture. Each builder derives its figures at read time so they cannot
 * disagree with the transaction they came from.
 *
 * **Ported, not copied.** Production reads one endpoint per report, each with
 * its own server-side grouping, subtotals and pagination. Here every report is
 * a flat table over the same in-memory array. The most visible consequence is
 * that production's *grouped* reports — by customer, and delivery grouped by
 * customer or product — render a group header and a subtotal row per group;
 * this prototype repeats the grouping column on each row and shows one TOTAL at
 * the bottom instead. The figures are the same; the visual nesting is not.
 */

import type { ReportColumn } from "./report-column";
import { getPurchaseTransactions } from "./purchase-transactions";
import {
  buildSalesReportRows,
  reportColumn,
  type SalesReportColumn,
  type SalesReportRow
} from "./sales-report";
import { SALES_STATUS_LABEL, type SalesStatus } from "./sales-status";
import { parseLocalIsoDate } from "~/utils/dates";
import {
  PRODUCT_OPTIONS,
  TAX_OPTIONS,
  TRANSACTION_TYPE_LABEL,
  getSalesTransactions,
  type SalesTransaction,
  type TransactionType
} from "./sales-transactions";

// ---------------------------------------------------------------------------
// Sales by customer
// ---------------------------------------------------------------------------

export interface CustomerLineRow {
  /** Composite — a line item has no id of its own across transactions. */
  id: string;
  transactionId: number;
  type: TransactionType;
  customerName: string;
  date: string;
  transactionType: string;
  number: string;
  productName: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

export const CUSTOMER_REPORT_COLUMNS: ReportColumn<keyof CustomerLineRow & string>[] = [
  { key: "customerName", label: "Customer", labelId: "Pelanggan", width: 190 },
  { key: "date", label: "Date", labelId: "Tanggal", format: "date", width: 120 },
  { key: "transactionType", label: "Transaction Type", labelId: "Tipe Transaksi", width: 150 },
  { key: "number", label: "Transaction No.", labelId: "No. Transaksi", width: 190 },
  { key: "productName", label: "Product Name", labelId: "Nama Produk", width: 190 },
  { key: "description", label: "Description", labelId: "Deskripsi", width: 200 },
  { key: "quantity", label: "Qty", labelId: "Kuantitas", format: "number", total: true, width: 90 },
  { key: "unit", label: "Unit", labelId: "Satuan", width: 90 },
  // Money, so right-aligned and written as rupiah — but a column of unit prices
  // has no meaningful sum, so it opts out of the TOTAL row.
  {
    key: "unitPrice",
    label: "Price Per Unit",
    labelId: "Harga Per Unit",
    format: "money",
    total: false,
    width: 150
  },
  { key: "amount", label: "Amount", labelId: "Jumlah", format: "money", width: 160 }
];

/**
 * One row per *line item* of every matching transaction, ordered by customer so
 * a customer's purchases read as a block. Production nests these under a
 * customer header with a subtotal; see the module note above.
 */
export function buildCustomerLineRows(type: TransactionType): CustomerLineRow[] {
  return getSalesTransactions()
    .filter((t) => t.type === type)
    .flatMap((t) =>
      t.lines.map((line) => ({
        id: `${t.id}-${line.id}`,
        transactionId: t.id,
        type: t.type,
        customerName: t.customerName,
        date: t.transactionDateSort,
        transactionType: TRANSACTION_TYPE_LABEL[t.type],
        number: t.number,
        productName: line.product,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: line.unitPrice,
        amount: line.amount
      }))
    )
    .sort((a, b) => a.customerName.localeCompare(b.customerName) || a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Sales delivery
// ---------------------------------------------------------------------------

/** Production's three groupings, each with its own column set. */
export type DeliveryGrouping = "transaction" | "customer" | "product";

export const DELIVERY_GROUPING_OPTIONS: { value: DeliveryGrouping; label: string }[] = [
  { value: "transaction", label: "Transaction" },
  { value: "customer", label: "Customer" },
  { value: "product", label: "Product" }
];

export interface DeliveryRow {
  id: string;
  transactionId: number;
  date: string;
  transactionType: string;
  number: string;
  customerName: string;
  productName: string;
  unit: string;
  quantity: number;
  amount: number;
}

const DELIVERY_COLUMN_SETS: Record<DeliveryGrouping, ReportColumn<keyof DeliveryRow & string>[]> = {
  // One row per delivery — no product breakdown, so no Qty either.
  transaction: [
    { key: "date", label: "Date", labelId: "Tanggal", format: "date", width: 130 },
    { key: "transactionType", label: "Transaction Type", labelId: "Tipe Transaksi", width: 170 },
    { key: "number", label: "Transaction No.", labelId: "No. Transaksi", width: 200 },
    { key: "customerName", label: "Customer", labelId: "Pelanggan", width: 220 },
    { key: "amount", label: "Amount", labelId: "Jumlah", format: "money", width: 180 }
  ],
  customer: [
    { key: "customerName", label: "Customer", labelId: "Pelanggan", width: 220 },
    { key: "productName", label: "Product Name", labelId: "Nama Produk", width: 220 },
    { key: "unit", label: "Unit", labelId: "Satuan", width: 100 },
    {
      key: "quantity",
      label: "Qty",
      labelId: "Kuantitas",
      format: "number",
      total: true,
      width: 100
    },
    { key: "amount", label: "Amount", labelId: "Jumlah", format: "money", width: 180 }
  ],
  product: [
    { key: "productName", label: "Product Name", labelId: "Nama Produk", width: 200 },
    { key: "date", label: "Date", labelId: "Tanggal", format: "date", width: 120 },
    { key: "transactionType", label: "Transaction Type", labelId: "Tipe Transaksi", width: 160 },
    { key: "number", label: "Transaction No.", labelId: "No. Transaksi", width: 190 },
    { key: "customerName", label: "Customer", labelId: "Pelanggan", width: 190 },
    { key: "unit", label: "Unit", labelId: "Satuan", width: 90 },
    {
      key: "quantity",
      label: "Qty",
      labelId: "Kuantitas",
      format: "number",
      total: true,
      width: 90
    },
    { key: "amount", label: "Amount", labelId: "Jumlah", format: "money", width: 160 }
  ]
};

export function deliveryColumns(grouping: DeliveryGrouping) {
  return DELIVERY_COLUMN_SETS[grouping];
}

/**
 * Deliveries only — the report has no transaction-type choice, which is why its
 * drawer hides that field.
 *
 * The grouping decides both the column set above and the row grain: grouped by
 * transaction there is one row per delivery, otherwise one per delivered line.
 */
export function buildDeliveryRows(grouping: DeliveryGrouping): DeliveryRow[] {
  const deliveries = getSalesTransactions().filter((t) => t.type === "delivery");

  if (grouping === "transaction") {
    return deliveries
      .map((t) => ({
        id: String(t.id),
        transactionId: t.id,
        date: t.transactionDateSort,
        transactionType: TRANSACTION_TYPE_LABEL[t.type],
        number: t.number,
        customerName: t.customerName,
        productName: "",
        unit: "",
        quantity: 0,
        // The delivery's line value, NOT `t.total`. Regrouping the same
        // deliveries must not change what they add up to, and the other two
        // groupings are line-grained — `t.total` carries tax that a sum of line
        // amounts does not, so using it here would make the TOTAL row jump by
        // the tax the moment the reader switched grouping.
        amount: t.lines.reduce((sum, line) => sum + line.amount, 0)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  const lines = deliveries.flatMap((t) =>
    t.lines.map((line) => ({
      id: `${t.id}-${line.id}`,
      transactionId: t.id,
      date: t.transactionDateSort,
      transactionType: TRANSACTION_TYPE_LABEL[t.type],
      number: t.number,
      customerName: t.customerName,
      productName: line.product,
      unit: line.unit,
      quantity: line.quantity,
      amount: line.amount
    }))
  );

  return grouping === "customer"
    ? lines.sort(
        (a, b) => a.customerName.localeCompare(b.customerName) || a.date.localeCompare(b.date)
      )
    : lines.sort(
        (a, b) => a.productName.localeCompare(b.productName) || a.date.localeCompare(b.date)
      );
}

// ---------------------------------------------------------------------------
// Sales by product
// ---------------------------------------------------------------------------

export interface ProductReportRow {
  id: string;
  no: number;
  productCode: string;
  productName: string;
  salesQty: number;
  returnQty: number;
  salesValue: number;
  returnValue: number;
  avgSalesValue: number;
  totalSalesValue: number;
}

export const PRODUCT_REPORT_COLUMNS: ReportColumn<keyof ProductReportRow & string>[] = [
  { key: "no", label: "No.", format: "number", total: false, align: "left", width: 70 },
  { key: "productCode", label: "Product Code / SKU", labelId: "Kode Produk / SKU", width: 170 },
  { key: "productName", label: "Product Name", labelId: "Nama Produk", width: 220 },
  {
    key: "salesQty",
    label: "Sales Qty",
    labelId: "Kuantitas Penjualan",
    format: "number",
    total: true,
    width: 120
  },
  {
    key: "returnQty",
    label: "Return Qty",
    labelId: "Kuantitas Retur",
    format: "number",
    total: true,
    width: 120
  },
  {
    key: "salesValue",
    label: "Sales Value",
    labelId: "Nilai Penjualan",
    format: "money",
    width: 160
  },
  {
    key: "returnValue",
    label: "Return Value",
    labelId: "Nilai Retur",
    format: "money",
    width: 150
  },
  // An average of averages is not an average, so this column carries no total.
  {
    key: "avgSalesValue",
    label: "Average Sales Value",
    labelId: "Nilai Penjualan Rata-rata",
    format: "money",
    total: false,
    width: 190
  },
  {
    key: "totalSalesValue",
    label: "Total Sales Value",
    labelId: "Total Nilai Penjualan",
    format: "money",
    width: 180
  }
];

/**
 * `PRODUCT_OPTIONS` carries no SKU — the prototype's products are a name, a
 * price and a unit. The code is derived from the product's position in that list
 * so it is stable across reloads and reads like the real thing, rather than
 * inventing a second product fixture just to hold one field.
 */
function productCode(name: string): string {
  const index = PRODUCT_OPTIONS.findIndex((p) => p.name === name);
  return `PRD-${String(index >= 0 ? index + 1 : 0).padStart(3, "0")}`;
}

/**
 * One row per product, aggregated across every sale of the selected type — and,
 * for returns, across every `return` record, since a return's value is what
 * makes "net sales" meaningful.
 *
 * The filter is applied here, per *transaction*, rather than to the finished
 * rows. A product row spans many transactions, so filtering afterwards would
 * keep or drop a whole product instead of narrowing what it sums — a date range
 * would then either include a product's entire history or none of it.
 *
 * `no` is left at 0: it is a display counter, so the page assigns it after
 * sorting. Numbering here would leave "No." out of order the moment the reader
 * sorts by quantity or value.
 */
export function buildProductReportRows(
  type: TransactionType,
  matches: (t: SalesTransaction) => boolean = () => true
): ProductReportRow[] {
  const all = getSalesTransactions().filter(matches);
  const sales = all.filter((t) => t.type === type);
  const returns = all.filter((t) => t.type === "return");

  const byProduct = new Map<string, ProductReportRow>();
  const seed = (name: string): ProductReportRow => {
    const existing = byProduct.get(name);
    if (existing) return existing;
    const row: ProductReportRow = {
      id: name,
      no: 0,
      productCode: productCode(name),
      productName: name,
      salesQty: 0,
      returnQty: 0,
      salesValue: 0,
      returnValue: 0,
      avgSalesValue: 0,
      totalSalesValue: 0
    };
    byProduct.set(name, row);
    return row;
  };

  sales.forEach((t) =>
    t.lines.forEach((line) => {
      const row = seed(line.product);
      row.salesQty += line.quantity;
      row.salesValue += line.amount;
    })
  );

  returns.forEach((t) =>
    t.lines.forEach((line) => {
      const row = seed(line.product);
      row.returnQty += line.quantity;
      row.returnValue += line.amount;
    })
  );

  return [...byProduct.values()]
    .map((row) => ({
      ...row,
      avgSalesValue: row.salesQty ? Math.round(row.salesValue / row.salesQty) : 0,
      // "Total" here is net of returns — the figure the report exists to give.
      totalSalesValue: row.salesValue - row.returnValue
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName));
}

// ---------------------------------------------------------------------------
// Pro forma invoice list / Join invoice list
//
// Both are the Sales list report pinned to one transaction type — which is
// what their cards on the Reports index promise ("Shows all created proforma
// invoices in a certain period"). Neither has a Vue page in
// `jurnal-frontend-app` to port: like Customer balance and Aged receivable,
// production still renders them server-side. So these are built to
// `docs/patterns/reports-page-format.md` rather than cloned, and their column
// sets are trimmed to what each document actually carries.
// ---------------------------------------------------------------------------

/**
 * Pro forma invoices carry everything an invoice does except a deposit and a
 * credit memo (see `TYPE_CAPABILITIES`), so the column set is the Sales list's
 * minus Deposit. Payment and Balance Due stay: a pro forma's status pool
 * includes `paid`, so both columns have something to say.
 */
export const PROFORMA_INVOICE_COLUMNS: SalesReportColumn[] = [
  "date",
  "number",
  "customerName",
  "referenceNo",
  "dueDate",
  "status",
  "tags",
  "warehouse",
  "grossAmount",
  "discountAmount",
  "taxAmount",
  "total",
  "payment",
  "balanceDue"
].map((key) => reportColumn(key as keyof SalesReportRow));

/** A join invoice, plus the one figure that makes it one. */
export interface JoinInvoiceRow extends SalesReportRow {
  /** How many invoices this document bundles. */
  invoiceCount: number;
}

/**
 * Deliberately shorter than the Sales list's. A join invoice has no lines of
 * its own — its figures are the sum of the invoices it bundles — so the
 * generator leaves `taxAmount`, `amountReceived` and both discount fields at
 * zero, and `subtotal` equal to `total`. Six columns of guaranteed `0,00` and
 * one duplicate of Total are worse than not offering them (see
 * `reports-page-format.md` § Gotchas), so what is left is the document, its
 * customer, what it bundles, and what is still owed on it.
 */
export const JOIN_INVOICE_COLUMNS: ReportColumn<keyof JoinInvoiceRow & string>[] = [
  reportColumn("date"),
  reportColumn("number"),
  reportColumn("customerName"),
  {
    key: "invoiceCount",
    label: "Invoices Bundled",
    labelId: "Faktur Digabung",
    format: "number",
    // The sum is the point: how many invoices the whole report covers.
    total: true,
    width: 150
  },
  reportColumn("dueDate"),
  reportColumn("status"),
  reportColumn("tags"),
  reportColumn("total"),
  reportColumn("balanceDue")
];

/** The Sales list projection for join invoices, plus the bundle size. */
export function buildJoinInvoiceRows(): JoinInvoiceRow[] {
  const byId = new Map(getSalesTransactions().map((t) => [t.id, t]));
  return buildSalesReportRows("join_invoice").map((row) => ({
    ...row,
    invoiceCount: byId.get(row.id)?.joinedInvoiceIds.length ?? 0
  }));
}

// ---------------------------------------------------------------------------
// Sales tax
//
// "Shows taxable amount, tax rate, and tax amount with the value added tax used
// in transactions in a certain period" — so a listing of the tax charged, not a
// summary by rate. Also built rather than ported: no Vue page in
// `jurnal-frontend-app`.
// ---------------------------------------------------------------------------

export interface SalesTaxRow {
  /** Composite — a transaction can carry more than one tax label. */
  id: string;
  transactionId: number;
  date: string;
  number: string;
  customerName: string;
  taxName: string;
  /** DPP — the line value the rate was applied to. */
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
}

export const SALES_TAX_COLUMNS: ReportColumn<keyof SalesTaxRow & string>[] = [
  { key: "date", label: "Date", labelId: "Tanggal", format: "date", width: 120 },
  { key: "number", label: "Transaction No.", labelId: "No. Transaksi", width: 190 },
  { key: "customerName", label: "Customer", labelId: "Pelanggan", width: 200 },
  { key: "taxName", label: "Tax Name", labelId: "Nama Pajak", width: 140 },
  {
    key: "taxableAmount",
    label: "Taxable Amount (DPP)",
    labelId: "Dasar Pengenaan Pajak (DPP)",
    format: "money",
    width: 190
  },
  // A rate is a property of each row, not a quantity — summing a column of them
  // would produce a number with no meaning.
  {
    key: "taxRate",
    label: "Tax Rate (%)",
    labelId: "Tarif Pajak (%)",
    format: "percent",
    width: 130
  },
  { key: "taxAmount", label: "Tax Amount", labelId: "Jumlah Pajak", format: "money", width: 170 }
];

/**
 * One row per **transaction × tax label**, over invoices only.
 *
 * Invoices and nothing else: a quotation or an order in this dataset carries a
 * tax figure, but neither creates a tax liability — only the invoice does. A
 * tax report that added up quotations would overstate what is owed, which is a
 * worse failure than a missing filter.
 *
 * The grain is per tax label rather than per transaction because a single
 * invoice can mix rates: `TAX_OPTIONS` offers PPN 11%, PPN 12% and Non-taxable,
 * and the form sets them per line. Every generated record is on PPN 11%, so
 * today this is one row per invoice — but a record created through the form
 * with two rates on it produces two rows, each with its own DPP, which is what
 * makes the Tax Name and Tax Rate columns worth having.
 *
 * Lines with no tax label are skipped: there is nothing to report on a value
 * that was never taxed. `Non-taxable` is a declared treatment rather than an
 * absence, so it stays, at rate 0.
 */
export function buildSalesTaxRows(): SalesTaxRow[] {
  const rateFor = new Map(TAX_OPTIONS.map((t) => [t.label, t.rate]));

  return getSalesTransactions()
    .filter((t) => t.type === "invoice" && t.status !== "rejected")
    .flatMap((t) => {
      // DPP per label, off the lines — the tax is charged on what the lines are
      // worth, so the base has to be derived from the same place.
      const baseByLabel = new Map<string, number>();
      t.lines.forEach((line) => {
        if (!line.tax) return;
        baseByLabel.set(line.tax, (baseByLabel.get(line.tax) ?? 0) + line.amount);
      });

      return [...baseByLabel.entries()].map(([label, base]) => {
        const rate = rateFor.get(label) ?? 0;
        // Prefer the transaction's own `taxes` entry where there is one, so the
        // report never disagrees with the figure on the invoice itself; fall
        // back to the rate for a label the record didn't summarise.
        const stated = t.taxes.find((tax) => tax.label === label)?.amount;
        return {
          id: `${t.id}-${label}`,
          transactionId: t.id,
          date: t.transactionDateSort,
          number: t.number,
          customerName: t.customerName,
          taxName: label,
          taxableAmount: base,
          taxRate: rate,
          taxAmount: stated ?? Math.round((base * rate) / 100)
        };
      });
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.taxName.localeCompare(b.taxName));
}

// ---------------------------------------------------------------------------
// Customer balance / Aged receivable
//
// The two **as-of-date** reports: not "what happened between two dates" but
// "what was owed on one". Neither has a page in `jurnal-frontend-app` to port
// — production renders both server-side — so both are built to
// `docs/patterns/reports-page-format.md` § As of a date, not cloned.
// ---------------------------------------------------------------------------

/**
 * What an invoice still owed at the end of `asOfIso`.
 *
 * The stored `balanceDue` is only ever *today's* answer. Rewinding it means
 * adding back everything settled after the day being asked about, which is
 * what `payment.dateSort` and `creditMemo.dateSort` exist for: an invoice paid
 * on 20 Sep was fully outstanding on 15 Sep, and a report that showed it as
 * settled would be reporting the present while claiming to report the past.
 *
 * Returns 0 for an invoice not yet raised on that date — it cannot be owed
 * before it exists.
 */
function balanceAsOf(t: SalesTransaction, asOfIso: string): number {
  if (t.transactionDateSort > asOfIso) return 0;
  const settled =
    t.payments.reduce((sum, p) => (p.dateSort <= asOfIso ? sum + p.amount : sum), 0) +
    t.creditMemos.reduce((sum, m) => (m.dateSort <= asOfIso ? sum + m.amount : sum), 0);
  return Math.max(0, t.total - settled);
}

/** Days past due at `asOfIso`; 0 or less means not yet due. */
function daysOverdue(t: SalesTransaction, asOfIso: string): number {
  const due = parseLocalIsoDate(t.dueDateSort).getTime();
  const asOf = parseLocalIsoDate(asOfIso).getTime();
  return Math.round((asOf - due) / 86_400_000);
}

export interface CustomerBalanceRow {
  id: number;
  customerName: string;
  date: string;
  number: string;
  dueDate: string;
  status: SalesStatus;
  statusLabel: string;
  total: number;
  paid: number;
  balanceDue: number;
  daysOverdue: number;
}

export const CUSTOMER_BALANCE_COLUMNS: ReportColumn<keyof CustomerBalanceRow & string>[] = [
  { key: "customerName", label: "Customer", labelId: "Pelanggan", width: 200 },
  { key: "date", label: "Invoice Date", labelId: "Tanggal Faktur", format: "date", width: 130 },
  { key: "number", label: "Invoice No.", labelId: "No. Faktur", width: 190 },
  { key: "dueDate", label: "Due Date", labelId: "Jatuh Tempo", format: "date", width: 120 },
  { key: "status", label: "Status", labelId: "Status", width: 120 },
  { key: "total", label: "Invoice Amount", labelId: "Jumlah Faktur", format: "money", width: 170 },
  { key: "paid", label: "Paid", labelId: "Dibayar", format: "money", width: 160 },
  {
    key: "daysOverdue",
    label: "Days Overdue",
    labelId: "Hari Lewat Jatuh Tempo",
    format: "number",
    // Summing days is meaningless — this column describes each row, not the set.
    total: false,
    width: 130
  },
  { key: "balanceDue", label: "Balance Due", labelId: "Sisa Tagihan", format: "money", width: 170 }
];

/**
 * One row per invoice still unpaid on the given date, customer-ordered.
 *
 * A settled invoice is absent rather than present at zero: this report exists
 * to answer "who owes us what", and a paid invoice is not an answer to it. That
 * also makes the TOTAL row the receivable balance itself.
 *
 * Production's card promises credit-memo balances alongside the invoices. A
 * memo is subtracted inside `balanceAsOf` rather than given a column of its
 * own: the generator creates none (they only arrive from `applyCreditMemo` at
 * runtime), so the column would read `0,00` on every row of a fresh load.
 */
export function buildCustomerBalanceRows(asOfIso: string): CustomerBalanceRow[] {
  return getSalesTransactions()
    .filter((t) => t.type === "invoice" && t.status !== "rejected")
    .map((t) => ({ t, balance: balanceAsOf(t, asOfIso) }))
    .filter(({ balance }) => balance > 0)
    .map(({ t, balance }) => ({
      id: t.id,
      customerName: t.customerName,
      date: t.transactionDateSort,
      number: t.number,
      dueDate: t.dueDateSort,
      status: t.status,
      statusLabel: SALES_STATUS_LABEL[t.status],
      total: t.total,
      paid: t.total - balance,
      balanceDue: balance,
      daysOverdue: Math.max(0, daysOverdue(t, asOfIso))
    }))
    .sort(
      (a, b) => a.customerName.localeCompare(b.customerName) || a.dueDate.localeCompare(b.dueDate)
    );
}

/**
 * The five buckets, in the order the columns appear. `from`/`to` are days past
 * due, inclusive; `to: null` is the open-ended last bucket.
 *
 * Production's card names 30, 60, 90 and "after 90 days", which is four
 * boundaries and therefore five columns once "not yet due" is counted — that
 * one is the whole point of the report, since a receivable that isn't late yet
 * is the healthy part of the balance.
 */
export const AGING_BUCKETS = [
  { key: "current", label: "Current", labelId: "Belum Jatuh Tempo", from: -Infinity, to: 0 },
  { key: "days1to30", label: "1–30 Days", labelId: "1–30 Hari", from: 1, to: 30 },
  { key: "days31to60", label: "31–60 Days", labelId: "31–60 Hari", from: 31, to: 60 },
  { key: "days61to90", label: "61–90 Days", labelId: "61–90 Hari", from: 61, to: 90 },
  { key: "over90", label: "> 90 Days", labelId: "> 90 Hari", from: 91, to: null }
] as const;

export type AgingBucketKey = (typeof AGING_BUCKETS)[number]["key"];

export type AgedReceivableRow = {
  id: string;
  customerName: string;
  total: number;
} & Record<AgingBucketKey, number>;

export const AGED_RECEIVABLE_COLUMNS: ReportColumn<keyof AgedReceivableRow & string>[] = [
  { key: "customerName", label: "Customer", labelId: "Pelanggan", width: 220 },
  ...AGING_BUCKETS.map((b) => ({
    key: b.key,
    label: b.label,
    labelId: b.labelId,
    format: "money" as const,
    width: 150
  })),
  { key: "total", label: "Total", labelId: "Total", format: "money", width: 170 }
];

/**
 * One row per customer, their receivable split by how late it is.
 *
 * Built from the same `balanceAsOf` as Customer balance, so the two reports
 * reconcile: run both on the same date and this one's TOTAL equals that one's.
 * Every invoice lands in exactly one bucket — the row is a partition of the
 * customer's balance, not five overlapping measures — which is what makes the
 * per-row Total the sum of its own buckets.
 */
export function buildAgedReceivableRows(asOfIso: string): AgedReceivableRow[] {
  const byCustomer = new Map<string, AgedReceivableRow>();

  getSalesTransactions()
    .filter((t) => t.type === "invoice" && t.status !== "rejected")
    .forEach((t) => {
      const balance = balanceAsOf(t, asOfIso);
      if (balance <= 0) return;

      const row =
        byCustomer.get(t.customerName) ??
        ({
          id: t.customerName,
          customerName: t.customerName,
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          over90: 0,
          total: 0
        } satisfies AgedReceivableRow);

      const late = daysOverdue(t, asOfIso);
      const bucket =
        AGING_BUCKETS.find((b) => late >= b.from && (b.to === null || late <= b.to)) ??
        AGING_BUCKETS[0];
      row[bucket.key] += balance;
      row.total += balance;
      byCustomer.set(t.customerName, row);
    });

  return [...byCustomer.values()].sort((a, b) => a.customerName.localeCompare(b.customerName));
}

// ---------------------------------------------------------------------------
// Product profitability
// ---------------------------------------------------------------------------

export interface ProfitabilityRow {
  id: string;
  productName: string;
  unit: string;
  sellQty: number;
  grossSales: number;
  cogs: number;
  profit: number;
  /** Percent, not a ratio — the column head carries the `%`. */
  profitMargin: number;
  avgSellPrice: number;
  avgBuyPrice: number;
}

export const PROFITABILITY_COLUMNS: ReportColumn<keyof ProfitabilityRow & string>[] = [
  { key: "productName", label: "Product Name", labelId: "Nama Produk", width: 220 },
  {
    key: "sellQty",
    label: "Sell Qty",
    labelId: "Qty Terjual",
    format: "number",
    total: true,
    width: 110
  },
  { key: "unit", label: "Unit", labelId: "Satuan", width: 90 },
  {
    key: "grossSales",
    label: "Total Gross Sales",
    labelId: "Nilai Total Penjualan",
    format: "money",
    width: 170
  },
  { key: "cogs", label: "Total COGS", labelId: "Total HPP", format: "money", width: 160 },
  {
    key: "profit",
    label: "Total Profit Sales",
    labelId: "Nilai Total Profit",
    format: "money",
    width: 170
  },
  // No TOTAL: the margin of the whole report is total profit over total gross
  // sales, which is not the sum — nor the average — of the per-product margins.
  // The cell is left empty rather than filled with a number that isn't one.
  {
    key: "profitMargin",
    label: "Profit Margin (%)",
    labelId: "Profit Margin (%)",
    format: "percent",
    width: 150
  },
  {
    key: "avgSellPrice",
    label: "Avg Sell Price",
    labelId: "Harga Jual Rata-rata",
    format: "money",
    total: false,
    width: 160
  },
  {
    key: "avgBuyPrice",
    label: "Avg Buy Price",
    labelId: "Harga Beli Rata-rata",
    format: "money",
    total: false,
    width: 160
  }
];

/**
 * Average unit cost per product, taken from the **Purchases** ledger.
 *
 * This is the one report that reads both modules, because profit needs both
 * sides of the trade. Production gets COGS per sale out of the inventory
 * costing engine (FIFO or moving average, which is why its page carries a
 * recalculation banner). This prototype has no costing engine, so the cost
 * basis is the weighted average unit price across every purchase **invoice**
 * for that product — the same figure the report's own "Avg Buy Price" column
 * reports, so the two can never disagree.
 *
 * Deliberately **not** restricted to the report's date range: stock sold this
 * quarter was generally bought before it, so a windowed cost basis would read
 * as 100% margin on every product whose purchases fell outside the window.
 */
function averageBuyPrices(): Map<string, number> {
  const qty = new Map<string, number>();
  const value = new Map<string, number>();

  getPurchaseTransactions()
    .filter((t) => t.type === "invoice")
    .forEach((t) =>
      t.lines.forEach((line) => {
        qty.set(line.product, (qty.get(line.product) ?? 0) + line.quantity);
        value.set(line.product, (value.get(line.product) ?? 0) + line.amount);
      })
    );

  const averages = new Map<string, number>();
  qty.forEach((quantity, product) => {
    averages.set(product, quantity ? Math.round((value.get(product) ?? 0) / quantity) : 0);
  });
  return averages;
}

/**
 * One row per product sold, with what it earned and what it cost.
 *
 * Like Sales by product, the predicate is applied per *transaction* while
 * aggregating rather than to the finished rows — a product row spans many
 * invoices, so filtering afterwards would keep or drop a product's whole
 * history. The product filter itself is applied by the page, since that one
 * genuinely is a per-row test.
 *
 * Rows a company sold nothing of are absent rather than present at zero: this
 * report answers "what did we make on what we sold", and a product with no
 * sales has no answer.
 */
export function buildProfitabilityRows(
  matches: (t: SalesTransaction) => boolean = () => true
): ProfitabilityRow[] {
  const buyPrices = averageBuyPrices();
  const rows = new Map<string, ProfitabilityRow>();

  getSalesTransactions()
    .filter((t) => t.type === "invoice" && matches(t))
    .forEach((t) =>
      t.lines.forEach((line) => {
        const row =
          rows.get(line.product) ??
          ({
            id: line.product,
            productName: line.product,
            unit: line.unit,
            sellQty: 0,
            grossSales: 0,
            cogs: 0,
            profit: 0,
            profitMargin: 0,
            avgSellPrice: 0,
            avgBuyPrice: buyPrices.get(line.product) ?? 0
          } satisfies ProfitabilityRow);
        row.sellQty += line.quantity;
        row.grossSales += line.amount;
        rows.set(line.product, row);
      })
    );

  return [...rows.values()]
    .map((row) => {
      const cogs = row.sellQty * row.avgBuyPrice;
      const profit = row.grossSales - cogs;
      return {
        ...row,
        cogs,
        profit,
        // Margin is profit over what was sold, not over cost — a product sold
        // at twice its cost is a 50% margin, not 100%.
        profitMargin: row.grossSales ? Math.round((profit / row.grossSales) * 1000) / 10 : 0,
        avgSellPrice: row.sellQty ? Math.round(row.grossSales / row.sellQty) : 0
      };
    })
    .sort((a, b) => a.productName.localeCompare(b.productName));
}

// ---------------------------------------------------------------------------
// Sales order completion
// ---------------------------------------------------------------------------

export interface OrderCompletionRow {
  id: number;
  date: string;
  number: string;
  customerName: string;
  status: SalesStatus;
  statusLabel: string;
  orderAmount: number;
  deliveryNumber: string;
  deliveryId: number | null;
}

export const ORDER_COMPLETION_COLUMNS: ReportColumn<keyof OrderCompletionRow & string>[] = [
  { key: "date", label: "Date", labelId: "Tanggal", format: "date", width: 120 },
  { key: "number", label: "Order No.", labelId: "No. Pesanan", width: 190 },
  { key: "customerName", label: "Customer", labelId: "Pelanggan", width: 200 },
  { key: "status", label: "Order Status", labelId: "Status Pesanan", width: 140 },
  {
    key: "orderAmount",
    label: "Order Amount",
    labelId: "Jumlah Pesanan",
    format: "money",
    width: 180
  },
  { key: "deliveryNumber", label: "Delivery No.", labelId: "No. Pengiriman", width: 220 }
];

/**
 * One row per sales order, with how far it has got.
 *
 * Production walks the full quote → order → invoice → payment chain and offers
 * a "Start from" selector (Order or Quote) that swaps the leading columns. This
 * dataset models only order → delivery (`linkedDeliveryId`): a quotation here
 * carries no link to the order it became, so a quote-first mode would render a
 * table whose Order, Invoice and Payment columns were empty on every row. Same
 * rule as the Purchases report's dropped Payment column — a column that can
 * never say anything is worse than no column — so the row reports the order's
 * own status, its amount, and its linked delivery if it has one.
 */
export function buildOrderCompletionRows(): OrderCompletionRow[] {
  const all = getSalesTransactions();
  const byId = new Map<number, SalesTransaction>(all.map((t) => [t.id, t]));

  return all
    .filter((t) => t.type === "order")
    .map((t) => {
      const delivery = t.linkedDeliveryId != null ? byId.get(t.linkedDeliveryId) : undefined;
      return {
        id: t.id,
        date: t.transactionDateSort,
        number: t.number,
        customerName: t.customerName,
        status: t.status,
        statusLabel: SALES_STATUS_LABEL[t.status],
        orderAmount: t.total,
        deliveryNumber: delivery?.number ?? "",
        deliveryId: delivery?.id ?? null
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
