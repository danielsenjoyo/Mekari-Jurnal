// The records that hang off ONE product — what the product detail page shows
// below its info sections, plus the batch detail page and the product
// conversion pages.
//
// Split out of `products.ts` on the same reasoning as
// `purchase-landed-cost.ts`: that module is the catalogue (what a product IS,
// and the eight lists over it), this one is the movement history (what has
// HAPPENED to it). Nothing in the eight index tabs reads anything here, and
// nothing here is needed to render a list — so keeping them apart stops the
// catalogue module growing a second, unrelated half.
//
// Cloned from jurnal-frontend-app src/pages/products/detail/components/
// (product-transactions, warehouse-stock, batch-list) and
// src/pages/products/{batches,conversion}/.

import {
  WAREHOUSE_OPTIONS,
  getProductById,
  getProducts,
  type BundleItem,
  type Product
} from "~/data/products";
import { toLocalIsoDate } from "~/utils/dates";

function dateAt(daysFromToday: number): string {
  const d = new Date(2026, 8, 2);
  d.setDate(d.getDate() + daysFromToday);
  return toLocalIsoDate(d);
}

// ---------------------------------------------------------------------------
// Warehouse stock — the detail page's "Warehouse info" tab
// ---------------------------------------------------------------------------

export interface WarehouseStockRow {
  warehouse: string;
  onHand: number;
  available: number;
}

/**
 * How one product's stock is split across warehouses.
 *
 * **Derived, not stored.** A product already carries its total `quantity` and
 * its home `warehouse`; a stored per-warehouse breakdown would be a second
 * source for the same number, free to disagree with the total shown two
 * sections above it. So the split is computed from the total and always adds
 * back up to it — the home warehouse holds the bulk, one neighbour holds the
 * rest, and a product with no stock has no rows at all.
 */
export function getWarehouseStock(product: Product): WarehouseStockRow[] {
  if (!product.trackInventory || product.quantity === null || product.quantity === 0) return [];

  const home = product.warehouse || WAREHOUSE_OPTIONS[0]!;
  const neighbour = WAREHOUSE_OPTIONS.find((w) => w !== home) ?? home;
  const total = product.quantity;
  const available = product.quantityAvailable ?? total;

  // Everything sits in one warehouse below this; splitting 3 units across two
  // sites would read as noise rather than as a real distribution.
  if (total < 10) return [{ warehouse: home, onHand: total, available }];

  const atNeighbour = Math.round(total * 0.3);
  const atHome = total - atNeighbour;
  const committed = total - available;
  // The commitment lands on the home warehouse first, since that is where
  // fulfilment picks from.
  const homeAvailable = Math.max(0, atHome - committed);
  return [
    { warehouse: home, onHand: atHome, available: homeAvailable },
    {
      warehouse: neighbour,
      onHand: atNeighbour,
      available: Math.max(0, available - homeAvailable)
    }
  ];
}

// ---------------------------------------------------------------------------
// Product transactions — the detail page's first tab
// ---------------------------------------------------------------------------

export type ProductTransactionType =
  | "purchase_invoice"
  | "sales_invoice"
  | "stock_adjustment"
  | "warehouse_transfer"
  | "product_conversion";

export const PRODUCT_TRANSACTION_TYPE_LABEL: Record<ProductTransactionType, string> = {
  purchase_invoice: "Purchase Invoice",
  sales_invoice: "Sales Invoice",
  stock_adjustment: "Stock Adjustment",
  warehouse_transfer: "Warehouse Transfer",
  product_conversion: "Product Conversion"
};

export interface ProductTransaction {
  id: number;
  date: string;
  number: string;
  type: ProductTransactionType;
  warehouse: string;
  /** Signed: positive is stock in, negative is stock out. Rendered with an
   *  explicit `+`/`−` rather than a colour alone — a red number and a green
   *  number are the same number to anyone who can't separate the two. */
  quantityChange: number;
  /** Stock on hand immediately after this movement. */
  balance: number;
}

/** Which movements a product has seen, newest first.
 *
 *  Generated per product rather than stored: the shape is what the page is
 *  demonstrating, and twenty hand-written histories that don't reconcile with
 *  their product's current stock would be worse than none. The running
 *  `balance` walks backwards from the product's real `quantity`, so the newest
 *  row always equals the figure in the info section above it. */
