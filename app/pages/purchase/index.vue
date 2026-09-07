<template>
  <DefaultPageContent title="Purchases">
    <!-- Title-band actions: Import (plain secondary) + New (primary dropdown
         of transaction types). Cloned from jurnal-frontend-app
         src/pages/purchases/index.vue — the "New" popover lists every
         purchase transaction type the user can create. -->
    <template #actions>
      <MpButton variant="secondary">Import</MpButton>
      <MpPopover placement="bottom-end" use-portal is-adaptive-width>
        <template #default>
          <MpPopoverTrigger>
            <MpButton variant="primary" right-icon="caret-down">Create new purchase</MpButton>
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
         caption underneath says so outright ("Balance is for all time period"),
         which is what stops the strip reading as a summary of the table below
         it. An earlier revision scoped them to the visible rows instead; the
         reference resolves the same ambiguity by labelling rather than
         re-scoping, and the labels ("Unpaid invoices", "Payments sent last 30
         days") only make sense for invoices anyway.
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
        label="Payments sent last 30 days"
        :badge="summary.payments.count"
        :amount="formatCurrency(summary.payments.amount)"
        is-hoverable
      />

      <!-- Fourth cell is a Mekari Pay promo, not a KPI — same grid track, but
           its own card. The reference uses a branded Mekari Pay illustration;
           we don't have that asset, so a tinted `wallet` icon stands in rather
           than shipping a fabricated logo or a broken image. -->
      <div :class="promoCardClass">
        <div :class="promoIconClass">
          <MpIcon name="wallet" size="md" color="blue.600" />
        </div>
        <div :class="promoTextClass">
          <MpText size="body-small" weight="semiBold" color="dark"
            >Verify your data to send payment soon</MpText
          >
          <MpTextlink as="button" variant="primary" @click="onAction('check-mekari-pay')"
            >Check Mekari Pay</MpTextlink
          >
        </div>
      </div>
    </div>
    <div :class="statsCaptionClass">
      <MpText size="body-small" color="gray.600"
        >Balance is for all time period, unless stated otherwise</MpText
      >
    </div>

    <!-- Zone B — content tabs. Mirrors the 9 tabs of the source page's
         tabs_obj (Invoice / Join invoice / Delivery / Order / Quote /
         Request / Need approval / Rejected / Financing); each tab swaps
         both the table's column set and the status quick-filter options,
         matching the source page's setTableHeads()/status_options logic. -->
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

    <!-- Zone C — filter bar. The status quick-select is omitted for tabs
         with no status_options in the source page (Join invoice, Need
         approval, Rejected, Financing) — the row then right-aligns to the
         search field, matching the original layout. -->
    <div :class="filterBarClass">
      <div :class="filterLeftClass">
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
        <div :class="filterButtonWrapClass">
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
            <MpInput v-model="search" placeholder="Search number, vendor, or tag..." />
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
    <PurchaseFilterDrawer
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

    <!-- Zone D/E — table + pager, OR the blank slate. -->
    <template v-if="filteredRows.length">
      <MpTableContainer ref="tableContainerRef" :class="scrollShadowClass">
        <!-- width:100% + min-width:tableMinWidth lets the table fill a wide
             viewport instead of stopping short and leaving a bare gap (its
             previous min-width-only behaviour), while still scrolling
             horizontally once the viewport drops below tableMinWidth.
             table-layout:fixed hands any leftover space to whichever
             <col> has no explicit width — every real column stays pinned
             to its COLUMN_WIDTH/CHECKBOX_COLUMN_WIDTH px value (so the
             checkbox never grows again) and only the trailing filler <col>
             (matched by the blank <th>/<td> at the end of every row below)
             stretches to soak it up. -->
        <MpTable
          is-hoverable
          :class="tableFixedClass"
          :style="{ minWidth: tableMinWidth, width: '100%' }"
        >
          <colgroup>
            <col :style="{ width: '44px' }" />
            <col
              v-for="col in columns"
              :key="col.key"
              :style="{ width: `${COLUMN_WIDTH[col.key]}px` }"
            />
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
                    >{{ selected.length }} selected</MpText
                  >
                  <MpButton size="sm" @click="showPrintModal = true">Print PDF</MpButton>
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
                <button type="button" :class="sortHeaderClass" @click="toggleSort(col.key)">
                  <span :class="headerLabelClass">{{ col.label }}</span>
                  <MpIcon :name="sortIconFor(col.key)" size="sm" color="gray.400" />
                </button>
              </MpTableCell>
              <!-- Filler cell — matches the widthless trailing <col> above. -->
              <MpTableCell as="th" />
            </MpTableRow>
          </MpTableHead>

          <MpTableBody v-if="isLoading">
            <MpTableRow v-for="n in 5" :key="`skeleton-${n}`">
              <!-- Matches checkboxCellClass's padding so the checkbox column
                   doesn't shift once the skeleton swaps for the real row —
                   a plain generic cell here sits with the default padding
                   instead, landing the skeleton bar off from where the
                   checkbox itself renders. -->
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
                <template v-else-if="col.key === 'urgency'">
                  <MpFlex v-if="row.urgency" gap="2" align-items="center">
                    <MpIcon :name="`priority-${row.urgency.priority}`" size="sm" />
                    <MpText size="body-small">{{ row.urgency.label }}</MpText>
                  </MpFlex>
                </template>
                <template v-else
                  ><span :class="wrapCellClass">{{ cellText(row, col.key) }}</span></template
                >
              </MpTableCell>
              <MpTableCell as="td" />
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
import PurchaseFilterDrawer from "~/components/purchase/PurchaseFilterDrawer.vue";
import {
  emptyPurchaseFilter,
  isFilterActive,
  matchesPurchaseFilter,
  type PurchaseFilter
} from "~/data/purchase-filter";
import {
  PURCHASE_STATUS_LABEL,
  PURCHASE_STATUS_TYPE,
  type PurchaseStatus
} from "~/data/purchase-status";
import {
  TYPE_CAPABILITIES,
  formatAmount,
  formatCurrency,
  deleteTransactions,
  getPurchaseTransactions,
  type PurchaseTransaction,
  type TransactionType
} from "~/data/purchase-transactions";

useHead({ title: "Purchases — Mekari Jurnal" });

// ---------------------------------------------------------------------------
// Cloned from jurnal-frontend-app src/pages/purchases/{index,list}.vue.
// This is a UI-only prototype: no backend, no approval workflow, no Mekari
// Pay integration, no Mixpanel — those are business-logic concerns of the
// real app. What's ported is the *shape* of the screen: the 9 transaction
// tabs, the per-tab column set (setTableHeads()), the per-tab status
// quick-filter options (status_options), summary boxes, filter bar, bulk
// bar, and pagination — built per docs/index-page-pattern.md.
// ---------------------------------------------------------------------------

type TabKey = "pi" | "jpi" | "pd" | "po" | "pq" | "pr" | "ap" | "rj" | "fi";

const TABS: { key: TabKey; label: string }[] = [
  { key: "pi", label: "Invoice" },
  { key: "jpi", label: "Join invoice" },
  { key: "pd", label: "Delivery" },
  { key: "po", label: "Order" },
  { key: "pq", label: "Quote" },
  { key: "pr", label: "Request" },
  { key: "ap", label: "Need approval" },
  { key: "rj", label: "Rejected" },
  { key: "fi", label: "Financing" }
];

// Labels + order match the real product's "Create new purchase" popover
// (Purchase invoice / Join invoice / Purchase order / Purchase quote /
// Purchase request — no "Delivery" entry there, a delivery is created from
// an existing order instead).
const NEW_TRANSACTION_ITEMS: { key: TransactionType; label: string }[] = [
  { key: "invoice", label: "Purchase invoice" },
  { key: "join_invoice", label: "Join invoice" },
  { key: "order", label: "Purchase order" },
  { key: "quote", label: "Purchase quote" },
  { key: "request", label: "Purchase request" }
];

// Status vocabulary + the Invoice tab's mock data now live in app/data/ so the
// detail page (app/pages/purchase/invoice/[id].vue) can share the exact same
// records — clicking an invoice row opens a detail page with matching data.
type StatusValue = PurchaseStatus;
const STATUS_LABEL = PURCHASE_STATUS_LABEL;
const STATUS_TYPE = PURCHASE_STATUS_TYPE;

// Status quick-filter options per tab — mirrors the source page's
// `status_options` getter (a switch on `active_tab.key`). Tabs absent from
// that switch (jpi, ap, rj, fi) get no quick-filter select.
const STATUS_OPTIONS_BY_TAB: Record<TabKey, StatusValue[]> = {
  pi: ["open", "overdue", "paid", "partial", "unpaid"],
  jpi: [],
  pd: ["open", "closed"],
  po: ["open", "partially_sent", "closed"],
  pq: ["open", "closed"],
  pr: ["open", "partial", "closed"],
  ap: [],
  rj: [],
  fi: []
};

type ColumnKey =
  | "transactionDate"
  | "number"
  | "vendor"
  | "procurementStaff"
  | "dueDate"
  | "status"
  | "depositAmount"
  | "balanceDue"
  | "totalAmount"
  | "totalItems"
  | "urgency"
  | "tags";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  numeric?: boolean;
}

