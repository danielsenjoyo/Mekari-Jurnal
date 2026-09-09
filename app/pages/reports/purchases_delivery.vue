<template>
  <DefaultPageContent title="Purchase delivery" breadcrumb="Reports" breadcrumb-to="/reports">
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
    >
      <!-- Production's "Filter per": the grouping changes both the column set
           and the grain of a row, so it belongs on the bar rather than buried
           in the drawer. -->
      <div :class="groupingFieldClass">
        <MpFormControl>
          <MpFormLabel>Group by</MpFormLabel>
          <MpSelect v-model="grouping" is-full-width>
            <option v-for="opt in DELIVERY_GROUPING_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </MpSelect>
        </MpFormControl>
      </div>
    </ReportFilterBar>

    <!-- Deliveries only, so no transaction-type field; a delivery carries no
         payment status either. -->
    <PurchaseReportFilterDrawer
      :is-open="isFilterDrawerOpen"
      :applied="filter"
      :fields="['vendors', 'tags']"
      @close="isFilterDrawerOpen = false"
      @apply="onApplyFilter"
    />

    <div v-if="hasRun" :class="metaClass">
      <MpText size="body-small" color="gray.600">{{ meta }}</MpText>
    </div>

    <template v-if="hasRun && filteredRows.length">
      <ReportTable
        :columns="columns"
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
            @click="navigateTo(`/purchase/delivery/${row.transactionId}`)"
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
import PurchaseReportFilterDrawer from "~/components/reports/PurchaseReportFilterDrawer.vue";
import ReportBlankSlate from "~/components/reports/ReportBlankSlate.vue";
import ReportExportButton from "~/components/reports/ReportExportButton.vue";
import ReportFilterBar from "~/components/reports/ReportFilterBar.vue";
import ReportPagination from "~/components/reports/ReportPagination.vue";
import ReportTable from "~/components/reports/ReportTable.vue";
import { usePurchaseReport } from "~/composables/usePurchaseReport";
import { useReportPaging } from "~/composables/useReportPaging";
import {
  DELIVERY_GROUPING_OPTIONS,
  buildDeliveryRows,
  deliveryColumns,
  type DeliveryGrouping,
  type DeliveryRow
} from "~/data/purchase-report-variants";
import { matchesPurchaseReportFilter } from "~/data/purchase-report-filter";
import { PURCHASE_REPORT_PERIODS } from "~/data/purchase-report";
import { textlinkAlignClass } from "~/utils/textlink-align";

useHead({ title: "Purchase delivery — Mekari Jurnal" });

const grouping = ref<DeliveryGrouping>("transaction");
const columns = computed(() => deliveryColumns(grouping.value));

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
  // The report is deliveries and nothing else — production has no
  // transaction-type control here, so the filter is pinned rather than offered.
  defaults: { transactionType: "delivery" },
  onRun: () => reset()
});

const filteredRows = computed<DeliveryRow[]>(() => {
  const f = applied.value;
  if (!f) return [];
  return buildDeliveryRows(grouping.value).filter((row) => matchesPurchaseReportFilter(row, f));
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

const meta = computed(() => {
  const label = DELIVERY_GROUPING_OPTIONS.find((o) => o.value === grouping.value)?.label ?? "";
  return metaLine(`Purchase Delivery · by ${label.toLowerCase()}`);
});

const metaClass = css({ mb: 4 });
const groupingFieldClass = css({ width: "180px" });
</script>