export function getProductTransactions(product: Product): ProductTransaction[] {
  if (!product.trackInventory || product.quantity === null) return [];

  const movements: { type: ProductTransactionType; change: number; dayOffset: number }[] = [
    {
      type: "purchase_invoice",
      change: Math.max(1, Math.round(product.quantity * 0.25)),
      dayOffset: -6
    },
    {
      type: "sales_invoice",
      change: -Math.max(1, Math.round(product.quantity * 0.12)),
      dayOffset: -14
    },
    {
      type: "stock_adjustment",
      change: Math.max(1, Math.round(product.quantity * 0.05)),
      dayOffset: -23
    },
    {
      type: "warehouse_transfer",
      change: -Math.max(1, Math.round(product.quantity * 0.08)),
      dayOffset: -35
    },
    {
      type: "purchase_invoice",
      change: Math.max(1, Math.round(product.quantity * 0.4)),
      dayOffset: -52
    }
  ];

  let balance = product.quantity;
  return movements.map((movement, index) => {
    const row: ProductTransaction = {
      id: product.id * 1000 + index,
      date: dateAt(movement.dayOffset),
      number: transactionNumber(movement.type, product.id * 1000 + index),
      type: movement.type,
      warehouse: product.warehouse || WAREHOUSE_OPTIONS[0]!,
      quantityChange: movement.change,
      balance
    };
    // The NEXT (older) row's balance is this one's less what this one added.
    balance -= movement.change;
    return row;
  });
}

const TRANSACTION_NUMBER_PREFIX: Record<ProductTransactionType, string> = {
  purchase_invoice: "PI",
  sales_invoice: "SI",
  stock_adjustment: "ADJ",
  warehouse_transfer: "WT",
  product_conversion: "CNV"
};

