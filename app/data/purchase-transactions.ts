// Shared mock data source for the whole Purchases module — the list page's
// 9 tabs (app/pages/purchase/index.vue), the Invoice detail page
// (app/pages/purchase/invoice/[id].vue), and the new/edit form
// (app/components/purchase/*Form.vue) all read and write this
// one in-memory array. Pure client-side mock; a real app would hit one API
// instead.
//
// This used to be two separate stores: a rich "invoice" record here, and a
// throwaway `Row` generated fresh per tab inside index.vue. That meant two
// places to keep in sync, and made "Need approval" / "Rejected" fake tabs
// with their own hardcoded rows rather than real filtered views — so
// duplicating a Rejected row, e.g., could never make it reappear anywhere
// else, because there was nowhere else for it to live.
//
// The fix: one array of PurchaseTransaction, each tagged with a `type`
// (the 7 real transaction kinds) plus `status` and `needsApproval`. The
// index page's 9 tabs become *views* over this one array:
//   - 7 tabs filter by `type` (excluding rejected/pending-approval records —
//     those "live" in their cross-cutting tabs instead, not their type tab)
//   - "Need approval" filters `needsApproval && status !== "rejected"` across every type
//   - "Rejected" filters `status === "rejected"` across every type
// So resetting a duplicate's status to "open" now genuinely moves it back
// into its own type's tab, because there's only one place it can be.
import type { PurchaseStatus } from "./purchase-status";
import { parseLocalIsoDate, toLocalIsoDate } from "~/utils/dates";

export type TransactionType =
  | "invoice"
  | "join_invoice"
  | "delivery"
  | "order"
  | "quote"
  | "request"
  | "financing"
  | "return";

// Display label used in both the record's `number` ("Purchase Invoice
// #14026") and the tab title — matches the real Jurnal product's naming
// (see the reference screenshot on the Invoice detail page), not the
// "PI/2026/09/0001" scheme this module used before.
export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  invoice: "Purchase Invoice",
  // Not "Purchase Join Invoice" — the real product just calls it "Join
  // Invoice" (confirmed from its detail page's own title/number, which also
  // reads "Join Invoice - 10002", not "… #14039" — see numberForTransaction).
  join_invoice: "Join Invoice",
  delivery: "Purchase Delivery",
  order: "Purchase Order",
  quote: "Purchase Quote",
  request: "Purchase Request",
  financing: "Purchase Financing",
  return: "Purchase Return"
};

// Real Jurnal ids are large sequential database ids, not small per-type
// counters — this offset just makes ours look like one ("Purchase Invoice
// #14026" instead of "#1"). The number is otherwise fully determined by
// `id`, so no separate per-type sequence needs tracking.
const NUMBER_ID_OFFSET = 14_025;
// Join invoices get their own numbering scheme entirely — "Join Invoice -
// 10002", not "Join Invoice #14039" — matching the real product exactly.
const JOIN_INVOICE_NUMBER_OFFSET = 10_000;

function numberForTransaction(type: TransactionType, id: number): string {
  if (type === "join_invoice") return `Join Invoice - ${JOIN_INVOICE_NUMBER_OFFSET + id}`;
  return `${TRANSACTION_TYPE_LABEL[type]} #${NUMBER_ID_OFFSET + id}`;
}

export interface PurchaseTransactionLine {
  id: number;
  product: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  // Per-line tax selection — a label from TAX_OPTIONS, or "" for untaxed.
  // Lines sharing a label are summed into one row of PurchaseTransaction.taxes.
  tax: string;
  amount: number;
}

export type DiscountType = "percent" | "value";

export interface PurchaseTransactionTax {
  label: string;
  amount: number;
}

export interface PurchaseTransactionPayment {
  id: number;
  date: string;
  number: string;
  method: string;
  amount: number;
}

