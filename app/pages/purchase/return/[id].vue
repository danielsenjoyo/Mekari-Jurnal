<template>
  <DefaultPageContent
    :title="record ? record.number : 'Purchase return not found'"
    breadcrumb="Purchases"
    breadcrumb-to="/purchase"
  >
    <template v-if="record" #title-badge>
      <MpBadge for="tableStatus" :type="PURCHASE_STATUS_TYPE[record.status]">
        {{ PURCHASE_STATUS_LABEL[record.status] }}
      </MpBadge>
    </template>

    <template v-if="record" #actions>
      <MpTooltip label="Previous return">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-left"
          aria-label="Previous return"
          :is-disabled="!adjacent.prevId"
          @click="goTo(adjacent.prevId)"
        />
      </MpTooltip>
      <MpTooltip label="Next return">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-right"
          aria-label="Next return"
          :is-disabled="!adjacent.nextId"
          @click="goTo(adjacent.nextId)"
        />
      </MpTooltip>
    </template>

    <BlankSlate
      v-if="!record"
      title="Purchase return not found"
      description="This purchase return may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/purchase')">Back to Purchases</MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Zone A — vendor / email / total return. The headline figure is
           "Total return", not "Balance due": a return is money coming back,
           so framing it as an outstanding debt would read backwards. -->
      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Vendor</MpText>
          <MpTextlink
            :class="textlinkAlignClass"
            as="button"
            variant="primary"
            @click="onAction('view-vendor')"
            >{{ record.vendorName }}</MpTextlink
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
            >Total return {{ formatCurrency(record.total) }}</MpText
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

      <!-- Meta grid. The Invoice no. is a live link back to the record this
           return credits — the pair is only navigable in that direction,
           since a return is always raised from its invoice. -->
      <div :class="metaGridClass">
        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Vendor address</MpText>
            <MpText>{{ record.vendorAddress || "—" }}</MpText>
          </div>
          <div :class="metaFieldClass">
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
            <MpText color="gray.600">Shipping date</MpText>
            <MpText>{{
              record.shippingDateSort ? formatDisplayDate(record.shippingDateSort) : "—"
            }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Invoice no.</MpText>
            <MpTextlink
              v-if="linkedInvoice"
              as="button"
              variant="primary"
              :class="textlinkCellClass"
              @click="navigateTo(`/purchase/invoice/${linkedInvoice.id}`)"
            >
              {{ linkedInvoice.number }}
            </MpTextlink>
            <MpText v-else>—</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Invoice date</MpText>
            <MpText>{{
              linkedInvoice ? formatDisplayDate(linkedInvoice.transactionDateSort) : "—"
            }}</MpText>
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
              <MpTag v-for="tag in record.tags" :key="tag" variant="gray" size="sm">{{
                tag
              }}</MpTag>
            </MpFlex>
            <MpText v-else>—</MpText>
          </div>
        </div>
      </div>

      <!-- Zone C — returned line items. -->
      <MpTableContainer :class="scrollShadowClass">
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

          <MpDivider variant="dashed" :class="dividerClass" />

          <div :class="totalsRowClass">
            <MpText size="h3" weight="semiBold">Total</MpText>
            <MpText size="h3" weight="semiBold">{{ formatCurrency(record.total) }}</MpText>
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

      <div :class="bottomActionsClass">
        <MpButton
          v-if="record.status !== 'closed'"
          variant="ghost"
          @click="isDeleteModalOpen = true"
          >Delete</MpButton
        >
        <div v-else />
        <MpFlex gap="2">
          <MpButton variant="secondary" @click="navigateTo(`/purchase/return/edit/${record.id}`)"
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
                    >Print</MpPopoverListItem
                  >
                  <MpPopoverListItem role="menuitem" @click="onAction('share')"
                    >Share</MpPopoverListItem
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
                  <MpPopoverListItem role="menuitem" @click="onDuplicate"
                    >Duplicate transaction</MpPopoverListItem
                  >
                  <MpPopoverListItem
                    v-if="linkedInvoice"
                    role="menuitem"
                    @click="navigateTo(`/purchase/invoice/${linkedInvoice.id}`)"
                  >
                    View purchase invoice
                  </MpPopoverListItem>
                </MpPopoverList>
              </MpPopoverContent>
            </template>
          </MpPopover>
        </MpFlex>
      </div>

      <MpModal :is-open="isDeleteModalOpen" size="sm" @close="isDeleteModalOpen = false">
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>
            <span :class="modalTitleClass">Delete {{ record.number }}?</span>
            <MpModalCloseButton />
          </MpModalHeader>
          <MpModalBody>
            <MpText size="body" color="gray.700">This can't be undone.</MpText>
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
import { PURCHASE_STATUS_LABEL, PURCHASE_STATUS_TYPE } from "~/data/purchase-status";
import {
  deleteTransactions,
  duplicateTransaction,
  formatCurrency,
  formatDisplayDate,
  getAdjacentTransactionIds,
  getPurchaseTransactionById,
  getTransactionOfType
} from "~/data/purchase-transactions";

// ---------------------------------------------------------------------------
// Purchase Return detail. Ported from jurnal-frontend-app
// src/pages/purchases/returns/show.vue.
//
// What makes this type different from the other six: it is never standalone.
// A return credits back part of one specific Invoice, so the meta grid carries
// that invoice's number and date as live fields, and the reference app reaches
// this screen's create form from the invoice's own Actions menu rather than
// from a list tab (there is no Return tab in the purchases index — here or
// there). See docs/patterns/details-page-format.md.
// ---------------------------------------------------------------------------

const route = useRoute();
const recordId = computed(() => Number(route.params.id));
const record = computed(() => getTransactionOfType(recordId.value, "return"));

const linkedInvoice = computed(() =>
  record.value?.linkedInvoiceId != null
    ? getPurchaseTransactionById(record.value.linkedInvoiceId)
    : undefined
);

const adjacent = computed(() => getAdjacentTransactionIds(recordId.value));
const isDeleteModalOpen = ref(false);

useHead({
  title: computed(() => `${record.value?.number ?? "Purchase return not found"} — Mekari Jurnal`)
});

function goTo(id: number | null) {
  if (id) navigateTo(`/purchase/return/${id}`);
}

function onAction(action: string) {
  void action; // inert in this prototype, same as the other detail pages
}

// Clones the return into a new draft and opens it in the edit form.
function onDuplicate() {
  const duplicate = record.value && duplicateTransaction(record.value.id);
  if (duplicate) navigateTo(`/purchase/return/edit/${duplicate.id}`);
}

function onDelete() {
  isDeleteModalOpen.value = false;
  if (record.value) deleteTransactions([record.value.id]);
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
  gap: 1,
  textAlign: "right"
});
const dividerClass = css({ my: 6 });
const metaGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 6,
  alignItems: "start",
  mb: 8
});
const metaColClass = css({ display: "flex", flexDirection: "column", gap: 5 });
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });

const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});
const tableFixedClass = css({ tableLayout: "fixed", width: "full", minWidth: "900px" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
// On a <td>: wrapping only. NEVER set `display` here — a table cell must stay
// `display: table-cell`, or it drops out of the table's column model and the
// rows render visibly ragged (see docs/patterns/details-page-format.md).
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
// On an inline child inside a cell (MpTag / MpTextlink) that ships its own nowrap.
const wrapInlineClass = css({
  whiteSpace: "normal!",
  wordBreak: "break-word",
  maxWidth: "full",
  display: "inline-block",
  textAlign: "left"
});
const lineCaptionClass = css({ display: "block", mt: 3 });

const bottomRowClass = css({
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  flexWrap: "wrap"
});
const notesColClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 5,
  width: "50%",
  minWidth: "260px"
});
const totalsColClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 3,
  width: "40%",
  minWidth: "280px"
});
const totalsRowClass = css({ display: "flex", justifyContent: "space-between", gap: 3 });

const lastUpdatedClass = css({ display: "inline-block", mt: 8 });
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
