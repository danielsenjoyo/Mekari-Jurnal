<template>
  <DefaultPageContent
    :title="title"
    breadcrumb="Price rules"
    breadcrumb-to="/products?segment=price_rules"
  >
    <!-- Shown because the reference screen offers it here; disabled because
         this prototype has nowhere to send feedback. -->
    <template #actions>
      <MpTooltip placement="bottom-end" use-portal label="Feedback isn't available yet.">
        <span :class="feedbackWrapClass">
          <MpButton variant="secondary" is-disabled>Give feedback</MpButton>
        </span>
      </MpTooltip>
    </template>
    <BlankSlate
      v-if="isEdit && !existing"
      title="Price rule not found"
      description="This price rule may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/products?segment=price_rules')">
        Back to Price rules
      </MpButton>
    </BlankSlate>

    <template v-else>
      <MpBanner
        v-if="submitted && missingFields.length"
        id="price-rule-missing-banner"
        variant="danger"
        :class="bannerClass"
      >
        <MpBannerIcon id="price-rule-missing-icon" />
        <MpBannerTitle id="price-rule-missing-title">Price rule can't be saved yet</MpBannerTitle>
        <MpBannerDescription id="price-rule-missing-desc">
          Complete these before saving: {{ missingFields.join(", ") }}.
        </MpBannerDescription>
      </MpBanner>

      <MpText color="gray.600" :class="introClass">
        Below are the steps for creating price rules.
      </MpText>

      <!-- Step 1 — what the rule is. -->
      <div :class="stepClass">
        <div :class="stepHeaderClass">
          <span :class="stepNumberClass">1</span>
          <div :class="stepTitleColClass">
            <MpText weight="semiBold" color="dark">Fill in price rule information</MpText>
            <MpText size="body-small" color="gray.600">
              Please enter and select name, period, and type of price rules you want to implement.
            </MpText>
          </div>
        </div>

        <div :class="stepBodyClass">
          <div :class="fieldGridClass">
            <MpFormControl is-required :is-invalid="submitted && !form.name.trim()">
              <div :class="labelRowClass">
                <MpFormLabel>Rule name</MpFormLabel>
                <MpText size="body-small" color="gray.600">
                  {{ form.name.length }} / {{ NAME_MAX_LENGTH }}
                </MpText>
              </div>
              <MpInput v-model="form.name" :maxlength="NAME_MAX_LENGTH" />
              <MpFormErrorMessage>Enter a rule name</MpFormErrorMessage>
            </MpFormControl>

            <!-- One range picker rather than two fields: the period is a
                 single decision, and two pickers let a user set an end before
                 the start. -->
            <MpFormControl>
              <MpFormLabel>Rule period</MpFormLabel>
              <MpDatePicker
                v-model="period"
                is-range
                value-type="string"
                :format="DATE_INPUT_FORMAT"
                placeholder="DD/MM/YYYY - DD/MM/YYYY"
                use-portal
              />
              <MpFormHelpText>Leave empty for a rule with no end.</MpFormHelpText>
            </MpFormControl>

            <MpFormControl>
              <MpFormLabel>Rule type</MpFormLabel>
              <MpSelect v-model="form.ruleType" is-full-width>
                <option v-for="option in PRICE_RULE_TYPE_OPTIONS" :key="option" :value="option">
                  {{ PRICE_RULE_TYPE_LABEL[option] }}
                </option>
              </MpSelect>
            </MpFormControl>

            <!-- The type's SHAPE decides this field, not a chain of type
                 comparisons, so adding a type is a map entry (PRICE_RULE_SHAPE). -->
            <MpFormControl
              v-if="shape === 'percent'"
              is-required
              :is-invalid="submitted && form.amount <= 0"
            >
              <MpFormLabel>{{ PRICE_RULE_TYPE_LABEL[form.ruleType] }}</MpFormLabel>
              <MpInputGroup>
                <MpInput v-model="percentText" type="text" inputmode="decimal" />
                <MpInputRightAddon>
                  <MpText weight="semiBold" :class="addonTextClass">%</MpText>
                </MpInputRightAddon>
              </MpInputGroup>
              <MpFormErrorMessage>
                {{ isMarkup ? "Markup" : "Discount" }} must be above 0
              </MpFormErrorMessage>
            </MpFormControl>

            <MpFormControl
              v-else-if="shape === 'amount'"
              is-required
              :is-invalid="submitted && form.amount <= 0"
            >
              <MpFormLabel>{{ amountLabel }}</MpFormLabel>
              <div @focusout="onAmountBlur">
                <MpInputGroup>
                  <MpInputLeftAddon>
                    <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                  </MpInputLeftAddon>
                  <MpInput
                    v-model="amountText"
                    type="text"
                    inputmode="decimal"
                    @update:model-value="onAmountInput"
                  />
                </MpInputGroup>
              </div>
              <MpFormErrorMessage>Enter an amount</MpFormErrorMessage>
            </MpFormControl>
            <div v-else />

            <!-- An existing rule can be switched off here; a new one is active
                 by definition, which is why the reference's create screen has
                 no such control. -->
            <div v-if="isEdit" :class="statusColClass">
              <MpToggle id="price-rule-active" v-model:is-checked="form.isActive">
                Active
                <template #description>
                  An inactive rule stops applying to new transactions.
                </template>
              </MpToggle>
            </div>
          </div>

          <!-- Tiered: buy this much, get this much off. The trailing button is
               the add affordance, capped at the source's five tiers. -->
          <template v-if="shape === 'tier'">
            <MpTableContainer :class="[tierWrapClass, scrollShadowClass]">
              <MpTable :class="tierTableClass">
                <MpTableHead is-fixed :class="tableHeadClass">
                  <MpTableRow>
                    <MpTableCell as="th">{{ tierThresholdLabel }}</MpTableCell>
                    <MpTableCell as="th">Discount (%)</MpTableCell>
                    <MpTableCell as="th" />
                  </MpTableRow>
                </MpTableHead>
                <MpTableBody>
                  <MpTableRow v-for="(tier, index) in form.tiers" :key="index">
                    <MpTableCell as="td">
                      <div @focusout="onTierThresholdBlur(index)">
                        <MpInputGroup>
                          <MpInputLeftAddon v-if="isSubtotalTier">
                            <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                          </MpInputLeftAddon>
                          <MpInput
                            v-model="tierThresholdText[index]"
                            type="text"
                            inputmode="decimal"
                            :aria-label="`${tierThresholdLabel} for tier ${index + 1}`"
                            @update:model-value="onTierThresholdInput(index)"
                          />
                        </MpInputGroup>
                      </div>
                    </MpTableCell>
                    <MpTableCell as="td">
                      <MpInputGroup>
                        <MpInput
                          :model-value="String(tier.discount || '')"
                          type="text"
                          inputmode="decimal"
                          :aria-label="`Discount for tier ${index + 1}`"
                          @update:model-value="onTierDiscountChange(index, $event)"
                        />
                        <MpInputRightAddon>
                          <MpText weight="semiBold" :class="addonTextClass">%</MpText>
                        </MpInputRightAddon>
                      </MpInputGroup>
                    </MpTableCell>
                    <MpTableCell as="td">
                      <MpButton
                        v-if="form.tiers.length > 1"
                        variant="ghost"
                        size="sm"
                        left-icon="minus-circular"
                        aria-label="Remove tier"
                        @click="removeTier(index)"
                      />
                    </MpTableCell>
                  </MpTableRow>
                </MpTableBody>
              </MpTable>
            </MpTableContainer>
            <MpButton
              v-if="form.tiers.length < PRICE_RULE_TIER_LIMIT"
              variant="secondary"
              size="sm"
              :class="addTierClass"
              @click="addTier"
            >
              {{ isSubtotalTier ? "Add another subtotal" : "Add another tier" }}
            </MpButton>
          </template>
        </div>
      </div>

      <MpDivider :class="stepDividerClass" />

      <!-- Step 2 — who gets it. -->
      <div :class="stepClass">
        <div :class="stepHeaderRowClass">
          <div :class="stepHeaderClass">
            <span :class="stepNumberClass">2</span>
            <div :class="stepTitleColClass">
              <MpText weight="semiBold" color="dark">Select contact</MpText>
              <MpText size="body-small" color="gray.600">
                Specify who will receive the price rule based on your selected period.
              </MpText>
            </div>
          </div>
          <div :class="stepToolsClass">
            <div :class="searchFieldClass">
              <MpInputGroup>
                <MpInputLeftAddon>
                  <MpIcon name="search" size="sm" color="gray.400" />
                </MpInputLeftAddon>
                <MpInput
                  v-model="contactSearch"
                  placeholder="Search contact"
                  aria-label="Search selected contacts"
                />
              </MpInputGroup>
            </div>
            <MpButton variant="secondary" @click="isContactPickerOpen = true">
              Add contact
            </MpButton>
          </div>
        </div>

        <div :class="stepBodyClass">
          <!-- "All" is a scope, not a list: showing it as one row keeps the
               rule's reach on screen without pretending to enumerate contacts
               that don't exist yet. -->
          <div v-if="isAllContacts" :class="allScopeClass">
            <MpIcon name="people" size="sm" color="blue.400" />
            <div :class="stepTitleColClass">
              <MpText color="dark">All contacts</MpText>
              <MpText size="body-small" color="gray.600">
                Contacts added later are covered by this rule too.
              </MpText>
            </div>
          </div>

          <div v-else-if="!form.contacts.length" :class="emptyStateClass">
            <div :class="emptyIconClass"><MpIcon name="people" color="blue.400" /></div>
            <MpText weight="semiBold" color="dark" :class="emptyTitleClass">
              No selected contact yet
            </MpText>
            <MpText size="body-small" color="gray.600" :class="emptyDescClass">
              Select your contact from the list. Once you select one, it will appear here.
            </MpText>
          </div>

          <MpTableContainer v-else>
            <MpTable :class="scopeTableClass">
              <MpTableHead is-fixed :class="tableHeadClass">
                <MpTableRow>
                  <MpTableCell as="th">Contact name</MpTableCell>
                  <MpTableCell as="th" :class="rowActionClass" />
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="name in visibleContacts" :key="name">
                  <MpTableCell as="td" :class="wrapCellClass">{{ name }}</MpTableCell>
                  <MpTableCell as="td" :class="rowActionClass">
                    <MpButton
                      variant="ghost"
                      size="sm"
                      left-icon="minus-circular"
                      :aria-label="`Remove ${name}`"
                      @click="removeContact(name)"
                    />
                  </MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
        </div>
      </div>

      <MpDivider :class="stepDividerClass" />

      <!-- Step 3 — what it applies to. -->
      <div :class="stepClass">
        <div :class="stepHeaderRowClass">
          <div :class="stepHeaderClass">
            <span :class="stepNumberClass">3</span>
            <div :class="stepTitleColClass">
              <MpText weight="semiBold" color="dark">Select product</MpText>
              <MpText size="body-small" color="gray.600">
                Specify which product will be affected by the price rule. You can see the last price
                below.
              </MpText>
            </div>
          </div>
          <div :class="stepToolsClass">
            <div :class="searchFieldClass">
              <MpInputGroup>
                <MpInputLeftAddon>
                  <MpIcon name="search" size="sm" color="gray.400" />
                </MpInputLeftAddon>
                <MpInput
                  v-model="productSearch"
                  placeholder="Search product"
                  aria-label="Search selected products"
                />
              </MpInputGroup>
            </div>
            <MpButton variant="secondary" @click="isProductPickerOpen = true">
              Add product
            </MpButton>
          </div>
        </div>

        <div :class="stepBodyClass">
          <div v-if="isAllProducts" :class="allScopeClass">
            <MpIcon name="products" size="sm" color="blue.400" />
            <div :class="stepTitleColClass">
              <MpText color="dark">All products</MpText>
              <MpText size="body-small" color="gray.600">
                Products added later are covered by this rule too.
              </MpText>
            </div>
          </div>

          <div v-else-if="!form.products.length" :class="emptyStateClass">
            <div :class="emptyIconClass"><MpIcon name="products" color="blue.400" /></div>
            <MpText weight="semiBold" color="dark" :class="emptyTitleClass">
              No selected product yet
            </MpText>
            <MpText size="body-small" color="gray.600" :class="emptyDescClass">
              Select your product from the list. Once you select one, it will appear here.
            </MpText>
          </div>

          <MpTableContainer v-else>
            <MpTable :class="scopeTableClass">
              <MpTableHead is-fixed :class="tableHeadClass">
                <MpTableRow>
                  <MpTableCell as="th">Product name</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Last price</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Price after rule</MpTableCell>
                  <MpTableCell as="th" :class="rowActionClass" />
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="name in visibleProducts" :key="name">
                  <MpTableCell as="td" :class="wrapCellClass">{{ name }}</MpTableCell>
                  <MpTableCell as="td" :class="numCellClass">
                    {{ formatCurrency(lastPriceOf(name)) }}
                  </MpTableCell>
                  <MpTableCell as="td" :class="numCellClass">
                    {{ formatCurrency(pricedAfterRule(name)) }}
                  </MpTableCell>
                  <MpTableCell as="td" :class="rowActionClass">
                    <MpButton
                      variant="ghost"
                      size="sm"
                      left-icon="minus-circular"
                      :aria-label="`Remove ${name}`"
                      @click="removeProduct(name)"
                    />
                  </MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
        </div>
      </div>

      <div :class="actionRowClass">
        <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
        <MpButton variant="primary" @click="onSubmit">
          {{ isEdit ? "Save changes" : "Save" }}
        </MpButton>
      </div>

      <ScopePickerDrawer
        :is-open="isContactPickerOpen"
        title="Add contact"
        intro="Specify who will receive the price rule."
        noun="contact"
        noun-plural="contacts"
        list-title="Contact list"
        icon="people"
        :options="contactOptions"
        :selected="form.contacts"
        :is-all-selected="isAllContacts"
        :tabs="CONTACT_PICKER_TABS"
        @close="isContactPickerOpen = false"
        @save="onContactsPicked"
      />

      <ScopePickerDrawer
        :is-open="isProductPickerOpen"
        title="Add product"
        intro="Specify which product will be affected by the price rule."
        noun="product"
        noun-plural="products"
        list-title="Product list"
        avatar="icon"
        icon="products"
        :options="productOptions"
        :selected="form.products"
        :is-all-selected="isAllProducts"
        :filters="productFilters"
        filter-all-label="All product"
        @close="isProductPickerOpen = false"
        @save="onProductsPicked"
      />

      <MpModal
        id="price-rule-discard-modal"
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
  MpBanner,
  MpBannerDescription,
  MpBannerIcon,
  MpBannerTitle,
  MpButton,
  MpDatePicker,
  MpDivider,
  MpFormControl,
  MpFormErrorMessage,
  MpFormHelpText,
  MpFormLabel,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpInputRightAddon,
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
  MpToggle
} from "@mekari/pixel3";
import ScopePickerDrawer from "~/components/products/ScopePickerDrawer.vue";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import {
  CONTACT_GROUP_OPTIONS,
  CONTACT_OPTIONS,
  createPriceRule,
  emptyPriceRuleInput,
  formatAmount,
  formatCurrency,
  formatQuantity,
  getPriceRuleById,
  getProducts,
  parseAmount,
  PRICE_RULE_SHAPE,
  PRICE_RULE_TIER_LABEL,
  PRICE_RULE_TIER_LIMIT,
  PRICE_RULE_TYPE_LABEL,
  PRICE_RULE_TYPE_OPTIONS,
  priceRuleToInput,
  PRODUCT_TYPE_LABEL,
  PRODUCT_TYPE_OPTIONS,
  updatePriceRule,
  type PriceRuleInput,
  type PriceRuleType
} from "~/data/products";
import { DATE_INPUT_FORMAT, dmyToIso, isoToDmy } from "~/utils/dates";

