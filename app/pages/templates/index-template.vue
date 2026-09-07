<template>
  <DefaultPageContent title="Page title">
    <template #actions>
      <!-- Secondary action as a dropdown button (secondary + caret + menu). -->
      <MpPopover placement="bottom-end" use-portal is-adaptive-width>
        <template #default>
          <MpPopoverTrigger>
            <MpButton variant="secondary" right-icon="caret-down">Secondary action</MpButton>
          </MpPopoverTrigger>
          <MpPopoverContent>
            <MpPopoverList>
              <MpPopoverListItem role="menuitem">Menu item one</MpPopoverListItem>
              <MpPopoverListItem role="menuitem">Menu item two</MpPopoverListItem>
              <MpPopoverListItem role="menuitem">Menu item three</MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </template>
      </MpPopover>
      <MpButton variant="primary">Primary action</MpButton>
    </template>

    <!-- Page-level tabs under the title (placeholder content). -->
    <template #tabs>
      <MpTabs v-model="activePageTab" variant-color="blue">
        <MpTabList>
          <MpTab v-for="t in pageTabs" :key="t">{{ t }}</MpTab>
        </MpTabList>
      </MpTabs>
    </template>

    <!-- Zone 3a — Summary boxes (OPTIONAL). Official Mekari "summary box"
         pattern (see SummaryBox.vue). Omit on pages with no KPI strip. -->
    <div :class="statsGridClass">
      <!-- Variant 1 — Filter affordance: count badge + filter icon that reveals
           on card hover (with tooltip) in the bottom band. -->
      <SummaryBox variant="red" label="Summary one" :badge="12" amount="1,250,000" is-filter />

      <!-- Variant 2 — Top-band icon: an icon + tooltip in the top-right of the
           tinted band (no count badge). -->
      <SummaryBox variant="orange" label="Summary two" amount="680,000">
        <template #top-right-content>
          <MpTooltip label="Label" placement="bottom">
            <MpIcon name="doc" size="sm" color="gray.400" />
          </MpTooltip>
        </template>
      </SummaryBox>

      <!-- Variant 3 — Single action button in the bottom band. -->
      <SummaryBox variant="gray" label="Summary three" amount="3,400,000">
        <template #bottom-right-content>
          <MpButton variant="secondary" size="sm">Action</MpButton>
        </template>
      </SummaryBox>

      <!-- Variant 4 — Text link + action button in the bottom band. -->
      <SummaryBox variant="gray" label="Summary four" amount="256,000">
        <template #bottom-right-content>
          <div :class="summaryActionsClass">
            <MpTextlink as="button" variant="secondary">Text link</MpTextlink>
            <MpButton variant="secondary" size="sm">Action</MpButton>
          </div>
        </template>
      </SummaryBox>
    </div>
    <div :class="statsCaptionClass">
      <MpText size="body-small" color="gray.600">Optional caption text</MpText>
    </div>

    <!-- Zone 3a.1 — Tabs (index-based selection; count badge inside the slot). -->
    <MpTabs v-model="activeTab" variant-color="blue">
      <MpTabList>
        <MpTab v-for="tab in tabs" :key="tab.label">
          <span :class="tabLabelClass">
            {{ tab.label }}
            <MpBadge v-if="tab.count" for="additionalInformation" type="announcement">
              {{ tab.count }}
            </MpBadge>
          </span>
        </MpTab>
      </MpTabList>
    </MpTabs>

    <!-- Zone 3b — Filter bar. Left: quick-filter selects. Right: Filter button
         (opens the full filter drawer) + search. -->
    <div :class="filterBarClass">
      <div :class="filterLeftClass">
        <!-- Quick-filter dropdowns — official Mekari filter-bar pattern uses
             MpSelect (options are native <option> children in this lib version). -->
        <div :class="quickFilterClass">
          <MpSelect
            v-model="filterCategory"
            placeholder="All categories"
            is-full-width
            is-clearable
          >
            <option value="">All categories</option>
            <option v-for="opt in categoryOptions" :key="opt" :value="opt">
              {{ CATEGORY_LABEL[opt] }}
            </option>
          </MpSelect>
        </div>

        <div :class="quickFilterClass">
          <MpSelect v-model="filterStatus" placeholder="All status" is-full-width is-clearable>
            <option value="">All status</option>
            <option v-for="opt in statusOptions" :key="opt" :value="opt">
              {{ STATUS_LABEL[opt] }}
            </option>
          </MpSelect>
        </div>
      </div>

      <div :class="filterRightClass">
        <!-- Opens the full filter drawer (defined below). -->
        <MpButton variant="secondary" left-icon="filter" @click="isFilterDrawerOpen = true">
          Filter
        </MpButton>

        <div :class="searchGroupClass">
          <MpInputGroup>
            <MpInputLeftAddon>
              <MpIcon name="search" size="sm" color="gray.400" />
            </MpInputLeftAddon>
            <MpInput v-model="search" placeholder="Search..." />
          </MpInputGroup>
          <!-- Clear (×): resets the search. Shown only when there's a keyword,
               and revealed only while hovering/focusing the field. -->
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

    <!-- Full filter drawer — opened by the Filter button. Slides in from the
         right; filters apply live (v-model), so Apply just closes it. -->
    <MpDrawer
      :is-open="isFilterDrawerOpen"
      placement="right"
      size="sm"
      @close="isFilterDrawerOpen = false"
    >
      <MpDrawerOverlay />
      <MpDrawerContent>
        <!-- Title + close button live inside the header (flex space-between).
             The header recipe sizes its text at `md` (14px ≈ body); the drawer
             title should read as a title, so bump it to `lg` (16px). -->
        <MpDrawerHeader>
          <span :class="drawerTitleClass">Filter</span>
          <MpDrawerCloseButton />
        </MpDrawerHeader>
        <MpDrawerBody>
          <div :class="filterDrawerFormClass">
            <MpFormControl>
              <MpFormLabel>Category</MpFormLabel>
              <MpSelect
                v-model="filterCategory"
                placeholder="All categories"
                is-full-width
                is-clearable
              >
                <option value="">All categories</option>
                <option v-for="opt in categoryOptions" :key="opt" :value="opt">
                  {{ CATEGORY_LABEL[opt] }}
                </option>
              </MpSelect>
            </MpFormControl>

            <MpFormControl>
              <MpFormLabel>Status</MpFormLabel>
              <MpSelect v-model="filterStatus" placeholder="All status" is-full-width is-clearable>
                <option value="">All status</option>
                <option v-for="opt in statusOptions" :key="opt" :value="opt">
                  {{ STATUS_LABEL[opt] }}
                </option>
              </MpSelect>
            </MpFormControl>

            <MpFormControl>
              <MpFormLabel>Keyword</MpFormLabel>
              <MpInput v-model="search" placeholder="Search..." is-full-width is-clearable />
            </MpFormControl>
          </div>
        </MpDrawerBody>
        <MpDrawerFooter>
          <div :class="filterDrawerFooterClass">
            <MpButton variant="ghost" @click="resetFilters">Reset</MpButton>
            <MpButton variant="primary" @click="isFilterDrawerOpen = false">Apply</MpButton>
          </div>
        </MpDrawerFooter>
      </MpDrawerContent>
    </MpDrawer>

    <!-- Zone 3c–3e: table + pager, OR empty state (empty replaces). -->
    <template v-if="filteredRows.length">
      <MpTableContainer ref="tableContainerRef">
        <MpTable is-hoverable :class="tableFixedClass">
          <!-- Pin column widths so the body never reflows when the header row
               swaps to the bulk-action bar (a single colspan cell). With
               table-layout:fixed these widths are authoritative and
               header-content-independent. Checkbox is a fixed 44px; the rest are
               proportional percentages (fluid with the container). -->
          <colgroup>
            <col v-for="(w, i) in colWidths" :key="i" :style="{ width: w }" />
          </colgroup>
          <MpTableHead is-fixed :class="tableHeadClass">
            <!-- Bulk-action header: replaces the column headers while rows are
                 selected. -->
            <MpTableRow v-if="selected.length">
              <MpTableCell as="th" :class="checkboxCellClass">
                <MpCheckbox
                  :is-checked="allOnPageSelected"
                  :is-indeterminate="someOnPageSelected && !allOnPageSelected"
                  @change="toggleAllOnPage"
                />
              </MpTableCell>
              <MpTableCell as="th" :colspan="columns.length + 1" :class="bulkCellClass">
                <div :class="bulkBarClass">
                  <!-- Match the column-header label style (label.md / semiBold). -->
                  <MpText size="label" weight="semiBold" color="dark">
                    {{ selected.length }} selected
                  </MpText>
                  <!-- Bulk actions: a primary dropdown button + a plain Delete. -->
                  <MpPopover placement="bottom-start" use-portal is-adaptive-width>
                    <template #default>
                      <MpPopoverTrigger>
                        <MpButton variant="primary" size="sm" right-icon="caret-down">
                          Actions
                        </MpButton>
                      </MpPopoverTrigger>
                      <MpPopoverContent>
                        <MpPopoverList>
                          <MpPopoverListItem role="menuitem">Action one</MpPopoverListItem>
                          <MpPopoverListItem role="menuitem">Action two</MpPopoverListItem>
                          <MpPopoverListItem role="menuitem">Action three</MpPopoverListItem>
                        </MpPopoverList>
                      </MpPopoverContent>
                    </template>
                  </MpPopover>
                  <MpButton variant="ghost" size="sm" @click="onBulkDelete">Delete</MpButton>
                </div>
              </MpTableCell>
            </MpTableRow>

            <!-- Default column header row. -->
            <MpTableRow v-else>
              <MpTableCell as="th" :class="checkboxCellClass">
                <MpCheckbox
                  :is-checked="allOnPageSelected"
                  :is-indeterminate="someOnPageSelected && !allOnPageSelected"
                  @change="toggleAllOnPage"
                />
              </MpTableCell>
              <MpTableCell
                v-for="col in columns"
                :key="col.key"
                as="th"
                :class="col.numeric ? numCellClass : undefined"
              >
                <button type="button" :class="sortHeaderClass" @click="toggleSort(col.key)">
                  <span>{{ col.label }}</span>
                  <MpIcon :name="sortIconFor(col.key)" size="sm" color="gray.400" />
                </button>
              </MpTableCell>
              <!-- Actions header: no label; pinned to the right edge. -->
              <MpTableCell
                as="th"
                :class="[actionHeadClass, isTableOverflowing ? actionBorderClass : '']"
              />
            </MpTableRow>
          </MpTableHead>

          <!-- Loading affordance: skeleton rows while `isLoading`. -->
          <MpTableBody v-if="isLoading">
            <MpTableRow v-for="n in 5" :key="`skeleton-${n}`">
              <MpTableCell v-for="col in columns.length + 2" :key="col" as="td">
                <MpSkeleton is-loading>
                  <span :class="skeletonBarClass" />
                </MpSkeleton>
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>

          <MpTableBody v-else>
            <MpTableRow v-for="row in pagedRows" :key="row.id">
              <MpTableCell as="td" :class="checkboxCellClass">
                <MpCheckbox :is-checked="selected.includes(row.id)" @change="toggleRow(row.id)" />
              </MpTableCell>
              <MpTableCell as="td">
                <MpTextlink as="button" variant="primary" @click="onOpen(row)">
                  {{ row.reference }}
                </MpTextlink>
              </MpTableCell>
              <MpTableCell as="td">{{ row.name }}</MpTableCell>
              <MpTableCell as="td">{{ CATEGORY_LABEL[row.category] }}</MpTableCell>
              <MpTableCell as="td">{{ row.date }}</MpTableCell>
              <MpTableCell as="td" :class="numCellClass">{{
                formatNumber(row.amount)
              }}</MpTableCell>
              <MpTableCell as="td">
                <MpBadge for="tableStatus" :type="STATUS_TYPE[row.status]">
                  {{ STATUS_LABEL[row.status] }}
                </MpBadge>
              </MpTableCell>
              <MpTableCell
                as="td"
                :class="[actionCellClass, isTableOverflowing ? actionBorderClass : '']"
              >
                <!-- Row actions → plain popover menu (no icons). -->
                <MpPopover placement="bottom-end" use-portal is-adaptive-width>
                  <template #default>
                    <MpPopoverTrigger>
                      <MpButton variant="secondary" right-icon="caret-down">Actions</MpButton>
                    </MpPopoverTrigger>
                    <MpPopoverContent>
                      <MpPopoverList>
                        <MpPopoverListItem role="menuitem" @click="onAction(row, 'one')">
                          Action one
                        </MpPopoverListItem>
                        <MpPopoverListItem role="menuitem" @click="onAction(row, 'two')">
                          Action two
                        </MpPopoverListItem>
                        <MpPopoverListItem role="menuitem" @click="onAction(row, 'three')">
                          Action three
                        </MpPopoverListItem>
                      </MpPopoverList>
                    </MpPopoverContent>
                  </template>
                </MpPopover>
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <!-- Pagination footer — official Mekari pagination pattern: rows-per-page
           popover + "Showing X-Y of Z" on the left; page-jump autocomplete +
           "of N page" + ghost chevron prev/next (tooltip-wrapped) on the right. -->
      <div :class="paginationClass">
        <div :class="pagerLeftClass">
          <MpText size="body-small" color="gray.600">Rows per page</MpText>
          <MpPopover use-portal is-adaptive-width>
            <MpPopoverTrigger>
              <MpButton variant="ghost" size="sm" right-icon="chevrons-down">
                {{ perPage }}
              </MpButton>
            </MpPopoverTrigger>
            <MpPopoverContent>
              <MpPopoverList>
                <MpPopoverListItem
                  v-for="opt in [5, 10, 25, 50]"
                  :key="opt"
                  :is-active="perPage === opt"
                  @click="setPerPage(opt)"
                >
                  {{ opt }}
                </MpPopoverListItem>
              </MpPopoverList>
            </MpPopoverContent>
          </MpPopover>
          <MpText size="body-small" color="gray.600">
            Showing {{ rangeStart }}-{{ rangeEnd }} of {{ filteredRows.length }}
          </MpText>
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

    <!-- Blank slate — replaces the table entirely when there are no rows.
         Library "search not found" pattern: 3D illustration + title + body
         (no CTA). Copy adapts to search vs. filter vs. genuinely-empty. -->
    <BlankSlate v-else :variant="emptyVariant" :title="emptyTitle" :description="emptyDescription">
    </BlankSlate>
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  css,
  MpAutocomplete,
  MpBadge,
  MpButton,
  MpCheckbox,
  MpDrawer,
  MpDrawerBody,
  MpDrawerCloseButton,
  MpDrawerContent,
  MpDrawerFooter,
  MpDrawerHeader,
  MpDrawerOverlay,
  MpFormControl,
  MpFormLabel,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
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