// Per-tab column sets — mirrors the source page's setTableHeads(), which
// starts from a shared base (`heads`) and flips a handful of `show` flags
// per tab.
const COLUMNS_BY_TAB: Record<TabKey, ColumnDef[]> = {
  pi: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "vendor", label: "Vendor" },
    { key: "dueDate", label: "Due date" },
    { key: "status", label: "Status" },
    { key: "balanceDue", label: "Balance due", numeric: true },
    { key: "totalAmount", label: "Total", numeric: true },
    { key: "tags", label: "Tags" }
  ],
  jpi: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "vendor", label: "Vendor" },
    { key: "dueDate", label: "Due date" },
    { key: "status", label: "Status" },
    { key: "balanceDue", label: "Balance due", numeric: true },
    { key: "totalAmount", label: "Total", numeric: true }
  ],
  pd: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "vendor", label: "Vendor" },
    { key: "status", label: "Status" },
    { key: "tags", label: "Tags" }
  ],
  po: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "vendor", label: "Vendor" },
    { key: "dueDate", label: "Due date" },
    { key: "status", label: "Status" },
    { key: "depositAmount", label: "Deposit", numeric: true },
    { key: "totalAmount", label: "Total", numeric: true },
    { key: "tags", label: "Tags" }
  ],
  pq: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "vendor", label: "Vendor" },
    { key: "status", label: "Status" },
    { key: "totalAmount", label: "Total", numeric: true },
    { key: "tags", label: "Tags" }
  ],
  pr: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "procurementStaff", label: "Procurement staff" },
    { key: "dueDate", label: "Due date" },
    { key: "status", label: "Status" },
    { key: "totalItems", label: "Total items" },
    { key: "urgency", label: "Urgency" },
    { key: "tags", label: "Tags" }
  ],
  ap: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "vendor", label: "Vendor" },
    { key: "dueDate", label: "Expiry date" },
    { key: "status", label: "Status" },
    { key: "totalAmount", label: "Total", numeric: true },
    { key: "tags", label: "Tags" }
  ],
  rj: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "vendor", label: "Vendor" },
    { key: "dueDate", label: "Due date" },
    { key: "status", label: "Status" },
    { key: "totalAmount", label: "Total", numeric: true },
    { key: "tags", label: "Tags" }
  ],
  fi: [
    { key: "transactionDate", label: "Date" },
    { key: "number", label: "Number" },
    { key: "vendor", label: "Vendor" },
    { key: "dueDate", label: "Due date" },
    { key: "status", label: "Status" },
    { key: "totalAmount", label: "Total", numeric: true },
    { key: "tags", label: "Tags" }
  ]
};

