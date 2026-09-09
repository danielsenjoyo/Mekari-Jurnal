<template>
  <DefaultPageContent title="Sales">
    <!-- Title-band action: the New dropdown of transaction types. Cloned
         from jurnal-frontend-app src/pages/sales/index.vue — the "New" popover
         lists every sales transaction type the user can create from scratch.
         Import is NOT here: it acts on the table below, so it sits in the
         filter bar beside Filter (docs/patterns/ImportExport.md). -->
    <template #actions>
      <MpPopover placement="bottom-end" use-portal is-adaptive-width>
        <template #default>
          <MpPopoverTrigger>
            <MpButton variant="primary" right-icon="caret-down">Create new sales</MpButton>
          </MpPopoverTrigger>
          <MpPopoverContent>
            <MpPopoverList>
              <MpPopoverListItem
                v-for="item in NEW_TRANSACTION_ITEMS"
                :key="item.key"
                role="menuitem"
                @click="onNewTransaction(item.key)"
              >
                {{ item.label }}
              </MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </template>
      </MpPopover>
    </template>

    <!-- Zone A — Summary boxes (KPI strip). These are ALWAYS the all-time
         invoice figures: they do not follow the active tab, the quick filter
         or the search. That is deliberate and matches the reference — the
         caption underneath says so outright ("Balance is for all time
         period"), which is what stops the strip reading as a summary of the
         table below it. The labels ("Unpaid invoices", "Payments received last
         30 days") only make sense for invoices anyway.
         See docs/patterns/SummaryBox.md. -->
    <div :class="statsGridClass">
      <SummaryBox
        variant="orange"
        label="Unpaid invoices"
        :badge="summary.unpaid.count"
        :amount="formatCurrency(summary.unpaid.amount)"
        is-filter
        :is-active="quickStatus === 'unpaid'"
        @click="onSummaryClick('unpaid')"
      />
      <SummaryBox
        variant="red"
        label="Overdue invoices"
        :badge="summary.overdue.count"
        :amount="formatCurrency(summary.overdue.amount)"
        is-filter
        :is-active="quickStatus === 'overdue'"
        @click="onSummaryClick('overdue')"
      />
      <SummaryBox
        variant="green"
        label="Payments received last 30 days"
        :badge="summary.payments.count"
        :amount="formatCurrency(summary.payments.amount)"
        is-hoverable
      />

      <!-- Mekari Pay's own card. It carries the product lockup instead of a
           text label — the #label slot exists for exactly this (see
           SummaryBox.vue) — and captions its own figure rather than reusing
           the shared "Total", because it counts only what arrived through
           Mekari Pay, not every payment. `pay-brand` is Pixel's official
           Mekari Pay icon, so nothing is fabricated here. -->
      <SummaryBox
        variant="gray"
        caption="Amount received last 30 days"
        :badge="summary.mekariPay.count"
        :amount="formatCurrency(summary.mekariPay.amount)"
        is-hoverable
      >
        <template #label>
          <MpFlex align-items="center" gap="2">
            <MpIcon name="pay-brand" size="md" />
            <MpText weight="semiBold" color="dark">Mekari Pay</MpText>
          </MpFlex>
        </template>
      </SummaryBox>
    </div>
    <div :class="statsCaptionClass">
      <MpText size="body-small" color="gray.600"
        >Balance is for all time period, unless stated otherwise</MpText
      >
    </div>

    <!-- Zone B — content tabs. Mirrors the source page's tabs_obj (Invoice /
         Delivery / Order / Return); each tab swaps both the table's column set
         and the status quick-filter options, matching the source page's
         setTableHeads()/status_options logic. -->
    <MpTabs v-model="activeTabIndex" variant-color="blue">
      <MpTabList>
        <MpTab v-for="tab in TABS" :key="tab.key">
          <span :class="tabLabelClass">
            {{ tab.label }}
            <MpBadge v-if="tab.key === 'ap'" for="additionalInformation" type="announcement">
              {{ approvalCount }}
            </MpBadge>
          </span>
        </MpTab>
      </MpTabList>
    </MpTabs>

    <!-- Zone C — filter bar. -->
    <div :class="filterBarClass">
      <div :class="filterLeftClass">
        <!-- The invoice allowance (FUP), shown where invoices are actually
             created. Links to the history page that accounts for it. -->
        <MpFlex v-if="activeTabKey === 'si'" align-items="center" gap="2">
          <MpText size="body-small" color="gray.600"
            >Invoice quota {{ quota.used }}/{{ quota.total }}</MpText
          >
          <MpTextlink as="button" variant="primary" @click="navigateTo('/sales/quota-history')"
            >Usage history</MpTextlink
          >
        </MpFlex>
        <div v-if="statusOptions.length" :class="quickFilterClass">
          <MpSelect v-model="quickStatus" placeholder="All status" is-full-width is-clearable>
            <option value="">All status</option>
            <option v-for="opt in statusOptions" :key="opt" :value="opt">
              {{ STATUS_LABEL[opt] }}
            </option>
          </MpSelect>
        </div>
      </div>

      <div :class="filterRightClass">
        <!-- Import and Filter act on a list of documents you own. The approval
             queue is a worklist of other people's, and the reference gives it
             a search box and nothing else — so neither control appears there.
             Import sits left of Filter: both act on the table below, and the
             source page offers the same two starting points — a Jurnal
             template, or one exported from another application. -->
        <MpPopover
          v-if="activeTabKey !== 'ap'"
          placement="bottom-start"
          use-portal
          is-adaptive-width
        >
          <template #default>
            <MpPopoverTrigger>
              <MpButton variant="secondary" right-icon="caret-down">Import</MpButton>
            </MpPopoverTrigger>
            <MpPopoverContent>
              <MpPopoverList>
                <MpPopoverListItem
                  v-for="item in IMPORT_ITEMS"
                  :key="item.key"
                  role="menuitem"
                  @click="onAction(item.key)"
                >
                  {{ item.label }}
                </MpPopoverListItem>
              </MpPopoverList>
            </MpPopoverContent>
          </template>
        </MpPopover>

        <div v-if="activeTabKey !== 'ap'" :class="filterButtonWrapClass">
          <MpButton variant="secondary" left-icon="filter" @click="isFilterDrawerOpen = true"
            >Filter</MpButton
          >
          <!-- A staged drawer closes over its own settings, so the button is
               the only place the user can see that a filter is still on. -->
          <span v-if="hasActiveFilter" :class="filterDotClass" aria-hidden="true" />
        </div>
        <div :class="searchGroupClass">
          <MpInputGroup>
            <MpInputLeftAddon>
              <MpIcon name="search" size="sm" color="gray.400" />
            </MpInputLeftAddon>
            <MpInput v-model="search" placeholder="Search number, customer, or tag..." />
          </MpInputGroup>
          <button
            v-if="searchTerm"
            type="button"
            data-search-clear
            aria-label="Clear search"
            :class="searchClearClass"
            @click="search = ''"
          >
            <MpIcon name="reset" size="sm" color="gray.400" />
          </button>
        </div>
      </div>
    </div>

    <!-- Advanced filter. Staged, not live: it edits its own draft and only
         Apply commits, which is why `filter` is replaced wholesale here. See
         the component for the per-tab field rules. -->
    <SalesFilterDrawer
      :is-open="isFilterDrawerOpen"
      :active-tab="activeTabKey"
      :status-options="statusOptions"
      :status-label="statusLabelFor"
      :applied="filter"
      @close="isFilterDrawerOpen = false"
      @apply="onApplyFilter"
    />

    <!-- Delete confirmation — shared by the row-level and bulk "Delete"
         actions (pendingDeleteIds holds either one row or the whole
         selection). Destructive action, per docs/patterns/Modal.md. -->
    <MpModal :is-open="showDeleteModal" size="sm" @close="closeDeleteModal">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          <span :class="modalTitleClass">{{ deleteModalTitle }}</span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="body" color="gray.700">This can't be undone.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <div :class="modalFooterClass">
            <MpButton variant="secondary" @click="closeDeleteModal">Cancel</MpButton>
            <MpButton variant="danger" @click="confirmDelete">Delete</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>

    <!-- Out of invoice quota. Not a confirm — there is nothing to confirm; it
         explains why the action stopped and offers the two ways forward. -->
    <MpModal :is-open="isQuotaModalOpen" size="sm" @close="isQuotaModalOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          <span :class="modalTitleClass">Invoice quota reached</span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="body" color="gray.700">
            All {{ quota.total }} sales invoices in this month's quota have been used. Add more
            quota to keep invoicing, or wait for the reset on the 10th.
          </MpText>
        </MpModalBody>
        <MpModalFooter>
          <div :class="modalFooterClass">
            <MpButton variant="secondary" @click="isQuotaModalOpen = false">Cancel</MpButton>
            <MpButton variant="primary" @click="navigateTo('/sales/quota-history')"
              >Add quota</MpButton
            >
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>

    <!-- Zone D/E — table + pager, OR the blank slate. -->
    <template v-if="filteredRows.length">
      <MpTableContainer ref="tableContainerRef" :class="scrollShadowClass">
        <!-- width:100% + min-width:tableMinWidth lets the table fill a wide
             viewport instead of stopping short and leaving a bare gap, while
             still scrolling horizontally once the viewport drops below
             tableMinWidth. table-layout:fixed hands any leftover space to
             whichever <col> has no explicit width — every real column stays
             pinned to its COLUMN_WIDTH px value and only the trailing filler
             <col> stretches to soak it up. -->
        <MpTable is-hoverable :class="tableSizeClass">
          <colgroup>
            <col :style="{ width: '44px' }" />
            <col v-for="col in columns" :key="col.key" :style="colWidth(col.key)" />
            <!-- Filler column — no width, so it's the one that absorbs
                 leftover space on a wide viewport. -->
            <col />
          </colgroup>
          <MpTableHead is-fixed :class="tableHeadClass">
            <!-- The bulk bar is its own row ABOVE the header — it must not
                 replace it. Swapping the header out removes the column labels
                 at exactly the moment the user is deciding which rows to act
                 on, and leaves two adjacent money columns (Balance due /
                 Total) unlabelled. See docs/patterns/BulkActionBar.md. -->
            <MpTableRow v-if="selected.length && activeTabKey !== 'ap'">
              <MpTableCell as="th" :colspan="columns.length + 2" :class="bulkCellClass">
                <div :class="bulkBarClass">
                  <MpText size="label" weight="semiBold" color="dark"
                    >{{ selected.length }} transaction selected</MpText
                  >
                  <MpButton size="sm" @click="onAction('print-pdf')">Print PDF</MpButton>
                  <MpButton size="sm" @click="onAction('send-email')">Send email</MpButton>
                  <MpButton size="sm" variant="danger" @click="openDeleteModal(selected)"
                    >Delete</MpButton
                  >
                  <MpTextlink as="button" variant="secondary" @click="selected = []"
                    >Clear selection</MpTextlink
                  >
                </div>
              </MpTableCell>
            </MpTableRow>

            <MpTableRow>
              <MpTableCell v-if="activeTabKey !== 'ap'" as="th" :class="checkboxCellClass">
                <MpCheckbox
                  :is-checked="allOnPageSelected"
                  :is-indeterminate="someOnPageSelected && !allOnPageSelected"
                  @change="toggleAllOnPage"
                />
              </MpTableCell>
              <MpTableCell v-else as="th" :class="checkboxCellClass" />
              <MpTableCell
                v-for="col in columns"
                :key="col.key"
                as="th"
                :class="col.numeric ? numCellClass : undefined"
              >
                <button
                  type="button"
                  :class="[sortHeaderClass, col.numeric ? sortHeaderNumClass : '']"
                  @click="toggleSort(col.key)"
                >
                  <span :class="headerLabelClass">{{ col.label }}</span>
                  <MpIcon :name="sortIconFor(col.key)" size="sm" color="gray.400" />
                </button>
              </MpTableCell>
              <!-- Filler cell — matches the widthless trailing <col> above.
                   On the approval queue it carries the row's two indicators. -->
              <MpTableCell as="th" />
            </MpTableRow>
          </MpTableHead>

          <MpTableBody v-if="isLoading">
            <MpTableRow v-for="n in 5" :key="`skeleton-${n}`">
              <!-- Matches checkboxCellClass's padding so the checkbox column
                   doesn't shift once the skeleton swaps for the real row. -->
              <MpTableCell as="td" :class="checkboxCellClass">
                <MpSkeleton is-loading><span :class="skeletonCheckboxClass" /></MpSkeleton>
              </MpTableCell>
              <MpTableCell v-for="col in columns" :key="col.key" as="td">
                <MpSkeleton is-loading><span :class="skeletonBarClass" /></MpSkeleton>
              </MpTableCell>
              <MpTableCell as="td" />
            </MpTableRow>
          </MpTableBody>

          <MpTableBody v-else>
            <MpTableRow v-for="row in pagedRows" :key="row.id">
              <MpTableCell v-if="activeTabKey !== 'ap'" as="td" :class="checkboxCellClass">
                <MpCheckbox :is-checked="selected.includes(row.id)" @change="toggleRow(row.id)" />
              </MpTableCell>
              <MpTableCell v-else as="td" :class="checkboxCellClass" />

              <MpTableCell
                v-for="col in columns"
                :key="col.key"
                as="td"
                :class="col.numeric ? numCellClass : undefined"
              >
                <template v-if="col.key === 'number'">
                  <MpTextlink
                    as="button"
                    variant="primary"
                    :class="linkCellClass"
                    @click="onOpen(row)"
                    >{{ row.number }}</MpTextlink
                  >
                  <MpText
                    v-if="row.memo"
                    size="body-small"
                    color="gray.600"
                    :class="wrapCellClass"
                    >{{ row.memo }}</MpText
                  >
                </template>
                <template v-else-if="col.key === 'customer'">
                  <MpTextlink
                    as="button"
                    variant="primary"
                    :class="linkCellClass"
                    @click="onAction('view-customer')"
                    >{{ row.customer }}</MpTextlink
                  >
                </template>
                <template v-else-if="col.key === 'status'">
                  <MpBadge for="tableStatus" :type="STATUS_TYPE[row.status]">{{
                    STATUS_LABEL[row.status]
                  }}</MpBadge>
                </template>
                <template v-else-if="col.key === 'tags'">
                  <MpText v-if="row.tags.length" size="body-small" :class="wrapCellClass">{{
                    row.tags.join(", ")
                  }}</MpText>
                  <MpText v-else size="body-small" color="gray.400">—</MpText>
                </template>
                <template v-else
                  ><span :class="wrapCellClass">{{ cellText(row, col.key) }}</span></template
                >
              </MpTableCell>
              <!-- Filler cell, doing double duty. On the approval queue it
                   holds the row's two indicators; everywhere else it holds the
                   row's own actions menu — the source page's `action`/`share`
                   columns, which sit at the same right edge. -->
              <MpTableCell as="td" :class="indicatorCellClass">
                <MpFlex v-if="activeTabKey !== 'ap'" justify-content="flex-end">
                  <MpPopover placement="bottom-end" use-portal is-adaptive-width>
                    <template #default>
                      <MpPopoverTrigger>
                        <MpButton
                          variant="ghost"
                          size="sm"
                          left-icon="menu-kebab"
                          aria-label="Row actions"
                        />
                      </MpPopoverTrigger>
                      <MpPopoverContent>
                        <MpPopoverList>
                          <MpPopoverListItem role="menuitem" @click="onOpen(row)"
                            >View detail</MpPopoverListItem
                          >
                          <MpPopoverListItem role="menuitem" @click="onRowEdit(row)"
                            >Edit</MpPopoverListItem
                          >
                          <MpPopoverListItem role="menuitem" @click="onRowDuplicate(row)"
                            >Duplicate transaction</MpPopoverListItem
                          >
                          <MpPopoverListItem role="menuitem" @click="onAction('print')"
                            >Preview &amp; print</MpPopoverListItem
                          >
                          <MpPopoverListItem role="menuitem" @click="onAction('share-email')"
                            >Share via email</MpPopoverListItem
                          >
                          <MpPopoverListItem role="menuitem" @click="openDeleteModal([row.id])"
                            >Delete</MpPopoverListItem
                          >
                        </MpPopoverList>
                      </MpPopoverContent>
                    </template>
                  </MpPopover>
                </MpFlex>
                <MpFlex v-else gap="3" justify-content="flex-end">
                  <!-- Approval progress. The reference opens an approval log
                       from here; this prototype has no log to open, so the
                       decision itself lives in the popover instead — the row
                       looks the same at rest either way. -->
                  <span :class="indicatorWrapClass">
                    <MpPopover placement="bottom-end" use-portal is-adaptive-width>
                      <template #default>
                        <MpPopoverTrigger>
                          <MpButton
                            variant="ghost"
                            size="sm"
                            left-icon="approval-rules"
                            :aria-label="`${row.approvalsDone} of ${row.approvalStepsTotal} approved`"
                          />
                        </MpPopoverTrigger>
                        <MpPopoverContent>
                          <MpPopoverList>
                            <MpPopoverListItem role="menuitem" @click="onApproval(row, 'approve')"
                              >Approve</MpPopoverListItem
                            >
                            <MpPopoverListItem role="menuitem" @click="onApproval(row, 'reject')"
                              >Reject</MpPopoverListItem
                            >
                          </MpPopoverList>
                        </MpPopoverContent>
                      </template>
                    </MpPopover>
                    <span :class="indicatorPillClass" aria-hidden="true"
                      >{{ row.approvalsDone }}/{{ row.approvalStepsTotal }}</span
                    >
                  </span>

                  <span :class="indicatorWrapClass">
                    <MpTooltip
                      :label="row.commentCount === 1 ? '1 comment' : `${row.commentCount} comments`"
                    >
                      <MpButton
                        variant="ghost"
                        size="sm"
                        left-icon="comment"
                        :aria-label="`${row.commentCount} comments`"
                        @click="onAction('view-comments')"
                      />
                    </MpTooltip>
                    <span :class="indicatorPillClass" aria-hidden="true">{{
                      row.commentCount
                    }}</span>
                  </span>
                </MpFlex>
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <div :class="paginationClass">
        <div :class="pagerLeftClass">
          <MpText size="body-small" color="gray.600">Rows per page</MpText>
          <MpPopover use-portal is-adaptive-width>
            <MpPopoverTrigger>
              <MpButton variant="ghost" size="sm" right-icon="chevrons-down">{{
                perPage
              }}</MpButton>
            </MpPopoverTrigger>
            <MpPopoverContent>
              <MpPopoverList>
                <MpPopoverListItem
                  v-for="opt in [10, 25, 50]"
                  :key="opt"
                  :is-active="perPage === opt"
                  @click="setPerPage(opt)"
                >
                  {{ opt }}
                </MpPopoverListItem>
              </MpPopoverList>
            </MpPopoverContent>
          </MpPopover>
          <MpText size="body-small" color="gray.600"
            >Showing {{ rangeStart }}-{{ rangeEnd }} of {{ filteredRows.length }}</MpText
          >
        </div>

        <div :class="pagerRightClass">
          <div :class="pageJumpClass">
            <MpAutocomplete
              :class="pageJumpInnerClass"
              :data="pageOptions"
              :model-value="page"
              is-searchable
              is-full-width
              @change="onJumpPage"
            />
          </div>
          <MpText size="body-small" color="gray.600">of {{ pageCount }} page</MpText>
          <MpTooltip label="Previous page">
            <MpButton
              variant="ghost"
              size="sm"
              left-icon="chevrons-left"
              :is-disabled="page <= 1"
              aria-label="Previous page"
              @click="page--"
            />
          </MpTooltip>
          <MpTooltip label="Next page">
            <MpButton
              variant="ghost"
              size="sm"
              left-icon="chevrons-right"
              :is-disabled="page >= pageCount"
              aria-label="Next page"
              @click="page++"
            />
          </MpTooltip>
        </div>
      </div>
    </template>

    <BlankSlate v-else :variant="emptyVariant" :title="emptyTitle" :description="emptyDescription">
      <MpButton v-if="hasActiveFilter" variant="secondary" @click="resetFilters"
        >Clear filters</MpButton
      >
    </BlankSlate>
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import {
  css,
  MpAutocomplete,
  MpBadge,
  MpButton,
  MpCheckbox,
  MpFlex,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpModal,
  MpModalBody,
  MpModalCloseButton,
  MpModalContent,
  MpModalFooter,
  MpModalHeader,
  MpModalOverlay,
  MpPopover,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpPopoverTrigger,
  MpSelect,
  MpSkeleton,
  MpTab,
  MpTabList,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpTabs,
  MpText,
  MpTextlink,
  MpTooltip
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import SummaryBox from "~/components/template/SummaryBox.vue";
import SalesFilterDrawer from "~/components/sales/SalesFilterDrawer.vue";
import {
  emptySalesFilter,
  isFilterActive,
  matchesSalesFilter,
  type SalesFilter
} from "~/data/sales-filter";
import { SALES_STATUS_LABEL, SALES_STATUS_TYPE, type SalesStatus } from "~/data/sales-status";
import { getQuotaSummary } from "~/data/sales-quota";
import {
  BILLING_METHOD_LABEL,
  MEKARI_PAY_METHOD,
  TYPE_CAPABILITIES,
  decideApproval,
  duplicateTransaction,
  formatAmount,
  formatCurrency,
  deleteTransactions,
  getSalesTransactions,
  type SalesTransaction,
  type TransactionType
} from "~/data/sales-transactions";

useHead({ title: "Sales — Mekari Jurnal" });

// ---------------------------------------------------------------------------
// Cloned from jurnal-frontend-app src/pages/sales/{index,list}.vue, following
// the same structure as this repo's Purchases index (app/pages/purchase/
// index.vue) — Sales is the AR mirror of that AP screen.
//
// This is a UI-only prototype: no backend, no approval workflow, no e-Meterai,
// no Mekari Pay, no Mixpanel — those are business-logic concerns of the real
// app. What's ported is the *shape* of the screen: the transaction tabs, the
// per-tab column set (setTableHeads()), the per-tab status quick-filter
// options (status_options), summary boxes, filter bar, bulk bar, and
// pagination — built per docs/index-page-pattern.md.
// ---------------------------------------------------------------------------

type TabKey = "si" | "jsi" | "sd" | "so" | "sq" | "pfi" | "pfo" | "sr" | "ap" | "rj";

const TABS: { key: TabKey; label: string }[] = [
  { key: "si", label: "Invoice" },
  { key: "jsi", label: "Join invoice" },
  { key: "sd", label: "Delivery" },
  { key: "so", label: "Order" },
  { key: "sq", label: "Quotation" },
  { key: "pfi", label: "Pro forma invoice" },
  { key: "pfo", label: "Pro forma order" },
  { key: "sr", label: "Return" },
  { key: "ap", label: "Require approval" },
  { key: "rj", label: "Rejected" }
];

// Labels + order match the real product's "Create new sales" popover. Return
// is absent on purpose: a sales return is always raised against a specific
// invoice (from that invoice's Actions menu), never from an empty form.
const NEW_TRANSACTION_ITEMS: { key: TransactionType; label: string }[] = [
  { key: "invoice", label: "Sales invoice" },
  { key: "join_invoice", label: "Join invoice" },
  { key: "order", label: "Sales order" },
  { key: "quotation", label: "Sales quotation" },
  { key: "proforma_invoice", label: "Pro forma invoice" },
  { key: "proforma_order", label: "Pro forma order" },
  { key: "delivery", label: "Sales delivery" }
];

// The two starting points the source page's Import menu offers.
const IMPORT_ITEMS: { key: string; label: string }[] = [
  { key: "import-jurnal", label: "Template from Jurnal" },
  { key: "import-other", label: "Template from other application" }
];

// Status vocabulary lives in app/data/sales-status.ts so the detail pages can
// read the exact same labels and badge types.
type StatusValue = SalesStatus;
const STATUS_LABEL = SALES_STATUS_LABEL;
const STATUS_TYPE = SALES_STATUS_TYPE;

// Status quick-filter options per tab — mirrors the source page's
// `status_options` getter (a switch on `active_tab.key`).
// Tabs absent from the source page's `status_options` switch (the join-invoice
// and the two cross-cutting queues) get no quick-filter select at all.
const STATUS_OPTIONS_BY_TAB: Record<TabKey, StatusValue[]> = {
  si: ["open", "overdue", "paid", "partial", "unpaid"],
  jsi: [],
  sd: ["open", "closed"],
  so: ["open", "partially_sent", "closed"],
  sq: ["open", "closed"],
  pfi: ["open", "closed", "paid"],
  pfo: ["open", "partial", "closed"],
  sr: ["open", "closed"],
  ap: [],
  rj: []
};

type ColumnKey =
  | "transactionDate"
  | "number"
  | "customer"
  | "dueDate"
  | "status"
  | "depositAmount"
  | "balanceDue"
  | "totalAmount"
  | "billing"
  | "tags";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  numeric?: boolean;
}

