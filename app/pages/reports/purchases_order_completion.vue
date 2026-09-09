<template>
  <DefaultPageContent
    title="Purchase order completion"
    breadcrumb="Reports"
    breadcrumb-to="/reports"
  >
    <template #actions>
      <ReportExportButton :is-disabled="!hasRun" :row-count="filteredRows.length" />
    </template>

    <ReportFilterBar
      v-model:start-date="filter.startDate"
      v-model:end-date="filter.endDate"
      v-model:period-id="filter.periodId"
      :periods="PURCHASE_REPORT_PERIODS"
      :is-valid="isRangeValid"
      :is-filter-active="isDrawerFilterActive"
      @run="runReport"
      @open-drawer="isFilterDrawerOpen = true"
    />

    <!-- Orders only, so no transaction-type field; an order has no due date
         distinct from its transaction date either. -->
    <PurchaseReportFilterDrawer
      :is-open="isFilterDrawerOpen"
      :applied="filter"
      :fields="['vendors', 'statuses', 'tags']"
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
            @click="navigateTo(`/purchase/order/${row.id}`)"
          >
            {{ row.number }}
          </MpTextlink>
          <MpBadge
            v-else-if="col.key === 'status'"
            for="tableStatus"
            :type="PURCHASE_STATUS_TYPE[row.status as PurchaseStatus]"
          >
            {{ row.statusLabel }}
          </MpBadge>
          <MpTextlink
            v-else-if="col.key === 'deliveryNumber' && row.deliveryId"
            as="button"
            variant="primary"
            :class="textlinkAlignClass"
            @click="navigateTo(`/purchase/delivery/${row.deliveryId}`)"
          >
            {{ row.deliveryNumber }}
          </MpTextlink>
          <!-- An order with no delivery yet is the report's whole point, so
               say so rather than leaving the cell blank. -->
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
import PurchaseReportFilterDrawer from "~/components/reports/PurchaseReportFilterDrawer.vue";
import ReportBlankSlate from "~/components/reports/ReportBlankSlate.vue";
import ReportExportButton from "~/components/reports/ReportExportButton.vue";
import ReportFilterBar from "~/components/reports/ReportFilterBar.vue";
import ReportPagination from "~/components/reports/ReportPagination.vue";
import ReportTable from "~/components/reports/ReportTable.vue";
import { usePurchaseReport } from "~/composables/usePurchaseReport";
import { useReportPaging } from "~/composables/useReportPaging";
import {
  ORDER_COMPLETION_COLUMNS,
  buildOrderCompletionRows,
  type OrderCompletionRow
} from "~/data/purchase-report-variants";
import { matchesPurchaseReportFilter } from "~/data/purchase-report-filter";
import { PURCHASE_REPORT_PERIODS } from "~/data/purchase-report";
import { PURCHASE_STATUS_TYPE, type PurchaseStatus } from "~/data/purchase-status";
import { textlinkAlignClass } from "~/utils/textlink-align";

useHead({ title: "Purchase order completion — Mekari Jurnal" });

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
} = usePurchaseReport({
  defaults: { transactionType: "order" },
  onRun: () => reset()
});

const filteredRows = computed<OrderCompletionRow[]>(() => {
  const f = applied.value;
  if (!f) return [];
  return buildOrderCompletionRows().filter((row) => matchesPurchaseReportFilter(row, f));
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

const meta = computed(() => metaLine("Purchase Order · completion"));

const metaClass = css({ mb: 4 });
</script>
