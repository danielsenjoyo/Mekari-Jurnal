# Table

> Part of the Mekari Jurnal page-construction pattern set.
> Reference impl: [`index-template.vue`](../../app/pages/templates/index-template.vue) Zone D.
> Full rationale: [`index-page-pattern.md` §9](../index-page-pattern.md).
> See also [`BulkActionBar`](./BulkActionBar.md), [`StatusBadge`](./StatusBadge.md), [`Pagination`](./Pagination.md), [`BlankSlate`](./BlankSlate.md).

## Purpose

The record table — a **fixed-layout** `MpTable` with a sticky header, a pinned
Actions column, sortable headers, a skeleton loading state, and a header row that
swaps to the [`BulkActionBar`](./BulkActionBar.md) while rows are selected.

## Structure

The whole block is gated by `v-if="filteredRows.length"`; otherwise the
[`BlankSlate`](./BlankSlate.md) renders instead.

```
MpTableContainer (ref=tableContainerRef, overflow-x:auto)
└ MpTable (is-hoverable, tableFixedClass)
  ├ <colgroup>          ← authoritative column widths
  ├ MpTableHead (is-fixed, tableHeadClass)
  │   ├ bulk-action row (v-if selected.length)   → see BulkActionBar.md
  │   └ column-header row (v-else)
  └ MpTableBody
      ├ skeleton rows   (v-if isLoading)
      └ data rows       (v-else)
```

## Column widths — fixed layout + `<colgroup>`

```ts
const colWidths = ["44px", "18.7%", "14.5%", "17.7%", "17.9%", "16.1%", "15%", "140px"];
const tableFixedClass = css({ tableLayout: "fixed", minWidth: "800px" });
```

- `table-layout: fixed` + a `<colgroup>` make widths **authoritative and content-independent** — this is what stops the body reflowing when the header swaps to the bulk bar (a single `colspan` cell).
- **Checkbox column = fixed `44px`; Actions column = fixed `140px`.** The middle columns are **percentages summing to 100%**, so they absorb remaining width and the two fixed columns never grow.
- `min-width: 800px` preserves natural width: on a narrow container `MpTableContainer` **scrolls horizontally** instead of squeezing columns.

### Per-column px widths (Purchases, Products)

A screen whose columns hold very different content sizes should give each `<col>`
a **px width chosen for that column's longest realistic value**, not a share of
an even percentage split — an even split makes every column as narrow as the
narrowest one needs to be, which is what clipped `Purchase Invoice #14026` down
to `rchase Invoice #140`. Add one trailing **width-less `<col>`** (with a
matching blank `<th>`/`<td>` on every row) to soak up leftover space on a wide
viewport.

Then the table itself needs exactly one declaration:

```ts
const tableFixedClass = css({ tableLayout: "fixed", width: "100%" });
```

`width: 100%` covers both directions: the table lays out at whichever is larger,
the container or the sum of the `<colgroup>` widths — so it fills a wide viewport
(the filler `<col>` takes the surplus) and overflows a narrow one, where
`MpTableContainer` scrolls. Measured at 1714px in a 1015px container and 2400px
in a 2400px one.

Two nearby variants do **not** work:

- **`width: auto`** silently opts the table back into the _automatic_ table
  layout algorithm (CSS 2.1 §17.5.2), which treats the `<colgroup>` as a hint
  and squeezes the columns — Product name came out at 142px instead of 260px.
  `table-layout: fixed` alone does not prevent this; the `width` has to be
  something other than `auto`.
- **an extra `min-width: <sum>px`** is redundant, and since the sum changes with
  the active tab it can only be an inline style — which the compliance gate
  flags (only `<col>` widths may be inline) and Panda can't extract into a
  class. The Purchases list still carries one; it doesn't need it.

## Header

