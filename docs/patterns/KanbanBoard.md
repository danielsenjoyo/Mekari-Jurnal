# Kanban Board

> A collection shown as **stages of one process** rather than rows of a table.
> Reference impl:
> [`FulfillmentBoard.vue`](../../app/components/fulfillment/FulfillmentBoard.vue)
> and [`FulfillmentCard.vue`](../../app/components/fulfillment/FulfillmentCard.vue),
> rendered by the two Fulfillment boards
> ([`app/pages/fulfillment/sales/index.vue`](../../app/pages/fulfillment/sales/index.vue),
> [`.../purchases/index.vue`](../../app/pages/fulfillment/purchases/index.vue)).

## When to use — and when not to

Use a board when **the status column is the point**: the user's question is
"what is stuck, and where?", not "find me this record". Fulfillment is the
case — a warehouse works the pipeline left to right, and an order's stage is
the thing that changes hour to hour.

Use an [index page](./index-page-format.md) for everything else. Almost every
screen in this app is a list of records the user filters and sorts; a board
trades sorting, bulk actions, pagination and column choice for one glance at
the pipeline, and that is a bad trade unless the pipeline is the subject.

**One test:** if you would want to sort by amount, or select rows and act on
them together, you want a table.

## Zone order

```
┌─ DefaultPageContent ──────────────────────────────────────────────┐
│  title + subtitle                                                  │  ← page-title-bar
├─ PageStage (white card) ───────────────────────────────────────────┤
│  [A] Filter bar   quick filters ····················· Reload  🔍   │  ← FilterBar
│  [B] Columns      ┌────────┐┌────────┐┌────────┐┌────────┐         │
│                   │ header ││ header ││ header ││ header │         │
│                   ├────────┤├────────┤├────────┤├────────┤         │
│                   │ card   ││ card   ││        ││ card   │         │
│                   │ card   ││        ││        ││        │         │
│                   └────────┘└────────┘└────────┘└────────┘         │
│      ── OR ──  BlankSlate, when every column is empty              │
└─────────────────────────────────────────────────────────────────────┘
```

## Zone → pattern map

| Zone | Piece                  | Pattern                                                         |
| ---- | ---------------------- | --------------------------------------------------------------- |
| A    | Quick filters + search | [`FilterBar`](./FilterBar.md) — same zone, same controls        |
| B    | Column header count    | [`StatusBadge`](./StatusBadge.md) — the badge carries the stage |
| B    | Card                   | See "The card" below                                            |
| —    | Nothing matched        | [`BlankSlate`](./BlankSlate.md)                                 |

## Rules

- **The board replaces the table, not the page.** Everything above the stage is
  unchanged: one `<DefaultPageContent>`, the standard title band, the standard
  filter-bar zone. Only what fills the stage differs.
- **The columns are the status vocabulary, and the mapping is total.** Every
  status resolves to exactly one column (`FULFILLMENT_BOARD_COLUMN` in
  [`app/data/fulfillment-status.ts`](../../app/data/fulfillment-status.ts)).
  More than one status may share a column — Fulfillment files `picked` under
  "In progress", because the distinction only matters on the detail page — but
  a status that maps to no column is a record that silently vanishes.
- **Render every column, always, even empty ones.** A column that disappears
  when it empties makes the board's shape change under the user as they type in
  the search box, and "nothing is in progress" is itself the answer to the
  question a board is asked. An empty column shows a quiet one-liner, not a
  `BlankSlate` — a 240px illustration in a 176px column is absurd.
- **When _every_ column is empty, swap the whole board for one `BlankSlate`**
  with a Clear filters action. Five empty headers say "your filter matched
  nothing" five times and offer no way out.
- **No per-column background tint.** The obvious design — wash each header in
  its stage's colour — is not available: Pixel v2.1 ships `.50` steps for
  blue/gray/green/orange/red only, and Panda emits the class for a missing token
  **silently**, so a column keyed to `sky.50` renders with no background at all
  and nothing warns you (same failure mode as the missing spacing steps —
  [`tokens.md` §3](../tokens.md)). The count badge carries the stage colour
  instead, typed from the status map, which is an on-system signal that says
  the same thing.
- **Column width is a hard constraint, not a preference.** A board's whole
  claim is that the pipeline fits in one glance, so the columns must fit the
  stage without sideways scrolling at the narrowest desktop that matters —
  1440px **with the sidebar and a submenu open**, which leaves 968px of stage.
  Five columns at 220px do not fit and the last one falls off the right edge;
  176px is what fits and is still wide enough for the longest record number.
  Measure it, and write the arithmetic down next to the value.
- **Reload, not pagination.** A board has no pages. The source app's Reload
  button is what stands in for "fetch again", and against this prototype's
  in-memory data it has real work to do: the arrays are mutated in place and an
  in-place write is not reactive, so Reload bumps a token the board's computed
  depends on.
- **The period filter's default follows the data, not the source app.** The
  real product opens on "Last 7 days" because a warehouse raises orders daily.
  Against 13 fixture orders spaced three days apart, that default renders an
  empty board — the filter hiding the very thing the page exists to show. Same
  intent, different data density, so the default differs. `DEFAULT_DURATION`
  says so in one place.

## The card

The card is a link, not a `<div>` with a click handler — one card, one
destination, and a real `<a>` gets middle-click, open-in-new-tab and keyboard
focus for free.

Its content is **one identifier, one name, and only the facts that have
happened**: a card in "New order" shows an order date, a completed one also
shows delivery, receive and courier. Don't render a fixed field list with em
dashes for the ones that don't apply yet — the absence is the information.

A qualifier that isn't a status (Fulfillment's "Partially completed") goes on
the card as an `MpBadge`, **not** as another column: it describes the record
inside the stage it is already in. That is also what keeps it inside
`MpBadge`'s two-word budget — the column supplies the other half of the
sentence, so one badge reads correctly in both "Completed" ("completed, but
short") and "Canceled" ("canceled, but some went out").

## Keeping the sidebar count honest

The Fulfillment submenu in [`app/data/menu.ts`](../../app/data/menu.ts) carries
static counts (`Sales 4`, `Purchases 2`). They are the count of the **first
column**, and the fixtures are weighted to land on exactly those numbers. A
board whose "New order" header says 6 under a submenu badge saying 4 reads as a
bug in the product. If you change the fixture distribution, change the menu — or
make the menu read the data.

## Gotcha — an in-place mutation is not reactive twice over

The board's data lives in a plain array that the lifecycle helpers write to in
place. Two separate consequences, both of which shipped broken once:

1. A computed reading that array needs a version token to depend on
   (`reloadToken` here, `refreshTick` on the index pages).
2. A computed returning **one record out of** that array must return a _fresh
   wrapper_ (`{ ...found }`), because Vue only propagates to dependent computeds
   when the value changes by `===`. Returning the mutated object directly left
   the detail page's quantity columns and action button on their cached values
   while the status badge updated — see
   [`FulfillmentOrderDetail.vue`](../../app/components/fulfillment/FulfillmentOrderDetail.vue).

Update this file when a second board reveals a rule Fulfillment did not need.
