<template>
  <DefaultPageContent :title="title" breadcrumb="Product list" breadcrumb-to="/products">
    <!-- The title band holds Help, not the commit buttons — those live at the
         bottom right (docs/patterns/form-page-format.md). The reference screen
         puts guidance here rather than a Single/Bundle record-type switch,
         because on this form the type is a field (Product type, below) rather
         than a different route: the Product list page is what offers
         "Product with variant" as a separate record. -->
    <template #actions>
      <MpPopover placement="bottom-end" use-portal>
        <template #default>
          <MpPopoverTrigger>
            <MpButton variant="secondary" right-icon="caret-down">Help</MpButton>
          </MpPopoverTrigger>
          <MpPopoverContent :class="helpPopoverClass">
            <MpText weight="semiBold" color="dark">Product type</MpText>
            <MpText size="body-small" color="gray.600" :class="helpBodyClass">
              A single product is traded on its own. A bundle is sold as one package and lists the
              products it is assembled from.
            </MpText>
            <MpText weight="semiBold" color="dark">Inventory tracking</MpText>
            <MpText size="body-small" color="gray.600" :class="helpBodyClass">
              Track records inventory value and quantity for this product. Untrack records neither —
              use it for services and for anything you don't count.
            </MpText>
            <MpText weight="semiBold" color="dark">Opening stock</MpText>
            <MpText size="body-small" color="gray.600">
              A new product starts at zero. Record what you already hold through a stock adjustment.
            </MpText>
          </MpPopoverContent>
        </template>
      </MpPopover>
    </template>

    <BlankSlate
      v-if="isEdit && !existing"
      title="Product not found"
      description="This product may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/products')">Back to Product list</MpButton>
    </BlankSlate>

    <template v-else>
      <!-- A commit attempt that failed needs to say what is outstanding in one
           place: some failures (an empty bundle, say) have no single field to
           mark red. The per-field messages below appear at the same moment. -->
      <MpBanner
        v-if="submitted && missingFields.length"
        id="product-form-missing-banner"
        variant="danger"
        :class="bannerClass"
      >
        <MpBannerIcon id="product-form-missing-icon" />
        <MpBannerTitle id="product-form-missing-title">Product can't be saved yet</MpBannerTitle>
        <MpBannerDescription id="product-form-missing-desc">
          Complete these before saving: {{ missingFields.join(", ") }}.
        </MpBannerDescription>
      </MpBanner>

      <!-- Zone A — identity. One narrow column of stacked fields with the image
           picker beside it, which is the shape of the reference screen: these
           fields are short, and stretching them across the page would put the
           caret metres away from the label. The full-width blocks start at
           Inventory tracking, where the content really is tabular. -->
      <div :class="identityRowClass">
        <div :class="fieldColumnClass">
          <MpFormControl is-required :is-invalid="submitted && !form.name.trim()">
            <div :class="labelRowClass">
              <MpFormLabel>Product name</MpFormLabel>
              <MpText size="body-small" color="gray.600">
                {{ form.name.length }} / {{ NAME_MAX_LENGTH }}
              </MpText>
            </div>
            <MpInput v-model="form.name" :maxlength="NAME_MAX_LENGTH" />
            <MpFormErrorMessage>Enter a product name</MpFormErrorMessage>
          </MpFormControl>

          <div :class="pairRowClass">
            <MpFormControl>
              <MpFormLabel>Product code / SKU</MpFormLabel>
              <MpInput v-model="form.code" />
            </MpFormControl>

            <MpFormControl>
              <MpFormLabel>Barcode</MpFormLabel>
              <MpInput v-model="form.barcode" />
            </MpFormControl>
          </div>

          <!-- Unit and category are both creatable: the reference screen says
               "Select or enter", and a catalogue that can't invent a unit on
               the spot sends the user to Settings mid-form. -->
          <div :class="pairRowClass">
            <MpFormControl is-required :is-invalid="submitted && !form.unit">
              <MpFormLabel>Unit</MpFormLabel>
              <MpAutocomplete
                id="product-form-unit"
                v-model="form.unit"
                :data="unitOptions"
                placeholder="Select or enter unit"
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
              <MpFormErrorMessage>Select a unit</MpFormErrorMessage>
            </MpFormControl>
            <div />
          </div>

          <MpFormControl>
            <MpFormLabel>Product category</MpFormLabel>
            <MpAutocomplete
              id="product-form-category"
              v-model="form.category"
              :data="categoryOptions"
              placeholder="Select category"
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

          <!-- Single vs Bundle. Each option carries a description, so this is an
               autocomplete with a custom option row rather than an MpSelect —
               a native <option> can only hold one line of text. -->
          <MpFormControl is-required :is-invalid="submitted && !productKind">
            <MpFormLabel>Product type</MpFormLabel>
            <MpAutocomplete
              id="product-form-kind"
              v-model="productKindValue"
              :data="productKindOptions"
              label-prop="label"
              value-prop="value"
              placeholder="Select product type"
              is-full-width
              :content-attrs="{ class: kindMenuClass }"
            >
              <template #default="{ item }">
                <div :class="richOptionClass">
                  <MpText color="dark">{{ item.label }}</MpText>
                  <MpText size="body-small" color="gray.600">{{ item.description }}</MpText>
                </div>
              </template>
            </MpAutocomplete>
            <MpFormErrorMessage>Select a product type</MpFormErrorMessage>
          </MpFormControl>
        </div>

        <div :class="imageBoxClass">
          <!-- The dropzone's own `product` variant renders the picker link but
               no format hint, and its `default` variant hard-codes "Browse" as
               the link — so the idle content is supplied here to get both lines
               the reference screen shows. -->
          <MpDropzone
            id="product-form-image"
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
                  File format JPG or PNG (max. 5 MB)
                </MpText>
              </div>
            </template>
          </MpDropzone>
        </div>
      </div>

      <!-- Zone B — inventory tracking. Only asked once the product type is
           known, because what tracking covers differs between the two: a
           bundle's stock moves with its components. -->
      <div v-if="productKind" :class="sectionBlockClass">
        <MpFormControl is-required :is-invalid="submitted && !trackingMode">
          <MpFormLabel>Inventory tracking</MpFormLabel>
          <div :class="radioStackClass">
            <MpRadio
              id="product-form-track"
              v-model="trackingModeValue"
              value="track"
              :is-invalid="submitted && !trackingMode"
            >
              Track
              <template #description>{{ trackingCopy.track }}</template>
            </MpRadio>

            <!-- The two figures tracking needs, in the same tabular band the
                 buying and selling sections use. -->
            <div v-if="trackingMode === 'track'" :class="panelClass">
              <MpTableContainer>
                <MpTable :class="panelTableClass">
                  <colgroup>
                    <col v-for="(w, i) in trackingColWidths" :key="i" :style="{ width: w }" />
                  </colgroup>
                  <MpTableHead is-fixed :class="tableHeadClass">
                    <MpTableRow>
                      <MpTableCell as="th">Minimum stock limit</MpTableCell>
                      <MpTableCell as="th">Default inventory account</MpTableCell>
                      <MpTableCell as="th" />
                    </MpTableRow>
                  </MpTableHead>
                  <MpTableBody>
                    <MpTableRow>
                      <MpTableCell as="td">
                        <MpInput
                          v-model="bufferText"
                          type="text"
                          inputmode="numeric"
                          aria-label="Minimum stock limit"
                        />
                      </MpTableCell>
                      <MpTableCell as="td">
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
                      </MpTableCell>
                      <MpTableCell as="td" />
                    </MpTableRow>
                  </MpTableBody>
                </MpTable>
              </MpTableContainer>
            </div>

            <!-- How the tracking is kept. A bundle can only be counted by
                 quantity — the source says so outright — so the other two are
                 shown disabled rather than hidden, or the constraint is
                 invisible until someone wonders where they went. -->
            <div v-if="trackingMode === 'track'" :class="subRadioStackClass">
              <MpRadio
                v-for="option in INVENTORY_TRACKING_OPTIONS"
                :id="`product-form-tracking-${option}`"
                :key="option"
                v-model="form.inventoryTracking"
                :value="option"
                :is-disabled="form.isBundle && option !== 'qty'"
              >
                {{ INVENTORY_TRACKING_LABEL[option] }}
              </MpRadio>
            </div>

            <MpRadio
              id="product-form-untrack"
              v-model="trackingModeValue"
              value="untrack"
              :is-invalid="submitted && !trackingMode"
            >
              Untrack
              <template #description>{{ trackingCopy.untrack }}</template>
            </MpRadio>
          </div>
          <MpFormErrorMessage>Choose whether to track this product's stock</MpFormErrorMessage>
        </MpFormControl>
      </div>

      <!-- Zone C — bundle components. Collapsible because a long bundle
           otherwise buries Price & stock below it. The trailing placeholder row
           IS the add affordance (docs/patterns/form-page-format.md). -->
      <div v-if="form.isBundle" :class="sectionBlockClass">
        <div :class="collapseHeaderClass">
          <MpButton
            variant="ghost"
            size="sm"
            :left-icon="isBundleOpen ? 'chevrons-down' : 'chevrons-right'"
            :aria-expanded="isBundleOpen"
            aria-controls="product-form-bundle-panel"
            aria-label="Bundle components"
            @click="isBundleOpen = !isBundleOpen"
          />
          <MpText weight="semiBold" color="dark">Bundle components</MpText>
          <MpText color="red.400" aria-hidden="true">*</MpText>
        </div>

        <div v-show="isBundleOpen" id="product-form-bundle-panel">
          <MpBanner id="product-form-bundle-info" variant="info" is-inline :class="bannerClass">
            <MpBannerIcon id="product-form-bundle-info-icon" />
            <MpBannerDescription id="product-form-bundle-info-desc">
              Bundle components must consist of products tracked by qty.
            </MpBannerDescription>
          </MpBanner>

          <MpTableContainer :class="scrollShadowClass">
            <MpTable :class="lineTableClass">
              <colgroup>
                <col v-for="(w, i) in lineColWidths" :key="i" :style="{ width: w }" />
              </colgroup>
              <MpTableHead is-fixed :class="tableHeadClass">
                <MpTableRow>
                  <MpTableCell as="th">Product name</MpTableCell>
                  <MpTableCell as="th">Qty</MpTableCell>
                  <MpTableCell as="th">Unit</MpTableCell>
                  <MpTableCell as="th" :class="numericCellClass">Price</MpTableCell>
                  <MpTableCell as="th" />
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow
                  v-for="(line, index) in form.bundleItems"
                  :key="`${line.productId}-${index}`"
                >
                  <MpTableCell as="td">
                    <MpSelect
                      :model-value="String(line.productId)"
                      is-full-width
                      :aria-label="`Product for component ${index + 1}`"
                      @update:model-value="onLineProductChange(index, $event)"
                    >
                      <option
                        v-for="option in componentOptions"
                        :key="option.id"
                        :value="String(option.id)"
                      >
                        {{ option.name }}
                      </option>
                    </MpSelect>
                  </MpTableCell>
                  <MpTableCell as="td">
                    <MpInput
                      :model-value="String(line.quantity)"
                      type="text"
                      inputmode="numeric"
                      :aria-label="`Quantity for ${line.name}`"
                      @update:model-value="onLineQuantityChange(index, $event)"
                    />
                  </MpTableCell>
                  <MpTableCell as="td">{{ lineUnit(line) }}</MpTableCell>
                  <MpTableCell as="td" :class="numericCellClass">
                    {{ formatAmount(line.price) }}
                  </MpTableCell>
                  <MpTableCell as="td">
                    <MpButton
                      variant="ghost"
                      size="sm"
                      left-icon="minus-circular"
                      aria-label="Remove component"
                      @click="removeLine(index)"
                    />
                  </MpTableCell>
                </MpTableRow>

                <!-- Trailing placeholder row = the add affordance. -->
                <MpTableRow>
                  <MpTableCell as="td">
                    <MpSelect
                      model-value=""
                      is-full-width
                      aria-label="Add a bundle component"
                      @update:model-value="onAddLine"
                    >
                      <option value="">Select product</option>
                      <option
                        v-for="option in componentOptions"
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
                </MpTableRow>

                <!-- The expense account belongs to this table, not beside it:
                     its own band + row, so the label sits on the same grey as
                     the header above and the select lines up under the product
                     picker. -->
                <MpTableRow>
                  <MpTableCell
                    as="td"
                    :colspan="lineColWidths.length"
                    :class="expenseBandCellClass"
                  >
                    <div :class="expenseBandClass">
                      <MpText weight="semiBold" color="dark">
                        Additional expense account for bundle components
                      </MpText>
                      <MpTooltip
                        placement="top"
                        use-portal
                        label="Where the cost of assembling the bundle beyond its components is posted."
                      >
                        <MpIcon name="info" size="sm" />
                      </MpTooltip>
                    </div>
                  </MpTableCell>
                </MpTableRow>
                <MpTableRow>
                  <MpTableCell as="td">
                    <MpSelect
                      v-model="form.bundleExpenseAccount"
                      is-full-width
                      aria-label="Additional expense account for bundle components"
                    >
                      <option value="">Select account</option>
                      <option v-for="option in BUY_ACCOUNT_OPTIONS" :key="option" :value="option">
                        {{ option }}
                      </option>
                    </MpSelect>
                  </MpTableCell>
                  <MpTableCell as="td" />
                  <MpTableCell as="td" />
                  <MpTableCell as="td" />
                  <MpTableCell as="td" />
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>

          <div :class="lineTotalRowClass">
            <MpText color="gray.600">Total price</MpText>
            <MpText weight="semiBold" color="dark">{{ formatCurrency(bundleTotal) }}</MpText>
          </div>
        </div>
      </div>

      <!-- Zone E — price & stock. Each checkbox opens the band of fields its
           side of the ledger needs; unchecking one clears them on save, so a
           product can never hold a sell account it never showed. -->
      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass">Price &amp; stock</MpText>

      <div :class="checkboxRowClass">
        <MpCheckbox id="product-is-buy" :is-checked="form.isBuy" @change="form.isBuy = !form.isBuy">
          I buy this item
        </MpCheckbox>
      </div>
      <div v-if="form.isBuy" :class="panelClass">
        <MpTableContainer>
          <MpTable :class="panelTableClass">
            <colgroup>
              <col v-for="(w, i) in quadColWidths" :key="i" :style="{ width: w }" />
            </colgroup>
            <MpTableHead is-fixed :class="tableHeadClass">
              <MpTableRow>
                <MpTableCell as="th">Unit buy price</MpTableCell>
                <MpTableCell as="th">Purchases account</MpTableCell>
                <MpTableCell as="th">Default buy tax</MpTableCell>
                <MpTableCell as="th" />
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow>
                <MpTableCell as="td">
                  <div @focusout="onMoneyBlur('buyPrice')">
                    <MpInputGroup>
                      <MpInputLeftAddon has-background>
                        <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                      </MpInputLeftAddon>
                      <MpInput
                        v-model="money.buyPrice"
                        type="text"
                        inputmode="decimal"
                        aria-label="Unit buy price"
                        @update:model-value="onMoneyInput('buyPrice')"
                      />
                    </MpInputGroup>
                  </div>
                </MpTableCell>
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
          id="product-is-sell"
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
              <col v-for="(w, i) in quadColWidths" :key="i" :style="{ width: w }" />
            </colgroup>
            <MpTableHead is-fixed :class="tableHeadClass">
              <MpTableRow>
                <MpTableCell as="th">Unit sell price</MpTableCell>
                <MpTableCell as="th">Sales account</MpTableCell>
                <MpTableCell as="th">Default sell tax</MpTableCell>
                <MpTableCell as="th">Discount account</MpTableCell>
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow>
                <MpTableCell as="td">
                  <div @focusout="onMoneyBlur('sellPrice')">
                    <MpInputGroup>
                      <MpInputLeftAddon has-background>
                        <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                      </MpInputLeftAddon>
                      <MpInput
                        v-model="money.sellPrice"
                        type="text"
                        inputmode="decimal"
                        aria-label="Unit sell price"
                        @update:model-value="onMoneyInput('sellPrice')"
                      />
                    </MpInputGroup>
                  </div>
                </MpTableCell>
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

      <!-- Zone F — commit row, bottom right. Buttons are never disabled on
           validity: a disabled Save can't fire the handler that reveals what
           is missing (docs/patterns/form-page-format.md § Validation). -->
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
        id="product-form-discard-modal"
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
  MpDropzone,
  MpFlex,
  MpFormControl,
  MpFormErrorMessage,
  MpFormLabel,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
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
  MpTooltip
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import {
  BUY_ACCOUNT_OPTIONS,
  createProduct,
  emptyProductInput,
  formatAmount,
  formatCurrency,
  getProductById,
  getProducts,
  INVENTORY_ACCOUNT_OPTIONS,
  INVENTORY_TRACKING_LABEL,
  INVENTORY_TRACKING_MODE_DESCRIPTION,
  INVENTORY_TRACKING_OPTIONS,
  parseAmount,
  PRODUCT_CATEGORIES,
  PRODUCT_KIND_DESCRIPTION,
  PRODUCT_KIND_LABEL,
  PRODUCT_KIND_OPTIONS,
  productToInput,
  SELL_ACCOUNT_OPTIONS,
  TAX_OPTIONS,
  UNIT_OPTIONS,
  updateProduct,
  type BundleItem,
  type ProductInput,
  type ProductKind
} from "~/data/products";