function transactionNumber(type: ProductTransactionType, seed: number): string {
  return `${TRANSACTION_NUMBER_PREFIX[type]}/2026/${String((seed % 9) + 1).padStart(2, "0")}/${String(seed % 9999).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// Batches — the detail page's "Batch info" tab, and the batch detail page
// ---------------------------------------------------------------------------

export interface ProductBatch {
  id: number;
  productId: number;
  /** The batch number the user reads and searches by. */
  number: string;
  /** `YYYY-MM-DD`, or "" for a batch with no expiry. */
  expirationDate: string;
  description: string;
  onHand: number;
  available: number;
  isArchived: boolean;
}

// Only products with `inventoryTracking === "batch"` have these — the tab and
// the route are both gated on that, so a batch can never belong to a product
// that doesn't track them.
const BATCHES: ProductBatch[] = [
  {
    id: 5001,
    productId: 5,
    number: "BATCH-RSN-2609",
    expirationDate: dateAt(280),
    description: "Intake 12 Aug, supplier Kimia Nusantara",
    onHand: 26,
    available: 18,
    isArchived: false
  },
  {
    id: 5002,
    productId: 5,
    number: "BATCH-RSN-2607",
    expirationDate: dateAt(96),
    description: "Intake 3 Jul, supplier Kimia Nusantara",
    onHand: 16,
    available: 12,
    isArchived: false
  },
  {
    id: 5003,
    productId: 5,
    number: "BATCH-RSN-2604",
    expirationDate: dateAt(-12),
    description: "Kedaluwarsa, menunggu pemusnahan",
    onHand: 0,
    available: 0,
    isArchived: true
  },
  {
    id: 6001,
    productId: 6,
    number: "BATCH-PGM-2608",
    expirationDate: dateAt(430),
    description: "Intake 20 Aug, supplier Warna Prima",
    onHand: 74,
    available: 74,
    isArchived: false
  },
  {
    id: 6002,
    productId: 6,
    number: "BATCH-PGM-2605",
    expirationDate: dateAt(210),
    description: "Intake 14 May, supplier Warna Prima",
    onHand: 44,
    available: 44,
    isArchived: false
  }
];

export function getBatchesForProduct(productId: number): ProductBatch[] {
  return BATCHES.filter((batch) => batch.productId === productId);
}

export function getBatchById(productId: number, batchId: number): ProductBatch | undefined {
  return BATCHES.find((batch) => batch.id === batchId && batch.productId === productId);
}

/** A batch's own movement history — same shape as the product's, scaled to the
 *  batch. The batch detail page's first tab. */
export function getBatchTransactions(batch: ProductBatch): ProductTransaction[] {
  const product = getProductById(batch.productId);
  if (!product) return [];

  const movements: { type: ProductTransactionType; change: number; dayOffset: number }[] = [
    { type: "sales_invoice", change: -Math.max(1, Math.round(batch.onHand * 0.2)), dayOffset: -9 },
    {
      type: "stock_adjustment",
      change: -Math.max(1, Math.round(batch.onHand * 0.1)),
      dayOffset: -27
    },
    { type: "purchase_invoice", change: Math.max(1, batch.onHand), dayOffset: -48 }
  ];

  let balance = batch.onHand;
  return movements.map((movement, index) => {
    const row: ProductTransaction = {
      id: batch.id * 10 + index,
      date: dateAt(movement.dayOffset),
      number: transactionNumber(movement.type, batch.id * 10 + index),
      type: movement.type,
      warehouse: product.warehouse || WAREHOUSE_OPTIONS[0]!,
      quantityChange: movement.change,
      balance
    };
    balance -= movement.change;
    return row;
  });
}

/** How a batch's stock sits across warehouses — the batch page's second tab.
 *  Derived from the batch's own figures for the same reason the product-level
 *  split is (see `getWarehouseStock`). */
export function getBatchWarehouseStock(batch: ProductBatch): WarehouseStockRow[] {
  const product = getProductById(batch.productId);
  if (!product || batch.onHand === 0) return [];
  return [
    {
      warehouse: product.warehouse || WAREHOUSE_OPTIONS[0]!,
      onHand: batch.onHand,
      available: batch.available
    }
  ];
}

// ---------------------------------------------------------------------------
// Product conversion
// ---------------------------------------------------------------------------

/**
 * Converting a bundle breaks one parent product into its components (or the
 * reverse). The source's form asks for a qty, a date and a warehouse, then
 * shows the resulting components with an estimated cost each, plus optional
 * additional cost accounts — and the sum of all of it is the conversion's
 * total cost.
 */
export interface ConversionCostLine {
  /** An account name from BUY_ACCOUNT_OPTIONS, or a component's product name. */
  name: string;
  /** Cost per unit of the parent product converted. */
  costPerUnit: number;
  quantityPer: number;
}

export interface ProductConversion {
  id: number;
  number: string;
  date: string;
  warehouse: string;
  /** The bundle being broken up. */
  sourceProductId: number;
  sourceProductName: string;
  sourceUnit: string;
  quantity: number;
  /** The components produced, resolved from the source product's bundle items
   *  at the time of conversion. */
  results: ConversionCostLine[];
  /** Extra accounts charged into the conversion (packaging, labour, …). */
  additionalCosts: { account: string; amount: number }[];
}

const CONVERSIONS: ProductConversion[] = [
  {
    id: 9001,
    number: "CNV/2026/08/0001",
    date: dateAt(-21),
    warehouse: "Surabaya Hub",
    sourceProductId: 9,
    sourceProductName: "Paket Set Kantor Hemat",
    sourceUnit: "Set",
    quantity: 6,
    results: [
      { name: "Meja Kerja Minimalis 120cm", costPerUnit: 1_120_000, quantityPer: 1 },
      { name: "Kursi Kantor Ergonomis", costPerUnit: 1_640_000, quantityPer: 1 },
      { name: "Lampu Meja LED", costPerUnit: 218_000, quantityPer: 1 }
    ],
    additionalCosts: [{ account: "Operating Expense", amount: 180_000 }]
  }
];

let nextConversionId = 9002;

export function getConversions(): ProductConversion[] {
  return [...CONVERSIONS];
}

export function getConversionById(id: number): ProductConversion | undefined {
  return CONVERSIONS.find((conversion) => conversion.id === id);
}

/** Total cost of a conversion: every component's cost for the quantity
 *  converted, plus the flat additional costs.
 *
 *  **This is the shared engine** — the form's running total, the detail page's
 *  totals block and anything that writes a conversion all call it, so the
 *  number on screen and the number stored can't drift (see
 *  docs/patterns/form-page-format.md § Persistence). */
export function computeConversionTotal(
  quantity: number,
  results: ConversionCostLine[],
  additionalCosts: { account: string; amount: number }[]
): { componentTotal: number; additionalTotal: number; total: number; costPerUnit: number } {
  const componentTotal = results.reduce(
    (sum, line) => sum + line.costPerUnit * line.quantityPer * quantity,
    0
  );
  const additionalTotal = additionalCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const total = componentTotal + additionalTotal;
  return {
    componentTotal,
    additionalTotal,
    total,
    costPerUnit: quantity > 0 ? total / quantity : 0
  };
}

export interface ConversionInput {
  sourceProductId: number;
  quantity: number;
  date: string;
  warehouse: string;
  additionalCosts: { account: string; amount: number }[];
}

/** Turns a bundle's components into conversion result lines, priced at each
 *  component's current average cost — the same lookup the form does live, so
 *  what was reviewed on screen is what gets written. */
export function resultLinesForBundle(items: BundleItem[]): ConversionCostLine[] {
  return items.map((item) => {
    const component = getProductById(item.productId);
    return {
      name: item.name,
      // Average price is the costing figure; fall back to the bundle line's
      // own price for a component that has left the catalogue.
      costPerUnit: component?.avgPrice || item.price,
      quantityPer: item.quantity
    };
  });
}

/** One line of the "View journal entry" table: an account and which side of
 *  it this conversion posted to. Exactly one of `debit`/`credit` is non-zero,
 *  matching the source's table shape. */
export interface JournalEntryLine {
  account: string;
  debit: number;
  credit: number;
}

/**
 * The conversion's journal entry, derived from the record rather than stored —
 * there is no ledger in this prototype, so this is computed fresh from the
 * same fields the detail page's totals block reads, which is what keeps the
 * two from disagreeing.
 *
 * The posting: breaking a bundle apart moves value OUT of the source
 * product's inventory account and INTO each component's — a component looked
 * up by name against the current catalogue, falling back to the source's own
 * account for one that has since left it. Any additional cost (packaging,
 * labour, …) adds to the components' inventory the same way, paid out of the
 * account the conversion charged it to.
 *
 *   Debit  component inventory account   × componentTotal (one line each)
 *   Debit  source inventory account      × additionalTotal (the overhead landing in inventory)
 *   Credit source inventory account      × componentTotal (the bundle's value leaving)
 *   Credit each additional-cost account  × its amount
 *
 * Debits and credits both sum to `total` — see `computeConversionTotal`.
 */
export function computeConversionJournalEntries(conversion: ProductConversion): JournalEntryLine[] {
  const sourceAccount = getProductById(conversion.sourceProductId)?.inventoryAccount || "Inventory";
  const products = getProducts();

  const componentDebits: JournalEntryLine[] = conversion.results.map((line) => {
    const component = products.find((p) => p.name === line.name);
    return {
      account: component?.inventoryAccount || sourceAccount,
      debit: line.costPerUnit * line.quantityPer * conversion.quantity,
      credit: 0
    };
  });

  const additionalTotal = conversion.additionalCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const componentTotal = componentDebits.reduce((sum, line) => sum + line.debit, 0);

  return [
    ...componentDebits,
    // The overhead's other half — it lands in inventory alongside the
    // components, on the same account the bundle itself was carried in.
    ...(additionalTotal > 0 ? [{ account: sourceAccount, debit: additionalTotal, credit: 0 }] : []),
    { account: sourceAccount, debit: 0, credit: componentTotal },
    ...conversion.additionalCosts.map((cost) => ({
      account: cost.account,
      debit: 0,
      credit: cost.amount
    }))
  ];
}

export function createConversion(input: ConversionInput): ProductConversion {
  const source = getProductById(input.sourceProductId);
  const conversion: ProductConversion = {
    id: nextConversionId++,
    number: `CNV/2026/09/${String(CONVERSIONS.length + 2).padStart(4, "0")}`,
    date: input.date,
    warehouse: input.warehouse,
    sourceProductId: input.sourceProductId,
    sourceProductName: source?.name ?? "",
    sourceUnit: source?.unit ?? "",
    quantity: input.quantity,
    results: resultLinesForBundle(source?.bundleItems ?? []),
    additionalCosts: input.additionalCosts.filter((cost) => cost.account && cost.amount > 0)
  };
  CONVERSIONS.unshift(conversion);
  return conversion;
}