useHead({ title: "Index template — Mekari Jurnal" });

type Status = "active" | "pending" | "inactive" | "review" | "draft";
type Category = "a" | "b" | "c";
type SortKey = "reference" | "name" | "category" | "date" | "amount" | "status";

interface Row {
  id: number;
  reference: string;
  name: string;
  category: Category;
  date: string;
  amount: number;
  status: Status;
}

// Status → MpBadge `type` (non-deprecated API).
const STATUS_TYPE: Record<
  Status,
  "announcement" | "information" | "warning" | "completed" | "critical"
> = {
  active: "completed",
  pending: "warning",
  inactive: "critical",
  review: "information",
  draft: "announcement"
};

const STATUS_LABEL: Record<Status, string> = {
  active: "Active",
  pending: "Pending",
  inactive: "Inactive",
  review: "Review",
  draft: "Draft"
};

const CATEGORY_LABEL: Record<Category, string> = {
  a: "Category A",
  b: "Category B",
  c: "Category C"
};

const statusOptions = Object.keys(STATUS_LABEL) as Status[];
const categoryOptions = Object.keys(CATEGORY_LABEL) as Category[];

// Column widths for the table's <colgroup>, used with table-layout:fixed so the
// widths are authoritative and the body never reflows when the header swaps to
// the bulk-action bar. The checkbox (44px) and Actions (140px ≈ the ~114px
// Actions button + cell padding) columns are fixed so they hug their content at
// any width; the six middle columns are percentages summing to 100% so they
// absorb all remaining width and the two fixed columns never grow.
const colWidths = ["44px", "18.7%", "14.5%", "17.7%", "17.9%", "16.1%", "15%", "140px"];

