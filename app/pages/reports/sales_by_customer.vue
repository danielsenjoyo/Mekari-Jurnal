<template>
  <DefaultPageContent title="Sales by customer" breadcrumb="Reports" breadcrumb-to="/reports">
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
    >
      <!-- Production's own "Sort by" — the report is read customer-first, so
           the choice is between the customers' names and what they bought. -->
      <div :class="sortFieldClass">
        <MpFormControl>
          <MpFormLabel>Sort by</MpFormLabel>
          <MpSelect v-model="sortBy" is-full-width>
            <option value="customer_name">Customer</option>
            <option value="total_sales">Total sales</option>
          </MpSelect>
        </MpFormControl>
      </div>
    </ReportFilterBar>

    <SalesReportFilterDrawer
      :is-open="isFilterDrawerOpen"
      :applied="filter"
      :fields="['transactionType', 'customers', 'tags']"
      @close="isFilterDrawerOpen = false"
      @apply="onApplyFilter"
    />

    <div v-if="hasRun" :class="metaClass">
      <MpText size="body-small" color="gray.600">{{ meta }}</MpText>
    </div>

    <template v-if="hasRun && filteredRows.length">
      <ReportTable
        :columns="CUSTOMER_REPORT_COLUMNS"
        :rows="pagedRows"
        :total-rows="filteredRows"
        :is-loading="isLoading"
      >
        <template #cell="{ row, col, value }">
          <MpTextlink
            v-if="col.key === 'number'"
            as="button"
            variant="primary"
            :class="textlinkAlignClass"
            @click="navigateTo(`${routeFor(row.type as TransactionType)}/${row.transactionId}`)"
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
import { css, MpFormControl, MpFormLabel, MpSelect, MpText, MpTextlink } from "@mekari/pixel3";
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
  CUSTOMER_REPORT_COLUMNS,
  buildCustomerLineRows,
  type CustomerLineRow
} from "~/data/sales-report-variants";
import { matchesSalesReportFilter } from "~/data/sales-report-filter";
import { SALES_REPORT_PERIODS, SALES_TRANSACTION_ROUTE } from "~/data/sales-report";
import { TRANSACTION_TYPE_LABEL, type TransactionType } from "~/data/sales-transactions";
import { textlinkAlignClass } from "~/utils/textlink-align";

useHead({ title: "Sales by customer — Mekari Jurnal" });

const sortBy = ref<"customer_name" | "total_sales">("customer_name");

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

const filteredRows = computed<CustomerLineRow[]>(() => {
  const f = applied.value;
  if (!f) return [];
  const rows = buildCustomerLineRows(f.transactionType).filter((row) =>
    matchesSalesReportFilter(row, f)
  );
  if (sortBy.value === "customer_name") return rows;

  // "Total sales" orders the customers by what they bought, biggest first,
  // while keeping each customer's own lines together — the rows are line items,
  // so sorting them individually by amount would scatter every customer.
  const totals = new Map<string, number>();
  rows.forEach((row) =>
    totals.set(row.customerName, (totals.get(row.customerName) ?? 0) + row.amount)
  );
  return [...rows].sort(
    (a, b) =>
      (totals.get(b.customerName) ?? 0) - (totals.get(a.customerName) ?? 0) ||
      a.customerName.localeCompare(b.customerName) ||
      a.date.localeCompare(b.date)
  );
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

function routeFor(type: TransactionType) {
  return SALES_TRANSACTION_ROUTE[type];
}

const meta = computed(() =>
  applied.value ? metaLine(TRANSACTION_TYPE_LABEL[applied.value.transactionType]) : ""
);

const metaClass = css({ mb: 4 });
const sortFieldClass = css({ width: "180px" });
</script>
