# Index Page Format

> Composition recipe — **what goes where** on a list/index screen, and which
> pattern file owns each piece. For the full rationale + reference-impl
> walkthrough, see [`index-page-pattern.md`](../index-page-pattern.md).
> Reference impl: [`app/pages/templates/index-template.vue`](../../app/pages/templates/index-template.vue).

## When to use

Any **list / index** screen: browse, filter, sort, paginate, and act on a
collection of records (Products, Contacts, Invoices, …). Not for detail pages
([`details-page-format`](./details-page-format.md)), forms, or dashboards.

## Zone order

An index page is a single `<DefaultPageContent>` whose default slot stacks these
zones **in order**:

```
┌─ DefaultPageContent ──────────────────────────────────────────────┐
│  title  ............................  #actions (secondary + primary)│  ← page-title-bar
│  #tabs  (page-level tabs, flush to the stage)                       │  ← Tabs
├─ PageStage (white card) ───────────────────────────────────────────┤
│  [A] Summary boxes (KPI strip)                       optional       │  ← SummaryBox
│  [B] Content tabs (count badges)                     optional       │  ← Tabs
│  [C] Filter bar:  quick selects │ ......... │ Filter btn  search     │  ← FilterBar + Drawer
│  [D] Table  (container ▸ colgroup ▸ head ▸ body)  ── OR ── Blank     │  ← TablePage / BlankSlate
│  [E] Pagination footer                                              │  ← Pagination
└─────────────────────────────────────────────────────────────────────┘
```

## Zone → pattern map

| Zone | Piece                          | Pattern                                                                                                 | Optional?    |
| ---- | ------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------ |
| —    | Title + action row             | [`page-title-bar`](./page-title-bar.md)                                                                 | required     |
| —    | Page-level tabs (`#tabs`)      | [`Tabs`](./Tabs.md)                                                                                     | optional     |
| A    | Summary boxes                  | [`SummaryBox`](./SummaryBox.md)                                                                         | optional     |
| B    | Content tabs                   | [`Tabs`](./Tabs.md)                                                                                     | optional     |
| C    | Filter bar + drawer            | [`FilterBar`](./FilterBar.md), [`Drawer`](./Drawer.md)                                                  | required-ish |
| D    | Table (incl. bulk bar)         | [`TablePage`](./TablePage.md), [`BulkActionBar`](./BulkActionBar.md), [`StatusBadge`](./StatusBadge.md) | required     |
| D′   | Blank slate (table's `v-else`) | [`BlankSlate`](./BlankSlate.md)                                                                         | required     |
| E    | Pagination footer              | [`Pagination`](./Pagination.md)                                                                         | required     |

**Composition rule.** Exactly one `<DefaultPageContent>`. Zones render in the
order above. Zones A, B, and the KPI caption are optional. The table (D) and the
blank slate (D′) are **mutually exclusive** — the blank slate replaces the table
when nothing matches.

## State model (script contract)

`filteredRows` (a filter → sort pipeline over `rows`) is the **single source** the
table, pagination, and blank slate all read. Core reactive units:

| Unit                                        | Purpose                                |
| ------------------------------------------- | -------------------------------------- |
| `activePageTab`, `activeTab`                | page-level + content tab selection     |
| `isFilterDrawerOpen`                        | filter drawer open state               |
| `search`, `filterCategory`, `filterStatus`  | filter inputs (shared: quick + drawer) |
| `searchTerm` (computed)                     | normalized `(search ?? "").trim()`     |
| `page`, `perPage`                           | pagination                             |
| `selected` (`number[]`)                     | row selection → drives the bulk bar    |
| `sortKey`, `sortDir`                        | sort state                             |
| `isLoading`                                 | skeleton toggle                        |
| `filteredRows`, `pagedRows`, `pageCount`, … | derived data + paging                  |
| `isTableOverflowing` + `ResizeObserver`     | toggles the pinned-Actions divider     |

Full table + handler list: [`index-page-pattern.md` §12](../index-page-pattern.md).

## Build checklist

1. `<DefaultPageContent title="…">` + the `#actions` row; add `#tabs` only if the screen has sibling views.
2. (Optional) Summary-box grid + caption.
3. (Optional) Content tabs with count badges.
4. Filter bar: quick `MpSelect`s (left) + Filter-drawer button & search (right), all binding shared refs.
5. Filter drawer mirroring the filters; Apply closes, Reset clears.
6. Table: `columns`, `colWidths` (checkbox 44px + Actions 140px fixed, middle % summing to 100%), fixed-layout + sticky-actions + 1px-header classes, the overflow `ResizeObserver`, bulk row, skeleton rows.
7. Pagination footer.
8. Blank slate as the `v-else` — `<BlankSlate>` with adaptive variant + copy, no CTA.
9. Wire the state model; replace static `rows` with your data and flip `isLoading` around the fetch.
10. `pnpm lint` + `nuxt typecheck` clean; verify in the preview.