const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "reference", label: "Reference" },
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "date", label: "Date" },
  { key: "amount", label: "Amount", numeric: true },
  { key: "status", label: "Status" }
];

// Page-level tabs (under the title) — placeholder content.
const pageTabs = ["Tab one", "Tab two", "Tab three"];

const tabs = [
  { label: "Tab one", count: 0 },
  { label: "Tab two", count: 0 },
  { label: "Tab three", count: 0 },
  { label: "Tab four", count: 3 }
];

const rows: Row[] = [
  {
    id: 1,
    reference: "REF-0001",
    name: "Item one",
    category: "a",
    date: "12 May 2024",
    amount: 12_500_000,
    status: "active"
  },
  {
    id: 2,
    reference: "REF-0002",
    name: "Item two",
    category: "b",
    date: "10 May 2024",
    amount: 4_750_000,
    status: "pending"
  },
  {
    id: 3,
    reference: "REF-0003",
    name: "Item three",
    category: "a",
    date: "08 May 2024",
    amount: 980_000,
    status: "inactive"
  },
  {
    id: 4,
    reference: "REF-0004",
    name: "Item four",
    category: "c",
    date: "05 May 2024",
    amount: 23_100_000,
    status: "review"
  },
  {
    id: 5,
    reference: "REF-0005",
    name: "Item five",
    category: "a",
    date: "02 May 2024",
    amount: 1_650_000,
    status: "draft"
  },
  {
    id: 6,
    reference: "REF-0006",
    name: "Item six",
    category: "b",
    date: "29 Apr 2024",
    amount: 8_200_000,
    status: "active"
  },
  {
    id: 7,
    reference: "REF-0007",
    name: "Item seven",
    category: "a",
    date: "27 Apr 2024",
    amount: 3_300_000,
    status: "pending"
  },
  {
    id: 8,
    reference: "REF-0008",
    name: "Item eight",
    category: "c",
    date: "24 Apr 2024",
    amount: 540_000,
    status: "active"
  },
  {
    id: 9,
    reference: "REF-0009",
    name: "Item nine",
    category: "a",
    date: "21 Apr 2024",
    amount: 15_900_000,
    status: "inactive"
  },
  {
    id: 10,
    reference: "REF-0010",
    name: "Item ten",
    category: "b",
    date: "18 Apr 2024",
    amount: 6_450_000,
    status: "review"
  },
  {
    id: 11,
    reference: "REF-0011",
    name: "Item eleven",
    category: "a",
    date: "15 Apr 2024",
    amount: 2_100_000,
    status: "draft"
  },
  {
    id: 12,
    reference: "REF-0012",
    name: "Item twelve",
    category: "c",
    date: "12 Apr 2024",
    amount: 9_750_000,
    status: "active"
  }
];

