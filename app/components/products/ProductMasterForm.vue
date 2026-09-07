<template>
  <DefaultPageContent
    :title="title"
    breadcrumb="Product with variant list"
    breadcrumb-to="/products?tab=masters"
  >
    <BlankSlate
      v-if="isEdit && !existing"
      title="Product with variant not found"
      description="This product may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/products?tab=masters')">
        Back to Product with variant list
      </MpButton>
    </BlankSlate>

    <template v-else>
      <MpBanner
        v-if="submitted && missingFields.length"
        id="master-form-missing-banner"
        variant="danger"
        :class="bannerClass"
      >
        <MpBannerIcon id="master-form-missing-icon" />
        <MpBannerTitle id="master-form-missing-title">Product can't be saved yet</MpBannerTitle>
        <MpBannerDescription id="master-form-missing-desc">
          Complete these before saving: {{ missingFields.join(", ") }}.
        </MpBannerDescription>
      </MpBanner>

      <!-- Zone A — main product. Same narrow-column shape as the single-product
           form: short fields stacked in one column, image picker beside them
           (docs/patterns/form-page-format.md § Products module). -->
      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass">Main product</MpText>
      <div :class="identityRowClass">
        <div :class="fieldColumnClass">
          <MpFormControl is-required :is-invalid="submitted && !form.name.trim()">
            <MpFormLabel>Main product name</MpFormLabel>
            <MpInput v-model="form.name" :maxlength="NAME_MAX_LENGTH" />
            <MpFormErrorMessage>Enter a main product name</MpFormErrorMessage>
          </MpFormControl>

          <div :class="pairRowClass">
            <MpFormControl>
              <MpFormLabel>Unit</MpFormLabel>
              <MpAutocomplete
                id="master-form-unit"
                v-model="form.unit"
                :data="unitOptions"
                placeholder="Select unit or type to add new"
                empty-text="No unit matches. Add it below."
                is-searchable
                is-full-width
                is-show-button-action
                use-portal
                @button-action="onCreateUnit"
                @enter="onCreateUnit"
              >
                <template #buttonAction>Add a new unit</template>
              </MpAutocomplete>
            </MpFormControl>
            <div />
          </div>

          <MpFormControl>
            <MpFormLabel>Product category</MpFormLabel>
            <MpAutocomplete
              id="master-form-category"
              v-model="form.category"
              :data="categoryOptions"
              placeholder="Select category or type"
              empty-text="No category matches. Add it below."
              is-searchable
              is-full-width
              is-show-button-action
              use-portal
              @button-action="onCreateCategory"
              @enter="onCreateCategory"
            >
              <template #buttonAction>Add a new category</template>
            </MpAutocomplete>
          </MpFormControl>

          <MpFormControl>
            <MpFormLabel>Description</MpFormLabel>
            <div :class="textareaWrapClass">
              <MpTextarea v-model="form.description" :maxlength="DESCRIPTION_MAX_LENGTH" />
              <MpText size="body-small" color="gray.600" :class="textareaCounterClass">
                {{ form.description.length }}/{{ DESCRIPTION_MAX_LENGTH }}
              </MpText>
            </div>
          </MpFormControl>
        </div>

        <div :class="imageBoxClass">
          <!-- Idle content supplied by hand for the same reason as the
               single-product form: the `product` variant renders no format
               hint, and the `default` variant hard-codes "Browse". -->
          <MpDropzone
            id="master-form-image"
            accept=".jpg, .jpeg, .png"
            is-enable-input-file
            @change="onImageChange"
            @clear="form.imageName = ''"
          >
            <template #idle="{ handleClickInput }">
              <div :class="imageIdleClass">
                <MpIcon name="img" size="md" color="gray.500" />
                <MpTextlink @click="handleClickInput">Choose product image</MpTextlink>
                <MpText size="body-small" color="gray.600" :class="imageHintClass">
                  File format JPG or PNG (max. 2 MB)
                </MpText>
              </div>
            </template>
          </MpDropzone>
        </div>
      </div>

      <MpDivider :class="sectionDividerClass" />

      <!-- Zone B — price & stock. Accounts and taxes only: the prices
           themselves are per variant, so they live in the table below. -->
      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass">Price &amp; stock</MpText>

      <div :class="checkboxRowClass">
        <MpCheckbox id="master-is-buy" :is-checked="form.isBuy" @change="form.isBuy = !form.isBuy">
          I buy this item
        </MpCheckbox>
      </div>
      <div v-if="form.isBuy" :class="panelClass">
        <MpTableContainer>
          <MpTable :class="panelTableClass">
            <colgroup>
              <col v-for="(w, i) in tripleColWidths" :key="i" :style="{ width: w }" />
            </colgroup>
            <MpTableHead is-fixed :class="tableHeadClass">
              <MpTableRow>
                <MpTableCell as="th">Purchases account</MpTableCell>
                <MpTableCell as="th">Default buy tax</MpTableCell>
                <MpTableCell as="th" />
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow>
                <MpTableCell as="td">
                  <MpFormControl :is-invalid="submitted && form.isBuy && !form.buyAccount">
                    <MpSelect
                      v-model="form.buyAccount"
                      is-full-width
                      aria-label="Purchases account"
                    >
                      <option value="">Select account</option>
                      <option v-for="option in BUY_ACCOUNT_OPTIONS" :key="option" :value="option">
                        {{ option }}
                      </option>
                    </MpSelect>
                    <MpFormErrorMessage>Select a purchases account</MpFormErrorMessage>
                  </MpFormControl>
                </MpTableCell>
                <MpTableCell as="td">
                  <MpSelect v-model="form.buyTax" is-full-width aria-label="Default buy tax">
                    <option v-for="option in TAX_OPTIONS" :key="option || 'none'" :value="option">
                      {{ option || "Select tax" }}
                    </option>
                  </MpSelect>
                </MpTableCell>
                <MpTableCell as="td" />
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>
      </div>

      <div :class="checkboxRowClass">
        <MpCheckbox
          id="master-is-sell"
          :is-checked="form.isSell"
          @change="form.isSell = !form.isSell"
        >
          I sell this item
        </MpCheckbox>
      </div>
      <div v-if="form.isSell" :class="panelClass">
        <MpTableContainer>
          <MpTable :class="panelTableClass">
            <colgroup>
              <col v-for="(w, i) in tripleColWidths" :key="i" :style="{ width: w }" />
            </colgroup>
            <MpTableHead is-fixed :class="tableHeadClass">
              <MpTableRow>
                <MpTableCell as="th">Sales account</MpTableCell>
                <MpTableCell as="th">Default sell tax</MpTableCell>
                <MpTableCell as="th">Discount account</MpTableCell>
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow>
                <MpTableCell as="td">
                  <MpFormControl :is-invalid="submitted && form.isSell && !form.sellAccount">
                    <MpSelect v-model="form.sellAccount" is-full-width aria-label="Sales account">
                      <option value="">Select account</option>
                      <option v-for="option in SELL_ACCOUNT_OPTIONS" :key="option" :value="option">
                        {{ option }}
                      </option>
                    </MpSelect>
                    <MpFormErrorMessage>Select a sales account</MpFormErrorMessage>
                  </MpFormControl>
                </MpTableCell>
                <MpTableCell as="td">
                  <MpSelect v-model="form.sellTax" is-full-width aria-label="Default sell tax">
                    <option v-for="option in TAX_OPTIONS" :key="option || 'none'" :value="option">
                      {{ option || "Select tax" }}
                    </option>
                  </MpSelect>
                </MpTableCell>
                <MpTableCell as="td">
                  <MpSelect
                    v-model="form.sellDiscountAccount"
                    is-full-width
                    aria-label="Discount account"
                  >
                    <option value="">Select account</option>
                    <option v-for="option in SELL_ACCOUNT_OPTIONS" :key="option" :value="option">
                      {{ option }}
                    </option>
                  </MpSelect>
                </MpTableCell>
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>
      </div>

      <div :class="checkboxRowClass">
        <MpCheckbox id="master-track" :is-checked="form.trackInventory" @change="onToggleTrack">
          Track stock for this item
        </MpCheckbox>
      </div>
      <div v-if="form.trackInventory" :class="panelClass">
        <MpTableContainer>
          <MpTable :class="panelTableClass">
            <colgroup>
              <col v-for="(w, i) in tripleColWidths" :key="i" :style="{ width: w }" />
            </colgroup>
            <MpTableHead is-fixed :class="tableHeadClass">
              <MpTableRow>
                <MpTableCell as="th">Default inventory account</MpTableCell>
                <MpTableCell as="th" />
                <MpTableCell as="th" />
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow>
                <MpTableCell as="td">
                  <MpFormControl
                    :is-invalid="submitted && form.trackInventory && !form.inventoryAccount"
                  >
                    <MpSelect
                      v-model="form.inventoryAccount"
                      is-full-width
                      aria-label="Default inventory account"
                    >
                      <option value="">Select account</option>
                      <option
                        v-for="option in INVENTORY_ACCOUNT_OPTIONS"
                        :key="option"
                        :value="option"
                      >
                        {{ option }}
                      </option>
                    </MpSelect>
                    <MpFormErrorMessage>Select an inventory account</MpFormErrorMessage>
                    <MpFormHelpText>
                      Opening quantity can be recorded through stock adjustment
                    </MpFormHelpText>
                  </MpFormControl>
                </MpTableCell>
                <MpTableCell as="td" />
                <MpTableCell as="td" />
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>
      </div>

      <MpDivider :class="sectionDividerClass" />

      <!-- Zone C — the attributes, and the table they generate. Each attribute
           is a dimension: Size (4 options) × Colour (3) makes 12 variants. -->
      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass">Product variant</MpText>

      <div v-for="(attribute, index) in form.attributes" :key="index" :class="attributeRowClass">
        <MpFormControl is-required :is-invalid="submitted && index === 0 && !attribute.name">
          <MpFormLabel>Attribute</MpFormLabel>
          <MpAutocomplete
            :id="`master-attribute-name-${index}`"
            :model-value="attribute.name"
            :data="attributeChoicesFor(index)"
            placeholder="Select attribute or type to add new"
            empty-text="No attribute matches. Add it below."
            is-searchable
            is-full-width
            is-show-button-action
            use-portal
            @update:model-value="onAttributeNameChange(index, $event)"
            @button-action="(_s: string[], search: string) => onCreateAttribute(index, search)"
            @enter="(_s: string[], search: string) => onCreateAttribute(index, search)"
          >
            <template #buttonAction>Add a new attribute</template>
          </MpAutocomplete>
          <MpFormErrorMessage>Select an attribute</MpFormErrorMessage>
        </MpFormControl>

        <div>
          <MpFormControl
            is-required
            :is-invalid="submitted && index === 0 && attribute.options.length === 0"
          >
            <MpFormLabel>Options</MpFormLabel>
            <MpInputTag
              :id="`master-attribute-${index}`"
              :key="`${index}-${attributeKeys[index]}`"
              placeholder="Select option or type to add new"
              :data="tagDataFor(attribute)"
              :max-row="-1"
              :is-enable-create-new-tag="true"
              @change="onOptionsChange(index, $event)"
            />
            <MpFormErrorMessage>Select at least 1 option</MpFormErrorMessage>
          </MpFormControl>

          <!-- Off in the reference screen too. Kept visible, and disabled with
               a reason, because a variant image is a real feature of this form
               that this prototype has nowhere to store. -->
          <MpTooltip label="Variant images are not available yet." placement="right">
            <span :class="variantImageToggleClass">
              <MpToggle :id="`master-attribute-image-${index}`" is-disabled>
                Add image to variant
              </MpToggle>
            </span>
          </MpTooltip>
        </div>

        <div :class="attributeActionClass">
          <MpButton
            v-if="form.attributes.length > 1"
            variant="ghost"
            size="sm"
            left-icon="minus-circular"
            aria-label="Remove attribute"
            @click="removeAttribute(index)"
          />
        </div>
      </div>

      <!-- Capped at two, as the source caps it. The tooltip carries the reason
           rather than the button silently doing nothing. -->
      <MpTooltip v-if="!canAddAttribute" :label="addAttributeBlockedReason">
        <span :class="addAttributeWrapClass">
          <MpButton variant="ghost" size="sm" left-icon="add-circular" is-disabled>
            Add attribute
          </MpButton>
        </span>
      </MpTooltip>
      <MpButton v-else variant="ghost" size="sm" left-icon="add-circular" @click="addAttribute">
        Add attribute
      </MpButton>

      <!-- The rows ARE the attribute combinations, so they can't be added or
           removed here; what each row carries — its SKU, barcode and the two
           prices — is entered per row, and there is nowhere else to enter it. -->
      <MpTableContainer :class="[variantTableWrapClass, scrollShadowClass]">
        <MpTable :class="variantTableClass">
          <colgroup>
            <col v-for="(w, i) in variantColWidths" :key="i" :style="{ width: w }" />
          </colgroup>
          <MpTableHead is-fixed :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">
                <div :class="headerWithIconClass">
                  Product name
                  <MpTooltip
                    placement="top"
                    use-portal
                    label="Each variant is named after the main product and its options."
                  >
                    <MpIcon name="info" size="sm" />
                  </MpTooltip>
                </div>
              </MpTableCell>
              <MpTableCell as="th">Product code / SKU</MpTableCell>
              <MpTableCell as="th">Barcode</MpTableCell>
              <MpTableCell as="th">Unit buy price</MpTableCell>
              <MpTableCell as="th">Unit sell price</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="(row, index) in variantRows" :key="row.key">
              <MpTableCell as="td" :class="wrapCellClass">{{ row.name }}</MpTableCell>
              <MpTableCell as="td">
                <MpInput
                  v-model="row.code"
                  :aria-label="`Product code for ${row.name}`"
                  :placeholder="fallbackCode(index)"
                />
              </MpTableCell>
              <MpTableCell as="td">
                <MpInput v-model="row.barcode" :aria-label="`Barcode for ${row.name}`" />
              </MpTableCell>
              <MpTableCell as="td">
                <div @focusout="onRowMoneyBlur(row, 'buy')">
                  <MpInputGroup>
                    <MpInputLeftAddon has-background>
                      <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                    </MpInputLeftAddon>
                    <MpInput
                      v-model="row.buyText"
                      type="text"
                      inputmode="decimal"
                      :aria-label="`Unit buy price for ${row.name}`"
                      @update:model-value="onRowMoneyInput(row, 'buy')"
                    />
                  </MpInputGroup>
                </div>
              </MpTableCell>
              <MpTableCell as="td">
                <div @focusout="onRowMoneyBlur(row, 'sell')">
                  <MpInputGroup>
                    <MpInputLeftAddon has-background>
                      <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                    </MpInputLeftAddon>
                    <MpInput
                      v-model="row.sellText"
                      type="text"
                      inputmode="decimal"
                      :aria-label="`Unit sell price for ${row.name}`"
                      @update:model-value="onRowMoneyInput(row, 'sell')"
                    />
                  </MpInputGroup>
                </div>
              </MpTableCell>
            </MpTableRow>

            <MpTableRow v-if="variantRows.length === 0">
              <MpTableCell as="td" :colspan="variantColWidths.length">
                <BlankSlate
                  variant="no-data"
                  title="Product variant will appear here"
                  :description="emptyStateDescription"
                />
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <div :class="actionRowClass">
        <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
        <MpButton v-if="isEdit" variant="primary" @click="onSubmit(false)">Save changes</MpButton>
        <MpFlex v-else>
          <MpButton variant="primary" :class="saveButtonClass" @click="onSubmit(false)">
            Save
          </MpButton>
          <MpPopover placement="bottom-end" use-portal is-adaptive-width>
            <template #default>
              <MpPopoverTrigger>
                <MpButton
                  variant="primary"
                  :class="saveCaretButtonClass"
                  right-icon="caret-down"
                  aria-label="More save options"
                />
              </MpPopoverTrigger>
              <MpPopoverContent>
                <MpPopoverList>
                  <MpPopoverListItem role="menuitem" @click="onSubmit(true)">
                    Save &amp; add new
                  </MpPopoverListItem>
                </MpPopoverList>
              </MpPopoverContent>
            </template>
          </MpPopover>
        </MpFlex>
      </div>

      <MpModal
        id="master-form-discard-modal"
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
  MpDivider,
  MpDropzone,
  MpFlex,
  MpFormControl,
  MpFormErrorMessage,
  MpFormHelpText,
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
  MpToggle,
  MpTooltip
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import {
  BUY_ACCOUNT_OPTIONS,
  createProductMaster,
  emptyProductMasterInput,
  formatAmount,
  getProductMasterById,
  INVENTORY_ACCOUNT_OPTIONS,
  MAX_VARIANT_ATTRIBUTES,
  parseAmount,
  PRODUCT_CATEGORIES,
  productMasterToInput,
  SELL_ACCOUNT_OPTIONS,
  TAX_OPTIONS,
  UNIT_OPTIONS,
  updateProductMaster,
  usableAttributes,
  VARIANT_ATTRIBUTE_OPTIONS,
  variantKey,
  type ProductMasterInput,
  type VariantAttribute
} from "~/data/products";

