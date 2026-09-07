<template>
  <DefaultPageContent
    :title="title"
    breadcrumb="Stock adjustment list"
    breadcrumb-to="/products?tab=stock_adjustments"
  >
    <!-- Only on the second step: there is nothing to print until the
         adjustment has products on it. -->
    <template v-if="isPrepared" #actions>
      <MpTooltip placement="bottom-end" use-portal label="Printing is not available yet.">
        <span :class="printWrapClass">
          <MpButton variant="secondary" is-disabled>Print stock card</MpButton>
        </span>
      </MpTooltip>
    </template>

    <BlankSlate
      v-if="isEdit && !existing"
      title="Stock adjustment not found"
      description="This transaction may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/products?tab=stock_adjustments')">
        Back to Stock adjustment list
      </MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Step 1 — prepare. The adjustment's context (what kind, where, when,
           which accounts) decides what the product table below can even show:
           "recorded quantity" means "recorded in THIS warehouse on THIS date".
           The source asks for it first for that reason, and so does this. -->
      <div v-if="!isPrepared" :class="prepareColumnClass">
        <MpFormControl>
          <MpFormLabel>Adjustment type</MpFormLabel>
          <div :class="radioStackClass">
            <MpRadio
              v-for="option in ADJUSTMENT_TYPE_OPTIONS"
              :id="`adjustment-type-${option}`"
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
              <option v-for="option in ACCOUNT_OPTIONS" :key="option" :value="option">
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
            <MpSelect
              v-model="form.warehouse"
              is-full-width
              @update:model-value="onWarehouseChange"
            >
              <option value="">Select warehouse</option>
              <option v-for="option in WAREHOUSE_OPTIONS" :key="option" :value="option">
                {{ option }}
              </option>
            </MpSelect>
            <MpFormErrorMessage>Select a warehouse</MpFormErrorMessage>
          </MpFormControl>
        </div>

        <div :class="prepareActionRowClass">
          <div :class="bulkRowClass">
            <MpText size="body-small" color="gray.600">Need adjustment in bulk?</MpText>
            <!-- Shown because it is the entry point people look for, disabled
                 because this prototype has no import pipeline (see the header
                 comment in app/data/products.ts). -->
            <MpTooltip placement="top" use-portal label="Bulk import is not available yet.">
              <span :class="bulkLinkClass">
                <MpTextlink is-disabled>Import data</MpTextlink>
              </span>
            </MpTooltip>
          </div>
          <div :class="prepareButtonsClass">
            <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
            <MpButton variant="primary" @click="onContinue">Continue</MpButton>
          </div>
        </div>
      </div>

      <template v-else>
        <MpBanner
          v-if="submitted && missingFields.length"
          id="adjustment-form-missing-banner"
          variant="danger"
          :class="bannerClass"
        >
          <MpBannerIcon id="adjustment-form-missing-icon" />
          <MpBannerTitle id="adjustment-form-missing-title">
            Stock adjustment can't be saved yet
          </MpBannerTitle>
          <MpBannerDescription id="adjustment-form-missing-desc">
            Complete these before saving: {{ missingFields.join(", ") }}.
          </MpBannerDescription>
        </MpBanner>

        <!-- What step 1 settled: stated, not re-asked. Back is how it changes
             — the recorded quantities below were read for this warehouse on
             this date, so they have to be re-read if either moves. -->
        <div :class="metaListClass">
          <div :class="metaRowClass">
            <MpText color="gray.600" :class="metaLabelClass">Adjustment type</MpText>
            <MpText color="dark">{{ ADJUSTMENT_TYPE_LABEL[form.adjustmentType] }}</MpText>
          </div>
          <div :class="metaRowClass">
            <MpText color="gray.600" :class="metaLabelClass">Date</MpText>
            <MpText color="dark">{{ formatDisplayDate(form.date) }}</MpText>
          </div>
          <div :class="metaRowClass">
            <MpText color="gray.600" :class="metaLabelClass">Warehouse</MpText>
            <MpText color="dark">{{ form.warehouse || "Unassigned" }}</MpText>
          </div>
        </div>

        <div :class="metaGridClass">
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
              <option v-for="option in ACCOUNT_OPTIONS" :key="option" :value="option">
                {{ option }}
              </option>
            </MpSelect>
            <MpFormErrorMessage>Select an account</MpFormErrorMessage>
          </MpFormControl>

          <!-- Left blank the system numbers it; the gear is where the number
               format is configured, which is a settings screen this prototype
               doesn't carry. -->
          <MpFormControl>
            <MpFormLabel>
              Transaction no.
              <template #icon>
                <MpTooltip
                  placement="top"
                  use-portal
                  label="Number format settings are not available yet."
                >
                  <MpIcon name="settings" size="sm" />
                </MpTooltip>
              </template>
            </MpFormLabel>
            <MpInput v-model="form.number" placeholder="[Auto]" />
          </MpFormControl>

          <MpFormControl>
            <MpFormLabel>Tag</MpFormLabel>
            <MpInputTag
              id="adjustment-tags"
              :key="tagKey"
              placeholder="Search tag..."
              :data="tagData"
              :suggestions="PRODUCT_TAG_OPTIONS"
              :max-row="-1"
              :is-enable-create-new-tag="false"
              :is-show-suggestions="true"
              :is-show-icon-chevron-down="true"
              @change="onTagsChange"
            />
          </MpFormControl>

          <MpFormControl :class="memoFieldClass">
            <MpFormLabel>Memo</MpFormLabel>
            <MpTextarea v-model="form.memo" />
          </MpFormControl>
        </div>

        <!-- The lines. Recorded quantity is read-only and comes from the
             catalogue: it is what the system believes, and letting the user
             type over it would destroy the very comparison the screen exists to
             make. The trailing row is the add affordance. -->
        <MpTableContainer ref="tableContainerRef" :class="scrollShadowClass">
          <MpTable :class="lineTableClass">
            <colgroup>
              <col v-for="(w, i) in colWidths" :key="i" :style="{ width: w }" />
            </colgroup>
            <MpTableHead is-fixed :class="tableHeadClass">
              <MpTableRow>
                <MpTableCell as="th">Product name</MpTableCell>
                <MpTableCell as="th">Product code</MpTableCell>
                <MpTableCell as="th">Recorded quantity</MpTableCell>
                <MpTableCell as="th">Actual quantity</MpTableCell>
                <MpTableCell as="th">Difference</MpTableCell>
                <!-- Only when this company keeps stock at locations AND this
                     warehouse has some: otherwise there is nothing to place
                     and an empty column would just take width. -->
                <MpTableCell v-if="showLocations" as="th">Location</MpTableCell>
                <MpTableCell as="th" :class="numCellClass">Average price</MpTableCell>
                <!-- Actions header: no label; pinned to the right edge. -->
                <MpTableCell
                  as="th"
                  :class="[actionHeadClass, isTableOverflowing ? actionBorderClass : '']"
                />
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow v-for="(line, index) in form.lines" :key="line.productId">
                <!-- Editable: picking the wrong product is the likeliest slip
                     on this screen, and swapping it in place beats removing a
                     row and re-adding it. -->
                <MpTableCell as="td">
                  <MpSelect
                    :model-value="String(line.productId)"
                    is-full-width
                    :aria-label="`Product for line ${index + 1}`"
                    @update:model-value="onLineProductChange(index, $event)"
                  >
                    <option
                      v-for="option in lineProductOptions(line.productId)"
                      :key="option.id"
                      :value="String(option.id)"
                    >
                      {{ option.name }}
                    </option>
                  </MpSelect>
                </MpTableCell>
                <MpTableCell as="td" :class="wrapCellClass">{{ line.code }}</MpTableCell>
                <MpTableCell as="td" :class="wrapCellClass">
                  {{ formatQuantity(line.recorded) }} {{ line.unit }}
                </MpTableCell>
                <MpTableCell as="td">
                  <MpInput
                    v-model="actualText[index]"
                    type="text"
                    inputmode="numeric"
                    :aria-label="`Actual quantity for ${line.name}`"
                    @update:model-value="onActualInput(index)"
                  />
                </MpTableCell>
                <MpTableCell as="td" :class="wrapCellClass">
                  {{ signed(adjustmentDifference(line)) }} {{ line.unit }}
                </MpTableCell>
                <!-- A line that doesn't change the count has nothing to place;
                     one that does says which way, because picking stock out of
                     a shelf and putting it on one are different jobs. -->
                <MpTableCell v-if="showLocations" as="td">
                  <template v-if="adjustmentDifference(line) === 0">
                    <MpText color="gray.400">—</MpText>
                  </template>
                  <div v-else :class="locationCellClass">
                    <MpTextlink @click="openLocationDrawer(index)">
                      {{ locationLinkLabel(index) }}
                    </MpTextlink>
                    <MpText v-if="!isLineBalanced(line)" size="body-small" color="red.400">
                      {{ formatQuantity(allocatedOf(line)) }} of
                      {{ formatQuantity(Math.abs(adjustmentDifference(line))) }} placed
                    </MpText>
                  </div>
                </MpTableCell>
                <!-- Costing price. The pencil offers the choice rather than
                     jumping straight into an input: "default" is a real state
                     — the catalogue's own average — and a row that silently
                     became editable would hide which of the two it is on. -->
                <MpTableCell as="td">
                  <div :class="priceCellClass">
                    <div v-if="priceMode[index] === 'custom'" :class="priceInputClass">
                      <div @focusout="commitPrice(index)">
                        <MpInputGroup>
                          <MpInputLeftAddon has-background>
                            <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                          </MpInputLeftAddon>
                          <MpInput
                            v-model="priceText[index]"
                            type="text"
                            inputmode="decimal"
                            :aria-label="`Average price for ${line.name}`"
                            @update:model-value="onPriceInput(index)"
                          />
                        </MpInputGroup>
                      </div>
                    </div>
                    <MpText v-else color="dark">{{ formatCurrency(line.avgPrice) }}</MpText>

                    <MpPopover placement="bottom-end" use-portal is-close-on-select>
                      <template #default>
                        <MpPopoverTrigger>
                          <MpButton
                            variant="ghost"
                            size="sm"
                            left-icon="edit"
                            :aria-label="`Change average price for ${line.name}`"
                          />
                        </MpPopoverTrigger>
                        <MpPopoverContent>
                          <MpPopoverList>
                            <MpPopoverListItem
                              role="menuitem"
                              :is-active="priceMode[index] !== 'custom'"
                              @click="useDefaultPrice(index)"
                            >
                              Default price
                            </MpPopoverListItem>
                            <MpPopoverListItem
                              role="menuitem"
                              :is-active="priceMode[index] === 'custom'"
                              @click="useCustomPrice(index)"
                            >
                              Custom price
                            </MpPopoverListItem>
                          </MpPopoverList>
                        </MpPopoverContent>
                      </template>
                    </MpPopover>
                  </div>
                </MpTableCell>
                <MpTableCell
                  as="td"
                  :class="[actionCellClass, isTableOverflowing ? actionBorderClass : '']"
                >
                  <MpButton
                    variant="ghost"
                    size="sm"
                    left-icon="minus-circular"
                    aria-label="Remove product"
                    @click="removeLine(index)"
                  />
                </MpTableCell>
              </MpTableRow>

              <MpTableRow>
                <MpTableCell as="td">
                  <MpSelect
                    model-value=""
                    is-full-width
                    aria-label="Add a product"
                    @update:model-value="onAddLine"
                  >
                    <option value="">Select product or scan barcode</option>
                    <option
                      v-for="option in productOptions"
                      :key="option.id"
                      :value="String(option.id)"
                    >
                      {{ option.name }}
                    </option>
                  </MpSelect>
                </MpTableCell>
                <MpTableCell as="td" />
                <MpTableCell as="td" />
                <MpTableCell as="td" />
                <MpTableCell as="td" />
                <MpTableCell v-if="showLocations" as="td" />
                <MpTableCell as="td" />
                <MpTableCell
                  as="td"
                  :class="[actionCellClass, isTableOverflowing ? actionBorderClass : '']"
                />
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>

        <div :class="actionRowClass">
          <!-- Back, not Cancel: step 1 is where this adjustment's type, date
               and warehouse live, and where leaving the form is offered. -->
          <MpButton variant="ghost" @click="isPrepared = false">Back</MpButton>
          <MpButton variant="primary" @click="onSubmit">
            {{ isEdit ? "Save changes" : "Save" }}
          </MpButton>
        </div>
      </template>

      <StorageQuantityDrawer
        v-if="locationLine"
        :is-open="locationLineIndex !== null"
        :mode="locationMode"
        :product-id="locationLine.productId"
        :product-name="locationLine.name"
        :unit="locationLine.unit"
        :warehouse-id="warehouseId ?? 0"
        :warehouse-name="form.warehouse"
        :quantity="Math.abs(adjustmentDifference(locationLine))"
        :allocations="locationLine.locations ?? []"
        @close="locationLineIndex = null"
        @save="onLocationsSaved"
      />

      <MpModal
        id="adjustment-form-discard-modal"
        :is-open="isDiscardModalOpen"
        size="sm"
        @close="isDiscardModalOpen = false"
      >
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>
            <span :class="modalTitleClass">Leave this page?</span>
            <MpModalCloseButton />
          </MpModalHeader>
          <MpModalBody>
            <MpText size="body" color="gray.700">{{ leaveModalBody }}</MpText>
          </MpModalBody>
          <MpModalFooter>
            <div :class="modalFooterClass">
              <MpButton variant="ghost" @click="isDiscardModalOpen = false">Keep editing</MpButton>
              <MpButton variant="primary" @click="leave">Leave</MpButton>
            </div>
          </MpModalFooter>
        </MpModalContent>
      </MpModal>
    </template>
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import {
  css,
  MpBanner,
  MpBannerDescription,
  MpBannerIcon,
  MpBannerTitle,
  MpButton,
  MpDatePicker,
  MpFormControl,
  MpFormErrorMessage,
  MpFormLabel,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpInputTag,
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
  MpRadio,
  MpSelect,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpText,
  MpTextarea,
  MpTextlink,
  MpTooltip
} from "@mekari/pixel3";
import StorageQuantityDrawer from "~/components/products/StorageQuantityDrawer.vue";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import {
  ADJUSTMENT_CATEGORY_OPTIONS,
  ADJUSTMENT_TYPE_LABEL,
  ADJUSTMENT_TYPE_OPTIONS,
  adjustmentDifference,
  adjustmentLineForProduct,
  applyLocationAllocations,
  createStockAdjustment,
  emptyStockAdjustmentInput,
  formatAmount,
  formatCurrency,
  formatDisplayDate,
  formatQuantity,
  getProductById,
  getProducts,
  getStockAdjustmentById,
  getStorableLocations,
  getWarehouseByName,
  isStorageLocationFeatureActive,
  parseAmount,
  PRODUCT_TAG_OPTIONS,
  stockAdjustmentToInput,
  updateStockAdjustment,
  WAREHOUSE_OPTIONS,
  type LocationAllocation,
  type StockAdjustmentInput,
  type StockAdjustmentLine
} from "~/data/products";
import { DATE_INPUT_FORMAT, dmyToIso, isoToDmy } from "~/utils/dates";