const activePageTab = ref(0);
const activeTab = ref(0);
const isFilterDrawerOpen = ref(false);
const search = ref("");
const filterCategory = ref<"" | Category>("");
const filterStatus = ref<"" | Status>("");
const page = ref(1);
const perPage = ref(5);
const selected = ref<number[]>([]);
const sortKey = ref<SortKey | null>(null);
const sortDir = ref<"asc" | "desc">("asc");

// Documented hook — toggle while fetching to surface skeleton rows.
const isLoading = ref(false);

// Normalised search keyword. The native clear (×) emits `undefined` for the
// model value, so coalesce before trimming to keep this a string everywhere.
const searchTerm = computed(() => (search.value ?? "").trim());

const filteredRows = computed(() => {
  const term = searchTerm.value.toLowerCase();
  const result = rows.filter((row) => {
    const matchesTerm =
      !term || row.reference.toLowerCase().includes(term) || row.name.toLowerCase().includes(term);
    const matchesCategory = !filterCategory.value || row.category === filterCategory.value;
    const matchesStatus = !filterStatus.value || row.status === filterStatus.value;
    return matchesTerm && matchesCategory && matchesStatus;
  });

  if (sortKey.value) {
    const key = sortKey.value;
    const dir = sortDir.value === "asc" ? 1 : -1;
    result.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }
  return result;
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

// Row selection (scoped to the current page).
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

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortDir.value = "asc";
  }
  page.value = 1;
}

