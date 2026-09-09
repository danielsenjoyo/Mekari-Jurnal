<template>
  <DefaultPageContent title="Purchase list" breadcrumb="Reports" breadcrumb-to="/reports">
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
              v-for="layout in PURCHASE_REPORT_LAYOUTS"
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
      :periods="PURCHASE_REPORT_PERIODS"
      :is-valid="isRangeValid"
      :is-filter-active="isDrawerFilterActive"
      @run="runReport"
      @open-drawer="isFilterDrawerOpen = true"
    />

    <PurchaseReportFilterDrawer
      :is-open="isFilterDrawerOpen"
      :applied="filter"
      @close="isFilterDrawerOpen = false"
      @apply="onApplyFilter"
    />

    <!-- Report meta strip — production prints the same facts above the table
         (type, period, range, currency) so an exported page reads on its own. -->
    <div v-if="hasRun" :class="metaClass">
      <MpText size="body-small" color="gray.600">{{ metaLine }}</MpText>
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
            v-if="col.key === 'number' && transactionRoute"
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
            :type="PURCHASE_STATUS_TYPE[row.status as PurchaseStatus]"
          >
            {{ PURCHASE_STATUS_LABEL[row.status as PurchaseStatus] }}
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
import { computed, reactive, ref } from "vue";
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
import PurchaseReportFilterDrawer from "~/components/reports/PurchaseReportFilterDrawer.vue";
import ReportBlankSlate from "~/components/reports/ReportBlankSlate.vue";
import ReportExportButton from "~/components/reports/ReportExportButton.vue";
import ReportFilterBar from "~/components/reports/ReportFilterBar.vue";
import ReportPagination from "~/components/reports/ReportPagination.vue";
import ReportTable from "~/components/reports/ReportTable.vue";
import { useReportPaging } from "~/composables/useReportPaging";
import {
  PURCHASE_REPORT_LAYOUTS,
  PURCHASE_REPORT_PERIODS,
  PURCHASE_TRANSACTION_ROUTE,
  buildPurchaseReportRows,
  reportColumn,
  type PurchaseReportRow
} from "~/data/purchase-report";
import {
  defaultPurchaseReportFilter,
  isReportFilterActive,
  isReportRangeValid,
  matchesPurchaseReportFilter,
  type PurchaseReportFilter
} from "~/data/purchase-report-filter";
import {
  PURCHASE_STATUS_LABEL,
  PURCHASE_STATUS_TYPE,
  type PurchaseStatus
} from "~/data/purchase-status";
import { TRANSACTION_TYPE_LABEL } from "~/data/purchase-transactions";
import { textlinkAlignClass } from "~/utils/textlink-align";

useHead({ title: "Purchase list — Mekari Jurnal" });

// ---------------------------------------------------------------------------
// Filter state
//
// Two objects, not one. `filter` is what the controls edit; `applied` is what
// the table reads. A report does not re-run as you type — you set a range and
// press Filter — which is the whole reason the page has a Filter button and a
// "Report will appear here" blank state at all. Collapsing them into one ref
// would make both meaningless.
// ---------------------------------------------------------------------------
const filter = reactive<PurchaseReportFilter>(defaultPurchaseReportFilter());
const applied = ref<PurchaseReportFilter | null>(null);
const isFilterDrawerOpen = ref(false);
const isLoading = ref(false);

const hasRun = computed(() => applied.value !== null);
const isRangeValid = computed(() => isReportRangeValid(filter));
const isDrawerFilterActive = computed(() => isReportFilterActive(filter));

function snapshot(): PurchaseReportFilter {
  return {
    ...filter,
    vendors: [...filter.vendors],
    statuses: [...filter.statuses],
    tags: [...filter.tags]
  };
}

/**
 * Stands in for production's fetch. The delay is deliberate: it is what makes
 * the skeleton rows reachable, and a report that returned instantly would
 * misrepresent a screen whose whole shape is built around waiting for one.
 */
function runReport() {
  if (!isRangeValid.value) return;
  applied.value = snapshot();
  reset();
  isLoading.value = true;
  window.setTimeout(() => (isLoading.value = false), 450);
}

function onApplyFilter(next: PurchaseReportFilter) {
  Object.assign(filter, next);
  isFilterDrawerOpen.value = false;
  runReport();
}

function clearFilters() {
  Object.assign(filter, defaultPurchaseReportFilter());
  runReport();
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------
const layoutId = ref(PURCHASE_REPORT_LAYOUTS[0]!.id);
const activeLayout = computed(
  () => PURCHASE_REPORT_LAYOUTS.find((l) => l.id === layoutId.value) ?? PURCHASE_REPORT_LAYOUTS[0]!
);
const columns = computed(() => activeLayout.value.columns.map(reportColumn));

const sortKey = ref<keyof PurchaseReportRow>("date");
const sortDir = ref<"asc" | "desc">("asc");

const filteredRows = computed<PurchaseReportRow[]>(() => {
  const f = applied.value;
  if (!f) return [];
  const rows = buildPurchaseReportRows(f.transactionType).filter((row) =>
    matchesPurchaseReportFilter(row, f)
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
  const typed = key as keyof PurchaseReportRow;
  if (sortKey.value === typed) sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  else {
    sortKey.value = typed;
    sortDir.value = "asc";
  }
  reset();
}

const transactionRoute = computed(() =>
  applied.value ? PURCHASE_TRANSACTION_ROUTE[applied.value.transactionType] : undefined
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

const metaLine = computed(() => {
  const f = applied.value;
  if (!f) return "";
  const period = PURCHASE_REPORT_PERIODS.find((p) => p.id === f.periodId);
  const label = period && period.id !== "custom" ? period.label : "Custom range";
  return `${TRANSACTION_TYPE_LABEL[f.transactionType]} · ${label} · ${f.startDate} – ${f.endDate} · IDR`;
});

const metaClass = css({ mb: 4 });
const tagRowClass = css({ display: "flex", gap: 2, flexWrap: "wrap" });
</script>
