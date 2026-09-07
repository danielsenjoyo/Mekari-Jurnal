<template>
  <DefaultPageContent
    :title="title"
    breadcrumb="Warehouse transfer list"
    breadcrumb-to="/products?tab=warehouse_transfers"
  >
    <BlankSlate
      v-if="isEdit && !existing"
      title="Warehouse transfer not found"
      description="This transaction may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/products?tab=warehouse_transfers')">
        Back to Warehouse transfer list
      </MpButton>
    </BlankSlate>

    <template v-else>
      <MpBanner
        v-if="submitted && missingFields.length"
        id="transfer-form-missing-banner"
        variant="danger"
        :class="bannerClass"
      >
        <MpBannerIcon id="transfer-form-missing-icon" />
        <MpBannerTitle id="transfer-form-missing-title">
          Warehouse transfer can't be saved yet
        </MpBannerTitle>
        <MpBannerDescription id="transfer-form-missing-desc">
          Complete these before saving: {{ missingFields.join(", ") }}.
        </MpBannerDescription>
      </MpBanner>

      <!-- Zone A — what the transfer is, in one narrow column. -->
      <div :class="fieldColumnClass">
        <div :class="pairRowClass">
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
        </div>

        <div :class="pairRowClass">
          <MpFormControl is-required :is-invalid="submitted && !form.fromWarehouse">
            <MpFormLabel>From warehouse</MpFormLabel>
            <MpSelect
              v-model="form.fromWarehouse"
              is-full-width
              @update:model-value="onSourceChange"
            >
              <option value="">Select warehouse</option>
              <option v-for="option in WAREHOUSE_OPTIONS" :key="option" :value="option">
                {{ option }}
              </option>
            </MpSelect>
            <MpFormErrorMessage>Select a source warehouse</MpFormErrorMessage>
          </MpFormControl>

          <MpFormControl
            is-required
            :is-invalid="submitted && (!form.toWarehouse || sameWarehouse)"
          >
            <MpFormLabel>To warehouse</MpFormLabel>
            <MpSelect v-model="form.toWarehouse" is-full-width @update:model-value="onLinesReread">
              <option value="">Select warehouse</option>
              <option v-for="option in destinationOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </MpSelect>
            <MpFormErrorMessage>
              {{
                sameWarehouse
                  ? "Source and destination must be different"
                  : "Select a destination warehouse"
              }}
            </MpFormErrorMessage>
          </MpFormControl>
        </div>

        <MpFormControl>
          <MpFormLabel>Memo</MpFormLabel>
          <MpTextarea v-model="form.memo" />
        </MpFormControl>
      </div>

      <!-- The lines. Both ends are shown per row — what each warehouse holds
           now and what it will hold after — because a transfer is only
           checkable as a pair of before/after figures. The source's figure is
           also the cap (docs/patterns/form-page-format.md). -->
      <MpTableContainer ref="tableContainerRef" :class="[lineTableWrapClass, scrollShadowClass]">
        <MpTable :class="lineTableClass">
          <colgroup>
            <col v-for="(w, i) in colWidths" :key="i" :style="{ width: w }" />
          </colgroup>
          <MpTableHead is-fixed :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">Product name</MpTableCell>
              <MpTableCell as="th">Warehouse</MpTableCell>
              <MpTableCell as="th">Qty before</MpTableCell>
              <MpTableCell as="th">Qty after</MpTableCell>
              <MpTableCell as="th">Total transfer</MpTableCell>
              <!-- Stacked like the Warehouse column beside it: a transfer
                   touches locations at both ends — picked from shelves at the
                   source, put away on shelves at the destination. -->
              <MpTableCell v-if="showLocations" as="th">Location</MpTableCell>
              <MpTableCell
                as="th"
                :class="[actionHeadClass, isTableOverflowing ? actionBorderClass : '']"
              />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="(line, index) in form.lines" :key="line.productId">
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
              <MpTableCell as="td" :class="wrapCellClass">
                <div :class="stackedCellClass">
                  <MpText size="body-small" color="gray.600">
                    From: {{ form.fromWarehouse || "Unassigned" }}
                  </MpText>
                  <MpText size="body-small" color="gray.600">
                    To: {{ form.toWarehouse || "Unassigned" }}
                  </MpText>
                </div>
              </MpTableCell>
              <MpTableCell as="td" :class="wrapCellClass">
                <div :class="stackedCellClass">
                  <MpText>{{ formatQuantity(line.quantityAtSource) }} {{ line.unit }}</MpText>
                  <MpText>{{ formatQuantity(line.quantityAtDestination) }} {{ line.unit }}</MpText>
                </div>
              </MpTableCell>
              <MpTableCell as="td" :class="wrapCellClass">
                <div :class="stackedCellClass">
                  <MpText>
                    {{ formatQuantity(line.quantityAtSource - line.quantity) }} {{ line.unit }}
                  </MpText>
                  <MpText>
                    {{ formatQuantity(line.quantityAtDestination + line.quantity) }} {{ line.unit }}
                  </MpText>
                </div>
              </MpTableCell>
              <MpTableCell as="td">
                <MpFormControl :is-invalid="submitted && isOverLimit(line)">
                  <MpInput
                    v-model="quantityText[index]"
                    type="text"
                    inputmode="numeric"
                    :aria-label="`Quantity to transfer for ${line.name}`"
                    @update:model-value="onQuantityInput(index)"
                  />
                  <MpFormHelpText>of {{ formatQuantity(line.quantityAtSource) }}</MpFormHelpText>
                </MpFormControl>
              </MpTableCell>
              <MpTableCell v-if="showLocations" as="td">
                <div :class="stackedCellClass">
                  <template v-if="line.quantity > 0">
                    <MpTextlink v-if="fromWarehouseId" @click="openLocations(index, 'pick')">
                      {{ locationLabel(line, "pick") }}
                    </MpTextlink>
                    <MpText v-else size="body-small" color="gray.400">—</MpText>
                    <MpTextlink v-if="toWarehouseId" @click="openLocations(index, 'store')">
                      {{ locationLabel(line, "store") }}
                    </MpTextlink>
                    <MpText v-else size="body-small" color="gray.400">—</MpText>
                  </template>
                  <MpText v-else size="body-small" color="gray.400">
                    Enter a quantity first
                  </MpText>
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
                  <option value="">Select product</option>
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
              <MpTableCell
                as="td"
                :class="[actionCellClass, isTableOverflowing ? actionBorderClass : '']"
              />
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <!-- An over-limit line names the product and the number, because the cap
           differs per row — a generic "invalid" can't say which one is over. -->
      <MpText
        v-if="submitted && overLimitLines.length"
        size="body-small"
        color="red.400"
        :class="overLimitClass"
      >
        {{ overLimitLines.join(" · ") }}
      </MpText>

      <!-- Attachments: the delivery note or count sheet the transfer was
           taken from. MpUpload, not MpDropzone — see
           docs/patterns/form-page-format.md § Gotchas. -->
      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass">Attachments</MpText>
      <MpUpload
        id="transfer-attachments"
        accept=".xlsx, .xls, .doc, .docx, .pdf, .jpg, .jpeg, .png, .zip"
        placeholder="or drag & drop file here"
        is-multiple
        @change="onAttachmentsChange"
        @clear="form.attachments = []"
      />
      <MpText size="body-small" color="gray.600" :class="attachmentHelpClass">
        Files can be Excel, Word, PDF, JPG, PNG, or ZIP (maximum {{ MAX_ATTACHMENTS }} files and 10
        MB per file).
      </MpText>
      <MpFlex
        v-if="form.attachments.length"
        direction="column"
        gap="2"
        :class="attachmentListClass"
      >
        <MpUploadList
          v-for="(name, index) in form.attachments"
          :id="`transfer-attachment-${index}`"
          :key="name"
          :title="name"
          status="success"
          :is-show-download-button="false"
          @remove="form.attachments.splice(index, 1)"
        />
      </MpFlex>

      <div :class="actionRowClass">
        <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
        <MpButton variant="primary" @click="onSubmit">
          {{ isEdit ? "Save changes" : "Transfer" }}
        </MpButton>
      </div>

      <StorageQuantityDrawer
        v-if="locationTarget && locationLine"
        :is-open="Boolean(locationTarget)"
        :mode="locationTarget.mode"
        :product-id="locationLine.productId"
        :product-name="locationLine.name"
        :unit="locationLine.unit"
        :warehouse-id="locationWarehouseId"
        :warehouse-name="locationWarehouseName"
        :quantity="locationLine.quantity"
        :allocations="locationAllocations"
        @close="locationTarget = null"
        @save="onLocationsSaved"
      />

      <MpModal
        id="transfer-form-discard-modal"
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
  MpFlex,
  MpFormControl,
  MpFormErrorMessage,
  MpFormHelpText,
  MpFormLabel,
  MpIcon,
  MpInput,
  MpModal,
  MpModalBody,
  MpModalCloseButton,
  MpModalContent,
  MpModalFooter,
  MpModalHeader,
  MpModalOverlay,
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
  MpTooltip,
  MpUpload,
  MpUploadList
} from "@mekari/pixel3";
import StorageQuantityDrawer from "~/components/products/StorageQuantityDrawer.vue";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import {
  applyLocationAllocations,
  createWarehouseTransfer,
  emptyWarehouseTransferInput,
  formatQuantity,
  getProductById,
  getProducts,
  getStorableLocations,
  getWarehouseByName,
  getWarehouseTransferById,
  isStorageLocationFeatureActive,
  transferLineForProduct,
  updateWarehouseTransfer,
  warehouseTransferToInput,
  WAREHOUSE_OPTIONS,
  type LocationAllocation,
  type TransferLine,
  type WarehouseTransferInput
} from "~/data/products";
import { DATE_INPUT_FORMAT, dmyToIso, isoToDmy } from "~/utils/dates";

