// Shared mock data source for the whole Sales module — the list page's 4
// tabs (app/pages/sales/index.vue), the detail pages
// (app/pages/sales/{invoice,order,delivery,return}/[id].vue), and the
// new/edit forms (app/components/sales/*Form.vue) all read and write this
// one in-memory array. Pure client-side mock; a real app would hit one API
// instead.
//
// Mirrors app/data/purchase-transactions.ts (Sales is the AR mirror of
// Purchases' AP) — one array of SalesTransaction, each tagged with a `type`
// (the 4 real transaction kinds in scope: invoice/order/delivery/return)
// plus `status`. Unlike Purchases, Sales has no approval-queue/rejected
// cross-cutting tabs and no request/financing types in
// this clone's scope (see docs/patterns — those remain future follow-ups).
import type { SalesStatus } from "./sales-status";
import { parseLocalIsoDate, toLocalIsoDate } from "~/utils/dates";

export type TransactionType =
  | "invoice"
  | "order"
  | "delivery"
  | "return"
  | "quotation"
  | "join_invoice"
  | "proforma_invoice"
  | "proforma_order";

// Display label used in both the record's `number` ("Sales Invoice #14026")
// and the tab title — matches the real Jurnal product's naming (see
// app/data/purchase-transactions.ts's TRANSACTION_TYPE_LABEL for the AP
// mirror of this same convention).
export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  invoice: "Sales Invoice",
  order: "Sales Order",
  delivery: "Sales Delivery",
  return: "Sales Return",
  quotation: "Sales Quotation",
  // Not "Sales Join Invoice" — the real product just calls it "Join Invoice",
  // and numbers it on its own scheme (see numberForTransaction).
  join_invoice: "Join Invoice",
  proforma_invoice: "Pro Forma Invoice",
  proforma_order: "Pro Forma Order"
};

// Real Jurnal ids are large sequential database ids, not small per-type
// counters — this offset just makes ours look like one ("Sales Invoice
// #24026" instead of "#1"). Kept distinct from Purchase's own offset so the
// two modules' generated numbers never collide if ever shown side by side.
const NUMBER_ID_OFFSET = 24_025;
// Join invoices get their own numbering scheme entirely — "Join Invoice -
// 20002", not "Join Invoice #24039" — matching the real product.
const JOIN_INVOICE_NUMBER_OFFSET = 20_000;

function numberForTransaction(type: TransactionType, id: number): string {
  if (type === "join_invoice") return `Join Invoice - ${JOIN_INVOICE_NUMBER_OFFSET + id}`;
  return `${TRANSACTION_TYPE_LABEL[type]} #${NUMBER_ID_OFFSET + id}`;
}

export interface SalesTransactionLine {
  id: number;
  /** Return-only: the delivery this line came back on, when the return was
   *  raised against deliveries rather than the invoice as a whole. Lets the
   *  detail page group a saved return the same way its form did. */
  deliveryId?: number | null;
  product: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  // Per-line tax selection — a label from TAX_OPTIONS, or "" for untaxed.
  // Lines sharing a label are summed into one row of SalesTransaction.taxes.
  tax: string;
  amount: number;
}

export type DiscountType = "percent" | "value";

export interface SalesTransactionTax {
  label: string;
  amount: number;
}

export interface SalesTransactionPayment {
  id: number;
  date: string;
  number: string;
  method: string;
  amount: number;
}

export interface SalesCreditMemo {
  id: number;
  date: string;
  number: string;
  amount: number;
}

export interface SalesTransaction {
  id: number;
  type: TransactionType;
  number: string;
  status: SalesStatus;
  // Cross-cutting queue flag independent of `type` — drives the "Require
  // approval" tab. A rejected record's status already says "rejected", so
  // needsApproval is only meaningful while status isn't rejected.
  needsApproval: boolean;
  /** Approval steps this record must clear, and how many are signed off —
   *  rendered as the "0/1" indicator on the approval queue's rows. 0 total
   *  means the record never entered an approval flow. */
  approvalStepsTotal: number;
  approvalsDone: number;
  /** Comments left on the record — the second indicator on those same rows. */
  commentCount: number;
  customerName: string;
  customerAddress: string;
  email: string[];
  transactionDate: string;
  transactionDateSort: string;
  dueDate: string;
  dueDateSort: string;
  term: string;
  referenceNo: string;
  warehouse: string;
  tags: string[];
  // Shipping block — on a Delivery or Return these are the record's own
  // shipping details (both are intrinsically about goods movement); on an
  // Invoice/Order they're only populated when the form's "Shipping info"
  // checkbox was ticked (shippingInfo), which is what makes the shipping
  // column appear on the create/edit screen.
  shippingInfo: boolean;
  shippingAddress: string;
  shippingDate: string;
  shippingDateSort: string;
  shipVia: string;
  trackingNo: string;
  shippingFee: number;
  message: string;
  memo: string;
  lines: SalesTransactionLine[];
  // Transaction currency — "IDR" unless changed on the form. Display-only in
  // this prototype: no FX conversion is applied to the figures below.
  currency: string;
  // When true the line unit prices are gross (tax already inside), so `taxes`
  // is reported but not added on top when reaching `total`.
  priceIncludesTax: boolean;
  subtotal: number;
  // Sum of the per-line discounts (each line's discountPercent), as distinct
  // from `discountAmount`, which is the single transaction-level discount.
  discountPerLines: number;
  // Transaction-level discount: entered as either a percentage or a flat
  // rupiah value (discountType/discountValue), resolved to discountAmount.
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  // One row per distinct tax label used across the lines.
  taxes: SalesTransactionTax[];
  taxRate: number;
  taxAmount: number;
  total: number;
  // Withholding tax the customer deducts from what they pay (invoice only; 0
  // elsewhere) — the reference app calls this out separately from the
  // discount because it's the customer's tax obligation, not a price cut.
  withholdingPercent: number;
  withholdingAmount: number;
  amountReceived: number;
  // Credit memos applied against this invoice's balance — see applyCreditMemo.
  creditMemos: SalesCreditMemo[];
  balanceDue: number;
  // Deposit (down payment) received up front — settable on the invoice form's
  // "Deposit" checkbox (invoice only; 0 elsewhere).
  depositAmount: number;
  // File names only — this prototype never uploads or stores the bytes.
  attachments: string[];
  payments: SalesTransactionPayment[];
  // Order-only (null for every other type): the id of a real `type:
  // "delivery"` record in this same dataset that fulfills this order — set
  // by linkOrdersToDeliveries() after the dataset is built (delivery records
  // must exist first). Drives the "Fulfillment" tag and the Delivery
  // related-records table on the Order detail page.
  linkedDeliveryId: number | null;
  // Return-only (null for every other type): the Invoice this return is
  // raised against. A return is never standalone — it always credits back
  // part of a specific invoice, which is why the create form is reached from
  // that invoice's Actions menu rather than from the list (the reference app
  // has no Return tab). Its lines are a subset of that invoice's, with the
  // quantities actually being sent back.
  linkedInvoiceId: number | null;
  // Join-invoice-only (empty for every other type): ids of real `type:
  // "invoice"` records this join invoice bundles for combined billing — set
  // by linkJoinInvoicesToInvoices() after the dataset is built. A join
  // invoice's own total/subtotal/balanceDue are the *sum* of those linked
  // invoices' figures, not independently generated: there is nothing to bill
  // beyond what the linked invoices already owe.
  joinedInvoiceIds: number[];
  // The deliveries this document is tied to. On an INVOICE these are the
  // deliveries it bills for; on a RETURN they are the deliveries whose goods
  // are physically coming back — the source app lets you raise a return
  // against specific deliveries rather than the invoice as a whole, and then
  // groups the returned lines under them. Empty means "the invoice as a
  // whole", which is the simpler and more common case.
  deliveryIds: number[];
  // Pro-forma-order-only (null elsewhere): the Sales Order this pro forma
  // bills against. Progress billing invoices a *share* of an order over time,
  // so the order is the thing being drawn down.
  linkedOrderId: number | null;
  // Pro-forma-order-only: how the billed share is expressed, and how much of
  // the order this document claims. `percentage` bills a % of the order value,
  // `quantity` bills whole line quantities, `amount` bills a flat figure —
  // the three billing methods the source app's method selector offers.
  billingMethod: BillingMethod | null;
  billingPercent: number;
}

