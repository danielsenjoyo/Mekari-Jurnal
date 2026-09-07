# Mekari Jurnal — Index Page Construction Pattern

> Living document. The canonical reference implementation is
> [`app/pages/templates/index-template.vue`](../app/pages/templates/index-template.vue).
> Treat that file as the source of truth and this doc as the **rules + rationale**
> for reproducing it. Pair with [`design.md`](./design.md) (the shell: header,
> sidebar, page title, page stage) and [`tokens.md`](./tokens.md) (raw values).

**Token mode:** Pixel 3 — Design Tokens **v2.1** (`app/app.vue` → `setNextTheme(false)`).
**Components:** all Pixel primitives import from `@mekari/pixel3`.
**Styling:** page-body styling uses Panda **`css()`** with **Pixel token shortcuts**
(e.g. `gap: 4`, `bg: "gray.25"`) — _not_ the project `--color-*`/`--spacing-*`
tokens that `design.md` uses for the shell's scoped CSS. Don't mix the two.

---

## 1. When to use

Use this pattern for any **list / index screen**: a page whose job is to browse,
filter, sort, paginate, and act on a collection of records (Products, Contacts,
Invoices, …). It is _not_ for detail pages, forms, dashboards, or wizards.

---

## 2. Anatomy

An index page is a single `<DefaultPageContent>` (which supplies the title band +
white stage from `design.md`) whose default slot stacks these zones **in order**:

```
┌─ DefaultPageContent ──────────────────────────────────────────────┐
│  title  ............................  #actions (secondary + primary)│  ← title band (shell)
│  #tabs  (page-level tabs, flush to the stage)                       │  ← gray shell
├─ PageStage (white card) ───────────────────────────────────────────┤
│  [A] Summary boxes (KPI strip)                       ............... │  optional
│      caption                                                        │  optional
│  [B] Content tabs (count badges)                                    │  optional
│  [C] Filter bar:  quick selects │ ........... │ Filter btn  search   │
│  [D] Table  (container ▸ colgroup ▸ head ▸ body)   ── OR ── Empty    │
│  [E] Pagination footer                                              │
│                                                                     │
│  (overlay) Filter drawer  ·  (overlay) row/bulk popover menus       │
└─────────────────────────────────────────────────────────────────────┘
```

**Rule — composition.** Exactly one `<DefaultPageContent>`. Zones render in the
order above. Zones A, B, and the KPI caption are **optional** (omit on pages with
no KPIs / no sub-tabs). The table (D) and empty state (I) are mutually exclusive —
the empty state _replaces_ the table when nothing matches.

---

## 3. Title band & actions (`#actions`)

Provided by `DefaultPageContent`. The action row is the master-template 2-item row
(see `design.md` §4):

```vue
<template #actions>
  <MpPopover placement="bottom-end" use-portal is-adaptive-width>
    <template #default>
      <MpPopoverTrigger>
        <MpButton variant="secondary" right-icon="caret-down">Secondary action</MpButton>
      </MpPopoverTrigger>
      <MpPopoverContent><MpPopoverList>…</MpPopoverList></MpPopoverContent>
    </template>
  </MpPopover>
  <MpButton variant="primary">Primary action</MpButton>
</template>
```

**Rules**

- Secondary action that opens a menu = `variant="secondary"` + `right-icon="caret-down"` wrapping an `MpPopover`. A plain secondary action is just `<MpButton variant="secondary">`.
- Primary action = `variant="primary"`, **no leading icon** (the row reads as label-only).
- Verb labels in production (`Export`, `Create new`).

---

## 4. Page-level tabs (`#tabs`)