- `MpTableHead is-fixed` (sticky). The library draws its bottom border as a **2px box-shadow on `<thead>`** — override to **1px** via `tableHeadClass` (`box-shadow: 0 1px 0 0 var(--mp-colors-gray-100)`).
- Sortable headers are a borderless `<button>` (`sortHeaderClass`): label + sort icon (`sortIconFor`: `sort-default` / `sort-ascending` / `sort-descending`). Numeric columns add `numCellClass` (`text-align: right`).
- The **Actions header cell has no label** — an empty `<th>` carrying the sticky/divider classes.

## Pinned Actions column

```ts
const actionHeadClass = css({ position: "sticky", right: "0", zIndex: 3, bg: "gray.25" });
const actionCellClass = css({ position: "sticky", right: "0", zIndex: 1 }); // no bg → inherits td bg
const actionBorderClass = css({ boxShadow: "inset 2px 0 0 0 var(--mp-colors-gray-100)" });
```

- `position: sticky; right: 0` keeps the column pinned at any resolution.
- **Header** cell sets `bg: gray.25` (matches the header band); **body** cell sets **no background** so it inherits the native `td` bg — white at rest, `gray.50` on hover — keeping the pinned cell in sync with row hover.
- The **2px left divider** (`actionBorderClass`, an inset shadow → no layout width) applies **only while the table overflows**, tracked via a `ResizeObserver` on the container (`isTableOverflowing`).

## Body

- First data cell is the record link: `<MpTextlink as="button" variant="primary" @click="onOpen(row)">`.
- **Pull that link 2px left of the cell's text edge.** `MpTextlink` renders a
  `<button>` whose recipe adds `padding: 2px`, so its glyphs sit 2px right of
  every plain-text sibling — the description stacked under it, and the column
  header above it. One cell it's invisible; a full column of them is a visible
  stagger. Cancel it on the link only:

  ```ts
  const linkCellClass = css({ ...wrapCellBase, ml: "-2px", mr: "-2px" });
  ```

  **A negative margin, not `padding: 0`.** The recipe declares that padding
  `!important` and _unlayered_, which outranks a Panda `pl: "0!"` utility
  (layered — its `!important` loses the reversed layer order) and outranks an
  inline `style.paddingLeft = "0"` too. Both fail _silently_: the class lands on
  the element, computed padding stays `2px`. Margin has no competing
  declaration, so it simply applies, and the 2px still holds the focus ring off
  the glyphs. The box moves into the cell's own 8px padding, so nothing
  overflows. Same fix wherever a textlink has to line up with non-link text —
  not just in a table. Detail pages hit the identical stagger on meta-field
  links (a vendor/warehouse link under its `MpText` label), right-aligned
  links (`View journal entry` under a right-aligned total — the symmetric
  `ml`/`mr` cancels correctly there too, since it moves both edges equally),
  and product-table links. Rather than re-deriving the fix per page, it's one
  shared module: [`app/utils/textlink-align.ts`](../../app/utils/textlink-align.ts)
  exports `textlinkAlignClass` (bare links) and `textlinkCellClass` (links that
  also need the wrap rules — replaces `wrapInlineClass` **on `MpTextlink`
  only**; that class is shared with `MpTag`, which is not a button, carries its
  own deliberate padding, and would be pulled out of line by the margin).

- Status cell uses an [`StatusBadge`](./StatusBadge.md) (`MpBadge for="tableStatus"`).
- Last cell = row actions: an `MpPopover` (`placement="bottom-end"`) → secondary `Actions` dropdown → `MpPopoverList` of `role="menuitem"` items.

## Loading (skeleton)

While `isLoading`, render 5 skeleton rows of `columns.length + 2` cells, each an
`MpSkeleton is-loading` wrapping a `skeletonBarClass` bar. Toggle `isLoading`
around your fetch.

## Empty state

Two shapes, and which one you need depends on where the rows come from.

- **The table is one of two things the page can show** (a list filtered to
  nothing): swap the whole table for a [`BlankSlate`](./BlankSlate.md) with
  `v-if="rows.length" / v-else`. The headers go with it — there is nothing to
  head.
