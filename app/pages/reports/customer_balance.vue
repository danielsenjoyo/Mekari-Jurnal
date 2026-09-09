<template>
  <DefaultPageContent title="Customer balance" breadcrumb="Reports" breadcrumb-to="/reports">
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

    <!-- Unpaid invoices only, so no transaction-type field — and no status
         field either: the report already means "not settled", so a status
         filter could only ever narrow it to a subset of the same thing. -->
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
        :columns="CUSTOMER_BALANCE_COLUMNS"
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
            @click="navigateTo(`/sales/invoice/${row.id}`)"
          >
            {{ row.number }}
          </MpTextlink>
          <MpBadge
            v-else-if="col.key === 'status'"
            for="tableStatus"
            :type="SALES_STATUS_TYPE[row.status as SalesStatus]"
          >
            {{ row.statusLabel }}
          </MpBadge>
          <!-- An invoice inside its terms is not late, and "0" in a Days
               Overdue column reads as "due today". Say the state instead. -->
          <MpText v-else-if="col.key === 'daysOverdue' && !row.daysOverdue" color="gray.600">
            Not due
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
import { css, MpBadge, MpText, MpTextlink } from "@mekari/pixel3";
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
  CUSTOMER_BALANCE_COLUMNS,
  buildCustomerBalanceRows,
  type CustomerBalanceRow
} from "~/data/sales-report-variants";
import { SALES_REPORT_PERIODS } from "~/data/sales-report";
import { SALES_STATUS_TYPE, type SalesStatus } from "~/data/sales-status";
import { dmyToIso } from "~/utils/dates";
import { textlinkAlignClass } from "~/utils/textlink-align";

useHead({ title: "Customer balance — Mekari Jurnal" });

const sortKey = ref<keyof CustomerBalanceRow>("customerName");
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
 * The date is applied inside the builder, not by `matchesSalesReportFilter`:
 * this report doesn't ask which invoices fall in a window, it asks what each
 * one still owed on a day. The drawer's customer and tag criteria are applied
 * here, against the finished rows.
 */
const filteredRows = computed<CustomerBalanceRow[]>(() => {
  const f = applied.value;
  if (!f) return [];
  const asOf = dmyToIso(f.asOfDate);
  if (!asOf) return [];

  const rows = buildCustomerBalanceRows(asOf).filter(
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
  const typed = key as keyof CustomerBalanceRow;
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

const meta = computed(() => metaLine("Customer balance · unpaid invoices"));

const metaClass = css({ mb: 4 });
</script>
