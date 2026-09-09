<template>
  <dl :class="rootClass">
    <div :class="fieldClass">
      <MpText as="dt" color="gray.600">{{ PERSON_LABEL[order.direction] }}</MpText>
      <MpText as="dd" :class="valueClass">{{ order.personName }}</MpText>
    </div>
    <div :class="fieldClass">
      <MpText as="dt" color="gray.600">Order date</MpText>
      <MpText as="dd" :class="valueClass">{{ formatDisplayDate(order.orderDate) }}</MpText>
    </div>
    <div :class="fieldClass">
      <MpText as="dt" color="gray.600">{{ SOURCE_ORDER[order.direction].label }}</MpText>
      <dd :class="valueClass">
        <MpTextlink
          as="button"
          variant="primary"
          :class="textlinkAlignClass"
          @click="navigateTo(SOURCE_ORDER[order.direction].route(order.transactionId))"
          >{{ order.orderNumber }}</MpTextlink
        >
      </dd>
    </div>
    <div :class="fieldClass">
      <MpText as="dt" color="gray.600">Reference no.</MpText>
      <MpText as="dd" :class="valueClass">{{ order.referenceNo || "—" }}</MpText>
    </div>
    <div :class="fieldClass">
      <MpText as="dt" color="gray.600">Warehouse</MpText>
      <MpText as="dd" :class="valueClass">{{ order.warehouse || "—" }}</MpText>
    </div>
  </dl>
</template>

<script setup lang="ts">
import { css, MpText, MpTextlink } from "@mekari/pixel3";
import { textlinkAlignClass } from "~/utils/textlink-align";
import {
  formatDisplayDate,
  PERSON_LABEL,
  SOURCE_ORDER,
  type FulfillmentOrder
} from "~/data/fulfillment";

/**
 * The read-only "which order is this?" block every Fulfillment drawer opens
 * with, so the user acting in a drawer can still see what they are acting on.
 *
 * jurnal-frontend-app repeats this markup verbatim in four files
 * (process-order, create-picking-list, create-delivery-note, create-receipt,
 * plus both inbound twins). One component, and the counterparty label follows
 * the order's direction rather than the file it was copied into.
 */
defineProps<{ order: FulfillmentOrder }>();

const rootClass = css({ display: "flex", flexDirection: "column", gap: 3, margin: 0, mb: 6 });
const fieldClass = css({ display: "flex", flexDirection: "column", gap: 0, minWidth: "0" });
const valueClass = css({
  margin: 0,
  whiteSpace: "normal!",
  wordBreak: "break-word"
});
</script>
