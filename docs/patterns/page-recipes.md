# Page Recipes

> Quick lookup: **which patterns assemble which kind of page.** Start here, then
> open the linked pattern files. For the deep index-page walkthrough see
> [`index-page-pattern.md`](../index-page-pattern.md).

## Every page starts the same

One [`page-title-bar`](./page-title-bar.md) (via `DefaultPageContent`) → optional
page-level [`Tabs`](./Tabs.md) → the white `PageStage` body. The recipes below
only differ in what fills the stage.

## Recipe: Index / list page

> Browse + filter + paginate a collection. Full recipe: [`index-page-format`](./index-page-format.md).

`page-title-bar` → `Tabs` (page-level, optional) → **stage:** `SummaryBox` (opt) →
`Tabs` (content, opt) → `FilterBar` + `Drawer` → `TablePage` (+ `BulkActionBar`,
`StatusBadge`) **or** `BlankSlate` → `Pagination`.

## Recipe: Board page

> One collection, shown as the stages of a process. Full recipe:
> [`KanbanBoard`](./KanbanBoard.md).

`page-title-bar` → **stage:** `FilterBar` (quick filters + Reload + search) →
a row of status columns, each a header with a [`StatusBadge`](./StatusBadge.md)
count over a stack of link cards **or** one [`BlankSlate`](./BlankSlate.md) when
every column is empty.

**The one thing to get right:** don't reach for it. A board buys one glance at
the pipeline and pays for it with sorting, bulk actions and pagination — worth
it only when the status column is the user's actual question (Fulfillment), not
whenever records happen to have a status.

## Recipe: Details / single-record page

> View or edit one record. Full recipe: [`details-page-format`](./details-page-format.md).

`page-title-bar` (record name + lifecycle actions) → `Tabs` (sections, opt) →
**stage:** identity header (`StatusBadge`) → `SummaryBox` (opt) → `Form` (read/edit
sections) → compact `TablePage` (related lists) → `Modal` (destructive confirm).

## Recipe: Create / edit form page

> A focused data-entry screen. Full recipe: [`form-page-format`](./form-page-format.md).

`page-title-bar` (`{Verb} {Entity}`; `#actions` holds a **record-type switch**,
_not_ the save buttons) → **stage:** identity row + running total → meta grid →
editable line-items [`TablePage`](./TablePage.md) → notes/attachments + totals
stack → **bottom-right** action row (Cancel / Save ▾). Confirm discard-on-leave
via a [`Modal`](./Modal.md).

**The one thing to get right:** commit buttons live at the bottom of the form
body, not in the title band — the opposite of the details page.

## Recipe: Report page

> Compose a query, run it, read a table with totals. Full recipe:
> [`reports-page-format`](./reports-page-format.md).

`page-title-bar` (breadcrumb → /reports; `#actions` holds a column-layout
picker and Export) → **stage:** date range + period + `[Filter]` +
`[More filter]` → meta strip → [`TablePage`](./TablePage.md) + a TOTAL row
**or** [`BlankSlate`](./BlankSlate.md) → [`Pagination`](./Pagination.md).

**The one thing to get right:** the filter is **not** live. Two objects — the
one being edited and the one the table reads — and a Filter button that copies
one into the other. Wire it live and both the button and the "Report will
appear here" blank state stop meaning anything.

## Recipe: Catalog page

> A curated set of destinations, not records — nothing to filter, sort or
> paginate. Full recipe: [`reports-index-format`](./reports-index-format.md).

`page-title-bar` → `Tabs` (page-level, one per category) → **stage:** a
two-column grid of chrome-less entry cards (title + `MpBadge` → one-line
description → `MpButton variant="secondary"` CTA).

**The one thing to get right:** don't reach for the index-page machinery. No
`FilterBar`, no `TablePage`, no `Pagination`.

## Recipe: Settings page

> A list of settings groups or a single settings form.

`page-title-bar` → `Tabs` (settings sections, opt) → **stage:** either a
[`Form`](./Form.md) (single group) or a list of grouped controls. Reuse
[`TablePage`](./TablePage.md) only when the settings are genuinely tabular
(e.g. user/role lists, custom-field definitions).