// ---------------------------------------------------------------------------
// Stock adjustment create/edit, rendered by
// app/pages/products/stock-adjustment/{new,edit/[id]}.vue.
//
// Cloned from jurnal-frontend-app src/pages/stock-adjustments/form/. Not
// ported: barcode scanning (a hardware flow), the transaction-number format
// designer (a settings modal), and the per-line batch/serial pickers — this
// prototype's adjustments are quantity-only.
// ---------------------------------------------------------------------------

const props = defineProps<{ recordId?: number }>();

const route = useRoute();

const isEdit = computed(() => props.recordId != null);
const existing = computed(() =>
  props.recordId != null ? getStockAdjustmentById(props.recordId) : undefined
);

/** Where the adjustment's value lands. Kept beside the form rather than in the
 *  data module because it is a chart-of-accounts concern the catalogue has no
 *  opinion on. */
const ACCOUNT_OPTIONS = [
  "Inventory Adjustment",
  "Cost of Goods Sold",
  "Work in Process",
  "Marketing Expense"
];

const form = reactive<StockAdjustmentInput>(emptyStockAdjustmentInput());
const dateText = ref("");
/** String mirrors for the editable quantity column, so a half-typed value is
 *  not coerced to 0 under the caret. */
const actualText = reactive<string[]>([]);
const tagKey = ref(0);
/** Per line: is this row's costing price the catalogue's, or one typed here?
 *  "default" is the state to be in, so it is what a new line starts as. */
