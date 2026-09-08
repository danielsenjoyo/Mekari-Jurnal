# Filter Bar

> Part of the Mekari Jurnal page-construction pattern set.
> Reference impl: [`index-template.vue`](../../app/pages/templates/index-template.vue) Zone C.
> See also [`Drawer`](./Drawer.md) (the full filter set), [`BlankSlate`](./BlankSlate.md) (recovery).

## Purpose

The control row above the table: quick filters and search on one line, with a
**Filter** button that opens the full filter [`Drawer`](./Drawer.md).

## Anatomy

A flex `space-between` row (`filterBarClass`):

- **Left (`filterLeftClass`)** — quick-filter `MpSelect`s, each in a fixed 180px box (`quickFilterClass`).
- **Right (`filterRightClass`)** — the **Filter** button + a search field (260px, `searchGroupClass`).

```vue
<div :class="filterBarClass">
  <div :class="filterLeftClass">
    <div :class="quickFilterClass">
      <MpSelect v-model="filterCategory" placeholder="All categories" is-full-width is-clearable>
        <option value="">All categories</option>
        <option v-for="opt in categoryOptions" :key="opt" :value="opt">{{ CATEGORY_LABEL[opt] }}</option>
      </MpSelect>
    </div>
  </div>

  <div :class="filterRightClass">
    <MpButton variant="secondary" left-icon="filter" @click="isFilterDrawerOpen = true">Filter</MpButton>

    <div :class="searchGroupClass"><!-- position:relative -->
      <MpInputGroup>
        <MpInputLeftAddon><MpIcon name="search" size="sm" color="gray.400" /></MpInputLeftAddon>
        <MpInput v-model="search" placeholder="Search..." />
      </MpInputGroup>
      <!-- own clear (×): only with a keyword, revealed on hover/focus -->
      <button v-if="searchTerm" type="button" data-search-clear aria-label="Clear search"
              :class="searchClearClass" @click="search = ''">
        <MpIcon name="reset" size="sm" color="gray.400" />
      </button>
    </div>
  </div>
</div>
```

## The bar is per-tab, not fixed

On a page whose tabs hold different entities, **declare the toolbar per tab**
rather than rendering a fixed bar. Eight tabs over eight entities share almost
no control, and a bar that shows the same buttons everywhere is inert on most of
them. See `TOOLBAR_BY_TAB` in [`products/index.vue`](../../app/pages/products/index.vue):

```ts
const TOOLBAR_BY_TAB: Record<TabKey, ToolbarSpec> = {
  products_and_services: {
    hasColumnPicker: true,
    hasManageCategory: true,
    importKind: "menu",
    hasExportMenu: true,
    hasFilter: true
  },
  masters: { hasColumnPicker: true },
  warehouses: { hasInactiveToggle: true, importKind: "warehouse-create" },
  price_rules: { isWideSearch: true }
  // …
};
```

## Order within the bar

**Left** — controls that change how the list _reads_: the column picker, then a
"Manage <list>" button for a lookup the table's own column draws from.

**Right, in this order** — Import, Export, **Filter**, search.

`Filter` sits **immediately left of the search field**, never after it. The two
are the page's narrowing controls and they read as one pair; the file actions,
which act on the whole list rather than on what is shown, come before both. The
search field stays last so it is the control closest to the table's own edge.

A tab with nothing but a search box gives the field the room the other controls
would have taken (`isWideSearch`).

**Quick selects are optional.** The Purchases index and `index-template.vue`
carry them; the Products index does not — the source gives that page a filter
drawer and no selects, and with a column picker, a Manage button, Import, Export
and Filter already on the row there is no space left for them. Where they are
dropped, the drawer must carry every field they held.

- **Column picker** — an `MpPopover` of `MpCheckbox`es, one per column of the
  active tab's set, triggered by an **icon-only** `MpButton`:
  `left-icon="table-view-column"`, `right-icon="caret-down"`, no slot content,
  and an `aria-label` for the name the missing label would have given it. The
  icon is the recognised affordance and a label would make it the widest control
  on the row.