// Per-tab column sets — mirrors the source page's setTableHeads(), which
// starts from a shared base (`heads`) and flips a handful of `show` flags
// per tab. A Delivery carries no money, so it shows no money column.
const COLUMNS_BY_TAB: Record<TabKey, ColumnDef[]> = {
  si: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "customer", label: "Customer" },
    { key: "dueDate", label: "Due date" },
    { key: "status", label: "Status" },
    { key: "balanceDue", label: "Balance due", numeric: true },
    { key: "totalAmount", label: "Total", numeric: true },
    { key: "tags", label: "Tags" }
  ],
  sd: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "customer", label: "Customer" },
    { key: "status", label: "Status" },
    { key: "tags", label: "Tags" }
  ],
  so: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "customer", label: "Customer" },
    { key: "dueDate", label: "Due date" },
    { key: "status", label: "Status" },
    { key: "totalAmount", label: "Total", numeric: true },
    { key: "tags", label: "Tags" }
  ],
  sr: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "customer", label: "Customer" },
    { key: "status", label: "Status" },
    { key: "totalAmount", label: "Total", numeric: true },
    { key: "tags", label: "Tags" }
  ],
  // A join invoice bundles other invoices, so it carries no tags or warehouse
  // of its own — only the combined figures.
  jsi: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "customer", label: "Customer" },
    { key: "dueDate", label: "Due date" },
    { key: "status", label: "Status" },
    { key: "balanceDue", label: "Balance due", numeric: true },
    { key: "totalAmount", label: "Total", numeric: true }
  ],
  // A quotation expires rather than falling due — same column, different label.
  sq: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "customer", label: "Customer" },
    { key: "dueDate", label: "Expiry date" },
    { key: "status", label: "Status" },
    { key: "totalAmount", label: "Total", numeric: true },
    { key: "tags", label: "Tags" }
  ],
  pfi: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "customer", label: "Customer" },
    { key: "dueDate", label: "Due date" },
    { key: "status", label: "Status" },
    { key: "totalAmount", label: "Total", numeric: true },
    { key: "tags", label: "Tags" }
  ],
  // Progress billing's own column: which share of the order this claims.
  pfo: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "customer", label: "Customer" },
    { key: "status", label: "Status" },
    { key: "billing", label: "Billing" },
    { key: "totalAmount", label: "Total", numeric: true },
    { key: "tags", label: "Tags" }
  ],
  // The two cross-cutting queues mix every type, so their Number column is the
  // only place the type shows — hence no per-type column set of their own.
  // Column set and order match the real product's Require approval tab, which
  // labels the date column "Expiration date" (one generic name across the
  // types it mixes) and keeps Status — every row there reads "Draft".
  ap: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "customer", label: "Customer" },
    { key: "dueDate", label: "Expiration date" },
    { key: "status", label: "Status" },
    { key: "totalAmount", label: "Total", numeric: true },
    { key: "tags", label: "Tags" }
  ],
  rj: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "customer", label: "Customer" },
    { key: "dueDate", label: "Due date" },
    { key: "status", label: "Status" },
    { key: "totalAmount", label: "Total", numeric: true },
    { key: "tags", label: "Tags" }
  ]
};