Top-level navigation between sibling views (the Jurnal "Goods & services /
Warehouses / Price rules" row). Lives in the `#tabs` slot of `DefaultPageContent`,
which renders on the gray shell directly above the white stage.

```vue
<template #tabs>
  <MpTabs v-model="activePageTab" variant-color="blue">
    <MpTabList>
      <MpTab v-for="t in pageTabs" :key="t">{{ t }}</MpTab>
    </MpTabList>
  </MpTabs>
</template>
```

**Rules**

- The band (`tabsBandClass` in `DefaultPageContent`) makes the tabs **stick to the stage**: the library's `.mp-tab-list__list` carries a 24px `margin-bottom` (space to content) — it is removed, along with the `.mp-tab-list__root::before` full-width track line and the list's `padding-bottom`.
- Because the track is removed, the active indicator (`.mp-tab-selected-border`, anchored at `bottom:-2px` to overlap the now-gone track) is re-pinned to **`bottom:-1px`** so its **full 2px** lands flush on the stage's top edge instead of tucking 1px under it.
- This is the **only** deviation from the library tab pattern. The in-stage content tabs (§6) keep the library default (track + 14px header).

---

## 5. Summary boxes — KPI strip (Zone A, optional)

Use the `SummaryBox` component (`app/components/template/SummaryBox.vue`), a 2.1
port of the official Mekari "summary box". Laid out in a responsive auto-fit grid.

```vue
<div :class="statsGridClass"><!-- repeat(auto-fit, minmax(240px,1fr)); gap:4 -->
  <SummaryBox variant="red" label="…" :badge="12" amount="1,250,000" is-filter />
  <SummaryBox variant="orange" label="…" amount="680,000">
    <template #top-right-content>…icon + tooltip…</template>
  </SummaryBox>
  …
</div>
```

### SummaryBox API

| Prop          | Values                               | Notes                                                                                                           |
| ------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `variant`     | `orange` `red` `green` `blue` `gray` | Tints the top band + border. `gray` = neutral default.                                                          |
| `label`       | string                               | Top-band title.                                                                                                 |
| `badge`       | string \| number                     | Count pill in the top band (omit → no pill).                                                                    |
| `caption`     | string                               | Bottom-band caption (default `Total`).                                                                          |
| `amount`      | string \| number                     | Pre-formatted value string.                                                                                     |
| `isFilter`    | boolean                              | Filter icon in the bottom band that **reveals on card hover** (tooltip-wrapped), shown always while `isActive`. |
| `isActive`    | boolean                              | Filled/active filter icon state.                                                                                |
| `isHoverable` | boolean                              | Hover border + shadow lift.                                                                                     |
| `isLoading`   | boolean                              | Spinner overlay.                                                                                                |

| Slot                    | Use                                                       |
| ----------------------- | --------------------------------------------------------- |
| `#label`                | Replace the text title with custom content (e.g. a logo). |
| `#top-right-content`    | Icon/tooltip at the top-right of the tinted band.         |
| `#bottom-right-content` | Action button(s) / text link in the bottom band.          |

**Rules**

- The grid is `repeat(auto-fit, minmax(240px, 1fr))`, `gap: 4` — never a fixed column count.
- Pick the variant by intent: `orange` = warning, `red` = danger/overdue, `green` = success, `blue` = info, `gray` = neutral.
- The optional caption row (`statsCaptionClass`) is right-aligned `body-small / gray.600`.

---

## 6. Content tabs (Zone B, optional)

In-stage sub-tabs (filter the table below). Library default — keep the track and
the count badge inside the tab slot.

```vue
<MpTabs v-model="activeTab" variant-color="blue">
  <MpTabList>
    <MpTab v-for="tab in tabs" :key="tab.label">
      <span :class="tabLabelClass">
        {{ tab.label }}
        <MpBadge v-if="tab.count" for="additionalInformation" type="announcement">{{ tab.count }}</MpBadge>
      </span>
    </MpTab>
  </MpTabList>
</MpTabs>
```

**Rule —** the count badge goes **inside** the `MpTab` slot, wrapped with the label
in an inline-flex span (`tabLabelClass`, `gap: 2`). Use `type` (not deprecated
`variant`) on `MpBadge`.

---

## 7. Filter bar (Zone C)

A flex `space-between` row that wraps:

- **Left (`filterLeftClass`)** — quick-filter `MpSelect`s, each in a fixed-width box (`quickFilterClass`, 180px).
- **Right (`filterRightClass`)** — the **Filter** button (opens the drawer) + a search `MpInputGroup` (260px).

```vue
<div :class="filterBarClass">
  <div :class="filterLeftClass">
    <div :class="quickFilterClass">
      <MpSelect v-model="filterCategory" placeholder="All categories" is-full-width is-clearable>
        <option value="">All categories</option>
        <option v-for="opt in categoryOptions" :key="opt" :value="opt">{{ CATEGORY_LABEL[opt] }}</option>
      </MpSelect>
    </div>
    …
  </div>
  <div :class="filterRightClass">
    <MpButton variant="secondary" left-icon="filter" @click="isFilterDrawerOpen = true">Filter</MpButton>
    <div :class="searchGroupClass">
      <!-- position:relative wrapper -->
      <MpInputGroup>
        <MpInputLeftAddon><MpIcon name="search" size="sm" color="gray.400" /></MpInputLeftAddon>
        <MpInput v-model="search" placeholder="Search..." />
      </MpInputGroup>
      <!-- Own clear (×): shown only with a keyword, revealed on hover/focus. -->
      <button v-if="searchTerm" type="button" data-search-clear aria-label="Clear search" :class="searchClearClass" @click="search = ''">
        <MpIcon name="reset" size="sm" color="gray.400" />
      </button>
    </div>
  </div>
</div>
```

**Rules**

- `MpSelect` options are **native `<option>` children** — this version has no `:options` prop. Always include a `<option value="">All …</option>` for the cleared state, plus `is-full-width is-clearable`.
- **Search clear (×).** Don't use `MpInput is-clearable` for the search — in this version its native clear is an `<svg>` whose click emits `undefined` for the model (breaking `search.value.trim()`) and doesn't reliably reset. Instead render an **own `<button data-search-clear @click="search = ''">`** in the `position:relative` `searchGroupClass`, gated by `v-if="searchTerm"` and faded in on `&:hover / &:focus-within`. (Normalize reads through a `searchTerm` computed — see §12.)
- Quick filters and the drawer fields bind the **same** refs (`filterCategory`, `filterStatus`, `search`) so both surfaces stay in sync.
- The **Filter** button opens a drawer (§8), never a popover.

---

## 8. Filter drawer (Zone C overlay)

The full filter set lives in an `MpDrawer` (right placement, `sm`), composed from
the library parts. Filters apply **live** via `v-model`, so **Apply just closes**.

```vue
<MpDrawer
  :is-open="isFilterDrawerOpen"
  placement="right"
  size="sm"
  @close="isFilterDrawerOpen = false"
>
  <MpDrawerOverlay />
  <MpDrawerContent>
    <MpDrawerHeader>
      <span :class="drawerTitleClass">Filter</span>   <!-- fontSize: lg (16px) -->
      <MpDrawerCloseButton />
    </MpDrawerHeader>
    <MpDrawerBody>
      <div :class="filterDrawerFormClass">             <!-- flex column, gap:4 -->
        <MpFormControl><MpFormLabel>Category</MpFormLabel><MpSelect …/></MpFormControl>
        …
      </div>
    </MpDrawerBody>
    <MpDrawerFooter>
      <div :class="filterDrawerFooterClass">           <!-- space-between, full width -->
        <MpButton variant="ghost" @click="resetFilters">Reset</MpButton>
        <MpButton variant="primary" @click="isFilterDrawerOpen = false">Apply</MpButton>
      </div>
    </MpDrawerFooter>
  </MpDrawerContent>
</MpDrawer>
```

**Rules**

- Drive open state with `:is-open` + `@close` (this version emits `open`/`close`, **not** `update:isOpen`, so no `v-model:is-open`). `@close` covers the X button, overlay click, and Esc.
- The **close button lives inside `MpDrawerHeader`** (a flex `space-between` container) — `MpModalCloseButton` does not self-position; placing it as a sibling drops it to the top-left.
- The header recipe sizes its text at `md` (14px ≈ body); wrap the title so it reads as a title at **`lg` (16px)** semibold (`drawerTitleClass`). Weight is inherited from the recipe.
- Form fields are wrapped in `MpFormControl` + `MpFormLabel` (the form-control rule from `design.md` §7).

---

## 9. Table (Zone D)

The whole table block is gated by `v-if="filteredRows.length"`; otherwise the
empty state (§11) renders instead.

```
MpTableContainer (ref=tableContainerRef, overflow-x:auto)
└ MpTable (is-hoverable, tableFixedClass)
  ├ <colgroup>  ← authoritative column widths
  ├ MpTableHead (is-fixed, tableHeadClass)
  │   ├ bulk-action row   (v-if selected.length)
  │   └ column-header row (v-else: checkbox + sortable headers + empty Actions th)
  └ MpTableBody
      ├ skeleton rows (v-if isLoading)
      └ data rows (v-else)
```

### 9.1 Column widths — fixed layout + `<colgroup>`

```ts
const colWidths = ["44px", "18.7%", "14.5%", "17.7%", "17.9%", "16.1%", "15%", "140px"];
const tableFixedClass = css({ tableLayout: "fixed", minWidth: "800px" });
```

**Rules**

- `table-layout: fixed` + a `<colgroup>` make column widths **authoritative and content-independent** — this is what keeps the body from reflowing when the header swaps to the bulk bar (a single `colspan` cell).
- **Checkbox column = fixed `44px`; Actions column = fixed `140px`** (hugs the ~114px Actions button + padding) so neither changes with viewport. The middle columns are **percentages summing to 100%**, so they absorb all remaining width and the two fixed columns never grow.
- **`min-width` is the sum of the column widths, and the table is _allowed_ to overflow.** On a narrow container `MpTableContainer` **scrolls horizontally** (`overflow-x: auto`) — that is the intended behaviour, not a failure state. Never shrink columns to avoid the scrollbar.
- **Size each column to the content it actually holds — never split the width evenly.** An even split (`100 / columns.length`) makes every column as narrow as the _narrowest_ one needs to be; on the Purchases page that clipped `Purchase Invoice #14026` down to `rchase Invoice #140`. Use a per-key px map and derive `min-width` from it, so it re-computes per tab when the column set changes:

  ```ts
  const COLUMN_WIDTH: Record<ColumnKey, number> = {
    transactionDate: 120,
    number: 230,
    vendor: 180 /* … */
  };
  const tableMinWidth = computed(
    () => `${columns.value.reduce((s, c) => s + COLUMN_WIDTH[c.key], 44)}px`
  );
  ```

- **Wrap cell text; don't clip it.** An ellipsis (or worse, a hard clip) partway through a document number is unreadable. With columns sized as above, values fit on one line anyway, so wrapping only ever kicks in for genuine outliers.
- **A wrapping/aligned `MpTextlink`/`MpButton` cell needs `!`-forced overrides.** These ship their own `display: inline-flex` + `white-space: nowrap`, which both size the element to its content _and centre it_. Set `css({ display: "flex!", width: "full!", minWidth: "0!", whiteSpace: "normal!", justifyContent: "flex-start!", textAlign: "left!", wordBreak: "break-word" })` — the `width: "full!"` + `justifyContent` pair is what re-anchors the text to the cell's edge. Without it a long value renders **centred and overflowing equally off both sides** of the cell. Use a `flex-end` / `text-align: right` variant for numeric columns. A bare `<span>` needs none of this (no competing class), which is why the bug only shows in the linked column.
- **The Actions column (§9.3) is optional, not mandatory.** Drop it when the record link (§9.5) already covers "view" and the bulk bar (§9.4) already covers multi-select actions — the Purchases page (`app/pages/purchase/index.vue`) removed it rather than keep a redundant per-row popover. Dropping it also means dropping the overflow-tracking machinery in §9.3, which existed only to draw that column's divider.

### 9.1a Column alignment

**Align every column the same way — left — including the money ones.**
Right-aligning figures is the accounting convention, but it fights the sortable
header: the sort icon sits _after_ the label, so a right-aligned label stops
~24px short of where the right-aligned figures end and no two edges line up.
On the Purchases list the Total column's header ended at 1479 while its data
ended at 1503; left alignment puts both at 1319. If you do want right-aligned
figures, the header label and its icon have to be right-aligned as a unit, with
the icon _before_ the label — not just `justify-content: flex-end` on the row.

### 9.2 Header

- `MpTableHead` is `is-fixed` (sticky). The library renders its bottom border as a **2px box-shadow on `<thead>`** — override it to **1px** via `tableHeadClass` (`box-shadow: 0 1px 0 0 var(--mp-colors-gray-100)`). This applies to both the default and bulk header rows.
- Sortable headers are a borderless `<button>` (`sortHeaderClass`) with the label + a sort icon (`sortIconFor`: `sort-default` / `sort-ascending` / `sort-descending`). Numeric columns get `numCellClass` (`text-align: right`).
- The **Actions header cell has no label** — it's an empty `<th>` carrying the sticky/​divider classes.

### 9.3 Pinned Actions column

```ts
const actionHeadClass = css({ position: "sticky", right: "0", zIndex: 3, bg: "gray.25" });
const actionCellClass = css({ position: "sticky", right: "0", zIndex: 1 }); // no bg → inherits native td bg (white / gray.50 hover)
const actionBorderClass = css({ boxShadow: "inset 2px 0 0 0 var(--mp-colors-gray-100)" });
```

**Rules**

- Actions `th`/`td` are `position: sticky; right: 0` so the column stays pinned at any resolution.
- The **header** cell sets `bg: gray.25` (matches the header band); the **body** cell sets **no background** so it inherits the library's native `td` background — white at rest, `gray.50` on row hover — keeping the pinned cell in sync with the row's hover state.
- The **2px left divider** (`actionBorderClass`, an inset shadow so it adds no layout width) is applied **only while the table overflows** — track that with a `ResizeObserver` on the container (`isTableOverflowing`).

### 9.4 Bulk-action header row

When `selected.length > 0`, the column-header row is replaced by a bulk bar:
checkbox + `{{n}} selected` + a primary `Actions` dropdown + a ghost `Delete`,
inside a cell with `:colspan="columns.length + 1"`.

**Rule —** match the bulk cell's height to the default header (`bulkCellClass`,
`py: 11px` → 11 + 30px sm-button + 11 = 52px) so the 1px bottom border stays on the
same sub-pixel line and the body doesn't jump.