// ---------------------------------------------------------------------------
// The single-product create/edit form, rendered by both
// app/pages/products/new.vue and app/pages/products/edit/[id].vue — one
// component, two routes, everything that differs keyed off `isEdit`
// (docs/patterns/form-page-format.md).
//
// Matched to the reference app's "Add new product" screen, which is why this
// form does NOT follow the 4-column meta-grid rhythm the Purchase forms use:
// its fields are short and stack in one narrow column beside the image picker,
// and only the genuinely tabular blocks (tracking, buying, selling, bundle
// components) run the full width.
//
// Two questions gate the rest of the form and neither is pre-answered:
// Product type (Single / Bundle) decides whether Bundle components exists, and
// Inventory tracking (Track / Untrack) decides whether stock figures do. Both
// are held as UI-level tri-states below — "" until the user chooses — because
// the stored record has only booleans, and a default boolean would let a
// product be saved on a decision nobody made.
//
// Not ported from the source: the package/role paywalls around barcode and the
// tracking types, unit conversion rows, and the "account already has
// transactions" locks — entitlement and settings concerns rather than shape.
// ---------------------------------------------------------------------------

const props = defineProps<{
  /** Present on the edit route only. Its absence is what `isEdit` reads. */
  recordId?: number;
}>();

const NAME_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 6000;

