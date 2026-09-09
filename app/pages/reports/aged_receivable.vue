<template>
  <DefaultPageContent title="Aged receivable" breadcrumb="Reports" breadcrumb-to="/reports">
    <template #actions>
      <ReportExportButton :is-disabled="!hasRun" :row-count="filteredRows.length" />
    </template>

    <ReportFilterBar
      v-model:as-of-date="filter.asOfDate"
      v-model:start-date="filter.startDate"
      v-model:end-date="filter.endDate"
      v-model:period-id="filter.periodId"
      mode="as-of"
      :periods="SALES_REPORT_PERIODS"
      :is-valid="isRangeValid"
      :is-filter-active="isDrawerFilterActive"
      @run="runReport"
      @open-drawer="isFilterDrawerOpen = true"
    />

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
        :columns="AGED_RECEIVABLE_COLUMNS"
        :rows="pagedRows"
        :total-rows="filteredRows"
        :is-loading="isLoading"
        :sort-key="sortKey"
        :sort-dir="sortDir"
        @sort="toggleSort"
      >
        <template #cell="{ row, col, value }">
          <!-- A bucket a customer has nothing in is noise at full weight:
               eight rows of 0,00 make the buckets that do carry a balance
               harder to find, which is the one thing this table is for. -->
          <MpText
            v-if="col.key !== 'customerName' && !(row as Record<string, number>)[col.key]"
            color="gray.400"
          >
            {{ value }}
          </MpText>
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
      mode="as-of"
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
  AGED_RECEIVABLE_COLUMNS,
  buildAgedReceivableRows,
  type AgedReceivableRow
} from "~/data/sales-report-variants";
import { SALES_REPORT_PERIODS } from "~/data/sales-report";
import { dmyToIso } from "~/utils/dates";

useHead({ title: "Aged receivable — Mekari Jurnal" });

const sortKey = ref<keyof AgedReceivableRow>("customerName");
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
} = useSalesReport({ mode: "as-of", onRun: () => reset() });

/**
 * Built from the same `balanceAsOf` as Customer balance, so the two reconcile:
 * run both on one date and this TOTAL equals that one's Balance Due total.
 */
const filteredRows = computed<AgedReceivableRow[]>(() => {
  const f = applied.value;
  if (!f) return [];
  const asOf = dmyToIso(f.asOfDate);
  if (!asOf) return [];

  const rows = buildAgedReceivableRows(asOf).filter(
    (row) => !f.customers.length || f.customers.includes(row.customerName)
  );

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
  const typed = key as keyof AgedReceivableRow;
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

const meta = computed(() => metaLine("Aged receivable · by customer"));

const metaClass = css({ mb: 4 });
</script>