// ---------------------------------------------------------------------------
// The price-rule create/edit form, rendered by both
// app/pages/products/price-rules/new.vue and .../price-rules/edit/[id].vue.
//
// Cloned from jurnal-frontend-app src/pages/products/price_rules/NewAndEdit.vue.
// The source picks products and contacts through two full drawers with their
// own search, bulk select and contact-group expansion; here both are tag
// pickers over the same lists, which keeps the scope rule ("empty means all")
// visible on one screen instead of behind two panels.
// ---------------------------------------------------------------------------

const props = defineProps<{ recordId?: number }>();

const NAME_MAX_LENGTH = 250;

const isEdit = computed(() => props.recordId != null);
const existing = computed(() =>
  props.recordId != null ? getPriceRuleById(props.recordId) : undefined
);

const form = reactive<PriceRuleInput>(emptyPriceRuleInput());

/** A tier's threshold is money for `subtotal_tier` and a plain count for
 *  `tier` — formatting a quantity of 50 as "50,00" reads as currency and
 *  invites decimals into a count. Takes the rule type as an argument rather
 *  than reading a computed, so `seedFromRecord` can call it from the immediate
 *  watch below without hitting the computed's temporal dead zone. */
function formatThreshold(value: number, ruleType: PriceRuleType): string {
  if (!value) return "";
  return ruleType === "subtotal_tier" ? formatAmount(value) : formatQuantity(value);
}

