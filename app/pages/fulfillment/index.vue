<script setup lang="ts">
// `/fulfillment` is the submenu owner's own route (app/data/menu.ts), so it is
// reachable — but Fulfillment has no landing page of its own: the module *is*
// its two boards. Land on the first submenu item rather than showing an empty
// stub, the same destination clicking "Sales" in the submenu would reach.
definePageMeta({ redirect: "/fulfillment/sales" });
</script>

<template>
  <div />
</template>
