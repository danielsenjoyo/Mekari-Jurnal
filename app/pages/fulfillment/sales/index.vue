<template>
  <DefaultPageContent
    title="Sales fulfillment"
    subtitle="Sales orders on their way out of the warehouse, from picking to delivery."
  >
    <FulfillmentBoard direction="outbound" />
  </DefaultPageContent>
</template>

<script setup lang="ts">
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import FulfillmentBoard from "~/components/fulfillment/FulfillmentBoard.vue";

// ---------------------------------------------------------------------------
// Cloned from jurnal-frontend-app src/pages/outbounds/index.vue.
//
// It lives at `sales/index.vue` rather than `sales.vue` on purpose: with a
// sibling `sales/[id].vue`, a `sales.vue` would become that route's *parent
// layout* and silently render itself instead of the detail page. See
// docs/patterns/details-page-format.md § "Nested-route gotcha".
//
// Everything on the page is in <FulfillmentBoard>, which the Purchases board
// shares — the two source modules are the same screen with a different column
// set.
// ---------------------------------------------------------------------------

useHead({ title: "Sales fulfillment — Mekari Jurnal" });
</script>