// ---------------------------------------------------------------------------
// The product-with-variant create/edit form, rendered by both
// app/pages/products/master/new.vue and .../master/edit/[id].vue.
//
// Matched to the reference app's "Add new product with variant" screen. Three
// sections — Main product, Price & stock, Product variant — and one structural
// consequence worth stating: **the master has no price of its own**. Price &
// stock carries accounts and taxes only, and the two prices are entered per row
// of the variant table, because that is where they differ. The master's
// headline figures (what the list column shows) are derived from the first row.
//
// The rows themselves are still generated from the attributes — a master's
// variants ARE the cartesian product of its options, which is why the source
// resets the table whenever an attribute changes. What the user owns per row is
// the SKU, the barcode and the two prices; those survive an attribute edit as
// long as the row's option values do (see `syncVariantRows`).
// ---------------------------------------------------------------------------

const props = defineProps<{ recordId?: number }>();

const NAME_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 6000;

const isEdit = computed(() => props.recordId != null);
const existing = computed(() =>
  props.recordId != null ? getProductMasterById(props.recordId) : undefined
);

const form = reactive<ProductMasterInput>(emptyProductMasterInput());

/** MpInputTag owns its chip list internally, so each editor is re-mounted via
 *  its key whenever the options are replaced from outside (seeding, removing
 *  an attribute). Without it the model clears while the chips stay on screen. */
