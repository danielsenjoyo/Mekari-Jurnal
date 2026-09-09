<template>
  <DefaultPageContent
    title="Purchase fulfillment"
    subtitle="Purchase orders on their way in, until the goods are received."
  >
    <FulfillmentBoard direction="inbound" />
  </DefaultPageContent>
</template>

<script setup lang="ts">
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import FulfillmentBoard from "~/components/fulfillment/FulfillmentBoard.vue";

// ---------------------------------------------------------------------------
// Cloned from jurnal-frontend-app src/pages/inbounds/index.vue — the inbound
// twin of the Sales board. Three columns rather than five: a purchase
// fulfillment has no picking or delivery stage of its own, the goods simply
// arrive (see INBOUND_COLUMNS in app/data/fulfillment-status.ts).
//
// `purchases/index.vue`, not `purchases.vue` — see the note on the Sales board.
// ---------------------------------------------------------------------------

useHead({ title: "Purchase fulfillment — Mekari Jurnal" });
</script>
