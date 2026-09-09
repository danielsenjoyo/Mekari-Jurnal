<template>
  <DefaultPageContent
    title="Sales invoice quota usage history"
    breadcrumb="Sales"
    breadcrumb-to="/sales"
  >
    <template #actions>
      <MpButton variant="primary" @click="isAddQuotaModalOpen = true">Add quota</MpButton>
    </template>

    <!-- Zone A — the month's allowance, what it has spent, and what is left.
         All three are derived from the rows below (see getQuotaSummary), so the
         strip can never disagree with the history it summarises. -->
    <div :class="statsGridClass">
      <SummaryBox
        variant="blue"
        label="Total quota of this month"
        caption="Invoices"
        :amount="String(summary.total)"
        is-hoverable
      />
      <SummaryBox
        variant="orange"
        label="Quota used this month"
        caption="Invoices"
        :amount="String(summary.used)"
        is-hoverable
      />
      <SummaryBox
        variant="green"
        label="Remaining quota of this month"
        caption="Invoices"
        :amount="String(summary.remaining)"
        is-hoverable
      />
    </div>
    <div :class="statsCaptionClass">
      <MpFlex align-items="center" gap="1">
        <MpText size="body-small" color="gray.600">{{ usageInfo }}</MpText>
        <MpTooltip label="The amount of quota usage will be reset on the 10th of each month.">
          <MpIcon name="info" size="sm" color="gray.600" />
        </MpTooltip>
      </MpFlex>
    </div>

    <!-- Zone C — action filter (left) + search (right), the same filter-bar
         shape the Sales list uses. -->
    <div :class="filterBarClass">
      <div :class="filterLeftClass">
        <div :class="quickFilterClass">
          <MpSelect v-model="actionFilter" is-full-width>
            <option v-for="opt in QUOTA_ACTION_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </MpSelect>
        </div>
      </div>

      <div :class="filterRightClass">
        <div :class="searchGroupClass">
          <MpInputGroup>
            <MpInputLeftAddon>
              <MpIcon name="search" size="sm" color="gray.400" />
            </MpInputLeftAddon>
            <MpInput v-model="search" placeholder="Search usage history" />
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

    <template v-if="filteredRows.length">
      <MpTableContainer>
        <MpTable is-hoverable :class="tableFixedClass">
          <colgroup>
            <col style="width: 16%" />
            <col style="width: 24%" />
            <col style="width: 24%" />
            <col style="width: 20%" />
            <col style="width: 16%" />
          </colgroup>
          <MpTableHead is-fixed :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">Usage date</MpTableCell>
              <MpTableCell as="th">Actions</MpTableCell>
              <MpTableCell as="th">Transaction number</MpTableCell>
              <MpTableCell as="th">User</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Quota usage</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="row in pagedRows" :key="row.id">
              <MpTableCell as="td">{{ row.usageDate }}</MpTableCell>
              <MpTableCell as="td">{{ QUOTA_ACTION_LABEL[row.action] }}</MpTableCell>
              <MpTableCell as="td">
                <!-- Only a row whose invoice still exists can link anywhere; a
                     deleted one keeps its number as plain text. -->
                <MpTextlink
                  v-if="row.transactionId != null"
                  as="button"
                  variant="primary"
                  :class="textlinkCellClass"
                  @click="navigateTo(`/sales/invoice/${row.transactionId}`)"
                  >{{ row.transactionNo }}</MpTextlink
                >
                <span v-else :class="wrapCellClass">{{ row.transactionNo }}</span>
              </MpTableCell>
              <MpTableCell as="td">{{ row.user }}</MpTableCell>
              <MpTableCell as="td" :class="numCellClass">{{
                formatQuotaChange(row.quotaChange)
              }}</MpTableCell>
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

    <!-- A history that has simply never had a row is not a failed search, and
         must not borrow the magnifier illustration to say so. -->
    <BlankSlate
      v-else
      :variant="hasQuery ? 'not-found' : 'no-data'"
      :title="hasQuery ? 'Transaction not found' : 'No usage history yet'"
      :description="
        hasQuery
          ? 'Recheck the keywords you have typed and try searching again.'
          : 'Your list of sales invoice quota usage history will appear here.'
      "
    >
      <MpButton v-if="hasQuery" variant="secondary" @click="resetFilters">Clear filters</MpButton>
    </BlankSlate>

    <!-- Add quota — a focused dialog, not a confirm: it takes an amount, so it
         needs a field (docs/patterns/Modal.md). -->
    <MpModal :is-open="isAddQuotaModalOpen" size="sm" @close="isAddQuotaModalOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          <span :class="modalTitleClass">Add quota</span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpFormControl :is-invalid="addQuotaInvalid">
            <MpFormLabel>Number of invoices</MpFormLabel>
            <MpInput v-model.number="addQuotaAmount" type="number" min="1" is-full-width />
            <MpFormHelpText>
              Added on top of this month's allowance of {{ summary.total }}.
            </MpFormHelpText>
            <MpFormErrorMessage>Enter how many invoices to add.</MpFormErrorMessage>
          </MpFormControl>
        </MpModalBody>
        <MpModalFooter>
          <div :class="modalFooterClass">
            <MpButton variant="secondary" @click="isAddQuotaModalOpen = false">Cancel</MpButton>
            <MpButton variant="primary" @click="confirmAddQuota">Add quota</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  css,
  MpButton,
  MpFlex,
  MpFormControl,
  MpFormErrorMessage,
  MpFormHelpText,
  MpFormLabel,
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
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpText,
  MpTextlink,
  MpTooltip
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import SummaryBox from "~/components/template/SummaryBox.vue";
import { textlinkCellClass } from "~/utils/textlink-align";
import {
  QUOTA_ACTION_LABEL,
  QUOTA_ACTION_OPTIONS,
  addQuota,
  getQuotaHistory,
  getQuotaSummary,
  type QuotaAction
} from "~/data/sales-quota";