export type BillingMethod = "percentage" | "quantity" | "amount";

export const BILLING_METHOD_LABEL: Record<BillingMethod, string> = {
  percentage: "Percentage",
  quantity: "Quantity",
  amount: "Amount"
};

// Field options shared by generation below and the New/Edit form
// (app/components/sales/*Form.vue) — one customer/product/term/tag
// vocabulary instead of two drifting apart.
export const CUSTOMER_OPTIONS = [
  { name: "PT Maju Bersama", address: "Jl. Sudirman No. 45, Jakarta Selatan" },
  { name: "CV Sumber Rejeki", address: "Jl. Gatot Subroto No. 12, Jakarta Pusat" },
  { name: "Toko Elektronik Jaya", address: "Jl. Asia Afrika No. 8, Bandung" },
  { name: "PT Cipta Karya", address: "Jl. Diponegoro No. 21, Surabaya" },
  { name: "UD Berkah Abadi", address: "Jl. Malioboro No. 3, Yogyakarta" },
  { name: "PT Nusantara Logistik", address: "Jl. Ahmad Yani No. 67, Semarang" },
  { name: "CV Mitra Sejahtera", address: "Jl. Pahlawan No. 19, Surabaya" },
  { name: "PT Sinar Terang", address: "Jl. Thamrin No. 88, Jakarta Pusat" }
];

/**
 * The **sell-side** price list: `price` is what this company charges, and it
 * seeds a line's unit price on every Sales form.
 *
 * Its counterpart in `purchase-transactions.ts` is the **buy-side** list — the
 * same eight products at what they cost. The two are deliberately *not* equal:
 * these prices carry a per-product markup of roughly 20–45% over the purchase
 * price, so the company makes a different margin on each product.
 *
 * That gap is the whole subject of the Product profitability report
 * (`app/pages/reports/product_profitability.vue`), which reads both lists.
 * The two were briefly identical, and the report was a page of zeroes — if you
 * edit either list, keep sell above buy, and keep the margins uneven so the
 * report has something to rank.
 */
export const PRODUCT_OPTIONS = [
  { name: "Printer Paper A4 (Ream)", price: 72_000, unit: "pack" },
  { name: "Wireless Mouse", price: 165_000, unit: "pcs" },
  { name: "Office Chair", price: 1_850_000, unit: "pcs" },
  { name: "Laptop Stand", price: 285_000, unit: "pcs" },
  { name: "Whiteboard Marker Set", price: 82_000, unit: "set" },
  { name: "Steel Filing Cabinet", price: 2_560_000, unit: "pcs" },
  { name: "LED Desk Lamp", price: 249_000, unit: "pcs" },
  { name: "Ethernet Cable 10m", price: 118_000, unit: "roll" }
];

export const TERM_OPTIONS = ["Net 15", "Net 30", "Due on receipt"];
export const CURRENCY_OPTIONS = ["IDR", "USD", "SGD"];
// Per-line tax choices offered on the create/edit form. `rate` is a percentage.
export const TAX_OPTIONS: { label: string; rate: number }[] = [
  { label: "PPN 11%", rate: 11 },
  { label: "PPN 12%", rate: 12 },
  { label: "Non-taxable", rate: 0 }
];
export const TAG_OPTIONS = ["Q3 Restock", "Priority", "Recurring", "Import", "Consignment"];
export const WAREHOUSE_OPTIONS = ["Main Warehouse", "Secondary Warehouse"];
export const SHIP_VIA_OPTIONS = ["JNE Trucking", "Internal Fleet", "Gojek Instant"];
const MEMOS = ["Wholesale order", "Retail restock", "Monthly subscription", "Bulk supply", ""];

function pad(n: number) {
  return String(n).padStart(4, "0");
}

function dateAt(daysFromToday: number) {
  const d = new Date(2026, 8, 2); // "today" per session context: 2 Sep 2026
  d.setDate(d.getDate() + daysFromToday);
  return d;
}

export function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Display formatters — THE single source of truth for how a Sales value is
// written on screen. Import these; never hand-roll a second formatter in a
// page. See app/data/purchase-transactions.ts and docs/patterns/page-recipes.md
// § "one format per value type".
// ---------------------------------------------------------------------------

const MONEY_FORMAT = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

/** Money, for reading: `Rp10.016.640,00`. Indonesian convention — `.` groups
 *  thousands, `,` separates the two decimals, and no space after `Rp`. */
export function formatCurrency(value: number): string {
  return `Rp${MONEY_FORMAT.format(value)}`;
}

/** The same number WITHOUT the currency symbol — for a field that already
 *  carries an `Rp` input addon, and for a table column whose header already
 *  says it holds money ("Total", "Balance due"). Shares MONEY_FORMAT with
 *  formatCurrency, so the two can never disagree on separators or decimals. */
export function formatAmount(value: number): string {
  return MONEY_FORMAT.format(value);
}

/** Inverse of formatAmount, for an editable money field. `.` is a thousands
 *  separator and `,` the decimal point, so the two can't just be stripped —
 *  `210.000,50` must come back as 210000.5, not 21000050. A bare digit string
 *  (what the user types once the field strips its formatting on focus) parses
 *  as a whole number, which is the common case. */
export function parseAmount(text: string): number {
  const cleaned = String(text ?? "").replace(/[^\d.,]/g, "");
  if (!cleaned) return 0;
  const normalised = cleaned.replace(/\./g, "").replace(",", ".");
  return Number(normalised) || 0;
}

/** Dates, for reading: `21 Aug 2026`. Month-as-word deliberately — `21/08/2026`
 *  is ambiguous to anyone who reads `MM/DD`. This is the *display* format; the
 *  format a user *types* into MpDatePicker is a separate concern and stays
 *  `DD/MM/YYYY` (see `DATE_INPUT_FORMAT` in `~/utils/dates`). */
export function formatDisplayDate(iso: string): string {
  if (!iso) return "—";
  return formatDate(parseLocalIsoDate(iso.slice(0, 10)));
}

export function todayIsoDate(): string {
  return toLocalIsoDate(dateAt(0));
}

export function todayDisplayDate(): string {
  return formatDate(dateAt(0));
}

const TAX_RATE = 0.11;

/** The payment method Mekari Pay settlements carry. Exported because the list
 *  page's Mekari Pay summary card counts exactly these — matching on a shared
 *  constant rather than a string literal typed in two places. */
export const MEKARI_PAY_METHOD = "Mekari Pay";
const PAYMENT_METHODS = ["Bank transfer", MEKARI_PAY_METHOD, "Cash"];

function lineAmount(quantity: number, unitPrice: number, discountPercent: number): number {
  return Math.round(quantity * unitPrice * (1 - discountPercent / 100));
}