const attributeKeys = ref<number[]>([0, 0]);

const submitted = ref(false);
const isDiscardModalOpen = ref(false);

/** Creatable vocabularies — the reference screen's "or type to add new". */
const unitOptions = ref<string[]>([...UNIT_OPTIONS]);
const categoryOptions = ref<string[]>([...PRODUCT_CATEGORIES]);
const attributeOptions = ref<string[]>([...VARIANT_ATTRIBUTE_OPTIONS]);

/**
 * One editable row of the variant table. `buyText` / `sellText` are the
 * grouped-string mirrors of the two prices — money is parsed on every keystroke
 * and reformatted only on focusout, or typing a decimal is impossible.
 */
interface VariantRow {
  key: string;
  options: string[];
  name: string;
  code: string;
  barcode: string;
  buyPrice: number;
  sellPrice: number;
  buyText: string;
  sellText: string;
}

const variantRows = ref<VariantRow[]>([]);

function seedFromRecord() {
  Object.assign(
    form,
    existing.value ? productMasterToInput(existing.value) : emptyProductMasterInput()
  );
  if (form.attributes.length === 0) form.attributes.push({ name: "", options: [] });
  attributeKeys.value = form.attributes.map((_, index) => index + 1);
  for (const attribute of form.attributes) {
    if (attribute.name && !attributeOptions.value.includes(attribute.name)) {
      attributeOptions.value.push(attribute.name);
    }
  }
  if (form.unit && !unitOptions.value.includes(form.unit)) unitOptions.value.push(form.unit);
  if (form.category && !categoryOptions.value.includes(form.category)) {
    categoryOptions.value.push(form.category);
  }
  // Seed the table from the record's own variants, then let the sync below
  // reconcile it against the attributes.
  variantRows.value = form.variants.map((variant) => makeRow(variant.options, variant));
  syncVariantRows();
}