useHead({ title: "Sales invoice quota usage history — Mekari Jurnal" });

// ---------------------------------------------------------------------------
// Cloned from jurnal-frontend-app src/pages/sales/quota_history/. A tenant gets
// a monthly allowance of sales invoices (FUP); this page accounts for it — the
// three figures at the top, then every movement that produced them.
//
// Column set, filter options, empty/blank copy and the reset tooltip all come
// straight from that page's own i18n.
// ---------------------------------------------------------------------------

// The shared history is a plain (non-reactive) array — bumping this after a
// top-up is what makes the summary and rows re-read it.
const refreshTick = ref(0);
const summary = computed(() => {
  void refreshTick.value;
  return getQuotaSummary();
});

const search = ref("");
const actionFilter = ref<QuotaAction | "">("");
const page = ref(1);
const perPage = ref(25);
const isAddQuotaModalOpen = ref(false);
const addQuotaAmount = ref(50);
const addQuotaSubmitted = ref(false);

const searchTerm = computed(() => search.value.trim());
const hasQuery = computed(() => Boolean(searchTerm.value || actionFilter.value));

const usageInfo = computed(
  () => `Total quota used in September 2026 is ${summary.value.used} of ${summary.value.total}`
);

const filteredRows = computed(() => {
  void refreshTick.value;
  const term = searchTerm.value.toLowerCase();
  return getQuotaHistory().filter((row) => {
    if (actionFilter.value && row.action !== actionFilter.value) return false;
    if (!term) return true;
    return (
      row.transactionNo.toLowerCase().includes(term) ||
      row.user.toLowerCase().includes(term) ||
      QUOTA_ACTION_LABEL[row.action].toLowerCase().includes(term)
    );
  });
});

const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / perPage.value)));
const pagedRows = computed(() => {
  const start = (page.value - 1) * perPage.value;
  return filteredRows.value.slice(start, start + perPage.value);
});
const rangeStart = computed(() =>
  filteredRows.value.length === 0 ? 0 : (page.value - 1) * perPage.value + 1
);
const rangeEnd = computed(() => Math.min(page.value * perPage.value, filteredRows.value.length));

// Narrowing the criteria can shrink the result set below the current page,
// which would otherwise leave the user staring at an empty page 3.
watch([searchTerm, actionFilter], () => {
  page.value = 1;
});
watch([page, pageCount], () => {
  if (page.value < 1) page.value = 1;
  else if (page.value > pageCount.value) page.value = pageCount.value;
});

function setPerPage(n: number) {
  perPage.value = n;
  page.value = 1;
}

function resetFilters() {
  search.value = "";
  actionFilter.value = "";
}

/** Signed, because the column mixes spending and returning quota — "-12" and
 *  "+50" in one column only read correctly if both carry their sign. */
function formatQuotaChange(change: number): string {
  if (change === 0) return "—";
  return change > 0 ? `+${change}` : String(change);
}

const addQuotaInvalid = computed(
  () => addQuotaSubmitted.value && (!addQuotaAmount.value || addQuotaAmount.value <= 0)
);

function confirmAddQuota() {
  addQuotaSubmitted.value = true;
  // The commit button stays enabled and refuses instead, so the error message
  // is reachable (docs/patterns/form-page-format.md, Validation).
  if (addQuotaInvalid.value || !addQuotaAmount.value) return;
  addQuota(addQuotaAmount.value);
  refreshTick.value++;
  addQuotaSubmitted.value = false;
  isAddQuotaModalOpen.value = false;
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const statsGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 4
});
const statsCaptionClass = css({ display: "flex", justifyContent: "flex-end", mt: 2, mb: 4 });

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
const quickFilterClass = css({ width: "220px" });
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

const tableFixedClass = css({ tableLayout: "fixed", width: "full", minWidth: "860px" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });

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

const modalTitleClass = css({ fontSize: "lg" });
const modalFooterClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
</script>