/**
 * The period is one range control, so its model is the pair MpDatePicker hands
 * back. Dates stay DD/MM/YYYY for the picker and are converted on save — never
 * round-tripped through `Date`, which shifts the day outside UTC.
 */
const period = ref<string[]>([]);
const startDate = computed(() => period.value[0] ?? "");
const endDate = computed(() => period.value[1] ?? "");

/**
 * "Every contact/product, including the ones added after this rule is saved" —
 * the drawer's select-all. The stored rule spells this as an empty list (see
 * `PriceRule.products`), which on its own can't be told apart from "nothing
 * chosen yet": hence the flag here, and the validation further down that stops
 * a rule being saved with neither.
 */
const isAllContacts = ref(false);
const isAllProducts = ref(false);

/** Search filters what is already on the rule — the pickers beside them are
 *  how something gets added. */
const contactSearch = ref("");
const productSearch = ref("");

const amountText = ref("");
const percentText = ref("");
const tierThresholdText = reactive<string[]>([]);

const submitted = ref(false);
const isDiscardModalOpen = ref(false);

function seedFromRecord() {
  Object.assign(form, existing.value ? priceRuleToInput(existing.value) : emptyPriceRuleInput());
  // A saved rule with an empty list is an "all" rule — that is what the empty
  // list means once saved. A new rule has simply not been scoped yet.
  isAllContacts.value = Boolean(existing.value) && form.contacts.length === 0;
  isAllProducts.value = Boolean(existing.value) && form.products.length === 0;
  period.value =
    form.startDate || form.endDate ? [isoToDmy(form.startDate), isoToDmy(form.endDate)] : [];
  contactSearch.value = "";
  productSearch.value = "";
  amountText.value = form.amount ? formatAmount(form.amount) : "";
  percentText.value = form.amount ? String(form.amount) : "";
  tierThresholdText.splice(
    0,
    tierThresholdText.length,
    ...form.tiers.map((tier) => formatThreshold(tier.threshold, form.ruleType))
  );
}