const priceMode = reactive<("default" | "custom")[]>([]);
/** Grouped-string mirrors for the price column, formatted on focusout only. */
const priceText = reactive<string[]>([]);

const submitted = ref(false);
const isDiscardModalOpen = ref(false);

/**
 * The form is two steps: settle the adjustment's context, then count against
 * it. An existing record has already been prepared, so editing starts on the
 * second step.
 */
const isPrepared = ref(false);

function seedFromRecord() {
  isPrepared.value = existing.value != null;
  Object.assign(
    form,
    existing.value ? stockAdjustmentToInput(existing.value) : emptyStockAdjustmentInput()
  );
  // The two Actions-menu entries ("Adjust stock (stock opname)" and "New stock
  // in/out") are one screen with its type preset — same as the source, where
  // both open this form. Only honoured on create; an existing record's type
  // comes from the record.
  if (!existing.value) {
    const wanted = String(route.query.type ?? "");
    if (wanted === "stock_count" || wanted === "in_out") form.adjustmentType = wanted;
  }
  dateText.value = isoToDmy(form.date);
  actualText.splice(0, actualText.length, ...form.lines.map((line) => String(line.actual)));
  priceText.splice(0, priceText.length, ...form.lines.map((line) => formatAmount(line.avgPrice)));
  // An existing line whose price differs from its product's is one someone
  // already overrode, so it reopens as custom rather than quietly reverting.
  priceMode.splice(
    0,
    priceMode.length,
    ...form.lines.map((line) =>
      line.avgPrice === (getProductById(line.productId)?.avgPrice ?? line.avgPrice)
        ? ("default" as const)
        : ("custom" as const)
    )
  );
  tagKey.value++;
}

