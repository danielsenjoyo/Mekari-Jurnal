<template>
  <MpDrawer :is-open="isOpen" placement="right" size="md" @close="onCancel">
    <MpDrawerOverlay />
    <MpDrawerContent>
      <MpDrawerHeader>
        <span :class="titleClass">{{ title }}</span>
        <MpDrawerCloseButton />
      </MpDrawerHeader>

      <MpDrawerBody>
        <div :class="formClass">
          <MpFormControl>
            <MpFormLabel>Keyword</MpFormLabel>
            <MpInputGroup>
              <MpInputLeftAddon>
                <MpIcon name="search" size="sm" color="gray.400" />
              </MpInputLeftAddon>
              <MpInput v-model="form.key" :placeholder="searchPlaceholder" />
            </MpInputGroup>
          </MpFormControl>

          <MpFormControl v-if="fields.dateRange">
            <MpFormLabel>Transaction date</MpFormLabel>
            <div :class="rangeRowClass">
              <MpDatePicker
                v-model="form.startDate"
                value-type="string"
                :format="DATE_INPUT_FORMAT"
                placeholder="Start date"
                use-portal
              />
              <MpText color="gray.600" :class="dashClass">-</MpText>
              <MpDatePicker
                v-model="form.endDate"
                value-type="string"
                :format="DATE_INPUT_FORMAT"
                placeholder="End date"
                use-portal
              />
            </div>
          </MpFormControl>

          <MpFormControl v-if="fields.productType">
            <MpFormLabel>Product type</MpFormLabel>
            <MpSelect v-model="form.productType" is-full-width>
              <option value="">All types</option>
              <option v-for="opt in PRODUCT_TYPE_OPTIONS" :key="opt" :value="opt">
                {{ PRODUCT_TYPE_LABEL[opt] }}
              </option>
            </MpSelect>
          </MpFormControl>

          <MpFormControl v-if="fields.category">
            <MpFormLabel>Product category</MpFormLabel>
            <MpSelect v-model="form.category" is-full-width>
              <option value="">All categories</option>
              <option v-for="opt in PRODUCT_CATEGORIES" :key="opt" :value="opt">{{ opt }}</option>
            </MpSelect>
          </MpFormControl>

          <!-- Same field, two labels: the stock-adjustment list calls it
               "Adjustment type" and offers two options; the approvals list
               calls it "Transaction type" and adds product conversion, because
               that tab mixes both kinds of record. -->
          <MpFormControl v-if="fields.transactionType">
            <MpFormLabel>{{ transactionTypeLabel }}</MpFormLabel>
            <MpSelect v-model="form.transactionType" is-full-width>
              <option value="">All types</option>
              <option v-for="opt in transactionTypeOptions" :key="opt" :value="opt">
                {{ APPROVAL_TYPE_LABEL[opt] }}
              </option>
            </MpSelect>
          </MpFormControl>

          <MpFormControl v-if="fields.adjustmentCategory">
            <MpFormLabel>Adjustment category</MpFormLabel>
            <MpSelect v-model="form.adjustmentCategory" is-full-width>
              <option value="">All categories</option>
              <option v-for="opt in ADJUSTMENT_CATEGORY_OPTIONS" :key="opt" :value="opt">
                {{ opt }}
              </option>
            </MpSelect>
          </MpFormControl>

          <MpFormControl v-if="fields.warehouse">
            <MpFormLabel>{{ warehouseLabel }}</MpFormLabel>
            <MpSelect v-model="form.warehouse" is-full-width>
              <option value="">All warehouses</option>
              <option v-for="opt in WAREHOUSE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
            </MpSelect>
          </MpFormControl>

          <MpFormControl v-if="fields.ruleType">
            <MpFormLabel>Rule type</MpFormLabel>
            <MpSelect v-model="form.ruleType" is-full-width>
              <option value="">All rule types</option>
              <option v-for="opt in PRICE_RULE_TYPE_OPTIONS" :key="opt" :value="opt">
                {{ PRICE_RULE_TYPE_LABEL[opt] }}
              </option>
            </MpSelect>
          </MpFormControl>

          <MpFormControl v-if="fields.status">
            <MpFormLabel>Status</MpFormLabel>
            <MpSelect v-model="form.status" is-full-width>
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </MpSelect>
          </MpFormControl>

          <MpFormControl v-if="fields.tags">
            <MpFormLabel>Additional tag</MpFormLabel>
            <MpInputTag
              id="products-filter-tags"
              :key="tagInputKey"
              placeholder="Search tag..."
              :data="tagData"
              :suggestions="PRODUCT_TAG_OPTIONS"
              :max-row="-1"
              :is-enable-create-new-tag="false"
              :is-show-suggestions="true"
              :is-show-icon-chevron-down="true"
              @change="onTagsChange"
            />
            <div :class="radioRowClass">
              <MpRadio id="products-tag-logic-and" v-model="form.tagsLogic" value="and">
                All tags
              </MpRadio>
              <MpRadio id="products-tag-logic-or" v-model="form.tagsLogic" value="or">
                <span :class="labelWithIconClass">
                  Either
                  <MpTooltip label="Showing one of all selected tags.">
                    <MpIcon name="info" size="sm" color="gray.600" />
                  </MpTooltip>
                </span>
              </MpRadio>
            </div>
          </MpFormControl>

          <!-- Widens the result set rather than narrowing it, so it sits last,
               after every field that cuts the list down. -->
          <MpFormControl v-if="fields.showArchived">
            <MpToggle id="products-show-archived" v-model:is-checked="form.showArchived">
              Show archived
              <template #description>
                Archived products stay out of the list until you ask for them.
              </template>
            </MpToggle>
          </MpFormControl>
        </div>
      </MpDrawerBody>

      <MpDrawerFooter>
        <div :class="footerClass">
          <MpTextlink as="button" variant="primary" @click="onReset">Reset</MpTextlink>
          <div :class="footerRightClass">
            <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
            <MpButton variant="primary" @click="onApply">Apply</MpButton>
          </div>
        </div>
      </MpDrawerFooter>
    </MpDrawerContent>
  </MpDrawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import {
  css,
  MpButton,
  MpDatePicker,
  MpDrawer,
  MpDrawerBody,
  MpDrawerCloseButton,
  MpDrawerContent,
  MpDrawerFooter,
  MpDrawerHeader,
  MpDrawerOverlay,
  MpFormControl,
  MpFormLabel,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpInputTag,
  MpRadio,
  MpSelect,
  MpText,
  MpTextlink,
  MpToggle,
  MpTooltip
} from "@mekari/pixel3";
import {
  emptyProductsFilter,
  FILTER_FIELDS_BY_TAB,
  type ProductsFilter,
  type ProductsTabKey
} from "~/data/products-filter";
import {
  ADJUSTMENT_CATEGORY_OPTIONS,
  ADJUSTMENT_TYPE_OPTIONS,
  APPROVAL_TYPE_LABEL,
  APPROVAL_TYPE_OPTIONS,
  PRICE_RULE_TYPE_LABEL,
  PRICE_RULE_TYPE_OPTIONS,
  PRODUCT_CATEGORIES,
  PRODUCT_TAG_OPTIONS,
  PRODUCT_TYPE_LABEL,
  PRODUCT_TYPE_OPTIONS,
  WAREHOUSE_OPTIONS,
  type ApprovalType
} from "~/data/products";
import { DATE_INPUT_FORMAT } from "~/utils/dates";