// ---------------------------------------------------------------------------
// Warehouse transfer create/edit, rendered by
// app/pages/products/warehouse-transfer/{new,edit/[id]}.vue.
//
// Cloned from jurnal-frontend-app src/pages/warehouse-transfers/form/. Not
// ported: attachments (no file storage is modelled), and the per-line batch /
// serial pickers.
//
// `/new?from=<id>` seeds the form from an existing transfer — the detail
// page's "Clone warehouse transfer" action. Cloning opens the form rather than
// writing a copy straight away, because the date and quantities still need
// reviewing before the new transfer is committed.
// ---------------------------------------------------------------------------

const props = defineProps<{ recordId?: number }>();

const route = useRoute();

const isEdit = computed(() => props.recordId != null);
const existing = computed(() =>
  props.recordId != null ? getWarehouseTransferById(props.recordId) : undefined
);
const cloneSource = computed(() => {
  const id = Number(route.query.from);
  return !isEdit.value && id ? getWarehouseTransferById(id) : undefined;
});

const form = reactive<WarehouseTransferInput>(emptyWarehouseTransferInput());
const dateText = ref("");
const quantityText = reactive<string[]>([]);

/** The source caps every line, and the reference screen caps attachments. */
const MAX_ATTACHMENTS = 5;

const submitted = ref(false);
const isDiscardModalOpen = ref(false);