const isEdit = computed(() => props.recordId != null);
const existing = computed(() =>
  props.recordId != null ? getProductById(props.recordId) : undefined
);

const form = reactive<ProductInput>(emptyProductInput());

/** Grouped-string mirrors for the two money fields. Money is parsed on every
 *  keystroke and reformatted only on focusout — reformatting live at two
 *  decimals makes incremental typing impossible ("1" becomes "1,00", the next
 *  keystroke gives "1,002"). */
type MoneyKey = "buyPrice" | "sellPrice";
const money = reactive<Record<MoneyKey, string>>({ buyPrice: "", sellPrice: "" });

/** The minimum-stock field edits a string too, so a half-typed value isn't
 *  coerced to 0 under the caret. */
const bufferText = ref("");

/** The two gating answers, "" until made. See the header comment. */
const productKind = ref<"" | ProductKind>("");
const trackingMode = ref<"" | "track" | "untrack">("");

const submitted = ref(false);
const isDiscardModalOpen = ref(false);

/** Creatable vocabularies — "Select or enter" means a value typed here that
 *  isn't on the list becomes one for the rest of the session. */
const unitOptions = ref<string[]>([...UNIT_OPTIONS]);
const categoryOptions = ref<string[]>([...PRODUCT_CATEGORIES]);

