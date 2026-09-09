# Report page format

> A **report** screen: pick a date range and criteria, press a button, read a
> table with a TOTAL row. Looks like an index page and isn't one.
> Reference impl: [`app/pages/reports/purchases_list.vue`](../../app/pages/reports/purchases_list.vue)
> — the other twelve reports (four Purchases, eight Sales) are the same five
> components with different columns.
> Shared chrome: [`ReportFilterBar`](../../app/components/reports/ReportFilterBar.vue),
> [`ReportTable`](../../app/components/reports/ReportTable.vue),
> [`ReportPagination`](../../app/components/reports/ReportPagination.vue),
> [`ReportBlankSlate`](../../app/components/reports/ReportBlankSlate.vue),
> [`ReportExportButton`](../../app/components/reports/ReportExportButton.vue);
> shared data: [`report-column.ts`](../../app/data/report-column.ts),
> [`report-period.ts`](../../app/data/report-period.ts);
> shared state: [`useReportPaging`](../../app/composables/useReportPaging.ts).
> Per module — Purchases:
> [`PurchaseReportFilterDrawer`](../../app/components/reports/PurchaseReportFilterDrawer.vue),
> [`usePurchaseReport`](../../app/composables/usePurchaseReport.ts),
> [`purchase-report.ts`](../../app/data/purchase-report.ts),
> [`purchase-report-variants.ts`](../../app/data/purchase-report-variants.ts),
> [`purchase-report-filter.ts`](../../app/data/purchase-report-filter.ts);
> Sales: [`SalesReportFilterDrawer`](../../app/components/reports/SalesReportFilterDrawer.vue),
> [`useSalesReport`](../../app/composables/useSalesReport.ts),
> [`sales-report.ts`](../../app/data/sales-report.ts),
> [`sales-report-variants.ts`](../../app/data/sales-report-variants.ts),
> [`sales-report-filter.ts`](../../app/data/sales-report-filter.ts).
> See also [`index-page-format`](./index-page-format.md), [`TablePage`](./TablePage.md),
> [`Drawer`](./Drawer.md), [`reports-index-format`](./reports-index-format.md).

Ported from `jurnal-frontend-app` → `src/pages/reports/purchases_*` and
`src/pages/reports/sales_*`.

## Building one

A report page is columns, a row projection, and wiring. Everything else is
shared:

```vue
<ReportFilterBar v-model:start-date … :periods :is-valid :is-filter-active @run @open-drawer>
  <!-- optional: this report's own Sort by / Group by -->
</ReportFilterBar>
<PurchaseReportFilterDrawer :fields="[…]" … />
<!-- or SalesReportFilterDrawer -->
<ReportTable :columns :rows="pagedRows" :total-rows="filteredRows" :is-loading />
<ReportPagination v-model:page v-model:per-page … />
<ReportBlankSlate v-else :has-run :is-filter-active @clear />
```

`usePurchaseReport()` / `useSalesReport()` owns the two filter objects and the
run; `useReportPaging(filteredRows)` owns the footer. The page owns only
`filteredRows`.

**`ReportTable` is generic** (`generic="Row extends object"`), so the `#cell`
slot hands the page its _own_ row type rather than a `Record`. Override only the
cells that aren't plain text — links, badges, tag chips — and let the rest fall
through to the default.

## The five Purchases reports

| Report                    | Rows are                            | Notable                                         |
| ------------------------- | ----------------------------------- | ----------------------------------------------- |
| Purchase list             | one transaction                     | 3 column layouts (Template ▾), sortable headers |
| Purchase by vendor        | one **line item**, vendor-ordered   | Sort by vendor / total purchases                |
| Purchase delivery         | one delivery, or one delivered line | **Group by** switches columns _and_ row grain   |
| Purchase by product       | one **product**, aggregated         | Filter applies per transaction, not per row     |
| Purchase order completion | one order                           | Links order → its delivery                      |

## The eight Sales reports

The first five are the AR mirror of the table above, one for one — same five
shapes, same five components, `vendorName` → `customerName`. The last three
have no AP counterpart:

| Report                 | Rows are                            | Notable                                                        |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------- |
| Sales list             | one transaction                     | 3 column layouts (Template ▾), sortable headers, **Deposit**   |
| Sales by customer      | one **line item**, customer-ordered | Sort by customer / total sales                                 |
| Sales delivery         | one delivery, or one delivered line | **Group by** switches columns _and_ row grain                  |
| Sales by product       | one **product**, aggregated         | Filter applies per transaction, not per row                    |
| Sales order completion | one order                           | Links order → its delivery                                     |
| Product profitability  | one **product** sold, aggregated    | **Reads both ledgers** — sales for revenue, purchases for cost |
| Pro forma invoice list | one pro forma invoice               | The Sales list pinned to one type, minus Deposit               |
| Join invoice list      | one join invoice                    | Nine columns, not sixteen — see below                          |

