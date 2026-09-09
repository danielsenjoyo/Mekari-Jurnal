# Reports index page format

> The **catalog page**: a tab bar of categories over a two-column grid of
> entries, where each entry is a title, a one-line description, and a CTA.
> Reference impl: [`app/pages/reports/index.vue`](../../app/pages/reports/index.vue) +
> [`ReportCard.vue`](../../app/components/reports/ReportCard.vue);
> data: [`app/data/reports.ts`](../../app/data/reports.ts).
> See also [`Tabs`](./Tabs.md), [`page-title-bar`](./page-title-bar.md),
> [`page-recipes`](./page-recipes.md).

Ported from `jurnal-frontend-app` → `src/pages/reports/index/`.

## When to use it

The stage holds a **fixed, curated set of destinations**, not records. Nothing
is filtered, sorted, selected or paginated, so none of the index-page
machinery applies — no `FilterBar`, no `TablePage`, no `Pagination`,
no `BulkActionBar`. Reports is the first instance;
[`other-lists/index.vue`](../../app/pages/other-lists/index.vue) is the
second — the same card shape, minus the tab bar (with only two entries, one
category is all there is). A future "all integrations" or "template gallery"
screen would use the same shape again.

## Composition

```
page-title-bar ("Reports")
  → page-level Tabs (#tabs slot — one per category)
    → stage: 2-column grid of entry cards
```

**Recipe**

- `DefaultPageContent` with no `title` prop — `/reports` is in `menu.ts`, so
  the band resolves "Reports" / "Laporan" from the menu itself.
- Page-level tabs go in the `#tabs` slot, per [`Tabs`](./Tabs.md).
- Grid: `repeat(2, minmax(0, 1fr))`, `columnGap: 12` / `rowGap: 8`, collapsing
  to one column under 1024px.

### A tab label is always one line

Multi-word categories ("Business overview", "Foreign exchange") wrap inside
their own tab by default. That doubles the height of the whole bar and leaves
every single-word label floating against a two-line neighbour. Three rules,
all in `tabsScrollClass`:

- `whiteSpace: nowrap` + `flexShrink: 0` on `.mp-tab` — each tab keeps its
  natural width instead of being squeezed into a wrap.
- `overflowX: auto` (scrollbar hidden) on `.mp-tab-list__list` — the overflow
  becomes a **sideways scroll**, never a second row. A wrapped row would also
  detach the active indicator from the stage edge.
- Scroll the selected tab into view on mount and on every change, so a deep
  link to a right-hand category (`?tab=tax`) doesn't land with its own tab
  off-screen. Production overlays a pair of chevron buttons for this; the
  scroll does the same job without the extra chrome. The initial call must be
  in `onMounted` — the tab watcher fires during setup, while the ref is null.

## The entry card

Not a bordered card — it is a **flex column with no chrome**, sitting directly
on the stage. Only the grid gutters separate entries.

| Row     | Content                                                                                   |
| ------- | ----------------------------------------------------------------------------------------- |
| Title   | `MpText size="h3" weight="semiBold" color="dark"` + optional badges                       |
| Body    | `MpText size="body-small" color="gray.600"` — one sentence, sentence case                 |
| Actions | `MpButton variant="secondary"` ("View report"), plus an optional `ghost` secondary action |

**Rules**

- `justifyContent: space-between` + `height: full` on the card, so every CTA in
  a row lines up however many lines the description takes.
- Badges are `MpBadge for="additionalInformation" size="sm"` — `type="critical"`
  for "New", `type="information"` for the Airene marker.
- A deprecated alternative version gets a second `variant="ghost"` button with
  `right-icon="info"` wrapped in an `MpTooltip` naming the sunset date. The
  tooltip is the only place that date appears.

## Copy and data

- Everything lives in `app/data/reports.ts` — tabs, entries, and the shared
  button/badge strings in `REPORT_SECTION_COPY`.
- English/Indonesian pairs follow the `menu.ts` convention (`label` /
  `labelId`), resolved with `tField` from `useLanguage`.

## Tab state in the URL

The open tab mirrors into `?tab=<id>` via `router.replace`, so a category is
linkable and survives a reload. The query carries the **tab id**
(`business_overview`), never its index — reordering the tabs must not change
what an old link opens.

## Where a card goes

Every card links to `/reports/<slug>`. A slug with a real page wins — Nuxt
prefers a static route over the dynamic one — so the thirteen built reports
(`purchases_list`, `purchases_by_vendor`, `purchases_delivery`,
`purchases_by_product`, `purchases_order_completion`, their Sales counterparts
`sales_list`, `sales_by_customer`, `sales_delivery`, `sales_by_product`,
`sales_order_completion`, plus `product_profitability`,
`proforma_invoice_list` and `merged_invoice_list`) resolve to their own pages,
built to [`reports-page-format`](./reports-page-format.md).

The Sales tab's two remaining stubs, `customer_balance` and `aged_receivable`,
have no page to port from either — and unlike the two invoice lists, neither is
the Sales list pinned to a type: both are balance-at-a-date reports, and aged
receivable needs 30/60/90/90+ bucketing that no screen here demonstrates yet.

Every other slug falls through to the stub
[`[report].vue`](../../app/pages/reports/%5Breport%5D.vue): a
`DefaultPageContent` titled from `reports.ts`, with a "Reports" breadcrumb and
an empty stage. An unknown slug 404s. Prefer this over a disabled button — the
grid stays legible, and the placeholder names the report the reader clicked.
Adding a real report page needs no change here: drop the file in beside the
stub and the card starts landing on it.