watch(existing, seedFromRecord, { immediate: true });

const title = computed(() => {
  if (!isEdit.value) return "Create new price rule";
  return existing.value ? `Edit ${existing.value.name}` : "Edit price rule";
});

useHead({ title: computed(() => `${title.value} — Mekari Jurnal`) });

const shape = computed(() => PRICE_RULE_SHAPE[form.ruleType]);
const isMarkup = computed(() => form.ruleType.startsWith("markup"));
const isSubtotalTier = computed(() => form.ruleType === "subtotal_tier");
const tierThresholdLabel = computed(() => PRICE_RULE_TIER_LABEL[form.ruleType] ?? "Qty");

const amountLabel = computed(() => {
  if (form.ruleType === "end_discount") return "Last price";
  return isMarkup.value ? "Markup amount" : "Discount amount";
});

// Switching type changes which figure is being edited, so the old one is
// cleared rather than silently carried into a field that means something else.
watch(
  () => form.ruleType,
  () => {
    form.amount = 0;
    amountText.value = "";
    percentText.value = "";
    if (form.tiers.length === 0) form.tiers.push({ threshold: 0, discount: 0 });
    tierThresholdText.splice(0, tierThresholdText.length, ...form.tiers.map(() => ""));
    form.tiers.forEach((tier) => {
      tier.threshold = 0;
      tier.discount = 0;
    });
  }
);