function sortIconFor(key: SortKey) {
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

// Blank-slate copy adapts to the cause of the empty result: a search keyword,
// a quick filter, or a genuinely empty data source.
/** A list that has simply never had a row is not a failed search, and must
 *  not borrow the magnifier illustration to say so. */
const emptyVariant = computed(() =>
  searchTerm.value || filterCategory.value || filterStatus.value ? "not-found" : "no-data"
);

const emptyTitle = computed(() => {
  if (searchTerm.value) return `"${searchTerm.value}" not found`;
  if (filterCategory.value || filterStatus.value) return "No results found";
  return "No data yet";
});
const emptyDescription = computed(() => {
  if (searchTerm.value) return "Check the keywords you entered and try your search again.";
  if (filterCategory.value || filterStatus.value)
    return "No items match your filters. Try adjusting them, or clear all filters to start over.";
  return "There's nothing here yet.";
});

function resetFilters() {
  filterCategory.value = "";
  filterStatus.value = "";
  search.value = "";
}

function onBulkDelete() {
  // Wire to a confirm dialog + bulk delete in a real screen.
}
function onOpen(row: Row) {
  void row; // navigateTo(`/items/${row.id}`)
}
function onAction(row: Row, action: string) {
  void row;
  void action;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

// Horizontal-overflow detection for the table's scroll container. When the
// columns overflow (table wider than the container), the pinned Actions column
// gets a 2px left divider to separate it from the scrolling content.
const tableContainerRef = ref<{ $el?: HTMLElement } | null>(null);
const isTableOverflowing = ref(false);
let overflowObserver: ResizeObserver | null = null;

function checkTableOverflow() {
  const el = tableContainerRef.value?.$el;
  if (el) isTableOverflowing.value = el.scrollWidth > el.clientWidth + 1;
}

onMounted(() => {
  checkTableOverflow();
  const el = tableContainerRef.value?.$el;
  if (el && typeof ResizeObserver !== "undefined") {
    overflowObserver = new ResizeObserver(checkTableOverflow);
    overflowObserver.observe(el);
  }
  window.addEventListener("resize", checkTableOverflow);
});

onBeforeUnmount(() => {
  overflowObserver?.disconnect();
  window.removeEventListener("resize", checkTableOverflow);
});

// Re-check when the rendered row set changes (table may mount/unmount).
watch(
  () => filteredRows.value.length,
  () => requestAnimationFrame(checkTableOverflow)
);

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const statsGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 4
});

