// Shared mock data source for the whole Fulfillment module — the two kanban
// boards (app/pages/fulfillment/{sales,purchases}/index.vue), the
// fulfillment-order detail pages (.../[id].vue) and the process/picklist/
// delivery/receipt drawers all read and write this one in-memory array.
//
// Cloned from jurnal-frontend-app's `src/pages/outbounds/**` (Sales
// fulfillment) and `src/pages/inbounds/**` (Purchase fulfillment), which are
// two near-identical modules over one shared lifecycle. Here they are one
// module with a `direction` discriminator, because the only real differences
// are (a) which stages exist and (b) whether the counterparty is a customer or
// a vendor — everything else was duplicated code in the source.
//
// **A fulfillment order is not a record of its own.** It fulfils a real Sales
// Order or Purchase Order from the existing datasets, so it is seeded from
// them (`getSalesTransactionsByType("order")` /
// `getPurchaseTransactionsByType("order")`) rather than being generated
// independently. That is what makes the detail page's "Sales order no." link
// go somewhere real, and it follows docs/patterns/details-page-format.md:
// reuse an existing record from the shared dataset rather than fabricating
// disconnected display data.

import {
  formatDisplayDate,
  getSalesTransactionsByType,
  todayIsoDate,
  type SalesTransaction,
  type SalesTransactionLine
} from "./sales-transactions";
import {
  getPurchaseTransactionsByType,
  type PurchaseTransaction,
  type PurchaseTransactionLine
} from "./purchase-transactions";
import {
  FULFILLMENT_BOARD_COLUMN,
  FULFILLMENT_STATUS_LABEL,
  INBOUND_COLUMNS,
  OUTBOUND_COLUMNS,
  type FulfillmentColumn,
  type FulfillmentStatus
} from "./fulfillment-status";
import { parseLocalIsoDate, toLocalIsoDate } from "~/utils/dates";

// One display format for the module, imported rather than redeclared — see
// docs/patterns/page-recipes.md § "one format per value type, per module".
// Sales' and Purchases' own copies are byte-identical, so re-exporting one of
// them is the whole point: a Fulfillment screen must not be able to write a
// date differently from the Sales Order it links to.
//
// `todayIsoDate` travels with it for the same reason, and it is not a
// convenience: the datasets' "today" is a FIXED 2 Sep 2026 (`dateAt` in
// sales-transactions.ts), not the machine clock. A screen that reached for
// `new Date()` would measure this data against a different today and quietly
// filter all of it out — which is exactly what the period filter below did
// before it was pointed here.
export { formatDisplayDate, todayIsoDate };

export type FulfillmentDirection = "outbound" | "inbound";

/** What the counterparty is called on each side. The source app has two
 *  separate i18n files that differ in essentially this one word. */
export const PERSON_LABEL: Record<FulfillmentDirection, string> = {
  outbound: "Customer",
  inbound: "Vendor"
};

/** The order document each direction fulfils, and where its detail page is. */
export const SOURCE_ORDER: Record<
  FulfillmentDirection,
  { label: string; route: (id: number) => string }
> = {
  outbound: { label: "Sales order no.", route: (id) => `/sales/order/${id}` },
  inbound: { label: "Purchase order no.", route: (id) => `/purchase/order/${id}` }
};

export interface FulfillmentLine {
  id: number;
  /** The line on the originating Sales/Purchase Order this fulfils. */
  orderLineId: number;
  product: string;
  productCode: string;
  description: string;
  unit: string;
  /** Ordered — the quantity the source order committed to. Never changes. */
  quantity: number;
  /** Outbound: reserved for picking. Inbound: unused (goods arrive whole). */
  quantityOnProcess: number;
  /** Outbound: on a picklist. */
  quantityOnPicked: number;
  /** Outbound: on a delivery slip and in transit. */
  quantityOnDelivery: number;
  /** Confirmed received — by the customer (outbound) or from the vendor
   *  (inbound). This is the quantity that actually closes the order. */
  quantityOnCompleted: number;
}

export type FulfillmentDocKind = "picklist" | "delivery" | "receipt";

export const FULFILLMENT_DOC_LABEL: Record<FulfillmentDocKind, string> = {
  picklist: "Picklist",
  delivery: "Delivery slip",
  receipt: "Receipt note"
};

/** A document raised against a fulfillment order — the picklist the warehouse
 *  works from, the delivery slip that travels with the goods, the receipt note
 *  that closes the loop. The source app models these as separate "outbound"
 *  records keyed by status; one kind-tagged list is the same information with
 *  fewer ways to get out of sync. */