// A percentage is a small plain number, so it needs no grouped mirror — only
// the money fields do.
watch(percentText, (value) => {
  const parsed = Number(value.replace(",", ".").replace(/[^\d.]/g, ""));
  form.amount = Number.isNaN(parsed) ? 0 : parsed;
});

function onAmountInput() {
  form.amount = parseAmount(amountText.value);
}
function onAmountBlur() {
  amountText.value = form.amount ? formatAmount(form.amount) : "";
}

function addTier() {
  form.tiers.push({ threshold: 0, discount: 0 });
  tierThresholdText.push("");
}
function removeTier(index: number) {
  form.tiers.splice(index, 1);
  tierThresholdText.splice(index, 1);
}
function onTierThresholdInput(index: number) {
  const tier = form.tiers[index];
  if (tier) tier.threshold = parseAmount(tierThresholdText[index] ?? "");
}
function onTierThresholdBlur(index: number) {
  const tier = form.tiers[index];
  if (tier) tierThresholdText[index] = formatThreshold(tier.threshold, form.ruleType);
}
function onTierDiscountChange(index: number, value: unknown) {
  const tier = form.tiers[index];
  if (!tier) return;
  const parsed = Number(
    String(value ?? "")
      .replace(",", ".")
      .replace(/[^\d.]/g, "")
  );
  tier.discount = Number.isNaN(parsed) ? 0 : parsed;
}