watch(existing, seedFromRecord, { immediate: true });

const title = computed(() => {
  if (!isEdit.value) return "Add new product with variant";
  return existing.value ? `Edit ${existing.value.name}` : "Edit product with variant";
});

useHead({ title: computed(() => `${title.value} — Mekari Jurnal`) });

// ---- Attributes ---------------------------------------------------------

const canAddAttribute = computed(() => {
  if (form.attributes.length >= MAX_VARIANT_ATTRIBUTES) return false;
  // The source's rule: fill the one you have before asking for another.
  return form.attributes.every((attribute) => attribute.name && attribute.options.length > 0);
});

const addAttributeBlockedReason = computed(() =>
  form.attributes.length >= MAX_VARIANT_ATTRIBUTES
    ? `You have reached the addition limits of ${MAX_VARIANT_ATTRIBUTES} attributes.`
    : "Select an attribute and at least 1 option before adding another."
);

/** An attribute can't be used twice on the same master — the source toasts
 *  "Attribute already selected"; not offering it is quieter. */
function attributeChoicesFor(index: number): string[] {
  const taken = form.attributes
    .filter((_, i) => i !== index)
    .map((attribute) => attribute.name)
    .filter(Boolean);
  return attributeOptions.value.filter((option) => !taken.includes(option));
}

