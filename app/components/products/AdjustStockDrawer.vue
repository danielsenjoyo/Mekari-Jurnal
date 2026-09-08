<template>
  <MpDrawer :is-open="isOpen" placement="right" size="lg" @close="onCancel">
    <MpDrawerOverlay />
    <MpDrawerContent>
      <MpDrawerHeader>
        <span :class="titleClass">Adjust stock</span>
        <MpDrawerCloseButton />
      </MpDrawerHeader>

      <MpDrawerBody>
        <div :class="formClass">
          <!-- Repeats the product being adjusted rather than assuming the page
               behind the drawer is still in view — the same reasoning
               StorageQuantityDrawer's own meta list gives. -->
          <div :class="metaListClass">
            <div :class="metaRowClass">
              <MpText color="gray.600" :class="metaLabelClass">Product name</MpText>
              <MpText color="dark">{{ product.name }}</MpText>
            </div>
          </div>

          <MpFormControl>
            <MpFormLabel>Adjustment type</MpFormLabel>
            <div :class="radioStackClass">
              <MpRadio
                v-for="option in ADJUSTMENT_TYPE_OPTIONS"
                :id="`adjust-stock-type-${option}`"
                :key="option"
                v-model="form.adjustmentType"
                :value="option"
              >
                {{ ADJUSTMENT_TYPE_LABEL[option] }}
              </MpRadio>
            </div>
          </MpFormControl>

          <div :class="pairRowClass">
            <MpFormControl>
              <MpFormLabel>Adjustment category</MpFormLabel>
              <MpSelect v-model="form.category" is-full-width>
                <option value="">Select category</option>
                <option v-for="option in ADJUSTMENT_CATEGORY_OPTIONS" :key="option" :value="option">
                  {{ option }}
                </option>
              </MpSelect>
            </MpFormControl>

            <MpFormControl is-required :is-invalid="submitted && !form.account">
              <MpFormLabel>Account</MpFormLabel>
              <MpSelect v-model="form.account" is-full-width>
                <option value="">Select account</option>
                <option v-for="option in ADJUSTMENT_ACCOUNT_OPTIONS" :key="option" :value="option">
                  {{ option }}
                </option>
              </MpSelect>
              <MpFormErrorMessage>Select an account</MpFormErrorMessage>
            </MpFormControl>
          </div>

          <div :class="pairRowClass">
            <MpFormControl is-required :is-invalid="submitted && !dmyToIso(dateText)">
              <MpFormLabel>Date</MpFormLabel>
              <MpDatePicker
                v-model="dateText"
                value-type="string"
                :format="DATE_INPUT_FORMAT"
                placeholder="DD/MM/YYYY"
                use-portal
              />
              <MpFormErrorMessage>Select a date</MpFormErrorMessage>
            </MpFormControl>

            <MpFormControl is-required :is-invalid="submitted && !form.warehouse">
              <MpFormLabel>Warehouse</MpFormLabel>
              <MpSelect v-model="form.warehouse" is-full-width>
                <option value="">Select warehouse</option>
                <option v-for="option in WAREHOUSE_OPTIONS" :key="option" :value="option">
                  {{ option }}
                </option>
              </MpSelect>
              <MpFormErrorMessage>Select a warehouse</MpFormErrorMessage>
            </MpFormControl>
          </div>

          <!-- One product, so the compact three-row shape the source's own
               drawer uses — Recorded / Difference / Actual — rather than the
               full form's one-row-per-product table. -->
          <MpTable :is-hoverable="false">
            <MpTableHead :class="tableHeadClass">
              <MpTableRow>
                <MpTableCell as="th" />
                <MpTableCell as="th">Qty</MpTableCell>
                <MpTableCell as="th">Unit</MpTableCell>
                <MpTableCell as="th" :class="numCellClass">Average price</MpTableCell>
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow>
                <MpTableCell as="td">Recorded</MpTableCell>
                <MpTableCell as="td" :class="numCellClass">{{
                  formatQuantity(recorded)
                }}</MpTableCell>
                <MpTableCell as="td">{{ product.unit }}</MpTableCell>
                <MpTableCell as="td" :class="numCellClass">
                  {{ formatAmount(product.avgPrice) }}
                </MpTableCell>
              </MpTableRow>
              <MpTableRow>
                <MpTableCell as="td">Difference</MpTableCell>
                <MpTableCell as="td" :class="numCellClass">{{ signed(difference) }}</MpTableCell>
                <MpTableCell as="td">{{ product.unit }}</MpTableCell>
                <MpTableCell as="td" />
              </MpTableRow>
              <MpTableRow>
                <MpTableCell as="td">Actual</MpTableCell>
                <MpTableCell as="td">
                  <MpInput
                    v-model="actualText"
                    type="text"
                    inputmode="numeric"
                    aria-label="Actual quantity"
                  />
                </MpTableCell>
                <MpTableCell as="td">{{ product.unit }}</MpTableCell>
                <MpTableCell as="td" />
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </div>
      </MpDrawerBody>

      <MpDrawerFooter>
        <div :class="footerClass">
          <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
          <MpButton variant="primary" @click="onSave">Save</MpButton>
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
  MpFormLabel,
  MpInput,
  MpRadio,
  MpSelect,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableHead,
  MpTableRow,
  MpText
} from "@mekari/pixel3";
import {
  ADJUSTMENT_ACCOUNT_OPTIONS,
  ADJUSTMENT_CATEGORY_OPTIONS,
  ADJUSTMENT_TYPE_LABEL,
  ADJUSTMENT_TYPE_OPTIONS,
  adjustmentLineForProduct,
  createStockAdjustment,
  emptyStockAdjustmentInput,
  formatAmount,
  formatQuantity,
  todayIsoDate,
  WAREHOUSE_OPTIONS,
  type Product,
  type StockAdjustmentInput
} from "~/data/products";
import { DATE_INPUT_FORMAT, dmyToIso, isoToDmy } from "~/utils/dates";

