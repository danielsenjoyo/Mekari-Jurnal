// Import and export definitions for the product list.
//
// Cloned from jurnal-frontend-app's `product-list.constants.ts` (the export
// property list and the import option list) plus the import modal's own
// per-type titles. They live together here because they describe the same
// thing from two directions: the columns a product file carries.
//
// Kept out of `products.ts` deliberately — that module is the record store, and
// these are two screens' worth of copy and column lists.

import type { Product } from "./products";
import { formatAmount, formatQuantity, PRODUCT_TYPE_LABEL } from "./products";

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/**
 * Which import this is.
 *
 * The first three are the product list's own Import menu (the source also has
 * `bundle-update`; it is hidden behind an unfinished flag there, its help
 * article still pointing at the bundle-create one, so it isn't offered here).
 * The last two belong to the Warehouses segment, whose list, transfer and
 * approval tabs each carry a plain Import button.
 */
export type ProductImportKind =
  | "single-create"
  | "single-update"
  | "bundle-create"
  | "warehouse-create"
  | "transfer-create";

/** The product list's Import menu, in the source's two groups. The warehouse
 *  tabs have one import each and so use a plain button, not a menu. */
export const IMPORT_GROUPS: {
  title: string;
  items: { kind: ProductImportKind; label: string }[];
}[] = [
  {
    title: "Single",
    items: [
      { kind: "single-create", label: "New products" },
      { kind: "single-update", label: "Update products" }
    ]
  },
  {
    title: "Bundle",
    items: [{ kind: "bundle-create", label: "Product bundle" }]
  }
];

export const IMPORT_TITLE: Record<ProductImportKind, string> = {
  "single-create": "Import new products",
  "single-update": "Update & import products",
  "bundle-create": "Import new bundles",
  "warehouse-create": "Import new warehouses",
  "transfer-create": "Import warehouse transfers"
};

export const IMPORT_TEMPLATE_FILE_NAME: Record<ProductImportKind, string> = {
  "single-create": "ProductsTemplateDefault.csv",
  "single-update": "ProductsUpdateTemplate.csv",
  "bundle-create": "ProductBundlesTemplate.csv",
  "warehouse-create": "WarehousesTemplate.csv",
  "transfer-create": "WarehouseTransfersTemplate.csv"
};

/**
 * The header row of each template.
 *
 * The update template leads with Product code because that is the column the
 * importer matches on — a row without it has nothing to update.
 */
export const IMPORT_TEMPLATE_COLUMNS: Record<ProductImportKind, string[]> = {
  "single-create": [
    "Product name",
    "Product code",
    "Barcode",
    "Product category",
    "Product type",
    "Description",
    "Unit",
    "Minimum stock",
    "Buy price",
    "Buy account",
    "Sell price",
    "Sell account",
    "Inventory account"
  ],
  "single-update": [
    "Product code",
    "Product name",
    "Barcode",
    "Product category",
    "Description",
    "Unit",
    "Minimum stock",
    "Buy price",
    "Sell price"
  ],
  "bundle-create": [
    "Bundle name",
    "Bundle code",
    "Product category",
    "Description",
    "Unit",
    "Sell price",
    "Component product code",
    "Component quantity"
  ],
  "warehouse-create": ["Warehouse code", "Warehouse name", "PIC", "Address", "Description"],
  // One row per line of the transfer, repeating the transfer's own columns —
  // the same flat-file shape the bundle export uses for a nested record.
  "transfer-create": ["Date", "From warehouse", "To warehouse", "Memo", "Product code", "Quantity"]
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** What the export menu offers. Bundles are their own file: a bundle's rows
 *  are its components, so they don't fit a one-row-per-product sheet. */
export type ProductExportKind = "products" | "bundles";

/**
 * One tickable column in the export modal.
 *
 * `isLocked` is the source's `disabled` flag: the product name identifies the
 * row, so a file without it is a spreadsheet of prices belonging to nobody.
 */
export interface ExportProperty {
  key: string;
  label: string;
  /** Ticked when the modal opens. */
  isDefault: boolean;
  isLocked?: boolean;
  value: (product: Product) => string | number;
}

/** Stock figures read "—" in a file the same way they do in the table: a zero
 *  would claim the product is out of stock when it simply isn't counted. */
function stockCell(value: number | null): string {
  return value === null ? "—" : formatQuantity(value);
}

export const EXPORT_PROPERTIES: ExportProperty[] = [
  {
    key: "name",
    label: "Product name",
    isDefault: true,
    isLocked: true,
    value: (p) => p.name
  },
  { key: "product_code", label: "Product code", isDefault: true, value: (p) => p.code },
  { key: "barcode", label: "Barcode", isDefault: true, value: (p) => p.barcode },
  { key: "category", label: "Product category", isDefault: true, value: (p) => p.category },
  {
    key: "type",
    label: "Product type",
    isDefault: false,
    value: (p) => PRODUCT_TYPE_LABEL[p.type]
  },
  {
    key: "description",
    label: "Product description",
    isDefault: false,
    value: (p) => p.description
  },
  { key: "unit", label: "Unit", isDefault: true, value: (p) => p.unit },
  { key: "stock_now", label: "Total stock", isDefault: true, value: (p) => stockCell(p.quantity) },
  {
    key: "stock_available",
    label: "Available qty",
    isDefault: false,
    value: (p) => stockCell(p.quantityAvailable)
  },
  { key: "minimum", label: "Minimum stock", isDefault: false, value: (p) => stockCell(p.buffer) },
  { key: "buy_price", label: "Buy price", isDefault: true, value: (p) => formatAmount(p.buyPrice) },
  {
    key: "last_buy_price",
    label: "Last buy price",
    isDefault: false,
    value: (p) => formatAmount(p.lastBuyPrice)
  },
  {
    key: "avg_price",
    label: "Average price",
    isDefault: false,
    value: (p) => formatAmount(p.avgPrice)
  },
  { key: "buy_tax", label: "Default buy tax", isDefault: false, value: (p) => p.buyTax || "—" },
  { key: "buy_account", label: "Buy account", isDefault: false, value: (p) => p.buyAccount || "—" },
  {
    key: "sell_price",
    label: "Sell price",
    isDefault: true,
    value: (p) => formatAmount(p.sellPrice)
  },
  { key: "sell_tax", label: "Default sell tax", isDefault: false, value: (p) => p.sellTax || "—" },
  {
    key: "sell_account",
    label: "Sell account",
    isDefault: false,
    value: (p) => p.sellAccount || "—"
  },
  {
    key: "inventory_account",
    label: "Inventory account",
    isDefault: false,
    value: (p) => p.inventoryAccount || "—"
  },
  { key: "warehouse", label: "Warehouse", isDefault: false, value: (p) => p.warehouse },
  { key: "tags", label: "Tags", isDefault: false, value: (p) => p.tags.join(", ") }
];

export const EXPORT_FILE_NAME: Record<ProductExportKind, string> = {
  products: "products.csv",
  bundles: "product-bundles.csv"
};

/** The bundle file's shape: one row per component, repeating the bundle's own
 *  columns, which is how a flat file represents a nested record. */
export const BUNDLE_EXPORT_COLUMNS = [
  "Bundle name",
  "Bundle code",
  "Product category",
  "Sell price",
  "Component product",
  "Component quantity"
];
