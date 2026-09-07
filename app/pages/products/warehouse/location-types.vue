<template>
  <DefaultPageContent
    title="Location type management"
    breadcrumb="Warehouse settings"
    breadcrumb-to="/products/warehouse/settings"
  >
    <template #actions>
      <!-- Twenty is the cap the source enforces; a disabled button with the
           reason beats an Add that silently does nothing. -->
      <MpTooltip
        v-if="isAtLimit"
        placement="bottom-end"
        use-portal
        :label="`You've reached the limit of ${MAX_LOCATION_TYPES} location types.`"
      >
        <span :class="tooltipWrapClass">
          <MpButton variant="primary" is-disabled>Add location type</MpButton>
        </span>
      </MpTooltip>
      <MpButton v-else variant="primary" @click="openAdd">Add location type</MpButton>
    </template>

    <MpText color="gray.600" :class="introClass">
      The names your warehouses use for each level of storage. A warehouse picks from this list when
      it sets up its levels, broadest first.
    </MpText>

    <BlankSlate
      v-if="!types.length"
      title="Location types will appear here"
      description="Add a location type from the Add location type button."
    >
      <MpButton variant="secondary" @click="openAdd">Add location type</MpButton>
    </BlankSlate>

    <MpTableContainer v-else>
      <MpTable :class="tableClass">
        <colgroup>
          <col />
          <col :style="{ width: '160px' }" />
        </colgroup>
        <MpTableHead is-fixed :class="tableHeadClass">
          <MpTableRow>
            <MpTableCell as="th">
              <!-- The only column, so it is the only sort — the source sorts it
                   by name and nothing else. -->
              <button type="button" :class="sortHeaderClass" @click="toggleSort">
                Location type
                <MpIcon :name="sortAsc ? 'sort-ascending' : 'sort-descending'" size="sm" />
              </button>
            </MpTableCell>
            <MpTableCell as="th" :class="actionCellClass">Actions</MpTableCell>
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="type in types" :key="type.id">
            <MpTableCell as="td">{{ type.name }}</MpTableCell>
            <MpTableCell as="td" :class="actionCellClass">
              <MpPopover placement="bottom-end" use-portal is-adaptive-width is-close-on-select>
                <template #default>
                  <MpPopoverTrigger>
                    <MpButton
                      variant="secondary"
                      size="sm"
                      right-icon="chevrons-down"
                      :aria-label="`Actions for ${type.name}`"
                    >
                      Actions
                    </MpButton>
                  </MpPopoverTrigger>
                  <MpPopoverContent>
                    <MpPopoverList>
                      <!-- In use means a warehouse names one of its levels
                           this. Renaming or removing it would leave those
                           warehouses describing their shelves with a word that
                           no longer exists, so both are blocked and the
                           tooltip says why. -->
                      <MpTooltip
                        v-if="inUse(type.id)"
                        placement="left"
                        use-portal
                        label="This location type is used by a warehouse, so it can't be edited."
                      >
                        <MpPopoverListItem is-disabled>Edit</MpPopoverListItem>
                      </MpTooltip>
                      <MpPopoverListItem v-else role="menuitem" @click="openEdit(type)">
                        Edit
                      </MpPopoverListItem>

                      <MpTooltip
                        v-if="inUse(type.id)"
                        placement="left"
                        use-portal
                        label="This location type is used by a warehouse, so it can't be deleted."
                      >
                        <MpPopoverListItem is-disabled>Delete</MpPopoverListItem>
                      </MpTooltip>
                      <MpPopoverListItem v-else role="menuitem" @click="openDelete(type)">
                        Delete
                      </MpPopoverListItem>
                    </MpPopoverList>
                  </MpPopoverContent>
                </template>
              </MpPopover>
            </MpTableCell>
          </MpTableRow>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>

    <!-- Add / edit share one modal: the same single field, and the title is
         the only thing that differs. -->
    <MpModal id="location-type-modal" :is-open="isFormOpen" size="sm" @close="isFormOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          <span :class="modalTitleClass">
            {{ editing ? "Edit location type name" : "Add location type" }}
          </span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpFormControl is-required :is-invalid="Boolean(nameError)">
            <div :class="labelRowClass">
              <MpFormLabel>Location type</MpFormLabel>
              <MpText size="body-small" color="gray.600">
                {{ name.length }}/{{ LOCATION_TYPE_NAME_MAX_LENGTH }}
              </MpText>
            </div>
            <MpInput
              v-model="name"
              placeholder="Example: Zone"
              :maxlength="LOCATION_TYPE_NAME_MAX_LENGTH"
            />
            <MpFormErrorMessage>{{ nameError }}</MpFormErrorMessage>
          </MpFormControl>
        </MpModalBody>
        <MpModalFooter>
          <div :class="modalFooterClass">
            <MpButton variant="ghost" @click="isFormOpen = false">Cancel</MpButton>
            <MpButton variant="primary" @click="save">
              {{ editing ? "Save changes" : "Save" }}
            </MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>

    <MpModal
      id="location-type-delete-modal"
      :is-open="Boolean(pendingDelete)"
      size="sm"
      @close="pendingDelete = null"
    >
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          <span :class="modalTitleClass">Delete {{ pendingDelete?.name }}?</span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="body" color="gray.700">
            Warehouses set up after this will no longer be able to name a level "{{
              pendingDelete?.name
            }}".
          </MpText>
        </MpModalBody>
        <MpModalFooter>
          <div :class="modalFooterClass">
            <MpButton variant="ghost" @click="pendingDelete = null">Cancel</MpButton>
            <MpButton variant="danger" @click="confirmDelete">Delete</MpButton>
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
  MpButton,
  MpFormControl,
  MpFormErrorMessage,
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
  MpPopover,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpPopoverTrigger,
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
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import {
  createLocationType,
  deleteLocationType,
  getLocationTypes,
  isLocationTypeInUse,
  isLocationTypeNameTaken,
  LOCATION_TYPE_NAME_MAX_LENGTH,
  MAX_LOCATION_TYPES,
  renameLocationType,
  type LocationType
} from "~/data/products";