function tagDataFor(attribute: { options: string[] }) {
  return attribute.options.map((option) => ({
    id: `option-${option}`,
    text: option,
    value: option,
    isInvalid: false,
    isReadOnly: false
  }));
}

function onAttributeNameChange(index: number, value: unknown) {
  const attribute = form.attributes[index];
  if (attribute) attribute.name = typeof value === "string" ? value : "";
}

function onCreateAttribute(index: number, search: string) {
  const value = String(search ?? "").trim();
  if (!value) return;
  if (!attributeOptions.value.includes(value)) attributeOptions.value.push(value);
  onAttributeNameChange(index, value);
}

function onOptionsChange(index: number, tags: { value?: string; text?: string }[]) {
  const attribute = form.attributes[index];
  if (!attribute) return;
  attribute.options = tags.map((tag) => tag.value ?? tag.text ?? "").filter(Boolean);
}

function addAttribute() {
  form.attributes.push({ name: "", options: [] });
  attributeKeys.value.push(attributeKeys.value.length + 1);
}

function removeAttribute(index: number) {
  form.attributes.splice(index, 1);
  attributeKeys.value.splice(index, 1);
}

function onCreateUnit(_suggestions: string[], search: string) {
  const value = String(search ?? "").trim();
  if (!value) return;
  if (!unitOptions.value.includes(value)) unitOptions.value.push(value);
  form.unit = value;
}