interface Row {
  id: number;
  /** The record's own type, so a row always knows which detail route it
   *  belongs to. */
  type: TransactionType;
  transactionDate: string;
  transactionDateSort: string;
  number: string;
  memo: string;
  customer: string;
  // Carried purely so the advanced filter's "Column option" can search them —
  // none of these are shown in any tab's column set.
  warehouse: string;
  referenceNo: string;
  message: string;
  products: string[];
  dueDate: string;
  dueDateSort: string;
  status: StatusValue;
  depositAmount: number;
  balanceDue: number;
  totalAmount: number;
  /** Pro-forma-order-only: the share of its order this document bills. */
  billing: string;
  tags: string[];
  approvalStepsTotal: number;
  approvalsDone: number;
  commentCount: number;
}

// ---- Shared dataset → per-tab rows --------------------------------------
//
// app/data/sales-transactions.ts holds ONE array spanning all 4 transaction
// types; each tab is a filtered view over it, so a duplicated or newly
// created record has exactly one place to appear.

// Which TABS entries are a straight `type` filter; "ap"/"rj" have no type of
// their own — they cut across every type instead (see rowsForTab).
const TAB_TYPE: Partial<Record<TabKey, TransactionType>> = {
  si: "invoice",
  jsi: "join_invoice",
  sd: "delivery",
  so: "order",
  sq: "quotation",
  pfi: "proforma_invoice",
  pfo: "proforma_order",
  sr: "return"
};

