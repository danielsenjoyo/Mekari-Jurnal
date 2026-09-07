<template>
  <MpDrawer :is-open="isOpen" placement="right" size="xl" @close="emit('close')">
    <MpDrawerOverlay />
    <MpDrawerContent>
      <MpDrawerHeader>
        <span :class="titleClass">{{ isPick ? "Pick from location" : "Set location" }}</span>
        <MpDrawerCloseButton />
      </MpDrawerHeader>

      <MpDrawerBody>
        <!-- What is being placed, and where. The line is already on the form
             behind the drawer; repeating it here is what stops the user
             counting out a quantity for the wrong product. -->
        <div :class="metaListClass">
          <div :class="metaRowClass">
            <MpText color="gray.600" :class="metaLabelClass">Product name</MpText>
            <MpText color="dark">{{ productName }}</MpText>
          </div>
          <div :class="metaRowClass">
            <MpText color="gray.600" :class="metaLabelClass">Qty</MpText>
            <MpText color="dark">{{ formatQuantity(quantity) }} {{ unit }}</MpText>
          </div>
          <div :class="metaRowClass">
            <MpText color="gray.600" :class="metaLabelClass">Warehouse</MpText>
            <MpText color="dark">{{ warehouseName }}</MpText>
          </div>
        </div>

        <BlankSlate
          v-if="!storableLocations.length"
          title="No storage location yet"
          description="This warehouse stores everything in one undivided space. Add a location to it before you can place stock in one."
        />

        <template v-else>
          <MpTableContainer>
            <MpTable :class="tableClass">
              <colgroup>
                <col v-for="(w, i) in colWidths" :key="i" :style="{ width: w }" />
              </colgroup>
              <MpTableHead is-fixed :class="tableHeadClass">
                <MpTableRow>
                  <MpTableCell as="th">Location name</MpTableCell>
                  <MpTableCell v-if="isPick" as="th" :class="numCellClass">
                    Stock in location
                  </MpTableCell>
                  <MpTableCell as="th">Qty</MpTableCell>
                  <MpTableCell v-if="isPick" as="th" />
                  <MpTableCell as="th" />
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="(row, index) in rows" :key="row.key">
                  <MpTableCell as="td">
                    <MpAutocomplete
                      :id="`storage-qty-location-${row.key}`"
                      :model-value="row.locationId === null ? '' : String(row.locationId)"
                      :data="optionsFor(index)"
                      label-prop="label"
                      value-prop="value"
                      placeholder="Select location"
                      empty-text="Location not found."
                      is-searchable
                      is-full-width
                      use-portal
                      @update:model-value="onLocationChange(index, $event)"
                    >
                      <template #default="{ item }">
                        <div :class="optionClass">
                          <MpText color="dark">{{ item.label }}</MpText>
                          <MpText v-if="isPick" size="body-small" color="gray.600">
                            Stock in location: {{ formatQuantity(item.stock) }} {{ unit }}
                          </MpText>
                        </div>
                      </template>
                    </MpAutocomplete>
                  </MpTableCell>

                  <MpTableCell v-if="isPick" as="td" :class="numCellClass">
                    {{ formatQuantity(stockAt(row.locationId)) }}
                  </MpTableCell>

                  <MpTableCell as="td">
                    <MpFormControl :is-invalid="Boolean(rowError(index))">
                      <MpInput
                        v-model="row.text"
                        type="text"
                        inputmode="numeric"
                        :aria-label="`Qty for row ${index + 1}`"
                      />
                      <MpFormErrorMessage>{{ rowError(index) }}</MpFormErrorMessage>
                    </MpFormControl>
                  </MpTableCell>

                  <!-- "Pick all" fills the row with what is left to account
                       for, capped by what the location actually holds. -->
                  <MpTableCell v-if="isPick" as="td">
                    <MpButton
                      variant="textLink"
                      size="sm"
                      :is-disabled="pickAllAmount(index) <= 0"
                      @click="pickAll(index)"
                    >
                      Pick all
                    </MpButton>
                  </MpTableCell>

                  <MpTableCell as="td" :class="rowActionClass">
                    <MpTooltip placement="left" label="Remove">
                      <MpButton
                        variant="ghost"
                        size="sm"
                        left-icon="minus-circular"
                        :aria-label="`Remove row ${index + 1}`"
                        @click="removeRow(index)"
                      />
                    </MpTooltip>
                  </MpTableCell>
                </MpTableRow>

                <!-- Trailing picker = the add affordance, the same shape the
                     warehouse form's level table uses. -->
                <MpTableRow v-if="unusedOptions.length">
                  <MpTableCell as="td" :colspan="colWidths.length">
                    <div :class="addPickerClass">
                      <MpAutocomplete
                        id="storage-qty-add-location"
                        :model-value="''"
                        :data="unusedOptions"
                        label-prop="label"
                        value-prop="value"
                        placeholder="Select location"
                        empty-text="Location not found."
                        is-searchable
                        is-full-width
                        use-portal
                        @update:model-value="addRow"
                      >
                        <template #default="{ item }">
                          <div :class="optionClass">
                            <MpText color="dark">{{ item.label }}</MpText>
                            <MpText v-if="isPick" size="body-small" color="gray.600">
                              Stock in location: {{ formatQuantity(item.stock) }} {{ unit }}
                            </MpText>
                          </div>
                        </template>
                      </MpAutocomplete>
                    </div>
                  </MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>

          <!-- The running total against the line's own quantity: the whole
               point of the screen is that these two match. -->
          <div :class="totalRowClass">
            <MpText weight="semiBold" color="dark">Total</MpText>
            <MpText :color="isBalanced ? 'dark' : 'red.400'">
              {{ formatQuantity(total) }}
            </MpText>
            <MpText color="gray.600">/ {{ formatQuantity(quantity) }} {{ unit }}</MpText>
          </div>
          <MpText v-if="submitted && !isBalanced" size="body-small" color="red.400">
            Total must be equal
          </MpText>
        </template>
      </MpDrawerBody>

      <MpDrawerFooter>
        <div :class="footerClass">
          <MpButton variant="ghost" @click="emit('close')">Cancel</MpButton>
          <MpButton variant="primary" :is-disabled="!storableLocations.length" @click="onDone">
            Done
          </MpButton>
        </div>
      </MpDrawerFooter>
    </MpDrawerContent>
  </MpDrawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  css,
  MpAutocomplete,
  MpButton,
  MpDrawer,
  MpDrawerBody,
  MpDrawerCloseButton,
  MpDrawerContent,
  MpDrawerFooter,
  MpDrawerHeader,
  MpDrawerOverlay,
  MpFormControl,
  MpFormErrorMessage,
  MpInput,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpText,
  MpTooltip
} from "@mekari/pixel3";
import BlankSlate from "~/components/template/BlankSlate.vue";
import {
  formatQuantity,
  getStorageStockFor,
  storageLocationPath,
  type LocationAllocation
} from "~/data/products";