function buildLines(seq: number): SalesTransactionLine[] {
  const lineCount = 2 + (seq % 3); // 2–4 lines
  return Array.from({ length: lineCount }, (_, l) => {
    const product = PRODUCT_OPTIONS[(seq * 3 + l) % PRODUCT_OPTIONS.length]!;
    const quantity = 1 + ((seq + l) % 5);
    const discountPercent = (seq + l) % 6 === 0 ? 10 : 0; // occasional line discount, mostly 0%
    return {
      id: l + 1,
      product: product.name,
      description: `${product.name} — standard spec`,
      unit: product.unit,
      quantity,
      unitPrice: product.price,
      discountPercent,
      // Generated records are all on the standard rate; the form can set any
      // of TAX_OPTIONS per line.
      tax: "PPN 11%",
      amount: lineAmount(quantity, product.price, discountPercent)
    };
  });
}

// Status pool per transaction type — only the statuses that make sense for
// that kind of document (a Delivery is never "Paid"; an Order is never
// "Unpaid"). Matches app/data/purchase-status.ts's shared vocabulary.
const STATUS_POOL: Record<TransactionType, SalesStatus[]> = {
  invoice: ["open", "overdue", "paid", "partial", "unpaid"],
  delivery: ["open", "closed"],
  order: ["open", "partially_sent", "closed"],
  // A return is open until the credit is settled against the invoice.
  return: ["open", "closed"],
  // A quotation is open until the customer accepts it or it expires.
  quotation: ["open", "closed"],
  join_invoice: ["open", "paid"],
  proforma_invoice: ["open", "closed", "paid"],
  proforma_order: ["open", "partial", "closed"]
};

function buildTransaction(type: TransactionType, i: number, seq: number): SalesTransaction {
  const customer = CUSTOMER_OPTIONS[seq % CUSTOMER_OPTIONS.length]!;
  const txDate = dateAt(-i * 3);
  const due = dateAt(-i * 3 + 14);

  const pool = STATUS_POOL[type];
  // ~2 rejected per type, and ~2-3 awaiting approval — the two cross-cutting
  // queues need real records to hold, and a rejected one is never also
  // "pending" (it has already been decided).
  const rejected = i % 7 === 6;
  const needsApproval = !rejected && i % 5 === 2;
  // A record waiting on approval is a DRAFT — that is what the real product
  // shows in its Status column, and it is why the queue exists: nothing is
  // live until someone signs it off. Approving promotes it to Open.
  const status: SalesStatus = rejected
    ? "rejected"
    : needsApproval
      ? "draft"
      : pool[i % pool.length]!;

  const lines = buildLines(seq);
  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const taxAmount = Math.round(subtotal * TAX_RATE);
  const total = subtotal + taxAmount;

  let amountReceived = 0;
  const payments: SalesTransactionPayment[] = [];
  if (status === "paid") {
    amountReceived = total;
    payments.push({
      id: 1,
      date: formatDate(dateAt(-i * 3 + 5)),
      number: `RCV/2026/09/${pad(seq)}`,
      method: PAYMENT_METHODS[i % PAYMENT_METHODS.length]!,
      amount: total
    });
  } else if (status === "partial") {
    amountReceived = Math.round(total * 0.4);
    payments.push({
      id: 1,
      date: formatDate(dateAt(-i * 3 + 5)),
      number: `RCV/2026/09/${pad(seq)}`,
      method: PAYMENT_METHODS[i % PAYMENT_METHODS.length]!,
      amount: amountReceived
    });
  }
  const balanceDue = total - amountReceived;

  return {
    id: seq,
    type,
    number: numberForTransaction(type, seq),
    status,
    needsApproval,
    // One approver on most documents, two on the larger ones; none signed off
    // yet, which is what puts them in the queue.
    approvalStepsTotal: needsApproval ? 1 + (i % 2) : 0,
    approvalsDone: 0,
    // Most rows carry no discussion at all — matching the reference, where a
    // comment is the exception rather than the rule.
    commentCount: i % 4 === 3 ? 1 + (i % 2) : 0,
    customerName: customer.name,
    customerAddress: customer.address,
    email: [`finance@${customer.name.toLowerCase().replace(/[^a-z]+/g, "")}.co.id`],
    transactionDate: formatDate(txDate),
    transactionDateSort: toLocalIsoDate(txDate),
    dueDate: formatDate(due),
    dueDateSort: toLocalIsoDate(due),
    term: TERM_OPTIONS[i % TERM_OPTIONS.length]!,
    referenceNo: i % 3 === 0 ? `REF-${1000 + i}` : "",
    warehouse: i % 4 === 0 ? "Main Warehouse" : "",
    tags: i % 4 === 0 ? [] : [TAG_OPTIONS[i % TAG_OPTIONS.length]!],
    // Generated records carry shipping details on Delivery and Return — the
    // two types that are intrinsically about goods movement. No other type
    // opts into the shipping block unless the form turns it on.
    shippingInfo: type === "delivery" || type === "return",
    shippingAddress: type === "delivery" || type === "return" ? customer.address : "",
    shippingDate: type === "delivery" || type === "return" ? formatDate(txDate) : "",
    shippingDateSort: type === "delivery" || type === "return" ? toLocalIsoDate(txDate) : "",
    shipVia: type === "delivery" ? SHIP_VIA_OPTIONS[i % SHIP_VIA_OPTIONS.length]! : "",
    trackingNo: type === "delivery" && i % 3 === 0 ? `TRK-${200000 + seq}` : "",
    shippingFee: 0,
    message: i % 5 === 0 ? "Please deliver during business hours (09:00–17:00)." : "",
    memo: MEMOS[i % MEMOS.length]!,
    lines,
    currency: "IDR",
    priceIncludesTax: false,
    subtotal,
    // Generated records have no transaction-level discount or withholding —
    // those only arrive from the create/edit form.
    discountPerLines: 0,
    discountType: "percent" as DiscountType,
    discountValue: 0,
    discountAmount: 0,
    taxes: taxAmount > 0 ? [{ label: "PPN 11%", amount: taxAmount }] : [],
    taxRate: TAX_RATE,
    taxAmount,
    total,
    withholdingPercent: 0,
    withholdingAmount: 0,
    attachments: [],
    amountReceived,
    creditMemos: [],
    balanceDue,
    // Not every invoice carries a deposit — only about a third, so the detail
    // page's "Deposit received" row is genuinely conditional.
    depositAmount: type === "invoice" && i % 3 === 0 ? Math.round(total * 0.2) : 0,
    payments,
    linkedDeliveryId: null,
    linkedInvoiceId: null,
    joinedInvoiceIds: [],
    deliveryIds: [],
    linkedOrderId: null,
    billingMethod: type === "proforma_order" ? BILLING_METHODS[i % BILLING_METHODS.length]! : null,
    // A pro forma order bills a share of its order — a quarter, a third, half.
    billingPercent: type === "proforma_order" ? [25, 30, 50][i % 3]! : 0
  };
}

const BILLING_METHODS: BillingMethod[] = ["percentage", "quantity", "amount"];

const TYPES: TransactionType[] = [
  "invoice",
  "delivery",
  "order",
  "return",
  "quotation",
  "join_invoice",
  "proforma_invoice",
  "proforma_order"
];
const COUNT_PER_TYPE = 13;

// Links roughly a third of the Order records to a real Delivery record in
// this same dataset (delivery records must already exist, hence this runs
// as a pass over the finished array rather than inline in buildTransaction).
// Drives the Order detail page's "Fulfillment" tag + Delivery related-
// records table.
function linkOrdersToDeliveries(all: SalesTransaction[]): void {
  const deliveries = all.filter((t) => t.type === "delivery");
  if (!deliveries.length) return;
  const orders = all.filter((t) => t.type === "order");
  orders.forEach((order, i) => {
    if (i % 3 === 1) order.linkedDeliveryId = deliveries[i % deliveries.length]!.id;
  });
}

