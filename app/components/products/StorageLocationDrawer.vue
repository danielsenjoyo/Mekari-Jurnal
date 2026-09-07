<template>
  <MpDrawer :is-open="isOpen" placement="right" size="md" @close="emit('close')">
    <MpDrawerOverlay />
    <MpDrawerContent>
      <MpDrawerHeader>
        <span :class="titleClass">Add new storage location</span>
        <MpDrawerCloseButton />
      </MpDrawerHeader>

      <MpDrawerBody>
        <div :class="formClass">
          <!-- Where the new location sits. A location either stands in the
               warehouse (level 1) or inside another location (one level
               deeper) — those are the only two, so they are radios rather
               than a mode buried in the picker below. -->
          <MpFormControl>
            <MpFormLabel>Placement</MpFormLabel>
            <div :class="radioRowClass">
              <MpRadio id="storage-placement-warehouse" v-model="placement" value="warehouse">
                Warehouse
              </MpRadio>
              <MpRadio id="storage-placement-location" v-model="placement" value="location">
                Storage location
              </MpRadio>
            </div>
          </MpFormControl>

          <MpFormControl is-required :is-invalid="submitted && !selectedWarehouseId">
            <MpFormLabel>Warehouse</MpFormLabel>
            <MpSelect v-model="warehouseValue" is-full-width aria-label="Warehouse">
              <option value="">Select warehouse</option>
              <option v-for="option in warehouses" :key="option.id" :value="String(option.id)">
                {{ option.name }}
              </option>
            </MpSelect>
            <MpFormErrorMessage>Select a warehouse</MpFormErrorMessage>
          </MpFormControl>

          <MpFormControl
            v-if="placement === 'location'"
            is-required
            :is-invalid="submitted && !parentId"
          >
            <MpFormLabel>Storage location</MpFormLabel>
            <MpSelect
              v-model="parentValue"
              is-full-width
              :is-disabled="!selectedWarehouseId"
              aria-label="Parent storage location"
            >
              <option value="">Select storage location</option>
              <option v-for="option in parentOptions" :key="option.id" :value="String(option.id)">
                {{ option.label }}
              </option>
            </MpSelect>
            <MpFormErrorMessage>Select a storage location</MpFormErrorMessage>
            <MpFormHelpText v-if="selectedWarehouseId && parentOptions.length === 0">
              Every location in this warehouse is already at its deepest level.
            </MpFormHelpText>
          </MpFormControl>

          <!-- Read-only on purpose: the type is whatever the warehouse calls
               this depth, so it follows the placement rather than being
               chosen. Empty until there is a placement to derive it from. -->
          <MpFormControl>
            <MpFormLabel>
              Storage type
              <template #icon>
                <MpTooltip
                  placement="top"
                  use-portal
                  label="Set by the warehouse's storage levels, in order — you can't pick one here."
                >
                  <MpIcon name="info" size="sm" />
                </MpTooltip>
              </template>
            </MpFormLabel>
            <MpInput :model-value="storageType" is-read-only aria-label="Storage type" />
            <MpFormHelpText v-if="selectedWarehouseId && !warehouse?.storageLevels.length">
              This warehouse has no storage levels yet. Add them on the warehouse first.
            </MpFormHelpText>
          </MpFormControl>

          <MpFormControl is-required :is-invalid="submitted && !name.trim()">
            <div :class="labelRowClass">
              <MpFormLabel>Location name</MpFormLabel>
              <MpText size="body-small" color="gray.600">
                {{ name.length }}/{{ NAME_MAX_LENGTH }}
              </MpText>
            </div>
            <MpInput v-model="name" :maxlength="NAME_MAX_LENGTH" />
            <MpFormErrorMessage>Enter a location name</MpFormErrorMessage>
          </MpFormControl>
        </div>
      </MpDrawerBody>

      <MpDrawerFooter>
        <div :class="footerClass">
          <MpButton variant="ghost" @click="emit('close')">Cancel</MpButton>
          <MpButton variant="primary" @click="onSave">Save</MpButton>
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
  MpFormControl,
  MpFormErrorMessage,
  MpFormHelpText,
  MpFormLabel,
  MpIcon,
  MpInput,
  MpRadio,
  MpSelect,
  MpText,
  MpTooltip
} from "@mekari/pixel3";
import {
  createStorageLocation,
  getStorageLocationById,
  getStorageLocationTree,
  getWarehouseById,
  getWarehouses,
  storageLevelTypeAt,
  storageLocationPath,
  type StorageLocation
} from "~/data/products";

