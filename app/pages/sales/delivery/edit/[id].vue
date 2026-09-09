<template>
  <SalesDeliveryForm :record-id="recordId" />
</template>

<script setup lang="ts">
import SalesDeliveryForm from "~/components/sales/SalesDeliveryForm.vue";

const route = useRoute();
const recordId = computed(() => Number(route.params.id));

useHead({ title: "Edit sales delivery — Mekari Jurnal" });
</script>