// Points each generated Return at a real Invoice and rewrites its lines to be
// a genuine subset of that invoice's, so a return never credits more than was
// invoiced. Runs as a pass over the finished array because the invoices have
// to exist first — same reason as linkOrdersToDeliveries.
function linkReturnsToInvoices(all: SalesTransaction[]): void {
  const invoices = all.filter((t) => t.type === "invoice");
  if (!invoices.length) return;
  all
    .filter((t) => t.type === "return")
    .forEach((ret, i) => {
      const invoice = invoices[i % invoices.length]!;
      ret.linkedInvoiceId = invoice.id;
      ret.customerName = invoice.customerName;
      ret.customerAddress = invoice.customerAddress;
      ret.email = [...invoice.email];
      ret.warehouse = invoice.warehouse;
      // Return the first line or two, at a quantity no greater than invoiced.
      const returned = invoice.lines.slice(0, 1 + (i % 2)).map((l, idx) => {
        const quantity = Math.max(1, Math.ceil(l.quantity / 2));
        return {
          ...l,
          id: idx + 1,
          quantity,
          amount: lineAmount(quantity, l.unitPrice, l.discountPercent)
        };
      });
      ret.lines = returned;
      ret.subtotal = returned.reduce((sum, l) => sum + l.amount, 0);
      ret.taxAmount = Math.round(ret.subtotal * TAX_RATE);
      ret.taxes = ret.taxAmount > 0 ? [{ label: "PPN 11%", amount: ret.taxAmount }] : [];
      ret.total = ret.subtotal + ret.taxAmount;
      ret.balanceDue = ret.total;
      ret.amountReceived = 0;
      ret.payments = [];
      ret.shippingInfo = true;
      ret.shippingAddress = invoice.customerAddress;
      ret.shippingDate = ret.transactionDate;
      ret.shippingDateSort = ret.transactionDateSort;
      // When the invoice shipped against deliveries, half the returns are
      // raised against those deliveries rather than the invoice as a whole —
      // the source app supports both, so the dataset has to show both. Each
      // line then remembers which delivery it came back on, which is what the
      // form and the detail page group by.
      if (invoice.deliveryIds.length && i % 2 === 0) {
        const deliveryId = invoice.deliveryIds[0]!;
        // Resolved from `all`, NEVER through getSalesTransactionById: the
        // linking passes run inside buildDataset(), before `cache` is
        // assigned, so any public lookup here would re-enter buildDataset()
        // and recurse until the stack blows.
        const delivery = all.find((t) => t.id === deliveryId);
        const shipped = new Map<string, number>();
        for (const line of delivery?.lines ?? []) {
          shipped.set(line.product, (shipped.get(line.product) ?? 0) + line.quantity);
        }
        const fromDelivery = ret.lines.filter((l) => (shipped.get(l.product) ?? 0) > 0);
        if (fromDelivery.length) {
          ret.deliveryIds = [deliveryId];
          ret.lines = fromDelivery.map((l) => ({
            ...l,
            deliveryId,
            // Never more than that delivery actually carried.
            quantity: Math.min(l.quantity, shipped.get(l.product) ?? 0)
          }));
          ret.subtotal = ret.lines.reduce(
            (sum, l) => sum + lineAmount(l.quantity, l.unitPrice, l.discountPercent),
            0
          );
          ret.lines = ret.lines.map((l) => ({
            ...l,
            amount: lineAmount(l.quantity, l.unitPrice, l.discountPercent)
          }));
          ret.taxAmount = Math.round(ret.subtotal * TAX_RATE);
          ret.taxes = ret.taxAmount > 0 ? [{ label: "PPN 11%", amount: ret.taxAmount }] : [];
          ret.total = ret.subtotal + ret.taxAmount;
          ret.balanceDue = ret.total;
        }
      }
    });
}

// Bundles every Join Invoice with 2-3 real Invoice records from this same
// dataset, then recomputes its subtotal/total/balanceDue as the *sum* of those
// invoices' figures — a join invoice bills exactly what its linked invoices
// owe, nothing more. Runs as a pass over the finished array because the
// invoices have to exist first, same as linkOrdersToDeliveries.
function linkJoinInvoicesToInvoices(all: SalesTransaction[]): void {
  const invoices = all.filter((t) => t.type === "invoice");
  if (!invoices.length) return;
  all
    .filter((t) => t.type === "join_invoice")
    .forEach((joinInvoice, i) => {
      const count = 2 + (i % 2); // 2-3 linked invoices
      const linked = Array.from(
        { length: count },
        (_, k) => invoices[(i * 2 + k) % invoices.length]!
      );
      // Every joined invoice must be billed to the same customer — that is the
      // whole point of joining them into one payable document.
      const customer = linked[0]!;
      joinInvoice.customerName = customer.customerName;
      joinInvoice.customerAddress = customer.customerAddress;
      joinInvoice.email = [...customer.email];
      joinInvoice.joinedInvoiceIds = linked.map((inv) => inv.id);
      joinInvoice.lines = [];
      joinInvoice.subtotal = linked.reduce((sum, inv) => sum + inv.total, 0);
      joinInvoice.total = joinInvoice.subtotal;
      joinInvoice.taxAmount = 0;
      joinInvoice.taxes = [];
      joinInvoice.balanceDue = linked.reduce((sum, inv) => sum + inv.balanceDue, 0);
      joinInvoice.amountReceived = 0;
      joinInvoice.payments = [];
    });
}

// Points each Pro Forma Order at a real Sales Order and scales its figures down
// to the share it bills, so a progress-billing document never claims more than
// its own percentage of the order it draws on.
function linkProFormaOrdersToOrders(all: SalesTransaction[]): void {
  const orders = all.filter((t) => t.type === "order");
  if (!orders.length) return;
  all
    .filter((t) => t.type === "proforma_order")
    .forEach((proforma, i) => {
      const order = orders[i % orders.length]!;
      proforma.linkedOrderId = order.id;
      proforma.customerName = order.customerName;
      proforma.customerAddress = order.customerAddress;
      proforma.email = [...order.email];
      proforma.warehouse = order.warehouse;
      proforma.lines = order.lines.map((l) => ({ ...l }));
      const share = proforma.billingPercent / 100;
      proforma.subtotal = Math.round(order.subtotal * share);
      proforma.taxAmount = Math.round(proforma.subtotal * TAX_RATE);
      proforma.taxes =
        proforma.taxAmount > 0 ? [{ label: "PPN 11%", amount: proforma.taxAmount }] : [];
      proforma.total = proforma.subtotal + proforma.taxAmount;
      proforma.balanceDue = proforma.total - proforma.amountReceived;
    });
}

// Ties roughly half the invoices to the deliveries that shipped their goods,
// matched on customer so the chain reads true (an invoice never bills for
// someone else's delivery). Runs as a pass over the finished array because the
// deliveries have to exist first — same reason as linkOrdersToDeliveries.
//
// This is what makes a delivery-sourced return possible: without it, a return
// has only the invoice to work from.
function linkInvoicesToDeliveries(all: SalesTransaction[]): void {
  const deliveries = all.filter((t) => t.type === "delivery");
  if (!deliveries.length) return;
  all
    .filter((t) => t.type === "invoice")
    .forEach((invoice, i) => {
      if (i % 2 === 1) return; // only about half of them ship against a delivery
      const sameCustomer = deliveries.filter((d) => d.customerName === invoice.customerName);
      const pool = sameCustomer.length ? sameCustomer : deliveries;
      // One or two deliveries per invoice — a part shipment is as real as a
      // single one, and the return form has to cope with both.
      const count = 1 + (i % 2 === 0 && pool.length > 1 ? i % 2 : 0);
      invoice.deliveryIds = pool.slice(0, count).map((d) => d.id);
    });
}