- **The table's rows are generated by controls above it** (the variant table on
  `ProductMasterForm`, whose rows are the cartesian product of the attributes):
  keep the table and put the slate **inside the body**, in one row that spans
  every column with `:colspan`. The headers are what tell the user what filling
  the form will produce, so they must stay.

Full markup and copy rules in [`BlankSlate`](./BlankSlate.md) §
"Empty table state".

## Horizontal scroll affordance

A table that overflows must say so. Without it the last column is simply
clipped at the container edge and nothing indicates there is more to the right
— flagged in the Purchase audit (`NNG · H1`). Put this on `MpTableContainer`:

```ts
const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});
```

The two `local` white gradients ride with the content and scroll away; the two
`scroll` shadows stay pinned to the container. Net effect: a shadow appears on
whichever side still has content and vanishes at each end — **no
`ResizeObserver`, no scroll listener, no reactive state**.

## Expandable groups (a parent row over its children)

Where a row is a **header for records underneath it** rather than a record of
its own — a product master over its variants — the table becomes a grouping
table. Reference impl: the Products index's "Product with variant" tab.

- **The 44px first column holds the expander, not a checkbox.** A group header
  isn't a thing you bulk-archive, so that tab drops selection entirely
  (`isSelectable === false`) and spends the column on a ghost `MpButton` with
  `caret-right` / `caret-down` and an `aria-expanded`.
- **The parent row's other cells stay empty.** Every figure on the tab belongs
  to a child; repeating a rolled-up zero across twelve columns says the parent
  has no stock rather than that it has no figures of its own.
- **The children go in ONE full-width cell holding a nested table**, not in
  sibling `<tr>`s:

  ```vue
  <MpTableRow v-if="row.isGroup && isExpanded(row.id)">
    <MpTableCell as="td" :colspan="colWidths.length + 1" :class="expansionCellClass">
      <div :class="expansionScrollClass" :data-variant-scroller="row.id">
        <MpTable :class="tableFixedClass">
          <colgroup><!-- the SAME widths as the outer table --></colgroup>
          …
        </MpTable>
      </div>
    </MpTableCell>
  </MpTableRow>
  ```

  A `<tbody>` cannot be given its own scrollbar without `display: block`, which
  drops it out of table layout and takes the column widths with it. The nested
  table keeps `table-layout: fixed` and repeats the outer `<colgroup>`, so the
  two align exactly — this is only possible because the widths are authoritative
  px values (see [Column widths](#column-widths--fixed-layout--colgroup)).

- **Cap the group at five rows and scroll the rest.** Beyond that the group
  stops being glanceable and pushes the next parent off screen.
- **Measure the cap; don't guess it.** A child row's height depends on whether
  its name wraps, so a `css()` constant cuts mid-row. Measure the fifth row
  after expanding and write `style.maxHeight` — the same reason the `<colgroup>`
  widths are inline, a value only layout can supply:

  ```ts
  const last = rows[MAX_EXPANDED_ROWS - 1]!;
  scroller.style.maxHeight = `${last.offsetTop + last.offsetHeight}px`;
  ```

  Leave it unset when there are five or fewer — a scroller with nothing to
  scroll still reserves the gutter on some platforms.

- **Children are not rows of the list.** They never paginate, never sort and
  never match the filter on their own, so build them on demand
  (`variantRowsFor(masterId)`) rather than folding them into the rows array.

## Gotchas

- **No classes on `tr`/`td`** for table styling — `MpTable` styles via `.mp-table` descendants. Pass layout via `:class` on `MpTable` / `MpTableHead`, and the sticky/width classes on the specific `as="th"`/`as="td"` cells.
- Re-check overflow after the row set changes: `watch(() => filteredRows.length, () => requestAnimationFrame(checkTableOverflow))`.
