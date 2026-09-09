<template>
  <SalesTransactionForm type="proforma_invoice" :record-id="recordId" />
</template>

<script setup lang="ts">
import SalesTransactionForm from "~/components/sales/SalesTransactionForm.vue";

const route = useRoute();
const recordId = computed(() => Number(route.params.id));

useHead({ title: "Edit pro forma invoice — Mekari Jurnal" });
</script>
