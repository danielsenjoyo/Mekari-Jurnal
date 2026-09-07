<template>
  <DefaultPageContent
    :title="record ? record.number : 'Landed cost not found'"
    breadcrumb="Purchases"
    breadcrumb-to="/purchase"
  >
    <BlankSlate
      v-if="!record"
      title="Landed cost not found"
      description="This landed cost may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/purchase')">Back to Purchases</MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Zone A — which purchase this costs, and the headline total. -->
      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Purchase no.</MpText>
          <MpTextlink
            v-if="purchase"
            as="button"
            variant="primary"
            :class="textlinkCellClass"
            @click="navigateTo(`/purchase/invoice/${purchase.id}`)"
          >
            {{ purchase.number }}
          </MpTextlink>
          <MpText v-else>—</MpText>
        </div>

        <div />

        <div :class="totalColClass">
          <MpText weight="semiBold" color="dark"
            >Total landed cost {{ formatCurrency(record.total) }}</MpText
          >
          <MpTextlink
            :class="textlinkAlignClass"
            as="button"
            variant="secondary"
            @click="onAction('journal-entry')"
            >View journal entry</MpTextlink
          >
        </div>
      </div>

      <MpDivider variant="dashed" :class="dividerClass" />

      <div :class="metaGridClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Created date</MpText>
          <MpText>{{ formatDisplayDate(record.createdDateSort) }}</MpText>
        </div>
        <div :class="metaFieldClass">
          <MpText color="gray.600">
            <span :class="labelWithIconClass">
              Transaction date
              <MpTooltip label="The date of the purchase this cost is calculated against">
                <MpIcon name="info" size="sm" color="gray.600" />
              </MpTooltip>
            </span>
          </MpText>
          <MpText>{{ purchase ? formatDisplayDate(purchase.transactionDateSort) : "—" }}</MpText>
        </div>
        <div :class="metaFieldClass">
          <MpText color="gray.600">Transaction no.</MpText>
          <MpText>{{ record.number }}</MpText>
        </div>
        <div :class="metaFieldClass">
          <MpText color="gray.600">Tag</MpText>
          <MpFlex v-if="record.tags.length" gap="2" flex-wrap="wrap">
            <MpTag v-for="tag in record.tags" :key="tag" variant="gray" size="sm">{{ tag }}</MpTag>
          </MpFlex>
          <MpText v-else>—</MpText>
        </div>
      </div>

      <!-- Zone B — the expenses being spread. -->
      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass">Expenses</MpText>
      <MpTableContainer :class="scrollShadowClass">
        <MpTable :class="expenseTableClass">
          <colgroup>
            <col style="width: 28%" />
            <col style="width: 32%" />
            <col style="width: 20%" />
            <col style="width: 20%" />
          </colgroup>
          <MpTableHead :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">Expense</MpTableCell>
              <MpTableCell as="th">Description</MpTableCell>
              <MpTableCell as="th">Amount</MpTableCell>
              <MpTableCell as="th">Amount used</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="expense in record.expenses" :key="expense.id">
              <MpTableCell as="td" :class="wrapCellClass">{{ expense.expense }}</MpTableCell>
              <MpTableCell as="td" :class="wrapCellClass">{{
                expense.description || "—"
              }}</MpTableCell>
              <MpTableCell as="td">{{ formatCurrency(expense.amount) }}</MpTableCell>
              <MpTableCell as="td">{{ formatCurrency(expense.amountUsed) }}</MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <!-- Zone C — what each product cost once its share is added. This is the
           point of the document: the last two columns are the answer. -->
      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass"
        >Landed cost calculation</MpText
      >
      <MpTableContainer :class="scrollShadowClass">
        <MpTable :class="landedTableClass">
          <colgroup>
            <col style="width: 24%" />
            <col style="width: 8%" />
            <col style="width: 15%" />
            <col style="width: 15%" />
            <col style="width: 13%" />
            <col style="width: 12%" />
            <col style="width: 13%" />
          </colgroup>
          <MpTableHead :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">Product</MpTableCell>
              <MpTableCell as="th">Qty</MpTableCell>
              <MpTableCell as="th">Unit price</MpTableCell>
              <MpTableCell as="th">Amount</MpTableCell>
              <MpTableCell as="th">Landed cost</MpTableCell>
              <MpTableCell as="th">Landed unit price</MpTableCell>
              <MpTableCell as="th">Landed amount</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="(alloc, i) in record.allocations" :key="i">
              <MpTableCell as="td" :class="wrapCellClass">{{ alloc.product }}</MpTableCell>
              <MpTableCell as="td">{{ alloc.quantity }}</MpTableCell>
              <MpTableCell as="td">{{ formatCurrency(alloc.unitPrice) }}</MpTableCell>
              <MpTableCell as="td">{{ formatCurrency(alloc.amount) }}</MpTableCell>
              <MpTableCell as="td">{{ formatCurrency(alloc.allocated) }}</MpTableCell>
              <MpTableCell as="td">{{ formatCurrency(landedUnitPrice(alloc)) }}</MpTableCell>
              <MpTableCell as="td">{{ formatCurrency(landedAmount(alloc)) }}</MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <div :class="bottomActionsClass">
        <MpButton variant="ghost" @click="isDeleteModalOpen = true">Delete</MpButton>
        <MpButton variant="secondary" @click="navigateTo(`/purchase/landed-cost/edit/${record.id}`)"
          >Edit</MpButton
        >
      </div>

      <MpModal :is-open="isDeleteModalOpen" size="sm" @close="isDeleteModalOpen = false">
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>
            <span :class="modalTitleClass">Delete {{ record.number }}?</span>
            <MpModalCloseButton />
          </MpModalHeader>
          <MpModalBody>
            <MpText size="body" color="gray.700">
              The products on {{ purchase?.number ?? "this purchase" }} will go back to their
              original cost. This can't be undone.
            </MpText>
          </MpModalBody>
          <MpModalFooter>
            <div :class="modalFooterClass">
              <MpButton variant="secondary" @click="isDeleteModalOpen = false">Cancel</MpButton>
              <MpButton variant="danger" @click="onDelete">Delete</MpButton>
            </div>
          </MpModalFooter>
        </MpModalContent>
      </MpModal>
    </template>
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  css,
  MpButton,
  MpDivider,
  MpFlex,
  MpIcon,
  MpModal,
  MpModalBody,
  MpModalCloseButton,
  MpModalContent,
  MpModalFooter,
  MpModalHeader,
  MpModalOverlay,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpTag,
  MpText,
  MpTextlink,
  MpTooltip
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import { textlinkAlignClass, textlinkCellClass } from "~/utils/textlink-align";
import {
  deleteLandedCost,
  getLandedCostById,
  landedAmount,
  landedUnitPrice,
  purchaseForLandedCost
} from "~/data/purchase-landed-cost";
import { formatCurrency, formatDisplayDate } from "~/data/purchase-transactions";