### 9.5 Body, row link & row actions

- First data cell is the record link: `<MpTextlink as="button" variant="primary" @click="onOpen(row)">`.
- Status cell uses `MpBadge` with `for="tableStatus"` + a `type` mapped from the row status (`STATUS_TYPE`: `completed` `warning` `critical` `information` `announcement`).
- Last cell = row actions: an `MpPopover` (`placement="bottom-end"`) with a secondary `Actions` dropdown → `MpPopoverList` of `role="menuitem"` items.

### 9.6 Loading (skeleton)

While `isLoading`, render 5 skeleton rows of `columns.length + 2` cells, each an
`MpSkeleton is-loading` wrapping a `skeletonBarClass` bar. Toggle `isLoading`
around your fetch.

---

## 10. Pagination footer (Zone E)

The official Mekari pagination row (`paginationClass`, `space-between`, no top border):

- **Left (`pagerLeftClass`)** — `Rows per page` label + a ghost `MpButton` (`right-icon="chevrons-down"`) opening an `MpPopover` of `[5,10,25,50]` + `Showing {rangeStart}-{rangeEnd} of {total}`.
- **Right (`pagerRightClass`)** — a page-jump `MpAutocomplete` (`pageJumpClass` 100px wrapper) + `of N page` + tooltip-wrapped ghost prev/next chevron buttons (`chevrons-left` / `chevrons-right`, `:is-disabled` at the ends, with `aria-label`).

