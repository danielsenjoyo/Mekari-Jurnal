# Form Page Format

> Composition recipe for a **create / edit** screen (New Purchase Invoice, Edit
> Invoice, …) — the third page archetype alongside
> [`index-page-format`](./index-page-format.md) and
> [`details-page-format`](./details-page-format.md).
> Reference impls: [`PurchaseTransactionForm.vue`](../../app/components/purchase/PurchaseTransactionForm.vue)
> (the money types — invoice / order / quote), plus
> [`PurchaseRequestForm.vue`](../../app/components/purchase/PurchaseRequestForm.vue),
> [`PurchaseDeliveryForm.vue`](../../app/components/purchase/PurchaseDeliveryForm.vue) and
> [`PurchaseJoinInvoiceForm.vue`](../../app/components/purchase/PurchaseJoinInvoiceForm.vue).
> Each is rendered by a `new.vue` + `edit/[id].vue` pair under its own route.
> Its layout was checked against a screenshot of the real Jurnal product's
> "Create Purchase Invoice" screen, with `jurnal-frontend-app`'s
> `src/pages/purchases/new_and_edit.vue` as the behavioural reference.
>
> This file covers the **page**. For field-level rules (which control for which
> need, `MpFormControl` wrapping, date pickers, gotchas) see
> [`Form`](./Form.md) — the two are meant to be read together.

## When to use

A screen whose whole job is **entering or amending one record**, with an explicit
commit at the end. Not for browsing ([`index-page-format`](./index-page-format.md)),
not for viewing ([`details-page-format`](./details-page-format.md)), and not for
a handful of fields inside a panel — that's a [`Drawer`](./Drawer.md) or a
[`Modal`](./Modal.md).

## Zone order

```
┌─ DefaultPageContent ──────────────────────────────────────────────┐
│  breadcrumb (List page)                                            │  ← page-title-bar
│  title  "{Verb} {Entity}"  ...............  #actions (type switch) │  ← page-title-bar
├─ PageStage (white card) ───────────────────────────────────────────┤
│  [A] Identity row: key party │ contact │ toggles │ running TOTAL   │
│  ─────────────────────────── dashed divider ───────────────────────│
│  [B] Meta grid — 4 cols (5 when a conditional column opens)        │  ← Form
│  [C] Document-wide switches (currency, price-includes-tax)         │
│  [D] Line-items table  (+ trailing "add" row)                      │  ← TablePage (editable)
│  [E] Notes + attachments (left ~25%) │ totals stack (right ~50%)   │
│  [F] Action bar — bottom RIGHT: Cancel · Save/Create ▾ · Alt-commit│
└─────────────────────────────────────────────────────────────────────┘
```

## Zone → pattern map

| Zone | Piece                               | Pattern                                                       | Optional?                 |
| ---- | ----------------------------------- | ------------------------------------------------------------- | ------------------------- |
| —    | Breadcrumb + title                  | [`page-title-bar`](./page-title-bar.md)                       | required                  |
| —    | `#actions` = **record-type switch** | [`page-title-bar`](./page-title-bar.md)                       | optional                  |
| A    | Identity row + running total        | [`Form`](./Form.md) fields, total as plain `MpText`           | required                  |
| B    | Meta grid                           | [`Form`](./Form.md)                                           | required                  |
| C    | Document-wide switches              | [`Form`](./Form.md) (`MpSelect` + `MpCheckbox`)               | optional                  |
| D    | Editable line items                 | [`TablePage`](./TablePage.md) (inputs in cells)               | when the record has lines |
| E    | Notes / attachments / totals        | [`Form`](./Form.md) + `MpUpload`                              | optional                  |
| F    | Action bar                          | Bottom action row (below) + [`Modal`](./Modal.md) for discard | required                  |

## Rules

- **One `<DefaultPageContent>`**, same shell as the other two archetypes.
- **One component serves both routes.** `new.vue` renders it bare; `edit/[id].vue`
  passes the record id. Everything that differs keys off a single
  `isEdit = computed(() => props.recordId != null)` — the title verb, the commit
  button set, and where Cancel returns to. Don't fork the page into two files
  that drift.