### Two of them were built, not ported

Pro forma invoice list and Join invoice list have **no Vue page in
`jurnal-frontend-app`** — like Customer balance and Aged receivable, production
still renders them server-side. What their cards on the Reports index promise
("Shows all created proforma invoices in a certain period") is the Sales list
pinned to one transaction type, so that is what they are: same composable, same
drawer, `defaults: { transactionType }` and a column set of their own.

**Their column sets are trimmed to what the document actually carries**, which
is the whole reason they aren't literally `sales_list`. A join invoice has no
lines of its own — the generator sets its figures from the invoices it bundles
— so `taxAmount`, `amountReceived` and both discount fields stay at zero and
`subtotal` equals `total`. Offering the Sales list's sixteen columns would mean
six guaranteed `0,00`s and one duplicate of Total. It ships nine, including
**Invoices Bundled**, which is the only column that says anything the Sales
list couldn't.

When you pin a report to a type, walk `TYPE_CAPABILITIES` and the generator for
that type before choosing columns. The rule from § Gotchas scales: a column that
can never say anything is worse than no column, and a page of them is worse
still.

Two things are genuinely Sales', not a find-and-replace:

- **Deposit** (Detailed layout). A customer can pay a share of an invoice up
  front; every third invoice in the fixture carries one, so the column has
  something to say. Its AP counterpart doesn't exist.
- **Every transaction number is a link.** All eight Sales types have a detail
  page, so `SALES_TRANSACTION_ROUTE` is a total `Record` — where the Purchases
  map is `Partial`, because `financing` has no page and those numbers have to
  render as plain text.

And one omission worth naming: production's Sales order completion has a
**Start from: Order / Quote** selector that swaps the leading columns. A
quotation in this dataset carries no link to the order it became, so quote-first
would render a table whose Order, Invoice and Payment columns were empty on
every row — the same rule that dropped Payment from the Purchases version.

## The one report that reads both ledgers

Product profitability needs revenue _and_ cost, so it is the only report that
crosses modules: sales invoices give gross sales, and the Purchases ledger
gives the cost basis. Three decisions in
[`buildProfitabilityRows`](../../app/data/sales-report-variants.ts) are worth
knowing.

**COGS is the weighted average purchase price, not a costing engine.**
Production computes cost per sale from FIFO or moving-average inventory
valuation — which is why its page carries a recalculation banner. Here the cost
basis is the average unit price actually paid across every purchase invoice for
that product, which is also exactly what the report's own Avg Buy Price column
shows, so the two can never disagree. It lands below list price because
purchase lines carry discounts.

**The cost basis ignores the report's date range.** Stock sold this quarter was
generally bought before it, so a windowed cost basis would report 100% margin
on every product whose purchases fell outside the window.

**Margin is profit over revenue, not over cost** — something sold at twice its
cost is a 50% margin, not 100% — and the TOTAL row leaves that cell empty. The
report's overall margin is total profit over total gross sales, which is neither
the sum nor the average of the per-product margins; that's what
`format: "percent"` defaulting to `total: false` is for.

### The fixture has to have a margin in it

The two modules keep separate `PRODUCT_OPTIONS`: `sales-transactions.ts` is the
**sell-side** list, `purchase-transactions.ts` the **buy-side** one. They were
briefly identical — the company bought and sold everything at the same price —
and this report was a page of `0,00` and `0%`. The sales list now carries a
per-product markup of roughly 20–45%.

**If you edit either list, keep sell above buy, and keep the markups uneven.**
Equal prices make the report meaningless; one flat markup makes every row rank
the same, which is worse than it sounds for a report whose job is to say what to
sell more of.

### A report is a consistency check on its own fixture

Putting a module's records in a table with a TOTAL row surfaces things no
detail page does. Two defects in the Sales fixture were found this way, both
pre-dating the reports:

- **`discountPerLines` was hardcoded to `0`** while `buildLines()` was handing
  out 10% line discounts, so Gross Amount equalled the subtotal and Discount
  Amount read `0,00` on every row of a layout that offers the column. It is now
  the real gap between list value and what was charged.
- **A join invoice's status was independent of its balance**, because the
  linking pass overwrites the figures but left the generator's status alone —
  so the Join invoice list showed `Paid` rows carrying their full balance due.
  Status is now derived from the linked balance, except for `rejected` and
  awaiting-approval records, whose status describes where the document sits in
  the approval flow rather than what is owed on it.

