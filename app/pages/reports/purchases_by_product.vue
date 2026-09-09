<template>
  <DefaultPageContent title="Purchase by product" breadcrumb="Reports" breadcrumb-to="/reports">
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
      <div :class="sortFieldClass">
        <MpFormControl>
          <MpFormLabel>Sort by</MpFormLabel>
          <MpSelect v-model="sortBy" is-full-width>
            <option value="productName">Product name</option>
            <option value="purchaseQty">Purchase qty</option>
            <option value="totalPurchaseValue">Total purchase value</option>
          </MpSelect>
        </MpFormControl>
      </div>
    </ReportFilterBar>

    <!-- A product aggregate spans many transactions, so it has no single
         status and no single due date — those two controls are dropped rather
         than shown inert. -->
    <PurchaseReportFilterDrawer
      :is-open="isFilterDrawerOpen"
      :applied="filter"
      :fields="['transactionType', 'vendors']"
      @close="isFilterDrawerOpen = false"
      @apply="onApplyFilter"
    />

    <div v-if="hasRun" :class="metaClass">
      <MpText size="body-small" color="gray.600">{{ meta }}</MpText>
    </div>

    <template v-if="hasRun && filteredRows.length">
      <ReportTable
        :columns="PRODUCT_REPORT_COLUMNS"
        :rows="pagedRows"
        :total-rows="filteredRows"
        :is-loading="isLoading"
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
import { css, MpFormControl, MpFormLabel, MpSelect, MpText } from "@mekari/pixel3";
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
  PRODUCT_REPORT_COLUMNS,
  buildProductReportRows,
  type ProductReportRow
} from "~/data/purchase-report-variants";
import { matchesPurchaseReportFilter } from "~/data/purchase-report-filter";
import { PURCHASE_REPORT_PERIODS } from "~/data/purchase-report";
import { TRANSACTION_TYPE_LABEL } from "~/data/purchase-transactions";

useHead({ title: "Purchase by product — Mekari Jurnal" });

type SortKey = "productName" | "purchaseQty" | "totalPurchaseValue";
const sortBy = ref<SortKey>("productName");

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

/**
 * The date range and vendor filter are applied while the rows are being built,
 * not after: a product row is an aggregate over many transactions, so filtering
 * the finished rows would keep or drop a whole product rather than narrowing
 * what it sums. `buildProductReportRows` therefore takes the predicate and
 * applies it per transaction.
 */
const filteredRows = computed<ProductReportRow[]>(() => {
  const f = applied.value;
  if (!f) return [];
  const rows = buildProductReportRows(f.transactionType, (t) =>
    matchesPurchaseReportFilter(
      { date: t.transactionDateSort, vendorName: t.vendorName, tags: t.tags, status: t.status },
      f
    )
  );
  return (
    [...rows]
      .sort((a, b) =>
        sortBy.value === "productName"
          ? a.productName.localeCompare(b.productName)
          : Number(b[sortBy.value]) - Number(a[sortBy.value])
      )
      // "No." is a display counter, so it follows whatever order is on screen.
      .map((row, index) => ({ ...row, no: index + 1 }))
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

const meta = computed(() =>
  applied.value
    ? metaLine(`${TRANSACTION_TYPE_LABEL[applied.value.transactionType]} · by product`)
    : ""
);

const metaClass = css({ mb: 4 });
const sortFieldClass = css({ width: "200px" });
</script>