function seedFromRecord() {
  const source = existing.value ?? cloneSource.value;
  Object.assign(form, source ? warehouseTransferToInput(source) : emptyWarehouseTransferInput());
  // A clone is a NEW transfer: it inherits the route and the lines but starts
  // today, not on the original's date.
  if (!existing.value && cloneSource.value) form.date = emptyWarehouseTransferInput().date;
  dateText.value = isoToDmy(form.date);
  quantityText.splice(0, quantityText.length, ...form.lines.map((line) => String(line.quantity)));
}

watch([existing, cloneSource], seedFromRecord, { immediate: true });

const title = computed(() => {
  if (isEdit.value) {
    return existing.value ? `Edit ${existing.value.number}` : "Edit warehouse transfer";
  }
  return cloneSource.value
    ? `Transfer warehouse (from ${cloneSource.value.number})`
    : "Transfer warehouse";
});

useHead({ title: computed(() => `${title.value} — Mekari Jurnal`) });

const sameWarehouse = computed(
  () => Boolean(form.fromWarehouse) && form.fromWarehouse === form.toWarehouse
);

/** A transfer to the warehouse it came from is a no-op, so the source
 *  warehouse is simply not offered as a destination. */
const destinationOptions = computed(() =>
  WAREHOUSE_OPTIONS.filter((option) => option !== form.fromWarehouse)
);

/** Only products the source warehouse actually holds can be moved out of it,
 *  and only ones not already on the sheet. */
const productOptions = computed(() => {
  const taken = new Set(form.lines.map((line) => line.productId));
  return getProducts().filter(
    (product) =>
      product.trackInventory &&
      !product.isArchived &&
      !taken.has(product.id) &&
      (!form.fromWarehouse || product.warehouse === form.fromWarehouse)
  );
});

function onAttachmentsChange(event: Event) {
  const files = (event.target as HTMLInputElement).files;
  if (!files) return;
  const names = [...files].map((file) => file.name);
  // Names only: there is no upload backend, and the cap is the source's.
  form.attachments = [...form.attachments, ...names].slice(0, MAX_ATTACHMENTS);
}

/** What a given row may become: any transferable product not already on
 *  another row, plus the one it currently holds. */
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
  form.lines.splice(
    index,
    1,
    transferLineForProduct(product, form.fromWarehouse, form.toWarehouse)
  );
  quantityText[index] = "0";
}