function buildDataset(): SalesTransaction[] {
  const all: SalesTransaction[] = [];
  let seq = 1;
  for (const type of TYPES) {
    for (let i = 0; i < COUNT_PER_TYPE; i++) {
      all.push(buildTransaction(type, i, seq));
      seq++;
    }
  }
  linkOrdersToDeliveries(all);
  // Before linkReturnsToInvoices: a return can only cite a delivery its own
  // invoice actually shipped on, so that link has to exist first.
  linkInvoicesToDeliveries(all);
  linkReturnsToInvoices(all);
  linkJoinInvoicesToInvoices(all);
  linkProFormaOrdersToOrders(all);
  return all;
}

let cache: SalesTransaction[] | null = null;

export function getSalesTransactions(): SalesTransaction[] {
  if (!cache) cache = buildDataset();
  return cache;
}

export function getSalesTransactionsByType(type: TransactionType): SalesTransaction[] {
  return getSalesTransactions().filter((t) => t.type === type);
}

export function getSalesTransactionById(id: number): SalesTransaction | undefined {
  return getSalesTransactions().find((t) => t.id === id);
}

// Neighbour ids for a detail page's prev/next chevrons — scoped to records of
// the same type (browsing invoices only skips past orders, etc.), in list
// order.
export function getAdjacentTransactionIds(id: number): {
  prevId: number | null;
  nextId: number | null;
} {
  const record = getSalesTransactionById(id);
  if (!record) return { prevId: null, nextId: null };
  const sameType = getSalesTransactions().filter((t) => t.type === record.type);
  const index = sameType.findIndex((t) => t.id === id);
  if (index === -1) return { prevId: null, nextId: null };
  return {
    prevId: sameType[index - 1]?.id ?? null,
    nextId: sameType[index + 1]?.id ?? null
  };
}

// Removes one or more transactions from the shared in-memory list (used by
// the list page's row/bulk delete and the detail pages' delete) — a real
// screen would DELETE against the API instead. Returns the number actually
// removed.
export function deleteTransactions(ids: number[]): number {
  const transactions = getSalesTransactions();
  const idSet = new Set(ids);
  const before = transactions.length;
  const remaining = transactions.filter((t) => !idSet.has(t.id));
  transactions.splice(0, transactions.length, ...remaining);
  return before - transactions.length;
}

// Clones any transaction into a new draft: new id, next number in its type's
// own sequence, today's transaction date, a fresh 14-day due date, and status/
// balance reset to a fresh, unpaid "open" draft — a duplicate of a Paid,
// Closed, or Overdue record must not stay Paid/Closed/Overdue, or duplicating
// one would be pointless. Mirrors the legacy app's "Duplicate transaction"
// action, which opens a prefilled new_and_edit form.
export function duplicateTransaction(id: number): SalesTransaction | undefined {
  const source = getSalesTransactionById(id);
  if (!source) return undefined;

  const transactions = getSalesTransactions();
  const nextId = transactions.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  const txDate = dateAt(0);
  const due = dateAt(14);

  const duplicate: SalesTransaction = {
    ...source,
    id: nextId,
    number: numberForTransaction(source.type, nextId),
    status: "open",
    needsApproval: false,
    approvalStepsTotal: 0,
    approvalsDone: 0,
    commentCount: 0,
    transactionDate: formatDate(txDate),
    transactionDateSort: toLocalIsoDate(txDate),
    dueDate: formatDate(due),
    dueDateSort: toLocalIsoDate(due),
    amountReceived: 0,
    creditMemos: [],
    balanceDue: source.total,
    depositAmount: 0,
    payments: [],
    lines: source.lines.map((l, i) => ({ ...l, id: i + 1 })),
    tags: [...source.tags],
    // A duplicate is a fresh, unfulfilled draft — it doesn't inherit the
    // source order's delivery link or the source return's invoice link.
    linkedDeliveryId: null,
    linkedInvoiceId: null,
    deliveryIds: []
  };

  transactions.unshift(duplicate);
  return duplicate;
}

// Closes an open Sales Order — the legacy app's "Close order" confirmation
// (see docs/patterns/Modal.md for the destructive-confirm pattern this backs).
// A closed order stays closed; there's no re-open action in the reference app.
export function closeOrder(id: number): SalesTransaction | undefined {
  const record = getSalesTransactionById(id);
  if (!record || record.type !== "order") return undefined;
  record.status = "closed";
  return record;
}

// Applies a credit memo against an invoice's balance — the legacy app's
// "Apply credit memo" action. Never over-applies past what's still owed.
export function applyCreditMemo(
  invoiceId: number,
  amount: number,
  number = `CM/2026/09/${pad(invoiceId)}`
): SalesTransaction | undefined {
  const record = getSalesTransactionById(invoiceId);
  if (!record || record.type !== "invoice") return undefined;
  const applied = Math.min(Math.max(0, amount), record.balanceDue);
  if (applied <= 0) return record;
  record.creditMemos.push({
    id: record.creditMemos.length + 1,
    date: todayDisplayDate(),
    number,
    amount: applied
  });
  record.balanceDue -= applied;
  if (record.balanceDue <= 0) record.status = "paid";
  else if (record.amountReceived > 0) record.status = "partial";
  return record;
}

// ---------------------------------------------------------------------------
// New/Edit forms (app/components/sales/*Form.vue).
// ---------------------------------------------------------------------------

export interface SalesTransactionLineInput {
  /** Return-only — see SalesTransactionLine.deliveryId. */
  deliveryId?: number | null;
  product: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  tax: string;
}

// One input shape for every transaction type. Fields a given type doesn't use
// are simply left at their empty default — createTransaction() writes only
// what that type is allowed to carry (see the per-type notes on
// SalesTransaction and TYPE_CAPABILITIES below).
export interface SalesTransactionInput {
  customerName: string;
  customerAddress: string;
  email: string[];
  transactionDateIso: string;
  dueDateIso: string;
  term: string;
  transactionNo: string;
  referenceNo: string;
  warehouse: string;
  tags: string[];
  currency: string;
  priceIncludesTax: boolean;
  shippingInfo: boolean;
  shippingAddress: string;
  shippingDateIso: string;
  shipVia: string;
  trackingNo: string;
  shippingFee: number;
  discountType: DiscountType;
  discountValue: number;
  withholdingPercent: number;
  depositAmount: number;
  attachments: string[];
  message: string;
  memo: string;
  lines: SalesTransactionLineInput[];
  // Return-only: the invoice this return credits against.
  linkedInvoiceId: number | null;
  // Join-invoice-only: the invoice records this one bundles.
  joinedInvoiceIds: number[];
  /** Return-only: the deliveries the returned goods came back on. */
  deliveryIds: number[];
  // Pro-forma-order-only: the order this bills against, and the share it takes.
  linkedOrderId: number | null;
  billingMethod: BillingMethod | null;
  billingPercent: number;
}

export interface SalesTransactionTotals {
  /** Gross line value, before any discount. */
  subtotal: number;
  discountPerLines: number;
  /** The transaction-level discount, resolved from discountType/discountValue. */
  discount: number;
  taxes: SalesTransactionTax[];
  taxAmount: number;
  shippingFee: number;
  total: number;
  withholding: number;
  deposit: number;
  balanceDue: number;
}