**Rule —** changing per-page or sort resets `page` to 1; a `watch([page, pageCount])`
clamps `page` into `[1, pageCount]`.

---

## 11. Blank slate / empty state (Zone I)

Replaces the table (the `v-else` of `v-if="filteredRows.length"`). It follows the
library **"search not found"** blank-slate pattern — a centred column of **3D
illustration → title → body** — with copy that **adapts to the cause** (search
keyword vs. quick filter vs. genuinely-empty source). No CTA: recovery is via the
search × (§7) and the clearable quick-filter selects.

```vue
<BlankSlate v-else :variant="emptyVariant" :title="emptyTitle" :description="emptyDescription" />
```

```ts
// The illustration follows the CAUSE: a list that never had a row is not a
// failed search (docs/patterns/BlankSlate.md).
const emptyVariant = computed(() =>
  searchTerm.value || filterCategory.value || filterStatus.value ? "not-found" : "no-data"
);
const emptyTitle = computed(() => {
  if (searchTerm.value) return `"${searchTerm.value}" not found`; // e.g. "Hungry Bear" not found
  if (filterCategory.value || filterStatus.value) return "No results found";
  return "No data yet";
});
const emptyDescription = computed(() => {
  if (searchTerm.value) return "Check the keywords you entered and try your search again.";
  if (filterCategory.value || filterStatus.value)
    return "No items match your filters. Try adjusting them, or clear all filters to start over.";
  return "There's nothing here yet.";
});
```