// ---------------------------------------------------------------------------
// "Adjust stock (stock opname)" from the product detail page's Actions menu.
// Cloned from jurnal-frontend-app
// src/pages/products/detail/components/stock-adjustment-drawer/ — a quick
// count for ONE product without leaving the detail page, as against the full
// stock-adjustment form's one-row-per-product table
// (app/components/products/StockAdjustmentForm.vue).
//
// It writes through `createStockAdjustment` — the same engine the full form
// calls — so a quick adjustment here is a first-class record: it lands on the
// Stock adjustment list exactly like one built the long way, and moves the
// product's own quantity the same way.
//
// Not ported from the source: the batch/serial-number pickers, the storage
// location "Set location" drawer, the recalculation confirmation, and the
// transaction-number format designer — the same trims the full form already
// makes, for the same reasons (docs/patterns/details-page-format.md).
// ---------------------------------------------------------------------------

const props = defineProps<{ isOpen: boolean; product: Product }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const form = reactive<StockAdjustmentInput>(emptyStockAdjustmentInput());
const dateText = ref("");
const actualText = ref("");
const submitted = ref(false);

/** This product's current quantity — "recorded", the same field the full
 *  form's line reads (see `adjustmentLineForProduct`), regardless of which
 *  warehouse is picked above: this prototype tracks one total per product,
 *  not a stored per-warehouse split. */
const recorded = computed(() => props.product.quantity ?? 0);

function parsedActual(): number {
  const digits = actualText.value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

const difference = computed(() => parsedActual() - recorded.value);

function signed(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatQuantity(Math.abs(value))}`;
}

// Reset to a blank draft on open — a half-filled adjustment from the last time
// this was opened has no business surviving a Cancel.
watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    submitted.value = false;
    Object.assign(form, emptyStockAdjustmentInput(), { warehouse: props.product.warehouse });
    dateText.value = isoToDmy(todayIsoDate());
    actualText.value = String(recorded.value);
  },
  { immediate: true }
);

function onCancel() {
  emit("close");
}

function onSave() {
  submitted.value = true;
  const iso = dmyToIso(dateText.value);
  if (!form.account || !form.warehouse || !iso) return;

  const input: StockAdjustmentInput = {
    ...form,
    date: iso,
    lines: [{ ...adjustmentLineForProduct(props.product), actual: parsedActual() }]
  };
  createStockAdjustment(input);
  emit("saved");
  emit("close");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const titleClass = css({ fontSize: "lg" });
const formClass = css({ display: "flex", flexDirection: "column", gap: 5 });
const metaListClass = css({ display: "flex", flexDirection: "column", gap: 2 });
const metaRowClass = css({ display: "flex", alignItems: "baseline", gap: 6 });
const metaLabelClass = css({ width: "168px", flexShrink: 0 });
const radioStackClass = css({ display: "flex", flexDirection: "column", gap: 2 });
const pairRowClass = css({ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
const footerClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
</script>