Both were invisible until two columns sat next to each other. **When a new
report's numbers look wrong, suspect the fixture before the projection.**

## What is shared and what is mirrored

Two modules now build reports, so the line matters:

| Shared, one copy                                            | Mirrored per module                                    |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| The five `Report*` chrome components                        | The **filter drawer** — its criteria differ            |
| `report-column.ts` (`ReportColumn`, `ReportLayout`, totals) | `*-report.ts` — columns, layouts, route map            |
| `report-period.ts` — the 11 presets                         | `*-report-variants.ts` — the other four reports        |
| `useReportPaging`                                           | `*-report-filter.ts` + `use*Report` — the run contract |

The rule is the one [`sales-status.ts`](../../app/data/sales-status.ts) already
states: **anything a module could plausibly want to change on its own is
mirrored, not shared.** A column Sales adds must not reshape the Purchases
table.

**Periods are the reason `ReportFilterBar` takes a `periods` prop.** Each
module resolves the presets against its _own_ fixture "today"
(`buildReportPeriods(todayIsoDate)`), so the chrome is handed a list rather than
importing one — shared chrome reaching into one module's dataset to serve
another module's page is exactly the coupling this split exists to prevent.

## How it differs from an index page

Same table, different contract. Copying the index recipe wholesale gives you
three controls that don't belong and loses the two that matter.

| Index page                                 | Report page                                       |
| ------------------------------------------ | ------------------------------------------------- |
| Filters live — list re-renders as you type | **Runs on demand** — press Filter                 |
| Keyword search box                         | **No search** — narrowed by criteria, not by text |
| Row checkboxes + bulk bar                  | None — a report row isn't an actionable record    |
| Row `Actions` menu                         | None — the record's own page is one link away     |
| Rows are the data                          | Rows plus a **TOTAL** footer row                  |
| Fixed column set                           | **Column layout picker** ("template")             |

**The Filter button is the whole point.** A report is a query someone composes
and then submits — that's why the first thing on screen is "Report will appear
here" and not a table. Wire the filter live and both the button and that blank
state become lies.

## Composition

```
page-title-bar ("Purchase list", breadcrumb → /reports)
  #actions: [Template ▾] [Export ▾]
  → stage:
      filter bar:  Start date │ End date │ Period ▾ │ [Filter] │ [More filter •]
      meta strip:  "Purchase Invoice · Last month · 01/08/2026 – 31/08/2026 · IDR"
      table (+ TOTAL row)  ── OR ── blank slate
      pagination
```

**Filter bar.** One `flex-end` row, no `space-between`: the two dates, the
period select, then the two buttons. The buttons act on the controls beside
them, so they stay beside them. Date fields are **180px** — at 160 the
`DD/MM/YYYY` value clips behind `MpDatePicker`'s calendar addon.

**Template and Export** are page-scoped actions, not filters, so they sit in
the title band's `#actions` (production keeps them on the filter row). Export
is disabled until the report has been run — there is nothing to export before.

**Meta strip.** Transaction type · period · date range · currency, in one
`body-small / gray.600` line under the filter bar. It exists so an exported or
screenshotted table can be read on its own; it also gives the Filter button
visible feedback, since the criteria that produced the table are otherwise only
in the drawer.

## Two filter objects, never one

```ts
const filter = reactive<PurchaseReportFilter>(defaultPurchaseReportFilter()); // being edited
const applied = ref<PurchaseReportFilter | null>(null); // what the table reads
```

`filteredRows` reads **`applied`**, never `filter`. `runReport()` snapshots one
into the other. Collapsing them into a single ref re-runs the report on every
keystroke, which makes the Filter button and the "not run yet" blank state
meaningless.

`applied === null` **is** the "not run yet" state — no separate `hasRun` flag to
drift out of sync with it.

## The dot on More filter

`isReportFilterActive` deliberately **ignores the date range and transaction
type**: those two sit on the filter bar in plain sight. Only the drawer-only
criteria (vendor, status, tags, date-by) light the dot, because only those
vanish when the drawer closes. A dot that's always lit says nothing.

## Columns

`ReportColumn` (in [`report-column.ts`](../../app/data/report-column.ts))
carries a fixed px `width`, a `format`, and two derived behaviours worth
knowing:

- **`format`** — `money`, `number`, `percent`, `date`, or text. `money` uses the
  Purchases module's `formatAmount`; never hand-roll a formatter in a report.
  `percent` is a figure already out of 100, written to exactly one decimal so a
  column of them lines up (`18,0` under `19,5`, never `18`) — put the `%` in the
  column head, not the cell.