/**
 * "Set location" / "Pick from location" — where a movement's quantity goes to,
 * or comes from, inside a warehouse that keeps stock at locations.
 *
 * Cloned from jurnal-frontend-app
 * src/scm/components/organisms/warehouse/QuantityDrawer, which the source
 * reaches as its own route per line; here it is a drawer over the form, so the
 * line being placed stays on screen behind it.
 *
 * One component for both directions because the only differences are the title,
 * the stock column, and the "Pick all" shortcut — the arithmetic ("these rows
 * must add up to the line's quantity") is identical.
 */
const props = defineProps<{
  isOpen: boolean;
  /** Pick takes stock out of locations, store puts it in. */
  mode: "store" | "pick";
  productId: number;
  productName: string;
  unit: string;
  warehouseId: number;
  warehouseName: string;
  /** The line's own quantity — what the rows have to add up to. */
  quantity: number;
  allocations: LocationAllocation[];
}>();

const emit = defineEmits<{ close: []; save: [allocations: LocationAllocation[]] }>();

const isPick = computed(() => props.mode === "pick");

interface Row {
  /** Stable across re-sorts and removals, so an input keeps its focus. */
  key: number;
  locationId: number | null;
  text: string;
}

let nextRowKey = 1;
const rows = ref<Row[]>([]);
const submitted = ref(false);

/** Only locations stock may actually sit in, each with what it holds of this
 *  product — the "Stock in location" the pick list shows. */
const storableLocations = computed(() =>
  props.warehouseId ? getStorageStockFor(props.productId, props.warehouseId) : []
);

