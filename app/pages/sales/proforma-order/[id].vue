<template>
  <DefaultPageContent
    :title="record ? record.number : 'Pro forma order not found'"
    breadcrumb="Sales"
    breadcrumb-to="/sales"
  >
    <template v-if="record" #title-badge>
      <MpBadge for="tableStatus" :type="SALES_STATUS_TYPE[record.status]">
        {{ SALES_STATUS_LABEL[record.status] }}
      </MpBadge>
    </template>

    <template v-if="record" #actions>
      <MpTooltip label="Previous pro forma order">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-left"
          aria-label="Previous pro forma order"
          :is-disabled="!adjacent.prevId"
          @click="goTo(adjacent.prevId)"
        />
      </MpTooltip>
      <MpTooltip label="Next pro forma order">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-right"
          aria-label="Next pro forma order"
          :is-disabled="!adjacent.nextId"
          @click="goTo(adjacent.nextId)"
        />
      </MpTooltip>
    </template>

    <BlankSlate
      v-if="!record"
      title="Pro forma order not found"
      description="This pro forma order may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/sales')">Back to Sales</MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Zone A — customer / email / total. The headline figure is the quoted
           Total, NOT a balance due: nothing is owed until the customer accepts
           it, so showing an outstanding balance would misstate the document. -->
      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Customer</MpText>
          <MpTextlink
            :class="textlinkAlignClass"
            as="button"
            variant="primary"
            @click="onAction('view-customer')"
            >{{ record.customerName }}</MpTextlink
          >
        </div>

        <div :class="metaFieldClass">
          <MpText color="gray.600">Email</MpText>
          <MpFlex v-if="record.email.length" gap="2" flex-wrap="wrap">
            <MpTag
              v-for="email in record.email"
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
            >Balance due {{ formatCurrency(record.balanceDue) }}</MpText
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
        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Billing address</MpText>
            <MpText>{{ record.customerAddress || "—" }}</MpText>
          </div>
          <div v-if="record.shippingInfo" :class="metaFieldClass">
            <MpText color="gray.600">Shipping address</MpText>
            <MpText>{{ record.shippingAddress || "—" }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Transaction date</MpText>
            <MpText>{{ formatDisplayDate(record.transactionDateSort) }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Due date</MpText>
            <MpText>{{ formatDisplayDate(record.dueDateSort) }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Term</MpText>
            <MpText>{{ record.term }}</MpText>
          </div>
          <!-- The two fields that make this a *progress* bill: which order it
               draws down, and on what basis. -->
          <div :class="metaFieldClass">
            <MpText color="gray.600">Sales order</MpText>
            <MpTextlink
              v-if="linkedOrder"
              as="button"
              variant="primary"
              :class="textlinkCellClass"
              @click="navigateTo(`/sales/order/${linkedOrder.id}`)"
              >{{ linkedOrder.number }}</MpTextlink
            >
            <MpText v-else>—</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Billing method</MpText>
            <MpText>{{
              record.billingMethod ? BILLING_METHOD_LABEL[record.billingMethod] : "—"
            }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Share of order</MpText>
            <MpText>{{ record.billingPercent }}%</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Transaction no.</MpText>
            <MpText>{{ record.number }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Reference no.</MpText>
            <MpText>{{ record.referenceNo || "—" }}</MpText>
          </div>
          <div v-if="record.warehouse" :class="metaFieldClass">
            <MpText color="gray.600">Warehouse</MpText>
            <MpTextlink
              :class="textlinkAlignClass"
              as="button"
              variant="primary"
              @click="onAction('view-warehouse')"
              >{{ record.warehouse }}</MpTextlink
            >
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Tags</MpText>
            <MpFlex v-if="record.tags.length" gap="2" flex-wrap="wrap">
              <MpTag v-for="tag in record.tags" :key="tag" variant="gray" size="sm">{{ tag }}</MpTag>
            </MpFlex>
            <MpText v-else>—</MpText>
          </div>
        </div>
      </div>

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
            <MpTableRow v-for="line in record.lines" :key="line.id">
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
        Showing {{ record.lines.length }} from {{ record.lines.length }} product{{
          record.lines.length === 1 ? "" : "s"
        }}
      </MpText>

      <MpDivider variant="dashed" :class="dividerClass" />

      <div :class="bottomRowClass">
        <div :class="notesColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Message</MpText>
            <MpText>{{ record.message || "—" }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Memo</MpText>
            <MpText>{{ record.memo || "—" }}</MpText>
          </div>
        </div>

        <!-- No balance-due / withholding / deposit rows: a quote settles
             nothing, so the stack ends at Total. -->
        <div :class="totalsColClass">
          <div :class="totalsRowClass">
            <MpText weight="semiBold">Subtotal</MpText>
            <MpText weight="semiBold">{{ formatCurrency(record.subtotal) }}</MpText>
          </div>
          <div v-if="record.discountPerLines > 0" :class="totalsRowClass">
            <MpText color="gray.600">Discount per lines</MpText>
            <MpText color="gray.600">{{ formatCurrency(record.discountPerLines) }}</MpText>
          </div>
          <div v-if="record.discountAmount > 0" :class="totalsRowClass">
            <MpText color="gray.600">
              Discount{{ record.discountType === "percent" ? ` (${record.discountValue}%)` : "" }}
            </MpText>
            <MpText color="gray.600">{{ formatCurrency(record.discountAmount) }}</MpText>
          </div>
          <div v-if="record.taxAmount > 0" :class="totalsRowClass">
            <MpText color="gray.600">Tax ({{ Math.round(record.taxRate * 100) }}%)</MpText>
            <MpText color="gray.600">{{ formatCurrency(record.taxAmount) }}</MpText>
          </div>
          <div v-if="record.shippingFee > 0" :class="totalsRowClass">
            <MpText color="gray.600">Shipping fee</MpText>
            <MpText color="gray.600">{{ formatCurrency(record.shippingFee) }}</MpText>
          </div>

          <MpDivider variant="dashed" :class="dividerClass" />

          <div :class="totalsRowClass">
            <MpText weight="semiBold">Total</MpText>
            <MpText weight="semiBold">{{ formatCurrency(record.total) }}</MpText>
          </div>
          <div v-if="record.withholdingAmount > 0" :class="totalsRowClass">
            <MpText color="gray.600">Withholding ({{ record.withholdingPercent }}%)</MpText>
            <MpText color="gray.600">{{ formatCurrency(record.withholdingAmount) }}</MpText>
          </div>
          <div v-if="record.amountReceived" :class="totalsRowClass">
            <MpText weight="semiBold">Payment received</MpText>
            <MpText weight="semiBold">{{ formatCurrency(record.amountReceived) }}</MpText>
          </div>

          <MpDivider variant="dashed" :class="dividerClass" />

          <div :class="totalsRowClass">
            <MpText size="h3" weight="semiBold">Balance due</MpText>
            <MpText size="h3" weight="semiBold">{{ formatCurrency(record.balanceDue) }}</MpText>
          </div>
        </div>
      </div>

      <MpTextlink
        as="button"
        variant="secondary"
        :class="[lastUpdatedClass, textlinkAlignClass]"
        @click="onAction('view-audit-log')"
      >
        Last updated by Rizal Candra on {{ formatDisplayDate(record.transactionDateSort) }} 09:00:00
        AM GMT +7
      </MpTextlink>

      <template v-if="record.payments.length">
        <MpDivider variant="dashed" :class="dividerClass" />
        <MpText size="label" weight="semiBold" color="dark" :class="lineCaptionClass"
          >Payment history</MpText
        >
        <MpTableContainer>
          <MpTable :class="tableFixedClass">
            <colgroup>
              <col style="width: 22%" />
              <col style="width: 30%" />
              <col style="width: 26%" />
              <col style="width: 22%" />
            </colgroup>
            <MpTableHead :class="tableHeadClass">
              <MpTableRow>
                <MpTableCell as="th">Date</MpTableCell>
                <MpTableCell as="th">Payment no.</MpTableCell>
                <MpTableCell as="th">Method</MpTableCell>
                <MpTableCell as="th" :class="numCellClass">Amount</MpTableCell>
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow v-for="payment in record.payments" :key="payment.id">
                <MpTableCell as="td">{{ payment.date }}</MpTableCell>
                <MpTableCell as="td">{{ payment.number }}</MpTableCell>
                <MpTableCell as="td">{{ payment.method }}</MpTableCell>
                <MpTableCell as="td" :class="numCellClass">{{
                  formatCurrency(payment.amount)
                }}</MpTableCell>
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>
      </template>

      <!-- A pro forma exists to become a real invoice, so that conversion
           leads its Actions menu. -->
      <div :class="bottomActionsClass">
        <MpButton variant="ghost" @click="isDeleteModalOpen = true">Delete</MpButton>
        <MpFlex gap="2">
          <MpButton variant="secondary" @click="navigateTo(`/sales/proforma-order/edit/${record.id}`)"
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
                  <MpPopoverListItem role="menuitem" @click="onAction('create-invoice')"
                    >Create invoice</MpPopoverListItem
                  >
                  <MpPopoverListItem role="menuitem" @click="onAction('duplicate')"
                    >Duplicate transaction</MpPopoverListItem
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
          <span :class="modalTitleClass">Delete pro forma order?</span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="body" color="gray.700">
            This will permanently remove <strong>{{ record?.number }}</strong
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
import { SALES_STATUS_LABEL, SALES_STATUS_TYPE } from "~/data/sales-status";
import {
  BILLING_METHOD_LABEL,
  deleteTransactions,
  duplicateTransaction,
  formatCurrency,
  formatDisplayDate,
  getAdjacentTransactionIds,
  getSalesTransactionById,
  getTransactionOfType
} from "~/data/sales-transactions";

// ---------------------------------------------------------------------------
// Cloned from jurnal-frontend-app src/pages/sales/pro_forma_orders/show.vue,
// following the Sales Invoice detail page's zone order — see
// docs/patterns/details-page-format.md. What makes a pro forma ORDER different
// from a pro forma invoice: it bills a SHARE of a specific Sales Order (the
// billing method and percentage in the meta grid), so its lines and figures
// are that order scaled down, and it links back to the order it draws on.
// ---------------------------------------------------------------------------

const route = useRoute();
const id = computed(() => Number(route.params.id));
const record = computed(() => getTransactionOfType(id.value, "proforma_order"));
const adjacent = computed(() => getAdjacentTransactionIds(id.value));
const linkedOrder = computed(() =>
  record.value?.linkedOrderId != null
    ? getSalesTransactionById(record.value.linkedOrderId)
    : undefined
);

useHead({
  title: computed(() =>
    record.value ? `${record.value.number} — Mekari Jurnal` : "Pro forma order not found — Mekari Jurnal"
  )
});

const isDeleteModalOpen = ref(false);

function goTo(nextId: number | null) {
  if (nextId) navigateTo(`/sales/proforma-order/${nextId}`);
}

function onAction(action: string) {
  if (action === "duplicate") {
    const duplicate = record.value && duplicateTransaction(record.value.id);
    if (duplicate) navigateTo(`/sales/proforma-order/edit/${duplicate.id}`);
    return;
  }
  if (action === "create-invoice") {
    navigateTo("/sales/invoice/new");
    return;
  }
  void action; // wire the rest to the relevant modal/API call on a real screen
}

function onDelete() {
  isDeleteModalOpen.value = false;
  if (record.value) deleteTransactions([record.value.id]);
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

const dividerClass = css({ my: 6 });

const metaGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 6,
  mb: 8
});
const metaColClass = css({ display: "flex", flexDirection: "column", gap: 4 });
// minWidth:0 — a grid item's implicit min-width is its content's natural
// width, which lets a long value overflow its column instead of wrapping.
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });

const tableFixedClass = css({ tableLayout: "fixed", width: "full" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
const lineCaptionClass = css({ mt: 3, mb: 3 });
// MpTableCell defaults to white-space:nowrap, so long text spills into the
// next cell instead of wrapping. On a <td>: wrapping only — NEVER set
// `display` here, a table cell must stay `display: table-cell`.
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
