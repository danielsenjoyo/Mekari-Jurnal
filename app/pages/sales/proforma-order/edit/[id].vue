<template>
  <SalesProFormaOrderForm :record-id="recordId" />
</template>

<script setup lang="ts">
import SalesProFormaOrderForm from "~/components/sales/SalesProFormaOrderForm.vue";

const route = useRoute();
const recordId = computed(() => Number(route.params.id));

useHead({ title: "Edit pro forma order — Mekari Jurnal" });
</script>
