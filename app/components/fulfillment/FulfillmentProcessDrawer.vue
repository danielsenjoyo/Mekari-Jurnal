<template>
  <MpDrawer :is-open="isOpen" placement="right" size="lg" @close="emit('close')">
    <MpDrawerOverlay />
    <MpDrawerContent>
      <MpDrawerHeader>
        <span :class="titleClass">{{ title }}</span>
        <MpDrawerCloseButton />
      </MpDrawerHeader>

      <MpDrawerBody>
        <FulfillmentOrderSummary :order="order" />

        <MpText size="body-small" color="gray.600" :class="introClass">
          Set how much of each line the warehouse will pick. Leave a line at 0 to process it later.
        </MpText>

        <MpTableContainer>
          <MpTable :class="tableClass">
            <colgroup>
              <col style="width: 46%" />
              <col style="width: 14%" />
              <col style="width: 26%" />
              <col style="width: 14%" />
            </colgroup>
            <MpTableHead :class="tableHeadClass">
              <MpTableRow>
                <MpTableCell as="th">Product</MpTableCell>
                <MpTableCell as="th" :class="numCellClass">Ordered</MpTableCell>
                <MpTableCell as="th">To process</MpTableCell>
                <MpTableCell as="th">Unit</MpTableCell>
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow v-for="line in order.lines" :key="line.id">
                <MpTableCell as="td" :class="wrapCellClass">
                  <MpText :class="wrapTextClass">{{ line.product }}</MpText>
                  <MpText size="body-small" color="gray.600" :class="wrapTextClass">
                    {{ line.productCode }}
                  </MpText>
                </MpTableCell>
                <MpTableCell as="td" :class="numCellClass">{{ line.quantity }}</MpTableCell>
                <MpTableCell as="td">
                  <!-- Not v-model: `draft` is keyed by line id, and indexing a
                       Record is `number | undefined` under this project's
                       strict index checks. The explicit pair keeps the prop a
                       plain number instead of widening the stepper's contract
                       to absorb an undefined it should never receive. -->
                  <FulfillmentQtyStepper
                    :model-value="draft[line.id] ?? 0"
                    :max="remainingToProcess(line)"
                    :label="`Quantity to process for ${line.product}`"
                    :help-text="helpTextFor(line)"
                    @update:model-value="draft[line.id] = $event"
                  />
                </MpTableCell>
                <MpTableCell as="td" :class="wrapCellClass">{{ line.unit }}</MpTableCell>
              </MpTableRow>

              <MpTableRow>
                <MpTableCell as="td" :class="totalLabelClass">Total</MpTableCell>
                <MpTableCell as="td" :class="numCellClass">{{ orderedTotal }}</MpTableCell>
                <MpTableCell as="td">{{ draftTotal }}</MpTableCell>
                <MpTableCell as="td" />
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>
      </MpDrawerBody>

      <MpDrawerFooter>
        <div :class="footerClass">
          <MpText v-if="draftTotal === 0" size="body-small" color="gray.600">
            Set a quantity on at least one line.
          </MpText>
          <div v-else />
          <div :class="footerRightClass">
            <MpButton variant="ghost" @click="emit('close')">Cancel</MpButton>
            <MpButton variant="primary" :is-disabled="!canSubmit" @click="onSubmit">Save</MpButton>
          </div>
        </div>
      </MpDrawerFooter>
    </MpDrawerContent>
  </MpDrawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  css,
  MpButton,
  MpDrawer,
  MpDrawerBody,
  MpDrawerCloseButton,
  MpDrawerContent,
  MpDrawerFooter,
  MpDrawerHeader,
  MpDrawerOverlay,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpText
} from "@mekari/pixel3";
import FulfillmentOrderSummary from "~/components/fulfillment/FulfillmentOrderSummary.vue";
import FulfillmentQtyStepper from "~/components/fulfillment/FulfillmentQtyStepper.vue";
import {
  remainingToProcess,
  type FulfillmentLine,
  type FulfillmentOrder
} from "~/data/fulfillment";

// ---------------------------------------------------------------------------
// Cloned from jurnal-frontend-app
// src/pages/outbounds/fulfillment-order/components/process-order.
//
// STAGED, like every other drawer in this repo: the steppers edit a local
// draft and only Save hands it back. Editing the record live would move the
// numbers on the detail page behind the overlay, where the user cannot see
// what changed — and Cancel would have nothing to undo.
//
// What the source has that this does not: per-line storage-location, batch and
// serial-number pickers, each opening a further nested drawer. Those belong to
// the inventory-tracking feature (docs/storage-locations.md covers the part of
// it this prototype models, on the Products side), not to fulfillment, and
// they are gated behind feature flags that are off in the reference tenant.
// ---------------------------------------------------------------------------

const props = defineProps<{
  isOpen: boolean;
  order: FulfillmentOrder;
}>();

const emit = defineEmits<{ close: []; submit: [quantities: Record<number, number>] }>();

// Keyed by line id. Seeded to the full remaining quantity: processing the
// whole order is the common case, and the source app pre-fills it the same way
// rather than making the user step every line up from zero.
const draft = ref<Record<number, number>>({});

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    const next: Record<number, number> = {};
    props.order.lines.forEach((line) => {
      next[line.id] = remainingToProcess(line);
    });
    draft.value = next;
  },
  { immediate: true }
);

// "Process order" the first time, "Add order processed" when some of it is
// already in progress — the same two-title rule the source app uses, because
// the second time round the drawer is topping up, not starting.
const title = computed(() =>
  props.order.status === "on_process" ? "Add processed quantity" : "Process order"
);

const orderedTotal = computed(() => props.order.lines.reduce((a, l) => a + l.quantity, 0));
const draftTotal = computed(() =>
  props.order.lines.reduce((a, l) => a + (draft.value[l.id] ?? 0), 0)
);
const hasOverMax = computed(() =>
  props.order.lines.some((l) => (draft.value[l.id] ?? 0) > remainingToProcess(l))
);
const canSubmit = computed(() => draftTotal.value > 0 && !hasOverMax.value);

function helpTextFor(line: FulfillmentLine): string {
  return line.quantityOnProcess > 0 ? `Already processed: ${line.quantityOnProcess}` : "";
}

function onSubmit() {
  if (!canSubmit.value) return;
  emit("submit", { ...draft.value });
}

const titleClass = css({ fontSize: "lg" });
const introClass = css({ display: "block", mb: 4, whiteSpace: "normal!" });
const tableClass = css({ tableLayout: "fixed", width: "full" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
// On a <td>: wrapping only — a table cell must stay `display: table-cell`.
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
const wrapTextClass = css({ display: "block", whiteSpace: "normal!", wordBreak: "break-word" });
const totalLabelClass = css({ textAlign: "right", fontWeight: "semiBold" });
const footerClass = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 3,
  width: "full"
});
const footerRightClass = css({ display: "flex", gap: 2 });
</script>