function toRow(t: SalesTransaction): Row {
  return {
    id: t.id,
    type: t.type,
    transactionDate: t.transactionDate,
    transactionDateSort: t.transactionDateSort,
    number: t.number,
    memo: t.memo,
    customer: t.customerName,
    warehouse: t.warehouse,
    referenceNo: t.referenceNo,
    message: t.message,
    products: t.lines.map((l) => l.product),
    dueDate: t.dueDate,
    dueDateSort: t.dueDateSort,
    status: t.status,
    depositAmount: t.depositAmount,
    balanceDue: t.balanceDue,
    totalAmount: t.total,
    billing: t.billingMethod
      ? `${BILLING_METHOD_LABEL[t.billingMethod]} · ${t.billingPercent}%`
      : "",
    tags: t.tags,
    approvalStepsTotal: t.approvalStepsTotal,
    approvalsDone: t.approvalsDone,
    commentCount: t.commentCount
  };
}

function rowsForTab(tab: TabKey): Row[] {
  const all = getSalesTransactions();
  if (tab === "ap") return all.filter((t) => t.needsApproval && t.status !== "rejected").map(toRow);
  if (tab === "rj") return all.filter((t) => t.status === "rejected").map(toRow);
  const type = TAB_TYPE[tab];
  // A record that is pending approval or rejected lives only in its
  // cross-cutting tab, not also under its own type — otherwise resetting one
  // would leave it visible in two places at once.
  return all
    .filter((t) => t.type === type && t.status !== "rejected" && !t.needsApproval)
    .map(toRow);
}