/** Both warehouses decide what every line already holds, so changing either
 *  re-reads all of them rather than leaving figures from the old pair. */
function onLinesReread() {
  form.lines.forEach((line, index) => {
    const product = getProductById(line.productId);
    if (!product) return;
    const fresh = transferLineForProduct(product, form.fromWarehouse, form.toWarehouse);
    line.quantityAtSource = fresh.quantityAtSource;
    line.quantityAtDestination = fresh.quantityAtDestination;
    void index;
  });
}

function onAddLine(value: unknown) {
  const product = getProductById(Number(value));
  if (!product) return;
  form.lines.push(transferLineForProduct(product, form.fromWarehouse, form.toWarehouse));
  quantityText.push("0");
}

function onQuantityInput(index: number) {
  const line = form.lines[index];
  if (!line) return;
  const digits = (quantityText[index] ?? "").replace(/[^\d]/g, "");
  line.quantity = digits ? Number(digits) : 0;
}

function removeLine(index: number) {
  form.lines.splice(index, 1);
  quantityText.splice(index, 1);
  if (locationTarget.value?.index === index) locationTarget.value = null;
}

// ---- Storage locations --------------------------------------------------
//
// A transfer moves stock between two warehouses, and each end may keep its
// stock at locations: the quantity is picked from named locations at the
// source and put away into named locations at the destination. The two are
// tracked separately on the line because the warehouses have different shelves.

const fromWarehouseId = computed(() => getWarehouseByName(form.fromWarehouse)?.id ?? null);
const toWarehouseId = computed(() => getWarehouseByName(form.toWarehouse)?.id ?? null);

const showLocations = computed(() => {
  if (!isStorageLocationFeatureActive()) return false;
  const ends = [fromWarehouseId.value, toWarehouseId.value].filter((id) => id !== null);
  return ends.some((id) => getStorableLocations(id).length > 0);
});

const locationTarget = ref<{ index: number; mode: "store" | "pick" } | null>(null);

const locationLine = computed(() =>
  locationTarget.value === null ? undefined : form.lines[locationTarget.value.index]
);

const locationWarehouseId = computed(() =>
  locationTarget.value?.mode === "pick" ? (fromWarehouseId.value ?? 0) : (toWarehouseId.value ?? 0)
);

const locationWarehouseName = computed(() =>
  locationTarget.value?.mode === "pick" ? form.fromWarehouse : form.toWarehouse
);

const locationAllocations = computed<LocationAllocation[]>(() => {
  const line = locationLine.value;
  if (!line) return [];
  return (locationTarget.value?.mode === "pick" ? line.pickLocations : line.storeLocations) ?? [];
});

function allocationsOf(line: TransferLine, mode: "store" | "pick"): LocationAllocation[] {
  return (mode === "pick" ? line.pickLocations : line.storeLocations) ?? [];
}

/** The link says what is left to do: the two ends are independent, so one can
 *  be settled while the other is still open. */
function locationLabel(line: TransferLine, mode: "store" | "pick"): string {
  const count = allocationsOf(line, mode).length;
  if (count)
    return `${mode === "pick" ? "From" : "To"}: ${count} location${count === 1 ? "" : "s"}`;
  return mode === "pick" ? "Pick from location" : "Set location";
}

function openLocations(index: number, mode: "store" | "pick") {
  locationTarget.value = { index, mode };
}

function onLocationsSaved(allocations: LocationAllocation[]) {
  const line = locationLine.value;
  if (!line || !locationTarget.value) return;
  if (locationTarget.value.mode === "pick") {
    line.pickLocations = allocations;
  } else {
    line.storeLocations = allocations;
  }
}

/** A changed quantity invalidates both splits — they were made to add up to
 *  the old one. */
watch(
  () => form.lines.map((line) => line.quantity).join(","),
  () => {
    form.lines.forEach((line) => {
      const total = (list: LocationAllocation[] | undefined) =>
        (list ?? []).reduce((sum, entry) => sum + entry.quantity, 0);
      if (line.pickLocations && total(line.pickLocations) !== line.quantity) {
        line.pickLocations = undefined;
      }
      if (line.storeLocations && total(line.storeLocations) !== line.quantity) {
        line.storeLocations = undefined;
      }
    });
  }
);

/** Changing the source re-reads each line's available quantity, and drops the
 *  ones the new warehouse doesn't hold — carrying them would let the form
 *  transfer stock out of a site that never had it. */
