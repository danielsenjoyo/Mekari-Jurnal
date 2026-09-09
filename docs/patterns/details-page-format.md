# Details Page Format

> Composition recipe for a **single-record** screen (view / edit one Invoice,
> Contact, Product, …).
> Reference impl: [`app/pages/purchase/invoice/[id].vue`](../../app/pages/purchase/invoice/%5Bid%5D.vue)
> (the Purchase Invoice show page) + its edit form, [`PurchaseTransactionForm.vue`](../../app/components/purchase/PurchaseTransactionForm.vue)
> (rendered by `.../invoice/new.vue` and `.../invoice/edit/[id].vue`). The show
> page's layout was checked directly against a screenshot of the real Jurnal
> product's Purchase Invoice detail screen. It builds on already-established
> primitives (the shell + [`SummaryBox`](./SummaryBox.md),
> [`StatusBadge`](./StatusBadge.md), [`Form`](./Form.md), [`Tabs`](./Tabs.md),
> [`Modal`](./Modal.md)).

## When to use

A page focused on **one record**: its header/identity, key facts, related lists,
and edit/lifecycle actions. For browsing many records use
[`index-page-format`](./index-page-format.md) instead.

## Zone order

A details page is a single `<DefaultPageContent>` whose default slot stacks:

```
┌─ DefaultPageContent ──────────────────────────────────────────────┐
│  #breadcrumb (List page)                                           │  ← page-title-bar
│  title (record identifier) #title-badge (StatusBadge)  #actions     │  ← page-title-bar
│    ....................................  (prev/next only — see below)│
│  #tabs  (Overview · Activity · Documents …)        optional         │  ← Tabs
├─ PageStage (white card) ───────────────────────────────────────────┤
│  [A] Identity row  (key party + contact + the record's one "total")│
│  [B] Summary boxes (record KPIs)                    optional        │  ← SummaryBox
│  [C] Detail sections  (read view  ── OR ──  Form edit view)        │  ← Form
│  [D] Related list(s)  (mini table / line items)                    │  ← TablePage (compact)
│  [E] Bottom action bar: Delete (left) · Edit/More (right)          │
└─────────────────────────────────────────────────────────────────────┘
```

## Zone → pattern map

| Zone | Piece                                        | Pattern                                                                                           |
| ---- | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| —    | Breadcrumb + title + status                  | [`page-title-bar`](./page-title-bar.md) (`breadcrumb`/`breadcrumbTo` props + `#title-badge` slot) |
| —    | Section tabs                                 | [`Tabs`](./Tabs.md)                                                                               |
| A    | Identity row                                 | Plain labeled fields, **no** `StatusBadge` here — it's in the title                               |
| B    | Record KPIs                                  | [`SummaryBox`](./SummaryBox.md)                                                                   |
| C    | Detail sections / edit form                  | [`Form`](./Form.md)                                                                               |
| D    | Related records / line items                 | [`TablePage`](./TablePage.md) (compact — often no bulk bar)                                       |
| E    | Delete + primary/secondary lifecycle actions | Bottom action bar (see below) + [`Modal`](./Modal.md) for Delete                                  |

## Rules