const productKindOptions = PRODUCT_KIND_OPTIONS.map((kind) => ({
  value: kind,
  label: PRODUCT_KIND_LABEL[kind],
  description: PRODUCT_KIND_DESCRIPTION[kind]
}));

function seedFromRecord() {
  Object.assign(form, existing.value ? productToInput(existing.value) : emptyProductInput());
  money.buyPrice = formatMoneyField(form.buyPrice);
  money.sellPrice = formatMoneyField(form.sellPrice);
  bufferText.value = form.buffer === null ? "" : String(form.buffer);
  // An existing product has already answered both gating questions; a new one
  // has answered neither.
  productKind.value = existing.value ? (existing.value.isBundle ? "bundle" : "single") : "";
  trackingMode.value = existing.value ? (existing.value.trackInventory ? "track" : "untrack") : "";
  if (form.unit && !unitOptions.value.includes(form.unit)) unitOptions.value.push(form.unit);
  if (form.category && !categoryOptions.value.includes(form.category)) {
    categoryOptions.value.push(form.category);
  }
}

watch(existing, seedFromRecord, { immediate: true });

const title = computed(() => {
  if (!isEdit.value) return "Add new product";
  return existing.value ? `Edit ${existing.value.name}` : "Edit product";
});

useHead({ title: computed(() => `${title.value} — Mekari Jurnal`) });