interface Row {
  id: number;
  /** The record's own type, so a row in a cross-cutting tab (Need approval /
   *  Rejected — which mix types) still knows which detail route it belongs to. */
  type: TransactionType;
  transactionDate: string;
  transactionDateSort: string;
  number: string;
  memo: string;
  vendor: string;
  procurementStaff: string;
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
  totalItems: number;
  urgency: { priority: "high" | "medium" | "low"; label: string } | null;
  tags: string[];
}

// ---- Shared dataset → per-tab rows --------------------------------------
//
// app/data/purchase-transactions.ts holds ONE array spanning all 7 real
// transaction types. The 7 type tabs and the 2 cross-cutting tabs (Need
// approval, Rejected) are all just filtered views over it — see that
// module's doc comment for why (in short: so a duplicated/reset record has
// exactly one place to reappear, instead of a fake per-tab list it can never
// leave).

// Which TABS entries are a straight `type` filter; "ap"/"rj" have no direct
// type (they cut across every type instead — see rowsForTab).
const TAB_TYPE: Partial<Record<TabKey, TransactionType>> = {
  pi: "invoice",
  jpi: "join_invoice",
  pd: "delivery",
  po: "order",
  pq: "quote",
  pr: "request",
  fi: "financing"
};

function toRow(t: PurchaseTransaction): Row {
  return {
    id: t.id,
    type: t.type,
    transactionDate: t.transactionDate,
    transactionDateSort: t.transactionDateSort,
    number: t.number,
    memo: t.memo,
    vendor: t.vendorName,
    procurementStaff: t.procurementStaff,
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
    totalItems: t.lines.length,
    urgency: t.urgency,
    tags: t.tags
  };
}