// ---------------------------------------------------------------------------
// Location type management. Cloned from jurnal-frontend-app
// src/scm/pages/warehouse/StorageType/index.vue.
//
// One tenant-wide list of the words a warehouse can call a level of storage —
// Area, Rack, Bin. It is a management screen rather than a free-text field on
// the warehouse form because two warehouses that both say "Area" mean the same
// thing by it, and renaming it here renames it everywhere.
// ---------------------------------------------------------------------------

useHead({ title: "Location type management — Mekari Jurnal" });

const refreshTick = ref(0);
const sortAsc = ref(true);

const types = computed(() => {
  void refreshTick.value;
  const list = getLocationTypes();
  return sortAsc.value ? list : list.slice().reverse();
});

const isAtLimit = computed(() => types.value.length >= MAX_LOCATION_TYPES);

function inUse(id: number) {
  void refreshTick.value;
  return isLocationTypeInUse(id);
}

function toggleSort() {
  sortAsc.value = !sortAsc.value;
}

// ---- Add / edit ---------------------------------------------------------

const isFormOpen = ref(false);
const editing = ref<LocationType | null>(null);
const name = ref("");
const nameError = ref("");

function openAdd() {
  editing.value = null;
  name.value = "";
  nameError.value = "";
  isFormOpen.value = true;
}

function openEdit(type: LocationType) {
  editing.value = type;
  name.value = type.name;
  nameError.value = "";
  isFormOpen.value = true;
}

function save() {
  const value = name.value.trim();
  if (!value) {
    nameError.value = "You must fill in the location type name";
    return;
  }
  if (isLocationTypeNameTaken(value, editing.value?.id)) {
    nameError.value = "Location type name has been used. Please enter another name";
    return;
  }
  if (editing.value) {
    renameLocationType(editing.value.id, value);
  } else {
    createLocationType(value);
  }
  refreshTick.value++;
  isFormOpen.value = false;
}

// ---- Delete -------------------------------------------------------------

const pendingDelete = ref<LocationType | null>(null);

function openDelete(type: LocationType) {
  pendingDelete.value = type;
}

function confirmDelete() {
  if (pendingDelete.value) deleteLocationType(pendingDelete.value.id);
  pendingDelete.value = null;
  refreshTick.value++;
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const introClass = css({ display: "block", mb: 6, maxWidth: "640px" });
const tooltipWrapClass = css({ display: "inline-flex" });
const tableClass = css({ width: "full" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const actionCellClass = css({ textAlign: "right" });
// The sortable header is a control, and the documented exception to the raw
// <button> rule (docs/patterns/TablePage.md).
const sortHeaderClass = css({
  display: "inline-flex",
  alignItems: "center",
  gap: 1,
  bg: "transparent",
  border: "none",
  p: 0,
  cursor: "pointer",
  font: "inherit",
  color: "inherit"
});
const modalTitleClass = css({ fontSize: "lg" });
const modalFooterClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
const labelRowClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 2
});
</script>
