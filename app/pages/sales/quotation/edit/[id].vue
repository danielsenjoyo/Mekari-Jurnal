<template>
  <SalesTransactionForm type="quotation" :record-id="recordId" />
</template>

<script setup lang="ts">
import SalesTransactionForm from "~/components/sales/SalesTransactionForm.vue";

const route = useRoute();
const recordId = computed(() => Number(route.params.id));

useHead({ title: "Edit sales quotation — Mekari Jurnal" });
</script>