function rowsForTab(tab: TabKey): Row[] {
  const all = getPurchaseTransactions();
  if (tab === "ap") {
    return all.filter((t) => t.needsApproval && t.status !== "rejected").map(toRow);
  }
  if (tab === "rj") {
    return all.filter((t) => t.status === "rejected").map(toRow);
  }
  const type = TAB_TYPE[tab];
  // A record that's pending approval or rejected lives only in its
  // cross-cutting tab, not also under its own type — see the module doc
  // comment on rowsForTab above.
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
const filter = ref<PurchaseFilter>(emptyPurchaseFilter());
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
const showPrintModal = ref(false);
const showDeleteModal = ref(false);
const pendingDeleteIds = ref<number[]>([]);
// The shared dataset (app/data/purchase-transactions.ts) is a plain
// (non-reactive) array — bumping this after a mutation (delete/duplicate) is
// what makes filteredRows/summary/approvalCount re-read it.
const refreshTick = ref(0);

const searchTerm = computed(() => (search.value ?? "").trim());

// Switching tabs resets page/selection/sort/status, same as the source
// page's `@Watch('active_tab')`.
const tableContainerRef = ref<{ $el?: HTMLElement } | HTMLElement | null>(null);
watch(activeTabIndex, () => {
  page.value = 1;
  selected.value = [];
  sortKey.value = null;
  // The source clears the whole filter on tab change, not just the status: the
  // fields differ per tab, so a filter carried across could be narrowing by a
  // control the new tab doesn't even show.
  filter.value = emptyPurchaseFilter();
  // MpTableContainer is the horizontal-scroll element (see scrollShadowClass
  // below) and it's NOT remounted on tab change, so a scroll position left
  // over from the previous tab's (wider or narrower) table otherwise carries
  // straight into the new one — the first column can open scrolled halfway
  // out of view instead of sitting next to the checkbox. Snap it back to the
  // left edge every time the active tab changes.
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
    case "urgency":
      return row.urgency ? row.urgency.priority : "";
    case "tags":
      return row.tags.join(", ");
    default:
      return (row as unknown as Record<string, string | number>)[key] ?? "";
  }
}

function cellText(row: Row, key: ColumnKey): string {
  switch (key) {
    case "vendor":
      return row.vendor;
    case "procurementStaff":
      return row.procurementStaff;
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
    case "totalItems":
      return `${row.totalItems} items`;
    default:
      return "";
  }
}

const filteredRows = computed(() => {
  void refreshTick.value;
  let result = rowsForTab(activeTabKey.value).filter((row) =>
    matchesPurchaseFilter(row, filter.value)
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

// All-time INVOICE figures — deliberately independent of the tab, quick
// filter and search (see the Zone A comment in the template). Recomputed off
// refreshTick because the shared dataset is a plain array.
const summary = computed(() => {
  void refreshTick.value;
  const invoices = getPurchaseTransactions().filter((t) => t.type === "invoice");
  // "Unpaid" is anything still owing, not just status === "unpaid" — an open,
  // partially paid or overdue invoice all still have a balance outstanding.
  const unpaid = invoices.filter((t) => t.balanceDue > 0);
  const overdue = invoices.filter((t) => t.status === "overdue");
  const paid = invoices.filter((t) => t.amountReceived > 0);
  return {
    unpaid: { count: unpaid.length, amount: unpaid.reduce((sum, t) => sum + t.balanceDue, 0) },
    overdue: { count: overdue.length, amount: overdue.reduce((sum, t) => sum + t.balanceDue, 0) },
    payments: { count: paid.length, amount: paid.reduce((sum, t) => sum + t.amountReceived, 0) }
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
  activeTabIndex.value = TABS.findIndex((t) => t.key === "pi");
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
  filter.value = emptyPurchaseFilter();
}

function statusLabelFor(status: string): string {
  return STATUS_LABEL[status as PurchaseStatus] ?? status;
}

function onApplyFilter(next: PurchaseFilter) {
  filter.value = next;
  // Any change to the criteria can shrink the result set below the current
  // page, which would otherwise leave the user staring at an empty page 4.
  page.value = 1;
  selected.value = [];
  isFilterDrawerOpen.value = false;
}

// Route by the ROW's type, not the tab's. "Need approval" and "Rejected" cut
// across every type and so have no type of their own — keying off the tab left
// their rows unclickable, which became easy to hit once Returns started
// appearing there too.
function onOpen(row: Row) {
  const route = TYPE_CAPABILITIES[row.type]?.route;
  if (route) navigateTo(`/purchase/${route}/${row.id}`);
}

// Every type in this menu now has its own create route — see TYPE_CAPABILITIES
// for the route segment each one owns.
function onAction(action: string) {
  void action; // inert in this prototype, same as the detail pages' links
}

function onNewTransaction(key: string) {
  const route = TYPE_CAPABILITIES[key as TransactionType]?.route;
  if (route) navigateTo(`/purchase/${route}/new`);
}

// ---- Delete confirmation (row-level and bulk) ---------------------------

const deleteModalTitle = computed(() => {
  const ids = pendingDeleteIds.value;
  if (ids.length === 1) {
    // ids are globally unique across the whole shared dataset, so this finds
    // the record regardless of which tab it's being deleted from.
    const record = getPurchaseTransactions().find((t) => t.id === ids[0]);
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
// even percentage split — see docs/index-page-pattern.md §9.1. Splitting the
// container width evenly makes every column as narrow as the narrowest one
// needs to be, which clipped "Purchase Invoice #14026" down to "rchase
// Invoice #140". These widths let each column hold its longest realistic
// value; when they don't all fit, MpTableContainer scrolls horizontally
// (that's the intended behaviour — the table is allowed to overflow) instead
// of squeezing the columns.
const COLUMN_WIDTH: Record<ColumnKey, number> = {
  transactionDate: 120,
  number: 230,
  vendor: 180,
  procurementStaff: 180,
  dueDate: 120,
  status: 120,
  // The money columns carry two decimals ("10.016.640,00"), so they need
  // ~30px more than a bare integer would.
  depositAmount: 170,
  balanceDue: 180,
  totalAmount: 180,
  // 110px left only ~62px for the label next to the sort icon — exactly the
  // "Total items" header's natural width, so it wrapped to 2 lines on any
  // subpixel rounding. 130px gives it real breathing room.
  totalItems: 130,
  urgency: 130,
  tags: 140
};
const CHECKBOX_COLUMN_WIDTH = 44;
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
const promoCardClass = css({
  display: "flex",
  alignItems: "center",
  gap: 4,
  bg: "white",
  borderWidth: "sm",
  borderColor: "gray.100",
  rounded: "md",
  px: 5,
  py: 4
});
const promoIconClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "40px",
  height: "40px",
  flexShrink: 0,
  rounded: "full",
  bg: "blue.100"
});
const promoTextClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });
const statsCaptionClass = css({ display: "flex", justifyContent: "flex-end", mt: 2, mb: 4 });
// whiteSpace:nowrap keeps two-word labels ("Join invoice") and the badge
// label ("Need approval 24") on one line — MpTab doesn't reserve enough
// width for its content by default, so without this the text wraps to 2
// lines instead of the tab simply sizing to fit it.
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
// Pure-CSS horizontal scroll affordance. The two `local` white gradients sit
// on the content and scroll away with it; the two `scroll` radial shadows are
// pinned to the container's edges. The result: a soft shadow appears on
// whichever side has more content and disappears once you reach that end — so
// a table that overflows says so, with no ResizeObserver and no JS state.
// Without it the last column just gets clipped at the viewport edge and the
// user has no way to tell there is anything past it.
const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});
const tableFixedClass = css({ tableLayout: "fixed" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
// Money columns are LEFT-aligned on this table, like every other column.
// Right-aligning them looked misaligned rather than tidy: the sortable header
// puts its sort icon after the label, so a right-aligned label stops ~24px
// short of where the right-aligned figures end, and no two edges line up.
// Left alignment makes the header label and the row data share one edge.
const numCellClass = css({ textAlign: "left" });
const checkboxCellClass = css({ width: "44px", pl: "3!", pr: "0!" });
// MpTableCell defaults to white-space:nowrap + overflow:visible, so long text
// (vendor names, memos) spills sideways into the neighbouring cell. Wrap it
// inside the cell instead — never clip: an ellipsis (or worse, a hard clip)
// mid-way through a document number is unreadable, and these columns are sized
// (COLUMN_WIDTH) to fit their content in one line anyway, so wrapping only
// kicks in for the genuinely-long outliers.
//
// The `!` overrides matter here: MpTextlink (the Number column) ships its own
// `display:inline-flex` + `white-space:nowrap`, which both sizes to content and
// centres it. `display:flex!` + `justifyContent` re-anchor the text to the
// cell's edge, and `width:full!` makes it fill the column rather than hug its
// own content — without that pair, a long number renders centred and
// overflowing equally off *both* sides of the cell.
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
// one of the two that is a <button>: MpTextlink's recipe gives it 2px of inline
// padding, so its glyphs sat 2px right of both the description beneath it and
// the "Number" header above — a stagger repeated down every row of every tab.
//
// Cancelled with a negative margin rather than by zeroing the padding, because
// the padding CANNOT be zeroed from here: the Pixel recipe declares it
// `!important` and unlayered, which outranks both a Panda `pl: "0!"` utility
// (layered, so its own `!important` loses) and even an inline style. Both were
// tried and silently did nothing — the class lands on the element and computed
// padding stays 2px. Margin has no competing declaration, so it just works.
// The 2px of padding still does its job of holding the focus ring off the
// glyphs; only the box moves, and it moves into the cell's own 8px padding,
// so nothing overflows.
const linkCellClass = css({ ...wrapCellBase, ml: "-2px", mr: "-2px" });

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
// next to the sort icon, so a wrap only ever meant a column was a few
// pixels too tight (see totalItems below), never a genuinely long label.
const headerLabelClass = css({
  minWidth: "0",
  whiteSpace: "nowrap",
  textAlign: "left"
});

const bulkBarClass = css({ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" });
const bulkCellClass = css({ py: "11px!" });

const skeletonBarClass = css({ display: "block", height: "4", rounded: "sm" });
// Sized to match MpCheckbox's own 18px control rather than stretching full
// width like the other columns' skeleton bars — a full-width bar in a 44px
// cell would render wider than the checkbox it stands in for.
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
