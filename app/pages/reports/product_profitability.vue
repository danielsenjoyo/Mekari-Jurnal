<template>
  <DefaultPageContent title="Product profitability" breadcrumb="Reports" breadcrumb-to="/reports">
    <template #actions>
      <ReportExportButton :is-disabled="!hasRun" :row-count="filteredRows.length" />
    </template>

    <ReportFilterBar
      v-model:start-date="filter.startDate"
      v-model:end-date="filter.endDate"
      v-model:period-id="filter.periodId"
      :periods="SALES_REPORT_PERIODS"
      :is-valid="isRangeValid"
      :is-filter-active="isDrawerFilterActive"
      @run="runReport"
      @open-drawer="isFilterDrawerOpen = true"
    />

    <!-- Invoices only — profit is realised when the sale is billed, so there
         is no transaction-type choice. Production also filters by product
         category; the transaction dataset's products carry none, so that
         control is dropped rather than shown matching everything. -->
    <SalesReportFilterDrawer
      :is-open="isFilterDrawerOpen"
      :applied="filter"
      :fields="['products']"
      @close="isFilterDrawerOpen = false"
      @apply="onApplyFilter"
    />

    <div v-if="hasRun" :class="metaClass">
      <MpText size="body-small" color="gray.600">{{ meta }}</MpText>
    </div>

    <template v-if="hasRun && filteredRows.length">
      <ReportTable
        :columns="PROFITABILITY_COLUMNS"
        :rows="pagedRows"
        :total-rows="filteredRows"
        :is-loading="isLoading"
        :sort-key="sortKey"
        :sort-dir="sortDir"
        @sort="toggleSort"
      />

      <ReportPagination
        v-model:page="page"
        v-model:per-page="perPage"
        :page-count="pageCount"
        :range-start="rangeStart"
        :range-end="rangeEnd"
        :total="filteredRows.length"
        :page-options="pageOptions"
        @jump="onJumpPage"
      />
    </template>

    <ReportBlankSlate
      v-else
      :has-run="hasRun"
      :is-filter-active="isDrawerFilterActive"
      @clear="clearFilters"
    />
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { css, MpText } from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import SalesReportFilterDrawer from "~/components/reports/SalesReportFilterDrawer.vue";
import ReportBlankSlate from "~/components/reports/ReportBlankSlate.vue";
import ReportExportButton from "~/components/reports/ReportExportButton.vue";
import ReportFilterBar from "~/components/reports/ReportFilterBar.vue";
import ReportPagination from "~/components/reports/ReportPagination.vue";
import ReportTable from "~/components/reports/ReportTable.vue";
import { useSalesReport } from "~/composables/useSalesReport";
import { useReportPaging } from "~/composables/useReportPaging";
import {
  PROFITABILITY_COLUMNS,
  buildProfitabilityRows,
  type ProfitabilityRow
} from "~/data/sales-report-variants";
import { matchesSalesReportFilter } from "~/data/sales-report-filter";
import { SALES_REPORT_PERIODS } from "~/data/sales-report";

useHead({ title: "Product profitability — Mekari Jurnal" });

/**
 * Production puts "Sort by column" + an asc/desc radio pair in the drawer.
 * `ReportTable` already sorts from its own headers (the Sales list report uses
 * the same wiring), which is the same capability with one less control and no
 * staging — so the two drawer fields are dropped in favour of the headers.
 */
const sortKey = ref<keyof ProfitabilityRow>("productName");
const sortDir = ref<"asc" | "desc">("asc");

const {
  filter,
  applied,
  isFilterDrawerOpen,
  isLoading,
  hasRun,
  isRangeValid,
  isDrawerFilterActive,
  runReport,
  onApplyFilter,
  clearFilters,
  metaLine
} = useSalesReport({ onRun: () => reset() });

const filteredRows = computed<ProfitabilityRow[]>(() => {
  const f = applied.value;
  if (!f) return [];
  // The date range is applied per transaction while aggregating; the product
  // filter is applied here, because a product row genuinely is one product.
  const rows = buildProfitabilityRows((t) =>
    matchesSalesReportFilter({ date: t.transactionDateSort, status: t.status }, f)
  ).filter((row) => !f.products.length || f.products.includes(row.productName));

  const key = sortKey.value;
  const dir = sortDir.value === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
});

function toggleSort(key: string) {
  const typed = key as keyof ProfitabilityRow;
  if (sortKey.value === typed) sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  else {
    sortKey.value = typed;
    sortDir.value = "asc";
  }
  reset();
}

const {
  page,
  perPage,
  pageCount,
  pagedRows,
  rangeStart,
  rangeEnd,
  pageOptions,
  onJumpPage,
  reset
} = useReportPaging(filteredRows);

const meta = computed(() => metaLine("Sales Invoice · profitability by product"));

const metaClass = css({ mb: 4 });
</script>