// ---- The two gating choices ---------------------------------------------

const productKindValue = computed({
  get: () => productKind.value,
  set: (value: string) => {
    const kind = PRODUCT_KIND_OPTIONS.find((option) => option === value);
    if (!kind) return;
    productKind.value = kind;
    form.isBundle = kind === "bundle";
    if (form.isBundle) {
      // A bundle can only be tracked by quantity — the source says so outright
      // (`tracking_type.tooltip.product-bundle`).
      form.inventoryTracking = "qty";
    } else {
      form.bundleItems = [];
      form.bundleExpenseAccount = "";
    }
  }
});

/** What Track / Untrack promise, in the wording that fits this product kind. */
const trackingCopy = computed(
  () => INVENTORY_TRACKING_MODE_DESCRIPTION[productKind.value || "single"]
);

const trackingModeValue = computed({
  get: () => trackingMode.value,
  set: (value: string) => {
    if (value !== "track" && value !== "untrack") return;
    trackingMode.value = value;
    form.trackInventory = value === "track";
    if (value === "track") {
      if (!form.inventoryAccount) form.inventoryAccount = INVENTORY_ACCOUNT_OPTIONS[0] ?? "";
      if (!bufferText.value) bufferText.value = "0";
    }
    // The catalogue classification the list and filter drawer read follows the
    // tracking answer, since this form no longer asks for it separately. A
    // service stays a service either way — it is not stock that went untracked.
    if (form.type !== "service") form.type = value === "track" ? "inventory" : "non_inventory";
  }
});