function onCreateCategory(_suggestions: string[], search: string) {
  const value = String(search ?? "").trim();
  if (!value) return;
  if (!categoryOptions.value.includes(value)) categoryOptions.value.push(value);
  form.category = value;
}

function onImageChange(file: File | File[]) {
  const picked = Array.isArray(file) ? file[0] : file;
  form.imageName = picked?.name ?? "";
}

function onToggleTrack() {
  form.trackInventory = !form.trackInventory;
  if (form.trackInventory && !form.inventoryAccount) {
    form.inventoryAccount = INVENTORY_ACCOUNT_OPTIONS[0] ?? "";
  }
}

// ---- The variant table --------------------------------------------------

function variantName(options: string[]): string {
  const stem = form.name.trim() || "Main product";
  return options.length ? `${stem} - ${options.join(" / ")}` : stem;
}

function makeRow(
  options: string[],
  seed?: { code: string; barcode: string; buyPrice: number; sellPrice: number }
): VariantRow {
  return {
    key: variantKey(options),
    options: [...options],
    name: variantName(options),
    code: seed?.code ?? "",
    barcode: seed?.barcode ?? "",
    buyPrice: seed?.buyPrice ?? 0,
    sellPrice: seed?.sellPrice ?? 0,
    buyText: formatMoneyField(seed?.buyPrice ?? 0),
    sellText: formatMoneyField(seed?.sellPrice ?? 0)
  };
}

