<template>
  <DefaultPageContent
    :title="order ? order.number : 'Order not found'"
    breadcrumb="Sales"
    breadcrumb-to="/sales"
  >
    <template v-if="order" #title-badge>
      <MpBadge for="tableStatus" :type="SALES_STATUS_TYPE[order.status]">
        {{ SALES_STATUS_LABEL[order.status] }}
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
      <MpButton variant="secondary" @click="navigateTo('/sales')">Back to Sales</MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Zone A — customer / email / balance due (+ a "Fulfillment" tag when
           a Delivery record is linked — see linkedDelivery below). -->
      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Customer</MpText>
          <MpTextlink
            :class="textlinkAlignClass"
            as="button"
            variant="primary"
            @click="onAction('view-customer')"
            >{{ order.customerName }}</MpTextlink
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

      <!-- Meta grid — customer address / dates & term / identifiers & tags. -->
      <div :class="metaGridClass">
        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Billing address</MpText>
            <MpText>{{ order.customerAddress || "—" }}</MpText>
          </div>
          <div v-if="order.shippingInfo" :class="metaFieldClass">
            <MpText color="gray.600">Shipping address</MpText>
            <MpText>{{ order.shippingAddress || "—" }}</MpText>
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
          <div v-if="order.shippingFee > 0" :class="totalsRowClass">
            <MpText color="gray.600">Shipping fee</MpText>
            <MpText color="gray.600">{{ formatCurrency(order.shippingFee) }}</MpText>
          </div>

          <MpDivider variant="dashed" :class="dividerClass" />

          <div :class="totalsRowClass">
            <MpText weight="semiBold">Total</MpText>
            <MpText weight="semiBold">{{ formatCurrency(order.total) }}</MpText>
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
           one is linked. A single-tab strip, matching the real product. -->
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
                    @click="navigateTo(`/sales/delivery/${linkedDelivery.id}`)"
                    >{{ linkedDelivery.number }}</MpTextlink
                  >
                </MpTableCell>
                <MpTableCell as="td">
                  <MpBadge for="tableStatus" :type="SALES_STATUS_TYPE[linkedDelivery.status]">
                    {{ SALES_STATUS_LABEL[linkedDelivery.status] }}
                  </MpBadge>
                </MpTableCell>
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>
      </template>

      <!-- Bottom action bar — Delete on the left (hidden once the order is
           Closed — a finalized order isn't deletable), everything else on the
           right. -->
      <div :class="bottomActionsClass">
        <MpButton v-if="order.status !== 'closed'" variant="ghost" @click="isDeleteModalOpen = true"
          >Delete</MpButton
        >
        <div v-else />
        <MpFlex gap="2">
          <MpButton variant="secondary" @click="navigateTo(`/sales/order/edit/${order.id}`)"
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
                  <MpPopoverListItem role="menuitem" @click="onAction('shareable-link')"
                    >Generate shareable link</MpPopoverListItem
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
                  <MpPopoverListItem role="menuitem" @click="onAction('create-invoice')"
                    >Create invoice</MpPopoverListItem
                  >
                  <MpPopoverListItem role="menuitem" @click="onAction('create-proforma')"
                    >Create pro forma invoice</MpPopoverListItem
                  >
                  <MpPopoverListItem role="menuitem" @click="onAction('create-proforma-order')"
                    >Create pro forma order</MpPopoverListItem
                  >
                  <MpPopoverListItem
                    v-if="order.status !== 'closed'"
                    role="menuitem"
                    @click="isCloseOrderModalOpen = true"
                    >Close order</MpPopoverListItem
                  >
                </MpPopoverList>
              </MpPopoverContent>
            </template>
          </MpPopover>
        </MpFlex>
      </div>
    </template>

    <!-- Close order — the source app's own confirmation: it lists what has and
         hasn't been sent yet, because closing an order with an unfulfilled
         remainder is exactly the case the user needs to see before agreeing.
         `md` rather than `sm`: it carries a table, not a sentence. -->
    <MpModal :is-open="isCloseOrderModalOpen" size="md" @close="isCloseOrderModalOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          <span :class="modalTitleClass">Close order?</span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="body" color="gray.700" :class="closeIntroClass">
            Closing this order stops any remaining items from being sent or invoiced. This can't be
            undone.
          </MpText>
          <MpTableContainer>
            <MpTable :class="tableFixedClass">
              <colgroup>
                <col style="width: 40%" />
                <col style="width: 20%" />
                <col style="width: 20%" />
                <col style="width: 20%" />
              </colgroup>
              <MpTableHead :class="tableHeadClass">
                <MpTableRow>
                  <MpTableCell as="th">Product</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Qty</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Sent</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Remaining</MpTableCell>
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="row in closeOrderRows" :key="row.product">
                  <MpTableCell as="td" :class="wrapCellClass">{{ row.product }}</MpTableCell>
                  <MpTableCell as="td" :class="numCellClass">{{ row.ordered }}</MpTableCell>
                  <MpTableCell as="td" :class="numCellClass">{{ row.sent }}</MpTableCell>
                  <MpTableCell as="td" :class="numCellClass">{{ row.remaining }}</MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
        </MpModalBody>
        <MpModalFooter>
          <div :class="modalFooterClass">
            <MpButton variant="secondary" @click="isCloseOrderModalOpen = false">Cancel</MpButton>
            <MpButton variant="primary" @click="confirmCloseOrder">Close order</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>

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
import { SALES_STATUS_LABEL, SALES_STATUS_TYPE } from "~/data/sales-status";
import {
  closeOrder,
  deleteTransactions,
  duplicateTransaction,
  formatCurrency,
  formatDisplayDate,
  getAdjacentTransactionIds,
  getSalesTransactionById,
  getTransactionOfType
} from "~/data/sales-transactions";

// ---------------------------------------------------------------------------
// Cloned from jurnal-frontend-app src/pages/sales/show.vue (the "so" tab's
// detail page), following this repo's Purchase Order detail page as the
// structural reference — see docs/patterns/details-page-format.md.
//
// The Sales-only piece here is "Close order": the source app confirms it with
// a table of what has and hasn't shipped, not a one-line prompt, because
// closing an order abandons whatever remains unfulfilled.
// ---------------------------------------------------------------------------

const route = useRoute();
const id = computed(() => Number(route.params.id));
// Bumped after a mutation (close order) — the shared dataset is a plain array,
// so nothing re-reads it on its own.
const refreshTick = ref(0);
const order = computed(() => {
  void refreshTick.value;
  return getTransactionOfType(id.value, "order");
});
const adjacent = computed(() => getAdjacentTransactionIds(id.value));
const linkedDelivery = computed(() =>
  order.value?.linkedDeliveryId != null
    ? getSalesTransactionById(order.value.linkedDeliveryId)
    : undefined
);

useHead({
  title: computed(() =>
    order.value ? `${order.value.number} — Mekari Jurnal` : "Order not found — Mekari Jurnal"
  )
});

const isDeleteModalOpen = ref(false);
const isCloseOrderModalOpen = ref(false);

/** Ordered vs. shipped per product, for the Close order confirmation. What has
 *  shipped comes from the linked Delivery's own lines, so the figures always
 *  agree with the delivery record itself rather than being stored twice. */
const closeOrderRows = computed(() => {
  const record = order.value;
  if (!record) return [];
  const sentByProduct = new Map<string, number>();
  for (const line of linkedDelivery.value?.lines ?? []) {
    sentByProduct.set(line.product, (sentByProduct.get(line.product) ?? 0) + line.quantity);
  }
  return record.lines.map((line) => {
    const sent = Math.min(line.quantity, sentByProduct.get(line.product) ?? 0);
    return {
      product: line.product,
      ordered: line.quantity,
      sent,
      remaining: line.quantity - sent
    };
  });
});

function goTo(nextId: number | null) {
  if (nextId) navigateTo(`/sales/order/${nextId}`);
}

function onAction(action: string) {
  if (action === "duplicate") {
    onDuplicate();
    return;
  }
  if (action === "create-delivery") {
    // The delivery form seeds its customer and lines from this order — the id
    // rides in the query, same shape as invoice → return.
    navigateTo(`/sales/delivery/new?order=${order.value?.id}`);
    return;
  }
  if (action === "create-invoice") {
    navigateTo("/sales/invoice/new");
    return;
  }
  if (action === "create-proforma") {
    navigateTo("/sales/proforma-invoice/new");
    return;
  }
  if (action === "create-proforma-order") {
    // Progress billing draws a share of THIS order, so the id rides in the
    // query for the form to seed its customer, lines and remaining share.
    navigateTo(`/sales/proforma-order/new?order=${order.value?.id}`);
    return;
  }
  void action; // wire the rest to the relevant modal/API call/detail page on a real screen
}

function onDuplicate() {
  const duplicate = order.value && duplicateTransaction(order.value.id);
  if (duplicate) navigateTo(`/sales/order/edit/${duplicate.id}`);
}

function confirmCloseOrder() {
  if (order.value) closeOrder(order.value.id);
  refreshTick.value++;
  isCloseOrderModalOpen.value = false;
}

function onDelete() {
  isDeleteModalOpen.value = false;
  if (order.value) deleteTransactions([order.value.id]);
  navigateTo("/sales");
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
  gap: 1,
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
// width, which lets a long value overflow past its column instead of wrapping.
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });

const tableFixedClass = css({ tableLayout: "fixed", width: "full" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
// MpTableCell defaults to white-space:nowrap + overflow:visible, so text
// longer than the column spills into the next cell instead of wrapping. On a
// <td>: wrapping only — NEVER set `display` here, a table cell must stay
// `display: table-cell`.
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
const relatedTableClass = css({ mt: 4 });
const lineCaptionClass = css({ mt: 3, mb: 3 });

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

const modalTitleClass = css({ fontSize: "lg" });
const modalFooterClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
const closeIntroClass = css({ mb: 4 });

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