export interface FulfillmentDoc {
  id: number;
  kind: FulfillmentDocKind;
  number: string;
  /** `YYYY-MM-DD`. */
  date: string;
  courier: string;
  trackingNo: string;
  /** Delivery only: the receipt note that completed this delivery, once one
   *  exists. Stored one way and looked up in reverse, the same way Sales
   *  models Order → Delivery (see app/data/sales-transactions.ts). */
  completedByDocId: number | null;
  /** Per-line quantities this document covers. */
  lines: { lineId: number; quantity: number }[];
  /** File names only — this prototype never uploads or stores the bytes, the
   *  same way `attachments` works on a Sales/Purchase transaction. Delivery
   *  slips and receipt notes carry paperwork (a signed slip, a photo of the
   *  goods); a picklist is an internal worksheet and carries none. */
  attachments: string[];
}

/** One entry in an order's audit trail. The source app fetches these from an
 *  endpoint per record; here they are written by the lifecycle helpers as the
 *  order moves, which is the same information with no second source of truth. */
export interface FulfillmentLogEntry {
  /** `YYYY-MM-DD`. */
  date: string;
  /** What happened, e.g. "Order processed". */
  action: string;
  user: string;
  /** The specifics — which document, which quantities. */
  detail: string;
}

export interface FulfillmentOrder {
  id: number;
  direction: FulfillmentDirection;
  status: FulfillmentStatus;
  /** The Sales/Purchase Order record this fulfils — a real id in that
   *  module's dataset, not a fabricated one. */
  transactionId: number;
  /** That order's own number, e.g. "Sales Order #24030". */
  orderNumber: string;
  /** Customer (outbound) or vendor (inbound). */
  personName: string;
  personAddress: string;
  /** `YYYY-MM-DD` throughout — display goes through formatDisplayDate. */
  orderDate: string;
  dueDate: string;
  referenceNo: string;
  warehouse: string;
  memo: string;
  courier: string;
  trackingNo: string;
  deliveryDate: string | null;
  receiveDate: string | null;
  cancelDate: string | null;
  cancelReason: string;
  /** Closed with less than the ordered quantity delivered. A flag rather than
   *  a status — see the note at the top of fulfillment-status.ts. */
  completedPartially: boolean;
  /** Canceled after part of it had already been completed. */
  completedPartiallyAndCanceled: boolean;
  lines: FulfillmentLine[];
  documents: FulfillmentDoc[];
  /** Newest first — the audit modal reads it in that order. */
  logs: FulfillmentLogEntry[];
  updatedBy: string;
  /** `YYYY-MM-DD`. The source shows a full timestamp; the prototype has no
   *  clock behind it, so the detail page renders this date with a fixed time
   *  the same way the Sales detail pages do. */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

// Which lifecycle stage each seeded order lands in, cycled over the 13 source
// orders on each side. Deliberately weighted, not random: every board column
// must hold at least one card (an empty column teaches nothing about the
// pattern), and the `new_order` counts have to come out at 4 outbound / 2
// inbound to match the submenu badges in app/data/menu.ts — which are static,
// and would otherwise contradict the board they point at.
const OUTBOUND_STAGES: FulfillmentStatus[] = [
  "new_order",
  "completed",
  "on_process",
  "completed",
  "new_order",
  "delivered",
  "picked",
  "new_order",
  "completed",
  "on_process",
  "canceled",
  "delivered",
  "new_order"
];

// Inbound has no picking or delivery stage — see INBOUND_COLUMNS.
const INBOUND_STAGES: FulfillmentStatus[] = [
  "completed",
  "new_order",
  "completed",
  "canceled",
  "completed",
  "completed",
  "new_order",
  "completed",
  "canceled",
  "completed",
  "completed",
  "canceled",
  "completed"
];

const COURIERS = ["JNE Trucking", "Internal Fleet", "Gojek Instant", "SiCepat"];
const WAREHOUSE_STAFF = ["Rizal Candra", "Dewi Lestari", "Agus Prasetyo", "Sari Handayani"];
const CANCEL_REASONS = [
  "Customer canceled the order",
  "Stock unavailable at the requested warehouse",
  "Replaced by a revised order"
];

function shiftIso(iso: string, days: number): string {
  const d = parseLocalIsoDate(iso.slice(0, 10));
  d.setDate(d.getDate() + days);
  return toLocalIsoDate(d);
}

function pad(n: number): string {
  return String(n).padStart(4, "0");
}

/**
 * How far through the lifecycle each stage has moved the quantities.
 *
 * The source app carries five independent per-line counters and lets the API
 * set them, which is how it ends up able to represent states the UI can't
 * explain. Here they are derived from the stage, so they are always
 * consistent: a `delivered` line cannot have more delivered than picked.
 */
function quantitiesFor(
  status: FulfillmentStatus,
  ordered: number,
  partial: boolean
): Pick<
  FulfillmentLine,
  "quantityOnProcess" | "quantityOnPicked" | "quantityOnDelivery" | "quantityOnCompleted"
> {
  // A partially-fulfilled order moves ~60% of each line, rounded up so a
  // 1-unit line still moves something rather than reading as untouched.
  const moved = partial ? Math.max(1, Math.ceil(ordered * 0.6)) : ordered;
  const none = {
    quantityOnProcess: 0,
    quantityOnPicked: 0,
    quantityOnDelivery: 0,
    quantityOnCompleted: 0
  };
  switch (status) {
    case "new_order":
      return none;
    case "on_process":
      return { ...none, quantityOnProcess: moved };
    case "picked":
      return { ...none, quantityOnProcess: moved, quantityOnPicked: moved };
    case "delivered":
      return {
        quantityOnProcess: moved,
        quantityOnPicked: moved,
        quantityOnDelivery: moved,
        quantityOnCompleted: 0
      };
    case "completed":
      return {
        quantityOnProcess: moved,
        quantityOnPicked: moved,
        quantityOnDelivery: moved,
        quantityOnCompleted: moved
      };
    case "canceled":
      // A plain cancellation moved nothing. But an order canceled *after* part
      // of it had already gone out keeps what went out — that is precisely
      // what `completedPartiallyAndCanceled` claims on the card, and the badge
      // would be lying about a record whose every line reads zero.
      return partial
        ? {
            quantityOnProcess: moved,
            quantityOnPicked: moved,
            quantityOnDelivery: moved,
            quantityOnCompleted: moved
          }
        : none;
  }
}

function buildLines(
  sourceLines: (SalesTransactionLine | PurchaseTransactionLine)[],
  status: FulfillmentStatus,
  direction: FulfillmentDirection,
  partial: boolean
): FulfillmentLine[] {
  return sourceLines.map((line, index) => {
    const quantities = quantitiesFor(status, line.quantity, partial);
    // Inbound never picks or ships — the goods arrive. Collapsing the middle
    // counters keeps the inbound detail table (Ordered / Received) honest
    // instead of showing zeroed columns it never renders anyway.
    const inboundQuantities =
      direction === "inbound"
        ? {
            quantityOnProcess: 0,
            quantityOnPicked: 0,
            quantityOnDelivery: 0,
            quantityOnCompleted: quantities.quantityOnCompleted
          }
        : quantities;
    return {
      id: index + 1,
      orderLineId: line.id,
      product: line.product,
      productCode: `SKU-${pad(index + 1)}`,
      description: line.description,
      unit: line.unit,
      quantity: line.quantity,
      ...inboundQuantities
    };
  });
}

// Document ids are unique across the whole dataset, not per order, because a
// document has its own page (/fulfillment/picklist/12) and that page has to be
// able to find it from the id in the URL alone.
let docSeq = 0;
function allocDocId(): number {
  docSeq += 1;
  return docSeq;
}

/** The documents a stage implies. An order at `delivered` must have both a
 *  picklist and a delivery slip behind it; one at `completed` has a receipt
 *  note as well. Deriving them from the stage is what keeps the detail page's
 *  Picklist/Delivery tabs from disagreeing with its status badge. */
function buildDocuments(
  order: Pick<FulfillmentOrder, "status" | "direction" | "orderDate" | "lines">,
  seq: number
): FulfillmentDoc[] {
  const { status, direction, orderDate, lines } = order;
  if (status === "new_order" || status === "canceled") return [];

  const docs: FulfillmentDoc[] = [];
  const courier = COURIERS[seq % COURIERS.length]!;

  if (direction === "inbound") {
    // Inbound raises exactly one document, and only once the goods are in.
    if (status === "completed") {
      docs.push({
        id: allocDocId(),
        kind: "receipt",
        number: `RN/2026/09/${pad(seq)}`,
        date: shiftIso(orderDate, 5),
        courier: "",
        trackingNo: "",
        completedByDocId: null,
        lines: lines.map((l) => ({ lineId: l.id, quantity: l.quantityOnCompleted })),
        attachments: [`goods-receipt-${pad(seq)}.pdf`]
      });
    }
    return docs;
  }

  const hasPicklist = status === "picked" || status === "delivered" || status === "completed";
  const hasDelivery = status === "delivered" || status === "completed";
  const hasReceipt = status === "completed";

  if (hasPicklist) {
    docs.push({
      id: allocDocId(),
      kind: "picklist",
      number: `PL/2026/09/${pad(seq)}`,
      date: shiftIso(orderDate, 2),
      courier: "",
      trackingNo: "",
      completedByDocId: null,
      lines: lines.map((l) => ({ lineId: l.id, quantity: l.quantityOnPicked })),
      // A picklist is an internal worksheet — nothing is filed against it.
      attachments: []
    });
  }
  if (hasDelivery) {
    docs.push({
      id: allocDocId(),
      kind: "delivery",
      number: `DS/2026/09/${pad(seq)}`,
      date: shiftIso(orderDate, 3),
      courier,
      trackingNo: `TRK${pad(seq)}${seq}`,
      // Filled in below once the receipt exists — the forward reference has to
      // point at something already built.
      completedByDocId: null,
      lines: lines.map((l) => ({ lineId: l.id, quantity: l.quantityOnDelivery })),
      attachments: [`delivery-slip-${pad(seq)}.pdf`, `packing-photo-${pad(seq)}.jpg`]
    });
  }
  if (hasReceipt) {
    const receipt: FulfillmentDoc = {
      id: allocDocId(),
      kind: "receipt",
      number: `RN/2026/09/${pad(seq)}`,
      date: shiftIso(orderDate, 6),
      courier: "",
      trackingNo: "",
      completedByDocId: null,
      lines: lines.map((l) => ({ lineId: l.id, quantity: l.quantityOnCompleted })),
      attachments: [`signed-receipt-${pad(seq)}.pdf`]
    };
    docs.push(receipt);
    const delivery = docs.find((d) => d.kind === "delivery");
    if (delivery) delivery.completedByDocId = receipt.id;
  }
  return docs;
}

/**
 * The audit trail a seeded order would have accumulated on its way to the
 * stage it is in — newest first, matching how the modal reads it.
 *
 * The source app fetches these from a per-record endpoint. Deriving them from
 * the documents that exist keeps the trail and the record from disagreeing:
 * there is no way to have a "Delivery slip created" entry with no slip.
 */
function buildLogs(
  order: Pick<FulfillmentOrder, "status" | "direction" | "orderDate" | "lines" | "documents">,
  user: string,
  cancelDate: string | null,
  cancelReason: string
): FulfillmentLogEntry[] {
  const entries: FulfillmentLogEntry[] = [
    {
      date: order.orderDate,
      action: "Fulfillment created",
      user,
      detail: `${order.lines.length} product${order.lines.length === 1 ? "" : "s"} sent to fulfillment`
    }
  ];

  const processed = order.lines.reduce((a, l) => a + l.quantityOnProcess, 0);
  if (processed > 0) {
    entries.push({
      date: shiftIso(order.orderDate, 1),
      action: "Order processed",
      user,
      detail: `${processed} unit${processed === 1 ? "" : "s"} reserved for picking`
    });
  }

  order.documents.forEach((doc) => {
    const total = doc.lines.reduce((a, l) => a + l.quantity, 0);
    entries.push({
      date: doc.date,
      action: `${FULFILLMENT_DOC_LABEL[doc.kind]} created`,
      user,
      detail: `${doc.number} — ${total} unit${total === 1 ? "" : "s"}`
    });
  });

  if (cancelDate) {
    entries.push({
      date: cancelDate,
      action: "Fulfillment canceled",
      user,
      detail: cancelReason || "No reason given"
    });
  }

  return entries.reverse();
}

function buildOrder(
  source: SalesTransaction | PurchaseTransaction,
  direction: FulfillmentDirection,
  index: number,
  seq: number
): FulfillmentOrder {
  const stages = direction === "outbound" ? OUTBOUND_STAGES : INBOUND_STAGES;
  const status = stages[index % stages.length]!;
  // Two of the completed orders on each side closed short, and one canceled
  // order had already shipped part of its lines — the two flags the source
  // app renders as extra badges on a kanban card need real records to sit on.
  const completedPartially = status === "completed" && index % 5 === 1;
  const completedPartiallyAndCanceled = status === "canceled" && index % 2 === 0;
  const partial = completedPartially || completedPartiallyAndCanceled;

  const personName =
    direction === "outbound"
      ? (source as SalesTransaction).customerName
      : (source as PurchaseTransaction).vendorName;
  const personAddress =
    direction === "outbound"
      ? (source as SalesTransaction).customerAddress
      : (source as PurchaseTransaction).vendorAddress;

  const orderDate = source.transactionDateSort;
  const lines = buildLines(source.lines, status, direction, partial);
  // An order canceled after part of it shipped still has the paperwork for
  // what shipped — the picklist, slip and receipt that got it out of the door
  // don't stop existing because the rest was called off. So its documents are
  // built as though it completed; only the status says canceled.
  const documentStatus: FulfillmentStatus = status === "canceled" && partial ? "completed" : status;
  const documents = buildDocuments({ status: documentStatus, direction, orderDate, lines }, seq);

  const delivery = documents.find((d) => d.kind === "delivery");
  const receipt = documents.find((d) => d.kind === "receipt");
  const staff = WAREHOUSE_STAFF[seq % WAREHOUSE_STAFF.length]!;

  return {
    id: seq,
    direction,
    status,
    transactionId: source.id,
    orderNumber: source.number,
    personName,
    personAddress,
    orderDate,
    dueDate: source.dueDateSort,
    referenceNo: source.referenceNo,
    warehouse: source.warehouse,
    memo: source.memo,
    courier: delivery?.courier ?? "",
    trackingNo: delivery?.trackingNo ?? "",
    deliveryDate: delivery?.date ?? null,
    receiveDate: receipt?.date ?? null,
    // After the receipt when part of it had already gone out (day 6), not
    // before it — a cancel date earlier than the receipt it cancelled around
    // would read as a paradox on the detail page.
    cancelDate: status === "canceled" ? shiftIso(orderDate, partial ? 8 : 4) : null,
    cancelReason: status === "canceled" ? CANCEL_REASONS[index % CANCEL_REASONS.length]! : "",
    completedPartially,
    completedPartiallyAndCanceled,
    lines,
    documents,
    logs: buildLogs(
      { status, direction, orderDate, lines, documents },
      staff,
      status === "canceled" ? shiftIso(orderDate, partial ? 8 : 4) : null,
      status === "canceled" ? CANCEL_REASONS[index % CANCEL_REASONS.length]! : ""
    ),
    updatedBy: staff,
    updatedAt: receipt?.date ?? delivery?.date ?? shiftIso(orderDate, 1)
  };
}

function buildDataset(): FulfillmentOrder[] {
  const all: FulfillmentOrder[] = [];
  let seq = 1;
  getSalesTransactionsByType("order").forEach((order, i) => {
    all.push(buildOrder(order, "outbound", i, seq));
    seq++;
  });
  getPurchaseTransactionsByType("order").forEach((order, i) => {
    all.push(buildOrder(order, "inbound", i, seq));
    seq++;
  });
  return all;
}

let cache: FulfillmentOrder[] | null = null;

export function getFulfillmentOrders(): FulfillmentOrder[] {
  if (!cache) cache = buildDataset();
  return cache;
}

export function getFulfillmentOrdersByDirection(
  direction: FulfillmentDirection
): FulfillmentOrder[] {
  return getFulfillmentOrders().filter((o) => o.direction === direction);
}

export function getFulfillmentOrderById(id: number): FulfillmentOrder | undefined {
  return getFulfillmentOrders().find((o) => o.id === id);
}

/** Guards a detail page against being handed an id from the *other* board —
 *  `/fulfillment/purchases/3` must not render an outbound order. Mirrors
 *  `getTransactionOfType` in the Sales/Purchases datasets. */
export function getFulfillmentOrderOfDirection(
  id: number,
  direction: FulfillmentDirection
): FulfillmentOrder | undefined {
  const order = getFulfillmentOrderById(id);
  return order && order.direction === direction ? order : undefined;
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

export interface FulfillmentBoardFilter {
  /** "" means every warehouse. */
  warehouse: string;
  /** Days back from today, or `null` for "All time". */
  days: number | null;
  search: string;
}

export function emptyBoardFilter(): FulfillmentBoardFilter {
  return { warehouse: "", days: null, search: "" };
}

/** The duration filter's options, matching the source app's `durationOptions`
 *  (7 / 14 / 30 days, then All). */
export const DURATION_OPTIONS: { label: string; days: number | null }[] = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  // "All dates", not the source's "All": the copy library's rule for an
  // all-inclusive filter option is "All [noun]", plural.
  { label: "All dates", days: null }
];

/** The option the board opens on.
 *
 * The source app defaults to "Last 7 days", which is right against production
 * data — a warehouse raises orders daily, so a week is a full board. This
 * dataset is 13 orders spaced three days apart over five weeks, so a 7-day
 * default renders an empty board on first load: the filter would be hiding the
 * very thing the page exists to show. Same intent ("here is the pipeline"),
 * different data density, so the default that expresses it differs. */
export const DEFAULT_DURATION = DURATION_OPTIONS[DURATION_OPTIONS.length - 1]!;

export interface FulfillmentBoardColumn {
  key: FulfillmentColumn;
  title: string;
  orders: FulfillmentOrder[];
}

function matchesFilter(order: FulfillmentOrder, filter: FulfillmentBoardFilter): boolean {
  if (filter.warehouse && order.warehouse !== filter.warehouse) return false;
  if (filter.days !== null) {
    // Measured against the dataset's own today, never the machine clock — see
    // the note on the todayIsoDate re-export at the top of this file.
    const cutoff = parseLocalIsoDate(todayIsoDate());
    cutoff.setDate(cutoff.getDate() - filter.days);
    if (parseLocalIsoDate(order.orderDate) < cutoff) return false;
  }
  const term = filter.search.trim().toLowerCase();
  if (term) {
    const haystack = [order.orderNumber, order.personName, order.referenceNo, order.warehouse]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(term)) return false;
  }
  return true;
}

