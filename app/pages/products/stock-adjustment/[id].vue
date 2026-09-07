<template>
  <DefaultPageContent
    :title="record ? record.number : 'Stock adjustment not found'"
    :breadcrumb="isPending ? 'Require approval' : 'Stock adjustment list'"
    :breadcrumb-to="
      isPending ? '/products?tab=product_index_approval' : '/products?tab=stock_adjustments'
    "
  >
    <template v-if="isPending" #title-badge>
      <MpBadge for="tableStatus" type="warning">Awaiting approval</MpBadge>
    </template>

    <template v-if="record && !isPending" #actions>
      <MpTooltip label="Previous adjustment">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-left"
          aria-label="Previous adjustment"
          :is-disabled="!adjacent.prevId"
          @click="goTo(adjacent.prevId)"
        />
      </MpTooltip>
      <MpTooltip label="Next adjustment">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-right"
          aria-label="Next adjustment"
          :is-disabled="!adjacent.nextId"
          @click="goTo(adjacent.nextId)"
        />
      </MpTooltip>
    </template>

    <BlankSlate
      v-if="!record"
      title="Stock adjustment not found"
      description="This transaction may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/products?tab=stock_adjustments')">
        Back to Stock adjustment list
      </MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Zone A. The headline is what the adjustment is worth — the figure the
           journal entry carries, and the one an approver is deciding on. -->
      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Adjustment type</MpText>
          <MpText>{{ typeLabel }}</MpText>
        </div>

        <div :class="metaFieldClass">
          <MpText color="gray.600">Warehouse</MpText>
          <MpText>{{ record.warehouse || "—" }}</MpText>
        </div>

        <div :class="headlineColClass">
          <MpText weight="semiBold" color="dark">
            Adjustment value {{ formatCurrency(totalValue) }}
          </MpText>
          <MpTextlink
            :class="textlinkAlignClass"
            as="button"
            variant="secondary"
            @click="onAction('journal-entry')"
          >
            View journal entry
          </MpTextlink>
        </div>
      </div>

      <MpDivider variant="dashed" :class="dividerClass" />

      <div :class="metaGridClass">
        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Date</MpText>
            <MpText>{{ formatDisplayDate(record.date) }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Adjustment category</MpText>
            <MpText>{{ record.category || "—" }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Account</MpText>
            <MpText>{{ record.account || "—" }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Tags</MpText>
            <MpFlex v-if="record.tags.length" gap="2" flex-wrap="wrap">
              <MpTag
                v-for="tag in record.tags"
                :key="tag"
                variant="gray"
                size="sm"
                :class="wrapInlineClass"
              >
                {{ tag }}
              </MpTag>
            </MpFlex>
            <MpText v-else>—</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Memo</MpText>
            <MpText :class="wrapValueClass">{{ record.memo || "—" }}</MpText>
          </div>
        </div>
      </div>

      <!-- Zone D — the lines. Difference is derived from the two columns
           beside it, so a reader can check the arithmetic on screen. -->
      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass">Adjusted products</MpText>
      <MpTableContainer :class="scrollShadowClass">
        <MpTable :class="lineTableClass">
          <MpTableHead is-fixed :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">Product name</MpTableCell>
              <MpTableCell as="th">Product code</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Recorded quantity</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Actual quantity</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Difference</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Value</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="line in record.lines" :key="line.productId">
              <MpTableCell as="td" :class="wrapCellClass">
                <MpTextlink
                  :class="textlinkCellClass"
                  as="button"
                  variant="primary"
                  @click="navigateTo(`/products/detail/${line.productId}`)"
                >
                  {{ line.name }}
                </MpTextlink>
              </MpTableCell>
              <MpTableCell as="td" :class="wrapCellClass">{{ line.code }}</MpTableCell>
              <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                {{ formatQuantity(line.recorded) }} {{ line.unit }}
              </MpTableCell>
              <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                {{ formatQuantity(line.actual) }} {{ line.unit }}
              </MpTableCell>
              <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                {{ signed(adjustmentDifference(line)) }} {{ line.unit }}
              </MpTableCell>
              <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                {{ formatAmount(adjustmentValue(line)) }}
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <div :class="totalsRowClass">
        <div :class="totalsColClass">
          <div :class="totalsLineClass">
            <MpText weight="semiBold" color="dark">Total adjustment value</MpText>
            <MpText weight="semiBold" color="dark">{{ formatCurrency(totalValue) }}</MpText>
          </div>
        </div>
      </div>

      <!-- A pending record is reviewed, not edited: the bar offers the one
           decision the queue exists for. -->
      <div :class="bottomActionsClass">
        <template v-if="isPending">
          <div />
          <MpButton variant="primary" @click="isApproveModalOpen = true">Approve</MpButton>
        </template>
        <template v-else>
          <MpButton variant="ghost" @click="isDeleteModalOpen = true">Delete</MpButton>
          <MpButton
            variant="secondary"
            @click="navigateTo(`/products/stock-adjustment/edit/${record.id}`)"
          >
            Edit
          </MpButton>
        </template>
      </div>

      <MpModal
        id="adjustment-delete-modal"
        :is-open="isDeleteModalOpen"
        size="sm"
        @close="isDeleteModalOpen = false"
      >
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>
            <span :class="modalTitleClass">Delete stock adjustment?</span>
            <MpModalCloseButton />
          </MpModalHeader>
          <MpModalBody>
            <MpText size="body" color="gray.700">
              By deleting stock adjustment transaction:
            </MpText>
            <ul :class="bulletListClass">
              <li>
                <MpText size="body" color="gray.700">Data in journal entry will be deleted.</MpText>
              </li>
              <li>
                <MpText size="body" color="gray.700">
                  This transaction will be deleted and cannot be recovered.
                </MpText>
              </li>
              <li>
                <MpText size="body" color="gray.700">
                  Recalculation can happen and it may affect Cost of Goods Sold (COGS) and product
                  stock quantity.
                </MpText>
              </li>
            </ul>
          </MpModalBody>
          <MpModalFooter>
            <div :class="modalFooterClass">
              <MpButton variant="secondary" @click="isDeleteModalOpen = false">Cancel</MpButton>
              <MpButton variant="danger" @click="confirmDelete">Delete</MpButton>
            </div>
          </MpModalFooter>
        </MpModalContent>
      </MpModal>

      <MpModal
        id="adjustment-approve-modal"
        :is-open="isApproveModalOpen"
        size="sm"
        @close="isApproveModalOpen = false"
      >
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>
            <span :class="modalTitleClass">Approve {{ record.number }}?</span>
            <MpModalCloseButton />
          </MpModalHeader>
          <MpModalBody>
            <MpText size="body" color="gray.700">
              The approved transaction will move to the stock adjustment list.
            </MpText>
          </MpModalBody>
          <MpModalFooter>
            <div :class="modalFooterClass">
              <MpButton variant="secondary" @click="isApproveModalOpen = false">Cancel</MpButton>
              <MpButton variant="primary" @click="confirmApprove">Approve</MpButton>
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
  MpBadge,
  MpButton,
  MpDivider,
  MpFlex,
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
import {
  ADJUSTMENT_TYPE_LABEL,
  APPROVAL_TYPE_LABEL,
  adjustmentDifference,
  adjustmentTotalValue,
  adjustmentValue,
  approveProductTransactions,
  deleteProductRecords,
  formatAmount,
  formatCurrency,
  formatDisplayDate,
  formatQuantity,
  getAdjacentStockAdjustmentIds,
  getProductApprovalById,
  getStockAdjustmentById
} from "~/data/products";
import { textlinkAlignClass, textlinkCellClass } from "~/utils/textlink-align";

// ---------------------------------------------------------------------------
// Stock adjustment detail. Cloned from jurnal-frontend-app
// src/pages/stock-adjustments/detail/index.vue.
//
// **One page, two lists.** An adjustment waiting for approval is the same
// record with the same fields — it just lives in the approval queue until
// someone signs it off. So this page looks the id up in the adjustment list
// first and the queue second, and swaps its badge, breadcrumb and bottom bar
// accordingly. A separate near-identical page for the pending case would drift
// from this one the first time either changed.
// ---------------------------------------------------------------------------

const route = useRoute();
const recordId = computed(() => Number(route.params.id));

const refreshTick = ref(0);
const approved = computed(() => {
  void refreshTick.value;
  return getStockAdjustmentById(recordId.value);
});
const pending = computed(() => {
  void refreshTick.value;
  return getProductApprovalById(recordId.value);
});

const isPending = computed(() => !approved.value && Boolean(pending.value));

/** The two record shapes differ only in which type vocabulary they use, so the
 *  template reads one normalised object rather than branching in every cell. */
const record = computed(() => {
  if (approved.value) return approved.value;
  if (!pending.value) return undefined;
  return pending.value;
});

const typeLabel = computed(() => {
  if (approved.value) return ADJUSTMENT_TYPE_LABEL[approved.value.adjustmentType];
  if (pending.value) return APPROVAL_TYPE_LABEL[pending.value.transactionType];
  return "";
});

useHead({
  title: computed(() =>
    record.value
      ? `${record.value.number} — Mekari Jurnal`
      : "Stock adjustment not found — Mekari Jurnal"
  )
});

const adjacent = computed(() => getAdjacentStockAdjustmentIds(recordId.value));
const totalValue = computed(() => adjustmentTotalValue(record.value?.lines ?? []));

const isDeleteModalOpen = ref(false);
const isApproveModalOpen = ref(false);

function goTo(id: number | null) {
  if (id) navigateTo(`/products/stock-adjustment/${id}`);
}

/** Signed explicitly — a colour alone doesn't separate a stock-in from a
 *  stock-out for anyone who can't tell the two hues apart. */
function signed(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatQuantity(Math.abs(value))}`;
}

function confirmDelete() {
  if (!record.value) return;
  deleteProductRecords("stock_adjustments", [record.value.id]);
  isDeleteModalOpen.value = false;
  navigateTo("/products?tab=stock_adjustments");
}

function confirmApprove() {
  if (!record.value) return;
  approveProductTransactions([record.value.id]);
  isApproveModalOpen.value = false;
  refreshTick.value++;
  // The record has moved lists, so the page it is now on is the approved one.
  navigateTo(`/products/stock-adjustment/${recordId.value}`);
}

function onAction(action: string) {
  void action;
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const topRowClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 6,
  alignItems: "start"
});
const headlineColClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 1,
  textAlign: "right"
});
const dividerClass = css({ my: 6 });
const sectionHeadingClass = css({ fontSize: "lg", mt: 8, mb: 4 });
const metaGridClass = css({ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 });
const metaColClass = css({ display: "flex", flexDirection: "column", gap: 4 });
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });
const wrapValueClass = css({ whiteSpace: "normal", wordBreak: "break-word" });

const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const lineTableClass = css({ tableLayout: "auto", width: "full", minWidth: "880px" });
const numCellClass = css({ textAlign: "right" });
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
const wrapInlineClass = css({
  whiteSpace: "normal!",
  wordBreak: "break-word",
  maxWidth: "full",
  display: "inline-block",
  textAlign: "left"
});
const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});

const totalsRowClass = css({ display: "flex", justifyContent: "flex-end", mt: 6 });
const totalsColClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  width: "40%",
  minWidth: "280px"
});
const totalsLineClass = css({ display: "flex", justifyContent: "space-between", gap: 3 });

const bulletListClass = css({ pl: 5, mt: 2, listStyleType: "disc" });

const modalTitleClass = css({ fontSize: "lg" });
const modalFooterClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });

const bottomActionsClass = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  mt: 8,
  pt: 6,
  borderTopWidth: "sm",
  borderColor: "gray.100"
});
</script>