// The single totals engine for the invoice/order forms: their live preview,
// the totals stack they render, and the create/update writers below all call
// this, so the figures on screen and the figures persisted can never
// disagree. Mirrors computeInvoiceTotals in purchase-transactions.ts.
//
// Order of operations mirrors the source app's totals stack:
//   gross → per-line discounts → transaction discount → tax → shipping
//   → Total → withholding deducted, deposit netted → Balance due
export function computeTransactionTotals(
  lines: SalesTransactionLineInput[],
  options: {
    discountType?: DiscountType;
    discountValue?: number;
    priceIncludesTax?: boolean;
    shippingFee?: number;
    withholdingPercent?: number;
    depositAmount?: number;
  } = {}
): SalesTransactionTotals {
  const {
    discountType = "percent",
    discountValue = 0,
    priceIncludesTax = false,
    shippingFee = 0,
    withholdingPercent = 0,
    depositAmount = 0
  } = options;

  const gross = lines.reduce((sum, l) => sum + lineGrossAmount(l), 0);
  const net = lines.reduce((sum, l) => sum + lineNetAmount(l), 0);
  const discountPerLines = gross - net;

  const discount =
    discountType === "percent" ? Math.round(net * (num(discountValue) / 100)) : num(discountValue);
  const afterDiscount = Math.max(0, net - discount);

  // One row per distinct tax label, each line contributing its share of the
  // post-discount base.
  const byLabel = new Map<string, number>();
  for (const line of lines) {
    const option = TAX_OPTIONS.find((t) => t.label === line.tax);
    if (!option || option.rate === 0) continue;
    const share = net === 0 ? 0 : lineNetAmount(line) / net;
    byLabel.set(
      option.label,
      (byLabel.get(option.label) ?? 0) + Math.round(afterDiscount * share * (option.rate / 100))
    );
  }
  const taxes = [...byLabel].map(([label, amount]) => ({ label, amount }));
  const taxAmount = taxes.reduce((sum, t) => sum + t.amount, 0);

  const total = afterDiscount + (priceIncludesTax ? 0 : taxAmount) + num(shippingFee);
  const withholding = Math.round(total * (num(withholdingPercent) / 100));
  const deposit = num(depositAmount);

  return {
    subtotal: gross,
    discountPerLines,
    discount,
    taxes,
    taxAmount,
    shippingFee: num(shippingFee),
    total,
    withholding,
    deposit,
    balanceDue: Math.max(0, total - withholding - deposit)
  };
}

/** @deprecated Use computeTransactionTotals — kept only as a familiar alias
 *  while any call site is written from memory of the Purchase module. */
export const computeInvoiceTotals = computeTransactionTotals;

function num(value: number): number {
  return Number(value) || 0;
}
function lineGrossAmount(line: Pick<SalesTransactionLineInput, "quantity" | "unitPrice">): number {
  return num(line.quantity) * num(line.unitPrice);
}
function lineNetAmount(
  line: Pick<SalesTransactionLineInput, "quantity" | "unitPrice" | "discountPercent">
): number {
  return Math.round(lineGrossAmount(line) * (1 - num(line.discountPercent) / 100));
}
/** A single line's payable amount — exported so the form's Amount cell and
 *  the persisted line.amount are computed the same way. */
export function computeLineAmount(
  line: Pick<SalesTransactionLineInput, "quantity" | "unitPrice" | "discountPercent">
): number {
  return lineNetAmount(line);
}

function toLines(lines: SalesTransactionLineInput[]): SalesTransactionLine[] {
  return lines.map((l, i) => ({
    id: i + 1,
    deliveryId: l.deliveryId ?? null,
    product: l.product,
    description: l.description,
    // Fall back to the product's canonical unit when the form left it blank.
    unit: l.unit || PRODUCT_OPTIONS.find((p) => p.name === l.product)?.unit || "pcs",
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    discountPercent: num(l.discountPercent),
    tax: l.tax,
    amount: lineNetAmount(l)
  }));
}

// ---------------------------------------------------------------------------
// What each transaction type is allowed to carry. The create/edit forms use
// this to decide which zones to render, and createTransaction/updateTransaction
// use it to decide which fields to persist — so a type can never end up with
// a value its own screens never showed (a Delivery with a withholding %, say).
// Mirrors TYPE_CAPABILITIES in purchase-transactions.ts.
// ---------------------------------------------------------------------------
export interface TransactionTypeCapabilities {
  /** Line items carry unit price / discount / tax / amount, and the record has a totals stack. */
  money: boolean;
  /** Has a due date + payment term. */
  term: boolean;
  /** Label for the due-date field — a Quotation calls it "Expiry date". */
  dueDateLabel: string;
  warehouse: boolean;
  /** Shipping fields: "always" = intrinsic to the type, "toggle" = behind the Shipping-info checkbox. */
  shipping: "always" | "toggle" | "never";
  deposit: boolean;
  withholding: boolean;
  /** Whether this type can be "closed" from its detail page (Order only). */
  closable: boolean;
  /** Whether credit memos can be applied against this type (Invoice only). */
  creditMemo: boolean;
  /** The "line items" are other invoice records this one bundles. */
  bundlesInvoices: boolean;
  /** Progress billing against a Sales Order (Pro Forma Order only). */
  progressBilling: boolean;
  /** Route segment under /sales. */
  route: string;
}

export const TYPE_CAPABILITIES: Record<TransactionType, TransactionTypeCapabilities> = {
  invoice: {
    money: true,
    term: true,
    dueDateLabel: "Due date",
    warehouse: true,
    shipping: "toggle",
    deposit: true,
    withholding: true,
    closable: false,
    creditMemo: true,
    bundlesInvoices: false,
    progressBilling: false,
    route: "invoice"
  },
  order: {
    money: true,
    term: true,
    dueDateLabel: "Due date",
    warehouse: true,
    shipping: "toggle",
    deposit: false,
    withholding: false,
    closable: true,
    creditMemo: false,
    bundlesInvoices: false,
    progressBilling: false,
    route: "order"
  },
  delivery: {
    money: false,
    term: false,
    dueDateLabel: "Due date",
    warehouse: true,
    shipping: "always",
    deposit: false,
    withholding: false,
    closable: false,
    creditMemo: false,
    bundlesInvoices: false,
    progressBilling: false,
    route: "delivery"
  },
  // A quotation expires rather than falling due, and commits no stock, so it
  // carries no warehouse.
  quotation: {
    money: true,
    term: true,
    dueDateLabel: "Expiry date",
    warehouse: false,
    shipping: "toggle",
    deposit: false,
    withholding: false,
    closable: false,
    creditMemo: false,
    bundlesInvoices: false,
    progressBilling: false,
    route: "quotation"
  },
  // A join invoice has no lines of its own — it bundles other invoices, and
  // its figures are their sum.
  join_invoice: {
    money: true,
    term: true,
    dueDateLabel: "Due date",
    warehouse: false,
    shipping: "never",
    deposit: false,
    withholding: false,
    closable: false,
    creditMemo: false,
    bundlesInvoices: true,
    progressBilling: false,
    route: "join-invoice"
  },
  // A pro forma invoice is a quotation-shaped bill: full pricing, but nothing
  // is owed until it converts, so no deposit or credit memo of its own.
  proforma_invoice: {
    money: true,
    term: true,
    dueDateLabel: "Due date",
    warehouse: true,
    shipping: "toggle",
    deposit: false,
    withholding: true,
    closable: false,
    creditMemo: false,
    bundlesInvoices: false,
    progressBilling: false,
    route: "proforma-invoice"
  },
  // A pro forma order bills a share of a Sales Order — its lines come from
  // that order, and the billing method decides how the share is expressed.
  proforma_order: {
    money: true,
    term: true,
    dueDateLabel: "Due date",
    warehouse: true,
    shipping: "never",
    deposit: false,
    withholding: false,
    closable: false,
    creditMemo: false,
    bundlesInvoices: false,
    progressBilling: true,
    route: "proforma-order"
  },
  // A return carries shipping unconditionally (the goods are going back), and
  // has no deposit or withholding of its own — it credits against an invoice.
  return: {
    money: true,
    term: true,
    dueDateLabel: "Due date",
    warehouse: true,
    shipping: "always",
    deposit: false,
    withholding: false,
    closable: false,
    creditMemo: false,
    bundlesInvoices: false,
    progressBilling: false,
    route: "return"
  }
};

