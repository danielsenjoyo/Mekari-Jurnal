<template>
  <DefaultPageContent
    title="Warehouse settings"
    breadcrumb="Warehouses"
    breadcrumb-to="/products?segment=warehouses"
  >
    <div :class="sectionsClass">
      <!-- Storage location — the feature switch. Read-only until the pencil is
           used, because this one setting changes what several other screens
           offer and an always-live toggle invites a mis-click. -->
      <section :class="sectionClass">
        <div :class="sectionHeadClass">
          <div :class="sectionCopyClass">
            <MpText size="h3" weight="semiBold" color="dark">Storage location</MpText>
            <MpText size="body-small" color="gray.600">
              By activating this feature, you can manage storage locations in your warehouses at a
              specific level, such as area, rack, or bin.
            </MpText>
          </div>
          <MpTooltip v-if="!isEditing" placement="left" label="Edit">
            <MpButton
              variant="ghost"
              size="sm"
              left-icon="edit"
              aria-label="Edit storage location setting"
              @click="startEdit"
            />
          </MpTooltip>
        </div>

        <div :class="settingRowClass">
          <MpText weight="semiBold" color="dark">Feature status</MpText>
          <MpToggle
            v-if="isEditing"
            id="storage-location-feature"
            v-model:is-checked="draftActive"
          >
            {{ draftActive ? "Active" : "Inactive" }}
          </MpToggle>
          <MpBadge
            v-else
            for="tableStatus"
            :type="ACTIVE_STATUS_TYPE[isActive ? 'active' : 'inactive']"
          >
            {{ ACTIVE_STATUS_LABEL[isActive ? "active" : "inactive"] }}
          </MpBadge>
        </div>

        <div v-if="isEditing" :class="actionRowClass">
          <MpButton variant="ghost" @click="cancelEdit">Cancel</MpButton>
          <MpButton variant="primary" :is-disabled="draftActive === isActive" @click="save">
            Save changes
          </MpButton>
        </div>
      </section>

      <MpDivider />

      <!-- Location types live on their own screen: the list is tenant-wide and
           long enough to need its own table, but it belongs to this setting. -->
      <section :class="sectionClass">
        <div :class="sectionHeadClass">
          <div :class="sectionCopyClass">
            <MpText size="h3" weight="semiBold" color="dark">Location type</MpText>
            <MpText size="body-small" color="gray.600">
              The names your warehouses use for each level of storage — Area, Rack, Bin. A warehouse
              picks its levels from this list.
            </MpText>
          </div>
        </div>

        <div :class="settingRowClass">
          <MpText weight="semiBold" color="dark">
            {{ typeCount }} location {{ typeCount === 1 ? "type" : "types" }}
          </MpText>
          <MpButton
            variant="secondary"
            size="sm"
            @click="navigateTo('/products/warehouse/location-types')"
          >
            Manage location type
          </MpButton>
        </div>
      </section>
    </div>

    <!-- Refusing the switch-off needs a reason, not a silent no-op: the stock
         already counted into locations is what blocks it. -->
    <MpModal
      id="storage-location-blocked-modal"
      :is-open="isBlockedModalOpen"
      size="sm"
      @close="isBlockedModalOpen = false"
    >
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          <span :class="modalTitleClass">Storage location can't be turned off</span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="body" color="gray.700">
            Some locations still hold stock. Move that stock out of its locations first, then turn
            the feature off.
          </MpText>
        </MpModalBody>
        <MpModalFooter>
          <div :class="modalFooterClass">
            <MpButton variant="primary" @click="isBlockedModalOpen = false">Ok, got it</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  css,
  MpBadge,
  MpButton,
  MpDivider,
  MpModal,
  MpModalBody,
  MpModalCloseButton,
  MpModalContent,
  MpModalFooter,
  MpModalHeader,
  MpModalOverlay,
  MpText,
  MpToggle,
  MpTooltip
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import {
  ACTIVE_STATUS_LABEL,
  ACTIVE_STATUS_TYPE,
  getLocationTypes,
  isStorageLocationFeatureActive,
  setStorageLocationFeatureActive
} from "~/data/products";

// ---------------------------------------------------------------------------
// Warehouse settings. Cloned from jurnal-frontend-app
// src/scm/pages/warehouse/settings/index.vue.
//
// The storage-location feature switch, plus the way into the location-type
// list it depends on. Turning the feature off is refused while any location
// still holds stock — the source shows the same modal rather than discarding
// the quantities recorded against those locations.
// ---------------------------------------------------------------------------

useHead({ title: "Warehouse settings — Mekari Jurnal" });

const refreshTick = ref(0);
const isActive = computed(() => {
  void refreshTick.value;
  return isStorageLocationFeatureActive();
});
const typeCount = computed(() => {
  void refreshTick.value;
  return getLocationTypes().length;
});

const isEditing = ref(false);
const draftActive = ref(false);
const isBlockedModalOpen = ref(false);

function startEdit() {
  draftActive.value = isActive.value;
  isEditing.value = true;
}

function cancelEdit() {
  isEditing.value = false;
}

function save() {
  if (!setStorageLocationFeatureActive(draftActive.value)) {
    isBlockedModalOpen.value = true;
    return;
  }
  refreshTick.value++;
  isEditing.value = false;
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const sectionsClass = css({ display: "flex", flexDirection: "column", gap: 6, maxWidth: "660px" });
const sectionClass = css({ display: "flex", flexDirection: "column", gap: 4 });
const sectionHeadClass = css({ display: "flex", alignItems: "flex-start", gap: 4 });
const sectionCopyClass = css({ display: "flex", flexDirection: "column", gap: 1, flex: 1 });
const settingRowClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6
});
const actionRowClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
const modalTitleClass = css({ fontSize: "lg" });
const modalFooterClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
</script>