- **The commit buttons go at the BOTTOM RIGHT of the form body — not in the
  title band.** This is the rule most likely to be got wrong, because the
  details page puts its actions in `#actions`. On a form the title band instead
  holds the **record-type switch** ("Purchase Invoice ▾"), which changes what
  you're creating. Check the reference screen rather than assuming.
- **Title is `{Verb} {Entity}`** — "Create Purchase Invoice" / "Edit Purchase
  Invoice #14026". In edit mode name the actual record, so the user can tell
  which one they're changing.
- **A running total belongs in the identity row**, right-aligned, updating live.
  It is the one number the user checks constantly while filling the form; making
  them scroll to the totals block to see it is the wrong trade.
- **Dashed divider** (`<MpDivider variant="dashed">`) separates the identity row
  from the meta grid — same separator language as the details page.
- **Conditional columns, not conditional pages.** A toggle in the identity row
  (e.g. "Shipping info") expands the meta grid from 4 to 5 columns and reveals
  its fields in place. Don't push conditional fields into a second screen or a
  modal.
- **Totals stack order is fixed**, because it mirrors how the amount is actually
  derived: `Subtotal → per-line discount → transaction discount → tax rows →
shipping → ── divider ── → Total → withholding → deposit → ── divider ──
→ Balance due`. The two dashed dividers are what make it readable as three
  groups (what's charged / what it totals / what's owed).
- **Styling uses Panda `css()` with Pixel token shortcuts only** — no `<style>`
  blocks, no inline `style` (except genuinely dynamic values like a computed
  column width).

## One form per type, or one form for several?

Both, and the split is a judgement call worth making explicitly.

**Share one component** across types whose field sets differ only by
_presence_ — invoice, order and quote are the same document with a few zones
toggled, so they share `PurchaseTransactionForm.vue` and a `type` prop.

**Write a separate component** when the field set differs in _kind_. Request has
no money anywhere and adds requestor/urgency/budget-year; Delivery makes
shipping unconditional and drops pricing; Join Invoice has no line items at all
— its "items" are other invoice records. Forcing those through the shared form
would mean more branches than shared markup. This is the same split the
reference app makes, which is a good sign it's the natural seam.

**Drive the toggles from data, not from `v-if="type === 'x'"` scattered through
the template.** `TYPE_CAPABILITIES` in
[`purchase-transactions.ts`](../../app/data/purchase-transactions.ts) declares
what each type carries (`money`, `term`, `dueDateLabel`, `warehouse`,
`shipping`, `deposit`, `withholding`, …), and both the form _and_ the
create/update writers read it — so a type can never persist a value its own
screens never showed. A Request can't end up with a deposit.

**The type switcher navigates, it doesn't mutate.** Changing the type in the
title band goes to that type's own `/new` route rather than re-rendering the
current form: each type has different required fields, and carrying half-filled
state across produces a record that was never reviewed as that type. It's also
hidden entirely in edit mode — an existing record's type is fixed.

## Two layout rules the Purchase screenshots corrected

- **Keep one column rhythm down the whole page.** The meta grid uses the _same_
  `repeat(4, 1fr)` as the identity row above it, and simply leaves its unused
  columns empty — it does not re-divide the width among however many fields the
  section happens to have. Dropping to `repeat(3, 1fr)` because a section only
  has three columns of content makes every field ~33% wider than the ones above
  and runs the block to the right edge; the fields no longer line up vertically
  and the section reads as a different layout. Empty `<div />` cells are how a
  row stops early.
- **The meta grid is a flowing grid, not a row of stacked columns.** Fields fill
  left-to-right across the columns; they are not grouped into per-column `<div>`
  stacks. Getting this wrong is invisible at first — the same fields appear —
  but the reading order changes, so a field lands beside the wrong neighbour.
  Where the reference leaves a gap, emit an empty `<div />` spacer rather than
  reordering. Where two short fields sit under one another in the same column
  next to a taller one, wrap **that pair** in a single flex-column cell —
  auto-placement will otherwise push the second one into the free column beside
  the tall field.