export function emptyTransactionInput(): SalesTransactionInput {
  return {
    customerName: "",
    customerAddress: "",
    email: [],
    transactionDateIso: "",
    dueDateIso: "",
    term: "",
    transactionNo: "",
    referenceNo: "",
    warehouse: "",
    tags: [],
    currency: "IDR",
    priceIncludesTax: false,
    shippingInfo: false,
    shippingAddress: "",
    shippingDateIso: "",
    shipVia: "",
    trackingNo: "",
    shippingFee: 0,
    discountType: "percent",
    discountValue: 0,
    withholdingPercent: 0,
    depositAmount: 0,
    attachments: [],
    message: "",
    memo: "",
    lines: [],
    linkedInvoiceId: null,
    joinedInvoiceIds: [],
    deliveryIds: [],
    linkedOrderId: null,
    billingMethod: null,
    billingPercent: 0
  };
}

/** A record by id, but only if it is of the expected type — so an edit route
 *  for one type can't open a record of another. */
export function getTransactionOfType(
  id: number,
  type: TransactionType
): SalesTransaction | undefined {
  const t = getSalesTransactionById(id);
  return t && t.type === type ? t : undefined;
}

/** Every Return raised against a given invoice — the reverse of
 *  `linkedInvoiceId`, resolved by lookup rather than stored twice. */
export function getReturnsForInvoice(invoiceId: number): SalesTransaction[] {
  return getSalesTransactions().filter(
    (t) => t.type === "return" && t.linkedInvoiceId === invoiceId
  );
}

/** The deliveries an invoice bills for — the choices a return can be raised
 *  against. Empty when the invoice was never tied to one, in which case the
 *  return is simply made against the invoice as a whole. */
export function deliveriesForInvoice(invoiceId: number): SalesTransaction[] {
  const invoice = getSalesTransactionById(invoiceId);
  if (!invoice) return [];
  return invoice.deliveryIds
    .map((id) => getSalesTransactionById(id))
    .filter((t): t is SalesTransaction => t?.type === "delivery");
}

/** How much of each product a given set of deliveries actually shipped. A
 *  return raised against them can never send back more than they carried,
 *  whatever the invoice says. */
export function deliveredQuantities(deliveryIds: number[]): Map<string, number> {
  const shipped = new Map<string, number>();
  for (const id of deliveryIds) {
    const delivery = getSalesTransactionById(id);
    if (delivery?.type !== "delivery") continue;
    for (const line of delivery.lines) {
      shipped.set(line.product, (shipped.get(line.product) ?? 0) + line.quantity);
    }
  }
  return shipped;
}

/** How much of each invoice line is still returnable: the invoiced quantity
 *  less whatever earlier returns already sent back. Keyed by line product,
 *  which is what identifies a line across the two records here. */
export function returnableQuantities(
  invoiceId: number,
  excludeReturnId?: number
): Map<string, number> {
  const invoice = getSalesTransactionById(invoiceId);
  const remaining = new Map<string, number>();
  if (!invoice) return remaining;
  for (const line of invoice.lines) {
    remaining.set(line.product, (remaining.get(line.product) ?? 0) + line.quantity);
  }
  for (const ret of getReturnsForInvoice(invoiceId)) {
    if (excludeReturnId != null && ret.id === excludeReturnId) continue;
    for (const line of ret.lines) {
      remaining.set(line.product, (remaining.get(line.product) ?? 0) - line.quantity);
    }
  }
  return remaining;
}

// Creates a new draft transaction (status "open", no payments yet) and
// appends it to the shared in-memory list — a real screen would POST to the
// API instead.
export function createTransaction(
  type: TransactionType,
  input: SalesTransactionInput
): SalesTransaction {
  const cap = TYPE_CAPABILITIES[type];
  const transactions = getSalesTransactions();
  const nextId = transactions.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  const lines = toLines(input.lines);
  const totals = totalsFor(input, type);
  const txDate = input.transactionDateIso
    ? parseLocalIsoDate(input.transactionDateIso)
    : new Date();
  const due = input.dueDateIso ? parseLocalIsoDate(input.dueDateIso) : txDate;
  const shipDate = input.shippingDateIso ? parseLocalIsoDate(input.shippingDateIso) : txDate;

  const record: SalesTransaction = {
    id: nextId,
    type,
    // A transaction number typed on the form wins; blank means "[Auto]".
    number: input.transactionNo || numberForTransaction(type, nextId),
    status: "open",
    needsApproval: false,
    approvalStepsTotal: 0,
    approvalsDone: 0,
    commentCount: 0,
    customerName: input.customerName,
    customerAddress: input.customerAddress,
    email: input.email,
    transactionDate: formatDate(txDate),
    transactionDateSort: toLocalIsoDate(txDate),
    dueDate: formatDate(due),
    dueDateSort: toLocalIsoDate(due),
    term: input.term,
    referenceNo: input.referenceNo,
    warehouse: input.warehouse,
    tags: input.tags,
    // "always" types (Delivery, Return) carry shipping unconditionally;
    // "toggle" types only when the form's Shipping-info checkbox was on.
    ...shippingFields(cap, input, shipDate, totals.shippingFee),
    message: input.message,
    memo: input.memo,
    lines,
    currency: input.currency || "IDR",
    priceIncludesTax: input.priceIncludesTax,
    subtotal: totals.subtotal,
    discountPerLines: totals.discountPerLines,
    discountType: input.discountType,
    discountValue: input.discountValue,
    discountAmount: totals.discount,
    taxes: totals.taxes,
    taxRate: TAX_RATE,
    taxAmount: totals.taxAmount,
    total: totals.total,
    withholdingPercent: cap.withholding ? input.withholdingPercent : 0,
    withholdingAmount: cap.withholding ? totals.withholding : 0,
    amountReceived: 0,
    creditMemos: [],
    balanceDue: totals.balanceDue,
    depositAmount: cap.deposit ? totals.deposit : 0,
    attachments: input.attachments,
    payments: [],
    linkedDeliveryId: null,
    linkedInvoiceId: type === "return" ? input.linkedInvoiceId : null,
    joinedInvoiceIds: cap.bundlesInvoices ? input.joinedInvoiceIds : [],
    deliveryIds: type === "return" ? input.deliveryIds : [],
    linkedOrderId: cap.progressBilling ? input.linkedOrderId : null,
    billingMethod: cap.progressBilling ? input.billingMethod : null,
    billingPercent: cap.progressBilling ? input.billingPercent : 0
  };

  if (cap.bundlesInvoices) applyBundledInvoiceTotals(record);
  transactions.unshift(record);
  return record;
}