- **`align`** defaults to right for `money`, `number` and `percent`.
- **`total`** defaults to true for `money` only — a `percent` column therefore
  opts out by default. Override it in both
  directions: a **unit price** column is money but its sum is meaningless
  (`total: false`), and a **quantity** column is not money but its sum is the
  point (`total: true`). An **average** column never totals — an average of
  averages is not an average.

## Column layouts

Production persists per-company layouts and edits them in a builder; the
prototype ships three fixed sets (Standard / Detailed / Summary) in
`PURCHASE_REPORT_LAYOUTS`. Each column carries its own **px width**, and the
table's `min-width` is their sum — with a variable column set, percentages
summing to 100% (the index-page rule) can't work.

## The TOTAL row

Last row of `MpTableBody`, `semiBold`, with a `gray.300` top rule. First cell
reads `TOTAL`; every `numeric` column shows its sum.

**It sums every filtered row, not the current page** — that's what the number is
for. Production renders it only on the last page, which hides it entirely
unless you happen to navigate there.

## Two blank states

| Cause                | Title                                          | Body                                                    |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| Not run yet          | "Report will appear here"                      | "Select dates or period, then click the Filter button." |
| Ran, matched nothing | "There was no report data on this date/period" | "Recheck the filter or select another date/period."     |

Copy is verbatim from production. The second one gets a **Clear filters**
button when the drawer filter is active — same rule as
[`BlankSlate`](./BlankSlate.md): a staged drawer hides its own criteria, so an
empty table needs a visible way out.

## Rows come from the module, not a new fixture

`buildPurchaseReportRows()` projects
[`purchase-transactions.ts`](../../app/data/purchase-transactions.ts), and
`buildSalesReportRows()` projects
[`sales-transactions.ts`](../../app/data/sales-transactions.ts) — the same
arrays each module's list, detail and form pages read and write. A report over a
parallel fixture drifts from the module it reports on, and its money and date
formats drift with it (see [`page-recipes`](./page-recipes.md) § "one format per
value type, per module"). Derived figures like `grossAmount` are computed in the
projection rather than stored, so they can't disagree with the transaction.

**Default period is `this_quarter`, not production's `today`.** A real company
books transactions daily; this fixture spreads 13 records per type over ~5
weeks, so "Today" would return one row and demonstrate nothing.

## Aggregates filter per transaction, not per row

Purchase by product is one row per _product_, summed across many transactions.
Filtering the finished rows would keep or drop a whole product — a date range
would include a product's entire history or none of it. So the builder takes
the predicate and applies it while aggregating:

```ts
buildProductReportRows(type, (t) => matchesPurchaseReportFilter({ date: t.transactionDateSort, … }, f))
```

`matchesPurchaseReportFilter` reads a **structural** `FilterableReportRow`, not
one report's row type, precisely so all five can share it. A field a report
doesn't carry is absent, and its clause is skipped.
`matchesSalesReportFilter` / `FilterableSalesReportRow` is the same contract on
the Sales side, keyed by `customerName`.

## Regrouping must not change the total

Purchase delivery can group by transaction, vendor or product (Sales delivery:
transaction, customer or product). The first is
transaction-grained and the other two line-grained — and a transaction's
`total` carries tax that a sum of its line `amount`s does not. Using `t.total`
for the transaction grouping made the TOTAL row jump by the tax the moment the
reader switched grouping, which reads as a bug. All three now sum line values.

**Rule:** if a control regroups the same records, every grouping must reconcile
to the same figure.

## Gotchas

- **`formatDisplayDate` and `formatAmount` come from `purchase-transactions.ts`.** Never hand-roll a formatter here. `ReportTable` formats **both** modules' money and dates through those two — the one place shared chrome still reaches into a module. It is safe only because `sales-transactions.ts` defines them identically (same `id-ID` `MONEY_FORMAT`, same `21 Aug 2026` date); the moment either module's format diverges, this has to move out the way the periods did. See § What is shared and what is mirrored.
- The transaction-number link is only rendered for types that have a detail page — `financing` has none, so those Purchases rows show plain text rather than a link that 404s. Every Sales type has one, so Sales reports always link.
- A column that can never say anything is worse than no column. Order completion shipped without Payment and Balance Due: an `order` in this dataset carries no `amountReceived`, so one was always `0,00` and the other always equalled Order Amount.
- Column heads are **Title Case** ("Balance Due"), unlike the rest of the app. That's production's shared report dictionary, and reports are their own vocabulary in the product — don't sentence-case them to match other screens.