watch(existing, seedFromRecord, { immediate: true });

/** Step 2's title names the adjustment being written — "General Stock
 *  Adjustment 07 Sep 2026" — because by then the category and date are settled
 *  and they are what tells one adjustment from another. */
const title = computed(() => {
  if (!isPrepared.value) return "Prepare stock adjustment";
  if (isEdit.value && existing.value) return `Edit ${existing.value.number}`;
  const category = form.category ? `${form.category} ` : "";
  return `${category}Stock Adjustment ${formatDisplayDate(form.date)}`;
});

useHead({ title: computed(() => `${title.value} — Mekari Jurnal`) });

/** Only tracked products can be adjusted, and only ones not already on the
 *  sheet — a product listed twice would have two competing actual counts. */
const productOptions = computed(() => {
  const taken = new Set(form.lines.map((line) => line.productId));
  return getProducts().filter(
    (product) => product.trackInventory && !product.isArchived && !taken.has(product.id)
  );
});

function onAddLine(value: unknown) {
  const product = getProductById(Number(value));
  if (!product) return;
  form.lines.push(adjustmentLineForProduct(product));
  actualText.push(String(product.quantity ?? 0));
  priceText.push(formatAmount(product.avgPrice));
  priceMode.push("default");
}

/** What a given row may become: any adjustable product not already on another
 *  row, plus the one it currently holds. */