function combinationsOf(attributes: VariantAttribute[]): string[][] {
  const usable = usableAttributes(attributes);
  if (usable.length === 0) return [];
  return usable.reduce<string[][]>(
    (rows, attribute) => rows.flatMap((row) => attribute.options.map((option) => [...row, option])),
    [[]]
  );
}

/** Rebuild the table from the attributes, keeping whatever was already typed
 *  against rows that still exist. A row is identified by its option values, so
 *  adding a colour leaves the sizes' prices alone. */
function syncVariantRows() {
  const kept = new Map(variantRows.value.map((row) => [row.key, row]));
  variantRows.value = combinationsOf(form.attributes).map((options) => {
    const previous = kept.get(variantKey(options));
    if (!previous) return makeRow(options);
    return { ...previous, options: [...options], name: variantName(options) };
  });
}

watch(() => form.attributes, syncVariantRows, { deep: true });
// The variant names are built from the main product name, so they follow it.
watch(
  () => form.name,
  () => {
    for (const row of variantRows.value) row.name = variantName(row.options);
  }
);

const emptyStateDescription = computed(() =>
  form.attributes.some((attribute) => attribute.name)
    ? "Add at least one option to the attribute."
    : "Please select the attribute first."
);

/** What a row's SKU falls back to when its own is left blank — shown as the
 *  placeholder so the fallback isn't a surprise after saving. The stem is
 *  generated for a new master, so the placeholder names the suffix only. */
function fallbackCode(index: number): string {
  const stem = existing.value?.code;
  const suffix = String(index + 1).padStart(2, "0");
  return stem ? `${stem}-${suffix}` : `Auto (…-${suffix})`;
}

// ---- Money mirrors ------------------------------------------------------

/** A price field reads `0`, never blank — same rule as the single-product
 *  form. The grouped two-decimal form only appears once there is something to
 *  group. */
function formatMoneyField(value: number): string {
  return value ? formatAmount(value) : "0";
}

function onRowMoneyInput(row: VariantRow, key: "buy" | "sell") {
  if (key === "buy") row.buyPrice = parseAmount(row.buyText);
  else row.sellPrice = parseAmount(row.sellText);
}

function onRowMoneyBlur(row: VariantRow, key: "buy" | "sell") {
  if (key === "buy") row.buyText = formatMoneyField(row.buyPrice);
  else row.sellText = formatMoneyField(row.sellPrice);
}

// ---- Validation ---------------------------------------------------------

const missingFields = computed(() => {
  const missing: string[] = [];
  if (!form.name.trim()) missing.push("Main product name");
  if (usableAttributes(form.attributes).length === 0) missing.push("Attribute and options");
  if (form.isBuy && !form.buyAccount) missing.push("Purchases account");
  if (form.isSell && !form.sellAccount) missing.push("Sales account");
  if (form.trackInventory && !form.inventoryAccount) missing.push("Default inventory account");
  return missing;
});

