<template>
  <DefaultPageContent
    :title="joinInvoice ? joinInvoice.number : 'Join invoice not found'"
    breadcrumb="Purchases"
    breadcrumb-to="/purchase"
  >
    <template v-if="joinInvoice" #title-badge>
      <MpBadge for="tableStatus" :type="PURCHASE_STATUS_TYPE[joinInvoice.status]">
        {{ PURCHASE_STATUS_LABEL[joinInvoice.status] }}
      </MpBadge>
    </template>

    <template v-if="joinInvoice" #actions>
      <MpTooltip label="Previous join invoice">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-left"
          aria-label="Previous join invoice"
          :is-disabled="!adjacent.prevId"
          @click="goTo(adjacent.prevId)"
        />
      </MpTooltip>
      <MpTooltip label="Next join invoice">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-right"
          aria-label="Next join invoice"
          :is-disabled="!adjacent.nextId"
          @click="goTo(adjacent.nextId)"
        />
      </MpTooltip>
    </template>

    <BlankSlate
      v-if="!joinInvoice"
      title="Join invoice not found"
      description="This join invoice may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/purchase')">Back to Purchases</MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Section heading — unique to this page in the reference
           screenshot; no other type has one. -->
      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass"
        >Join Invoice Detail</MpText
      >

      <!-- Zone A — vendor / email / total. No balance-due block: the label
           is "Total join invoice", not "Balance due" — this record's
           number is a sum over its linked invoices (see below), not
           independently priced. -->
      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Vendor</MpText>
          <MpTextlink
            :class="textlinkAlignClass"
            as="button"
            variant="primary"
            @click="onAction('view-vendor')"
            >{{ joinInvoice.vendorName }}</MpTextlink
          >
        </div>

        <div :class="metaFieldClass">
          <MpText color="gray.600">Email</MpText>
          <MpFlex v-if="joinInvoice.email.length" gap="2" flex-wrap="wrap">
            <MpTag
              v-for="email in joinInvoice.email"
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
          <MpText color="gray.600">Total join invoice</MpText>
          <MpText size="h3" weight="semiBold" color="dark">{{
            formatCurrency(joinInvoice.total)
          }}</MpText>
        </div>
      </div>

      <MpDivider variant="dashed" :class="dividerClass" />

      <!-- Meta grid — only 2 columns here, and no Tags/Reference no. rows:
           the reference screenshot doesn't show them for this type. -->
      <div :class="metaGridClass">
        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Transaction no.</MpText>
            <MpText>{{ joinInvoice.number }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Billing address</MpText>
            <MpText>{{ joinInvoice.vendorAddress || "—" }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Transaction date</MpText>
            <MpText>{{ formatDisplayDate(joinInvoice.transactionDateSort) }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Due date</MpText>
            <MpText>{{ formatDisplayDate(joinInvoice.dueDateSort) }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Terms of payment</MpText>
            <MpText>{{ joinInvoice.term }}</MpText>
          </div>
        </div>
      </div>

      <!-- Zone C — the bundled invoices (not product lines: a join invoice
           bills a group of existing invoices together, so its "items" are
           other Purchase Invoice records — see joinedInvoices below). -->
      <MpTableContainer>
        <MpTable :class="tableFixedClass">
          <!-- No Description column: this table lists whole invoices, not line
               items, so it had nothing to put there and rendered "—" on every
               row of every record. Its width went to the two money columns. -->
          <colgroup>
            <col style="width: 30%" />
            <col style="width: 16%" />
            <col style="width: 16%" />
            <col style="width: 19%" />
            <col style="width: 19%" />
          </colgroup>
          <MpTableHead :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">Purchase invoice</MpTableCell>
              <MpTableCell as="th">Due date</MpTableCell>
              <MpTableCell as="th">Status</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Amount billed</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Remaining billed</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="invoice in joinedInvoices" :key="invoice.id">
              <MpTableCell as="td">
                <MpTextlink
                  as="button"
                  variant="primary"
                  :class="textlinkCellClass"
                  @click="navigateTo(`/purchase/invoice/${invoice.id}`)"
                >
                  {{ invoice.number }}
                </MpTextlink>
              </MpTableCell>
              <MpTableCell as="td">{{ formatDisplayDate(invoice.dueDateSort) }}</MpTableCell>
              <MpTableCell as="td">
                <MpBadge for="tableStatus" :type="PURCHASE_STATUS_TYPE[invoice.status]">{{
                  PURCHASE_STATUS_LABEL[invoice.status]
                }}</MpBadge>
              </MpTableCell>
              <MpTableCell as="td" :class="numWrapCellClass">{{
                formatCurrency(invoice.total)
              }}</MpTableCell>
              <MpTableCell as="td" :class="numWrapCellClass">{{
                formatCurrency(invoice.balanceDue)
              }}</MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>
      <!-- "of"/"invoice", not "from"/"products" — matches the reference
           screenshot's copy exactly for this type. -->
      <MpText size="body-small" color="gray.600" :class="lineCaptionClass">
        Showing {{ joinedInvoices.length }} of {{ joinedInvoices.length }} invoice{{
          joinedInvoices.length === 1 ? "" : "s"
        }}
      </MpText>

      <MpDivider variant="dashed" :class="dividerClass" />

      <!-- Message/memo + a single "Total remaining billed" card — the sum
           of the linked invoices' own balances (see
           linkJoinInvoicesToInvoices() in app/data/purchase-transactions.ts).
           No "Last updated by" line: the reference screenshot has none for
           this type. The reference also showed no bottom action bar, and this
           page had none — but once a create/edit form existed for the type,
           that left its own edit route unreachable from the UI. A single Edit
           button is the minimum that keeps the type navigable; the Delete /
           Print & share / Actions cluster the other types carry is still
           deliberately absent, since a join invoice is a bundle of other
           invoices rather than a document edited in its own right. -->
      <div :class="bottomRowClass">
        <div :class="notesColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Message</MpText>
            <MpText>{{ joinInvoice.message || "—" }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Memo</MpText>
            <MpText>{{ joinInvoice.memo || "—" }}</MpText>
          </div>
        </div>

        <div :class="totalCardClass">
          <MpText weight="semiBold">Total remaining billed</MpText>
          <MpText weight="semiBold">{{ formatCurrency(joinInvoice.balanceDue) }}</MpText>
        </div>
      </div>

      <div :class="bottomActionsClass">
        <MpButton
          variant="secondary"
          @click="navigateTo(`/purchase/join-invoice/edit/${joinInvoice.id}`)"
          >Edit</MpButton
        >
      </div>
    </template>
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  css,
  MpBadge,
  MpButton,
  MpDivider,
  MpFlex,
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
  formatCurrency,
  formatDisplayDate,
  getAdjacentTransactionIds,
  getPurchaseTransactionById,
  type PurchaseTransaction
} from "~/data/purchase-transactions";

// ---------------------------------------------------------------------------
// Sixth details page in this repo (after Invoice, Order, Request, Quote,
// Delivery), built directly against a screenshot of the real product's Join
// Invoice detail screen — and the first one that departs from the shared
// shell in real ways, not just field/label substitutions:
//   - its own numbering scheme ("Join Invoice - 10002", not "… #14039" —
//     see numberForTransaction() in app/data/purchase-transactions.ts)
//   - an extra "Join Invoice Detail" section heading
//   - a 2-column meta grid (every other type uses 3) with no Tags/Reference
//     no. rows
//   - the "items" table lists *other Invoice records* this join invoice
//     bundles for combined billing, not product lines (see joinedInvoices
//     below — reusing linkJoinInvoicesToInvoices() the same way Order/
//     Delivery reuse their own cross-type link)
//   - no "Last updated by" line and no bottom action bar at all — a join
//     invoice reads as a read-only rollup, not a document you edit/delete
//     directly here
// Detail page only for now — no New/Edit form for Join Invoice (there's no
// bottom bar to put one in anyway).
// ---------------------------------------------------------------------------

const route = useRoute();
const id = computed(() => Number(route.params.id));
const joinInvoice = computed(() => {
  const t = getPurchaseTransactionById(id.value);
  return t && t.type === "join_invoice" ? t : undefined;
});
const joinedInvoices = computed<PurchaseTransaction[]>(() => {
  if (!joinInvoice.value) return [];
  return joinInvoice.value.joinedInvoiceIds
    .map((invId) => getPurchaseTransactionById(invId))
    .filter((inv): inv is PurchaseTransaction => Boolean(inv));
});
const adjacent = computed(() => getAdjacentTransactionIds(id.value));

useHead({
  title: computed(() =>
    joinInvoice.value
      ? `${joinInvoice.value.number} — Mekari Jurnal`
      : "Join invoice not found — Mekari Jurnal"
  )
});

function goTo(nextId: number | null) {
  if (nextId) navigateTo(`/purchase/join-invoice/${nextId}`);
}

function onAction(action: string) {
  void action; // wire to the relevant modal/detail page on a real screen
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const sectionHeadingClass = css({ mb: 4 });

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
// width, which lets a long value (the email tag below, e.g.) overflow past
// its column instead of wrapping within it.
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });

const tableFixedClass = css({ tableLayout: "fixed", width: "full" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
// Same nowrap-overflow fix as wrapCellClass below, but right-aligned — for
// currency cells, which can overflow their column just as easily as text.
const numWrapCellClass = css({
  textAlign: "right",
  whiteSpace: "normal!",
  wordBreak: "break-word"
});
const lineCaptionClass = css({ mt: 3, mb: 3 });
// MpTableCell/MpTextlink/MpTag default to white-space:nowrap + overflow:visible,
// so text longer than its column spills into the next cell instead of
// wrapping — see docs/patterns/TablePage.md's truncation gotcha.
// On an inline child inside a cell (MpTag / MpTextlink) that ships its own
// nowrap. NEVER put `display: inline-block` on the <td> itself — a table cell
// must stay `display: table-cell`, or it drops out of the table's column model
// and the row borders render ragged against each cell's content width.
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
const bottomActionsClass = css({
  display: "flex",
  justifyContent: "flex-end",
  gap: 2,
  mt: 8,
  pt: 5,
  borderTopWidth: "sm",
  borderColor: "gray.100"
});
const totalCardClass = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "40%",
  minWidth: "240px",
  height: "fit-content",
  p: 4,
  borderWidth: "sm",
  borderColor: "gray.100",
  rounded: "md"
});
</script>