const statsCaptionClass = css({ display: "flex", justifyContent: "flex-end", mt: 2, mb: 4 });

// Bottom-band actions (text link + button) for the SummaryBox action variant.
const summaryActionsClass = css({ display: "flex", alignItems: "center", gap: 3 });

const tabLabelClass = css({ display: "inline-flex", alignItems: "center", gap: 2 });

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

// Search field wrapper hosts its own clear (×) button — the library's native
// is-clearable renders a buggy svg whose click emits `undefined`. The button is
// hidden at rest and fades in on hover/focus (and only when there's a keyword,
// via v-if), pinned to the right edge of the field.
const searchGroupClass = css({
  position: "relative",
  width: "260px",
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
// Quick-filter MpSelect width — keeps each dropdown a consistent, usable size.
const quickFilterClass = css({ width: "180px" });

// Fixed table layout — makes the <colgroup> widths authoritative so the body
// columns don't reflow when the header collapses to the bulk-action bar.
// `minWidth` preserves the table's natural width: on a narrow container the
// MpTableContainer scrolls horizontally (overflow-x:auto) instead of squeezing
// the columns — matching the pre-fix behaviour.
const tableFixedClass = css({ tableLayout: "fixed", minWidth: "800px" });

// Header bottom divider → 1px (default & bulk). The library renders the sticky
// header's bottom border as a 2px box-shadow on <thead>; override it to 1px.
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });

