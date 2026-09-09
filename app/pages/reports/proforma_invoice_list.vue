<template>
  <DefaultPageContent title="Pro forma invoice list" breadcrumb="Reports" breadcrumb-to="/reports">
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

    <!-- Pro forma invoices only, so no transaction-type field. -->
    <SalesReportFilterDrawer
      :is-open="isFilterDrawerOpen"
      :applied="filter"
      :fields="['dateBy', 'customers', 'statuses', 'tags']"
      @close="isFilterDrawerOpen = false"
      @apply="onApplyFilter"
    />

    <div v-if="hasRun" :class="metaClass">
      <MpText size="body-small" color="gray.600">{{ meta }}</MpText>
    </div>

    <template v-if="hasRun && filteredRows.length">
      <ReportTable
        :columns="PROFORMA_INVOICE_COLUMNS"
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
            @click="navigateTo(`/sales/proforma-invoice/${row.id}`)"
          >
            {{ row.number }}
          </MpTextlink>
          <MpBadge
            v-else-if="col.key === 'status'"
            for="tableStatus"
            :type="SALES_STATUS_TYPE[row.status as SalesStatus]"
          >
            {{ SALES_STATUS_LABEL[row.status as SalesStatus] }}
          </MpBadge>
          <div v-else-if="col.key === 'tags'" :class="tagRowClass">
            <MpTag v-for="tag in row.tags as string[]" :key="tag" size="sm">{{ tag }}</MpTag>
            <MpText v-if="!(row.tags as string[]).length" color="gray.600">—</MpText>
          </div>
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
import { css, MpBadge, MpTag, MpText, MpTextlink } from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import SalesReportFilterDrawer from "~/components/reports/SalesReportFilterDrawer.vue";
import ReportBlankSlate from "~/components/reports/ReportBlankSlate.vue";
import ReportExportButton from "~/components/reports/ReportExportButton.vue";
import ReportFilterBar from "~/components/reports/ReportFilterBar.vue";
import ReportPagination from "~/components/reports/ReportPagination.vue";
import ReportTable from "~/components/reports/ReportTable.vue";
import { useSalesReport } from "~/composables/useSalesReport";
import { useReportPaging } from "~/composables/useReportPaging";
import { PROFORMA_INVOICE_COLUMNS } from "~/data/sales-report-variants";
import { matchesSalesReportFilter } from "~/data/sales-report-filter";
import {
  SALES_REPORT_PERIODS,
  buildSalesReportRows,
  type SalesReportRow
} from "~/data/sales-report";
import { SALES_STATUS_LABEL, SALES_STATUS_TYPE, type SalesStatus } from "~/data/sales-status";
import { textlinkAlignClass } from "~/utils/textlink-align";

useHead({ title: "Pro forma invoice list — Mekari Jurnal" });

const sortKey = ref<keyof SalesReportRow>("date");
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
} = useSalesReport({
  // The report is pro forma invoices and nothing else, so the type is pinned
  // rather than offered — same as Delivery and Order completion.
  defaults: { transactionType: "proforma_invoice" },
  onRun: () => reset()
});

const filteredRows = computed<SalesReportRow[]>(() => {
  const f = applied.value;
  if (!f) return [];
  const rows = buildSalesReportRows("proforma_invoice").filter((row) =>
    matchesSalesReportFilter(row, f)
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

function toggleSort(key: string) {
  const typed = key as keyof SalesReportRow;
  if (sortKey.value === typed) sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  else {
    sortKey.value = typed;
    sortDir.value = "asc";
  }
  reset();
}

const meta = computed(() => metaLine("Pro Forma Invoice"));

const metaClass = css({ mb: 4 });
const tagRowClass = css({ display: "flex", gap: 2, flexWrap: "wrap" });
</script>