- **The "add" picker belongs in the table's trailing row, not above the table.**
  Even when the thing being added is a whole record rather than a product line
  (Join Invoice picks invoices), the affordance is still the trailing row's
  first cell. A separate labelled picker above the table reads as a filter.

## When the lines aren't yours to add

Not every line-items table is built from scratch. A Purchase Return's rows are
whatever the invoice it credits already has, and the only editable figure per
row is _how many come back_. So that form has **no product picker and no
trailing add row** — the two affordances every other form here relies on.

- **Load the rows from the parent record, and cap each one.** The cap is the
  parent's quantity less whatever earlier children already consumed
  (`returnableQuantities`), so two returns can't send back more than was
  bought. Show the cap next to the field ("of 3") rather than only enforcing it
  on submit.
- **Surface an over-limit as its own message naming the line.** A generic
  "invalid" can't say _which_ product is over, and the number differs per row.
- **The parent is the entry point.** The reference app reaches this form from
  the invoice's Actions menu, passing the id in the query — there is no Return
  list tab, there or here. Add the reverse link on the parent (the invoice
  lists its returns) or the child is reachable only from the URL that created
  it.

## When the form has to balance before it saves

A landed cost lists expenses and then spreads them across the purchase's
products. It is only coherent when the two halves agree: every rupiah listed as
used has to land on a product. That makes it the first form here with a
**cross-table invariant**, and the rules it produced generalise to any form with
one.

- **Show the running figures, not just the verdict.** Total expense / Allocated
  / Remaining sit under the table, updating as you type. A form that only tells
  you the sum is wrong _after_ you press Save makes you hunt for the shortfall.
- **State the shortfall as an amount, not a condition.** The banner reads
  "Rp15.290,00 still to allocate", not "allocation must balance". The number is
  the thing the user has to act on.
