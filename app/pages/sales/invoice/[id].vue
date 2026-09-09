<template>
  <DefaultPageContent
    :title="invoice ? invoice.number : 'Invoice not found'"
    breadcrumb="Sales"
    breadcrumb-to="/sales"
  >
    <template v-if="invoice" #title-badge>
      <MpBadge for="tableStatus" :type="SALES_STATUS_TYPE[invoice.status]">
        {{ SALES_STATUS_LABEL[invoice.status] }}
      </MpBadge>
    </template>

    <!-- Only prev/next live in the title band — Edit/Print & share/Actions sit
         in the bottom action bar instead, matching the real product. -->
    <template v-if="invoice" #actions>
      <MpTooltip label="Previous invoice">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-left"
          aria-label="Previous invoice"
          :is-disabled="!adjacent.prevId"
          @click="goTo(adjacent.prevId)"
        />
      </MpTooltip>
      <MpTooltip label="Next invoice">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-right"
          aria-label="Next invoice"
          :is-disabled="!adjacent.nextId"
          @click="goTo(adjacent.nextId)"
        />
      </MpTooltip>
    </template>

    <BlankSlate
      v-if="!invoice"
      title="Invoice not found"
      description="This invoice may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/sales')">Back to Sales</MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Zone A — customer / email / balance due. -->
      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Customer</MpText>
          <MpTextlink
            :class="textlinkAlignClass"
            as="button"
            variant="primary"
            @click="onAction('view-customer')"
            >{{ invoice.customerName }}</MpTextlink
          >
        </div>

        <div :class="metaFieldClass">
          <MpText color="gray.600">Email</MpText>
          <MpFlex v-if="invoice.email.length" gap="2" flex-wrap="wrap">
            <MpTag
              v-for="email in invoice.email"
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
            >Balance due {{ formatCurrency(invoice.balanceDue) }}</MpText
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

      <!-- Meta grid — customer address / dates & term / identifiers & tags. -->
      <div :class="metaGridClass">
        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Billing address</MpText>
            <MpText>{{ invoice.customerAddress || "—" }}</MpText>
          </div>
          <div v-if="invoice.shippingInfo" :class="metaFieldClass">
            <MpText color="gray.600">Shipping address</MpText>
            <MpText>{{ invoice.shippingAddress || "—" }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Transaction date</MpText>
            <MpText>{{ formatDisplayDate(invoice.transactionDateSort) }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Due date</MpText>
            <MpText>{{ formatDisplayDate(invoice.dueDateSort) }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Term</MpText>
            <MpText>{{ invoice.term }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Transaction no.</MpText>
            <MpText>{{ invoice.number }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Reference no.</MpText>
            <MpText>{{ invoice.referenceNo || "—" }}</MpText>
          </div>
          <div v-if="invoice.warehouse" :class="metaFieldClass">
            <MpText color="gray.600">Warehouse</MpText>
            <MpTextlink
              :class="textlinkAlignClass"
              as="button"
              variant="primary"
              @click="onAction('view-warehouse')"
              >{{ invoice.warehouse }}</MpTextlink
            >
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Tags</MpText>
            <MpFlex v-if="invoice.tags.length" gap="2" flex-wrap="wrap">
              <MpTag v-for="tag in invoice.tags" :key="tag" variant="gray" size="sm">{{
                tag
              }}</MpTag>
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
            <MpTableRow v-for="line in invoice.lines" :key="line.id">
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
        Showing {{ invoice.lines.length }} from {{ invoice.lines.length }} product{{
          invoice.lines.length === 1 ? "" : "s"
        }}
      </MpText>

      <MpDivider variant="dashed" :class="dividerClass" />

      <!-- Message/memo + totals. -->
      <div :class="bottomRowClass">
        <div :class="notesColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Message</MpText>
            <MpText>{{ invoice.message || "—" }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Memo</MpText>
            <MpText>{{ invoice.memo || "—" }}</MpText>
          </div>
        </div>

        <div :class="totalsColClass">
          <div :class="totalsRowClass">
            <MpText weight="semiBold">Subtotal</MpText>
            <MpText weight="semiBold">{{ formatCurrency(invoice.subtotal) }}</MpText>
          </div>
          <!-- Discount / withholding / deposit / shipping only ever appear on
               a record created through the form with those set — a generated
               record has them at 0. -->
          <div v-if="invoice.discountPerLines > 0" :class="totalsRowClass">
            <MpText color="gray.600">Discount per lines</MpText>
            <MpText color="gray.600">{{ formatCurrency(invoice.discountPerLines) }}</MpText>
          </div>
          <div v-if="invoice.discountAmount > 0" :class="totalsRowClass">
            <MpText color="gray.600">
              Discount{{ invoice.discountType === "percent" ? ` (${invoice.discountValue}%)` : "" }}
            </MpText>
            <MpText color="gray.600">{{ formatCurrency(invoice.discountAmount) }}</MpText>
          </div>
          <div v-if="invoice.taxAmount > 0" :class="totalsRowClass">
            <MpText color="gray.600">Tax ({{ Math.round(invoice.taxRate * 100) }}%)</MpText>
            <MpText color="gray.600">{{ formatCurrency(invoice.taxAmount) }}</MpText>
          </div>
          <div v-if="invoice.shippingFee > 0" :class="totalsRowClass">
            <MpText color="gray.600">Shipping fee</MpText>
            <MpText color="gray.600">{{ formatCurrency(invoice.shippingFee) }}</MpText>
          </div>

          <MpDivider variant="dashed" :class="dividerClass" />

          <div :class="totalsRowClass">
            <MpText weight="semiBold">Total</MpText>
            <MpText weight="semiBold">{{ formatCurrency(invoice.total) }}</MpText>
          </div>
          <div v-if="invoice.withholdingAmount > 0" :class="totalsRowClass">
            <MpText color="gray.600">Withholding ({{ invoice.withholdingPercent }}%)</MpText>
            <MpText color="gray.600">{{ formatCurrency(invoice.withholdingAmount) }}</MpText>
          </div>
          <div v-if="invoice.depositAmount > 0" :class="totalsRowClass">
            <MpText color="gray.600">Deposit received</MpText>
            <MpText color="gray.600">{{ formatCurrency(invoice.depositAmount) }}</MpText>
          </div>
          <!-- Credit memos applied against this invoice, one row each so the
               customer can see which credit settled what. -->
          <div v-for="memo in invoice.creditMemos" :key="memo.id" :class="totalsRowClass">
            <MpText color="gray.600">Credit memo {{ memo.number }}</MpText>
            <MpText color="gray.600">{{ formatCurrency(memo.amount) }}</MpText>
          </div>
          <div v-if="invoice.amountReceived" :class="totalsRowClass">
            <MpText weight="semiBold">Payment received</MpText>
            <MpText weight="semiBold">{{ formatCurrency(invoice.amountReceived) }}</MpText>
          </div>

          <MpDivider variant="dashed" :class="dividerClass" />

          <div :class="totalsRowClass">
            <MpText size="h3" weight="semiBold">Balance due</MpText>
            <MpText size="h3" weight="semiBold">{{ formatCurrency(invoice.balanceDue) }}</MpText>
          </div>
        </div>
      </div>

      <!-- Renders as a link in the real product (opens an audit-log modal) —
           not wired to anything here, same as the other inert links on this
           page (view-customer, view-product, …). -->
      <MpTextlink
        as="button"
        variant="secondary"
        :class="[lastUpdatedClass, textlinkAlignClass]"
        @click="onAction('view-audit-log')"
      >
        Last updated by Rizal Candra on
        {{ formatDisplayDate(invoice.transactionDateSort) }} 09:00:00 AM GMT +7
      </MpTextlink>

      <!-- Returns raised against this invoice. The forward link is stored on
           the return (linkedInvoiceId); this direction is a lookup, same as
           Order → Delivery. -->
      <template v-if="relatedReturns.length">
        <MpDivider variant="dashed" :class="dividerClass" />
        <MpText weight="semiBold" color="dark" :class="relatedHeadingClass">Sales returns</MpText>
        <MpTableContainer>
          <MpTable :class="relatedTableClass">
            <MpTableHead :class="tableHeadClass">
              <MpTableRow>
                <MpTableCell as="th">Return no.</MpTableCell>
                <MpTableCell as="th">Date</MpTableCell>
                <MpTableCell as="th">Status</MpTableCell>
                <MpTableCell as="th" :class="numCellClass">Total</MpTableCell>
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow v-for="ret in relatedReturns" :key="ret.id">
                <MpTableCell as="td">
                  <MpTextlink
                    as="button"
                    variant="primary"
                    :class="textlinkCellClass"
                    @click="navigateTo(`/sales/return/${ret.id}`)"
                  >
                    {{ ret.number }}
                  </MpTextlink>
                </MpTableCell>
                <MpTableCell as="td">{{ formatDisplayDate(ret.transactionDateSort) }}</MpTableCell>
                <MpTableCell as="td">
                  <MpBadge for="tableStatus" :type="SALES_STATUS_TYPE[ret.status]">{{
                    SALES_STATUS_LABEL[ret.status]
                  }}</MpBadge>
                </MpTableCell>
                <MpTableCell as="td" :class="numCellClass">{{
                  formatCurrency(ret.total)
                }}</MpTableCell>
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>
      </template>

      <!-- Zone D — payment history (compact related list). -->
      <template v-if="invoice.payments.length">
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
              <MpTableRow v-for="payment in invoice.payments" :key="payment.id">
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

      <!-- Bottom action bar — Delete on the left, everything else on the
           right, matching the real product (the source page's "Bottom action
           section"). Share via WhatsApp, e-Meterai and Mekari Pay entries from
           the reference are omitted: those are integrations out of scope for
           this prototype, same as everywhere else in this module. -->
      <div :class="bottomActionsClass">
        <MpButton variant="ghost" @click="isDeleteModalOpen = true">Delete</MpButton>
        <MpFlex gap="2">
          <MpButton variant="secondary" @click="navigateTo(`/sales/invoice/edit/${invoice.id}`)"
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
                  <MpPopoverListItem role="menuitem" @click="onAction('receive-payment')"
                    >Receive payment</MpPopoverListItem
                  >
                  <MpPopoverListItem
                    v-if="invoice.balanceDue > 0"
                    role="menuitem"
                    @click="openCreditMemoModal"
                    >Apply credit memo</MpPopoverListItem
                  >
                  <MpPopoverListItem role="menuitem" @click="onAction('create-return')"
                    >Create sales return</MpPopoverListItem
                  >
                </MpPopoverList>
              </MpPopoverContent>
            </template>
          </MpPopover>
        </MpFlex>
      </div>
    </template>

    <!-- Apply credit memo — a focused dialog, not a confirm: it takes an
         amount, so it needs a field. Capped at the outstanding balance, since
         a credit memo can never pay more than is owed
         (see applyCreditMemo in app/data/sales-transactions.ts). -->
    <MpModal :is-open="isCreditMemoModalOpen" size="sm" @close="isCreditMemoModalOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          <span :class="modalTitleClass">Apply credit memo</span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpFormControl :is-invalid="creditMemoInvalid">
            <MpFormLabel>Amount to apply</MpFormLabel>
            <div @focusout="onCreditMemoBlur">
              <MpInputGroup>
                <MpInputLeftAddon>
                  <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                </MpInputLeftAddon>
                <MpInput
                  v-model="creditMemoText"
                  type="text"
                  inputmode="decimal"
                  @update:model-value="onCreditMemoInput"
                />
              </MpInputGroup>
            </div>
            <MpFormHelpText>
              Outstanding balance {{ formatCurrency(invoice?.balanceDue ?? 0) }}.
            </MpFormHelpText>
            <MpFormErrorMessage>
              Enter an amount between Rp1 and the outstanding balance.
            </MpFormErrorMessage>
          </MpFormControl>
        </MpModalBody>
        <MpModalFooter>
          <div :class="modalFooterClass">
            <MpButton variant="secondary" @click="isCreditMemoModalOpen = false">Cancel</MpButton>
            <MpButton variant="primary" @click="confirmCreditMemo">Apply</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>

    <!-- Delete confirmation — destructive action, per docs/patterns/Modal.md. -->
    <MpModal :is-open="isDeleteModalOpen" size="sm" @close="isDeleteModalOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          <span :class="modalTitleClass">Delete invoice?</span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="body" color="gray.700">
            This will permanently remove <strong>{{ invoice?.number }}</strong
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
  MpFormControl,
  MpFormErrorMessage,
  MpFormHelpText,
  MpFormLabel,
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
  applyCreditMemo,
  deleteTransactions,
  duplicateTransaction,
  formatAmount,
  formatCurrency,
  formatDisplayDate,
  getAdjacentTransactionIds,
  getReturnsForInvoice,
  getTransactionOfType,
  parseAmount
} from "~/data/sales-transactions";

// ---------------------------------------------------------------------------
// Cloned from jurnal-frontend-app src/pages/sales/show.vue (the "si" tab's
// detail page), following this repo's Purchase Invoice detail page as the
// structural reference — see docs/patterns/details-page-format.md. Dropped
// from the source: the approval workflow, e-Meterai, Mekari Pay / financing /
// fulfillment banners, progress invoicing, recurring schedules, multi-currency
// cutoffs, batch/serial-number tracking, custom fields, and the audit trail —
// all business-logic or backend-integration concerns out of scope for a static
// prototype. What's kept is the *shape*: title-band status badge + breadcrumb,
// the customer/email/balance row, the date/identifier meta grid, a 7-column
// line-items table, message/memo + totals (including credit memos), returns
// raised against this invoice, payment history, and a bottom action bar.
// ---------------------------------------------------------------------------

const route = useRoute();
const id = computed(() => Number(route.params.id));
// Bumped after a mutation (credit memo applied) — the shared dataset is a
// plain array, so nothing re-reads it on its own.
const refreshTick = ref(0);
const invoice = computed(() => {
  void refreshTick.value;
  return getTransactionOfType(id.value, "invoice");
});
const adjacent = computed(() => getAdjacentTransactionIds(id.value));
// Reverse of the return's own linkedInvoiceId — resolved by lookup so the link
// is stored once, same as Order → Delivery.
const relatedReturns = computed(() => {
  void refreshTick.value;
  return invoice.value ? getReturnsForInvoice(invoice.value.id) : [];
});

useHead({
  title: computed(() =>
    invoice.value ? `${invoice.value.number} — Mekari Jurnal` : "Invoice not found — Mekari Jurnal"
  )
});

const isDeleteModalOpen = ref(false);
const isCreditMemoModalOpen = ref(false);
const creditMemoAmount = ref(0);
const creditMemoText = ref("");
const creditMemoSubmitted = ref(false);

function goTo(nextId: number | null) {
  if (nextId) navigateTo(`/sales/invoice/${nextId}`);
}

function onAction(action: string) {
  if (action === "duplicate") {
    onDuplicate();
    return;
  }
  if (action === "create-return") {
    // A return is always raised against a specific invoice, so this is its
    // only entry point. The id rides in the query so the form can pre-select
    // the invoice and load its returnable lines.
    navigateTo(`/sales/return/new?invoice=${invoice.value?.id}`);
    return;
  }
  void action; // wire the rest to the relevant modal/API call/detail page on a real screen
}

// Clones the invoice into a new draft and opens it in the edit form —
// mirrors the source page's clone flow, which lands on a prefilled
// new_and_edit page rather than the read-only show page.
function onDuplicate() {
  const duplicate = invoice.value && duplicateTransaction(invoice.value.id);
  if (duplicate) navigateTo(`/sales/invoice/edit/${duplicate.id}`);
}

// ---- Apply credit memo ---------------------------------------------------

function openCreditMemoModal() {
  // Pre-fill with the full outstanding balance: settling the whole balance is
  // the common case, and it's the only value guaranteed to be valid.
  creditMemoAmount.value = invoice.value?.balanceDue ?? 0;
  creditMemoText.value = creditMemoAmount.value ? formatAmount(creditMemoAmount.value) : "";
  creditMemoSubmitted.value = false;
  isCreditMemoModalOpen.value = true;
}

// Money is parsed on every keystroke and reformatted only on focusout —
// reformatting live at two decimals makes incremental typing impossible
// (docs/patterns/Form.md).
function onCreditMemoInput() {
  creditMemoAmount.value = parseAmount(creditMemoText.value);
}
function onCreditMemoBlur() {
  creditMemoAmount.value = parseAmount(creditMemoText.value);
  creditMemoText.value = creditMemoAmount.value ? formatAmount(creditMemoAmount.value) : "";
}

const creditMemoInvalid = computed(
  () =>
    creditMemoSubmitted.value &&
    (creditMemoAmount.value <= 0 || creditMemoAmount.value > (invoice.value?.balanceDue ?? 0))
);

function confirmCreditMemo() {
  creditMemoSubmitted.value = true;
  // Apply stays enabled while invalid and simply refuses, surfacing the error
  // instead — a disabled button gives no reason
  // (docs/patterns/form-page-format.md, Validation).
  if (creditMemoInvalid.value || !invoice.value) return;
  applyCreditMemo(invoice.value.id, creditMemoAmount.value);
  refreshTick.value++;
  isCreditMemoModalOpen.value = false;
}

function onDelete() {
  isDeleteModalOpen.value = false;
  if (invoice.value) deleteTransactions([invoice.value.id]);
  navigateTo("/sales");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
// The addon supplies no padding of its own: Pixel's "input with prefix and
// suffix" pattern pads the addon's content by 12px, without which the prefix
// sits flush against both edges.
const addonTextClass = css({ px: 3 });
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
// minWidth:0 — a grid/flex item's implicit min-width is its content's natural
// width, which lets a long value (the email tag below, e.g.) overflow past its
// column instead of wrapping within it.
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });

const tableFixedClass = css({ tableLayout: "fixed", width: "full" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
// MpTableCell defaults to white-space:nowrap + overflow:visible, so text
// longer than the column spills into the next cell instead of wrapping — see
// docs/patterns/TablePage.md's truncation gotcha. On a <td>: wrapping only.
// NEVER set `display` here — a table cell must stay `display: table-cell`.
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
const relatedHeadingClass = css({ fontSize: "lg", mb: 4 });
const relatedTableClass = css({ tableLayout: "auto", width: "full" });
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