// Actions column pinned to the right edge in any viewport (sticky). Opaque
// backgrounds let the other columns scroll underneath. Header matches the
// gray.25 header band; body cells match the white surface.
const actionHeadClass = css({
  position: "sticky",
  right: "0",
  zIndex: 3,
  bg: "gray.25"
});
// No explicit background: the cell inherits the library's native td background
// (white at rest, gray.50 on row hover), so the pinned column follows the row's
// hover state. The opaque td background still occludes the scrolling columns.
const actionCellClass = css({
  position: "sticky",
  right: "0",
  zIndex: 1
});
// 2px left divider, shown only when the columns overflow horizontally. Drawn as
// an inset shadow so it adds no layout width.
const actionBorderClass = css({ boxShadow: "inset 2px 0 0 0 var(--mp-colors-gray-100)" });

const numCellClass = css({ textAlign: "right" });
// Checkbox column: library spacing is paddingLeft 12px / paddingRight 0.
const checkboxCellClass = css({ width: "44px", pl: "3!", pr: "0!" });

const sortHeaderClass = css({
  display: "inline-flex",
  alignItems: "center",
  gap: 1,
  border: "0",
  bg: "transparent",
  p: 0,
  cursor: "pointer",
  color: "inherit",
  font: "inherit"
});

// Bulk-action bar: left-aligned count + primary "Actions" dropdown + Delete.
const bulkBarClass = css({
  display: "flex",
  alignItems: "center",
  gap: 3,
  flexWrap: "wrap"
});
// Keep the bulk row's height — and bottom-border rendering — identical to the
// default column-header row. The default cell is `py:16 + 20px label = 52px`
// content-box; the sm action button is 30px, so use `py:11px` (11+30+11=52) to
// match exactly. Matching the natural height keeps the border on the same
// sub-pixel line (a hardcoded `height` landed off-grid and looked bolder).
const bulkCellClass = css({ py: "11px!" });

const skeletonBarClass = css({ display: "block", height: "4", rounded: "sm" });

// Blank slate — centred column: 3D illustration, 16px (lg) title, capped-width
// body (no CTA). Matches the library "search not found" pattern.
// Illustration is a 1500×1250 source (6:5) shown at 180px wide.

// Pagination footer — no top border (matches the library pagination pattern).
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
// Page-jump autocomplete — the inner MpInput has an ~88px min-width, so the
// wrapper must be wide enough to contain it (else the input overflows and
// covers the "of N page" text). 100px fits the control + dropdown chevron.
const pageJumpClass = css({ width: "100px" });
const pageJumpInnerClass = css({ h: "7.5" });

// Drawer header title — 16px (lg) semibold; weight is inherited from the header
// recipe, we only override the size up from the recipe's `md` (14px).
const drawerTitleClass = css({ fontSize: "lg" });

// Filter drawer body — stacked form fields (the drawer provides its own width
// and padding via the `size` prop and DrawerBody).
const filterDrawerFormClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 4
});
// Drawer footer — Reset on the left, Apply on the right, full width.
const filterDrawerFooterClass = css({
  display: "flex",
  justifyContent: "space-between",
  gap: 2,
  width: "full"
});
</script>