// ---------------------------------------------------------------------------
// The Products list's advanced filter drawer. Ported from the four separate
// drawers in jurnal-frontend-app src/pages/products/ — one per list — which
// share a layout and differ only in which fields they show.
//
// Two things about it are worth knowing before editing, both inherited from
// the Purchase drawer this mirrors (app/components/purchase/PurchaseFilterDrawer.vue).
//
// 1. It is STAGED, not live. Everything here edits a local draft; only Apply
//    hands it to the page, and Cancel throws the draft away. That is what makes
//    Cancel and Apply mean anything — a drawer that filtered as you typed would
//    leave both buttons decorative, and would re-run the list behind an overlay
//    the user can't see past.
//
// 2. Which fields appear depends on the tab, because most of them have no
//    referent on most tabs — a warehouse has no transaction date, a price rule
//    has no product category, a product master has no warehouse of its own.
//    The per-tab field set is declared once in `FILTER_FIELDS_BY_TAB`
//    (app/data/products-filter.ts) rather than as a wall of computed booleans
//    here, because there are eight tabs.
// ---------------------------------------------------------------------------

const props = defineProps<{
  isOpen: boolean;
  /** The list's active tab key — decides which fields are relevant. */
  activeTab: ProductsTabKey;
  /** The filter currently applied to the list; the draft is seeded from it. */
  applied: ProductsFilter;
}>();