- **One `<DefaultPageContent>`**, same as the index page — the shell frame is identical; only the body zones differ.
- The title is the **record's identifier** (e.g. the transaction number) — not a generic "record's name": for a transactional record like an invoice, the number is the thing users scan for.
- **Status sits next to the title**, via `DefaultPageContent`'s `#title-badge` slot (a [`StatusBadge`](./StatusBadge.md)) — not in the identity row below, and not baked into the title text.
- **The title-band `#actions` slot carries only navigation** (prev/next chevrons) on a details page — the real product puts Edit/Print/Actions/Delete in a **bottom action bar** instead (Zone E), not the title band. Don't put lifecycle buttons at the top; put them at the bottom.
- **Bottom action bar (Zone E):** `Delete` (ghost) on the left; on the right, the secondary actions (`Edit`, a `Print & share` dropdown) then the primary `Actions` dropdown (Duplicate, and anything else that doesn't get its own button) — `justify-content: space-between`, a `gray.100` top border separating it from the content above. Delete opens a confirm [`Modal`](./Modal.md); it does **not** live inside the `Actions` dropdown.
- **Read vs. edit:** a details page's edit mode is a **separate route** rendering a shared form component (`.../new.vue` and `.../edit/[id].vue` both render the same `<XForm :id="…">`), not an `isEditing` flag toggling sections in place — see [`Form`](./Form.md).
- **Related lists are compact tables** — reuse [`TablePage`](./TablePage.md) but usually drop selection/bulk and pagination for short line-item lists. Any cell holding unwrapped text or a link (not an `MpBadge`/`MpTag`) needs explicit `white-space: normal` — `MpTableCell`, `MpTextlink`, and `MpTag` all default to `nowrap`, which spills long content into the next cell instead of wrapping it (see `wrapCellClass` in the reference impl).
- A grid/flex cell holding a value that can run long (an email tag, a wrapped link) needs `min-width: 0` — a grid/flex item's implicit min-width is its content's natural width, which is what lets that content overflow its column in the first place.
- Same styling/token discipline as everywhere: Panda `css()` with Pixel token shortcuts, no inline `style`.

## Nested-route gotcha

A details page almost always lives at a **child route** of its list page (e.g.
`/purchase` → `/purchase/invoice/:id`). In Nuxt's file-based routing, if
`pages/purchase.vue` _and_ `pages/purchase/invoice/[id].vue` both exist,
`purchase.vue` is treated as a **parent layout** for everything under
`pages/purchase/` and must render `<NuxtPage />` to show its children — miss
that and the child route silently renders the parent's own template instead
(no error, just the wrong page). Avoid the whole problem: put the list page at
`pages/purchase/index.vue` instead of `pages/purchase.vue`. A directory with an
`index.vue` does **not** trigger the parent-layout behavior, so `/purchase` and
`/purchase/invoice/:id` render as independent sibling routes.

## Resolved (from the reference impl)

- **Layout:** stacked, not two-column — a full-width identity row, a
  3-column meta grid (`repeat(3, 1fr)`, `css()` grid — no `MpGrid`/`MpStack`
  in this Pixel 3 version), then a full-width line-items table and a
  message/totals row split ~50/40.
- **Breadcrumb:** `DefaultPageContent` takes optional `breadcrumb` (label) +
  `breadcrumbTo` (route) props, rendered as a small link above the title —
  `minHeight` (not a fixed `height`) on the title band lets it grow to fit.
  Omit both props on a page with no parent list (e.g. every index page) and
  the band renders exactly as before.
- **Status badge:** `DefaultPageContent` takes an optional `#title-badge`
  slot, rendered inline right after the title text.
- **Action row sticks:** no — the bottom action bar scrolls with the page,
  same as the index page's filter bar.
- **Dates use one module-wide display format** — `27 Aug 2026`, via
  `formatDisplayDate` in the data module, computed from the record's ISO sort
  field. This originally read `dd/mm/yyyy` here "because the reference
  screenshot showed it that way", while the list page used the month-as-word
  style; the Purchase audit flagged the split as a consistency defect
  (`NNG · H4`). Matching each screen to its own screenshot is right for
  _layout_; it is not a licence for the same value to be **written** two ways
  one click apart. The typed format inside `MpDatePicker` is a separate
  concern and stays `DD/MM/YYYY` — an input mask is not a display format.
- **Unsaved-changes guarding:** not applicable — edit is a separate route
  (see the Rules section above), not in-place state on this page.
- **"Last updated by …" reads as a link**, not plain text (`MpTextlink`, not
  `MpText`) — confirmed from two separate screenshots (Invoice, Order). It was
  wired to nothing on the Purchase and Sales pages; **Fulfillment now opens a
  real audit-log modal** behind it
  ([`FulfillmentAuditModal.vue`](../../app/components/fulfillment/FulfillmentAuditModal.vue)):
  a Date / Action / User / Details table, newest first, with a "Time is shown
  in GMT +7." footnote. The entries are written by the module's own lifecycle
  helpers as the record moves, so the trail cannot disagree with the record —
  which is the part worth copying if the money types grow one. The source app
  binds its Details cell with `v-html` against a server-rendered diff string;
  don't. It is an XSS surface and nothing here needs markup.

## Resolved — Order (the second reference impl)

[`app/pages/purchase/order/[id].vue`](../../app/pages/purchase/order/%5Bid%5D.vue),
also checked directly against a screenshot, confirmed the rules above still
hold and added two more:

- **Bottom-bar actions can be status-conditional.** A closed/finalized
  record drops actions that no longer make sense — Order hides `Delete`
  once `status === "closed"`. Don't render every button unconditionally;
  ask whether the record's current status still permits that action.
- **A related-records section is its own zone**, between the totals block
  and the bottom action bar: a single-tab `MpTabs`/`MpTab` strip (even with
  only one tab — it's the shape that matters, more transaction types would
  add more tabs) over a compact table, gated behind whatever makes the
  relationship exist (Order → its fulfilling Delivery, only when one is
  linked). Reuse an existing record from the shared dataset for its row(s)
  rather than fabricating disconnected display data.
- A type-specific totals line (`amountReceived` → "Payment received" on
  Invoice, `depositAmount` → "Deposit paid" on Order) doesn't need a shared
  abstraction — different fields, different labels, same conditional
  `v-if="… > 0"` + divider shape. Don't force one generic label across types
  that don't share the underlying concept.

## Resolved — Request (the third reference impl)

[`app/pages/purchase/request/[id].vue`](../../app/pages/purchase/request/%5Bid%5D.vue)
confirmed the rules above still hold and added:

- **Not every record type has money.** A Purchase Request has no vendor
  chosen or price committed yet — no balance-due block up top, no price/
  discount/amount columns on the items table, and the totals block becomes a
  single bordered "Total items" card instead of the subtotal/tax/total/
  balance stack. Don't force the monetary shape onto a type that doesn't
  have one; ask what the record actually carries before reusing a zone's
  layout wholesale.
- **A details page can have more than one "identity" concept.** Request has
  a requestor (who filed it), separate `procurementStaff` (who's handling
  it), and an optional not-yet-chosen vendor — three distinct people/parties
  in the same record, each with their own field(s). Don't collapse them into
  one "Vendor" row because that's what the last two reference pages did.
  When a screenshot's fields don't fit a copy-pasted section, the section
  is wrong, not the screenshot.
- **A details page can have a static attachment.** No real file upload/
  storage is modeled in this prototype, so an attachments entry is
  illustrative only — icon + filename + size, download inert. This does
  **not** mean every details page should grow attachments; add it to a page
  only when its reference shows one, and keep it inert unless the request
  scopes real upload/download too.
- **Icon names in the `MpIcon`/`MpTextlink` icon-prop type union aren't all
  actually wired.** `"pdf-document"` type-checks (it's in the union) but
  renders as a giant unstyled full-viewport SVG at runtime — a real
  TypeScript-invisible bug, not a hypothetical one. Stick to icon names
  already confirmed working elsewhere in this repo (the cheat-sheet in
  `index-page-pattern.md` §14) rather than picking a plausible-sounding name
  from the type union; if you must use a new one, check it renders at actual
  size before treating it as done.
- **"Showing N from N products" doesn't always pluralize.** The Request
  screenshot reads "…product" (singular) regardless of count, while
  Invoice/Order both pluralize. Match the exact copy of the screenshot in
  front of you — don't assume copy patterns carry across screens even
  within the same page family.

## Resolved — Quote (the fourth reference impl)

[`app/pages/purchase/quote/[id].vue`](../../app/pages/purchase/quote/%5Bid%5D.vue)
confirmed the rules above still hold, plus:

- **Field labels aren't fixed across types even when the underlying data
  is.** Quote reuses Invoice's `dueDate`/`dueDateSort` fields verbatim, but
  labels the field **"Expiry date"**, not "Due date" — a quote expires, an
  invoice falls due. Relabel per screen; don't assume a shared field name
  implies shared copy.
- **A field present in the data model doesn't have to render on every
  type's page.** `warehouse` exists on every `PurchaseTransaction`, but
  Quote's reference screenshot has no Warehouse row at all (not even a
  blank one) — a quote isn't tied to a warehouse pre-sale — so this page
  simply never renders that field, unlike Invoice/Order's `v-if="warehouse"`
  conditional row. Check the screenshot for the field's presence, not just
  whether the data happens to have a value.
- **Not every priced type has a partial-payment line.** Quote has the same
  priced 7-column table as Invoice/Order, but its totals block is only
  Subtotal → [Tax] → Total → Balance due — no "Payment received"/"Deposit
  paid" row, ever, because a quote is pre-sale and can't be partially paid.
  Don't add a conditional payment line just because the type is priced;
  only add it if the type's lifecycle actually allows partial payment.

## Resolved — Delivery (the fifth reference impl)

[`app/pages/purchase/delivery/[id].vue`](../../app/pages/purchase/delivery/%5Bid%5D.vue)
confirmed the rules above still hold, plus:

- **The bottom action bar's button set is per-type, not a fixed shape.**
  Every prior type used Print & share + Actions dropdowns; Delivery's
  reference screenshot has neither — just two plain buttons, "Preview
  delivery" and "Create invoice" (the real next step in that type's
  workflow). Read the actual buttons off the screenshot; don't assume the
  dropdown pair is a fixed part of this pattern.