function onSubmit(addAnother: boolean) {
  submitted.value = true;
  if (missingFields.value.length) return;

  if (isEdit.value && props.recordId != null) {
    updateProductMaster(props.recordId, snapshot());
    navigateTo(`/products/master/${props.recordId}`);
    return;
  }
  const created = createProductMaster(snapshot());
  if (addAnother) {
    Object.assign(form, emptyProductMasterInput());
    form.attributes.push({ name: "", options: [] });
    attributeKeys.value = [1];
    variantRows.value = [];
    submitted.value = false;
    return;
  }
  navigateTo(`/products/master/${created.id}`);
}

/** A plain, detached copy — `form` is a reactive proxy, and the writers keep
 *  what they are given. */
function snapshot(): ProductMasterInput {
  return {
    ...form,
    attributes: form.attributes.map((attribute) => ({
      name: attribute.name,
      options: [...attribute.options]
    })),
    variants: variantRows.value.map((row) => ({
      options: [...row.options],
      code: row.code.trim(),
      barcode: row.barcode.trim(),
      buyPrice: form.isBuy ? row.buyPrice : 0,
      sellPrice: form.isSell ? row.sellPrice : 0
    })),
    tags: [...form.tags]
  };
}

const isDirty = computed(() =>
  Boolean(
    form.name.trim() ||
    form.description.trim() ||
    form.category ||
    form.unit ||
    form.imageName ||
    usableAttributes(form.attributes).length
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
    isEdit.value && props.recordId ? `/products/master/${props.recordId}` : "/products?tab=masters"
  );
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
// The addon supplies no padding of its own: Pixel's "input with prefix and
// suffix" pattern (docs.mekari.design/patterns/input.html) pads the addon's
// content by 12px, without which the prefix sits flush against both edges.
const addonTextClass = css({ px: 3 });
const bannerClass = css({ mb: 6 });
const sectionHeadingClass = css({ display: "block", fontSize: "lg", mb: 4 });
const sectionDividerClass = css({ my: 8 });

const identityRowClass = css({
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  flexWrap: "wrap"
});
const fieldColumnClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 5,
  width: "100%",
  maxWidth: "492px"
});
const pairRowClass = css({ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 5 });
const imageBoxClass = css({ width: "168px", height: "168px", flexShrink: 0 });
const imageIdleClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  px: 4,
  textAlign: "center"
});
const imageHintClass = css({ display: "block" });
const textareaWrapClass = css({ position: "relative" });
const textareaCounterClass = css({ position: "absolute", right: 4, bottom: 3 });

const checkboxRowClass = css({ mt: 6, mb: 3 });
const panelClass = css({ mb: 2 });

// Attribute, its options, and the remove button — the two fields keep the same
// widths as the reference screen rather than stretching to the page.
const attributeRowClass = css({
  display: "grid",
  gridTemplateColumns: "minmax(0, 300px) minmax(0, 492px) auto",
  gap: 5,
  alignItems: "start",
  mb: 4
});
const attributeActionClass = css({ display: "flex", alignItems: "center", pt: 6 });
const addAttributeWrapClass = css({ display: "inline-flex" });
const variantImageToggleClass = css({ display: "inline-flex", mt: 3 });

const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const headerWithIconClass = css({ display: "flex", alignItems: "center", gap: 1 });
const tripleColWidths = ["33%", "33%", "34%"];
const panelTableClass = css({ tableLayout: "fixed", width: "100%", minWidth: "720px" });
const variantColWidths = ["26%", "20%", "20%", "17%", "17%"];
const variantTableClass = css({
  tableLayout: "fixed",
  width: "100%",
  minWidth: "860px",
  // The table is the last thing before the commit row, and its closing rule
  // reads as a border on that row rather than as the end of the table.
  "& tbody tr:last-child td": { borderBottomWidth: "0!" }
});
const variantTableWrapClass = css({ mt: 6 });
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word" });
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
// Split commit button: one body button plus a caret button, joined.
const saveButtonClass = css({ borderRightRadius: "0!" });
const saveCaretButtonClass = css({ borderLeftRadius: "0!", ml: "-1px!" });

const modalTitleClass = css({ fontSize: "lg" });
const modalFooterClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
</script>
