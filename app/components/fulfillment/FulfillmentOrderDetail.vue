<template>
  <DefaultPageContent
    :title="order ? order.orderNumber : 'Fulfillment order not found'"
    :breadcrumb="boardTitle"
    :breadcrumb-to="boardRoute"
  >
    <template v-if="order" #title-badge>
      <MpBadge for="tableStatus" :type="FULFILLMENT_STATUS_TYPE[order.status]">
        {{ FULFILLMENT_STATUS_LABEL[order.status] }}
      </MpBadge>
      <MpBadge v-if="isPartial" for="additionalInformation" type="warning">
        Partially completed
      </MpBadge>
    </template>

    <template v-if="order" #actions>
      <MpTooltip label="Previous order">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-left"
          aria-label="Previous order"
          :is-disabled="!adjacent.prevId"
          @click="goTo(adjacent.prevId)"
        />
      </MpTooltip>
      <MpTooltip label="Next order">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-right"
          aria-label="Next order"
          :is-disabled="!adjacent.nextId"
          @click="goTo(adjacent.nextId)"
        />
      </MpTooltip>
    </template>

    <BlankSlate
      v-if="!order"
      title="Fulfillment order not found"
      description="This order may have been canceled, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo(boardRoute)">
        Back to {{ boardTitle }}
      </MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Zone A — who the order is with. No money on this page: a fulfillment
           moves goods, so there is no total, no balance and no payment block
           (docs/patterns/details-page-format.md, the Request entry: not every
           record type has money). -->
      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">{{ PERSON_LABEL[direction] }}</MpText>
          <MpTextlink
            as="button"
            variant="primary"
            :class="textlinkAlignClass"
            @click="navigateTo('/contacts')"
            >{{ order.personName }}</MpTextlink
          >
        </div>
        <div :class="metaFieldClass">
          <MpText color="gray.600">{{ addressLabel }}</MpText>
          <MpText :class="wrapTextClass">{{ order.personAddress || "—" }}</MpText>
        </div>
        <div :class="metaFieldClass">
          <MpText color="gray.600">Warehouse</MpText>
          <MpText>{{ order.warehouse || "—" }}</MpText>
        </div>
      </div>

      <MpDivider variant="dashed" :class="dividerClass" />

      <div :class="metaGridClass">
        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Order date</MpText>
            <MpText>{{ formatDisplayDate(order.orderDate) }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Due date</MpText>
            <MpText>{{ formatDisplayDate(order.dueDate) }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">{{ SOURCE_ORDER[direction].label }}</MpText>
            <MpTextlink
              as="button"
              variant="primary"
              :class="textlinkAlignClass"
              @click="navigateTo(SOURCE_ORDER[direction].route(order.transactionId))"
              >{{ order.orderNumber }}</MpTextlink
            >
          </div>
        </div>

        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Reference no.</MpText>
            <MpText>{{ order.referenceNo || "—" }}</MpText>
          </div>
          <div v-if="order.deliveryDate" :class="metaFieldClass">
            <MpText color="gray.600">Delivery date</MpText>
            <MpText>{{ formatDisplayDate(order.deliveryDate) }}</MpText>
          </div>
          <div v-if="order.receiveDate" :class="metaFieldClass">
            <MpText color="gray.600">Receive date</MpText>
            <MpText>{{ formatDisplayDate(order.receiveDate) }}</MpText>
          </div>
          <div v-if="order.courier" :class="metaFieldClass">
            <MpText color="gray.600">Courier</MpText>
            <MpText>{{ order.courier }}</MpText>
          </div>
          <div v-if="order.trackingNo" :class="metaFieldClass">
            <MpText color="gray.600">Tracking no.</MpText>
            <MpText>{{ order.trackingNo }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <!-- Cancel details only exist once it has been canceled, so the whole
               pair is conditional rather than two rows of em dashes. -->
          <template v-if="order.cancelDate">
            <div :class="metaFieldClass">
              <MpText color="gray.600">Cancel date</MpText>
              <MpText>{{ formatDisplayDate(order.cancelDate) }}</MpText>
            </div>
            <!-- Only when there is one. Cancelling from this page does not ask
                 for a reason (neither does the source app), so a row reading
                 "Cancel reason —" would appear on every order canceled here
                 and look like something failed to load. -->
            <div v-if="order.cancelReason" :class="metaFieldClass">
              <MpText color="gray.600">Cancel reason</MpText>
              <MpText :class="wrapTextClass">{{ order.cancelReason }}</MpText>
            </div>
          </template>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Memo</MpText>
            <MpText :class="wrapTextClass">{{ order.memo || "—" }}</MpText>
          </div>
        </div>
      </div>

      <!-- Zone C — the lines, with one quantity column per stage this
           direction actually has. Inbound gets Ordered / Received; outbound
           adds Processed and Delivered between them. -->
      <MpTableContainer>
        <MpTable :class="tableFixedClass">
          <colgroup>
            <col :style="`width: ${productColumnWidth}`" />
            <col v-for="column in quantityColumns" :key="column.key" style="width: 14%" />
            <col style="width: 12%" />
          </colgroup>
          <MpTableHead :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">Product</MpTableCell>
              <MpTableCell
                v-for="column in quantityColumns"
                :key="column.key"
                as="th"
                :class="numCellClass"
                >{{ column.label }}</MpTableCell
              >
              <MpTableCell as="th">Unit</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="line in order.lines" :key="line.id">
              <MpTableCell as="td" :class="wrapCellClass">
                <MpTextlink
                  as="button"
                  variant="primary"
                  :class="textlinkCellClass"
                  @click="navigateTo('/products')"
                  >{{ line.product }}</MpTextlink
                >
                <MpText size="body-small" color="gray.600" :class="wrapTextClass">
                  {{ line.description || line.productCode }}
                </MpText>
              </MpTableCell>
              <MpTableCell
                v-for="column in quantityColumns"
                :key="column.key"
                as="td"
                :class="numCellClass"
                >{{ column.value(line) }}</MpTableCell
              >
              <MpTableCell as="td" :class="wrapCellClass">{{ line.unit }}</MpTableCell>
            </MpTableRow>

            <MpTableRow>
              <MpTableCell as="td" :class="totalLabelClass">Total units</MpTableCell>
              <MpTableCell
                v-for="column in quantityColumns"
                :key="column.key"
                as="td"
                :class="numTotalClass"
                >{{ column.total }}</MpTableCell
              >
              <MpTableCell as="td" />
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <MpDivider variant="dashed" :class="dividerClass" />

      <!-- Zone D — the documents raised against this order. A single-tab strip
           on the inbound side is deliberate: the shape is what matters, and it
           is the same shape as the outbound board's two tabs
           (docs/patterns/details-page-format.md, the Order entry). -->
      <MpTabs v-model="activeTabIndex" variant-color="blue">
        <MpTabList>
          <MpTab v-for="tab in tabs" :key="tab.kind">
            <span :class="tabLabelClass">
              {{ tab.label }}
              <MpBadge v-if="tab.documents.length" for="additionalInformation" type="announcement">
                {{ tab.documents.length }}
              </MpBadge>
            </span>
          </MpTab>
        </MpTabList>
      </MpTabs>

      <div :class="tabPanelClass">
        <MpTableContainer v-if="activeTab.documents.length">
          <MpTable :class="tableFixedClass">
            <colgroup>
              <col style="width: 26%" />
              <col style="width: 20%" />
              <col v-if="activeTab.kind === 'delivery'" style="width: 16%" />
              <col v-if="activeTab.kind === 'delivery'" style="width: 14%" />
              <col style="width: 14%" />
              <col v-if="activeTab.kind === 'delivery'" style="width: 18%" />
            </colgroup>
            <MpTableHead :class="tableHeadClass">
              <MpTableRow>
                <MpTableCell as="th">No.</MpTableCell>
                <MpTableCell as="th">Created date</MpTableCell>
                <MpTableCell v-if="activeTab.kind === 'delivery'" as="th">Courier</MpTableCell>
                <MpTableCell v-if="activeTab.kind === 'delivery'" as="th">Tracking no.</MpTableCell>
                <MpTableCell as="th">Status</MpTableCell>
                <MpTableCell v-if="activeTab.kind === 'delivery'" as="th" />
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow v-for="doc in activeTab.documents" :key="doc.id">
                <MpTableCell as="td" :class="wrapCellClass">
                  <MpTextlink
                    as="button"
                    variant="primary"
                    :class="textlinkCellClass"
                    @click="navigateTo(documentRoute(doc))"
                    >{{ doc.number }}</MpTextlink
                  >
                </MpTableCell>
                <MpTableCell as="td">{{ formatDisplayDate(doc.date) }}</MpTableCell>
                <MpTableCell v-if="activeTab.kind === 'delivery'" as="td" :class="wrapCellClass">{{
                  doc.courier || "—"
                }}</MpTableCell>
                <MpTableCell v-if="activeTab.kind === 'delivery'" as="td" :class="wrapCellClass">{{
                  doc.trackingNo || "—"
                }}</MpTableCell>
                <MpTableCell as="td">
                  <MpBadge for="tableStatus" :type="docStatus(doc).type">
                    {{ docStatus(doc).label }}
                  </MpBadge>
                </MpTableCell>
                <!-- The receipt note that closed this slip. Without it an
                     outbound receipt note has a page nothing links to: the
                     order's tabs are Picklists and Delivery slips, and the
                     receipt's own back-reference points the other way. The
                     source app carries the same "See receipt note" link. -->
                <MpTableCell v-if="activeTab.kind === 'delivery'" as="td">
                  <MpTextlink
                    v-if="receiptFor(doc)"
                    as="button"
                    variant="secondary"
                    :class="textlinkCellClass"
                    @click="navigateTo(documentRoute(receiptFor(doc)!))"
                    >See receipt note</MpTextlink
                  >
                </MpTableCell>
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>

        <BlankSlate
          v-else
          variant="no-data"
          :title="`No ${activeTab.label.toLowerCase()} yet`"
          :description="activeTab.emptyDescription"
        />
      </div>

      <MpTextlink
        as="button"
        variant="secondary"
        :class="[lastUpdatedClass, textlinkAlignClass]"
        @click="onAction('view-audit-log')"
      >
        Last updated by {{ order.updatedBy }} on {{ formatDisplayDate(order.updatedAt) }} 09:00:00
        AM GMT +7
      </MpTextlink>

      <!-- Zone E — cancel on the left, the lifecycle's next step on the right.
           Both are status-conditional: a completed or canceled order offers
           neither, which is the "ask whether the record's current status still
           permits that action" rule from details-page-format.md. -->
      <div :class="bottomActionsClass">
        <MpButton v-if="canCancel(order)" variant="ghost" @click="isCancelModalOpen = true">
          Cancel fulfillment
        </MpButton>
        <div v-else />
        <MpFlex gap="2">
          <MpButton
            v-if="order.status === 'on_process'"
            variant="secondary"
            @click="isUndoProcessModalOpen = true"
          >
            Undo processing
          </MpButton>
          <MpButton v-if="action" variant="primary" @click="openActionDrawer">
            {{ FULFILLMENT_ACTION_LABEL[action] }}
          </MpButton>
        </MpFlex>
      </div>
    </template>

    <template v-if="order">
      <!-- One drawer at a time, gated on which action is next — the two are
           mutually exclusive, since `documentDrawerKind` is null exactly when
           the next action is Process order. With both mounted the page briefly
           carried two live "Save"/"Cancel" pairs, one of them belonging to a
           drawer the user was not looking at; every other screen in this repo
           has exactly one drawer, and this keeps that true here.

           `:is-open` stays *bound* rather than hardcoded `true` behind a
           `v-if` on the open state: MpDrawer animates on the false → true
           transition, so a drawer mounted already-open has no state change to
           animate from. -->
      <FulfillmentProcessDrawer
        v-if="action === 'process'"
        :is-open="openDrawer === 'process'"
        :order="order"
        @close="openDrawer = null"
        @submit="onProcess"
      />
      <FulfillmentDocumentDrawer
        v-if="documentDrawerKind"
        :is-open="openDrawer === 'document'"
        :order="order"
        :kind="documentDrawerKind"
        :editable-quantities="action === 'receive'"
        @close="openDrawer = null"
        @submit="onDocument"
      />

      <!-- Cancelling is destructive and irreversible, so it confirms — see
           docs/patterns/Modal.md. -->
      <MpModal :is-open="isCancelModalOpen" size="sm" @close="isCancelModalOpen = false">
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>
            <span :class="modalTitleClass">Cancel this fulfillment?</span>
            <MpModalCloseButton />
          </MpModalHeader>
          <MpModalBody>
            <MpText size="body" color="gray.700">
              {{ order.orderNumber }} will stop being fulfilled and cannot be reopened. The order
              itself stays as it is.
            </MpText>
          </MpModalBody>
          <MpModalFooter>
            <div :class="modalFooterClass">
              <MpButton variant="secondary" @click="isCancelModalOpen = false">Back</MpButton>
              <MpButton variant="danger" @click="onCancelFulfillment">Cancel fulfillment</MpButton>
            </div>
          </MpModalFooter>
        </MpModalContent>
      </MpModal>

      <MpModal :is-open="isUndoProcessModalOpen" size="sm" @close="isUndoProcessModalOpen = false">
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>
            <span :class="modalTitleClass">Undo processing?</span>
            <MpModalCloseButton />
          </MpModalHeader>
          <MpModalBody>
            <MpText size="body" color="gray.700">
              The processed quantities are cleared and this order goes back to New order. You can
              process it again afterwards.
            </MpText>
          </MpModalBody>
          <MpModalFooter>
            <div :class="modalFooterClass">
              <MpButton variant="secondary" @click="isUndoProcessModalOpen = false">Back</MpButton>
              <MpButton variant="danger" @click="onUndoProcessing">Undo processing</MpButton>
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
  MpTab,
  MpTabList,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpTabs,
  MpText,
  MpTextlink,
  MpTooltip
} from "@mekari/pixel3";
import BlankSlate from "~/components/template/BlankSlate.vue";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import FulfillmentDocumentDrawer from "~/components/fulfillment/FulfillmentDocumentDrawer.vue";
import FulfillmentProcessDrawer from "~/components/fulfillment/FulfillmentProcessDrawer.vue";
import { textlinkAlignClass, textlinkCellClass } from "~/utils/textlink-align";
import { FULFILLMENT_STATUS_LABEL, FULFILLMENT_STATUS_TYPE } from "~/data/fulfillment-status";
import {
  canCancel,
  cancelFulfillment,
  cancelProcessing,
  createDeliveryNote,
  createPicklist,
  createReceiptNote,
  documentRoute,
  formatDisplayDate,
  FULFILLMENT_ACTION_LABEL,
  getAdjacentFulfillmentIds,
  getFulfillmentOrderOfDirection,
  nextAction,
  orderTotals,
  PERSON_LABEL,
  processOrder,
  SOURCE_ORDER,
  todayIsoDate,
  type FulfillmentDoc,
  type FulfillmentDocKind,
  type FulfillmentDirection,
  type FulfillmentLine
} from "~/data/fulfillment";

// ---------------------------------------------------------------------------
// The fulfillment-order detail page, shared by both boards.
//
// Cloned from jurnal-frontend-app's
// src/pages/outbounds/fulfillment-order/index.{vue,ts} (952 + 562 lines) and
// its inbound twin (568 + 395). The two source pages differ in three things —
// the counterparty's label, how many quantity columns the line table has, and
// which documents the tab strip lists — so all three are derived from
// `direction` here rather than being a second copy of the page.
//
// Laid out per docs/patterns/details-page-format.md: identity row, meta grid,
// line-items table, related-records tabs, bottom action bar. The source's own
// layout is close to that already; what changes is that the lifecycle actions
// move OUT of a floating footer and into the documented bottom action bar, and
// the status badge moves next to the title instead of being a second element
// inside the heading row.
// ---------------------------------------------------------------------------

const props = defineProps<{ direction: FulfillmentDirection }>();

const route = useRoute();
const id = computed(() => Number(route.params.id));
// Bumped after every mutation. The dataset is a plain in-memory array that the
// lifecycle helpers write to in place, and an in-place write is not reactive —
// without this the page would still show "New order" after processing one.
const revision = ref(0);

// The spread is load-bearing, not tidiness. `revision` dirties this computed,
// but Vue only propagates to *dependent* computeds when the new value differs
// by `===` — and the record is the same object every time, mutated in place.
// Returning it directly leaves `quantityColumns`, `action` and `tabs` holding
// their cached values: processing an order flipped the status badge (the
// render effect re-read the mutated object for its own reasons) while the
// Processed column stayed at 0 and the button still said "Process order".
// A fresh wrapper each revision gives those computeds something that actually
// changed. `lines` and `documents` are shared by reference on purpose — they
// are re-read through the new wrapper, so their in-place edits show up.
const order = computed(() => {
  void revision.value;
  const found = getFulfillmentOrderOfDirection(id.value, props.direction);
  return found ? { ...found } : undefined;
});
const adjacent = computed(() => getAdjacentFulfillmentIds(id.value));

const boardTitle = computed(() =>
  props.direction === "outbound" ? "Sales fulfillment" : "Purchase fulfillment"
);
const boardRoute = computed(() =>
  props.direction === "outbound" ? "/fulfillment/sales" : "/fulfillment/purchases"
);
const addressLabel = computed(() =>
  props.direction === "outbound" ? "Delivery address" : "Vendor address"
);

useHead({
  title: computed(() =>
    order.value
      ? `${order.value.orderNumber} — Mekari Jurnal`
      : "Fulfillment order not found — Mekari Jurnal"
  )
});

const isPartial = computed(
  () =>
    !!order.value && (order.value.completedPartially || order.value.completedPartiallyAndCanceled)
);

const action = computed(() => (order.value ? nextAction(order.value) : null));

// One column per stage this direction has. Outbound walks Ordered → Processed
// → Delivered → Received; inbound has no middle, so showing those two columns
// would be two columns of zeros on every row.
const quantityColumns = computed(() => {
  const current = order.value;
  if (!current) return [];
  const totals = orderTotals(current);
  const columns: {
    key: string;
    label: string;
    value: (line: FulfillmentLine) => number;
    total: number;
  }[] = [{ key: "ordered", label: "Ordered", value: (l) => l.quantity, total: totals.ordered }];
  if (props.direction === "outbound") {
    columns.push(
      {
        key: "processed",
        label: "Processed",
        value: (l) => l.quantityOnProcess,
        total: totals.processed
      },
      {
        key: "delivered",
        label: "Delivered",
        value: (l) => l.quantityOnDelivery,
        total: totals.delivered
      }
    );
  }
  columns.push({
    key: "received",
    label: "Received",
    value: (l) => l.quantityOnCompleted,
    total: totals.completed
  });
  return columns;
});

// The product column takes whatever the quantity columns leave: 4 quantity
// columns at 14% plus a 12% unit column on outbound, 2 on inbound.
const productColumnWidth = computed(() => `${100 - quantityColumns.value.length * 14 - 12}%`);

const activeTabIndex = ref(0);

const tabs = computed(() => {
  const current = order.value;
  const docs = (kind: FulfillmentDocKind) =>
    current ? current.documents.filter((d) => d.kind === kind) : [];
  if (props.direction === "inbound") {
    return [
      {
        kind: "receipt" as FulfillmentDocKind,
        label: "Receipt notes",
        documents: docs("receipt"),
        emptyDescription: "Receipt notes you create will appear here."
      }
    ];
  }
  return [
    {
      kind: "picklist" as FulfillmentDocKind,
      label: "Picklists",
      documents: docs("picklist"),
      emptyDescription: "Picklists you create will appear here."
    },
    {
      kind: "delivery" as FulfillmentDocKind,
      label: "Delivery slips",
      documents: docs("delivery"),
      emptyDescription: "Delivery slips you create will appear here."
    }
  ];
});

const activeTab = computed(() => tabs.value[activeTabIndex.value] ?? tabs.value[0]!);

/** A document's own state. A delivery slip is in transit until a receipt note
 *  closes it (`completedByDocId`); everything else is done the moment it is
 *  raised. */
/** The receipt note that closed a delivery slip, when one has. */
function receiptFor(doc: FulfillmentDoc): FulfillmentDoc | undefined {
  if (!doc.completedByDocId) return undefined;
  return order.value?.documents.find((d) => d.id === doc.completedByDocId);
}

function docStatus(doc: FulfillmentDoc): {
  label: string;
  type: "completed" | "information";
} {
  if (doc.kind !== "delivery") return { label: "Completed", type: "completed" };
  return doc.completedByDocId
    ? { label: "Completed", type: "completed" }
    : { label: "In transit", type: "information" };
}

const openDrawer = ref<"process" | "document" | null>(null);
const isCancelModalOpen = ref(false);
const isUndoProcessModalOpen = ref(false);

/** Which document the next action raises. `null` while the next action is
 *  Process order, which raises none. */
const documentDrawerKind = computed<FulfillmentDocKind | null>(() => {
  switch (action.value) {
    case "pick":
      return "picklist";
    case "deliver":
      return "delivery";
    case "complete":
    case "receive":
      return "receipt";
    default:
      return null;
  }
});

function openActionDrawer() {
  openDrawer.value = action.value === "process" ? "process" : "document";
}

function goTo(nextId: number | null) {
  if (nextId) navigateTo(`${boardRoute.value}/${nextId}`);
}

function onProcess(quantities: Record<number, number>) {
  processOrder(id.value, quantities, todayIsoDate());
  openDrawer.value = null;
  revision.value += 1;
}

function onDocument(payload: {
  number: string;
  date: string;
  courier: string;
  trackingNo: string;
  quantities: Record<number, number>;
}) {
  const { number, date, courier, trackingNo, quantities } = payload;
  switch (action.value) {
    case "pick":
      createPicklist(id.value, { number, date });
      break;
    case "deliver":
      createDeliveryNote(id.value, { number, date, courier, trackingNo });
      break;
    case "complete":
      createReceiptNote(id.value, { number, date });
      break;
    case "receive":
      createReceiptNote(id.value, { number, date, quantities });
      break;
  }
  openDrawer.value = null;
  revision.value += 1;
}

function onCancelFulfillment() {
  isCancelModalOpen.value = false;
  // No reason: the confirm modal does not ask for one, and inventing a
  // boilerplate string would sit in the same field as the real reasons the
  // seeded records carry.
  cancelFulfillment(id.value, "", todayIsoDate());
  revision.value += 1;
}

function onUndoProcessing() {
  isUndoProcessModalOpen.value = false;
  cancelProcessing(id.value, todayIsoDate());
  revision.value += 1;
}

function onAction(what: string) {
  void what; // wire to the audit-log modal on a real screen
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
// minWidth:0 — a grid item's implicit min-width is its content's natural
// width, which is what lets a long address overflow its column.
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });
const wrapTextClass = css({ whiteSpace: "normal!", wordBreak: "break-word" });

const tableFixedClass = css({ tableLayout: "fixed", width: "full" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
const numTotalClass = css({ textAlign: "right", fontWeight: "semiBold" });
const totalLabelClass = css({ textAlign: "right", fontWeight: "semiBold" });
// On a <td>: wrapping only — NEVER set `display` here, a table cell must stay
// `display: table-cell`.
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });

const tabLabelClass = css({ display: "inline-flex", alignItems: "center", gap: 2 });
const tabPanelClass = css({ mt: 4 });

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
