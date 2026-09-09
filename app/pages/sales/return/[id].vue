<template>
  <DefaultPageContent
    :title="record ? record.number : 'Return not found'"
    breadcrumb="Sales"
    breadcrumb-to="/sales"
  >
    <template v-if="record" #title-badge>
      <MpBadge for="tableStatus" :type="SALES_STATUS_TYPE[record.status]">
        {{ SALES_STATUS_LABEL[record.status] }}
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
      title="Return not found"
      description="This return may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/sales')">Back to Sales</MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Zone A — customer / email / total return. The headline figure is
           "Total return", not "Balance due": a return is money going back to
           the customer, so framing it as an outstanding debt would read
           backwards. -->
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
            <MpText color="gray.600">Billing address</MpText>
            <MpText>{{ record.customerAddress || "—" }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Shipping address</MpText>
            <MpText>{{ record.shippingAddress || "—" }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Return date</MpText>
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
            <MpText color="gray.600">Return no.</MpText>
            <MpText>{{ record.number }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Sales invoice</MpText>
            <MpTextlink
              v-if="linkedInvoice"
              as="button"
              variant="primary"
              :class="textlinkCellClass"
              @click="navigateTo(`/sales/invoice/${linkedInvoice.id}`)"
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
          <!-- Only shown when the return was raised against specific
               deliveries; one made against the whole invoice has none. -->
          <div v-if="sourceDeliveries.length" :class="metaFieldClass">
            <MpText color="gray.600">Delivery no.</MpText>
            <MpFlex gap="2" flex-wrap="wrap">
              <MpTextlink
                v-for="delivery in sourceDeliveries"
                :key="delivery.id"
                as="button"
                variant="primary"
                :class="textlinkCellClass"
                @click="navigateTo(`/sales/delivery/${delivery.id}`)"
                >{{ delivery.number }}</MpTextlink
              >
            </MpFlex>
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
              <MpTableCell as="th" :class="numCellClass">Return qty</MpTableCell>
              <MpTableCell as="th">Units</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Unit price</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Discount</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Amount</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <template v-for="group in lineGroups" :key="group.key">
              <MpTableRow v-if="group.label">
                <MpTableCell as="td" :colspan="7" :class="groupHeaderClass">
                  <MpText size="label" weight="semiBold" color="dark">{{ group.label }}</MpText>
                </MpTableCell>
              </MpTableRow>
              <MpTableRow v-for="line in group.lines" :key="line.id">
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
            </template>
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
            <MpText size="h3" weight="semiBold">Total return</MpText>
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

      <!-- Bottom action bar. The source page's own dropdown for a sales
           return is just "View return template" and "Send via email", so
           those are the two Print & share entries here. -->
      <div :class="bottomActionsClass">
        <MpButton variant="ghost" @click="isDeleteModalOpen = true">Delete</MpButton>
        <MpFlex gap="2">
          <MpButton variant="secondary" @click="navigateTo(`/sales/return/edit/${record.id}`)"
            >Edit</MpButton
          >
          <MpPopover placement="bottom-end" use-portal is-adaptive-width>
            <template #default>
              <MpPopoverTrigger>
                <MpButton variant="secondary" right-icon="caret-down">Print &amp; share</MpButton>
              </MpPopoverTrigger>
              <MpPopoverContent>
                <MpPopoverList>
                  <MpPopoverListItem role="menuitem" @click="onAction('preview-return')"
                    >View return template</MpPopoverListItem
                  >
                  <MpPopoverListItem role="menuitem" @click="onAction('share-email')"
                    >Send via email</MpPopoverListItem
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
                    @click="navigateTo(`/sales/invoice/${linkedInvoice.id}`)"
                  >
                    View sales invoice
                  </MpPopoverListItem>
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
          <span :class="modalTitleClass">Delete return?</span>
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
  deleteTransactions,
  duplicateTransaction,
  formatCurrency,
  formatDisplayDate,
  getAdjacentTransactionIds,
  getSalesTransactionById,
  getTransactionOfType,
  type SalesTransaction
} from "~/data/sales-transactions";

// ---------------------------------------------------------------------------
// Cloned from jurnal-frontend-app src/pages/sales/returns/show.vue, following
// this repo's Purchase Return detail page as the structural reference — see
// docs/patterns/details-page-format.md. What makes it differ from the other
// types: the headline figure is "Total return" rather than "Balance due", the
// meta grid carries the credited invoice's number and date as live fields,
// and the reference app reaches this screen's create form from that invoice's
// own Actions menu rather than from the list.
// ---------------------------------------------------------------------------

const route = useRoute();
const id = computed(() => Number(route.params.id));
const record = computed(() => getTransactionOfType(id.value, "return"));
const linkedInvoice = computed(() =>
  record.value?.linkedInvoiceId != null
    ? getSalesTransactionById(record.value.linkedInvoiceId)
    : undefined
);
const adjacent = computed(() => getAdjacentTransactionIds(id.value));

/** The deliveries this return was raised against, when it was raised against
 *  deliveries at all rather than the invoice as a whole. */
const sourceDeliveries = computed<SalesTransaction[]>(() =>
  (record.value?.deliveryIds ?? [])
    .map((deliveryId) => getSalesTransactionById(deliveryId))
    .filter((t): t is SalesTransaction => Boolean(t))
);

/** Saved lines, split by the delivery they came back on — the same grouping
 *  the form showed while the return was being written. */
const lineGroups = computed(() => {
  const lines = record.value?.lines ?? [];
  if (!sourceDeliveries.value.length) {
    return [{ key: "invoice", label: "", lines }];
  }
  return sourceDeliveries.value
    .map((delivery) => ({
      key: String(delivery.id),
      // Already reads "Sales Delivery #24042" — see the same note on the form.
      label: delivery.number,
      lines: lines.filter((l) => l.deliveryId === delivery.id)
    }))
    .filter((group) => group.lines.length > 0);
});

useHead({
  title: computed(() =>
    record.value ? `${record.value.number} — Mekari Jurnal` : "Return not found — Mekari Jurnal"
  )
});

const isDeleteModalOpen = ref(false);

function goTo(nextId: number | null) {
  if (nextId) navigateTo(`/sales/return/${nextId}`);
}

function onAction(action: string) {
  void action; // wire to the relevant modal/API call/detail page on a real screen
}

function onDuplicate() {
  const duplicate = record.value && duplicateTransaction(record.value.id);
  if (duplicate) navigateTo(`/sales/return/edit/${duplicate.id}`);
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
// minWidth:0 — a grid/flex item's implicit min-width is its content's natural
// width, which lets a long value (the email tag, e.g.) overflow past its
// column instead of wrapping within it.
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });

// Pure-CSS horizontal scroll affordance: the two `local` white gradients sit
// on the content and scroll away with it; the two `scroll` radial shadows are
// pinned to the container's edges, so a table that overflows says so with no
// ResizeObserver and no JS state.
const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});
const tableFixedClass = css({ tableLayout: "fixed", width: "full" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
const lineCaptionClass = css({ mt: 3, mb: 3 });
// MpTableCell defaults to white-space:nowrap + overflow:visible, so text
// longer than its column spills into the next cell instead of wrapping — see
// docs/patterns/TablePage.md's truncation gotcha. On a <td>: wrapping only.
// NEVER set `display` here — a table cell must stay `display: table-cell`.
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
// On an inline child inside a cell (MpTag / MpTextlink) that ships its own
// nowrap — these are not the cell, so an inline-block box is correct here.
// The delivery a run of rows came back on — tinted rather than bold-on-white
// so it reads as a divider between groups, not as another line item.
const groupHeaderClass = css({ bg: "gray.25", py: "2!" });
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