function lineProductOptions(currentId: number) {
  const taken = new Set(form.lines.map((line) => line.productId));
  return getProducts().filter(
    (product) =>
      product.trackInventory &&
      !product.isArchived &&
      (product.id === currentId || !taken.has(product.id))
  );
}

function onLineProductChange(index: number, value: unknown) {
  const product = getProductById(Number(value));
  if (!product) return;
  // Replaced wholesale: recorded quantity, code and costing price all belong
  // to the product, so keeping any of the old row's figures would describe a
  // count that never happened.
  form.lines.splice(index, 1, adjustmentLineForProduct(product));
  actualText[index] = String(product.quantity ?? 0);
  priceText[index] = formatAmount(product.avgPrice);
  priceMode[index] = "default";
}

function onPriceInput(index: number) {
  const line = form.lines[index];
  if (!line) return;
  line.avgPrice = parseAmount(priceText[index] ?? "");
}

function commitPrice(index: number) {
  const line = form.lines[index];
  if (line) priceText[index] = formatAmount(line.avgPrice);
}

/** Back to what the catalogue says this product is worth. */
function useDefaultPrice(index: number) {
  const line = form.lines[index];
  if (!line) return;
  line.avgPrice = getProductById(line.productId)?.avgPrice ?? line.avgPrice;
  priceText[index] = formatAmount(line.avgPrice);
  priceMode[index] = "default";
}