// A join invoice has no line items of its own: its figures are the SUM of the
// invoices it bundles. Same rule the generated dataset uses — see
// linkJoinInvoicesToInvoices.
function applyBundledInvoiceTotals(record: SalesTransaction): void {
  const linked = record.joinedInvoiceIds
    .map((id) => getSalesTransactionById(id))
    .filter((t): t is SalesTransaction => Boolean(t));
  record.subtotal = linked.reduce((sum, t) => sum + t.total, 0);
  record.total = record.subtotal;
  record.taxAmount = 0;
  record.taxes = [];
  record.balanceDue = linked.reduce((sum, t) => sum + t.balanceDue, 0);
  record.lines = [];
}

// The shipping block, gated by the type's capability. Split out because both
// the create and update writers need exactly the same rule.
function shippingFields(
  cap: TransactionTypeCapabilities,
  input: SalesTransactionInput,
  shipDate: Date,
  shippingFee: number
) {
  const on = cap.shipping === "always" || (cap.shipping === "toggle" && input.shippingInfo);
  return {
    shippingInfo: on,
    shippingAddress: on ? input.shippingAddress : "",
    shippingDate: on ? formatDate(shipDate) : "",
    shippingDateSort: on ? toLocalIsoDate(shipDate) : "",
    shipVia: on ? input.shipVia : "",
    trackingNo: on ? input.trackingNo : "",
    shippingFee: on ? shippingFee : 0
  };
}

// The form's transaction-level modifiers, in the shape
// computeTransactionTotals wants — kept in one place so create and update
// stay in step.
function totalsFor(input: SalesTransactionInput, type: TransactionType): SalesTransactionTotals {
  const cap = TYPE_CAPABILITIES[type];
  // A type without money contributes no figures at all — a Delivery's lines
  // carry quantities only, so summing prices would invent a total its own
  // screens never show.
  if (!cap.money) {
    return {
      subtotal: 0,
      discountPerLines: 0,
      discount: 0,
      taxes: [],
      taxAmount: 0,
      shippingFee: 0,
      total: 0,
      withholding: 0,
      deposit: 0,
      balanceDue: 0
    };
  }
  const shippingOn = cap.shipping === "always" || (cap.shipping === "toggle" && input.shippingInfo);
  return computeTransactionTotals(input.lines, {
    discountType: input.discountType,
    discountValue: input.discountValue,
    priceIncludesTax: input.priceIncludesTax,
    shippingFee: shippingOn ? input.shippingFee : 0,
    withholdingPercent: cap.withholding ? input.withholdingPercent : 0,
    depositAmount: cap.deposit ? input.depositAmount : 0
  });
}

// Merges form input into an existing transaction in place (keeps its id/
// number/status/payments) and recomputes totals — a real screen would
// PATCH/PUT.
export function updateTransaction(
  id: number,
  input: SalesTransactionInput
): SalesTransaction | undefined {
  const record = getSalesTransactionById(id);
  if (!record) return undefined;
  const cap = TYPE_CAPABILITIES[record.type];

  const lines = toLines(input.lines);
  const totals = totalsFor(input, record.type);
  const txDate = input.transactionDateIso
    ? parseLocalIsoDate(input.transactionDateIso)
    : parseLocalIsoDate(record.transactionDateSort);
  const due = input.dueDateIso
    ? parseLocalIsoDate(input.dueDateIso)
    : parseLocalIsoDate(record.dueDateSort);
  const shipDate = input.shippingDateIso ? parseLocalIsoDate(input.shippingDateIso) : txDate;

  Object.assign(record, {
    customerName: input.customerName,
    customerAddress: input.customerAddress,
    email: input.email,
    transactionDate: formatDate(txDate),
    transactionDateSort: toLocalIsoDate(txDate),
    dueDate: formatDate(due),
    dueDateSort: toLocalIsoDate(due),
    term: input.term,
    // The number stays the record's identity — an edit never renumbers it.
    referenceNo: input.referenceNo,
    warehouse: input.warehouse,
    tags: input.tags,
    ...shippingFields(cap, input, shipDate, totals.shippingFee),
    message: input.message,
    memo: input.memo,
    lines,
    currency: input.currency || "IDR",
    priceIncludesTax: input.priceIncludesTax,
    subtotal: totals.subtotal,
    discountPerLines: totals.discountPerLines,
    discountType: input.discountType,
    discountValue: input.discountValue,
    discountAmount: totals.discount,
    taxes: totals.taxes,
    taxAmount: totals.taxAmount,
    total: totals.total,
    withholdingPercent: cap.withholding ? input.withholdingPercent : 0,
    withholdingAmount: cap.withholding ? totals.withholding : 0,
    depositAmount: cap.deposit ? totals.deposit : 0,
    attachments: input.attachments,
    joinedInvoiceIds: cap.bundlesInvoices ? input.joinedInvoiceIds : record.joinedInvoiceIds,
    deliveryIds: record.type === "return" ? input.deliveryIds : record.deliveryIds,
    linkedOrderId: cap.progressBilling ? input.linkedOrderId : record.linkedOrderId,
    billingMethod: cap.progressBilling ? input.billingMethod : record.billingMethod,
    billingPercent: cap.progressBilling ? input.billingPercent : record.billingPercent,
    // amountReceived/creditMemos are payment history, not form input — the
    // balance still has to net them off.
    balanceDue: Math.max(
      0,
      totals.balanceDue -
        record.amountReceived -
        record.creditMemos.reduce((sum, cm) => sum + cm.amount, 0)
    )
  });

  if (cap.bundlesInvoices) applyBundledInvoiceTotals(record);
  return record;
}

/** Every invoice that is still joinable for a given customer: billed to them,
 *  still owing, and not already bundled into another join invoice. */
export function joinableInvoices(
  customerName: string,
  excludeJoinInvoiceId?: number
): SalesTransaction[] {
  const claimed = new Set(
    getSalesTransactions()
      .filter((t) => t.type === "join_invoice" && t.id !== excludeJoinInvoiceId)
      .flatMap((t) => t.joinedInvoiceIds)
  );
  return getSalesTransactions().filter(
    (t) =>
      t.type === "invoice" &&
      t.customerName === customerName &&
      t.balanceDue > 0 &&
      !claimed.has(t.id)
  );
}

/** The Sales Orders a pro forma order can bill against — open ones, since a
 *  closed order has nothing left to draw down. */
export function billableOrders(): SalesTransaction[] {
  return getSalesTransactions().filter((t) => t.type === "order" && t.status !== "closed");
}

/** How much of an order has already been claimed by earlier pro forma orders,
 *  as a percentage — so a new one can't bill past 100% of it. */
export function billedPercentForOrder(orderId: number, excludeId?: number): number {
  return getSalesTransactions()
    .filter((t) => t.type === "proforma_order" && t.linkedOrderId === orderId && t.id !== excludeId)
    .reduce((sum, t) => sum + t.billingPercent, 0);
}

/** Approve or reject a record sitting in the approval queue. Approving clears
 *  the flag and leaves the record in its own type's tab; rejecting moves it to
 *  the Rejected tab, where status is the thing that holds it. */
export function decideApproval(
  id: number,
  decision: "approve" | "reject"
): SalesTransaction | undefined {
  const record = getSalesTransactionById(id);
  if (!record) return undefined;
  record.needsApproval = false;
  if (decision === "reject") {
    record.status = "rejected";
    return record;
  }
  record.approvalsDone = record.approvalStepsTotal;
  // An approved draft goes live; a record that was already live keeps whatever
  // status it had.
  if (record.status === "draft") record.status = "open";
  return record;
}