// ---- Creatable vocabularies ---------------------------------------------

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

/** The prototype has no upload backend, so what is kept is the chosen file's
 *  name — see `Product.imageName`. */
function onImageChange(file: File | File[]) {
  const picked = Array.isArray(file) ? file[0] : file;
  form.imageName = picked?.name ?? "";
}

// ---- Bundle components --------------------------------------------------

/** What can go into a bundle: any tracked, non-bundle product other than the
 *  one being edited. The source blocks batch/serial-tracked components
 *  outright ("The selected product is tracked by batch or serial number"), and
 *  a bundle inside a bundle has no meaning here. */
const componentOptions = computed(() =>
  getProducts().filter(
    (product) =>
      !product.isBundle &&
      !product.isArchived &&
      product.inventoryTracking === "qty" &&
      product.id !== props.recordId
  )
);

const bundleTotal = computed(() =>
  form.bundleItems.reduce((sum, line) => sum + line.price * line.quantity, 0)
);

/** Read off the component product rather than stored on the line: a unit that
 *  is copied at pick time is a unit that can disagree with the product later. */
function lineUnit(line: BundleItem): string {
  return getProductById(line.productId)?.unit ?? "—";
}

function onAddLine(value: unknown) {
  const id = Number(value);
  if (!id) return;
  const product = getProductById(id);
  if (!product) return;
  form.bundleItems.push({
    productId: product.id,
    name: product.name,
    quantity: 1,
    // Priced at the component's buy price, which is what the bundle costs to
    // assemble — the same figure the detail page's Bundle info tab totals.
    price: product.buyPrice
  });
}