/**
 * The board, already filtered and bucketed. Returns every column even when it
 * is empty — a kanban whose columns come and go as you type is unreadable, and
 * an empty column is itself information ("nothing is in process").
 */
export function getFulfillmentBoard(
  direction: FulfillmentDirection,
  filter: FulfillmentBoardFilter
): FulfillmentBoardColumn[] {
  const columns = direction === "outbound" ? OUTBOUND_COLUMNS : INBOUND_COLUMNS;
  const matching = getFulfillmentOrdersByDirection(direction).filter((o) =>
    matchesFilter(o, filter)
  );
  return columns.map((key) => ({
    key,
    title: FULFILLMENT_STATUS_LABEL[key],
    orders: matching.filter((o) => FULFILLMENT_BOARD_COLUMN[o.status] === key)
  }));
}

/** Every warehouse that actually appears on this board — the filter's options
 *  come from the data rather than from a constant that could drift out of it.
 *
 *  Blanks are dropped: not every source order names a warehouse, and an empty
 *  string would render as a nameless `<option value="">` sitting directly under
 *  "All warehouses" — which selects the same thing and looks like a rendering
 *  fault. */
export function warehouseOptions(direction: FulfillmentDirection): string[] {
  return [
    ...new Set(
      getFulfillmentOrdersByDirection(direction)
        .map((o) => o.warehouse)
        .filter(Boolean)
    )
  ].sort();
}

