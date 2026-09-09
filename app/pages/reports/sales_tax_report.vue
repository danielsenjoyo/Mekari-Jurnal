<template>
  <DefaultPageContent title="Sales tax" breadcrumb="Reports" breadcrumb-to="/reports">
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

    <!-- Invoices only — a quotation carries a tax figure but creates no tax
         liability — so there is no transaction-type field. -->
    <SalesReportFilterDrawer
      :is-open="isFilterDrawerOpen"
      :applied="filter"
      :fields="['customers', 'tags']"
      @close="isFilterDrawerOpen = false"
      @apply="onApplyFilter"
    />

    <div v-if="hasRun" :class="metaClass">
      <MpText size="body-small" color="gray.600">{{ meta }}</MpText>
    </div>

    <template v-if="hasRun && filteredRows.length">
      <ReportTable
        :columns="SALES_TAX_COLUMNS"
        :rows="pagedRows"
        :total-rows="filteredRows"
        :is-loading="isLoading"
        :sort-key="sortKey"
        :sort-dir="sortDir"
        @sort="toggleSort"
      >
        <template #cell="{ row, col, value }">
          <MpTextlink
            v-if="col.key === 'number'"
            as="button"
            variant="primary"
            :class="textlinkAlignClass"
            @click="navigateTo(`/sales/invoice/${row.transactionId}`)"
          >
            {{ row.number }}
          </MpTextlink>
          <template v-else>{{ value }}</template>
        </template>
      </ReportTable>

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
import { css, MpText, MpTextlink } from "@mekari/pixel3";
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
  SALES_TAX_COLUMNS,
  buildSalesTaxRows,
  type SalesTaxRow
} from "~/data/sales-report-variants";
import { matchesSalesReportFilter } from "~/data/sales-report-filter";
import { SALES_REPORT_PERIODS } from "~/data/sales-report";
import { textlinkAlignClass } from "~/utils/textlink-align";

useHead({ title: "Sales tax — Mekari Jurnal" });

const sortKey = ref<keyof SalesTaxRow>("date");
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
} = useSalesReport({ defaults: { transactionType: "invoice" }, onRun: () => reset() });

const filteredRows = computed<SalesTaxRow[]>(() => {
  const f = applied.value;
  if (!f) return [];
  const rows = buildSalesTaxRows().filter((row) => matchesSalesReportFilter(row, f));
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
  const typed = key as keyof SalesTaxRow;
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

const meta = computed(() => metaLine("Sales tax · value added tax"));

const metaClass = css({ mb: 4 });
</script>