function onSourceChange() {
  if (form.toWarehouse === form.fromWarehouse) form.toWarehouse = "";
  for (let index = form.lines.length - 1; index >= 0; index--) {
    const line = form.lines[index]!;
    const product = getProductById(line.productId);
    // A product the new source doesn't hold can't be moved out of it, so the
    // line goes rather than sitting there with nothing to send.
    if (!product || (form.fromWarehouse && product.warehouse !== form.fromWarehouse)) {
      form.lines.splice(index, 1);
      quantityText.splice(index, 1);
      continue;
    }
  }
  onLinesReread();
}

function isOverLimit(line: TransferLine): boolean {
  return line.quantity > line.quantityAtSource;
}

const overLimitLines = computed(() =>
  form.lines
    .filter(isOverLimit)
    .map(
      (line) => `${line.name}: only ${formatQuantity(line.quantityAtSource)} ${line.unit} available`
    )
);

const missingFields = computed(() => {
  const missing: string[] = [];
  if (!form.fromWarehouse) missing.push("From warehouse");
  if (!form.toWarehouse) missing.push("To warehouse");
  if (sameWarehouse.value) missing.push("A destination different from the source");
  if (!dmyToIso(dateText.value)) missing.push("Date");
  if (form.lines.length === 0) missing.push("At least one product");
  else if (form.lines.every((line) => line.quantity <= 0)) missing.push("A quantity to transfer");
  if (overLimitLines.value.length) missing.push("Quantities within what the source holds");
  return missing;
});

function onSubmit() {
  submitted.value = true;
  if (missingFields.value.length) return;
  const payload: WarehouseTransferInput = {
    ...form,
    date: dmyToIso(dateText.value),
    // Rows left at zero were added and then thought better of; storing them
    // would put a product on the transfer that nothing moved for.
    lines: form.lines.filter((line) => line.quantity > 0).map((line) => ({ ...line }))
  };
  // Both ends move: the stock leaves the named locations at the source and
  // arrives in the named ones at the destination.
  if (showLocations.value) {
    form.lines.forEach((line) => {
      if (line.pickLocations?.length) {
        applyLocationAllocations(line.productId, line.pickLocations, "pick");
      }
      if (line.storeLocations?.length) {
        applyLocationAllocations(line.productId, line.storeLocations, "store");
      }
    });
  }
  if (isEdit.value && props.recordId != null) {
    updateWarehouseTransfer(props.recordId, payload);
    navigateTo(`/products/warehouse-transfer/${props.recordId}`);
    return;
  }
  const created = createWarehouseTransfer(payload);
  navigateTo(`/products/warehouse-transfer/${created.id}`);
}

const isDirty = computed(() =>
  Boolean(form.fromWarehouse || form.toWarehouse || form.lines.length || form.memo.trim())
);

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
      ? `/products/warehouse-transfer/${props.recordId}`
      : "/products?tab=warehouse_transfers"
  );
}

/** The Actions column is pinned right (docs/patterns/TablePage.md), so Remove
 *  stays reachable when this wide table scrolls sideways. */
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

watch(
  () => form.lines.length,
  () => requestAnimationFrame(checkTableOverflow)
);

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const bannerClass = css({ mb: 6 });
const fieldColumnClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 5,
  width: "100%",
  maxWidth: "660px"
});
const pairRowClass = css({ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 5 });
const lineTableWrapClass = css({ mt: 8 });
const stackedCellClass = css({ display: "flex", flexDirection: "column", gap: 1 });
const attachmentHelpClass = css({ display: "block", mt: 2, maxWidth: "440px" });
const attachmentListClass = css({ mt: 3, maxWidth: "440px" });
const actionHeadClass = css({ position: "sticky", right: "0", zIndex: 3, bg: "gray.25" });
const actionCellClass = css({ position: "sticky", right: "0", zIndex: 1, textAlign: "right" });
const actionBorderClass = css({ boxShadow: "inset 2px 0 0 0 var(--mp-colors-gray-100)" });
const sectionHeadingClass = css({ display: "block", fontSize: "lg", mt: 8, mb: 3 });

const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
// Product picker, the two warehouses, the two before/after pairs, the
// quantity input, and a narrow pinned Remove column.
// Two sets, because the Location column only exists when an end of the
// transfer actually keeps stock at locations.
const colWidths = computed(() =>
  showLocations.value
    ? ["21%", "15%", "14%", "14%", "16%", "15%", "5%"]
    : ["24%", "17%", "17%", "17%", "20%", "5%"]
);
const lineTableClass = css({ tableLayout: "fixed", width: "100%", minWidth: "720px" });
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
const overLimitClass = css({ display: "block", mt: 3 });
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
