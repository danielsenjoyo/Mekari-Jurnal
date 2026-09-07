<template>
  <DefaultPageContent
    :title="request ? request.number : 'Request not found'"
    breadcrumb="Purchases"
    breadcrumb-to="/purchase"
  >
    <template v-if="request" #title-badge>
      <MpBadge for="tableStatus" :type="PURCHASE_STATUS_TYPE[request.status]">
        {{ PURCHASE_STATUS_LABEL[request.status] }}
      </MpBadge>
    </template>

    <template v-if="request" #actions>
      <MpTooltip label="Previous request">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-left"
          aria-label="Previous request"
          :is-disabled="!adjacent.prevId"
          @click="goTo(adjacent.prevId)"
        />
      </MpTooltip>
      <MpTooltip label="Next request">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-right"
          aria-label="Next request"
          :is-disabled="!adjacent.nextId"
          @click="goTo(adjacent.nextId)"
        />
      </MpTooltip>
    </template>

    <BlankSlate
      v-if="!request"
      title="Request not found"
      description="This request may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/purchase')">Back to Purchases</MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Zone A — requestor / urgency. A request has no monetary total (no
           vendor chosen or price committed yet), so there's no balance-due
           block here — the third column is deliberately empty, matching the
           reference screenshot. -->
      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Requestor</MpText>
          <MpText>{{ request.requestorName || "—" }}</MpText>
        </div>

        <div :class="metaFieldClass">
          <MpText color="gray.600">Urgency level</MpText>
          <MpFlex v-if="request.urgency" gap="2" align-items="center">
            <MpIcon :name="`priority-${request.urgency.priority}`" size="sm" />
            <MpText>{{ request.urgency.label }}</MpText>
          </MpFlex>
          <MpText v-else>—</MpText>
        </div>
      </div>

      <MpDivider variant="dashed" :class="dividerClass" />

      <!-- Meta grid — requestor identity / vendor (optional at request time)
           / budget & tags. -->
      <div :class="metaGridClass">
        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Procurement staff</MpText>
            <MpText>{{ request.procurementStaff || "—" }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Email</MpText>
            <MpText>{{ request.requestorEmail || "—" }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Transaction date</MpText>
            <MpText>{{ formatDisplayDate(request.transactionDateSort) }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Due date</MpText>
            <MpText>{{ formatDisplayDate(request.dueDateSort) }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Vendor name</MpText>
            <MpTextlink
              v-if="request.vendorName"
              :class="textlinkAlignClass"
              as="button"
              variant="primary"
              @click="onAction('view-vendor')"
              >{{ request.vendorName }}</MpTextlink
            >
            <MpText v-else>—</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Vendor email</MpText>
            <MpText>{{ request.email[0] || "—" }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Vendor address</MpText>
            <MpText>{{ request.vendorAddress || "—" }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Related budget year</MpText>
            <MpText>{{ request.relatedBudgetYear || "—" }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Tags</MpText>
            <MpFlex v-if="request.tags.length" gap="2" flex-wrap="wrap">
              <MpTag v-for="tag in request.tags" :key="tag" variant="gray" size="sm">{{
                tag
              }}</MpTag>
            </MpFlex>
            <MpText v-else>—</MpText>
          </div>
        </div>
      </div>

      <!-- Zone C — requested items (compact: no checkbox, sort, or
           pagination — and no pricing columns, since nothing's been costed
           yet at request time). -->
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
            <MpTableRow v-for="line in request.lines" :key="line.id">
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
      <!-- "product", singular, regardless of count — matches the reference
           screenshot's copy exactly (Invoice/Order both pluralize; this
           screen doesn't). -->
      <MpText size="body-small" color="gray.600" :class="lineCaptionClass">
        Showing {{ request.lines.length }} from {{ request.lines.length }} product
      </MpText>

      <MpDivider variant="dashed" :class="dividerClass" />

      <!-- Message/memo + a plain item-count card (no pricing, so no
           subtotal/tax/total/balance block here). -->
      <div :class="bottomRowClass">
        <div :class="notesColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Message</MpText>
            <MpText>{{ request.message || "—" }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Memo</MpText>
            <MpText>{{ request.memo || "—" }}</MpText>
          </div>
        </div>

        <div :class="totalItemsCardClass">
          <MpText weight="semiBold">Total items</MpText>
          <MpText weight="semiBold">{{ request.lines.length }} Items</MpText>
        </div>
      </div>

      <!-- Attachments — a static illustrative entry (no real file upload/
           storage modeled in this prototype); download is inert. -->
      <div :class="attachmentsClass">
        <MpText color="gray.600" :class="attachmentsHeadingClass">Attachments (1)</MpText>
        <MpFlex align-items="center" gap="3">
          <MpIcon name="doc" size="md" color="gray.400" />
          <div :class="metaFieldClass">
            <MpTextlink
              :class="textlinkAlignClass"
              as="button"
              variant="primary"
              @click="onAction('download-attachment')"
              >Request_Attachment.pdf</MpTextlink
            >
            <MpText size="body-small" color="gray.600">248.2 KB</MpText>
          </div>
        </MpFlex>
      </div>

      <MpTextlink
        as="button"
        variant="secondary"
        :class="[lastUpdatedClass, textlinkAlignClass]"
        @click="onAction('view-audit-log')"
      >
        Last updated by {{ request.requestorName || "Rizal Candra" }} on
        {{ formatDisplayDate(request.transactionDateSort) }} 09:00:00 AM GMT +7
      </MpTextlink>

      <!-- Bottom action bar — Delete on the left (hidden once the request is
           Closed), everything else on the right. No "Edit" yet: Purchase
           Request has no edit form in this prototype (see docs/patterns/
           details-page-format.md — the reference screenshot shows one, but
           only Invoice has a real edit form so far). -->
      <div :class="bottomActionsClass">
        <MpButton
          v-if="request.status !== 'closed'"
          variant="ghost"
          @click="isDeleteModalOpen = true"
          >Delete</MpButton
        >
        <div v-else />
        <MpFlex gap="2">
          <MpButton variant="secondary" @click="navigateTo(`/purchase/request/edit/${request.id}`)"
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
                  <MpPopoverListItem role="menuitem" @click="onAction('convert-to-order')"
                    >Convert to purchase order</MpPopoverListItem
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
          <span :class="modalTitleClass">Delete request?</span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="body" color="gray.700">
            This will permanently remove <strong>{{ request?.number }}</strong
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
  MpIcon,
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
  formatDisplayDate,
  getAdjacentTransactionIds,
  getPurchaseTransactionById
} from "~/data/purchase-transactions";

// ---------------------------------------------------------------------------
// Third details page in this repo (after Invoice, Order), built directly
// against a screenshot of the real product's Purchase Request detail screen
// — reusing the shell/meta-grid/table/bottom-bar shape from
// app/pages/purchase/invoice/[id].vue and .../order/[id].vue (see
// docs/patterns/details-page-format.md), but a Request has no monetary
// total: no balance-due block up top, no price/discount/amount columns on
// the items table (nothing's been costed yet), and just an item-count card
// instead of subtotal/tax/total/balance. Adds a requestor identity (distinct
// from the assigned procurement staff and the not-yet-chosen vendor) and a
// static Attachments entry. Detail page only for now — no New/Edit form for
// Purchase Request yet.
// ---------------------------------------------------------------------------

const route = useRoute();
const id = computed(() => Number(route.params.id));
const request = computed(() => {
  const t = getPurchaseTransactionById(id.value);
  return t && t.type === "request" ? t : undefined;
});
const adjacent = computed(() => getAdjacentTransactionIds(id.value));

useHead({
  title: computed(() =>
    request.value ? `${request.value.number} — Mekari Jurnal` : "Request not found — Mekari Jurnal"
  )
});

const isDeleteModalOpen = ref(false);

function goTo(nextId: number | null) {
  if (nextId) navigateTo(`/purchase/request/${nextId}`);
}

function onAction(action: string) {
  if (action === "duplicate") {
    onDuplicate();
    return;
  }
  void action; // wire the rest to the relevant modal/API call/detail page on a real screen
}

// Clones the request into a new draft. Like Order, Purchase Request has no
// edit form yet, so this lands on the duplicate's own detail page.
function onDuplicate() {
  const duplicate = request.value && duplicateTransaction(request.value.id);
  if (duplicate) navigateTo(`/purchase/request/edit/${duplicate.id}`);
}

function onDelete() {
  isDeleteModalOpen.value = false;
  if (request.value) deleteTransactions([request.value.id]);
  navigateTo("/purchase");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const topRowClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 6,
  alignItems: "start"
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
// width, which lets a long value overflow past its column instead of
// wrapping within it.
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });

const tableFixedClass = css({ tableLayout: "fixed", width: "full" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
const lineCaptionClass = css({ mt: 3, mb: 3 });
// MpTableCell/MpTextlink default to white-space:nowrap + overflow:visible, so
// text longer than its column spills into the next cell instead of wrapping
// — see docs/patterns/TablePage.md's truncation gotcha.
// On a <td>: wrapping only. NEVER set `display` here — a table cell must stay
// `display: table-cell`. `inline-block` drops it out of the table's column
// model, so column boundaries and row borders get drawn against each cell's
// own content width instead of the column's, which renders as visibly ragged,
// staggered rows.
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });

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
const totalItemsCardClass = css({
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

const attachmentsClass = css({ mt: 6 });
const attachmentsHeadingClass = css({ mb: 3 });

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
