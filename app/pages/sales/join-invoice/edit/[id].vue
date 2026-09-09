<template>
  <SalesJoinInvoiceForm :record-id="recordId" />
</template>

<script setup lang="ts">
import SalesJoinInvoiceForm from "~/components/sales/SalesJoinInvoiceForm.vue";

const route = useRoute();
const recordId = computed(() => Number(route.params.id));

useHead({ title: "Edit join sales invoice — Mekari Jurnal" });
</script>