const options = computed(() =>
  storableLocations.value.map(({ location, stock }) => ({
    label: storageLocationPath(location),
    value: String(location.id),
    stock
  }))
);

/** Reset on open: the drawer is a draft over one line, and reopening it
 *  holding another line's rows would place stock nobody asked to place. */
watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) return;
    submitted.value = false;
    rows.value = props.allocations.map((allocation) => ({
      key: nextRowKey++,
      locationId: allocation.locationId,
      text: allocation.quantity ? String(allocation.quantity) : ""
    }));
  },
  { immediate: true }
);

function stockAt(locationId: number | null): number {
  if (locationId === null) return 0;
  return storableLocations.value.find((entry) => entry.location.id === locationId)?.stock ?? 0;
}

function quantityOf(row: Row): number {
  const parsed = Number(row.text.replace(/[^\d]/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

const total = computed(() => rows.value.reduce((sum, row) => sum + quantityOf(row), 0));
const isBalanced = computed(() => total.value === props.quantity);

/** A location can hold only one row: two rows against the same shelf are two
 *  halves of one number, and they would have to be added up by eye. */
const usedIds = computed(() => rows.value.map((row) => row.locationId).filter((id) => id !== null));

const unusedOptions = computed(() =>
  options.value.filter((option) => !usedIds.value.includes(Number(option.value)))
);

function optionsFor(index: number) {
  const own = rows.value[index]?.locationId;
  return options.value.filter(
    (option) => !usedIds.value.includes(Number(option.value)) || Number(option.value) === own
  );
}

function onLocationChange(index: number, value: unknown) {
  const row = rows.value[index];
  if (!row) return;
  const id = Number(value);
  row.locationId = Number.isNaN(id) || !value ? null : id;
}

function addRow(value: unknown) {
  const id = Number(value);
  if (!value || Number.isNaN(id)) return;
  rows.value.push({ key: nextRowKey++, locationId: id, text: "" });
}

function removeRow(index: number) {
  rows.value.splice(index, 1);
}

/** What this row could still take: the shortfall, capped by the location's own
 *  stock (picking more than a shelf holds is the error below). */
function pickAllAmount(index: number): number {
  const row = rows.value[index];
  if (!row) return 0;
  const others = total.value - quantityOf(row);
  const remaining = Math.max(0, props.quantity - others);
  return Math.min(remaining, stockAt(row.locationId));
}

function pickAll(index: number) {
  const row = rows.value[index];
  if (row) row.text = String(pickAllAmount(index));
}

function rowError(index: number): string {
  if (!submitted.value) return "";
  const row = rows.value[index];
  if (!row) return "";
  if (row.locationId === null) return "Select a location";
  const quantity = quantityOf(row);
  if (!row.text.trim()) return "Qty must be filled in";
  if (quantity <= 0) return "Qty must exceed 0";
  if (isPick.value && quantity > stockAt(row.locationId)) return "Qty exceeds stock";
  return "";
}

const hasRowErrors = computed(() =>
  rows.value.some((_row, index) => {
    const row = rows.value[index]!;
    if (row.locationId === null || !row.text.trim()) return true;
    const quantity = quantityOf(row);
    if (quantity <= 0) return true;
    return isPick.value && quantity > stockAt(row.locationId);
  })
);

function onDone() {
  submitted.value = true;
  if (hasRowErrors.value || !isBalanced.value) return;
  emit(
    "save",
    rows.value.map((row) => ({ locationId: row.locationId as number, quantity: quantityOf(row) }))
  );
  emit("close");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const titleClass = css({ fontSize: "lg" });
const metaListClass = css({ display: "flex", flexDirection: "column", gap: 2, mb: 6 });
const metaRowClass = css({ display: "flex", alignItems: "baseline", gap: 6 });
const metaLabelClass = css({ width: "168px", flexShrink: 0 });

const colWidths = computed(() =>
  isPick.value ? ["auto", "140px", "140px", "96px", "56px"] : ["auto", "260px", "56px"]
);
const tableClass = css({ width: "full", tableLayout: "fixed" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
const rowActionClass = css({ textAlign: "right" });
const optionClass = css({ display: "flex", flexDirection: "column" });
const addPickerClass = css({ maxWidth: "380px" });
const totalRowClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 2,
  mt: 4
});
const footerClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
</script>