export interface PurchaseTransaction {
  id: number;
  type: TransactionType;
  number: string;
  status: PurchaseStatus;
  // Cross-cutting queue flag independent of `type` — drives the "Need
  // approval" tab (see the module doc comment above). A rejected record's
  // status already says "rejected", so needsApproval is only meaningful
  // while status isn't rejected.
  needsApproval: boolean;
  vendorName: string;
  vendorAddress: string;
  email: string[];
  transactionDate: string;
  transactionDateSort: string;
  dueDate: string;
  dueDateSort: string;
  term: string;
  referenceNo: string;
  warehouse: string;
  tags: string[];
  // Request-only fields (empty/null for every other type).
  procurementStaff: string;
  urgency: { priority: "high" | "medium" | "low"; label: string } | null;
  // The person who filed the request — distinct from `procurementStaff`
  // (who's handling it) and from `vendorName`/`email` (who it'll be bought
  // from, often not chosen yet at request time).
  requestorName: string;
  requestorEmail: string;
  relatedBudgetYear: string;
  // Shipping block — on a Delivery these are the record's own shipping
  // details; on any other type they're only populated when the form's
  // "Shipping info" checkbox was ticked (shippingInfo), which is what makes
  // the shipping column appear on the create/edit screen.
  shippingInfo: boolean;
  shippingAddress: string;
  shippingDate: string;
  shippingDateSort: string;
  shipVia: string;
  trackingNo: string;
  shippingFee: number;
  message: string;
  memo: string;
  lines: PurchaseTransactionLine[];
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
  taxes: PurchaseTransactionTax[];
  taxRate: number;
  taxAmount: number;
  total: number;
  // Withholding tax deducted from the total (invoice only; 0 elsewhere).
  withholdingPercent: number;
  withholdingAmount: number;
  amountReceived: number;
  balanceDue: number;
  // Deposit paid up front — generated for Orders, and settable on the invoice
  // form's "Deposit" checkbox.
  depositAmount: number;
  // File names only — this prototype never uploads or stores the bytes.
  attachments: string[];
  payments: PurchaseTransactionPayment[];
  // Order-only (null for every other type): the id of a real `type:
  // "delivery"` record in this same dataset that fulfills this order — set
  // by linkOrdersToDeliveries() after the dataset is built (delivery records
  // must exist first). Drives the "Fulfillment" tag and the Delivery related-
  // records table on the Order detail page.
  linkedDeliveryId: number | null;
  // Return-only (null for every other type): the Invoice this return is raised
  // against. A return is never standalone — it always credits back part of a
  // specific invoice, which is why the create form is reached from that
  // invoice's Actions menu rather than from the list (the reference app has no
  // Return tab). Its lines are a subset of that invoice's, with the quantities
  // actually being sent back.
  linkedInvoiceId: number | null;
  // Join-invoice-only (empty for every other type): ids of real `type:
  // "invoice"` records this join invoice bundles for combined billing — set
  // by linkJoinInvoicesToInvoices() after the dataset is built. A join
  // invoice's own total/subtotal/balanceDue are the *sum* of these linked
  // invoices' totals/balances (also set there), not independently generated
  // — there's nothing to bill beyond what the linked invoices already owe.
  joinedInvoiceIds: number[];
}