- **A cross-type relationship can go both ways, and should be a live
  lookup, not a second stored field.** Order → Delivery is already modeled
  (`linkedDeliveryId` on the Order record); Delivery's own "Order no." field
  is the _reverse_ of that same relationship, computed with
  `find(t => t.type === "order" && t.linkedDeliveryId === this.id)` rather
  than adding a second `linkedOrderId` field that could drift out of sync
  with the first. When two types reference each other, store the link once
  and derive the other direction.
- **Once a second page in a relationship exists, go back and wire the
  first one's link to it.** Order's page linked to a Delivery back when no
  Delivery page existed yet, so that link was correctly a documented no-op
  at the time — but it silently stayed a no-op after this page shipped,
  because nothing forced revisiting it. Building page N is also the moment
  to check pages 1..N-1 for "no detail page yet" links that this one just
  resolved.

## Resolved — Join Invoice (the sixth reference impl)

[`app/pages/purchase/join-invoice/[id].vue`](../../app/pages/purchase/join-invoice/%5Bid%5D.vue)
is the first page to depart from the shared shell in real structural ways,
not just field/label substitutions:

- **A type's numbering scheme isn't universal.** Every other type reads
  `"{Label} #{14025 + id}"`; Join Invoice reads `"Join Invoice - 10002"` —
  a different separator, no `Purchase` prefix, and its own offset. Check the
  screenshot's title/Transaction-no. field for the _exact_ format before
  assuming the established scheme applies — it's a per-type decision, not a
  fixed rule of the pattern.
