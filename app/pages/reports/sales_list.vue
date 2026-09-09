<template>
  <DefaultPageContent title="Sales list" breadcrumb="Reports" breadcrumb-to="/reports">
    <!-- Production keeps Template and Export on the right of the filter row.
         They're page-scoped actions, not filters, so they sit in the title
         band here per docs/patterns/page-title-bar.md. -->
    <template #actions>
      <MpPopover placement="bottom-end" use-portal is-adaptive-width>
        <MpPopoverTrigger>
          <MpButton variant="secondary" left-icon="settings" right-icon="caret-down">
            {{ activeLayout.name }}
          </MpButton>
        </MpPopoverTrigger>
        <MpPopoverContent>
          <MpPopoverList>
            <MpPopoverListItem
              v-for="layout in SALES_REPORT_LAYOUTS"
              :key="layout.id"
              role="menuitem"
              :is-active="layout.id === layoutId"
              @click="layoutId = layout.id"
            >
              {{ layout.name }}
            </MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>

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

    <SalesReportFilterDrawer
      :is-open="isFilterDrawerOpen"
      :applied="filter"
      @close="isFilterDrawerOpen = false"
      @apply="onApplyFilter"
    />

    <!-- Report meta strip — production prints the same facts above the table
         (type, period, range, currency) so an exported page reads on its own. -->
    <div v-if="hasRun" :class="metaClass">
      <MpText size="body-small" color="gray.600">{{ meta }}</MpText>
    </div>

    <template v-if="hasRun && filteredRows.length">
      <ReportTable
        :columns="columns"
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
            @click="navigateTo(`${transactionRoute}/${row.id}`)"
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
import {
  css,
  MpBadge,
  MpButton,
  MpPopover,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpPopoverTrigger,
  MpTag,
  MpText,
  MpTextlink
} from "@mekari/pixel3";
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
  SALES_REPORT_LAYOUTS,
  SALES_REPORT_PERIODS,
  SALES_TRANSACTION_ROUTE,
  buildSalesReportRows,
  reportColumn,
  type SalesReportRow
} from "~/data/sales-report";
import { matchesSalesReportFilter } from "~/data/sales-report-filter";
import { SALES_STATUS_LABEL, SALES_STATUS_TYPE, type SalesStatus } from "~/data/sales-status";
import { TRANSACTION_TYPE_LABEL } from "~/data/sales-transactions";
import { textlinkAlignClass } from "~/utils/textlink-align";

useHead({ title: "Sales list — Mekari Jurnal" });

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

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------
const layoutId = ref(SALES_REPORT_LAYOUTS[0]!.id);
const activeLayout = computed(
  () => SALES_REPORT_LAYOUTS.find((l) => l.id === layoutId.value) ?? SALES_REPORT_LAYOUTS[0]!
);
const columns = computed(() => activeLayout.value.columns.map(reportColumn));

const sortKey = ref<keyof SalesReportRow>("date");
const sortDir = ref<"asc" | "desc">("asc");

const filteredRows = computed<SalesReportRow[]>(() => {
  const f = applied.value;
  if (!f) return [];
  const rows = buildSalesReportRows(f.transactionType).filter((row) =>
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

function toggleSort(key: string) {
  const typed = key as keyof SalesReportRow;
  if (sortKey.value === typed) sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  else {
    sortKey.value = typed;
    sortDir.value = "asc";
  }
  reset();
}

// Every Sales type has a detail page, so a transaction number is always a link
// — unlike the Purchases report, which has to fall back to plain text for
// `financing` (see SALES_TRANSACTION_ROUTE).
const transactionRoute = computed(() =>
  applied.value ? SALES_TRANSACTION_ROUTE[applied.value.transactionType] : ""
);

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
  applied.value ? metaLine(TRANSACTION_TYPE_LABEL[applied.value.transactionType]) : ""
);

const metaClass = css({ mb: 4 });
const tagRowClass = css({ display: "flex", gap: 2, flexWrap: "wrap" });
</script>