function onLineProductChange(index: number, value: unknown) {
  const product = getProductById(Number(value));
  const line = form.bundleItems[index];
  if (!product || !line) return;
  line.productId = product.id;
  line.name = product.name;
  line.price = product.buyPrice;
}

function onLineQuantityChange(index: number, value: unknown) {
  const line = form.bundleItems[index];
  if (!line) return;
  const parsed = Number(String(value ?? "").replace(/[^\d]/g, ""));
  line.quantity = Number.isNaN(parsed) ? 0 : parsed;
}

function removeLine(index: number) {
  form.bundleItems.splice(index, 1);
}

/**
 * The components section starts open — it is required content, and a bundle
 * whose only mandatory table is folded away reads as complete when it isn't.
 *
 * Deliberately not MpAccordion. Its MpCollapse measures the panel height when
 * it mounts, and this panel is `v-if`'d into existence by the Product type
 * choice — so it mounts already-open. In verification it then stayed at
 * `height: 0; visibility: hidden` while reporting `aria-expanded="true"`: open
 * to a screen reader, invisible to everyone else, and toggling it by hand did
 * not recover it. `v-show` has no measuring step to get wrong.
 */
const isBundleOpen = ref(true);

// ---- Money mirrors ------------------------------------------------------

function onMoneyInput(key: MoneyKey) {
  form[key] = parseAmount(money[key]);
}

/** A price field reads `0`, never blank: an empty money box on a form that will
 *  save a zero anyway reads as "not filled in yet" for a figure that is. The
 *  grouped two-decimal form only appears once there is something to group. */
function formatMoneyField(value: number): string {
  return value ? formatAmount(value) : "0";
}

function onMoneyBlur(key: MoneyKey) {
  money[key] = formatMoneyField(form[key]);
}

// ---- Validation ---------------------------------------------------------

const missingFields = computed(() => {
  const missing: string[] = [];
  if (!form.name.trim()) missing.push("Product name");
  if (!form.unit) missing.push("Unit");
  if (!productKind.value) missing.push("Product type");
  // Only asked once the kind is known, so only outstanding once it is.
  if (productKind.value && !trackingMode.value) missing.push("Inventory tracking");
  if (form.isBuy && !form.buyAccount) missing.push("Purchases account");
  if (form.isSell && !form.sellAccount) missing.push("Sales account");
  // No single field to mark red for this one, which is exactly why the banner
  // exists alongside the per-field messages.
  if (form.isBundle && form.bundleItems.length === 0) missing.push("Bundle components");
  if (!form.isBuy && !form.isSell) missing.push("I buy this item or I sell this item");
  return missing;
});

function commitBuffer() {
  const digits = bufferText.value.replace(/[^\d]/g, "");
  form.buffer = form.trackInventory && digits ? Number(digits) : form.trackInventory ? 0 : null;
}