const emit = defineEmits<{ close: []; apply: [filter: ProductsFilter] }>();

const form = reactive<ProductsFilter>(emptyProductsFilter());

const fields = computed(() => FILTER_FIELDS_BY_TAB[props.activeTab]);

const title = computed(() =>
  props.activeTab === "price_rules" ? "Filter price rule" : "Filter product data"
);

const searchPlaceholder = computed(() => {
  switch (props.activeTab) {
    case "products_and_services":
      return "Search product";
    case "masters":
      return "Search product with variant";
    case "warehouses":
      return "Search warehouse";
    case "price_rules":
      return "Search price rule";
    default:
      return "Search transaction";
  }
});

// The approvals tab is the only one that can hold a product conversion, so it
// is the only one whose type select offers it — see APPROVAL_TYPE_LABEL.
const transactionTypeLabel = computed(() =>
  props.activeTab === "stock_adjustments" ? "Adjustment type" : "Transaction type"
);
const transactionTypeOptions = computed<ApprovalType[]>(() =>
  props.activeTab === "stock_adjustments" ? ADJUSTMENT_TYPE_OPTIONS : APPROVAL_TYPE_OPTIONS
);

// A transfer moves stock between two warehouses, so "Warehouse" would be
// ambiguous there — the filter matches the origin.
const warehouseLabel = computed(() =>
  props.activeTab === "warehouse_transfers" || props.activeTab === "warehouse_transfers_approval"
    ? "From warehouse"
    : "Warehouse"
);

// MpInputTag owns its own tag list internally, so it is seeded through `data`
// and re-mounted via this key whenever the draft is replaced from outside
// (open / reset). Without the re-mount, Reset would clear the model while the
// chips stayed on screen.
const tagInputKey = ref(0);
const tagData = computed(() =>
  form.tags.map((tag) => ({
    id: `tag-${tag}`,
    text: tag,
    value: tag,
    isInvalid: false,
    isReadOnly: false
  }))
);

/** A plain, detached copy. NOT `structuredClone` — both the applied filter and
 *  the draft are reactive proxies, and structuredClone throws DataCloneError on
 *  a Proxy. Every field is a primitive except `tags`, so a spread plus one
 *  array copy is a complete deep copy here. */
function toPlain(f: ProductsFilter): ProductsFilter {
  return { ...f, tags: [...f.tags] };
}

function seed(from: ProductsFilter) {
  Object.assign(form, toPlain(from));
  tagInputKey.value++;
}

// Re-seed on open, not on every `applied` change: the draft must survive the
// page committing something else while the drawer is shut, and must start from
// what is actually applied each time it is reopened.
watch(
  () => props.isOpen,
  (open) => {
    if (open) seed(props.applied);
  },
  { immediate: true }
);

function onTagsChange(tags: { value?: string; text?: string }[]) {
  form.tags = tags.map((t) => t.value ?? t.text ?? "").filter(Boolean);
}

function onReset() {
  seed(emptyProductsFilter());
}

function onCancel() {
  emit("close");
}

function onApply() {
  emit("apply", toPlain(form));
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const titleClass = css({ fontSize: "lg" });
const formClass = css({ display: "flex", flexDirection: "column", gap: 4 });
const rangeRowClass = css({ display: "flex", alignItems: "center", gap: 2 });
const dashClass = css({ flexShrink: 0 });
const radioRowClass = css({ display: "flex", alignItems: "center", gap: 4, mt: 2 });
const labelWithIconClass = css({ display: "inline-flex", alignItems: "center", gap: 1 });
const footerClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 2,
  width: "full"
});
const footerRightClass = css({ display: "flex", alignItems: "center", gap: 2 });
</script>