// ---------------------------------------------------------------------------
// Line quantity helpers
// ---------------------------------------------------------------------------

/** How much of a line is still available to process — what the Process order
 *  drawer's stepper is capped at. */
export function remainingToProcess(line: FulfillmentLine): number {
  return Math.max(0, line.quantity - line.quantityOnProcess);
}

export function orderTotals(order: FulfillmentOrder) {
  const sum = (pick: (l: FulfillmentLine) => number) =>
    order.lines.reduce((a, l) => a + pick(l), 0);
  return {
    ordered: sum((l) => l.quantity),
    processed: sum((l) => l.quantityOnProcess),
    picked: sum((l) => l.quantityOnPicked),
    delivered: sum((l) => l.quantityOnDelivery),
    completed: sum((l) => l.quantityOnCompleted)
  };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Which action the detail page's primary button offers next, given where the
 * order currently is. `null` means there is nothing left to do — the order is
 * completed or canceled.
 *
 * The source app derives this from the *documents* that exist rather than the
 * status (`actionType` in src/pages/outbounds/fulfillment-order/index.ts),
 * which is why it needs `isCanCreateOutboundByStatus` guards bolted on top.
 * Reading it off the status is the same answer with no second source of truth.
 */
export type FulfillmentAction = "process" | "pick" | "deliver" | "complete" | "receive";

export const FULFILLMENT_ACTION_LABEL: Record<FulfillmentAction, string> = {
  process: "Process order",
  pick: "Create picklist",
  deliver: "Create delivery slip",
  complete: "Create receipt note",
  receive: "Receive goods"
};

export function nextAction(order: FulfillmentOrder): FulfillmentAction | null {
  if (order.status === "completed" || order.status === "canceled") return null;
  if (order.direction === "inbound") return "receive";
  switch (order.status) {
    case "new_order":
      return "process";
    case "on_process":
      return "pick";
    case "picked":
      return "deliver";
    case "delivered":
      return "complete";
    default:
      return null;
  }
}

/** A fulfillment can only be called off while nothing has shipped. Once a
 *  delivery slip exists the goods have left, and cancelling is a return, not a
 *  cancellation — which is a Sales Return, in another module. */
export function canCancel(order: FulfillmentOrder): boolean {
  return order.status === "new_order" || order.status === "on_process";
}

/** Guards a document page against an id from the wrong route —
 *  `/fulfillment/picklist/13` must not render a delivery slip. Returns the
 *  document with the order it belongs to, since the page needs both. */
export function getFulfillmentDocument(
  id: number,
  kind: FulfillmentDocKind
): { doc: FulfillmentDoc; order: FulfillmentOrder } | undefined {
  for (const order of getFulfillmentOrders()) {
    const doc = order.documents.find((d) => d.id === id && d.kind === kind);
    if (doc) return { doc, order };
  }
  return undefined;
}

/** Where a document's own page lives. */
export function documentRoute(doc: Pick<FulfillmentDoc, "id" | "kind">): string {
  return `/fulfillment/${doc.kind}/${doc.id}`;
}

/** The person every mutation in this prototype is attributed to. A real app
 *  would read the signed-in user; the dummy auth here has no identity to read,
 *  and the Sales detail pages hardcode the same name for the same reason. */
const CURRENT_USER = "Rizal Candra";

/** Stamps the record as changed and writes the audit entry for it. Every
 *  mutation goes through here, so the trail cannot fall behind the record. */
function touch(order: FulfillmentOrder, date: string, action: string, detail: string): void {
  order.updatedAt = date;
  order.updatedBy = CURRENT_USER;
  order.logs.unshift({ date, action, user: CURRENT_USER, detail });
}

/** `touch` for the three document creators, which all write the same entry
 *  shape — the document's label, its number and how much it carries. */
function logDocument(order: FulfillmentOrder, doc: FulfillmentDoc, date: string): void {
  const total = doc.lines.reduce((a, l) => a + l.quantity, 0);
  touch(
    order,
    date,
    `${FULFILLMENT_DOC_LABEL[doc.kind]} created`,
    `${doc.number} — ${total} unit${total === 1 ? "" : "s"}`
  );
}

/**
 * Records the quantities the warehouse has committed to picking, and moves a
 * new order into `on_process`. Called again on an already-processing order it
 * *adds* to what was processed (the source app's "Add order processed"), which
 * is why the quantities are added rather than assigned.
 */
export function processOrder(
  id: number,
  quantities: Record<number, number>,
  date: string
): FulfillmentOrder | undefined {
  const order = getFulfillmentOrderById(id);
  if (!order || (order.status !== "new_order" && order.status !== "on_process")) return undefined;
  order.lines.forEach((line) => {
    const add = quantities[line.id] ?? 0;
    if (add <= 0) return;
    line.quantityOnProcess = Math.min(line.quantity, line.quantityOnProcess + add);
  });
  if (orderTotals(order).processed > 0) order.status = "on_process";
  const processed = orderTotals(order).processed;
  touch(
    order,
    date,
    "Order processed",
    `${processed} unit${processed === 1 ? "" : "s"} reserved for picking`
  );
  return order;
}

/** Undoes the above — back to a new order, quantities cleared. The source app
 *  puts this behind its own confirm modal, and so does the detail page here. */
export function cancelProcessing(id: number, date: string): FulfillmentOrder | undefined {
  const order = getFulfillmentOrderById(id);
  if (!order || order.status !== "on_process") return undefined;
  order.lines.forEach((line) => {
    line.quantityOnProcess = 0;
  });
  order.status = "new_order";
  touch(order, date, "Processing undone", "Processed quantities cleared");
  return order;
}

export interface PicklistInput {
  number: string;
  date: string;
}

export function createPicklist(id: number, input: PicklistInput): FulfillmentDoc | undefined {
  const order = getFulfillmentOrderById(id);
  if (!order || order.status !== "on_process") return undefined;
  order.lines.forEach((line) => {
    line.quantityOnPicked = line.quantityOnProcess;
  });
  const doc: FulfillmentDoc = {
    id: allocDocId(),
    kind: "picklist",
    number: input.number,
    date: input.date,
    courier: "",
    trackingNo: "",
    completedByDocId: null,
    lines: order.lines.map((l) => ({ lineId: l.id, quantity: l.quantityOnPicked })),
    attachments: []
  };
  order.documents.push(doc);
  order.status = "picked";
  logDocument(order, doc, input.date);
  return doc;
}

export interface DeliveryInput {
  number: string;
  date: string;
  courier: string;
  trackingNo: string;
}

export function createDeliveryNote(id: number, input: DeliveryInput): FulfillmentDoc | undefined {
  const order = getFulfillmentOrderById(id);
  if (!order || order.status !== "picked") return undefined;
  order.lines.forEach((line) => {
    line.quantityOnDelivery = line.quantityOnPicked;
  });
  const doc: FulfillmentDoc = {
    id: allocDocId(),
    kind: "delivery",
    number: input.number,
    date: input.date,
    courier: input.courier,
    trackingNo: input.trackingNo,
    completedByDocId: null,
    lines: order.lines.map((l) => ({ lineId: l.id, quantity: l.quantityOnDelivery })),
    attachments: []
  };
  order.documents.push(doc);
  order.status = "delivered";
  order.courier = input.courier;
  order.trackingNo = input.trackingNo;
  order.deliveryDate = input.date;
  logDocument(order, doc, input.date);
  return doc;
}

export interface ReceiptInput {
  number: string;
  date: string;
  /** Inbound only: the quantities that actually turned up, which can be short
   *  of what was ordered. Outbound receipts confirm what was already shipped,
   *  so they carry no quantities of their own. */
  quantities?: Record<number, number>;
}

/**
 * Closes the order. Outbound this is the customer's receipt note against a
 * delivery already in transit; inbound it is the goods arriving from the
 * vendor, which is the *whole* inbound lifecycle in one step.
 */
export function createReceiptNote(id: number, input: ReceiptInput): FulfillmentDoc | undefined {
  const order = getFulfillmentOrderById(id);
  if (!order) return undefined;
  const expected = order.direction === "inbound" ? "new_order" : "delivered";
  if (order.status !== expected) return undefined;

  order.lines.forEach((line) => {
    line.quantityOnCompleted =
      order.direction === "inbound"
        ? Math.min(line.quantity, input.quantities?.[line.id] ?? line.quantity)
        : line.quantityOnDelivery;
  });

  const doc: FulfillmentDoc = {
    id: allocDocId(),
    kind: "receipt",
    number: input.number,
    date: input.date,
    courier: "",
    trackingNo: "",
    completedByDocId: null,
    lines: order.lines.map((l) => ({ lineId: l.id, quantity: l.quantityOnCompleted })),
    attachments: []
  };
  order.documents.push(doc);

  const delivery = [...order.documents].reverse().find((d) => d.kind === "delivery");
  if (delivery) delivery.completedByDocId = doc.id;

  order.status = "completed";
  order.receiveDate = input.date;
  const totals = orderTotals(order);
  order.completedPartially = totals.completed < totals.ordered;
  logDocument(order, doc, input.date);
  return doc;
}

export function cancelFulfillment(
  id: number,
  reason: string,
  date: string
): FulfillmentOrder | undefined {
  const order = getFulfillmentOrderById(id);
  if (!order || !canCancel(order)) return undefined;
  const totals = orderTotals(order);
  order.status = "canceled";
  order.cancelDate = date;
  order.cancelReason = reason;
  order.completedPartiallyAndCanceled = totals.completed > 0;
  touch(order, date, "Fulfillment canceled", reason || "No reason given");
  return order;
}

/**
 * Whether a document can still be called off.
 *
 * Only the last step taken. Cancelling a picklist once a delivery slip has been
 * raised against it would leave the slip shipping goods nothing picked — so a
 * document is cancellable exactly while the order still sits at the stage that
 * document put it in. The source app expresses the same rule per page and per
 * field (`data?.delivery_date === null` on the picklist page,
 * `data?.receive_date === null` on the delivery page); one predicate over the
 * status says it once.
 */
export function canCancelDocument(order: FulfillmentOrder, doc: FulfillmentDoc): boolean {
  const stageItPutTheOrderIn: Record<FulfillmentDocKind, FulfillmentStatus> = {
    picklist: "picked",
    delivery: "delivered",
    receipt: "completed"
  };
  return order.status === stageItPutTheOrderIn[doc.kind];
}

/** The stage an order falls back to when `doc` is cancelled. */
function stageBefore(order: FulfillmentOrder, kind: FulfillmentDocKind): FulfillmentStatus {
  if (kind === "picklist") return "on_process";
  if (kind === "delivery") return "picked";
  // An inbound receipt IS the whole lifecycle, so undoing it goes all the way
  // back to a new order rather than to a delivery stage that never existed.
  return order.direction === "inbound" ? "new_order" : "delivered";
}

/**
 * Removes a document and rolls the order back to the stage before it, clearing
 * the quantities that document had moved.
 */
export function cancelDocument(docId: number, date: string): FulfillmentOrder | undefined {
  const found = getFulfillmentOrders()
    .map((order) => ({ order, doc: order.documents.find((d) => d.id === docId) }))
    .find((x) => x.doc);
  if (!found?.doc) return undefined;
  const { order, doc } = found;
  if (!canCancelDocument(order, doc)) return undefined;

  order.documents = order.documents.filter((d) => d.id !== docId);
  order.lines.forEach((line) => {
    if (doc.kind === "picklist") line.quantityOnPicked = 0;
    if (doc.kind === "delivery") line.quantityOnDelivery = 0;
    if (doc.kind === "receipt") line.quantityOnCompleted = 0;
  });
  if (doc.kind === "delivery") {
    order.courier = "";
    order.trackingNo = "";
    order.deliveryDate = null;
  }
  if (doc.kind === "receipt") {
    order.receiveDate = null;
    order.completedPartially = false;
    // The delivery slip this receipt closed is open again.
    const delivery = order.documents.find((d) => d.completedByDocId === docId);
    if (delivery) delivery.completedByDocId = null;
    if (order.direction === "inbound") {
      order.lines.forEach((line) => {
        line.quantityOnProcess = 0;
        line.quantityOnPicked = 0;
        line.quantityOnDelivery = 0;
      });
    }
  }
  order.status = stageBefore(order, doc.kind);
  touch(order, date, `${FULFILLMENT_DOC_LABEL[doc.kind]} canceled`, `${doc.number} removed`);
  return order;
}

/** Neighbour ids for the detail page's prev/next chevrons — scoped to the same
 *  board, in board order, matching `getAdjacentTransactionIds` in Sales. */
export function getAdjacentFulfillmentIds(id: number): {
  prevId: number | null;
  nextId: number | null;
} {
  const order = getFulfillmentOrderById(id);
  if (!order) return { prevId: null, nextId: null };
  const siblings = getFulfillmentOrdersByDirection(order.direction);
  const index = siblings.findIndex((o) => o.id === id);
  if (index === -1) return { prevId: null, nextId: null };
  return {
    prevId: siblings[index - 1]?.id ?? null,
    nextId: siblings[index + 1]?.id ?? null
  };
}

/** The next document number the drawers pre-fill, in the source app's
 *  `PL/2026/09/0001` shape. Counts existing documents of that kind across the
 *  whole dataset so two drawers open back-to-back don't propose the same
 *  number. */
export function nextDocumentNumber(kind: FulfillmentDocKind, date: string): string {
  const prefix = { picklist: "PL", delivery: "DS", receipt: "RN" }[kind];
  const used = getFulfillmentOrders()
    .flatMap((o) => o.documents)
    .filter((d) => d.kind === kind);
  const [year, month] = date.slice(0, 10).split("-");
  return `${prefix}/${year}/${month}/${pad(used.length + 1)}`;
}
