<template>
  <DefaultPageContent
    :title="delivery ? delivery.number : 'Delivery not found'"
    breadcrumb="Purchases"
    breadcrumb-to="/purchase"
  >
    <template v-if="delivery" #title-badge>
      <MpBadge for="tableStatus" :type="PURCHASE_STATUS_TYPE[delivery.status]">
        {{ PURCHASE_STATUS_LABEL[delivery.status] }}
      </MpBadge>
    </template>

    <template v-if="delivery" #actions>
      <MpTooltip label="Previous delivery">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-left"
          aria-label="Previous delivery"
          :is-disabled="!adjacent.prevId"
          @click="goTo(adjacent.prevId)"
        />
      </MpTooltip>
      <MpTooltip label="Next delivery">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-right"
          aria-label="Next delivery"
          :is-disabled="!adjacent.nextId"
          @click="goTo(adjacent.nextId)"
        />
      </MpTooltip>
    </template>

    <BlankSlate
      v-if="!delivery"
      title="Delivery not found"
      description="This delivery may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/purchase')">Back to Purchases</MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Zone A — vendor / email. No balance-due block: a delivery is a
           goods movement, not priced — just a "View journal entry" link on
           the right, same as the other types have (a delivery still posts
           an inventory journal entry even with no monetary line items). -->
      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Vendor</MpText>
          <MpTextlink
            :class="textlinkAlignClass"
            as="button"
            variant="primary"
            @click="onAction('view-vendor')"
            >{{ delivery.vendorName }}</MpTextlink
          >
        </div>

        <div :class="metaFieldClass">
          <MpText color="gray.600">Email</MpText>
          <MpFlex v-if="delivery.email.length" gap="2" flex-wrap="wrap">
            <MpTag
              v-for="email in delivery.email"
              :key="email"
              variant="gray"
              size="sm"
              :class="wrapInlineClass"
              >{{ email }}</MpTag
            >
          </MpFlex>
          <MpText v-else>—</MpText>
        </div>

        <div :class="journalColClass">
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

      <!-- Meta grid — shipping details / identifiers & the originating
           order (when one is linked — see linkedOrder below) & tags. -->
      <div :class="metaGridClass">
        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Shipping address</MpText>
            <MpText>{{ delivery.vendorAddress || "—" }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Shipping date</MpText>
            <MpText>{{ formatDisplayDate(delivery.transactionDateSort) }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Ship via</MpText>
            <MpText>{{ delivery.shipVia || "—" }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Tracking no.</MpText>
            <MpText>{{ delivery.trackingNo || "—" }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Transaction no.</MpText>
            <MpText>{{ delivery.number }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Reference no.</MpText>
            <MpText>{{ delivery.referenceNo || "—" }}</MpText>
          </div>
          <div v-if="linkedOrder" :class="metaFieldClass">
            <MpText color="gray.600">Order no.</MpText>
            <MpTextlink
              :class="textlinkAlignClass"
              as="button"
              variant="primary"
              @click="navigateTo(`/purchase/order/${linkedOrder!.id}`)"
              >{{ linkedOrder.number }}</MpTextlink
            >
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Tags</MpText>
            <MpFlex v-if="delivery.tags.length" gap="2" flex-wrap="wrap">
              <MpTag v-for="tag in delivery.tags" :key="tag" variant="gray" size="sm">{{
                tag
              }}</MpTag>
            </MpFlex>
            <MpText v-else>—</MpText>
          </div>
        </div>
      </div>

      <!-- Zone C — shipped items (compact: no checkbox, sort, or
           pagination — and no pricing columns, matching a goods-movement
           record). -->
      <MpTableContainer>
        <MpTable :class="tableFixedClass">
          <colgroup>
            <col style="width: 30%" />
            <col style="width: 40%" />
            <col style="width: 15%" />
            <col style="width: 15%" />
          </colgroup>
          <MpTableHead :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">Product</MpTableCell>
              <MpTableCell as="th">Description</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Qty</MpTableCell>
              <MpTableCell as="th">Units</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="line in delivery.lines" :key="line.id">
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
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>
      <MpText size="body-small" color="gray.600" :class="lineCaptionClass">
        Showing {{ delivery.lines.length }} from {{ delivery.lines.length }} product{{
          delivery.lines.length === 1 ? "" : "s"
        }}
      </MpText>

      <MpDivider variant="dashed" :class="dividerClass" />

      <!-- Message/memo — no totals or item-count card at all: unlike
           Request (which at least counts items), the reference screenshot
           has nothing here beyond notes. -->
      <div :class="metaFieldClass">
        <MpText color="gray.600">Message</MpText>
        <MpText>{{ delivery.message || "—" }}</MpText>
      </div>
      <div :class="[metaFieldClass, memoSpacingClass]">
        <MpText color="gray.600">Memo</MpText>
        <MpText>{{ delivery.memo || "—" }}</MpText>
      </div>

      <MpTextlink
        as="button"
        variant="secondary"
        :class="[lastUpdatedClass, textlinkAlignClass]"
        @click="onAction('view-audit-log')"
      >
        Last updated by Rizal Candra on
        {{ formatDisplayDate(delivery.transactionDateSort) }} 09:00:00 AM GMT +7
      </MpTextlink>

      <!-- Bottom action bar — Delete on the left (hidden once the delivery
           is Closed), then Preview delivery + Create invoice on the right
           (no Print & share / Actions dropdowns here — the real product's
           action set for a delivery is just these two plain buttons). No
           "Edit" yet: Purchase Delivery has no edit form in this prototype
           (see docs/patterns/details-page-format.md — the reference
           screenshot shows one, but only Invoice has a real edit form so
           far). "Preview delivery" and "Create invoice" are inert here too
           — same UI-only-prototype convention as every other action on
           these pages (View vendor, Print preview, …). -->
      <div :class="bottomActionsClass">
        <MpButton
          v-if="delivery.status !== 'closed'"
          variant="ghost"
          @click="isDeleteModalOpen = true"
          >Delete</MpButton
        >
        <div v-else />
        <MpFlex gap="2">
          <MpButton
            variant="secondary"
            @click="navigateTo(`/purchase/delivery/edit/${delivery.id}`)"
            >Edit</MpButton
          >
          <MpButton variant="secondary" @click="onAction('preview-delivery')"
            >Preview delivery</MpButton
          >
          <MpButton variant="primary" @click="onAction('create-invoice')">Create invoice</MpButton>
        </MpFlex>
      </div>
    </template>

    <!-- Delete confirmation — destructive action, per docs/patterns/Modal.md. -->
    <MpModal :is-open="isDeleteModalOpen" size="sm" @close="isDeleteModalOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          <span :class="modalTitleClass">Delete delivery?</span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="body" color="gray.700">
            This will permanently remove <strong>{{ delivery?.number }}</strong
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
  formatDisplayDate,
  getAdjacentTransactionIds,
  getPurchaseTransactionById,
  getPurchaseTransactions
} from "~/data/purchase-transactions";

// ---------------------------------------------------------------------------
// Fifth details page in this repo (after Invoice, Order, Request, Quote),
// built directly against a screenshot of the real product's Purchase
// Delivery detail screen — reusing the shell/meta-grid/table shape from the
// other four (see docs/patterns/details-page-format.md), but: no balance-due
// block (just "View journal entry"), shipping-specific fields (Shipping
// address/date, Ship via, Tracking no.) instead of billing ones, an "Order
// no." link found by reverse-looking-up which Order links to this delivery
// (Order → Delivery is already modeled via linkedDeliveryId — see
// app/data/purchase-transactions.ts), no pricing on the items table, no
// totals/item-count block at all, and a different bottom-bar action set
// (Preview delivery + Create invoice, not Print & share / Actions). Detail
// page only for now — no New/Edit form for Purchase Delivery yet, and no
// Duplicate action either (not shown on the reference screenshot).
// ---------------------------------------------------------------------------

const route = useRoute();
const id = computed(() => Number(route.params.id));
const delivery = computed(() => {
  const t = getPurchaseTransactionById(id.value);
  return t && t.type === "delivery" ? t : undefined;
});
// Reverse lookup: which Order (if any) links to this delivery.
const linkedOrder = computed(() => {
  if (!delivery.value) return undefined;
  return getPurchaseTransactions().find(
    (t) => t.type === "order" && t.linkedDeliveryId === delivery.value!.id
  );
});
const adjacent = computed(() => getAdjacentTransactionIds(id.value));

useHead({
  title: computed(() =>
    delivery.value
      ? `${delivery.value.number} — Mekari Jurnal`
      : "Delivery not found — Mekari Jurnal"
  )
});

const isDeleteModalOpen = ref(false);

function goTo(nextId: number | null) {
  if (nextId) navigateTo(`/purchase/delivery/${nextId}`);
}

function onAction(action: string) {
  void action; // wire to the relevant modal/API call/detail page on a real screen
}

function onDelete() {
  isDeleteModalOpen.value = false;
  if (delivery.value) deleteTransactions([delivery.value.id]);
  navigateTo("/purchase");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const topRowClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 6,
  alignItems: "start"
});
const journalColClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
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
// width, which lets a long value (the email tag below, e.g.) overflow past
// its column instead of wrapping within it.
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });
const memoSpacingClass = css({ mt: 4, mb: 6 });

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
