// The Products list's advanced filter — its shape, its defaults, which fields
// each tab shows, and the one function that decides whether a row survives it.
//
// Ported from the four filter drawers in jurnal-frontend-app
// src/pages/products/: the product list's (category / type / keyword /
// show-archived), the stock-adjustment list's (transaction no. / date range /
// type / category / warehouse / tags), the approvals list's (keyword / date
// range / type / warehouse / tags) and the warehouse lists' (keyword only).
//
// It lives here, beside the data it filters, rather than inside either the list
// page or the drawer component, because BOTH need it and they need to agree
// exactly: the drawer edits a draft of this object, the page applies the
// committed one. A predicate duplicated across the two would drift the first
// time a field was added — the same reasoning as purchase-filter.ts.

import { dmyToIso } from "~/utils/dates";

/** The seven list tabs, across the three page-level segments. The keys are the
 *  source's own route names (`products/goods-services` → `products_and_services`
 *  etc.), kept verbatim so a reader can find the original screen. */
export type ProductsTabKey =
  | "products_and_services"
  | "masters"
  | "stock_adjustments"
  | "product_index_approval"
  | "warehouses"
  | "warehouse_transfers"
  | "warehouse_transfers_approval"
  | "price_rules";

export interface ProductsFilter {
  /** Keyword. Shared with the list's own search box — the two are one value,
   *  which is why the drawer seeds it from the page and hands it back. */
  key: string;
  /** Product category. "" is "all categories". */
  category: string;
  /** ProductType key, as a string so the filter object stays tab-agnostic. */
  productType: string;
  warehouse: string;
  /** AdjustmentType / ApprovalType key — the "Adjustment type" and
   *  "Transaction type" selects are the same field on different tabs, because
   *  no tab shows both. */
  transactionType: string;
  /** The adjustment's accounting category ("Stock opname", "Damaged goods"). */
  adjustmentCategory: string;
  /** PriceRuleType key. */
  ruleType: string;
  /** "active" | "inactive" | "" — used by Warehouse list and Price rules. */
  status: string;
  /** Both dates are DD/MM/YYYY, the format MpDatePicker emits. */
  startDate: string;
  endDate: string;
  tags: string[];
  /** `and` = must carry every selected tag; `or` = any one of them. */
  tagsLogic: "and" | "or";
  /** Archived products are hidden until this is on — the source's
   *  `filter-drawer.show-archived` switch. */
  showArchived: boolean;
}

export function emptyProductsFilter(): ProductsFilter {
  return {
    key: "",
    category: "",
    productType: "",
    warehouse: "",
    transactionType: "",
    adjustmentCategory: "",
    ruleType: "",
    status: "",
    startDate: "",
    endDate: "",
    tags: [],
    tagsLogic: "and",
    showArchived: false
  };
}

/** Whether anything is set — drives the dot on the list's Filter button.
 *  `showArchived` counts: it widens the result set rather than narrowing it,
 *  but it is still a setting the closed drawer hides, which is the whole point
 *  of the dot. */
export function isFilterActive(f: ProductsFilter): boolean {
  return Boolean(
    f.key ||
    f.category ||
    f.productType ||
    f.warehouse ||
    f.transactionType ||
    f.adjustmentCategory ||
    f.ruleType ||
    f.status ||
    f.startDate ||
    f.endDate ||
    f.tags.length ||
    f.showArchived
  );
}

/**
 * Which drawer fields a tab shows. A control that can only ever match nothing
 * is worse than an absent one — the user reads it as a broken filter — so each
 * tab lists only the fields its records actually carry. Same rule the Purchase
 * drawer follows, just declared as data here because there are eight tabs
 * rather than nine near-identical ones.
 */
export interface ProductsFilterFields {
  category?: boolean;
  productType?: boolean;
  warehouse?: boolean;
  transactionType?: boolean;
  adjustmentCategory?: boolean;
  ruleType?: boolean;
  status?: boolean;
  dateRange?: boolean;
  tags?: boolean;
  showArchived?: boolean;
}

export const FILTER_FIELDS_BY_TAB: Record<ProductsTabKey, ProductsFilterFields> = {
  // No warehouse or tag filter: this list has no `Warehouse` quick sense on
  // it (a product's stock spans warehouses, unlike a transaction), and its
  // tag set is thin enough that Keyword already covers it.
  products_and_services: {
    category: true,
    productType: true,
    showArchived: true
  },
  // A master has no stock of its own (its variants hold it), so no warehouse.
  masters: { category: true, tags: true, showArchived: true },
  stock_adjustments: {
    transactionType: true,
    adjustmentCategory: true,
    warehouse: true,
    dateRange: true,
    tags: true
  },
  product_index_approval: {
    transactionType: true,
    warehouse: true,
    dateRange: true,
    tags: true
  },
  // The source's warehouse list filters by keyword only; status is ours, and
  // it earns its place — the list carries inactive warehouses that otherwise
  // have no way to be isolated.
  warehouses: { status: true },
  warehouse_transfers: { warehouse: true, dateRange: true },
  warehouse_transfers_approval: { warehouse: true, dateRange: true },
  price_rules: { ruleType: true, status: true }
};

/**
 * The normalised shape the predicate reads. The list page builds one of these
 * per record, whatever entity it came from.
 *
 * Purchases could get away with a structural interface over its one record
 * type; here eight tabs hold eight different entities, so flattening the
 * keyword targets into `searchText` beats an interface of fifteen fields that
 * are the empty string on six tabs out of eight.
 */
export interface FilterableProductRow {
  /** Every value the keyword should match, already flattened by the page. */
  searchText: string[];
  category: string;
  productType: string;
  warehouse: string;
  transactionType: string;
  adjustmentCategory: string;
  ruleType: string;
  status: string;
  /** `YYYY-MM-DD`, or "" for a record with no date (a product, a warehouse). */
  dateSort: string;
  tags: string[];
  isArchived: boolean;
}

function withinDateRange(value: string, from: string, to: string): boolean {
  const start = dmyToIso(from);
  const end = dmyToIso(to);
  if (start && (!value || value < start)) return false;
  if (end && (!value || value > end)) return false;
  return true;
}

export function matchesProductsFilter(row: FilterableProductRow, f: ProductsFilter): boolean {
  const term = f.key.trim().toLowerCase();
  if (term && !row.searchText.some((text) => text.toLowerCase().includes(term))) return false;

  // Archived records stay hidden unless asked for. Checked before the field
  // filters so that ticking a category never surfaces an archived product the
  // user didn't ask to see.
  if (row.isArchived && !f.showArchived) return false;

  if (f.category && row.category !== f.category) return false;
  if (f.productType && row.productType !== f.productType) return false;
  if (f.warehouse && row.warehouse !== f.warehouse) return false;
  if (f.transactionType && row.transactionType !== f.transactionType) return false;
  if (f.adjustmentCategory && row.adjustmentCategory !== f.adjustmentCategory) return false;
  if (f.ruleType && row.ruleType !== f.ruleType) return false;
  if (f.status && row.status !== f.status) return false;
  if (!withinDateRange(row.dateSort, f.startDate, f.endDate)) return false;

  if (f.tags.length) {
    const matched =
      f.tagsLogic === "and"
        ? f.tags.every((t) => row.tags.includes(t))
        : f.tags.some((t) => row.tags.includes(t));
    if (!matched) return false;
  }
  return true;
}
