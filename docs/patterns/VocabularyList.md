# Vocabulary List

> Part of the Mekari Jurnal page-construction pattern set.
> Reference impls: [`location-types.vue`](../../app/pages/products/warehouse/location-types.vue)
> (first instance), [`product-categories.vue`](../../app/pages/other-lists/product-categories.vue),
> [`product-units.vue`](../../app/pages/other-lists/product-units.vue).
> See also [`TablePage`](./TablePage.md), [`Modal`](./Modal.md), [`BlankSlate`](./BlankSlate.md).

## Purpose

A **tenant-wide list of names** other records pick from — a location type, a
product category, a unit of measure. There is no id a user ever sees: the name
IS the record, because that is what every picker offers and what the records
using it store directly. Three instances of the same shape now exist; a fourth
should copy this doc's recipe rather than re-derive it.

## When to use it

The list is short (tens of rows, not hundreds — no pagination), every row is
just a name, and other records reference a row **by that name string**, not by
a foreign key. If the vocabulary needs a second field (a code, a colour, a
parent), or the list is long enough to paginate, this isn't the pattern —
reach for [`TablePage`](./TablePage.md) proper instead.

## Composition

```
title band: "Add <thing>" button, right-aligned
  → optional search field (skip it below ~10 rows — location-types.vue does)
  → table: Name (sortable) | Used in (optional) | Actions
      row states: plain | editing (inline) | confirming delete (inline)
  → BlankSlate when the list (or the search) has nothing
  → Add modal: one field, a character-count label, Cancel/Save
```

## The three row states

A row is never wrapped in a second surface — everything happens in place:

- **Plain** — name, a "Used in" count if the domain has one, an Actions
  popover (`MpPopoverTrigger` → secondary `MpButton right-icon="chevrons-down"`).
- **Editing** — the name cell becomes an `MpFormControl` + `MpInput` +
  Cancel/Save, `@keyup.enter="save"`. Triggered from the row's own Actions
  menu, never a separate icon button.
- **Confirming delete** — the row's cells become "Delete X?" text plus
  Cancel/Danger-Delete buttons, still inline. **Never a modal on top of the
  page for this** — see [`Modal.md`](./Modal.md#never-open-a-modal-over-a-modal-like-surface):
  a delete here is only ever offered at a zero-usage count, so there is no
  consequence left to explain, and the row is already where the name is.

Only one row can be in a non-plain state at a time. One `editing` ref (or one
`pendingDelete` ref) rather than a per-row flag — opening a second row's Edit
implicitly closes whichever one was open, which is what "one draft" means in
practice. Disable every OTHER row's Actions trigger while any row is mid-edit
or mid-confirm (`is-disabled="isRowBusy"`), so a second draft never opens
underneath the first.

## Usage-gated delete

If anything in the catalogue can carry this name, deleting a row that's still
in use would orphan every record holding it — it would vanish from every
filter and picker while the record itself still shows the old string. So:

- Show the count (`getXUsage(name)`), even when it's zero — it's what tells the
  reader Delete is safe.
- **Delete is not merely disabled at a nonzero count — it doesn't render at
  all**, wrapped instead in the enabled path. A greyed-out button a user can
  still hover invites the click; not being there says more. (`location-types.vue`
  disables-with-tooltip instead of hiding — that reads fine too. Pick one, not
  both, per list.)
- A **rename sweeps every record carrying the old name**, in the same
  function that changes the vocabulary array — see `renameProductCategory` /
  `renameProductUnit` in [`app/data/products.ts`](../../app/data/products.ts).
  The array write and the sweep are not two calls a caller could forget to
  pair; they're one.

## Two surfaces, one array

A vocabulary a user manages **from where they use it** (a product's category,
picked while filling out the product form) can reasonably get a second,
lighter surface — a modal opened from that other screen's toolbar
(`ProductCategoryModal.vue`, opened by the product list's "Manage product
category" button) — **alongside**, not instead of, this page. Both read and
write the exact same array (`PRODUCT_CATEGORIES`), through the exact same
`data/products.ts` functions, so a rename on either surface shows up on the
other immediately. Never fork the array or the CRUD functions per surface.

## Gotchas

- **A popover's content is not lazily created.** Every row's `MpPopoverContent`
  is mounted in the DOM as soon as the row renders — hidden, not absent. If you
  are scripting against this page (a test, a live-browser check), a global
  `document.querySelectorAll('[role=menuitem]')` returns **every row's** items
  at once; filter to the one actually open (`el.offsetParent !== null`) or you
  will act on whichever row happened to mount first, not the one whose trigger
  you clicked. Verified live: an unscoped query renamed the wrong category
  while building `product-categories.vue`.
- **A disabled `MpPopoverListItem` carries no `role="menuitem"`.** Deliberate —
  a control nobody can act on isn't a menu item in the accessibility tree —
  and it's why the gotcha above only ever surfaces the _enabled_ items from
  every row, not the disabled ones too.
- Sort is single-column (Name) and toggled by re-clicking its own header —
  there's nothing else worth sorting by on a list this shape.