/**
 * "Add new storage location", as a drawer — reached from the Products list's
 * Actions menu and from a warehouse's own page.
 *
 * It is one component because the two entry points differ only in whether the
 * warehouse is already known: from a warehouse page it is fixed, from the list
 * the user picks it. Two copies would drift the moment either changed.
 */
const props = defineProps<{
  isOpen: boolean;
  /** Pre-selected and left editable — a warehouse page knows which warehouse
   *  is meant, the Products list can't. */
  warehouseId?: number;
}>();

const emit = defineEmits<{ close: []; created: [location: StorageLocation] }>();

const NAME_MAX_LENGTH = 20;

const warehouses = getWarehouses();

const placement = ref<"warehouse" | "location">("warehouse");
const selectedWarehouseId = ref<number | null>(null);
const parentId = ref<number | null>(null);
const name = ref("");
const submitted = ref(false);

/** Reset on every open: a drawer that reopens holding the last thing typed is
 *  a drawer that saves something the user didn't mean. */
watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) return;
    placement.value = "warehouse";
    selectedWarehouseId.value = props.warehouseId ?? null;
    parentId.value = null;
    name.value = "";
    submitted.value = false;
  },
  { immediate: true }
);

// MpSelect speaks strings; the ids are numbers.
const warehouseValue = computed({
  get: () => (selectedWarehouseId.value === null ? "" : String(selectedWarehouseId.value)),
  set: (value: string) => {
    selectedWarehouseId.value = value ? Number(value) : null;
    // The parent belonged to the old warehouse.
    parentId.value = null;
  }
});

const parentValue = computed({
  get: () => (parentId.value === null ? "" : String(parentId.value)),
  set: (value: string) => {
    parentId.value = value ? Number(value) : null;
  }
});

const warehouse = computed(() =>
  selectedWarehouseId.value === null ? undefined : getWarehouseById(selectedWarehouseId.value)
);

/** Only locations that can still hold something: a Bin in a three-level
 *  warehouse is the bottom, and offering it as a parent would create a level
 *  the warehouse has no name for. */
const parentOptions = computed(() => {
  const depth = warehouse.value?.storageLevels.length ?? 0;
  if (selectedWarehouseId.value === null) return [];
  return getStorageLocationTree(selectedWarehouseId.value)
    .filter((location) => location.level < depth)
    .map((location) => ({ id: location.id, label: storageLocationPath(location) }));
});

/** The depth this location will land at, and so its type. */
const storageType = computed(() => {
  if (!warehouse.value) return "";
  if (placement.value === "warehouse") return storageLevelTypeAt(warehouse.value, 1);
  const parent = parentId.value === null ? undefined : getStorageLocationById(parentId.value);
  return parent ? storageLevelTypeAt(warehouse.value, parent.level + 1) : "";
});

function onSave() {
  submitted.value = true;
  if (!selectedWarehouseId.value || !name.value.trim()) return;
  if (placement.value === "location" && !parentId.value) return;
  // No type means the warehouse has no level for this depth — saving would
  // produce a location the warehouse can't describe.
  if (!storageType.value) return;

  const created = createStorageLocation({
    warehouseId: selectedWarehouseId.value,
    parentId: placement.value === "location" ? parentId.value : null,
    name: name.value
  });
  emit("created", created);
  emit("close");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const titleClass = css({ fontSize: "lg" });
const formClass = css({ display: "flex", flexDirection: "column", gap: 5 });
const radioRowClass = css({ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" });
const labelRowClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 2
});
const footerClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
</script>
