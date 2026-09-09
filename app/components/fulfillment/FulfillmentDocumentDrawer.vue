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

        <div :class="fieldGridClass">
          <MpFormControl is-required :is-invalid="submitted && !form.number">
            <MpFormLabel>{{ FULFILLMENT_DOC_LABEL[kind] }} no.</MpFormLabel>
            <MpInput v-model="form.number" />
            <MpFormHelpText v-if="!(submitted && !form.number)">
              Numbered automatically. Edit it to match your own sequence
            </MpFormHelpText>
            <MpFormErrorMessage>Enter a document number</MpFormErrorMessage>
          </MpFormControl>

          <MpFormControl is-required :is-invalid="submitted && !form.date">
            <MpFormLabel>{{ dateLabel }}</MpFormLabel>
            <MpDatePicker
              v-model="form.date"
              value-type="string"
              :format="DATE_INPUT_FORMAT"
              placeholder="DD/MM/YYYY"
              use-portal
            />
            <MpFormErrorMessage>Enter a date</MpFormErrorMessage>
          </MpFormControl>

          <template v-if="kind === 'delivery'">
            <MpFormControl>
              <MpFormLabel>Courier</MpFormLabel>
              <MpSelect v-model="form.courier" is-full-width is-clearable>
                <option value="">Select a courier</option>
                <option v-for="name in COURIER_OPTIONS" :key="name" :value="name">
                  {{ name }}
                </option>
              </MpSelect>
            </MpFormControl>
            <MpFormControl>
              <MpFormLabel>Tracking no.</MpFormLabel>
              <MpInput v-model="form.trackingNo" />
            </MpFormControl>
          </template>
        </div>

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
                <MpTableCell as="th" :class="isEditable ? undefined : numCellClass">{{
                  quantityHeader
                }}</MpTableCell>
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
                <MpTableCell as="td" :class="isEditable ? undefined : numCellClass">
                  <!-- Not v-model — see the same note in
                       FulfillmentProcessDrawer.vue. -->
                  <FulfillmentQtyStepper
                    v-if="isEditable"
                    :model-value="quantities[line.id] ?? 0"
                    :max="line.quantity"
                    :label="`Quantity received for ${line.product}`"
                    @update:model-value="quantities[line.id] = $event"
                  />
                  <template v-else>{{ carriedQuantity(line) }}</template>
                </MpTableCell>
                <MpTableCell as="td" :class="wrapCellClass">{{ line.unit }}</MpTableCell>
              </MpTableRow>

              <MpTableRow>
                <MpTableCell as="td" :class="totalLabelClass">Total</MpTableCell>
                <MpTableCell as="td" :class="numCellClass">{{ orderedTotal }}</MpTableCell>
                <MpTableCell as="td" :class="isEditable ? undefined : numCellClass">{{
                  carriedTotal
                }}</MpTableCell>
                <MpTableCell as="td" />
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>

        <MpText v-if="!isEditable" size="body-small" color="gray.600" :class="noteClass">
          {{ carriedNote }}
        </MpText>
      </MpDrawerBody>

      <MpDrawerFooter>
        <div :class="footerClass">
          <MpButton variant="ghost" @click="emit('close')">Cancel</MpButton>
          <MpButton variant="primary" @click="onSubmit">Save</MpButton>
        </div>
      </MpDrawerFooter>
    </MpDrawerContent>
  </MpDrawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import {
  css,
  MpButton,
  MpDatePicker,
  MpDrawer,
  MpDrawerBody,
  MpDrawerCloseButton,
  MpDrawerContent,
  MpDrawerFooter,
  MpDrawerHeader,
  MpDrawerOverlay,
  MpFormControl,
  MpFormErrorMessage,
  MpFormHelpText,
  MpFormLabel,
  MpInput,
  MpSelect,
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
import { DATE_INPUT_FORMAT, dmyToIso, isoToDmy } from "~/utils/dates";
import {
  FULFILLMENT_DOC_LABEL,
  nextDocumentNumber,
  todayIsoDate,
  type FulfillmentDocKind,
  type FulfillmentLine,
  type FulfillmentOrder
} from "~/data/fulfillment";

// ---------------------------------------------------------------------------
// One drawer for all three fulfillment documents.
//
// jurnal-frontend-app ships create-picking-list, create-delivery-note and
// create-receipt as three components (357 / 432 / 385 lines) plus an inbound
// create-receipt twin, and they are the same screen: the order summary, a
// document number, a date, and the line table. Only two things actually vary,
// and both are props here — the delivery slip adds courier and tracking, and
// the inbound receipt lets the quantities be edited because goods can arrive
// short.
//
// Dropped from the source: the numbering-sequence settings modal behind a gear
// icon next to the number field. It configures a tenant-wide sequence, which
// belongs in Settings, not in a drawer raised against one order — the field
// stays editable so the number can still be corrected here.
// ---------------------------------------------------------------------------

const props = defineProps<{
  isOpen: boolean;
  order: FulfillmentOrder;
  kind: FulfillmentDocKind;
  /** Inbound receipts only: the goods can arrive short, so the quantities are
   *  the point of the form rather than a summary of what already happened. */
  editableQuantities?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  submit: [
    payload: {
      number: string;
      date: string;
      courier: string;
      trackingNo: string;
      quantities: Record<number, number>;
    }
  ];
}>();

const COURIER_OPTIONS = ["JNE Trucking", "Internal Fleet", "Gojek Instant", "SiCepat"];

const isEditable = computed(() => props.editableQuantities === true);

const title = computed(() =>
  isEditable.value ? "Receive goods" : `Create ${FULFILLMENT_DOC_LABEL[props.kind].toLowerCase()}`
);

const dateLabel = computed(
  () =>
    ({
      picklist: "Picking date",
      delivery: "Delivery date",
      receipt: isEditable.value ? "Received date" : "Receipt date"
    })[props.kind]
);

const quantityHeader = computed(
  () => ({ picklist: "To pick", delivery: "To deliver", receipt: "Received" })[props.kind]
);

// Why the read-only column is read-only, said once rather than per row.
const carriedNote = computed(
  () =>
    ({
      picklist:
        "Quantities come from what was processed. Change them by processing the order again.",
      delivery: "Quantities come from the picklist this slip ships.",
      receipt: "Quantities come from the delivery slip this receipt closes."
    })[props.kind]
);

// `form.date` is DD/MM/YYYY — that is what MpDatePicker binds with
// value-type="string" (see DATE_INPUT_FORMAT). It converts to the stored
// YYYY-MM-DD on submit, never by hand: see app/utils/dates.ts.
const form = reactive({ number: "", date: "", courier: "", trackingNo: "" });
const quantities = ref<Record<number, number>>({});
const submitted = ref(false);

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    submitted.value = false;
    const today = todayIsoDate();
    form.number = nextDocumentNumber(props.kind, today);
    form.date = isoToDmy(today);
    form.courier = "";
    form.trackingNo = "";
    const next: Record<number, number> = {};
    props.order.lines.forEach((line) => {
      next[line.id] = line.quantity;
    });
    quantities.value = next;
  },
  { immediate: true }
);

