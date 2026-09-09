<template>
  <div :class="rootClass">
    <!-- Filter bar. Same zone and same controls as an index page's
         (docs/patterns/FilterBar.md) — quick filters left, search right — with
         Reload standing in for the pagination an index page would have: a
         board has no pages, so re-reading the data is the only "fetch again"
         affordance it can offer. -->
    <div :class="filterBarClass">
      <div :class="filterLeftClass">
        <div :class="quickFilterClass">
          <MpSelect
            v-model="warehouse"
            placeholder="All warehouses"
            aria-label="Filter by warehouse"
            is-full-width
            is-clearable
          >
            <option value="">All warehouses</option>
            <option v-for="name in warehouses" :key="name" :value="name">{{ name }}</option>
          </MpSelect>
        </div>
        <div :class="quickFilterClass">
          <MpSelect v-model="duration" aria-label="Filter by period" is-full-width>
            <option v-for="opt in DURATION_OPTIONS" :key="opt.label" :value="opt.label">
              {{ opt.label }}
            </option>
          </MpSelect>
        </div>
      </div>

      <div :class="filterRightClass">
        <MpButton variant="secondary" left-icon="refresh" @click="onReload">Reload</MpButton>
        <div :class="searchGroupClass">
          <MpInputGroup>
            <MpInputLeftAddon>
              <MpIcon name="search" size="sm" color="gray.400" />
            </MpInputLeftAddon>
            <MpInput v-model="search" placeholder="Search order no. or name..." />
          </MpInputGroup>
          <button
            v-if="search"
            type="button"
            data-search-clear
            aria-label="Clear search"
            :class="searchClearClass"
            @click="search = ''"
          >
            <MpIcon name="reset" size="sm" color="gray.400" />
          </button>
        </div>
      </div>
    </div>

    <!-- The board itself. When every column is empty the columns are replaced
         wholesale by one blank slate: five empty headers say "your filter
         matched nothing" five times and offer no way out, which is exactly the
         case docs/patterns/BlankSlate.md exists for. A *single* empty column
         keeps its header — that is information, not an error. -->
    <BlankSlate
      v-if="isBoardEmpty"
      variant="not-found"
      title="No orders match this view"
      :description="emptyDescription"
    >
      <MpButton variant="secondary" @click="resetFilter">Clear filters</MpButton>
    </BlankSlate>

    <div v-else :class="boardClass">
      <section v-for="column in board" :key="column.key" :class="columnClass">
        <header :class="columnHeadClass">
          <MpText weight="semiBold" color="dark">{{ column.title }}</MpText>
          <MpBadge for="additionalInformation" :type="FULFILLMENT_STATUS_TYPE[column.key]">
            {{ column.orders.length }}
          </MpBadge>
        </header>
        <div :class="columnBodyClass">
          <FulfillmentCard v-for="order in column.orders" :key="order.id" :order="order" />
          <MpText v-if="!column.orders.length" size="body-small" color="gray.400">
            Nothing here.
          </MpText>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  css,
  MpBadge,
  MpButton,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpSelect,
  MpText
} from "@mekari/pixel3";
import BlankSlate from "~/components/template/BlankSlate.vue";
import FulfillmentCard from "~/components/fulfillment/FulfillmentCard.vue";
import { FULFILLMENT_STATUS_TYPE } from "~/data/fulfillment-status";
import {
  DEFAULT_DURATION,
  DURATION_OPTIONS,
  getFulfillmentBoard,
  warehouseOptions,
  type FulfillmentDirection
} from "~/data/fulfillment";

/**
 * The Fulfillment kanban board — a filter bar over a row of status columns.
 *
 * Cloned from jurnal-frontend-app's `src/pages/outbounds/index.vue` and its
 * near-identical twin `src/pages/inbounds/index.vue`, which differ only in
 * how many columns they render. One component with a `direction` prop is the
 * same two screens without the copy: the column set comes from
 * `getFulfillmentBoard`, which reads it off OUTBOUND_COLUMNS/INBOUND_COLUMNS.
 *
 * Two things from the source are deliberately dropped:
 *
 *   - **The module's own left sidebar.** The source renders a second, in-page
 *     nav rail listing Sales/Purchases. This app already has one — the
 *     Fulfillment submenu in app/data/menu.ts — and two nav rails one inside
 *     the other is the kind of duplication docs/design.md §1 rules out ("pages
 *     must not render the navbar or sidebar themselves").
 *   - **Infinite scroll per column.** The source paginates each column at 10
 *     with a virtual list. The dataset here is 13 orders per board, so the
 *     machinery would never fire; a column that grows past a screenful simply
 *     scrolls.
 */
