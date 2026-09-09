// Shared status vocabulary for the Sales domain (index page tabs + detail
// pages). One label/type map so every screen reads the same status the same
// way — see docs/patterns/StatusBadge.md. Same vocabulary as
// app/data/purchase-status.ts (matches the legacy Sales module's own badge
// terms exactly), kept as its own file so Sales and Purchases stay
// independently editable.

export type SalesStatus =
  | "draft"
  | "open"
  | "overdue"
  | "paid"
  | "partial"
  | "unpaid"
  | "closed"
  | "partially_sent"
  | "rejected";

export const SALES_STATUS_LABEL: Record<SalesStatus, string> = {
  draft: "Draft",
  open: "Open",
  overdue: "Overdue",
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
  closed: "Closed",
  partially_sent: "Partially sent",
  rejected: "Rejected"
};

export const SALES_STATUS_TYPE: Record<
  SalesStatus,
  "completed" | "warning" | "critical" | "information" | "announcement"
> = {
  // Neutral grey: a draft is not a state anything has gone wrong in, it is
  // simply not live yet — "announcement" is Pixel's neutral badge type.
  draft: "announcement",
  open: "information",
  overdue: "critical",
  paid: "completed",
  partial: "warning",
  unpaid: "critical",
  closed: "announcement",
  partially_sent: "warning",
  rejected: "critical"
};
