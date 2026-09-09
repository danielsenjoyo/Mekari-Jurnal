<template>
  <DefaultPageContent title="Purchase by vendor" breadcrumb="Reports" breadcrumb-to="/reports">
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
      <!-- Production's own "Sort by" — the report is read vendor-first, so the
           choice is between the vendors' names and what they cost. -->
      <div :class="sortFieldClass">
        <MpFormControl>
          <MpFormLabel>Sort by</MpFormLabel>
          <MpSelect v-model="sortBy" is-full-width>
            <option value="vendor_name">Vendor</option>
            <option value="total_purchases">Total purchases</option>
          </MpSelect>
        </MpFormControl>
      </div>
    </ReportFilterBar>

    <PurchaseReportFilterDrawer
      :is-open="isFilterDrawerOpen"
      :applied="filter"
      :fields="['transactionType', 'vendors', 'tags']"
      @close="isFilterDrawerOpen = false"
      @apply="onApplyFilter"
    />

    <div v-if="hasRun" :class="metaClass">
      <MpText size="body-small" color="gray.600">{{ meta }}</MpText>
    </div>

    <template v-if="hasRun && filteredRows.length">
      <ReportTable
        :columns="VENDOR_REPORT_COLUMNS"
        :rows="pagedRows"
        :total-rows="filteredRows"
        :is-loading="isLoading"
      >
        <template #cell="{ row, col, value }">
          <MpTextlink
            v-if="col.key === 'number' && routeFor(row.type as TransactionType)"
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
import PurchaseReportFilterDrawer from "~/components/reports/PurchaseReportFilterDrawer.vue";
import ReportBlankSlate from "~/components/reports/ReportBlankSlate.vue";
import ReportExportButton from "~/components/reports/ReportExportButton.vue";
import ReportFilterBar from "~/components/reports/ReportFilterBar.vue";
import ReportPagination from "~/components/reports/ReportPagination.vue";
import ReportTable from "~/components/reports/ReportTable.vue";
import { usePurchaseReport } from "~/composables/usePurchaseReport";
import { useReportPaging } from "~/composables/useReportPaging";
import {
  VENDOR_REPORT_COLUMNS,
  buildVendorLineRows,
  type VendorLineRow
} from "~/data/purchase-report-variants";
import { matchesPurchaseReportFilter } from "~/data/purchase-report-filter";
import { TRANSACTION_TYPE_LABEL, type TransactionType } from "~/data/purchase-transactions";
import { PURCHASE_REPORT_PERIODS, PURCHASE_TRANSACTION_ROUTE } from "~/data/purchase-report";
import { textlinkAlignClass } from "~/utils/textlink-align";

useHead({ title: "Purchase by vendor — Mekari Jurnal" });

const sortBy = ref<"vendor_name" | "total_purchases">("vendor_name");

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
} = usePurchaseReport({ onRun: () => reset() });

const filteredRows = computed<VendorLineRow[]>(() => {
  const f = applied.value;
  if (!f) return [];
  const rows = buildVendorLineRows(f.transactionType).filter((row) =>
    matchesPurchaseReportFilter(row, f)
  );
  if (sortBy.value === "vendor_name") return rows;

  // "Total purchases" orders the vendors by what they cost, biggest first,
  // while keeping each vendor's own lines together — the rows are line items,
  // so sorting them individually by amount would scatter every vendor.
  const totals = new Map<string, number>();
  rows.forEach((row) => totals.set(row.vendorName, (totals.get(row.vendorName) ?? 0) + row.amount));
  return [...rows].sort(
    (a, b) =>
      (totals.get(b.vendorName) ?? 0) - (totals.get(a.vendorName) ?? 0) ||
      a.vendorName.localeCompare(b.vendorName) ||
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
  return PURCHASE_TRANSACTION_ROUTE[type];
}

const meta = computed(() =>
  applied.value ? metaLine(TRANSACTION_TYPE_LABEL[applied.value.transactionType]) : ""
);

const metaClass = css({ mb: 4 });
const sortFieldClass = css({ width: "180px" });
</script>