## Cross-page rule: one format per value type, per module

Matching each screen to its own reference screenshot is right; letting each
screen pick its own **format** for the same value is not. Money and dates are
the two that drift, because a list, a detail page and a form each get built at
a different time against a different reference.

The Purchase audit found both drifting inside one module — `21 Aug 2026` on the
list versus `21/08/2026` on the detail page, and `Rp 1.810.965` on the detail
page versus `Rp9.024.000,00` in the form (different decimals _and_ different
spacing). Each was locally defensible and collectively wrong: the user compares
these values across screens.

**Rule.** Export one `formatCurrency` / `formatDate` from the module's data file
and import it everywhere. A page that genuinely needs a different presentation
should say why in a comment next to the call — not redefine the helper locally.

**Purchase settled on:** money `Rp10.016.640,00` (Indonesian convention — `.`
groups thousands, `,` separates two decimals, no space after `Rp`), and dates
`27 Aug 2026`. The bare-number variant used in table columns whose header
already says "Total" shares the same formatter, so grouping and decimals can't
drift between the two.

**Conversion drifts the same way display does — and more quietly.** The same
audit found `dmyToIso` copy-pasted into seven files in two versions: one padded
and validated, one did neither. So `1/7/2026` became `2026-7-1` in a form and
`""` in a filter, and `2026-7-1` sorts _after_ `2026-12-01` as a string. Nothing
looked wrong on screen. Date conversion now lives in one module,
[`app/utils/dates.ts`](../../app/utils/dates.ts) — `toDmy`, `dmyToIso`,
`isoToDmy`, `toLocalIsoDate`, `parseLocalIsoDate` and `DATE_INPUT_FORMAT`.
Import from there; never re-declare one locally, however small it looks.

**An editable money field is not a display.** It needs a matching `parseAmount`,
because `.` and `,` carry meaning — `210.000,50` is 210000.5, not 21000050. And
it must **not** reformat while the user types: at two decimals, live formatting
turns "1" into "1,00", after which the next keystroke gives "1,002", which
parses back to 1. Format on `focusout` only. Note `MpInput` forwards neither
`@focus`/`@blur` nor `@focusin` — but `focusout` bubbles, so bind it on a
wrapping element.

## Pattern index

| Pattern                                           | One-liner                                                  |
| ------------------------------------------------- | ---------------------------------------------------------- |
| [`page-title-bar`](./page-title-bar.md)           | Title + action row at the top of every page.               |
| [`Tabs`](./Tabs.md)                               | Page-level (flush to stage) vs. content tabs.              |
| [`SummaryBox`](./SummaryBox.md)                   | KPI strip of two-tone summary cards.                       |
| [`FilterBar`](./FilterBar.md)                     | Quick filters + search + Filter button.                    |
| [`Drawer`](./Drawer.md)                           | Right-side panel for the full filter set / form.           |
| [`TablePage`](./TablePage.md)                     | Fixed-layout table, sticky header + Actions.               |
| [`BulkActionBar`](./BulkActionBar.md)             | Header swap while rows are selected.                       |
| [`Pagination`](./Pagination.md)                   | Rows-per-page + page-jump footer.                          |
| [`StatusBadge`](./StatusBadge.md)                 | Domain status → `MpBadge type`.                            |
| [`BlankSlate`](./BlankSlate.md)                   | Empty state: empty table, empty section, record not found. |
| [`Form`](./Form.md)                               | `MpFormControl`-wrapped fields.                            |
| [`Modal`](./Modal.md)                             | Centred confirm / focused dialog.                          |
| [`KanbanBoard`](./KanbanBoard.md)                 | A collection as stages of one process.                     |
| [`index-page-format`](./index-page-format.md)     | Index-page zone composition.                               |
| [`details-page-format`](./details-page-format.md) | Details-page zone composition.                             |
| [`form-page-format`](./form-page-format.md)       | Create/edit form-page zone composition.                    |
