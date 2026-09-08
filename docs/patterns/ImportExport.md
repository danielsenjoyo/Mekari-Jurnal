# Import & Export

> Part of the Mekari Jurnal page-construction pattern set.
> Reference impls: [`ProductImportModal.vue`](../../app/components/products/ProductImportModal.vue),
> [`ProductExportModal.vue`](../../app/components/products/ProductExportModal.vue),
> [`products-io.ts`](../../app/data/products-io.ts), [`csv.ts`](../../app/utils/csv.ts).
> See also [`Modal.md`](./Modal.md), [`page-title-bar.md`](./page-title-bar.md).

## Purpose

Getting a list's records out of the app as a file, and a file of records back in.
Two flows, one shape: a menu in the title band, then a modal that decides what
the file contains.

## Where the controls go

On the **list toolbar** (Zone C), on the right, before search and Filter — never
in the title band. The title band is the page's `Actions` menu; Import and Export
belong to one list each, so they belong to that list's bar. See
[`FilterBar`](./FilterBar.md#order-within-the-bar).

**Each tab gets the import and export of its own records**, and nothing else. On
the Products page that means: the product list imports products (three kinds) and
exports products; the warehouse list, transfer list and transfer approvals each
import their own entity; the stock adjustment list exports; the variant list and
price rules get neither.

**Menu or button, by count.** More than one kind → an `MpPopover` (the product
list's Import has SINGLE / BUNDLE groups; its Export offers products or bundles).
Exactly one → a plain `MpButton`. A menu with one entry makes the user click
twice to reach the only thing there is.

## Import — three steps and a stage

```
[ before-upload ]  Step 1 Download template → Step 2 Fill it → Step 3 Upload
       ↓ Continue
[ preference ]     (update imports only: what to do with blank cells)
       ↓ Continue
[ progress ]       where the result will show up · [Understood]
```

Rules:

- **Number the steps.** They are sequential and step 1 produces the file step 3
  wants; an upload box with a template link beside it loses that order.
- **The preference stage is for update imports only.** A create import has
  nothing to overwrite, so asking about blanks is a question with no meaning.
- **Collapse the filling conditions** behind their own toggle. Five lines of
  rules nobody reads twice shouldn't push the upload box below the fold.
- **`MpUpload`, wrapped in `MpFormControl`.** Its props are `accept`,
  `button-text`, `placeholder`, `is-invalid`, with `@change` / `@clear`; validate
  the extension yourself and drive `is-invalid` + `MpFormErrorMessage` from it.
  Remount it with a `:key` to clear the underlying file input.
- **Reset every stage on reopen.** A file picked for last week's import still
  sitting in step 3 is worse than an empty box.

## Export — a column picker for a file

A checkbox grid over the record's fields, in **three columns** (twenty-odd
labels in one column is a scroll and in two is a wall), with:

- An **"All information"** master checkbox — `is-indeterminate` while some are
  ticked; it can't untick the locked ones.
- **Locked fields** (`isLocked`) for whatever identifies the row. A file with no
  product name identifies nothing.
- One **scope checkbox** below the rule ("Exclude products outside inventory").
- Defaults restored on reopen: the previous run's ticks were a choice for one
  file, not a saved setting.

A record type whose rows are nested (a bundle and its components) gets its **own
export with a fixed shape**, not a column in the main one: one row per child with
the parent's columns repeated.

**A transaction list needs no picker.** It has one shape, so its Export is a
button that writes the tab's own visible columns for the filtered, sorted rows —
the list on screen, as a file (`exportCurrentTab`). Only a record with many
optional fields earns the modal.

## Producing the file

This prototype has no backend, and a "Download template" that hands back nothing
demonstrates nothing — the file _is_ the feature. So both build a real CSV in the
browser through [`app/utils/csv.ts`](../../app/utils/csv.ts):

- `toCsv(header, rows)` quotes every field (a leading zero in a product code
  survives quoting and is eaten without it) and prefixes a UTF-8 BOM so Excel on
  Windows doesn't mojibake Indonesian text.
- `downloadCsv(name, content)` clicks an object-URL anchor and revokes the URL on
  the next frame — revoking in the same tick can beat the download it started.

Column lists and per-kind copy live in a `*-io.ts` data module beside the
records, never inline in the modal: the two flows describe the same thing from
two directions, and the record store shouldn't carry two screens' worth of copy.

## Gotchas

- The import's other direction is **not** modelled: nothing reads an uploaded
  file back into the store. The stages advance without parsing it.
- Custom fields and role/package gating of price columns are source features this
  prototype has no data for; they are left out rather than shown empty.
