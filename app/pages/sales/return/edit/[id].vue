<template>
  <SalesReturnForm :record-id="recordId" />
</template>

<script setup lang="ts">
import SalesReturnForm from "~/components/sales/SalesReturnForm.vue";

const route = useRoute();
const recordId = computed(() => Number(route.params.id));

useHead({ title: "Edit sales return — Mekari Jurnal" });
</script>