// Field options shared by generation below and the New/Edit form
// (app/components/purchase/*Form.vue) — one vendor/product/
// term/tag vocabulary instead of two drifting apart.
export const VENDOR_OPTIONS = [
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
 * The **buy-side** price list: `price` is what these products cost, and it
 * seeds a line's unit price on every Purchases form. Its counterpart in
 * `sales-transactions.ts` is the sell-side list, deliberately marked up over
 * these figures — see the note there before editing either.
 */
export const PRODUCT_OPTIONS = [
  { name: "Printer Paper A4 (Ream)", price: 55_000, unit: "pack" },
  { name: "Wireless Mouse", price: 125_000, unit: "pcs" },
  { name: "Office Chair", price: 1_450_000, unit: "pcs" },
  { name: "Laptop Stand", price: 210_000, unit: "pcs" },
  { name: "Whiteboard Marker Set", price: 68_000, unit: "set" },
  { name: "Steel Filing Cabinet", price: 2_100_000, unit: "pcs" },
  { name: "LED Desk Lamp", price: 175_000, unit: "pcs" },
  { name: "Ethernet Cable 10m", price: 95_000, unit: "roll" }
];

export const TERM_OPTIONS = ["Net 15", "Net 30", "Due on receipt"];
export const CURRENCY_OPTIONS = ["IDR", "USD", "SGD"];
// Per-line tax choices offered on the create/edit form. `rate` is a percentage.
export const TAX_OPTIONS: { label: string; rate: number }[] = [
  { label: "PPN 11%", rate: 11 },
  { label: "PPN 12%", rate: 12 },
  { label: "Non-taxable", rate: 0 }
];
export const TRANSACTION_TYPE_FORM_OPTIONS = [
  "Purchase Invoice",
  "Purchase Order",
  "Purchase Quote",
  "Purchase Request",
  "Purchase Delivery"
];
export const TAG_OPTIONS = ["Q3 Restock", "Priority", "Recurring", "Import", "Consignment"];
export const WAREHOUSE_OPTIONS = ["Main Warehouse", "Secondary Warehouse"];

export const STAFF = ["Dewi Lestari", "Budi Santoso", "Rina Wulandari", "Agus Prasetyo"];
export const REQUESTORS = ["Imam Prasojo", "Sari Handayani", "Fajar Nugroho", "Lestari Wibowo"];
export const BUDGET_YEARS = ["2026", "2027"];
export const SHIP_VIA_OPTIONS = ["JNE Trucking", "Internal Fleet", "Gojek Instant"];
const MEMOS = [
  "Office supplies restock",
  "Raw material batch",
  "Monthly service contract",
  "Equipment maintenance",
  ""
];
export const URGENCY_OPTIONS: NonNullable<PurchaseTransaction["urgency"]>[] = [
  { priority: "high", label: "High" },
  { priority: "medium", label: "Medium" },
  { priority: "low", label: "Low" }
];

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
// Display formatters — THE single source of truth for how a Purchase value is
// written on screen. Import these; never hand-roll a second formatter in a
// page, or the module ends up writing the same value two ways (it did: the
// list said "21 Aug 2026" while detail pages said "21/08/2026", and detail
// pages said "Rp 1.810.965" while the form said "Rp9.024.000,00"). A page that
// genuinely needs a different presentation should say why in a comment at the
// call site. See docs/patterns/page-recipes.md § "one format per value type".
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

function lineAmount(quantity: number, unitPrice: number, discountPercent: number): number {
  return Math.round(quantity * unitPrice * (1 - discountPercent / 100));
}

function buildLines(seq: number): PurchaseTransactionLine[] {
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
// that kind of document (a Delivery is never "Paid"; an Invoice is never
// "Partially sent"). "rejected" and the needsApproval flag are layered on
// top of this pool per-record (see buildTransaction), not part of it.
const STATUS_POOL: Record<TransactionType, PurchaseStatus[]> = {
  invoice: ["open", "overdue", "paid", "partial", "unpaid"],
  join_invoice: ["open", "paid"],
  delivery: ["open", "closed"],
  order: ["open", "partially_sent", "closed"],
  quote: ["open", "closed"],
  request: ["open", "partial", "closed"],
  financing: ["open", "overdue", "paid"],
  // A return is open until the credit is settled against the invoice.
  return: ["open", "closed"]
};

function buildTransaction(type: TransactionType, i: number, seq: number): PurchaseTransaction {
  const vendor = VENDOR_OPTIONS[seq % VENDOR_OPTIONS.length]!;
  const txDate = dateAt(-i * 3);
  const due = dateAt(-i * 3 + 14);

  const pool = STATUS_POOL[type];
  const rejected = i % 7 === 6; // ~2 per type
  const status: PurchaseStatus = rejected ? "rejected" : pool[i % pool.length]!;
  const needsApproval = !rejected && i % 5 === 2; // ~2-3 per type, never on a rejected record

  const lines = buildLines(seq);
  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const taxAmount = Math.round(subtotal * TAX_RATE);
  const total = subtotal + taxAmount;

  let amountReceived = 0;
  const payments: PurchaseTransactionPayment[] = [];
  if (status === "paid") {
    amountReceived = total;
    payments.push({
      id: 1,
      date: formatDate(dateAt(-i * 3 + 5)),
      number: `PAY/2026/09/${pad(seq)}`,
      method: "Bank transfer",
      amount: total
    });
  } else if (status === "partial") {
    amountReceived = Math.round(total * 0.4);
    payments.push({
      id: 1,
      date: formatDate(dateAt(-i * 3 + 5)),
      number: `PAY/2026/09/${pad(seq)}`,
      method: "Bank transfer",
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
    vendorName: vendor.name,
    vendorAddress: vendor.address,
    email: [`purchasing@${vendor.name.toLowerCase().replace(/[^a-z]+/g, "")}.co.id`],
    transactionDate: formatDate(txDate),
    transactionDateSort: toLocalIsoDate(txDate),
    dueDate: formatDate(due),
    dueDateSort: toLocalIsoDate(due),
    term: TERM_OPTIONS[i % TERM_OPTIONS.length]!,
    referenceNo: i % 3 === 0 ? `REF-${1000 + i}` : "",
    warehouse: i % 4 === 0 ? "Main Warehouse" : "",
    tags: i % 4 === 0 ? [] : [TAG_OPTIONS[i % TAG_OPTIONS.length]!],
    procurementStaff: type === "request" ? STAFF[i % STAFF.length]! : "",
    urgency: type === "request" ? URGENCY_OPTIONS[i % URGENCY_OPTIONS.length]! : null,
    requestorName: type === "request" ? REQUESTORS[i % REQUESTORS.length]! : "",
    requestorEmail:
      type === "request"
        ? `${REQUESTORS[i % REQUESTORS.length]!.toLowerCase().replace(/[^a-z]+/g, ".")}@mekari.com`
        : "",
    relatedBudgetYear:
      type === "request" && i % 4 === 0 ? BUDGET_YEARS[i % BUDGET_YEARS.length]! : "",
    // Generated records carry shipping details only on a Delivery — no other
    // type opts into the shipping block unless the form turns it on.
    shippingInfo: type === "delivery",
    shippingAddress: type === "delivery" ? vendor.address : "",
    shippingDate: type === "delivery" ? formatDate(txDate) : "",
    shippingDateSort: type === "delivery" ? toLocalIsoDate(txDate) : "",
    shipVia: type === "delivery" ? SHIP_VIA_OPTIONS[i % SHIP_VIA_OPTIONS.length]! : "",
    trackingNo: type === "delivery" && i % 3 === 0 ? `TRK-${100000 + seq}` : "",
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
    balanceDue,
    // Not every order carries a deposit — only about half, so the detail
    // page's "Deposit paid" row is genuinely conditional (see the reference
    // screenshot, which has none).
    depositAmount: type === "order" && i % 2 === 0 ? Math.round(total * 0.2) : 0,
    payments,
    linkedDeliveryId: null,
    linkedInvoiceId: null,
    joinedInvoiceIds: []
  };
}

const TYPES: TransactionType[] = [
  "invoice",
  "join_invoice",
  "delivery",
  "order",
  "quote",
  "request",
  "financing",
  "return"
];
const COUNT_PER_TYPE = 13;

// Links roughly a third of the Order records to a real Delivery record in
// this same dataset (delivery records must already exist, hence this runs
// as a pass over the finished array rather than inline in buildTransaction).
// Drives the Order detail page's "Fulfillment" tag + Delivery related-
// records table.
function linkOrdersToDeliveries(all: PurchaseTransaction[]): void {
  const deliveries = all.filter((t) => t.type === "delivery");
  if (!deliveries.length) return;
  const orders = all.filter((t) => t.type === "order");
  orders.forEach((order, i) => {
    if (i % 3 === 1) order.linkedDeliveryId = deliveries[i % deliveries.length]!.id;
  });
}

// Bundles every Join Invoice record with 2-3 real Invoice records from this
// same dataset (invoice records must already exist), then recomputes the
// join invoice's own subtotal/total/balanceDue as the *sum* of those linked
// invoices' totals/balances — a join invoice bills exactly what its linked
// invoices owe, nothing more. Drives the Join Invoice detail page's linked-
// invoices table + "Total join invoice"/"Total remaining billed" figures.
function linkJoinInvoicesToInvoices(all: PurchaseTransaction[]): void {
  const invoices = all.filter((t) => t.type === "invoice");
  if (!invoices.length) return;
  const joinInvoices = all.filter((t) => t.type === "join_invoice");
  joinInvoices.forEach((joinInvoice, i) => {
    const count = 2 + (i % 2); // 2-3 linked invoices
    const linked = Array.from(
      { length: count },
      (_, k) => invoices[(i * 2 + k) % invoices.length]!
    );
    joinInvoice.joinedInvoiceIds = linked.map((inv) => inv.id);
    joinInvoice.subtotal = linked.reduce((sum, inv) => sum + inv.total, 0);
    joinInvoice.total = joinInvoice.subtotal;
    joinInvoice.taxAmount = 0;
    joinInvoice.balanceDue = linked.reduce((sum, inv) => sum + inv.balanceDue, 0);
  });
}

// Points each generated Return at a real Invoice and rewrites its lines to be
// a genuine subset of that invoice's, so a return never credits more than was
// invoiced. Runs as a pass over the finished array because the invoices have
// to exist first — same reason as linkOrdersToDeliveries.
function linkReturnsToInvoices(all: PurchaseTransaction[]): void {
  const invoices = all.filter((t) => t.type === "invoice");
  if (!invoices.length) return;
  all
    .filter((t) => t.type === "return")
    .forEach((ret, i) => {
      const invoice = invoices[i % invoices.length]!;
      ret.linkedInvoiceId = invoice.id;
      ret.vendorName = invoice.vendorName;
      ret.vendorAddress = invoice.vendorAddress;
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
      ret.shippingAddress = invoice.vendorAddress;
      ret.shippingDate = ret.transactionDate;
      ret.shippingDateSort = ret.transactionDateSort;
    });
}

function buildDataset(): PurchaseTransaction[] {
  const all: PurchaseTransaction[] = [];
  let seq = 1;
  for (const type of TYPES) {
    for (let i = 0; i < COUNT_PER_TYPE; i++) {
      all.push(buildTransaction(type, i, seq));
      seq++;
    }
  }
  linkOrdersToDeliveries(all);
  linkJoinInvoicesToInvoices(all);
  linkReturnsToInvoices(all);
  return all;
}

let cache: PurchaseTransaction[] | null = null;

export function getPurchaseTransactions(): PurchaseTransaction[] {
  if (!cache) cache = buildDataset();
  return cache;
}

export function getPurchaseTransactionsByType(type: TransactionType): PurchaseTransaction[] {
  return getPurchaseTransactions().filter((t) => t.type === type);
}

export function getPurchaseTransactionById(id: number): PurchaseTransaction | undefined {
  return getPurchaseTransactions().find((t) => t.id === id);
}

// Neighbour ids for a detail page's prev/next chevrons — scoped to records of
// the same type (browsing invoices only skips past orders, etc.), in list
// order.
export function getAdjacentTransactionIds(id: number): {
  prevId: number | null;
  nextId: number | null;
} {
  const record = getPurchaseTransactionById(id);
  if (!record) return { prevId: null, nextId: null };
  const sameType = getPurchaseTransactions().filter((t) => t.type === record.type);
  const index = sameType.findIndex((t) => t.id === id);
  if (index === -1) return { prevId: null, nextId: null };
  return {
    prevId: sameType[index - 1]?.id ?? null,
    nextId: sameType[index + 1]?.id ?? null
  };
}

// Removes one or more transactions from the shared in-memory list (used by
// the list page's row/bulk delete and the Invoice detail page's delete) — a
// real screen would DELETE against the API instead. Returns the number
// actually removed.
export function deleteTransactions(ids: number[]): number {
  const transactions = getPurchaseTransactions();
  const idSet = new Set(ids);
  const before = transactions.length;
  const remaining = transactions.filter((t) => !idSet.has(t.id));
  transactions.splice(0, transactions.length, ...remaining);
  return before - transactions.length;
}

// Clones any transaction into a new draft: new id, next number in its type's
// own sequence, today's transaction date, a fresh 14-day due date, and
// status/needsApproval/balance reset to a fresh, unpaid "open" draft — a
// duplicate of a Paid, Closed, or Rejected record must not stay Paid/Closed/
// Rejected, or duplicating one would be pointless. Mirrors the source app's
// "Duplicate transaction" action, which opens a prefilled new_and_edit form.
export function duplicateTransaction(id: number): PurchaseTransaction | undefined {
  const source = getPurchaseTransactionById(id);
  if (!source) return undefined;

  const transactions = getPurchaseTransactions();
  const nextId = transactions.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  const txDate = dateAt(0);
  const due = dateAt(14);

  const duplicate: PurchaseTransaction = {
    ...source,
    id: nextId,
    number: numberForTransaction(source.type, nextId),
    status: "open",
    needsApproval: false,
    transactionDate: formatDate(txDate),
    transactionDateSort: toLocalIsoDate(txDate),
    dueDate: formatDate(due),
    dueDateSort: toLocalIsoDate(due),
    amountReceived: 0,
    balanceDue: source.total,
    depositAmount: 0,
    payments: [],
    lines: source.lines.map((l, i) => ({ ...l, id: i + 1 })),
    tags: [...source.tags],
    // A duplicate is a fresh, unfulfilled draft — it doesn't inherit the
    // source order's delivery link or the source join invoice's bundled
    // invoices (there's nothing billed yet to bundle).
    linkedDeliveryId: null,
    linkedInvoiceId: null,
    joinedInvoiceIds: []
  };

  transactions.unshift(duplicate);
  return duplicate;
}

// ---------------------------------------------------------------------------
// New/Edit forms (app/components/purchase/*Form.vue) — the only
// type with a create/edit screen so far, so these stay invoice-specific
// (hardcoding type: "invoice"). Everything above is generic across all 7
// types; a future form for another type would follow the same shape.
// ---------------------------------------------------------------------------

export interface PurchaseTransactionLineInput {
  product: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  tax: string;
}

// One input shape for every transaction type. Fields a given type doesn't use
// are simply left at their empty default — createTransaction() writes only what
// that type is allowed to carry (see the per-type notes on PurchaseTransaction),
// so e.g. a Request can't accidentally persist a deposit.
export interface PurchaseTransactionInput {
  vendorName: string;
  vendorAddress: string;
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
  lines: PurchaseTransactionLineInput[];
  // Request-only.
  procurementStaff: string;
  requestorName: string;
  requestorEmail: string;
  urgency: PurchaseTransaction["urgency"];
  relatedBudgetYear: string;
  // Join-invoice-only: the invoice records this one bundles.
  joinedInvoiceIds: number[];
  // Return-only: the invoice this return credits against.
  linkedInvoiceId: number | null;
}

/** @deprecated Kept as an alias while call sites migrate. */
export type PurchaseInvoiceInput = PurchaseTransactionInput;

export interface PurchaseInvoiceTotals {
  /** Gross line value, before any discount. */
  subtotal: number;
  discountPerLines: number;
  /** The transaction-level discount, resolved from discountType/discountValue. */
  discount: number;
  taxes: PurchaseTransactionTax[];
  taxAmount: number;
  shippingFee: number;
  total: number;
  withholding: number;
  deposit: number;
  balanceDue: number;
}

// The single totals engine for the invoice form: its live preview, the totals
// stack it renders, and the create/update writers below all call this, so the
// figures on screen and the figures persisted can never disagree.
//
// Order of operations mirrors the source app's totals stack:
//   gross → per-line discounts → transaction discount → tax → shipping
//   → Total → withholding + deposit deducted → Balance due
export function computeInvoiceTotals(
  lines: PurchaseTransactionLineInput[],
  options: {
    discountType?: DiscountType;
    discountValue?: number;
    priceIncludesTax?: boolean;
    shippingFee?: number;
    withholdingPercent?: number;
    depositAmount?: number;
  } = {}
): PurchaseInvoiceTotals {
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
  // post-discount base — matching the source page's grouped `groupTaxes`.
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

function num(value: number): number {
  return Number(value) || 0;
}
function lineGrossAmount(
  line: Pick<PurchaseTransactionLineInput, "quantity" | "unitPrice">
): number {
  return num(line.quantity) * num(line.unitPrice);
}
function lineNetAmount(
  line: Pick<PurchaseTransactionLineInput, "quantity" | "unitPrice" | "discountPercent">
): number {
  return Math.round(lineGrossAmount(line) * (1 - num(line.discountPercent) / 100));
}
/** A single line's payable amount — exported so the form's Amount cell and the
 *  persisted line.amount are computed the same way. */
export function computeLineAmount(
  line: Pick<PurchaseTransactionLineInput, "quantity" | "unitPrice" | "discountPercent">
): number {
  return lineNetAmount(line);
}

function toLines(lines: PurchaseTransactionLineInput[]): PurchaseTransactionLine[] {
  return lines.map((l, i) => ({
    id: i + 1,
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
// use it to decide which fields to persist — so a type can never end up with a
// value its own screens never showed (a Request with a deposit, say).
//
// Derived from the reference app's own decomposition: invoice/order/quote share
// one form, while request, delivery and merged_invoice each have their own,
// because their field sets genuinely differ.
// ---------------------------------------------------------------------------
export interface TransactionTypeCapabilities {
  /** Line items carry unit price / discount / tax / amount, and the record has a totals stack. */
  money: boolean;
  /** Has a due date + payment term. */
  term: boolean;
  /** Label for the due-date field — a Quote calls it "Expiry date". */
  dueDateLabel: string;
  warehouse: boolean;
  /** Shipping fields: "always" = intrinsic to the type, "toggle" = behind the Shipping-info checkbox. */
  shipping: "always" | "toggle" | "never";
  deposit: boolean;
  withholding: boolean;
  /** Procurement staff / requestor / urgency / budget year. */
  requestFields: boolean;
  /** The "line items" are other invoice records this one bundles. */
  bundlesInvoices: boolean;
  /** Route segment under /purchase. */
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
    requestFields: false,
    bundlesInvoices: false,
    route: "invoice"
  },
  order: {
    money: true,
    term: true,
    dueDateLabel: "Due date",
    warehouse: true,
    shipping: "toggle",
    deposit: true,
    withholding: false,
    requestFields: false,
    bundlesInvoices: false,
    route: "order"
  },
  quote: {
    money: true,
    term: true,
    dueDateLabel: "Expiry date",
    warehouse: false,
    shipping: "toggle",
    deposit: false,
    withholding: false,
    requestFields: false,
    bundlesInvoices: false,
    route: "quote"
  },
  request: {
    money: false,
    term: true,
    dueDateLabel: "Due date",
    warehouse: false,
    shipping: "never",
    deposit: false,
    withholding: false,
    requestFields: true,
    bundlesInvoices: false,
    route: "request"
  },
  delivery: {
    money: false,
    term: false,
    dueDateLabel: "Due date",
    warehouse: true,
    shipping: "always",
    deposit: false,
    withholding: false,
    requestFields: false,
    bundlesInvoices: false,
    route: "delivery"
  },
  join_invoice: {
    money: true,
    term: true,
    dueDateLabel: "Due date",
    warehouse: false,
    shipping: "never",
    deposit: false,
    withholding: false,
    requestFields: false,
    bundlesInvoices: true,
    route: "join-invoice"
  },
  // Financing is a list-only tab in the reference app — no detail or form
  // route exists for it there either, so nothing here can create one.
  financing: {
    money: true,
    term: true,
    dueDateLabel: "Due date",
    warehouse: false,
    shipping: "never",
    deposit: false,
    withholding: false,
    requestFields: false,
    bundlesInvoices: false,
    route: ""
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
    requestFields: false,
    bundlesInvoices: false,
    route: "return"
  }
};

export function emptyTransactionInput(): PurchaseTransactionInput {
  return {
    vendorName: "",
    vendorAddress: "",
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
    procurementStaff: "",
    requestorName: "",
    requestorEmail: "",
    urgency: null,
    relatedBudgetYear: "",
    joinedInvoiceIds: [],
    linkedInvoiceId: null
  };
}

/** A record by id, but only if it is of the expected type — so an edit route
 *  for one type can't open a record of another. */
export function getTransactionOfType(
  id: number,
  type: TransactionType
): PurchaseTransaction | undefined {
  const t = getPurchaseTransactionById(id);
  return t && t.type === type ? t : undefined;
}

/** Every Return raised against a given invoice — the reverse of
 *  `linkedInvoiceId`, resolved by lookup rather than stored twice. */
export function getReturnsForInvoice(invoiceId: number): PurchaseTransaction[] {
  return getPurchaseTransactions().filter(
    (t) => t.type === "return" && t.linkedInvoiceId === invoiceId
  );
}

/** How much of each invoice line is still returnable: the invoiced quantity
 *  less whatever earlier returns already sent back. Keyed by line product,
 *  which is what identifies a line across the two records here. */
export function returnableQuantities(
  invoiceId: number,
  excludeReturnId?: number
): Map<string, number> {
  const invoice = getPurchaseTransactionById(invoiceId);
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

export function getPurchaseInvoiceById(id: number): PurchaseTransaction | undefined {
  return getTransactionOfType(id, "invoice");
}

// Creates a new draft invoice (status "open", no payments yet) and appends it
// to the shared in-memory list — a real screen would POST to the API instead.
export function createTransaction(
  type: TransactionType,
  input: PurchaseTransactionInput
): PurchaseTransaction {
  const cap = TYPE_CAPABILITIES[type];
  const transactions = getPurchaseTransactions();
  const nextId = transactions.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  const lines = toLines(input.lines);
  const totals = totalsFor(input, type);
  const txDate = input.transactionDateIso
    ? parseLocalIsoDate(input.transactionDateIso)
    : new Date();
  const due = input.dueDateIso ? parseLocalIsoDate(input.dueDateIso) : txDate;
  const shipDate = input.shippingDateIso ? parseLocalIsoDate(input.shippingDateIso) : txDate;

  const record: PurchaseTransaction = {
    id: nextId,
    type,
    // A transaction number typed on the form wins; blank means "[Auto]".
    number: input.transactionNo || numberForTransaction(type, nextId),
    status: "open",
    needsApproval: false,
    vendorName: input.vendorName,
    vendorAddress: input.vendorAddress,
    email: input.email,
    transactionDate: formatDate(txDate),
    transactionDateSort: toLocalIsoDate(txDate),
    dueDate: formatDate(due),
    dueDateSort: toLocalIsoDate(due),
    term: input.term,
    referenceNo: input.referenceNo,
    warehouse: input.warehouse,
    tags: input.tags,
    procurementStaff: cap.requestFields ? input.procurementStaff : "",
    urgency: cap.requestFields ? input.urgency : null,
    requestorName: cap.requestFields ? input.requestorName : "",
    requestorEmail: cap.requestFields ? input.requestorEmail : "",
    relatedBudgetYear: cap.requestFields ? input.relatedBudgetYear : "",
    // "always" types (Delivery) carry shipping unconditionally; "toggle" types
    // only when the form's Shipping-info checkbox was on; "never" types not at all.
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
    balanceDue: totals.balanceDue,
    depositAmount: cap.deposit ? totals.deposit : 0,
    attachments: input.attachments,
    payments: [],
    linkedDeliveryId: null,
    linkedInvoiceId: type === "return" ? input.linkedInvoiceId : null,
    joinedInvoiceIds: cap.bundlesInvoices ? input.joinedInvoiceIds : []
  };

  if (cap.bundlesInvoices) applyBundledInvoiceTotals(record);
  transactions.unshift(record);
  return record;
}

/** @deprecated Use createTransaction("invoice", input). */
export function createPurchaseInvoice(input: PurchaseTransactionInput): PurchaseTransaction {
  return createTransaction("invoice", input);
}

// The shipping block, gated by the type's capability. Split out because both
// the create and update writers need exactly the same rule.
function shippingFields(
  cap: TransactionTypeCapabilities,
  input: PurchaseTransactionInput,
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

// A join invoice has no line items of its own: its figures are the SUM of the
// invoices it bundles. Same rule the generated dataset uses — see
// linkJoinInvoicesToInvoices.
function applyBundledInvoiceTotals(record: PurchaseTransaction): void {
  const linked = record.joinedInvoiceIds
    .map((id) => getPurchaseTransactionById(id))
    .filter((t): t is PurchaseTransaction => Boolean(t));
  record.subtotal = linked.reduce((sum, t) => sum + t.total, 0);
  record.total = record.subtotal;
  record.taxAmount = 0;
  record.taxes = [];
  record.balanceDue = linked.reduce((sum, t) => sum + t.balanceDue, 0);
  record.lines = [];
}

// The form's transaction-level modifiers, in the shape computeInvoiceTotals
// wants — kept in one place so create and update stay in step.
function totalsFor(input: PurchaseTransactionInput, type: TransactionType): PurchaseInvoiceTotals {
  const cap = TYPE_CAPABILITIES[type];
  // A type without money contributes no figures at all — a Request's lines
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
  return computeInvoiceTotals(input.lines, {
    discountType: input.discountType,
    discountValue: input.discountValue,
    priceIncludesTax: input.priceIncludesTax,
    shippingFee: shippingOn ? input.shippingFee : 0,
    withholdingPercent: cap.withholding ? input.withholdingPercent : 0,
    depositAmount: cap.deposit ? input.depositAmount : 0
  });
}

// Merges form input into an existing invoice in place (keeps its id/number/
// status/payments) and recomputes totals — a real screen would PATCH/PUT.
export function updateTransaction(
  id: number,
  input: PurchaseTransactionInput
): PurchaseTransaction | undefined {
  const record = getPurchaseTransactionById(id);
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
    vendorName: input.vendorName,
    vendorAddress: input.vendorAddress,
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
    procurementStaff: cap.requestFields ? input.procurementStaff : record.procurementStaff,
    urgency: cap.requestFields ? input.urgency : record.urgency,
    requestorName: cap.requestFields ? input.requestorName : record.requestorName,
    requestorEmail: cap.requestFields ? input.requestorEmail : record.requestorEmail,
    relatedBudgetYear: cap.requestFields ? input.relatedBudgetYear : record.relatedBudgetYear,
    joinedInvoiceIds: cap.bundlesInvoices ? input.joinedInvoiceIds : record.joinedInvoiceIds,
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
    // amountReceived is payment history, not form input — the balance still
    // has to net it off.
    balanceDue: Math.max(0, totals.balanceDue - record.amountReceived)
  });

  if (cap.bundlesInvoices) applyBundledInvoiceTotals(record);
  return record;
}

/** @deprecated Use updateTransaction(id, input). */
export function updatePurchaseInvoice(
  id: number,
  input: PurchaseTransactionInput
): PurchaseTransaction | undefined {
  return updateTransaction(id, input);
}