function useCustomPrice(index: number) {
  priceMode[index] = "custom";
}

/** Step 1 → step 2. The context has to be complete first: the table below
 *  reads each product's recorded quantity for this warehouse, so continuing
 *  without one would fill it with figures from nowhere. */
function onContinue() {
  submitted.value = true;
  if (!form.warehouse || !form.account || !dmyToIso(dateText.value)) return;
  submitted.value = false;
  isPrepared.value = true;
}

function onActualInput(index: number) {
  const line = form.lines[index];
  if (!line) return;
  const digits = (actualText[index] ?? "").replace(/[^\d]/g, "");
  line.actual = digits ? Number(digits) : 0;
}

function removeLine(index: number) {
  form.lines.splice(index, 1);
  actualText.splice(index, 1);
  priceText.splice(index, 1);
  priceMode.splice(index, 1);
  if (locationLineIndex.value === index) locationLineIndex.value = null;
}

// ---- Storage locations --------------------------------------------------
//
// Which shelf the difference comes off, or goes onto. Only asked when the
// company keeps stock at locations AND this warehouse has some to put it in —
// a warehouse that stores everything on one floor has nothing to answer.

const warehouseId = computed(() => getWarehouseByName(form.warehouse)?.id ?? null);

const showLocations = computed(
  () =>
    isStorageLocationFeatureActive() &&
    warehouseId.value !== null &&
    getStorableLocations(warehouseId.value).length > 0
);

const locationLineIndex = ref<number | null>(null);
const locationLine = computed(() =>
  locationLineIndex.value === null ? undefined : form.lines[locationLineIndex.value]
);

/** More stock than the record says means putting some away; less means taking
 *  some off a shelf. The direction decides which drawer the line opens. */
const locationMode = computed<"store" | "pick">(() =>
  locationLine.value && adjustmentDifference(locationLine.value) > 0 ? "store" : "pick"
);

function allocatedOf(line: StockAdjustmentLine): number {
  return (line.locations ?? []).reduce((sum, entry) => sum + entry.quantity, 0);
}

function isLineBalanced(line: StockAdjustmentLine): boolean {
  return allocatedOf(line) === Math.abs(adjustmentDifference(line));
}

function locationLinkLabel(index: number): string {
  const line = form.lines[index];
  if (!line) return "";
  const count = (line.locations ?? []).length;
  if (count) return `${count} location${count === 1 ? "" : "s"}`;
  return adjustmentDifference(line) > 0 ? "Set location" : "Pick from location";
}

function openLocationDrawer(index: number) {
  locationLineIndex.value = index;
}

function onLocationsSaved(allocations: LocationAllocation[]) {
  const line = locationLine.value;
  if (line) line.locations = allocations;
}