const approvalCount = computed(() => {
  void refreshTick.value;
  return rowsForTab("ap").length;
});

// ---- Page state ---------------------------------------------------------

const activeTabIndex = ref(0);
const activeTabKey = computed<TabKey>(() => TABS[activeTabIndex.value]!.key);
const columns = computed(() => COLUMNS_BY_TAB[activeTabKey.value]);
const statusOptions = computed(() => STATUS_OPTIONS_BY_TAB[activeTabKey.value]);

const isFilterDrawerOpen = ref(false);
// One object, not loose refs: the drawer stages a copy of exactly this shape
// and Apply swaps it in, so page and drawer can never disagree about what is
// currently filtered. The search box and the quick status select edit two of
// its fields directly — they are shortcuts into the same filter, not a second
// one layered on top.
const filter = ref<SalesFilter>(emptySalesFilter());
const search = computed({
  get: () => filter.value.key,
  set: (value: string) => (filter.value.key = value)
});
const quickStatus = computed({
  get: () => filter.value.status,
  set: (value: string) => (filter.value.status = value)
});
const hasActiveFilter = computed(() => isFilterActive(filter.value));
const page = ref(1);
const perPage = ref(10);
const selected = ref<number[]>([]);
const sortKey = ref<ColumnKey | null>(null);
const sortDir = ref<"asc" | "desc">("asc");
const isLoading = ref(false);
const showDeleteModal = ref(false);
const isQuotaModalOpen = ref(false);
const pendingDeleteIds = ref<number[]>([]);
// The shared dataset (app/data/sales-transactions.ts) is a plain
// (non-reactive) array — bumping this after a mutation (delete) is what makes
// filteredRows/summary re-read it.
const refreshTick = ref(0);

