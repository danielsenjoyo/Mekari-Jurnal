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
import { SALES_STATUS_LABEL, type SalesStatus } from "./sales-status";
import {
  PRODUCT_OPTIONS,
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
