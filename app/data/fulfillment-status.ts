// Shared status vocabulary for the Fulfillment domain — the two kanban boards
// (app/pages/fulfillment/{sales,purchases}/index.vue) and the fulfillment-order
// detail pages. One label/type map so every screen reads the same status the
// same way — see docs/patterns/StatusBadge.md.
//
// Cloned from jurnal-frontend-app's `OutboundStatus` union
// (src/pages/outbounds/models/index.ts). Two of that union's members are
// dropped deliberately:
//
//   - `partially_completed_and_canceled` / `completed_partially_and_cancelled`
//     are two spellings of one concept in the source (a real bug there — the
//     board's badge map carries both keys and the API can return either). Here
//     it is a *flag* on the record (`completedPartiallyAndCanceled`), not a
//     status, because it describes what happened to the quantities, not which
//     stage the order sits in: a partially-completed-then-canceled order is
//     still, as far as the board is concerned, canceled.
//   - `partially_completed` likewise becomes `completedPartially`.
//
// Keeping them out of the status union is what lets `FULFILLMENT_BOARD_COLUMN`
// below be total: every status maps to exactly one column.

export type FulfillmentStatus =
  | "new_order"
  | "on_process"
  | "picked"
  | "delivered"
  | "completed"
  | "canceled";

// Two labels depart from the source app's English, both flagged here per the
// mekari-product-writing skill's "say which rule you depart from":
//
//   - `on_process` — the source reads "In process". "In progress" is the
//     approved status term in the Mekari copy library's badge table; there is
//     no reason to coin a second phrase for the same state.
//   - `delivered` — the source reads "On delivery", which in English says
//     "upon delivery" (a condition), not "out for delivery" (a stage). "In
//     transit" is what this column actually means.
export const FULFILLMENT_STATUS_LABEL: Record<FulfillmentStatus, string> = {
  new_order: "New order",
  on_process: "In progress",
  picked: "Picked",
  delivered: "In transit",
  completed: "Completed",
  canceled: "Canceled"
};

export const FULFILLMENT_STATUS_TYPE: Record<
  FulfillmentStatus,
  "completed" | "warning" | "critical" | "information" | "announcement"
> = {
  // An order nobody has touched yet is not a problem, just not started —
  // "information" is the neutral-but-live badge, same reading Sales gives
  // "open" (see app/data/sales-status.ts).
  new_order: "information",
  on_process: "warning",
  picked: "warning",
  delivered: "information",
  completed: "completed",
  // Not "critical": a canceled fulfillment is a decision someone made, not a
  // failure state the user has to act on. Grey, like Sales' "closed".
  canceled: "announcement"
};

/** The kanban columns an outbound (Sales) board shows, in order. */
export const OUTBOUND_COLUMNS = [
  "new_order",
  "on_process",
  "delivered",
  "completed",
  "canceled"
] as const;

/** The inbound (Purchases) board's columns. A purchase fulfillment has no
 *  picking or delivery stage of its own — the goods arrive and are received —
 *  so it is new → completed, with cancel as the escape. Matches the source
 *  app, whose inbound board renders exactly three kanban sections. */
export const INBOUND_COLUMNS = ["new_order", "completed", "canceled"] as const;

export type FulfillmentColumn = (typeof OUTBOUND_COLUMNS)[number];

/**
 * Which column a status is filed under.
 *
 * `picked` has no column of its own: an order that has a picklist but no
 * delivery slip yet is still, to anyone reading the board, "in process". The
 * source app's board makes the same choice (its five columns exclude `picked`)
 * — the distinction only matters on the detail page, where it decides which
 * action button comes next.
 */
export const FULFILLMENT_BOARD_COLUMN: Record<FulfillmentStatus, FulfillmentColumn> = {
  new_order: "new_order",
  on_process: "on_process",
  picked: "on_process",
  delivered: "delivered",
  completed: "completed",
  canceled: "canceled"
};

// No per-column background tint. The source app gives each kanban header its
// own wash (`blue.50`, `orange.50`, a hardcoded `#EAFAFB`, `green.50`,
// `gray.50`) and that reads well — but Pixel v2.1 ships only
// blue/gray/green/orange/red at the `.50` step (see docs/tokens.md §2). There
// is no `sky.50` and no `amber.50`, and Panda emits the class for a token that
// doesn't exist without warning, so the column would silently render with no
// background at all — the same silent-miss failure the `mt: 10` note in
// docs/tokens.md §3 documents.
//
// So the columns share one `gray.25` header and the *count badge* carries the
// stage colour instead, typed by FULFILLMENT_STATUS_TYPE above. That is an
// on-system signal (docs/patterns/StatusBadge.md) rather than five invented
// washes, and it says the same thing: where in the pipeline this column sits.
