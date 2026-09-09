<template>
  <DefaultPageContent
    :title="quotation ? quotation.number : 'Quotation not found'"
    breadcrumb="Sales"
    breadcrumb-to="/sales"
  >
    <template v-if="quotation" #title-badge>
      <MpBadge for="tableStatus" :type="SALES_STATUS_TYPE[quotation.status]">
        {{ SALES_STATUS_LABEL[quotation.status] }}
      </MpBadge>
    </template>

    <template v-if="quotation" #actions>
      <MpTooltip label="Previous quotation">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-left"
          aria-label="Previous quotation"
          :is-disabled="!adjacent.prevId"
          @click="goTo(adjacent.prevId)"
        />
      </MpTooltip>
      <MpTooltip label="Next quotation">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-right"
          aria-label="Next quotation"
          :is-disabled="!adjacent.nextId"
          @click="goTo(adjacent.nextId)"
        />
      </MpTooltip>
    </template>

    <BlankSlate
      v-if="!quotation"
      title="Quotation not found"
      description="This quotation may have been deleted, or the link you followed may be out of date."
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
            >{{ quotation.customerName }}</MpTextlink
          >
        </div>

        <div :class="metaFieldClass">
          <MpText color="gray.600">Email</MpText>
          <MpFlex v-if="quotation.email.length" gap="2" flex-wrap="wrap">
            <MpTag
              v-for="email in quotation.email"
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
            >Total {{ formatCurrency(quotation.total) }}</MpText
          >
          <MpText size="body-small" color="gray.600"
            >Valid until {{ formatDisplayDate(quotation.dueDateSort) }}</MpText
          >
        </div>
      </div>

      <MpDivider variant="dashed" :class="dividerClass" />

      <div :class="metaGridClass">
        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Billing address</MpText>
            <MpText>{{ quotation.customerAddress || "—" }}</MpText>
          </div>
          <div v-if="quotation.shippingInfo" :class="metaFieldClass">
            <MpText color="gray.600">Shipping address</MpText>
            <MpText>{{ quotation.shippingAddress || "—" }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Transaction date</MpText>
            <MpText>{{ formatDisplayDate(quotation.transactionDateSort) }}</MpText>
          </div>
          <!-- A quotation expires; it never falls due. Same stored field, the name
               the document actually uses (TYPE_CAPABILITIES.quotation). -->
          <div :class="metaFieldClass">
            <MpText color="gray.600">Expiry date</MpText>
            <MpText>{{ formatDisplayDate(quotation.dueDateSort) }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Term</MpText>
            <MpText>{{ quotation.term }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Transaction no.</MpText>
            <MpText>{{ quotation.number }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Reference no.</MpText>
            <MpText>{{ quotation.referenceNo || "—" }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Tags</MpText>
            <MpFlex v-if="quotation.tags.length" gap="2" flex-wrap="wrap">
              <MpTag v-for="tag in quotation.tags" :key="tag" variant="gray" size="sm">{{
                tag
              }}</MpTag>
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
            <MpTableRow v-for="line in quotation.lines" :key="line.id">
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
        Showing {{ quotation.lines.length }} from {{ quotation.lines.length }} product{{
          quotation.lines.length === 1 ? "" : "s"
        }}
      </MpText>

      <MpDivider variant="dashed" :class="dividerClass" />

      <div :class="bottomRowClass">
        <div :class="notesColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Message</MpText>
            <MpText>{{ quotation.message || "—" }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Memo</MpText>
            <MpText>{{ quotation.memo || "—" }}</MpText>
          </div>
        </div>

        <!-- No balance-due / withholding / deposit rows: a quotation settles
             nothing, so the stack ends at Total. -->
        <div :class="totalsColClass">
          <div :class="totalsRowClass">
            <MpText weight="semiBold">Subtotal</MpText>
            <MpText weight="semiBold">{{ formatCurrency(quotation.subtotal) }}</MpText>
          </div>
          <div v-if="quotation.discountPerLines > 0" :class="totalsRowClass">
            <MpText color="gray.600">Discount per lines</MpText>
            <MpText color="gray.600">{{ formatCurrency(quotation.discountPerLines) }}</MpText>
          </div>
          <div v-if="quotation.discountAmount > 0" :class="totalsRowClass">
            <MpText color="gray.600">
              Discount{{
                quotation.discountType === "percent" ? ` (${quotation.discountValue}%)` : ""
              }}
            </MpText>
            <MpText color="gray.600">{{ formatCurrency(quotation.discountAmount) }}</MpText>
          </div>
          <div v-if="quotation.taxAmount > 0" :class="totalsRowClass">
            <MpText color="gray.600">Tax ({{ Math.round(quotation.taxRate * 100) }}%)</MpText>
            <MpText color="gray.600">{{ formatCurrency(quotation.taxAmount) }}</MpText>
          </div>
          <div v-if="quotation.shippingFee > 0" :class="totalsRowClass">
            <MpText color="gray.600">Shipping fee</MpText>
            <MpText color="gray.600">{{ formatCurrency(quotation.shippingFee) }}</MpText>
          </div>

          <MpDivider variant="dashed" :class="dividerClass" />

          <div :class="totalsRowClass">
            <MpText size="h3" weight="semiBold">Total</MpText>
            <MpText size="h3" weight="semiBold">{{ formatCurrency(quotation.total) }}</MpText>
          </div>
        </div>
      </div>

      <MpTextlink
        as="button"
        variant="secondary"
        :class="[lastUpdatedClass, textlinkAlignClass]"
        @click="onAction('view-audit-log')"
      >
        Last updated by Rizal Candra on
        {{ formatDisplayDate(quotation.transactionDateSort) }} 09:00:00 AM GMT +7
      </MpTextlink>

      <!-- A quotation's whole purpose is to become something else, so its Actions
           menu leads with the two documents it converts into. -->
      <div :class="bottomActionsClass">
        <MpButton variant="ghost" @click="isDeleteModalOpen = true">Delete</MpButton>
        <MpFlex gap="2">
          <MpButton variant="secondary" @click="navigateTo(`/sales/quotation/edit/${quotation.id}`)"
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
                  <MpPopoverListItem role="menuitem" @click="onAction('create-order')"
                    >Create sales order</MpPopoverListItem
                  >
                  <MpPopoverListItem role="menuitem" @click="onAction('create-invoice')"
                    >Create invoice</MpPopoverListItem
                  >
                  <MpPopoverListItem role="menuitem" @click="onAction('create-proforma')"
                    >Create pro forma invoice</MpPopoverListItem
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
          <span :class="modalTitleClass">Delete quotation?</span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="body" color="gray.700">
            This will permanently remove <strong>{{ quotation?.number }}</strong
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
  deleteTransactions,
  duplicateTransaction,
  formatCurrency,
  formatDisplayDate,
  getAdjacentTransactionIds,
  getTransactionOfType
} from "~/data/sales-transactions";

// ---------------------------------------------------------------------------
// Cloned from jurnal-frontend-app src/pages/sales/show.vue (the "sq" tab's
// detail page), following the Sales Invoice detail page's zone order — see
// docs/patterns/details-page-format.md. What a quotation does differently: it
// expires rather than falling due, it owes nothing (so the totals stack ends
// at Total, with no balance-due/withholding/deposit rows and no payment
// history), and its Actions menu leads with the documents it converts into.
// ---------------------------------------------------------------------------

const route = useRoute();
const id = computed(() => Number(route.params.id));
const quotation = computed(() => getTransactionOfType(id.value, "quotation"));
const adjacent = computed(() => getAdjacentTransactionIds(id.value));

useHead({
  title: computed(() =>
    quotation.value
      ? `${quotation.value.number} — Mekari Jurnal`
      : "Quotation not found — Mekari Jurnal"
  )
});

const isDeleteModalOpen = ref(false);

function goTo(nextId: number | null) {
  if (nextId) navigateTo(`/sales/quotation/${nextId}`);
}

function onAction(action: string) {
  if (action === "duplicate") {
    const duplicate = quotation.value && duplicateTransaction(quotation.value.id);
    if (duplicate) navigateTo(`/sales/quotation/edit/${duplicate.id}`);
    return;
  }
  if (action === "create-order") {
    navigateTo("/sales/order/new");
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
  void action; // wire the rest to the relevant modal/API call on a real screen
}

function onDelete() {
  isDeleteModalOpen.value = false;
  if (quotation.value) deleteTransactions([quotation.value.id]);
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