- **Block the save, don't warn after it.** An unallocated remainder would
  silently drop out of the costing — there is no sensible record to write. This
  is the one place validation is about a _relationship between_ rows rather
  than a field, so it lives in `isValid` alongside the field checks and feeds
  the same `missingFields` banner (buttons still never disable — see
  [Validation](#validation)).
- **Give the arithmetic a shortcut.** "Distribute by value" splits the total in
  proportion to line value and puts the rounding difference on the last row.
  Without it, reaching exactly zero by hand is a chore the user has to do with
  a calculator, and rounding makes it sometimes impossible.
- **Derived columns stay read-only.** Landed unit price and Landed amount are
  computed from the one editable figure, by the same exported helpers the
  detail page and the store use (`landedUnitPrice` / `landedAmount`) — the
  shared-engine rule again.

## Editable line-items table

The table from [`TablePage`](./TablePage.md), with form controls in the cells.

- **The trailing placeholder row IS the add-line affordance.** Render one extra
  row below the real lines containing only the first field (the product picker);
  choosing a value there appends a real line and a fresh placeholder appears.
  No separate "Add line" button — that's the Jurnal pattern.
- **Every real row gets a `minus-circular` ghost icon button** in a narrow
  trailing column to remove it. The placeholder row does not.
- **Columns are proportional (`%`), not fixed px**, with a `min-width` floor on
  the table. Fixed px widths summing past the container silently push the
  trailing remove column out of view.
- **Size the money columns for real magnitudes.** With an `Rp` input addon
  eating width, IDR values clip easily — a column that renders `Rp 8.400.00(`
  is a correctness-perception bug, not a cosmetic one. Verify at your largest
  realistic value, not at the empty state. Same for the product picker: a
  `<select>` narrower than its longest option truncates two similar names to
  the same string. Measure it — `scrollWidth` doesn't report overflow on a
  `<select>`, so compare the option's rendered text width against the control's
  inner width instead.
- **Format numbers consistently across adjacent columns.** A raw `210000` in an
  editable Unit price beside a formatted `420.000,00` in Amount reads as two
  different currencies in the same row. Fix by editing a **grouped string**
  mirror of the numeric field (`unitPriceText` beside `unitPrice`) — and keep
  the two in sync wherever the number is set programmatically (catalogue
  lookup, loading an existing record).
- **Format the mirror on `focusout`, never on input.** `@update:model-value`
  should only re-parse the number; rewriting the text under the caret while the
  user types is what breaks a decimal format (see `page-recipes.md`). Bind
  `focusout` on a wrapping element — MpInput forwards neither `@blur` nor
  `@focusin`, but `focusout` bubbles.
- **A formatted input must use `v-model`, never `:model-value` + an update
  listener.** With `:model-value` MpInput is fully controlled and real
  keystrokes never land — the field looks editable and silently isn't. This
  passes a scripted `input`-event test (which sets `.value` directly) while
  being completely broken for a human, so verify formatted inputs by actually
  typing into them.

## Validation

- Wrap every field in `MpFormControl`; mark required ones `is-required` and bind
  `:is-invalid` to `submitted && !value` so errors appear only after a commit
  attempt, never while the user is still typing.
- **Never disable the commit button on validity.** If the submit button is
  `:is-disabled="!isValid"` _and_ the `submitted` flag is only set inside the
  submit handler, the error messages become unreachable: a disabled button can't
  fire the handler that would reveal what's missing, so the user just sees dead
  controls. (This exact dead end shipped and was caught in the Purchase audit.)
  **The pattern:** leave commit buttons always enabled; `onSubmit()` sets
  `submitted = true`, returns early when invalid, and the page shows both the
  per-field `MpFormErrorMessage`s _and_ a danger `MpBanner` naming what is
  outstanding — driven by a `missingFields` computed. The banner matters because
  some failures (e.g. "no line items") have no single field to mark red.
- Cancel from a dirty form should confirm via a [`Modal`](./Modal.md) before
  discarding.

## Persistence

- **One totals engine, shared.** The function that computes the on-screen totals
  must be the same one the create/update writer calls
  (`computeInvoiceTotals` in [`purchase-transactions.ts`](../../app/data/purchase-transactions.ts)).
  Two implementations will disagree the moment either changes, and the user sees
  one number and the record stores another.
- **Every control on screen should persist.** If a field can't be saved yet, it
  usually shouldn't be on the screen — say so explicitly in a comment when a
  control is deliberately display-only.
- Resolve UI conveniences at save time, not in storage: "Same as billing address"
  writes the resolved address, not a flag.

## Gotchas

- **`MpDatePicker`'s `value-type` accepts `date | string | timestamp`** — the
  `"format"` spelling carried over from the Vue-2 source app type-errors. Use
  `value-type="string"` with `format="DD/MM/YYYY"`, and `use-portal` inside a
  grid cell so the calendar isn't clipped.
- **Never round-trip a date through `Date` just to change its format.** Convert
  `DD/MM/YYYY` ↔ `yyyy-mm-dd` with string splitting; `Date#toISOString()` shifts
  the day in every non-UTC timezone.
- **Attachments use `MpUpload`, not `MpDropzone`** — `MpUpload` is the
  "Choose file" + inline placeholder control these forms use.
- A split commit button ("Create ▾") pairs a body button with a caret button;
  when an alternative primary commit exists beside it (e.g. "Save & pay"), the
  split button drops to **secondary** and the alternative takes primary. Two
  solid buttons side by side is the tell that this got missed.
- Native `<select>` (`MpSelect`) can't be driven by click-based automation —
  relevant when writing `flow.json` triggers for `/pixel-review`; use a
  `select-option:` step.

## Reference: Purchase module page map

Every page built in this module, and the archetype it follows.

| Route                                  | Archetype | Notes                                                          |
| -------------------------------------- | --------- | -------------------------------------------------------------- |
| `/purchase`                            | index     | 9 tabs, per-tab column sets, no per-row Actions column         |
| `/purchase/invoice/[id]`               | details   | The reference details impl — full totals + payment history     |
| `/purchase/order/[id]`                 | details   | + Fulfillment tag, linked-Delivery related table               |
| `/purchase/request/[id]`               | details   | No money columns; "Total items" card; Attachments              |
| `/purchase/quote/[id]`                 | details   | "Expiry date" label; no payment line ever                      |
| `/purchase/delivery/[id]`              | details   | No money at all; Edit + Preview + Create invoice               |
| `/purchase/join-invoice/[id]`          | details   | Lists other invoices, not line items; Edit only                |
| `/purchase/{invoice,order,quote}/new`  | **form**  | `PurchaseTransactionForm` + `type` prop                        |
| `…/{invoice,order,quote}/edit/[id]`    | **form**  | Same component, `:record-id` passed                            |
| `/purchase/request/new` + `edit/[id]`  | **form**  | `PurchaseRequestForm` — no money, requestor/urgency            |
| `/purchase/delivery/new` + `edit/[id]` | **form**  | `PurchaseDeliveryForm` — shipping intrinsic, shipping fee only |
| `/purchase/join-invoice/new` + `edit`  | **form**  | `PurchaseJoinInvoiceForm` — bundles invoice records            |
| `/purchase/return/[id]`                | details   | Credits one invoice; links back to it                          |
| `/purchase/return/new` + `edit/[id]`   | **form**  | `PurchaseReturnForm` — quantities off a chosen invoice         |
| `/purchase/landed-cost/[id]`           | details   | Two tables; no vendor/status; Delete + Edit                    |
| `/purchase/landed-cost/new` + `edit`   | **form**  | `LandedCostForm` — must balance to zero before saving          |

**Financing** is a list-only tab: the reference app has no detail or form route
for it either, so neither does this clone. `TYPE_CAPABILITIES.financing.route`
is `""` for exactly that reason.

## Reference: Products module page map

| Route                                       | Archetype | Notes                                                               |
| ------------------------------------------- | --------- | ------------------------------------------------------------------- |
| `/products`                                 | index     | 3 segments × 8 list tabs; `?tab=`/`?segment=` deep links            |
| `/products/detail/[id]`                     | details   | Tabs gated per product: bundle, batch, warehouse                    |
| `/products/new` + `/products/edit/[id]`     | **form**  | `ProductForm` — narrow column; two choices gate the rest (below)    |
| `/products/master/[id]`                     | details   | Variants are child rows, not links — they have no page of their own |
| `/products/master/new` + `master/edit/[id]` | **form**  | `ProductMasterForm` — rows generated, cells entered (below)         |
| `/products/[id]/batches/[batchId]`          | details   | Nested under its product; no batch list exists                      |
| `/products/convert/new` + `convert/[id]`    | **form**  | `ProductConversionForm` — lines come from the bundle, not a picker  |
| `/products/price-rules/new` + `edit/[id]`   | **form**  | `PriceRuleForm` — field set driven by `PRICE_RULE_SHAPE`            |
| `/products/warehouse/[id]`                  | details   | Products held, storage locations (drawer), movements                |
| `/products/warehouse/new` + `edit/[id]`     | **form**  | `WarehouseForm` — narrow column + an ordered storage-level table     |
| `/products/stock-adjustment/[id]`           | details   | Also serves the approval queue — see below                          |
| `/products/stock-adjustment/new` + `edit`   | **form**  | `StockAdjustmentForm` — `?type=` presets the adjustment type        |
| `/products/warehouse-transfer/[id]`         | details   | Also serves the approval queue; Clone opens the form pre-filled     |
| `/products/warehouse-transfer/new` + `edit` | **form**  | `WarehouseTransferForm` — `?from=` seeds a clone; per-line cap      |

Six rules this module added to the ones above:

- **Some forms are a narrow column, not a 4-column grid — check the reference
  screen.** `ProductForm` was matched to the real product's "Add new product"
  screen, and that screen stacks its short fields in one ~492px column with the
  image picker beside it; only the genuinely tabular blocks (inventory tracking,
  buying, selling, bundle components) run the page's full width. The
  [one column rhythm](#two-layout-rules-the-purchase-screenshots-corrected) rule
  still holds _within_ a form — it is the column count that is per-screen, not
  per-section. Three consequences worth copying:
  - **A choice that decides whether a whole section exists is asked with no
    default.** Product type (Single / Bundle) and Inventory tracking (Track /
    Untrack) each gate a block, so the form holds them as UI-level tri-states
    (`"" | …`) rather than the stored booleans. A defaulted boolean would let a
    product be saved on a decision nobody made — and would render Inventory
    tracking before the user has said which kind of product it applies to.
  - **A two-word option that needs a sentence of explanation is not an
    `MpSelect`.** Single / Bundle each carry a description line, so the control
    is an `MpAutocomplete` with a custom option row; a native `<option>` holds
    one line of text. `MpRadio`'s `#description` slot does the same job for
    Track / Untrack.
  - **Don't use `MpAccordion` for a panel that mounts already-open.**
    `MpCollapse` measures its content on mount; a section `v-if`'d in by another
    field mounts open and stays at `height: 0; visibility: hidden` while
    reporting `aria-expanded="true"`. A toggle button plus `v-show` has no
    measuring step to get wrong.

- **A tab is a destination, so a breadcrumb has to be able to name one.** Six
  of the eight lists here are tabs rather than routes, so every detail page's
  breadcrumb carries `?tab=`/`?segment=` and the index applies it once on
  mount. Without it "Back to Product with variant list" lands on Product list —
  a breadcrumb that names one place and goes to another. See
  [`Tabs`](./Tabs.md) for the `is-manual` prop this depends on.
- **Don't render a link where no detail page exists.** While only three of the
  eight tabs had a detail page, the index's first column was an `MpTextlink` on
  those three and plain text on the rest — gated on a `DETAIL_ROUTE_BY_TAB`
  lookup, so filling the gap later was a map entry rather than a template edit.
  A dead link is worse than no affordance, and "it will work once the next pass
  lands" is not a state to ship.
- **Generate the children when they ARE a function of the parent — then let the
  cells be edited.** A master's variants are the cartesian product of its
  attributes, so the *rows* are never authored: adding a colour to a master with
  four sizes produces four more rows, which is why the source resets the table
  whenever an attribute changes. What the user owns is what's *in* a row — SKU,
  barcode, and the two prices — and those must survive an attribute edit, so
  each row is keyed by its option values (`variantKey`) and matched back on
  every rebuild. Two consequences: the master has **no price field of its own**
  (Price & stock carries accounts and taxes only, and the master's headline
  figure is derived from the first row), and a blank cell falls back to a value
  derived from the master rather than saving empty — with the fallback shown as
  the field's placeholder, so it isn't a surprise after saving.
- **A record waiting for approval is the same record, so it gets the same
  page.** Stock adjustments and warehouse transfers each have an approval queue
  whose rows carry identical fields to the committed ones. Both routes look the
  id up in the committed list first and the queue second, then swap the badge,
  the breadcrumb and the bottom bar (Approve, instead of Edit + Delete). A
  second near-identical page per type would drift the first time either changed.
- **A form that records a movement has to move something.** Saving a stock
  adjustment writes each line's actual quantity back onto its product, so the
  count just taken is what the catalogue, the summary strip and the product's
  own page report a moment later. An adjustment screen that leaves stock
  untouched is theatre — and it is only applied on create here, because
  re-applying on edit would need the previous lines reversed first, and there is
  no ledger to reverse against.

**Nested-route gotcha** (bites all three archetypes): `pages/X.vue` next to
`pages/X/…` makes `X.vue` an implicit parent layout that must render
`<NuxtPage/>`. Put the list page at `pages/X/index.vue` instead — see
[`details-page-format`](./details-page-format.md#nested-route-gotcha).

## Changelog

- **v1.6.0** — `WarehouseForm` matched to its "Add new warehouse" screenshot:
  the same narrow field column, a capped multi-select for Person in charge
  (`MpInputTag` with suggestions and `max-tags`, which is how a "select several,
  up to N" field is built here), and a **Storage location** table whose rows are
  ordered levels — the row order IS the containment order, so levels append
  rather than insert, and the trailing picker spans the table because it is
  wider than the Level column it would otherwise sit in.
- **v1.5.0** — `ProductMasterForm` rebuilt against the "Add new product with
  variant" screenshot: three named sections (Main product / Price & stock /
  Product variant), the same narrow field column + image picker as
  `ProductForm`, accounts-and-taxes-only bands, and an editable variant table
  whose rows are still generated from the attributes. Master-level price and SKU
  fields are gone — both are per variant now.
- **v1.4.0** — `ProductForm` rebuilt against the real product's "Add new
  product" screenshots: a narrow field column beside the image picker rather
  than the 4-column meta grid, Product type and Inventory tracking as
  undefaulted gating choices, rich (label + description) options pinned to the
  trigger's width, a creatable unit/category, a Discount account on the selling
  band, and the `MpAccordion` mount-open trap recorded above.
- **v1.3.0** — Added Landed cost (details + form) and the
  "must balance before it saves" section: the first form here whose validity is
  a relationship between two tables rather than a property of a field. Its data
  lives in its own module (`app/data/purchase-landed-cost.ts`) rather than as a
  ninth `TransactionType`, because it has no vendor, status or due date — see
  the header comment there for the full reasoning.
- **v1.0.0** — Extracted from `PurchaseInvoiceForm.vue` after it was matched to
  the real product's Create Purchase Invoice screenshot. Documents the zone
  order, the bottom-right action bar (vs. the details page's `#actions`), the
  trailing-placeholder add-line pattern, the fixed totals-stack order, the
  shared-totals-engine rule, and the disabled-button/unreachable-validation dead
  end found in the Purchase design audit.
- **v1.2.0** — Added Purchase Return (details + form), and with it the
  "lines aren't yours to add" section: a form whose rows come from a parent
  record, capped by what that parent has left to give.
- **v1.1.3** — Recorded the one-column-rhythm rule: every section on a form
  shares the identity row's `repeat(4, 1fr)` and pads with empty cells, rather
  than re-dividing the width per section.
- **v1.1.2** — Money is `Rp10.016.640,00` module-wide (two decimals, no space
  after `Rp`). Editable money fields gained `parseAmount` and format on
  `focusout` only, since live-reformatting at two decimals makes incremental
  typing impossible.
- **v1.1.1** — Aligned the Join Invoice and Request create screens to their
  reference screenshots: flowing 3-column meta grids, the invoice picker moved
  into the table's trailing row, and Request's field set corrected (it opens
  with Procurement staff + Email and has no Requestor field at all — that
  exists only on the detail page).
- **v1.1.0** — Generalised from one invoice form to the whole module: the
  money types share `PurchaseTransactionForm` behind a `type` prop, while
  Request / Delivery / Join Invoice get their own components. Added the
  data-driven `TYPE_CAPABILITIES` map (read by both the forms and the writers),
  the navigate-don't-mutate rule for the type switcher, and the
  one-form-per-type-or-not guidance above.
- **v1.0.2** — Minor fixes: the Unit price cell now edits a grouped-string
  mirror so it matches the Amount beside it, with the `v-model` vs
  `:model-value` trap documented; horizontal scroll affordance added to the
  line-items container (see `TablePage`).
- **v1.0.1** — Validation section rewritten after the audit's Major fixes landed:
  commit buttons are never disabled, and an always-enabled submit surfaces both
  the field errors and a `missingFields` danger banner. Column-width guidance
  extended to the product `<select>` (whose overflow `scrollWidth` won't report).