/** What this document carries for a line when the user does not set it — the
 *  output of the previous stage, which is exactly why it is not editable. */
function carriedQuantity(line: FulfillmentLine): number {
  if (props.kind === "picklist") return line.quantityOnProcess;
  if (props.kind === "delivery") return line.quantityOnPicked;
  return line.quantityOnDelivery;
}

const orderedTotal = computed(() => props.order.lines.reduce((a, l) => a + l.quantity, 0));
const carriedTotal = computed(() =>
  props.order.lines.reduce(
    (a, l) => a + (isEditable.value ? (quantities.value[l.id] ?? 0) : carriedQuantity(l)),
    0
  )
);

function onSubmit() {
  submitted.value = true;
  if (!form.number || !form.date) return;
  emit("submit", {
    number: form.number,
    date: dmyToIso(form.date),
    courier: form.courier,
    trackingNo: form.trackingNo,
    quantities: { ...quantities.value }
  });
}

const titleClass = css({ fontSize: "lg" });
const fieldGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 4,
  mb: 6
});
const tableClass = css({ tableLayout: "fixed", width: "full" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
const wrapTextClass = css({ display: "block", whiteSpace: "normal!", wordBreak: "break-word" });
const totalLabelClass = css({ textAlign: "right", fontWeight: "semiBold" });
const noteClass = css({ display: "block", mt: 3, whiteSpace: "normal!" });
const footerClass = css({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 2,
  width: "full"
});
</script>