// ---------------------------------------------------------------------------
// Landed cost detail. Ported from jurnal-frontend-app
// src/pages/purchases/landed_cost/detail/detail.vue.
//
// Two tables, not one: the expenses being spread, then the purchase's products
// with the share each received. The last two columns of the second table are
// the whole point of the document — what a product actually cost once freight,
// duty and the rest are counted.
// ---------------------------------------------------------------------------

const route = useRoute();
const recordId = computed(() => Number(route.params.id));
const record = computed(() => getLandedCostById(recordId.value));
const purchase = computed(() => (record.value ? purchaseForLandedCost(record.value) : undefined));

const isDeleteModalOpen = ref(false);

useHead({
  title: computed(() => `${record.value?.number ?? "Landed cost not found"} — Mekari Jurnal`)
});

function onAction(action: string) {
  void action; // inert in this prototype, same as the other detail pages
}

function onDelete() {
  isDeleteModalOpen.value = false;
  const purchaseId = record.value?.purchaseId;
  if (record.value) deleteLandedCost(record.value.id);
  navigateTo(purchaseId ? `/purchase/invoice/${purchaseId}` : "/purchase");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const topRowClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 6,
  alignItems: "start"
});
const totalColClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 1,
  textAlign: "right"
});
const dividerClass = css({ my: 6 });
const metaGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 6,
  alignItems: "start",
  mb: 8
});
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });
const labelWithIconClass = css({ display: "inline-flex", alignItems: "center", gap: 1 });
const sectionHeadingClass = css({ fontSize: "lg", mb: 4, mt: 8, display: "block" });

const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const expenseTableClass = css({ tableLayout: "fixed", width: "full", minWidth: "760px" });
const landedTableClass = css({ tableLayout: "fixed", width: "full", minWidth: "1100px" });
// On a <td>: wrapping only. NEVER set `display` here — see
// docs/patterns/details-page-format.md.
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });

const bottomActionsClass = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 2,
  mt: 8,
  pt: 5,
  borderTopWidth: "sm",
  borderColor: "gray.100"
});

const modalTitleClass = css({ fontSize: "lg" });
const modalFooterClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
</script>
