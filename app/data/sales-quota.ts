// Sales invoice quota (FUP) — the usage history behind
// app/pages/sales/quota-history.vue, and the remaining-quota figure the Sales
// list shows on its Invoice tab.
//
// Ported from jurnal-frontend-app src/pages/sales/quota_history/ plus the
// src/mixins/sales_quota it reads its summary from. A tenant gets a monthly
// allowance of invoices; creating one spends a unit, deleting one returns it,
// an import spends several at once, and quota can be topped up or reset.
//
// The summary is DERIVED from the history rather than stored beside it, so the
// three figures on the page can never drift from the rows underneath them.
import { getSalesTransactions, formatDate } from "./sales-transactions";
import { toLocalIsoDate } from "~/utils/dates";

export type QuotaAction =
  | "sales_invoice_creation"
  | "sales_invoice_deletion"
  | "sales_invoice_import"
  | "sales_invoice_additional_quota"
  | "sales_invoice_reset_quota"
  | "integration";

export const QUOTA_ACTION_LABEL: Record<QuotaAction, string> = {
  sales_invoice_creation: "Sales invoice creation",
  sales_invoice_deletion: "Sales invoice deletion",
  sales_invoice_import: "Sales invoice import",
  sales_invoice_additional_quota: "Quota addition",
  sales_invoice_reset_quota: "Quota reset",
  integration: "Integration"
};

/** Filter options, in the order the source page lists them. "" is All action. */
export const QUOTA_ACTION_OPTIONS: { value: QuotaAction | ""; label: string }[] = [
  { value: "", label: "All action" },
  { value: "sales_invoice_creation", label: QUOTA_ACTION_LABEL.sales_invoice_creation },
  { value: "sales_invoice_deletion", label: QUOTA_ACTION_LABEL.sales_invoice_deletion },
  { value: "sales_invoice_import", label: QUOTA_ACTION_LABEL.sales_invoice_import },
  {
    value: "sales_invoice_additional_quota",
    label: QUOTA_ACTION_LABEL.sales_invoice_additional_quota
  },
  { value: "sales_invoice_reset_quota", label: QUOTA_ACTION_LABEL.sales_invoice_reset_quota },
  { value: "integration", label: QUOTA_ACTION_LABEL.integration }
];

export interface QuotaUsageEntry {
  id: number;
  usageDate: string;
  usageDateSort: string;
  action: QuotaAction;
  transactionNo: string;
  /** Set when the row refers to a sales invoice still in the dataset, so the
   *  Transaction number cell can link to it. */
  transactionId: number | null;
  user: string;
  /** Negative spends quota, positive returns or adds it. */
  quotaChange: number;
}

/** The allowance every month starts with, before any top-up. */
export const MONTHLY_BASE_QUOTA = 100;

const USERS = ["Rizal Candra", "Dewi Lestari", "Budi Santoso", "Rina Wulandari"];

function dateAt(daysFromToday: number) {
  const d = new Date(2026, 8, 2); // "today" per session context: 2 Sep 2026
  d.setDate(d.getDate() + daysFromToday);
  return d;
}

function buildHistory(): QuotaUsageEntry[] {
  const invoices = getSalesTransactions().filter((t) => t.type === "invoice");
  const entries: QuotaUsageEntry[] = [];
  let seq = 0;

  // The month opens with its reset — the source app's own first row.
  const resetDate = dateAt(-30);
  entries.push({
    id: ++seq,
    usageDate: formatDate(resetDate),
    usageDateSort: toLocalIsoDate(resetDate),
    action: "sales_invoice_reset_quota",
    transactionNo: "—",
    transactionId: null,
    user: "System",
    quotaChange: 0
  });

  // One row per invoice that exists, each having spent a unit when it was made.
  invoices.forEach((invoice, i) => {
    const date = dateAt(-28 + i * 2);
    entries.push({
      id: ++seq,
      usageDate: formatDate(date),
      usageDateSort: toLocalIsoDate(date),
      action: "sales_invoice_creation",
      transactionNo: invoice.number,
      transactionId: invoice.id,
      user: USERS[i % USERS.length]!,
      quotaChange: -1
    });
  });

  // A handful of the other things that move quota, spread across the month.
  const extras: { offset: number; action: QuotaAction; change: number; no: string }[] = [
    { offset: -22, action: "sales_invoice_import", change: -12, no: "Import batch #0041" },
    { offset: -17, action: "integration", change: -3, no: "Shopee integration" },
    { offset: -12, action: "sales_invoice_deletion", change: 1, no: "Sales Invoice #24031" },
    { offset: -9, action: "sales_invoice_additional_quota", change: 50, no: "—" },
    { offset: -4, action: "sales_invoice_import", change: -6, no: "Import batch #0042" }
  ];
  extras.forEach((extra, i) => {
    const date = dateAt(extra.offset);
    entries.push({
      id: ++seq,
      usageDate: formatDate(date),
      usageDateSort: toLocalIsoDate(date),
      action: extra.action,
      transactionNo: extra.no,
      transactionId: null,
      user: extra.action === "integration" ? "System" : USERS[i % USERS.length]!,
      quotaChange: extra.change
    });
  });

  // Newest first, as the page opens.
  return entries.sort((a, b) => b.usageDateSort.localeCompare(a.usageDateSort));
}

let cache: QuotaUsageEntry[] | null = null;

export function getQuotaHistory(): QuotaUsageEntry[] {
  if (!cache) cache = buildHistory();
  return cache;
}

export interface QuotaSummary {
  total: number;
  used: number;
  remaining: number;
  /** How much of the allowance is gone, 0-100 — drives the list's indicator. */
  usagePercentage: number;
}

/** Derived from the history, never stored: the page's three figures and the
 *  rows beneath them are then guaranteed to agree. */
export function getQuotaSummary(): QuotaSummary {
  const history = getQuotaHistory();
  const added = history
    .filter((e) => e.action === "sales_invoice_additional_quota")
    .reduce((sum, e) => sum + e.quotaChange, 0);
  const total = MONTHLY_BASE_QUOTA + added;
  // Everything that isn't a top-up nets off against the allowance; a deletion
  // hands its unit back, which is why this sums signed changes rather than
  // counting rows.
  const net = history
    .filter((e) => e.action !== "sales_invoice_additional_quota")
    .reduce((sum, e) => sum + e.quotaChange, 0);
  const used = Math.max(0, -net);
  const remaining = Math.max(0, total - used);
  return {
    total,
    used,
    remaining,
    usagePercentage: total === 0 ? 100 : Math.round((used / total) * 100)
  };
}

/** Tops the allowance up — the page's "Add quota" button. A real screen would
 *  take payment first; here it simply records the addition. */
export function addQuota(amount: number, user = "Rizal Candra"): QuotaUsageEntry | undefined {
  if (amount <= 0) return undefined;
  const history = getQuotaHistory();
  const today = dateAt(0);
  const entry: QuotaUsageEntry = {
    id: history.reduce((max, e) => Math.max(max, e.id), 0) + 1,
    usageDate: formatDate(today),
    usageDateSort: toLocalIsoDate(today),
    action: "sales_invoice_additional_quota",
    transactionNo: "—",
    transactionId: null,
    user,
    quotaChange: amount
  };
  history.unshift(entry);
  return entry;
}