- **A "Manage <list>" button** — opens the modal that edits a lookup list the
  table's own column reads from (Manage category, on Products).

```ts
// One array of hidden keys, not a per-column flag. `columns` filters the tab's
// set through it, and everything downstream (the colgroup, the header row, the
// cells) already derives from `columns`.
const DEFAULT_HIDDEN_COLUMNS: ColumnKey[] = ["avgPrice"];
const hiddenColumns = ref<ColumnKey[]>([...DEFAULT_HIDDEN_COLUMNS]);
const columns = computed(() =>
  COLUMNS_BY_TAB[activeTabKey.value].filter((c) => !hiddenColumns.value.includes(c.key))
);
```

Rules for the picker:

- **The link column is locked** (`:is-disabled="column.link"`). Hiding it leaves
  a table of attributes with nothing to click through to.
- **No `is-close-on-select`.** Picking columns is several decisions; a menu that
  shuts on the first one makes the user reopen it for each.
- **Show it only where it earns its place** — the tabs whose column set is wide
  enough to scroll. On a five-column tab it is a control for nothing.
- **An array, not a `Set`.** The template reads it on every render, and a `Set`
  mutated in place doesn't re-trigger that.

## Rules

- **`MpSelect` options are native `<option>` children** — this version has **no `:options` prop**. Always include a `<option value="">All …</option>` for the cleared state, plus `is-full-width is-clearable`.
- **Own search clear (×).** Do **not** use `MpInput is-clearable` for search: its native clear is an `<svg>` whose click emits `undefined` (breaking `search.trim()`) and doesn't reliably reset. Render an own `<button data-search-clear @click="search = ''">` inside the `position:relative` `searchGroupClass`, gated by `v-if="searchTerm"` and faded in on `&:hover / &:focus-within`.
- **One filter state, two surfaces.** The quick filters, the search box and the
  drawer all edit the same thing — never a second filter layered on the first.
  For a small set that means literally sharing refs. Once the set is big enough
  to stage (see [`Drawer`](./Drawer.md)), hold **one object** instead and make
  the bar's controls writable computeds into its fields, so committing the
  drawer can replace the whole object without the bar drifting out of sync:

  ```ts
  const filter = ref<PurchaseFilter>(emptyPurchaseFilter());
  const search = computed({ get: () => filter.value.key, set: (v) => (filter.value.key = v) });
  ```

- **Show that a filter is on.** A staged drawer hides its own settings once
  closed, so mark the Filter button with a dot whenever anything is set.
- **Clear the filter when the tab changes.** Tabs over different record types
  don't share a field set, so a filter carried across can narrow by a control
  the new tab doesn't even show.
- **A hide/show switch is not a status filter.** Where a list hides a whole
  class of record by default (deactivated warehouses), the question is "show
  them too?", not "which status?" — so it is an `MpToggle` on the bar, not a
  select and not a drawer field. It resets the page and the selection like any
  other narrowing control.
- The **Filter** button opens the [`Drawer`](./Drawer.md), never a popover.
- Normalize the keyword through a `searchTerm` computed: `computed(() => (search.value ?? "").trim())`.

## Gotchas

- `MpSelect` sizes are `sm`/`md` only.
- The search field keeps a fixed `260px` width so the clear × has a stable anchor.
- **`MpPopoverTrigger` renders the FIRST node of its slot, and nothing else.**
  It reads `slots.default()[0]`, so anything before the button wins:
  - an `MpTooltip` wrapper swallows the click (the trigger binds to the tooltip,
    not the button) — give the trigger an `aria-label` instead of a tooltip;
  - **an HTML comment is a node too.** A `<!-- … -->` on the line above the
    button inside the trigger makes the whole control render as nothing, with no
    error. Keep explanatory comments _outside_ `<MpPopoverTrigger>`.

- An icon-only `MpButton` has no accessible name of its own — it renders with
  `data-has-label="false"` and its icons are `role="presentation"` — so
  `aria-label` is required, not optional.
