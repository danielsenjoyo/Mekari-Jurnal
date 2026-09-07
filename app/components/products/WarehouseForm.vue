<template>
  <DefaultPageContent
    :title="title"
    breadcrumb="Warehouse list"
    breadcrumb-to="/products?tab=warehouses"
  >
    <BlankSlate
      v-if="isEdit && !existing"
      title="Warehouse not found"
      description="This warehouse may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/products?tab=warehouses')">
        Back to Warehouse list
      </MpButton>
    </BlankSlate>

    <template v-else>
      <MpBanner
        v-if="submitted && missingFields.length"
        id="warehouse-form-missing-banner"
        variant="danger"
        :class="bannerClass"
      >
        <MpBannerIcon id="warehouse-form-missing-icon" />
        <MpBannerTitle id="warehouse-form-missing-title">
          Warehouse can't be saved yet
        </MpBannerTitle>
        <MpBannerDescription id="warehouse-form-missing-desc">
          Complete these before saving: {{ missingFields.join(", ") }}.
        </MpBannerDescription>
      </MpBanner>

      <!-- Zone A — the warehouse itself. One narrow column, as the reference
           screen has it: five short fields don't need the page's full width
           (docs/patterns/form-page-format.md § Products module). -->
      <div :class="fieldColumnClass">
        <MpFormControl is-required :is-invalid="submitted && !form.name.trim()">
          <div :class="labelRowClass">
            <MpFormLabel>Warehouse name</MpFormLabel>
            <MpText size="body-small" color="gray.600">
              {{ form.name.length }}/{{ NAME_MAX_LENGTH }}
            </MpText>
          </div>
          <MpInput v-model="form.name" :maxlength="NAME_MAX_LENGTH" />
          <MpFormErrorMessage>Enter a warehouse name</MpFormErrorMessage>
        </MpFormControl>

        <MpFormControl>
          <MpFormLabel>Warehouse code</MpFormLabel>
          <MpInput v-model="form.code" />
        </MpFormControl>

        <!-- Several people can share a warehouse, so this is a capped
             multi-select rather than one PIC. The count is in the label
             because the cap is only meaningful while you're filling it. -->
        <MpFormControl>
          <MpFormLabel>
            Person in charge ({{ form.pics.length }}/{{ MAX_WAREHOUSE_PICS }})
            <template #icon>
              <MpTooltip
                placement="top"
                use-portal
                :label="`Up to ${MAX_WAREHOUSE_PICS} people can be responsible for this warehouse.`"
              >
                <MpIcon name="info" size="sm" />
              </MpTooltip>
            </template>
          </MpFormLabel>
          <MpInputTag
            id="warehouse-form-pics"
            :key="picsKey"
            placeholder="Select person in charge"
            :data="picTags"
            :suggestions="PIC_OPTIONS"
            :max-tags="MAX_WAREHOUSE_PICS"
            :max-row="-1"
            :is-show-suggestions="true"
            :is-enable-create-new-tag="false"
            :is-show-icon-chevron-down="true"
            @change="onPicsChange"
          />
          <MpFormHelpText>
            The selected user will receive a reminder email when products are reaching minimum stock
            limits, as well as upcoming or already expired batch
          </MpFormHelpText>
        </MpFormControl>

        <MpFormControl>
          <MpFormLabel>Address</MpFormLabel>
          <MpTextarea v-model="form.address" />
        </MpFormControl>

        <MpFormControl>
          <MpFormLabel>Description</MpFormLabel>
          <MpTextarea v-model="form.description" />
        </MpFormControl>
      </div>

      <!-- Zone B — multilevel storage. The levels are ordered, and the order
           is the meaning: level 1 contains level 2 contains level 3.
           The whole section belongs to the storage-location feature, so it is
           absent while that is switched off (Warehouse settings). -->
      <template v-if="showStorage">
        <MpText weight="semiBold" color="dark" :class="sectionHeadingClass"
          >Storage location</MpText
        >
        <MpText size="body-small" color="gray.600" :class="sectionCaptionClass">
          In this section, you can sort locations from the most general to the most specific.
          Example: Area is the broader and bin is the most specific.
        </MpText>

        <MpTableContainer>
          <MpTable :class="levelTableClass">
            <colgroup>
              <col v-for="(w, i) in levelColWidths" :key="i" :style="{ width: w }" />
            </colgroup>
            <MpTableHead is-fixed :class="tableHeadClass">
              <MpTableRow>
                <MpTableCell as="th">Level</MpTableCell>
                <MpTableCell as="th">
                  <div :class="headerWithIconClass">
                    Location type
                    <MpTooltip
                      placement="top"
                      use-portal
                      label="What you call this level of storage here — Area, Rack, Bin, and so on."
                    >
                      <MpIcon name="info" size="sm" />
                    </MpTooltip>
                  </div>
                </MpTableCell>
                <MpTableCell as="th">Storing preference</MpTableCell>
                <MpTableCell as="th" />
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow
                v-for="(level, index) in form.storageLevels"
                :key="`${level.type}-${index}`"
              >
                <MpTableCell as="td">Level {{ index + 1 }}</MpTableCell>
                <MpTableCell as="td">{{ level.type }}</MpTableCell>
                <MpTableCell as="td">
                  <MpCheckbox
                    :id="`warehouse-level-storing-${index}`"
                    :is-checked="level.isStoringPreference"
                    :aria-label="`Store products at ${level.type} level`"
                    @change="level.isStoringPreference = !level.isStoringPreference"
                  />
                </MpTableCell>
                <MpTableCell as="td" :class="rowActionClass">
                  <MpButton
                    variant="ghost"
                    size="sm"
                    left-icon="minus-circular"
                    :aria-label="`Remove ${level.type}`"
                    @click="removeLevel(index)"
                  />
                </MpTableCell>
              </MpTableRow>

              <!-- Trailing placeholder row = the add affordance. It spans the
                 table because the picker is wider than the Level column it
                 would otherwise sit in. -->
              <MpTableRow>
                <MpTableCell as="td" :colspan="levelColWidths.length">
                  <div :class="levelPickerClass">
                    <MpAutocomplete
                      id="warehouse-form-level"
                      :model-value="''"
                      :data="levelTypeOptions"
                      placeholder="Select or enter to add"
                      empty-text="No type matches. Add it below."
                      is-searchable
                      is-full-width
                      is-show-button-action
                      use-portal
                      @update:model-value="addLevel"
                      @button-action="onCreateLevelType"
                      @enter="onCreateLevelType"
                    >
                      <template #buttonAction>Add a new location type</template>
                    </MpAutocomplete>
                  </div>
                </MpTableCell>
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>

        <MpText size="body-small" color="gray.600" :class="sectionCaptionClass">
          Location types are managed for the whole company —
          <MpTextlink @click="navigateTo('/products/warehouse/location-types')">
            manage location type
          </MpTextlink>
        </MpText>
      </template>

      <div :class="actionRowClass">
        <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
        <MpButton variant="primary" @click="onSubmit">
          {{ isEdit ? "Save changes" : "Submit" }}
        </MpButton>
      </div>

      <MpModal
        id="warehouse-form-discard-modal"
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
import { computed, reactive, ref, watch } from "vue";
import {
  css,
  MpAutocomplete,
  MpBanner,
  MpBannerDescription,
  MpBannerIcon,
  MpBannerTitle,
  MpButton,
  MpCheckbox,
  MpFormControl,
  MpFormErrorMessage,
  MpFormHelpText,
  MpFormLabel,
  MpIcon,
  MpInput,
  MpInputTag,
  MpModal,
  MpModalBody,
  MpModalCloseButton,
  MpModalContent,
  MpModalFooter,
  MpModalHeader,
  MpModalOverlay,
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
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import {
  createLocationType,
  createWarehouse,
  emptyWarehouseInput,
  getLocationTypes,
  getWarehouseById,
  getWarehouses,
  isLocationTypeNameTaken,
  isStorageLocationFeatureActive,
  MAX_LOCATION_TYPES,
  MAX_WAREHOUSE_PICS,
  updateWarehouse,
  warehouseToInput,
  type WarehouseInput
} from "~/data/products";

// The warehouse create/edit form, rendered by app/pages/products/warehouse/new.vue
// and .../warehouse/edit/[id].vue. Cloned from jurnal-frontend-app
// src/pages/warehouses/form/index.vue — whose per-field "hint" panel is
// collapsed into MpFormHelpText here, since the hints are one line each.

const props = defineProps<{ recordId?: number }>();

const NAME_MAX_LENGTH = 255;

const isEdit = computed(() => props.recordId != null);
const existing = computed(() =>
  props.recordId != null ? getWarehouseById(props.recordId) : undefined
);

const form = reactive<WarehouseInput>(emptyWarehouseInput());
const submitted = ref(false);
const isDiscardModalOpen = ref(false);

/** Whoever already runs a warehouse — this prototype has no people directory,
 *  so the existing PICs are the list. */
const PIC_OPTIONS = [...new Set(getWarehouses().flatMap((warehouse) => warehouse.pics))]
  .filter(Boolean)
  .sort();

/** MpInputTag owns its chip list internally, so it is re-mounted by key
 *  whenever the selection is replaced from outside (seeding an existing
 *  warehouse). Without it the model loads while the chips stay empty. */
const picsKey = ref(0);

const picTags = computed(() =>
  form.pics.map((name) => ({
    id: `pic-${name}`,
    text: name,
    value: name,
    isInvalid: false,
    isReadOnly: false
  }))
);

function onPicsChange(tags: { value?: string; text?: string }[]) {
  form.pics = tags.map((tag) => tag.value ?? tag.text ?? "").filter(Boolean);
}

// ---- Storage levels -----------------------------------------------------

/** "Select or enter to add": a level name that isn't on the list becomes one
 *  for the rest of the session. */
/** The company's own list (Warehouse settings › Location type), not a constant:
 *  a name added here has to show up there too, or the two screens disagree
 *  about what a level can be called. */
const typesTick = ref(0);
const levelTypeOptions = computed(() => {
  void typesTick.value;
  return getLocationTypes().map((type) => type.name);
});

/** The whole storage section is part of the storage-location feature. */
const showStorage = computed(() => isStorageLocationFeatureActive());

function addLevel(value: unknown) {
  const type = String(value ?? "").trim();
  if (!type) return;
  if (form.storageLevels.some((level) => level.type === type)) return;
  // Appended, never inserted: the row order IS the containment order, and the
  // caption above tells the user to go broadest-first.
  form.storageLevels.push({ type, isStoringPreference: false });
}

/** "Enter to add" creates a real location type, so it is on the management
 *  screen and available to every other warehouse from now on — which is what
 *  the picker's caption promises. Capped like that screen is. */
function onCreateLevelType(_suggestions: string[], search: string) {
  const type = String(search ?? "").trim();
  if (!type) return;
  if (!isLocationTypeNameTaken(type) && levelTypeOptions.value.length < MAX_LOCATION_TYPES) {
    createLocationType(type);
    typesTick.value++;
  }
  addLevel(type);
}

function removeLevel(index: number) {
  form.storageLevels.splice(index, 1);
}

watch(
  existing,
  () => {
    Object.assign(form, existing.value ? warehouseToInput(existing.value) : emptyWarehouseInput());
    picsKey.value += 1;
  },
  { immediate: true }
);

const title = computed(() => {
  if (!isEdit.value) return "Add new warehouse";
  return existing.value ? `Edit ${existing.value.name}` : "Edit warehouse";
});

useHead({ title: computed(() => `${title.value} — Mekari Jurnal`) });

const missingFields = computed(() => {
  const missing: string[] = [];
  if (!form.name.trim()) missing.push("Warehouse name");
  return missing;
});

function onSubmit() {
  submitted.value = true;
  if (missingFields.value.length) return;
  const payload: WarehouseInput = {
    ...form,
    pics: [...form.pics],
    storageLevels: form.storageLevels.map((level) => ({ ...level }))
  };
  if (isEdit.value && props.recordId != null) {
    updateWarehouse(props.recordId, payload);
    navigateTo(`/products/warehouse/${props.recordId}`);
    return;
  }
  const created = createWarehouse(payload);
  navigateTo(`/products/warehouse/${created.id}`);
}

const isDirty = computed(() =>
  Boolean(
    form.name.trim() ||
    form.code.trim() ||
    form.address.trim() ||
    form.description.trim() ||
    form.pics.length ||
    form.storageLevels.length
  )
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
      ? `/products/warehouse/${props.recordId}`
      : "/products?tab=warehouses"
  );
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const bannerClass = css({ mb: 6 });
const fieldColumnClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 5,
  width: "100%",
  maxWidth: "660px"
});
const labelRowClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 2
});

const sectionHeadingClass = css({ display: "block", fontSize: "lg", mt: 8, mb: 2 });
const sectionCaptionClass = css({ display: "block", mb: 4 });

const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const headerWithIconClass = css({ display: "flex", alignItems: "center", gap: 1 });
// The reference screen packs the three columns to the left and puts the
// remove button at the far right edge.
const levelColWidths = ["10%", "16%", "22%", "52%"];
const levelTableClass = css({
  tableLayout: "fixed",
  width: "100%",
  minWidth: "720px",
  // The table closes the page, and its final rule reads as a border on the
  // commit row below it.
  "& tbody tr:last-child td": { borderBottomWidth: "0!" }
});
const rowActionClass = css({ textAlign: "right" });
// The picker keeps its own width inside a row that spans the table.
const levelPickerClass = css({ maxWidth: "462px" });

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