const quota = computed(() => {
  void refreshTick.value;
  return getQuotaSummary();
});

const searchTerm = computed(() => (search.value ?? "").trim());

// Switching tabs resets page/selection/sort/filter, same as the source page's
// `@Watch('active_tab')`.
const tableContainerRef = ref<{ $el?: HTMLElement } | HTMLElement | null>(null);
watch(activeTabIndex, () => {
  page.value = 1;
  selected.value = [];
  sortKey.value = null;
  // The source clears the whole filter on tab change, not just the status: the
  // fields differ per tab, so a filter carried across could be narrowing by a
  // control the new tab doesn't even show.
  filter.value = emptySalesFilter();
  // MpTableContainer is the horizontal-scroll element and it's NOT remounted
  // on tab change, so a scroll position left over from the previous tab's
  // table otherwise carries straight into the new one.
  nextTick(() => {
    // The ref holds either the DOM node or the component instance wrapping it,
    // depending on how MpTableContainer renders. `in` narrowing doesn't settle
    // that union when `$el` is optional, so test the DOM case directly.
    const container: unknown = tableContainerRef.value;
    const el =
      container instanceof HTMLElement
        ? container
        : ((container as { $el?: HTMLElement } | null)?.$el ?? null);
    el?.scrollTo({ left: 0 });
  });
});

function sortValue(row: Row, key: ColumnKey): string | number {
  switch (key) {
    case "transactionDate":
      return row.transactionDateSort;
    case "dueDate":
      return row.dueDateSort;
    case "tags":
      return row.tags.join(", ");
    default:
      return (row as unknown as Record<string, string | number>)[key] ?? "";
  }
}

function cellText(row: Row, key: ColumnKey): string {
  switch (key) {
    case "dueDate":
      return row.dueDate;
    case "transactionDate":
      return row.transactionDate;
    case "balanceDue":
      return formatAmount(row.balanceDue);
    case "totalAmount":
      return formatAmount(row.totalAmount);
    case "depositAmount":
      return formatAmount(row.depositAmount);
    case "billing":
      return row.billing || "—";
    default:
      return "";
  }
}

const filteredRows = computed(() => {
  void refreshTick.value;
  let result = rowsForTab(activeTabKey.value).filter((row) =>
    matchesSalesFilter(row, filter.value)
  );

  if (sortKey.value) {
    const key = sortKey.value;
    const dir = sortDir.value === "asc" ? 1 : -1;
    result = [...result].sort((a, b) => {
      const av = sortValue(a, key);
      const bv = sortValue(b, key);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }
  return result;
});

// All-time INVOICE figures — deliberately independent of the tab, quick filter
// and search (see the Zone A comment in the template). Recomputed off
// refreshTick because the shared dataset is a plain array.
const summary = computed(() => {
  void refreshTick.value;
  const invoices = getSalesTransactions().filter((t) => t.type === "invoice");
  // "Unpaid" is anything still owing, not just status === "unpaid" — an open,
  // partially paid or overdue invoice all still have a balance outstanding.
  const unpaid = invoices.filter((t) => t.balanceDue > 0);
  const overdue = invoices.filter((t) => t.status === "overdue");
  const paid = invoices.filter((t) => t.amountReceived > 0);
  // Mekari Pay's card counts only the payments that actually came through it,
  // so it is a genuine slice of the payment history rather than a placeholder
  // figure — an invoice settled by bank transfer never lands here.
  const viaMekariPay = invoices.flatMap((t) =>
    t.payments.filter((p) => p.method === MEKARI_PAY_METHOD)
  );
  return {
    unpaid: { count: unpaid.length, amount: unpaid.reduce((sum, t) => sum + t.balanceDue, 0) },
    overdue: { count: overdue.length, amount: overdue.reduce((sum, t) => sum + t.balanceDue, 0) },
    payments: { count: paid.length, amount: paid.reduce((sum, t) => sum + t.amountReceived, 0) },
    mekariPay: {
      count: viaMekariPay.length,
      amount: viaMekariPay.reduce((sum, p) => sum + p.amount, 0)
    }
  };
});

const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / perPage.value)));
const pageOptions = computed(() =>
  Array.from({ length: pageCount.value }, (_, i) => ({ label: String(i + 1), value: i + 1 }))
);
const pagedRows = computed(() => {
  const start = (page.value - 1) * perPage.value;
  return filteredRows.value.slice(start, start + perPage.value);
});
const rangeStart = computed(() =>
  filteredRows.value.length === 0 ? 0 : (page.value - 1) * perPage.value + 1
);
const rangeEnd = computed(() => Math.min(page.value * perPage.value, filteredRows.value.length));

watch([page, pageCount], () => {
  if (page.value < 1) page.value = 1;
  else if (page.value > pageCount.value) page.value = pageCount.value;
});