**Rules**

- **Illustration.** Never authored here: [`BlankSlate`](./patterns/BlankSlate.md) renders one of Pixel's own 3D assets from `https://cdn.mekari.design/illustration/blank-slate/`, picked by the `variant` prop. Pixel's empty-state block says outright not to generate new illustrations.
- **Three cases, one block.** Search keyword → `"<term>" not found` + search-retry copy. Quick filter only → "No results found". Genuinely empty source → "No data yet" (on real screens, swap in a "Create …" primary CTA for the truly-empty case).
- **No in-slate CTA.** Title: 16px (`lg`) semibold; body: `body-small / gray.600`, capped at `maxWidth: 320px`. The blank slate carries no button — recovery is the search × (§7) and the clearable quick-filter selects.
- The **filter bar (Zone C) stays mounted** above the blank slate (it's outside the `v-if`), so the user can recover by clearing the search or adjusting the quick filters.

---

## 12. State model (script contract)

A minimal index page owns these reactive units:

| Unit                                                              | Type            | Purpose                                          |
| ----------------------------------------------------------------- | --------------- | ------------------------------------------------ |
| `activePageTab`, `activeTab`                                      | `ref(0)`        | page-level + content tab selection               |
| `isFilterDrawerOpen`                                              | `ref(false)`    | filter drawer open state                         |
| `search`, `filterCategory`, `filterStatus`                        | `ref`           | filter inputs (shared by quick filters + drawer) |
| `page`, `perPage`                                                 | `ref`           | pagination                                       |
| `selected`                                                        | `ref<number[]>` | row selection (drives the bulk bar)              |
| `sortKey`, `sortDir`                                              | `ref`           | sort state                                       |
| `isLoading`                                                       | `ref(false)`    | skeleton toggle                                  |
| `searchTerm`                                                      | `computed`      | normalized search (`(search ?? "").trim()`)      |
| `emptyTitle` / `emptyDescription`                                 | `computed`      | adaptive blank-slate copy (§11)                  |
| `filteredRows`                                                    | `computed`      | filter → sort pipeline over `rows`               |
| `pagedRows`, `pageCount`, `pageOptions`, `rangeStart`, `rangeEnd` | `computed`      | derived paging                                   |
| `allOnPageSelected`, `someOnPageSelected`                         | `computed`      | header checkbox state (page-scoped)              |
| `isTableOverflowing` + `tableContainerRef` + `ResizeObserver`     | —               | toggles the Actions divider                      |

Handlers: `toggleRow`, `toggleAllOnPage`, `toggleSort`, `setPerPage`,
`onJumpPage`, `resetFilters`, `onOpen`, `onAction`, `onBulkDelete`, `formatNumber`.

**Rule —** `filteredRows` is the single source the table, pagination, and empty
state all read. Selection is **scoped to the current page** (`toggleAllOnPage`
only touches `pagedRows` ids).

---

## 13. Styling & token rules

1. Page-body styling uses Panda **`css()`** with **Pixel token shortcuts** only (token mode 2.1) — e.g. `gap: 4`, `px: 6`, `bg: "gray.25"`, `rounded: "md"`. No `<style>` blocks, no `var(--mp-*)` in markup.
2. Raw `var(--mp-colors-*)` is permitted **inside `css()` values** only where a shorthand can't express it — the header/divider `box-shadow`s (`tableHeadClass`, `actionBorderClass`). Keep these to hairline borders/shadows.
3. Per-instance sizes (`searchGroupClass` 260, `quickFilterClass` 180, `pageJumpClass` 100, `emptyIllustrationClass` 180) and the fixed table columns are the only hard px values — all documented inline.
4. Define every `css()` class once at the bottom of `<script setup>` with a comment explaining any non-obvious value (see the reference file).

---

## 14. Component cheat-sheet & gotchas

| Component        | Gotcha                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MpSelect`       | Options are native `<option>` children; **no `:options` prop**. Sizes `sm`/`md` only.                                                                                     |
| `MpInput`        | Avoid `is-clearable` for the search — its native clear is an `<svg>` that emits `undefined` and doesn't reliably reset; use an own clear button (§7).                     |
| `MpBadge`        | Use `type` (`completed`/`warning`/`critical`/`information`/`announcement`); `variant` is deprecated. Needs a `for` value.                                                 |
| `MpDrawer`       | `:is-open` + `@close` (no `v-model:is-open`); compose `Overlay`/`Content`/`Header`/`Body`/`Footer`/`CloseButton`. Close button goes **inside** the header.                |
| `MpTabs`         | Count badge goes inside the `MpTab` slot. `variant-color="blue"`.                                                                                                         |
| `MpTable`        | No classes on `tr`/`td` — it styles via `.mp-table` descendants. Header border is a `<thead>` box-shadow. Pass layout via `:class` on `MpTable`/`MpTableHead`.            |
| `MpAutocomplete` | `@change` gives an option object — unwrap `.value` (see `onJumpPage`).                                                                                                    |
| Icons            | Verify names with the Pixel MCP before use. Used here: `caret-down`, `filter`, `search`, `reset`, `sort-default/ascending/descending`, `chevrons-down/left/right`, `doc`. |

---

## 15. Accessibility

- Icon-only buttons (prev/next pagers, the search clear ×) carry `aria-label`.
- Sort headers are real `<button>`s.
- Popover menu items use `role="menuitem"`.
- Filter drawer fields are wrapped in `MpFormControl` (owns label/error).

---

## 16. Build checklist (new index page)

1. `<DefaultPageContent title="…">` with the `#actions` row; add `#tabs` only if the screen has sibling views.
2. (Optional) Summary-box grid + caption.
3. (Optional) Content tabs with count badges.
4. Filter bar: quick-filter `MpSelect`s (left) + Filter-drawer button & search (right) — all binding shared refs.
5. Filter drawer mirroring the filters; Apply closes, Reset clears.
6. Table: define `columns`, `colWidths` (checkbox 44px + Actions 140px fixed, middle % summing to 100%), the fixed-layout + sticky-actions + 1px-header classes, the overflow `ResizeObserver`, bulk row, skeleton rows.
7. Pagination footer.
8. Blank slate as the `v-else` — `<BlankSlate>` with adaptive `emptyVariant`/`emptyTitle`/`emptyDescription`, no CTA (recovery via the search × and quick filters).
9. Wire the state model (§12); replace the static `rows` with your data source and flip `isLoading` around the fetch.
10. `pnpm lint` + `nuxt typecheck` clean; verify in the preview.

---

## Changelog

- **v1.5.0** — Added §9.1a: align all columns left, including money. Right-aligned figures don't line up with a sortable header, because the sort icon pushes the label off the shared edge.
- **v1.4.0** — Reworked §9.1 column sizing: **per-column px widths** (a `COLUMN_WIDTH` map with a derived `min-width`) replace the even percentage split, which was starving every column to the narrowest one's width and clipping document numbers mid-string; horizontal overflow of `MpTableContainer` is now stated as intended behaviour rather than something to design around. Cell text **wraps instead of clipping**, and the `!`-forced override an `MpTextlink`/`MpButton` cell needs is documented as `display:flex!` + `width:full!` + `justifyContent` (without which a long value renders centred and spilling off _both_ sides). Also documented the Actions column (§9.3) as optional — dropped on the Purchases index page in favour of the record link + bulk bar.
- **v1.3.0** — Dropped the blank-slate **Clear filters** CTA. Recovery now happens through the **search field's own clear (×) button** (revealed on hover/focus, only with a keyword, `@click="search = ''"` — the library's `is-clearable` is avoided because its svg clear emits `undefined`) and the clearable quick-filter selects. Added a `searchTerm` computed to normalize the search keyword.
- **v1.3.0** — Zone I moved onto the shared [`BlankSlate`](./patterns/BlankSlate.md) component, which takes its illustration from Pixel's CDN library and picks between the never-had-data and nothing-matched assets by cause.
- **v1.2.0** — Zone I now uses the official Mekari **"search not found" 3D illustration** (then a local PNG copy) instead of a flat icon, with copy that names the search term (`"<term>" not found`) and three adaptive cases (search / filter / empty) via `emptyTitle` + `emptyDescription` computeds.
- **v1.1.0** — Upgraded Zone I to the library **blank slate / Empty State** pattern: muted 48px icon, 16px (`lg`) title, capped-width body, and context-aware copy + a **Clear filters** CTA driven by a `hasActiveFilters` computed (no-results vs. genuinely-empty cases).
- **v1.0.0** — Initial pattern extracted from `index-template.vue`. Documents the zone composition, page-level vs content tabs, SummaryBox variants/slots, MpSelect quick filters, the filter drawer, the fixed-layout table (colgroup, pinned 44px checkbox / 140px Actions, 1px header divider, sticky Actions column with overflow-only divider, bulk-action header, skeleton + empty states), pagination, the state-model contract, styling/token rules, and component gotchas.