- **A details page's "items" table doesn't have to hold line items at
  all.** A join invoice bundles _other whole Invoice records_ for combined
  billing — its table lists them (Purchase invoice / Due date / Status /
  Amount billed / Remaining billed), reusing `total`/`balanceDue` off the
  real linked records (`joinedInvoiceIds`, resolved the same way Order →
  Delivery's `linkedDeliveryId` is: a forward reference set once at
  generation time, resolved by lookup on the page, and — this is the new
  part — the join invoice's _own_ summary figures are the **sum** of the
  linked records', not independently generated).
- **Some pages genuinely have no bottom action bar.** Join Invoice's
  reference screenshot has no Delete, no Edit, no "Last updated by" — full
  stop. It reads as a read-only rollup of other documents, not something
  edited or deleted in its own right. Don't add a bottom bar (or any zone)
  a screenshot doesn't show, even though every prior page had one.
- **The nowrap-overflow bug (see the Request entry above) hits numeric
  cells too, not just text/links.** A currency string ("Rp10.016.640,00") is
  exactly as capable of overflowing a narrow column as prose is — the fix
  (`white-space: normal` + `word-break: break-word`) needs to be applied
  with `text-align: right` preserved, not skipped because the content
  "looks short."

## The record-not-found state

Every details page needs one (a stale link, a deleted record, a mistyped id),
and it must get the **same treatment as the list page's search-empty state** —
illustration, title, one line of recovery copy, and an action back to the list:

```vue
<BlankSlate
  v-if="!record"
  title="Invoice not found"
  description="This invoice may have been deleted, or the link you followed may be out of date."
>
  <MpButton variant="secondary" @click="navigateTo('/purchase')">Back to Purchases</MpButton>
</BlankSlate>
```

`variant` defaults to `not-found`, which is right here — the record was asked
for and isn't there. See [`BlankSlate`](./BlankSlate.md).

Two rules the Purchase audit had to correct here:

- **Don't let two empty states in one module get different levels of care.**
  The list's search-empty state had an illustration and tailored copy while
  every details page's not-found state was bare centred text — the same
  situation dressed two ways (`CHOICE · Holistic`).
- **Keep implementation vocabulary out of the copy.** The original read _"This
  invoice doesn't exist in this prototype's mock data."_ — "prototype" and
  "mock data" are the build team's words, not the user's, and that phrasing
  gets copied forward into the real product (`CHOICE · Emotional`). Say what
  happened and what to do next.

## Never set `display` on a table cell

This one shipped broken on **all six** pages at once, so it earns its own
section. The wrap fix above was originally written as:

```ts
// WRONG — `display: inline-block` on a <td>
const wrapCellClass = css({
  whiteSpace: "normal!",
  wordBreak: "break-word",
  maxWidth: "full",
  display: "inline-block",
  textAlign: "left"
});
```

…and applied straight to the cell: `<MpTableCell as="td" :class="wrapCellClass">`.
A `<td>` must stay `display: table-cell`. Making it `inline-block` drops it
out of the table's column model entirely, so the browser lays each cell out
as an inline box sized to _its own content_ and draws the row borders and
column edges against that — the rows render visibly ragged, with underlines
of different lengths per row and stray vertical rules at the old column
boundaries. It looks like a border/spacing bug, which sends you hunting in
the wrong place; the cause is the `display` override.

Split the two cases instead — the cell gets wrapping only, and any inline
child that ships its own `nowrap` (`MpTag`, `MpTextlink`) gets the
inline-block box:

```ts
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" }); // on <td>
const wrapInlineClass = css({
  whiteSpace: "normal!",
  wordBreak: "break-word",
  maxWidth: "full",
  display: "inline-block"
}); // on MpTag only
```

`wrapInlineClass` is for `MpTag`. An `MpTextlink` needs the same wrap rules
**plus** a 2px margin correction — use `textlinkCellClass` from
[`app/utils/textlink-align.ts`](../../app/utils/textlink-align.ts) instead
(see [`TablePage`](./TablePage.md#body) for why). Reusing `wrapInlineClass` on
a link leaves its text 2px off the edge every plain-text sibling sits on.

Quick check when a table looks "off": read `getComputedStyle(td).display`
— it must be `table-cell` — and confirm one column's `getBoundingClientRect().x`
is identical across every row.

Update this file when a seventh details page's reference reveals a rule
these six didn't need, or a real-product screenshot corrects something
here. Financing is the only transaction type left without one.
