<template>
  <DefaultPageContent
    :title="record ? record.doc.number : `${FULFILLMENT_DOC_LABEL[kind]} not found`"
    :breadcrumb="record ? record.order.orderNumber : boardTitleFallback"
    :breadcrumb-to="record ? orderRoute : '/fulfillment/sales'"
  >
    <template v-if="record" #title-badge>
      <MpBadge for="tableStatus" :type="badge.type">{{ badge.label }}</MpBadge>
    </template>

    <BlankSlate
      v-if="!record"
      :title="`${FULFILLMENT_DOC_LABEL[kind]} not found`"
      description="This document may have been canceled, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/fulfillment/sales')">
        Back to Sales fulfillment
      </MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Zone A — the order this document was raised against. A document has
           no counterparty of its own; it inherits the order's. -->
      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">{{ PERSON_LABEL[record.order.direction] }}</MpText>
          <MpTextlink
            as="button"
            variant="primary"
            :class="textlinkAlignClass"
            @click="navigateTo('/contacts')"
            >{{ record.order.personName }}</MpTextlink
          >
        </div>
        <!-- Delivery address, not a "Fulfillment order" link. A fulfillment
             order takes its number from the sales/purchase order it fulfils,
             so a link here would be the third thing on the page reading
             "Sales Order #24053" — the breadcrumb already goes to the
             fulfillment order and the meta grid already links the source
             order. This makes Zone A identical to the order page's. -->
        <div :class="metaFieldClass">
          <MpText color="gray.600">{{ addressLabel }}</MpText>
          <MpText :class="wrapTextClass">{{ record.order.personAddress || "—" }}</MpText>
        </div>
        <div :class="metaFieldClass">
          <MpText color="gray.600">Warehouse</MpText>
          <MpText>{{ record.order.warehouse || "—" }}</MpText>
        </div>
      </div>

      <MpDivider variant="dashed" :class="dividerClass" />

      <div :class="metaGridClass">
        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">{{ FULFILLMENT_DOC_LABEL[kind] }} no.</MpText>
            <MpText>{{ record.doc.number }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">{{ dateLabel }}</MpText>
            <MpText>{{ formatDisplayDate(record.doc.date) }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Order date</MpText>
            <MpText>{{ formatDisplayDate(record.order.orderDate) }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">{{ SOURCE_ORDER[record.order.direction].label }}</MpText>
            <MpTextlink
              as="button"
              variant="primary"
              :class="textlinkAlignClass"
              @click="
                navigateTo(SOURCE_ORDER[record.order.direction].route(record.order.transactionId))
              "
              >{{ record.order.orderNumber }}</MpTextlink
            >
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Reference no.</MpText>
            <MpText>{{ record.order.referenceNo || "—" }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <template v-if="kind === 'delivery'">
            <div :class="metaFieldClass">
              <MpText color="gray.600">Courier</MpText>
              <MpText>{{ record.doc.courier || "—" }}</MpText>
            </div>
            <div :class="metaFieldClass">
              <MpText color="gray.600">Tracking no.</MpText>
              <MpText>{{ record.doc.trackingNo || "—" }}</MpText>
            </div>
          </template>
          <!-- A receipt note closes a delivery slip, so it points back at the
               one it closed. The link is the reverse of `completedByDocId`,
               resolved by lookup rather than stored twice. -->
          <div v-if="closedDelivery" :class="metaFieldClass">
            <MpText color="gray.600">Delivery slip</MpText>
            <MpTextlink
              as="button"
              variant="primary"
              :class="textlinkAlignClass"
              @click="navigateTo(documentRoute(closedDelivery!))"
              >{{ closedDelivery.number }}</MpTextlink
            >
          </div>
        </div>
      </div>

      <!-- Zone C — only what this document carries. Unlike the order page there
           is one quantity column: a picklist says what was picked, a slip what
           shipped, a receipt what arrived. -->
      <MpTableContainer>
        <MpTable :class="tableFixedClass">
          <colgroup>
            <col style="width: 56%" />
            <col style="width: 16%" />
            <col style="width: 16%" />
            <col style="width: 12%" />
          </colgroup>
          <MpTableHead :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">Product</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Ordered</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">{{ quantityHeader }}</MpTableCell>
              <MpTableCell as="th">Unit</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="row in rows" :key="row.line.id">
              <MpTableCell as="td" :class="wrapCellClass">
                <MpTextlink
                  as="button"
                  variant="primary"
                  :class="textlinkCellClass"
                  @click="navigateTo('/products')"
                  >{{ row.line.product }}</MpTextlink
                >
                <MpText size="body-small" color="gray.600" :class="wrapTextClass">
                  {{ row.line.description || row.line.productCode }}
                </MpText>
              </MpTableCell>
              <MpTableCell as="td" :class="numCellClass">{{ row.line.quantity }}</MpTableCell>
              <MpTableCell as="td" :class="numCellClass">{{ row.quantity }}</MpTableCell>
              <MpTableCell as="td" :class="wrapCellClass">{{ row.line.unit }}</MpTableCell>
            </MpTableRow>

            <MpTableRow>
              <MpTableCell as="td" :class="totalLabelClass">Total units</MpTableCell>
              <MpTableCell as="td" :class="numTotalClass">{{ orderedTotal }}</MpTableCell>
              <MpTableCell as="td" :class="numTotalClass">{{ documentTotal }}</MpTableCell>
              <MpTableCell as="td" />
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <!-- Attachments. Inert, like the Purchase Request page's
           (docs/patterns/details-page-format.md): this prototype models no
           upload or storage, so the rows name the paperwork the source shows
           and nothing downloads. A picklist has none — it is an internal
           worksheet, not a document anything is filed against. -->
      <div v-if="record.doc.attachments.length" :class="attachmentsClass">
        <MpText weight="semiBold" color="dark" :class="attachmentsTitleClass">
          Attachments ({{ record.doc.attachments.length }})
        </MpText>
        <MpFlex direction="column" gap="2">
          <MpFlex v-for="file in record.doc.attachments" :key="file" align-items="center" gap="2">
            <MpIcon name="doc" size="sm" color="gray.400" />
            <MpText size="body-small" :class="wrapTextClass">{{ file }}</MpText>
          </MpFlex>
        </MpFlex>
      </div>

      <MpTextlink
        as="button"
        variant="secondary"
        :class="[lastUpdatedClass, textlinkAlignClass]"
        @click="isAuditModalOpen = true"
      >
        Last updated by {{ record.order.updatedBy }} on
        {{ formatDisplayDate(record.order.updatedAt) }} 09:00:00 AM GMT +7
      </MpTextlink>

      <div :class="bottomActionsClass">
        <MpButton v-if="isCancellable" variant="ghost" @click="isCancelModalOpen = true">
          Cancel {{ FULFILLMENT_DOC_LABEL[kind].toLowerCase() }}
        </MpButton>
        <div v-else />
        <MpFlex gap="2">
          <MpButton variant="secondary" @click="onAction('print')">Print</MpButton>
          <MpButton v-if="nextStep" variant="primary" @click="isNextStepDrawerOpen = true">
            {{ FULFILLMENT_ACTION_LABEL[nextStep] }}
          </MpButton>
        </MpFlex>
      </div>

      <FulfillmentDocumentDrawer
        v-if="nextStepKind"
        :is-open="isNextStepDrawerOpen"
        :order="record.order"
        :kind="nextStepKind"
        :editable-quantities="nextStep === 'receive'"
        @close="isNextStepDrawerOpen = false"
        @submit="onNextStep"
      />

      <FulfillmentAuditModal
        :is-open="isAuditModalOpen"
        :subject="record.doc.number"
        :logs="record.order.logs"
        @close="isAuditModalOpen = false"
      />

      <MpModal :is-open="isCancelModalOpen" size="sm" @close="isCancelModalOpen = false">
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>
            <span :class="modalTitleClass"
              >Cancel this {{ FULFILLMENT_DOC_LABEL[kind].toLowerCase() }}?</span
            >
            <MpModalCloseButton />
          </MpModalHeader>
          <MpModalBody>
            <MpText size="body" color="gray.700">
              {{ record.doc.number }} is removed and {{ record.order.orderNumber }} goes back to
              {{ FULFILLMENT_STATUS_LABEL[stageAfterCancel].toLowerCase() }}. This cannot be undone.
            </MpText>
          </MpModalBody>
          <MpModalFooter>
            <div :class="modalFooterClass">
              <MpButton variant="secondary" @click="isCancelModalOpen = false">Back</MpButton>
              <MpButton variant="danger" @click="onCancelDocument">
                Cancel {{ FULFILLMENT_DOC_LABEL[kind].toLowerCase() }}
              </MpButton>
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
  MpIcon,
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
  MpText,
  MpTextlink
} from "@mekari/pixel3";
import BlankSlate from "~/components/template/BlankSlate.vue";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import FulfillmentAuditModal from "~/components/fulfillment/FulfillmentAuditModal.vue";
import FulfillmentDocumentDrawer from "~/components/fulfillment/FulfillmentDocumentDrawer.vue";
import { textlinkAlignClass, textlinkCellClass } from "~/utils/textlink-align";
import { FULFILLMENT_STATUS_LABEL } from "~/data/fulfillment-status";
import {
  canCancelDocument,
  cancelDocument,
  createDeliveryNote,
  createReceiptNote,
  documentRoute,
  formatDisplayDate,
  FULFILLMENT_ACTION_LABEL,
  FULFILLMENT_DOC_LABEL,
  getFulfillmentDocument,
  nextAction,
  PERSON_LABEL,
  SOURCE_ORDER,
  todayIsoDate,
  type FulfillmentAction,
  type FulfillmentDocKind
} from "~/data/fulfillment";

// ---------------------------------------------------------------------------
// The page for one fulfillment document.
//
// Cloned from jurnal-frontend-app's four standalone document pages —
// outbounds/picking-list, outbounds/sales-delivery, outbounds/delivery-receipt
// and inbounds/receipt-note (3,486 lines between them). They are one screen
// with three substitutions: which date label the document carries, which extra
// fields it has (courier and tracking, on a delivery slip only), and what the
// bottom bar's next step is.
//
// Two things the source pages have that this does not: the per-line
// storage/batch/serial detail column (the inventory-tracking feature, gated
// off — same omission as the process drawer), and a PDF print endpoint. Print
// stays as an inert button, the way every other print action in this prototype
// is.
// ---------------------------------------------------------------------------

const props = defineProps<{ kind: FulfillmentDocKind }>();

const route = useRoute();
const id = computed(() => Number(route.params.id));
// See the note on the same pattern in FulfillmentOrderDetail.vue: the dataset
// is mutated in place, so the wrapper has to be a new object each revision or
// the computeds below hold their cached values.
const revision = ref(0);
const record = computed(() => {
  void revision.value;
  const found = getFulfillmentDocument(id.value, props.kind);
  return found ? { doc: { ...found.doc }, order: { ...found.order } } : undefined;
});

// Only used before `record` resolves, i.e. on the not-found state, where there
// is no order to name.
const boardTitleFallback = "Sales fulfillment";

const addressLabel = computed(() =>
  record.value?.order.direction === "inbound" ? "Vendor address" : "Delivery address"
);

const orderRoute = computed(() => {
  const order = record.value?.order;
  if (!order) return "/fulfillment/sales";
  return `/fulfillment/${order.direction === "outbound" ? "sales" : "purchases"}/${order.id}`;
});

useHead({
  title: computed(() =>
    record.value
      ? `${record.value.doc.number} — Mekari Jurnal`
      : `${FULFILLMENT_DOC_LABEL[props.kind]} not found — Mekari Jurnal`
  )
});

const dateLabel = computed(
  () =>
    ({ picklist: "Picking date", delivery: "Delivery date", receipt: "Receipt date" })[props.kind]
);

const quantityHeader = computed(
  () => ({ picklist: "Picked", delivery: "Delivered", receipt: "Received" })[props.kind]
);

/** A delivery slip is in transit until a receipt note closes it; a picklist and
 *  a receipt note are done the moment they exist. */
const badge = computed<{ label: string; type: "completed" | "information" }>(() => {
  const doc = record.value?.doc;
  if (doc?.kind === "delivery" && !doc.completedByDocId)
    return { label: "In transit", type: "information" };
  return { label: "Completed", type: "completed" };
});

/** On a receipt note: the delivery slip it closed. */
const closedDelivery = computed(() => {
  const current = record.value;
  if (!current || current.doc.kind !== "receipt") return undefined;
  return current.order.documents.find((d) => d.completedByDocId === current.doc.id);
});

const rows = computed(() => {
  const current = record.value;
  if (!current) return [];
  return current.doc.lines
    .map((docLine) => {
      const line = current.order.lines.find((l) => l.id === docLine.lineId);
      return line ? { line, quantity: docLine.quantity } : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
});

const orderedTotal = computed(() => rows.value.reduce((a, r) => a + r.line.quantity, 0));
const documentTotal = computed(() => rows.value.reduce((a, r) => a + r.quantity, 0));

const isCancellable = computed(
  () => !!record.value && canCancelDocument(record.value.order, record.value.doc)
);

/** What cancelling would send the order back to — named in the confirm modal so
 *  the user is told the consequence, not just asked to confirm. */
const stageAfterCancel = computed(() => {
  if (props.kind === "picklist") return "on_process" as const;
  if (props.kind === "delivery") return "picked" as const;
  return record.value?.order.direction === "inbound"
    ? ("new_order" as const)
    : ("delivered" as const);
});

// The lifecycle's next step, offered here as well as on the order page — but
// ONLY the step that follows *this* document: a picklist offers its delivery
// slip, a slip offers its receipt note, a receipt note offers nothing.
//
// Not just `nextAction(order)`. That is the next step for the ORDER, and on a
// picklist whose slip already exists it offered "Create receipt note" — an
// action that closes the delivery slip, on the page of a document it has
// nothing to do with. The source app gates the same button on the next
// document not existing yet (`data?.delivery_date === null`).
const FOLLOWS: Record<FulfillmentDocKind, FulfillmentAction | null> = {
  picklist: "deliver",
  delivery: "complete",
  receipt: null
};
const nextStep = computed(() => {
  if (!record.value) return null;
  const next = nextAction(record.value.order);
  return next && next === FOLLOWS[props.kind] ? next : null;
});
const nextStepKind = computed<FulfillmentDocKind | null>(() => {
  switch (nextStep.value) {
    case "deliver":
      return "delivery";
    case "complete":
    case "receive":
      return "receipt";
    default:
      return null;
  }
});

const isAuditModalOpen = ref(false);
const isCancelModalOpen = ref(false);
const isNextStepDrawerOpen = ref(false);

function onNextStep(payload: {
  number: string;
  date: string;
  courier: string;
  trackingNo: string;
  quantities: Record<number, number>;
}) {
  const orderId = record.value?.order.id;
  if (!orderId) return;
  const { number, date, courier, trackingNo, quantities } = payload;
  if (nextStep.value === "deliver")
    createDeliveryNote(orderId, { number, date, courier, trackingNo });
  if (nextStep.value === "complete") createReceiptNote(orderId, { number, date });
  if (nextStep.value === "receive") createReceiptNote(orderId, { number, date, quantities });
  isNextStepDrawerOpen.value = false;
  revision.value += 1;
}

function onCancelDocument() {
  isCancelModalOpen.value = false;
  const target = orderRoute.value;
  cancelDocument(id.value, todayIsoDate());
  // The document no longer exists, so this page has nothing left to show —
  // go to the order it belonged to rather than leaving a not-found behind.
  navigateTo(target);
}

function onAction(what: string) {
  void what; // Print opens nothing in this prototype — there is no PDF endpoint
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
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });
const wrapTextClass = css({ whiteSpace: "normal!", wordBreak: "break-word" });

const tableFixedClass = css({ tableLayout: "fixed", width: "full" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
const numTotalClass = css({ textAlign: "right", fontWeight: "semiBold" });
const totalLabelClass = css({ textAlign: "right", fontWeight: "semiBold" });
// On a <td>: wrapping only — a table cell must stay `display: table-cell`.
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });

const attachmentsClass = css({ mt: 6 });
const attachmentsTitleClass = css({ display: "block", mb: 2 });

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