/** Changing the actual quantity changes how much there is to place, so the
 *  old split no longer adds up — clearing it is better than leaving a wrong
 *  one that reads as done. */
watch(
  () => form.lines.map((line) => line.actual).join(","),
  () => {
    form.lines.forEach((line) => {
      if (line.locations && !isLineBalanced(line)) line.locations = undefined;
    });
  }
);

/** Changing warehouse re-reads every line's recorded quantity, because
 *  "recorded" means "recorded in this warehouse" — leaving the old figures
 *  would compare a count taken here against stock held somewhere else. */
function onWarehouseChange() {
  form.lines.forEach((line, index) => {
    const product = getProductById(line.productId);
    if (!product) return;
    line.recorded = product.quantity ?? 0;
    // An untouched line follows its recorded figure; an edited one keeps the
    // number the user typed.
    if ((actualText[index] ?? "") === String(line.actual)) {
      line.actual = line.recorded;
      actualText[index] = String(line.recorded);
    }
  });
}

const tagData = computed(() =>
  form.tags.map((tag) => ({
    id: `tag-${tag}`,
    text: tag,
    value: tag,
    isInvalid: false,
    isReadOnly: false
  }))
);

function onTagsChange(tags: { value?: string; text?: string }[]) {
  form.tags = tags.map((tag) => tag.value ?? tag.text ?? "").filter(Boolean);
}