// ---- Scope --------------------------------------------------------------

/** Both scopes are picked in a two-pane drawer, the way the source does it —
 *  the list is far too long for a menu, and the drawer is the only place that
 *  shows what is already selected while you pick. */
const isContactPickerOpen = ref(false);
const isProductPickerOpen = ref(false);

function onContactsPicked(values: string[], isAll: boolean) {
  form.contacts = values;
  isAllContacts.value = isAll;
}

function onProductsPicked(values: string[], isAll: boolean) {
  form.products = values;
  isAllProducts.value = isAll;
}

const CONTACT_PICKER_TABS = [
  { label: "Individual", value: "individual" },
  { label: "Group", value: "group" }
];

const contactOptions = computed(() => [
  ...CONTACT_OPTIONS.map((name) => ({ value: name, label: name, tab: "individual" })),
  ...CONTACT_GROUP_OPTIONS.map((group) => ({
    value: `group:${group.name}`,
    label: group.name,
    caption: "Group",
    members: group.members,
    tab: "group"
  }))
]);

/** Only sellable, non-archived products can carry a price rule. */
const productOptions = computed(() =>
  getProducts()
    .filter((product) => product.isSell && !product.isArchived)
    .map((product) => ({
      value: product.name,
      label: product.name,
      caption: [PRODUCT_TYPE_LABEL[product.type], product.code].filter(Boolean).join(" | "),
      filter: product.type
    }))
);

const productFilters = PRODUCT_TYPE_OPTIONS.map((type) => ({
  label: PRODUCT_TYPE_LABEL[type],
  value: type
}));

function matches(name: string, term: string) {
  return name.toLowerCase().includes(term.trim().toLowerCase());
}

const visibleContacts = computed(() =>
  form.contacts.filter((name) => matches(name, contactSearch.value))
);
const visibleProducts = computed(() =>
  form.products.filter((name) => matches(name, productSearch.value))
);

function removeContact(name: string) {
  form.contacts = form.contacts.filter((entry) => entry !== name);
}

function removeProduct(name: string) {
  form.products = form.products.filter((entry) => entry !== name);
}

/** What the product sells for today — the "last price" the step's caption
 *  promises. */
function lastPriceOf(name: string): number {
  return getProducts().find((product) => product.name === name)?.sellPrice ?? 0;
}

/**
 * The same price with this rule applied, so the effect is visible while the
 * rule is being written rather than after it ships.
 *
 * Tiered rules have no single answer — the discount depends on how much is
 * bought — so those rows show the price unchanged.
 */
function pricedAfterRule(name: string): number {
  const price = lastPriceOf(name);
  if (shape.value === "percent") {
    const factor = isMarkup.value ? 1 + form.amount / 100 : 1 - form.amount / 100;
    return Math.max(0, Math.round(price * factor));
  }
  if (shape.value === "amount") {
    return Math.max(0, isMarkup.value ? price + form.amount : price - form.amount);
  }
  return price;
}