const allOnPageSelected = computed(
  () => pagedRows.value.length > 0 && pagedRows.value.every((r) => selected.value.includes(r.id))
);
const someOnPageSelected = computed(() =>
  pagedRows.value.some((r) => selected.value.includes(r.id))
);

function toggleRow(id: number) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((x) => x !== id)
    : [...selected.value, id];
}
function toggleAllOnPage() {
  const ids = pagedRows.value.map((r) => r.id);
  selected.value = allOnPageSelected.value
    ? selected.value.filter((x) => !ids.includes(x))
    : [...new Set([...selected.value, ...ids])];
}
function toggleSort(key: ColumnKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortDir.value = "asc";
  }
  page.value = 1;
}
function sortIconFor(key: ColumnKey) {
  if (sortKey.value !== key) return "sort-default";
  return sortDir.value === "asc" ? "sort-ascending" : "sort-descending";
}
function setPerPage(n: number) {
  perPage.value = n;
  page.value = 1;
}
function onJumpPage(val: unknown) {
  const v = val && typeof val === "object" ? (val as { value: number }).value : val;
  const n = Number(v);
  if (!Number.isNaN(n)) page.value = n;
}
// The boxes describe invoices, so a click jumps to the Invoice tab and applies
// that status — filtering in place would contradict the figure just clicked
// whenever another tab is open. Clicking an active box clears the filter.
function onSummaryClick(status: StatusValue) {
  activeTabIndex.value = TABS.findIndex((t) => t.key === "si");
  quickStatus.value = quickStatus.value === status ? "" : status;
}

/** A list that has simply never had a row is not a failed search, and must
 *  not borrow the magnifier illustration to say so. */
const emptyVariant = computed(() =>
  searchTerm.value || hasActiveFilter.value ? "not-found" : "no-data"
);

const emptyTitle = computed(() => {
  if (searchTerm.value) return `"${searchTerm.value}" not found`;
  if (hasActiveFilter.value) return "No results found";
  return "No data yet";
});
const emptyDescription = computed(() => {
  if (searchTerm.value) return "Check the keywords you entered and try your search again.";
  if (hasActiveFilter.value)
    return "No items match your filters. Try adjusting them, or clear all filters to start over.";
  return "There's nothing here yet.";
});

function resetFilters() {
  filter.value = emptySalesFilter();
}

function statusLabelFor(status: string): string {
  return STATUS_LABEL[status as SalesStatus] ?? status;
}

function onApplyFilter(next: SalesFilter) {
  filter.value = next;
  // Any change to the criteria can shrink the result set below the current
  // page, which would otherwise leave the user staring at an empty page 4.
  page.value = 1;
  selected.value = [];
  isFilterDrawerOpen.value = false;
}

function onOpen(row: Row) {
  const route = TYPE_CAPABILITIES[row.type]?.route;
  if (route) navigateTo(`/sales/${route}/${row.id}`);
}

function onAction(action: string) {
  void action; // inert in this prototype, same as the detail pages' links
}

// The approval queue's own row actions (the source app's SalesApprovalActions).
// Approving returns the record to its own type's tab; rejecting moves it to
// Rejected — either way it leaves this queue, which is why the list has to
// re-read the dataset afterwards.
function onApproval(row: Row, decision: "approve" | "reject") {
  decideApproval(row.id, decision);
  selected.value = selected.value.filter((id) => id !== row.id);
  refreshTick.value++;
}

// Row actions route by the ROW's type, not the tab's: the Rejected queue mixes
// every type, so a row there still has to reach its own edit form.
function onRowEdit(row: Row) {
  const route = TYPE_CAPABILITIES[row.type]?.route;
  if (route) navigateTo(`/sales/${route}/edit/${row.id}`);
}
function onRowDuplicate(row: Row) {
  const duplicate = duplicateTransaction(row.id);
  const route = duplicate && TYPE_CAPABILITIES[duplicate.type]?.route;
  if (route) navigateTo(`/sales/${route}/edit/${duplicate!.id}`);
}

function onNewTransaction(key: string) {
  // An exhausted allowance stops an invoice here rather than letting the form
  // be filled in and fail on save — the source page gates the same action.
  if (key === "invoice" && quota.value.remaining <= 0) {
    isQuotaModalOpen.value = true;
    return;
  }
  const route = TYPE_CAPABILITIES[key as TransactionType]?.route;
  if (route) navigateTo(`/sales/${route}/new`);
}

// ---- Delete confirmation (row-level and bulk) ---------------------------

const deleteModalTitle = computed(() => {
  const ids = pendingDeleteIds.value;
  if (ids.length === 1) {
    // ids are globally unique across the whole shared dataset, so this finds
    // the record regardless of which tab it's being deleted from.
    const record = getSalesTransactions().find((t) => t.id === ids[0]);
    return `Delete ${record?.number ?? "this item"}?`;
  }
  return `Delete ${ids.length} items?`;
});

function openDeleteModal(ids: number[]) {
  if (!ids.length) return;
  pendingDeleteIds.value = ids;
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  pendingDeleteIds.value = [];
}

function confirmDelete() {
  const ids = pendingDeleteIds.value;
  deleteTransactions(ids);
  selected.value = selected.value.filter((id) => !ids.includes(id));
  refreshTick.value++;
  closeDeleteModal();
}

// Per-column widths sized to the content each column actually holds, NOT an
// even percentage split — see docs/index-page-pattern.md §9.1. These widths
// let each column hold its longest realistic value; when they don't all fit,
// MpTableContainer scrolls horizontally instead of squeezing the columns.
const COLUMN_WIDTH: Record<ColumnKey, number> = {
  transactionDate: 120,
  number: 210,
  customer: 180,
  dueDate: 120,
  status: 120,
  // The money columns carry two decimals ("10.016.640,00"), so they need
  // ~30px more than a bare integer would.
  depositAmount: 170,
  balanceDue: 180,
  totalAmount: 180,
  // "Percentage · 50%" needs more room than a bare figure.
  billing: 170,
  tags: 140
};
const CHECKBOX_COLUMN_WIDTH = 44;
// The only inline styles this page uses are the <colgroup> widths — the one
// documented exception, because `table-layout: fixed` needs authoritative
// per-<col> widths (docs/patterns/TablePage.md).
function colWidth(key: ColumnKey) {
  return { width: `${COLUMN_WIDTH[key]}px` };
}
const tableMinWidth = computed(
  () =>
    `${columns.value.reduce((sum, col) => sum + COLUMN_WIDTH[col.key], CHECKBOX_COLUMN_WIDTH)}px`
);

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const statsGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 4
});
const statsCaptionClass = css({ display: "flex", justifyContent: "flex-end", mt: 2, mb: 4 });
// whiteSpace:nowrap keeps labels on one line — MpTab doesn't reserve enough
// width for its content by default, so without this the text wraps to 2 lines
// instead of the tab simply sizing to fit it.
const tabLabelClass = css({
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  whiteSpace: "nowrap"
});