function signed(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatQuantity(Math.abs(value))}`;
}

const missingFields = computed(() => {
  const missing: string[] = [];
  if (!form.warehouse) missing.push("Warehouse");
  if (!dmyToIso(dateText.value)) missing.push("Date");
  if (!form.account) missing.push("Account");
  if (form.lines.length === 0) missing.push("At least one product");
  // An adjustment where nothing differs writes nothing and means nothing.
  else if (form.lines.every((line) => adjustmentDifference(line) === 0)) {
    missing.push("A difference on at least one product");
  }
  return missing;
});

function onSubmit() {
  submitted.value = true;
  if (missingFields.value.length) return;
  const payload: StockAdjustmentInput = {
    ...form,
    date: dmyToIso(dateText.value),
    tags: [...form.tags],
    lines: form.lines.map((line) => ({ ...line }))
  };
  // The per-location stock is what the pick lists read next time, so a saved
  // adjustment has to move it — not just record where it was meant to go.
  if (showLocations.value) {
    form.lines.forEach((line) => {
      if (!line.locations?.length) return;
      applyLocationAllocations(
        line.productId,
        line.locations,
        adjustmentDifference(line) > 0 ? "store" : "pick"
      );
    });
  }
  if (isEdit.value && props.recordId != null) {
    updateStockAdjustment(props.recordId, payload);
    navigateTo(`/products/stock-adjustment/${props.recordId}`);
    return;
  }
  const created = createStockAdjustment(payload);
  navigateTo(`/products/stock-adjustment/${created.id}`);
}

const isDirty = computed(() => Boolean(form.lines.length || form.memo.trim() || form.warehouse));

/** Leave-page body copy: "Information you entered" when creating (no prior
 *  state), "Your changes" when editing — mekari-product-writing →
 *  component-patterns.md § Modal. */
const leaveModalBody = computed(() =>
  isEdit.value ? "Your changes will not be saved." : "Information you entered will not be saved."
);

function onCancel() {
  if (isDirty.value) {
    isDiscardModalOpen.value = true;
    return;
  }
  leave();
}

function leave() {
  isDiscardModalOpen.value = false;
  navigateTo(
    isEdit.value && props.recordId
      ? `/products/stock-adjustment/${props.recordId}`
      : "/products?tab=stock_adjustments"
  );
}

/**
 * The Actions column is pinned to the right edge (docs/patterns/TablePage.md §
 * Pinned Actions column), so Remove stays reachable when this table scrolls
 * sideways rather than being the first thing to disappear. The 2px divider
 * that separates it from the scrolling content is only drawn while the table
 * actually overflows.
 */
const tableContainerRef = ref<{ $el?: HTMLElement } | null>(null);
const isTableOverflowing = ref(false);
let overflowObserver: ResizeObserver | null = null;

function checkTableOverflow() {
  const el = tableContainerRef.value?.$el;
  if (el) isTableOverflowing.value = el.scrollWidth > el.clientWidth + 1;
}

onMounted(() => {
  checkTableOverflow();
  const el = tableContainerRef.value?.$el;
  if (el && typeof ResizeObserver !== "undefined") {
    overflowObserver = new ResizeObserver(checkTableOverflow);
    overflowObserver.observe(el);
  }
  window.addEventListener("resize", checkTableOverflow);
});

onBeforeUnmount(() => {
  overflowObserver?.disconnect();
  window.removeEventListener("resize", checkTableOverflow);
});

// The table only exists on step 2, and its width moves with the rows.
watch([isPrepared, () => form.lines.length], () => requestAnimationFrame(checkTableOverflow));

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
// The addon supplies no padding of its own: Pixel's "input with prefix and
// suffix" pattern (docs.mekari.design/patterns/input.html) pads the addon's
// content by 12px, without which the prefix sits flush against both edges.
const addonTextClass = css({ px: 3 });
const bannerClass = css({ mb: 6 });

// Step 1 is a short, self-contained column — its commit row belongs to the
// form's own width, not the page's, so Continue sits under the fields it acts
// on rather than a screen away at the bottom right.
const prepareColumnClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 5,
  width: "100%",
  maxWidth: "660px"
});
const pairRowClass = css({ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 5 });
const radioStackClass = css({ display: "flex", flexDirection: "column", gap: 2 });
const prepareActionRowClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 4,
  flexWrap: "wrap",
  mt: 3
});
const bulkRowClass = css({ display: "flex", alignItems: "center", gap: 2 });
const bulkLinkClass = css({ display: "inline-flex" });
const prepareButtonsClass = css({ display: "flex", alignItems: "center", gap: 2 });

const printWrapClass = css({ display: "inline-flex" });
const numCellClass = css({ textAlign: "right" });
const actionHeadClass = css({ position: "sticky", right: "0", zIndex: 3, bg: "gray.25" });
// No background: it inherits the row's, so the pinned cell tracks row hover.
const actionCellClass = css({ position: "sticky", right: "0", zIndex: 1, textAlign: "right" });
const actionBorderClass = css({ boxShadow: "inset 2px 0 0 0 var(--mp-colors-gray-100)" });

// The three things step 1 settled, as a read-only label/value list.
const metaListClass = css({ display: "flex", flexDirection: "column", gap: 2, mb: 6 });
const metaRowClass = css({ display: "flex", alignItems: "baseline", gap: 4 });
const metaLabelClass = css({ width: "160px", flexShrink: 0 });
const metaGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 300px))",
  gap: 5,
  alignItems: "start",
  mb: 8
});
// Memo is a paragraph, so it takes the width of two fields.
const memoFieldClass = css({ gridColumn: "span 2" });
const priceCellClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 1
});
const priceInputClass = css({ minWidth: "0", flex: "1" });

const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
// Proportional, with a min-width floor — fixed px summing past the container
// pushes the trailing remove column out of view.
// Matched to the reference screen: the name column carries a picker, the
// quantity columns carry inputs, and the price column carries an input plus
// two icon buttons — so none of them can be the leftovers of the others.
// The Location column only exists when the warehouse has locations, so the
// widths come in two sets rather than one set with a hole in it.
const colWidths = computed(() =>
  showLocations.value
    ? ["17%", "11%", "13%", "14%", "11%", "13%", "16%", "5%"]
    : ["19%", "13%", "15%", "16%", "14%", "18%", "5%"]
);
const locationCellClass = css({ display: "flex", flexDirection: "column", gap: 1 });
const lineTableClass = css({ tableLayout: "fixed", width: "100%", minWidth: "880px" });
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});

const actionRowClass = css({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 2,
  mt: 8
});

const modalTitleClass = css({ fontSize: "lg" });
const modalFooterClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
</script>
