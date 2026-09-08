<template>
  <MpModal id="product-export-modal" :is-open="isOpen" size="lg" @close="emit('close')">
    <MpModalOverlay />
    <MpModalContent>
      <MpModalHeader>
        <span :class="modalTitleClass">Export product</span>
        <MpModalCloseButton />
      </MpModalHeader>

      <MpModalBody>
        <MpText color="gray.700" :class="introClass">
          Select the information you want to include in the exported file.
        </MpText>

        <MpCheckbox
          id="product-export-all"
          :is-checked="isAllChecked"
          :is-indeterminate="isSomeChecked"
          @change="toggleAll"
        >
          All information
        </MpCheckbox>

        <MpDivider :class="dividerClass" />

        <!-- Three columns, like the source: twenty-one labels in one column is
             a scroll, and in two it is a wall. -->
        <div :class="propertyGridClass">
          <MpCheckbox
            v-for="property in EXPORT_PROPERTIES"
            :id="`product-export-${property.key}`"
            :key="property.key"
            :is-checked="checked.has(property.key)"
            :is-disabled="property.isLocked"
            @change="toggle(property.key, $event)"
          >
            {{ property.label }}
          </MpCheckbox>
        </div>

        <MpDivider :class="dividerClass" />

        <MpCheckbox
          id="product-export-ignore-out-of-stock"
          :is-checked="excludeOutOfStock"
          @change="excludeOutOfStock = $event"
        >
          Exclude products outside inventory
        </MpCheckbox>
      </MpModalBody>

      <MpModalFooter>
        <div :class="modalFooterClass">
          <MpButton variant="secondary" @click="emit('close')">Cancel</MpButton>
          <MpButton variant="primary" @click="submit">Export</MpButton>
        </div>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  css,
  MpButton,
  MpCheckbox,
  MpDivider,
  MpModal,
  MpModalBody,
  MpModalCloseButton,
  MpModalContent,
  MpModalFooter,
  MpModalHeader,
  MpModalOverlay,
  MpText
} from "@mekari/pixel3";
import { downloadCsv, toCsv } from "~/utils/csv";
import { EXPORT_FILE_NAME, EXPORT_PROPERTIES } from "~/data/products-io";
import { getProducts } from "~/data/products";

// ---------------------------------------------------------------------------
// Export product. Cloned from jurnal-frontend-app
// src/components/pim/export-product-modal.
//
// A column picker for a file rather than for the table: the user ticks what the
// sheet should carry, and the file is built from the products already in memory
// (app/utils/csv.ts). The source queues a background job and mails a link;
// there is no job runner here, so the download happens on submit.
//
// Not ported: the custom-field properties (a Settings feature this prototype
// doesn't model) and the role/package gating that hides price columns.
// ---------------------------------------------------------------------------

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ close: [] }>();

const DEFAULT_KEYS = EXPORT_PROPERTIES.filter((p) => p.isDefault).map((p) => p.key);
const LOCKED_KEYS = EXPORT_PROPERTIES.filter((p) => p.isLocked).map((p) => p.key);

const checked = ref(new Set(DEFAULT_KEYS));
const excludeOutOfStock = ref(false);

const isAllChecked = computed(() => checked.value.size === EXPORT_PROPERTIES.length);
const isSomeChecked = computed(
  () => checked.value.size > LOCKED_KEYS.length && !isAllChecked.value
);

// Reopening starts from the defaults — the previous run's selection is not a
// setting the user saved, it is a choice they made for one file.
watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    checked.value = new Set(DEFAULT_KEYS);
    excludeOutOfStock.value = false;
  }
);

/** Sets don't trigger Vue's reactivity when mutated in place, so every change
 *  replaces the whole Set. */
function toggle(key: string, isChecked: boolean) {
  const next = new Set(checked.value);
  if (isChecked) next.add(key);
  else next.delete(key);
  checked.value = next;
}

/** "All information" can't untick the locked ones — a file with no product
 *  name identifies nothing. */
function toggleAll(isChecked: boolean) {
  checked.value = isChecked ? new Set(EXPORT_PROPERTIES.map((p) => p.key)) : new Set(LOCKED_KEYS);
}

function submit() {
  const properties = EXPORT_PROPERTIES.filter((p) => checked.value.has(p.key));
  // "Outside inventory" is the source's phrase for a product whose stock isn't
  // tracked at all — a service, or an item with Track stock off — not one that
  // happens to sit at zero.
  const products = getProducts().filter(
    (product) => !excludeOutOfStock.value || product.trackInventory
  );
  const header = properties.map((p) => p.label);
  const rows = products.map((product) => properties.map((p) => p.value(product)));
  downloadCsv(EXPORT_FILE_NAME.products, toCsv(header, rows));
  emit("close");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const modalTitleClass = css({ fontSize: "lg" });
const modalFooterClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
const introClass = css({ display: "block", mb: 4 });
const dividerClass = css({ my: 4 });
const propertyGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 3
});
</script>