const filterButtonWrapClass = css({ position: "relative", display: "inline-flex" });
const filterDotClass = css({
  position: "absolute",
  top: "-2px",
  right: "-2px",
  width: "10px",
  height: "10px",
  borderRadius: "full",
  bg: "red.400",
  borderWidth: "2px",
  borderColor: "white"
});
const filterBarClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 3,
  flexWrap: "wrap",
  mt: 5,
  mb: 5
});
const filterLeftClass = css({ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" });
const filterRightClass = css({ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" });

const searchGroupClass = css({
  position: "relative",
  width: "280px",
  "& [data-search-clear]": { opacity: 0, transition: "opacity 0.12s ease" },
  "&:hover [data-search-clear], &:focus-within [data-search-clear]": { opacity: 1 }
});
const searchClearClass = css({
  position: "absolute",
  top: "50%",
  right: "3",
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "0",
  bg: "transparent",
  p: 0,
  cursor: "pointer",
  lineHeight: "0"
});
const quickFilterClass = css({ width: "180px" });

// min-width comes from the per-column widths (see COLUMN_WIDTH above), bound
// inline on <MpTable>, so it always matches the active tab's column set.
// Pure-CSS horizontal scroll affordance: the two `local` white gradients sit
// on the content and scroll away with it; the two `scroll` radial shadows are
// pinned to the container's edges, so a table that overflows says so with no
// ResizeObserver and no JS state.
const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});
// width:100% + the active tab's min-width lets the table fill a wide viewport
// instead of stopping short, while still scrolling horizontally once the
// viewport drops below that floor. Computed rather than inline: min-width
// changes with the tab's column set, and css() resolves at runtime.
const tableSizeClass = computed(() =>
  css({ tableLayout: "fixed", width: "100%", minWidth: tableMinWidth.value })
);
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
// Money columns right-align, matching the real product. The earlier objection
// to this — that a right-aligned figure never lines up with its header, whose
// sort icon sits after the label — is answered by sortHeaderNumClass below,
// which pushes the whole label+icon group to the same right edge. Both now
// share one edge, which is the point of right-aligning figures at all.
const numCellClass = css({ textAlign: "right" });
const checkboxCellClass = css({ width: "44px", pl: "3!", pr: "0!" });
// MpTableCell defaults to white-space:nowrap + overflow:visible, so long text
// (customer names, memos) spills sideways into the neighbouring cell. Wrap it
// inside the cell instead — never clip: an ellipsis mid-way through a document
// number is unreadable, and these columns are sized (COLUMN_WIDTH) to fit
// their content in one line anyway.
//
// The `!` overrides matter here: MpTextlink (the Number column) ships its own
// `display:inline-flex` + `white-space:nowrap`, which both sizes to content
// and centres it. `display:flex!` + `justifyContent` re-anchor the text to the
// cell's edge, and `width:full!` makes it fill the column rather than hug its
// own content.
const wrapCellBase = {
  display: "flex!",
  width: "full!",
  minWidth: "0!",
  whiteSpace: "normal!",
  wordBreak: "break-word",
  textAlign: "left!",
  justifyContent: "flex-start!"
} as const;
const wrapCellClass = css(wrapCellBase);
// The Number cell stacks a link over a description, and the link is the only
// one of the two that is a <button>: MpTextlink's recipe gives it 2px of
// inline padding, so its glyphs would sit 2px right of both the description
// beneath it and the "Number" header above. Cancelled with a negative margin
// rather than by zeroing the padding, because the Pixel recipe declares that
// padding `!important` and unlayered — it can't be overridden from here.
const linkCellClass = css({ ...wrapCellBase, ml: "-2px", mr: "-2px" });

// Numeric headers push label + sort icon to the right, so the header and the
// figures beneath it end on the same edge.
const sortHeaderNumClass = css({ justifyContent: "flex-end" });
const sortHeaderClass = css({
  display: "flex",
  alignItems: "center",
  gap: 1,
  border: "0",
  bg: "transparent",
  p: 0,
  cursor: "pointer",
  color: "inherit",
  font: "inherit",
  width: "full"
});
// Header labels stay on one line — every column is sized to fit its label
// next to the sort icon.
const headerLabelClass = css({
  minWidth: "0",
  whiteSpace: "nowrap",
  textAlign: "left"
});

// The approval queue's two row indicators: an icon with a small count pill
// floating at its top-right. Same construction as the navbar's notification
// bell (app/components/navbar/Notification.vue) — a relative wrapper with an
// absolutely-positioned pill — in blue rather than red, because a pending
// approval is information, not an alert.
const indicatorCellClass = css({ textAlign: "right" });
const indicatorWrapClass = css({ position: "relative", display: "inline-flex" });
const indicatorPillClass = css({
  position: "absolute",
  top: "-1.5",
  right: "-2",
  minWidth: "4",
  height: "4",
  px: "1",
  borderRadius: "var(--border-radius-full)",
  bg: "blue.400",
  color: "white",
  fontSize: "sm",
  fontWeight: "semiBold",
  lineHeight: "sm",
  textAlign: "center",
  pointerEvents: "none"
});

const bulkBarClass = css({ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" });
const bulkCellClass = css({ py: "11px!" });

const skeletonBarClass = css({ display: "block", height: "4", rounded: "sm" });
// Sized to match MpCheckbox's own 18px control rather than stretching full
// width like the other columns' skeleton bars.
const skeletonCheckboxClass = css({
  display: "block",
  width: "18px",
  height: "18px",
  rounded: "sm"
});

const paginationClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 3,
  py: 3
});
const pagerLeftClass = css({ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" });
const pagerRightClass = css({ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" });
const pageJumpClass = css({ width: "100px" });
const pageJumpInnerClass = css({ h: "7.5" });

const modalTitleClass = css({ fontSize: "lg" });
const modalFooterClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
</script>
