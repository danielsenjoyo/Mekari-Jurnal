# Blank Slate / Empty State

> Part of the Mekari Jurnal page-construction pattern set.
> Component: [`BlankSlate.vue`](../../app/components/template/BlankSlate.vue) —
> auto-imported, so `<BlankSlate>` needs no import line.
> Reference impls: [`index-template.vue`](../../app/pages/templates/index-template.vue)
> Zone I (`v-else` of the table), every `[id].vue` detail page's not-found
> branch, and [`ProductMasterForm.vue`](../../app/components/products/ProductMasterForm.vue)
> for the in-table case.

## Purpose

What stands in for content that isn't there: an empty table, an empty section,
or a record the URL asked for and couldn't get. One centred column of
**3D illustration → title + body → optional action**, with copy that **adapts to
the cause**.

## Markup

Everything is in the component — illustration, type scale, spacing:

```vue
<BlankSlate v-else :variant="emptyVariant" :title="emptyTitle" :description="emptyDescription">
  <!-- optional recovery action -->
  <MpButton v-if="hasActiveFilter" variant="secondary" @click="resetFilters">Clear filters</MpButton>
</BlankSlate>
```

```ts
const emptyVariant = computed(() =>
  searchTerm.value || hasActiveFilter.value ? "not-found" : "no-data"
);
const emptyTitle = computed(() => {
  if (searchTerm.value) return `"${searchTerm.value}" not found`;
  if (hasActiveFilter.value) return "No results found";
  return "No data yet";
});
const emptyDescription = computed(() => {
  if (searchTerm.value) return "Check the keywords you entered and try your search again.";
  if (hasActiveFilter.value)
    return "No items match your filters. Try adjusting them, or clear all filters to start over.";
  return "There's nothing here yet.";
});
```

## Three cases, one block

| Cause                  | `variant`   | Title                | Body                                                                     |
| ---------------------- | ----------- | -------------------- | ------------------------------------------------------------------------ |
| Search keyword         | `not-found` | `"<term>" not found` | "Check the keywords you entered and try your search again."              |
| Quick filter only      | `not-found` | `No results found`   | "No items match your filters. Try adjusting them…"                       |
| Genuinely empty source | `no-data`   | `No data yet`        | "There's nothing here yet." _(swap in a "Create …" CTA on real screens)_ |

## Empty table state

A table whose rows are **generated rather than added** — the variant table on
`ProductMasterForm`, where the rows are the cartesian product of the attributes
above it — can't use the page-level `v-if` / `v-else` split: there is no other
thing to render, and hiding the table would take its column headers with it.
The headers are what tell the user what filling the form will produce, so they
stay and the slate goes **inside the table body**:

```vue
<MpTableRow v-if="rows.length === 0">
  <MpTableCell as="td" :colspan="colWidths.length">
    <BlankSlate variant="no-data" title="Product variant will appear here" :description="reason" />
  </MpTableCell>
</MpTableRow>
```

- **Span every column** (`:colspan`), or the slate sits in the first column and
  the empty cells beside it draw a grid across it.
- **Say what would fill it, then what to do**: the title names the thing that
  will appear ("Product variant will appear here"), the description names the
  next step ("Please select the attribute first"). It moves on — once an
  attribute is chosen but has no options, the description becomes "Add at least
  one option to the attribute". A static description here would be an
  instruction the user has already followed.
- **No CTA**: the control that fills the table is already on screen, directly
  above.

## Rules

- **Take the illustration from the library; never draw one.** Pixel ships 3D
  blank-slate assets at `https://cdn.mekari.design/illustration/blank-slate/`
  and its empty-state block (`get-block general-display-empty-state`) says
  outright: *"Do not generate new illustrations — use existing 3D-style
  assets."* `BlankSlate` holds the two this app uses:
  - `no-data` → `NoData_PB_L_01.png` (a folder with its sheets still in it),
  - `not-found` → `NotResultFound_PB_L_01.png` (a card and a magnifier with a
    red ✕).

  Browse the rest with
  `curl -s "https://cdn.mekari.design/?prefix=illustration/blank-slate/&max-keys=1000"`
  — there are ~38, including `AccessRestricted`, `Expired`, `NoConnection` and
  `UserNotFound`. Add one to the component's map rather than to a call site.
- **Match the illustration to the cause.** The magnifier says *your query found
  nothing*; on a list that has simply never had a row it tells the user a search
  failed that they never ran. That is what `variant` is for, and on a list with
  a search box it is a computed, not a constant.
- **Title and description are one block.** They sit at `gap: 1` inside the
  slate's `gap: 4`, because the description glosses the title. Spaced equally,
  the description reads as an unrelated third line. This is in the component —
  don't re-space it per call site.
- **No in-slate CTA — unless the filter is staged.** Recovery normally happens
  through the [`FilterBar`](./FilterBar.md)'s search × and the clearable
  quick-filter selects, which **stay mounted** above the blank slate (they're
  outside the `v-if`). That stops being enough once the filter lives in a staged
  [`Drawer`](./Drawer.md): the criteria are invisible while it is closed, so the
  user faces an empty list with nothing on screen explaining it. There, pass a
  **Clear filters** button into the slot, gated on the filter actually being
  active — Purchases does this.
- For the **truly-empty** (first-run) case on a real screen, the slot is where a
  "Create …" primary CTA belongs.

## Gotchas

- The empty state and the table are mutually exclusive (`v-if="filteredRows.length"` / `v-else`) — never render both. The in-table case above is the exception, and it is a row of the same table rather than a second block.
- The illustrations are 1500×1250 (6:5) source PNGs, rendered by `MpImage` at a fixed 240×200. Sizing guidance from the Pixel block is 120–160px on the longest edge, up to 288×240 for a full-page slate.
- `MpImage` lazy-loads by default; the component turns that **off**. On a blank slate the illustration is the content, and fading it in on scroll is worse than the wait.
