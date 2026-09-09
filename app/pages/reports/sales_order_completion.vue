<template>
  <DefaultPageContent title="Sales order completion" breadcrumb="Reports" breadcrumb-to="/reports">
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

    <!-- Orders only, so no transaction-type field; an order has no due date
         distinct from its transaction date either. -->
    <SalesReportFilterDrawer
      :is-open="isFilterDrawerOpen"
      :applied="filter"
      :fields="['customers', 'statuses', 'tags']"
      @close="isFilterDrawerOpen = false"
      @apply="onApplyFilter"
    />

    <div v-if="hasRun" :class="metaClass">
      <MpText size="body-small" color="gray.600">{{ meta }}</MpText>
    </div>

    <template v-if="hasRun && filteredRows.length">
      <ReportTable
        :columns="ORDER_COMPLETION_COLUMNS"
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
            @click="navigateTo(`/sales/order/${row.id}`)"
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
          <MpTextlink
            v-else-if="col.key === 'deliveryNumber' && row.deliveryId"
            as="button"
            variant="primary"
            :class="textlinkAlignClass"
            @click="navigateTo(`/sales/delivery/${row.deliveryId}`)"
          >
            {{ row.deliveryNumber }}
          </MpTextlink>
          <!-- An order with no delivery yet is the report's whole point, so say
               so rather than leaving the cell blank. -->
          <MpText v-else-if="col.key === 'deliveryNumber'" color="gray.600">Not delivered</MpText>
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
import { computed } from "vue";
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
  ORDER_COMPLETION_COLUMNS,
  buildOrderCompletionRows,
  type OrderCompletionRow
} from "~/data/sales-report-variants";
import { matchesSalesReportFilter } from "~/data/sales-report-filter";
import { SALES_REPORT_PERIODS } from "~/data/sales-report";
import { SALES_STATUS_TYPE, type SalesStatus } from "~/data/sales-status";
import { textlinkAlignClass } from "~/utils/textlink-align";

useHead({ title: "Sales order completion — Mekari Jurnal" });

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
  defaults: { transactionType: "order" },
  onRun: () => reset()
});

const filteredRows = computed<OrderCompletionRow[]>(() => {
  const f = applied.value;
  if (!f) return [];
  return buildOrderCompletionRows().filter((row) => matchesSalesReportFilter(row, f));
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

const meta = computed(() => metaLine("Sales Order · completion"));

const metaClass = css({ mb: 4 });
</script>