const missingFields = computed(() => {
  const missing: string[] = [];
  if (!form.name.trim()) missing.push("Rule name");
  if (shape.value !== "tier" && form.amount <= 0) missing.push(amountLabel.value);
  if (shape.value === "tier") {
    if (form.tiers.every((tier) => tier.threshold <= 0 || tier.discount <= 0)) {
      missing.push("At least one complete tier");
    }
  }
  // A period with only one bound can't be evaluated — the rule would either
  // never start or never end, and neither is what a half-filled range means.
  const hasStart = Boolean(dmyToIso(startDate.value));
  const hasEnd = Boolean(dmyToIso(endDate.value));
  if (hasStart !== hasEnd) missing.push("Both rule period dates");
  // An unscoped rule can't be stored: the saved shape spells "all" as an empty
  // list, so saving nothing would silently apply the rule to everything.
  if (!isAllContacts.value && !form.contacts.length) missing.push("At least one contact");
  if (!isAllProducts.value && !form.products.length) missing.push("At least one product");
  return missing;
});

function onSubmit() {
  submitted.value = true;
  if (missingFields.value.length) return;

  const payload: PriceRuleInput = {
    ...form,
    startDate: dmyToIso(startDate.value),
    endDate: dmyToIso(endDate.value),
    // Drop the incomplete rows a user left behind rather than storing a tier
    // that can never match.
    tiers: form.tiers.filter((tier) => tier.threshold > 0 && tier.discount > 0),
    products: [...form.products],
    contacts: [...form.contacts]
  };

  if (isEdit.value && props.recordId != null) {
    updatePriceRule(props.recordId, payload);
  } else {
    createPriceRule(payload);
  }
  navigateTo("/products?segment=price_rules");
}

const isDirty = computed(() =>
  Boolean(form.name.trim() || form.amount || form.products.length || form.contacts.length)
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
  navigateTo("/products?segment=price_rules");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
// The addon supplies no padding of its own: Pixel's "input with prefix and
// suffix" pattern (docs.mekari.design/patterns/input.html) pads the addon's
// content by 12px, without which the prefix sits flush against both edges.
const addonTextClass = css({ px: 3 });
const bannerClass = css({ mb: 6 });
const feedbackWrapClass = css({ display: "inline-flex" });
const introClass = css({ display: "block", mb: 6 });

// A step is a numbered heading, a caption, and its own body indented under
// them, so the three read as an order rather than three unrelated sections.
const stepClass = css({ display: "flex", flexDirection: "column", gap: 4 });
const stepHeaderRowClass = css({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 4,
  flexWrap: "wrap"
});
const stepHeaderClass = css({ display: "flex", alignItems: "flex-start", gap: 3 });
const stepNumberClass = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  flexShrink: 0,
  rounded: "full",
  bg: "blue.50",
  color: "blue.500",
  fontSize: "xs"
});
const stepTitleColClass = css({ display: "flex", flexDirection: "column", gap: 1 });
const stepBodyClass = css({ pl: 8 });
const stepDividerClass = css({ my: 6 });
const stepToolsClass = css({ display: "flex", alignItems: "center", gap: 2 });
const searchFieldClass = css({ width: "240px" });

const fieldGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 232px))",
  gap: 5,
  alignItems: "start"
});
const labelRowClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 2
});

const allScopeClass = css({
  display: "flex",
  alignItems: "flex-start",
  gap: 3,
  p: 4,
  rounded: "md",
  bg: "gray.25"
});
const emptyStateClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 3,
  py: 12,
  textAlign: "center"
});
// A flat icon, not the blank-slate illustration: this is a step waiting for
// input, not a page with nothing on it (docs/patterns/BlankSlate.md).
const emptyIconClass = css({ width: "48px", height: "48px", color: "blue.400" });
const emptyTitleClass = css({ fontSize: "lg" });
const emptyDescClass = css({ maxWidth: "320px" });

const scopeTableClass = css({ width: "full" });
const numCellClass = css({ textAlign: "right" });
const rowActionClass = css({ textAlign: "right", width: "64px" });
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word" });
const tierWrapClass = css({ mt: 5 });
const statusColClass = css({ display: "flex", alignItems: "flex-start", pt: 6 });

const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const tierTableClass = css({ tableLayout: "fixed", width: "full", minWidth: "560px" });
const addTierClass = css({ mt: 4 });
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
