<template>
  <!-- The whole card is the link, not a button inside it: a kanban card has
       one destination, and making it a real <a> is what gives it middle-click,
       open-in-new-tab and keyboard focus for free. -->
  <NuxtLink :to="to" :class="cardClass">
    <div :class="headClass">
      <MpText weight="semiBold" color="dark">{{ order.orderNumber }}</MpText>
      <MpText size="body-small" color="gray.600" :class="wrapClass">{{ order.personName }}</MpText>
      <!-- "Closed short". Not a status (see app/data/fulfillment-status.ts) —
           it qualifies the column the card is already sitting in, which is
           why one badge covers both flags: in the Completed column it reads
           "completed, but short", and in Canceled it reads "canceled, but
           some of it went out". The column supplies the other half, so the
           badge stays inside MpBadge's two-word budget. -->
      <MpFlex v-if="isPartial" mt="1">
        <MpBadge for="additionalInformation" size="sm" type="warning">
          Partially completed
        </MpBadge>
      </MpFlex>
    </div>

    <dl :class="factsClass">
      <div v-for="fact in facts" :key="fact.label" :class="factClass">
        <MpText as="dt" size="body-small" color="gray.600">{{ fact.label }}</MpText>
        <MpText as="dd" size="body-small" color="dark" :class="wrapClass">{{ fact.value }}</MpText>
      </div>
    </dl>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { css, MpBadge, MpFlex, MpText } from "@mekari/pixel3";
import { formatDisplayDate, type FulfillmentOrder } from "~/data/fulfillment";

/**
 * One card on a Fulfillment kanban board.
 *
 * Cloned from jurnal-frontend-app's
 * `src/pages/outbounds/components/kanban-item/kanban-item.vue`. The source
 * renders a fixed stack of `v-if`-guarded blocks; here the same rule ("show a
 * date only once it has happened") is one list, so a card in the New order
 * column shows exactly one fact and a completed one shows four, without four
 * separate conditionals in the template.
 */
const props = defineProps<{
  order: FulfillmentOrder;
}>();

const isPartial = computed(
  () => props.order.completedPartially || props.order.completedPartiallyAndCanceled
);

const to = computed(() => {
  const board = props.order.direction === "outbound" ? "sales" : "purchases";
  return `/fulfillment/${board}/${props.order.id}`;
});

const facts = computed(() => {
  const { order } = props;
  const rows: { label: string; value: string }[] = [
    { label: "Order date", value: formatDisplayDate(order.orderDate) }
  ];
  if (order.deliveryDate)
    rows.push({ label: "Delivery date", value: formatDisplayDate(order.deliveryDate) });
  if (order.receiveDate)
    rows.push({ label: "Receive date", value: formatDisplayDate(order.receiveDate) });
  if (order.cancelDate)
    rows.push({ label: "Cancel date", value: formatDisplayDate(order.cancelDate) });
  if (order.courier) rows.push({ label: "Courier", value: order.courier });
  return rows;
});

const cardClass = css({
  display: "block",
  bg: "white",
  borderWidth: "sm",
  borderColor: "gray.100",
  rounded: "md",
  p: 3,
  transitionProperty: "border-color, box-shadow",
  transitionDuration: "fast",
  transitionTimingFunction: "var(--motion-ease-out)",
  _hover: { borderColor: "blue.400", shadow: "sm" }
});

const headClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 1,
  pb: 2,
  mb: 2,
  borderBottomWidth: "sm",
  borderColor: "gray.50"
});

const factsClass = css({ display: "flex", flexDirection: "column", gap: 2, margin: 0 });
// minWidth:0 so a long product/customer name wraps inside the column instead
// of widening the card past it — see docs/patterns/details-page-format.md.
const factClass = css({ display: "flex", flexDirection: "column", gap: 0, minWidth: "0" });
// MpText renders nowrap by default; a customer name is the one value on this
// card that regularly exceeds the column width.
const wrapClass = css({ whiteSpace: "normal!", wordBreak: "break-word" });
</script>