const props = defineProps<{
  direction: FulfillmentDirection;
}>();

const warehouse = ref("");
const duration = ref(DEFAULT_DURATION.label);
const search = ref("");

// Bumped by Reload. The board is a computed over an in-memory array, so it has
// no fetch to re-run — but the mutations in ~/data/fulfillment (process, pick,
// deliver, …) write to that array in place, and an in-place write to a plain
// array is not reactive. Depending on this ref is what makes Reload actually
// re-read, rather than being a button that does nothing.
const reloadToken = ref(0);
function onReload() {
  reloadToken.value += 1;
}

const warehouses = computed(() => warehouseOptions(props.direction));

const filter = computed(() => ({
  warehouse: warehouse.value,
  days: DURATION_OPTIONS.find((o) => o.label === duration.value)?.days ?? null,
  search: search.value
}));

const board = computed(() => {
  void reloadToken.value;
  return getFulfillmentBoard(props.direction, filter.value);
});

const isBoardEmpty = computed(() => board.value.every((c) => !c.orders.length));

// Both stay inside the blank slate's 60-character description budget, which is
// why the search variant does not quote the term back: a long search string
// would blow the limit and wrap the slate.
const emptyDescription = computed(() =>
  search.value.trim()
    ? "No order matches your search in this period."
    : "Try a longer period, or a different warehouse."
);

function resetFilter() {
  warehouse.value = "";
  duration.value = DEFAULT_DURATION.label;
  search.value = "";
}

const rootClass = css({ display: "flex", flexDirection: "column", height: "full" });

const filterBarClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 3,
  flexWrap: "wrap",
  mb: 6
});
const filterLeftClass = css({ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" });
const filterRightClass = css({ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" });
const quickFilterClass = css({ width: "200px" });

const searchGroupClass = css({
  position: "relative",
  width: "280px",
  "& [data-search-clear]": { opacity: 0, transition: "opacity 0.12s ease" },
  "&:hover [data-search-clear], &:focus-within [data-search-clear]": { opacity: 1 }
});
const searchClearClass = css({
  position: "absolute",
  top: "50%",
  right: "3",
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "0",
  bg: "transparent",
  p: 0,
  cursor: "pointer",
  lineHeight: "0"
});

// Columns are equal-width and share the row; below ~1100px they stop fitting
// and the board scrolls sideways rather than crushing five 160px columns into
// unreadable slivers.
const boardClass = css({
  display: "flex",
  alignItems: "stretch",
  gap: 3,
  flex: "1 1 auto",
  minHeight: "0",
  overflowX: "auto"
});
const columnClass = css({
  display: "flex",
  flexDirection: "column",
  flex: "1 1 0",
  // 176px, measured rather than taken from Figma (the source app's board has
  // no fixed column width — it uses `w: 20%` with a 160px floor).
  //
  // The number matters more than it looks: a kanban's whole claim is that you
  // see the pipeline in one glance, so five columns have to fit the stage
  // without sideways scrolling at the narrowest desktop that matters — 1440px
  // with the sidebar *and* the Fulfillment submenu open, which leaves the
  // stage 968px of content box. 5 × 176 + 4 × 12 of gap = 928. At 220px they
  // don't fit, and the last column (Canceled) falls off the right edge.
  //
  // 176 is also the floor for legibility: "Sales Order #24052" sets at ~128px
  // in the card's semibold body, plus the card's and column's 24px of padding
  // each. Below this it wraps.
  minWidth: "176px",
  minHeight: "0"
});
const columnHeadClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 2,
  px: 3,
  py: 2,
  bg: "gray.25",
  borderWidth: "sm",
  borderColor: "gray.100",
  roundedTop: "md",
  flexShrink: 0
});
const columnBodyClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  p: 2,
  flex: "1 1 auto",
  minHeight: "0",
  overflowY: "auto",
  bg: "gray.25",
  borderWidth: "sm",
  borderTopWidth: "0",
  borderColor: "gray.100",
  roundedBottom: "md"
});
</script>
