<template>
  <DefaultPageContent
    :title="order ? order.number : 'Order not found'"
    breadcrumb="Purchases"
    breadcrumb-to="/purchase"
  >
    <template v-if="order" #title-badge>
      <MpBadge for="tableStatus" :type="PURCHASE_STATUS_TYPE[order.status]">
        {{ PURCHASE_STATUS_LABEL[order.status] }}
      </MpBadge>
    </template>

    <template v-if="order" #actions>
      <MpTooltip label="Previous order">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-left"
          aria-label="Previous order"
          :is-disabled="!adjacent.prevId"
          @click="goTo(adjacent.prevId)"
        />
      </MpTooltip>
      <MpTooltip label="Next order">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-right"
          aria-label="Next order"
          :is-disabled="!adjacent.nextId"
          @click="goTo(adjacent.nextId)"
        />
      </MpTooltip>
    </template>

    <BlankSlate
      v-if="!order"
      title="Order not found"
      description="This order may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/purchase')">Back to Purchases</MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Zone A — vendor / email / balance due (+ a "Fulfillment" tag when a
           Delivery record is linked — see linkedDelivery below). -->
      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Vendor</MpText>
          <MpTextlink
            :class="textlinkAlignClass"
            as="button"
            variant="primary"
            @click="onAction('view-vendor')"
            >{{ order.vendorName }}</MpTextlink
          >
        </div>

        <div :class="metaFieldClass">
          <MpText color="gray.600">Email</MpText>
          <MpFlex v-if="order.email.length" gap="2" flex-wrap="wrap">
            <MpTag
              v-for="email in order.email"
              :key="email"
              variant="gray"
              size="sm"
              :class="wrapInlineClass"
              >{{ email }}</MpTag
            >
          </MpFlex>
          <MpText v-else>—</MpText>
        </div>

        <div :class="balanceColClass">
          <MpText weight="semiBold" color="dark"
            >Balance due {{ formatCurrency(order.balanceDue) }}</MpText
          >
          <MpTag v-if="linkedDelivery" variant="gray" size="sm" :class="fulfillmentTagClass"
            >Fulfillment</MpTag
          >
        </div>
      </div>

      <MpDivider variant="dashed" :class="dividerClass" />

      <!-- Meta grid — vendor address / dates & term / identifiers & tags. -->
      <div :class="metaGridClass">
        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Vendor address</MpText>
            <MpText>{{ order.vendorAddress || "—" }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Transaction date</MpText>
            <MpText>{{ formatDisplayDate(order.transactionDateSort) }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Due date</MpText>
            <MpText>{{ formatDisplayDate(order.dueDateSort) }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Term</MpText>
            <MpText>{{ order.term }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Transaction no.</MpText>
            <MpText>{{ order.number }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Reference no.</MpText>
            <MpText>{{ order.referenceNo || "—" }}</MpText>
          </div>
          <div v-if="order.warehouse" :class="metaFieldClass">
            <MpText color="gray.600">Warehouse</MpText>
            <MpTextlink
              :class="textlinkAlignClass"
              as="button"
              variant="primary"
              @click="onAction('view-warehouse')"
              >{{ order.warehouse }}</MpTextlink
            >
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Tags</MpText>
            <MpFlex v-if="order.tags.length" gap="2" flex-wrap="wrap">
              <MpTag v-for="tag in order.tags" :key="tag" variant="gray" size="sm">{{ tag }}</MpTag>
            </MpFlex>
            <MpText v-else>—</MpText>
          </div>
        </div>
      </div>

      <!-- Zone C — line items (compact: no checkbox, sort, or pagination). -->
      <MpTableContainer>
        <MpTable :class="tableFixedClass">
          <colgroup>
            <col style="width: 22%" />
            <col style="width: 20%" />
            <col style="width: 8%" />
            <col style="width: 10%" />
            <col style="width: 16%" />
            <col style="width: 10%" />
            <col style="width: 14%" />
          </colgroup>
          <MpTableHead :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">Product</MpTableCell>
              <MpTableCell as="th">Description</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Qty</MpTableCell>
              <MpTableCell as="th">Units</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Unit price</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Discount</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Amount</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="line in order.lines" :key="line.id">
              <MpTableCell as="td">
                <MpTextlink
                  as="button"
                  variant="primary"
                  :class="textlinkCellClass"
                  @click="onAction('view-product')"
                  >{{ line.product }}</MpTextlink
                >
              </MpTableCell>
              <MpTableCell as="td" :class="wrapCellClass">{{
                line.description || "—"
              }}</MpTableCell>
              <MpTableCell as="td" :class="numCellClass">{{ line.quantity }}</MpTableCell>
              <MpTableCell as="td">{{ line.unit }}</MpTableCell>
              <MpTableCell as="td" :class="numCellClass">{{
                formatCurrency(line.unitPrice)
              }}</MpTableCell>
              <MpTableCell as="td" :class="numCellClass">{{ line.discountPercent }}%</MpTableCell>
              <MpTableCell as="td" :class="numCellClass">{{
                formatCurrency(line.amount)
              }}</MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>
      <MpText size="body-small" color="gray.600" :class="lineCaptionClass">
        Showing {{ order.lines.length }} from {{ order.lines.length }} product{{
          order.lines.length === 1 ? "" : "s"
        }}
      </MpText>

      <MpDivider variant="dashed" :class="dividerClass" />

      <!-- Message/memo + totals. -->
      <div :class="bottomRowClass">
        <div :class="notesColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Message</MpText>
            <MpText>{{ order.message || "—" }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Memo</MpText>
            <MpText>{{ order.memo || "—" }}</MpText>
          </div>
        </div>

        <div :class="totalsColClass">
          <div :class="totalsRowClass">
            <MpText weight="semiBold">Subtotal</MpText>
            <MpText weight="semiBold">{{ formatCurrency(order.subtotal) }}</MpText>
          </div>
          <div v-if="order.taxAmount > 0" :class="totalsRowClass">
            <MpText color="gray.600">Tax ({{ Math.round(order.taxRate * 100) }}%)</MpText>
            <MpText color="gray.600">{{ formatCurrency(order.taxAmount) }}</MpText>
          </div>

          <MpDivider variant="dashed" :class="dividerClass" />

          <div :class="totalsRowClass">
            <MpText weight="semiBold">Total</MpText>
            <MpText weight="semiBold">{{ formatCurrency(order.total) }}</MpText>
          </div>
          <div v-if="order.depositAmount > 0" :class="totalsRowClass">
            <MpText weight="semiBold">Deposit paid</MpText>
            <MpText weight="semiBold">{{ formatCurrency(order.depositAmount) }}</MpText>
          </div>

          <MpDivider variant="dashed" :class="dividerClass" />

          <div :class="totalsRowClass">
            <MpText size="h3" weight="semiBold">Balance due</MpText>
            <MpText size="h3" weight="semiBold">{{ formatCurrency(order.balanceDue) }}</MpText>
          </div>
        </div>
      </div>

      <MpTextlink
        as="button"
        variant="secondary"
        :class="[lastUpdatedClass, textlinkAlignClass]"
        @click="onAction('view-audit-log')"
      >
        Last updated by Rizal Candra on {{ formatDisplayDate(order.transactionDateSort) }} 09:00:00
        AM GMT +7
      </MpTextlink>

      <!-- Zone D — related records: the Delivery fulfilling this order, when
           one is linked. A single-tab strip, matching the real product
           (more transaction types would add more tabs here). -->
      <template v-if="linkedDelivery">
        <MpDivider variant="dashed" :class="dividerClass" />
        <MpTabs :index="0">
          <MpTabList>
            <MpTab>Delivery</MpTab>
          </MpTabList>
        </MpTabs>
        <MpTableContainer :class="relatedTableClass">
          <MpTable :class="tableFixedClass">
            <colgroup>
              <col style="width: 30%" />
              <col style="width: 40%" />
              <col style="width: 30%" />
            </colgroup>
            <MpTableHead :class="tableHeadClass">
              <MpTableRow>
                <MpTableCell as="th">Shipping date</MpTableCell>
                <MpTableCell as="th">Number</MpTableCell>
                <MpTableCell as="th">Status</MpTableCell>
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow>
                <MpTableCell as="td">{{ linkedDelivery.transactionDate }}</MpTableCell>
                <MpTableCell as="td">
                  <MpTextlink
                    :class="textlinkAlignClass"
                    as="button"
                    variant="primary"
                    @click="navigateTo(`/purchase/delivery/${linkedDelivery.id}`)"
                    >{{ linkedDelivery.number }}</MpTextlink
                  >
                </MpTableCell>
                <MpTableCell as="td">
                  <MpBadge for="tableStatus" :type="PURCHASE_STATUS_TYPE[linkedDelivery.status]">
                    {{ PURCHASE_STATUS_LABEL[linkedDelivery.status] }}
                  </MpBadge>
                </MpTableCell>
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>
      </template>

      <!-- Bottom action bar — Delete on the left (hidden once the order is
           Closed — a finalized order isn't deletable), everything else on
           the right. No "Edit" yet: Purchase Order has no edit form in this
           prototype (see docs/patterns/details-page-format.md — only
           Invoice does so far). -->
      <div :class="bottomActionsClass">
        <MpButton v-if="order.status !== 'closed'" variant="ghost" @click="isDeleteModalOpen = true"
          >Delete</MpButton
        >
        <div v-else />
        <MpFlex gap="2">
          <MpButton variant="secondary" @click="navigateTo(`/purchase/order/edit/${order.id}`)"
            >Edit</MpButton
          >
          <MpPopover placement="bottom-end" use-portal is-adaptive-width>
            <template #default>
              <MpPopoverTrigger>
                <MpButton variant="secondary" right-icon="caret-down">Print &amp; share</MpButton>
              </MpPopoverTrigger>
              <MpPopoverContent>
                <MpPopoverList>
                  <MpPopoverListItem role="menuitem" @click="onAction('print')"
                    >Preview &amp; print</MpPopoverListItem
                  >
                  <MpPopoverListItem role="menuitem" @click="onAction('share-email')"
                    >Share via email</MpPopoverListItem
                  >
                </MpPopoverList>
              </MpPopoverContent>
            </template>
          </MpPopover>
          <MpPopover placement="bottom-end" use-portal is-adaptive-width>
            <template #default>
              <MpPopoverTrigger>
                <MpButton variant="primary" right-icon="caret-down">Actions</MpButton>
              </MpPopoverTrigger>
              <MpPopoverContent>
                <MpPopoverList>
                  <MpPopoverListItem role="menuitem" @click="onAction('duplicate')"
                    >Duplicate transaction</MpPopoverListItem
                  >
                  <MpPopoverListItem role="menuitem" @click="onAction('create-delivery')"
                    >Create delivery</MpPopoverListItem
                  >
                </MpPopoverList>
              </MpPopoverContent>
            </template>
          </MpPopover>
        </MpFlex>
      </div>
    </template>

    <!-- Delete confirmation — destructive action, per docs/patterns/Modal.md. -->
    <MpModal :is-open="isDeleteModalOpen" size="sm" @close="isDeleteModalOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          <span :class="modalTitleClass">Delete order?</span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="body" color="gray.700">
            This will permanently remove <strong>{{ order?.number }}</strong
            >. This can't be undone.
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
  MpPopover,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpPopoverTrigger,
  MpTab,
  MpTabList,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpTabs,
  MpTag,
  MpText,
  MpTextlink,
  MpTooltip
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import { textlinkAlignClass, textlinkCellClass } from "~/utils/textlink-align";
import { PURCHASE_STATUS_LABEL, PURCHASE_STATUS_TYPE } from "~/data/purchase-status";
import {
  deleteTransactions,
  duplicateTransaction,
  formatCurrency,
  formatDisplayDate,
  getAdjacentTransactionIds,
  getPurchaseTransactionById
} from "~/data/purchase-transactions";

// ---------------------------------------------------------------------------
// Second details page in this repo (after Invoice), built directly against a
// screenshot of the real product's Purchase Order detail screen — reusing
// the identity row / meta grid / line-items table / totals shape from
// app/pages/purchase/invoice/[id].vue (see docs/patterns/details-page-format.md),
// plus what's specific to an order: a "Fulfillment" tag and a Delivery
// related-records table when a Delivery is linked (linkedDeliveryId — see
// app/data/purchase-transactions.ts), a "Deposit paid" line instead of
// "Payment received", and Delete hidden once the order is Closed. Detail
// page only for now — no New/Edit form for Purchase Order yet.
// ---------------------------------------------------------------------------

const route = useRoute();
const id = computed(() => Number(route.params.id));
const order = computed(() => {
  const t = getPurchaseTransactionById(id.value);
  return t && t.type === "order" ? t : undefined;
});
const linkedDelivery = computed(() =>
  order.value?.linkedDeliveryId != null
    ? getPurchaseTransactionById(order.value.linkedDeliveryId)
    : undefined
);
const adjacent = computed(() => getAdjacentTransactionIds(id.value));

useHead({
  title: computed(() =>
    order.value ? `${order.value.number} — Mekari Jurnal` : "Order not found — Mekari Jurnal"
  )
});

const isDeleteModalOpen = ref(false);

function goTo(nextId: number | null) {
  if (nextId) navigateTo(`/purchase/order/${nextId}`);
}

function onAction(action: string) {
  if (action === "duplicate") {
    onDuplicate();
    return;
  }
  if (action === "create-delivery") {
    // A delivery is created from its order, not from the "Create new purchase"
    // menu — which is why Delivery isn't in that menu (see index.vue).
    navigateTo("/purchase/delivery/new");
    return;
  }
  void action; // wire the rest to the relevant modal/API call/detail page on a real screen
}

// Clones the record into a new draft and opens it in the edit form —
// every type has one now, so a duplicate lands somewhere you can amend it
// before it becomes real (the same behaviour Invoice always had).
function onDuplicate() {
  const duplicate = order.value && duplicateTransaction(order.value.id);
  if (duplicate) navigateTo(`/purchase/order/edit/${duplicate.id}`);
}

function onDelete() {
  isDeleteModalOpen.value = false;
  if (order.value) deleteTransactions([order.value.id]);
  navigateTo("/purchase");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const topRowClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 6,
  alignItems: "start"
});
const balanceColClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 2,
  textAlign: "right"
});
const fulfillmentTagClass = css({ alignSelf: "flex-end" });

const dividerClass = css({ my: 6 });

const metaGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 6,
  mb: 8
});
const metaColClass = css({ display: "flex", flexDirection: "column", gap: 4 });
// minWidth:0 — a grid/flex item's implicit min-width is its content's natural
// width, which lets a long value (the email tag below, e.g.) overflow past
// its column instead of wrapping within it.
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });

const tableFixedClass = css({ tableLayout: "fixed", width: "full" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
const lineCaptionClass = css({ mt: 3, mb: 3 });
// MpTableCell/MpTextlink/MpTag default to white-space:nowrap + overflow:visible,
// so text longer than its column spills into the next cell instead of
// wrapping — see docs/patterns/TablePage.md's truncation gotcha.
// On a <td>: wrapping only. NEVER set `display` here — a table cell must stay
// `display: table-cell`. `inline-block` drops it out of the table's column
// model, so column boundaries and row borders get drawn against each cell's
// own content width instead of the column's, which renders as visibly ragged,
// staggered rows.
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
// On an inline child inside a cell (MpTag / MpTextlink) that ships its own
// nowrap — these are not the cell, so an inline-block box is correct here.
const wrapInlineClass = css({
  whiteSpace: "normal!",
  wordBreak: "break-word",
  maxWidth: "full",
  display: "inline-block",
  textAlign: "left"
});

const bottomRowClass = css({
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  flexWrap: "wrap"
});
const notesColClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  width: "50%",
  minWidth: "240px"
});
const totalsColClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  width: "40%",
  minWidth: "280px"
});
const totalsRowClass = css({ display: "flex", justifyContent: "space-between", gap: 3 });

const lastUpdatedClass = css({ display: "block", mt: 6, fontSize: "sm" });
const relatedTableClass = css({ mt: 5 });

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
