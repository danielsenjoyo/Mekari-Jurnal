<template>
  <DefaultPageContent
    :title="record ? record.number : 'Join invoice not found'"
    breadcrumb="Sales"
    breadcrumb-to="/sales"
  >
    <template v-if="record" #title-badge>
      <MpBadge for="tableStatus" :type="SALES_STATUS_TYPE[record.status]">
        {{ SALES_STATUS_LABEL[record.status] }}
      </MpBadge>
    </template>

    <template v-if="record" #actions>
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
      v-if="!record"
      title="Join invoice not found"
      description="This join invoice may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/sales')">Back to Sales</MpButton>
    </BlankSlate>

    <template v-else>
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
            >Total remaining billed {{ formatCurrency(record.balanceDue) }}</MpText
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

      <!-- No warehouse, reference no. or tags: a join invoice carries none of
           its own — every one of those belongs to the invoices it bundles. -->
      <div :class="metaGridClass">
        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Billing address</MpText>
            <MpText>{{ record.customerAddress || "—" }}</MpText>
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
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Transaction no.</MpText>
            <MpText>{{ record.number }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Terms of payment</MpText>
            <MpText>{{ record.term || "—" }}</MpText>
          </div>
        </div>
      </div>

      <!-- The "line items" are whole Invoice records, each a link back to the
           document it stands for — that navigation is the point of the page. -->
      <MpTableContainer>
        <MpTable :class="tableFixedClass">
          <colgroup>
            <col style="width: 24%" />
            <col style="width: 20%" />
            <col style="width: 14%" />
            <col style="width: 14%" />
            <col style="width: 14%" />
            <col style="width: 14%" />
          </colgroup>
          <MpTableHead :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">Sales invoice</MpTableCell>
              <MpTableCell as="th">Description</MpTableCell>
              <MpTableCell as="th">Due date</MpTableCell>
              <MpTableCell as="th">Status</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Amount billed</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Remaining billed</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="inv in joinedInvoices" :key="inv.id">
              <MpTableCell as="td">
                <MpTextlink
                  as="button"
                  variant="primary"
                  :class="textlinkCellClass"
                  @click="navigateTo(`/sales/invoice/${inv.id}`)"
                  >{{ inv.number }}</MpTextlink
                >
              </MpTableCell>
              <MpTableCell as="td" :class="wrapCellClass">{{ inv.memo || "—" }}</MpTableCell>
              <MpTableCell as="td">{{ formatDisplayDate(inv.dueDateSort) }}</MpTableCell>
              <MpTableCell as="td">
                <MpBadge for="tableStatus" :type="SALES_STATUS_TYPE[inv.status]">{{
                  SALES_STATUS_LABEL[inv.status]
                }}</MpBadge>
              </MpTableCell>
              <MpTableCell as="td" :class="numCellClass">{{
                formatCurrency(inv.total)
              }}</MpTableCell>
              <MpTableCell as="td" :class="numCellClass">{{
                formatCurrency(inv.balanceDue)
              }}</MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>
      <MpText size="body-small" color="gray.600" :class="lineCaptionClass">
        Showing {{ joinedInvoices.length }} of {{ joinedInvoices.length }} invoice{{
          joinedInvoices.length === 1 ? "" : "s"
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

        <!-- Two figures only: what the bundle bills, and what is still owed on
             it. There is no tax or discount of its own to show. -->
        <div :class="totalsColClass">
          <div :class="totalsRowClass">
            <MpText weight="semiBold">Total join invoice</MpText>
            <MpText weight="semiBold">{{ formatCurrency(record.total) }}</MpText>
          </div>

          <MpDivider variant="dashed" :class="dividerClass" />

          <div :class="totalsRowClass">
            <MpText size="h3" weight="semiBold">Total remaining billed</MpText>
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

      <div :class="bottomActionsClass">
        <MpButton variant="ghost" @click="isDeleteModalOpen = true">Delete</MpButton>
        <MpFlex gap="2">
          <MpButton variant="secondary" @click="navigateTo(`/sales/join-invoice/edit/${record.id}`)"
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
          <MpButton variant="primary" @click="onAction('receive-payment')"
            >Receive payment</MpButton
          >
        </MpFlex>
      </div>
    </template>

    <!-- Delete confirmation. Deleting a join invoice releases the invoices it
         bundled — they are separate records and outlive it. -->
    <MpModal :is-open="isDeleteModalOpen" size="sm" @close="isDeleteModalOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          <span :class="modalTitleClass">Delete join invoice?</span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="body" color="gray.700">
            This removes <strong>{{ record?.number }}</strong> only — the
            {{ joinedInvoices.length }} invoices it joins stay as they are. This can't be undone.
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
  formatCurrency,
  formatDisplayDate,
  getAdjacentTransactionIds,
  getSalesTransactionById,
  getTransactionOfType,
  type SalesTransaction
} from "~/data/sales-transactions";

// ---------------------------------------------------------------------------
// Cloned from jurnal-frontend-app src/pages/sales/merged_invoices/show.vue.
// The one structural difference from every other detail page here: its "line
// items" are whole Invoice records, and its figures are their sum — so there
// is no tax, discount or product table of its own, and each row links back to
// the invoice it stands for.
// ---------------------------------------------------------------------------

const route = useRoute();
const id = computed(() => Number(route.params.id));
const record = computed(() => getTransactionOfType(id.value, "join_invoice"));
const adjacent = computed(() => getAdjacentTransactionIds(id.value));

const joinedInvoices = computed<SalesTransaction[]>(() =>
  (record.value?.joinedInvoiceIds ?? [])
    .map((invoiceId) => getSalesTransactionById(invoiceId))
    .filter((t): t is SalesTransaction => Boolean(t))
);

useHead({
  title: computed(() =>
    record.value
      ? `${record.value.number} — Mekari Jurnal`
      : "Join invoice not found — Mekari Jurnal"
  )
});

const isDeleteModalOpen = ref(false);

function goTo(nextId: number | null) {
  if (nextId) navigateTo(`/sales/join-invoice/${nextId}`);
}

function onAction(action: string) {
  void action; // wire to the relevant modal/API call on a real screen
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
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });

const tableFixedClass = css({ tableLayout: "fixed", width: "full" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
const lineCaptionClass = css({ mt: 3, mb: 3 });
// On a <td>: wrapping only — NEVER set `display` here, a table cell must stay
// `display: table-cell`.
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
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