function resetForm() {
  Object.assign(form, emptyProductInput());
  money.buyPrice = formatMoneyField(form.buyPrice);
  money.sellPrice = formatMoneyField(form.sellPrice);
  bufferText.value = "";
  productKind.value = "";
  trackingMode.value = "";
  submitted.value = false;
}

function onSubmit(addAnother: boolean) {
  submitted.value = true;
  if (missingFields.value.length) return;
  commitBuffer();

  const payload: ProductInput = { ...form, bundleItems: [...form.bundleItems] };

  if (isEdit.value && props.recordId != null) {
    updateProduct(props.recordId, payload);
    navigateTo(`/products/detail/${props.recordId}`);
    return;
  }

  const created = createProduct(payload);
  if (addAnother) {
    // "Save & add new" stays on the form with a clean slate, which is the
    // whole point of the option — navigating away would make it identical to
    // Save.
    resetForm();
    return;
  }
  navigateTo(`/products/detail/${created.id}`);
}

/** Cancelling a form the user has actually put something into confirms first;
 *  an untouched form just leaves. */
const isDirty = computed(() =>
  Boolean(
    form.name.trim() ||
    form.code.trim() ||
    form.barcode.trim() ||
    form.description.trim() ||
    form.imageName ||
    form.category ||
    form.unit ||
    productKind.value ||
    trackingMode.value ||
    form.bundleItems.length ||
    form.buyPrice ||
    form.sellPrice
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
  navigateTo(isEdit.value && props.recordId ? `/products/detail/${props.recordId}` : "/products");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
// The addon supplies no padding of its own: Pixel's "input with prefix and
// suffix" pattern (docs.mekari.design/patterns/input.html) pads the addon's
// content by 12px, without which the prefix sits flush against both edges.
const addonTextClass = css({ px: 3 });
const bannerClass = css({ mb: 6 });

const helpPopoverClass = css({ maxWidth: "320px", p: 4 });
const helpBodyClass = css({ display: "block", mt: 1, mb: 4 });

// Identity zone: one narrow field column, image picker beside it.
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
const labelRowClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 2
});
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
const richOptionClass = css({ display: "flex", flexDirection: "column", gap: 1, py: 1 });
// Left to itself the menu sizes to its longest description — a panel twice the
// width of the field it belongs to, hanging off its left edge. Pinning it to
// the trigger's width lets the descriptions wrap instead, which is what the
// reference screen shows.
const kindMenuClass = css({ width: "100%!", minWidth: "0!", maxWidth: "100%!" });

const sectionBlockClass = css({ mt: 6 });
const sectionHeadingClass = css({ display: "block", mt: 8, mb: 4 });
const radioStackClass = css({ display: "flex", flexDirection: "column", gap: 4 });
const subRadioStackClass = css({ display: "flex", flexDirection: "column", gap: 3, pl: 6 });
const checkboxRowClass = css({ mt: 6, mb: 3 });
const panelClass = css({ mb: 2 });

const collapseHeaderClass = css({ display: "flex", alignItems: "center", gap: 1, mb: 3 });
// The expense band is a row of the components table, so it borrows the header
// row's own grey rather than inventing a second one. The colour goes on the
// CELL: a body row's own white background paints over anything set on the <tr>.
const expenseBandCellClass = css({ bg: "gray.25!" });
const expenseBandClass = css({ display: "flex", alignItems: "center", gap: 2 });

const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
// Proportional widths with a min-width floor: fixed px summing past the
// container silently pushes the trailing column out of view
// (docs/patterns/form-page-format.md § Editable line-items table).
const quadColWidths = ["25%", "25%", "25%", "25%"];
const trackingColWidths = ["25%", "50%", "25%"];
const lineColWidths = ["44%", "18%", "18%", "14%", "6%"];
const panelTableClass = css({ tableLayout: "fixed", width: "100%", minWidth: "720px" });
const lineTableClass = css({ tableLayout: "fixed", width: "100%", minWidth: "720px" });
const numericCellClass = css({ textAlign: "right" });
const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});
const lineTotalRowClass = css({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 3,
  mt: 4
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
